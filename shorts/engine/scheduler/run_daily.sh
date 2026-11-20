#!/bin/zsh
# Daily Beema video job. Idempotent per date. Logs to shorts/engine/state/daily.log.
set -u
cd "$(dirname "$0")/../../.."
mkdir -p shorts/engine/state
PY=shorts/pde5-explainer/.venv/bin/python
# optional: export SLACK_BOT_TOKEN in shorts/engine/.env (git-ignored) - never commit tokens
[ -f shorts/engine/.env ] && set -a && . shorts/engine/.env && set +a
echo "=== $(date) ===" >> shorts/engine/state/daily.log
$PY shorts/engine/beema.py daily >> shorts/engine/state/daily.log 2>&1
