# Landing Pages

Landing pages let staff create custom entry points (e.g. `/lp/meta-summer`) with their own headline, subheadline, and UTM pre-population, without a code deploy. Each landing page is a database row, not a code file.

## Data model

**`LandingPage`** (`landing_pages` table):
- `slug` — URL-safe unique identifier; the route is `/lp/{slug}`
- `name` — internal label visible only in the CRM
- `headline` / `subheadline` — displayed on the landing page
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` — pre-set UTMs attached to the funnel session when a user arrives via this LP
- `redirect_to_home` — if `true`, the slug redirects to `/` instead of rendering a custom page (useful for short links)
- `active` — inactive pages return 404

## How a visit works

1. User visits `/lp/some-slug`
2. Frontend calls `GET /api/analytics/landing-pages/{slug}/` to resolve the LP
3. If `redirect_to_home=true`, frontend redirects to `/`
4. Otherwise renders the headline/subheadline over the standard home page layout
5. When the user starts the qualify flow, the `landing_page_slug` is attached to their `FunnelSession` row, and the pre-set UTM params are captured too
6. All funnel events from that session carry LP attribution for the staff analytics "landing page performance" view

## Staff workflow

`/staff/landing-pages` — create, edit, activate/deactivate, and delete landing pages. Deletion is guarded if the LP has associated funnel sessions (attribution must not be lost).

## Key files

| File | Role |
|------|------|
| `src/routes/lp.$slug.tsx` | Landing page route — resolves and renders |
| `backend/apps/analytics/models.py` | LandingPage model |
| `backend/apps/analytics/views.py` | `LandingPageResolveView` (public GET) |
| `backend/apps/analytics/staff_views.py` | Staff CRUD for landing pages |
| `src/routes/staff.landing-pages.tsx` | Staff CRM UI |
| `backend/apps/eligibility/models.py` | `FunnelSession.landing_page_slug` |
