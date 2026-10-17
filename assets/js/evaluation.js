/* ===========================================================
   evaluation.js — the Evaluation page (J&J row of the matrix):
   RAGAS and the seven evaluation layers, in two versions —
   'jj' (the J&J platform) and 'generic' (any RAG system).
   Same shape in both:
     layers  — seven rows: name, q (one-line question), tags ('ragas' | 'hard'),
               lead, body, kv [[label, value] ×3]
     edges   — [from, to, kind ('feed' | 'check' | 'why'), label, sentence, check]
     ragas / golden / thresholds / vs / read — the panel tabs
     gate    — the release rule strip
   check: 1 (or a trailing 1 in an array row) marks a statement built on
   general reasoning rather than your own notes — confirm before using it.
   Everything here is editable in the browser (Edit mode).
   =========================================================== */
const EVALUATION = {

  /* ============================ J&J platform ============================ */
  jj: {
    sub: 'RAGAS and the seven layers · J&amp;J multi-agent platform',
    title: 'Seven views that must agree',
    thesis: 'Open scientific Q&amp;A has no single right answer, so no single score decides a release on the J&amp;J platform. Seven layers each measure one thing. RAGAS scores two of them; the other five exist because RAGAS cannot see trajectories, hard compliance rules, production behaviour or expert judgment.',
    layers: [
      { name: 'Retrieval', q: 'Was the right evidence found?', tags: ['ragas'],
        lead: 'Context precision and context recall — measured separately from what the model did with the evidence.',
        body: 'Run on every index or chunking change. If only the final answer were measured, a retrieval regression would look like a generation problem and get tuned in the wrong place.',
        kv: [['Tool', 'RAGAS'], ['When', 'every index or chunking change'], ['Scored by', 'threshold']] },
      { name: 'Generation', q: 'Is the answer supported by its context?', tags: ['ragas'],
        lead: 'Faithfulness to the supplied context, scored by an LLM judge that is itself validated against human labels.',
        body: 'Regression-gated in CI with a threshold fixed before the change. A faithfulness score is only as trustworthy as the judge behind it, which is why layer 7 checks the judge.',
        kv: [['Tool', 'RAGAS · DeepEval'], ['When', 'every release candidate, in CI'], ['Scored by', 'threshold']] },
      { name: 'Agent trajectory', q: 'Did the orchestrator plan and delegate sensibly?', tags: [],
        lead: 'Whether the orchestrator called the right specialists, with the right tasks, in a sensible order.',
        body: 'Retrieval and generation can both look healthy while the plan is wrong — Drug Safety never called on a pharmacovigilance question, for example. Trajectories are read from the traces.',
        kv: [['Tool', 'LangSmith'], ['Looks at', 'plan · delegation'], ['Scored by', 'regression blocks']] },
      { name: 'Task success', q: 'Did the user get what they needed?', tags: [],
        lead: 'Scored on realistic workflows, not on isolated question-answer pairs.',
        body: 'Component metrics can all pass while the product still fails the user. This is the layer closest to the outcome scientists care about.',
        kv: [['Unit', 'a realistic workflow'], ['Explained by', 'layers 1–3'], ['Scored by', 'regression blocks']] },
      { name: 'Safety &amp; compliance', q: 'Does every citation resolve to its evidence?', tags: ['hard'],
        lead: 'Citation integrity — a hard gate, pass or fail.',
        body: 'Checked in code, not by a judge: citation IDs not in the run’s evidence store are stripped at each specialist and again at the orchestrator. No faithfulness score can buy back a failure here.',
        kv: [['Tool', 'deterministic code'], ['When', 'every answer · every release'], ['Scored by', 'pass / fail']] },
      { name: 'Operational', q: 'What happens once real users touch it?', tags: [],
        lead: 'Production behaviour: refusal rate, citation coverage, retrieval hit rate and query drift.',
        body: 'Quality signals move before CPU notices. Refusal rate is watched in both directions — a sudden drop usually means a gate broke, not that quality improved. Queries drift faster than the corpus.',
        kv: [['Tool', 'Arize Phoenix · telemetry'], ['When', 'continuous'], ['Scored by', 'alerts']] },
      { name: 'SME review', q: 'Do the experts agree?', tags: [],
        lead: 'Expert judgment on a sampled set, on a recurring cadence.',
        body: 'Automated evaluation scales; SME review keeps it honest. Findings feed back into the labeled eval sets, and the same labels are what the LLM judge is validated against.',
        kv: [['Who', 'scientific · PV SMEs'], ['When', 'recurring, sampled'], ['Feeds', 'labeled eval sets']] }
    ],
    edges: [
      [1, 2, 'why', 'sets the ceiling', 'Generation can only be faithful to what retrieval found — read a faithfulness drop next to context recall.'],
      [3, 4, 'why', 'explains', 'A task can fail with good retrieval and faithful text if the orchestrator never called the right specialist.'],
      [7, 2, 'check', 'validates the judge', 'The faithfulness judge gates releases only after it agrees with SME labels.'],
      [7, 1, 'feed', 'supplies references', 'Context recall needs reference answers; SME findings become new labeled examples.'],
      [7, 4, 'feed', 'labels workflows', 'SME findings add realistic workflows to the task-success set.', 1],
      [6, 1, 'feed', 'ages the eval set', 'Query drift shows when the golden set no longer looks like production traffic.', 1],
      [6, 5, 'check', 'watches the gate', 'A sudden drop in refusal rate is investigated as a broken gate.'],
      [5, 2, 'check', 'does not average', 'Citation integrity is pass/fail; a high faithfulness score cannot compensate for it.']
    ],
    ragas: {
      lead: 'RAGAS is an open-source library of LLM-judged metrics for retrieval-augmented generation (current release 0.4.x, maintained by VibrantLabs). On the J&amp;J platform it scores layer 1 (retrieval) and layer 2 (generation), on every index or chunking change and on every release candidate’s golden set.',
      cols: ['Metric', 'Question it answers', 'How it is scored', 'Needs a reference?', 'Layer'],
      rows: [
        ['Context precision', 'Are the relevant chunks ranked at the top?', 'Mean precision@k across the retrieved ranks — an irrelevant chunk at rank 1 costs more than one at rank 5', 'yes', '1'],
        ['Context recall', 'Did retrieval find everything the answer needs?', 'Share of the reference answer’s claims that the retrieved context supports', 'yes', '1'],
        ['Faithfulness', 'Is every claim in the answer supported by the context it was given?', 'Split the answer into claims, check each against the context; supported ÷ total', 'no', '2'],
        ['Response relevancy', 'Does the answer address the question?', 'Generate questions from the answer and compare them to the real one by embedding similarity — it does not check facts', 'no', '— (not a gate here)', 1]
      ],
      notes: [
        ['judge', 'check', 'The judge is an LLM, so it is validated first.', 'Faithfulness scores gate a release only after the judge agrees with human labels on a sampled set (layer 7).'],
        ['golden set', 'feed', 'Recall and precision need reference answers.', 'They come from the curated golden set with document-backed answers, which is why that set is a versioned, validated artifact.'],
        ['limits', 'why', 'What RAGAS does not cover here:', 'delegation (LangSmith, layer 3), citation integrity (deterministic code, layer 5), production behaviour (Arize Phoenix, layer 6) and expert judgment (layer 7).']
      ]
    },
    golden: {
      lead: 'The golden set is the held-out question set every release candidate is scored on. Its answers are document-backed, it is versioned and validated like code, and it grows from SME review.',
      steps: [
        ['Start from the experts', 'The POC began with an SME question set with document-backed answers, scored blind side by side against the base model.'],
        ['Reference answer plus evidence', 'Each question carries a reference answer and the documents that support it — context recall and precision cannot be scored without them.'],
        ['Held out', 'Release candidates are scored on held-out Q&amp;A, so a change is judged on questions it was not tuned against.'],
        ['Agent fixtures beside it', 'Knowledge adds closure-table fixtures (a parent concept must return its whole subtree); Drug Safety adds seriousness-criteria cases with MedDRA coding and E2B(R3) structure.'],
        ['Synthetic expansion', 'RAGAS can generate questions from the corpus: it builds a knowledge graph over the documents, then synthesizes single-hop specific (50%), multi-hop abstract (25%) and multi-hop specific (25%) queries, each with a reference answer. Synthetic questions widen coverage, but enter the golden set only after SME review.', 1],
        ['Versioned and controlled', 'Eval datasets are validated artifacts under change control. SME findings are added as new reviewed versions, never edited in place.']
      ],
      note: 'Every validation summary names the eval dataset version it used, so a test set can never change silently under a release.'
    },
    thresholds: {
      lead: 'Thresholds are fixed before the change, so release day is a check, not a negotiation. What each one is anchored to:',
      cols: ['Measure', 'Rule', 'How it is set'],
      rows: [
        ['Citation integrity', 'pass / fail', 'No threshold to tune: every citation resolves to the run’s evidence, or the build fails.'],
        ['Faithfulness', 'threshold, fixed in advance', 'Scored on the same golden-set version as production; the validation summary reports the delta against the current production version.'],
        ['Context precision · recall', 'threshold', 'Checked on every index or chunking change, separately from generation, against the same reference answers.'],
        ['Drug Safety recall', 'threshold tuned against false negatives', 'Seriousness-criteria recall, not overall accuracy — a missed serious event costs more than several false flags.'],
        ['Judge agreement', 'precondition', 'The LLM judge must agree with SME labels before any of its scores can gate a release.'],
        ['Run-to-run noise', 'tolerance', 'LLM-judged scores vary between runs, so a regression is a drop beyond the spread seen when the same version is re-scored.', 1],
        ['Latency · cost', 'budget', 'p95 against the platform budget, and tokens per request — a reasoning-effort change can quietly triple cost.']
      ],
      note: 'Thresholds live in the repo beside the pipeline, so changing one is itself a reviewed change with its own record.',
      noteCheck: 1
    },
    vs: {
      lead: 'The platform uses both: RAGAS for retrieval diagnostics and faithfulness, DeepEval alongside it for faithfulness in CI. How the two compare:',
      cols: ['', 'RAGAS', 'DeepEval'],
      rows: [
        ['What it is', 'A library of RAG and agent metrics plus test-set generation · VibrantLabs · 0.4.x', 'A pytest-style framework for unit-testing LLM apps · Confident AI · 4.x'],
        ['How tests run', 'Score a dataset with evaluate(); the pass/fail rule is yours to wire into CI', 'assert_test() with a threshold per metric, run by deepeval test run; pass/fail is built in'],
        ['RAG metrics', 'Context precision, context recall, faithfulness, response relevancy, noise sensitivity, context entities recall', 'Contextual precision, recall and relevancy, faithfulness, answer relevancy — and it can run RAGAS metrics too'],
        ['Custom judges', 'Aspect critic and rubric-based scoring', 'G-Eval (criteria-based) and DAG (a decision-graph judge)'],
        ['Agents', 'Tool call accuracy, agent goal accuracy, topic adherence', 'Task completion, tool correctness, plan adherence, plan quality and more'],
        ['Synthetic data', 'Knowledge-graph test sets with single- and multi-hop queries', 'Single- and multi-turn synthetic datasets (“goldens”)'],
        ['Role on this platform', 'Layer 1 retrieval metrics; layer 2 faithfulness', 'Layer 2 faithfulness in CI, beside RAGAS', 1]
      ],
      note: 'Two independent faithfulness implementations are a cross-check: when they disagree, the judge prompt or the claim splitting is the first suspect.',
      noteCheck: 1
    },
    read: {
      lead: 'A score that moves is a symptom. Reading two layers side by side usually names the cause.',
      cols: ['What moved', 'Also look at', 'Usual cause', 'Where the fix goes'],
      rows: [
        ['Faithfulness ↓', 'Context recall ↓ too', 'The evidence was never retrieved; the model filled the gap', 'Chunking, index or filters — layer 1'],
        ['Faithfulness ↓', 'Retrieval flat', 'The model strays from good context', 'Prompt, model version or reasoning effort — layer 2'],
        ['Task success ↓', 'Layers 1–2 flat', 'The right specialist was not called, or got the wrong task', 'Orchestrator planning — layer 3 traces'],
        ['Refusal rate ↓ suddenly', 'Citation coverage', 'A gate broke — quality did not improve', 'Validation code — layer 5'],
        ['Citation integrity fails', 'Nothing else matters', 'A citation does not resolve to the run’s evidence', 'Blocks the release outright']
      ],
      note: 'Agent-specific gates sit beside the seven: Knowledge must return the whole subtree on closure-table fixtures; Drug Safety is scored on seriousness-criteria recall, MedDRA coding and E2B(R3) structure.'
    },
    gate: ['A regression on any layer blocks the release', 'thresholds are fixed before the change', 'faithfulness has a threshold, citation integrity is pass/fail', 'eval datasets are versioned, validated artifacts']
  },

  /* ============================ Generic RAG system ============================ */
  generic: {
    sub: 'RAGAS and the seven layers · any RAG or agentic system',
    title: 'Seven views that must agree',
    thesis: 'Open-ended Q&amp;A rarely has one right answer, so no single score should decide a release. Seven layers each measure one thing. RAGAS covers two of them well; the other five cover what an LLM-judged metric cannot see — agent behaviour, hard rules, production, and expert judgment.',
    layers: [
      { name: 'Retrieval', q: 'Was the right evidence found?', tags: ['ragas'],
        lead: 'Context precision and context recall, measured apart from generation.',
        body: 'Rerun whenever parsing, chunking, embeddings or the index change. Measuring only the final answer hides retrieval regressions inside generation scores.',
        kv: [['Tool', 'RAGAS (or DeepEval)'], ['When', 'any index or chunking change'], ['Scored by', 'threshold']] },
      { name: 'Generation', q: 'Is the answer supported by its context?', tags: ['ragas'],
        lead: 'Faithfulness: the share of the answer’s claims that the retrieved context supports.',
        body: 'Gate it in CI with a threshold set before the change. Validate the LLM judge against human labels first — an unvalidated judge is a second opinion with no accountability.',
        kv: [['Tool', 'RAGAS · DeepEval'], ['When', 'every release candidate'], ['Scored by', 'threshold']] },
      { name: 'Agent trajectory', q: 'Did the system take sensible steps?', tags: [],
        lead: 'Tool calls, delegation and step order — for a single agent, its tool use; for several, who was asked to do what.',
        body: 'Good retrieval and faithful text can still come from the wrong plan. Read trajectories from traces, and score them with agent metrics where the steps are well defined.',
        kv: [['Tool', 'tracing — e.g. LangSmith, Arize Phoenix'], ['Metrics', 'tool call accuracy · goal accuracy'], ['Scored by', 'regression blocks']] },
      { name: 'Task success', q: 'Did the user get what they needed?', tags: [],
        lead: 'End-to-end success on realistic tasks, not isolated question-answer pairs.',
        body: 'Component metrics can all pass while the product fails the user. Score whole workflows the way people actually run them.',
        kv: [['Unit', 'a realistic task'], ['Explained by', 'layers 1–3'], ['Scored by', 'regression blocks']] },
      { name: 'Safety &amp; compliance', q: 'Are the hard rules held?', tags: ['hard'],
        lead: 'Whatever the domain cannot tolerate, checked deterministically: citation integrity, data leakage, policy rules.',
        body: 'Check these in code, not with a judge, and make them pass/fail. A good average elsewhere must not be able to compensate for a failure here.',
        kv: [['Tool', 'deterministic checks'], ['When', 'every answer · every release'], ['Scored by', 'pass / fail']] },
      { name: 'Operational', q: 'What happens once real users touch it?', tags: [],
        lead: 'Production signals: refusal rate, citation coverage, retrieval hit rate, latency and query drift.',
        body: 'Quality degrades before infrastructure metrics notice. Watch refusal rate in both directions — a sudden drop usually means a check broke.',
        kv: [['Tool', 'observability — e.g. Arize Phoenix, Langfuse'], ['When', 'continuous'], ['Scored by', 'alerts']] },
      { name: 'Expert review', q: 'Do the experts agree?', tags: [],
        lead: 'Domain experts review a sampled set on a cadence.',
        body: 'Automated eval scales; expert review keeps it honest. Their labels validate the judge and feed new examples into the eval sets.',
        kv: [['Who', 'domain experts'], ['When', 'recurring, sampled'], ['Feeds', 'labeled eval sets']] }
    ],
    edges: [
      [1, 2, 'why', 'sets the ceiling', 'Generation can only be faithful to what retrieval found — read a faithfulness drop next to context recall.'],
      [3, 4, 'why', 'explains', 'A task can fail with good retrieval and faithful text if the system took the wrong steps.'],
      [7, 2, 'check', 'validates the judge', 'Faithfulness scores should gate only after the judge agrees with expert labels.'],
      [7, 1, 'feed', 'supplies references', 'Context recall needs reference answers; expert findings become new labeled examples.'],
      [7, 4, 'feed', 'labels workflows', 'Expert findings add realistic tasks to the task-success set.'],
      [6, 1, 'feed', 'ages the eval set', 'Query drift shows when the eval set no longer looks like production traffic.'],
      [6, 5, 'check', 'watches the gate', 'A sudden drop in refusal rate is investigated as a broken check.'],
      [5, 2, 'check', 'does not average', 'Hard rules are pass/fail; a high faithfulness score cannot compensate for a failure.']
    ],
    ragas: {
      lead: 'RAGAS is an open-source library of LLM-judged metrics for retrieval-augmented generation (current release 0.4.x, maintained by VibrantLabs). It is strongest on layers 1 and 2, and it can also generate test sets from your documents.',
      cols: ['Metric', 'Question it answers', 'How it is scored', 'Needs a reference?', 'Layer'],
      rows: [
        ['Context precision', 'Are the relevant chunks ranked at the top?', 'Mean precision@k across the retrieved ranks — an irrelevant chunk at rank 1 costs more than one at rank 5', 'yes', '1'],
        ['Context recall', 'Did retrieval find everything the answer needs?', 'Share of the reference answer’s claims that the retrieved context supports', 'yes', '1'],
        ['Faithfulness', 'Is every claim in the answer supported by the context it was given?', 'Split the answer into claims, check each against the context; supported ÷ total', 'no', '2'],
        ['Response relevancy', 'Does the answer address the question?', 'Generate questions from the answer and compare them to the real one by embedding similarity — it does not check facts', 'no', '2 (supporting)']
      ],
      notes: [
        ['judge', 'check', 'Validate the judge first.', 'Score a sample with experts and with the LLM judge; trust the metric only where they agree.'],
        ['references', 'feed', 'Recall and precision need reference answers.', 'Without them you are limited to reference-free metrics such as faithfulness and response relevancy.'],
        ['limits', 'why', 'What RAGAS does not replace:', 'trajectory review, deterministic compliance checks, production monitoring and expert judgment.']
      ]
    },
    golden: {
      lead: 'A golden set is a held-out set of questions with reference answers and the evidence behind them. Every release candidate is scored on it.',
      steps: [
        ['Start from real questions', 'Seed it with questions real users or domain experts actually ask, not ones written to be easy.'],
        ['Reference answer plus evidence', 'Each question needs a reference answer and the documents that support it, or context recall and precision cannot be scored.'],
        ['Keep it held out', 'Never tune prompts or retrieval on the golden set itself; keep a separate development set for that.'],
        ['Cover the hard cases', 'Include multi-hop questions, questions the corpus cannot answer (the right output is a refusal), and adversarial phrasing.'],
        ['Expand synthetically', 'RAGAS builds a knowledge graph over the documents and synthesizes single-hop specific (50%), multi-hop abstract (25%) and multi-hop specific (25%) queries with reference answers by default. Review synthetic items before they count.'],
        ['Version it', 'Treat the set as an artifact: versioned, reviewed, and named in every evaluation report.']
      ],
      note: 'A golden set ages as user questions drift — refresh it from production samples on a schedule.'
    },
    thresholds: {
      lead: 'Set thresholds before the change and write them down, so a release is a check rather than a debate. Common anchors:',
      cols: ['Measure', 'Rule', 'How to set it'],
      rows: [
        ['Hard rules', 'pass / fail', 'Citation integrity, data leakage, policy: no threshold to argue about.'],
        ['Faithfulness', 'floor + no regression', 'An absolute floor nothing ships below, plus no drop against the current production version on the same golden-set version.'],
        ['Retrieval metrics', 'floor + no regression', 'The same, scored on every index or chunking change.'],
        ['Run-to-run noise', 'tolerance', 'Re-score the same version several times; only a drop beyond that spread counts as a regression.'],
        ['Judge agreement', 'precondition', 'Measure agreement between the LLM judge and expert labels before using the judge as a gate.'],
        ['Per-slice', 'thresholds by segment', 'Averages hide regressions in small, important slices — set thresholds for the slices that matter most.'],
        ['Latency · cost', 'budget', 'p95 and tokens per request, gated like quality.']
      ],
      note: 'Keep thresholds in the repo beside the pipeline, so changing one is itself a reviewed change.'
    },
    vs: {
      lead: 'Both are open-source and judge with an LLM; they differ mainly in workflow. Many teams use both.',
      cols: ['', 'RAGAS', 'DeepEval'],
      rows: [
        ['What it is', 'A library of RAG and agent metrics plus test-set generation · VibrantLabs · 0.4.x', 'A pytest-style framework for unit-testing LLM apps · Confident AI · 4.x'],
        ['How tests run', 'Score a dataset with evaluate(); the pass/fail rule is yours to wire into CI', 'assert_test() with a threshold per metric, run by deepeval test run; pass/fail is built in'],
        ['RAG metrics', 'Context precision, context recall, faithfulness, response relevancy, noise sensitivity, context entities recall', 'Contextual precision, recall and relevancy, faithfulness, answer relevancy — and it can run RAGAS metrics too'],
        ['Custom judges', 'Aspect critic and rubric-based scoring', 'G-Eval (criteria-based) and DAG (a decision-graph judge)'],
        ['Agents', 'Tool call accuracy, agent goal accuracy, topic adherence', 'Task completion, tool correctness, plan adherence, plan quality and more'],
        ['Synthetic data', 'Knowledge-graph test sets with single- and multi-hop queries', 'Single- and multi-turn synthetic datasets (“goldens”)'],
        ['Reach for it when', 'You want retrieval diagnostics and generated test sets', 'You want test-style assertions in CI and broad agent metrics']
      ],
      note: 'Running the same metric in both is a cheap cross-check: when two faithfulness implementations disagree, inspect the judge prompt and the claim splitting.'
    },
    read: {
      lead: 'A score that moves is a symptom. Reading two layers side by side usually names the cause.',
      cols: ['What moved', 'Also look at', 'Usual cause', 'Where the fix goes'],
      rows: [
        ['Faithfulness ↓', 'Context recall ↓ too', 'The evidence was never retrieved; the model filled the gap', 'Parsing, chunking, index or filters — layer 1'],
        ['Faithfulness ↓', 'Retrieval flat', 'The model strays from good context', 'Prompt, model version or settings — layer 2'],
        ['Task success ↓', 'Layers 1–2 flat', 'Wrong tool, wrong step or wrong delegation', 'Planning and tool use — layer 3 traces'],
        ['Refusal rate ↓ suddenly', 'Citation coverage', 'A check broke — quality did not improve', 'Validation code — layer 5'],
        ['A hard rule fails', 'Nothing else matters', 'The output broke a rule the domain cannot tolerate', 'Blocks the release outright']
      ],
      note: 'Add a gate for whatever each component exists to do — a domain-specific check catches what generic metrics never will.'
    },
    gate: ['A regression on any layer blocks the release', 'thresholds are set before the change', 'hard rules are pass/fail', 'eval datasets are versioned artifacts']
  }
};
COMPANIES.jj.eval = EVALUATION;
