#!/usr/bin/env bash
# Deploy (or update) the copilot API on Azure Container Apps.
#
# Run it in Azure Cloud Shell (Bash) — az, curl and python3 are already there:
#
#     git clone https://github.com/ozdurand/oz-interview-helper-v2
#     bash oz-interview-helper-v2/copilot/deploy/azure/deploy.sh
#
# Safe to run again: it keeps the existing sign-in token and embeddings settings
# unless you pass new ones, and rolls the app forward to the newest image.
#
# Settings (environment variables, all optional):
#   RG               resource group                       (oz-copilot-rg)
#   LOCATION         region for a new resource group      (eastus; e.g. westeurope, uksouth)
#   NAME             container app name                   (oz-copilot)
#   IMAGE            image to run                         (ghcr.io/ozdurand/oz-copilot:latest, pinned to its digest)
#   ALLOWED_ORIGINS  sites allowed to call the API        (https://ozdurand.github.io)
#   MIN_REPLICAS     0 = scale to zero when idle, 1 = always warm   (0)
#   COPILOT_TOKEN    sign-in token; generated on first deploy when unset
#   EMBEDDINGS       none | azure | openai                (keeps the current setting)
#     azure:  AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_EMBED_DEPLOYMENT, AZURE_OPENAI_API_KEY
#     openai: OPENAI_API_KEY, OPENAI_EMBED_MODEL (text-embedding-3-large)
#   REGISTRY_USERNAME, REGISTRY_PASSWORD   only if the image is private
#   SHOW_TOKEN=1     print the existing token on a re-run
set -euo pipefail

RG=${RG:-oz-copilot-rg}
NAME=${NAME:-oz-copilot}
IMAGE=${IMAGE:-ghcr.io/ozdurand/oz-copilot:latest}
ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-https://ozdurand.github.io}
MIN_REPLICAS=${MIN_REPLICAS:-0}
REGISTRY_USERNAME=${REGISTRY_USERNAME:-}
REGISTRY_PASSWORD=${REGISTRY_PASSWORD:-}
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
export AZURE_EXTENSION_USE_DYNAMIC_INSTALL=yes_without_prompt

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31mStopped:\033[0m %s\n' "$*" >&2; exit 1; }

for cmd in az curl python3; do command -v "$cmd" >/dev/null || die "$cmd is not installed (Azure Cloud Shell has all of these)"; done

# ---------------------------------------------------------------- account ---
bold "1/5  Azure account"
az account show -o none 2>/dev/null || die "not signed in — run: az login"
az account show --query "{subscription:name, id:id, signedInAs:user.name}" -o table
echo "  (to use another subscription: az account set --subscription <name or id>, then run this again)"

for ns in Microsoft.App Microsoft.OperationalInsights Microsoft.Storage; do
  state=$(az provider show -n "$ns" --query registrationState -o tsv 2>/dev/null || echo NotRegistered)
  if [ "$state" != Registered ]; then
    echo "  registering $ns (one time, can take a minute)…"
    az provider register -n "$ns" --wait -o none
  fi
done
ok "resource providers registered"

# ------------------------------------------------------------------ image ---
bold "2/5  Container image"
resolve_ghcr() {  # ghcr.io/owner/name[:tag] → ghcr.io/owner/name@sha256:… ; prints the HTTP status on failure
  local img=$1 path tag auth=() token code hdrs digest
  path=${img#ghcr.io/}
  if [[ $path == *:* ]]; then tag=${path##*:}; path=${path%:*}; else tag=latest; fi
  [ -n "$REGISTRY_PASSWORD" ] && auth=(-u "$REGISTRY_USERNAME:$REGISTRY_PASSWORD")
  token=$(curl -s "${auth[@]}" "https://ghcr.io/token?scope=repository:${path}:pull" \
          | python3 -c 'import json,sys; print(json.load(sys.stdin).get("token",""))' 2>/dev/null || true)
  hdrs=$(mktemp)
  code=$(curl -s -o /dev/null -D "$hdrs" -w '%{http_code}' -I \
    -H "Authorization: Bearer ${token:-none}" \
    -H "Accept: application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json" \
    "https://ghcr.io/v2/${path}/manifests/${tag}") || true
  digest=$(tr -d '\r' < "$hdrs" | awk -F': ' 'tolower($1)=="docker-content-digest"{print $2}')
  rm -f "$hdrs"
  if [ "$code" = 200 ] && [ -n "$digest" ]; then echo "ghcr.io/${path}@${digest}"; return 0; fi
  case "${code:-000}" in
    000) echo "could not reach ghcr.io" ;;
    401|403|404) echo "HTTP $code: not built yet, or private" ;;
    *) echo "HTTP $code" ;;
  esac
  return 1
}

if [[ $IMAGE == ghcr.io/* && $IMAGE != *@sha256:* ]]; then
  if ! resolved=$(resolve_ghcr "$IMAGE"); then
    owner=$(echo "${IMAGE#ghcr.io/}" | cut -d/ -f1); pkg=$(echo "${IMAGE#ghcr.io/}" | cut -d/ -f2 | cut -d: -f1)
    die "can't read $IMAGE ($resolved).
  • Has GitHub built it yet? The 'Copilot backend' workflow builds it on every push to main:
      https://github.com/${owner}/oz-interview-helper-v2/actions
  • Is the package private? Make it public once (it only holds code that is already public in the repo):
      https://github.com/users/${owner}/packages/container/${pkg}/settings  →  Change visibility → Public
    or run again with REGISTRY_USERNAME=<github user> REGISTRY_PASSWORD=<token with read:packages>."
  fi
  IMAGE=$resolved
fi
ok "$IMAGE"

# ------------------------------------------------- settings to keep or set ---
bold "3/5  Settings"
if [ "$(az group exists -n "$RG")" = true ]; then
  LOCATION=$(az group show -n "$RG" --query location -o tsv)
  ok "resource group $RG ($LOCATION) exists"
else
  LOCATION=${LOCATION:-eastus}
  az group create -n "$RG" -l "$LOCATION" --tags app=oz-copilot -o none
  ok "created resource group $RG in $LOCATION"
fi

EXISTS=0
az containerapp show -n "$NAME" -g "$RG" -o none 2>/dev/null && EXISTS=1
cur_env()    { [ $EXISTS = 1 ] && az containerapp show -n "$NAME" -g "$RG" --query "properties.template.containers[0].env[?name=='$1'].value | [0]" -o tsv 2>/dev/null || true; }
cur_secret() { [ $EXISTS = 1 ] && az containerapp secret show -n "$NAME" -g "$RG" --secret-name "$1" --query value -o tsv 2>/dev/null || true; }

NEW_TOKEN=0
TOKEN_FROM="you provided"
if [ -z "${COPILOT_TOKEN:-}" ]; then COPILOT_TOKEN=$(cur_secret copilot-token); TOKEN_FROM="existing"; fi
if [ -z "$COPILOT_TOKEN" ]; then
  COPILOT_TOKEN=$(python3 -c 'import secrets, string; a = string.ascii_letters + string.digits; print("".join(secrets.choice(a) for _ in range(48)))')
  NEW_TOKEN=1
  ok "generated a new 48-character sign-in token"
else
  [ ${#COPILOT_TOKEN} -ge 24 ] || die "COPILOT_TOKEN must be at least 24 characters"
  if [ "$TOKEN_FROM" = existing ]; then ok "keeping the existing sign-in token"; else ok "using the sign-in token you provided"; fi
fi

EMBEDDINGS=${EMBEDDINGS:-$(cur_env EMBEDDINGS)}
EMBEDDINGS=${EMBEDDINGS:-none}
EMB_KEY=""; AOAI_ENDPOINT=""; AOAI_DEPLOYMENT=""; OAI_MODEL=${OPENAI_EMBED_MODEL:-text-embedding-3-large}
case "$EMBEDDINGS" in
  none) ok "embeddings off — keyword retrievers only" ;;
  azure)
    AOAI_ENDPOINT=${AZURE_OPENAI_ENDPOINT:-$(cur_env AZURE_OPENAI_ENDPOINT)}
    AOAI_DEPLOYMENT=${AZURE_OPENAI_EMBED_DEPLOYMENT:-$(cur_env AZURE_OPENAI_EMBED_DEPLOYMENT)}
    EMB_KEY=${AZURE_OPENAI_API_KEY:-$(cur_secret embeddings-key)}
    [ -n "$AOAI_ENDPOINT" ] && [ -n "$AOAI_DEPLOYMENT" ] && [ -n "$EMB_KEY" ] \
      || die "EMBEDDINGS=azure needs AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_EMBED_DEPLOYMENT and AZURE_OPENAI_API_KEY"
    ok "embeddings: Azure OpenAI deployment $AOAI_DEPLOYMENT" ;;
  openai)
    EMB_KEY=${OPENAI_API_KEY:-$(cur_secret embeddings-key)}
    [ -n "$EMB_KEY" ] || die "EMBEDDINGS=openai needs OPENAI_API_KEY"
    OAI_MODEL=${OPENAI_EMBED_MODEL:-$(cur_env OPENAI_EMBED_MODEL)}; OAI_MODEL=${OAI_MODEL:-text-embedding-3-large}
    ok "embeddings: OpenAI $OAI_MODEL" ;;
  *) die "EMBEDDINGS must be none, azure or openai (got: $EMBEDDINGS)" ;;
esac
if [ -z "$REGISTRY_PASSWORD" ] && [ $EXISTS = 1 ]; then
  REGISTRY_PASSWORD=$(cur_secret registry-password)
  [ -n "$REGISTRY_PASSWORD" ] && REGISTRY_USERNAME=$(az containerapp show -n "$NAME" -g "$RG" --query "properties.configuration.registries[0].username" -o tsv)
fi

# ----------------------------------------------------------------- deploy ---
bold "4/5  Deploying (first time: about 3–5 minutes)"
umask 077
PARAMS=$(mktemp --suffix=.json)
trap 'rm -f "$PARAMS"' EXIT
NAME=$NAME IMAGE=$IMAGE COPILOT_TOKEN=$COPILOT_TOKEN ALLOWED_ORIGINS=$ALLOWED_ORIGINS MIN_REPLICAS=$MIN_REPLICAS \
EMBEDDINGS=$EMBEDDINGS AOAI_ENDPOINT=$AOAI_ENDPOINT AOAI_DEPLOYMENT=$AOAI_DEPLOYMENT OAI_MODEL=$OAI_MODEL EMB_KEY=$EMB_KEY \
REGISTRY_USERNAME=$REGISTRY_USERNAME REGISTRY_PASSWORD=$REGISTRY_PASSWORD python3 - "$PARAMS" <<'PY'
import json, os, sys
e = os.environ
p = {"name": e["NAME"], "image": e["IMAGE"], "copilotToken": e["COPILOT_TOKEN"], "allowedOrigins": e["ALLOWED_ORIGINS"],
     "minReplicas": int(e["MIN_REPLICAS"]), "embeddings": e["EMBEDDINGS"], "azureOpenAiEndpoint": e["AOAI_ENDPOINT"],
     "azureOpenAiDeployment": e["AOAI_DEPLOYMENT"], "openAiModel": e["OAI_MODEL"], "embeddingsKey": e["EMB_KEY"],
     "registryUsername": e["REGISTRY_USERNAME"], "registryPassword": e["REGISTRY_PASSWORD"]}
json.dump({"$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
           "contentVersion": "1.0.0.0", "parameters": {k: {"value": v} for k, v in p.items()}}, open(sys.argv[1], "w"))
PY

URL=$(az deployment group create -g "$RG" -n "oz-copilot-$(date -u +%Y%m%d-%H%M%S)" \
        --template-file "$HERE/main.bicep" --parameters @"$PARAMS" \
        --query properties.outputs.url.value -o tsv) || die "the deployment failed — the error above says why"
ok "deployed: $URL"

# ----------------------------------------------------------------- verify ---
bold "5/5  Checking it works"
echo "  waiting for the app to answer (a cold start takes a few seconds)…"
health=""
for _ in $(seq 1 36); do
  health=$(curl -fsS --max-time 20 "$URL/health" 2>/dev/null) && break
  health=""; sleep 5
done
[ -n "$health" ] || die "no answer from $URL/health after 3 minutes — see the logs:
    az containerapp logs show -n $NAME -g $RG --tail 100"
echo "$health" | python3 -c 'import json,sys; h=json.load(sys.stdin); print("  \033[32m✓\033[0m /health: %s entries from the %s content, retrievers %s, embeddings %s" % (h["entries"], h["source"], "+".join(h["retrievers"]), h.get("dense", "off")))'

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$URL/search?q=service+bus")
if [ "$code" = 401 ]; then ok "search without the token is refused (401)"; else warn "search without the token returned $code (expected 401)"; fi

top=$(curl -fsS --max-time 20 -H "Authorization: Bearer $COPILOT_TOKEN" "$URL/search?q=why+a+topic+per+agent&k=1" \
      | python3 -c 'import json,sys; h=json.load(sys.stdin)["hits"]; print(h[0]["title"] if h else "")') || top=""
if [ -n "$top" ]; then ok "search with the token works — top answer: $top"; else warn "search with the token failed"; fi

origin=${ALLOWED_ORIGINS%%,*}
acao=$(curl -s -D - -o /dev/null --max-time 20 -X OPTIONS -H "Origin: $origin" -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: authorization,content-type" "$URL/ingest" | tr -d '\r' | awk -F': ' 'tolower($1)=="access-control-allow-origin"{print $2}')
if [ "$acao" = "$origin" ]; then ok "the site ($origin) is allowed to send to it"; else warn "browser access from $origin is not allowed (got '${acao:-nothing}')"; fi

# ------------------------------------------------------------------- done ---
bold "Done"
cat <<EOF
  Address:  $URL
EOF
if [ $NEW_TOKEN = 1 ] || [ "${SHOW_TOKEN:-0}" = 1 ]; then
  cat <<EOF
  Token:    $COPILOT_TOKEN

  Save the token in your password manager now — it is the only key to the API.
EOF
else
  echo "  Token:    unchanged (run again with SHOW_TOKEN=1 to print it)"
fi
cat <<EOF

  Next, in the site: press Edit → Send to copilot, paste the address and the token.
  The app keeps what you send in its file share, so restarts and new versions keep your edits.

  Optional — let GitHub roll out new versions on every push to main:
      bash $HERE/github-oidc.sh
EOF
