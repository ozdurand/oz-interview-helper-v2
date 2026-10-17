import copy

import pytest

from copilot.kb import ExportError, build_entries, load_export, plain, summary


def test_builds_every_kind(shipped):
    s = summary(build_entries(shipped))
    assert s["entries"] > 700
    for kind in ("pitch", "problem", "card", "qa", "push", "pain", "phase", "eval"):
        assert s["by_kind"].get(kind, 0) > 0, kind
    assert set(s["by_company"]) == {"jj", "hd", "citi", "sys"}


def test_every_interview_question_is_an_entry(shipped):
    entries = build_entries(shipped)
    qa = {e.id for e in entries if e.kind == "qa"}
    # J&J Service Bus has four questions; the Kafka one is marked to confirm
    assert {f"qa:jj/sb@{i}" for i in range(4)} <= qa
    kafka = next(e for e in entries if e.id == "qa:jj/sb@3")
    assert kafka.check and "Kafka" in kafka.title and kafka.source.endswith("iv.qa.3")


def test_shared_citibank_boxes_appear_once(shipped):
    entries = build_entries(shipped)
    spine = [e for e in entries if e.kind == "card" and e.group.endswith("/R2") and e.map == "citi"]
    assert len(spine) == 1 and spine[0].variants == ["fraud", "credit", "aml"]


def test_edits_flow_through(shipped):
    ex = copy.deepcopy(shipped)
    ex["data"]["companies"]["hd"]["pains"][0][1] = "A brand-new pain title"
    titles = [e.title for e in build_entries(ex)]
    assert any("A brand-new pain title" in t for t in titles)


def test_rejects_non_exports():
    with pytest.raises(ExportError):
        load_export({"hello": 1})
    with pytest.raises(ExportError):
        load_export([1, 2])


def test_plain_strips_markup():
    assert plain("Q&amp;A <b>bold</b>\n  text") == "Q&A bold text"
