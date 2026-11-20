#!/bin/zsh
# Nightly Beema video job (04:00): finds highly searched topics, makes 2 organic videos (15-45 s), delivers them to Slack
# for human review. Idempotent per date. Logs to shorts/engine/state/nightly.log. NEVER publishes to social platforms.
set -u
cd "$(dirname "$0")/../../.."
mkdir -p shorts/engine/state
# launchd starts with a minimal PATH: node/npx (Remotion render) and claude (Slack delivery) must be findable
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
PY=shorts/pde5-explainer/.venv/bin/python
# optional: SLACK_BOT_TOKEN in shorts/engine/.env (git-ignored) - never commit tokens
[ -f shorts/engine/.env ] && set -a && . shorts/engine/.env && set +a
echo "=== $(date) nightly start ===" >> shorts/engine/state/nightly.log
# keep the Mac awake while it works (render can take several minutes)
/usr/bin/caffeinate -i $PY shorts/engine/beema.py nightly >> shorts/engine/state/nightly.log 2>&1
echo "=== $(date) nightly end (exit $?) ===" >> shorts/engine/state/nightly.log
