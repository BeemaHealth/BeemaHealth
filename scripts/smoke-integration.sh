#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose -f backend/docker-compose.yml exec -T api python manage.py smoke_clinical_flow "$@"
