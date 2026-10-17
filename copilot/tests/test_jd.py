from pathlib import Path

import pytest

from copilot import jd
from copilot.kb import build_entries
from copilot.search import Index

FIX = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="module")
def index(shipped):
    return Index(build_entries(shipped))


def find(rows, prefix):
    return next(r for r in rows if r["text"].startswith(prefix))


@pytest.fixture(scope="module")
def structured(index, shipped):
    return jd.analyze((FIX / "jd_structured.txt").read_text(), index, shipped)


def test_parses_sections_bullets_and_kinds(structured):
    p = structured["parsed"]
    assert p["title"] == "Senior GenAI Solutions Architect" and p["structured"] and p["years"] == 7
    reqs = p["requirements"]
    assert find(reqs, "Design and lead the architecture")["kind"] == "resp"
    assert find(reqs, "Strong Python and FastAPI")["kind"] == "must"
    assert find(reqs, "Fine-tuning with LoRA")["kind"] == "nice"
    assert find(reqs, "Bachelor's degree")["kind"] == "logistics"
    texts = " ".join(r["text"] for r in p["requirements"])
    assert "fictional life-sciences" not in texts and "Health insurance" not in texts and "Senior GenAI Solutions" not in texts


def test_unstructured_posting_still_yields_requirements(index, shipped):
    r = jd.analyze((FIX / "jd_paragraph.txt").read_text(), index, shipped)
    reqs = r["parsed"]["requirements"]
    assert not r["parsed"]["structured"] and len(reqs) >= 4
    assert any(x["kind"] == "nice" and "Kafka" in x["text"] for x in reqs)
    assert "MLflow" in r["parsed"]["skills"]


def test_coverage_marks_strong_and_honest_gaps(structured):
    rows = structured["coverage"]["rows"]
    assert find(rows, "Hands-on experience with Azure OpenAI")["status"] == "strong"
    gap = find(rows, "Experience with LangGraph")
    assert gap["status"] == "gap" and set(gap["missing_skills"]) == {"LangGraph", "Semantic Kernel"} and not gap["evidence"]
    assert find(rows, "Experience with Snowflake")["status"] == "gap"
    assert find(rows, "Bachelor's degree")["status"] == "n/a"
    assert "7+ years" in (find(rows, "7+ years of software")["note"] or "")
    for r in structured["coverage"]["rows"]:  # every claimed skill points at the dossier
        if r["status"] in ("strong", "partial"):
            assert r["evidence"] and all(e["source"] for e in r["evidence"])


def test_guide_has_stories_questions_gaps_and_questions_to_ask(structured):
    g = structured["guide"]
    assert g["stories"] and g["stories"][0]["kind"] == "card"
    assert len(g["questions"]) >= 5 and all(q["answer"] for q in g["questions"])
    assert any("LangGraph" in x["missing_skills"] for x in g["gaps"])
    assert 2 <= len(g["ask"]) <= 6 and g["logistics"]


def test_resume_only_claims_what_the_dossier_shows(structured):
    r = structured["resume"]
    md = r["markdown"]
    assert "Snowflake" not in md and "LangGraph" not in md and "Snowflake" in r["left_out"]
    assert "Azure OpenAI" in r["skills"] and "### Johnson & Johnson" in md
    assert [s["company"] for s in r["sections"]] == ["jj", "hd", "citi"]
    assert all(b["id"] for s in r["sections"] for b in s["bullets"])


def test_html_posting_is_read_as_lines():
    p = jd.parse_jd("<h2>Requirements</h2><ul><li>Experience with Azure OpenAI and RAG</li><li>Python and FastAPI</li></ul>"
                    "<h2>Benefits</h2><p>Dental plan for the whole family</p>")
    assert [r["text"] for r in p["requirements"]] == ["Experience with Azure OpenAI and RAG", "Python and FastAPI"]


@pytest.mark.parametrize("text,missing", [
    # either product in an "or" list is enough; the dossier names GitHub Actions and Terraform
    ("Experience with CI/CD (GitHub Actions or Azure DevOps) and infrastructure as code (Terraform or Bicep)", []),
    ("Hands-on with Kafka, RabbitMQ or Event Hubs", []),
    # with "and", every named product counts
    ("Experience with Jenkins and Argo CD", ["Argo CD"]),
    ("Production experience with Airflow and dbt", ["Airflow", "dbt"]),
    ("Experience with PyTorch or TensorFlow", ["PyTorch", "TensorFlow"]),
])
def test_named_products_need_the_dossier_to_name_them(index, text, missing):
    assert jd._named_missing(text, jd._named_map(index)) == missing


def test_a_named_product_the_dossier_lacks_is_at_most_partly_covered(index):
    posting = ("Requirements:\n- Experience building multi-agent systems on Azure with Service Bus messaging and Airflow and dbt pipelines\n"
               "- Experience with Python and FastAPI\n")
    rows = jd.analyze(posting, index)["coverage"]["rows"]
    r = find(rows, "Experience building multi-agent")
    assert r["status"] in ("partial", "gap") and {"Airflow", "dbt"} <= set(r["missing_skills"])
    assert r["status"] == "gap" or "never names Airflow or dbt" in r["note"]
