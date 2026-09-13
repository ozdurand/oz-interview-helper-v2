/* ===========================================================
   diagrams.js — node/edge definitions for the interactive maps
   node.detail = { role, does[], fork, hard, stack[[k,v]], say }
   =========================================================== */

const DIAGRAMS = {};

/* ================================================================
   1 · JOHNSON & JOHNSON — multi-agent GenAI platform on AKS
   ================================================================ */
DIAGRAMS.jj = {
 "co": "Johnson &amp; Johnson",
 "sec": "Architecture",
 "sub": "Multi-agent GenAI · AKS · Rev B",
 "w": 2200,
 "h": 1520,
 "font": 1.45,
 "sheet": {
  "title": "J&amp;J Multi-Agent Platform — Full Architecture",
  "sub": "Rev B · gpt-5.4 lineup · OpenAI Agents SDK · two vector indexes + closure-table terminology",
  "note": "15 tools · 5 specialists + orchestrator",
  "foot": "Every claim in a response resolves by correlation ID to its chunks, controlled versions, model deployment, and verifier verdict.",
  "legend": [
   [
    "sync call",
    "sync"
   ],
   [
    "pub / sub",
    "pub"
   ],
   [
    "hybrid retrieval",
    "hyb"
   ],
   [
    "term lookup",
    "term"
   ],
   [
    "async / data",
    "async"
   ]
  ]
 },
 "chips": [
  "Azure / AKS",
  "GPT-5.4 lineup",
  "OpenAI Agents SDK",
  "Service Bus per-agent channels",
  "2 vector indexes",
  "Closure-table terminology",
  "FDA / EMA"
 ],
 "bands": [
  {
   "id": "L_orch",
   "name": "Azure Kubernetes Service — six independently deployable services",
   "x": 330,
   "y": 150,
   "w": 1230,
   "h": 748,
   "tone": "slate",
   "inside": true,
   "detail": {
    "role": "The runtime. Six services, each independently deployable, each on its own release cadence.",
    "does": [
     "Orchestrator plus five specialists",
     "Every service has its own CI/CD path — see the CI/CD pipeline map",
     "KEDA scales agents on Service Bus queue depth"
    ],
    "say": "Six services on one cluster, released independently."
   }
  },
  {
   "id": "L_ret",
   "name": "Azure AI Search — hybrid · dense + BM25 → RRF → rerank",
   "x": 1590,
   "y": 280,
   "w": 570,
   "h": 268,
   "tone": "teal",
   "inside": true,
   "detail": {
    "role": "The retrieval surface: two indexes, one query pattern.",
    "does": [
     "Dense plus BM25, fused by reciprocal rank, then reranked",
     "Every chunk carries entity and ancestor IDs, tier and effective date",
     "Filters are applied in the query, never after retrieval"
    ],
    "say": "Hybrid retrieval with the filters in the query, not on the result set."
   }
  },
  {
   "id": "L_onto",
   "name": "Terminology layer — derived artifacts, not a database",
   "x": 1590,
   "y": 578,
   "w": 570,
   "h": 258,
   "tone": "orange",
   "inside": true,
   "detail": {
    "role": "The ontology, as release artifacts rather than a live graph.",
    "does": [
     "Term dictionary for exact lookup",
     "Closure table for ancestor expansion",
     "Both built by the Ontology Loader and versioned per vocabulary release"
    ],
    "say": "Derived artifacts, not a database. That sentence is the whole design decision."
   }
  },
  {
   "id": "L_ing",
   "name": "Ingestion / ETL — one document chunked and embedded exactly once",
   "x": 40,
   "y": 940,
   "w": 2120,
   "h": 320,
   "tone": "slate",
   "inside": true,
   "detail": {
    "role": "The batch path. Nothing here runs at request time.",
    "does": [
     "Blob event → parse → chunk → stamp → embed, as one idempotent job",
     "A document is embedded exactly once per version",
     "Closure feeds stamping; a vocabulary release triggers a re-stamp"
    ],
    "say": "One document, chunked and embedded exactly once."
   }
  }
 ],
 "nodes": [
  {
   "id": "users",
   "band": null,
   "x": 40,
   "y": 150,
   "w": 258,
   "h": 74,
   "name": "Users",
   "sub": "",
   "tone": "slate",
   "detail": {
    "role": "The user the whole platform exists for — a biomedical scientist or a drug-safety reviewer asking a question they would otherwise answer by reading for two days.",
    "does": [
     "Authenticates with corporate identity; entitlements travel with the request",
     "Asks in natural language, not query syntax",
     "Judges the answer on whether the citations hold up"
    ],
    "say": "Our users don’t want a chatbot. They want a defensible answer with the sources attached."
   }
  },
  {
   "id": "afd",
   "band": null,
   "x": 40,
   "y": 254,
   "w": 258,
   "h": 96,
   "name": "Azure Front Door",
   "sub": "+ WAF",
   "tone": "blue",
   "detail": {
    "role": "Global edge in front of the platform.",
    "does": [
     "TLS termination and WAF rules at the edge",
     "Routes to the regional AKS ingress"
    ],
    "say": "Nothing reaches the cluster without passing the edge."
   }
  },
  {
   "id": "apim",
   "band": null,
   "x": 40,
   "y": 380,
   "w": 258,
   "h": 96,
   "name": "API Management",
   "sub": "auth · throttle · tier",
   "tone": "blue",
   "detail": {
    "role": "Policy boundary. Everything a caller is allowed to do is expressed here rather than inside the agents.",
    "does": [
     "Subscription, rate and payload policy",
     "Stamps a correlation ID used for end-to-end tracing",
     "Keeps per-consumer quotas off the orchestrator’s hot path"
    ],
    "say": "Policy lives at the gateway so the agents only ever handle already-authorized work."
   }
  },
  {
   "id": "ingress",
   "band": null,
   "x": 40,
   "y": 506,
   "w": 258,
   "h": 96,
   "name": "AKS Ingress",
   "sub": "kubernetes gateway",
   "tone": "blue",
   "detail": {
    "role": "Kubernetes ingress into the cluster.",
    "does": [
     "Routes to the orchestrator service",
     "Internal-only; no agent is publicly addressable"
    ],
    "say": "The agents have no public surface at all."
   }
  },
  {
   "id": "glance",
   "band": null,
   "x": 40,
   "y": 640,
   "w": 258,
   "h": 250,
   "name": "At a glance",
   "sub": "· 6 services on AKS\n· 15 tools total\n· 2 vector indexes\n· 1 closure table\n· 10k+ documents\n· p95 < 900ms",
   "tone": "note",
   "detail": {
    "role": "The numbers to have ready before anyone asks.",
    "does": [
     "Six independently deployable services on AKS: orchestrator plus five specialists",
     "Fifteen tools total — five on the orchestrator, two per specialist",
     "Two vector indexes and one closure table; no runtime graph",
     "10,000+ documents, p95 under 900 ms end-to-end"
    ],
    "say": "Six services, fifteen tools, two indexes, one closure table."
   }
  },
  {
   "id": "orch",
   "band": "L_orch",
   "x": 560,
   "y": 200,
   "w": 470,
   "h": 172,
   "name": "LLM Orchestrator",
   "sub": "gpt-5.4 · OpenAI Agents SDK\ninvoke_agent · validate_output_safety\nload/save_session_context\nemit_orchestration_trace",
   "tone": "purple",
   "detail": {
    "role": "The reasoning core. It plans the request, decides which specialists to involve, fans out, and assembles the final cited response.",
    "does": [
     "Request-level reasoning happens natively in the model — routing, planning, fan-out, assembly",
     "Only five hard tool calls, all of them external I/O",
     "Publishes to each agent’s request channel and is the sole subscriber on every response channel",
     "Owns retries and timeouts; agents never retry each other"
    ],
    "fork": "The alternative was a framework-driven graph where every hop is an explicit node. That makes the control flow legible but freezes it — every new question shape needs a new branch. Letting the model plan keeps the platform open-ended; the governance sits in the gates around it, not in a hardcoded graph.",
    "stack": [
     [
      "Model",
      "GPT-5.4"
     ],
     [
      "Runtime",
      "AKS deployment"
     ],
     [
      "Framework",
      "OpenAI Agents SDK"
     ],
     [
      "State",
      "Managed Redis"
     ]
    ],
    "say": "The orchestrator reasons; it doesn’t just route. The five tool calls are I/O, not thinking.",
    "hard": "The failure mode that mattered was not a wrong answer, it was a confident one. Refusal had to be a first-class, measured output, not an error path."
   }
  },
  {
   "id": "sb",
   "band": "L_orch",
   "x": 355,
   "y": 400,
   "w": 1180,
   "h": 66,
   "name": "Azure Service Bus",
   "sub": "pub / sub · one channel per agent · fan-in by correlation ID",
   "tone": "pink",
   "detail": {
    "role": "The decoupling layer between the orchestrator and the specialists.",
    "does": [
     "Every agent has its own dedicated request and response channel — not one shared fan-out topic",
     "The orchestrator is the sole subscriber on all response channels",
     "Message properties carry the correlation ID, the entitlement scope, and the release ring for canary routing"
    ],
    "fork": "A shared topic with subscription filters is fewer moving parts. It was rejected because agents could then subscribe to results addressed to someone else — which in this domain means validating the wrong artifact, retrying work nobody owns, and a broken audit trail.",
    "hard": "When parallelism was needed, the answer was for the orchestrator to publish a partial request as soon as the knowledge leg landed — not to let QA self-trigger off an event it wasn’t addressed on.",
    "stack": [
     [
      "Service",
      "Azure Service Bus"
     ],
     [
      "Topology",
      "pub/sub, per-agent channels"
     ],
     [
      "Ordering",
      "session-scoped"
     ]
    ],
    "say": "Every agent gets its own channel in both directions, and only the orchestrator reads results."
   }
  },
  {
   "id": "summ",
   "band": "L_orch",
   "x": 365,
   "y": 500,
   "w": 220,
   "h": 148,
   "name": "Summarization",
   "sub": "gpt-5.4-mini\nfetch_and_chunk_doc\ngenerate_summary",
   "tone": "purple",
   "detail": {
    "role": "Compresses long validated material into the shape the scientist asked for.",
    "does": [
     "Map-reduce over long documents",
     "Preserves citation anchors through compression",
     "Runs on a smaller model — the reasoning already happened upstream"
    ],
    "stack": [
     [
      "Model",
      "GPT-5.4-mini"
     ],
     [
      "Pattern",
      "map-reduce"
     ]
    ],
    "say": "Summarization is the cheapest agent on the platform and it should be."
   }
  },
  {
   "id": "qa",
   "band": "L_orch",
   "x": 600,
   "y": 500,
   "w": 220,
   "h": 148,
   "name": "QA · validation",
   "sub": "gpt-5.4 high reasoning\nverify_claim_grounding\nrun_consistency_check",
   "tone": "purple",
   "detail": {
    "role": "Quality assurance in the reasoning sense — it validates the answer against the evidence. It is not a RAG consumer.",
    "does": [
     "Cross-checks every claim against the retrieved spans",
     "Detects unsupported statements and self-consistency failures",
     "Confirms source alignment before the orchestrator assembles the response"
    ],
    "hard": "People read \"QA agent\" as a test-automation agent. It is a verifier: it sees the draft and the evidence, and its job is to disagree.",
    "stack": [
     [
      "Model",
      "GPT-5.4, high reasoning"
     ],
     [
      "Input",
      "draft + retrieved spans"
     ],
     [
      "Output",
      "pass / flag + reason"
     ]
    ],
    "say": "The QA agent doesn’t retrieve anything. It reads the draft against the evidence and tries to break it."
   }
  },
  {
   "id": "ds",
   "band": "L_orch",
   "x": 835,
   "y": 500,
   "w": 220,
   "h": 148,
   "name": "Drug Safety",
   "sub": "gpt-5.4 high reasoning\nsearch_compliance_rules\ngenerate_compliance",
   "tone": "purple",
   "detail": {
    "role": "The regulated leg. Anything touching pharmacovigilance, labeling or submissions comes through here.",
    "does": [
     "Queries the governed Compliance index only — never the general knowledge index",
     "Runs at high reasoning effort; this is the agent where being slow and right beats being fast",
     "Seriousness criteria and MedDRA coding are checked, not inferred"
    ],
    "hard": "False negatives are the asymmetric risk. The eval set for this agent is tuned against recall on seriousness criteria, not against overall accuracy.",
    "stack": [
     [
      "Model",
      "GPT-5.4, high reasoning"
     ],
     [
      "Index",
      "Compliance (governed)"
     ],
     [
      "Standards",
      "MedDRA · E2B(R3)"
     ]
    ],
    "say": "This agent is allowed to be the slowest one on the platform."
   }
  },
  {
   "id": "onto",
   "band": "L_orch",
   "x": 1070,
   "y": 500,
   "w": 220,
   "h": 148,
   "name": "Ontology",
   "sub": "gpt-5.4-mini\nresolve_ontology_terms\ngenerate_ontology_resp",
   "tone": "purple",
   "detail": {
    "role": "Resolves the language of the question into the controlled vocabulary the corpus is indexed under.",
    "does": [
     "Maps free text to MedDRA, SNOMED CT and MeSH concepts",
     "Returns entity IDs plus ancestors so the Knowledge agent can filter on the whole subtree",
     "Runs on a smaller model — this is lookup and normalization, not reasoning"
    ],
    "fork": "A runtime graph database would answer richer questions about how concepts relate. It was rejected for this workload: the ancestor set is what the retrieval actually needs, it is knowable at ingestion, and a traversal in the hot path adds infrastructure plus a place for the query itself to go wrong.",
    "stack": [
     [
      "Model",
      "GPT-5.4-mini"
     ],
     [
      "Spine",
      "MedDRA · SNOMED CT · MeSH"
     ],
     [
      "Lookup",
      "closure table"
     ]
    ],
    "say": "Ontology is a lookup against a precomputed closure table, not a live graph traversal."
   }
  },
  {
   "id": "know",
   "band": "L_orch",
   "x": 1305,
   "y": 500,
   "w": 220,
   "h": 148,
   "name": "Knowledge",
   "sub": "gpt-5.4\nsearch_enterprise_kb\nsynthesize_knowledge",
   "tone": "purple",
   "detail": {
    "role": "Answers the substantive scientific question against the internal corpus.",
    "does": [
     "Search-then-generate: one retrieval tool, one generation tool",
     "Hybrid query — vector plus keyword — with entitlement and domain filters applied at the index",
     "Concept expansion by closure-table filter rather than graph traversal"
    ],
    "stack": [
     [
      "Model",
      "GPT-5.4"
     ],
     [
      "Index",
      "Azure AI Search — Knowledge"
     ],
     [
      "Pattern",
      "2 tools"
     ]
    ],
    "say": "Every specialist is the same shape: search, then generate. Nothing improvises its own data access."
   }
  },
  {
   "id": "aoai",
   "band": "L_orch",
   "x": 690,
   "y": 690,
   "w": 480,
   "h": 88,
   "name": "Azure OpenAI",
   "sub": "gpt-5.4 family + text-embedding-3-large · pinned",
   "tone": "green",
   "detail": {
    "role": "The model deployments themselves, called synchronously and directly by each agent.",
    "does": [
     "Direct REST from agent to model — Service Bus sits between the orchestrator and the agents, never between an agent and the model",
     "Model versions are pinned per agent so a platform-side model change is a change-controlled event",
     "Prompt caching on the stable prefixes; batch pricing for ingestion-time work"
    ],
    "hard": "When GPT-4o was retired the migration had to be per-agent, with the eval suite rerun for each. A model swap in a validated system is a release, not a config change.",
    "say": "The bus decouples orchestration from agents. It does not sit in front of the model."
   }
  },
  {
   "id": "redis",
   "band": null,
   "x": 1590,
   "y": 150,
   "w": 570,
   "h": 100,
   "name": "Azure Managed Redis",
   "sub": "sessions + retrieval cache · key = query + tier",
   "tone": "rose",
   "detail": {
    "role": "Short-lived state for a request in flight.",
    "does": [
     "Holds the plan, partial agent results and conversation turn state",
     "Lets an orchestrator pod die mid-request without losing the work"
    ],
    "say": "Session state is external so any pod can pick the request back up."
   }
  },
  {
   "id": "kidx",
   "band": "L_ret",
   "x": 1614,
   "y": 330,
   "w": 522,
   "h": 92,
   "name": "Knowledge index",
   "sub": "chunks stamped: entity_ids + ancestor_ids",
   "tone": "teal",
   "detail": {
    "role": "The general scientific corpus — 10,000+ documents across the eight-domain pharma taxonomy.",
    "does": [
     "Hybrid search: vector plus BM25, fused at the index",
     "Every chunk carries entity IDs, ancestor IDs, domain tags and a security level",
     "Entitlement filters are applied in the query, before anything is retrieved"
    ],
    "stack": [
     [
      "Service",
      "Azure AI Search"
     ],
     [
      "Embedding",
      "text-embedding-3-large"
     ],
     [
      "Filters",
      "entity · ancestor · domain · security"
     ]
    ],
    "say": "Two indexes, not one. General knowledge and governed content never share a retrieval surface."
   }
  },
  {
   "id": "gidx",
   "band": "L_ret",
   "x": 1614,
   "y": 436,
   "w": 522,
   "h": 92,
   "name": "Governed index",
   "sub": "effective-dated · tiered · + ancestor stamps",
   "tone": "teal",
   "detail": {
    "role": "The governed index: SOPs, labels, submissions, safety records under change control.",
    "does": [
     "Only the Drug Safety &amp; Compliance agent can query it",
     "Every document version is pinned; superseded versions stay retrievable for audit",
     "Change control on the index is treated as change control on a validated system"
    ],
    "say": "Governed content lives behind its own index and its own agent. That separation is the compliance story."
   }
  },
  {
   "id": "dict",
   "band": "L_onto",
   "x": 1614,
   "y": 628,
   "w": 522,
   "h": 88,
   "name": "Term dictionary",
   "sub": "synonym / abbrev → canonical entity ID",
   "tone": "amber",
   "detail": {
    "role": "The lookup that turns what a scientist typed into a canonical entity ID.",
    "does": [
     "Synonyms and abbreviations resolve to one ID against the terminology spine (MedDRA, SNOMED CT, MeSH)",
     "Exact match or found:false — there is no nearest-neighbour guess on a terminology lookup",
     "Built by the Ontology Loader; versioned per vocabulary release"
    ],
    "hard": "A fuzzy match on terminology is a hallucination with extra steps. If the term is not in the dictionary the answer is \"not found\", and the agent says so.",
    "say": "Terminology lookup is exact or it fails loudly. We never guess a concept."
   }
  },
  {
   "id": "closure",
   "band": "L_onto",
   "x": 1614,
   "y": 728,
   "w": 522,
   "h": 88,
   "name": "Closure table",
   "sub": "entity → all ancestors · versioned per release",
   "tone": "white",
   "detail": {
    "role": "The ontology, flattened at ingestion so retrieval never has to traverse anything.",
    "does": [
     "Each chunk is stamped with its own entity IDs plus every parent and ancestor ID",
     "A parent-concept question becomes an index filter across the whole subtree",
     "Rebuilt as a batch artifact when the terminology spine updates"
    ],
    "fork": "Option A was Cosmos DB for Apache Gremlin with runtime traversal. Option B — this one — gets roughly ninety percent of the value at a fraction of the infrastructure, with zero hallucination risk on the retrieval query itself. A graph is the right tool for discovering novel links between disparate literature entities; that is a different product.",
    "hard": "The pushback was that GraphRAG over-complicates the design, and it was right. The honest version of this story is that the simpler design won on the merits.",
    "stack": [
     [
      "Built",
      "at ingestion, in Databricks"
     ],
     [
      "Shape",
      "chunk → entity IDs + ancestors"
     ],
     [
      "Query",
      "index filter"
     ]
    ],
    "say": "We precompute the ancestor closure at ingestion, so concept expansion is a filter, not a traversal."
   }
  },
  {
   "id": "blob",
   "band": "L_ing",
   "x": 65,
   "y": 1000,
   "w": 320,
   "h": 130,
   "name": "Blob + Event Grid",
   "sub": "raw docs\ndiscrete events",
   "tone": "blue",
   "detail": {
    "role": "Landing zone for source documents across the eight pharma domains.",
    "does": [
     "CSRs, safety labels, submissions, ELN entries, literature, patents",
     "Immutable originals; everything downstream is derived and rebuildable"
    ],
    "say": "The raw document is never the thing we retrieve. It’s the thing we can always go back to."
   }
  },
  {
   "id": "docint",
   "band": "L_ing",
   "x": 415,
   "y": 1000,
   "w": 320,
   "h": 130,
   "name": "Document Intelligence",
   "sub": "v4.0 · 2024-11-30\nlayout · OCR gate",
   "tone": "amber",
   "detail": {
    "role": "Turns scientific PDFs into structure instead of a wall of text.",
    "does": [
     "Preserves multi-column layout, tables and figure captions",
     "Table structure survives as structure, which is what makes safety tables usable"
    ],
    "hard": "Naive PDF extraction scrambled multi-column CSR pages into unusable chunks. This was the single biggest quality jump in the whole ingestion path.",
    "say": "Parsing was a bigger lever on answer quality than any model change we made."
   }
  },
  {
   "id": "dbx",
   "band": "L_ing",
   "x": 765,
   "y": 1000,
   "w": 320,
   "h": 130,
   "name": "Databricks",
   "sub": "structural chunking\ndomain·tier·date·type",
   "tone": "blue",
   "detail": {
    "role": "Splits parsed documents into retrievable units.",
    "does": [
     "Respects section boundaries rather than character counts",
     "Overlap tuned so a citation never straddles a chunk edge"
    ],
    "hard": "Big chunks buried the citation; small chunks lost the meaning. The overlap window was the compromise that made both work.",
    "say": "Chunk size is a citation problem before it’s a retrieval problem."
   }
  },
  {
   "id": "stamp",
   "band": "L_ing",
   "x": 1115,
   "y": 1000,
   "w": 320,
   "h": 130,
   "name": "Entity stamping",
   "sub": "entity_ids + all\nancestors + version",
   "tone": "orange",
   "detail": {
    "role": "Where the ontology gets baked in.",
    "does": [
     "Links mentions to the terminology spine",
     "Writes the entity IDs and the full ancestor set onto every chunk",
     "This is the step that lets retrieval skip the graph entirely"
    ],
    "say": "We pay the ontology cost once, at ingestion, instead of on every query."
   }
  },
  {
   "id": "emb",
   "band": "L_ing",
   "x": 1465,
   "y": 1000,
   "w": 320,
   "h": 130,
   "name": "Embeddings",
   "sub": "text-embedding-3-large\nAI Vision · verbalized",
   "tone": "green",
   "detail": {
    "role": "Vectorizes chunks for the dense side of hybrid retrieval.",
    "does": [
     "Batch pricing on the bulk ingestion workload",
     "Re-embedding is a versioned, replayable job, not a manual rerun"
    ],
    "say": "Re-embedding the corpus is a pipeline run, not a project."
   }
  },
  {
   "id": "loader",
   "band": "L_ing",
   "x": 1815,
   "y": 1000,
   "w": 320,
   "h": 130,
   "name": "Ontology Loader",
   "sub": "Databricks job · builds\ndictionary + closure",
   "tone": "amber",
   "detail": {
    "role": "The batch job that produces the terminology artifacts — the dictionary and the closure table.",
    "does": [
     "Runs on Databricks when the vocabulary spine changes",
     "Builds the term dictionary and the ancestor closure as versioned release artifacts",
     "A new vocabulary release triggers a re-stamp of affected chunks"
    ],
    "fork": "The alternative was a live graph database queried at request time. The loader makes the ontology a compile-time artifact instead: cheaper, deterministic, and validatable as a release.",
    "say": "The ontology is built, versioned and released like code — not queried like a database."
   }
  },
  {
   "id": "cosmos",
   "band": null,
   "x": 40,
   "y": 1310,
   "w": 690,
   "h": 128,
   "name": "Cosmos DB / SQL",
   "sub": "state · audit logs · correlation IDs · tool traces",
   "tone": "slate",
   "detail": {
    "role": "The evidence record. What was asked, what was retrieved, what was generated, what was shown.",
    "does": [
     "Immutable append of every request, retrieval set, citation and gate decision",
     "Written on the path, not reconstructed from logs afterwards",
     "This is what makes the platform defensible under 21 CFR Part 11 change control"
    ],
    "say": "If we can’t reconstruct why a scientist saw a specific sentence, the platform isn’t compliant."
   }
  },
  {
   "id": "mon",
   "band": null,
   "x": 755,
   "y": 1310,
   "w": 690,
   "h": 128,
   "name": "Azure Monitor",
   "sub": "OpenTelemetry · App Insights · eval metrics",
   "tone": "slate",
   "detail": {
    "role": "One correlation ID from gateway through every agent hop and model call.",
    "does": [
     "Spans for retrieval, generation and each bus round trip",
     "Makes a slow p95 attributable to a specific agent"
    ],
    "say": "When p95 moves, we know which agent moved it.",
    "hard": "Open scientific Q&amp;A has no single right answer, so no single metric is trustworthy. Seven partial views that all have to agree is the honest substitute for ground truth."
   }
  },
  {
   "id": "secgov",
   "band": null,
   "x": 1470,
   "y": 1310,
   "w": 690,
   "h": 128,
   "name": "Security · Governance",
   "sub": "Key Vault · Entra Workload Identity · Purview",
   "tone": "slate",
   "detail": {
    "role": "Every pod gets its own federated identity via OIDC token exchange — no shared secrets in the cluster.",
    "does": [
     "Six-step wiring: service account, federated credential, managed identity, RBAC on each resource",
     "Scopes each agent to exactly the indexes it is allowed to read",
     "Session isolation falls out of this rather than being enforced in application code"
    ],
    "say": "The Compliance index isn’t protected by a code path. The Knowledge agent’s identity simply can’t read it."
   }
  }
 ],
 "edges": [
  [
   "users",
   "afd",
   "",
   "sync"
  ],
  [
   "afd",
   "apim",
   "",
   "sync"
  ],
  [
   "apim",
   "ingress",
   "",
   "sync"
  ],
  [
   "ingress",
   "orch",
   "",
   "sync",
   {
    "pts": [
     [
      430,
      554
     ],
     [
      430,
      262
     ]
    ]
   }
  ],
  [
   "orch",
   "sb",
   "",
   "pub",
   {
    "pts": [
     [
      795,
      386
     ]
    ]
   }
  ],
  [
   "sb",
   "summ",
   "",
   "pub",
   {
    "pts": [
     [
      475,
      483
     ]
    ]
   }
  ],
  [
   "sb",
   "qa",
   "",
   "pub",
   {
    "pts": [
     [
      710,
      483
     ]
    ]
   }
  ],
  [
   "sb",
   "ds",
   "",
   "pub",
   {
    "pts": [
     [
      945,
      483
     ]
    ]
   }
  ],
  [
   "sb",
   "onto",
   "",
   "pub",
   {
    "pts": [
     [
      1180,
      483
     ]
    ]
   }
  ],
  [
   "sb",
   "know",
   "",
   "pub",
   {
    "pts": [
     [
      1415,
      483
     ]
    ]
   }
  ],
  [
   "summ",
   "aoai",
   "",
   "async",
   {
    "pts": [
     [
      475,
      668
     ],
     [
      930,
      668
     ]
    ]
   }
  ],
  [
   "qa",
   "aoai",
   "",
   "async",
   {
    "pts": [
     [
      710,
      668
     ],
     [
      930,
      668
     ]
    ]
   }
  ],
  [
   "ds",
   "aoai",
   "direct sync REST — never via the bus",
   "async",
   {"lbl": [1332, 660], 
    "pts": [
     [
      945,
      668
     ],
     [
      930,
      668
     ]
    ]
   }
  ],
  [
   "onto",
   "aoai",
   "",
   "async",
   {
    "pts": [
     [
      1180,
      668
     ],
     [
      930,
      668
     ]
    ]
   }
  ],
  [
   "know",
   "aoai",
   "",
   "async",
   {
    "pts": [
     [
      1415,
      668
     ],
     [
      930,
      668
     ]
    ]
   }
  ],
  [
   "orch",
   "redis",
   "load / save_session_context",
   "sync",
   {"lbl": [1306, 226], 
    "route": "straight"
   }
  ],
  [
   "know",
   "kidx",
   "filter: tier + effective date + ancestor_ids",
   "hyb",
   {"lbl": [1877, 548], 
    "pts": [
     [
      1568,
      556
     ],
     [
      1568,
      482
     ]
    ]
   }
  ],
  [
   "onto",
   "closure",
   "exact match or found:false — no nearest neighbor",
   "term",
   {"lbl": [1400, 884], 
    "pts": [
     [
      1220,
      868
     ],
     [
      1580,
      868
     ],
     [
      1580,
      774
     ]
    ]
   }
  ],
  [
   "blob",
   "docint",
   "",
   "sync"
  ],
  [
   "docint",
   "dbx",
   "",
   "sync"
  ],
  [
   "dbx",
   "stamp",
   "",
   "sync"
  ],
  [
   "stamp",
   "emb",
   "",
   "sync"
  ],
  [
   "emb",
   "L_ret",
   "writes vectors",
   "green-dash",
   {"lbl": [1746, 888], 
    "pts": [
     [
      1625,
      900
     ],
     [
      1875,
      900
     ]
    ]
   }
  ],
  [
   "loader",
   "L_onto",
   "builds",
   "term-dash",
   {"lbl": [2019, 868], 
    "pts": [
     [
      1975,
      880
     ],
     [
      2050,
      880
     ]
    ]
   }
  ],
  [
   "loader",
   "stamp",
   "closure feeds stamping · vocabulary release triggers re-stamp",
   "term-dash",
   {"lbl": [1713, 1200], 
    "pts": [
     [
      1975,
      1180
     ],
     [
      1275,
      1180
     ]
    ]
   }
  ],
  [
   "summ",
   "blob",
   "fetch + chunk",
   "blue-dash",
   {"lbl": [350, 906], 
    "pts": [
     [
      475,
      915
     ],
     [
      225,
      915
     ]
    ]
   }
  ],
  [
   "L_ing",
   "cosmos",
   "",
   "async",
   {
    "pts": [
     [
      225,
      1290
     ],
     [
      385,
      1290
     ]
    ],
    "from": [
     225,
     1262
    ]
   }
  ],
  [
   "L_ing",
   "mon",
   "emit_orchestration_trace → OTel",
   "async",
   {"lbl": [1112, 1290], "la": "start", 
    "from": [
     1100,
     1262
    ]
   }
  ]
 ],
 "trace": [
  {
   "nodes": [
    "users",
    "afd",
    "apim",
    "ingress"
   ],
   "text": "1 / 6 — The scientist’s question passes Front Door, APIM and the AKS ingress. Identity is validated, policy applied, and a correlation ID is stamped that follows the request everywhere."
  },
  {
   "nodes": [
    "orch",
    "redis"
   ],
   "text": "2 / 6 — The orchestrator plans: which specialists, in what order, with what is already cached. Session context is loaded from and saved to Managed Redis."
  },
  {
   "nodes": [
    "sb",
    "onto",
    "know"
   ],
   "text": "3 / 6 — Fan-out over the Service Bus, one channel per agent. Ontology resolves the terms against the dictionary; Knowledge runs hybrid retrieval filtered by tier, effective date and the ancestor closure."
  },
  {
   "nodes": [
    "kidx",
    "gidx",
    "closure",
    "ds"
   ],
   "text": "4 / 6 — Retrieval hits the two indexes. Anything regulated is answered only by Drug Safety against the governed index."
  },
  {
   "nodes": [
    "qa",
    "aoai",
    "cosmos"
   ],
   "text": "5 / 6 — QA verifies claim grounding and consistency, calling Azure OpenAI directly over REST — never through the bus. Cosmos records state, audit logs and tool traces by correlation ID."
  },
  {
   "nodes": [
    "orch",
    "ingress",
    "apim",
    "users"
   ],
   "text": "6 / 6 — The orchestrator validates output safety, assembles the cited answer and it returns the way it came, inside the p95 budget."
  }
 ]
};

/* ================================================================
   2 · HOME DEPOT — hybrid search platform
   ================================================================ */
DIAGRAMS.hd = {
 "co": "Home Depot",
 "sec": "Architecture",
 "sub": "Hybrid BM25 + vector fusion · 2021–2023",
 "w": 1940,
 "h": 1340,
 "font": 1.3,
 "sheet": {
  "title": "Home Depot — Hybrid BM25 + Vector Fusion Search",
  "sub": "Sep 2021 – Apr 2023 · phased delivery · self-hosted embeddings · dual index + RRF + cross-encoder",
  "note": "3 phases · 5 source types · ~1,200 docs/week",
  "foot": "Every answer resolves to the chunks it cited, the index version they came from, and the embedding model that produced them.",
  "legend": [
   [
    "sync",
    "sync"
   ],
   [
    "dense",
    "hyb"
   ],
   [
    "lexical",
    "term"
   ],
   [
    "offline",
    "async"
   ]
  ],
  "texts": [
   [
    1640,
    486,
    "filter: department + doc type + ACL"
   ],
   [
    1136,
    782,
    "answer returned through FastAPI, every claim cited"
   ],
   [
    1400,
    1075,
    "ACL tags captured here are the same tags enforced at query time"
   ]
  ]
 },
 "chips": [
  "BM25 · Elasticsearch",
  "FAISS · IVF-PQ",
  "all-mpnet-base-v2 · self-hosted",
  "RRF k=60",
  "ms-marco cross-encoder",
  "GPT-3.5-Turbo (Phase 3)",
  "FastAPI"
 ],
 "bands": [
  {
   "id": "Q",
   "name": "Query-time path — preprocess, retrieve in parallel, fuse, rerank, synthesize",
   "x": 302,
   "y": 155,
   "w": 1068,
   "h": 680,
   "tone": "slate",
   "inside": true,
   "detail": {
    "role": "Everything that runs inside the latency budget.",
    "does": [
     "Preprocess once, then both retrievers in parallel",
     "Fuse on rank, rerank the top-K, synthesise only in Phase 3"
    ],
    "say": "The whole query path is five steps and one of them was added last."
   }
  },
  {
   "id": "M",
   "name": "Metadata &amp; state — filters applied before retrieval",
   "x": 1394,
   "y": 268,
   "w": 490,
   "h": 232,
   "tone": "teal",
   "inside": true,
   "detail": {
    "role": "Filters live in the query, not on the result set.",
    "does": [
     "Department, doc type and ACL are query filters",
     "Post-filtering results is a security bug, not a shortcut"
    ],
    "say": "Filters go in the query. Always."
   }
  },
  {
   "id": "E",
   "name": "Evaluation — the gate on every tuning decision",
   "x": 1394,
   "y": 524,
   "w": 490,
   "h": 222,
   "tone": "orange",
   "inside": true,
   "detail": {
    "role": "Benchmarks and offline metrics; the gate every tuning change passes.",
    "say": "Tuning without a benchmark is guessing with extra steps."
   }
  },
  {
   "id": "I",
   "name": "Ingestion / ETL — one document routed, chunked and embedded exactly once",
   "x": 52,
   "y": 872,
   "w": 1834,
   "h": 240,
   "tone": "slate",
   "inside": true,
   "detail": {
    "role": "The batch path. Route, extract, chunk, embed, dual-write — once per document version.",
    "say": "One document, routed, chunked and embedded exactly once."
   }
  }
 ],
 "nodes": [
  {
   "id": "users",
   "band": null,
   "x": 52,
   "y": 152,
   "w": 222,
   "h": 66,
   "name": "Associates &amp; Analysts",
   "sub": "",
   "tone": "slate",
   "detail": {
    "role": "Store associates on the floor and merchandising analysts — the two very different users of one search box.",
    "does": [
     "Associates need an answer in the aisle, in seconds, on a handheld",
     "Analysts need coverage: every spec, every guide, every playbook"
    ],
    "say": "Two audiences, one index. The associate case is what set the latency budget."
   }
  },
  {
   "id": "apigw",
   "band": null,
   "x": 52,
   "y": 246,
   "w": 222,
   "h": 78,
   "name": "API Gateway",
   "sub": "TSC Identity · RBAC",
   "tone": "blue",
   "detail": {
    "role": "Authentication and role-based access in front of the search API.",
    "does": [
     "Store-ops content is filtered by role at query time"
    ],
    "say": "The permission is applied to the query, not to the results page."
   }
  },
  {
   "id": "fastapi",
   "band": null,
   "x": 52,
   "y": 352,
   "w": 222,
   "h": 80,
   "name": "FastAPI Service",
   "sub": "Python · containerized",
   "tone": "blue",
   "detail": {
    "role": "The service the storefront and associate tools call.",
    "does": [
     "Async fan-out to both retrievers",
     "Timeout budget enforced per stage so one slow leg cannot blow the p95"
    ],
    "say": "Every stage has its own timeout. The p95 is a budget, not a hope."
   }
  },
  {
   "id": "glance",
   "band": null,
   "x": 52,
   "y": 462,
   "w": 222,
   "h": 215,
   "name": "At a glance",
   "sub": "· 3 delivery phases\n· 5 source types\n· 2 retrieval indexes\n· ~1,200 docs / week\n· 14% relevance uplift\n· p95 under 900ms",
   "tone": "note",
   "detail": {
    "role": "The numbers to have ready.",
    "does": [
     "Three delivery phases: BM25 foundation, hybrid, RAG synthesis",
     "Five source types, ~1,200 documents a week",
     "Two retrieval indexes fused by rank",
     "+14% NDCG@10, +21% search success, p95 under 900 ms"
    ],
    "say": "Three phases, two indexes, fourteen percent."
   }
  },
  {
   "id": "qpre",
   "band": "Q",
   "x": 502,
   "y": 200,
   "w": 406,
   "h": 142,
   "name": "Query Preprocessing",
   "sub": "spaCy NER · products, brands, SKUs\nintent classification · 4 classes\nsemantic query rewriting\nemits resolved query + filters",
   "tone": "purple",
   "detail": {
    "role": "The incoming search.",
    "does": [
     "Short, ambiguous and full of trade vocabulary",
     "Roughly half the queries contain a term the catalog spells differently"
    ],
    "say": "\"Sheetrock\" isn’t \"drywall,\" and the customer is not going to change."
   }
  },
  {
   "id": "faiss",
   "band": "Q",
   "x": 334,
   "y": 404,
   "w": 440,
   "h": 104,
   "name": "FAISS Dense Index",
   "sub": "IVF-PQ · 768-dim vectors\nsemantic recall",
   "tone": "teal",
   "detail": {
    "role": "The dense half. Recovers intent-based queries where the shopper’s words don’t match the catalog’s.",
    "does": [
     "Approximate nearest-neighbour over the 768-dim vectors",
     "Tuned for recall, since the reranker fixes ordering downstream"
    ],
    "say": "Dense retrieval buys recall. Precision is the reranker’s job."
   }
  },
  {
   "id": "es",
   "band": "Q",
   "x": 896,
   "y": 404,
   "w": 440,
   "h": 104,
   "name": "Elasticsearch BM25",
   "sub": "inverted index · TF weighting\nexact SKU / model match",
   "tone": "orange",
   "detail": {
    "role": "The lexical half. Still the best thing in the system for an exact SKU or a model number.",
    "does": [
     "Exact-match and rare-term recall",
     "Built first, as the Phase 1 baseline everything else was measured against"
    ],
    "say": "We never replaced BM25. Dense retrieval was added next to it, not instead of it."
   }
  },
  {
   "id": "rrf",
   "band": "Q",
   "x": 502,
   "y": 560,
   "w": 406,
   "h": 68,
   "name": "Reciprocal Rank Fusion",
   "sub": "k = 60 · fuses ranks, not scores",
   "tone": "purple",
   "detail": {
    "role": "Merges the two candidate lists by rank position rather than by score.",
    "does": [
     "Reciprocal rank fusion with k=60",
     "No score normalization, no tuning per query type"
    ],
    "fork": "Weighted score blending was tried first and abandoned. A BM25 score and a cosine distance are not on a comparable scale, and any weighting learned on one query distribution failed on the next.",
    "hard": "The fusion step is where most hybrid search implementations quietly go wrong. Rank is comparable; raw score is not.",
    "say": "We fuse on rank, not on score, because the two scores don’t live in the same space."
   }
  },
  {
   "id": "ce",
   "band": "Q",
   "x": 502,
   "y": 656,
   "w": 406,
   "h": 68,
   "name": "Cross-Encoder Reranker",
   "sub": "ms-marco-MiniLM-L-6-v2 · top-K",
   "tone": "purple",
   "detail": {
    "role": "Reads query and candidate together and reorders the top-k.",
    "does": [
     "Applied to the top candidates only — it is too expensive for the full list",
     "This is where \"related but not what I wanted\" gets pushed back down"
    ],
    "hard": "Fusion got the right documents into the candidate set; it did not get them in the right order. The reranker is what turned recall into a visible improvement for associates.",
    "stack": [
     [
      "Model",
      "ms-marco-MiniLM-L-6-v2"
     ],
     [
      "Applied to",
      "top-k only"
     ]
    ],
    "say": "Fusion fixed recall. The cross-encoder fixed the top three results, which is all anyone looks at."
   }
  },
  {
   "id": "rag",
   "band": "Q",
   "x": 502,
   "y": 750,
   "w": 406,
   "h": 74,
   "name": "RAG Synthesis",
   "sub": "GPT-3.5-Turbo · Azure preview · Phase 3",
   "tone": "green",
   "detail": {
    "role": "Composes a direct answer over the reranked context. The last thing built, not the first.",
    "does": [
     "Strictly grounded on reranked passages",
     "Falls back to the ranked result list when grounding is thin",
     "Arrived only when Azure hosted gpt-35-turbo, in the final weeks"
    ],
    "hard": "Synthesis can over-summarize and drift from the source. The answer quality watch is on the synthesis layer specifically, separately from ranking metrics.",
    "say": "Retrieval quality was already carrying the result before synthesis existed. That ordering was deliberate."
   }
  },
  {
   "id": "model",
   "band": null,
   "x": 1394,
   "y": 155,
   "w": 490,
   "h": 84,
   "name": "Model Layer",
   "sub": "all-mpnet-base-v2 self-hosted · GPT-3.5-Turbo",
   "tone": "green",
   "detail": {
    "role": "Self-hosted sentence-transformers for dense retrieval.",
    "does": [
     "768-dimension vectors, served in-house",
     "Document content never leaves the security boundary",
     "Hosted embeddings arrived on Azure late in the engagement and were treated as a migration, not the starting point"
    ],
    "fork": "A hosted embedding API is less to operate. Self-hosting won on two grounds: it was what actually existed for most of this timeline, and it kept content inside the ISO 27001 boundary.",
    "stack": [
     [
      "Model",
      "all-mpnet-base-v2"
     ],
     [
      "Dim",
      "768"
     ],
     [
      "Serving",
      "self-hosted"
     ]
    ],
    "say": "Self-hosted SBERT — period-correct, and it kept the corpus inside the boundary."
   }
  },
  {
   "id": "cosmos",
   "band": "M",
   "x": 1414,
   "y": 308,
   "w": 452,
   "h": 78,
   "name": "Cosmos DB",
   "sub": "chunk metadata · lineage · ACL tags",
   "tone": "slate",
   "detail": {
    "role": "Query, click and session logging.",
    "does": [
     "Feeds the judgment set and the failure analysis",
     "Where \"vocabulary mismatch\" stopped being an anecdote and became a measured share of traffic"
    ],
    "say": "The logs are what turned a hunch about synonyms into a business case."
   }
  },
  {
   "id": "pg",
   "band": "M",
   "x": 1414,
   "y": 398,
   "w": 452,
   "h": 74,
   "name": "PostgreSQL",
   "sub": "result index · query logs · judgments",
   "tone": "slate",
   "detail": {
    "role": "Relational store for catalog metadata and index state.",
    "does": [
     "Tracks what has been indexed, at what version, and what needs refresh"
    ],
    "say": "The refresh path is state-tracked, so a failed load doesn’t silently leave a stale index."
   }
  },
  {
   "id": "bench",
   "band": "E",
   "x": 1414,
   "y": 564,
   "w": 452,
   "h": 80,
   "name": "Benchmark Query Sets",
   "sub": "graded judgments · curated per class",
   "tone": "white",
   "detail": {
    "role": "The labeled judgment set every ranking change is measured against.",
    "does": [
     "Built from real queries with human relevance labels",
     "Any ranking change is scored offline before it goes near an A/B test"
    ],
    "say": "No ranking change ships without a number attached to it."
   }
  },
  {
   "id": "metrics",
   "band": "E",
   "x": 1414,
   "y": 654,
   "w": 452,
   "h": 74,
   "name": "Offline Metrics",
   "sub": "NDCG · MRR · MAP",
   "tone": "amber",
   "detail": {
    "role": "Live validation on actual shoppers.",
    "does": [
     "Search success — click-through or resolved answer — is the decision metric",
     "Offline metrics predict; the A/B test decides"
    ],
    "say": "NDCG got us permission to run the test. Search success is what we shipped on."
   }
  },
  {
   "id": "src",
   "band": "I",
   "x": 72,
   "y": 912,
   "w": 278,
   "h": 114,
   "name": "Document Sources",
   "sub": "PDF · DOCX · HTML\nSharePoint · API feeds",
   "tone": "blue",
   "detail": {
    "role": "Product specification sheets and buying guides — the densest and most-cited content in the corpus.",
    "does": [
     "~1,200 documents a week across all sources",
     "Specs are table-heavy, which drives the parsing approach"
    ],
    "say": "Most of what an associate needs is in a spec table, not in prose.",
    "hard": "Embedding live inventory was a mistake worth not repeating. Freshness beats semantics for a stock count."
   }
  },
  {
   "id": "router",
   "band": "I",
   "x": 374,
   "y": 912,
   "w": 278,
   "h": 114,
   "name": "File Type Router",
   "sub": "python-magic MIME\next + header fallback",
   "tone": "orange",
   "detail": {
    "role": "Decides which extraction handler a document goes to.",
    "does": [
     "python-magic on the MIME type first",
     "Falls back to extension, then to header sniffing",
     "Unknown types are quarantined, not guessed"
    ],
    "hard": "Files lie about what they are. A .pdf that is actually HTML will silently produce an empty chunk set unless the router checks the bytes.",
    "say": "Route on the bytes, not the filename."
   }
  },
  {
   "id": "extract",
   "band": "I",
   "x": 678,
   "y": 912,
   "w": 278,
   "h": 114,
   "name": "Extraction Handlers",
   "sub": "PyMuPDF · pdfplumber\npython-docx · BS4 · OCR",
   "tone": "amber",
   "detail": {
    "role": "One handler per format, each producing the same normalised text plus metadata.",
    "does": [
     "PyMuPDF for text PDFs, pdfplumber where tables matter",
     "python-docx, BeautifulSoup for HTML, OCR as the last resort"
    ],
    "say": "Every handler emits the same shape, so everything downstream is format-blind."
   }
  },
  {
   "id": "chunk",
   "band": "I",
   "x": 982,
   "y": 912,
   "w": 278,
   "h": 114,
   "name": "Split &amp; Chunk",
   "sub": "spaCy sentences\nrecursive + overlap",
   "tone": "purple",
   "detail": {
    "role": "Splits guides and specs into retrievable passages.",
    "does": [
     "Keeps spec tables intact",
     "Section-aware splits so a step in a DIY guide keeps its context"
    ],
    "say": "A how-to step retrieved without its preceding step is worse than no result.",
    "hard": "New SKUs arrived with thin, inconsistent text and got weak embeddings. Enriching before embedding was the fix, not a better model."
   }
  },
  {
   "id": "emb",
   "band": "I",
   "x": 1286,
   "y": 912,
   "w": 278,
   "h": 114,
   "name": "Embeddings",
   "sub": "all-mpnet-base-v2\n768-dim · in-cluster",
   "tone": "green",
   "detail": {
    "role": "Self-hosted sentence-transformers for dense retrieval.",
    "does": [
     "768-dimension vectors, served in-house",
     "Document content never leaves the security boundary",
     "Hosted embeddings arrived on Azure late in the engagement and were treated as a migration, not the starting point"
    ],
    "fork": "A hosted embedding API is less to operate. Self-hosting won on two grounds: it was what actually existed for most of this timeline, and it kept content inside the ISO 27001 boundary.",
    "stack": [
     [
      "Model",
      "all-mpnet-base-v2"
     ],
     [
      "Dim",
      "768"
     ],
     [
      "Serving",
      "self-hosted"
     ]
    ],
    "say": "Self-hosted SBERT — period-correct, and it kept the corpus inside the boundary."
   }
  },
  {
   "id": "dual",
   "band": "I",
   "x": 1590,
   "y": 912,
   "w": 278,
   "h": 114,
   "name": "Dual-Write",
   "sub": "FAISS + Elasticsearch\nidempotent · versioned",
   "tone": "teal",
   "detail": {
    "role": "Writes every chunk into both indexes, idempotently, with a version.",
    "does": [
     "Both indexes rebuilt independently from the same chunk set",
     "Re-running a batch is safe: same version, same result"
    ],
    "hard": "The two indexes drifting apart — one rebuilt, one not — produced the most confusing bugs on the platform. Versioned dual-write is what stopped it.",
    "say": "Both indexes are derived from one versioned chunk set, so they cannot disagree about what a document says."
   }
  },
  {
   "id": "storage",
   "band": null,
   "x": 52,
   "y": 1148,
   "w": 598,
   "h": 116,
   "name": "Storage &amp; Lineage",
   "sub": "Cosmos DB · PostgreSQL · embedding versioning",
   "tone": "slate",
   "detail": {
    "role": "Where state and lineage live.",
    "does": [
     "Embedding model version recorded per chunk",
     "Every answer resolves to the chunks it cited and the index version they came from"
    ],
    "say": "Every answer resolves to its chunks, its index version and the embedding model that produced them."
   }
  },
  {
   "id": "obs",
   "band": null,
   "x": 672,
   "y": 1148,
   "w": 598,
   "h": 116,
   "name": "Observability",
   "sub": "Elasticsearch → Kibana · Prometheus · Grafana",
   "tone": "slate",
   "detail": {
    "role": "Operational monitoring across retrieval, ranking and serving.",
    "does": [
     "Per-stage latency so a p95 regression is attributable",
     "Ranking quality tracked continuously, not just at release"
    ],
    "say": "Ranking quality drifts with the catalog. It needs monitoring, not just testing."
   }
  },
  {
   "id": "sec",
   "band": null,
   "x": 1290,
   "y": 1148,
   "w": 598,
   "h": 116,
   "name": "Security &amp; Governance",
   "sub": "TSC Identity · RBAC policy feeds · ISO 27001",
   "tone": "slate",
   "detail": {
    "role": "Identity, role policy and the boundary the self-hosted decision protected.",
    "does": [
     "TSC Identity issues the caller token; RBAC policy feeds decide what a role can see",
     "ISO 27001 boundary is why embeddings ran in-cluster"
    ],
    "say": "Self-hosting the embedder was a security decision before it was a cost decision."
   }
  }
 ],
 "edges": [
  [
   "users",
   "apigw",
   "",
   "sync"
  ],
  [
   "apigw",
   "fastapi",
   "",
   "sync"
  ],
  [
   "fastapi",
   "qpre",
   "",
   "sync",
   {
    "pts": [
     [
      388,
      392
     ],
     [
      388,
      252
     ]
    ]
   }
  ],
  [
   "qpre",
   "faiss",
   "parallel dispatch — both indexes on every request",
   "sync",
   {
    "pts": [
     [
      705,
      378
     ],
     [
      555,
      378
     ]
    ],
    "lbl": [
     705,
     372
    ]
   }
  ],
  [
   "qpre",
   "es",
   "",
   "term",
   {
    "pts": [
     [
      705,
      378
     ],
     [
      1116,
      378
     ]
    ]
   }
  ],
  [
   "faiss",
   "rrf",
   "",
   "hyb",
   {
    "pts": [
     [
      555,
      535
     ],
     [
      705,
      535
     ]
    ]
   }
  ],
  [
   "es",
   "rrf",
   "",
   "term",
   {
    "pts": [
     [
      1116,
      535
     ],
     [
      705,
      535
     ]
    ]
   }
  ],
  [
   "rrf",
   "ce",
   "",
   "sync"
  ],
  [
   "ce",
   "rag",
   "",
   "sync"
  ],
  [
   "model",
   "qpre",
   "embedding + synthesis calls",
   "sync",
   {
    "route": "straight",
    "lbl": [
     1140,
     212
    ]
   }
  ],
  [
   "metrics",
   "rrf",
   "fusion weights + reranker replayed against benchmarks before rollout",
   "term-dash",
   {
    "pts": [
     [
      1230,
      690
     ],
     [
      1230,
      600
     ]
    ],
    "lbl": [
     1132,
     656
    ]
   }
  ],
  [
   "cosmos",
   "es",
   "",
   "async",
   {
    "pts": [
     [
      1374,
      347
     ],
     [
      1374,
      437
     ]
    ]
   }
  ],
  [
   "dual",
   "cosmos",
   "",
   "async",
   {
    "pts": [
     [
      1730,
      880
     ],
     [
      1900,
      880
     ],
     [
      1900,
      347
     ]
    ]
   }
  ],
  [
   "dual",
   "faiss",
   "dual-write — both indexes rebuilt independently",
   "async",
   {
    "pts": [
     [
      1660,
      855
     ],
     [
      290,
      855
     ],
     [
      290,
      455
     ]
    ],
    "lbl": [
     995,
     848
    ]
   }
  ],
  [
   "src",
   "router",
   "",
   "sync"
  ],
  [
   "router",
   "extract",
   "",
   "sync"
  ],
  [
   "extract",
   "chunk",
   "",
   "sync"
  ],
  [
   "chunk",
   "emb",
   "",
   "sync"
  ],
  [
   "emb",
   "dual",
   "",
   "sync"
  ],
  [
   "I",
   "storage",
   "",
   "async",
   {
    "from": [
     350,
     1112
    ]
   }
  ],
  [
   "I",
   "obs",
   "",
   "async",
   {
    "from": [
     970,
     1112
    ]
   }
  ],
  [
   "I",
   "sec",
   "",
   "async",
   {
    "from": [
     1588,
     1112
    ]
   }
  ]
 ],
 "trace": [
  {
   "nodes": [
    "users",
    "apigw",
    "fastapi"
   ],
   "text": "1 / 5 — An associate or analyst hits the API Gateway; TSC Identity issues the token and RBAC decides what their role can see. FastAPI owns the per-stage timeout budget."
  },
  {
   "nodes": [
    "qpre",
    "model"
   ],
   "text": "2 / 5 — Preprocessing resolves products, brands and SKUs, classifies intent, rewrites the query and emits the filter set. The embedder is called once here."
  },
  {
   "nodes": [
    "faiss",
    "es",
    "cosmos"
   ],
   "text": "3 / 5 — Parallel dispatch: FAISS for semantic recall, Elasticsearch for exact SKU and model matches, both with department, doc-type and ACL filters applied in the query."
  },
  {
   "nodes": [
    "rrf",
    "ce",
    "bench",
    "metrics"
   ],
   "text": "4 / 5 — Reciprocal rank fusion merges by position, the cross-encoder reorders the top-K. Every change to either was replayed against the benchmarks before rollout."
  },
  {
   "nodes": [
    "rag",
    "fastapi",
    "storage"
   ],
   "text": "5 / 5 — Phase 3 only: GPT-3.5-Turbo synthesises over reranked context and the answer returns through FastAPI, every claim cited, resolvable to its chunks and index version."
  }
 ]
};

DIAGRAMS.citi = {
 "co": "Citibank",
 "sec": "Architecture",
 "sub": "MLOps reference architectures · SR 11-7",
 "w": 1936,
 "h": 1400,
 "font": 1.05,
 "variantGroup": {
  "label": "Workload",
  "key": "wl",
  "options": [
   {
    "id": "fraud",
    "label": "Fraud detection"
   },
   {
    "id": "credit",
    "label": "Credit risk"
   },
   {
    "id": "aml",
    "label": "AML"
   }
  ]
 },
 "chips": [
  "AWS",
  "SageMaker",
  "MLflow registry",
  "Jenkins + Terraform",
  "CodePipeline",
  "SR 11-7",
  "Splunk"
 ],
 "layouts": {
  "fraud": {
   "w": 1936,
   "h": 1400,
   "font": 1.05,
   "sheet": {
    "title": "Real-Time Fraud Detection — MLOps Reference Architecture",
    "sub": "Citibank · AWS · governed under SR 11-7 model risk management",
    "legend": [
     [
      "flow",
      "ink"
     ],
     [
      "feedback",
      "ink-dash"
     ]
    ]
   },
   "bands": [
    {
     "id": "R1",
     "name": "DATA PLANE · FEATURES AND LABELS",
     "x": 63,
     "y": 134,
     "w": 1808,
     "h": 330,
     "style": "rule",
     "detail": {
      "role": "Where the data comes from and how it becomes labels and a training set.",
      "say": "The data plane is where point-in-time correctness is won or lost."
     }
    },
    {
     "id": "R2",
     "name": "BUILD AND PROMOTION · THE GOVERNANCE SPINE",
     "x": 63,
     "y": 510,
     "w": 1808,
     "h": 330,
     "style": "rule",
     "detail": {
      "role": "The governance spine — the same six stages on every Citibank workload.",
      "does": [
       "Notebooks become production scripts, built and versioned by Jenkins with Terraform IaC",
       "One immutable image digest promoted dev → UAT → production",
       "Train, evaluate, package, register — nothing reaches an endpoint outside this path"
      ],
      "say": "One governance spine serving three very different model shapes."
     }
    },
    {
     "id": "R3",
     "name": "GATE, SERVE, MONITOR",
     "x": 63,
     "y": 878,
     "w": 1808,
     "h": 470,
     "style": "rule",
     "detail": {
      "role": "Two gates before serving, one loop after it.",
      "does": [
       "A technical gate and a model-risk gate, both with a No branch that is a real outcome",
       "A monitoring question whose Yes re-enters the governance spine"
      ],
      "say": "Both gates have a No branch, and the No branch is exercised."
     }
    }
   ],
   "nodes": [
    {
     "id": "src",
     "band": "R1",
     "x": 63,
     "y": 218,
     "w": 278,
     "h": 94,
     "name": "Transaction + Customer Data",
     "sub": "Card auth events (MSK / Kinesis)\nS3 lake · RDS · device + merchant",
     "tone": "citi",
     "detail": {
      "role": "Where the data originates, and the first place the three workloads diverge.",
      "does": [
       "Fraud: an authorization stream measured in milliseconds",
       "Credit: application data plus bureau files, where the file vintage itself has to be reproducible years later",
       "AML: payment flows plus a pinned sanctions watchlist version"
      ],
      "say": "Same governance spine, three completely different data shapes."
     }
    },
    {
     "id": "ingest",
     "band": "R1",
     "x": 369,
     "y": 218,
     "w": 278,
     "h": 94,
     "name": "Ingest + Validate",
     "sub": "PII tokenization, KMS,\nlineage + governance checks",
     "tone": "citi",
     "detail": {
      "role": "Tokenise PII, encrypt, and attach lineage before anything is stored.",
      "does": [
       "KMS-backed tokenisation so raw PANs never reach a feature",
       "Schema and governance checks fail the batch, not the model"
      ],
      "say": "Governance checks run on the data before a model ever sees it."
     }
    },
    {
     "id": "sfc",
     "band": "R1",
     "x": 675,
     "y": 218,
     "w": 278,
     "h": 94,
     "name": "Stream Feature Compute",
     "sub": "Flink / Kinesis Analytics\nvelocity, entity, device counters",
     "tone": "citi",
     "detail": {
      "role": "Velocity and entity counters computed on the stream, inside the authorization window.",
      "does": [
       "Flink on Kinesis Analytics for the sub-second counters",
       "The same definitions feed the offline store for training"
      ],
      "say": "Velocity features are computed once, on the stream, and written to both stores."
     }
    },
    {
     "id": "fs",
     "band": "R1",
     "x": 981,
     "y": 205,
     "w": 278,
     "h": 120,
     "name": "Feature Store",
     "sub": "Online: DynamoDB p99 &lt; 10 ms\nOffline: S3 + Glue — one definition",
     "tone": "citi",
     "shape": "cyl",
     "detail": {
      "role": "One feature definition serving both training and inference.",
      "does": [
       "Offline store for training, online store for serving, from the same definition",
       "Point-in-time correctness so a training row only sees what was knowable then"
      ],
      "hard": "Training-serving skew was the most expensive class of bug on the platform. A feature computed one way in a notebook and another way in the serving path changes model behavior in production with no code change anywhere.",
      "fork": "Before SageMaker Feature Store existed this was a hand-rolled DynamoDB plus Glue arrangement. The migration was worth it for the parity guarantee, not for the convenience.",
      "say": "The feature store exists to kill training-serving skew. Everything else it does is secondary."
     }
    },
    {
     "id": "labels",
     "band": "R1",
     "x": 1287,
     "y": 218,
     "w": 278,
     "h": 94,
     "name": "Label Store",
     "sub": "Chargeback / dispute outcomes\nconfirmed 30–90 days later",
     "tone": "citi",
     "detail": {
      "role": "Fraud labels arrive late — a chargeback lands 30 to 90 days after the transaction.",
      "does": [
       "Labels joined back to the originating transaction",
       "The lag is why training sets are time-based, never random"
      ],
      "hard": "A random train/test split on fraud data leaks the future. The label lag forces a time-based split.",
      "say": "Fraud labels are 30 to 90 days late, and the whole training design follows from that."
     }
    },
    {
     "id": "tset",
     "band": "R1",
     "x": 1593,
     "y": 218,
     "w": 278,
     "h": 94,
     "name": "Curated Training Set",
     "sub": "Point-in-time correct join\ntime-based train / val / test",
     "tone": "citi",
     "detail": {
      "role": "The dataset behind every model, frozen and addressable.",
      "does": [
       "Every training run points at a version, never at a mutable path",
       "This is the first thing a validator asks for"
      ],
      "say": "\"Rebuild the model from eight months ago\" is only answerable if the data was immutable at the time."
     }
    },
    {
     "id": "dev",
     "band": "R2",
     "x": 63,
     "y": 620,
     "w": 278,
     "h": 70,
     "name": "Data Scientists",
     "sub": "Notebooks -> production scripts",
     "tone": "citi",
     "detail": {
      "role": "Where the work starts — and where it used to stop.",
      "does": [
       "Notebooks become production scripts before anything else happens",
       "The POC finding: models on laptops with governance-by-spreadsheet cannot be validated"
      ],
      "say": "Getting models off laptops was the whole first phase."
     }
    },
    {
     "id": "jenkins",
     "band": "R2",
     "x": 369,
     "y": 608,
     "w": 278,
     "h": 94,
     "name": "Jenkins CI + Terraform IaC",
     "sub": "Build / test / version\nIAM · VPC · KMS · SageMaker",
     "tone": "citi",
     "detail": {
      "role": "Infrastructure rebuildable from code.",
      "does": [
       "Environment parity is a control, not a convenience",
       "Change to infrastructure is a reviewed change"
      ],
      "say": "If the environment can’t be rebuilt from code, it can’t be evidence."
     }
    },
    {
     "id": "ecr",
     "band": "R2",
     "x": 675,
     "y": 600,
     "w": 278,
     "h": 110,
     "name": "Amazon ECR",
     "sub": "Immutable image digest",
     "tone": "citi",
     "shape": "cyl",
     "detail": {
      "role": "One image, built once, referenced by digest everywhere.",
      "does": [
       "The digest, not a tag, is promoted through every environment",
       "Nothing is rebuilt for UAT or production"
      ],
      "say": "Production runs the exact bytes that passed the gates."
     }
    },
    {
     "id": "cp",
     "band": "R2",
     "x": 981,
     "y": 608,
     "w": 278,
     "h": 94,
     "name": "AWS CodePipeline CD",
     "sub": "Promotes the same digest\ndev -> UAT -> production",
     "tone": "citi",
     "detail": {
      "role": "The pipeline layer, and an honest migration story.",
      "does": [
       "Step Functions plus Jenkins through 2020 — SageMaker Pipelines did not exist yet",
       "Migrated after its GA at re:Invent 2020, in the final eight months"
      ],
      "hard": "The glue between Step Functions and Jenkins drifted and broke silently. Consolidating onto one orchestrator removed a whole class of invisible failure.",
      "say": "The migration was late in the engagement and I’d rather date it accurately than claim it from day one."
     }
    },
    {
     "id": "train",
     "band": "R2",
     "x": 1287,
     "y": 608,
     "w": 278,
     "h": 94,
     "name": "SageMaker Pipeline",
     "sub": "Train (XGBoost) · evaluate\npackage · register",
     "tone": "citi",
     "detail": {
      "role": "Model training as a reproducible job rather than a notebook run.",
      "does": [
       "Pinned container, pinned dependencies, pinned data version",
       "Params and metrics logged automatically, not by convention"
      ],
      "say": "Getting models off laptops was the whole POC. Everything after that was making it governed.",
      "hard": "Without this, reproduction was archaeology — and sometimes simply impossible. That is the finding that unlocked the whole programme."
     }
    },
    {
     "id": "reg",
     "band": "R2",
     "x": 1593,
     "y": 595,
     "w": 278,
     "h": 120,
     "name": "Model Registry (MLflow)",
     "sub": "Code commit · image digest\ndata hash · approval state",
     "tone": "citi",
     "shape": "cyl",
     "detail": {
      "role": "The one place a model version can be promoted from.",
      "does": [
       "Every registered version carries its lineage and its validation status",
       "Nothing reaches an endpoint without a registry entry"
      ],
      "say": "If it isn’t in the registry, it can’t be deployed. That constraint is the whole design."
     }
    },
    {
     "id": "g1",
     "band": "R3",
     "x": 63,
     "y": 970,
     "w": 278,
     "h": 190,
     "name": "Technical Gate",
     "sub": "PR-AUC · recall @ FPR\np99 latency met?",
     "tone": "citi",
     "shape": "diamond",
     "detail": {
      "role": "The workload-specific gate — the place where the domain regulation, not the ML, sets the bar.",
      "does": [
       "Fraud: the cost of a false decline is a customer-experience number, and it is weighed explicitly",
       "Credit: reason codes have to fall out of the model structure, because an adverse action notice is a legal artifact",
       "AML: above-the-line and below-the-line testing proves the alerting threshold isn’t hiding activity underneath it"
      ],
      "hard": "AML is the clearest case on the platform where the ML is easy and the governance is the entire job.",
      "say": "Each workload has one gate that exists purely because of its regulator."
     }
    },
    {
     "id": "g2",
     "band": "R3",
     "x": 369,
     "y": 970,
     "w": 278,
     "h": 190,
     "name": "Model Risk Gate",
     "sub": "SR 11-7 validation ·\nSHAP reason codes ·\nMRM approval?",
     "tone": "citi",
     "shape": "diamond",
     "detail": {
      "role": "A second line of defence that does not report to the people who built the model.",
      "does": [
       "Reviews conceptual soundness, data, testing and monitoring plan",
       "Evidence is packaged by the pipeline so validators validate instead of reconstructing"
      ],
      "hard": "The review queue was the real bottleneck, and bottlenecks breed shortcuts. Automating evidence packaging shortened the queue without weakening the control.",
      "say": "We didn’t make validation faster by validating less. We made the evidence arrive complete."
     }
    },
    {
     "id": "s1",
     "band": "R3",
     "x": 675,
     "y": 1020,
     "w": 278,
     "h": 94,
     "name": "Progressive Release",
     "sub": "Shadow -> canary ->\nchampion / challenger variant",
     "tone": "citi",
     "detail": {
      "role": "Shadow, then canary, then champion/challenger as a variant on the endpoint.",
      "does": [
       "Shadow scores every transaction with no effect",
       "Canary takes real traffic on a small share",
       "Champion/challenger evidence is what MRM sees at the next review"
      ],
      "say": "Nothing goes from validated to 100% in one step."
     }
    },
    {
     "id": "s2",
     "band": "R3",
     "x": 981,
     "y": 1020,
     "w": 278,
     "h": 94,
     "name": "Production Scoring",
     "sub": "API GW -> decision service ->\nendpoint · p99 &lt; 100 ms",
     "tone": "citi",
     "detail": {
      "role": "The only route to production, and it only accepts registered, validated versions.",
      "does": [
       "Fraud: real-time scoring inside the authorization window",
       "Credit: decisioning where latency barely matters and reproducibility matters enormously",
       "AML: pre-transaction sanctions screening plus ranking of rules-generated alerts"
      ],
      "hard": "For AML the hard rule is that a model may rank an alert but may never close one. Ranking improves analyst throughput; auto-closing would be unmonitored dismissal of suspicious activity.",
      "say": "The model ranks the queue. A human still closes every alert."
     }
    },
    {
     "id": "s3",
     "band": "R3",
     "x": 1287,
     "y": 1020,
     "w": 278,
     "h": 94,
     "name": "Monitor + Audit",
     "sub": "CloudWatch · Splunk decision log\nPSI drift · label reconciliation",
     "tone": "citi",
     "detail": {
      "role": "Watches for the slow failure, not the loud one.",
      "does": [
       "Input distribution drift and performance decay tracked separately",
       "Thresholds agreed with model risk, not chosen by the modelling team"
      ],
      "hard": "Models degraded slowly with no signal until a business metric moved. By then the damage was months old.",
      "say": "The dangerous failure isn’t an outage. It’s six months of quiet decay."
     }
    },
    {
     "id": "q",
     "band": "R3",
     "x": 1593,
     "y": 970,
     "w": 278,
     "h": 190,
     "name": "Drift or\ndegradation\ndetected?",
     "sub": "",
     "tone": "citi",
     "shape": "diamond",
     "detail": {
      "role": "A drift breach opens the pipeline again — it does not shortcut it.",
      "does": [
       "Retrain re-enters at training and goes back through every gate",
       "No emergency path that bypasses validation"
      ],
      "fork": "An auto-redeploy on drift is faster and was explicitly rejected. A model that reaches production without validation is an unapproved model, regardless of how it got there.",
      "say": "Drift triggers a retrain, not a redeploy. The gates are not optional under pressure."
     }
    },
    {
     "id": "no1",
     "band": "R3",
     "x": 63,
     "y": 1292,
     "w": 278,
     "h": 48,
     "name": "Fail fast — notify, fix data",
     "sub": "",
     "tone": "citi",
     "detail": {
      "role": "The technical gate’s No branch.",
      "say": "A failed technical gate is a data problem first."
     }
    },
    {
     "id": "no2",
     "band": "R3",
     "x": 369,
     "y": 1292,
     "w": 278,
     "h": 48,
     "name": "Remediate + resubmit to MRM",
     "sub": "",
     "tone": "citi",
     "detail": {
      "role": "The model-risk gate’s No branch: remediate and resubmit.",
      "say": "MRM says no more often than people expect, and that is the control working."
     }
    },
    {
     "id": "mid",
     "band": "R3",
     "x": 945,
     "y": 1292,
     "w": 348,
     "h": 48,
     "name": "Rollback — revert variant / rules-only",
     "sub": "",
     "tone": "citi",
     "detail": {
      "role": "Rollback is a variant revert or a rules-only fallback — instant, because the previous version is still live.",
      "say": "Rollback is instant because we never took the old model down."
     }
    },
    {
     "id": "no3",
     "band": "R3",
     "x": 1593,
     "y": 1292,
     "w": 278,
     "h": 48,
     "name": "Continue serving",
     "sub": "",
     "tone": "citi",
     "detail": {
      "role": "The steady state.",
      "say": "Most weeks the answer is no, and the model keeps serving."
     }
    }
   ],
   "edges": [
    [
     "src",
     "ingest",
     "",
     "ink"
    ],
    [
     "ingest",
     "sfc",
     "",
     "ink"
    ],
    [
     "sfc",
     "fs",
     "",
     "ink"
    ],
    [
     "fs",
     "labels",
     "",
     "ink"
    ],
    [
     "labels",
     "tset",
     "",
     "ink"
    ],
    [
     "fs",
     "tset",
     "",
     "ink",
     {
      "pts": [
       [
        1258,
        415
       ],
       [
        1733,
        415
       ]
      ]
     }
    ],
    [
     "tset",
     "train",
     "",
     "ink",
     {
      "pts": [
       [
        1733,
        485
       ],
       [
        1428,
        485
       ]
      ]
     }
    ],
    [
     "fs",
     "s2",
     "online lookup — same features, same code path as training",
     "ink-dash",
     {
      "pts": [
       [
        1118,
        440
       ],
       [
        1273,
        440
       ],
       [
        1273,
        995
       ],
       [
        1118,
        995
       ]
      ],
      "lbl": [
       1500,
       447
      ]
     }
    ],
    [
     "dev",
     "jenkins",
     "",
     "ink"
    ],
    [
     "jenkins",
     "ecr",
     "",
     "ink"
    ],
    [
     "ecr",
     "cp",
     "",
     "ink"
    ],
    [
     "cp",
     "train",
     "",
     "ink"
    ],
    [
     "train",
     "reg",
     "",
     "ink"
    ],
    [
     "g1",
     "g2",
     "",
     "ink"
    ],
    [
     "g2",
     "s1",
     "",
     "ink"
    ],
    [
     "s1",
     "s2",
     "",
     "ink"
    ],
    [
     "s2",
     "s3",
     "",
     "ink"
    ],
    [
     "s3",
     "q",
     "",
     "ink"
    ],
    [
     "g1",
     "no1",
     "No",
     "ink",
     {
      "lbl": [
       230,
       1185
      ],
      "la": "start"
     }
    ],
    [
     "g2",
     "no2",
     "No",
     "ink",
     {
      "lbl": [
       536,
       1185
      ],
      "la": "start"
     }
    ],
    [
     "q",
     "no3",
     "No",
     "ink",
     {
      "lbl": [
       1760,
       1185
      ],
      "la": "start"
     }
    ],
    [
     "reg",
     "g1",
     "",
     "ink",
     {
      "pts": [
       [
        1733,
        822
       ],
       [
        203,
        822
       ]
      ]
     }
    ],
    [
     "s2",
     "mid",
     "",
     "ink-dash"
    ],
    [
     "q",
     "train",
     "Yes — retrain re-enters the Model Risk Gate",
     "ink",
     {
      "pts": [
       [
        1733,
        950
       ],
       [
        1428,
        950
       ]
      ],
      "lbl": [
       1240,
       927
      ]
     }
    ]
   ],
   "trace": [
    {
     "nodes": [
      "src",
      "ingest",
      "sfc",
      "fs"
     ],
     "text": "1 / 5 — Authorization events stream in, PII is tokenised, and velocity features are computed once on the stream and written to both the online and offline store from one definition."
    },
    {
     "nodes": [
      "labels",
      "tset"
     ],
     "text": "2 / 5 — Chargeback labels arrive 30–90 days late, so the training set is a point-in-time correct join with time-based splits."
    },
    {
     "nodes": [
      "dev",
      "jenkins",
      "ecr",
      "cp",
      "train",
      "reg"
     ],
     "text": "3 / 5 — The governance spine: scripts, not notebooks; one immutable digest promoted dev → UAT → prod; train, evaluate, package, register."
    },
    {
     "nodes": [
      "g1",
      "g2",
      "s1"
     ],
     "text": "4 / 5 — Technical gate on PR-AUC, recall at a fixed FPR and p99; then the SR 11-7 gate with SHAP reason codes and MRM approval; then shadow → canary → champion/challenger."
    },
    {
     "nodes": [
      "s2",
      "s3",
      "q"
     ],
     "text": "5 / 5 — Real-time scoring under 100 ms with the online feature lookup on the same code path as training. Monitor, reconcile labels, and any drift re-enters the Model Risk Gate."
    }
   ]
  },
  "credit": {
   "w": 1936,
   "h": 1400,
   "font": 1.05,
   "sheet": {
    "title": "Credit Risk &amp; Decisioning — MLOps Reference Architecture",
    "sub": "Citibank · AWS · SR 11-7 · ECOA/Reg B adverse action · CCAR and CECL downstream",
    "legend": [
     [
      "flow",
      "ink"
     ],
     [
      "feedback",
      "ink-dash"
     ]
    ]
   },
   "bands": [
    {
     "id": "R1",
     "name": "DATA PLANE · SAMPLE CONSTRUCTION",
     "x": 63,
     "y": 134,
     "w": 1808,
     "h": 330,
     "style": "rule",
     "detail": {
      "role": "Where the data comes from and how it becomes labels and a training set.",
      "say": "The data plane is where point-in-time correctness is won or lost."
     }
    },
    {
     "id": "R2",
     "name": "BUILD AND PROMOTION · THE GOVERNANCE SPINE",
     "x": 63,
     "y": 510,
     "w": 1808,
     "h": 330,
     "style": "rule",
     "detail": {
      "role": "The governance spine — the same six stages on every Citibank workload.",
      "does": [
       "Notebooks become production scripts, built and versioned by Jenkins with Terraform IaC",
       "One immutable image digest promoted dev → UAT → production",
       "Train, evaluate, package, register — nothing reaches an endpoint outside this path"
      ],
      "say": "One governance spine serving three very different model shapes."
     }
    },
    {
     "id": "R3",
     "name": "GATE, SCORE, MONITOR",
     "x": 63,
     "y": 878,
     "w": 1808,
     "h": 470,
     "style": "rule",
     "detail": {
      "role": "Two gates before serving, one loop after it.",
      "does": [
       "A technical gate and a model-risk gate, both with a No branch that is a real outcome",
       "A monitoring question whose Yes re-enters the governance spine"
      ],
      "say": "Both gates have a No branch, and the No branch is exercised."
     }
    }
   ],
   "nodes": [
    {
     "id": "src",
     "band": "R1",
     "x": 63,
     "y": 218,
     "w": 278,
     "h": 94,
     "name": "Bureau + Core Banking Data",
     "sub": "Experian / Equifax / TransUnion,\napplications, balances, payments",
     "tone": "citi",
     "detail": {
      "role": "Where the data originates, and the first place the three workloads diverge.",
      "does": [
       "Fraud: an authorization stream measured in milliseconds",
       "Credit: application data plus bureau files, where the file vintage itself has to be reproducible years later",
       "AML: payment flows plus a pinned sanctions watchlist version"
      ],
      "say": "Same governance spine, three completely different data shapes."
     }
    },
    {
     "id": "ingest",
     "band": "R1",
     "x": 369,
     "y": 218,
     "w": 278,
     "h": 94,
     "name": "Ingest + Reconcile",
     "sub": "Bureau file balancing, schema\ncontract, PII tokenization, KMS",
     "tone": "citi",
     "detail": {
      "role": "Bureau file balancing against control totals, schema contracts, tokenisation.",
      "say": "If the bureau file does not balance, nothing downstream runs."
     }
    },
    {
     "id": "cdz",
     "band": "R1",
     "x": 675,
     "y": 205,
     "w": 278,
     "h": 120,
     "name": "Curated Data Zone",
     "sub": "S3 + Glue · Redshift marts\nimmutable dated snapshots",
     "tone": "citi",
     "shape": "cyl",
     "detail": {
      "role": "The dataset behind every model, frozen and addressable.",
      "does": [
       "Every training run points at a version, never at a mutable path",
       "This is the first thing a validator asks for"
      ],
      "say": "\"Rebuild the model from eight months ago\" is only answerable if the data was immutable at the time."
     }
    },
    {
     "id": "vint",
     "band": "R1",
     "x": 981,
     "y": 218,
     "w": 278,
     "h": 94,
     "name": "Performance / Vintage Store",
     "sub": "Good-bad definition at fixed\nobservation + outcome dates",
     "tone": "citi",
     "detail": {
      "role": "The good/bad definition, fixed at an observation date and an outcome date.",
      "does": [
       "A vintage is a cohort observed at one date and judged at a later one",
       "Realised outcomes rejoin here for back-testing"
      ],
      "say": "Credit models are trained on vintages, not on rows."
     }
    },
    {
     "id": "dsample",
     "band": "R1",
     "x": 1287,
     "y": 218,
     "w": 278,
     "h": 94,
     "name": "Development Sample",
     "sub": "Point-in-time snapshot hash,\ndev / holdout / out-of-time",
     "tone": "citi",
     "detail": {
      "role": "Dev, holdout and out-of-time samples, each with a snapshot hash.",
      "say": "Out-of-time is the sample that matters. In-time holdout flatters every credit model."
     }
    },
    {
     "id": "seg",
     "band": "R1",
     "x": 1593,
     "y": 218,
     "w": 278,
     "h": 94,
     "name": "Segmentation + WOE Binning",
     "sub": "Monotonic constraint design,\nreason-code map defined here",
     "tone": "citi",
     "detail": {
      "role": "Where reason codes are designed in, not bolted on.",
      "does": [
       "Weight-of-evidence binning with monotonic constraints",
       "The reason-code map is a property of the binning, so adverse-action notices fall out of the model structure"
      ],
      "hard": "A post-hoc explanation on an unconstrained model is not a Reg B reason code. The constraint has to be in the structure.",
      "say": "Reason codes are designed at binning time, because the adverse action notice is a legal artifact."
     }
    },
    {
     "id": "dev",
     "band": "R2",
     "x": 63,
     "y": 620,
     "w": 278,
     "h": 70,
     "name": "Model Developers",
     "sub": "Notebooks -> production scripts",
     "tone": "citi",
     "detail": {
      "role": "Where the work starts — and where it used to stop.",
      "does": [
       "Notebooks become production scripts before anything else happens",
       "The POC finding: models on laptops with governance-by-spreadsheet cannot be validated"
      ],
      "say": "Getting models off laptops was the whole first phase."
     }
    },
    {
     "id": "jenkins",
     "band": "R2",
     "x": 369,
     "y": 608,
     "w": 278,
     "h": 94,
     "name": "Jenkins CI + Terraform IaC",
     "sub": "Build / test / version\nIAM · VPC · KMS · SageMaker",
     "tone": "citi",
     "detail": {
      "role": "Infrastructure rebuildable from code.",
      "does": [
       "Environment parity is a control, not a convenience",
       "Change to infrastructure is a reviewed change"
      ],
      "say": "If the environment can’t be rebuilt from code, it can’t be evidence."
     }
    },
    {
     "id": "ecr",
     "band": "R2",
     "x": 675,
     "y": 600,
     "w": 278,
     "h": 110,
     "name": "Amazon ECR",
     "sub": "Immutable image digest",
     "tone": "citi",
     "shape": "cyl",
     "detail": {
      "role": "One image, built once, referenced by digest everywhere.",
      "does": [
       "The digest, not a tag, is promoted through every environment",
       "Nothing is rebuilt for UAT or production"
      ],
      "say": "Production runs the exact bytes that passed the gates."
     }
    },
    {
     "id": "cp",
     "band": "R2",
     "x": 981,
     "y": 608,
     "w": 278,
     "h": 94,
     "name": "AWS CodePipeline CD",
     "sub": "Promotes the same digest\ndev -> UAT -> production",
     "tone": "citi",
     "detail": {
      "role": "The pipeline layer, and an honest migration story.",
      "does": [
       "Step Functions plus Jenkins through 2020 — SageMaker Pipelines did not exist yet",
       "Migrated after its GA at re:Invent 2020, in the final eight months"
      ],
      "hard": "The glue between Step Functions and Jenkins drifted and broke silently. Consolidating onto one orchestrator removed a whole class of invisible failure.",
      "say": "The migration was late in the engagement and I’d rather date it accurately than claim it from day one."
     }
    },
    {
     "id": "train",
     "band": "R2",
     "x": 1287,
     "y": 608,
     "w": 278,
     "h": 94,
     "name": "SageMaker Training",
     "sub": "PD scorecard (logistic + WOE)\nmonotonic XGB challenger · LGD/EAD",
     "tone": "citi",
     "detail": {
      "role": "Model training as a reproducible job rather than a notebook run.",
      "does": [
       "Pinned container, pinned dependencies, pinned data version",
       "Params and metrics logged automatically, not by convention"
      ],
      "say": "Getting models off laptops was the whole POC. Everything after that was making it governed.",
      "hard": "Without this, reproduction was archaeology — and sometimes simply impossible. That is the finding that unlocked the whole programme."
     }
    },
    {
     "id": "reg",
     "band": "R2",
     "x": 1593,
     "y": 595,
     "w": 278,
     "h": 120,
     "name": "Model Registry (MLflow)",
     "sub": "Code · image digest · data hash\ncut-off policy · approval state",
     "tone": "citi",
     "shape": "cyl",
     "detail": {
      "role": "The one place a model version can be promoted from.",
      "does": [
       "Every registered version carries its lineage and its validation status",
       "Nothing reaches an endpoint without a registry entry"
      ],
      "say": "If it isn’t in the registry, it can’t be deployed. That constraint is the whole design."
     }
    },
    {
     "id": "g1",
     "band": "R3",
     "x": 63,
     "y": 970,
     "w": 278,
     "h": 190,
     "name": "Discriminatory Power",
     "sub": "KS · Gini · PSI ·\nreason codes 100%?",
     "tone": "citi",
     "shape": "diamond",
     "detail": {
      "role": "The workload-specific gate — the place where the domain regulation, not the ML, sets the bar.",
      "does": [
       "Fraud: the cost of a false decline is a customer-experience number, and it is weighed explicitly",
       "Credit: reason codes have to fall out of the model structure, because an adverse action notice is a legal artifact",
       "AML: above-the-line and below-the-line testing proves the alerting threshold isn’t hiding activity underneath it"
      ],
      "hard": "AML is the clearest case on the platform where the ML is easy and the governance is the entire job.",
      "say": "Each workload has one gate that exists purely because of its regulator."
     }
    },
    {
     "id": "g2",
     "band": "R3",
     "x": 369,
     "y": 970,
     "w": 278,
     "h": 190,
     "name": "Model Risk + Fair\nLending Gate",
     "sub": "SR 11-7 · Reg B\ndisparate impact?",
     "tone": "citi",
     "shape": "diamond",
     "detail": {
      "role": "A second line of defence that does not report to the people who built the model.",
      "does": [
       "Reviews conceptual soundness, data, testing and monitoring plan",
       "Evidence is packaged by the pipeline so validators validate instead of reconstructing"
      ],
      "hard": "The review queue was the real bottleneck, and bottlenecks breed shortcuts. Automating evidence packaging shortened the queue without weakening the control.",
      "say": "We didn’t make validation faster by validating less. We made the evidence arrive complete."
     }
    },
    {
     "id": "s1",
     "band": "R3",
     "x": 675,
     "y": 1020,
     "w": 278,
     "h": 94,
     "name": "Batch Scoring",
     "sub": "SageMaker Batch Transform\nmonthly + at origination",
     "tone": "citi",
     "detail": {
      "role": "The only route to production, and it only accepts registered, validated versions.",
      "does": [
       "Fraud: real-time scoring inside the authorization window",
       "Credit: decisioning where latency barely matters and reproducibility matters enormously",
       "AML: pre-transaction sanctions screening plus ranking of rules-generated alerts"
      ],
      "hard": "For AML the hard rule is that a model may rank an alert but may never close one. Ranking improves analyst throughput; auto-closing would be unmonitored dismissal of suspicious activity.",
      "say": "The model ranks the queue. A human still closes every alert."
     }
    },
    {
     "id": "s2",
     "band": "R3",
     "x": 981,
     "y": 1020,
     "w": 278,
     "h": 94,
     "name": "Decision + Adverse Action",
     "sub": "Cut-offs, line assignment,\nReg B notice within 30 days",
     "tone": "citi",
     "detail": {
      "role": "Cut-offs and line assignment, with the Reg B adverse-action notice inside 30 days.",
      "does": [
       "Every decline carries its reason codes",
       "Cut-off policy is versioned in the registry alongside the model"
      ],
      "say": "The notice deadline is 30 days and the reason codes have to be right the first time."
     }
    },
    {
     "id": "s3",
     "band": "R3",
     "x": 1287,
     "y": 1020,
     "w": 278,
     "h": 94,
     "name": "Score History + Audit",
     "sub": "Every score with model and\npolicy version · Splunk log",
     "tone": "citi",
     "detail": {
      "role": "Every decision recorded with the exact inputs and the exact model version that produced it.",
      "does": [
       "Score history retained so a decision can be reproduced years later",
       "Includes the feature values as served, not as recomputed"
      ],
      "say": "Reproducing a decision means reproducing the inputs too, not just the model."
     }
    },
    {
     "id": "q",
     "band": "R3",
     "x": 1593,
     "y": 970,
     "w": 278,
     "h": 190,
     "name": "Degradation or\nannual revalidation\ndue?",
     "sub": "",
     "tone": "citi",
     "shape": "diamond",
     "detail": {
      "role": "Time-based review independent of any drift signal.",
      "does": [
       "Driven by the model inventory, not by a detector",
       "Credit risk in particular runs on an annual revalidation clock"
      ],
      "say": "Some reviews are calendar-driven. A quiet model still has to be re-examined.",
      "fork": "An auto-redeploy on drift is faster and was explicitly rejected. A model that reaches production without validation is an unapproved model, regardless of how it got there."
     }
    },
    {
     "id": "no1",
     "band": "R3",
     "x": 63,
     "y": 1292,
     "w": 278,
     "h": 48,
     "name": "Redevelop / rebin the sample",
     "sub": "",
     "tone": "citi",
     "detail": {
      "role": "The technical gate’s No branch.",
      "say": "A failed technical gate is a data problem first."
     }
    },
    {
     "id": "no2",
     "band": "R3",
     "x": 369,
     "y": 1292,
     "w": 278,
     "h": 48,
     "name": "Remediate + resubmit to MRM",
     "sub": "",
     "tone": "citi",
     "detail": {
      "role": "The model-risk gate’s No branch: remediate and resubmit.",
      "say": "MRM says no more often than people expect, and that is the control working."
     }
    },
    {
     "id": "mid",
     "band": "R3",
     "x": 981,
     "y": 1292,
     "w": 278,
     "h": 48,
     "name": "Downstream: CCAR / DFAST · CECL",
     "sub": "",
     "tone": "citi",
     "detail": {
      "role": "Where the scores go next: CCAR / DFAST stress testing and CECL reserving.",
      "say": "A credit model is also an input to the bank’s capital numbers, which is why the revalidation clock is annual."
     }
    },
    {
     "id": "no3",
     "band": "R3",
     "x": 1593,
     "y": 1292,
     "w": 278,
     "h": 48,
     "name": "Continue in production",
     "sub": "",
     "tone": "citi",
     "detail": {
      "role": "The steady state.",
      "say": "Most weeks the answer is no, and the model keeps serving."
     }
    },
    {
     "id": "inv",
     "band": "R3",
     "x": 1287,
     "y": 1292,
     "w": 278,
     "h": 48,
     "name": "Model inventory + revalidation",
     "sub": "",
     "tone": "citi",
     "detail": {
      "role": "The bank-wide register that makes SR 11-7 enforceable.",
      "does": [
       "Owner, tier, validation status and revalidation date per model"
      ],
      "say": "You cannot govern models you cannot enumerate."
     }
    }
   ],
   "edges": [
    [
     "src",
     "ingest",
     "",
     "ink"
    ],
    [
     "ingest",
     "cdz",
     "",
     "ink"
    ],
    [
     "cdz",
     "vint",
     "",
     "ink"
    ],
    [
     "vint",
     "dsample",
     "",
     "ink"
    ],
    [
     "dsample",
     "seg",
     "",
     "ink"
    ],
    [
     "seg",
     "train",
     "",
     "ink",
     {
      "pts": [
       [
        1733,
        485
       ],
       [
        1428,
        485
       ]
      ]
     }
    ],
    [
     "s3",
     "vint",
     "scores and realized outcomes rejoin the vintage store for back-testing",
     "ink-dash",
     {
      "pts": [
       [
        1428,
        860
       ],
       [
        1273,
        860
       ],
       [
        1273,
        440
       ],
       [
        1118,
        440
       ]
      ],
      "lbl": [
       1540,
       447
      ]
     }
    ],
    [
     "dev",
     "jenkins",
     "",
     "ink"
    ],
    [
     "jenkins",
     "ecr",
     "",
     "ink"
    ],
    [
     "ecr",
     "cp",
     "",
     "ink"
    ],
    [
     "cp",
     "train",
     "",
     "ink"
    ],
    [
     "train",
     "reg",
     "",
     "ink"
    ],
    [
     "g1",
     "g2",
     "",
     "ink"
    ],
    [
     "g2",
     "s1",
     "",
     "ink"
    ],
    [
     "s1",
     "s2",
     "",
     "ink"
    ],
    [
     "s2",
     "s3",
     "",
     "ink"
    ],
    [
     "s3",
     "q",
     "",
     "ink"
    ],
    [
     "g1",
     "no1",
     "No",
     "ink",
     {
      "lbl": [
       230,
       1185
      ],
      "la": "start"
     }
    ],
    [
     "g2",
     "no2",
     "No",
     "ink",
     {
      "lbl": [
       536,
       1185
      ],
      "la": "start"
     }
    ],
    [
     "q",
     "no3",
     "No",
     "ink",
     {
      "lbl": [
       1760,
       1185
      ],
      "la": "start"
     }
    ],
    [
     "reg",
     "g1",
     "",
     "ink",
     {
      "pts": [
       [
        1733,
        822
       ],
       [
        203,
        822
       ]
      ]
     }
    ],
    [
     "s2",
     "mid",
     "",
     "ink"
    ],
    [
     "s3",
     "inv",
     "",
     "ink"
    ],
    [
     "q",
     "train",
     "Yes — recalibrate, then re-enter the Model Risk Gate",
     "ink",
     {
      "pts": [
       [
        1733,
        950
       ],
       [
        1428,
        950
       ]
      ],
      "lbl": [
       1200,
       927
      ]
     }
    ]
   ],
   "trace": [
    {
     "nodes": [
      "src",
      "ingest",
      "cdz"
     ],
     "text": "1 / 5 — Bureau and core-banking data is balanced against control totals, tokenised, and frozen as immutable dated snapshots."
    },
    {
     "nodes": [
      "vint",
      "dsample",
      "seg"
     ],
     "text": "2 / 5 — Vintages with a fixed good/bad definition, dev / holdout / out-of-time samples with a snapshot hash, and WOE binning with monotonic constraints — where the reason-code map is designed."
    },
    {
     "nodes": [
      "dev",
      "jenkins",
      "ecr",
      "cp",
      "train",
      "reg"
     ],
     "text": "3 / 5 — The same governance spine: scripts, one digest, a PD scorecard with a monotonic XGB challenger, registered with its cut-off policy."
    },
    {
     "nodes": [
      "g1",
      "g2",
      "s1"
     ],
     "text": "4 / 5 — KS, Gini, PSI and 100% reason-code coverage; then SR 11-7 plus fair-lending review; then batch scoring monthly and at origination."
    },
    {
     "nodes": [
      "s2",
      "s3",
      "q",
      "mid"
     ],
     "text": "5 / 5 — Decisions with a Reg B notice inside 30 days, every score audited with its model and policy version, outcomes rejoining the vintage store, and an annual revalidation clock. Scores feed CCAR / DFAST and CECL."
    }
   ]
  },
  "aml": {
   "w": 1936,
   "h": 1400,
   "font": 1.05,
   "sheet": {
    "title": "AML Transaction Monitoring &amp; Sanctions Screening — MLOps Reference Architecture",
    "sub": "Citibank · AWS · BSA/AML and OFAC obligations · SR 11-7 validation plus above-the-line / below-the-line testing",
    "legend": [
     [
      "flow",
      "ink"
     ],
     [
      "feedback",
      "ink-dash"
     ]
    ]
   },
   "bands": [
    {
     "id": "R1",
     "name": "DATA PLANE · ENTITIES, TYPOLOGIES, LABELS",
     "x": 63,
     "y": 134,
     "w": 1808,
     "h": 330,
     "style": "rule",
     "detail": {
      "role": "Where the data comes from and how it becomes labels and a training set.",
      "say": "The data plane is where point-in-time correctness is won or lost."
     }
    },
    {
     "id": "R2",
     "name": "BUILD AND PROMOTION · THE GOVERNANCE SPINE",
     "x": 63,
     "y": 510,
     "w": 1808,
     "h": 330,
     "style": "rule",
     "detail": {
      "role": "The governance spine — the same six stages on every Citibank workload.",
      "does": [
       "Notebooks become production scripts, built and versioned by Jenkins with Terraform IaC",
       "One immutable image digest promoted dev → UAT → production",
       "Train, evaluate, package, register — nothing reaches an endpoint outside this path"
      ],
      "say": "One governance spine serving three very different model shapes."
     }
    },
    {
     "id": "R3",
     "name": "GATE, SERVE, MONITOR",
     "x": 63,
     "y": 878,
     "w": 1808,
     "h": 470,
     "style": "rule",
     "detail": {
      "role": "Two gates before serving, one loop after it.",
      "does": [
       "A technical gate and a model-risk gate, both with a No branch that is a real outcome",
       "A monitoring question whose Yes re-enters the governance spine"
      ],
      "say": "Both gates have a No branch, and the No branch is exercised."
     }
    }
   ],
   "nodes": [
    {
     "id": "feeds",
     "band": "R1",
     "x": 70,
     "y": 200,
     "w": 278,
     "h": 74,
     "name": "Transaction Feeds",
     "sub": "Wires / SWIFT, ACH, card, cash",
     "tone": "citi",
     "detail": {
      "role": "Where the data originates, and the first place the three workloads diverge.",
      "does": [
       "Fraud: an authorization stream measured in milliseconds",
       "Credit: application data plus bureau files, where the file vintage itself has to be reproducible years later",
       "AML: payment flows plus a pinned sanctions watchlist version"
      ],
      "say": "Same governance spine, three completely different data shapes."
     }
    },
    {
     "id": "kyc",
     "band": "R1",
     "x": 70,
     "y": 313,
     "w": 278,
     "h": 74,
     "name": "KYC / CDD + Watchlists",
     "sub": "OFAC, PEP — daily versioned list",
     "tone": "citi",
     "detail": {
      "role": "Customer due diligence plus the sanctions and PEP watchlists, versioned daily.",
      "does": [
       "The watchlist version is pinned with the model and rule set",
       "A screening decision is reproducible only if the list version is known"
      ],
      "say": "The watchlist is a versioned input, the same as the model."
     }
    },
    {
     "id": "norm",
     "band": "R1",
     "x": 376,
     "y": 244,
     "w": 278,
     "h": 94,
     "name": "Normalize + Entity Resolution",
     "sub": "Canonical schema; fuzzy party\nmatching; counterparty graph",
     "tone": "citi",
     "detail": {
      "role": "Canonical schema, fuzzy party matching, and the counterparty graph that typology features are built on.",
      "hard": "Entity resolution is where most AML feature quality is decided. Two records for one party means two half-histories and a missed pattern.",
      "say": "Structuring and layering are graph patterns. You cannot see them without resolving the parties first."
     }
    },
    {
     "id": "feat",
     "band": "R1",
     "x": 682,
     "y": 232,
     "w": 278,
     "h": 120,
     "name": "AML Feature Layer",
     "sub": "Peer baselines · structuring,\nlayering · graph degree, community",
     "tone": "citi",
     "shape": "cyl",
     "detail": {
      "role": "One feature definition serving both training and inference.",
      "does": [
       "Offline store for training, online store for serving, from the same definition",
       "Point-in-time correctness so a training row only sees what was knowable then"
      ],
      "hard": "Training-serving skew was the most expensive class of bug on the platform. A feature computed one way in a notebook and another way in the serving path changes model behavior in production with no code change anywhere.",
      "fork": "Before SageMaker Feature Store existed this was a hand-rolled DynamoDB plus Glue arrangement. The migration was worth it for the parity guarantee, not for the convenience.",
      "say": "The feature store exists to kill training-serving skew. Everything else it does is secondary."
     }
    },
    {
     "id": "labels",
     "band": "R1",
     "x": 988,
     "y": 244,
     "w": 278,
     "h": 94,
     "name": "Label Store",
     "sub": "Dispositions + SAR outcomes joined\nto originating transactions",
     "tone": "citi",
     "detail": {
      "role": "Investigator dispositions and SAR outcomes, joined back to the originating transactions.",
      "say": "The label is a human disposition, which means the label is also a measure of the investigators."
     }
    },
    {
     "id": "alerts",
     "band": "R1",
     "x": 1294,
     "y": 244,
     "w": 278,
     "h": 94,
     "name": "Curated Alert Sample",
     "sub": "SAR-confirmed vs. closed alerts,\nroughly 1 in 1,000 productive",
     "tone": "citi",
     "detail": {
      "role": "The training sample: SAR-confirmed against closed alerts, at roughly one productive alert in a thousand.",
      "hard": "One in a thousand is the base rate. Any metric that ignores it — accuracy above all — is meaningless here.",
      "say": "The base rate is one in a thousand. Everything about the evaluation follows from that."
     }
    },
    {
     "id": "rules",
     "band": "R1",
     "x": 1600,
     "y": 244,
     "w": 278,
     "h": 94,
     "name": "Rule Set + Thresholds",
     "sub": "Versioned and pinned together\nwith model and list version",
     "tone": "citi",
     "detail": {
      "role": "The rules engine configuration, versioned and pinned with the model and the watchlist.",
      "say": "Rules, model and list are one versioned unit. Change one and the evidence for all three is stale."
     }
    },
    {
     "id": "dev",
     "band": "R2",
     "x": 63,
     "y": 620,
     "w": 278,
     "h": 70,
     "name": "Model Developers",
     "sub": "Typology + graph feature design",
     "tone": "citi",
     "detail": {
      "role": "Where the work starts — and where it used to stop.",
      "does": [
       "Notebooks become production scripts before anything else happens",
       "The POC finding: models on laptops with governance-by-spreadsheet cannot be validated"
      ],
      "say": "Getting models off laptops was the whole first phase."
     }
    },
    {
     "id": "jenkins",
     "band": "R2",
     "x": 369,
     "y": 608,
     "w": 278,
     "h": 94,
     "name": "Jenkins CI + Terraform IaC",
     "sub": "Build / test / version\nIAM · VPC · KMS · SageMaker",
     "tone": "citi",
     "detail": {
      "role": "Infrastructure rebuildable from code.",
      "does": [
       "Environment parity is a control, not a convenience",
       "Change to infrastructure is a reviewed change"
      ],
      "say": "If the environment can’t be rebuilt from code, it can’t be evidence."
     }
    },
    {
     "id": "ecr",
     "band": "R2",
     "x": 675,
     "y": 600,
     "w": 278,
     "h": 110,
     "name": "Amazon ECR",
     "sub": "Immutable image digest",
     "tone": "citi",
     "shape": "cyl",
     "detail": {
      "role": "One image, built once, referenced by digest everywhere.",
      "does": [
       "The digest, not a tag, is promoted through every environment",
       "Nothing is rebuilt for UAT or production"
      ],
      "say": "Production runs the exact bytes that passed the gates."
     }
    },
    {
     "id": "cp",
     "band": "R2",
     "x": 981,
     "y": 608,
     "w": 278,
     "h": 94,
     "name": "AWS CodePipeline CD",
     "sub": "Promotes the same digest\ndev -> UAT -> production",
     "tone": "citi",
     "detail": {
      "role": "The pipeline layer, and an honest migration story.",
      "does": [
       "Step Functions plus Jenkins through 2020 — SageMaker Pipelines did not exist yet",
       "Migrated after its GA at re:Invent 2020, in the final eight months"
      ],
      "hard": "The glue between Step Functions and Jenkins drifted and broke silently. Consolidating onto one orchestrator removed a whole class of invisible failure.",
      "say": "The migration was late in the engagement and I’d rather date it accurately than claim it from day one."
     }
    },
    {
     "id": "train",
     "band": "R2",
     "x": 1287,
     "y": 608,
     "w": 278,
     "h": 94,
     "name": "SageMaker Training",
     "sub": "Alert scoring + prioritization,\nsegmentation for threshold setting",
     "tone": "citi",
     "detail": {
      "role": "Model training as a reproducible job rather than a notebook run.",
      "does": [
       "Pinned container, pinned dependencies, pinned data version",
       "Params and metrics logged automatically, not by convention"
      ],
      "say": "Getting models off laptops was the whole POC. Everything after that was making it governed.",
      "hard": "Without this, reproduction was archaeology — and sometimes simply impossible. That is the finding that unlocked the whole programme."
     }
    },
    {
     "id": "reg",
     "band": "R2",
     "x": 1593,
     "y": 595,
     "w": 278,
     "h": 120,
     "name": "Model Registry (MLflow)",
     "sub": "Model · rule set · watchlist\nversion pinned together",
     "tone": "citi",
     "shape": "cyl",
     "detail": {
      "role": "The one place a model version can be promoted from.",
      "does": [
       "Every registered version carries its lineage and its validation status",
       "Nothing reaches an endpoint without a registry entry"
      ],
      "say": "If it isn’t in the registry, it can’t be deployed. That constraint is the whole design."
     }
    },
    {
     "id": "g1",
     "band": "R3",
     "x": 63,
     "y": 970,
     "w": 278,
     "h": 190,
     "name": "Detection Gate",
     "sub": "Precision / recall on\nSAR labels · typology\ncoverage?",
     "tone": "citi",
     "shape": "diamond",
     "detail": {
      "role": "Precision and recall on SAR labels, plus typology coverage — is every typology the bank is obliged to detect actually detectable.",
      "say": "Coverage is a regulatory question before it is a model question."
     }
    },
    {
     "id": "g2",
     "band": "R3",
     "x": 369,
     "y": 970,
     "w": 278,
     "h": 190,
     "name": "ATL / BTL +\nCompliance Gate",
     "sub": "Sampling evidence ·\nBSA officer sign-off?",
     "tone": "citi",
     "shape": "diamond",
     "detail": {
      "role": "The workload-specific gate — the place where the domain regulation, not the ML, sets the bar.",
      "does": [
       "Fraud: the cost of a false decline is a customer-experience number, and it is weighed explicitly",
       "Credit: reason codes have to fall out of the model structure, because an adverse action notice is a legal artifact",
       "AML: above-the-line and below-the-line testing proves the alerting threshold isn’t hiding activity underneath it"
      ],
      "hard": "AML is the clearest case on the platform where the ML is easy and the governance is the entire job.",
      "say": "Each workload has one gate that exists purely because of its regulator."
     }
    },
    {
     "id": "s1",
     "band": "R3",
     "x": 675,
     "y": 1020,
     "w": 278,
     "h": 94,
     "name": "Screening + Monitoring Run",
     "sub": "Pre-transaction OFAC screening;\nnightly rules engine alerts",
     "tone": "citi",
     "detail": {
      "role": "The only route to production, and it only accepts registered, validated versions.",
      "does": [
       "Fraud: real-time scoring inside the authorization window",
       "Credit: decisioning where latency barely matters and reproducibility matters enormously",
       "AML: pre-transaction sanctions screening plus ranking of rules-generated alerts"
      ],
      "hard": "For AML the hard rule is that a model may rank an alert but may never close one. Ranking improves analyst throughput; auto-closing would be unmonitored dismissal of suspicious activity.",
      "say": "The model ranks the queue. A human still closes every alert."
     }
    },
    {
     "id": "s2",
     "band": "R3",
     "x": 981,
     "y": 1020,
     "w": 278,
     "h": 94,
     "name": "Alert Scoring + Prioritization",
     "sub": "Ranks the investigator queue —\nit never auto-closes an alert",
     "tone": "citi",
     "detail": {
      "role": "Ranks the investigator queue. It never closes an alert.",
      "does": [
       "Ranking improves analyst throughput and reduces backlog",
       "Auto-closing would be unmonitored dismissal of suspicious activity"
      ],
      "hard": "The hard rule on this platform: a model may rank an alert, never close one.",
      "say": "The model ranks the queue. A human still closes every alert."
     }
    },
    {
     "id": "s3",
     "band": "R3",
     "x": 1287,
     "y": 1020,
     "w": 278,
     "h": 94,
     "name": "Case Management + Audit",
     "sub": "L1/L2/L3 queue; FinCEN filing;\nSplunk lineage: rule, model, list",
     "tone": "citi",
     "detail": {
      "role": "Every decision recorded with the exact inputs and the exact model version that produced it.",
      "does": [
       "Score history retained so a decision can be reproduced years later",
       "Includes the feature values as served, not as recomputed"
      ],
      "say": "Reproducing a decision means reproducing the inputs too, not just the model."
     }
    },
    {
     "id": "q",
     "band": "R3",
     "x": 1593,
     "y": 970,
     "w": 278,
     "h": 190,
     "name": "Typology drift or\ncoverage gap?",
     "sub": "",
     "tone": "citi",
     "shape": "diamond",
     "detail": {
      "role": "A drift breach opens the pipeline again — it does not shortcut it.",
      "does": [
       "Retrain re-enters at training and goes back through every gate",
       "No emergency path that bypasses validation"
      ],
      "fork": "An auto-redeploy on drift is faster and was explicitly rejected. A model that reaches production without validation is an unapproved model, regardless of how it got there.",
      "say": "Drift triggers a retrain, not a redeploy. The gates are not optional under pressure."
     }
    },
    {
     "id": "no1",
     "band": "R3",
     "x": 63,
     "y": 1292,
     "w": 278,
     "h": 48,
     "name": "Rework detection logic",
     "sub": "",
     "tone": "citi",
     "detail": {
      "role": "The technical gate’s No branch.",
      "say": "A failed technical gate is a data problem first."
     }
    },
    {
     "id": "no2",
     "band": "R3",
     "x": 369,
     "y": 1292,
     "w": 278,
     "h": 48,
     "name": "Re-tune + re-document",
     "sub": "",
     "tone": "citi",
     "detail": {
      "role": "The model-risk gate’s No branch: remediate and resubmit.",
      "say": "MRM says no more often than people expect, and that is the control working."
     }
    },
    {
     "id": "mid",
     "band": "R3",
     "x": 682,
     "y": 1292,
     "w": 306,
     "h": 48,
     "name": "Payment held on a hit — L1 clearing",
     "sub": "",
     "tone": "citi",
     "detail": {
      "role": "A sanctions hit holds the payment for L1 clearing.",
      "say": "A screening hit stops money moving. That is the one decision on the platform with no ranking involved."
     }
    },
    {
     "id": "no3",
     "band": "R3",
     "x": 1593,
     "y": 1292,
     "w": 278,
     "h": 48,
     "name": "Continue monitoring",
     "sub": "",
     "tone": "citi",
     "detail": {
      "role": "The steady state.",
      "say": "Most weeks the answer is no, and the model keeps serving."
     }
    },
    {
     "id": "aq",
     "band": "R3",
     "x": 1268,
     "y": 1292,
     "w": 326,
     "h": 48,
     "name": "Alert quality — FP rate vs. capacity",
     "sub": "",
     "tone": "citi",
     "detail": {
      "role": "The operating metric: false-positive rate against investigator capacity.",
      "say": "Alert quality is measured against how many cases the team can actually work."
     }
    }
   ],
   "edges": [
    [
     "feeds",
     "norm",
     "",
     "ink",
     {
      "pts": [
       [
        392,
        237
       ],
       [
        392,
        290
       ]
      ],
      "to": [
       376,
       290
      ]
     }
    ],
    [
     "kyc",
     "norm",
     "",
     "ink",
     {
      "pts": [
       [
        392,
        350
       ],
       [
        392,
        290
       ]
      ],
      "to": [
       376,
       290
      ]
     }
    ],
    [
     "norm",
     "feat",
     "",
     "ink"
    ],
    [
     "feat",
     "labels",
     "",
     "ink"
    ],
    [
     "labels",
     "alerts",
     "",
     "ink"
    ],
    [
     "alerts",
     "rules",
     "",
     "ink"
    ],
    [
     "alerts",
     "train",
     "",
     "ink"
    ],
    [
     "rules",
     "s1",
     "",
     "ink-dash",
     {
      "pts": [
       [
        1740,
        455
       ],
       [
        1900,
        455
       ],
       [
        1900,
        868
       ],
       [
        822,
        868
       ]
      ]
     }
    ],
    [
     "s3",
     "labels",
     "dispositions and SAR outcomes return as labels",
     "ink-dash",
     {
      "pts": [
       [
        1433,
        895
       ],
       [
        1280,
        895
       ],
       [
        1280,
        458
       ],
       [
        1128,
        458
       ]
      ],
      "lbl": [
       1470,
       462
      ]
     }
    ],
    [
     "dev",
     "jenkins",
     "",
     "ink"
    ],
    [
     "jenkins",
     "ecr",
     "",
     "ink"
    ],
    [
     "ecr",
     "cp",
     "",
     "ink"
    ],
    [
     "cp",
     "train",
     "",
     "ink"
    ],
    [
     "train",
     "reg",
     "",
     "ink"
    ],
    [
     "g1",
     "g2",
     "",
     "ink"
    ],
    [
     "g2",
     "s1",
     "",
     "ink"
    ],
    [
     "s1",
     "s2",
     "",
     "ink"
    ],
    [
     "s2",
     "s3",
     "",
     "ink"
    ],
    [
     "s3",
     "q",
     "",
     "ink"
    ],
    [
     "g1",
     "no1",
     "No",
     "ink",
     {
      "lbl": [
       230,
       1185
      ],
      "la": "start"
     }
    ],
    [
     "g2",
     "no2",
     "No",
     "ink",
     {
      "lbl": [
       536,
       1185
      ],
      "la": "start"
     }
    ],
    [
     "q",
     "no3",
     "No",
     "ink",
     {
      "lbl": [
       1760,
       1185
      ],
      "la": "start"
     }
    ],
    [
     "reg",
     "g1",
     "",
     "ink",
     {
      "pts": [
       [
        1733,
        822
       ],
       [
        203,
        822
       ]
      ]
     }
    ],
    [
     "s1",
     "mid",
     "",
     "ink-dash"
    ],
    [
     "s3",
     "aq",
     "",
     "ink"
    ],
    [
     "q",
     "train",
     "Yes — retune, then re-enter ATL / BTL testing",
     "ink",
     {
      "pts": [
       [
        1740,
        965
       ],
       [
        1433,
        965
       ]
      ],
      "lbl": [
       1240,
       942
      ]
     }
    ]
   ],
   "trace": [
    {
     "nodes": [
      "feeds",
      "kyc",
      "norm",
      "feat"
     ],
     "text": "1 / 5 — Payment feeds and the daily-versioned watchlist are normalised and party-resolved into a counterparty graph; typology features are computed on peer baselines and graph structure."
    },
    {
     "nodes": [
      "labels",
      "alerts",
      "rules"
     ],
     "text": "2 / 5 — Dispositions and SAR outcomes become labels at a base rate of about one in a thousand. Rules, thresholds, model and list version are pinned together."
    },
    {
     "nodes": [
      "dev",
      "jenkins",
      "ecr",
      "cp",
      "train",
      "reg"
     ],
     "text": "3 / 5 — The same governance spine; the registry pins model, rule set and watchlist version as one unit."
    },
    {
     "nodes": [
      "g1",
      "g2",
      "s1"
     ],
     "text": "4 / 5 — Detection gate on SAR precision/recall and typology coverage; ATL / BTL testing with sampling evidence and BSA officer sign-off; then pre-transaction OFAC screening and nightly rules alerts."
    },
    {
     "nodes": [
      "s2",
      "s3",
      "q",
      "mid"
     ],
     "text": "5 / 5 — The model ranks the investigator queue and never closes an alert. A screening hit holds the payment for L1 clearing. Cases are audited with rule, model and list lineage; drift re-enters ATL / BTL."
    }
   ]
  }
 },
 "bands": [],
 "nodes": [],
 "edges": [],
 "trace": []
};
