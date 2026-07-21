/**
 * Idempotent path normalization for GitHub Pages duplicates.
 *
 * GitHub Pages serves the prerendered homepage at both `/` and `/index.html`
 * (both HTTP 200). Search tools can treat those as separate URLs and
 * occasionally report confusing redirect/canonical choices. We only rewrite
 * the non-canonical path — never `/` → `/` (that would be a self-redirect).
 */
export function duplicateHomepageRedirectTarget(
  pathname: string,
  search = "",
  hash = "",
): string | null {
  if (pathname !== "/index.html" && pathname !== "/index.html/") {
    return null;
  }
  // `search` already includes leading `?` when present; same for `#` on hash.
  return `/${search}${hash}`;
}
