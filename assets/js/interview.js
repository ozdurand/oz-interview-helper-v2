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
