/* cards.js — four-panel card content merged over each box and layer at load */
const CARDS = {
 "jj/L_orch": {
  "head": "One cluster, six independently deployable services, one release cadence per service.",
  "dh": "A shared cluster beat six clusters; independent deployables beat one monolith.",
  "dec": "Six services on one AKS cluster gives blast-radius isolation without six sets of platform overhead. Each agent ships on its own pipeline, so a Drug Safety change never waits on a Summarization release — and never risks one either.",
  "stack": [
   [
    "Runtime",
    "AKS"
   ],
   [
    "Services",
    "orchestrator + 5 specialists"
   ],
   [
    "Scaling",
    "KEDA per subscription · HPA on orchestrator"
   ],
   [
    "Identity",
    "Workload Identity per pod"
   ]
  ]
 },
 "jj/L_ret": {
  "head": "Two indexes, one query pattern, every filter applied before a chunk is retrieved.",
  "dh": "Filters in the query beat filtering the result set.",
  "dec": "Post-filtering means the model may have already seen text the caller was not entitled to. Putting tier, effective date and ancestor IDs into the search query itself is what makes retrieval an access-control boundary rather than a convenience.",
  "stack": [
   [
    "Service",
    "Azure AI Search"
   ],
   [
    "Mode",
    "dense + BM25 → RRF → rerank"
   ],
   [
    "Indexes",
    "Knowledge · Governed"
   ],
   [
    "Filters",
    "tier · effective date · ancestor_ids"
   ]
  ]
 },
 "jj/L_onto": {
  "head": "The ontology as versioned release artifacts — a dictionary and a closure table — not a database queried at request time.",
  "dh": "Derived artifacts beat a runtime graph database.",
  "dec": "A graph answers richer questions than we ever ask on the hot path. What retrieval needs is the ancestor set, which is knowable at ingestion. Building it as an artifact removed a whole tier of infrastructure and a place for a generated query to go wrong.",
  "stack": [
   [
    "Artifacts",
    "term dictionary · closure table"
   ],
   [
    "Built by",
    "Ontology Loader on Databricks"
   ],
   [
    "Versioning",
    "per vocabulary release"
   ],
   [
    "Spine",
    "MedDRA · SNOMED CT · MeSH"
   ]
  ]
 },
 "jj/L_ing": {
  "head": "The batch path: one document parsed, chunked, stamped and embedded exactly once per version.",
  "dh": "Event-driven batch beat on-demand indexing.",
  "dec": "Nothing in this layer runs at query time. A Blob event opens one idempotent job, so re-running a batch is safe and a document is never embedded twice at the same version.",
  "stack": [
   [
    "Trigger",
    "Blob + Event Grid"
   ],
   [
    "Compute",
    "Databricks"
   ],
   [
    "Parse",
    "Document Intelligence v4.0"
   ],
   [
    "Embed",
    "text-embedding-3-large"
   ]
  ]
 },
 "jj/users": {
  "head": "A biomedical scientist or drug-safety reviewer asking a question they would otherwise answer by reading for two days.",
  "dh": "A defensible cited answer beat a conversational chatbot.",
  "dec": "The users judge an answer on whether the citations hold up, not on how fluent it sounds. That single fact drove the citation gate, the refusal behaviour and the audit trail.",
  "stack": [
   [
    "Users",
    "scientists · PV reviewers"
   ],
   [
    "Identity",
    "Entra ID"
   ],
   [
    "Success",
    "citations that hold up"
   ]
  ]
 },
 "jj/afd": {
  "head": "The protected global entry point: TLS, WAF, routing and load balancing before the regional application stack.",
  "dh": "A managed edge beat exposing an in-cluster ingress directly to the internet.",
  "dec": "Front Door terminates TLS, applies WAF rules, and routes validated traffic to the regional API layer. That keeps AKS and the agents private while giving the platform a resilient, globally managed entry point.",
  "stack": [
   [
    "Service",
    "Azure Front Door"
   ],
   [
    "Duties",
    "TLS · WAF · routing · load balancing"
   ]
  ]
 },
 "jj/apim": {
  "head": "The policy boundary: everything a caller is allowed to do is expressed here, not inside the agents.",
  "dh": "Policy at the gateway beat policy in application code.",
  "dec": "Quotas, rate limits and correlation IDs live at APIM so the agents only ever handle already-authorized, already-traced work. When a consumer needs a different limit, nothing in the platform changes.",
  "stack": [
   [
    "Service",
    "API Management"
   ],
   [
    "Policy",
    "auth · throttle · tier"
   ],
   [
    "Trace",
    "correlation ID stamped here"
   ]
  ]
 },
 "jj/ingress": {
  "head": "The Kubernetes ingress into the cluster — internal-only, routing to the orchestrator.",
  "dh": "A single orchestrator entry point beat exposing agents individually.",
  "dec": "Only the orchestrator is addressable. Agents are reachable solely through their Service Bus topics, which is what makes the audit trail complete.",
  "stack": [
   [
    "Component",
    "AKS Ingress"
   ],
   [
    "Exposure",
    "internal only"
   ],
   [
    "Routes to",
    "orchestrator service"
   ]
  ]
 },
 "jj/glance": {
  "head": "The numbers to have ready before anyone asks.",
  "dh": "Six services, eleven tools, two indexes, one closure table.",
  "dec": "These are the figures that anchor the whole conversation. Every one of them is a design decision, not just a count.",
  "stack": [
   [
    "Services",
    "6 on AKS"
   ],
   [
    "Tools",
    "11 total"
   ],
   [
    "Indexes",
    "2 vector"
   ],
   [
    "Ontology",
    "1 closure table"
   ],
   [
    "Corpus",
    "10k+ documents"
   ],
   [
    "Latency",
    "p95 < 900 ms"
   ]
  ]
 },
 "jj/orch": {
  "head": "The reasoning core: it plans the request, chooses specialists, fans out, and assembles the cited answer.",
  "dh": "Model-native planning with one tool beat a hardcoded execution graph.",
  "dec": "The model plans, delegates and synthesizes; invoke_agent is its only tool because delegation is the only decision it makes. Session, safety and trace run as code in the same pod, so they happen on every request and cannot be skipped.",
  "stack": [
   [
    "Model",
    "GPT-5.4"
   ],
   [
    "Framework",
    "OpenAI Agents SDK"
   ],
   [
    "LLM tools",
    "invoke_agent"
   ],
   [
    "State",
    "Managed Redis"
   ]
  ]
 },
 "jj/sb": {
  "head": "The decoupling layer between orchestrator and specialists — a topic per agent with stable and canary subscriptions, and one reply queue only the orchestrator reads.",
  "dh": "Per-agent topics beat one shared fan-out topic and a replica-ratio canary."
 },
 "jj/summ": {
  "head": "Compresses long validated material into the shape the scientist asked for.",
  "dh": "A small model beat a large one — the reasoning already happened upstream.",
  "dec": "Summarization sees material that QA has already validated. Spending a reasoning model here would triple cost for no quality gain, so it runs on gpt-5.4-mini with map-reduce over long inputs."
 },
 "jj/qa": {
  "head": "The verifier: it reads the draft against the evidence and tries to break it. It is not a RAG consumer.",
  "dh": "An independent verifier beat trusting the generating agent.",
  "dec": "A model grading its own output is not a control. QA sees the draft plus the retrieved spans and runs claim-grounding and self-consistency checks with no retrieval of its own — so it cannot be fooled by a fresh search."
 },
 "jj/ds": {
  "head": "The regulated leg: anything touching pharmacovigilance, labeling or submissions comes through here, against the governed index only.",
  "dh": "Being slow and right beat being fast — high reasoning effort is the point.",
  "dec": "False negatives are the asymmetric risk. The agent runs at high reasoning effort and is evaluated on seriousness-criteria recall, not overall accuracy."
 },
 "jj/onto": {
  "head": "Resolves the question into the controlled vocabulary the corpus is indexed under.",
  "dh": "A closure-table lookup beat a live graph traversal."
 },
 "jj/know": {
  "head": "Answers the substantive scientific question against the internal corpus with hybrid retrieval.",
  "dh": "Search-then-generate with two tools beat an agent that improvises its own data access.",
  "dec": "Every specialist has exactly one retrieval tool and one generation tool. Constraining the shape is what makes the trajectory evaluable and the audit trail complete."
 },
 "jj/aoai": {
  "head": "The model deployments, called directly and synchronously by each agent — never through the bus.",
  "dh": "Direct REST from agent to model beat routing model calls through the bus.",
  "dec": "Service Bus decouples orchestration from agents. Putting it in front of the model would add latency and a queue to a call that is inherently synchronous, with nothing gained.",
  "stack": [
   [
    "Service",
    "Azure OpenAI"
   ],
   [
    "Models",
    "gpt-5.4 family · text-embedding-3-large"
   ],
   [
    "Pinning",
    "per-agent deployments"
   ],
   [
    "Cost",
    "prompt caching · batch for ingestion"
   ]
  ]
 },
 "jj/redis": {
  "head": "The session store and retrieval cache — working memory outside any pod.",
  "dh": "Redis for working memory and Cosmos for the record beat one store doing both.",
  "dec": "Session context is read before each run and written after validation, with a TTL. Because keys expire, the context injected into each run is also written to Cosmos with the trace. A missing key degrades to a turn without history rather than an error.",
  "stack": [
   [
    "Service",
    "Azure Managed Redis"
   ],
   [
    "Holds",
    "sessions · retrieval cache"
   ],
   [
    "Key",
    "session · query + tier"
   ],
   [
    "Record",
    "Cosmos, not Redis"
   ]
  ]
 },
 "jj/kidx": {
  "head": "The general scientific corpus, every chunk stamped with entity IDs, ancestor IDs, domain and security level.",
  "dh": "One hybrid index with rich metadata beat many small topic indexes."
 },
 "jj/gidx": {
  "head": "The governed index: SOPs, labels, submissions and safety records under change control, effective-dated and tiered.",
  "dh": "A separate governed index beat a security flag on the shared one.",
  "dec": "Governed content has its own index and its own agent. Separation at the infrastructure level is a compliance story an auditor can verify; a flag in application code is not.",
  "stack": [
   [
    "Service",
    "Azure AI Search"
   ],
   [
    "Content",
    "SOPs · labels · submissions"
   ],
   [
    "Access",
    "Drug Safety identity only, index-scoped role"
   ],
   [
    "Versioning",
    "effective-dated, superseded retained"
   ]
  ]
 },
 "jj/dict": {
  "head": "The lookup that turns what a scientist typed into a canonical entity ID.",
  "dh": "Exact match or found:false beat nearest-neighbour matching.",
  "stack": [
   [
    "Artifact",
    "term dictionary"
   ],
   [
    "Built by",
    "Ontology Loader"
   ],
   [
    "Versioning",
    "per vocabulary release"
   ]
  ]
 },
 "jj/closure": {
  "head": "The ontology flattened at ingestion, so retrieval never has to traverse anything.",
  "dh": "Option B, metadata filtering, beat Option A, a runtime graph database."
 },
 "jj/blob": {
  "head": "Landing zone for source documents; an Event Grid event starts one ingestion job per document.",
  "dh": "Immutable originals beat editing in place.",
  "dec": "The raw document is never what we retrieve — it is what we can always go back to. Every downstream artifact is derived and rebuildable from it.",
  "stack": [
   [
    "Storage",
    "Blob Storage"
   ],
   [
    "Events",
    "Event Grid"
   ],
   [
    "Content",
    "CSRs · labels · submissions · literature"
   ]
  ]
 },
 "jj/docint": {
  "head": "Turns scientific PDFs into structure instead of a wall of text.",
  "dh": "Layout-aware parsing beat naive PDF text extraction.",
  "stack": [
   [
    "Service",
    "Document Intelligence v4.0"
   ],
   [
    "Model",
    "2024-11-30"
   ],
   [
    "Preserves",
    "layout · tables · captions"
   ],
   [
    "Gate",
    "OCR for scanned pages"
   ]
  ]
 },
 "jj/dbx": {
  "head": "Structural chunking and metadata tagging as a batch job — domain, tier, date, type on every chunk.",
  "dh": "Structure-aware chunks beat fixed-size windows.",
  "stack": [
   [
    "Compute",
    "Databricks"
   ],
   [
    "Chunking",
    "structural + overlap"
   ],
   [
    "Tags",
    "domain · tier · date · type"
   ]
  ]
 },
 "jj/stamp": {
  "head": "Where the ontology gets baked in: entity IDs plus the full ancestor set written onto every chunk.",
  "dh": "Paying the ontology cost once at ingestion beat paying it on every query.",
  "dec": "Stamping ancestors at ingestion is what lets retrieval skip the graph entirely. A vocabulary release triggers a re-stamp, so the index and the closure table are always the same version.",
  "stack": [
   [
    "Step",
    "entity linking + ancestor stamp"
   ],
   [
    "Source",
    "closure table"
   ],
   [
    "Trigger",
    "vocabulary release re-stamps"
   ]
  ]
 },
 "jj/emb": {
  "head": "Vectorizes chunks for the dense side of hybrid retrieval, with images verbalized first.",
  "dh": "Batch embedding with a recorded model version beat ad-hoc re-embedding.",
  "dec": "Re-embedding the corpus is a pipeline run, not a project. The model version is recorded per chunk because mixing versions in one index is silently wrong.",
  "stack": [
   [
    "Model",
    "text-embedding-3-large"
   ],
   [
    "Images",
    "AI Vision → verbalized"
   ],
   [
    "Pricing",
    "batch"
   ]
  ]
 },
 "jj/loader": {
  "head": "The batch job that produces the terminology artifacts — dictionary and closure table — per vocabulary release.",
  "dh": "A compile-time ontology beat a query-time one."
 },
 "jj/cosmos": {
  "head": "The evidence record: what was asked, what was retrieved, what was generated, what was shown — by correlation ID.",
  "dh": "Writing the audit trail on the request path beat reconstructing it from logs.",
  "dec": "If we cannot reconstruct why a scientist saw a specific sentence, the platform is not compliant. Cosmos is written as part of the request, including the session context that shaped the answer, so the record never depends on Redis.",
  "stack": [
   [
    "Service",
    "Cosmos DB / SQL"
   ],
   [
    "Holds",
    "state · audit logs · tool traces"
   ],
   [
    "Key",
    "correlation ID"
   ],
   [
    "Standard",
    "21 CFR Part 11"
   ]
  ]
 },
 "jj/mon": {
  "head": "One correlation ID from gateway through every agent hop and model call, plus the eval metrics.",
  "dh": "Quality signals as first-class operational metrics beat infrastructure metrics alone.",
  "dec": "Refusal rate and citation coverage move before CPU ever notices. They are alerted on like latency.",
  "stack": [
   [
    "Tracing",
    "OpenTelemetry"
   ],
   [
    "Metrics",
    "App Insights"
   ],
   [
    "Eval",
    "Arize Phoenix in production"
   ]
  ]
 },
 "jj/secgov": {
  "head": "Secrets, per-pod federated identity, and data governance — the controls the auditor asks about.",
  "dh": "Identity per pod beat shared secrets in the cluster.",
  "dec": "Workload Identity gives each agent its own federated identity via OIDC token exchange. Search roles are assigned at index scope, so the Knowledge agent cannot read the governed index because its identity cannot — not because a code path checks.",
  "stack": [
   [
    "Secrets",
    "Key Vault"
   ],
   [
    "Identity",
    "Entra Workload Identity"
   ],
   [
    "Search",
    "role per index"
   ],
   [
    "Governance",
    "Purview"
   ],
   [
    "Change control",
    "21 CFR Part 11 · GxP"
   ]
  ]
 },
 "hd/Q": {
  "head": "Everything that runs inside the latency budget, in five steps — one of which was added last.",
  "dh": "Parallel retrieval with rank fusion beat a single retriever.",
  "dec": "Both retrievers run on every request, so latency is the max of the two, not the sum. Fusion on rank position means no score normalization to tune and re-tune.",
  "stack": [
   [
    "Steps",
    "preprocess → retrieve ×2 → fuse → rerank → synthesize"
   ],
   [
    "Budget",
    "p95 < 900 ms"
   ],
   [
    "Serving",
    "FastAPI"
   ]
  ]
 },
 "hd/M": {
  "head": "Metadata and state — the filters applied before retrieval and the logs that fed the benchmarks.",
  "dh": "Filters in the query beat post-filtering results.",
  "dec": "Department, doc type and ACL are query filters. The ACL tag captured at ingestion is the same tag enforced at query time.",
  "stack": [
   [
    "Metadata",
    "Cosmos DB"
   ],
   [
    "Logs · judgments",
    "PostgreSQL"
   ],
   [
    "Filters",
    "department · doc type · ACL"
   ]
  ]
 },
 "hd/E": {
  "head": "The gate on every tuning decision: benchmark query sets and offline metrics.",
  "dh": "Replay against benchmarks beat tuning by feel.",
  "dec": "Fusion weights and reranker changes were replayed against graded query sets before any rollout. Offline metrics bought permission to run the A/B test; search success decided.",
  "stack": [
   [
    "Sets",
    "graded judgments per intent class"
   ],
   [
    "Metrics",
    "NDCG · MRR · MAP"
   ],
   [
    "Live",
    "A/B on search success"
   ]
  ],
  "how": [
   "Benchmark query sets curated per intent class with graded relevance judgments",
   "NDCG@10 as the headline; MRR and MAP catch different failure shapes",
   "Every fusion or reranker change replayed offline before rollout",
   "A/B test on search success is the final decision"
  ]
 },
 "hd/I": {
  "head": "The batch path: route, extract, chunk, embed, dual-write — once per document version.",
  "dh": "Idempotent, versioned dual-write beat two independent indexing jobs.",
  "dec": "Both indexes are derived from one versioned chunk set, so they cannot disagree about what a document says.",
  "stack": [
   [
    "Sources",
    "5 types · ~1,200 docs/week"
   ],
   [
    "Routing",
    "python-magic MIME"
   ],
   [
    "Embed",
    "all-mpnet-base-v2 in-cluster"
   ],
   [
    "Write",
    "FAISS + Elasticsearch"
   ]
  ],
  "how": [
   "Document Sources land: PDF, DOCX, HTML, SharePoint, API feeds",
   "File Type Router decides the handler on the bytes, not the filename",
   "Extraction Handlers emit one normalized shape",
   "Split & Chunk with spaCy sentences, recursive with overlap",
   "Embeddings computed in-cluster, 768-dim",
   "Dual-Write to both indexes, idempotent and versioned"
  ]
 },
 "hd/users": {
  "head": "Store associates on the floor and merchandising analysts — two very different users of one search box.",
  "dh": "One index for both audiences beat two products.",
  "dec": "The associate case set the latency budget; the analyst case set the coverage requirement. Serving both from one hybrid index was the whole point.",
  "stack": [
   [
    "Users",
    "associates · analysts"
   ],
   [
    "Access",
    "TSC Identity · RBAC"
   ]
  ]
 },
 "hd/apigw": {
  "head": "Authentication and role-based access in front of the search API.",
  "dh": "Role filters applied to the query beat filtering the results page.",
  "dec": "Store-ops content is filtered by role at query time. The permission is a property of the search, not of the UI.",
  "stack": [
   [
    "Identity",
    "TSC Identity"
   ],
   [
    "Policy",
    "RBAC feeds"
   ]
  ]
 },
 "hd/fastapi": {
  "head": "The service the storefront and associate tools call — async fan-out with a timeout per stage.",
  "dh": "A per-stage timeout budget beat one global timeout.",
  "dec": "Every stage has its own timeout, so one slow leg cannot blow the p95. The budget is enforced, not hoped for.",
  "stack": [
   [
    "Framework",
    "FastAPI"
   ],
   [
    "Runtime",
    "Python · containerized"
   ],
   [
    "Pattern",
    "async fan-out"
   ]
  ]
 },
 "hd/glance": {
  "head": "The numbers to have ready.",
  "dh": "Three phases, two indexes, fourteen percent.",
  "dec": "Each figure maps to a decision: phased delivery kept the timeline honest, two indexes is the hybrid story, +14% is the measured result.",
  "stack": [
   [
    "Phases",
    "3"
   ],
   [
    "Sources",
    "5 types"
   ],
   [
    "Indexes",
    "2"
   ],
   [
    "Volume",
    "~1,200 docs/week"
   ],
   [
    "Uplift",
    "+14% NDCG@10 · +21% search success"
   ],
   [
    "Latency",
    "p95 < 900 ms"
   ]
  ]
 },
 "hd/qpre": {
  "head": "Turns a raw query into a resolved query plus filters before either index sees it.",
  "dh": "Preprocessing once beat letting each retriever interpret the query.",
  "dec": "Intent classification and SKU extraction happen once and feed both retrievers the same resolved query and filter set. That is what keeps the two candidate lists comparable.",
  "stack": [
   [
    "NER",
    "spaCy — products, brands, SKUs"
   ],
   [
    "Intent",
    "4 classes"
   ],
   [
    "Rewrite",
    "semantic normalization"
   ],
   [
    "Output",
    "resolved query + filters"
   ]
  ]
 },
 "hd/faiss": {
  "head": "The dense half: recovers intent-based queries where the shopper’s words don’t match the catalog’s.",
  "dh": "IVF-PQ tuned for recall beat exact search — the reranker fixes ordering.",
  "dec": "Dense retrieval buys recall on vocabulary mismatch. Precision is the reranker’s job, so FAISS is tuned for recall and speed rather than exactness.",
  "stack": [
   [
    "Index",
    "FAISS IVF-PQ"
   ],
   [
    "Vectors",
    "768-dim"
   ],
   [
    "Role",
    "semantic recall"
   ]
  ]
 },
 "hd/es": {
  "head": "The lexical half: still the best thing in the system for an exact SKU or model number.",
  "dh": "Keeping BM25 beat replacing it with dense retrieval.",
  "dec": "Dense retrieval was added next to BM25, never instead of it. Exact identifiers and rare terms are where lexical search still wins outright.",
  "stack": [
   [
    "Engine",
    "Elasticsearch"
   ],
   [
    "Scoring",
    "BM25 · TF weighting"
   ],
   [
    "Role",
    "exact SKU / model match"
   ]
  ]
 },
 "hd/rrf": {
  "head": "Merges the two candidate lists by rank position rather than by score.",
  "dh": "Rank fusion beat weighted score blending."
 },
 "hd/ce": {
  "head": "Reads query and candidate together and reorders the top-K.",
  "dh": "Reranking the top-K beat reranking everything — and beat not reranking.",
  "dec": "Fusion got the right documents into the set; it did not get them in the right order. The cross-encoder is what turned recall into a visible improvement — applied to the top-K only, because it is too expensive for the full list."
 },
 "hd/rag": {
  "head": "Composes a direct answer over reranked context. The last thing built, not the first.",
  "dh": "Building synthesis last beat building it first.",
  "dec": "Retrieval quality was already carrying the result before GPT-3.5-Turbo was available on Azure. Grounding strictly on reranked context, with a fallback to the ranked list, kept synthesis from drifting.",
  "stack": [
   [
    "Model",
    "GPT-3.5-Turbo"
   ],
   [
    "Hosting",
    "Azure preview, Mar–Apr 2023"
   ],
   [
    "Phase",
    "3"
   ],
   [
    "Grounding",
    "reranked context only"
   ]
  ]
 },
 "hd/model": {
  "head": "The two models the query path calls: the self-hosted embedder and, in Phase 3, GPT-3.5-Turbo.",
  "dh": "Self-hosted embeddings beat a hosted embedding API."
 },
 "hd/cosmos": {
  "head": "Chunk metadata, lineage and the ACL tags that become query-time filters.",
  "dh": "Stamping ACL at ingestion beat looking it up at query time.",
  "dec": "The tag captured when a document is indexed is the tag enforced when it is searched. One source of truth, no drift between what was indexed and what is allowed.",
  "stack": [
   [
    "Service",
    "Cosmos DB"
   ],
   [
    "Holds",
    "chunk metadata · lineage · ACL tags"
   ]
  ]
 },
 "hd/pg": {
  "head": "Relational store for the result index, query logs and relevance judgments.",
  "dh": "Logging every query beat sampling.",
  "dec": "The logs are what turned a hunch about synonyms into a measured share of traffic — and a business case.",
  "stack": [
   [
    "Service",
    "PostgreSQL"
   ],
   [
    "Holds",
    "result index · query logs · judgments"
   ]
  ]
 },
 "hd/bench": {
  "head": "Graded query sets, curated per intent class, that every tuning change is scored against.",
  "dh": "Curated per-class sets beat one aggregate benchmark.",
  "dec": "A single aggregate hides a regression on one intent class behind a gain on another. Per-class sets showed exactly where a change helped and where it hurt.",
  "stack": [
   [
    "Sets",
    "graded judgments"
   ],
   [
    "Split",
    "per intent class"
   ],
   [
    "Source",
    "real queries, human labels"
   ]
  ]
 },
 "hd/metrics": {
  "head": "The offline gate on every tuning decision.",
  "dh": "Offline metrics as a gate beat offline metrics as a report.",
  "stack": [
   [
    "Metrics",
    "NDCG@10 · MRR · MAP"
   ],
   [
    "Role",
    "gate before A/B"
   ]
  ]
 },
 "hd/src": {
  "head": "Five source types — specs, DIY guides, store-ops playbooks, live inventory — at ~1,200 documents a week.",
  "dh": "Looking up live inventory beat embedding it.",
  "dec": "Anything that changes hourly should be looked up, not retrieved. Embedding inventory was a mistake worth not repeating.",
  "stack": [
   [
    "Types",
    "PDF · DOCX · HTML · SharePoint · API"
   ],
   [
    "Volume",
    "~1,200 docs/week"
   ]
  ]
 },
 "hd/router": {
  "head": "Decides which extraction handler a document goes to — on the bytes, not the filename.",
  "dh": "MIME sniffing beat trusting the extension.",
  "stack": [
   [
    "Library",
    "python-magic"
   ],
   [
    "Fallback",
    "extension → header"
   ],
   [
    "Unknown",
    "quarantined"
   ]
  ]
 },
 "hd/extract": {
  "head": "One handler per format, each producing the same normalized text plus metadata.",
  "dh": "A common output shape beat format-specific pipelines.",
  "dec": "Every handler emits the same shape, so everything downstream is format-blind. Adding a format is one handler, not a new pipeline.",
  "stack": [
   [
    "PDF",
    "PyMuPDF · pdfplumber"
   ],
   [
    "DOCX",
    "python-docx"
   ],
   [
    "HTML",
    "BeautifulSoup"
   ],
   [
    "Scans",
    "OCR"
   ]
  ]
 },
 "hd/chunk": {
  "head": "Splits guides and specs into retrievable passages that keep their context.",
  "dh": "Sentence-aware recursive chunking beat fixed windows.",
  "dec": "A how-to step retrieved without its preceding step is worse than no result. spaCy sentence boundaries plus overlap keep steps and spec tables whole.",
  "stack": [
   [
    "Boundaries",
    "spaCy sentences"
   ],
   [
    "Strategy",
    "recursive + overlap"
   ]
  ]
 },
 "hd/emb": {
  "head": "Self-hosted sentence-transformers for dense retrieval, in-cluster.",
  "dh": "Self-hosted SBERT beat a hosted embedding API."
 },
 "hd/dual": {
  "head": "Writes every chunk into both indexes, idempotently, with a version.",
  "dh": "Versioned dual-write beat two independent index jobs.",
  "stack": [
   [
    "Targets",
    "FAISS + Elasticsearch"
   ],
   [
    "Guarantee",
    "idempotent · versioned"
   ]
  ]
 },
 "hd/storage": {
  "head": "Where state and lineage live — every answer resolves to its chunks, index version and embedding model.",
  "dh": "Recording the embedding model per chunk beat assuming one version.",
  "stack": [
   [
    "Stores",
    "Cosmos DB · PostgreSQL"
   ],
   [
    "Lineage",
    "embedding versioning"
   ]
  ]
 },
 "hd/obs": {
  "head": "Operational monitoring across retrieval, ranking and serving.",
  "dh": "Continuous ranking-quality monitoring beat testing only at release.",
  "dec": "Ranking quality drifts with the catalog. Per-stage latency makes a p95 regression attributable to one stage.",
  "stack": [
   [
    "Logs",
    "Elasticsearch → Kibana"
   ],
   [
    "Metrics",
    "Prometheus · Grafana"
   ]
  ]
 },
 "hd/sec": {
  "head": "Identity, role policy and the boundary the self-hosted decision protected.",
  "dh": "Keeping content in-cluster beat convenience.",
  "stack": [
   [
    "Identity",
    "TSC Identity"
   ],
   [
    "Policy",
    "RBAC feeds"
   ],
   [
    "Boundary",
    "ISO 27001"
   ]
  ]
 },
 "citi/fraud/R2": {
  "head": "The governance spine — the same six stages on every Citibank workload.",
  "dh": "One governed path to production beat per-team pipelines.",
  "dec": "Three very different model shapes share one promotion path. That is what let model risk validate the pipeline once and trust every model that comes through it.",
  "stack": [
   [
    "CI",
    "Jenkins + Terraform"
   ],
   [
    "Image",
    "Amazon ECR digest"
   ],
   [
    "CD",
    "AWS CodePipeline"
   ],
   [
    "Train",
    "SageMaker"
   ],
   [
    "Registry",
    "MLflow"
   ]
  ]
 },
 "citi/fraud/dev": {
  "head": "Where the work starts — and where it used to stop.",
  "dh": "Production scripts beat notebooks in production.",
  "dec": "The POC finding was that models on laptops with governance-by-spreadsheet cannot be validated. Converting notebooks to scripts before anything else was the first control.",
  "stack": [
   [
    "Input",
    "notebooks"
   ],
   [
    "Output",
    "versioned production scripts"
   ]
  ]
 },
 "citi/fraud/jenkins": {
  "head": "Build, test and version every model artifact, with the infrastructure as code beside it.",
  "dh": "Infrastructure as code beat hand-built environments.",
  "dec": "If the environment cannot be rebuilt from code, it cannot be evidence. Terraform made environment parity a control, not a convenience.",
  "stack": [
   [
    "CI",
    "Jenkins"
   ],
   [
    "IaC",
    "Terraform"
   ],
   [
    "Scope",
    "IAM · VPC · KMS · SageMaker"
   ]
  ]
 },
 "citi/fraud/ecr": {
  "head": "One image, built once, referenced by digest everywhere.",
  "dh": "Digest promotion beat rebuilding per environment.",
  "stack": [
   [
    "Registry",
    "Amazon ECR"
   ],
   [
    "Reference",
    "immutable digest"
   ]
  ]
 },
 "citi/fraud/cp": {
  "head": "Promotes the same digest through dev, UAT and production.",
  "dh": "One orchestrator beat Step Functions plus Jenkins glue.",
  "stack": [
   [
    "CD",
    "AWS CodePipeline"
   ],
   [
    "Path",
    "dev → UAT → production"
   ]
  ]
 },
 "citi/fraud/reg": {
  "head": "The one place a model version can be promoted from — with lineage and approval state attached.",
  "dh": "A registry nothing routes around beat a spreadsheet of models.",
  "dec": "If it is not in the registry, it cannot be deployed. Every entry carries code commit, image digest, data hash and approval state, so a validator reads the record instead of reconstructing it.",
  "stack": [
   [
    "Registry",
    "MLflow"
   ],
   [
    "Record",
    "code · digest · data hash · approval"
   ]
  ]
 },
 "citi/fraud/R3": {
  "head": "Two gates before serving, one loop after it — and every No branch is a real outcome.",
  "dh": "Gates in the pipeline beat gates in a meeting.",
  "dec": "A failed gate is a failed build with a named next step. The monitoring question’s Yes re-enters the governance spine; there is no fast path.",
  "stack": [
   [
    "Gates",
    "technical · model risk"
   ],
   [
    "Loop",
    "monitor → retrain → gate"
   ]
  ]
 },
 "citi/fraud/no2": {
  "head": "The model-risk gate’s No branch: remediate and resubmit.",
  "dh": "A formal resubmission beat negotiating the finding.",
  "dec": "MRM says no more often than people expect, and that is the control working. The finding is addressed, evidence repackaged, and the model re-enters the gate.",
  "stack": [
   [
    "Owner",
    "model developers"
   ],
   [
    "Exit",
    "back to Model Risk Gate"
   ]
  ]
 },
 "citi/fraud/no3": {
  "head": "The steady state.",
  "dh": "Continuing to serve is a decision, not a default.",
  "dec": "Most weeks the answer is no and the model keeps serving — but it is a recorded outcome of the monitoring question, not the absence of one.",
  "stack": [
   [
    "Outcome",
    "no drift · continue"
   ]
  ]
 },
 "citi/credit/R2": {
  "head": "The governance spine — the same six stages on every Citibank workload.",
  "dh": "One governed path to production beat per-team pipelines.",
  "dec": "Three very different model shapes share one promotion path. That is what let model risk validate the pipeline once and trust every model that comes through it.",
  "stack": [
   [
    "CI",
    "Jenkins + Terraform"
   ],
   [
    "Image",
    "Amazon ECR digest"
   ],
   [
    "CD",
    "AWS CodePipeline"
   ],
   [
    "Train",
    "SageMaker"
   ],
   [
    "Registry",
    "MLflow"
   ]
  ]
 },
 "citi/credit/dev": {
  "head": "Where the work starts — and where it used to stop.",
  "dh": "Production scripts beat notebooks in production.",
  "dec": "The POC finding was that models on laptops with governance-by-spreadsheet cannot be validated. Converting notebooks to scripts before anything else was the first control.",
  "stack": [
   [
    "Input",
    "notebooks"
   ],
   [
    "Output",
    "versioned production scripts"
   ]
  ]
 },
 "citi/credit/jenkins": {
  "head": "Build, test and version every model artifact, with the infrastructure as code beside it.",
  "dh": "Infrastructure as code beat hand-built environments.",
  "dec": "If the environment cannot be rebuilt from code, it cannot be evidence. Terraform made environment parity a control, not a convenience.",
  "stack": [
   [
    "CI",
    "Jenkins"
   ],
   [
    "IaC",
    "Terraform"
   ],
   [
    "Scope",
    "IAM · VPC · KMS · SageMaker"
   ]
  ]
 },
 "citi/credit/ecr": {
  "head": "One image, built once, referenced by digest everywhere.",
  "dh": "Digest promotion beat rebuilding per environment.",
  "stack": [
   [
    "Registry",
    "Amazon ECR"
   ],
   [
    "Reference",
    "immutable digest"
   ]
  ]
 },
 "citi/credit/cp": {
  "head": "Promotes the same digest through dev, UAT and production.",
  "dh": "One orchestrator beat Step Functions plus Jenkins glue.",
  "stack": [
   [
    "CD",
    "AWS CodePipeline"
   ],
   [
    "Path",
    "dev → UAT → production"
   ]
  ]
 },
 "citi/credit/reg": {
  "head": "The one place a model version can be promoted from — with lineage and approval state attached.",
  "dh": "A registry nothing routes around beat a spreadsheet of models.",
  "dec": "If it is not in the registry, it cannot be deployed. Every entry carries code commit, image digest, data hash and approval state, so a validator reads the record instead of reconstructing it.",
  "stack": [
   [
    "Registry",
    "MLflow"
   ],
   [
    "Record",
    "code · digest · data hash · approval"
   ]
  ]
 },
 "citi/credit/R3": {
  "head": "Two gates before serving, one loop after it — and every No branch is a real outcome.",
  "dh": "Gates in the pipeline beat gates in a meeting.",
  "dec": "A failed gate is a failed build with a named next step. The monitoring question’s Yes re-enters the governance spine; there is no fast path.",
  "stack": [
   [
    "Gates",
    "technical · model risk"
   ],
   [
    "Loop",
    "monitor → retrain → gate"
   ]
  ]
 },
 "citi/credit/no2": {
  "head": "The model-risk gate’s No branch: remediate and resubmit.",
  "dh": "A formal resubmission beat negotiating the finding.",
  "dec": "MRM says no more often than people expect, and that is the control working. The finding is addressed, evidence repackaged, and the model re-enters the gate.",
  "stack": [
   [
    "Owner",
    "model developers"
   ],
   [
    "Exit",
    "back to Model Risk Gate"
   ]
  ]
 },
 "citi/credit/no3": {
  "head": "The steady state.",
  "dh": "Continuing to serve is a decision, not a default.",
  "dec": "Most weeks the answer is no and the model keeps serving — but it is a recorded outcome of the monitoring question, not the absence of one.",
  "stack": [
   [
    "Outcome",
    "no drift · continue"
   ]
  ]
 },
 "citi/aml/R2": {
  "head": "The governance spine — the same six stages on every Citibank workload.",
  "dh": "One governed path to production beat per-team pipelines.",
  "dec": "Three very different model shapes share one promotion path. That is what let model risk validate the pipeline once and trust every model that comes through it.",
  "stack": [
   [
    "CI",
    "Jenkins + Terraform"
   ],
   [
    "Image",
    "Amazon ECR digest"
   ],
   [
    "CD",
    "AWS CodePipeline"
   ],
   [
    "Train",
    "SageMaker"
   ],
   [
    "Registry",
    "MLflow"
   ]
  ]
 },
 "citi/aml/dev": {
  "head": "Where the work starts — and where it used to stop.",
  "dh": "Production scripts beat notebooks in production.",
  "dec": "The POC finding was that models on laptops with governance-by-spreadsheet cannot be validated. Converting notebooks to scripts before anything else was the first control.",
  "stack": [
   [
    "Input",
    "notebooks"
   ],
   [
    "Output",
    "versioned production scripts"
   ]
  ]
 },
 "citi/aml/jenkins": {
  "head": "Build, test and version every model artifact, with the infrastructure as code beside it.",
  "dh": "Infrastructure as code beat hand-built environments.",
  "dec": "If the environment cannot be rebuilt from code, it cannot be evidence. Terraform made environment parity a control, not a convenience.",
  "stack": [
   [
    "CI",
    "Jenkins"
   ],
   [
    "IaC",
    "Terraform"
   ],
   [
    "Scope",
    "IAM · VPC · KMS · SageMaker"
   ]
  ]
 },
 "citi/aml/ecr": {
  "head": "One image, built once, referenced by digest everywhere.",
  "dh": "Digest promotion beat rebuilding per environment.",
  "stack": [
   [
    "Registry",
    "Amazon ECR"
   ],
   [
    "Reference",
    "immutable digest"
   ]
  ]
 },
 "citi/aml/cp": {
  "head": "Promotes the same digest through dev, UAT and production.",
  "dh": "One orchestrator beat Step Functions plus Jenkins glue.",
  "stack": [
   [
    "CD",
    "AWS CodePipeline"
   ],
   [
    "Path",
    "dev → UAT → production"
   ]
  ]
 },
 "citi/aml/reg": {
  "head": "The one place a model version can be promoted from — with lineage and approval state attached.",
  "dh": "A registry nothing routes around beat a spreadsheet of models.",
  "dec": "If it is not in the registry, it cannot be deployed. Every entry carries code commit, image digest, data hash and approval state, so a validator reads the record instead of reconstructing it.",
  "stack": [
   [
    "Registry",
    "MLflow"
   ],
   [
    "Record",
    "code · digest · data hash · approval"
   ]
  ]
 },
 "citi/aml/R3": {
  "head": "Two gates before serving, one loop after it — and every No branch is a real outcome.",
  "dh": "Gates in the pipeline beat gates in a meeting.",
  "dec": "A failed gate is a failed build with a named next step. The monitoring question’s Yes re-enters the governance spine; there is no fast path.",
  "stack": [
   [
    "Gates",
    "technical · model risk"
   ],
   [
    "Loop",
    "monitor → retrain → gate"
   ]
  ]
 },
 "citi/aml/no2": {
  "head": "The compliance gate’s No branch: re-tune and re-document.",
  "dh": "Re-documenting beat re-tuning quietly.",
  "dec": "ATL / BTL findings change the threshold evidence, so the documentation is redone with the tuning — the BSA officer signs a package, not a number.",
  "stack": [
   [
    "Exit",
    "back to ATL / BTL testing"
   ]
  ]
 },
 "citi/aml/no3": {
  "head": "The steady state.",
  "dh": "Continuing to serve is a decision, not a default.",
  "dec": "Most weeks the answer is no and the model keeps serving — but it is a recorded outcome of the monitoring question, not the absence of one.",
  "stack": [
   [
    "Outcome",
    "no drift · continue"
   ]
  ]
 },
 "citi/fraud/R1": {
  "head": "Where authorization events become features and late labels become a training set.",
  "dh": "One feature definition for both stores beat separate online and offline pipelines.",
  "dec": "Training-serving skew was the most expensive class of bug. Computing features once on the stream and writing both stores from one definition removed it.",
  "stack": [
   [
    "Stream",
    "MSK / Kinesis"
   ],
   [
    "Features",
    "Flink"
   ],
   [
    "Store",
    "DynamoDB online · S3 + Glue offline"
   ],
   [
    "Labels",
    "chargebacks, 30–90 days late"
   ]
  ],
  "how": [
   "Authorization events stream in from MSK / Kinesis alongside S3, RDS, device and merchant context",
   "Ingest tokenizes PII and attaches lineage and governance checks",
   "Stream Feature Compute derives velocity, entity and device counters",
   "Feature Store writes online and offline from one definition",
   "Label Store joins chargeback outcomes back to transactions",
   "Curated Training Set does a point-in-time correct join with time-based splits"
  ]
 },
 "citi/fraud/src": {
  "head": "The authorization stream plus the slower customer, device and merchant context.",
  "dh": "Streaming the auth events beat batch loading them.",
  "dec": "Fraud is scored inside the authorization window, so the features have to be computed from a stream. Everything slower — device, merchant, customer — joins from the lake.",
  "stack": [
   [
    "Stream",
    "MSK / Kinesis"
   ],
   [
    "Context",
    "S3 lake · RDS"
   ],
   [
    "Entities",
    "device · merchant · customer"
   ]
  ]
 },
 "citi/fraud/ingest": {
  "head": "Tokenize PII, encrypt, and attach lineage before anything is stored.",
  "dh": "Governance checks on the data beat governance checks on the model.",
  "stack": [
   [
    "PII",
    "tokenization"
   ],
   [
    "Keys",
    "KMS"
   ],
   [
    "Checks",
    "schema · lineage · governance"
   ]
  ]
 },
 "citi/fraud/sfc": {
  "head": "Velocity and entity counters computed on the stream, inside the authorization window.",
  "dh": "Stream compute beat recomputing features at scoring time.",
  "stack": [
   [
    "Engine",
    "Flink / Kinesis Analytics"
   ],
   [
    "Features",
    "velocity · entity · device counters"
   ]
  ]
 },
 "citi/fraud/fs": {
  "head": "One feature definition serving both training and inference.",
  "dh": "A managed feature store beat the hand-rolled DynamoDB plus Glue arrangement."
 },
 "citi/fraud/labels": {
  "head": "Fraud labels arrive late — a chargeback lands 30 to 90 days after the transaction.",
  "dh": "Time-based splits beat random splits.",
  "stack": [
   [
    "Source",
    "chargebacks · disputes"
   ],
   [
    "Lag",
    "30–90 days"
   ]
  ]
 },
 "citi/fraud/tset": {
  "head": "Point-in-time correct join of features and late labels; time-based train / val / test.",
  "dh": "Point-in-time correctness beat convenience joins.",
  "dec": "A training row only sees what was knowable at that moment. Any join that leaks a later feature value or label produces a model that looks brilliant offline and fails live.",
  "stack": [
   [
    "Join",
    "point-in-time correct"
   ],
   [
    "Split",
    "time-based train / val / test"
   ],
   [
    "Storage",
    "immutable, versioned"
   ]
  ]
 },
 "citi/fraud/train": {
  "head": "Model training as a reproducible job: pinned code, environment and data.",
  "dh": "A pipeline job beat a notebook run.",
  "stack": [
   [
    "Service",
    "SageMaker Pipeline"
   ],
   [
    "Model",
    "XGBoost"
   ],
   [
    "Steps",
    "train · evaluate · package · register"
   ]
  ]
 },
 "citi/fraud/g1": {
  "head": "PR-AUC, recall at a fixed false-positive rate, and p99 latency — all three or no promotion.",
  "dh": "Recall at a fixed FPR beat accuracy as the headline.",
  "stack": [
   [
    "Metrics",
    "PR-AUC · recall @ FPR"
   ],
   [
    "Latency",
    "p99 met?"
   ]
  ]
 },
 "citi/fraud/g2": {
  "head": "A second line of defence that does not report to the people who built the model.",
  "dh": "Packaging the evidence in the pipeline beat a faster review.",
  "stack": [
   [
    "Standard",
    "SR 11-7"
   ],
   [
    "Explainability",
    "SHAP reason codes"
   ],
   [
    "Approval",
    "MRM"
   ]
  ]
 },
 "citi/fraud/s1": {
  "head": "Shadow, then canary, then champion/challenger as a variant on the endpoint.",
  "dh": "Progressive release beat a cutover.",
  "stack": [
   [
    "Stages",
    "shadow → canary → variant"
   ],
   [
    "Evidence",
    "champion / challenger"
   ]
  ]
 },
 "citi/fraud/s2": {
  "head": "Real-time scoring inside the authorization window, with the online feature lookup on the same code path as training.",
  "dh": "The same code path for online features beat a serving-side reimplementation.",
  "stack": [
   [
    "Path",
    "API GW → decision service → endpoint"
   ],
   [
    "Latency",
    "p99 < 100 ms"
   ]
  ]
 },
 "citi/fraud/s3": {
  "head": "Watches for the slow failure, not the loud one.",
  "dh": "Label reconciliation beat trusting drift metrics alone.",
  "dec": "PSI catches input drift; only reconciling late chargebacks against decisions shows whether the model is still right. Both run, and every decision is in Splunk with its version.",
  "stack": [
   [
    "Metrics",
    "CloudWatch"
   ],
   [
    "Decisions",
    "Splunk log"
   ],
   [
    "Drift",
    "PSI"
   ],
   [
    "Reconciliation",
    "labels vs. decisions"
   ]
  ]
 },
 "citi/fraud/q": {
  "head": "The monitoring question. Yes re-enters the Model Risk Gate; there is no fast path.",
  "dh": "A governed retrain beat an automatic redeploy."
 },
 "citi/fraud/no1": {
  "head": "The technical gate’s No branch: notify and fix the data.",
  "dh": "Failing fast beat tuning around a data problem.",
  "dec": "A technical gate failure is almost always a data problem first — a feature drifted, a label lagged. The fix goes to the data plane, not to the hyperparameters.",
  "stack": [
   [
    "Owner",
    "data engineering"
   ],
   [
    "Exit",
    "back to ingest"
   ]
  ]
 },
 "citi/fraud/mid": {
  "head": "Rollback is a variant revert or a rules-only fallback — instant, because the previous version is still live.",
  "dh": "Keeping the old variant live beat a redeploy-to-rollback.",
  "stack": [
   [
    "Options",
    "revert variant · rules-only"
   ],
   [
    "Speed",
    "instant"
   ]
  ]
 },
 "citi/credit/R1": {
  "head": "Where bureau data becomes vintages, samples and a reason-code map.",
  "dh": "Vintages with fixed observation and outcome dates beat row-level sampling.",
  "dec": "Credit models are trained on cohorts observed at one date and judged at a later one. The out-of-time sample is the one that matters.",
  "stack": [
   [
    "Data",
    "bureau + core banking"
   ],
   [
    "Zone",
    "S3 + Glue · Redshift"
   ],
   [
    "Samples",
    "dev · holdout · out-of-time"
   ],
   [
    "Binning",
    "WOE, monotonic"
   ]
  ],
  "how": [
   "Bureau and core-banking files are balanced against control totals and tokenized",
   "Curated Data Zone holds immutable dated snapshots",
   "Performance / Vintage Store fixes the good/bad definition",
   "Development Sample splits dev, holdout and out-of-time with a snapshot hash",
   "Segmentation + WOE Binning designs the reason-code map"
  ]
 },
 "citi/credit/src": {
  "head": "Bureau files plus application and account data — and the bureau vintage has to be reproducible years later.",
  "dh": "Retaining bureau vintages beat refreshing in place.",
  "dec": "An adverse action can be challenged long after the decision. Reproducing it means reproducing the bureau file as it was on that day.",
  "stack": [
   [
    "Bureaus",
    "Experian · Equifax · TransUnion"
   ],
   [
    "Bank data",
    "applications · balances · payments"
   ]
  ]
 },
 "citi/credit/ingest": {
  "head": "Bureau file balancing against control totals, schema contracts, tokenization.",
  "dh": "Balancing before loading beat discovering gaps in the model.",
  "dec": "If the bureau file does not balance, nothing downstream runs. A missing tranche of records is a governance event, not a data-quality footnote.",
  "stack": [
   [
    "Checks",
    "control-total balancing · schema contract"
   ],
   [
    "PII",
    "tokenization · KMS"
   ]
  ]
 },
 "citi/credit/cdz": {
  "head": "Immutable, dated snapshots — the credit-risk version of the feature store.",
  "dh": "Dated snapshots beat a mutable curated table.",
  "stack": [
   [
    "Storage",
    "S3 + Glue"
   ],
   [
    "Marts",
    "Redshift"
   ],
   [
    "Guarantee",
    "immutable, dated"
   ]
  ]
 },
 "citi/credit/vint": {
  "head": "The good/bad definition, fixed at an observation date and an outcome date.",
  "dh": "A fixed performance window beat a rolling one.",
  "stack": [
   [
    "Definition",
    "good / bad"
   ],
   [
    "Dates",
    "observation + outcome"
   ],
   [
    "Feeds",
    "back-testing"
   ]
  ]
 },
 "citi/credit/dsample": {
  "head": "Dev, holdout and out-of-time samples, each with a snapshot hash.",
  "dh": "Out-of-time validation beat in-time holdout.",
  "dec": "In-time holdout flatters every credit model because the economy has not changed. Out-of-time is the sample the validator trusts.",
  "stack": [
   [
    "Samples",
    "dev · holdout · out-of-time"
   ],
   [
    "Identity",
    "snapshot hash"
   ]
  ]
 },
 "citi/credit/seg": {
  "head": "Where reason codes are designed in, not bolted on.",
  "dh": "Monotonic WOE binning beat post-hoc explanation.",
  "stack": [
   [
    "Method",
    "WOE binning"
   ],
   [
    "Constraint",
    "monotonic"
   ],
   [
    "Output",
    "reason-code map"
   ]
  ]
 },
 "citi/credit/train": {
  "head": "A PD scorecard with a monotonic XGB challenger, plus LGD and EAD.",
  "dh": "A scorecard champion with a constrained challenger beat an unconstrained model.",
  "dec": "Logistic plus WOE stays explainable by construction. The XGB challenger is monotonically constrained so its reason codes remain legitimate — if it cannot explain a decline, it cannot win.",
  "stack": [
   [
    "Champion",
    "PD scorecard — logistic + WOE"
   ],
   [
    "Challenger",
    "monotonic XGB"
   ],
   [
    "Also",
    "LGD · EAD"
   ]
  ]
 },
 "citi/credit/g1": {
  "head": "KS, Gini, PSI — and every declined applicant must have a reason code. 100%, not most.",
  "dh": "Reason-code coverage as a hard gate beat treating it as a report.",
  "stack": [
   [
    "Power",
    "KS · Gini"
   ],
   [
    "Stability",
    "PSI"
   ],
   [
    "Coverage",
    "reason codes 100%"
   ]
  ]
 },
 "citi/credit/g2": {
  "head": "SR 11-7 validation plus fair-lending review for disparate impact under Reg B.",
  "dh": "A separate fair-lending reviewer beat folding it into model risk.",
  "stack": [
   [
    "Standard",
    "SR 11-7 · Reg B"
   ],
   [
    "Test",
    "disparate impact"
   ],
   [
    "Veto",
    "fair lending, independent"
   ]
  ]
 },
 "citi/credit/s1": {
  "head": "Batch scoring — monthly for the book, on demand at origination.",
  "dh": "Batch transform beat a real-time endpoint for a decision that does not need one.",
  "stack": [
   [
    "Service",
    "SageMaker Batch Transform"
   ],
   [
    "Cadence",
    "monthly + at origination"
   ]
  ]
 },
 "citi/credit/s2": {
  "head": "Cut-offs and line assignment, with the Reg B adverse-action notice inside 30 days.",
  "dh": "Versioning the cut-off policy with the model beat keeping it in a config.",
  "stack": [
   [
    "Decision",
    "cut-offs · line assignment"
   ],
   [
    "Notice",
    "Reg B, 30 days"
   ],
   [
    "Policy",
    "versioned in registry"
   ]
  ]
 },
 "citi/credit/s3": {
  "head": "Every score retained with model and policy version, so a decision from years ago can be reproduced.",
  "dh": "Retaining the inputs as served beat recomputing them.",
  "stack": [
   [
    "Log",
    "Splunk"
   ],
   [
    "Record",
    "score · model version · policy version"
   ]
  ]
 },
 "citi/credit/q": {
  "head": "Degradation, or the annual revalidation clock — either re-enters the Model Risk Gate.",
  "dh": "A calendar-driven review beat relying on a detector."
 },
 "citi/credit/no1": {
  "head": "The discriminatory-power gate’s No branch: redevelop or rebin the sample.",
  "dh": "Going back to binning beat retuning the model.",
  "dec": "If reason-code coverage or KS fails, the fix is usually in the sample or the bins, not in the estimator.",
  "stack": [
   [
    "Exit",
    "back to segmentation + binning"
   ]
  ]
 },
 "citi/credit/mid": {
  "head": "Where the scores go next: CCAR / DFAST stress testing and CECL reserving.",
  "dh": "Treating downstream capital use as a consumer beat treating it as someone else’s problem.",
  "stack": [
   [
    "Downstream",
    "CCAR · DFAST · CECL"
   ]
  ]
 },
 "citi/credit/inv": {
  "head": "The bank-wide register that makes SR 11-7 enforceable, with the revalidation clock.",
  "dh": "An inventory-driven clock beat ad-hoc revalidation.",
  "stack": [
   [
    "Register",
    "owner · tier · status · date"
   ],
   [
    "Cadence",
    "annual for credit"
   ]
  ]
 },
 "citi/aml/R1": {
  "head": "Where payment flows and watchlists become resolved entities, typology features and a one-in-a-thousand label.",
  "dh": "Entity resolution before features beat features on raw records.",
  "dec": "Structuring and layering are graph patterns. You cannot see them without resolving the parties first.",
  "stack": [
   [
    "Feeds",
    "wires · SWIFT · ACH · card · cash"
   ],
   [
    "Lists",
    "OFAC · PEP, daily versioned"
   ],
   [
    "Features",
    "peer baselines · graph"
   ],
   [
    "Base rate",
    "~1 in 1,000"
   ]
  ],
  "how": [
   "Transaction feeds and the daily-versioned watchlist arrive",
   "Normalize + Entity Resolution builds the canonical schema and counterparty graph",
   "AML Feature Layer computes peer baselines and typology features",
   "Label Store joins dispositions and SAR outcomes to transactions",
   "Curated Alert Sample builds the training set at the true base rate",
   "Rule Set + Thresholds is pinned with model and list version"
  ]
 },
 "citi/aml/feeds": {
  "head": "Payment flows across every rail.",
  "dh": "One canonical feed beat rail-specific pipelines.",
  "dec": "Wires, SWIFT, ACH, card and cash all land in one schema so a typology can be seen across rails, which is exactly where layering hides.",
  "stack": [
   [
    "Rails",
    "wires · SWIFT · ACH · card · cash"
   ]
  ]
 },
 "citi/aml/kyc": {
  "head": "Customer due diligence plus the sanctions and PEP watchlists, versioned daily.",
  "dh": "Versioning the watchlist beat treating it as reference data.",
  "stack": [
   [
    "Lists",
    "OFAC · PEP"
   ],
   [
    "Cadence",
    "daily"
   ],
   [
    "Pinned with",
    "model + rule set"
   ]
  ]
 },
 "citi/aml/norm": {
  "head": "Canonical schema, fuzzy party matching, and the counterparty graph that typology features are built on.",
  "dh": "Resolving parties first beat building features on raw records.",
  "stack": [
   [
    "Schema",
    "canonical"
   ],
   [
    "Matching",
    "fuzzy party"
   ],
   [
    "Graph",
    "counterparty"
   ]
  ],
  "how": [
   "Map every rail to one canonical transaction schema",
   "Fuzzy-match parties across rails and lists into one entity",
   "Build the counterparty graph that structuring and layering features read"
  ]
 },
 "citi/aml/feat": {
  "head": "Peer-group baselines and typology features — structuring, layering, graph degree and community.",
  "dh": "Typology features beat generic anomaly scores."
 },
 "citi/aml/labels": {
  "head": "Investigator dispositions and SAR outcomes, joined back to the originating transactions.",
  "dh": "Treating the label as a human judgment beat treating it as ground truth.",
  "dec": "The label is a disposition, which means it also measures the investigators. That shapes how much the model is allowed to disagree with them.",
  "stack": [
   [
    "Source",
    "dispositions · SAR outcomes"
   ],
   [
    "Join",
    "to originating transactions"
   ]
  ],
  "how": [
   "Investigator dispositions and SAR filings are captured per case",
   "Outcomes are joined back to the transactions that generated the alert",
   "Labels flow back from Case Management on a cadence"
  ]
 },
 "citi/aml/alerts": {
  "head": "The training sample: SAR-confirmed against closed alerts, at roughly one productive alert in a thousand.",
  "dh": "Training at the true base rate beat rebalancing it away.",
  "stack": [
   [
    "Positive",
    "SAR-confirmed"
   ],
   [
    "Negative",
    "closed alerts"
   ],
   [
    "Rate",
    "~1 in 1,000"
   ]
  ],
  "how": [
   "Sample SAR-confirmed alerts as positives, closed alerts as negatives",
   "Keep the one-in-a-thousand base rate visible in every metric",
   "Version the sample with the rule set and list that generated it"
  ]
 },
 "citi/aml/rules": {
  "head": "The rules engine configuration, versioned and pinned with the model and the watchlist.",
  "dh": "Pinning rules, model and list together beat versioning them separately.",
  "stack": [
   [
    "Contents",
    "rules · thresholds"
   ],
   [
    "Pinned with",
    "model · watchlist version"
   ]
  ],
  "how": [
   "Rules and thresholds are versioned like code",
   "A release pins rule set, model and list version as one unit",
   "ATL / BTL evidence is tied to that exact triple"
  ]
 },
 "citi/aml/train": {
  "head": "Alert scoring and prioritization, with segmentation to set thresholds.",
  "dh": "Scoring alerts beat scoring transactions.",
  "dec": "The rules engine generates the alerts; the model ranks them. Training on alerts keeps the model inside the compliance framework the regulator already accepts.",
  "stack": [
   [
    "Service",
    "SageMaker Training"
   ],
   [
    "Target",
    "alert productivity"
   ],
   [
    "Segmentation",
    "for threshold setting"
   ]
  ]
 },
 "citi/aml/g1": {
  "head": "Precision and recall on SAR labels, plus typology coverage — is every typology the bank is obliged to detect actually detectable.",
  "dh": "Coverage as a gate beat coverage as a report.",
  "dec": "A model can score well on SAR labels and still leave a typology dark. Coverage is a regulatory question before it is a model question.",
  "stack": [
   [
    "Metrics",
    "precision · recall on SAR labels"
   ],
   [
    "Coverage",
    "per typology"
   ]
  ],
  "how": [
   "Score precision and recall against SAR-confirmed labels",
   "Check every obligated typology has detection coverage",
   "Fail the gate on either"
  ]
 },
 "citi/aml/g2": {
  "head": "Above-the-line / below-the-line testing with sampling evidence, plus SR 11-7 validation and the BSA officer’s sign-off.",
  "dh": "ATL / BTL evidence beat a threshold argued from the ROC curve.",
  "stack": [
   [
    "Test",
    "ATL / BTL"
   ],
   [
    "Standard",
    "SR 11-7"
   ],
   [
    "Sign-off",
    "BSA officer"
   ]
  ]
 },
 "citi/aml/s1": {
  "head": "Two lanes: pre-transaction OFAC screening against the pinned list, and nightly rules-engine alerts.",
  "dh": "Keeping screening and monitoring as separate lanes beat merging them.",
  "stack": [
   [
    "Screening",
    "pre-transaction OFAC"
   ],
   [
    "Monitoring",
    "nightly rules engine"
   ]
  ]
 },
 "citi/aml/s2": {
  "head": "Ranks the investigator queue. It never closes an alert.",
  "dh": "Ranking beat auto-closing.",
  "stack": [
   [
    "Output",
    "ranked queue"
   ],
   [
    "Rule",
    "never auto-close"
   ]
  ]
 },
 "citi/aml/s3": {
  "head": "L1/L2/L3 case queue, FinCEN filing, and Splunk lineage for rule, model and list version on every case.",
  "dh": "Lineage on the case beat lineage on the model alone.",
  "stack": [
   [
    "Queue",
    "L1 / L2 / L3"
   ],
   [
    "Filing",
    "FinCEN"
   ],
   [
    "Lineage",
    "rule · model · list"
   ]
  ]
 },
 "citi/aml/q": {
  "head": "Typology drift or a coverage gap re-enters ATL / BTL testing.",
  "dh": "Re-entering ATL / BTL beat retuning a threshold in place."
 },
 "citi/aml/no1": {
  "head": "The detection gate’s No branch: rework the detection logic.",
  "dh": "Fixing coverage in the features beat lowering a threshold.",
  "dec": "A coverage gap is a missing feature or a missing typology, not a threshold problem. Lowering the threshold buys recall with a flood of false positives the team cannot work.",
  "stack": [
   [
    "Exit",
    "back to feature design"
   ]
  ]
 },
 "citi/aml/mid": {
  "head": "A sanctions hit holds the payment for L1 clearing.",
  "dh": "Holding the payment beat scoring the hit.",
  "stack": [
   [
    "Trigger",
    "OFAC hit"
   ],
   [
    "Action",
    "payment held"
   ],
   [
    "Clearing",
    "L1 analyst"
   ]
  ]
 },
 "citi/aml/aq": {
  "head": "The operating metric: false-positive rate against investigator capacity.",
  "dh": "Measuring against capacity beat measuring in isolation.",
  "stack": [
   [
    "Metric",
    "FP rate vs. capacity"
   ]
  ]
 },
 "rag/ix": {
  "head": "Index time — everything that can be precomputed is, on a schedule, never on the request path.",
  "dh": "Over-stamping metadata at ingestion beat retrofitting filters later.",
  "dec": "Every filter the query layer will ever need has to exist as metadata at index time. Retrofitting one means re-indexing the corpus.",
  "stack": [
   [
    "Steps",
    "parse → chunk → enrich → embed → write"
   ],
   [
    "Cadence",
    "scheduled, event-driven"
   ],
   [
    "Output",
    "vector + keyword index"
   ]
  ],
  "how": [
   "Parse with layout preserved",
   "Chunk on structure with overlap",
   "Enrich with entities, ancestors and access labels",
   "Embed with a recorded model version",
   "Write to vector and keyword fields in one document"
  ],
  "role": "Documents become structured, enriched, embedded chunks in both retrieval surfaces.",
  "say": "Nothing in this layer runs at query time, and everything the query layer filters on was stamped here."
 },
 "rag/qt": {
  "head": "Query time — everything inside the latency budget.",
  "dh": "Filters in the query beat post-filtering results.",
  "dec": "Access control applied after retrieval is not access control. If the model has seen the text, the boundary is already crossed.",
  "stack": [
   [
    "Steps",
    "resolve → retrieve → fuse → rerank → assemble → generate → verify"
   ],
   [
    "Budget",
    "p95"
   ],
   [
    "Gate",
    "citation integrity"
   ]
  ],
  "how": [
   "Resolve the query to concepts and expand through the ancestor closure",
   "Hybrid retrieve against the filtered space",
   "Fuse on rank, rerank the top-k",
   "Assemble a prompt where every passage carries its source version",
   "Generate with per-claim citations",
   "Verify every claim or refuse"
  ],
  "role": "A question becomes a grounded, cited, verified answer — or an honest refusal.",
  "say": "Seven steps, one budget, and refusal is a valid output."
 },
 "rag/ql": {
  "head": "Quality — the layers that decide whether a change ships.",
  "dh": "Seven partial views that must agree beat one metric.",
  "dec": "Open Q&A has no single right answer, so no single metric is trustworthy. Separate retrieval from generation, validate the judge, and keep SMEs in the loop.",
  "stack": [
   [
    "Retrieval",
    "context precision / recall"
   ],
   [
    "Generation",
    "faithfulness"
   ],
   [
    "Live",
    "telemetry"
   ],
   [
    "Human",
    "SME review"
   ]
  ],
  "how": [
   "Retrieval eval separates finding the evidence from using it",
   "Faithfulness eval with a validated judge",
   "Task success end to end",
   "Online telemetry: refusal rate, citation coverage, drift",
   "SME review on a sampled set",
   "Release gate: a regression on any layer blocks"
  ],
  "role": "Independent measurements of retrieval, generation, task success and production behaviour, gated together.",
  "say": "We validate the judge before we trust the judge."
 },
 "rag/r_src": {
  "head": "Whatever the organization already considers authoritative — and nothing else.",
  "dh": "Deciding the corpus first beat picking the model first.",
  "stack": [
   [
    "Originals",
    "immutable"
   ],
   [
    "Versioning",
    "per source document"
   ]
  ]
 },
 "rag/r_parse": {
  "head": "Turns a document into structure rather than a flat string.",
  "dh": "Layout-aware parsing beat plain text extraction.",
  "stack": [
   [
    "Preserves",
    "layout · tables · captions"
   ],
   [
    "Scans",
    "OCR first"
   ]
  ]
 },
 "rag/r_chunk": {
  "head": "Splits parsed documents into retrievable units on structure, with overlap.",
  "dh": "Structure-aware chunking beat fixed-size windows."
 },
 "rag/r_enrich": {
  "head": "Attaches everything retrieval will later need to filter on.",
  "dh": "Over-stamping at ingestion beat re-indexing later.",
  "stack": [
   [
    "Entities",
    "linked to vocabulary"
   ],
   [
    "Ancestors",
    "closure stamped"
   ],
   [
    "ACL",
    "copied from source"
   ]
  ]
 },
 "rag/r_emb": {
  "head": "Vectorizes chunks for dense retrieval, with the model version recorded per chunk.",
  "dh": "Recording the embedding version beat assuming one.",
  "dec": "Mixing embedding versions in one index is silently wrong — vectors from two models are not comparable. The version is part of the schema whether or not you treat it that way.",
  "stack": [
   [
    "Pricing",
    "batch"
   ],
   [
    "Schema",
    "model version per chunk"
   ]
  ]
 },
 "rag/r_write": {
  "head": "Writes into both retrieval surfaces at once, with a refresh path.",
  "dh": "Monitoring freshness beat assuming the index is current.",
  "stack": [
   [
    "Fields",
    "vector + analyzed text"
   ],
   [
    "Updates",
    "incremental upserts"
   ],
   [
    "Monitor",
    "staleness"
   ]
  ]
 },
 "rag/r_q": {
  "head": "The request — shorter and vaguer than the corpus vocabulary, carrying the caller’s entitlements.",
  "dh": "Carrying identity with the query beat looking it up later.",
  "dec": "Entitlements travel with the request and become filters. That is what lets retrieval enforce access rather than the UI.",
  "stack": [
   [
    "Carries",
    "text · identity · entitlements"
   ]
  ]
 },
 "rag/r_exp": {
  "head": "Maps the query onto the vocabulary the index is stamped with.",
  "dh": "A closure filter beat a graph traversal."
 },
 "rag/r_hyb": {
  "head": "Both retrievers run against the same filtered candidate space.",
  "dh": "Filters in the query beat post-filtering.",
  "stack": [
   [
    "Dense",
    "paraphrase · intent"
   ],
   [
    "Lexical",
    "identifiers · rare terms"
   ],
   [
    "Filters",
    "in the query"
   ]
  ]
 },
 "rag/r_fuse": {
  "head": "Merges two ranked lists that do not share a score scale.",
  "dh": "Rank fusion beat score blending.",
  "dec": "A BM25 score and a cosine distance are not on a comparable scale. Reciprocal rank fusion merges on position and needs no per-query weighting.",
  "stack": [
   [
    "Method",
    "reciprocal rank fusion"
   ]
  ]
 },
 "rag/r_rank": {
  "head": "Reads the query and each candidate together and reorders the top-k.",
  "dh": "Reranking the top-k beat reranking everything.",
  "dec": "The cross-encoder is too expensive for the full list and unnecessary beyond the top-k. Recall gets the right document into the set; reranking gets it into the top three.",
  "stack": [
   [
    "Model",
    "cross-encoder"
   ],
   [
    "Applied to",
    "top-k"
   ]
  ]
 },
 "rag/r_asm": {
  "head": "Builds the generation prompt from reranked passages, with source and version on each.",
  "dh": "Dropping whole passages beat truncating one.",
  "dec": "Truncating a passage mid-claim is how you manufacture a hallucination. The context budget is enforced by dropping passages, never by cutting one in half.",
  "stack": [
   [
    "Carries",
    "source · version per passage"
   ],
   [
    "Budget",
    "drop, never truncate"
   ]
  ]
 },
 "rag/r_gen": {
  "head": "The model composes an answer over the supplied context, citing per claim.",
  "dh": "Per-claim citation beat per-answer citation.",
  "stack": [
   [
    "Instruction",
    "cite each claim"
   ],
   [
    "Allowed output",
    "\"the context does not contain this\""
   ]
  ]
 },
 "rag/r_ver": {
  "head": "The gate between a generated answer and a user.",
  "dh": "Refusal as a first-class output beat refusal as an error path.",
  "dec": "Every claim maps to a retrieved span or it is stripped. Refusal rate is monitored in both directions — a sudden drop usually means the gate broke.",
  "stack": [
   [
    "Check",
    "claim → span"
   ],
   [
    "Action",
    "strip or refuse"
   ],
   [
    "Monitor",
    "refusal rate"
   ]
  ]
 },
 "rag/r_ev1": {
  "head": "Measures whether the right evidence was found, independently of what the model did with it.",
  "dh": "Separating retrieval quality from generation quality beat one end-to-end score.",
  "dec": "If you only measure the final answer you will tune the wrong layer. Context precision and recall run on every index or chunking change.",
  "stack": [
   [
    "Metrics",
    "context precision · recall"
   ],
   [
    "Framework",
    "RAGAS"
   ]
  ]
 },
 "rag/r_ev2": {
  "head": "Measures whether the answer is supported by the context it was given.",
  "dh": "A validated judge beat an unvalidated one.",
  "stack": [
   [
    "Metric",
    "faithfulness"
   ],
   [
    "Frameworks",
    "RAGAS · DeepEval"
   ],
   [
    "Judge",
    "validated against human labels"
   ]
  ]
 },
 "rag/r_ev3": {
  "head": "Did the user get what they actually needed.",
  "dh": "Realistic tasks beat isolated question-answer pairs.",
  "dec": "Component metrics can all pass while the product still fails the user. Task success is scored on the workflows people actually run.",
  "stack": [
   [
    "Unit",
    "realistic task"
   ]
  ]
 },
 "rag/r_ev4": {
  "head": "What the system actually does once real users touch it.",
  "dh": "Watching the query distribution beat watching the corpus.",
  "dec": "The query distribution drifts faster than the corpus does. Refusal rate, citation coverage and retrieval hit rate are the early warnings.",
  "stack": [
   [
    "Signals",
    "refusal rate · citation coverage · latency · hit rate"
   ]
  ]
 },
 "rag/r_ev5": {
  "head": "The layer no automated metric replaces.",
  "dh": "Sampled expert review beat trusting automation.",
  "dec": "Automated eval scales; SME review keeps it honest. Findings feed back into the labeled sets.",
  "stack": [
   [
    "Cadence",
    "sampled, recurring"
   ],
   [
    "Feeds",
    "labeled eval sets"
   ]
  ]
 },
 "rag/r_ev6": {
  "head": "The composite decision: a regression on any layer blocks the release.",
  "dh": "Thresholds agreed up front beat thresholds negotiated at release.",
  "stack": [
   [
    "Rule",
    "any regression blocks"
   ],
   [
    "Thresholds",
    "fixed in advance"
   ]
  ]
 },
 "cicd/int": {
  "head": "Integration — proves the build runs.",
  "dh": "Prompts as code beat prompts in a console.",
  "dec": "A prompt change is a code change: reviewed, linted, unit tested, contract tested, built once. There is no console where someone edits production behaviour.",
  "stack": [
   [
    "CI",
    "GitHub Actions"
   ],
   [
    "Registry",
    "ACR by digest"
   ],
   [
    "Signing",
    "Cosign"
   ]
  ],
  "how": [
   "Pull request opens the change",
   "Static checks and unit tests in under two minutes",
   "Contract tests against the Service Bus message shape",
   "Build once, push to ACR by digest",
   "Sign with Cosign, attach an SBOM"
  ],
  "role": "From pull request to a signed, digest-referenced image.",
  "say": "Built once, signed, promoted by digest."
 },
 "cicd/qual": {
  "head": "Qualification — proves the agent behaves.",
  "dh": "Statistical gates with fixed thresholds beat hoping the golden set passes.",
  "dec": "This is the unit-test layer for an agent; it just happens to be statistical. Thresholds are fixed before the change, so nobody argues them on the day.",
  "stack": [
   [
    "Eval",
    "RAGAS · golden set"
   ],
   [
    "Agent gate",
    "per-agent fixtures"
   ],
   [
    "Hard gate",
    "citation integrity"
   ],
   [
    "Adversarial",
    "red-team suite"
   ]
  ],
  "how": [
   "Golden-set eval on held-out Q&A",
   "Agent-specific fixture check — closure fixtures or seriousness recall",
   "Grounding gate: faithfulness threshold, citation integrity pass/fail",
   "Latency and token-cost budget",
   "Red-team suite: injection, leakage, refusal"
  ],
  "role": "Golden-set eval, the agent-specific fixture gate, grounding, latency and cost budgets, and adversarial coverage.",
  "say": "Each agent has one gate that only makes sense for that agent."
 },
 "cicd/auth": {
  "head": "Authorization — proves someone signed.",
  "dh": "Pipeline-generated evidence beat hand-assembled release paperwork.",
  "dec": "The change record and validation summary are build outputs linked to the digest, so the record and the artifact cannot drift apart. A named human still signs.",
  "stack": [
   [
    "Record",
    "change control"
   ],
   [
    "Evidence",
    "validation summary"
   ],
   [
    "Signature",
    "21 CFR Part 11"
   ],
   [
    "Admission",
    "Ratify · Gatekeeper"
   ]
  ],
  "how": [
   "Change control record generated from the pipeline",
   "Validation summary packages eval results against the current production version",
   "Part 11 electronic signature by an accountable approver",
   "Admission control verifies the signature at the cluster door"
  ],
  "role": "Change control record, validation summary, electronic signature, and cluster admission.",
  "say": "Automation gets the evidence to the desk. A person still signs."
 },
 "cicd/del": {
  "head": "Delivery — proves it lands safely.",
  "dh": "Canary sized to the agent’s risk beat one rollout policy.",
  "dec": "The riskier the agent, the smaller the first ring and the more human the promotion. Rollback is a ring demotion, exercised on a schedule.",
  "stack": [
   [
    "Rehearsal",
    "staging on the same digest"
   ],
   [
    "Rollout",
    "Argo Rollouts canary"
   ],
   [
    "Routing",
    "track property → canary subscription"
   ],
   [
    "Rollback",
    "ring demotion"
   ]
  ],
  "how": [
   "Deploy to staging with the same digest",
   "Canary rollout — 5/20/50/100 for Knowledge, 2/10/50/100 with an SME pause for Drug Safety",
   "Route canary traffic on each agent’s topic: the orchestrator stamps a track property and the canary subscription feeds the canary pods",
   "Watch SLOs and quality signals",
   "Demote the ring automatically on breach"
  ],
  "role": "Staging on the same digest, a risk-sized canary, exact traffic routing on the bus, production watch, and automatic rollback.",
  "say": "You cannot split bus traffic with an ingress rule."
 },
 "cicd/c_pr": {
  "head": "Where the change enters the system — prompts, tools and fixtures reviewed as code.",
  "dh": "Prompts in the repo beat prompts in a console.",
  "dec": "There is no console where someone edits production behaviour. A prompt change follows the same path as a code change because it is one.",
  "stack": [
   [
    "Contents",
    "prompts · tool schemas · fixtures"
   ],
   [
    "Review",
    "pull request"
   ]
  ]
 },
 "cicd/c_static": {
  "head": "The fast feedback layer — under two minutes or people route around it.",
  "dh": "A fast layer beat a thorough-but-slow one.",
  "dec": "If the fast layer is slow, engineers stop trusting it. Tool schemas are type-checked against the agent contract here.",
  "stack": [
   [
    "Checks",
    "lint · types · unit"
   ],
   [
    "Budget",
    "< 2 minutes"
   ]
  ]
 },
 "cicd/c_contract": {
  "head": "Verifies the agent still speaks the platform’s protocol.",
  "dh": "Contract tests beat discovering drift in staging.",
  "stack": [
   [
    "Validates",
    "request / response schemas"
   ],
   [
    "Against",
    "orchestrator expectations"
   ]
  ]
 },
 "cicd/c_build": {
  "head": "One image is built, once, and referenced by digest from then on.",
  "dh": "Digest promotion beat rebuilding per environment.",
  "stack": [
   [
    "Registry",
    "ACR"
   ],
   [
    "Reference",
    "immutable digest"
   ]
  ]
 },
 "cicd/c_sign": {
  "head": "Cryptographic provenance on the artifact.",
  "dh": "Verifying at admission beat verifying only at build.",
  "dec": "The signature is checked at the cluster door, not just at the build. An unsigned or mismatched digest cannot be scheduled.",
  "stack": [
   [
    "Signing",
    "Cosign"
   ],
   [
    "Attached",
    "SBOM"
   ],
   [
    "Verified by",
    "Ratify at admission"
   ]
  ]
 },
 "cicd/c_golden": {
  "head": "The behavioural regression suite.",
  "dh": "A curated set with fixed thresholds beat an ad-hoc smoke test.",
  "dec": "A curated question set with document-backed answers, scored on retrieval and faithfulness. Thresholds are fixed in advance.",
  "stack": [
   [
    "Set",
    "held-out Q&A"
   ],
   [
    "Scored on",
    "retrieval · faithfulness"
   ]
  ]
 },
 "cicd/c_fixture": {
  "head": "The gate that exists because of what this specific agent is for.",
  "dh": "Agent-specific gates beat one generic eval.",
  "stack": [
   [
    "Knowledge",
    "closure-table fixtures"
   ],
   [
    "Drug Safety",
    "seriousness-criteria recall"
   ]
  ]
 },
 "cicd/c_faith": {
  "head": "Hard gate on whether answers are supported.",
  "dh": "A pass/fail citation gate beat a negotiable threshold.",
  "dec": "Faithfulness has a threshold. Citation integrity does not — it either holds or the build fails.",
  "stack": [
   [
    "Faithfulness",
    "threshold"
   ],
   [
    "Citation integrity",
    "pass / fail"
   ]
  ]
 },
 "cicd/c_budget": {
  "head": "Performance regressions treated as failures, not observations.",
  "dh": "A cost budget beat discovering token spend in the bill.",
  "dec": "A reasoning-effort change can quietly triple token cost. Cost per request is gated like latency.",
  "stack": [
   [
    "Latency",
    "p95 vs. budget"
   ],
   [
    "Cost",
    "tokens per request"
   ]
  ]
 },
 "cicd/c_red": {
  "head": "Adversarial coverage for the failure modes the golden set never shows.",
  "dh": "Treating retrieved content as untrusted input beat trusting it.",
  "stack": [
   [
    "Injection",
    "via retrieved content"
   ],
   [
    "Entitlement",
    "bypass attempts"
   ],
   [
    "Refusal",
    "under thin retrieval"
   ]
  ]
 },
 "cicd/c_change": {
  "head": "The regulated paperwork, generated by the pipeline rather than written afterwards.",
  "dh": "A generated record beat a hand-written one.",
  "dec": "What changed, why, what was tested and what the results were — linked to the digest so record and artifact cannot drift apart.",
  "stack": [
   [
    "Standard",
    "GxP"
   ],
   [
    "Linked to",
    "image digest"
   ]
  ]
 },
 "cicd/c_valsum": {
  "head": "The eval results packaged in the form a validation reviewer needs.",
  "dh": "Versioned eval datasets beat mutable ones.",
  "stack": [
   [
    "Contents",
    "thresholds · results · deltas"
   ],
   [
    "Datasets",
    "versioned, validated"
   ]
  ]
 },
 "cicd/c_sig": {
  "head": "A named, accountable human approves the release.",
  "dh": "A required SME approver for Drug Safety beat a single generic approver.",
  "dec": "For the Drug Safety agent a pharmacovigilance SME is a required approver. The signature is bound to identity and timestamp under Part 11.",
  "stack": [
   [
    "Standard",
    "21 CFR Part 11"
   ],
   [
    "Drug Safety",
    "PV SME required"
   ]
  ]
 },
 "cicd/c_admit": {
  "head": "The cluster refuses anything that cannot prove where it came from.",
  "dh": "Enforcement at the cluster beat enforcement only in the pipeline.",
  "dec": "The last enforcement point is the cluster itself. Ratify verifies the Cosign signature; Gatekeeper policy blocks unsigned or unapproved digests.",
  "stack": [
   [
    "Verify",
    "Ratify"
   ],
   [
    "Policy",
    "Gatekeeper"
   ]
  ]
 },
 "cicd/c_stage": {
  "head": "Full-platform rehearsal with the real orchestrator and the real bus.",
  "dh": "Testing the platform beat testing the container.",
  "dec": "Staging runs the same digest against the real orchestrator so the cross-agent contract is verified live, not in isolation.",
  "stack": [
   [
    "Digest",
    "same as production"
   ],
   [
    "Verifies",
    "cross-agent contract"
   ]
  ]
 },
 "cicd/c_canary": {
  "head": "Progressive delivery with automated analysis between steps.",
  "dh": "Risk-sized rings beat one rollout policy.",
  "dec": "Knowledge goes 5, 20, 50, 100 with automated analysis. Drug Safety goes 2, 10, 50, 100 with a mandatory SME pause before the final promotion.",
  "stack": [
   [
    "Tool",
    "Argo Rollouts"
   ],
   [
    "Knowledge",
    "5 → 20 → 50 → 100"
   ],
   [
    "Drug Safety",
    "2 → 10 → 50 → 100 · SME pause"
   ]
  ]
 },
 "cicd/c_route": {
  "head": "The hard part: canary on a message bus is not the same as canary behind an ingress.",
  "dh": "A topic per agent with stable and canary subscriptions beat a replica-ratio approximation.",
  "dec": "The orchestrator stamps a track property at the rollout step’s weight, hashing the session ID so a conversation stays on one version. Subscription filters send canary-tracked messages to the canary pods. The Drug Safety 2% first ring is only exact this way; with replicas it would need about fifty pods per canary pod, and KEDA would drift the ratio with load.",
  "stack": [
   [
    "Channel",
    "topic per agent"
   ],
   [
    "Subscriptions",
    "stable · canary"
   ],
   [
    "Filter",
    "track property"
   ],
   [
    "Scaling",
    "KEDA per subscription"
   ]
  ]
 },
 "cicd/c_slo": {
  "head": "The canary analysis window, using product signals rather than just infrastructure ones.",
  "dh": "Quality signals beat CPU as the canary metric.",
  "dec": "For an agent, quality metrics degrade before CPU ever notices. Refusal rate and citation coverage are in the analysis alongside latency and subscription backlog.",
  "stack": [
   [
    "Infra",
    "latency · errors · subscription backlog"
   ],
   [
    "Quality",
    "refusal rate · citation coverage"
   ]
  ]
 },
 "cicd/c_rb": {
  "head": "The failure path, exercised deliberately.",
  "dh": "A rehearsed rollback beat a theoretical one.",
  "stack": [
   [
    "Trigger",
    "gate breach in analysis window"
   ],
   [
    "Action",
    "ring demotion"
   ],
   [
    "Speed",
    "instant — previous digest still live"
   ]
  ]
 },
 "jj/code": {
  "head": "The deterministic half of the orchestrator: load session, validate, save session and write the trace, on every request.",
  "dh": "Code around the run beat lifecycle steps as LLM tools."
 }
};
