#!/usr/bin/env bash
# Let GitHub Actions roll out each new copilot image to the container app —
# with OpenID Connect, so no Azure password or key is stored in GitHub.
#
# Run in Azure Cloud Shell after deploy.sh:
#     bash oz-interview-helper-v2/copilot/deploy/azure/github-oidc.sh
#
# It creates (or reuses) an app registration "<NAME>-github-deploy" that trusts
# only workflow runs on REPO's BRANCH, gives it Contributor on the copilot's
# resource group and nothing else, and prints the five repository variables the
# workflow reads. Safe to run again.
#
# Settings: RG (oz-copilot-rg), NAME (oz-copilot),
#           REPO (ozdurand/oz-interview-helper-v2), BRANCH (main)
set -euo pipefail

RG=${RG:-oz-copilot-rg}
NAME=${NAME:-oz-copilot}
REPO=${REPO:-ozdurand/oz-interview-helper-v2}
BRANCH=${BRANCH:-main}
DISPLAY_NAME="${NAME}-github-deploy"
export AZURE_EXTENSION_USE_DYNAMIC_INSTALL=yes_without_prompt

ok()  { printf '  \033[32m✓\033[0m %s\n' "$*"; }
die() { printf '\n\033[31mStopped:\033[0m %s\n' "$*" >&2; exit 1; }

az account show -o none 2>/dev/null || die "not signed in — run: az login"
SUB=$(az account show --query id -o tsv)
TENANT=$(az account show --query tenantId -o tsv)
RG_ID=$(az group show -n "$RG" --query id -o tsv 2>/dev/null) || die "resource group $RG not found — run deploy.sh first"
az containerapp show -n "$NAME" -g "$RG" -o none 2>/dev/null || die "container app $NAME not found in $RG — run deploy.sh first"

APP_ID=$(az ad app list --display-name "$DISPLAY_NAME" --query "[0].appId" -o tsv)
if [ -z "$APP_ID" ]; then
  APP_ID=$(az ad app create --display-name "$DISPLAY_NAME" --sign-in-audience AzureADMyOrg --query appId -o tsv)
  ok "created app registration $DISPLAY_NAME"
else
  ok "reusing app registration $DISPLAY_NAME"
fi
az ad sp show --id "$APP_ID" -o none 2>/dev/null || az ad sp create --id "$APP_ID" -o none
SP_ID=$(az ad sp show --id "$APP_ID" --query id -o tsv)

SUBJECT="repo:${REPO}:ref:refs/heads/${BRANCH}"
if [ -z "$(az ad app federated-credential list --id "$APP_ID" --query "[?subject=='$SUBJECT'].name" -o tsv)" ]; then
  az ad app federated-credential create --id "$APP_ID" -o none --parameters "{
    \"name\": \"github-${BRANCH//[^A-Za-z0-9-]/-}\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"$SUBJECT\",
    \"description\": \"GitHub Actions on $REPO $BRANCH deploys the copilot\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"
fi
ok "trusts only: $SUBJECT"

if [ -z "$(az role assignment list --assignee "$SP_ID" --scope "$RG_ID" --role Contributor --query "[0].id" -o tsv)" ]; then
  # a new service principal can take a few seconds to be visible to role assignments
  for i in 1 2 3 4 5 6; do
    az role assignment create --assignee-object-id "$SP_ID" --assignee-principal-type ServicePrincipal \
      --role Contributor --scope "$RG_ID" -o none 2>/dev/null && break
    [ "$i" = 6 ] && die "could not grant Contributor on $RG — do you have Owner or User Access Administrator there?"
    sleep 10
  done
fi
ok "Contributor on resource group $RG only"

cat <<EOF

Add these as repository variables (Settings → Secrets and variables → Actions → Variables):
  https://github.com/${REPO}/settings/variables/actions

  AZURE_CLIENT_ID        $APP_ID
  AZURE_TENANT_ID        $TENANT
  AZURE_SUBSCRIPTION_ID  $SUB
  AZURE_RESOURCE_GROUP   $RG
  AZURE_CONTAINER_APP    $NAME

None of these is a secret: they only work for workflow runs on ${REPO} ${BRANCH}.
EOF

if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  read -r -p $'\nSet them now with the GitHub CLI? [y/N] ' yn
  if [[ $yn == [yY]* ]]; then
    gh variable set AZURE_CLIENT_ID -R "$REPO" -b "$APP_ID"
    gh variable set AZURE_TENANT_ID -R "$REPO" -b "$TENANT"
    gh variable set AZURE_SUBSCRIPTION_ID -R "$REPO" -b "$SUB"
    gh variable set AZURE_RESOURCE_GROUP -R "$REPO" -b "$RG"
    gh variable set AZURE_CONTAINER_APP -R "$REPO" -b "$NAME"
    ok "variables set — the next push to $BRANCH that touches the copilot will roll out"
  fi
fi
