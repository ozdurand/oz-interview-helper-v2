# Copilot backend — phase 0

Your dossier as a searchable knowledge base, behind a small signed-in API.
Phase 0 is the foundation the practice copilot and prep tools build on:
**dossier in → knowledge base → hybrid search out**, plus a retrieval test.

This folder is **not** published to GitHub Pages (the deploy workflows only
ship `index.html`, `.nojekyll` and `assets/`).

## What's here

    copilot/
      kb.py           dossier export → 748 entries (pitch, problem slides, every
                      card, every interview question and follow-up, pain points,
                      phases, the Evaluation page) with "to confirm" flags and the
                      exact source path of each entry
      search.py       hybrid search: BM25 (stemmed, with query expansion) +
                      character 4-grams (+ embeddings when configured), fused by
                      reciprocal rank (k = 60); filters applied before ranking
      embeddings.py   optional dense retrieval — Azure OpenAI or OpenAI
      auth.py         sign-in: one long token, or Microsoft Entra ID
      api.py          FastAPI: /health, /ingest, /search, /entries/{id}
    scripts/export_shipped.js   shipped content → data/shipped-export.json
    eval/             retrieval test (golden sets + report)
    tests/            22 tests: knowledge base, search, API, both sign-in modes

## How content gets in

1. In the site, press **Edit**, then **Send to copilot**. The first time it
   asks for the backend address and token (kept in your browser). It posts the
   same file **Export** downloads; the backend rebuilds its knowledge base and
   keeps the file, so a restart loads your latest edits.
2. With nothing sent yet, the backend starts from `data/shipped-export.json`
   (the site's shipped content). After changing the site's content files, run
   `node copilot/scripts/export_shipped.js` — CI fails if it's stale.

## Run it locally

    cd copilot
    pip install -r requirements-dev.txt
    export COPILOT_TOKEN=$(python -c "import secrets;print(secrets.token_urlsafe(32))")
    uvicorn copilot.api:app --port 8000
    curl localhost:8000/health
    curl -H "Authorization: Bearer $COPILOT_TOKEN" "localhost:8000/search?q=why+a+topic+per+agent"

Search filters: `company` (jj, hd, citi, sys), `map`, `kind` (card, qa, push,
pain, phase, eval, pitch, problem), `variant` (fraud, credit, aml), `k`.

## Settings

| Variable | Meaning |
|---|---|
| `AUTH_MODE` | `token` (default) or `entra` |
| `COPILOT_TOKEN` | the sign-in token for `token` mode — 24+ characters; unset means every protected call is refused |
| `ENTRA_TENANT_ID`, `ENTRA_AUDIENCE`, `ENTRA_ALLOWED_OIDS` | `entra` mode: tenant, the API's app ID URI or client ID, and (optionally) the only user object IDs allowed in |
| `EMBEDDINGS` | `azure` or `openai` to add dense retrieval; unset = keyword retrievers only |
| `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_EMBED_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION` | Azure OpenAI embeddings |
| `OPENAI_API_KEY`, `OPENAI_EMBED_MODEL` | OpenAI embeddings (default `text-embedding-3-large`) |
| `DATA_DIR` | where the latest export and the embedding cache are kept (`/data` in the container — mount a volume) |
| `ALLOWED_ORIGINS` | CORS origins (default the GitHub Pages site and `http://localhost:8790`) |

## Retrieval test

    python -m eval.run_eval            # writes eval/report.md

- **A1:** every interview question in the dossier against cards only.
- **A2:** the same questions against the full index, leave-one-out.
- **B:** 50 questions written in an interviewer's words.
- **C:** B plus the project context the live copilot will know.

Current numbers are in `eval/report.md`. The misses there are paraphrases
with no shared words, which is the gap embeddings close: rerun with
`EMBEDDINGS=azure` (or `openai`) set to compare.

## Deploy

Any container host works:

    docker build -t oz-copilot copilot/
    docker run -p 8000:8000 -e COPILOT_TOKEN=… -v copilot-data:/data oz-copilot

On Azure Container Apps (check the flags against your `az` version):

    az containerapp up --name oz-copilot --resource-group <rg> --source copilot \
      --ingress external --target-port 8000 --env-vars AUTH_MODE=token COPILOT_TOKEN=secretref:copilot-token

Store the token as a secret, mount Azure Files at `/data` so the latest export
survives restarts, then point the site's **Send to copilot** at the app's URL.
