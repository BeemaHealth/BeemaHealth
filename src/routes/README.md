# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
is a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File | URL (Uniform Resource Locator) |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamic — bare `$`, no curly braces) |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment) |
| `files/$.tsx` | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx` | layout route (renders children via `<Outlet />`) |
| `__root.tsx` | app shell — wraps every page; preserve `<Outlet />` |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.

## Marketing routes (Step 1 — see launch plan)

[Starting Point/launchPlan.md](../../Starting%20Point/launchPlan.md) Step 1 calls for: Home, Weight Loss, Pricing, FAQ, Safety, Contact — each with a **"See If You Qualify"** CTA into `/qualify`.

Several marketing routes were stubbed for the intake prototype. Full source and restore instructions: **[docs/archived-marketing-pages.md](../../docs/archived-marketing-pages.md)**.

| Step 1 page | Route | Status |
|-------------|-------|--------|
| Home | `/` | Live |
| Weight Loss | TBD | Not built |
| Pricing | `/pricing` | Archived (redirect → `/`) |
| FAQ | `/faq` | Archived (redirect → `/`) |
| Safety | `/safety` | Archived (redirect → `/`) |
| Contact | TBD | Not built |

Also archived: `/switch`, `/insurance`, `/clinicians`, `/learn`, full `/how-it-works`.

## Patient funnel routes (Steps 2–6)

| Step | Route | Purpose |
|------|-------|---------|
| 2 — Qualification funnel | `/qualify` | Pre-account eligibility + lead capture |
| 3 — Account creation | `/qualify` (account step) + auth API | Register/login; claim funnel draft |
| 4 — Medical intake | `/intake` | Full clinical questionnaire + uploads |
| 5 — Consent | `/consent` | Telehealth, HIPAA, medication acks, signature |
| 6 — Patient dashboard | `/dashboard` | Case status portal (sidebar layout) |

## Patient portal routes (Step 6 detail)

Authenticated portal shell at `/dashboard` (layout route). Messages nav is feature-flagged off in `src/lib/portal-nav.ts`.

| Route | Purpose |
|-------|---------|
| `/dashboard/` | Home — status, timeline, order preview |
| `/dashboard/intake` | Edit intake by step (jump navigation) |
| `/dashboard/orders` | Order tracking (prototype data until pharmacy API) |
| `/dashboard/refills` | Refill request UI (prototype) |
| `/dashboard/documents` | Document upload + status |
| `/dashboard/account` | Profile, contact, consents (read-only v1) |

First-time funnel still uses `/intake` with `FlowLayout`; returning patients edit at `/dashboard/intake`.

## Admin routes (Steps 7–8)

| Step | Route | Purpose |
|------|-------|---------|
| 7 — Admin dashboard | `/admin` | Patient list, status, BMI, state, date |
| 8 — Patient detail | `/admin` (detail view) | Full chart: eligibility, intake, docs, consents |
