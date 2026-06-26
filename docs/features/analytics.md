# Analytics & Tracking

All user behaviour across the site — page views, funnel steps, and conversion events — is stored as `FunnelEvent` rows. No third-party analytics SDK (no GA, no Segment). Events are fire-and-forget; they never block the UI.

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

All tracking calls go through `src/lib/analytics.ts`:

```ts
trackPageViewed(page, { landing_page_slug? })   // fires on every route
trackStepViewed(slug, stepKey, meta?)            // on step render
trackStepCompleted(slug, stepKey, durationMs, meta?)  // on next/submit
trackFunnelEvent(payload)                        // raw — used by the above
```

`trackPageViewed` also calls `capturePageUtms()` (from `src/lib/utm.ts`) to store UTM params from the current URL into the funnel session on the backend.

Events are sent via `POST /api/analytics/events/` — public endpoint, rate-limited by `AnalyticsEventThrottle`.

## CTA attribution

Marketing CTAs use stable ids (`src/lib/cta-ids.ts`), passed as `?cta_id=` on links to `/qualify`.

| Storage | Field |
|---------|--------|
| `FunnelSession` | `cta_id` — set when user enters qualify |
| `FunnelEvent.properties` | `cta_id` — on `page_viewed`, `step_viewed`, etc. when known |

Staff analytics can compare conversion by CTA placement (home hero vs nav vs pricing footer). CTAs do **not** change which qualify version runs — only one qualify version is published globally.

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
| `/qualify` | `qualify` |
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
| `src/lib/utm.ts` | UTM capture from URL → funnel session |
| `backend/apps/analytics/models.py` | FunnelEvent, LandingPage |
| `backend/apps/analytics/views.py` | Public event ingestion endpoint |
| `backend/apps/analytics/services.py` | Aggregation logic: step counts, dropoff, stopped sessions |
| `backend/apps/analytics/staff_views.py` | Aggregated staff analytics + LP CRUD |
| `src/routes/staff.analytics.tsx` | Staff analytics dashboard UI |
