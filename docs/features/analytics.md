# Analytics & Tracking

All user behaviour across the site — page views, funnel steps, and conversion events — is stored as `FunnelEvent` rows (first-party). Optional Meta Pixel and Google Ads tags can also fire on waitlist submit when configured via Vite env vars (see **Ad conversions** below). Events are fire-and-forget; they never block the UI.

## Event model

**`FunnelEvent`** (`funnel_events` table):
- `event_name` — must be in `ALLOWED_EVENT_NAMES` (server-side allowlist):
  - `page_viewed`, `page_reloaded`
  - `step_viewed`, `step_completed`
  - `account_created`, `intake_submitted`, `consent_signed`
  - `funnel_abandoned`
- `funnel_session` FK — present for anonymous users; links event to UTM/LP attribution
- `user` FK — present for authenticated users (set on the backend from the token)
- `questionnaire_slug` + `questionnaire_version_id` + `step_key` — for step-level events
- `experiment_id` + `variant_key` — for A/B test attribution
- `properties` JSON — only keys in `ALLOWED_PROPERTY_KEYS` are accepted: `duration_ms`, `step_index`, `total_steps`, `error_code`, `page`, `landing_page_slug`, `referrer`, `cta_id`

## Frontend tracking

All first-party tracking calls go through `src/lib/analytics.ts`:

```ts
trackPageViewed(page, { landing_page_slug? })   // fires on every route
trackStepViewed(slug, stepKey, meta?)            // on step render
trackStepCompleted(slug, stepKey, durationMs, meta?)  // on next/submit
trackFunnelEvent(payload)                        // raw — used by the above
trackWaitlistSubmit(page?)                       // waitlist success → FunnelEvent + ad Lead
```

`trackPageViewed` also calls `capturePageUtms()` (from `src/lib/utm.ts`) to store UTM params from the current URL into the funnel session on the backend.

Events are sent via `POST /api/analytics/events/` — public endpoint, rate-limited by `AnalyticsEventThrottle`.

## Bask GTM integration (questionnaire / checkout)

Bask (the third-party storefront/checkout/questionnaire platform) loads your GTM container on questionnaire pages when you paste the container ID into Bask admin. The **same** container is also loaded on the Beema marketing site via `VITE_GTM_CONTAINER_ID` (so you can use GTM Preview / Conversion Linker across both domains).

| Item | Value |
|------|-------|
| GTM container ID (Bask Integrations **and** `VITE_GTM_CONTAINER_ID`) | `GTM-MHHJ44GF` |
| GTM account | Beema Health (account `6368696783`) |
| GTM container | Beema Health Questionnaire (container `259765761`) |
| GA4 destination reused inside GTM tags | `G-03PMCCSD3R` (same GA4 property as the marketing site) |

Setup:
1. Paste `GTM-MHHJ44GF` into Bask → **Settings → Integrations → Google Tag Manager → Save**.
2. Marketing site loads the container from `VITE_GTM_CONTAINER_ID` in `src/lib/ad-conversions.ts` (`ensureGtmContainer` on app mount) — equivalent to Google’s `<head>` / `<body>` install snippets.
3. Optionally import Bask’s GTM template into this container, then replace placeholder GA/Ads IDs with real ones. Avoid adding a second GA4 **page_view** tag that duplicates `VITE_GA_MEASUREMENT_ID` or you will double-count marketing-site hits.

Bask data layer notes: `sessionId`, `eventModel.screen_name`, `eventModel.userId`, `ecommerce.transaction_id`; `purchase` fires on the Thank You page. See Bask’s GTM guide for the event catalog.

## Ad conversions & frontend-only analytics (Meta + Google)

**Site is launched** (Bask questionnaire via `resolveCta()`). Legacy **`/waitlist/`** still exists (and `/qualify/` redirects there) for older links/social-proof tooling, but it is **not** the primary conversion path. Paid-media + visitor analytics run via `src/lib/ad-conversions.ts` (loaded from `__root.tsx` with `initAdPixels()`). **No backend required** for these. LegitScript certified / ads-ready: `docs/features/legitscript.md`.

| Env var | Purpose |
|---------|---------|
| `VITE_GA_MEASUREMENT_ID` | **GA4** (`G-…`) — all page views + UTM/session source |
| `VITE_GTM_CONTAINER_ID` | **GTM** (`GTM-…`) — Bask container also loaded on the marketing site for Preview / Conversion Linker |
| `VITE_META_PIXEL_ID` | Meta Pixel ID — fires `PageView` on load (+ `Lead` on legacy waitlist submit if used) |
| `VITE_GOOGLE_ADS_ID` | Google Ads tag ID (`AW-…`) |
| `VITE_GOOGLE_ADS_CONVERSION_LABEL` | Conversion label — with Ads ID, fires `gtag('event','conversion')` on submit |
| `VITE_WAITLIST_DISPLAY_COUNT` | Optional override for legacy waitlist social-proof number |

If IDs are unset, helpers no-op (safe for local/dev). Do **not** send email, name, or other PHI to pixel/gtag calls. Pixel IDs are public client config — still do not commit production secrets adjacent to them in shared docs.

After a successful Formspree waitlist submit, `trackWaitlistSubmit("waitlist")` records a first-party event (no-ops without API), fires Meta `Lead` / Google Ads conversion / GA4 `generate_lead`, and Formspree receives hidden attribution fields (`utm_*`, `cta_id`, `referrer`, `landing_path`) from `getAttributionForSubmit()`.

## CTA attribution

Marketing CTAs use stable ids (`src/lib/cta-ids.ts`) via `resolveCta()` (default → Bask). Legacy waitlist links may still carry `?cta_id=`.

| Storage | Field |
|---------|--------|
| URL query | `cta_id` — which on-site button was clicked |
| `sessionStorage` (non-PHI) | first-touch UTMs + `cta_id` + referrer + landing path |
| Formspree submission | same fields attached on waitlist join |
| GA4 `page_view` | optional `cta_id` event param when present |
| `FunnelSession` / `FunnelEvent` | only when the API is live (optional; not required for launch) |

Staff analytics can compare conversion by CTA placement when the API exists. For a **frontend-only** site, use GA4 Explorations + Formspree fields instead.

## Generating trackable social / ad URLs

Use unique UTM params on every published post so GA4 (visits) and Formspree (signups) can attribute traffic. Do **not** put `ga_debug=1` on public links.

| Tool | Path |
|------|------|
| CLI | `npm run utm -- waitlist --source instagram` · `npm run utm -- home -s x` · `npm run utm -- daily-pack` |
| Script | `scripts/generate-utm-url.mjs` |
| Phone / AI agent prompt | `scripts/utm-url-agent-prompt.txt` (`npm run utm -- prompt`) |
| Daily social Gmail-draft prompt | `scripts/daily-beema-social-posts-prompt.txt` |

Pattern:

```text
https://beemahealth.com/waitlist/?utm_source=instagram&utm_medium=social&utm_campaign=instagram_bio&utm_content=instagram_link_in_bio
```

**Ops (simple):** IG / FB / Threads use evergreen **bio** links (`*_bio` campaigns). X / Reddit / GBP get unique per-post UTMs via `npm run utm -- daily-pack`. Cross-post captions say “link in bio.”

Cross-posts of the same creative (IG/FB/Threads): same bio CTA — no per-post `utm_content`.

## Staff analytics views

Accessible at `/staff/analytics`. Six aggregated views served by `backend/apps/analytics/staff_views.py`:

| View | What it shows |
|------|--------------|
| Funnel | Step-by-step conversion counts |
| Drop-off | Where users exit the funnel |
| Timeline | Events over time |
| Traffic | Session counts by UTM source/medium |
| Landing page performance | Conversion rate per landing page slug |
| Page views | Raw page view counts by route |

## Page tracking

`trackPageViewed(page)` fires on mount in each route. Pages and their names:

| Route | Page name |
|-------|-----------|
| `/` | `home` |
| `/waitlist` | `waitlist` |
| `/qualify` | redirects → `/waitlist` |
| `/intake` | `intake` |
| `/consent` | `consent` |
| `/lp/:slug` | `lp:{slug}` |
| `/pricing` | `pricing` |
| `/contact` | `contact` |
| `/faq` | `faq` |
| `/weight-loss` | `weight_loss` |
| `/safety` | `safety` |

The browser's `PerformanceNavigationTiming.type` determines `page_viewed` vs `page_reloaded`.

## Dropoff calculation

### Why distinct session counts

`funnel_step_counts` counts **distinct participants** (funnel_session or user) per step, not raw event counts. If a user navigates back and forward, multiple `step_viewed` events are fired for the same step, but only one participant is counted. Using raw `COUNT(id)` would inflate views relative to completions and produce wrong dropoff rates.

```
dropoff_percent = (1 - completions / views) × 100
```

### Stopped sessions

`stopped_sessions` on each step = participants whose **last recorded step event** was at that step AND who have been inactive for more than 2 hours. This is the true "abandoned here" count.

**Key difference from dropoff %:** A user who revisited step 2 after reaching step 5 would inflate step 2's dropoff rate (viewed again but didn't complete again) while NOT appearing in "stopped" for step 2 (their last step was step 5).

Implementation: `session_last_steps()` in `services.py` uses a single raw SQL query with `ROW_NUMBER() OVER (PARTITION BY participant ORDER BY created_at DESC)` to efficiently find each participant's final step.

### Participant identity

| Event source | Identity field used |
|-------------|---------------------|
| Anonymous (pre-account) | `funnel_session_id` (HttpOnly cookie) |
| Authenticated (post-account) | `user_id` (auth token) |

These are mutually exclusive per event — `FunnelEventCreateView` sets exactly one per request.

## Common edge cases

| Scenario | How it's handled |
|----------|-----------------|
| User goes back to a previous step | Counted once per step (distinct participant) |
| Page reload mid-funnel | Component remounts → `step_viewed` fires; 1-second backend dedup prevents double-counting for rapid reloads |
| React StrictMode double-fire | 1-second dedup window on the backend |
| Multiple rapid reloads < 1 second | Deduplicated — only the first event is stored |
| Session expires | New funnel session created; old one appears abandoned |

## Key files

| File | Role |
|------|------|
| `src/lib/analytics.ts` | All frontend tracking functions |
| `src/lib/ad-conversions.ts` | Meta Pixel + Google Ads init / Lead conversion |
| `src/lib/marketing-copy.ts` | First-month promo + waitlist social-proof constants |
| `src/lib/utm.ts` | UTM capture from URL → funnel session |
| `scripts/generate-utm-url.mjs` | CLI to mint unique social/ad UTM URLs |
| `scripts/utm-url-agent-prompt.txt` | Prompt for an AI / phone agent to mint URLs |
| `scripts/daily-beema-social-posts-prompt.txt` | Daily social Gmail draft prompt (includes UTM rules) |
| `backend/apps/analytics/models.py` | FunnelEvent, LandingPage |
| `backend/apps/analytics/views.py` | Public event ingestion endpoint |
| `backend/apps/analytics/services.py` | Aggregation logic: step counts, dropoff, stopped sessions |
| `backend/apps/analytics/staff_views.py` | Aggregated staff analytics + LP CRUD |
| `src/routes/staff.analytics.tsx` | Staff analytics dashboard UI |
