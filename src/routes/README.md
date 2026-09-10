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
| GLP-1 Care | `/glp-1` | Live (national / cash-pay category page) - footer Care group (not in the header dropdown) |
| GLP-1 Care in Houston | `/glp-1-houston` | Live (Houston ads + local SEO lander; not in primary nav) |
| Compounded Tirzepatide | `/tirzepatide` | Live |
| Compounded Semaglutide | `/semaglutide` | Live |
| TRT (Compounded Enclomiphene) | `/trt` | Live |
| Compounded ED Treatment | `/ed` | Live |
| Compounded NAD+ | `/nad-plus` | Live |
| Compounded Sermorelin | `/sermorelin` | Live |
| Sexual Health (hub) | `/sexual-health` | Live - footer Care group, category overview for `/ed` + `/trt` |
| Oral Finasteride | `/oral-finasteride` | Live money page - Hair Loss header dropdown (For Men) |
| Oral Minoxidil (Men) | `/oral-minoxidil-men` | Live money page (2026-09-09) - Hair Loss header dropdown (For Men). Same product/price/Bask questionnaire as the women's page, split into 2 single-sex pages on purpose - see docs/features/treatment-pages.md "Single-sex product pages" |
| Oral Minoxidil (Women) | `/oral-minoxidil-women` | Live money page (2026-09-09) - Hair Loss header dropdown (For Women). Same product as above, single-sex page |
| Hair Loss Spray for Men | `/hair-loss-spray-men` | Live money page (2026-09-09) - Hair Loss header dropdown (For Men) |
| Hair Loss Spray for Women | `/hair-loss-spray-women` | Live money page (2026-09-09) - Hair Loss header dropdown (For Women) |
| Hair Loss (hub) | `/hair-loss` | Live - footer Care group, category overview for `/oral-finasteride`, `/oral-minoxidil-men`, `/oral-minoxidil-women`, `/hair-loss-spray-men`, `/hair-loss-spray-women` (merged 2026-09-04 from the former `/hair` + `/hairloss`) |
| Wellness (hub) | `/wellness` | Live - footer Care group, category overview for `/nad-plus` + `/sermorelin` |
| How it works | `/how-it-works` | Live - in the Resources header/footer nav |
| About | `/about` | Live - in the About header dropdown |
| FAQ | `/faq` | Live - in the About header dropdown |
| Recipes | `/recipes` | Live (recipe hub) - in the Resources header/footer nav |
| Recipe detail | `/recipes/$slug` | Live |
| Learn | `/learn` | Live (educational verticals index) - in the Resources header/footer nav. Spec: [docs/features/learn.md](../../docs/features/learn.md) |
| Learn weight-loss hub | `/learn/weight-loss` | Live (educational; commercial pages stay at `/weight-loss`, `/semaglutide`, `/tirzepatide`) |
| Learn TRT hub | `/learn/trt` | Live educational overview - Beema's live TRT offering is compounded enclomiphene at `/trt`, distinct from the injectable/gel/patch testosterone this hub describes |
| Learn HRT hub | `/learn/hrt` | Live educational stub - Beema does not offer HRT today |
| Learn article | `/learn/{vertical}/{slug}` | Live when a file exists under `src/content/learn/articles/` |
| Learn article | `/learn/initial-research` | Live |
| Learn article | `/learn/resistance-training` | Live |
| Learn article | `/learn/rest-intervals` | Live |
| Learn article | `/learn/semaglutide-vs-tirzepatide` | Live |
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
