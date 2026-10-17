"""Retrieval test for the copilot knowledge base.

Three runs, reported as recall@1/@3/@5 and MRR@10 at the card (group) level:

  A1  every interview question in the dossier, searched against an index of
      cards only (no question entries) — can a card be found from its questions?
  A2  every interview question, leave-one-out: the full index minus that exact
      question entry — the realistic copilot setup, without the trivial match
  B   50 questions written in an interviewer's own words, with every acceptable
      card listed (eval/golden_interviewer.jsonl)
  C   the same 50, where a question says "that project", searched within the
      project the conversation is about — what the live copilot will know

usage: python -m eval.run_eval [export.json] [--report eval/report.md]
"""
from __future__ import annotations

import argparse
import fnmatch
import json
import sys
import time
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from copilot.kb import build_entries  # noqa: E402
from copilot.search import Index  # noqa: E402
from copilot import embeddings  # noqa: E402


def match(group: str, accept: list[str]) -> bool:
    return any(fnmatch.fnmatchcase(group, a) for a in accept)


def score(results: list[list[str]], accepts: list[list[str]]) -> dict:
    n = len(results)
    r1 = r3 = r5 = 0
    mrr = 0.0
    for got, acc in zip(results, accepts):
        rank = next((i + 1 for i, g in enumerate(got[:10]) if match(g, acc)), None)
        if rank:
            mrr += 1 / rank
            r1 += rank <= 1
            r3 += rank <= 3
            r5 += rank <= 5
    return {"n": n, "recall@1": r1 / n, "recall@3": r3 / n, "recall@5": r5 / n, "mrr@10": mrr / n}


def run(export_path: Path, report: Path | None, use_embeddings: bool) -> dict:
    entries = build_entries(json.loads(export_path.read_text()))
    emb = embeddings.from_env(HERE.parent / "data") if use_embeddings else None
    full = Index(entries, emb)
    qas = [e for e in entries if e.kind == "qa"]
    out: dict = {"entries": len(entries), "retrievers": full.retrievers}

    # A1 — cards only
    t = time.time()
    res, acc = [], []
    for e in qas:
        q = e.title.split(" — ", 1)[1]
        hits = full.search(q, k=10, kinds="card")
        res.append([h.entry.group for h in hits]); acc.append([e.group])
    out["A1"] = score(res, acc)

    # A2 — leave one out
    res, acc, by_co = [], [], defaultdict(lambda: ([], []))
    for e in qas:
        q = e.title.split(" — ", 1)[1]
        hits = full.search(q, k=10, exclude_ids={e.id})
        g = [h.entry.group for h in hits]
        res.append(g); acc.append([e.group])
        by_co[e.company][0].append(g); by_co[e.company][1].append([e.group])
    out["A2"] = score(res, acc)
    out["A2_by_company"] = {c: score(*v) for c, v in sorted(by_co.items())}
    out["A_ms_per_query"] = round((time.time() - t) * 1000 / (2 * len(qas)), 2)

    # B — interviewer phrasing
    gold = [json.loads(l) for l in (HERE / "golden_interviewer.jsonl").read_text().splitlines() if l.strip()]
    res, acc, misses = [], [], []
    for gq in gold:
        hits = full.search(gq["q"], k=10)
        g = [h.entry.group for h in hits]
        res.append(g); acc.append(gq["accept"])
        rank = next((i + 1 for i, x in enumerate(g) if match(x, gq["accept"])), None)
        if not rank or rank > 3:
            misses.append({"q": gq["q"], "rank": rank, "top3": g[:3], "accept": gq["accept"]})
    out["B"] = score(res, acc)
    out["B_misses"] = misses

    # C — same questions, with the project the conversation is about when the question depends on it
    res, acc = [], []
    for gq in gold:
        f = {"company": [gq["project"], "sys"]} if gq.get("project") else {}
        hits = full.search(gq["q"], k=10, **f)
        res.append([h.entry.group for h in hits]); acc.append(gq["accept"])
    out["C"] = score(res, acc)

    if report:
        report.write_text(render(out))
    return out


def pct(x: float) -> str:
    return f"{x * 100:.0f}%"


def render(o: dict) -> str:
    L = ["# Copilot retrieval test", "",
         f"Knowledge base: **{o['entries']} entries** · retrievers: **{', '.join(o['retrievers'])}** fused by reciprocal rank (k = 60) · "
         f"about {o['A_ms_per_query']} ms per query", "",
         "| Run | Questions | Recall@1 | Recall@3 | Recall@5 | MRR@10 |", "|---|---|---|---|---|---|"]
    names = {"A1": "A1 · card questions → cards only", "A2": "A2 · card questions → full index, leave-one-out",
             "B": "B · interviewer phrasing → full index", "C": "C · interviewer phrasing + project context"}
    for k in ("A1", "A2", "B", "C"):
        s = o[k]
        L.append(f"| {names[k]} | {s['n']} | {pct(s['recall@1'])} | {pct(s['recall@3'])} | {pct(s['recall@5'])} | {s['mrr@10']:.2f} |")
    L += ["", "**A2 by company**", "", "| Company | Questions | Recall@1 | Recall@5 |", "|---|---|---|---|"]
    for c, s in o["A2_by_company"].items():
        L.append(f"| {c} | {s['n']} | {pct(s['recall@1'])} | {pct(s['recall@5'])} |")
    L += ["", f"**B — questions where no acceptable card was in the top 3 ({len(o['B_misses'])})**", ""]
    for m in o["B_misses"]:
        L.append(f"- {m['q']} — best acceptable at rank {m['rank'] or '>10'}; top 3: {', '.join(m['top3'])}")
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("export", nargs="?", default=str(HERE.parent / "data" / "shipped-export.json"))
    ap.add_argument("--report", default=str(HERE / "report.md"))
    ap.add_argument("--no-embeddings", action="store_true")
    a = ap.parse_args()
    o = run(Path(a.export), Path(a.report) if a.report else None, not a.no_embeddings)
    print(json.dumps({k: v for k, v in o.items() if k != "B_misses"}, indent=1))
    print(f"B misses: {len(o['B_misses'])}")
