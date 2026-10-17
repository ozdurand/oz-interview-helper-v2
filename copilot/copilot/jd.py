"""Phase 1: a job description against the dossier.

    parse_jd(text)              → requirements (must / nice / responsibility / logistics), skills, years
    analyze(text, index, ...)   → parse + coverage + guide + résumé draft, in one result

No language model: requirements come from the posting's own structure
(headings, bullets, sentences) and a skills vocabulary; coverage comes from the
same hybrid search the copilot already runs. Everything returned points back at
dossier entries, so nothing is claimed that the dossier doesn't say.
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field, asdict

from .kb import plain
from .search import Index, tokens

# --------------------------------------------------------------- skills ---
# canonical name, category, pattern (matched on lower-cased text)
_SKILLS: list[tuple[str, str, str]] = [
    # generative AI
    ("LLMs", "GenAI", r"\bllms?\b|large language models?"),
    ("Generative AI", "GenAI", r"\bgen ?ai\b|generative ai"),
    ("RAG", "GenAI", r"\brag\b|retrieval[- ]augmented"),
    ("Multi-agent systems", "GenAI", r"multi[- ]agent|agentic|\bai agents?\b|agent orchestration|\borchestrator\b"),
    ("Prompt engineering", "GenAI", r"prompt (engineering|design)|prompting"),
    ("Function / tool calling", "GenAI", r"function[- ]calling|tool[- ]calling|tool use"),
    ("MCP", "GenAI", r"\bmcp\b|model context protocol"),
    ("Embeddings", "GenAI", r"\bembeddings?\b"),
    ("Vector search", "GenAI", r"vector (search|database|db|store|index)|\bvector\b"),
    ("Hybrid search", "GenAI", r"hybrid (search|retrieval)|\bbm25\b|reciprocal rank|\brrf\b"),
    ("Reranking", "GenAI", r"re-?rank(ing|er)?|cross[- ]encoder"),
    ("Fine-tuning", "GenAI", r"fine[- ]?tun(e|ing)|\blora\b|\bpeft\b"),
    ("LLM evaluation", "GenAI", r"\bragas\b|deepeval|llm[- ]as[- ]a?[- ]?judge|(model|llm|genai|rag) evaluation|evaluation (framework|harness|metrics)|golden (set|dataset)|faithfulness"),
    ("Guardrails", "GenAI", r"guardrails?|content safety|prompt injection|jailbreak"),
    ("Azure OpenAI", "GenAI", r"azure open ?ai|azure ai foundry|\bfoundry\b"),
    ("OpenAI API", "GenAI", r"(?<!azure )open ?ai (api|models)|\bgpt-?\d|\bgpt\b"),
    ("LangChain", "GenAI", r"langchain"),
    ("LangGraph", "GenAI", r"langgraph"),
    ("LlamaIndex", "GenAI", r"llama ?index"),
    ("Semantic Kernel", "GenAI", r"semantic kernel"),
    ("AutoGen / Agent Framework", "GenAI", r"autogen|agent framework"),
    ("Hugging Face", "GenAI", r"hugging ?face|transformers library"),
    ("FAISS", "GenAI", r"\bfaiss\b"),
    ("Pinecone", "GenAI", r"pinecone"),
    ("Knowledge graphs", "GenAI", r"knowledge graphs?|\bontolog(y|ies)\b|neo4j|gremlin"),
    # ML / MLOps
    ("Machine learning", "ML", r"machine learning|\bml\b(?! ?ops)"),
    ("MLOps / LLMOps", "ML", r"mlops|llmops|genaiops|model (deployment|lifecycle|registry|serving)"),
    ("MLflow", "ML", r"mlflow"),
    ("Model monitoring", "ML", r"model monitoring|drift|\bpsi\b"),
    ("Model risk management", "ML", r"model risk|sr ?11-?7"),
    ("Explainability", "ML", r"explainab|\bshap\b|reason codes?"),
    ("Feature stores", "ML", r"feature store|feature engineering"),
    ("Deep learning", "ML", r"deep learning|pytorch|tensorflow|neural networks?"),
    ("NLP", "ML", r"\bnlp\b|natural language processing"),
    # cloud and platform
    ("Azure", "Cloud", r"\bazure\b"),
    ("AKS / Kubernetes", "Cloud", r"\baks\b|kubernetes|\bk8s\b"),
    ("Docker / containers", "Cloud", r"docker|containers?\b|containeri[sz]"),
    ("AWS", "Cloud", r"\baws\b|amazon web services|bedrock|sagemaker"),
    ("GCP", "Cloud", r"\bgcp\b|google cloud|vertex ai"),
    ("Azure AI Search", "Cloud", r"azure (ai|cognitive) search"),
    ("Service Bus / messaging", "Cloud", r"service bus|event hubs?|\bkafka\b|message (queue|bus)|pub/?sub"),
    ("Cosmos DB", "Cloud", r"cosmos ?db"),
    ("Redis", "Cloud", r"\bredis\b"),
    ("Serverless", "Cloud", r"serverless|azure functions|\blambda\b|container apps"),
    ("Identity and access", "Cloud", r"entra|managed identit|\brbac\b|\boauth\b|\boidc\b|access control"),
    ("Infrastructure as code", "Cloud", r"terraform|bicep|\barm templates?\b|infrastructure as code|\biac\b|pulumi"),
    ("CI/CD", "Cloud", r"ci/?cd|continuous (integration|delivery|deployment)|github actions|azure devops|jenkins|argo ?cd|gitops"),
    ("Observability", "Cloud", r"observability|opentelemetry|application insights|app insights|telemetry|monitoring|prometheus|grafana"),
    ("Microservices / APIs", "Cloud", r"microservices?|rest(ful)? apis?|\bapis?\b|api design"),
    # data
    ("Python", "Engineering", r"\bpython\b"),
    ("FastAPI", "Engineering", r"fastapi"),
    ("TypeScript / JavaScript", "Engineering", r"typescript|javascript|node\.?js"),
    ("SQL", "Data", r"\bsql\b|postgres|t-sql"),
    ("Spark / Databricks", "Data", r"\bspark\b|databricks|pyspark|delta lake"),
    ("Data pipelines", "Data", r"data pipelines?|\betl\b|\belt\b|ingestion"),
    ("Document processing / OCR", "Data", r"\bocr\b|document intelligence|document (parsing|processing|ai)|pdf parsing"),
    ("Snowflake", "Data", r"snowflake"),
    # governance and domain
    ("Regulated environments", "Governance", r"\bgxp\b|\bhipaa\b|\bfda\b|\bema\b|\bsox\b|regulated|regulatory|compliance|audit(ability|able)?"),
    ("Responsible AI", "Governance", r"responsible ai|ai governance|ai ethics|bias|fairness"),
    ("Security / PII", "Governance", r"\bpii\b|\bphi\b|data privacy|security"),
    ("Healthcare / life sciences", "Domain", r"pharma|life sciences?|biomedical|clinical|healthcare|drug safety|pharmacovigilance"),
    ("Financial services", "Domain", r"banking|financial services|\bfraud\b|\baml\b|credit (risk|decisioning)|fintech"),
    ("Retail / e-commerce", "Domain", r"retail|e-?commerce|product search|catalog"),
    # ways of working
    ("Architecture / system design", "Leadership", r"architect(ure|ing)?|system design|solution design"),
    ("Technical leadership", "Leadership", r"technical lead|tech lead|lead (engineer|a team)|mentor|leadership"),
    ("Stakeholder communication", "Leadership", r"stakeholders?|executive|business partners|cross-functional"),
]
SKILLS = [(n, c, re.compile(p)) for n, c, p in _SKILLS]
SKILL_RX = {n: rx for n, _, rx in SKILLS}
CATEGORY = {n: c for n, c, _ in _SKILLS}


def find_skills(text: str) -> list[str]:
    t = " " + plain(text).lower() + " "
    return [n for n, _, rx in SKILLS if rx.search(t)]


# ---------------------------------------------------------------- parse ---
_HEAD_KIND = [  # first match wins: specific before general
    ("other", r"about (us|the company|our)|who we are|benefits|compensation|salary|pay range|perks|equal (opportunity|employment)|\beeo\b|our (culture|values|mission)|why join|what we offer|location"),
    ("nice", r"nice[- ]to[- ]have|preferred|bonus|desired|good to have|a plus|ideally|extra credit|pluses"),
    ("must", r"requirements?|qualifications?|must[- ]have|what you(['’]ll)? (bring|need)|what we(['’]re)? looking for|you have|about you|who you are|skills|experience|minimum|basic|required"),
    ("resp", r"responsibilit|what you(['’]ll| will) do|the role|role overview|duties|day[- ]to[- ]day|you will|key (accountabilities|activities)|in this role|the job|what the job involves|your impact"),
]
_HEAD_RX = [(k, re.compile(p, re.I)) for k, p in _HEAD_KIND]
_BULLET = re.compile(r"^\s*(?:[-•*·▪●◦–—>]|\d{1,2}[.)])\s+")
_LOGISTICS = re.compile(
    r"\b(bachelor|master|ph\.?d|degree|diploma|authori[sz](ed|ation) to work|work authori[sz]ation|visa|sponsorship|security clearance|"
    r"clearance|travel|relocat|on-?site|in[- ]office|hybrid (work|schedule|role|model)|remote|citizenship|background check|drug (test|screen)|"
    r"shift|time ?zone|w-?2|c2c|contract(-to-hire)?|full[- ]time|part[- ]time)\b", re.I)
_NICE_CUE = re.compile(r"nice[- ]to[- ]have|preferred|is a plus|\ba plus\b|bonus|ideally|desirable", re.I)
_YEARS = re.compile(r"(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years?|yrs?)", re.I)
_REQ_CUE = re.compile(r"experience|proficien|knowledge of|familiar|expertise|hands-on|ability to|skilled|track record|understanding of|\byears?\b", re.I)


@dataclass
class Requirement:
    id: str
    text: str
    kind: str                       # must | nice | resp | logistics
    skills: list[str] = field(default_factory=list)
    years: int | None = None


def _heading_kind(line: str) -> str | None:
    s = line.strip().strip("#*_ ").rstrip(":").strip()
    if not s or len(s) > 70 or _BULLET.match(line):
        return None
    words = s.split()
    looks_like_heading = line.rstrip().endswith(":") or len(words) <= 6 or s.isupper() or line.lstrip().startswith("#")
    if not looks_like_heading or s.endswith("."):
        return None
    for k, rx in _HEAD_RX:
        if rx.search(s):
            return k
    return None


def _sentences(par: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.;!?])\s+(?=[A-Z(])", par) if s.strip()]


def parse_jd(text: str, title: str | None = None, company: str | None = None) -> dict:
    lines = [l.rstrip() for l in plain_lines(text)]
    structured = any(_heading_kind(l) in ("must", "nice", "resp") for l in lines if l.strip())
    section: str | None = None
    seen_heading = False
    items: list[tuple[str, str]] = []
    for line in lines:
        if not line.strip():
            continue
        k = _heading_kind(line)
        if k:
            section, seen_heading = k, True
            continue
        if section == "other" or (structured and section is None):
            continue  # intro, title, benefits: not requirements
        body = _BULLET.sub("", line).strip()
        parts = [body] if _BULLET.match(line) else _sentences(body)
        for p in parts:
            if len(p.split()) < 3:
                continue
            if section in ("must", "nice", "resp"):
                items.append((section, p))
            elif not seen_heading or section is None:
                # unstructured posting: keep sentences that state a requirement or name a skill
                if _REQ_CUE.search(p) or find_skills(p):
                    items.append(("must" if _REQ_CUE.search(p) else "resp", p))

    reqs: list[Requirement] = []
    seen: set[str] = set()
    for kind, t in items:
        t = re.sub(r"\s+", " ", t).strip(" ;,")
        key = t.lower()
        if key in seen:
            continue
        seen.add(key)
        if _LOGISTICS.search(t) and not find_skills(t):
            kind = "logistics"
        elif kind == "must" and _NICE_CUE.search(t):
            kind = "nice"
        y = _YEARS.search(t)
        reqs.append(Requirement(id=f"r{len(reqs) + 1}", text=t, kind=kind, skills=find_skills(t), years=int(y.group(1)) if y else None))
        if len(reqs) >= 45:
            break

    all_skills = Counter()
    for r in reqs:
        for s in r.skills:
            all_skills[s] += 2 if r.kind == "must" else 1
    first = next((l.strip().strip("#*_ ") for l in lines if l.strip()), "")
    guess_title = title or (first if 0 < len(first) <= 80 and not _heading_kind(first) and len(first.split()) <= 10 else "")
    years = [r.years for r in reqs if r.years]
    return {
        "title": guess_title, "company": company or "",
        "requirements": [asdict(r) for r in reqs],
        "skills": [s for s, _ in all_skills.most_common()],
        "years": max(years) if years else None,
        "structured": structured,
    }


def plain_lines(text: str) -> list[str]:
    """Keep line structure (bullets, headings) while dropping HTML if a posting was pasted as HTML."""
    t = text.replace("\r\n", "\n").replace("\r", "\n")
    if "<" in t and re.search(r"</?(li|p|br|ul|h\d|div)\b", t, re.I):
        t = re.sub(r"(?i)<li[^>]*>", "\n- ", t)
        t = re.sub(r"(?i)<(br|/p|/h\d|/div|/ul|/li)[^>]*>", "\n", t)
        t = re.sub(r"(?i)<h\d[^>]*>", "\n", t)
        t = re.sub(r"<[^>]+>", " ", t)
    import html as _html
    return _html.unescape(t).split("\n")


# ------------------------------------------------------------- coverage ---
_JD_STOP = {tokens(w)[0] for w in """experience experienced strong ability able work working team teams years year knowledge skill skills
proven demonstrated excellent understanding familiarity familiar proficiency proficient deep solid hands good great plus nice preferred
required requirements minimum least including etc related field degree equivalent environment environments using use like role
candidate within across help ensure new best practices highly effective drive driving build building develop developing design
designing implement implementing deliver delivering support supporting partner partnering closely collaborate collaborating
communicate communication fast paced dynamic ideal opportunity responsible responsibilities lead leading manage managing
modern scalable robust high quality solutions solution products product business technical technology technologies tools
platform platforms systems system production""".split() if tokens(w)}

_SKILL_MAP_ATTR = "_jd_skill_map"


def _skill_map(index: Index) -> dict[str, list[int]]:
    """skill → entries that mention it (cards and answers first). Cached on the index."""
    m = getattr(index, _SKILL_MAP_ATTR, None)
    if m is None:
        m = defaultdict(list)
        order = {"card": 0, "qa": 1, "push": 2, "pain": 3, "phase": 4, "eval": 5, "problem": 6, "pitch": 7}
        idx = sorted(range(len(index.entries)), key=lambda i: order.get(index.entries[i].kind, 9))
        for i in idx:
            e = index.entries[i]
            for s in find_skills(f"{e.title} {e.text}"):
                m[s].append(i)
        setattr(index, _SKILL_MAP_ATTR, m)
    return m


def _terms(text: str) -> set[str]:
    return {t for t in tokens(text) if t not in _JD_STOP and not t.isdigit() and len(t) > 1}


def _ev(e, why: str) -> dict:
    return {"id": e.id, "group": e.group, "kind": e.kind, "company": e.company, "map": e.map, "title": e.title,
            "answer": _clip(e.answer, 320), "check": e.check, "source": e.source, "why": why}


def _clip(s: str, n: int) -> str:
    s = s or ""
    if len(s) <= n:
        return s
    cut = s[:n].rsplit(" ", 1)[0]
    return cut.rstrip(",;:—- ") + "…"


def coverage(parsed: dict, index: Index) -> dict:
    smap = _skill_map(index)
    rows = []
    for r in parsed["requirements"]:
        if r["kind"] == "logistics":
            rows.append({**r, "status": "n/a", "covered_skills": [], "missing_skills": [], "evidence": [],
                         "note": "Not something the dossier can show — answer this one yourself."})
            continue
        hits = index.search(r["text"], k=3, exclude_kinds={"pitch"})
        ev_terms: set[str] = set()
        for h in hits:
            ev_terms |= _terms(f"{h.entry.title} {h.entry.text}")
        req_terms = _terms(r["text"])
        overlap = len(req_terms & ev_terms) / len(req_terms) if req_terms else 0.0
        covered = [s for s in r["skills"] if smap.get(s)]
        missing = [s for s in r["skills"] if not smap.get(s)]
        if r["skills"]:
            frac = len(covered) / len(r["skills"])
            status = "strong" if frac == 1 and overlap >= 0.34 else ("partial" if frac > 0 or overlap >= 0.34 else "gap")
        else:
            status = "strong" if overlap >= 0.6 else ("partial" if overlap >= 0.3 else "gap")
        evidence = [_ev(h.entry, "best match") for h in hits] if status != "gap" else []
        shown = {e["id"] for e in evidence}
        for s in covered:  # make sure every claimed skill points at a place in the dossier
            if not any(SKILL_RX[s].search((e["title"] + " " + e["answer"]).lower()) for e in evidence):
                i = smap[s][0]
                if index.entries[i].id not in shown:
                    evidence.append(_ev(index.entries[i], f"mentions {s}"))
                    shown.add(index.entries[i].id)
        closest = _ev(hits[0].entry, "closest") if hits and status == "gap" else None
        note = f"The dossier can't show {r['years']}+ years — state your years yourself." if r.get("years") else None
        rows.append({**r, "status": status, "overlap": round(overlap, 2), "covered_skills": covered, "missing_skills": missing,
                     "evidence": evidence[:4], "closest": closest, "note": note})

    scored = [x for x in rows if x["kind"] != "logistics"]
    must = [x for x in scored if x["kind"] == "must"] or scored
    pts = {"strong": 1.0, "partial": 0.5, "gap": 0.0}
    counts = Counter(x["status"] for x in rows)
    jd_skills = parsed["skills"]
    return {
        "rows": rows,
        "summary": {
            "requirements": len(rows), "strong": counts["strong"], "partial": counts["partial"], "gap": counts["gap"],
            "not_applicable": counts["n/a"],
            "must_score": round(sum(pts[x["status"]] for x in must) / len(must), 2) if must else None,
            "skills_matched": [s for s in jd_skills if smap.get(s)],
            "skills_missing": [s for s in jd_skills if not smap.get(s)],
        },
    }


# ---------------------------------------------------------------- guide ---
_WEIGHT = {"must": 1.0, "resp": 0.8, "nice": 0.5}
_ASK = [
    ({"LLM evaluation", "Guardrails"}, "How do you decide an answer is good enough to ship — who signs off on a release, and against which test set?"),
    ({"Multi-agent systems", "Function / tool calling", "MCP"}, "Which decisions do the agents make on their own today, and where does a person stay in the loop?"),
    ({"Regulated environments", "Model risk management", "Security / PII", "Responsible AI"}, "What review does a model or prompt change go through before it reaches production?"),
    ({"RAG", "Vector search", "Hybrid search", "Document processing / OCR", "Data pipelines"}, "Where does the source content live, how fresh does it need to be, and who owns its quality?"),
    ({"MLOps / LLMOps", "CI/CD", "Observability", "Model monitoring"}, "How do you find out a model has got worse in production — and how fast can you roll back?"),
    ({"Architecture / system design", "Technical leadership"}, "Which architecture decisions are still open, and how much of that would this role own?"),
    ({"Stakeholder communication"}, "Who are the main users of the system, and how do they tell you it isn't working?"),
]
_ASK_DEFAULT = [
    "What would make the first 90 days a success in this role?",
    "What is the hardest problem the team is working on right now?",
]


def guide(parsed: dict, cov: dict, index: Index) -> dict:
    rows = cov["rows"]
    # stories: the cards that answer the most important requirements
    story_score: dict[str, float] = defaultdict(float)
    story_reqs: dict[str, list[str]] = defaultdict(list)
    for r in rows:
        if r["status"] in ("strong", "partial"):
            strength = 1.0 if r["status"] == "strong" else 0.4
            for rank, e in enumerate(r["evidence"][:3]):
                story_score[e["group"]] += strength * _WEIGHT.get(r["kind"], 0.5) / (rank + 1)
                if r["id"] not in story_reqs[e["group"]]:
                    story_reqs[e["group"]].append(r["id"])
    by_group = {e.group: e for e in index.entries if e.kind == "card"}
    stories = []
    for g in sorted(story_score, key=story_score.get, reverse=True):
        card = by_group.get(g)
        if not card:
            continue
        stories.append({**_ev(card, "story"), "requirements": story_reqs[g], "score": round(story_score[g], 2)})
        if len(stories) >= 4:
            break

    # likely questions: for each requirement, the dossier question that answers it best
    questions, seen = [], set()
    for r in sorted(rows, key=lambda x: {"must": 0, "resp": 1, "nice": 2}.get(x["kind"], 3)):
        if r["kind"] == "logistics" or r["status"] == "gap":
            continue
        for h in index.search(r["text"], k=2, kinds="qa"):
            if h.entry.id in seen:
                continue
            seen.add(h.entry.id)
            q = h.entry.title.split(" — ", 1)[-1]
            questions.append({**_ev(h.entry, "likely question"), "question": q, "requirement": r["id"]})
            break
        if len(questions) >= 10:
            break

    gaps = []
    for r in rows:
        if r["kind"] in ("must", "resp") and r["status"] in ("gap", "partial") and (r["status"] == "gap" or r["missing_skills"]):
            near = r.get("closest") or (r["evidence"][0] if r["evidence"] else None)
            tip = "Say plainly where your hands-on experience stops, then bridge to the closest thing you have built"
            tip += f": {near['title']}." if near else "."
            if r["missing_skills"]:
                tip += f" Read up on {', '.join(r['missing_skills'])} so you can talk through the trade-offs."
            gaps.append({"requirement": r["id"], "text": r["text"], "status": r["status"], "missing_skills": r["missing_skills"],
                         "closest": near, "tip": tip})

    verify, vseen = [], set()
    for r in rows:
        for e in r["evidence"]:
            if e["check"] and e["id"] not in vseen:
                vseen.add(e["id"])
                verify.append({**e, "requirement": r["id"]})

    present = set(parsed["skills"])
    ask = [q for keys, q in _ASK if keys & present][:4]
    ask += [q for q in _ASK_DEFAULT if len(ask) < 5]
    logistics = [r["text"] for r in rows if r["kind"] == "logistics"]
    return {"stories": stories, "questions": questions, "gaps": gaps, "verify": verify, "ask": ask, "logistics": logistics}


# --------------------------------------------------------------- résumé ---
_COMPANIES = ("jj", "hd", "citi")


def _company_names(export: dict | None) -> dict[str, dict]:
    out = {}
    cos = ((export or {}).get("data") or {}).get("companies") or {}
    for k in _COMPANIES:
        c = cos.get(k) or {}
        out[k] = {"name": plain(c.get("name")) or k.upper(), "kicker": plain(c.get("kicker")), "tag": plain(c.get("tag"))}
    return out


def _bullet(e) -> str:
    if e.kind == "pain":
        # "pain: … Fix: …" → one line, problem then fix
        a = e.answer
        if " Fix: " in a:
            prob, fix = a.split(" Fix: ", 1)
            return _clip(f"{fix.rstrip('.')} — solving {prob[0].lower() + prob[1:].rstrip('.')}.", 260)
        return _clip(a, 260)
    first = " ".join(re.split(r"(?<=[.!?])\s+", e.answer)[:2])
    return _clip(first, 260)


def resume(parsed: dict, cov: dict, index: Index, export: dict | None = None, pitch: str | None = None) -> dict:
    names = _company_names(export)
    smap = _skill_map(index)
    rows = [r for r in cov["rows"] if r["kind"] != "logistics"]
    matched = cov["summary"]["skills_matched"]
    dossier_skills = sorted(smap, key=lambda s: -len(smap[s]))
    other = [s for s in dossier_skills if s not in matched and CATEGORY.get(s) not in ("Leadership",)][:10]

    matched_ids = {e["id"] for r in rows if r["status"] in ("strong", "partial") for e in r["evidence"]}
    sections = []
    for co in _COMPANIES:  # the dossier's own order, as on a résumé
        score: dict[int, float] = defaultdict(float)
        for r in rows:
            strength = {"strong": 1.0, "partial": 0.6}.get(r["status"], 0.25)
            for rank, h in enumerate(index.search(r["text"], k=5, company=co, kinds=["card", "pain"])):
                boost = (2.0 if h.entry.id in matched_ids else 1.0) * (1.3 if h.entry.kind == "pain" else 1.0)
                score[id(h.entry)] += strength * boost * _WEIGHT.get(r["kind"], 0.5) / (rank + 1)
        by_id = {id(e): e for e in index.entries}
        top = [by_id[i] for i in sorted(score, key=score.get, reverse=True)]
        bullets, used = [], set()
        for e in top:
            b = _bullet(e)
            if not b or b in used:
                continue
            used.add(b)
            bullets.append({"text": b, "id": e.id, "source": e.source, "check": e.check})
            if len(bullets) >= 4:
                break
        if bullets:
            sections.append({"company": co, **names[co], "relevance": round(sum(sorted(score.values(), reverse=True)[:4]), 2), "bullets": bullets})

    summary = " ".join(re.split(r"(?<=[.!?])\s+", plain(pitch or ""))[:2]) if pitch else ""
    title = parsed.get("title") or "Target role"
    md = ["# [Your name]", f"{title} · [email] · [phone] · [LinkedIn]", ""]
    if summary:
        md += ["## Summary", summary, ""]
    if matched:
        md += ["## Skills for this role", ", ".join(matched), ""]
    if other:
        md += ["## Also", ", ".join(other), ""]
    md += ["## Experience", ""]
    for s in sections:
        md += [f"### {s['name']} — [your title] · [dates]", f"*{s['kicker']} · {s['tag']}*" if s["kicker"] else "", ""]
        md += [f"- {b['text']}" + (" *(to confirm)*" if b["check"] else "") for b in s["bullets"]]
        md.append("")
    md = [l for i, l in enumerate(md) if not (l == "" and i and md[i - 1] == "")]
    return {
        "markdown": "\n".join(md).strip() + "\n",
        "summary_from": "elevator pitch" if summary else None,
        "skills": matched, "other_skills": other, "sections": sections,
        "left_out": cov["summary"]["skills_missing"],
        "note": "Drafted only from your dossier. Skills the posting asks for that the dossier doesn't show are left out on purpose (see left_out).",
    }


# -------------------------------------------------------------- analyze ---
def analyze(text: str, index: Index, export: dict | None = None, title: str | None = None, company: str | None = None) -> dict:
    parsed = parse_jd(text, title=title, company=company)
    cov = coverage(parsed, index)
    pitch = (export or {}).get("pitch")
    return {"parsed": parsed, "coverage": cov, "guide": guide(parsed, cov, index),
            "resume": resume(parsed, cov, index, export, pitch)}
