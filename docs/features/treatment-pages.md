# Treatment pages

Each medication Beema offers gets its own indexable, SEO-focused landing page (`/tirzepatide`, `/semaglutide`) — this targets each drug's search terms without diluting them, and gives each page its own FAQPage/BreadcrumbList JSON-LD. Beema’s patient-facing offering is **compounded only** (compounded semaglutide and compounded tirzepatide). Do not add branded-medication pages (Wegovy, Zepbound, Ozempic, Mounjaro) or describe those brands as Beema offerings. `/weight-loss` sits alongside the compounded pages as a broader overview targeting head-term searches ("medical weight loss," "GLP-1 weight loss program") — see below.

## Compliance (LegitScript + FDA)

Canonical long-form rules live in `docs/marketing/SEO-AEO-GEO-PLAN.md` **§F1.1**. Hard constraints for these pages and related marketing copy:

1. **Compounded-only offering.** Never list or imply Beema sells Wegovy, Zepbound, Ozempic, Mounjaro, or other FDA-approved branded GLP‑1s.
2. **FDA (Feb 6, 2026):** do not claim compounded products are generic / the same as FDA-approved drugs; do not state they use the same active ingredient; do not state they are clinically proven to produce results. https://www.fda.gov/news-events/press-announcements/fda-intends-take-action-against-non-fda-approved-glp-1-drugs
3. **Price ≠ medical necessity.** Lower price alone does not establish that a compounded drug is not essentially a copy of a commercial product.
4. **Required sentence** (reuse verbatim where the page explains compounded status): "Compounded {drug} is not FDA-approved and is considered only when legally available and clinically appropriate."
5. No outcome guarantees; prescribing is never guaranteed; provider decides case-by-case.

Product photography: LegitScript review preferred colour vials without a Beema wordmark. Certification is **complete** (August 2026); the site still defaults to unbranded vial imagery via `VIAL_IMAGERY_MODE` in `src/lib/treatment-imagery.ts` until product flips that switchboard to `"branded"`. See `docs/features/legitscript.md` and `docs/features/homepage.md`.

## Routes

| Route | File | Notes |
|-------|------|-------|
| `/tirzepatide` | `src/routes/tirzepatide.tsx` | Compounded tirzepatide landing page |
| `/semaglutide` | `src/routes/semaglutide.tsx` | Compounded semaglutide landing page |
| `/glp-1` | `src/routes/glp-1.tsx` | Houston cash-pay GLP-1 ads landing (not in primary nav/footer; linked from homepage TreatmentShowcase). Future cities: prefer `/glp-1/{city}` under a shared template - see "City GLP-1 pages" below |
| `/weight-loss` | `src/routes/weight-loss.tsx` | Program overview page — linked from nav/footer, see below |

Shared building blocks (pricing card, comparison table, FAQ accordion, breadcrumb) live in `src/components/site/TreatmentPageBlocks.tsx`. Copy/data (steps, FAQ items, eligibility bullets) stays local to each route file — do not extract it into a shared data file, the two pages are meant to have genuinely distinct copy.

`faqPageJsonLd()` and `breadcrumbJsonLd()` (in `src/lib/seo.ts`) generate JSON-LD from the same arrays that render the visible FAQ/breadcrumb — keep them in sync if you edit either.

## `/weight-loss` is a linked overview page

Previously `/weight-loss` was kept as a deliberate orphan (no internal links anywhere on the site) while still being sitemapped at priority 0.9, on the reasoning that it would be retired once the tirzepatide/semaglutide pages fully replaced it. That left it as a genuine orphan page at a high sitemap priority - a real inconsistency for an SEO-focused site, since Google's crawl/ranking signals come from internal link equity, not sitemap presence alone.

As of the 2026-07-30 SEO pass, that decision was reversed: `/weight-loss` is real, unique, non-duplicate content (its own hero, benefits, "who this is for" section, and CTA - not a stub) that targets broader, higher-volume, non-brand search intent than the drug pages can. It is now:

- Linked from the footer Care column (`COLUMNS[0].links` in `SiteFooter.tsx`), not from the header Weight Loss dropdown
- Linked contextually from `/semaglutide` and `/tirzepatide` ("Learn about our weight-loss program")
- Down-ranked in `public/sitemap.xml` to priority `0.7` (below the two drug pages at `0.9`, which remain the primary conversion targets, and `/how-it-works` at `0.8`)

If a future change needs to re-orphan or retire this page, that's a deliberate call to make with the team, not a default to restore - update this doc and the `COLUMNS` comments together with the code.

## Nav: "Weight Loss" dropdown

`SiteHeader.tsx` renders "Weight Loss" as a dropdown of the medications only. `WEIGHT_LOSS_ITEMS` is Compounded Tirzepatide and Compounded Semaglutide.

`/weight-loss` and `/how-it-works` stay live for SEO and for people who want the overview / longer process writeup. They are **not** in the header. Link them from the site footer Care column and from in-page copy. On `/tirzepatide`, `/semaglutide`, and `/glp-1`, the hero "How it works" / "How care works" button is an on-page jump (`hash="how-it-works"`) to `<HowItWorksSteps />` on that same page, not a navigation to `/how-it-works/`.

Hover/tap behavior is the same shared pair as the other menus:

- **Desktop** - `DesktopNav` / `DesktopNavDropdown`. Click a trigger to open, click it again (or outside / Escape) to close, hover another trigger to switch. The open panel fades and slides in (opacity + translate only - no Radix DropdownMenu; that Popper flicker is why these stay in-flow). Only one panel is open at a time; sibling labels dim while a menu is open.
- **Mobile** - `MobileNavDropdown`, a tap-to-expand disclosure inside the mobile menu (see `docs/features/homepage.md` for the `CircleRevealMenu` shell it lives in). Local `expanded` state collapses it back down every time the mobile menu reopens; the reveal/collapse is animated (Motion `AnimatePresence` + height/opacity), matching the site's other transitions.

Add new **medication** pages to `WEIGHT_LOSS_ITEMS` (and to `SiteFooter.tsx`'s Care column, above the program/how-it-works links) rather than adding a new top-level nav entry. Keep `/weight-loss` and `/how-it-works` in the footer Care column, not in the header. Do **not** add city/geo GLP-1 ads landers (`/glp-1`, future `/glp-1/{city}`) to primary nav or footer - those stay ad/SEO entry points plus contextual in-page links (homepage TreatmentShowcase today).

## Nav: "Resources" dropdown

`SiteHeader.tsx` also renders **Resources** - the free content library (recipes and educational guides today; workout and cooking videos later). It uses the same `DesktopNavDropdown` / `MobileNavDropdown` pair as Weight Loss. Keep the label literal so it does not compete with Hive (the patient portal at `hive.beemahealth.com`).

Live items in `RESOURCE_ITEMS` today: `/recipes/` and `/learn/`. The matching footer column is titled "Resources". Add workout videos, cooking videos, and other no-account resources there (and in the footer column) when they ship - do not add coming-soon placeholders to the live nav.

`/the-comb/` is a retired branded overview that redirects home. Do not relink it.

The homepage `FreeResourcesSection` is the in-page spotlight for the same library (headline: "Free resources to help you get started").

## Nav: "About" dropdown

`ABOUT_ITEMS` is the company cluster: About us, FAQ, and Contact us. Keep these out of Resources (that dropdown is the free content library) and out of Weight Loss (that dropdown is the program). Add Safety or other trust pages here only if they need a persistent header slot; today Safety stays in the footer Trust column plus in-page treatment links.

## City GLP-1 pages (planned)

Charlie’s Google Ads will expand beyond Houston. Recommended shape when that happens:

| URL | Role |
|-----|------|
| `/glp-1` | National/category hub **or** keep as Houston until a hub ships (Charlie already has this URL) |
| `/glp-1/houston`, `/glp-1/austin`, … | City-specific ads LPs sharing one template (city name, local phrasing, same compliance + pricing blocks) |

Keep city pages out of the Weight Loss dropdown so nav does not grow with every market. Ads land on the city URL; organic/internal links stay light (homepage, hub, sitemap). When implementing, extract shared sections from `glp-1.tsx` into a city-aware template rather than copy-pasting routes.

## Medication cards

`TreatmentShowcase.tsx` (homepage) and `TreatmentLineup.tsx` (`/weight-loss` page) each render one card per medication. Both cards are full-card `<Link>`s (not nested interactive elements) pointing at that medication's own page (`/tirzepatide/`, `/semaglutide/`) - never at `/weight-loss/` itself (that would be a self-link on the `/weight-loss` page and redundant elsewhere). CTA copy is `Explore {treatment.name}` (e.g. "Explore Compounded Tirzepatide"). These two files still duplicate their own local `TREATMENTS` array (pre-existing pattern) - add a new medication to both when it gets its own page. The homepage TreatmentShowcase also links contextually to `/glp-1/` ("Explore GLP-1 care for Houston").

## Structured data

All three treatment-adjacent pages now carry page-specific JSON-LD alongside the sitewide `MedicalOrganization`/`WebSite` schema (`ORGANIZATION_JSONLD`/`WEBSITE_JSONLD` in `src/lib/seo.ts`, rendered in the root layout):

- `/tirzepatide`, `/semaglutide` — `BreadcrumbList` + `FAQPage` (unchanged; matches the visible `TreatmentBreadcrumb` and FAQ accordion on each page)
- `/glp-1` — `BreadcrumbList` + `FAQPage` + `serviceJsonLd()` (Houston/cash-pay GLP-1 category page for ads + SEO; visible FAQ matches JSON-LD)
- `/weight-loss` — `BreadcrumbList` + `serviceJsonLd()` (a `Service` describing the program itself; no visible FAQ content, so no `FAQPage`)
- `/how-it-works`, `/safety` — `BreadcrumbList` + `medicalWebPageJsonLd()` (a `MedicalWebPage` describing the informational content; no visible FAQ content, so no `FAQPage`)

`breadcrumbJsonLd()`, `faqPageJsonLd()`, `serviceJsonLd()`, and `medicalWebPageJsonLd()` all live in `src/lib/seo.ts`. Never add `FAQPage` JSON-LD without a matching visible FAQ accordion on the page — Google's structured-data guidelines require the two to match, and `faqPageJsonLd()`'s docstring says the same.

## Pricing model: flat monthly rate, with a 3-month-only promo code

`src/lib/medication-pricing.ts` models each medication as `{ monthlyUsd }` — a single flat, standard cash-pay rate with **no automatic discount**:

- **`monthlyUsd`** is the standard rate, billed monthly, from month 1 onward. A 1-month purchase always bills at this rate — it is never discounted.
- **The only discount** is a one-time, per-patient `$100` promo code (`PROMO_CODE_DISCOUNT_USD`), redeemable **only** when purchasing a `3`-month plan (`PROMO_CODE_MIN_MONTHS`). It reduces month 1 only — `promoFirstMonthUsd(pricing)` computes that discounted first-month price. It cannot be combined with a 1-month purchase, and cannot be reused.
- This promo code is the same incentive promoted via `FIRST_MONTH_PROMO_LINE` in `src/lib/marketing-copy.ts`.

`compoundedMonthlyPricingSentence(label, pricing)` is the shared long-form sentence used across FAQ answers and route copy (e.g. "Compounded semaglutide is $199/month, billed monthly with no long-term contract. A one-time $100 promo code brings your first month to $99 when you purchase a 3-month plan; it can't be combined with a 1-month purchase and can only be used once per patient."). `formatCompoundedPriceLine()` and `dualCompoundedHeroPricingLine()` are the shorter card/hero variants of the same structure. **Never hand-write a pricing or promo-code sentence — always route through one of these helpers** so the flat-rate-plus-3-month-promo framing stays consistent if the numbers or wording change again.

## CTA switchboard (live — Bask intake)

Beema is live: every marketing CTA sitewide sends visitors to Bask’s hosted **intake** questionnaire (`https://q.beemahealth.com/start-online-visit/weightloss`) — one long questionnaire (not a separate Beema “eligibility” then “intake” product). Checkout and the patient portal also run on Bask/Hive. Leftover in-repo `/waitlist/`, `/qualify/`, `/intake/`, `/consent/` routes are **legacy** and unlinked from primary CTAs — see `docs/BACKEND-DEFERRED.md`.

**`resolveCta(ctaId)` in `src/lib/cta-ids.ts` is the single place that decision is made.** Every CTA button/link in the app calls it instead of hardcoding a URL or a label:

```tsx
const cta = resolveCta(CTA_IDS.tirzepatide_hero);
<Link to={cta.to} search={cta.search}>{cta.label}</Link>
```

- All `CtaId`s default to `DEFAULT_CTA_TARGET` (`"Get Started"` → the Bask **intake** URL).
- To repoint one CTA (or a few) — e.g. a medication-specific intake URL — add an entry to `CTA_OVERRIDES` keyed by `CtaId`. `to` can be an internal path or a full external URL (Bask lives on a different domain).
- To repoint everything at once, change `DEFAULT_CTA_TARGET`.

**When adding any new CTA button anywhere on the site: add a `CtaId` to `CTA_IDS` and call `resolveCta()` — never hardcode a URL or label on a marketing CTA.** This is what keeps repointing the funnel a one-file change instead of a site-wide hunt.

**Login is separate from the CTA switchboard.** The header's "Log In" link goes straight to the Hive patient portal (`HIVE_LOGIN_URL` in `src/lib/cta-ids.ts`, currently `https://hive.beemahealth.com`) via a plain `<a>` — it's an account action on Bask’s portal, not a marketing-conversion click, so it doesn't go through `resolveCta`/`CTA_IDS`.

## Key files

| File | Role |
|------|------|
| `src/routes/tirzepatide.tsx`, `src/routes/semaglutide.tsx` | The two treatment pages |
| `src/routes/glp-1.tsx` | Houston / cash-pay GLP-1 category page (ads + SEO) |
| `src/components/site/TreatmentPageBlocks.tsx` | Shared breadcrumb, pricing card, comparison table, FAQ accordion |
| `src/lib/medication-pricing.ts` | Single source of truth for pricing — never hardcode `$` amounts elsewhere |
| `src/lib/cta-ids.ts` | `CTA_IDS`, `resolveCta()` — the CTA switchboard |
| `src/lib/seo.ts` | `faqPageJsonLd()`, `breadcrumbJsonLd()`, `serviceJsonLd()`, `medicalWebPageJsonLd()`, `canonicalUrl()` |
| `src/components/site/SiteHeader.tsx`, `SiteFooter.tsx` | Weight Loss, Resources, and About dropdowns (`DesktopNavDropdown` / `MobileNavDropdown`); footer Care + Resources + Trust columns |
| `src/lib/marketing-copy.ts` | `FIRST_MONTH_PROMO_LINE` — the one-time, 3-month-only promo code promoted alongside pricing |
| `src/components/home/TreatmentShowcase.tsx`, `src/components/site/TreatmentLineup.tsx` | Medication cards (home / `/weight-loss`) |
| `public/sitemap.xml`, `public/llms.txt`, `src/lib/__tests__/sitemap.test.ts` | Keep in sync when adding a page |
