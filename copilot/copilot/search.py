"""Hybrid search over knowledge-base entries — the same pattern as the RAG map:
several retrievers, each ranking the whole candidate set, fused by reciprocal
rank (k = 60). Filters are applied before ranking, never after.

Retrievers
  bm25   words, with light stemming and domain query expansion
  chars  character 4-grams (TF-IDF cosine) — catches word variants and typos
  dense  embeddings, when a provider is configured (see embeddings.py)
"""
from __future__ import annotations

import logging
import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Iterable, Sequence

from .kb import Entry

log = logging.getLogger("copilot.search")

# ------------------------------------------------------------ text prep ---
STOP = set("""a an the and or but if of to in on at by for with from as is are was were be been being it its this that these
those there their they them we our us i me my you your he she his her do does did done have has had can could would should will
shall may might must so than then too very just also about into over under again more most some any each other such only own same
not no nor s t don isn aren wasn weren tell walk give describe explain talk please one""".split())
_TOK = re.compile(r"[a-z0-9]+")


try:  # Snowball (Porter 2) when available; a light suffix stripper otherwise
    import snowballstemmer as _sb
    _STEM = _sb.stemmer("english")
except Exception:  # pragma: no cover
    _STEM = None


def stem(w: str) -> str:
    if len(w) <= 3 or w.isdigit():
        return w
    if _STEM is not None:
        return _STEM.stemWord(w)
    for suf, rep, minlen in (("ies", "y", 5), ("sses", "ss", 6), ("ing", "", 6), ("ed", "", 5), ("es", "", 5), ("s", "", 4)):
        if w.endswith(suf) and len(w) >= minlen and not w.endswith("ss"):
            return w[: -len(suf)] + rep
    return w


def tokens(text: str) -> list[str]:
    t = text.lower().replace("&", " and ")
    return [stem(w) for w in _TOK.findall(t) if w not in STOP]


# Interviewers rarely use the dossier's exact words. A small domain thesaurus,
# applied to the query only, bridges the obvious gaps until embeddings are on.
SYNONYMS: dict[str, list[str]] = {
    "keyword": ["lexical", "bm25"], "lexical": ["bm25", "keyword"], "vector": ["dense", "embedding", "faiss"],
    "semantic": ["dense", "embedding"], "queue": ["bus", "topic", "subscription", "message"], "messaging": ["bus", "topic"],
    "kafka": ["bus", "topic"], "audit": ["record", "trace", "compliance"], "log": ["trace", "record"],
    "memory": ["session", "redis"], "state": ["session", "redis", "cosmos"], "cost": ["token", "price", "cent"],
    "price": ["cost", "token"], "expensive": ["cost", "token"], "latency": ["p95", "budget", "timeout"],
    "slow": ["latency", "p95", "timeout"], "fast": ["latency", "p95"], "hallucinate": ["faithfulness", "ground", "citation", "refusal"],
    "hallucination": ["faithfulness", "ground", "citation", "refusal"], "secure": ["identity", "access", "acl", "rbac"],
    "permission": ["acl", "rbac", "identity", "entitlement", "access"], "access": ["acl", "rbac", "identity", "entitlement"],
    "release": ["canary", "rollout", "deploy", "promot"], "deploy": ["canary", "rollout", "release", "promot"],
    "rollback": ["revert", "demot", "rollback"], "roll": ["rollback", "revert"], "test": ["eval", "golden", "fixture", "gate"],
    "evaluate": ["eval", "metric", "golden", "gate"], "evaluation": ["eval", "metric", "golden", "gate"], "measure": ["metric", "eval"],
    "judge": ["llm", "faithfulness", "valid", "label"], "monitor": ["observability", "drift", "alert", "telemetry"],
    "observability": ["monitor", "telemetry", "trace"], "graph": ["ontology", "closure", "gremlin"], "ontology": ["closure", "dictionary", "meddra"],
    "synonym": ["dictionary", "vocabulary", "mismatch", "rewrite"], "word": ["vocabulary", "term", "synonym"],
    "pdf": ["pars", "document", "intelligence", "extract", "layout"], "parse": ["pars", "layout", "extract"], "chunk": ["split", "overlap"],
    "rerank": ["cross", "encoder", "rerank"], "combine": ["fusion", "fuse", "rrf", "hybrid"], "merge": ["fusion", "rrf", "hybrid"],
    "hybrid": ["fusion", "rrf", "bm25", "dense"], "drift": ["psi", "monitor", "degrad"], "retrain": ["drift", "governed", "gate"],
    "regulator": ["sr", "11", "compliance", "audit", "validation"], "laptop": ["notebook", "script"], "notebook": ["script", "laptop"],
    "explain": ["reason", "code", "shap"], "decline": ["adverse", "reason", "reg"], "fraud": ["chargeback", "authorization"],
    "alert": ["aml", "queue", "investigator"], "injection": ["red", "team", "untrusted", "adversarial"], "sign": ["cosign", "signature", "admission"],
    "prompt": ["prompt", "pull", "request"], "stale": ["staleness", "fresh", "refresh"], "fresh": ["staleness", "refresh"],
    "result": ["outcome", "uplift", "faster"], "impact": ["outcome", "uplift", "success"], "agent": ["specialist", "orchestrator"],
    "multi": ["orchestrator", "specialist"], "tool": ["invoke_agent", "tool"], "model": ["gpt", "deployment", "model"],
    "retire": ["migrat", "retir"], "turn": ["session", "prior"], "conversation": ["session", "turn"],
    "verifier": ["qa", "verif", "disagree"], "agree": ["disagree", "independ", "verif"], "consistent": ["drift", "version", "dual"],
    "mislabel": ["mime", "router", "byte"], "wrong": ["mistak", "lie", "fail"], "regret": ["mistak", "repeat"],
    "fit": ["budget", "drop", "truncat"], "window": ["context", "budget"], "skip": ["code", "cannot", "skipp"], "upgrade": ["migrat", "pinned"], "secret": ["key", "vault", "identity"], "identity": ["workload", "entra", "oidc"],
}


def expand(q_tokens: list[str]) -> list[tuple[str, float]]:
    out: dict[str, float] = {}
    for t in q_tokens:
        out[t] = max(out.get(t, 0), 1.0)
    for t in q_tokens:
        for raw in (t, t.rstrip("e")):
            for s in SYNONYMS.get(raw, []):
                st = stem(s)
                if st not in out:
                    out[st] = 0.45
    return list(out.items())


# ----------------------------------------------------------- retrievers ---
class BM25:
    def __init__(self, docs: Sequence[list[str]], k1: float = 1.4, b: float = 0.75):
        self.k1, self.b = k1, b
        self.tf = [Counter(d) for d in docs]
        self.len = [len(d) for d in docs]
        self.avg = sum(self.len) / max(1, len(docs))
        df: Counter = Counter()
        for d in self.tf:
            df.update(d.keys())
        n = len(docs)
        self.idf = {t: math.log(1 + (n - c + 0.5) / (c + 0.5)) for t, c in df.items()}
        self.post: dict[str, list[int]] = defaultdict(list)
        for i, d in enumerate(self.tf):
            for t in d:
                self.post[t].append(i)

    def scores(self, q: list[tuple[str, float]], allowed: set[int] | None) -> dict[int, float]:
        s: dict[int, float] = defaultdict(float)
        for t, w in q:
            idf = self.idf.get(t)
            if idf is None:
                continue
            for i in self.post[t]:
                if allowed is not None and i not in allowed:
                    continue
                f = self.tf[i][t]
                s[i] += w * idf * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * self.len[i] / self.avg))
        return s


class CharGrams:
    """TF-IDF cosine over character 4-grams of the normalized text."""
    N = 4

    def __init__(self, texts: Sequence[str]):
        grams = [self._grams(t) for t in texts]
        n = len(texts)
        df: Counter = Counter()
        for g in grams:
            df.update(g.keys())
        self.idf = {k: math.log(n / c) for k, c in df.items() if c < 0.25 * n}
        self.vecs: list[dict[str, float]] = []
        self.post: dict[str, list[int]] = defaultdict(list)
        for i, g in enumerate(grams):
            v = {k: (1 + math.log(c)) * self.idf[k] for k, c in g.items() if k in self.idf}
            norm = math.sqrt(sum(x * x for x in v.values())) or 1.0
            v = {k: x / norm for k, x in v.items()}
            self.vecs.append(v)
            for k in v:
                self.post[k].append(i)

    @classmethod
    def _grams(cls, text: str) -> Counter:
        s = " " + " ".join(_TOK.findall(text.lower())) + " "
        return Counter(s[i:i + cls.N] for i in range(len(s) - cls.N + 1))

    def scores(self, query: str, allowed: set[int] | None) -> dict[int, float]:
        g = self._grams(query)
        q = {k: (1 + math.log(c)) * self.idf[k] for k, c in g.items() if k in self.idf}
        norm = math.sqrt(sum(x * x for x in q.values())) or 1.0
        s: dict[int, float] = defaultdict(float)
        for k, w in q.items():
            for i in self.post[k]:
                if allowed is not None and i not in allowed:
                    continue
                s[i] += (w / norm) * self.vecs[i][k]
        return s


# --------------------------------------------------------------- hybrid ---
@dataclass
class Hit:
    entry: Entry
    score: float
    ranks: dict

    def to_dict(self) -> dict:
        e = self.entry
        return {"id": e.id, "group": e.group, "kind": e.kind, "title": e.title, "answer": e.answer,
                "check": e.check, "company": e.company, "map": e.map, "variants": e.variants,
                "source": e.source, "score": round(self.score, 5), "ranks": self.ranks}


class Index:
    RRF_K = 60

    def __init__(self, entries: list[Entry], embedder=None):
        self.entries = entries
        self.bm25 = BM25([tokens(f"{e.title} {e.title} {e.text}") for e in entries])
        self.chars = CharGrams([f"{e.title} {e.text}" for e in entries])
        self.embedder = embedder
        self.vectors = None
        self.dense_error: str | None = None
        if embedder is not None:
            # a bad key or an outage must not take the service down: fall back to the keyword retrievers
            try:
                self.vectors = embedder.embed_entries(entries)
            except Exception as ex:  # noqa: BLE001
                self.dense_error = f"{type(ex).__name__}: {ex}"[:300]
                log.warning("embeddings unavailable, keyword retrievers only: %s", self.dense_error)

    @property
    def retrievers(self) -> list[str]:
        return ["bm25", "chars"] + (["dense"] if self.vectors is not None else [])

    @property
    def dense(self) -> str:
        """off (not configured) | on | failed — safe to show without sign-in."""
        if self.embedder is None:
            return "off"
        return "on" if self.vectors is not None else "failed"

    def _allowed(self, company=None, map=None, kinds=None, variant=None, exclude_ids=None, exclude_kinds=None) -> set[int] | None:
        if not any([company, map, kinds, variant, exclude_ids, exclude_kinds]):
            return None
        ok = set()
        for i, e in enumerate(self.entries):
            if company and e.company not in _as_set(company):
                continue
            if map and e.map not in _as_set(map):
                continue
            if kinds and e.kind not in _as_set(kinds):
                continue
            if exclude_kinds and e.kind in _as_set(exclude_kinds):
                continue
            if variant and e.variants and variant not in e.variants:
                continue
            if exclude_ids and e.id in exclude_ids:
                continue
            ok.add(i)
        return ok

    def search(self, query: str, k: int = 8, per_group: bool = True, depth: int = 60, **filters) -> list[Hit]:
        allowed = self._allowed(**filters)
        ranked: dict[str, list[int]] = {}
        b = self.bm25.scores(expand(tokens(query)), allowed)
        ranked["bm25"] = sorted(b, key=b.get, reverse=True)[:depth]
        c = self.chars.scores(query, allowed)
        ranked["chars"] = sorted(c, key=c.get, reverse=True)[:depth]
        if self.vectors is not None:
            try:
                d = self.embedder.scores(query, self.vectors, allowed)
                ranked["dense"] = sorted(d, key=d.get, reverse=True)[:depth]
            except Exception as ex:  # noqa: BLE001 — answer from the keyword retrievers rather than fail the request
                log.warning("query embedding failed, keyword retrievers only: %s: %s", type(ex).__name__, str(ex)[:200])
        fused: dict[int, float] = defaultdict(float)
        where: dict[int, dict] = defaultdict(dict)
        for name, lst in ranked.items():
            for r, i in enumerate(lst):
                fused[i] += 1.0 / (self.RRF_K + r + 1)
                where[i][name] = r + 1
        order = sorted(fused, key=fused.get, reverse=True)
        hits: list[Hit] = []
        seen_groups: set[str] = set()
        for i in order:
            e = self.entries[i]
            if per_group:
                if e.group in seen_groups:
                    continue
                seen_groups.add(e.group)
            hits.append(Hit(e, fused[i], where[i]))
            if len(hits) >= k:
                break
        return hits


def _as_set(v) -> set:
    if isinstance(v, str):
        return {x for x in v.split(",") if x}
    return set(v)
