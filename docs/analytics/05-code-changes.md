# Marketing-site code changes (this PR/diff)

Minimal fixes found during the analytics audit. No GTM/GA4/Ads/Meta publish. No new pixels.

## Changes

### 1. `src/routes/how-it-works.tsx`

**Why:** Page never called `trackPageViewed`, so SPA GA4 `page_view` (via `VITE_GA_MEASUREMENT_ID`) and first-party funnel `page_viewed` were missing for a primary marketing URL.

**What:** Import `trackPageViewed` + `useEffect`; fire `trackPageViewed("how_it_works")` on mount (same pattern as `/faq`, `/safety`, treatment pages).

### 2. `src/routes/about.tsx`

**Why:** Same gap as how-it-works.

**What:** Fire `trackPageViewed("about")` on mount.

## Explicitly not changed

| Item | Reason |
|------|--------|
| Hardcoded `GTM_CONTAINER_ID` / `GOOGLE_ADS_ID` | Already intentional public IDs; hostname-gated; moving to env alone would not fix Bask |
| Re-introduce `ensureGtmContainer` from `VITE_GTM_CONTAINER_ID` | Would duplicate shell install or fight the production hostname gate |
| Add Meta / Ads Lead env values | Ops decision; not required for Bask funnel GTM spec |
| Fix commented `/pricing` waitlist links | Route redirects to `/`; dead code |
| Edit `docs/features/analytics.md` | Doc drift flagged in audit — awaiting approval to update |

## Docs added (specs only)

- `docs/analytics/01-marketing-site-audit.md`
- `docs/analytics/02-gtm-tag-specification.md`
- `docs/analytics/03-verification-checklist.md`
- `docs/analytics/04-bask-side-changes.md`
- `docs/analytics/gtm-container-GTM-MHHJ44GF-import.json`
- `docs/analytics/README.md`
