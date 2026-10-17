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


class _BrokenEmbedder:
    """Stands in for a wrong key or an outage at the embeddings provider."""
    def __init__(self, fail_on_entries=True):
        self.fail_on_entries = fail_on_entries

    def embed_entries(self, entries):
        if self.fail_on_entries:
            raise RuntimeError("401 Unauthorized")
        return [[1.0, 0.0] for _ in entries]

    def scores(self, query, vectors, allowed):
        raise RuntimeError("429 Too Many Requests")


def test_embeddings_outage_at_startup_falls_back_to_keywords(shipped):
    idx = Index(build_entries(shipped), _BrokenEmbedder())
    assert idx.retrievers == ["bm25", "chars"] and idx.dense == "failed" and "401" in idx.dense_error
    assert idx.search("Why a topic per agent?", k=3)[0].entry.group.startswith("jj/")


def test_embeddings_outage_at_query_time_still_answers(shipped):
    idx = Index(build_entries(shipped), _BrokenEmbedder(fail_on_entries=False))
    assert idx.dense == "on"
    hits = idx.search("Why a topic per agent?", k=3)
    assert hits and all("dense" not in h.ranks for h in hits)
