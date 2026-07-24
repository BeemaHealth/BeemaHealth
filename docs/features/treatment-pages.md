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

`SiteHeader.tsx` renders "Weight Loss" as a `DropdownMenu` trigger (desktop) / a non-link section label with indented links (mobile), listing `WEIGHT_LOSS_ITEMS` — currently Compounded Tirzepatide and Compounded Semaglutide. Add new medication pages to that array (and to `SiteFooter.tsx`'s `COLUMNS[0].links`) rather than adding a new top-level nav entry.

## Medication cards

`TreatmentShowcase.tsx` (homepage) and `TreatmentLineup.tsx` (`/weight-loss` page) each render one card per medication. Both cards are full-card `<Link>`s (not nested interactive elements) pointing at that medication's own page (`/tirzepatide/`, `/semaglutide/`) — never at `/weight-loss/`. CTA copy is `Explore {treatment.name}` (e.g. "Explore Compounded Tirzepatide"). These two files still duplicate their own local `TREATMENTS` array (pre-existing pattern) — add a new medication to both when it gets its own page.

## CTA switchboard (waitlist → live portal cutover)

Beema is pre-launch: every marketing CTA sitewide sends visitors to `/waitlist/`. The patient portal (intake, payment, dashboard) is a **separate system** being built independently of this marketing site — when it's ready, CTAs need to point there instead, possibly per-CTA rather than all at once.

**`resolveCta(ctaId)` in `src/lib/cta-ids.ts` is the single place that decision is made.** Every CTA button/link in the app calls it instead of hardcoding `WAITLIST_PATH` or a label:

```tsx
const cta = resolveCta(CTA_IDS.tirzepatide_hero);
<Link to={cta.to} search={cta.search}>{cta.label}</Link>
```

- All `CtaId`s default to `DEFAULT_CTA_TARGET` (`"Join waitlist"` → `/waitlist/`).
- To repoint one CTA (or a few), add an entry to `CTA_OVERRIDES` keyed by `CtaId` — `to` can be an internal path or a full external URL (the portal may live on a different domain).
- To repoint everything at once, change `DEFAULT_CTA_TARGET`.

**When adding any new CTA button anywhere on the site: add a `CtaId` to `CTA_IDS` and call `resolveCta()` — never hardcode `WAITLIST_PATH`, `WAITLIST_CTA_LABEL`, or a literal href/label on a marketing CTA.** This is what keeps the waitlist→live cutover a one-file change instead of a site-wide hunt.

## Key files

| File | Role |
|------|------|
| `src/routes/tirzepatide.tsx`, `src/routes/semaglutide.tsx` | The two treatment pages |
| `src/components/site/TreatmentPageBlocks.tsx` | Shared breadcrumb, pricing card, comparison table, FAQ accordion |
| `src/lib/medication-pricing.ts` | Single source of truth for pricing — never hardcode `$` amounts elsewhere |
| `src/lib/cta-ids.ts` | `CTA_IDS`, `resolveCta()` — the CTA switchboard |
| `src/lib/seo.ts` | `faqPageJsonLd()`, `breadcrumbJsonLd()`, `canonicalUrl()` |
| `src/components/site/SiteHeader.tsx`, `SiteFooter.tsx` | Weight Loss dropdown / Care links |
| `src/components/home/TreatmentShowcase.tsx`, `src/components/site/TreatmentLineup.tsx` | Medication cards (home / `/weight-loss`) |
| `public/sitemap.xml`, `public/llms.txt`, `src/lib/__tests__/sitemap.test.ts` | Keep in sync when adding a page |
