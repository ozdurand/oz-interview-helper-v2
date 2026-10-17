# Copilot backend — phases 0 and 1

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
      jd.py           phase 1: job description → coverage, prep guide, résumé draft
      api.py          FastAPI: /health, /ingest, /search, /entries/{id}, /jd/analyze,
                      /applications
    scripts/export_shipped.js   shipped content → data/shipped-export.json
    eval/             retrieval test (golden sets + report)
    tests/            39 tests: knowledge base, search, API, both sign-in modes,
                      embeddings outages, job descriptions and applications
    deploy/azure/     Bicep template, deploy script, GitHub roll-out set-up

## Phase 1 — applications

On the site, **Applications** (home page button, `#/apps`): paste a job
description and the copilot returns, from your dossier only:

- **Coverage** — each requirement (must / nice-to-have / role / logistics)
  marked *covered*, *partly* or *gap*, with the dossier answers that back it.
  A product the posting names (Kafka, Terraform, Airflow…) counts only if the
  dossier names it too; "X or Y" is covered by either. Years, degrees and
  logistics are left for you to answer.
- **Prep guide** — stories to lead with, the questions they're likely to ask
  with your dossier answers, gaps to prepare for, "to confirm" items, and
  questions to ask them.
- **Résumé draft** — bullets taken from dossier entries in dossier order, plus
  what it left out because the dossier doesn't show it. Copy or download as
  Markdown.

No language model is involved: parsing uses the posting's own structure and a
skills vocabulary (`copilot/jd.py`), and coverage reuses the hybrid search.

| Endpoint | |
|---|---|
| `POST /jd/analyze` | analyse a posting without saving |
| `POST /applications` | analyse and save (`text`, optional `title`, `company`) |
| `GET /applications`, `GET /applications/{id}` | list, open |
| `POST /applications/{id}/refresh` | re-run against the current dossier (after you send new edits) |
| `DELETE /applications/{id}` | delete |

Applications are kept in `DATA_DIR/applications/` (the Azure file share).

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

## Deploy to Azure Container Apps

What gets created, in its own resource group (`deploy/azure/main.bicep`):

| Resource | Why |
|---|---|
| Container app `oz-copilot` | the API over HTTPS; 0.25 vCPU / 0.5 GiB; scales to zero when idle; one replica (the index lives in memory, so `/ingest` must rebuild the copy that answers `/search`) |
| Container Apps environment | Consumption profile |
| Storage account + `copilot-data` file share | mounted at `/data`: the latest export you sent and the embedding cache survive restarts and new versions |
| Log Analytics workspace | app logs, 30-day retention, 1 GB/day cap |

Cost: a personal-use API sits inside the Container Apps monthly free grant
(180,000 vCPU-seconds, 360,000 GiB-seconds, 2 million requests per
subscription); the file share and logs come to cents. The image lives on
GitHub's registry, so there is no Azure Container Registry to pay for. The
first request after a quiet spell waits a few seconds while it scales up from
zero — set `MIN_REPLICAS=1` to keep it warm (that uses the free grant up
faster).

### 1. The image (automatic)

Every push to `main` that touches the copilot runs the tests, builds
`ghcr.io/ozdurand/oz-copilot` (tagged with the commit and `latest`),
starts it and checks `/health`, sign-in and that `/data` is writable. The run
summary says whether Azure can pull it without a password; if it says the
package is private, make it public once at
<https://github.com/users/ozdurand/packages/container/oz-copilot/settings>
(it holds only code that is already public here — your edits never go into
the image, they live in the file share).

### 2. Deploy (once, about 5 minutes)

In [Azure Cloud Shell](https://shell.azure.com) (Bash):

    git clone https://github.com/ozdurand/oz-interview-helper-v2
    bash oz-interview-helper-v2/copilot/deploy/azure/deploy.sh

Defaults: resource group `oz-copilot-rg` in `eastus`; set `LOCATION=westeurope`
(or another region) in front of the command to change it. The script
registers the resource providers, pins the newest image by digest, generates a
48-character sign-in token, deploys, then checks `/health`, that search
without the token is refused, that search with it works, and that the site
is allowed to call it. It prints the address and the token — save the token
in your password manager.

Then, in the site: **Edit → Send to copilot**, paste the address and the token.

Run the script again any time: it keeps the token and settings and rolls
forward to the newest image. `SHOW_TOKEN=1` prints the token again.

**Embeddings (optional).** With an Azure OpenAI embeddings deployment:

    EMBEDDINGS=azure AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com \
    AZURE_OPENAI_EMBED_DEPLOYMENT=<deployment> AZURE_OPENAI_API_KEY=<key> \
    bash oz-interview-helper-v2/copilot/deploy/azure/deploy.sh

(or `EMBEDDINGS=openai OPENAI_API_KEY=…`). The key is stored as a container
app secret. If the key is wrong or the provider is down, the API keeps
answering with the keyword retrievers and `/health` shows `"dense": "failed"`.

### 3. Automatic roll-outs from GitHub (optional)

    bash oz-interview-helper-v2/copilot/deploy/azure/github-oidc.sh

Creates an app registration that trusts only workflow runs on this repo's
`main` (OpenID Connect — no Azure password stored in GitHub), gives it
Contributor on the copilot's resource group only, and prints five repository
variables to add (or sets them with `gh`). From then on each push to `main`
that touches the copilot rolls out a new revision and waits until it answers.

### Useful commands

    az containerapp logs show -n oz-copilot -g oz-copilot-rg --tail 100      # logs
    az containerapp revision list -n oz-copilot -g oz-copilot-rg -o table    # versions
    az containerapp secret show -n oz-copilot -g oz-copilot-rg --secret-name copilot-token --query value -o tsv
    az group delete -n oz-copilot-rg                                         # remove everything

To change the token: `COPILOT_TOKEN=<new 24+ chars> bash …/deploy.sh`, then
paste the new one in the site (**Send to copilot** asks again after a 401).

### Any other container host

    docker build -t oz-copilot copilot/
    docker run -p 8000:8000 -e COPILOT_TOKEN=… -v copilot-data:/data oz-copilot
