/* ===========================================================
   content.js — narrative content for the dossier
   =========================================================== */

const PITCH_DEFAULT = `I build and own a production multi-agent LLM platform at Johnson &amp; Johnson that serves biomedical scientists and drug-safety teams under FDA/EMA regulation. It's six agents — an orchestrator coordinating five specialists — running on Azure Kubernetes Service over 10,000-plus internal scientific documents. In production it cut research turnaround by 22%, reduced hallucination by roughly 18%, and sustains 120 concurrent sessions at p95 latency under 900 milliseconds. The hard part wasn't the model; it was making it grounded, auditable, and trustworthy enough to ship in a regulated pharma environment.`;

const COMPANIES = {

  /* =============================== J&J =============================== */
  jj: {
    name: 'Johnson &amp; Johnson',
    kicker: 'Pharma',
    tag: 'Multi-agent GenAI · AKS',
    problem: {
      eyebrow: 'General use case',
      label: 'General use case',
      sub: 'Why J&J needed a new knowledge platform',
      title: 'Why J&J needed a new platform',
    /* the problem statement is told on the home page, one slide per step */
    slides: [
      { id: 'problem', label: 'The problem', text: 'At Johnson &amp; Johnson, a major challenge was that critical safety information was scattered across dozens of systems — clinical trials, adverse event reports, regulatory documents, and internal knowledge bases. When a potential safety signal appeared — an early warning that a drug or medical product might be causing an unexpected side effect or risk — analysts had to manually search through all of it to piece together the full picture. That process was slow, inconsistent, and risky, especially in an environment where missing a signal could impact patient safety and regulatory compliance.' },
      { id: 'solution', label: 'The solution', text: 'The Generative AI platform was built to solve that. Instead of forcing teams to search in ten places, we created a single system that could retrieve, reason over, and summarize trusted internal evidence in seconds.' },
      { id: 'example', label: 'An example', text: 'For example, if a pharmacovigilance analyst suspects a drug might be linked to liver toxicity, they can ask the system a direct question. Behind the scenes, the platform retrieves relevant clinical trial data, adverse event cases, and regulatory history, filters it by drug and condition, and feeds only that verified evidence into the language model. The response they get is not a guess — it is a grounded, traceable summary of what J&amp;J already knows, with citations to the original sources.' },
      { id: 'role', label: 'My role', text: 'As the lead engineer, I was responsible for making sure this entire flow worked end-to-end: ingestion of sensitive documents, secure and compliant retrieval, hybrid search accuracy, and safe generation of answers. I worked with safety scientists, regulatory teams, and cloud engineers to ensure the system was not only technically sound, but trustworthy enough to support real safety decisions.' },
      { id: 'result', label: 'The result', text: 'The result was a dramatic reduction in time spent searching for information, fewer duplicated analyses, and faster, more confident safety and regulatory decisions. We effectively turned J&amp;J’s fragmented knowledge into a single, reliable source of truth that teams could query in real time — which is exactly what modern enterprise AI is supposed to do.' }
    ]
    },
    phases: {
      poc: {
        label: 'POC', sub: 'Prove retrieval is viable',
        goal: 'Prove retrieval over our own 10,000+ scientific documents could produce grounded, citable answers scientists would trust.',
        goalBody: 'Foundation models existed; the open question was whether retrieval over J&amp;J\u2019s regulated corpus — clinical study reports, safety labels, regulatory submissions, literature — beat a strong base model on real questions.',
        listTitle: 'What we built',
        list: [
          'Embedded a curated slice of the scientific corpus',
          'Single retrieval → augment → answer loop on Azure OpenAI',
          'A citation attached to every generated claim',
          'SME question set with document-backed answers',
          'Blind side-by-side scoring: base model vs. grounded'
        ],
        gate: {
          head: 'Grounded retrieval won decisively.',
          body: 'Citations changed the trust calculus for scientists. Confabulation on thin retrieval was named the make-or-break risk to solve before scaling.'
        },
        stack: [
          ['Compute', 'Notebook / scripts'], ['Model', 'Azure OpenAI'],
          ['Retrieval', 'Embeddings + similarity'], ['Corpus', 'Curated subset'],
          ['Eval', 'Manual SME scoring']
        ]
      },
      mvp: {
        label: 'MVP', sub: 'Onto the managed Azure stack',
        goal: 'Move off ad-hoc scripts onto the managed Azure stack and add the structure a real pilot needs.',
        goalBody: 'Not yet multi-agent — the focus was a durable ingestion-to-answer pipeline scientists could actually use and try to break.',
        listTitle: 'What changed',
        list: [
          'Ingestion: Blob → Document Intelligence → chunk → embed',
          'Azure AI Search vector store with metadata + security level',
          'Services containerized on Azure Kubernetes Service',
          'First eval harness (RAGAS faithfulness) wired into CI',
          'Guardrails: PII screening + grounding-refusal',
          'LangSmith tracing on every request'
        ],
        gate: {
          head: 'Faithful, fast, fit for the workflow.',
          body: 'Cleared the RAGAS faithfulness threshold across the pilot set, inside the latency budget, with every request traceable — enough to justify the multi-agent build.'
        },
        stack: [
          ['Runtime', 'AKS'], ['Ingestion', 'Blob · Doc Intelligence'],
          ['Vector DB', 'Azure AI Search'], ['Guardrails', 'PII + refusal'],
          ['Eval', 'RAGAS in CI'], ['Trace', 'LangSmith']
        ]
      },
      prod: {
        label: 'Production', sub: 'Multi-agent, audited, at scale',
        goal: 'The full platform: an orchestrator coordinating five specialist agents over 10,000+ documents, under FDA/EMA governance.',
        goalBody: 'The model lineup has moved with the market — the platform launched on GPT-4o and migrated to the GPT-5.4 tier as 4o was retired, with reasoning-heavy models reserved for the Drug Safety and QA agents.',
        stats: [
          ['22%', 'faster turnaround', 'Median time from scientist question to cited answer, vs. the manual literature + document search path it replaced.'],
          ['18%', 'fewer hallucinations', 'Unsupported-claim rate on the SME-scored eval set, vs. the single-agent MVP baseline.'],
          ['120', 'concurrent sessions', 'Sustained under load test on AKS with KEDA autoscaling.'],
          ['&lt;900ms', 'p95 latency', 'End-to-end, orchestrator plan through cited response — not first token.']
        ],
        listTitle: 'What makes it prod-grade',
        list: [
          'Five specialists: Knowledge, Ontology, Drug Safety &amp; Compliance, QA, Summarization',
          'One-tool orchestrator: session, output safety and the trace run as code around every request',
          'Azure Service Bus: a topic per agent with stable and canary subscriptions; only the orchestrator reads results',
          'Ontology resolved by closure-table metadata filtering, not a runtime graph traversal',
          'Seven-layer evaluation program gating releases',
          'Canary rings + KEDA autoscaling on AKS',
          'Workload Identity isolates every session',
          'Full audit traceability for regulators'
        ],
        stack: [
          ['Orchestrator', 'GPT-5.4 + 5 agents'], ['Messaging', 'Service Bus · topic per agent'],
          ['Release', 'Rolling + canary · KEDA'], ['Security', 'Workload Identity'],
          ['Eval', '7-layer → CI'], ['Compliance', 'FDA / EMA audit trail']
        ]
      }
    },
    pains: [
      ['Ingestion', 'Scientific PDFs broke parsing', 'Multi-column layouts and tables scrambled into unusable chunks.', 'Azure Document Intelligence + layout-aware overlap chunking.'],
      ['Retrieval', 'Granularity vs. citation', 'Big chunks buried citations; small ones lost meaning; the index went stale on updates.', 'Hybrid retrieval, metadata filters, and a re-index path.'],
      ['Ontology', 'Concept expansion without a graph', 'Scientists ask about a parent concept and expect child terms; a runtime graph DB added infrastructure and a hallucination surface on the query itself.', 'Closure table built at ingestion stamps every chunk with its own entity IDs plus all ancestors — expansion becomes an index filter.'],
      ['Orchestrator + agents', 'Coordination drift', 'Six moving parts meant versioning and hand-off drift across agents.', 'A topic per agent on Service Bus, with the orchestrator as the only reader of results.'],
      ['Generation', 'Confident, ungrounded answers', 'The model filled gaps fluently when retrieval was weak.', 'Enforced citations, output guardrails, refusal on low confidence.'],
      ['Eval / Ops', 'No ground truth, bursty load', 'Open Q&amp;A has no single right answer; 120 sessions arrive in spikes.', 'Seven-layer eval + SME review; KEDA, per-pod identity, canary rings.']
    ]
  },

  /* =========================== HOME DEPOT =========================== */
  hd: {
    name: 'Home Depot',
    kicker: 'Retail',
    tag: 'Hybrid search · BM25 + FAISS',
    phases: {
      poc: {
        label: 'POC', sub: 'BM25 foundation',
        goal: 'Unify fragmented operational content into one search interface, and prove a lexical baseline beats associates juggling multiple systems.',
        goalBody: 'Associates jumped across systems to answer customers — product specs, DIY guides, store-ops playbooks, live inventory. First question: does one search over all of it actually help?',
        listTitle: 'What we built',
        list: [
          'Single index over specs, DIY guides, store-ops playbooks, inventory',
          'BM25 lexical baseline as the foundation',
          'FAISS dense-retrieval prototype on the same content',
          'Labeled query/result judgments to score against',
          'Offline NDCG / MRR / Recall@k comparison'
        ],
        gate: {
          head: 'Unified search cleared the bar; dense recall showed headroom.',
          body: 'BM25 unified the content; the FAISS prototype recovered intent-based queries BM25 missed. Greenlit to build true hybrid retrieval.'
        },
        stack: [
          ['Window', 'Sep 2021 – mid 2022'], ['Mode', 'Offline eval'], ['Lexical', 'BM25 (Elasticsearch)'],
          ['Dense', 'Bi-encoder + FAISS'], ['Content', '4+ operational sources'], ['Metrics', 'NDCG · MRR · Recall@k']
        ]
      },
      mvp: {
        label: 'MVP', sub: 'Hybrid search, live',
        goal: 'Fuse lexical and dense retrieval into production hybrid search, and prove the lift on real shoppers.',
        goalBody: 'Dense retrieval ran on self-hosted sentence-transformers (all-mpnet-base-v2, 768-dim) — the period-correct enterprise SBERT stack, and it kept document content inside the ISO 27001 boundary. Hosted embeddings came later, as a migration.',
        listTitle: 'What changed',
        list: [
          'RRF fusion (k=60) merges BM25 + FAISS rankings',
          'Cross-encoder reranking (ms-marco-MiniLM-L-6-v2) orders the top-k',
          'Self-hosted all-mpnet-base-v2 embeddings for dense recall',
          'Live serving path behind an A/B test',
          'Measured on search-success, not just offline metrics'
        ],
        gate: {
          head: 'Hybrid beat lexical — live and within budget.',
          body: 'Treatment lifted search success over the lexical control while staying inside the p95 latency budget. Clear to roll out.'
        },
        stack: [
          ['Window', 'mid 2022 – early 2023'], ['Retrieval', 'BM25 + FAISS'],
          ['Fusion', 'Reciprocal-rank fusion'], ['Rerank', 'Cross-encoder'],
          ['Embeddings', 'all-mpnet-base-v2 · 768d'], ['Validation', 'A/B test']
        ]
      },
      prod: {
        label: 'Production', sub: 'RAG synthesis at scale',
        goal: 'Hybrid search at retail scale, with GPT-3.5-Turbo RAG synthesis composing direct answers on top of reranked retrieval.',
        goalBody: 'The synthesis layer is deliberately the last thing built, not the first — Azure hosted gpt-35-turbo only in the final weeks of the engagement, and the retrieval quality underneath it was already carrying the result.',
        stats: [
          ['+14%', 'retrieval uplift', 'NDCG@10 on the labeled judgment set, hybrid + rerank vs. the BM25 control.'],
          ['+21%', 'search success', 'Share of sessions ending in a click-through or resolved answer, measured in the live A/B test.'],
          ['&lt;900ms', 'p95 latency', 'Retrieval through rerank, measured at peak retail load.'],
          ['RAG', 'answer synthesis', 'Phase 3 only — GPT-3.5-Turbo grounded strictly on reranked context.']
        ],
        listTitle: 'What makes it prod-grade',
        list: [
          'GPT-3.5-Turbo synthesizes answers from reranked context',
          'Hybrid retrieval (BM25 + FAISS) feeds every answer',
          'Cross-encoder reranking before synthesis',
          'Ranking quality monitored continuously (NDCG/MRR/MAP)',
          'Latency held under peak retail load'
        ],
        stack: [
          ['Window', 'Mar – Apr 2023'], ['Retrieval', 'BM25 + FAISS · RRF'],
          ['Rerank', 'Cross-encoder'], ['Synthesis', 'GPT-3.5-Turbo RAG'],
          ['Monitor', 'NDCG/MRR + SLO'], ['Outcome', '+14% / +21%']
        ]
      }
    },
    pains: [
      ['Indexing', 'A catalog that never sits still', 'New SKUs arrived with messy text; fresh items had thin embeddings.', 'Normalize + enrich before embedding; a refresh path.'],
      ['Lexical', 'Vocabulary mismatch', 'BM25 is blind to synonyms — \u201csheetrock\u201d isn\u2019t \u201cdrywall.\u201d', 'Pair with dense recall; keep BM25 for exact SKUs.'],
      ['Fusion', 'Two scores that don\u2019t compare', 'A BM25 score and a cosine distance live on different scales.', 'Reciprocal-rank fusion — merge by rank, not raw score.'],
      ['Reranking', 'Close, but wrong order', 'Fused candidates surfaced related-not-wanted items near the top.', 'Cross-encoder reranking to push true intent up.'],
      ['Synthesis', 'Answers drifting from sources', 'RAG synthesis can over-summarize or stray from retrieved content.', 'Ground GPT-3.5-Turbo on reranked context; watch answer quality.']
    ]
  },

  /* ============================= CITIBANK ============================= */
  citi: {
    name: 'Citibank',
    kicker: 'Banking',
    tag: 'MLOps · model risk (SR 11-7)',
    phases: {
      poc: {
        label: 'POC', sub: 'Foundation: reproducibility',
        goal: 'Get models off laptops and prove one model can be reproduced and governed end to end — the foundation SR 11-7 demands.',
        goalBody: 'Models lived on laptops with governance-by-spreadsheet; validators were reconstructing models instead of validating them.',
        listTitle: 'What we built',
        list: [
          'Lineage captured at train time: data version, code, params',
          'Immutable, versioned training data',
          'Rebuild a model from its record alone',
          'MLflow tracking for runs and artifacts',
          'Agreed the evidence model-risk validation requires'
        ],
        gate: {
          head: 'Reproducibility proven, on bank terms.',
          body: 'Model-risk accepted that a model could be rebuilt from its lineage. Greenlit to automate governance into the pipeline.'
        },
        stack: [
          ['Cloud', 'AWS'], ['Tracking', 'MLflow'], ['Data', 'Immutable + versioned'],
          ['Scope', 'Single model'], ['Partner', 'Model-risk / validation']
        ]
      },
      mvp: {
        label: 'MVP', sub: 'Governance: gates + registry',
        goal: 'Make governance a property of the pipeline, not a manual scramble — validation gates and a registry nothing routes around.',
        goalBody: 'Orchestration at this stage was Step Functions and Jenkins with an MLflow registry, because SageMaker Pipelines and Feature Store did not exist yet.',
        listTitle: 'What changed',
        list: [
          'Model registry as the single source of truth',
          'Challenger-vs-champion validation gates',
          'Independent re-validation checkpoints',
          'MLflow lineage on every registered model',
          'Governance-by-design baked into release'
        ],
        gate: {
          head: 'One governed path to production.',
          body: 'Models reached endpoints only through validation; champion/challenger comparison gated every promotion. Reproducible by construction.'
        },
        stack: [
          ['Registry', 'Versioned + lineage'], ['Gates', 'Challenger vs. champion'],
          ['Lineage', 'MLflow'], ['Control', 'Independent re-validation'],
          ['Path', 'Single governed route']
        ]
      },
      prod: {
        label: 'Production', sub: 'Pipelines + drift',
        goal: 'Fully orchestrated MLOps on SageMaker Pipelines with Terraform IaC, drift monitoring, and a governed retrain loop.',
        goalBody: 'The orchestration migrated honestly from Step Functions + Jenkins to SageMaker Pipelines after its GA at re:Invent 2020 — the last eight months of the engagement.',
        stats: [
          ['100%', 'deploys w/ lineage', 'Every endpoint traceable to data version, code commit, params, and the validation record that cleared it.'],
          ['SR 11-7', 'model-risk aligned', 'Independent validation, champion/challenger evidence, and periodic revalidation built into the release path.'],
          ['IaC', 'Terraform-managed', 'Environments rebuildable from code — a control, not a convenience.'],
          ['Auto', 'drift → retrain', 'Drift breach opens a governed retrain, not a silent redeploy.']
        ],
        listTitle: 'What makes it prod-grade',
        list: [
          'SageMaker Pipelines orchestrate train → validate → deploy',
          'Terraform IaC for reproducible infrastructure',
          'Data + performance drift monitoring',
          'Drift breaches trigger a governed retrain, not silent decay',
          'Full audit trail behind every model'
        ],
        stack: [
          ['Orchestration', 'SageMaker Pipelines'], ['IaC', 'Terraform'], ['Lineage', 'MLflow'],
          ['Monitor', 'Data + perf drift'], ['Retrain', 'Governed loop'], ['Compliance', 'SR 11-7']
        ]
      }
    },
    pains: [
      ['Data / Features', 'Training-serving skew', 'Features computed differently in train vs. prod changed behavior live.', 'A versioned feature definition shared by both.'],
      ['Reproducibility', '\u201cRebuild this from 8 months ago\u201d', 'Without lineage, reproduction was archaeology — sometimes impossible.', 'Automatic lineage capture + MLflow: data, code, params.'],
      ['Orchestration', 'Step Functions + Jenkins sprawl', 'Glue across Step Functions and Jenkins drifted and broke silently.', 'Migrated to SageMaker Pipelines after GA; Terraform IaC.'],
      ['Validation', 'The review bottleneck', 'The SR 11-7 review queue stalled releases and bred shortcuts.', 'Champion/challenger gates in CI that package evidence up front.'],
      ['Monitoring', 'Drift nobody saw', 'Models degraded slowly, with no signal until metrics fell.', 'Drift monitoring that triggers a governed retrain loop.']
    ]
  }
};

/* Interface text. Every label below is editable in the browser (Edit mode)
   and saved with the rest of the content. */
const UI_TEXT = {
  home: {
    pitchTitle: 'Elevator pitch',
    problemTitle: 'Problem statement',
    status: 'Systems · live',
    hint: 'Editable · saves to this browser',
    reset: 'Reset to original',
    cta: 'Open the matrix',
    cross: ['Cross-cutting', 'RAG pipeline · CI/CD']
  },
  matrix: {
    title: 'The matrix',
    sub: 'Each company’s architecture and pain points — and J&amp;J’s evaluation program — plus the two pipelines that cut across all of them.',
    sections: {
      architecture: ['Architecture', 'Interactive map'],
      problem: ['Problem statement', 'Why the platform exists'],
      poc: ['POC', 'Prove it works'],
      mvp: ['MVP', 'Make it real'],
      prod: ['Production', 'Run it at scale'],
      pain: ['Pain points', 'By layer'],
      eval: ['Evaluation', 'RAGAS + the seven layers']
    },
    sysTitle: 'Cross-cutting pipelines',
    sysSub: 'The two systems that show up in every one of these roles',
    rag: ['RAG pipeline', 'Index time, query time, quality'],
    cicd: ['CI/CD pipeline', 'Agent microservice on AKS']
  },
  phase: { state: 'The state', goal: 'The goal', gate: 'Validation &amp; gate', stack: 'Stack' },
  pain: { title: 'Pain points', sub: 'By layer', pain: 'Pain', fix: 'Fix' },
  eval: {
    title: 'Evaluation',
    modes: ['J&amp;J', 'Generic'],
    stack: 'The seven layers',
    legend: ['feeds', 'checks', 'explains'],
    connects: 'How it connects',
    layer: 'Layer',
    gate: 'Release gate',
    tabs: { layer: 'Layer', ragas: 'RAGAS', golden: 'Golden set', thresholds: 'Thresholds', vs: 'vs DeepEval', read: 'Regressions' }
  },
  card: {
    node: ['The role', 'How it works', 'The decision', 'Stack'],
    band: ['What it’s for', 'What’s inside', 'The boundary', 'Stack'],
    hard: 'Learned the hard way',
    room: 'In the room',
    iv: {
      short: 'Say it in 20 seconds',
      walk: 'Walk me through this layer',
      ask: 'They’ll ask',
      nums: 'Numbers to drop',
      stack: 'Stack',
      push: 'If they push',
      check: 'to confirm',
      interview: 'Interview',
      reference: 'Reference'
    }
  }
};
