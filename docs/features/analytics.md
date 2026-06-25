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
- `properties` JSON — only keys in `ALLOWED_PROPERTY_KEYS` are accepted: `duration_ms`, `step_index`, `total_steps`, `error_code`, `page`, `landing_page_slug`, `referrer`

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

## Key files

| File | Role |
|------|------|
| `src/lib/analytics.ts` | All frontend tracking functions |
| `src/lib/utm.ts` | UTM capture from URL → funnel session |
| `backend/apps/analytics/models.py` | FunnelEvent, LandingPage |
| `backend/apps/analytics/views.py` | Public event ingestion endpoint |
| `backend/apps/analytics/staff_views.py` | Aggregated staff analytics + LP CRUD |
| `src/routes/staff.analytics.tsx` | Staff analytics dashboard UI |
