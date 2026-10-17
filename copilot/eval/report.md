# Copilot retrieval test

Knowledge base: **748 entries** · retrievers: **bm25, chars** fused by reciprocal rank (k = 60) · about 1.19 ms per query

| Run | Questions | Recall@1 | Recall@3 | Recall@5 | MRR@10 |
|---|---|---|---|---|---|
| A1 · card questions → cards only | 427 | 47% | 70% | 75% | 0.59 |
| A2 · card questions → full index, leave-one-out | 427 | 28% | 54% | 63% | 0.43 |
| B · interviewer phrasing → full index | 50 | 72% | 84% | 88% | 0.78 |
| C · interviewer phrasing + project context | 50 | 74% | 88% | 90% | 0.81 |

**A2 by company**

| Company | Questions | Recall@1 | Recall@5 |
|---|---|---|---|
| citi | 129 | 31% | 70% |
| hd | 88 | 25% | 60% |
| jj | 115 | 23% | 56% |
| sys | 95 | 32% | 67% |

**B — questions where no acceptable card was in the top 3 (8)**

- Walk me through how a request flows through your multi-agent platform. — best acceptable at rank 6; top 3: jj/phase/prod, home/pitch, jj/phase/mvp
- How did you handle conversation memory across turns? — best acceptable at rank 4; top 3: hd/chunk, hd/emb, jj/emb
- How do you know your verifier isn't just agreeing with the generator? — best acceptable at rank >10; top 3: hd/pg, jj/L_ret, jj/aoai
- How did you keep the two search indexes consistent with each other? — best acceptable at rank >10; top 3: rag/ix, jj/L_onto, jj/L_ret
- Why was the LLM answer generation only added at the very end? — best acceptable at rank 8; top 3: rag/ql, eval/generic/ragas, home/problem/role
- How did you handle files that were labeled with the wrong type? — best acceptable at rank 5; top 3: hd/chunk, hd/emb, jj/emb
- What would you not do again on that search project? — best acceptable at rank >10; top 3: rag/r_src, jj/emb, hd/E
- What do you do when the retrieved context doesn't fit in the context window? — best acceptable at rank >10; top 3: jj/L_ret, eval/generic/layer1, eval/jj/layer1
