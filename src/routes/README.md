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

## Marketing routes

The current marketing site uses the CTA switchboard in `src/lib/cta-ids.ts`;
routes must not hardcode a destination or CTA label. The live, indexable route
list is maintained in `public/sitemap.xml` and guarded by
`src/lib/__tests__/sitemap.test.ts`.

| Page | Route | Status |
|------|-------|--------|
| Home | `/` | Live |
| Weight Loss | `/weight-loss` | Live - footer Care group (not in the header dropdown) |
| GLP-1 Care | `/glp-1` | Live (Houston / cash-pay ads + SEO category page) |
| Compounded Tirzepatide | `/tirzepatide` | Live |
| Compounded Semaglutide | `/semaglutide` | Live |
| How it works | `/how-it-works` | Live - footer Care group (not in the header dropdown) |
| About | `/about` | Live - in the About header dropdown |
| FAQ | `/faq` | Live - in the About header dropdown |
| Recipes | `/recipes` | Live (recipe hub) - in the Resources header/footer nav |
| Recipe detail | `/recipes/$slug` | Live |
| Learn | `/learn` | Live (educational hub) - in the Resources header/footer nav |
| Learn article | `/learn/initial-research` | Live |
| Learn article | `/learn/resistance-training` | Live |
| Learn article | `/learn/rest-intervals` | Live |
| Safety | `/safety` | Live |
| Contact | `/contact` | Live - in the About header dropdown |
| Pricing | `/pricing` | Archived (redirect → `/`) |
| The Comb | `/the-comb` | Archived (redirect → `/`) - retired branded library overview |

Also archived: `/switch`, `/insurance`, and `/clinicians`. Full source and restore
instructions:
**[docs/archived-marketing-pages.md](../../docs/archived-marketing-pages.md)**.

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
