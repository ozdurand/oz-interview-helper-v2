import pytest

from copilot.kb import build_entries
from copilot.search import Index, tokens


@pytest.fixture(scope="module")
def index(shipped):
    return Index(build_entries(shipped))


@pytest.mark.parametrize("q,expect", [
    ("Why a topic per agent instead of one shared topic?", "jj/sb"),
    ("How do you produce reason codes for credit declines?", "citi/credit/"),
    ("Why fuse on rank instead of score?", "hd/rrf"),
    ("How do you stop retrieved documents from injecting instructions into the agent?", "cicd/c_red"),
])
def test_finds_the_right_card(index, q, expect):
    groups = [h.entry.group for h in index.search(q, k=5)]
    assert any(g.startswith(expect) for g in groups), groups


def test_filters_apply_before_ranking(index):
    hits = index.search("canary release", k=10, company="citi")
    assert hits and all(h.entry.company == "citi" for h in hits)
    hits = index.search("canary release", k=10, kinds="qa")
    assert all(h.entry.kind == "qa" for h in hits)


def test_one_hit_per_card_by_default(index):
    hits = index.search("Service Bus canary subscription", k=8)
    groups = [h.entry.group for h in hits]
    assert len(groups) == len(set(groups))


def test_reports_which_retrievers_ranked_it(index):
    h = index.search("reciprocal rank fusion k = 60", k=1)[0]
    assert set(h.ranks) <= {"bm25", "chars", "dense"} and h.ranks


def test_tokens_stem_and_drop_stopwords():
    assert tokens("How did you evaluate the indexes?") == ["how", "evalu", "index"]
