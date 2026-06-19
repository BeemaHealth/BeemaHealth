#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for local backend development."
  echo
  if [[ "$(uname -s)" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
    echo "On macOS with Homebrew, install Docker Desktop:"
    echo "  brew install --cask docker"
    echo "  open -a Docker          # first launch — wait until the whale icon is steady"
    echo
  fi
  echo "Or download: https://docs.docker.com/desktop/setup/install/mac-install/"
  echo "Full setup guide: docs/LOCAL-DEV.md"
  exit 1
fi

wait_for_docker() {
  local max_wait="${1:-90}"
  local elapsed=0
  while ! docker info >/dev/null 2>&1; do
    if [[ "$elapsed" -ge "$max_wait" ]]; then
      echo "Docker did not become ready within ${max_wait}s."
      echo "Open Docker Desktop manually, wait for it to finish starting, then retry."
      exit 1
    fi
    if (( elapsed == 0 )); then
      echo "Waiting for Docker to start..."
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  if [[ "$elapsed" -gt 0 ]]; then
    echo "Docker is ready."
  fi
}

if ! docker info >/dev/null 2>&1; then
  if [[ "$(uname -s)" == "Darwin" ]]; then
    echo "Docker is installed but not running. Starting Docker Desktop..."
    open -a Docker 2>/dev/null || true
    wait_for_docker 90
  else
    echo "Docker is installed but not running. Start Docker Desktop and retry."
    exit 1
  fi
fi

port_in_use() {
  lsof -iTCP:"$1" -sTCP:LISTEN -n -P >/dev/null 2>&1
}

if port_in_use 8000; then
  echo "Port 8000 is already in use. Stop the other process and retry:"
  echo "  lsof -ti:8000 | xargs kill"
  exit 1
fi

ARETIDE_ENV="${ARETIDE_ENV:-dev}"
ENV_FILE=".env.${ARETIDE_ENV}"

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f .env ]]; then
    echo "Note: $ENV_FILE not found — falling back to .env (ARETIDE_ENV=${ARETIDE_ENV})."
    ENV_FILE=".env"
  else
    echo "Warning: no $ENV_FILE or .env found. Create or edit .env.dev at the repo root and set FERNET_KEY."
  fi
  echo
fi

COMPOSE=(docker compose -f backend/docker-compose.yml)
if [[ -f "$ENV_FILE" ]]; then
  COMPOSE+=(--env-file "$ENV_FILE")
fi
export ARETIDE_ENV
"${COMPOSE[@]}" run --rm api python manage.py migrate
exec "${COMPOSE[@]}" up "$@"
