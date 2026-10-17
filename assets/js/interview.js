/* ===========================================================
   interview.js — each box and layer as interview answers.
   Keyed like cards.js: '<diagram>/<id>' (or '<diagram>/<variant>/<id>').
     short  — "Say it in 20 seconds" (a box) / "Walk me through this layer" (a layer)
     qa     — likely questions and spoken answers; check: 1 marks an answer
              built on general reasoning rather than your own notes — confirm it
              matches what you did before using it
     nums   — [value, what it is] figures to drop
     push   — the hardest follow-up and how to answer it
   Everything here is editable in the browser (Edit mode on a card page).
   =========================================================== */
const INTERVIEW = {

  /* ============================ J&J · layers ============================ */
  'jj/L_orch': {
    short: 'The runtime is one AKS cluster running six services: the orchestrator and five specialists — Knowledge, Ontology, Drug Safety, QA and Summarization. It’s one container image with a SERVICE build argument, six Deployments, shipped as a Helm chart. Each service has its own pipeline and release cadence, every pod has its own Workload Identity, and KEDA scales each specialist on its own Service Bus subscription.',
    qa: [
      { q: 'Why one cluster instead of a cluster per agent?', a: 'Six services on one cluster gives us isolation at the deployment level without six sets of platform overhead. Each service is its own Deployment with its own identity and its own pipeline, so a Drug Safety change never waits on a Summarization release — and never risks one either.' },
      { q: 'Why six services instead of one application?', a: 'The agents change at different speeds and carry different risk. Drug Safety needs a pharmacovigilance SME to approve and a 2% first canary ring; Summarization doesn’t. As separate deployables, each one gets the release process its risk deserves.' },
      { q: 'How does it scale?', a: 'Each specialist scales with KEDA on the message count of its own subscription — one ScaledObject for stable, one for canary. The orchestrator scales on CPU with HPA. Under load test we sustained 120 concurrent sessions.' },
      { q: 'How do you ship a new version of one agent?', a: 'Build once and push to ACR by digest, sign it, pass the qualification gates, then a risk-sized canary: the orchestrator stamps a share of requests for the canary subscription, and Argo Rollouts promotes or rolls back on latency, errors, backlog, refusal rate and citation coverage.' }
    ],
    nums: [['6', 'services on one cluster'], ['1', 'image · SERVICE build arg · Helm chart'], ['120', 'concurrent sessions under load test'], ['11', 'tools across the six services']],
    push: { q: 'Isn’t a shared cluster a single point of failure?', a: 'It’s a shared control plane, not shared fate for the workloads: each service has its own Deployment, identity, scaling and rollback. I’d move to separate clusters if a regulator or a tenant required hard isolation — that wasn’t what drove this design.', check: 1 }
  },

  'jj/L_ret': {
    short: 'Retrieval is Azure AI Search with one query pattern everywhere: dense vectors plus BM25, fused by reciprocal rank, then reranked. There are two indexes — kb-knowledge for the general scientific corpus and kb-compliance for governed content. The rule that matters: tier, effective date and ancestor IDs go into the query itself, never onto the result set, so retrieval is an access-control boundary.',
    qa: [
      { q: 'Why hybrid search instead of pure vector search?', a: 'Scientific text is full of exact identifiers — drug names, MedDRA terms, study codes — that keyword search catches and embeddings blur. Dense retrieval catches paraphrase. Reciprocal rank fusion combines the two lists without calibrating their scores, and the reranker orders the final set.', check: 1 },
      { q: 'Why filter in the query rather than after retrieval?', a: 'If you post-filter, the model may already have seen text the caller wasn’t entitled to. Putting tier, effective date and ancestor IDs into the search query makes retrieval itself the access-control boundary, not a convenience.' },
      { q: 'Why two indexes instead of one with a security flag?', a: 'Separation at the infrastructure level is a compliance story an auditor can verify; a flag in application code is not. The governed index is readable only by the Drug Safety identity, because its Search role is scoped to that index.' },
      { q: 'How do you know retrieval is good?', a: 'It’s the first layer of our seven-layer eval: RAGAS context precision and recall, measured separately from what the model did with the evidence, on every index or chunking change. Knowledge also has closure-table fixtures — a parent-concept query must return the whole subtree.' }
    ],
    nums: [['2', 'indexes · kb-knowledge · kb-compliance'], ['10k+', 'documents'], ['8', 'pharma domains in the taxonomy'], ['3', 'filters in every query: tier · date · ancestors']],
    push: { q: 'What happens when retrieval comes back thin?', a: 'The system is allowed to say the context doesn’t contain the answer. A specialist never returns an uncited “answered” — it’s downgraded to insufficient_evidence — and refusal under thin retrieval is part of the red-team suite in every release.' }
  },

  'jj/L_onto': {
    short: 'Scientists ask about a parent concept and expect the child terms too. Instead of a graph database at query time, we ship the ontology as two versioned artifacts: a term dictionary that maps synonyms to a canonical entity ID, and a closure table of every concept’s ancestors. The Ontology Loader builds both offline, so concept expansion is an index filter, not a traversal.',
    qa: [
      { q: 'Why not a graph database?', a: 'A graph answers richer questions than we ever ask on the hot path. What retrieval needs is the ancestor set, and that’s knowable at ingestion. Building it as an artifact removed a whole tier of infrastructure and a place for a generated query to go wrong — for roughly ninety percent of the value.' },
      { q: 'Which vocabularies, and how are terms resolved?', a: 'MedDRA, SNOMED CT and MeSH form the terminology spine. The dictionary maps synonyms and abbreviations to one canonical ID, and a lookup is exact or found:false — no nearest-neighbour guesses.' },
      { q: 'How do you keep the index in step with vocabulary updates?', a: 'Each vocabulary release rebuilds both artifacts and triggers a re-stamp of the affected chunks. So the index and the closure table are always the same version.' },
      { q: 'When would you use a graph?', a: 'For discovering novel links between entities across the literature. That’s a different product. For filtering retrieval by concept, a precomputed closure is simpler and deterministic.' }
    ],
    nums: [['2', 'artifacts: dictionary · closure table'], ['3', 'vocabularies: MedDRA · SNOMED CT · MeSH'], ['~90%', 'of a graph’s value for this workload'], ['0', 'graph traversals at query time']],
    push: { q: 'Wasn’t GraphRAG the more sophisticated choice?', a: 'The pushback I got was that GraphRAG over-complicated the design, and it was right. The honest version of the story is that the simpler design won on the merits: deterministic, cheaper, and validatable as a release.' }
  },

  'jj/L_ing': {
    short: 'Ingestion is the batch path — nothing in it runs at query time. A Blob event opens one idempotent job per document: Document Intelligence parses layout and tables, Databricks chunks by structure, entity stamping writes entity IDs and all ancestors onto each chunk, and text-embedding-3-large vectorizes it. A document is embedded exactly once per version, and everything can be rebuilt from the immutable original.',
    qa: [
      { q: 'Why event-driven batch instead of indexing on demand?', a: 'Because re-running has to be safe. One idempotent job per document per version means a retry never double-embeds, and nothing on the request path waits for parsing.' },
      { q: 'What was the hardest part?', a: 'Parsing. Naive PDF extraction scrambled multi-column clinical study reports into unusable chunks. Layout-aware parsing with Document Intelligence, keeping tables and captions as structure, was the single biggest quality jump in the ingestion path — bigger than any model change.' },
      { q: 'How do you handle updates and re-embedding?', a: 'Index writes are incremental upserts and staleness is monitored, because a stale index gives confident, outdated answers. Re-embedding is a versioned, replayable pipeline run, and the embedding model version is recorded on every chunk.' },
      { q: 'What does ingestion cost?', a: 'Embeddings run at batch pricing — 50% off for ingestion work — and images are verbalized with AI Vision before they’re embedded, so figures are searchable as text.' }
    ],
    nums: [['1×', 'embedded per document version'], ['50%', 'batch discount on ingestion embeddings'], ['10k+', 'documents'], ['v4.0', 'Document Intelligence · model 2024-11-30']],
    push: { q: 'Is anything in ingestion on the request path?', a: 'One exception: Summarization’s fetch_and_chunk_doc reads Blob and Document Intelligence on demand when it needs a full document. Everything else is batch.' }
  },

  /* ============================ J&J · edge ============================ */
  'jj/users': {
    short: 'Our users are biomedical scientists and drug-safety reviewers asking questions they’d otherwise answer by reading for two days. They don’t want a chatbot. They want a defensible answer with the sources attached, and they judge it on whether the citations hold up.',
    qa: [
      { q: 'Who were you building for?', a: 'Biomedical scientists and pharmacovigilance reviewers. Critical safety information was scattered across clinical trials, adverse event reports, regulatory documents and internal knowledge bases, and analysts had to search all of it by hand to piece together a signal.' },
      { q: 'How did the users shape the design?', a: 'They judge answers by their citations, not by how fluent they sound. That one fact drove the citation gate, refusal as a normal outcome, and the audit trail.' },
      { q: 'How did you measure success?', a: 'Median time from question to cited answer dropped 22% against the manual search path, and the unsupported-claim rate on the SME-scored eval set fell 18% versus the single-agent MVP. SME review is also the seventh layer of our eval program.' },
      { q: 'How do users authenticate?', a: 'Corporate identity through Entra ID. Entitlements travel with the request, so retrieval only ever sees what that user is allowed to see.' }
    ],
    nums: [['22%', 'faster question → cited answer'], ['18%', 'fewer unsupported claims'], ['2 days', 'of reading it replaces']],
    push: { q: 'Did scientists trust it at first?', a: 'In the POC we ran blind side-by-side scoring of the base model against grounded answers. Grounded retrieval won decisively, and citations changed the trust calculus for scientists — that’s what earned the pilot.' }
  },

  'jj/afd': {
    short: 'Front Door is the protected global entry point. It terminates TLS, applies WAF rules at the edge, and routes validated traffic to the regional API layer. Nothing behind it — not AKS, not the agents — has a public surface.',
    qa: [
      { q: 'Why Front Door in front of API Management?', a: 'Front Door handles the edge — TLS, WAF and routing. APIM handles policy — who the caller is and what they may do. Keeping them separate keeps the cluster and the agents private while the platform still gets a resilient, globally managed entry point.' },
      { q: 'Why not expose the AKS ingress directly?', a: 'A managed edge beats putting an in-cluster ingress on the internet. AKS and the agents stay off the public internet entirely; only validated traffic continues to APIM.' },
      { q: 'Does the WAF handle prompt injection?', a: 'No — the WAF stops web-layer attacks before anything reaches the application. Prompt injection is handled further in: grounding, citation checks, and a red-team suite in every release that includes injection through retrieved content.', check: 1 }
    ],
    nums: [['0', 'public endpoints on the cluster'], ['4', 'duties: TLS · WAF · routing · load balancing']],
    push: { q: 'Isn’t that a lot of layers for one request?', a: 'Each layer has one job — edge, policy, cluster entry — and the end-to-end p95 still stays under 900 milliseconds. The layers are what let the agents assume every request is already authenticated, authorized and traced.' }
  },

  'jj/apim': {
    short: 'API Management is the policy boundary. Authentication, throttling and tier — everything a caller is allowed to do — is expressed there, not inside the agents. APIM also stamps the correlation ID that follows the request through every hop, so the agents only ever handle work that’s already authorized and already traced.',
    qa: [
      { q: 'Why put policy in APIM instead of the application?', a: 'So the agents never make access decisions. Quotas, rate limits and correlation IDs live at the gateway; when a consumer needs a different limit, nothing in the platform changes.' },
      { q: 'What is the correlation ID used for?', a: 'It’s the spine of the audit trail. It’s stamped at APIM, carried as a Service Bus message property through every agent hop, used for fan-in on the reply queue, and it keys the Cosmos record. Every claim resolves by correlation ID to its chunks, versions, model deployment and verifier verdict.' },
      { q: 'How do you protect the platform from a noisy consumer?', a: 'Per-consumer quotas and rate limits at APIM, off the orchestrator’s hot path. Downstream, each specialist scales on its own subscription, so one heavy workload doesn’t starve the others.' }
    ],
    nums: [['1', 'correlation ID, end to end'], ['3', 'policies: auth · throttle · tier']],
    push: { q: 'Why not handle auth and quotas inside the FastAPI service?', a: 'Identity is still validated through Entra ID, but per-consumer quota and tier are policy, and policy changes shouldn’t require a release of a validated system. Under Part 11 every platform code change is controlled — a gateway policy keeps that churn out of the agents.', check: 1 }
  },

  'jj/ingress': {
    short: 'The AKS ingress is the Kubernetes entry into the cluster. It’s internal only and routes to exactly one place: the orchestrator service. No agent is publicly addressable — specialists are reachable only through their Service Bus topics, and that’s what makes the audit trail complete.',
    qa: [
      { q: 'Why expose only the orchestrator?', a: 'If agents were addressable, something could call Drug Safety directly and skip the orchestrator’s validation, session handling and trace. With one entry point, every request goes through the code that validates and records it.' },
      { q: 'How do the specialists get work, then?', a: 'Only through their own Service Bus topic. The orchestrator publishes; each agent reads its stable or canary subscription and replies on orchestrator-replies.' },
      { q: 'What sits behind the ingress?', a: 'The orchestrator’s FastAPI /chat endpoint, running the OpenAI Agents SDK. From there, everything is internal.' }
    ],
    nums: [['1', 'addressable service: the orchestrator'], ['0', 'public agent endpoints']],
    push: { q: 'Doesn’t a single entry point become a bottleneck?', a: 'The orchestrator scales horizontally with HPA, and each in-flight reply is routed to the replica that’s waiting for it, so adding pods is safe. We sustained 120 concurrent sessions under load test.' }
  },

  'jj/glance': {
    short: 'Six services on AKS — an orchestrator and five specialists. Eleven tools: one on the orchestrator, two per specialist. Two vector indexes and one closure table, no runtime graph. Ten thousand-plus documents, and p95 under 900 milliseconds end to end. Every one of those numbers is a design decision, not just a count.',
    qa: [
      { q: 'What were the results?', a: '22% faster from question to cited answer versus the manual search path, 18% fewer unsupported claims than the single-agent MVP, 120 concurrent sessions sustained under load test, and p95 under 900 milliseconds end to end — measured to the cited response, not the first token.' },
      { q: 'Why eleven tools and not more?', a: 'A tool exists only where a model makes a real decision. The orchestrator’s only decision is delegation, so it has one tool, invoke_agent. Each specialist has exactly one data-access tool and one generation tool, which keeps every trajectory evaluable and the audit trail complete.' },
      { q: 'What does a query cost?', a: 'About eight cents blended in model inference. A typical query is around seven cents and a full fan-out with Drug Safety and QA is about eighteen. Drug Safety and QA are roughly half of the worst case, because reasoning tokens bill at the output rate.' },
      { q: 'How has the model lineup changed?', a: 'We launched on GPT-4o and moved to the GPT-5.4 tier as 4o was retired, keeping the reasoning-heavy models for Drug Safety and QA. Each agent migrated separately with the eval suite rerun — in a validated system a model swap is a release, not a config change.' }
    ],
    nums: [['22%', 'faster turnaround'], ['18%', 'fewer hallucinations'], ['120', 'concurrent sessions'], ['<900 ms', 'p95, end to end'], ['$0.08', 'blended inference per query']],
    push: { q: 'How do you hit p95 under 900 ms with high-reasoning agents in the path?', a: 'Reconcile this before you use it: the high-reasoning hops in the cost model generate 1,200–2,500 output tokens, which is hard to fit under 900 ms. Be ready to say exactly what the p95 covered — which query mix, which hops — and that nested deadlines make a slow spoke degrade the answer instead of hanging the request.', check: 1 }
  },

  /* ============================ J&J · AKS services ============================ */
  'jj/orch': {
    short: 'The orchestrator is the reasoning core. It runs gpt-5.4 on the OpenAI Agents SDK behind a FastAPI endpoint, plans the request, decides which specialists to call and what runs in parallel, then assembles the cited answer. It has exactly one tool, invoke_agent, because delegation is the only decision the model makes. Session, safety and tracing run as code around it.',
    qa: [
      { q: 'Why let the model plan instead of a fixed workflow graph?', a: 'A framework graph where every hop is an explicit node makes control flow legible but freezes it — every new question shape needs a new branch. Letting the model plan keeps the platform open-ended. The governance sits in the gates around the model, not in a hardcoded graph.' },
      { q: 'Why only one tool?', a: 'A tool should exist only where the model makes a real decision. Loading the session, validating, saving and tracing used to be tools, and the model could skip one — or validate draft A and return draft B. Now they run as code on every request, and the model’s only choice is who to delegate to.' },
      { q: 'How does invoke_agent work?', a: 'It’s an RPC over Service Bus. It publishes to the agent’s topic with a correlation ID and a track property, then parks an asyncio Future; a reply listener in the same pod resolves it. Parallel tool calls give fan-out, and the correlation ID gives fan-in.' },
      { q: 'How do you handle failures and timeouts?', a: 'The orchestrator owns retries and timeouts; agents never retry each other. Deadlines nest — the specialist budget inside the invoke_agent wait inside the HTTP budget — so a slow agent degrades the answer instead of hanging the request.' }
    ],
    nums: [['1', 'LLM tool: invoke_agent'], ['5', 'specialists it can call'], ['2', 'revisions before a response is blocked'], ['gpt-5.4', 'OpenAI Agents SDK · FastAPI']],
    push: { q: 'What failure mode worried you most?', a: 'Not a wrong answer — a confident one. Refusal had to be a first-class, measured output, not an error path. That’s why refusal rate is monitored in both directions: a sudden drop usually means a gate broke.' }
  },

  'jj/code': {
    short: 'Around every model run, the orchestrator executes five steps as plain code, always in the same order: load the session from Redis, run the model, validate with Content Safety and citation integrity, save only validated content back to Redis, and write the trace to Cosmos and OpenTelemetry. The model never calls these, so it can’t skip them.',
    qa: [
      { q: 'Why are these code and not tools?', a: 'They used to be LLM tools. As tools, the model could skip one, or validate draft A and return draft B. As code they run on every request and can’t be skipped. The rule I use: a tool exists only where the model makes a real decision.' },
      { q: 'What happens when validation fails?', a: 'Content Safety at severity 4 or higher blocks, and every citation must resolve to the run’s evidence. The failure reasons go back to the model as a new turn, up to two revisions. After that the response returns status blocked, with the answer withheld.' },
      { q: 'Why save only validated content to the session?', a: 'So a blocked answer can never become context for the next turn. If an unvalidated draft entered the session, the next answer could quietly build on it.' },
      { q: 'What goes into the trace?', a: 'The model’s plan and decision notes, the session context that was injected, and what the code observed — written to Cosmos by correlation ID and to OpenTelemetry. That lets us reconstruct any answer months later without Redis.' }
    ],
    nums: [['5', 'steps on every request'], ['2', 'revisions, then blocked'], ['4+', 'Content Safety severity that blocks']],
    push: { q: 'Don’t two revisions blow your latency budget?', a: 'Revisions are the exception path, and they run inside the nested deadlines, so a request can’t exceed its HTTP budget. When the budget runs out, the safe outcome is a blocked or insufficient-evidence answer, never an unvalidated one.', check: 1 }
  },

  'jj/sb': {
    short: 'Between the orchestrator and the five specialists sits Azure Service Bus, with one topic per agent. Each topic has a stable and a canary subscription, filtered on a track property the orchestrator stamps, so we get an exact canary split. Replies come back on one session-enabled queue that only the orchestrator reads, matched by correlation ID.',
    qa: [
      { q: 'Why a topic per agent instead of one shared topic?', a: 'With one shared topic, an agent could pick up work addressed to another. In this domain that means validating the wrong artifact, retrying work nobody owns, and a broken audit trail. A topic per agent keeps that isolation and still allows an exact canary split.' },
      { q: 'How does the canary split work?', a: 'The orchestrator stamps track on every request at the rollout’s current weight, hashing the session ID so one conversation stays on one version. Stable pods read the stable subscription, canary pods the canary one. Outside a rollout the weight is zero.' },
      { q: 'How does a reply find the right orchestrator pod?', a: 'orchestrator-replies is session-enabled, and the session ID is the orchestrator pod’s name. Each reply lands on the replica holding the waiting Future, and fan-in is by correlation ID.' },
      { q: 'Why Service Bus rather than Kafka or Event Hubs?', a: 'We needed per-message features more than stream throughput: sessions to route a reply to a pod, subscription filters for the canary split, dead-lettering, and Entra RBAC per entity. Those are native to Service Bus; with Kafka we’d have built them ourselves.', check: 1 }
    ],
    nums: [['5', 'agent topics'], ['2', 'subscriptions each: stable · canary'], ['5→20→50→100', 'Knowledge canary (%)'], ['2→10→50→100', 'Drug Safety canary (%) + SME pause']],
    push: { q: 'Why not approximate the canary with a replica ratio?', a: 'A replica ratio only approximates the split. Drug Safety’s first ring is 2% with an SME pause, and you can’t hit 2% reliably with a handful of pods. Topic subscriptions give an exact split per request.' }
  },

  'jj/summ': {
    short: 'Summarization compresses long, already-validated material into the shape the scientist asked for. It runs map-reduce over long documents on gpt-5.4-mini and keeps citation anchors through the compression. It’s the cheapest agent on the platform, and it should be — the reasoning already happened upstream.',
    qa: [
      { q: 'Why a small model here?', a: 'Summarization sees material QA has already validated. A reasoning model there would roughly triple the cost for no quality gain, so it runs gpt-5.4-mini with map-reduce over long inputs.' },
      { q: 'How do citations survive summarization?', a: 'Citation anchors are kept through every map and reduce step. On the way back, any citation ID that isn’t in the run’s evidence store is stripped — at the spoke and again at the hub.' },
      { q: 'Where does it get documents?', a: 'Its data tool, fetch_and_chunk_doc, reads Blob Storage and Document Intelligence on demand. It’s the one request-time exception to the batch ingestion path.' }
    ],
    nums: [['~$0.006', 'per call'], ['2', 'tools: fetch_and_chunk_doc · generate_summary'], ['mini', 'gpt-5.4-mini']],
    push: { q: 'How do you know a summary didn’t drop something important?', a: 'Its output still goes through the orchestrator’s validation — Content Safety plus citation integrity — before anything is returned, and omissions are what task-success scoring on realistic workflows and SME review are there to catch.', check: 1 }
  },

  'jj/qa': {
    short: 'QA is quality assurance in the reasoning sense, not test automation. It’s an independent verifier on gpt-5.4 at high reasoning: it gets the draft and the evidence, checks that every claim is grounded, runs an n-sample consistency check, and returns pass or flag with a reason. It does no retrieval of its own, so it can’t be fooled by a fresh search.',
    qa: [
      { q: 'Why not let the generating agent check itself?', a: 'A model grading its own output is not a control. QA sees the draft plus the retrieved spans and runs claim-grounding and self-consistency checks independently of the agent that wrote it.' },
      { q: 'Why doesn’t QA retrieve anything?', a: 'If it could search, it could find new text that happens to support a claim the draft made without evidence. Verifying only against the evidence it’s handed means a claim is grounded in what was actually used, or it fails.' },
      { q: 'What does the consistency check do?', a: 'run_consistency_check samples several answers and measures their agreement. Low agreement is a signal that the evidence is thin or the question is ambiguous.', check: 1 },
      { q: 'Isn’t a high-reasoning verifier expensive?', a: 'QA alone is about a third of a typical query’s cost, because reasoning tokens bill at the output rate. In pharmacovigilance, that’s the price of not shipping a confident wrong answer.' }
    ],
    nums: [['~⅓', 'of a typical query’s cost'], ['2', 'tools: grounding · consistency'], ['0', 'retrieval calls']],
    push: { q: 'People hear “QA agent” and think tests. What is it really?', a: 'A verifier. It sees the draft and the evidence, and its job is to disagree.' }
  },

  'jj/ds': {
    short: 'Drug Safety is the regulated leg. Anything touching pharmacovigilance, labeling or submissions goes through it, and it queries only the governed kb-compliance index. It runs gpt-5.4 at high reasoning because here slow and right beats fast: seriousness criteria and MedDRA coding are checked, not inferred, against E2B(R3) structure.',
    qa: [
      { q: 'How do you evaluate it?', a: 'On seriousness-criteria recall, tuned against false negatives — not on overall accuracy — because a missed serious case is the asymmetric risk. The pipeline adds fixture gates for MedDRA coding and E2B(R3) structure.' },
      { q: 'How is it isolated from the general knowledge base?', a: 'Its identity has Search Index Data Reader on kb-compliance only, and the Knowledge identity can’t read kb-compliance at all. The separation is enforced by identity, not by a code path.' },
      { q: 'How do you release a change to it?', a: 'It’s the most conservative release on the platform. A pharmacovigilance SME is the required approver, the canary goes 2, 10, 50, 100 percent with an SME pause before the last step, and the release carries a Part 11 electronic signature.' },
      { q: 'Why spend high reasoning effort here?', a: 'Because being slow and right beats being fast. It’s the most expensive hop — about five cents of the eighteen-cent fan-out — and this is exactly where that spend belongs.' }
    ],
    nums: [['2%', 'first canary ring'], ['$0.05', 'of a $0.18 fan-out'], ['1', 'index it can read: kb-compliance']],
    push: { q: 'What if the evidence is incomplete?', a: 'It doesn’t infer. An uncited answer is downgraded to insufficient_evidence, and refusal is a valid, measured output. In pharmacovigilance, “the context does not contain this” beats a plausible guess.' }
  },

  'jj/onto': {
    short: 'The Ontology agent translates the question into the controlled vocabulary the corpus is indexed under. It maps free text to MedDRA, SNOMED CT and MeSH concepts and returns entity IDs plus ancestors, so Knowledge can filter on the whole subtree. It’s lookup and normalization, not reasoning, so it runs on gpt-5.4-mini.',
    qa: [
      { q: 'Why a separate agent for terminology?', a: 'Because terminology has to be exact, and that’s easiest to guarantee in one narrow agent: lookups are exact or found:false, enforced in code, and the agent rejects any concept ID that wasn’t resolved in the same run.' },
      { q: 'Why not a live graph traversal?', a: 'A graph would answer richer questions about how concepts relate, but retrieval only needs the ancestor set, and that’s knowable at ingestion. A traversal on the hot path adds infrastructure plus a place for the query itself to go wrong.' },
      { q: 'What happens with a term it doesn’t know?', a: 'It says so. A fuzzy match on terminology is a hallucination with extra steps, so an unknown term returns not found, and the answer reflects that.' }
    ],
    nums: [['3', 'vocabularies'], ['~$0.003', 'per call on gpt-5.4-mini'], ['0', 'fuzzy matches']],
    push: { q: 'Isn’t exact match too brittle for how scientists type?', a: 'That’s what the dictionary is for: synonyms and abbreviations map to one canonical ID. And brittle is the safer failure — “not found” is visible, a wrong concept is silent.' }
  },

  'jj/know': {
    short: 'Knowledge answers the substantive scientific question against the internal corpus. It’s search-then-generate with exactly two tools: search_enterprise_kb runs hybrid retrieval on kb-knowledge with the closure-table ancestor filter, and synthesize_knowledge writes the cited answer on gpt-5.4. Every specialist has that same shape — nothing improvises its own data access.',
    qa: [
      { q: 'Why constrain every agent to two tools?', a: 'Constraining the shape is what makes the trajectory evaluable and the audit trail complete. If an agent could improvise its data access, we couldn’t say afterwards what it saw or why.' },
      { q: 'How does concept expansion work?', a: 'Ontology returns entity IDs plus ancestors; Knowledge filters on ancestor_ids, so a question about a parent concept retrieves chunks about every child term. It’s a filter in the query, not a graph traversal.' },
      { q: 'How do you test it before release?', a: 'Closure-table fixtures in the pipeline — a parent-concept query must return the whole subtree — plus the golden-set eval and the grounding gate, then a canary at 5, 20, 50 and 100 percent.' },
      { q: 'What if retrieval is weak?', a: 'It cites per claim and may answer “the context does not contain this.” An uncited “answered” is downgraded to insufficient_evidence before it ever reaches the orchestrator.' }
    ],
    nums: [['2', 'tools'], ['5→20→50→100', 'canary (%)'], ['~$0.02', 'per call']],
    push: { q: 'How did you fix chunk granularity?', a: 'Big chunks buried the citations and small ones lost the meaning. Structural chunking with an overlap window tuned so a citation never straddles a chunk edge, plus hybrid retrieval and metadata filters, fixed it.' }
  },

  'jj/aoai': {
    short: 'The model deployments live in Azure OpenAI: the gpt-5.4 family for the agents and text-embedding-3-large for vectors. Each agent calls its own pinned deployment directly over synchronous REST with its own Workload Identity token. Service Bus decouples the orchestrator from the agents; it never sits in front of the model.',
    qa: [
      { q: 'Why not route model calls through the bus too?', a: 'A model call is inherently synchronous. A queue in front of it adds latency and another moving part, with nothing gained.' },
      { q: 'How do you manage model versions?', a: 'Deployments are pinned per agent with auto-upgrade disabled, so a platform-side model change is a change-controlled event, not a surprise.' },
      { q: 'Tell me about a model migration.', a: 'We launched on GPT-4o. When it was retired, the migration had to be per agent, with the eval suite rerun for each. In a validated system, a model swap is a release, not a config change.' },
      { q: 'How do you control model cost?', a: 'Right-size per agent: gpt-5.4-mini for Ontology and Summarization, high reasoning only for Drug Safety and QA. Prompt caching on stable prefixes — cached input bills at about 10% of the input rate — and batch pricing for ingestion embeddings.' }
    ],
    nums: [['$0.08', 'blended inference per query'], ['~90%', 'discount on cached input'], ['50%', 'batch discount on ingestion']],
    push: { q: 'How do you know which agent drives cost?', a: 'Per-agent OpenTelemetry spans record p50 and p95 tokens per agent, and those feed the cost model. Drug Safety and QA are about 51% of a worst-case query, so that’s where any optimization starts.' }
  },

  /* ============================ J&J · state ============================ */
  'jj/redis': {
    short: 'Azure Managed Redis is working memory outside any pod: the session store and the retrieval cache. Session context is loaded before each run and saved after validation, with a TTL. The cache key is query plus tier, so a cached result never crosses an entitlement boundary. Redis is working memory; Cosmos is the record.',
    qa: [
      { q: 'Why Redis for sessions instead of Cosmos?', a: 'Session state is read and written on every turn and it’s disposable — that’s a fast, TTL’d store. Cosmos is the system of record. Keeping them separate means neither has to be good at the other’s job.' },
      { q: 'What happens if a key is evicted?', a: 'A missing key means a turn without history, not a failed request. And because the injected session context is also written to Cosmos with the trace, any answer can be reconstructed months later without Redis.' },
      { q: 'How do you stop the cache leaking data across users?', a: 'The cache key includes the caller’s tier, so a result cached for one entitlement level is never served to another. Fan-out queries aren’t cached at all — they rarely repeat, and they include the regulated Drug Safety hop.' },
      { q: 'What happens to a session if a pod restarts?', a: 'The session survives because it lives in Redis, not in the pod. An in-flight request doesn’t move pods, because its reply is routed to the pod holding the Future.' }
    ],
    nums: [['$150–400+', 'a month with HA (fixed cost)'], ['query + tier', 'cache key'], ['TTL', 'on every session']],
    push: { q: 'Isn’t caching regulated answers risky?', a: 'Yes, which is why it’s limited: TTLs or ingestion-triggered invalidation for regulated answers, no caching on fan-out queries, and regulators likely expect fresh, traceable validation on the Drug Safety and QA hops.' }
  },

  /* ============================ J&J · retrieval ============================ */
  'jj/kidx': {
    short: 'kb-knowledge is the general scientific index: 10,000-plus documents across the eight-domain pharma taxonomy. Every chunk carries entity IDs, ancestor IDs, domain tags and a security level, and the query applies tier, effective date and ancestor filters before anything is retrieved. One hybrid index with rich metadata, not many small topic indexes.',
    qa: [
      { q: 'Why one big index instead of an index per topic?', a: 'Metadata does the partitioning. With entity, ancestor, domain and security fields on every chunk, one hybrid index can be filtered to any slice, without routing questions between dozens of small indexes.' },
      { q: 'What’s in the index schema?', a: 'id, title, content, content_vector, uri, concept_ids, ancestor_ids and region, with a semantic configuration named default. The vector and the analyzed text live in the same document.' },
      { q: 'Who can query it?', a: 'Only the Knowledge agent’s identity, through Search Index Data Reader scoped to kb-knowledge. And that identity can’t query kb-compliance at all.' },
      { q: 'How do you keep it fresh?', a: 'Incremental upserts from the ingestion job, with staleness monitored — a stale index gives confident, outdated answers. A vocabulary release re-stamps affected chunks, so the ancestors always match the closure table.' }
    ],
    nums: [['10k+', 'documents'], ['8', 'pharma domains'], ['4', 'chunk filters: entity · ancestor · domain · security']],
    push: { q: 'How do you evaluate retrieval separately from generation?', a: 'RAGAS context precision and recall on every index or chunking change — layer one of the eval program, measured apart from what the model did with the evidence.' }
  },

  'jj/gidx': {
    short: 'kb-compliance is the governed index: SOPs, labels, submissions and safety records under change control. It’s effective-dated and tiered, every document version is pinned, and superseded versions stay retrievable for audit. Only the Drug Safety identity can read it — its Search role is scoped to this index alone. That separation is the compliance story.',
    qa: [
      { q: 'Why a separate index instead of a security flag?', a: 'Separation at the infrastructure level is something an auditor can verify. A flag in application code is a promise; a role scoped to an index is a fact.' },
      { q: 'Why keep superseded versions?', a: 'Because the audit question is what the system knew on a given date. Effective dating lets a query ask for the version in force, and retaining old versions lets us reproduce an earlier answer.' },
      { q: 'How are changes to this index controlled?', a: 'Change control on the index is treated as change control on a validated system: under 21 CFR Part 11 and GxP, every index change is a controlled change with an approval record.' }
    ],
    nums: [['1', 'identity with access: Drug Safety'], ['Part 11', 'change control'], ['every', 'document version pinned']],
    push: { q: 'What if Knowledge needs governed content to answer?', a: 'It doesn’t get it. Anything regulated is answered only by Drug Safety against the governed index, and the orchestrator assembles both legs. The Knowledge identity simply can’t read kb-compliance.' }
  },

  /* ============================ J&J · terminology ============================ */
  'jj/dict': {
    short: 'The term dictionary turns what a scientist typed into a canonical entity ID. Synonyms and abbreviations resolve against the MedDRA, SNOMED CT and MeSH spine, and the rule is exact match or found:false — never a nearest-neighbour guess. It’s built by the Ontology Loader and versioned per vocabulary release.',
    qa: [
      { q: 'Why not fuzzy or embedding-based matching?', a: 'A fuzzy match on terminology is a hallucination with extra steps. If the term isn’t in the dictionary, the answer is “not found,” and the agent says so.' },
      { q: 'Where does it live?', a: 'In a Cosmos terminology container with label_normalized, synonyms_normalized, vocabulary, level and ancestor_ids. The Ontology agent has read-only access to it.' },
      { q: 'How is the exact-match rule enforced?', a: 'In code, not in the prompt. No nearest-neighbour candidates are ever shown to the model, and any concept ID not resolved in the same run is rejected.' }
    ],
    nums: [['3', 'vocabularies'], ['0', 'nearest-neighbour candidates'], ['1', 'canonical ID per synonym']],
    push: { q: 'What about misspellings?', a: 'Labels and synonyms are stored normalized, so case and spacing don’t matter, but a genuine misspelling returns not found. That’s deliberate: a visible miss is safer than a silent wrong concept.', check: 1 }
  },

  'jj/closure': {
    short: 'The closure table is the ontology flattened at ingestion. For every concept it stores all of its ancestors, and each chunk is stamped with its own entity IDs plus every parent and ancestor. So a question about a parent concept becomes an index filter across the whole subtree — retrieval never traverses anything.',
    qa: [
      { q: 'Walk me through the options you considered.', a: 'Option A was Cosmos DB for Apache Gremlin with runtime traversal. Option B, this one, precomputes the ancestor closure and filters on it. B gets roughly ninety percent of the value at a fraction of the infrastructure, with zero hallucination risk on the retrieval query itself.' },
      { q: 'When would a graph be the right tool?', a: 'For discovering novel links between entities across the literature. That’s a different product from filtering retrieval by concept.' },
      { q: 'How do you test it?', a: 'Closure-table fixtures gate every Knowledge release: a parent-concept query must return the whole subtree.' },
      { q: 'How is it kept current?', a: 'It’s rebuilt as a batch artifact when the terminology spine updates, versioned per vocabulary release, and each release triggers a re-stamp of the affected chunks.' }
    ],
    nums: [['~90%', 'of a graph’s value'], ['0', 'traversals at query time'], ['A vs B', 'Gremlin graph vs metadata filter']],
    push: { q: 'What does “zero hallucination risk on the query” mean?', a: 'With a graph, a generated query decides what to traverse, and a wrong query silently returns the wrong subtree. With a precomputed filter, the query is a list of IDs that came from an exact lookup — there’s nothing for a model to make up.' }
  },

  /* ============================ J&J · ingestion ============================ */
  'jj/blob': {
    short: 'Blob Storage is the landing zone for source documents across the eight pharma domains — clinical study reports, safety labels, submissions, ELN entries, literature and patents. The originals are immutable. An Event Grid event starts one ingestion job per document, and everything downstream is derived and can be rebuilt from the original.',
    qa: [
      { q: 'Why immutable originals?', a: 'The raw document is never what we retrieve — it’s what we can always go back to. If parsing, chunking or the embedding model changes, we rebuild from source instead of patching derived data.' },
      { q: 'Why Event Grid?', a: 'Each new or changed document emits a discrete event that opens one idempotent job, so re-running is safe and a document is embedded exactly once per version.' },
      { q: 'Who reads the raw documents at request time?', a: 'Only Summarization, with Storage Blob Data Reader, for fetch_and_chunk_doc. Every other agent works from the indexes.' }
    ],
    nums: [['8', 'pharma domains'], ['1', 'job per document event'], ['6', 'source types: CSRs · labels · submissions · ELN · literature · patents']],
    push: { q: 'How do you handle a corrected document?', a: 'A new version lands as a new immutable original and opens a new job, embedded once at that version. For governed content, the superseded version stays retrievable for audit.', check: 1 }
  },

  'jj/docint': {
    short: 'Document Intelligence turns scientific PDFs into structure instead of a wall of text. We run v4.0 with the 2024-11-30 layout model, which keeps multi-column layout, tables and figure captions intact, with an OCR gate for scanned pages. Parsing was a bigger lever on answer quality than any model change we made.',
    qa: [
      { q: 'What problem did it solve?', a: 'Naive PDF extraction scrambled multi-column CSR pages into unusable chunks. Layout-aware parsing was the single biggest quality jump in the whole ingestion path.' },
      { q: 'Why do tables matter so much?', a: 'Safety data lives in tables. Flatten a table into text and you lose which value belongs to which row and column. Keeping table structure is what makes safety tables usable for retrieval and citation.' },
      { q: 'What about scanned documents?', a: 'An OCR gate handles scanned pages, so they enter the same structured path as born-digital PDFs.', check: 1 }
    ],
    nums: [['v4.0', 'model 2024-11-30'], ['#1', 'quality jump in ingestion']],
    push: { q: 'Why not an open-source PDF parser?', a: 'We needed layout, tables and captions preserved on multi-column regulatory documents, inside the Azure boundary, with a pinned model version for change control. Document Intelligence gave us that as a managed, versioned service.', check: 1 }
  },

  'jj/dbx': {
    short: 'Databricks runs structural chunking as a batch job. It splits parsed documents on section boundaries instead of character counts, with an overlap tuned so a citation never straddles a chunk edge, and tags every chunk with domain, tier, date and type. Chunk size is a citation problem before it’s a retrieval problem.',
    qa: [
      { q: 'How did you choose the chunk size?', a: 'Big chunks buried the citation; small chunks lost the meaning. Section-aware chunks with an overlap window were the compromise that made both work.' },
      { q: 'Why Databricks for this?', a: 'It’s batch compute over the whole corpus, and it’s where the Ontology Loader already runs, so chunking, stamping and the terminology build share one platform.', check: 1 },
      { q: 'What metadata does a chunk get?', a: 'Domain, tier, date and type here; entity IDs, ancestor IDs and the vocabulary version at the stamping step. Those fields are what the search query filters on.' }
    ],
    nums: [['4', 'tags: domain · tier · date · type'], ['0', 'citations straddling a chunk edge']],
    push: { q: 'How would you know if chunking got worse?', a: 'Retrieval is evaluated on its own — RAGAS context precision and recall run on every chunking change — and a regression on any eval layer blocks the release.' }
  },

  'jj/stamp': {
    short: 'Entity stamping is where the ontology gets baked in. It links mentions in each chunk to the terminology spine and writes the entity IDs, the full ancestor set and the vocabulary version onto the chunk, taken from the closure table. We pay the ontology cost once, at ingestion, instead of on every query.',
    qa: [
      { q: 'Why stamp at ingestion?', a: 'It’s what lets retrieval skip the graph entirely. Concept expansion becomes a filter on ancestor_ids, which is cheap and deterministic at query time.' },
      { q: 'What happens when the vocabulary changes?', a: 'A vocabulary release triggers a re-stamp of the affected chunks, so the index and the closure table are always the same version.' },
      { q: 'How do you verify stamping is right?', a: 'Closure-table fixtures: a parent-concept query must return the whole subtree, which only passes if the ancestors were stamped correctly.' }
    ],
    nums: [['1×', 'ontology cost, at ingestion'], ['3', 'fields: entity_ids · ancestor_ids · version']],
    push: { q: 'Doesn’t re-stamping get expensive?', a: 'Only the affected chunks are re-stamped, and it’s a batch job on the ingestion side — never on the request path.' }
  },

  'jj/emb': {
    short: 'Embeddings vectorize each chunk for the dense side of hybrid retrieval, using text-embedding-3-large at batch pricing. Images are verbalized with AI Vision first, so they’re searchable as text. The model version is recorded on every chunk, because mixing embedding versions in one index is silently wrong. Re-embedding the corpus is a pipeline run, not a project.',
    qa: [
      { q: 'Why record the model version per chunk?', a: 'Vectors from different embedding models aren’t comparable. If an index mixes versions, similarity scores are quietly wrong with no error to tell you. The version field lets us detect it and replay.' },
      { q: 'How do you handle images and figures?', a: 'AI Vision verbalizes them into text before embedding, so a figure’s content is retrievable like any other chunk.' },
      { q: 'How would you switch embedding models?', a: 'Re-embed as a versioned, replayable pipeline job at batch pricing, then rerun the retrieval eval — it runs on every index change — before the new vectors serve traffic.' }
    ],
    nums: [['50%', 'batch discount'], ['3-large', 'text-embedding-3-large'], ['~$0.00001', 'per query embedding']],
    push: { q: 'Why not a domain-specific biomedical embedding model?', a: 'text-embedding-3-large runs inside our Azure OpenAI boundary with pinned deployments and Entra auth, which matters under change control, and BM25 plus ontology filters cover the exact biomedical terms. I’d evaluate a domain model on our retrieval set before switching.', check: 1 }
  },

  'jj/loader': {
    short: 'The Ontology Loader is a Databricks job that builds the terminology artifacts — the term dictionary and the closure table — whenever the vocabulary spine changes. Each build is a versioned release, and a new release re-stamps the affected chunks. The ontology is built, versioned and released like code, not queried like a database.',
    qa: [
      { q: 'Why treat the ontology as a build artifact?', a: 'It’s cheaper, deterministic, and validatable as a release. A live graph queried at request time is none of those.' },
      { q: 'What triggers a build?', a: 'A change in the vocabulary spine — MedDRA, SNOMED CT or MeSH. The new release rebuilds both artifacts and re-stamps the affected chunks.' },
      { q: 'Where do the artifacts go?', a: 'The dictionary goes to the Cosmos terminology container, read-only for the Ontology agent; the ancestors are stamped onto chunks in the index.' }
    ],
    nums: [['2', 'artifacts per release'], ['3', 'vocabularies']],
    push: { q: 'What if a vocabulary release is bad?', a: 'Each release is a versioned artifact, so rolling back means republishing the previous version and re-stamping — the same way we’d roll back code.', check: 1 }
  },

  /* ============================ J&J · record, ops, controls ============================ */
  'jj/cosmos': {
    short: 'Cosmos is the evidence record. By correlation ID it holds what was asked, what was retrieved, what was generated and what was shown — including the session context injected into each run. It’s written on the request path, not reconstructed from logs, under a custom append-only role. If we can’t reconstruct why a scientist saw a sentence, the platform isn’t compliant.',
    qa: [
      { q: 'Why write the audit trail on the request path?', a: 'Because a record rebuilt from logs is only as complete as the logs. Written as part of the request, every claim resolves by correlation ID to its chunks, controlled versions, model deployment and verifier verdict.' },
      { q: 'How do you make it tamper-resistant?', a: 'A custom AuditAppendOnly role: create, read and query — no delete. Records are appended, never edited.' },
      { q: 'Why not keep this in Redis?', a: 'Redis keys expire and get evicted. Cosmos is the record, so the injected session context is written there too, and an answer can be reconstructed months later without Redis.' },
      { q: 'What regulation is this for?', a: '21 CFR Part 11 and GxP. Every model, prompt and index change is controlled, and every response is traceable to its evidence.' }
    ],
    nums: [['0', 'deletes allowed'], ['~$0.25', 'per million RUs (serverless)'], ['Part 11', '21 CFR']],
    push: { q: 'How would you answer an auditor?', a: 'Give me the correlation ID and I can show what was asked, which chunks and versions were retrieved, which model deployment generated the answer, what the verifier said, and what the user saw.' }
  },

  'jj/mon': {
    short: 'Monitoring follows one correlation ID from the gateway through every agent hop and model call — OpenTelemetry into Application Insights, and Arize Phoenix for production LLM quality. The key idea: quality signals like refusal rate, citation coverage and retrieval hit rate are alerted on like latency, because they move before CPU ever notices.',
    qa: [
      { q: 'What do you alert on?', a: 'Gate failures and refusal-rate anomalies. Refusal rate is watched in both directions — a sudden drop usually means the gate broke. We also track citation coverage, retrieval hit rate, query drift, index staleness and per-agent latency SLOs.' },
      { q: 'How do you find the cause of a slow p95?', a: 'Per-agent spans on every retrieval, generation and bus round trip. When p95 moves, we know which agent moved it.' },
      { q: 'How does monitoring connect to evaluation?', a: 'Production monitoring is layer six of the seven-layer eval program. Open scientific Q&amp;A has no single right answer, so seven partial views that all have to agree are the honest substitute for ground truth.' },
      { q: 'How does it feed cost?', a: 'Spans record p50 and p95 tokens per agent, and those replace the engineering assumptions in the cost model.' }
    ],
    nums: [['7', 'eval layers that must agree'], ['1', 'correlation ID, end to end'], ['p50 / p95', 'tokens per agent → cost model']],
    push: { q: 'What’s your ground truth?', a: 'There isn’t one for open scientific Q&amp;A. That’s why no single metric is trusted — seven layers, from retrieval through SME review, have to agree, and SME findings feed the labeled eval sets.' }
  },

  'jj/secgov': {
    short: 'Every service has its own federated identity through Entra Workload Identity — OIDC token exchange, no shared secrets in the cluster — and the secrets that do exist live in Key Vault. Permissions are scoped per service: Search roles at index scope, Service Bus rights per topic and subscription. Purview covers data governance, and every change is controlled under Part 11 and GxP.',
    qa: [
      { q: 'How do you stop the Knowledge agent reading governed content?', a: 'Its identity can’t. Search Index Data Reader is assigned at index scope — Knowledge on kb-knowledge only, Drug Safety on kb-compliance only. No code path checks it; the permission simply doesn’t exist.' },
      { q: 'How is Workload Identity wired?', a: 'Each service has a Kubernetes service account federated to a managed identity through OIDC, with RBAC on each resource it touches. DefaultAzureCredential everywhere, so there are no keys in code or in the cluster.' },
      { q: 'How do you secure the supply chain?', a: 'Images are built once, pushed to ACR by digest, signed with Cosign with an SBOM, and Ratify with Gatekeeper verifies the signature at admission — an unsigned image can’t run.' },
      { q: 'What does change control look like?', a: 'Every model, prompt and index change is a controlled change with an approval record, validated eval datasets, and a Part 11 electronic signature on the release.' }
    ],
    nums: [['1', 'identity per service'], ['0', 'shared secrets in the cluster'], ['2', 'index-scoped Search grants']],
    push: { q: 'Which service has the least access?', a: 'QA validation: OpenAI User plus its own subscriptions and the reply queue. It touches no data store at all — it only verifies what it’s handed.' }
  }
};

/* ============================ Home Depot ============================ */
Object.assign(INTERVIEW, {
  'hd/Q': {
    short: 'At query time there are five steps. Preprocessing resolves products, brands and SKUs, classifies intent and emits filters. FAISS and Elasticsearch then run in parallel, reciprocal rank fusion merges them by position, a cross-encoder reorders the top-K, and in Phase 3 GPT-3.5-Turbo writes a grounded answer. Retrieval through rerank stays under 900 ms at p95, at peak retail load.',
    qa: [
      { q: 'Why run both retrievers on every request?', a: 'Because they fail differently. BM25 misses synonyms — “sheetrock” isn’t “drywall” — and dense retrieval is weaker on exact SKUs and model numbers. Running both in parallel means latency is the max of the two, not the sum.' },
      { q: 'Why fuse on rank instead of score?', a: 'A BM25 score and a cosine distance aren’t on comparable scales. We tried weighted score blending first, and any weighting learned on one query distribution failed on the next. Rank fusion has nothing to normalize.' },
      { q: 'How do you hold the latency budget?', a: 'FastAPI fans out asynchronously with a timeout per stage, so one slow leg can’t blow the p95. Per-stage latency is monitored, so a regression points at one stage.' },
      { q: 'Why was synthesis added last?', a: 'Retrieval quality was already carrying the result. GPT-3.5-Turbo only became available on Azure in the final weeks, so it was layered on top of a ranking that was already measured and working.' }
    ],
    nums: [['5', 'steps on the query path'], ['<900 ms', 'p95, retrieval through rerank'], ['k = 60', 'RRF constant'], ['2', 'retrievers in parallel']],
    push: { q: 'If one retriever times out, what does the user get?', a: 'The other leg’s results. Each stage has its own timeout, so a slow retriever is cut off and fusion runs on what came back — a slightly weaker ranking instead of a missed p95.', check: 1 }
  },
  'hd/M': {
    short: 'Metadata and state hold the filters and the logs. Department, document type and ACL are applied inside the query, never on the result set — the ACL tag captured at ingestion is the same tag enforced at search time. Cosmos DB holds chunk metadata, lineage and ACL tags; PostgreSQL holds the result index, query logs and the relevance judgments behind the benchmarks.',
    qa: [
      { q: 'Why filter in the query?', a: 'Post-filtering results is a security bug, not a shortcut. Filtering in the query means restricted content never enters the candidate set in the first place.' },
      { q: 'How do the ACL tags stay correct?', a: 'They’re stamped once at ingestion and that exact tag is enforced at query time. One source of truth, so there’s no drift between what was indexed and what’s allowed.' },
      { q: 'What did the query logs give you?', a: 'They turned a hunch about synonyms into a measured share of traffic — and a business case. They also fed the judgment set and the failure analysis.' }
    ],
    nums: [['3', 'query filters: department · doc type · ACL'], ['~½', 'of queries used a term the catalog spells differently']],
    push: { q: 'Why two databases?', a: 'They hold different things. Cosmos DB holds per-chunk metadata, lineage and ACL tags; PostgreSQL holds relational state — the result index, query logs and judgments, and what’s been indexed at which version.' }
  },
  'hd/E': {
    short: 'Evaluation was the gate on every tuning decision. We curated benchmark query sets per intent class with graded relevance judgments, scored every fusion or reranker change offline on NDCG@10, MRR and MAP, and only then ran a live A/B test on search success. Offline metrics bought permission to test; search success decided.',
    qa: [
      { q: 'Why NDCG@10 as the headline?', a: 'It uses graded relevance and rewards putting the best results at the very top, and an associate on a handheld only looks at the first few. MRR and MAP catch different failure shapes — where the first good hit lands, and precision across all of them.', check: 1 },
      { q: 'Why per-class benchmark sets?', a: 'A single aggregate hides a regression on one intent class behind a gain on another. Per-class sets showed exactly where a change helped and where it hurt.' },
      { q: 'What was the result?', a: '+14% NDCG@10 on the labeled set for hybrid plus rerank versus the BM25 control, and +21% search success in the live A/B test — sessions ending in a click-through or a resolved answer.' },
      { q: 'Why not ship on offline metrics alone?', a: 'Offline metrics predict; the A/B test decides. NDCG got us permission to run the test. Search success is what we shipped on.' }
    ],
    nums: [['+14%', 'NDCG@10 vs. BM25'], ['+21%', 'search success, live A/B'], ['3', 'offline metrics: NDCG · MRR · MAP']],
    push: { q: 'What if NDCG went up but search success didn’t?', a: 'Search success wins — it’s the decision metric. Offline metrics only earn the right to run the test; if the live test doesn’t move, the change doesn’t ship.' }
  },
  'hd/I': {
    short: 'Ingestion is the batch path: five source types — PDF, DOCX, HTML, SharePoint and API feeds — about 1,200 documents a week. A router picks the handler from the file’s bytes, each handler emits one normalized shape, sentence-aware chunking keeps steps and spec tables whole, all-mpnet-base-v2 embeds in-cluster, and a versioned dual-write puts every chunk into both FAISS and Elasticsearch, once.',
    qa: [
      { q: 'Why dual-write from one chunk set?', a: 'The two indexes drifting apart — one rebuilt, one not — produced the most confusing bugs on the platform. Writing both from one versioned chunk set means they can’t disagree about what a document says.' },
      { q: 'How do you handle a catalog that never sits still?', a: 'New SKUs arrived with thin, inconsistent text and got weak embeddings. The fix was to normalize and enrich before embedding, plus a state-tracked refresh path — not a better model.' },
      { q: 'What did you get wrong?', a: 'Embedding live inventory. Anything that changes hourly should be looked up, not retrieved — freshness beats semantics for a stock count.' },
      { q: 'Why route on the bytes?', a: 'Files lie about what they are. A .pdf that’s really HTML silently produces an empty chunk set unless the router checks the MIME type, so unknown types are quarantined, not guessed.' }
    ],
    nums: [['~1,200', 'documents a week'], ['5', 'source types'], ['768', 'dimension embeddings, in-cluster'], ['2', 'indexes, one chunk set']],
    push: { q: 'Is re-running a batch safe?', a: 'Yes. Dual-write is idempotent and versioned, so the same version gives the same result.' }
  },
  'hd/users': {
    short: 'Two very different users of one search box: store associates, who need an answer in the aisle in seconds on a handheld, and merchandising analysts, who need coverage — every spec, guide and playbook. The associate case set the latency budget; the analyst case set the coverage requirement.',
    qa: [
      { q: 'Why one index for both audiences?', a: 'Serving both from one hybrid index was the whole point. Before this, associates jumped across systems — specs, DIY guides, store-ops playbooks, live inventory — to answer a single customer question.' },
      { q: 'How did the two users shape the design?', a: 'The associate on a handheld set the p95 budget under 900 ms. The analyst who needs everything set the coverage bar, which is why BM25 stayed for exact SKUs while dense retrieval handled intent.' },
      { q: 'How did you measure success for them?', a: '+21% search success in the live A/B test — sessions ending in a click-through or a resolved answer — and +14% NDCG@10 offline.' }
    ],
    nums: [['+21%', 'search success'], ['<900 ms', 'p95'], ['4+', 'operational sources unified']],
    push: { q: 'Do associates and analysts see the same content?', a: 'No. Role-based access applies inside the query, so store-ops content is filtered by role — the permission is a property of the search, not the UI.' }
  },
  'hd/apigw': {
    short: 'The API gateway authenticates the caller with TSC Identity and applies role-based access before the search API. Store-ops content is filtered by role at query time — the permission is a property of the search, not of the results page.',
    qa: [
      { q: 'Why apply the role to the query and not the UI?', a: 'If the UI hides results, the content was still retrieved, ranked and sent. Applying the role as a query filter means the search never touches what the user can’t see.' },
      { q: 'Where do roles come from?', a: 'TSC Identity issues the caller’s token, and RBAC policy feeds decide what each role can see.' },
      { q: 'How does that connect to ingestion?', a: 'The ACL tag captured when a document is indexed is the same tag enforced at query time, so permissions have one source of truth.' }
    ],
    nums: [['TSC Identity', 'caller token'], ['RBAC', 'policy feeds']]
  },
  'hd/fastapi': {
    short: 'FastAPI is the service the storefront and associate tools call. It fans out asynchronously to both retrievers and enforces a timeout per stage, so one slow leg can’t blow the p95. The budget is enforced, not hoped for.',
    qa: [
      { q: 'Why per-stage timeouts instead of one global timeout?', a: 'A global timeout only tells you the request was slow. Per-stage timeouts stop one slow retriever from eating the whole budget, and per-stage latency tells you which stage regressed.' },
      { q: 'Why FastAPI?', a: 'Async fan-out to two retrievers is the heart of the request, and FastAPI on Python made that natural while sitting next to the spaCy and sentence-transformers code.', check: 1 },
      { q: 'What does a response contain?', a: 'The ranked results — and in Phase 3, a synthesized answer with every claim cited and resolvable to its chunks and index version.' }
    ],
    nums: [['2', 'retrievers per request, in parallel'], ['<900 ms', 'p95 budget']],
    push: { q: 'What happened at peak retail load?', a: 'The p95 held under 900 milliseconds, retrieval through rerank, measured at peak retail load.' }
  },
  'hd/glance': {
    short: 'Three delivery phases — a BM25 foundation, hybrid retrieval, then RAG synthesis. Five source types, about 1,200 documents a week, two retrieval indexes fused by rank. The result: plus 14% NDCG@10, plus 21% search success, and p95 under 900 milliseconds.',
    qa: [
      { q: 'Walk me through the phases.', a: 'September 2021 to mid 2022: unify the content and prove a BM25 baseline, with a FAISS prototype. Mid 2022 to early 2023: production hybrid search with RRF and a cross-encoder, validated in an A/B test. Then March to April 2023: GPT-3.5-Turbo synthesis on top.' },
      { q: 'What exactly does +14% measure?', a: 'NDCG@10 on the labeled judgment set — hybrid plus rerank versus the BM25 control.' },
      { q: 'And +21%?', a: 'Search success in the live A/B test: the share of sessions ending in a click-through or a resolved answer.' },
      { q: 'Why phase it?', a: 'Each phase had a gate before the next one started: unified search had to beat associates juggling systems, and hybrid had to beat lexical live and inside the latency budget. Phasing kept the timeline honest.' }
    ],
    nums: [['+14%', 'NDCG@10'], ['+21%', 'search success'], ['<900 ms', 'p95'], ['~1,200', 'documents a week'], ['3', 'phases']],
    push: { q: 'Why GPT-3.5 and not something newer?', a: 'That’s what Azure hosted at the time — gpt-35-turbo arrived in preview in the final weeks, March to April 2023. Synthesis sits on top of retrieval as its own layer, so the model is swappable.', check: 1 }
  },
  'hd/qpre': {
    short: 'Query preprocessing turns a raw query into a resolved query plus filters before either index sees it. spaCy NER pulls out products, brands and SKUs, a classifier assigns one of four intent classes, and semantic rewriting normalizes trade vocabulary. Both retrievers get the same resolved query, which keeps their candidate lists comparable.',
    qa: [
      { q: 'Why preprocess once instead of per retriever?', a: 'So both retrievers see the same resolved query and filter set. If each interpreted the query its own way, the two candidate lists wouldn’t be comparable at fusion.' },
      { q: 'What problem does rewriting solve?', a: 'Vocabulary mismatch. Roughly half the queries contained a term the catalog spells differently — “sheetrock” isn’t “drywall,” and the customer isn’t going to change.' },
      { q: 'What does intent classification feed?', a: 'The filters, and the evaluation: benchmark sets were curated per intent class, so a regression on one class showed up even when the average improved.' }
    ],
    nums: [['4', 'intent classes'], ['~½', 'of queries mismatched catalog vocabulary'], ['1', 'embedder call per query']],
    push: { q: 'Why not just add a synonym list to Elasticsearch?', a: 'Synonym lists help BM25 for the terms you’ve thought of; they don’t cover intent-based queries phrased in a shopper’s own words. Dense retrieval covers those, and preprocessing normalizes what it can before either index runs.', check: 1 }
  },
  'hd/faiss': {
    short: 'FAISS is the dense half. It runs approximate nearest-neighbour search over 768-dimensional vectors with an IVF-PQ index, and it recovers intent-based queries where the shopper’s words don’t match the catalog’s. It’s tuned for recall and speed, because ordering is the reranker’s job.',
    qa: [
      { q: 'Why IVF-PQ rather than exact search?', a: 'Dense retrieval buys recall on vocabulary mismatch. Precision is the reranker’s job, so FAISS is tuned for recall and speed rather than exactness.' },
      { q: 'What does dense retrieval catch that BM25 misses?', a: 'Intent and synonyms — queries whose words never appear in the catalog. In the POC, the FAISS prototype recovered intent-based queries BM25 missed, and that’s what greenlit hybrid.' },
      { q: 'Where do the vectors come from?', a: 'all-mpnet-base-v2, self-hosted in-cluster, 768 dimensions, with the model version recorded per chunk.' }
    ],
    nums: [['768', 'dimensions'], ['IVF-PQ', 'approximate index']],
    push: { q: 'Doesn’t PQ compression hurt quality?', a: 'It trades some exactness for speed and memory. That’s acceptable because FAISS only has to get the right documents into the candidate set — the cross-encoder fixes the order of the top-K.' }
  },
  'hd/es': {
    short: 'Elasticsearch BM25 is the lexical half, and still the best thing in the system for an exact SKU or model number. It was built first, as the Phase 1 baseline everything else was measured against, and we never replaced it — dense retrieval was added next to it, not instead of it.',
    qa: [
      { q: 'Why keep BM25 once you had dense retrieval?', a: 'Exact identifiers and rare terms are where lexical search still wins outright. A SKU or a model number needs an exact match, not a nearest neighbour.' },
      { q: 'What were its limits?', a: 'It’s blind to synonyms — “sheetrock” isn’t “drywall.” That’s the gap dense recall filled.' },
      { q: 'Why build it first?', a: 'It was the baseline. The POC had to prove that one lexical search over all the content beat associates juggling systems, and every later change was measured against BM25 as the control.' }
    ],
    nums: [['Phase 1', 'baseline'], ['+14%', 'NDCG@10 over this control']],
    push: { q: 'Why not tune BM25 harder instead of adding vectors?', a: 'We measured the gap first: the dense prototype recovered intent-based queries BM25 missed, and roughly half of queries had a vocabulary mismatch. That’s a recall problem BM25 can’t tune its way out of.' }
  },
  'hd/rrf': {
    short: 'Reciprocal rank fusion merges the two candidate lists by rank position, not by score, with k equal to 60. There’s no score normalization and no tuning per query type, because a BM25 score and a cosine distance don’t live in the same space.',
    qa: [
      { q: 'What did you try first?', a: 'Weighted score blending. A BM25 score and a cosine distance aren’t on comparable scales, and any weighting learned on one query distribution failed on the next. We abandoned it.' },
      { q: 'How does RRF work?', a: 'Each document scores the sum of one over k plus its rank in each list. Documents both retrievers rank well rise to the top, and there are no raw scores to calibrate.' },
      { q: 'Why k = 60?', a: 'It’s the standard constant from the original RRF work. It damps the advantage of a single top rank, so agreement between the two retrievers counts for more.', check: 1 }
    ],
    nums: [['k = 60', 'fusion constant'], ['0', 'score normalization to tune']],
    push: { q: 'Where do hybrid systems usually go wrong?', a: 'At fusion. Rank is comparable; raw score is not. That’s where most hybrid search implementations quietly go wrong.' }
  },
  'hd/ce': {
    short: 'The cross-encoder, ms-marco-MiniLM-L-6-v2, reads the query and each candidate together and reorders the top-K. Fusion got the right documents into the set; it didn’t get them in the right order. The reranker turned recall into a visible improvement — on the top-K only, because it’s too expensive for the full list.',
    qa: [
      { q: 'Why rerank at all?', a: 'Fused candidates surfaced related-but-not-wanted items near the top. The cross-encoder pushes true intent up — and the top three results are all anyone looks at.' },
      { q: 'Why only the top-K?', a: 'A cross-encoder scores every query-candidate pair jointly, so cost grows with each candidate. Applying it to the top-K keeps it inside the latency budget.' },
      { q: 'Why this model?', a: 'ms-marco-MiniLM-L-6-v2 is small enough to run inside the p95 budget and trained for passage ranking.', check: 1 }
    ],
    nums: [['top-K', 'candidates reranked'], ['+14%', 'NDCG@10 with hybrid + rerank']],
    push: { q: 'How much of the gain came from reranking versus fusion?', a: 'The +14% is hybrid plus rerank together, against BM25. Qualitatively, fusion fixed recall and the cross-encoder fixed the order of the top results.', check: 1 }
  },
  'hd/rag': {
    short: 'RAG synthesis composes a direct answer over the reranked context with GPT-3.5-Turbo, in Phase 3 only. It’s strictly grounded on reranked passages and falls back to the ranked result list when grounding is thin. It was the last thing built, not the first — retrieval quality was already carrying the result.',
    qa: [
      { q: 'Why build synthesis last?', a: 'GPT-3.5-Turbo only became available on Azure in the final weeks, but the order was also deliberate: synthesis is only as good as the retrieval underneath it, and retrieval was already measured and working.' },
      { q: 'How do you keep answers grounded?', a: 'The model only sees reranked passages, every claim is cited, and when grounding is thin it falls back to the ranked result list instead of answering.' },
      { q: 'What risk did you watch?', a: 'Synthesis can over-summarize and drift from the source. Answer quality was watched on the synthesis layer specifically, separately from the ranking metrics.' }
    ],
    nums: [['Mar–Apr 2023', 'Azure preview'], ['Phase 3', 'only'], ['1', 'fallback: the ranked list']],
    push: { q: 'What happens when the answer would be weak?', a: 'It degrades to search results, not to a guess. Thin grounding falls back to the ranked list, which was already measured and trusted.' }
  },
  'hd/model': {
    short: 'The model layer is the two models the query path calls: all-mpnet-base-v2, self-hosted, for 768-dimensional embeddings, and in Phase 3, GPT-3.5-Turbo for synthesis. Self-hosting the embedder kept document content inside the ISO 27001 boundary, and it was what actually existed for most of this timeline.',
    qa: [
      { q: 'Why self-host the embedder?', a: 'Two reasons: it was the period-correct enterprise SBERT stack for most of 2021 to 2023, and it kept content inside the ISO 27001 boundary. A hosted API would have been less to operate.' },
      { q: 'What happened when hosted embeddings became available?', a: 'They arrived on Azure late in the engagement and were treated as a migration, not the starting point.' },
      { q: 'Where is the embedder called on the query path?', a: 'Once, during preprocessing. The vector then goes to FAISS.' }
    ],
    nums: [['768', 'dimensions'], ['ISO 27001', 'boundary'], ['2', 'models on the query path']],
    push: { q: 'Would you self-host today?', a: 'It depends on the boundary. If a hosted embedding service runs inside the same security boundary with pinned versions, I’d take it — and treat the switch as a re-embedding migration with a retrieval eval before cutover.', check: 1 }
  },
  'hd/cosmos': {
    short: 'Cosmos DB holds chunk metadata, lineage and ACL tags — the tags that become query-time filters. The ACL captured when a document is indexed is the ACL enforced when it’s searched, so there’s one source of truth and no drift between what was indexed and what’s allowed.',
    qa: [
      { q: 'Why stamp ACLs at ingestion?', a: 'So the query can filter on them directly. Looking permissions up at query time adds latency and a second source of truth that can drift.' },
      { q: 'What is lineage used for?', a: 'Every answer resolves to the chunks it cited, the index version they came from and the embedding model that produced them.' },
      { q: 'How do filters reach the indexes?', a: 'Department, doc type and ACL travel with every chunk and are applied as filters inside both the FAISS and the Elasticsearch query.' }
    ],
    nums: [['3', 'filters: department · doc type · ACL'], ['1', 'source of truth for permissions']],
    push: { q: 'What if a document’s permissions change?', a: 'The tag is part of the chunk’s metadata, so a permission change is a re-ingestion of that document — and the dual-write updates both indexes together.', check: 1 }
  },
  'hd/pg': {
    short: 'PostgreSQL is the relational store for the result index, query logs and relevance judgments. It tracks what’s been indexed, at which version, and what needs refresh — and every query is logged, which is what turned a hunch about synonyms into a measured share of traffic.',
    qa: [
      { q: 'Why log every query instead of sampling?', a: 'Because the failure we cared about — vocabulary mismatch — only shows up as a share of traffic. Logging everything turned a hunch into a business case and fed the judgment set.' },
      { q: 'How does it keep the index fresh?', a: 'The refresh path is state-tracked, so a failed load doesn’t silently leave a stale index.' },
      { q: 'What are the judgments?', a: 'Graded human relevance labels on real queries, curated per intent class — the set every ranking change is scored against.' }
    ],
    nums: [['every', 'query logged'], ['~½', 'queries with vocabulary mismatch']],
    push: { q: 'How do you know an index is stale?', a: 'PostgreSQL records what has been indexed and at which version, so a document whose latest version isn’t in the index shows up as needing refresh.' }
  },
  'hd/bench': {
    short: 'The benchmark query sets are graded relevance judgments on real queries, curated per intent class. Every fusion or reranker change was scored against them offline before it went anywhere near an A/B test. No ranking change shipped without a number attached.',
    qa: [
      { q: 'Why per intent class?', a: 'A single aggregate hides a regression on one intent class behind a gain on another. Per-class sets showed exactly where a change helped and where it hurt.' },
      { q: 'Where did the queries come from?', a: 'Real queries from the logs, with human relevance labels.' },
      { q: 'How were they used?', a: 'Every fusion-weight and reranker change was replayed against them before rollout, scored on NDCG@10, MRR and MAP.' }
    ],
    nums: [['4', 'intent classes'], ['3', 'metrics: NDCG · MRR · MAP']],
    push: { q: 'Tuning by feel is faster — why bother?', a: 'Tuning without a benchmark is guessing with extra steps. The per-class replay is what let us prove the +14% and justify the live test.' }
  },
  'hd/metrics': {
    short: 'Offline metrics were the gate on every tuning decision: NDCG@10 as the headline, with MRR and MAP catching different failure shapes. They predict; the A/B test decides. NDCG got us permission to run the test — search success is what we shipped on.',
    qa: [
      { q: 'What’s the difference between NDCG, MRR and MAP?', a: 'NDCG rewards ranking the most relevant results highest, using graded labels. MRR looks at where the first relevant result lands. MAP averages precision across all the relevant results. Each catches a different way a ranking can fail.' },
      { q: 'What was the live decision metric?', a: 'Search success: the share of sessions ending in a click-through or a resolved answer — up 21% in the A/B test.' },
      { q: 'Did you keep measuring after launch?', a: 'Yes. Ranking quality was monitored continuously on NDCG, MRR and MAP, because it drifts with the catalog.' }
    ],
    nums: [['+14%', 'NDCG@10'], ['+21%', 'search success (live)']],
    push: { q: 'Isn’t click-through a noisy success signal?', a: 'On its own, yes. That’s why search success counted a click-through or a resolved answer, and why graded offline judgments gated every change before it reached the live test.', check: 1 }
  },
  'hd/src': {
    short: 'Five source types — PDF, DOCX, HTML, SharePoint and API feeds — covering product specs, DIY guides, store-ops playbooks and live inventory, at about 1,200 documents a week. Spec sheets are the densest, most-cited content, and they’re table-heavy, which drove the parsing approach.',
    qa: [
      { q: 'What was the mistake worth not repeating?', a: 'Embedding live inventory. Anything that changes hourly should be looked up, not retrieved — freshness beats semantics for a stock count.' },
      { q: 'Why does content type matter so much?', a: 'Most of what an associate needs is in a spec table, not in prose. That’s why tables are kept intact through extraction and chunking.' },
      { q: 'How much content?', a: 'About 1,200 documents a week across all five source types.' }
    ],
    nums: [['5', 'source types'], ['~1,200', 'documents a week']],
    push: { q: 'So how was inventory answered?', a: 'As a live lookup rather than retrieval. Inventory changes hourly, so it should be looked up, not embedded.' }
  },
  'hd/router': {
    short: 'The file type router decides which extraction handler a document goes to — on the bytes, not the filename. python-magic checks the MIME type first, then falls back to the extension and header sniffing, and unknown types are quarantined, not guessed.',
    qa: [
      { q: 'Why not trust the file extension?', a: 'Files lie about what they are. A .pdf that’s actually HTML silently produces an empty chunk set unless the router checks the bytes.' },
      { q: 'What happens to an unknown type?', a: 'It’s quarantined, not guessed, so a bad file can’t quietly produce empty or garbage chunks.' },
      { q: 'Why does this matter for search quality?', a: 'An empty chunk set doesn’t raise an error — the document just disappears from search. Catching it at routing is far cheaper than finding it from a missing result.' }
    ],
    nums: [['3', 'checks: MIME → extension → header'], ['0', 'guessed types']]
  },
  'hd/extract': {
    short: 'Extraction has one handler per format, and each emits the same normalized text plus metadata: PyMuPDF for text PDFs, pdfplumber where tables matter, python-docx, BeautifulSoup for HTML, and OCR as the last resort. Everything downstream is format-blind.',
    qa: [
      { q: 'Why one common output shape?', a: 'Adding a format becomes one handler, not a new pipeline, and chunking, embedding and indexing never need to know where a document came from.' },
      { q: 'Why two PDF libraries?', a: 'PyMuPDF is fast for text PDFs; pdfplumber is used where tables matter, and spec sheets are table-heavy.' },
      { q: 'When does OCR run?', a: 'Last resort — for scanned documents, after the text-based handlers.' }
    ],
    nums: [['5', 'handlers including OCR'], ['1', 'normalized output shape']]
  },
  'hd/chunk': {
    short: 'Split and chunk turns guides and specs into retrievable passages that keep their context. spaCy sentence boundaries plus recursive splitting with overlap keep a DIY step with the step before it, and spec tables intact. A how-to step retrieved without its preceding step is worse than no result.',
    qa: [
      { q: 'Why not fixed-size windows?', a: 'They cut steps and tables in half. Sentence-aware recursive chunking with overlap keeps each step and each spec table whole.' },
      { q: 'What went wrong with new SKUs?', a: 'They arrived with thin, inconsistent text and got weak embeddings. The fix was enriching the text before embedding, not a better model.' },
      { q: 'How do you handle tables?', a: 'They’re kept intact as one unit, because the spec table is usually the answer.' }
    ],
    nums: [['spaCy', 'sentence boundaries'], ['overlap', 'between neighbouring chunks']],
    push: { q: 'How did you choose the chunk size?', a: 'By replaying it against the benchmark sets — scoring chunking choices on the same NDCG and MRR as ranking changes.', check: 1 }
  },
  'hd/emb': {
    short: 'Embeddings come from all-mpnet-base-v2, self-hosted in-cluster, producing 768-dimensional vectors. Document content never leaves the security boundary. Hosted embeddings arrived on Azure late in the engagement and were treated as a migration, not the starting point.',
    qa: [
      { q: 'Why self-host?', a: 'It was what actually existed for most of this timeline, and it kept the corpus inside the ISO 27001 boundary. Period-correct and secure.' },
      { q: 'How do you handle an embedding model change?', a: 'The model version is recorded per chunk, so a change is a versioned re-embed, not a silent mix of vectors in one index.' },
      { q: 'How do new products get good embeddings?', a: 'Normalize and enrich their text first. Thin SKU text produced weak vectors no matter the model.' }
    ],
    nums: [['768', 'dimensions'], ['in-cluster', 'serving'], ['ISO 27001', 'boundary']],
    push: { q: 'Wasn’t a hosted API simpler?', a: 'Less to operate, yes. Self-hosting won because it existed for most of the timeline and it kept the corpus inside the ISO 27001 boundary.' }
  },
  'hd/dual': {
    short: 'Dual-write puts every chunk into both FAISS and Elasticsearch, idempotently and with a version. Both indexes are derived from one versioned chunk set, so they can’t disagree about what a document says — and re-running a batch is safe: same version, same result.',
    qa: [
      { q: 'What problem did it solve?', a: 'The two indexes drifting apart — one rebuilt, one not — produced the most confusing bugs on the platform. Versioned dual-write is what stopped it.' },
      { q: 'What does idempotent mean here?', a: 'Re-running a batch writes the same version and produces the same result, so retries and replays are safe.' },
      { q: 'Can you rebuild one index alone?', a: 'Yes — each index can be rebuilt independently from the same versioned chunk set.' }
    ],
    nums: [['2', 'targets: FAISS · Elasticsearch'], ['1', 'versioned chunk set']],
    push: { q: 'What if one write succeeds and the other fails?', a: 'The version makes it detectable and the write is idempotent, so the batch is simply re-run until both indexes hold the same version.', check: 1 }
  },
  'hd/storage': {
    short: 'Storage and lineage is where state lives — Cosmos DB and PostgreSQL — with the embedding model version recorded per chunk. Every answer resolves to the chunks it cited, the index version they came from, and the embedding model that produced them.',
    qa: [
      { q: 'Why record the embedding model per chunk?', a: 'Vectors from different models aren’t comparable. Recording the version means a migration can’t silently mix them in one index.' },
      { q: 'What can you reconstruct for an answer?', a: 'Its cited chunks, the index version they came from, and the embedding model that produced them.' },
      { q: 'How did that help the hosted-embedding migration?', a: 'Because each chunk carries its model version, moving to hosted embeddings could be a tracked re-embed rather than a big-bang switch.', check: 1 }
    ],
    nums: [['per chunk', 'embedding version'], ['2', 'stores: Cosmos DB · PostgreSQL']]
  },
  'hd/obs': {
    short: 'Observability covers retrieval, ranking and serving: Elasticsearch into Kibana for logs, Prometheus and Grafana for metrics. Per-stage latency makes a p95 regression attributable to one stage, and ranking quality is tracked continuously, because it drifts with the catalog.',
    qa: [
      { q: 'Why monitor ranking quality continuously?', a: 'The catalog never sits still, so ranking quality drifts. Testing only at release would miss that.' },
      { q: 'How do you debug a p95 regression?', a: 'Per-stage latency points at the stage — preprocessing, either retriever, fusion, rerank or synthesis.' },
      { q: 'What’s on the dashboards?', a: 'Latency per stage against the SLO, and ranking quality — NDCG and MRR — tracked over time.' }
    ],
    nums: [['<900 ms', 'p95 SLO'], ['NDCG / MRR', 'tracked continuously']],
    push: { q: 'How do you measure ranking quality without production labels?', a: 'Against the benchmark judgment sets on a schedule, plus the live search-success signal from sessions.', check: 1 }
  },
  'hd/sec': {
    short: 'Security and governance: TSC Identity issues the caller token, RBAC policy feeds decide what each role can see, and the ISO 27001 boundary is why embeddings ran in-cluster. Self-hosting the embedder was a security decision before it was a cost decision.',
    qa: [
      { q: 'How is access enforced?', a: 'The token identifies the caller, RBAC decides the role’s scope, and that scope is applied as a filter inside the search query — not on the results page.' },
      { q: 'What did ISO 27001 change about the architecture?', a: 'It’s why the embedder was self-hosted: document content never left the security boundary.' },
      { q: 'Where are ACLs defined?', a: 'Captured at ingestion as tags on each chunk, and enforced at query time from those same tags.' }
    ],
    nums: [['ISO 27001', 'boundary'], ['in-cluster', 'embedding, by design']],
    push: { q: 'Did GPT-3.5-Turbo break that boundary?', a: 'It ran on Azure in Phase 3, and it only ever saw the reranked passages the user was already allowed to retrieve.', check: 1 }
  }
});

/* ============================ Citibank ============================
   Three workloads share one governance spine; boxes that are the same in
   every workload are written once and reused. */
(() => {
  const spine = {
    short: 'Every Citibank workload — fraud, credit and AML — goes through the same governance spine. Notebooks become production scripts, Jenkins builds and versions them with Terraform for the infrastructure, one immutable image digest is promoted from dev to UAT to production, and SageMaker trains, evaluates, packages and registers into MLflow. Nothing reaches an endpoint outside this path.',
    qa: [
      { q: 'Why one path for three very different models?', a: 'It let model risk validate the pipeline once and trust every model that comes through it. Fraud, credit and AML have very different shapes, but the promotion path, the lineage and the gates are the same.' },
      { q: 'What did governance look like before?', a: 'Models lived on laptops with governance by spreadsheet, and validators were reconstructing models instead of validating them. Getting models off laptops was the whole first phase.' },
      { q: 'How do you prove a model is reproducible?', a: 'Lineage is captured at train time — data version, code and params — and training data is immutable and versioned. The POC gate was rebuilding a model from its record alone, and model risk accepted it.' },
      { q: 'What was the outcome?', a: '100% of deployments carry lineage: every endpoint traces to its data version, code commit, params and the validation record that cleared it.' }
    ],
    nums: [['100%', 'deploys with lineage'], ['1', 'governed path to production'], ['3', 'workloads: fraud · credit · AML'], ['dev → UAT → prod', 'one digest promoted']],
    push: { q: 'Doesn’t one path slow every team down to the speed of review?', a: 'The review queue was the real bottleneck, and bottlenecks breed shortcuts. We didn’t validate less — the pipeline packages the evidence up front, so validators validate instead of reconstructing.' }
  };
  const devs = {
    short: 'This is where the work starts — and where it used to stop. Models lived on laptops with governance by spreadsheet, and the POC finding was that they couldn’t be validated that way. So the first control was turning notebooks into versioned production scripts before anything else happens.',
    qa: [
      { q: 'What was wrong with notebooks?', a: 'Nothing, for exploration. In production they meant models validators couldn’t reproduce — reproduction was archaeology, and sometimes impossible.' },
      { q: 'What changed for the modellers?', a: 'Their notebooks become versioned production scripts, built by Jenkins and trained as a pinned SageMaker job, with params and metrics logged automatically rather than by convention.' }
    ],
    nums: [['1st', 'control: scripts before anything else']],
    push: { q: 'Didn’t the modellers push back?', a: 'The argument that worked was time: validators had been reconstructing models instead of validating them, and the review queue was the bottleneck. Scripts plus lineage made approvals faster, not slower.', check: 1 }
  };
  const jenkins = {
    short: 'Jenkins builds, tests and versions every model artifact, and Terraform manages the infrastructure beside it — IAM, VPC, KMS and SageMaker. If an environment can’t be rebuilt from code, it can’t be evidence, so environment parity is a control, not a convenience.',
    qa: [
      { q: 'Why does infrastructure as code matter for model risk?', a: 'Validators need to know the model ran in the environment that was tested. Terraform makes every environment rebuildable from code, and a change to infrastructure is a reviewed change.' },
      { q: 'What does Terraform manage?', a: 'IAM, VPC, KMS and SageMaker — the infrastructure the models train and serve in.' }
    ],
    nums: [['IaC', 'Terraform-managed'], ['4', 'scopes: IAM · VPC · KMS · SageMaker']]
  };
  const ecr = {
    short: 'Amazon ECR holds one image, built once and referenced by digest everywhere. The digest — not a tag — is promoted through every environment, and nothing is rebuilt for UAT or production. Production runs the exact bytes that passed the gates.',
    qa: [
      { q: 'Why a digest instead of a tag?', a: 'A tag can be moved to point at different bytes; a digest can’t. Promoting the digest means what was validated is exactly what runs.' },
      { q: 'Why not rebuild per environment?', a: 'A rebuild means production runs an artifact nobody tested.' }
    ],
    nums: [['1', 'build per change'], ['0', 'rebuilds for UAT or production']]
  };
  const cp = {
    short: 'CodePipeline promotes the same digest through dev, UAT and production. The honest migration story: orchestration was Step Functions plus Jenkins through 2020, because SageMaker Pipelines didn’t exist yet, and we consolidated after its GA at re:Invent 2020, in the last eight months of the engagement.',
    qa: [
      { q: 'Why migrate?', a: 'The glue between Step Functions and Jenkins drifted and broke silently. Consolidating onto one orchestrator removed a whole class of invisible failure.' },
      { q: 'Why bring up the timing?', a: 'Because it’s true: the migration was late in the engagement, and I’d rather date it accurately than claim it from day one.' }
    ],
    nums: [['re:Invent 2020', 'SageMaker Pipelines GA'], ['8 months', 'on the consolidated pipeline'], ['3', 'environments']],
    push: { q: 'So what did you run before?', a: 'Step Functions and Jenkins with an MLflow registry. It worked, but the glue between them was where silent failures lived.' }
  };
  const cont = {
    short: 'Most weeks the answer to the monitoring question is no, and the model keeps serving. But continuing is a recorded outcome of the monitoring question, not the absence of one.',
    qa: [
      { q: 'Why record a “no”?', a: 'Because the question an auditor asks is whether the model was monitored, not only whether it failed. A recorded “no drift, continue” is evidence that it was.' }
    ],
    nums: [['most weeks', 'the answer is no']]
  };
  const mrmNo = {
    short: 'The model-risk gate’s No branch: remediate and resubmit. The finding is addressed, the evidence is repackaged, and the model re-enters the same gate. MRM says no more often than people expect, and that’s the control working.',
    qa: [
      { q: 'Can you negotiate a finding?', a: 'No — a formal resubmission beats negotiating. The model developers own the fix, and the model goes back through the same gate.' }
    ],
    nums: [['1', 'way back: the same gate']]
  };
  const reg = (extra) => ({
    short: 'MLflow is the one place a model version can be promoted from. Every entry carries the code commit, image digest, data hash' + extra.what + ' and approval state, so a validator reads the record instead of reconstructing it. If it isn’t in the registry, it can’t be deployed — that constraint is the whole design.',
    qa: [
      { q: 'How do you stop people routing around the registry?', a: 'Nothing reaches an endpoint without a registry entry, and promotion only happens from there. That’s what makes 100% of deployments traceable.' },
      extra.qa,
      { q: 'Why MLflow?', a: 'MLflow tracking was in place from the POC for runs and artifacts, so its registry became the single source of truth with lineage on every registered model.' }
    ],
    nums: [['100%', 'deploys with lineage'], extra.num]
  });

  const C = {};
  ['fraud', 'credit', 'aml'].forEach(w => {
    C[`citi/${w}/R2`] = spine; C[`citi/${w}/dev`] = devs; C[`citi/${w}/jenkins`] = jenkins;
    C[`citi/${w}/ecr`] = ecr; C[`citi/${w}/cp`] = cp; C[`citi/${w}/no3`] = cont;
  });
  C['citi/fraud/no2'] = mrmNo; C['citi/credit/no2'] = mrmNo;

  /* ---------------- fraud ---------------- */
  Object.assign(C, {
    'citi/fraud/R1': {
      short: 'The fraud data plane turns authorization events into features, and late labels into a training set. Auth events stream from MSK and Kinesis alongside the S3 lake, RDS, device and merchant context. Ingest tokenizes PII and attaches lineage, Flink computes velocity and entity counters, the feature store writes online and offline from one definition, and the label store joins chargebacks back 30 to 90 days later.',
      qa: [
        { q: 'What was the most expensive class of bug?', a: 'Training-serving skew — a feature computed one way in a notebook and another way in serving changes model behavior in production with no code change anywhere. Computing features once on the stream and writing both stores from one definition removed it.' },
        { q: 'How do late labels change the design?', a: 'Chargebacks land 30 to 90 days after the transaction, so the training set is a point-in-time correct join with time-based splits. A random split would leak the future.' },
        { q: 'Why stream the features?', a: 'Fraud is scored inside the authorization window, so velocity and entity counters have to come from the stream. Slower context — device, merchant, customer — joins from the lake.' }
      ],
      nums: [['30–90 days', 'label lag'], ['<10 ms', 'online feature lookup, p99'], ['1', 'feature definition, two stores']],
      push: { q: 'How do you guarantee point-in-time correctness?', a: 'A training row only sees what was knowable at that moment: features and labels are joined as of the transaction time, and the training set is immutable and versioned so it can be rebuilt.' }
    },
    'citi/fraud/R3': {
      short: 'After the registry there are two gates and one loop. The technical gate checks PR-AUC, recall at a fixed false-positive rate and p99 latency; the model-risk gate is SR 11-7 validation with SHAP reason codes and MRM approval. Then shadow, canary, champion/challenger, real-time scoring and monitoring — and a drift breach re-enters the gates. Every No branch is a real outcome.',
      qa: [
        { q: 'What does “gates in the pipeline” mean in practice?', a: 'A failed gate is a failed build with a named next step — fix the data, or remediate and resubmit to model risk — not a debate in a meeting.' },
        { q: 'What happens when drift is detected?', a: 'It re-enters the governance spine. Drift triggers a governed retrain through every gate, not an automatic redeploy; there’s no fast path.' },
        { q: 'How do you roll back?', a: 'Revert the endpoint variant, or fall back to rules only. It’s instant, because the previous version is still live.' }
      ],
      nums: [['2', 'gates before serving'], ['<100 ms', 'p99 scoring'], ['0', 'fast paths around validation']],
      push: { q: 'Why not auto-redeploy on drift? It’s faster.', a: 'It was explicitly rejected. A model that reaches production without validation is an unapproved model, regardless of how it got there.' }
    },
    'citi/fraud/src': {
      short: 'The fraud source is the card authorization stream on MSK and Kinesis, plus slower customer, device and merchant context from the S3 lake and RDS. Fraud is scored inside the authorization window, so features have to come from the stream; everything slower joins from the lake.',
      qa: [
        { q: 'Why stream the auth events instead of batch-loading them?', a: 'Because scoring happens inside the authorization window. Velocity features computed in a nightly batch would be hours stale for exactly the attacks they’re meant to catch.' },
        { q: 'How do the three workloads differ at the source?', a: 'Fraud is an authorization stream measured in milliseconds. Credit is application data plus bureau files whose vintage has to be reproducible years later. AML is payment flows plus a pinned watchlist version. Same governance spine, three completely different data shapes.' }
      ],
      nums: [['ms', 'authorization window'], ['3', 'context: device · merchant · customer']]
    },
    'citi/fraud/ingest': {
      short: 'Ingest tokenizes PII with KMS-backed keys, encrypts, and attaches lineage before anything is stored, so a raw card number never reaches a feature. Schema and governance checks fail the batch, not the model.',
      qa: [
        { q: 'Why tokenize at ingest?', a: 'So raw PANs never reach a feature or a training set. Everything downstream works on tokens.' },
        { q: 'What happens when a check fails?', a: 'The batch fails. Governance checks run on the data before a model ever sees it, so a bad batch is stopped at the door instead of discovered in model behavior.' }
      ],
      nums: [['0', 'raw PANs in features'], ['KMS', 'backed tokenization']],
      push: { q: 'Doesn’t failing the batch delay scoring?', a: 'It delays training data, not live scoring — scoring reads the online store. A delayed batch is visible and fixable; a bad batch inside a training set isn’t.', check: 1 }
    },
    'citi/fraud/sfc': {
      short: 'Stream feature compute runs Flink on Kinesis Analytics to produce velocity, entity and device counters inside the authorization window. The same definitions feed the offline store for training, so velocity features are computed once, on the stream, and written to both stores.',
      qa: [
        { q: 'Why compute on the stream instead of at scoring time?', a: 'Recomputing at scoring time adds latency inside the authorization window and a second implementation that can drift from training. Computing once on the stream gives one definition for both.' },
        { q: 'What kind of features?', a: 'Velocity counters — how often a card, device or merchant shows up in a time window — plus entity and device counters.' }
      ],
      nums: [['1', 'definition → online + offline'], ['sub-second', 'counters']]
    },
    'citi/fraud/fs': {
      short: 'The feature store serves one feature definition to both training and inference: DynamoDB online at p99 under 10 milliseconds, S3 and Glue offline. It exists to kill training-serving skew, with point-in-time correctness so a training row only sees what was knowable then.',
      qa: [
        { q: 'What is training-serving skew and why does it matter?', a: 'A feature computed one way in a notebook and another way in serving changes model behavior in production with no code change anywhere. It was the most expensive class of bug on the platform.' },
        { q: 'Did you build or buy?', a: 'Before SageMaker Feature Store existed, it was a hand-rolled DynamoDB plus Glue arrangement. The migration was worth it for the parity guarantee, not the convenience.' },
        { q: 'What latency does the online store hit?', a: 'p99 under 10 milliseconds on DynamoDB, which leaves room inside the 100-millisecond scoring budget.' }
      ],
      nums: [['<10 ms', 'online p99'], ['1', 'definition, two stores']],
      push: { q: 'How would you prove there’s no skew?', a: 'Both stores are written from the same definition and the online lookup sits on the same code path as training. On top of that, I’d compare the feature values logged with each decision against the offline values for the same transactions.', check: 1 }
    },
    'citi/fraud/labels': {
      short: 'Fraud labels arrive late: a chargeback or dispute lands 30 to 90 days after the transaction. The label store joins those outcomes back to the originating transaction, and that lag is why training sets are split by time, never at random.',
      qa: [
        { q: 'Why not a random split?', a: 'A random train/test split on fraud data leaks the future. The label lag forces a time-based split.' },
        { q: 'How does the lag affect monitoring?', a: 'Input drift shows up immediately, but performance doesn’t — you only know whether the model was right once chargebacks arrive. That’s why monitoring reconciles late labels against decisions.' }
      ],
      nums: [['30–90 days', 'chargeback lag']],
      push: { q: 'What do you do about the most recent 90 days?', a: 'They’re unlabeled or partly labeled, so they’re kept out of training and watched through drift metrics until the chargebacks land.', check: 1 }
    },
    'citi/fraud/tset': {
      short: 'The curated training set is a point-in-time correct join of features and late labels, with time-based train, validation and test splits. It’s immutable and versioned — every training run points at a version, never a mutable path — and it’s the first thing a validator asks for.',
      qa: [
        { q: 'What does point-in-time correct mean?', a: 'A training row only sees what was knowable at that moment. Any join that leaks a later feature value or label produces a model that looks brilliant offline and fails live.' },
        { q: 'Why immutable?', a: '“Rebuild the model from eight months ago” is only answerable if the data was immutable at the time.' }
      ],
      nums: [['3', 'splits by time: train · val · test']],
      push: { q: 'How would you catch leakage?', a: 'Suspiciously good offline metrics are the first signal. The structural fix is the as-of join and time-based splits; the check is that performance holds on a later time window.', check: 1 }
    },
    'citi/fraud/train': {
      short: 'Training is a SageMaker Pipeline job — train XGBoost, evaluate, package, register — with pinned code, container, dependencies and data version, and params and metrics logged automatically. Without it, reproduction was archaeology; that finding unlocked the whole programme.',
      qa: [
        { q: 'Why XGBoost for fraud?', a: 'It handles tabular, mixed features well, scores fast enough for the authorization window, and gives per-decision SHAP reason codes for model risk.', check: 1 },
        { q: 'What makes it reproducible?', a: 'Pinned container, pinned dependencies, pinned data version, and automatic logging of params and metrics — so a model can be rebuilt from its record.' }
      ],
      nums: [['4', 'steps: train · evaluate · package · register']],
      push: { q: 'What did “archaeology” mean?', a: 'Rebuilding a model meant digging through laptops, spreadsheets and half-remembered parameters — and sometimes it simply wasn’t possible.' }
    },
    'citi/fraud/reg': reg({ what: '', qa: { q: 'What’s in a registry entry?', a: 'Code commit, image digest, data hash and approval state — the lineage and the validation status together.' }, num: ['4', 'fields: commit · digest · data hash · approval'] }),
    'citi/fraud/g1': {
      short: 'The technical gate checks three things: PR-AUC, recall at a fixed false-positive rate, and p99 latency. All three pass or there’s no promotion. Recall at a fixed FPR is the headline, because the cost of a false decline is a customer-experience number we weigh explicitly.',
      qa: [
        { q: 'Why not accuracy?', a: 'With fraud this rare, accuracy is meaningless — a model that approves everything looks excellent. PR-AUC and recall at a fixed false-positive rate measure what matters: catching fraud without declining good customers.' },
        { q: 'Why is latency part of a model gate?', a: 'Scoring happens inside the authorization window, with a p99 budget under 100 milliseconds. A more accurate model that misses the window is a worse model.' },
        { q: 'What happens on a fail?', a: 'Fail fast: notify and fix the data. A technical gate failure is almost always a data problem first — a feature drifted or a label lagged.' }
      ],
      nums: [['3', 'checks: PR-AUC · recall@FPR · p99'], ['<100 ms', 'p99 scoring budget']],
      push: { q: 'How do you pick the false-positive rate?', a: 'It’s a business decision: the false-decline rate the bank will accept for customer experience. The gate holds recall at that fixed rate, so models are compared on the same terms.', check: 1 }
    },
    'citi/fraud/g2': {
      short: 'The model-risk gate is a second line of defence that doesn’t report to the people who built the model. It’s SR 11-7 validation — conceptual soundness, data, testing and the monitoring plan — with SHAP reason codes and MRM approval. The pipeline packages the evidence, so validators validate instead of reconstructing.',
      qa: [
        { q: 'How did you speed up validation?', a: 'Not by validating less. The review queue was the real bottleneck, and bottlenecks breed shortcuts, so the pipeline packages the evidence up front — it arrives complete.' },
        { q: 'What does SR 11-7 require?', a: 'Independent validation of conceptual soundness, data, testing and the monitoring plan, plus champion/challenger evidence and periodic revalidation.' },
        { q: 'Why SHAP?', a: 'Model risk needs to see why a model scores what it does. SHAP gives per-decision reason codes for a tree model like XGBoost.', check: 1 }
      ],
      nums: [['SR 11-7', 'standard'], ['2nd', 'line of defence']],
      push: { q: 'What happens when MRM says no?', a: 'Remediate and resubmit — a formal resubmission, not negotiating the finding. MRM says no more often than people expect, and that’s the control working.' }
    },
    'citi/fraud/s1': {
      short: 'Release is progressive: shadow first, scoring every transaction with no effect; then a canary on a small share of real traffic; then champion/challenger as a variant on the endpoint. Nothing goes from validated to 100% in one step, and the champion/challenger evidence is what MRM sees at the next review.',
      qa: [
        { q: 'What does shadow mode tell you?', a: 'How the new model scores real production traffic, with no customer impact, before any decision depends on it.' },
        { q: 'How does rollback work?', a: 'Revert the variant, or fall back to rules only. It’s instant because the previous version is still live.' }
      ],
      nums: [['3', 'stages: shadow → canary → variant']]
    },
    'citi/fraud/s2': {
      short: 'Production scoring runs inside the authorization window: API Gateway to a decision service to the SageMaker endpoint, at p99 under 100 milliseconds, with the online feature lookup on the same code path as training. It’s the only route to production, and it only accepts registered, validated versions.',
      qa: [
        { q: 'How do you stay under 100 ms?', a: 'Features are precomputed on the stream and read from DynamoDB at p99 under 10 milliseconds, so the endpoint isn’t computing them at request time.' },
        { q: 'Why the same code path as training?', a: 'A serving-side reimplementation is exactly how training-serving skew happens.' }
      ],
      nums: [['<100 ms', 'p99 scoring'], ['<10 ms', 'feature lookup']],
      push: { q: 'What if the endpoint is unavailable?', a: 'Rules-only is the fallback — the same path used for rollback — so authorization never waits on the model.', check: 1 }
    },
    'citi/fraud/s3': {
      short: 'Monitoring watches for the slow failure, not the loud one: CloudWatch metrics, PSI for input drift, and label reconciliation that compares late chargebacks against decisions. Every decision is in a Splunk log with its model version, and thresholds are agreed with model risk, not chosen by the modelling team.',
      qa: [
        { q: 'Why isn’t drift monitoring enough?', a: 'PSI catches input drift; only reconciling late chargebacks against decisions shows whether the model is still right.' },
        { q: 'What failure were you guarding against?', a: 'Models degrading slowly with no signal until a business metric moved — by then the damage was months old.' },
        { q: 'Who sets the thresholds?', a: 'They’re agreed with model risk, not chosen by the modelling team.' }
      ],
      nums: [['PSI', 'input drift'], ['30–90 days', 'until labels confirm']],
      push: { q: 'What’s the dangerous failure?', a: 'Not an outage. Six months of quiet decay.' }
    },
    'citi/fraud/q': {
      short: 'The monitoring question: drift or degradation detected? Yes re-enters the governance spine — retrain from training and back through every gate. There’s no fast path and no emergency route around validation.',
      qa: [
        { q: 'Why not auto-redeploy on drift?', a: 'It was explicitly rejected. A model that reaches production without validation is an unapproved model, regardless of how it got there.' },
        { q: 'What about a real emergency?', a: 'Rollback is the emergency lever — a variant revert or rules-only — not an unvalidated model.' }
      ],
      nums: [['0', 'fast paths']]
    },
    'citi/fraud/no1': {
      short: 'The technical gate’s No branch: fail fast, notify, and fix the data. A technical gate failure is almost always a data problem first — a feature drifted, a label lagged — so the fix goes to the data plane, not the hyperparameters.',
      qa: [
        { q: 'Why not just tune the model?', a: 'Tuning around a data problem hides it. If a feature drifted or a label lagged, the next model inherits the same problem.' }
      ],
      nums: [['data', 'engineering owns the fix']]
    },
    'citi/fraud/mid': {
      short: 'Rollback is a variant revert or a rules-only fallback, and it’s instant because the previous version is still live. We never took the old model down.',
      qa: [
        { q: 'Why keep the old variant live?', a: 'So rollback is a routing change, not a redeploy.' }
      ],
      nums: [['instant', 'rollback'], ['2', 'options: revert · rules-only']]
    }
  });

  /* ---------------- credit ---------------- */
  Object.assign(C, {
    'citi/credit/R1': {
      short: 'The credit data plane turns bureau data into vintages, samples and a reason-code map. Bureau and core-banking files are balanced against control totals and tokenized, the curated zone holds immutable dated snapshots, the vintage store fixes the good/bad definition, the development sample splits dev, holdout and out-of-time with a snapshot hash, and WOE binning designs the reason codes.',
      qa: [
        { q: 'How is credit data different from fraud?', a: 'Credit models are trained on cohorts observed at one date and judged at a later one. It’s files and vintages, not a stream, and reproducibility over years matters more than latency.' },
        { q: 'Which sample matters most?', a: 'Out-of-time. In-time holdout flatters every credit model because the economy hasn’t changed.' },
        { q: 'Where do reason codes come from?', a: 'They’re designed at binning time. Monotonic WOE binning makes the reason-code map a property of the model structure.' }
      ],
      nums: [['3', 'samples: dev · holdout · out-of-time'], ['3', 'bureaus'], ['WOE', 'monotonic binning']],
      push: { q: 'Why vintages instead of row-level sampling?', a: 'A loan’s outcome is only known after a performance window. Fixing observation and outcome dates per cohort keeps the good/bad definition stable and the sample reproducible.' }
    },
    'citi/credit/R3': {
      short: 'For credit, the gates are discriminatory power — KS, Gini, PSI and 100% reason-code coverage — and model risk plus fair lending under SR 11-7 and Reg B. Scoring is batch, monthly and at origination; decisions carry adverse-action reason codes; every score is retained with its model and policy version; and degradation or the annual revalidation clock re-enters the gates.',
      qa: [
        { q: 'Why is reason-code coverage a hard gate?', a: 'Every declined applicant gets an adverse-action notice with reasons. 100% coverage, not most — the notice is a legal artifact.' },
        { q: 'What triggers revalidation?', a: 'Degradation, or the calendar. Credit runs on an annual revalidation clock driven by the model inventory, because a quiet model still has to be re-examined.' },
        { q: 'Who can veto a model?', a: 'Model risk under SR 11-7, and fair lending independently, reviewing for disparate impact under Reg B.' }
      ],
      nums: [['100%', 'reason-code coverage'], ['30 days', 'Reg B notice'], ['annual', 'revalidation']],
      push: { q: 'Why batch instead of real time?', a: 'Credit decisioning barely depends on latency, and reproducibility matters enormously. Batch Transform runs monthly for the book and on demand at origination.' }
    },
    'citi/credit/src': {
      short: 'Bureau files from Experian, Equifax and TransUnion, plus application, balance and payment data from core banking. An adverse action can be challenged long after the decision, so the bureau vintage has to be reproducible years later — we retained vintages rather than refreshing in place.',
      qa: [
        { q: 'Why keep old bureau files?', a: 'Reproducing a decline means reproducing the bureau file exactly as it was on that day. Refreshing in place would destroy the evidence.' },
        { q: 'How is that different from fraud?', a: 'Fraud is a millisecond stream; credit is files where the file vintage itself is evidence.' }
      ],
      nums: [['3', 'bureaus'], ['years', 'that a decision must stay reproducible']]
    },
    'citi/credit/ingest': {
      short: 'Bureau files are balanced against control totals, checked against a schema contract and tokenized with KMS before loading. If the bureau file doesn’t balance, nothing downstream runs.',
      qa: [
        { q: 'Why balance before loading?', a: 'A missing tranche of records is a governance event, not a data-quality footnote. Discovering it in the model is far too late.' }
      ],
      nums: [['0', 'unbalanced files loaded'], ['KMS', 'tokenization']]
    },
    'citi/credit/cdz': {
      short: 'The curated data zone is immutable, dated snapshots in S3 and Glue with Redshift marts — the credit-risk version of the feature store. Every training run points at a dated snapshot, never a mutable table.',
      qa: [
        { q: 'Why snapshots instead of a curated table?', a: '“Rebuild the model from eight months ago” is only answerable if the data was immutable at the time.' },
        { q: 'What does a validator ask for first?', a: 'The dataset behind the model — frozen and addressable.' }
      ],
      nums: [['dated', 'immutable snapshots'], ['Redshift', 'marts']]
    },
    'citi/credit/vint': {
      short: 'The performance store fixes the good/bad definition at an observation date and an outcome date. A vintage is a cohort observed at one date and judged at a later one, and realized outcomes rejoin here for back-testing. Credit models are trained on vintages, not rows.',
      qa: [
        { q: 'Why a fixed window rather than a rolling one?', a: 'Fixed dates keep the label definition stable and reproducible. A rolling window changes what “bad” means between runs.', check: 1 },
        { q: 'What’s back-testing here?', a: 'Comparing what the model predicted for a vintage with the outcomes that actually happened, once they rejoin the store.' }
      ],
      nums: [['2', 'dates: observation · outcome']]
    },
    'citi/credit/dsample': {
      short: 'The development sample is split into dev, holdout and out-of-time, each with a snapshot hash. Out-of-time is the sample that matters — in-time holdout flatters every credit model because the economy hasn’t changed.',
      qa: [
        { q: 'Why does out-of-time matter more?', a: 'It’s the closest thing to the future the model will face. In-time holdout shares the economic conditions of training, so it flatters every model.' },
        { q: 'What’s the snapshot hash for?', a: 'It pins exactly which data each sample came from, so a validator can reproduce it.' }
      ],
      nums: [['3', 'samples'], ['1', 'hash per sample']]
    },
    'citi/credit/seg': {
      short: 'Segmentation and weight-of-evidence binning with monotonic constraints is where reason codes are designed in, not bolted on. The reason-code map is a property of the binning, so adverse-action notices fall out of the model structure.',
      qa: [
        { q: 'Why not explain the model afterwards with SHAP?', a: 'A post-hoc explanation on an unconstrained model is not a Reg B reason code. The constraint has to be in the structure.' },
        { q: 'What does monotonic mean here?', a: 'Risk only moves one way across a variable’s bins, so the reason a score went down is always coherent and explainable to the applicant.' }
      ],
      nums: [['100%', 'declines with reason codes']],
      push: { q: 'Doesn’t the constraint cost accuracy?', a: 'Sometimes a little — that’s the trade. The XGB challenger is monotonically constrained too: if it can’t explain a decline, it can’t win.', check: 1 }
    },
    'citi/credit/train': {
      short: 'Credit training produces a PD scorecard — logistic regression on WOE bins — as the champion, a monotonically constrained XGBoost challenger, and LGD and EAD models, all as pinned, reproducible SageMaker jobs.',
      qa: [
        { q: 'Why keep a logistic scorecard as champion?', a: 'It’s explainable by construction. The XGB challenger is constrained so its reason codes stay legitimate — if it can’t explain a decline, it can’t win.' },
        { q: 'What are LGD and EAD?', a: 'Loss given default and exposure at default. Together with PD they make up expected loss, which is what flows downstream into reserving.' }
      ],
      nums: [['3', 'models: PD · LGD · EAD'], ['1', 'constrained challenger']]
    },
    'citi/credit/reg': reg({ what: ', the cut-off policy', qa: { q: 'Why version the cut-off policy with the model?', a: 'A decision is the model plus the cut-off. Versioning them together means a decline from years ago can be reproduced exactly.' }, num: ['5', 'fields incl. cut-off policy'] }),
    'citi/credit/g1': {
      short: 'The discriminatory-power gate: KS, Gini and PSI — and every declined applicant must have a reason code. 100%, not most. Reason-code coverage is a hard gate, not a report.',
      qa: [
        { q: 'What do KS and Gini tell you?', a: 'How well the score separates goods from bads. PSI checks that the population hasn’t shifted away from development.' },
        { q: 'Why 100% coverage?', a: 'Every decline gets an adverse-action notice, and a decline without a reason code can’t be explained to the applicant.' },
        { q: 'What if it fails?', a: 'Redevelop or rebin the sample. The fix is usually in the sample or the bins, not the estimator.' }
      ],
      nums: [['100%', 'reason codes'], ['3', 'metrics: KS · Gini · PSI']]
    },
    'citi/credit/g2': {
      short: 'Model risk plus fair lending: SR 11-7 validation and a separate fair-lending review for disparate impact under Reg B. Fair lending has its own independent veto, and the pipeline packages the evidence so validators validate instead of reconstructing.',
      qa: [
        { q: 'Why a separate fair-lending reviewer?', a: 'Disparate impact is its own legal question under Reg B. A separate reviewer with an independent veto beat folding it into model risk.' },
        { q: 'How did you shorten the review queue?', a: 'By making the evidence arrive complete. The pipeline packages it, so reviewers validate instead of reconstructing — faster without weakening the control.' }
      ],
      nums: [['2', 'independent reviews'], ['Reg B', 'fair lending']]
    },
    'citi/credit/s1': {
      short: 'Credit scoring is SageMaker Batch Transform — monthly for the whole book, and on demand at origination. A real-time endpoint isn’t needed for a decision where latency barely matters and reproducibility matters enormously.',
      qa: [
        { q: 'Why batch?', a: 'Because nothing about a credit decision needs millisecond latency, and a batch job is simpler to reproduce exactly.' },
        { q: 'What runs monthly?', a: 'Scoring the existing book, which also feeds downstream use in stress testing and reserving.' }
      ],
      nums: [['monthly', 'book scoring'], ['on demand', 'at origination']]
    },
    'citi/credit/s2': {
      short: 'The decision applies cut-offs and line assignment, and every decline carries reason codes for the Reg B adverse-action notice, due within 30 days. The cut-off policy is versioned in the registry alongside the model.',
      qa: [
        { q: 'Why version the cut-off with the model?', a: 'The decision depends on both. Keeping the cut-off in a config file means a past decision can’t be reproduced reliably.' },
        { q: 'What’s the 30-day requirement?', a: 'Reg B requires the adverse-action notice within 30 days, and the reason codes have to be right the first time.' }
      ],
      nums: [['30 days', 'Reg B notice']]
    },
    'citi/credit/s3': {
      short: 'Every score is retained in a Splunk log with its model and policy version — and the inputs as served, not as recomputed — so a decision from years ago can be reproduced.',
      qa: [
        { q: 'Why keep the inputs as served?', a: 'Recomputing them later uses today’s data and code. Reproducing a decision means reproducing the inputs too, not just the model.' }
      ],
      nums: [['every', 'score retained'], ['3', 'recorded: score · model · policy version']]
    },
    'citi/credit/q': {
      short: 'Credit re-enters the model-risk gate on degradation or on the annual revalidation clock. The clock is driven by the model inventory, not by a detector — a quiet model still has to be re-examined.',
      qa: [
        { q: 'Why a calendar-driven review?', a: 'Detectors only catch what they’re built to see. A calendar review re-examines the model even when nothing has alarmed.' },
        { q: 'Why annual for credit?', a: 'Credit models feed the bank’s capital numbers through CCAR, DFAST and CECL.' }
      ],
      nums: [['annual', 'revalidation']]
    },
    'citi/credit/no1': {
      short: 'The discriminatory-power gate’s No branch: redevelop or rebin the sample. If reason-code coverage or KS fails, the fix is usually in the sample or the bins, not in the estimator.',
      qa: [
        { q: 'Why go back to binning instead of retuning?', a: 'Coverage and separation problems usually come from the sample or the bins. Retuning the estimator around them hides the cause.' }
      ],
      nums: [['1', 'way back: segmentation + binning']]
    },
    'citi/credit/mid': {
      short: 'Scores also flow downstream into CCAR and DFAST stress testing and CECL reserving. A credit model is an input to the bank’s capital numbers, which is why the revalidation clock is annual.',
      qa: [
        { q: 'Why does downstream use matter to the model team?', a: 'Because a change to the model changes regulatory capital and reserve numbers, not just decisions — so change control and revalidation are stricter.', check: 1 }
      ],
      nums: [['3', 'downstream: CCAR · DFAST · CECL']]
    },
    'citi/credit/inv': {
      short: 'The model inventory is the bank-wide register that makes SR 11-7 enforceable: owner, tier, validation status and revalidation date for every model. You can’t govern models you can’t enumerate.',
      qa: [
        { q: 'What does the inventory drive?', a: 'The revalidation clock — annual for credit — independent of any drift signal.' },
        { q: 'Why does it matter?', a: 'SR 11-7 applies to every model. Without a complete register, there’s no way to know which ones are overdue.' }
      ],
      nums: [['4', 'fields: owner · tier · status · date']]
    }
  });

  /* ---------------- AML ---------------- */
  Object.assign(C, {
    'citi/aml/R1': {
      short: 'The AML data plane turns payment flows and watchlists into resolved entities, typology features and a one-in-a-thousand label. Wires, SWIFT, ACH, card and cash land in one canonical schema; OFAC and PEP lists are versioned daily; entity resolution builds the counterparty graph; and the label is an investigator disposition or a SAR outcome.',
      qa: [
        { q: 'Why resolve entities before computing features?', a: 'Structuring and layering are graph patterns. You can’t see them without resolving the parties first.' },
        { q: 'What’s the base rate?', a: 'About one productive alert in a thousand. Every metric has to keep that visible.' },
        { q: 'What gets pinned together?', a: 'The rule set, the model and the watchlist version, as one unit.' }
      ],
      nums: [['~1 in 1,000', 'productive alerts'], ['5', 'payment rails'], ['daily', 'watchlist versions']],
      push: { q: 'Why not a generic anomaly detector?', a: 'Typology features beat generic anomaly scores. The bank is obliged to detect specific typologies, and coverage is checked typology by typology.' }
    },
    'citi/aml/R3': {
      short: 'For AML, the detection gate checks precision and recall on SAR labels and typology coverage; the compliance gate is above-the-line and below-the-line testing, SR 11-7 validation and the BSA officer’s sign-off. Then two lanes — pre-transaction OFAC screening and nightly rules-engine alerts — with the model ranking the investigator queue, and typology drift re-entering ATL/BTL testing.',
      qa: [
        { q: 'What does the model actually decide?', a: 'It ranks alerts. It never closes one — auto-closing would be unmonitored dismissal of suspicious activity. A human still closes every alert.' },
        { q: 'What is ATL/BTL testing?', a: 'Sampling alerts above and below the threshold to prove the alerting threshold isn’t hiding activity underneath it. The BSA officer signs that evidence package.' },
        { q: 'What triggers re-entry?', a: 'Typology drift or a coverage gap re-enters ATL/BTL testing, rather than retuning a threshold in place.' }
      ],
      nums: [['~1 in 1,000', 'productive alerts'], ['2', 'lanes: screening · monitoring'], ['0', 'alerts auto-closed']],
      push: { q: 'Isn’t the ML the easy part here?', a: 'Yes. AML is the clearest case on the platform where the ML is easy and the governance is the entire job.' }
    },
    'citi/aml/feeds': {
      short: 'Transaction feeds cover every rail — wires, SWIFT, ACH, card and cash — landing in one canonical schema, so a typology can be seen across rails, which is exactly where layering hides.',
      qa: [
        { q: 'Why one canonical feed instead of per-rail pipelines?', a: 'Layering moves money across rails. Per-rail pipelines would each see only part of the pattern.' }
      ],
      nums: [['5', 'rails: wires · SWIFT · ACH · card · cash']]
    },
    'citi/aml/kyc': {
      short: 'KYC and customer due diligence plus the OFAC and PEP watchlists, versioned daily. The watchlist version is pinned with the model and rule set, because a screening decision is only reproducible if the list version is known.',
      qa: [
        { q: 'Why version the watchlist?', a: 'It’s an input like the model. If you don’t know which list version screened a payment, you can’t reproduce or defend the decision.' },
        { q: 'What happens on a hit?', a: 'The payment is held for L1 clearing. A screening hit stops money moving.' }
      ],
      nums: [['daily', 'list versions'], ['2', 'lists: OFAC · PEP']]
    },
    'citi/aml/norm': {
      short: 'Normalize and entity resolution maps every rail to one canonical schema, fuzzy-matches parties across rails and lists into one entity, and builds the counterparty graph that structuring and layering features read. This is where most AML feature quality is decided.',
      qa: [
        { q: 'Why does entity resolution matter so much?', a: 'Two records for one party means two half-histories and a missed pattern.' },
        { q: 'Why fuzzy matching?', a: 'Names and identifiers differ across rails and lists — spellings, transliterations, missing fields — so exact matching would split one party into several.', check: 1 }
      ],
      nums: [['1', 'entity per real party'], ['graph', 'counterparty']]
    },
    'citi/aml/feat': {
      short: 'The AML feature layer computes peer-group baselines and typology features — structuring, layering, graph degree and community. Typology features beat generic anomaly scores, because the bank has specific typologies it’s obliged to detect.',
      qa: [
        { q: 'What’s a peer-group baseline?', a: 'Comparing a customer’s activity with similar customers rather than with everyone, so what’s normal for a cash-heavy business isn’t flagged as abnormal.', check: 1 },
        { q: 'Why graph features?', a: 'Layering moves money through several parties. Degree and community in the counterparty graph show it where single-account features can’t.' }
      ],
      nums: [['4', 'typology features: structuring · layering · degree · community']]
    },
    'citi/aml/labels': {
      short: 'The label store joins investigator dispositions and SAR outcomes back to the transactions that generated the alert. The label is a human disposition, which means it’s also a measure of the investigators — and that shapes how much the model is allowed to disagree with them.',
      qa: [
        { q: 'Why not treat the label as ground truth?', a: 'Because it’s a judgment. If investigators consistently miss a pattern, the labels miss it too — so the model shouldn’t be trusted to overrule them on the strength of those labels alone.' }
      ],
      nums: [['2', 'label sources: dispositions · SARs']]
    },
    'citi/aml/alerts': {
      short: 'The curated alert sample uses SAR-confirmed alerts as positives and closed alerts as negatives, at the true base rate of roughly one productive alert in a thousand, versioned with the rule set and list that generated it.',
      qa: [
        { q: 'Why not rebalance the classes?', a: 'Training at the true base rate keeps every metric honest. Any metric that ignores one in a thousand — accuracy above all — is meaningless here.' },
        { q: 'Why version it with the rule set?', a: 'The alerts only exist because of those rules and that list. Change them and the sample changes.' }
      ],
      nums: [['~1 in 1,000', 'productive alerts']]
    },
    'citi/aml/rules': {
      short: 'The rules engine configuration — rules and thresholds — is versioned like code, and a release pins the rule set, model and watchlist version as one unit. ATL/BTL evidence is tied to that exact triple.',
      qa: [
        { q: 'Why pin all three together?', a: 'Change one and the evidence for all three is stale.' },
        { q: 'Why keep a rules engine at all?', a: 'The rules generate the alerts, which keeps the model inside the compliance framework the regulator already accepts. The model ranks them.' }
      ],
      nums: [['3', 'pinned together: rules · model · list']]
    },
    'citi/aml/train': {
      short: 'AML training is alert scoring and prioritization, with segmentation for threshold setting, as a pinned SageMaker job. We score alerts, not transactions: the rules engine generates the alerts and the model ranks them, which keeps it inside the framework the regulator already accepts.',
      qa: [
        { q: 'Why score alerts instead of transactions?', a: 'Training on alerts keeps the model inside the compliance framework the regulator already accepts. The rules decide what’s alerted; the model decides the order it’s worked in.' },
        { q: 'What is segmentation for?', a: 'Setting thresholds per customer segment, which ATL/BTL testing then evidences.', check: 1 }
      ],
      nums: [['1', 'target: alert productivity']]
    },
    'citi/aml/reg': reg({ what: ', the rule set and watchlist version', qa: { q: 'Why pin the rule set and watchlist with the model?', a: 'Rules, model and list are one versioned unit. Change one and the evidence for all three is stale.' }, num: ['3', 'pinned: model · rules · list'] }),
    'citi/aml/g1': {
      short: 'The detection gate checks precision and recall on SAR-confirmed labels, plus typology coverage — is every typology the bank is obliged to detect actually detectable. It fails on either.',
      qa: [
        { q: 'Why is coverage a gate?', a: 'A model can score well on SAR labels and still leave a typology dark. Coverage is a regulatory question before it’s a model question.' },
        { q: 'What if it fails?', a: 'Rework the detection logic. A coverage gap is a missing feature or typology, not a threshold problem — lowering the threshold buys recall with a flood of false positives the team can’t work.' }
      ],
      nums: [['2', 'ways to fail: metrics · coverage']]
    },
    'citi/aml/g2': {
      short: 'Above-the-line and below-the-line testing with sampling evidence, plus SR 11-7 validation and the BSA officer’s sign-off. ATL/BTL proves the alerting threshold isn’t hiding activity underneath it — the BSA officer signs a package, not a number.',
      qa: [
        { q: 'What does below-the-line testing prove?', a: 'Sampling below the threshold shows whether suspicious activity is being missed there. If it is, the threshold is wrong.' },
        { q: 'What happens on a No?', a: 'Re-tune and re-document. ATL/BTL findings change the threshold evidence, so the documentation is redone with the tuning.' }
      ],
      nums: [['ATL / BTL', 'sampling evidence'], ['BSA officer', 'sign-off']],
      push: { q: 'Why not set the threshold from the ROC curve?', a: 'ATL/BTL evidence beat a threshold argued from the ROC curve — the regulator wants to see what actually sits above and below the line.' }
    },
    'citi/aml/s1': {
      short: 'Two lanes: pre-transaction OFAC screening against the pinned watchlist, and a nightly rules-engine run that generates monitoring alerts. They stay separate — screening stops a payment in real time, monitoring finds patterns after the fact.',
      qa: [
        { q: 'Why keep screening and monitoring separate?', a: 'They answer different questions on different clocks: a sanctions hit must stop money before it moves, while monitoring looks for patterns across days of activity.', check: 1 }
      ],
      nums: [['2', 'lanes'], ['nightly', 'monitoring run']]
    },
    'citi/aml/s2': {
      short: 'The model ranks the investigator queue — it never auto-closes an alert. Ranking improves analyst throughput and reduces backlog; auto-closing would be unmonitored dismissal of suspicious activity.',
      qa: [
        { q: 'Why not auto-close the obvious false positives?', a: 'Because that’s unmonitored dismissal of suspicious activity. The hard rule on this platform: a model may rank an alert, never close one.' },
        { q: 'How do you measure it?', a: 'Alert quality: false-positive rate against investigator capacity — how many cases the team can actually work.' }
      ],
      nums: [['0', 'alerts auto-closed']]
    },
    'citi/aml/s3': {
      short: 'Case management runs the L1, L2 and L3 queue and FinCEN filing, and every case carries Splunk lineage for the rule, model and list version that produced it.',
      qa: [
        { q: 'Why put lineage on the case?', a: 'Reproducing a decision means knowing the rule, model and list that generated that alert. Lineage on the model alone isn’t enough.' }
      ],
      nums: [['3', 'tiers: L1 · L2 · L3'], ['FinCEN', 'SAR filing']]
    },
    'citi/aml/q': {
      short: 'Typology drift or a coverage gap re-enters ATL/BTL testing rather than retuning a threshold in place. Drift triggers a governed retrain, not a redeploy.',
      qa: [
        { q: 'Why not retune the threshold in place?', a: 'The threshold is evidenced by ATL/BTL testing. A quiet retune makes that evidence stale.' }
      ],
      nums: [['0', 'in-place retunes']]
    },
    'citi/aml/no1': {
      short: 'The detection gate’s No branch: rework the detection logic. A coverage gap is a missing feature or a missing typology, not a threshold problem.',
      qa: [
        { q: 'Why not just lower the threshold?', a: 'It buys recall with a flood of false positives the team can’t work, and the typology is still missing.' }
      ],
      nums: [['1', 'way back: feature design']]
    },
    'citi/aml/no2': {
      short: 'The compliance gate’s No branch: re-tune and re-document. ATL/BTL findings change the threshold evidence, so the documentation is redone with the tuning — the BSA officer signs a package, not a number.',
      qa: [
        { q: 'Why redo the documentation?', a: 'Because a re-tune changes the evidence. Re-documenting beats re-tuning quietly.' }
      ],
      nums: [['1', 'way back: ATL / BTL testing']]
    },
    'citi/aml/mid': {
      short: 'A sanctions hit holds the payment for L1 clearing. It’s the one decision on the platform with no ranking involved — a screening hit stops money moving.',
      qa: [
        { q: 'Why is there no model here?', a: 'Sanctions screening is a prohibition, not a risk score. A hit against the pinned list has to be cleared by a person before money moves.', check: 1 }
      ],
      nums: [['L1', 'analyst clears the hit']]
    },
    'citi/aml/aq': {
      short: 'The operating metric is alert quality: false-positive rate against investigator capacity — how many cases the team can actually work.',
      qa: [
        { q: 'Why measure against capacity?', a: 'A false-positive rate on its own means little. What matters is whether the queue fits the team, and whether the productive alerts sit at the top of the ranked queue.' }
      ],
      nums: [['FP rate', 'vs. investigator capacity']]
    }
  });
  Object.assign(INTERVIEW, C);
})();

/* ============================ RAG pipeline ============================ */
Object.assign(INTERVIEW, {
  'rag/ix': {
    short: 'Index time is everything that can be precomputed, on a schedule, never on the request path: parse with layout preserved, chunk on structure with overlap, enrich with entities, ancestors and access labels, embed with a recorded model version, and write vector and keyword fields into one document. Everything the query layer filters on is stamped here.',
    qa: [
      { q: 'Why stamp so much metadata up front?', a: 'Every filter the query layer will ever need has to exist as metadata at index time. Retrofitting one means re-indexing the corpus.' },
      { q: 'Where does quality come from in this layer?', a: 'Parsing, more than most teams expect. A scrambled table is unrecoverable no matter how good the embedding model is.' },
      { q: 'How do you keep the index fresh?', a: 'Incremental upserts with a refresh path for changed sources, and a staleness monitor — a stale index gives confident, outdated answers.' }
    ],
    nums: [['5', 'steps: parse → chunk → enrich → embed → write'], ['0', 'index steps on the request path']],
    push: { q: 'Isn’t over-stamping wasteful?', a: 'Metadata is cheap at ingestion and impossible at query time. Over-stamping is deliberate.' }
  },
  'rag/qt': {
    short: 'Query time is everything inside the latency budget: resolve the query to concepts and expand through the ancestor closure, retrieve dense and lexical against the filtered space, fuse on rank, rerank the top-k, assemble a prompt where every passage carries its source version, generate with per-claim citations, then verify every claim — or refuse.',
    qa: [
      { q: 'Where do access controls apply?', a: 'In the query. Access control applied after retrieval isn’t access control — if the model has seen the text, the boundary is already crossed.' },
      { q: 'Why is refusal a valid output?', a: 'Because the model will fill a gap fluently when retrieval was thin. Verification maps every claim to a span; if it can’t, the claim is stripped or the answer is refused.' },
      { q: 'Which step goes wrong most often?', a: 'Fusion. Rank is comparable across retrievers; raw score never is. Blending scores is where most hybrid systems quietly go wrong.' }
    ],
    nums: [['7', 'steps inside one budget'], ['1', 'gate: citation integrity']],
    push: { q: 'Where do most hallucinations come from?', a: 'Retrieval misses wearing a costume. Thin retrieval presents as a generation failure.' }
  },
  'rag/ql': {
    short: 'Quality is what decides whether a change ships: retrieval eval separate from generation, faithfulness with a judge that’s itself validated against human labels, task success end to end, online telemetry, and SME review on a sample. A regression on any layer blocks the release, and the thresholds are fixed in advance.',
    qa: [
      { q: 'Why not one end-to-end metric?', a: 'Open Q&amp;A has no single right answer, so no single metric is trustworthy. And if you only measure the final answer, you tune the wrong layer.' },
      { q: 'How do you trust an LLM judge?', a: 'We validate the judge against human labels before we trust it. An unvalidated judge is a second opinion with no accountability.' },
      { q: 'Where do humans fit?', a: 'SME review on a sampled set, on a cadence. Their findings feed back into the labeled eval sets.' }
    ],
    nums: [['any', 'single-layer regression blocks a release'], ['fixed', 'thresholds, set before the change']],
    push: { q: 'Doesn’t gating on every layer slow releases?', a: 'It moves the argument earlier. Thresholds are agreed before the change, so release day is a check, not a negotiation.', check: 1 }
  },
  'rag/r_src': {
    short: 'The corpus of record is whatever the organization already considers authoritative — and nothing else. Originals stay immutable, everything downstream is derived and rebuildable, and the source version rides on every chunk, so a citation resolves to a specific document version.',
    qa: [
      { q: 'What’s the first question in a RAG project?', a: 'Not which model — which documents count as authoritative. That’s an organizational answer, not a technical one.' },
      { q: 'Why carry the source version on every chunk?', a: 'So a citation points at the exact document version the answer used, not just a title.' }
    ],
    nums: [['1', 'version per source document'], ['0', 'edits to originals']],
    push: { q: 'What if two sources disagree?', a: 'That’s a corpus decision before it’s a model problem: agree which source is authoritative for which question, and keep superseded versions for audit rather than mixing them.', check: 1 }
  },
  'rag/r_parse': {
    short: 'Parsing turns a document into structure rather than a flat string: multi-column layout, tables and captions survive as structure, and scanned pages go through OCR first. If parsing is wrong, nothing downstream can fix it.',
    qa: [
      { q: 'Why spend so much effort on parsing?', a: 'Parsing quality dominates retrieval quality far more than most teams expect. On the J&amp;J platform, layout-aware parsing was the single biggest quality jump in ingestion.' },
      { q: 'What breaks without it?', a: 'Tables. A scrambled table is unrecoverable no matter how good the embedding model is.' }
    ],
    nums: [['3', 'kept as structure: layout · tables · captions'], ['OCR', 'first, for scans']]
  },
  'rag/r_chunk': {
    short: 'Chunking splits parsed documents into retrievable units on structure — sections and table boundaries — not on character count, with overlap sized so a claim and its citation stay in the same unit. Chunk boundaries are a citation decision before they’re a retrieval decision.',
    qa: [
      { q: 'When is fixed-size chunking fine?', a: 'It’s simpler and acceptable on prose. It breaks badly on technical documents, where a table row means nothing without its header.' },
      { q: 'How do you size the overlap?', a: 'So a claim never gets separated from its citation.' }
    ],
    nums: [['0', 'claims split from their citation']]
  },
  'rag/r_enrich': {
    short: 'Enrichment attaches everything retrieval will later filter on: entity links against the controlled vocabulary, the ancestor closure written onto the chunk, and access-control labels copied from the source system. Metadata is cheap at ingestion and impossible at query time.',
    qa: [
      { q: 'Why write the ancestors onto the chunk?', a: 'So concept expansion is a filter at query time, not a graph traversal.' },
      { q: 'Where do the access labels come from?', a: 'They’re copied from the source system at ingestion, then enforced as filters in the query.' }
    ],
    nums: [['3', 'stamps: entities · ancestors · ACL']],
    push: { q: 'What happens when you need a filter you didn’t stamp?', a: 'You re-index the corpus. That’s exactly why over-stamping at ingestion is deliberate.' }
  },
  'rag/r_emb': {
    short: 'Embedding vectorizes chunks for dense retrieval, in batch, with the model version recorded on every chunk. Mixing embedding versions in one index is silently wrong — the version is part of the index schema whether you treat it that way or not.',
    qa: [
      { q: 'Why record the version?', a: 'Vectors from two models aren’t comparable, and a mixed index gives no error — just quietly wrong similarity.' },
      { q: 'How do you change embedding models?', a: 'Re-embed as a versioned batch job, then rerun the retrieval eval before the new vectors serve traffic.' }
    ],
    nums: [['batch', 'pricing on bulk work'], ['per chunk', 'model version']]
  },
  'rag/r_write': {
    short: 'Index write puts each chunk into both retrieval surfaces at once — a vector field and an analyzed text field in the same document — with incremental upserts and a refresh path for changed sources. Freshness gets its own monitor, because staleness doesn’t look like an error.',
    qa: [
      { q: 'Why one document with both fields?', a: 'Dense and lexical retrieval then read the same chunk with the same metadata and filters, so their result lists fuse cleanly.' },
      { q: 'How do you detect staleness?', a: 'A staleness monitor on the index write path. A stale index doesn’t error — it gives confident, outdated answers.' }
    ],
    nums: [['2', 'fields: vector · analyzed text'], ['incremental', 'upserts']]
  },
  'rag/r_q': {
    short: 'The query is usually shorter and vaguer than the corpus vocabulary, and it carries the caller’s identity and entitlements, which become filters. That’s what lets retrieval enforce access instead of the UI.',
    qa: [
      { q: 'Why carry identity with the query?', a: 'Entitlements become filters in retrieval itself, so access is enforced before any text is retrieved — not by the UI afterwards.' },
      { q: 'How do you bridge the vocabulary gap?', a: 'Resolve the words to concepts first, then expand through the ancestor closure, and let dense retrieval catch the paraphrase.' }
    ],
    nums: [['3', 'carried: text · identity · entitlements']]
  },
  'rag/r_exp': {
    short: 'Resolve and expand maps the query onto the vocabulary the index is stamped with: free text resolves to entity IDs, and a parent concept expands to its whole subtree through the precomputed ancestor closure. Expansion is a filter, not a live traversal.',
    qa: [
      { q: 'Why not a graph traversal?', a: 'It’s more expressive and more expensive, and it puts a generated query in the hot path. The closure filter gets most of the benefit deterministically.' },
      { q: 'What happens to an unknown term?', a: 'It doesn’t resolve, and the system says so. On J&amp;J that rule was exact match or found:false — never a nearest-neighbour guess.' }
    ],
    nums: [['0', 'traversals at query time']]
  },
  'rag/r_hyb': {
    short: 'Both retrievers run against the same filtered candidate space: dense recovers paraphrase and intent, lexical holds exact identifiers and rare terms. Filters go into the query, so entitlements are enforced before retrieval, not after.',
    qa: [
      { q: 'Why both retrievers?', a: 'They fail differently. Dense misses exact identifiers; lexical misses paraphrase. Together they cover each other.' },
      { q: 'Why filter in the query?', a: 'Post-filtering a result set is a security bug. If the model has seen the text, the boundary is already crossed.' }
    ],
    nums: [['2', 'retrievers, one filtered space']]
  },
  'rag/r_fuse': {
    short: 'Fusion merges two ranked lists that don’t share a score scale. Reciprocal rank fusion merges on rank position, with no per-query-type weighting to tune and re-tune.',
    qa: [
      { q: 'Why not blend the scores?', a: 'A BM25 score and a cosine distance aren’t comparable. At Home Depot, weighted blending learned on one query distribution failed on the next.' },
      { q: 'What do you tune in RRF?', a: 'Almost nothing — the k constant. We used 60 at Home Depot.' }
    ],
    nums: [['k = 60', 'used at Home Depot'], ['0', 'weights to tune']]
  },
  'rag/r_rank': {
    short: 'The reranker is a cross-encoder that reads the query and each candidate together and reorders the top-k. Recall gets the right document into the set; reranking gets it into the top three.',
    qa: [
      { q: 'Why only the top-k?', a: 'A cross-encoder is too expensive for the full list and unnecessary beyond the top-k.' },
      { q: 'What does it fix?', a: 'Related-but-not-what-I-wanted results near the top. It turns better recall into a visible improvement.' }
    ],
    nums: [['top-k', 'reranked']]
  },
  'rag/r_asm': {
    short: 'Prompt assembly builds the generation context from reranked passages, each carrying its source and version. The context budget is enforced by dropping whole passages, never by truncating one mid-claim — truncation is how you manufacture a hallucination.',
    qa: [
      { q: 'Why never truncate a passage?', a: 'A half passage can drop the qualifier that made a claim true. The model then states it with confidence and a citation.' },
      { q: 'Why carry versions into the prompt?', a: 'So every citation in the answer resolves to a specific document version.' }
    ],
    nums: [['0', 'passages truncated'], ['per passage', 'source + version']]
  },
  'rag/r_gen': {
    short: 'Generation composes the answer over the supplied context, citing per claim rather than per answer, and “the context does not contain this” is an allowed output. Most hallucinations we chased were retrieval misses wearing a costume.',
    qa: [
      { q: 'Why per-claim citations?', a: 'So verification can check each claim against a span. A per-answer citation can’t tell you which sentence is unsupported.' },
      { q: 'What causes hallucinations?', a: 'Usually the model filling a gap fluently when retrieval was thin — a retrieval failure presenting as a generation failure.' }
    ],
    nums: [['per claim', 'citations']],
    push: { q: 'Can’t you just tell the model not to hallucinate?', a: 'Instructions help, but they aren’t a control. The control is verification after generation: every claim maps to a span or it’s stripped.', check: 1 }
  },
  'rag/r_ver': {
    short: 'Verification is the gate between a generated answer and a user: every claim is mapped back to a retrieved span, unsupported claims are stripped or the answer is refused, and refusal rate is monitored in both directions.',
    qa: [
      { q: 'Why monitor refusal in both directions?', a: 'A rise can mean retrieval got worse; a sudden drop usually means the gate broke, not that quality improved.' },
      { q: 'Strip or refuse — how do you decide?', a: 'Strip a claim when the rest of the answer stands on its own evidence; refuse when what’s left wouldn’t answer the question.', check: 1 }
    ],
    nums: [['2', 'outcomes: strip · refuse'], ['both ways', 'refusal-rate alert']]
  },
  'rag/r_ev1': {
    short: 'Retrieval eval measures whether the right evidence was found, independently of what the model did with it: context precision and recall against a labeled set, with RAGAS, on every index or chunking change.',
    qa: [
      { q: 'Why separate retrieval from generation?', a: 'If you only measure the final answer, you’ll tune the wrong layer.' },
      { q: 'When does it run?', a: 'On every index or chunking change.' }
    ],
    nums: [['2', 'metrics: context precision · recall']]
  },
  'rag/r_ev2': {
    short: 'Faithfulness eval measures whether the answer is supported by the context it was given, with RAGAS and DeepEval, regression-gated in CI — and the judge itself is validated against human labels.',
    qa: [
      { q: 'Why validate the judge?', a: 'An unvalidated LLM judge is a second opinion with no accountability. The judge needs its own eval.' },
      { q: 'What’s the gate?', a: 'A faithfulness threshold, fixed before the change, enforced in CI.' }
    ],
    nums: [['2', 'frameworks: RAGAS · DeepEval']]
  },
  'rag/r_ev3': {
    short: 'Task success asks whether the user got what they actually needed, scored on realistic tasks rather than isolated question-answer pairs. Component metrics can all pass while the product still fails the user.',
    qa: [
      { q: 'Why realistic tasks?', a: 'People run workflows, not single questions. A system can answer each question well and still not get the user to the outcome they needed.' }
    ],
    nums: [['1', 'unit: a realistic task']]
  },
  'rag/r_ev4': {
    short: 'Online telemetry is what the system actually does once real users touch it: refusal rate, citation coverage, latency and retrieval hit rate. The query distribution drifts faster than the corpus, so that’s the early warning.',
    qa: [
      { q: 'What’s the early warning?', a: 'Drift in the query distribution, and movement in refusal rate, citation coverage and retrieval hit rate.' },
      { q: 'Why watch queries rather than the corpus?', a: 'Users change what they ask faster than the documents change.' }
    ],
    nums: [['4', 'signals: refusal · citations · latency · hit rate']]
  },
  'rag/r_ev5': {
    short: 'SME review is the layer no automated metric replaces: domain experts review a sampled set on a cadence, and their findings feed back into the labeled eval sets. Automated eval scales; SME review keeps it honest.',
    qa: [
      { q: 'How are SME findings used?', a: 'They become new labeled examples, so the automated eval learns what the experts caught.' }
    ],
    nums: [['sampled', 'recurring review']]
  },
  'rag/r_ev6': {
    short: 'The release gate is the composite decision: a regression on any layer blocks the release, and thresholds are agreed up front, not negotiated at release time.',
    qa: [
      { q: 'Why fix thresholds in advance?', a: 'So nobody argues the threshold on the day the numbers come in.' }
    ],
    nums: [['any', 'regression blocks']]
  }
});

/* ============================ CI/CD pipeline ============================ */
Object.assign(INTERVIEW, {
  'cicd/int': {
    short: 'Integration proves the build runs. The change opens as a pull request — prompts, tool schemas and fixtures reviewed as code — then static checks and unit tests in under two minutes, contract tests against the Service Bus message shape, one build pushed to ACR by digest, and a Cosign signature with an SBOM attached.',
    qa: [
      { q: 'Why treat prompts as code?', a: 'A prompt change changes production behavior. It’s reviewed, linted, tested, contract-tested and built once — there’s no console where someone edits production behavior.' },
      { q: 'Why under two minutes?', a: 'If the fast layer is slow, engineers stop trusting it and route around it.' },
      { q: 'What do the contract tests catch?', a: 'Hand-off drift between six independently deployed services. Coordination drift was a real production problem, and this is the cheapest place to catch it.' }
    ],
    nums: [['<2 min', 'static checks + unit tests'], ['1', 'build per change'], ['6', 'services sharing one message contract']],
    push: { q: 'What about the model version itself?', a: 'Model deployments are pinned per agent with auto-upgrade disabled, so a model change goes through the same controlled path as code.' }
  },
  'cicd/qual': {
    short: 'Qualification proves the agent behaves: golden-set eval on held-out Q&amp;A, an agent-specific fixture gate, a grounding gate with a faithfulness threshold and pass/fail citation integrity, a latency and token-cost budget, and a red-team suite. It’s the unit-test layer for an agent; it just happens to be statistical.',
    qa: [
      { q: 'What’s agent-specific?', a: 'Knowledge runs closure-table fixtures. Drug Safety is scored on seriousness-criteria recall tuned against false negatives, plus MedDRA coding and E2B(R3) structure.' },
      { q: 'Why fix thresholds before the change?', a: 'So nobody argues them on the day. The gate is set first; the change has to meet it.' },
      { q: 'Why gate cost?', a: 'A reasoning-effort change can quietly triple token cost. Cost per request is gated like latency.' }
    ],
    nums: [['5', 'qualification gates'], ['pass / fail', 'citation integrity']],
    push: { q: 'Isn’t an LLM-judged gate flaky?', a: 'The judge is validated against human labels, thresholds are fixed in advance, and the eval datasets are versioned, validated artifacts — so every change is measured against a stable yardstick.' }
  },
  'cicd/auth': {
    short: 'Authorization proves someone signed. The pipeline generates the change-control record and a validation summary against the current production version, an accountable approver applies a Part 11 electronic signature, and admission control verifies the signature at the cluster door.',
    qa: [
      { q: 'Why generate the paperwork in the pipeline?', a: 'When the record is a build output linked to the digest, the record and the artifact can’t drift apart.' },
      { q: 'Who signs?', a: 'A named, accountable approver. For Drug Safety, a pharmacovigilance SME is required.' },
      { q: 'What enforces it?', a: 'Ratify verifies the Cosign signature at admission, and Gatekeeper blocks unsigned or unapproved digests.' }
    ],
    nums: [['Part 11', 'electronic signature'], ['1', 'named approver, at least']],
    push: { q: 'Doesn’t a human signature slow everything down?', a: 'Automation gets the evidence to the desk; a person still signs. The slow part used to be assembling the evidence, not reading it.', check: 1 }
  },
  'cicd/del': {
    short: 'Delivery proves it lands safely: staging on the same digest with the real orchestrator and bus, then a canary sized to the agent’s risk — 5, 20, 50, 100 for Knowledge; 2, 10, 50, 100 with an SME pause for Drug Safety — routed by a track property onto the topic’s canary subscription, watched on SLOs and quality signals, and demoted automatically on breach.',
    qa: [
      { q: 'Why different canaries per agent?', a: 'The riskier the agent, the smaller the first ring and the more human the promotion.' },
      { q: 'How do you route canary traffic on a bus?', a: 'Not with an ingress rule. The orchestrator stamps a track property, and the topic’s canary subscription feeds the canary pods.' },
      { q: 'What triggers a rollback?', a: 'Any gate breach in the analysis window demotes the ring automatically, and the previous digest is still live.' }
    ],
    nums: [['5→20→50→100', 'Knowledge (%)'], ['2→10→50→100', 'Drug Safety (%) + SME pause']],
    push: { q: 'Have you actually exercised the rollback?', a: 'A rollback path that’s never been run isn’t a rollback path. It gets exercised on a schedule.' }
  },
  'cicd/c_pr': {
    short: 'The pull request is where every change enters: prompt files, tool definitions and eval fixtures are code and are reviewed as code. A prompt change follows the same path as a code change, because it is one.',
    qa: [
      { q: 'Why not let people edit prompts in a console?', a: 'Then production behavior changes with no review, no test and no record. There is no console where someone edits production behavior.' },
      { q: 'What does review cover?', a: 'Prompts, tool schemas and eval fixtures, together, in one pull request.' }
    ],
    nums: [['3', 'reviewed as code: prompts · tools · fixtures']]
  },
  'cicd/c_static': {
    short: 'Static checks and unit tests are the fast feedback layer — lint, types and unit tests in under two minutes, with tool schemas type-checked against the agent contract. If the fast layer is slow, engineers stop trusting it.',
    qa: [
      { q: 'Why the two-minute budget?', a: 'Past that, people route around the checks. Speed is what keeps them trusted.' },
      { q: 'What do the type checks cover?', a: 'Tool schemas against the agent contract, so a tool change that breaks the agent fails here.' }
    ],
    nums: [['<2 min', 'budget']]
  },
  'cicd/c_contract': {
    short: 'Contract tests verify the agent still speaks the platform’s protocol: request and response message schemas validated against what the orchestrator expects. Six services deploying independently need a contract, or they drift apart quietly.',
    qa: [
      { q: 'Why contract tests specifically?', a: 'Coordination drift across agents was a real production problem, and contract tests are the cheapest place to catch it.' },
      { q: 'What do they validate?', a: 'The Service Bus request and response message shapes, against the orchestrator’s expectations.' }
    ],
    nums: [['6', 'independently deployed services']]
  },
  'cicd/c_build': {
    short: 'One image is built, once, and referenced by digest from then on. The digest — not a tag — moves through every environment, and nothing is rebuilt for staging or production. Production runs the exact bytes that passed the gates.',
    qa: [
      { q: 'Why not rebuild per environment?', a: 'Rebuilding means production runs an artifact nobody tested. Digest promotion removes that entire class of problem.' },
      { q: 'How do six services share an image?', a: 'One container image with a SERVICE build argument, six Deployments, shipped as a Helm chart.' }
    ],
    nums: [['1', 'build'], ['0', 'rebuilds downstream']]
  },
  'cicd/c_sign': {
    short: 'Signing puts cryptographic provenance on the artifact: a Cosign signature plus an SBOM attached to the digest, verified again at admission inside the cluster. An unsigned or mismatched digest can’t be scheduled.',
    qa: [
      { q: 'Why verify at admission and not just at build?', a: 'The last enforcement point should be the cluster itself. A signature checked only at build can be bypassed by anything that skips the pipeline.' },
      { q: 'What’s the SBOM for?', a: 'A record of what’s inside the image, attached to the same digest that gets signed.' }
    ],
    nums: [['Cosign', 'signature'], ['SBOM', 'attached to the digest']]
  },
  'cicd/c_golden': {
    short: 'Golden-set eval is the behavioral regression suite: a curated, held-out question set with document-backed answers, scored on retrieval and faithfulness, with thresholds fixed in advance. It’s the unit-test layer for an agent; it just happens to be statistical.',
    qa: [
      { q: 'Where does the golden set come from?', a: 'Curated questions with document-backed answers, held out from anything used to tune the agent. SME review findings feed new examples in.' },
      { q: 'What’s scored?', a: 'Retrieval and faithfulness, against thresholds set before the change.' }
    ],
    nums: [['held-out', 'Q&amp;A set'], ['2', 'scores: retrieval · faithfulness']]
  },
  'cicd/c_fixture': {
    short: 'The fixture check is the gate that exists because of what this specific agent is for. For Knowledge, fixtures assert that a parent-concept query returns the whole subtree, so a broken closure build shows up here, not in production. For Drug Safety, it’s recall on seriousness criteria, tuned against false negatives, plus MedDRA coding and E2B(R3) structure.',
    qa: [
      { q: 'Why not one generic eval for every agent?', a: 'Each specialist exists for a reason, and its gate should test that reason. That’s the point of specialists.' },
      { q: 'Why recall for Drug Safety?', a: 'Overall accuracy is the wrong headline. A missed serious event costs more than several false flags, and the threshold reflects that asymmetry.' }
    ],
    nums: [['2', 'agent variants'], ['subtree', 'Knowledge fixture'], ['recall', 'Drug Safety headline']]
  },
  'cicd/c_faith': {
    short: 'The grounding gate is the hard gate on whether answers are supported: faithfulness scored by a validated judge against a threshold, and citation integrity as pass/fail. Faithfulness has a threshold; citation integrity doesn’t — it holds or the build fails.',
    qa: [
      { q: 'Why is citation integrity pass/fail?', a: 'A citation either resolves to evidence the agent was given or it doesn’t. There’s nothing to negotiate.' },
      { q: 'Who scores faithfulness?', a: 'A judge validated against human labels.' }
    ],
    nums: [['threshold', 'faithfulness'], ['pass / fail', 'citation integrity']]
  },
  'cicd/c_budget': {
    short: 'The latency and cost budget treats performance regressions as failures, not observations: p95 against the platform budget, and token cost per request — because a reasoning-effort change can quietly triple it.',
    qa: [
      { q: 'Why gate cost in CI?', a: 'A prompt change that doubles token spend is a regression even if quality improved. Better to catch it in the pipeline than in the bill.' },
      { q: 'Where do the numbers come from?', a: 'p95 against the platform budget, and tokens per request — the same per-agent token counts that feed the cost model.' }
    ],
    nums: [['p95', 'vs. platform budget'], ['tokens', 'per request']]
  },
  'cicd/c_red': {
    short: 'The red-team suite covers the failure modes the golden set never shows: prompt injection through retrieved content, entitlement-bypass attempts, and refusal behavior under deliberately thin retrieval. Retrieved content is user input, and we test it as an attack surface.',
    qa: [
      { q: 'What’s the most under-tested vulnerability in RAG?', a: 'An agent that treats a retrieved chunk as an instruction. Retrieved documents are untrusted input.' },
      { q: 'Why test refusal?', a: 'Because under thin retrieval, the right answer is “the context does not contain this.” The suite checks the agent still says so.' }
    ],
    nums: [['3', 'attacks: injection · entitlement · refusal']]
  },
  'cicd/c_change': {
    short: 'The change-control record is the regulated paperwork, generated by the pipeline rather than written afterwards: what changed, why, what was tested and what the results were — linked to the digest so the record and the artifact can’t drift apart.',
    qa: [
      { q: 'Why generate it?', a: 'A hand-written record assembled at release time drifts from what actually shipped. A build output linked to the digest can’t.' }
    ],
    nums: [['GxP', 'standard'], ['1', 'record per digest']]
  },
  'cicd/c_valsum': {
    short: 'The validation summary packages the eval results in the form a validation reviewer needs: thresholds, results and deltas against the current production version, with each eval dataset referenced by its own validated version.',
    qa: [
      { q: 'Why version the eval datasets?', a: 'If the test set can change silently, the evidence means nothing. Eval datasets are controlled artifacts, the same as code.' },
      { q: 'Why compare against production?', a: 'A reviewer’s real question is whether this version is better or worse than what’s running now.' }
    ],
    nums: [['3', 'contents: thresholds · results · deltas']]
  },
  'cicd/c_sig': {
    short: 'A named, accountable human approves the release with a Part 11 electronic signature, bound to identity and timestamp. For the Drug Safety agent, a pharmacovigilance SME is a required approver. Automation gets the evidence to the desk; a person still signs.',
    qa: [
      { q: 'Why require an SME for Drug Safety?', a: 'Because the risk is clinical, not technical. A generic approver can’t judge a change to seriousness-criteria behavior.' },
      { q: 'What makes it Part 11?', a: 'The signature is bound to an authenticated identity and a timestamp, and it’s linked to the digest it approves.' }
    ],
    nums: [['Part 11', '21 CFR'], ['PV SME', 'required for Drug Safety']]
  },
  'cicd/c_admit': {
    short: 'Admission control means the cluster refuses anything that can’t prove where it came from: Ratify verifies the Cosign signature at admission, and Gatekeeper policy blocks unsigned or unapproved digests. The last enforcement point is the cluster itself.',
    qa: [
      { q: 'Why enforce at the cluster?', a: 'Pipelines can be bypassed. If the cluster checks the signature, nothing unsigned runs, however it arrived.' }
    ],
    nums: [['2', 'controls: Ratify · Gatekeeper']]
  },
  'cicd/c_stage': {
    short: 'Staging is a full-platform rehearsal: the same digest that will go to production, running against the real orchestrator and the real bus, so the cross-agent contract is verified live, not in isolation. Staging tests the platform, not the container.',
    qa: [
      { q: 'Why test against the real orchestrator?', a: 'Because the risk is in the hand-offs. A container can pass alone and still break the conversation with the orchestrator.' }
    ],
    nums: [['same', 'digest as production']]
  },
  'cicd/c_canary': {
    short: 'The canary is progressive delivery with automated analysis between steps. Knowledge goes 5, 20, 50, 100 with automated gate analysis; Drug Safety goes a slower 2, 10, 50, 100 with a mandatory pharmacovigilance SME pause before the final promotion. Rollback is a ring demotion, not a fresh deploy.',
    qa: [
      { q: 'Why is Drug Safety slower?', a: 'The riskier the agent, the smaller the first ring and the more human the promotion.' },
      { q: 'What tool runs it?', a: 'Argo Rollouts, with analysis between steps on latency, errors, subscription backlog, refusal rate and citation coverage.' }
    ],
    nums: [['5→20→50→100', 'Knowledge (%)'], ['2→10→50→100', 'Drug Safety (%) + SME pause']]
  },
  'cicd/c_route': {
    short: 'Canary on a message bus isn’t canary behind an ingress. Each agent has a topic with stable and canary subscriptions; the orchestrator stamps a track property at the rollout step’s weight, hashing the session ID so a conversation stays on one version, and subscription filters send canary-tracked messages to the canary pods.',
    qa: [
      { q: 'What did you reject?', a: 'Two KEDA ScaledObjects and a replica ratio. It needs no orchestrator change, but it only approximates the share of messages on the new version, and KEDA drifts the ratio with load.' },
      { q: 'Why does exactness matter?', a: 'For a governed agent, “roughly five percent” isn’t an acceptable description of what a regulator was told. Drug Safety’s 2% first ring is only exact this way.' },
      { q: 'What did it cost?', a: 'A publisher change in the orchestrator and a second subscription per agent — for an exact, auditable split.' },
      { q: 'How many pods would replicas need?', a: 'About fifty pods per canary pod to approximate 2%.' }
    ],
    nums: [['2%', 'Drug Safety first ring'], ['~50 : 1', 'pods a replica ratio would need'], ['2', 'subscriptions per topic']],
    push: { q: 'Why hash the session ID?', a: 'So one conversation stays on one version. Otherwise a single session could bounce between the old and new agent mid-conversation.' }
  },
  'cicd/c_slo': {
    short: 'Production watch is the canary analysis window, using product signals rather than just infrastructure ones: latency, error rate and subscription backlog, plus refusal rate and citation coverage — which move before the infrastructure metrics do.',
    qa: [
      { q: 'Why quality signals in a canary?', a: 'For an agent, quality degrades before CPU ever notices. Refusal rate and citation coverage catch a bad version that’s perfectly healthy as a container.' },
      { q: 'Why subscription backlog?', a: 'On a bus, a slow agent shows up as messages piling up on its subscription before it shows up as errors.' }
    ],
    nums: [['5', 'signals: latency · errors · backlog · refusal · citations']]
  },
  'cicd/c_rb': {
    short: 'Automated rollback is the failure path, exercised deliberately: any gate breach in the analysis window demotes the ring automatically, and because the previous digest is still live, rollback is instant. We test the rollback, not just the release.',
    qa: [
      { q: 'Why rehearse rollbacks?', a: 'A rollback path that has never been run isn’t a rollback path. It gets exercised on a schedule.' },
      { q: 'Why is it instant?', a: 'Demotion moves traffic back to the previous digest, which never stopped running.' }
    ],
    nums: [['instant', 'previous digest still live']]
  }
});
