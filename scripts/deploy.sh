#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Run on the EC2 instance (or call via SSH from CI). It pulls latest code, rebuilds
# the Docker image, and restarts the stack. Adjust paths to match your server layout.
# Usage (on server):
#   export DEPLOY_DIR=/opt/smart-file-share
#   export APP_USER=ubuntu
#   ./scripts/deploy.sh
# Or from laptop:
#   ssh ubuntu@EC2 "bash -s" < scripts/deploy.sh
# -----------------------------------------------------------------------------

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$HOME/smart-file-share}"
REPO_URL="${REPO_URL:-}" # optional: git@github.com:you/smart-file-share.git
BRANCH="${BRANCH:-main}"

echo "[deploy] using DEPLOY_DIR=$DEPLOY_DIR"

if [[ ! -d "$DEPLOY_DIR" ]]; then
  if [[ -n "$REPO_URL" ]]; then
    echo "[deploy] cloning $REPO_URL"
    git clone -b "$BRANCH" "$REPO_URL" "$DEPLOY_DIR"
  else
    echo "Directory $DEPLOY_DIR missing and REPO_URL not set. Clone your repo there first."
    exit 1
  fi
fi

cd "$DEPLOY_DIR"
echo "[deploy] git pull"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

if [[ ! -f .env ]]; then
  echo "[deploy] ERROR: .env is missing. Copy .env.example to .env and fill in secrets on the server."
  exit 1
fi

echo "[deploy] docker compose build and up"
# Amazon Linux 2023 ships old buildx; Compose 2.40+ defaults to "bake" and needs buildx 0.17+.
# COMPOSE_BAKE=0 uses the legacy build path (see: github.com/amazonlinux/amazon-linux-2023 issues).
export COMPOSE_BAKE=0
docker compose --env-file .env pull 2>/dev/null || true
docker compose --env-file .env build
docker compose --env-file .env up -d

echo "[deploy] done. Health check:"
curl -sS "http://127.0.0.1:3000/api/health" || true
echo
