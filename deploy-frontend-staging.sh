#!/usr/bin/env bash
# Build the static frontend and publish dist/client to the gh-pages-staging branch.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if ! command -v git >/dev/null 2>&1; then
  echo "error: git is required" >&2
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "error: git remote 'origin' is not configured" >&2
  exit 1
fi

if [[ -f .env.staging ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.staging
  set +a
  echo "Loaded .env.staging"
else
  echo "warning: .env.staging not found — using defaults" >&2
fi

echo "Installing dependencies..."
npm ci

echo "Building static site (staging)..."
npm run build:staging

CLIENT_DIST="$ROOT/dist/client"
if [[ ! -d "$CLIENT_DIST" ]]; then
  echo "error: build output missing at dist/client" >&2
  exit 1
fi

if [[ ! -f "$CLIENT_DIST/index.html" ]]; then
  echo "error: no prerendered index.html in dist/client — check spa.maskPath/prerender in vite.config.ts" >&2
  exit 1
fi

if [[ ! -f "$CLIENT_DIST/_shell.html" ]]; then
  echo "error: no _shell.html in dist/client — SPA shell missing" >&2
  exit 1
fi
cp "$CLIENT_DIST/_shell.html" "$CLIENT_DIST/404.html"

if [[ ! -f "$CLIENT_DIST/sitemap.xml" ]]; then
  echo "error: no sitemap.xml in dist/client — public/sitemap.xml missing?" >&2
  exit 1
fi

echo "staging.beemahealth.com" >"$CLIENT_DIST/CNAME"
touch "$CLIENT_DIST/.nojekyll"

echo "Publishing to gh-pages-staging branch..."
npx --yes gh-pages@6.3.0 -d dist/client -b gh-pages-staging --dotfiles -m "Deploy staging frontend $(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo ""
echo "Done. If GitHub Pages is configured for gh-pages-staging, the site updates in 1–3 minutes."
echo "  https://staging.beemahealth.com"
echo "  https://$(git remote get-url origin | sed -E 's#.*github.com[:/](.+)/(.+)(\.git)?#\1.github.io/\2#')"
