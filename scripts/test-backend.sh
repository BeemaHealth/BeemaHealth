#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  . .venv/bin/activate
  pip install -q -r requirements/base.txt
else
  . .venv/bin/activate
fi

python manage.py test \
  apps.common.tests \
  apps.accounts.tests \
  apps.eligibility.tests \
  apps.intakes.tests \
  apps.consents.tests \
  apps.documents.tests \
  --settings=config.settings_test \
  "$@"
