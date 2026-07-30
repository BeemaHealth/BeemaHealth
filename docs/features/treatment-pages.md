# Treatment pages

Each medication Beema offers gets its own indexable, SEO-focused landing page (`/tirzepatide`, `/semaglutide`, more to come as branded medications are added) rather than one shared "weight loss" page — this targets each drug's own search terms without diluting them, and gives each page its own FAQPage/BreadcrumbList JSON-LD.

## Routes

| Route | File | Notes |
|-------|------|-------|
| `/tirzepatide` | `src/routes/tirzepatide.tsx` | Compounded tirzepatide landing page |
| `/semaglutide` | `src/routes/semaglutide.tsx` | Compounded semaglutide landing page |
| `/weight-loss` | `src/routes/weight-loss.tsx` | **Orphaned on purpose** — see below |

Shared building blocks (pricing card, comparison table, FAQ accordion, breadcrumb) live in `src/components/site/TreatmentPageBlocks.tsx`. Copy/data (steps, FAQ items, eligibility bullets) stays local to each route file — do not extract it into a shared data file, the two pages are meant to have genuinely distinct copy.

`faqPageJsonLd()` and `breadcrumbJsonLd()` (in `src/lib/seo.ts`) generate JSON-LD from the same arrays that render the visible FAQ/breadcrumb — keep them in sync if you edit either.

## `/weight-loss` is intentionally an orphan page

As of the tirzepatide/semaglutide launch, **no internal link anywhere on the site points at `/weight-loss`** — not the nav, not the footer, not any card. It's kept:

- Live and rendering accurate, up-to-date info (still uses the shared pricing constants)
- In `public/sitemap.xml`, `public/robots.txt` (unblocked), and `public/llms.txt`
- Reachable by direct URL

This is deliberate: Google can still crawl and index it via the sitemap, but visitors never land there through site navigation. The nav's "Weight Loss" entry is a dropdown *label*, not a link — see below.

**Do not add a link to `/weight-loss` anywhere** without checking with the team first — it's expected to be fully retired once more medication pages exist, at which point the dropdown items replace it entirely. If a future change needs to route people through a multi-medication overview page again, that's a deliberate reversal, not an oversight to "fix."

## Nav: "Weight Loss" dropdown

`SiteHeader.tsx` renders "Weight Loss" as a dropdown listing `WEIGHT_LOSS_ITEMS` — currently Compounded Tirzepatide and Compounded Semaglutide — via two separate components since hover and tap don't behave the same way:

- **Desktop** — `WeightLossNavDropdown`, a hand-rolled hover dropdown (deliberately not Radix `DropdownMenu`; see the comment above it for why Radix's Popper positioning caused an open/close flicker).
- **Mobile** — `MobileWeightLossDropdown`, a tap-to-expand disclosure inside the mobile menu (see `docs/features/homepage.md` for the `CircleRevealMenu` shell it lives in). Local `expanded` state collapses it back down every time the mobile menu reopens; the reveal/collapse is animated (Motion `AnimatePresence` + height/opacity), matching the site's other transitions.

Add new medication pages to `WEIGHT_LOSS_ITEMS` (and to `SiteFooter.tsx`'s `COLUMNS[0].links`) rather than adding a new top-level nav entry.

## Medication cards

`TreatmentShowcase.tsx` (homepage) and `TreatmentLineup.tsx` (`/weight-loss` page) each render one card per medication. Both cards are full-card `<Link>`s (not nested interactive elements) pointing at that medication's own page (`/tirzepatide/`, `/semaglutide/`) — never at `/weight-loss/`. CTA copy is `Explore {treatment.name}` (e.g. "Explore Compounded Tirzepatide"). These two files still duplicate their own local `TREATMENTS` array (pre-existing pattern) — add a new medication to both when it gets its own page.

## Pricing model: flat monthly rate, with a 3-month-only promo code

`src/lib/medication-pricing.ts` models each medication as `{ monthlyUsd }` — a single flat, standard cash-pay rate with **no automatic discount**:

- **`monthlyUsd`** is the standard rate, billed monthly, from month 1 onward. A 1-month purchase always bills at this rate — it is never discounted.
- **The only discount** is a one-time, per-patient `$100` promo code (`PROMO_CODE_DISCOUNT_USD`), redeemable **only** when purchasing a `3`-month plan (`PROMO_CODE_MIN_MONTHS`). It reduces month 1 only — `promoFirstMonthUsd(pricing)` computes that discounted first-month price. It cannot be combined with a 1-month purchase, and cannot be reused.
- This promo code is the same incentive promoted via `EARLY_ADOPTER_DISCOUNT` in `src/lib/marketing-copy.ts`.

`compoundedMonthlyPricingSentence(label, pricing)` is the shared long-form sentence used across FAQ answers and route copy (e.g. "Compounded semaglutide is $199/month, billed monthly with no long-term contract. A one-time $100 promo code brings your first month to $99 when you purchase a 3-month plan; it can't be combined with a 1-month purchase and can only be used once per patient."). `formatCompoundedPriceLine()` and `dualCompoundedHeroPricingLine()` are the shorter card/hero variants of the same structure. **Never hand-write a pricing or promo-code sentence — always route through one of these helpers** so the flat-rate-plus-3-month-promo framing stays consistent if the numbers or wording change again.

## CTA switchboard (live — Bask questionnaire)

Beema is live: every marketing CTA sitewide sends visitors to Bask's hosted questionnaire (`https://q.beemahealth.com/start-online-visit/weightloss`). The in-house waitlist/qualify/intake funnel (`/waitlist/`, `/qualify/`, `/intake/`, `/consent/`, `/eligibility/`) is dormant and unlinked from any button — see `docs/BACKEND-DEFERRED.md`.

**`resolveCta(ctaId)` in `src/lib/cta-ids.ts` is the single place that decision is made.** Every CTA button/link in the app calls it instead of hardcoding a URL or a label:

```tsx
const cta = resolveCta(CTA_IDS.tirzepatide_hero);
<Link to={cta.to} search={cta.search}>{cta.label}</Link>
```

- All `CtaId`s default to `DEFAULT_CTA_TARGET` (`"Get Started"` → the Bask questionnaire URL).
- To repoint one CTA (or a few) — e.g. a medication-specific intake URL — add an entry to `CTA_OVERRIDES` keyed by `CtaId`. `to` can be an internal path or a full external URL (Bask lives on a different domain).
- To repoint everything at once, change `DEFAULT_CTA_TARGET`.

**When adding any new CTA button anywhere on the site: add a `CtaId` to `CTA_IDS` and call `resolveCta()` — never hardcode a URL or label on a marketing CTA.** This is what keeps repointing the funnel a one-file change instead of a site-wide hunt.

**Login is separate from the CTA switchboard.** The header's "Log In" link goes straight to the Hive patient portal (`HIVE_LOGIN_URL` in `src/lib/cta-ids.ts`, currently `https://hive.beemahealth.com`) via a plain `<a>` — it's an account action on a different app, not a funnel-conversion click, so it doesn't go through `resolveCta`/`CTA_IDS`.

## Key files

| File | Role |
|------|------|
| `src/routes/tirzepatide.tsx`, `src/routes/semaglutide.tsx` | The two treatment pages |
| `src/components/site/TreatmentPageBlocks.tsx` | Shared breadcrumb, pricing card, comparison table, FAQ accordion |
| `src/lib/medication-pricing.ts` | Single source of truth for pricing — never hardcode `$` amounts elsewhere |
| `src/lib/cta-ids.ts` | `CTA_IDS`, `resolveCta()` — the CTA switchboard |
| `src/lib/seo.ts` | `faqPageJsonLd()`, `breadcrumbJsonLd()`, `canonicalUrl()` |
| `src/components/site/SiteHeader.tsx`, `SiteFooter.tsx` | Weight Loss dropdown (`WeightLossNavDropdown` desktop, `MobileWeightLossDropdown` mobile) / Care links |
| `src/lib/marketing-copy.ts` | `EARLY_ADOPTER_DISCOUNT` — the one-time, 3-month-only promo code promoted alongside pricing |
| `src/components/home/TreatmentShowcase.tsx`, `src/components/site/TreatmentLineup.tsx` | Medication cards (home / `/weight-loss`) |
| `public/sitemap.xml`, `public/llms.txt`, `src/lib/__tests__/sitemap.test.ts` | Keep in sync when adding a page |
