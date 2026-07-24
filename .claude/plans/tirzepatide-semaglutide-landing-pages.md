# Tirzepatide / Semaglutide landing pages

## Summary
Add `/tirzepatide` and `/semaglutide` as full SEO landing pages, each with its own copy, pricing, FAQ, and schema. Turn "Weight Loss" into a nav dropdown pointing at the two new pages. Keep `/weight-loss` live and in the sitemap for now (still directly navigable, still accurate) but remove every internal link to it — a deliberate orphan page, easy to fully retire later. Introduce a single CTA switchboard so every "Join waitlist" button sitewide can be repointed to the live patient portal from one file later. Riskiest assumption: deriving breadcrumbs as `Home / <product>` (no "Weight Loss" node) is the right call now that the page isn't nav-linked — reversible, flagged in the summary to the user.

## Decisions (and how cheap they are to change later)
- **`/weight-loss` stays live, orphaned from nav/footer/cards, still in sitemap/robots/llms.txt.** Alternative considered: retire it now. Cost to change later: low — deleting the route + removing sitemap/llms.txt entries is a small diff whenever the user wants to pull the trigger.
- **Nav "Weight Loss" becomes a `DropdownMenu` trigger (not a link) with two items.** Uses the existing `src/components/ui/dropdown-menu.tsx` (already in the dependency tree, unused elsewhere in marketing nav). Mobile sheet gets a non-link label + two indented links instead of a dropdown (no hover surface on touch).
- **Breadcrumbs are `Home / Compounded Tirzepatide` (2-level, no Weight Loss node)** since nothing links to `/weight-loss` anymore. Cheap to add a middle crumb back later if `/weight-loss` becomes a real category page again.
- **CTA switchboard lives in `src/lib/cta-ids.ts`** as `resolveCta(id)`, returning `{ label, to, search }`. Every marketing CTA call site (13 found) is refactored to call it instead of hardcoding `WAITLIST_PATH`/`WAITLIST_CTA_LABEL`. Today every id resolves to the same default (`Join waitlist` → `/waitlist/`); an empty `CTA_OVERRIDES` map is the one place to add per-CTA destinations later (e.g. point a specific hero at the live portal without touching the page file).
- **Homepage/weight-loss medication cards get a `to` field per treatment** (tirzepatide → `/tirzepatide/`, semaglutide → `/semaglutide/`) instead of both hardcoded to `/weight-loss/`. `TreatmentLineup.tsx` (currently non-interactive `<article>`s) becomes a real `Link` card, matching the already-correct `TreatmentShowcase.tsx` pattern. Card tilt/hover/reveal animation preserved as-is.
- **Page content lives inline in each route file** (`src/routes/tirzepatide.tsx`, `src/routes/semaglutide.tsx`), matching the existing convention in `weight-loss.tsx`/`how-it-works.tsx` (local `STEPS`/`BENEFITS` consts) rather than growing a shared data file for page-specific copy.
- **A small set of shared building blocks** (pricing card, comparison table, FAQ-with-JSONLD renderer) live in `src/components/site/` since both pages need the identical structure — copy/data stays local to each route.

## Known unknowns & defaults
- llms.txt: user confirmed "anything public should show pages that are gonna be crawled" → add both new pages there too (not just sitemap).
- Whether `/weight-loss` copy needs edits beyond the card links: default is minimal — swap the two `TreatmentLineup` cards to link out; leave the rest of the page copy as-is since it's still accurate.

## Compliance & validation
- Reuse exact required sentence verbatim on both pages: "Compounded {drug} is not FDA-approved and is considered only when legally available and clinically appropriate."
- No outcome guarantees, no insurance/credential claims beyond what's already on-site, no before/after imagery — reuse the existing `compoundedSemaglutideVialImg`/`compoundedTirzepatideVialImg` product photography already used sitewide.
- Pricing sourced only from `src/lib/medication-pricing.ts` (already $99/$199 and $197/$297) — no new numbers invented.
- FAQPage JSON-LD generated from the same array that renders the visible accordion (mirrors `faq.tsx`). BreadcrumbList JSON-LD matches the visible breadcrumb exactly.

## Mechanical work
- New routes: `src/routes/tirzepatide.tsx`, `src/routes/semaglutide.tsx`.
- New shared components: pricing card, comparison table, FAQ block (exact location TBD during implementation, kept small).
- Edit: `SiteHeader.tsx` (dropdown), `SiteFooter.tsx` (two links replace one), `TreatmentShowcase.tsx`, `TreatmentLineup.tsx`, `cta-ids.ts` (new ids + `resolveCta`), all 13 CTA call sites, `public/sitemap.xml`, `public/llms.txt`, `src/lib/__tests__/sitemap.test.ts` (`EXPECTED_PATHS`).
- CLAUDE.md: add a short section documenting the waitlist-mode CTA switchboard so future AI sessions route new CTAs through `resolveCta` instead of hardcoding the waitlist path.
- Run `npm run test:all`, `npx tsc --noEmit`, ESLint on changed files; fix regressions.

## Out of scope
- Actually connecting any CTA to a live portal URL (just building the switchboard).
- Retiring `/weight-loss` entirely.
- Branded-medication pages (Zepbound/Wegovy) — noted as a likely future addition to the same dropdown, not built now.
- `docs/features/` doc for this feature — will ask separately per the standard gate once the pages exist to describe.
