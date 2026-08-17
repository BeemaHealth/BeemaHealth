# Landing pages

**Live:** paid-ads and SEO landers are **code routes**, not CRM database rows. CTAs on every lander go to Bask **intake** via `resolveCta()`. Compliance copy: `docs/features/treatment-pages.md` and `docs/features/legitscript.md`.

| URL | Role |
|-----|------|
| `/` | Homepage (organic + brand). See `docs/features/homepage.md`. |
| `/glp-1` | National cash-pay GLP-1 category page (`<Glp1LandingPage market="national" />`). Footer Care column only - not in the header. |
| `/glp-1-houston` | Houston cash-pay GLP-1 ads landing (`market="houston"`). Ad/SEO entry plus a contextual homepage TreatmentShowcase link. Keep out of primary nav and footer. |
| `/semaglutide`, `/tirzepatide`, `/weight-loss` | SEO treatment landers. See `docs/features/treatment-pages.md`. |

The two GLP-1 URLs share one layout (`src/components/site/Glp1LandingPage.tsx`). Market copy, canonicals, and JSON-LD live in `src/lib/glp-1-landing.ts`. Each page self-canonicalizes. Never canonicalize Houston (or a future city) to `/glp-1/`. Future cities: add a market in `glp-1-landing.ts` plus a thin route file (`/glp-1-austin`, …).

## First-visit splash (Google → Beema)

Bask already shows a loader on the marketing-site → intake hop. This repo shows a branded hex draw plus stacked Beema / Health wordmark on the **first document load** only (`SiteBootLoader` in the root shell). In-app navigations do not replay it.

Photo fetch is LCP-first so the splash does not steal bandwidth from the image Google scores (`src/lib/boot-assets.ts`):

| URL | Waits / `<link rel="preload">` (high) | Then warms (`fetchPriority: "low"`) |
|-----|--------------------------------------|-------------------------------------|
| `/` | Homepage `hero.jpg` | Floating semaglutide vial, LegitScript seal, tirzepatide card |
| `/glp-1`, `/glp-1-houston` | None (headline is LCP) | LegitScript seal only. Do not download unused vial PNGs. |
| `/semaglutide`, `/tirzepatide` | That page's vial | The other vial |
| `/weight-loss` | None | Both vials (for `TreatmentLineup`) |

Do not add extra URLs to `criticalBootImageUrls` - competing preloads delay Largest Contentful Paint. Kill switch: `SITE_BOOT_LOADER_ENABLED` in `src/lib/site-boot-loader.ts`.

## Legacy `/lp/{slug}` (not live)

`src/routes/lp.$slug.tsx`, `/staff/landing-pages`, and the Django `landing_pages` table were an in-house CRM lander (per-slug headline/subhead + UTM row, optional redirect home). That funnel is obsolete. Do not plan new campaigns around `/lp/{slug}`. See `docs/BACKEND-DEFERRED.md`.

## Key files

| File | Role |
|------|------|
| `src/routes/glp-1.tsx`, `src/routes/glp-1-houston.tsx` | Thin live ad/category routes |
| `src/components/site/Glp1LandingPage.tsx` | Shared GLP-1 landing layout |
| `src/lib/glp-1-landing.ts` | Market copy, canonicals, JSON-LD `head()` |
| `src/lib/boot-assets.ts` | LCP vs warmup photo lists for the first-visit splash |
| `src/components/brand/SiteBootLoader.tsx` | Branded overlay (root shell, first document load) |
| `src/lib/cta-ids.ts` | `resolveCta()` → Bask intake |
| `src/routes/lp.$slug.tsx` | **Legacy** CRM slug route - not a live ads lander |
| `src/routes/staff.landing-pages.tsx` | **Legacy** staff CRUD UI |
