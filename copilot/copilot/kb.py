"""Turn a dossier export into knowledge-base entries.

An export is what the site's Export button (or scripts/export_shipped.js)
produces: {format, version, exportedAt, pitch, data: {companies, diagrams, ui}}.

Every entry is one retrievable unit with enough metadata to filter on and to
trace back to the exact place in the dossier it came from:

    id       stable, URL-safe id, e.g. "qa:jj/sb@1", "card:citi/fraud/g1", "pain:hd@2"
    kind     pitch | problem | card | qa | push | pain | phase | eval
    group    the card it belongs to ("jj/sb", "citi/fraud/g1", "eval/jj/ragas")
    company  jj | hd | citi | sys
    map      jj | hd | citi | rag | cicd | home
    variant  Citibank workload (fraud | credit | aml) where it applies
    title    short human label
    text     plain text that gets indexed
    answer   what the copilot shows (the answer, the 20-second version, …)
    check    True when the dossier marks it "to confirm"
    source   dotted path in the export's data, for traceability
"""
from __future__ import annotations

import hashlib
import html
import re
from dataclasses import dataclass, field, asdict
from typing import Any, Iterable

FORMAT = "oz-dossier-export"
COMPANY_OF_MAP = {"jj": "jj", "hd": "hd", "citi": "citi", "rag": "sys", "cicd": "sys"}

_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")


def plain(v: Any) -> str:
    """HTML-ish dossier text → plain text."""
    if v is None:
        return ""
    if isinstance(v, (list, tuple)):
        return " ".join(plain(x) for x in v)
    s = html.unescape(_TAG.sub(" ", str(v)))
    return _WS.sub(" ", s).strip()


@dataclass
class Entry:
    id: str
    kind: str
    group: str
    company: str
    map: str
    title: str
    text: str
    answer: str = ""
    check: bool = False
    variant: str | None = None
    variants: list[str] = field(default_factory=list)
    source: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


class ExportError(ValueError):
    pass


def load_export(obj: dict) -> dict:
    """Accept a full export or bare data; return the data part."""
    if not isinstance(obj, dict):
        raise ExportError("export must be a JSON object")
    data = obj.get("data") if obj.get("format") == FORMAT else obj
    if not isinstance(data, dict) or not isinstance(data.get("companies"), dict) or not isinstance(data.get("diagrams"), dict):
        raise ExportError("not a dossier export: missing companies or diagrams")
    return data


# ---------------------------------------------------------------- cards ---
def _card_entries(map_id: str, variant: str | None, lay: dict, base: str, co_name: str) -> Iterable[Entry]:
    company = COMPANY_OF_MAP.get(map_id, "sys")
    prefix = f"{map_id}/{variant}/" if variant else f"{map_id}/"
    bands = {b.get("id"): b for b in lay.get("bands") or []}
    items = [("bands", i, b) for i, b in enumerate(lay.get("bands") or [])] + \
            [("nodes", i, n) for i, n in enumerate(lay.get("nodes") or [])]
    for arr, i, it in items:
        d = it.get("detail") or {}
        if not d and arr == "bands":
            continue
        node = it.get("id", f"{arr}{i}")
        group = prefix + node
        name = plain(it.get("name")).split(" — ")[0] if arr == "bands" else plain(it.get("name"))
        layer = ""
        if arr == "nodes" and it.get("band") in bands:
            layer = plain(bands[it["band"]].get("name")).split(" — ")[0]
        src = f"{base}.{arr}.{i}"
        iv = d.get("iv") or {}
        title = f"{co_name} · {name}" if co_name else name

        # the card itself: reference panels + the 20-second answer + numbers
        ref = [name, plain(it.get("sub")), layer, d.get("head"), d.get("role"), d.get("how") or d.get("does"),
               d.get("dh"), d.get("dec") or d.get("fork"), d.get("hard"), d.get("say"),
               [" ".join(map(plain, s)) for s in d.get("stack") or []],
               iv.get("short"), [" ".join(map(plain, n)) for n in iv.get("nums") or []]]
        yield Entry(id=f"card:{group}", kind="card", group=group, company=company, map=map_id, variant=variant,
                    title=title, text=plain(ref), answer=plain(iv.get("short") or d.get("say") or d.get("head") or d.get("role")),
                    source=src + ".detail")
        # each interview question is its own entry: question + answer, with the card name for context
        for j, qa in enumerate(iv.get("qa") or []):
            if not isinstance(qa, dict):
                continue
            yield Entry(id=f"qa:{group}@{j}", kind="qa", group=group, company=company, map=map_id, variant=variant,
                        title=f"{title} — {plain(qa.get('q'))}", text=plain([name, qa.get("q"), qa.get("a")]),
                        answer=plain(qa.get("a")), check=bool(qa.get("check")), source=f"{src}.detail.iv.qa.{j}")
        push = iv.get("push") or {}
        if push.get("q") or push.get("a"):
            yield Entry(id=f"push:{group}", kind="push", group=group, company=company, map=map_id, variant=variant,
                        title=f"{title} — {plain(push.get('q'))}", text=plain([name, push.get("q"), push.get("a")]),
                        answer=plain(push.get("a")), check=bool(push.get("check")), source=f"{src}.detail.iv.push")


def _diagram_entries(diagrams: dict) -> Iterable[Entry]:
    for map_id, g in diagrams.items():
        co = plain(g.get("co"))
        if g.get("layouts"):
            for v, lay in g["layouts"].items():
                yield from _card_entries(map_id, v, lay, f"diagrams.{map_id}.layouts.{v}", co)
        else:
            yield from _card_entries(map_id, None, g, f"diagrams.{map_id}", co)


# ------------------------------------------------------------ companies ---
def _company_entries(companies: dict, pitch: str | None) -> Iterable[Entry]:
    if pitch:
        yield Entry(id="pitch", kind="pitch", group="home/pitch", company="jj", map="home", title="Elevator pitch",
                    text=plain(pitch), answer=plain(pitch), source="pitch")
    for co, c in companies.items():
        name = plain(c.get("name"))
        pr = c.get("problem") or {}
        for i, s in enumerate(pr.get("slides") or []):
            yield Entry(id=f"problem:{co}@{i}", kind="problem", group=f"home/problem/{s.get('id') or i}", company=co, map="home",
                        title=f"Problem statement — {plain(s.get('label'))}", text=plain([pr.get("title"), s.get("label"), s.get("text")]),
                        answer=plain(s.get("text")), source=f"companies.{co}.problem.slides.{i}")
        for i, p in enumerate(c.get("pains") or []):
            if not isinstance(p, (list, tuple)) or len(p) < 4:
                continue
            yield Entry(id=f"pain:{co}@{i}", kind="pain", group=f"{co}/pain/{i}", company=co, map=co,
                        title=f"{name} · pain point — {plain(p[1])}", text=plain([p[0], p[1], "pain:", p[2], "fix:", p[3]]),
                        answer=f"{plain(p[2])} Fix: {plain(p[3])}", source=f"companies.{co}.pains.{i}")
        for ph, p in (c.get("phases") or {}).items():
            yield Entry(id=f"phase:{co}/{ph}", kind="phase", group=f"{co}/phase/{ph}", company=co, map=co,
                        title=f"{name} · {plain(p.get('label'))}",
                        text=plain([p.get("label"), p.get("sub"), p.get("goal"), p.get("goalBody"), p.get("list"),
                                    (p.get("gate") or {}).get("head"), (p.get("gate") or {}).get("body"),
                                    [" ".join(map(plain, s)) for s in p.get("stats") or []],
                                    [" ".join(map(plain, s)) for s in p.get("stack") or []]]),
                        answer=plain(p.get("goal")), source=f"companies.{co}.phases.{ph}")
        yield from _eval_entries(co, name, c.get("eval") or {})


def _eval_entries(co: str, name: str, ev_all: dict) -> Iterable[Entry]:
    for mode, ev in ev_all.items():
        if not isinstance(ev, dict):
            continue
        base = f"companies.{co}.eval.{mode}"
        label = "Evaluation" + (" (generic)" if mode == "generic" else "")
        g = lambda k: f"eval/{mode}/{k}"
        yield Entry(id=f"eval:{mode}/overview", kind="eval", group=g("overview"), company=co, map=co,
                    title=f"{label} — {plain(ev.get('title'))}", text=plain([ev.get("title"), ev.get("thesis"), ev.get("gate")]),
                    answer=plain(ev.get("thesis")), source=base)
        for i, l in enumerate(ev.get("layers") or []):
            links = [e for e in ev.get("edges") or [] if str(e[0]) == str(i + 1) or str(e[1]) == str(i + 1)]
            yield Entry(id=f"eval:{mode}/layer{i + 1}", kind="eval", group=g(f"layer{i + 1}"), company=co, map=co,
                        title=f"{label} — layer {i + 1}: {plain(l.get('name'))}",
                        text=plain([l.get("name"), l.get("q"), l.get("lead"), l.get("body"),
                                    [" ".join(map(plain, k)) for k in l.get("kv") or []], [e[3:5] for e in links]]),
                        answer=plain(l.get("lead")), check=any(len(e) > 5 and e[5] for e in links),
                        source=f"{base}.layers.{i}")
        for tab in ("ragas", "golden", "thresholds", "vs", "read"):
            t = ev.get(tab) or {}
            if not t:
                continue
            rows = [r[:len(t.get("cols") or [])] for r in t.get("rows") or []]
            steps = t.get("steps") or []
            notes = t.get("notes") or []
            flagged = any(len(r) > len(t.get("cols") or []) and r[len(t["cols"])] for r in t.get("rows") or []) \
                or any(len(s) > 2 and s[2] for s in steps) or bool(t.get("noteCheck"))
            yield Entry(id=f"eval:{mode}/{tab}", kind="eval", group=g(tab), company=co, map=co,
                        title=f"{label} — {tab}", text=plain([t.get("lead"), t.get("cols"), rows, steps, notes, t.get("note")]),
                        answer=plain(t.get("lead")), check=flagged, source=f"{base}.{tab}")


# ---------------------------------------------------------------- build ---
def build_entries(export: dict) -> list[Entry]:
    data = load_export(export)
    pitch = export.get("pitch") if isinstance(export, dict) else None
    entries = list(_company_entries(data["companies"], pitch)) + list(_diagram_entries(data["diagrams"]))
    entries = [e for e in entries if e.text]
    return dedupe(entries)


def dedupe(entries: list[Entry]) -> list[Entry]:
    """Citibank boxes shared by all three workloads appear once, listing every workload."""
    seen: dict[str, Entry] = {}
    out: list[Entry] = []
    for e in entries:
        key = hashlib.sha1(f"{e.kind}|{e.map}|{e.group.split('/')[-1]}|{e.text}|{e.answer}".encode()).hexdigest()
        if key in seen:
            first = seen[key]
            if e.variant and e.variant not in first.variants:
                first.variants.append(e.variant)
            continue
        if e.variant:
            e.variants = [e.variant]
        seen[key] = e
        out.append(e)
    return out


def summary(entries: list[Entry]) -> dict:
    by_kind: dict[str, int] = {}
    by_company: dict[str, int] = {}
    for e in entries:
        by_kind[e.kind] = by_kind.get(e.kind, 0) + 1
        by_company[e.company] = by_company.get(e.company, 0) + 1
    return {"entries": len(entries), "by_kind": by_kind, "by_company": by_company,
            "to_confirm": sum(1 for e in entries if e.check)}
