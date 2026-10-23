#!/usr/bin/env bash
# Build the static frontend (staging mode) and publish ONLY the built output to
# the separate BeemaHealth/beemahealth-staging repo (GitHub Pages, main branch,
# custom domain staging.beemahealth.com). Source code never leaves this repo.
#
# Staging is noindex'd per page (meta robots), not blocked in robots.txt:
# Google can only honor a noindex tag on pages it is allowed to crawl.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

STAGING_REPO_URL="${STAGING_REPO_URL:-https://github.com/BeemaHealth/beemahealth-staging.git}"
STAGING_BRANCH="main"
STAGING_DOMAIN="staging.beemahealth.com"

if ! command -v git >/dev/null 2>&1; then
  echo "error: git is required" >&2
  exit 1
fi

if [[ -f .env.staging ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.staging
  set +a
  echo "Loaded .env.staging"
else
  echo "warning: .env.staging not found - using defaults" >&2
fi

# Staging traffic must never reach production analytics or ad accounts.
for var in VITE_META_PIXEL_ID VITE_GTM_CONTAINER_ID VITE_GOOGLE_ADS_ID VITE_GOOGLE_ADS_CONVERSION_LABEL VITE_GA_MEASUREMENT_ID; do
  if [[ -n "${!var:-}" ]]; then
    echo "error: $var is set for staging - remove it from .env.staging so staging visits are not tracked" >&2
    exit 1
  fi
done

# The CRO Lab sets SKIP_INSTALL=1: `npm ci` wipes node_modules, which would
# break the running dev server and the lab itself.
if [[ "${SKIP_INSTALL:-}" == "1" ]]; then
  echo "Skipping npm ci (SKIP_INSTALL=1)"
else
  echo "Installing dependencies..."
  npm ci
fi

echo "Building static site (staging)..."
npm run build:staging

CLIENT_DIST="$ROOT/dist/client"
if [[ ! -d "$CLIENT_DIST" ]]; then
  echo "error: build output missing at dist/client" >&2
  exit 1
fi

if [[ ! -f "$CLIENT_DIST/index.html" ]]; then
  echo "error: no prerendered index.html in dist/client - check spa.maskPath/prerender in vite.config.ts" >&2
  exit 1
fi

if [[ ! -f "$CLIENT_DIST/_shell.html" ]]; then
  echo "error: no _shell.html in dist/client - SPA shell missing" >&2
  exit 1
fi
cp "$CLIENT_DIST/_shell.html" "$CLIENT_DIST/404.html"

# Keep search engines and AI crawlers from discovering staging via these files.
rm -f "$CLIENT_DIST/sitemap.xml" "$CLIENT_DIST/llms.txt"

# noindex every page (including the SPA shell / 404), then verify none were missed.
echo "Adding noindex to all HTML pages..."
python3 - "$CLIENT_DIST" <<'PY'
import pathlib, re, sys

TAG = '<meta name="robots" content="noindex, nofollow"/>'
root = pathlib.Path(sys.argv[1])
count = 0
for path in root.rglob("*.html"):
    html = path.read_text(encoding="utf-8")
    if TAG in html:
        continue
    new, n = re.subn(r"<head(\s[^>]*)?>", lambda m: m.group(0) + TAG, html, count=1)
    if n != 1:
        sys.exit(f"error: no <head> tag found in {path}; refusing to publish without noindex")
    path.write_text(new, encoding="utf-8")
    count += 1
print(f"noindex added to {count} pages")
PY

MISSING="$(grep -rL 'name="robots" content="noindex, nofollow"' --include='*.html' "$CLIENT_DIST" || true)"
if [[ -n "$MISSING" ]]; then
  echo "error: these pages are missing noindex:" >&2
  echo "$MISSING" >&2
  exit 1
fi

echo "$STAGING_DOMAIN" >"$CLIENT_DIST/CNAME"
touch "$CLIENT_DIST/.nojekyll"

# Publish only the built output: fresh repo in a temp dir, force-pushed to the
# staging repo (no history is kept, nothing from this repo's source is included).
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cp -R "$CLIENT_DIST"/. "$WORK"/

echo "Publishing to $STAGING_REPO_URL ($STAGING_BRANCH)..."
git -C "$WORK" init -q -b "$STAGING_BRANCH"
git -C "$WORK" add -A
git -C "$WORK" commit -q -m "Deploy staging frontend $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git -C "$WORK" push -q --force "$STAGING_REPO_URL" "$STAGING_BRANCH"

echo ""
echo "Done. Pages updates in 1-3 minutes."
echo "  https://$STAGING_DOMAIN"
echo "  https://beemahealth.github.io/beemahealth-staging/ (until DNS/custom domain is live)"
