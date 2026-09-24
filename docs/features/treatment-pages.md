# Treatment pages

Each medication Beema offers gets its own indexable, SEO-focused **money page** (`/tirzepatide`, `/semaglutide`, `/tadalafil`, `/sildenafil`, `/oral-finasteride`, `/oral-minoxidil-men`, `/oral-minoxidil-women`, `/hair-loss-spray-men`, `/hair-loss-spray-women`, `/ed-mints`) - this targets each drug's search terms without diluting them, and gives each page its own FAQPage/BreadcrumbList JSON-LD. Oral Minoxidil and the Hair Loss Spray are each split into a men's and a women's page rather than one shared page - see "Single-sex product pages" below for why. Beema's patient-facing offering is compounded across most product lines - **oral finasteride, oral minoxidil, tadalafil, and sildenafil are the exceptions: real FDA-approved generics, not compounded** (corrected 2026-09-03 for tadalafil/sildenafil, per Matt; corrected 2026-09-11 for oral minoxidil, per Matt, after confirming with the pharmacy - see the product table below). ED Mints and both Hair Loss Sprays remain compounded. Do not add branded-medication pages (Wegovy, Zepbound, Ozempic, Mounjaro, or any branded ED product) or describe those brands as Beema offerings. `/weight-loss` and `/ed` sit alongside the money pages as broader overview pages targeting head-term searches ("medical weight loss," "ED treatment"), and `/hair-loss` is a category hub playing the same head-term role for "hair loss treatment" - see "Money-page architecture" below for how these page types relate.

## The non-GLP-1 product lines (TRT, hairloss, ED, NAD+, sermorelin)

Added 2026-08-27, first pass, restructured 2026-08-28/29. These are **not** GLP-1 medications, so the §F1.1 compliance rules below (written specifically for compounded semaglutide/tirzepatide) do not apply to them verbatim - see `docs/marketing/SEO-AEO-GEO-PLAN.md` §F1.2 for their parallel, product-accurate compliance framing.

**Hairloss, ED, NAD+, and Sermorelin are live.** TRT remains **paused** - Beema is not selling it right now. Its route (`/trt`) redirects home, matching the site's existing archived-route convention (see `docs/archived-marketing-pages.md` / `/the-comb`, `/pricing`), and is unlinked everywhere and disallowed in `robots.txt`. Full page content and pricing consts stay in git history / `simple-treatment-pricing.ts` (unused by any live route) so restoring them later is a revert, not a rebuild. **When TRT returns, do not market it as "TRT"** - enclomiphene is pharmacologically distinct from testosterone replacement therapy (it stimulates the body's own production rather than replacing testosterone directly). Write a "TRT vs enclomiphene" learn article before relaunching it, and name the route/nav something other than "TRT".

**NAD+ relaunched 2026-09-16** (per Matt) - `/nad-plus` reverted back to its full pre-pause page (same content that shipped in commit a5bf351c, paused in 75cc9b28), on its own new header nav section (a "Wellness" dropdown, see "Nav: category dropdowns" below). Its Bask questionnaire URL was confirmed directly by Matt at relaunch: `https://q.beemahealth.com/start-online-visit/nad` (`NAD_INTAKE_URL` in `cta-ids.ts`), replacing the earlier unverified `${BASK_INTAKE_BASE}/nad` guess with the same literal URL. `/wellness` (the category hub) stays paused/redirecting - NAD+ launched as a standalone money page, not alongside a relaunched hub, since it would be the hub's only listed product today (Matt's call, 2026-09-16).

**NAD+ repriced into an interactive 3-month/1-month picker at the same relaunch** (per Matt) - same shape as the hair loss spray pattern: 3 months at $439 total (~$146.33/mo) is the default tab, 1 month at $199/mo is the explicit alternate tab (`NAD_PRICING` in `simple-treatment-pricing.ts`, `interactive` prop on `SimpleTreatmentPricingCard`). The hero and meta description lead with the $146.33/mo quarterly rate via `formatSimpleQuarterlyStartingAt()`, matching ED Mints/hair loss spray. It also got real product photography for the first time - a labeled vial studio shot (Matt supplied the source PNG from `~/Desktop/Beema Health/Product Photos/NAD+.png`, converted to `src/assets/treatments/nad-injection-vial.webp`, 1024x1280, transparent background, ~83KB), rendered directly (`<img>`, not `TreatmentHeroArt`) in the hero at `aspect-[4/5]`/`object-contain`, the same pattern as every other real-photo money page - see "Imagery" below.

**Sermorelin relaunched 2026-09-17** (per Matt), joining NAD+ on the header's Wellness dropdown - `/sermorelin` reverted back to its full pre-pause page (same content that shipped in commit a5bf351c, paused in 75cc9b28), including the `MagneticButton` → `HoverLiftButton` rename that had already happened to the rest of the codebase since the page was paused (same fix NAD+ needed at its own relaunch). Its Bask questionnaire URL was confirmed directly by Matt at relaunch: `https://q.beemahealth.com/start-online-visit/sermorelin` (`SERMORELIN_INTAKE_URL` in `cta-ids.ts`), replacing the earlier unverified `${BASK_INTAKE_BASE}/sermorelin` guess with the same literal URL. It got real product photography at launch - a labeled vial studio shot (Matt supplied the source PNG from `~/Desktop/Beema Health/Product Photos/Sermoralin.png` [sic], converted to `src/assets/treatments/sermorelin-injection-vial.webp`, 1024x1280, transparent background, ~79KB), rendered directly (`<img>`, not `TreatmentHeroArt`) in the hero at `aspect-[4/5]`/`object-contain`, the same pattern as `/nad-plus` and every other real-photo money page - see "Imagery" below. `/wellness` (the category hub) stays paused/redirecting, same reasoning as NAD+ above.

**Sermorelin repriced into an interactive 3-month/1-month picker the same day** (per Matt's cost-sheet screenshot) - same shape as NAD+/hair loss spray: 3 months at $597 total (~$199/mo, saving $150) is the default tab, 1 month at $249/mo is the explicit alternate tab (`SERMORELIN_PRICING` in `simple-treatment-pricing.ts`, `interactive` prop on `SimpleTreatmentPricingCard`). The hero and meta description lead with the $199/mo quarterly rate via `formatSimpleQuarterlyStartingAt()`.

| Product | Money page | Status | What Beema actually sells | Plans |
|---|---|---|---|---|
| Oral Finasteride | `/oral-finasteride` | **Live** (2026-09-03) | The FDA-approved **generic** version of Propecia® - not compounded, like tadalafil and sildenafil below. Men only; not for women who are or may become pregnant. `/hair-loss` is the category hub above it (see below) | Monthly only, `HAIRLOSS_FINASTERIDE_PRICING` |
| Oral Minoxidil (Men) | `/oral-minoxidil-men` | **Live** (2026-09-09) | The FDA-approved **generic** medication, not compounded (corrected 2026-09-11, per Matt, after confirming with the pharmacy) - approved to treat high blood pressure; used off-label for hair loss. One product/one price/one Bask questionnaire shared with the women's page below, but its own single-sex landing page (see "Single-sex product pages" below). `/hair-loss` is the category hub above it | Monthly only, `HAIRLOSS_ORAL_MINOXIDIL_PRICING` |
| Oral Minoxidil (Women) | `/oral-minoxidil-women` | **Live** (2026-09-09) | Same product/price/questionnaire as the men's page above, own single-sex landing page | Monthly only, `HAIRLOSS_ORAL_MINOXIDIL_PRICING` |
| Hair Loss Spray (Men) | `/hair-loss-spray-men` | **Live** (2026-09-09) | Compounded topical spray, men only - Minoxidil 7% / Tretinoin 0.025% / Fluocinolone 0.025% / Finasteride 0.2%, 60 mL (full formula added to page copy 2026-09-10, per Matt) | `HAIRLOSS_TOPICAL_MEN_PRICING` - interactive 3-month/1-month picker on the Transparent pricing card (2026-09-13, per Matt): 3 months at $249 total (~$83/mo) is the default tab, 1 month at $129/mo is the explicit alternate tab. Hero/meta/hub-card price teasers use `formatSimpleQuarterlyStartingAt()` so they lead with $83/mo too. See the `interactive` prop on `SimpleTreatmentPricingCard` |
| Hair Loss Spray (Women) | `/hair-loss-spray-women` | **Live** (2026-09-09) | Compounded topical spray, women only - Minoxidil 7% / Tretinoin 0.025% / Fluocinolone 0.025% / Biotin 0.8% / Melatonin 0.5%, 60 mL, no finasteride (full formula added to page copy 2026-09-10, per Matt) | `HAIRLOSS_TOPICAL_WOMEN_PRICING` - same interactive 3-month ($249 total, ~$83/mo, default) / 1-month ($129/mo) picker as the men's page above (2026-09-13, per Matt) |
| Tadalafil | `/tadalafil` | **Live** (2026-09-03) | The FDA-approved **generic** version of Cialis® - not compounded (corrected 2026-09-03, per Matt; was previously marketed as compounded in error). `/ed` is the broader overview page above it | Monthly + Quarterly, `ED_TADALAFIL_PRICING` |
| Sildenafil | `/sildenafil` | **Live** (2026-09-03) | The FDA-approved **generic** version of Viagra® - not compounded (corrected 2026-09-03, per Matt; was previously marketed as compounded in error). `/ed` is the broader overview page above it | Monthly + Quarterly, `ED_SILDENAFIL_PRICING` |
| ED Mints | `/ed-mints` | **Live (2 products)** | 2 compounded, dissolve-under-the-tongue combo formulations - still genuinely compounded, unlike tadalafil/sildenafil above - each with its own dedicated Bask intake: Tadalafil + Sildenafil 12mg/60mg RDT (formerly `/ed`'s Combo SKU before the 2026-09-03 restructure), and Sildenafil 50mg/Tadalafil 20mg/Oxytocin 125 IU ODT (previously priced in the pharmacy catalog but not sold - now live) | Both are $149/mo or $199 billed quarterly (`ED_MINTS_RDT_PRICING` / `ED_MINTS_ODT_PRICING`) |
| TRT | `/trt` | **Paused** | Compounded **enclomiphene** - an oral SERM that encourages the body to produce its own testosterone. Not injectable testosterone, not a controlled substance | Monthly only (no quarterly SKU in the cost sheet) |
| NAD+ | `/nad-plus` | **Live** (relaunched 2026-09-16) | Compounded NAD+ injections. No cost-sheet entry - market-rate estimate, revisit once real pharmacy costs exist | Interactive 3-month ($439 total, ~$146.33/mo, default tab)/1-month ($199/mo, alternate tab) picker, `NAD_PRICING` |
| Sermorelin | `/sermorelin` | **Live** (relaunched 2026-09-17) | Compounded sermorelin injections. No cost-sheet entry - market-rate estimate, revisit once real pharmacy costs exist | Interactive 3-month ($597 total, ~$199/mo, default tab)/1-month ($249/mo, alternate tab) picker, `SERMORELIN_PRICING` |

**`/ed` is an overview page, not a money page** (restructured 2026-09-03 - see "Money-page architecture" below). **`/hair-loss` is a category hub, not a money page** (see "Category hub pages" below) - it merged what used to be two separate pages, `/hair` (a hub) and `/hairloss` (a 6-SKU overview/FAQ page), into one on 2026-09-04, since neither had shipped to production and having both was redundant, SEO-diluting duplication.

**Oral Minoxidil and both sexes' Hair Loss Spray launched 2026-09-09** (Matt), each on its own dedicated money page - 4 new pages (`/oral-minoxidil-men`, `/oral-minoxidil-women`, `/hair-loss-spray-men`, `/hair-loss-spray-women`), for 5 total hair money pages including the pre-existing `/oral-finasteride`. `HAIR_SECTIONS` in `SiteHeader.tsx` now lists, **For Men**: Oral Minoxidil, Oral Finasteride, Hair Loss Spray; **For Women**: Oral Minoxidil, Hair Loss Spray. "Oral Hair Compound" (women's, a distinct formulation from oral minoxidil - `HAIRLOSS_WOMENS_COMPOUND_PRICING`) is **not** part of this launch and stays out of both nav and `/hair-loss`'s `LINEUP`, pending its own launch decision - do not add it without a separate go-ahead. `/hair-loss`'s `LINEUP` array now carries 5 entries (Oral Finasteride, Oral Minoxidil (Men), Oral Minoxidil (Women), Hair Loss Spray (Men), Hair Loss Spray (Women)) instead of commented-out pricing cards.

**Single-sex product pages (2026-09-09, per Matt):** every hair-loss page targets exactly one sex, even Oral Minoxidil, which is genuinely one product/one price/one Bask questionnaire for both. Matt's call: women shouldn't land on a page (or a "Get Started" picker entry) that also talks about the men's version, and vice versa - "women like to feel like it is only for them." So `/oral-minoxidil-men` and `/oral-minoxidil-women` are two separate routes with entirely single-sex copy (hero, FAQ, eligibility, `<title>`) that both hand off to the same `ORAL_MINOXIDIL_INTAKE_URL` - neither page's copy mentions the other's existence. The Hair Loss Spray already worked this way naturally, since it's 2 real formulations on 2 real Bask questionnaires; its women's FAQ used to say "a different formulation from the men's spray" and was edited to drop that cross-reference for the same reason. Apply this rule to any future hair-loss (or other) product that ships as one price/questionnaire for both sexes - default to 2 single-sex pages, not 1 shared "for men and women" page, unless told otherwise.

**Pricing model:** these products use `src/lib/simple-treatment-pricing.ts`, deliberately separate from `medication-pricing.ts` (see that file's docstring - the GLP-1 pricing shape has 1/3/6/12-month tiers, a promo code, and a starter pack, none of which these products have). First-pass prices were set at roughly 1.5x landed cost (pharmacy + dispense + shipping + doctor's fee) from an internal cost sheet, charm-rounded. **NAD+, sermorelin, and hairloss finasteride have no cost-sheet entry at all** - their prices are telehealth market-rate estimates, not cost-derived; revisit once real pharmacy costs exist. Tadalafil and sildenafil shared a landed-cost-derived price at launch; repriced independently 2026-09-03 (per Matt) to $49.67/mo and $43/mo respectively - see `simplePerDaySentence()` for the "less than $1 a day" callout used where a price clears that bar (currently only hairloss finasteride, at $29.67/mo). `SimpleTreatmentPricingCard` in `TreatmentPageBlocks.tsx` renders these plans; it does not share code with `TreatmentPricingCard` (GLP-1-only) or `CompoundedPriceLockup` (GLP-1-only, hardcodes tirz/sema cross-references).

**Imagery:** Oral Finasteride, Tadalafil, and Sildenafil have had real product photography since their 2026-09-03 launch - studio bottle shots at `src/assets/treatments/{finasteride,tadalafil,sildenafil}-oral-tablets-bottle.webp` (720x900 WebP, transparent background, ~48-51KB each), rendered directly (`<img>`, not `TreatmentHeroArt`) in each route's hero at `aspect-[4/5]` with `object-contain` - not `aspect-square`/`object-cover`, which cropped the top and bottom off the bottle (fixed 2026-09-09, per Matt). Oral Minoxidil and both sexes' Hair Loss Spray got the same treatment on launch (2026-09-09): `hair-loss-spray-{men,women}-bottle.webp` and `oral-minoxidil-tablets-bottle.webp` (the last one shared by both `/oral-minoxidil-men` and `/oral-minoxidil-women`, same product/photo), converted from full-resolution PNGs on Matt's Desktop the same way ED Mints' photos were (see below) - 37-52KB each. Combined with ED Mints' 2 SKUs (already real photography, see below), **every hair-loss and sexual-health money page now uses a real product photo - none of them fall back to the `TreatmentHeroArt` icon placeholder anymore.** `/nad-plus` and `/sermorelin` also got real photography at their 2026-09-16/2026-09-17 relaunches - labeled vial shots at `src/assets/treatments/nad-injection-vial.webp` and `sermorelin-injection-vial.webp` (both 1024x1280 WebP, transparent background, ~79-83KB), converted from full-resolution PNGs on Matt's Desktop the same way the others were, rendered the same `aspect-[4/5]`/`object-contain` way. **Every live non-GLP-1 money page now uses a real product photo - none of them fall back to the `TreatmentHeroArt` icon placeholder.** (TRT remains paused and undocumented here for imagery, since it has no live money page to photograph.) All of these are also wired into `criticalBootImageUrls()`/`bootImagePreloadLinks()` in `boot-assets.ts` (see "LCP & first-visit splash" below) so each page's own bottle photo, not a generic fallback, is what the splash waits on. Swap any of these for updated photography later by changing each route's hero import, the same way `VIAL_IMAGERY_MODE` in `treatment-imagery.ts` works for sema/tirz.

**ED Mints has real product photography (2026-09-03).** Two studio shots (grey = the RDT combo, orange = the ODT combo) live at `src/assets/treatments/ed-mints-tadalafil-sildenafil-rdt.webp` and `ed-mints-sildenafil-tadalafil-oxytocin-odt.webp` - 1024x1024 WebP, ~135-155KB each, converted from source PNGs on Matt's Desktop. `ed-mints.tsx` renders these directly (`<img>`, not `TreatmentHeroArt`) in three places: the page hero (currently the ODT/orange shot - swap the import there to change which product leads), and each option's card inside the picker modal (`MintOption.photo`/`photoAlt` in `MINT_OPTIONS`). Filenames and `alt` text both name the exact formulation and dose for image-search SEO - keep both descriptive if these ever get replaced. The hero photo is also wired into the LCP preload switchboard (see below) since it's a real above-the-fold image.

**Finasteride, tadalafil, and sildenafil have confirmed production Bask URLs** (2026-09-03) - `FINASTERIDE_INTAKE_URL`, `TADALAFIL_INTAKE_URL`, `SILDENAFIL_INTAKE_URL` in `cta-ids.ts`, replacing the earlier `${BASK_INTAKE_BASE}/{hairloss|ed}` guesses. **NAD+ and Sermorelin also have confirmed production Bask URLs** (2026-09-16 and 2026-09-17 respectively, both given directly by Matt at relaunch) - `NAD_INTAKE_URL` (`/start-online-visit/nad`) and `SERMORELIN_INTAKE_URL` (`/start-online-visit/sermorelin`) in `cta-ids.ts`, the same literal URLs the earlier guesses had, now named consts like the others. TRT's `${BASK_INTAKE_BASE}/trt` URL remains an unverified guess - moot while that line is paused.

**Oral Minoxidil and both Hair Loss Sprays have confirmed production Bask URLs (2026-09-09)** - `ORAL_MINOXIDIL_INTAKE_URL` (`/start-online-visit/oralminoxidil`, one URL reused by both `/oral-minoxidil-men` and `/oral-minoxidil-women` - see "Single-sex product pages" above), `HAIRLOSS_SPRAY_MEN_INTAKE_URL` (`/start-online-visit/hairlossspraymen`), and `HAIRLOSS_SPRAY_WOMEN_INTAKE_URL` (`/start-online-visit/hairlossspraywomen`) in `cta-ids.ts`.

**ED Mints has confirmed production Bask URLs (2026-09-03).** `ED_MINTS_RDT_INTAKE_URL` (`/start-online-visit/edmint1`) and `ED_MINTS_ODT_INTAKE_URL` (`/start-online-visit/edmint2`) in `cta-ids.ts` - RDT is "Tadalafil + Sildenafil" (starts with tadalafil), ODT is "Sildenafil + Tadalafil + Oxytocin" (starts with sildenafil). All four "Get Started" surfaces on `/ed-mints` (the picker modal's `Continue` button, `ed_mints_rdt_hero`/`_footer`, `ed_mints_odt_hero`/`_footer`) now resolve to a real questionnaire.

**Nav:** see "Nav: category dropdowns" below for the current (2026-09-17) shape - sectioned dropdowns for Hair Loss and Sexual Health, flat for Weight Loss and Wellness. Wellness relaunched 2026-09-16 as a flat one-item dropdown (NAD+ only), then grew to 2 items on 2026-09-17 when Sermorelin joined it. Nav links go straight to money pages (see "Money-page architecture" below), never through `/hair-loss`, `/ed`, or `/wellness` first.

**`/learn/trt` was rewritten 2026-09-24** - it no longer describes compounded enclomiphene as a live offering or points to `/trt` (which now 404s, its route file removed, rather than redirecting home). The hub, its FAQs, and the "what-is-trt" article now use the same "educational only - not a Beema Health product" framing as `/learn/hrt`, updated for a paused-not-permanent product instead of HRT's never-offered one. A dedicated "TRT vs enclomiphene" article is still a good future addition, not yet written. `/learn/hrt`'s "not currently offered" language is untouched - HRT is still not a Beema Health program.

Educational (not commercial) companions live at `/learn/`. Program pages pull those guides from `src/content/learn/money-page-guides.ts`. Learn copy is unsigned; do not treat it as clinician-reviewed. Spec: `docs/features/learn.md`.

## Money-page architecture (2026-09-03)

Every product with a confirmed Bask URL gets its own dedicated **money page** - the page whose "Get Started" CTA goes straight to that product's Bask questionnaire, no intermediate hop:

`/tirzepatide`, `/semaglutide`, `/tadalafil`, `/sildenafil`, `/oral-finasteride`, `/oral-minoxidil-men`, `/oral-minoxidil-women`, `/hair-loss-spray-men`, `/hair-loss-spray-women`, `/ed-mints`, `/nad-plus`, `/sermorelin` are money pages. Nav dropdowns (`SEXUAL_HEALTH_SECTIONS`, `HAIR_SECTIONS`, `WELLNESS_ITEMS` in `SiteHeader.tsx`) link straight to these - never through `/ed`, `/hair-loss`, or `/wellness` first. Each money page's `resolveCta()` call targets that product's own `CtaId` (`tadalafil_hero`/`_footer`, `sildenafil_hero`/`_footer`, `oral_finasteride_hero`/`_footer`, `oral_minoxidil_men_hero`/`_footer`, `oral_minoxidil_women_hero`/`_footer`, `hairloss_spray_men_hero`/`_footer`, `hairloss_spray_women_hero`/`_footer`, `ed_mints_rdt_*`, `ed_mints_odt_*`, `nad_hero`/`_footer`, `sermorelin_hero`/`_footer`), which resolves to that product's own Bask URL - `oral_minoxidil_men_*` and `oral_minoxidil_women_*` both resolve to the same `ORAL_MINOXIDIL_INTAKE_URL` (see "Single-sex product pages" above), kept as 2 separate CtaIds so funnel attribution can tell which page a conversion came from.

`/ed` is an **overview/comparison page, not a money page** - restructured 2026-09-03 from its original shape (a shared page selling multiple products off one combined CTA guess) once real per-product Bask URLs existed and made that combined CTA both unnecessary and wrong. It stays live (not retired - it may carry SEO value from earlier launches) and reachable from the footer Care column and in-page cross-links, but:

- Its hero CTA is an on-page jump (`hash="pricing"`, labeled "Compare formulations"), not a `resolveCta()` call.
- Its `SimpleTreatmentPricingCard`s pass an internal `cta` (e.g. `{ label: "Explore Tadalafil", to: "/tadalafil/" }`) instead of a Bask-bound one - the card shows full pricing but the button routes onward to the money page, not to Bask.
- Its closing banner links to the money page(s) directly (two buttons, one per product).
- `ed_hero`/`ed_footer` stay defined in `CTA_IDS`/`CTA_OVERRIDES` (unused by any live page now) rather than removed - same "kept defined while dormant" convention as the paused TRT CTAs, in case a page-level CTA comes back.

`/hair-loss` works differently: it's a **category hub** (see "Category hub pages" below), using `resolveCta()` directly (`hair_hero`/`hair_footer`, resolving straight to `FINASTERIDE_INTAKE_URL`) rather than an on-page jump - a leftover single-product pick from when Oral Finasteride was the hub's only live product (2026-09-03 through 2026-09-09). Now that the hub has 4 live products, `hair_hero`/`hair_footer` arbitrarily point at finasteride's URL rather than any one product being more correct than another; revisit if a category-level Bask intake ever exists. `hairloss_hero`/`hairloss_footer` (the old standalone `/hairloss` overview page's CTAs, already unused before the merge) were deleted, not kept dormant, when `/hairloss` was retired 2026-09-04 - unlike `/ed`'s CTAs, they had never resolved on any live page in production, so there was nothing to preserve.

`SimpleTreatmentPricingCard`'s `cta` prop (`{ label, to, search?, onClick? }`, added 2026-09-03 in `TreatmentPageBlocks.tsx`) is optional and backward-compatible - passing a `resolveCta()` result (Bask, with `search`/`onClick`) on a money page and a plain internal link (no `search`/`onClick`) on an overview page are both valid uses of the same prop. It also accepts optional `title`/`badge` (e.g. `title="Finasteride (Generic Propecia®)"`, `badge="Rx"`) for pages that need a visible product name on the card, which the original shared-CTA-only cards never needed.

**Footer stays lean on purpose:** unlike Weight Loss (which lists both `/tirzepatide` and `/semaglutide` individually in the footer Care column alongside the `/weight-loss` hub), the Care column does **not** list Tadalafil, Sildenafil, Oral Finasteride, Oral Minoxidil, either Hair Loss Spray, or ED Mints individually - only `/ed` and `/hair-loss`. The header's Sexual Health/Hair dropdowns are the way to those product pages; duplicating them in the footer was judged to overcrowd that column for no real navigation benefit, since a visitor already sees the dropdown before ever reaching the footer.

## Category hub pages (`/sexual-health`, `/hair-loss`; `/wellness` paused)

Added 2026-08-27, alongside the nav reorganization below. Mirrors the pre-existing `/weight-loss` pattern exactly: a broader, non-brand overview page targeting head-term searches ("hair loss treatment," "sexual health treatment online"), linking down into the category's specific medication pages, which stay the bottom-funnel conversion targets.

| Hub | Route | Status | Links to |
|---|---|---|---|
| Weight Loss | `/weight-loss` | Live (pre-existing) | `/semaglutide`, `/tirzepatide` |
| Sexual Health | `/sexual-health` | Live | `/tadalafil`, `/sildenafil`, `/ed-mints` (money pages directly, 2026-09-03 - TRT paused, see above) |
| Hair Loss | `/hair-loss` | Live | `/oral-finasteride`, `/oral-minoxidil-men`, `/oral-minoxidil-women`, `/hair-loss-spray-men`, `/hair-loss-spray-women` (money pages directly; grew from 1 to 5 pages 2026-09-09, see below) |
| Wellness | `/wellness` | **Paused** (redirects home) | Would link `/nad-plus` and `/sermorelin` - both live (2026-09-16 and 2026-09-17 respectively), but reached via the header's Wellness dropdown, not this hub - see "Money-page architecture" above |

**Why Hair Loss got a full hub before it had more than one product:** `/hair-loss` and its nav dropdown (`HAIR_SECTIONS` in `SiteHeader.tsx`) were built out ahead of the 2026-09-09 launch specifically so more pages (Oral Minoxidil and Hair Loss Spray, both split men's/women's) could slot straight in - see the "Oral Minoxidil and both sexes' Hair Loss Spray launched" note above. Add any future hair-loss medication page to `HAIR_SECTIONS` and the `/hair-loss` route's `LINEUP` array (not the footer Care column - see "Money-page architecture" above for why individual product pages stay out of the footer). `CategoryLineupItem` (the `LINEUP` array's item type, in `TreatmentPageBlocks.tsx`) supports an optional `perDayNote` field - pass `simplePerDaySentence(pricing)` on any entry whose monthly rate clears the "less than $1 a day" bar (2026-09-04, matching the tag already shown on `/oral-finasteride` itself) to show the same highlighted tag next to that entry's price; Oral Minoxidil clears that bar (repriced 2026-09-09, per Matt, to a flat $29.67/mo with no quarterly SKU, matching Oral Finasteride's pattern). Hair Loss Spray (men's and women's) does not clear it (`simplePerDaySentence()` runs on `monthlyUsd`, which is $129, not the featured $83/mo 3-month-equivalent rate).

**`/hair-loss` merged two former pages on 2026-09-04:** `/hair` (this hub) and `/hairloss` (a separate 6-SKU comparison/FAQ overview page, restructured 2026-09-03 from an earlier money page - see git history for its FAQ copy, "What is compounded hairloss treatment," and safety sections if that content is ever wanted again). Neither had shipped to production, so there was no SEO equity on either URL to preserve with a redirect - they were combined into one page rather than one redirecting to the other. Unlike Sexual Health (which keeps `/sexual-health` as the hub and `/ed` as a separate deeper overview page), Hair Loss now has a single page doing both jobs.

**Compliance note (Sexual Health specifically):** when TRT returns, remember ED and TRT are different treatments for different concerns - the hub's copy should say so explicitly (it did, before the pause) so that bucketing them together for nav/audience reasons doesn't read as implying one is the other.

**Structured data:** each hub carries `BreadcrumbList` + `serviceJsonLd()` only, matching `/weight-loss` - no visible FAQ content on any hub, so no `FAQPage` (see the Structured data section below for why that pairing matters).

**Shared building block:** `SimpleCategoryLineup` in `TreatmentPageBlocks.tsx` renders each hub's card grid (icon art + name + price + link), deliberately separate from `TreatmentLineup.tsx` (the `/weight-loss`-only version hardcoded to GLP-1 photo imagery and `CompoundedPriceLockup`).

## Compliance (LegitScript + FDA)

Canonical long-form rules live in `docs/marketing/SEO-AEO-GEO-PLAN.md` **§F1.1**. Hard constraints for these pages and related marketing copy:

1. **Compounded-only offering.** Never list or imply Beema sells Wegovy, Zepbound, Ozempic, Mounjaro, or other FDA-approved branded GLP‑1s.
2. **FDA (Feb 6, 2026):** do not claim compounded products are generic / the same as FDA-approved drugs; do not state they use the same active ingredient; do not state they are clinically proven to produce results. https://www.fda.gov/news-events/press-announcements/fda-intends-take-action-against-non-fda-approved-glp-1-drugs
3. **Price ≠ medical necessity.** Lower price alone does not establish that a compounded drug is not essentially a copy of a commercial product.
4. **Required sentence** (reuse verbatim where the page explains compounded status): "Compounded {drug} is not FDA-approved and is considered only when legally available and clinically appropriate."
5. No outcome guarantees; prescribing is never guaranteed; provider decides case-by-case.
6. **No "medically reviewed" claims anywhere (2026-08-28).** Beema is LegitScript-certified - a separate, distinct claim from a content medical-review claim - and the two must never be conflated or implied either way. Do not show a "medically reviewed on [date]" line, and pass `reviewedByClinicalLead: false` on every `serviceJsonLd()`/`medicalWebPageJsonLd()` call sitewide (not just treatment pages - see `docs/features/learn.md`).

Product photography: the site defaults to branded Beema-wordmark vial imagery via `VIAL_IMAGERY_MODE` in `src/lib/treatment-imagery.ts` (`"branded"`). Unbranded colour vials (no wordmark) remain on the switchboard if product wants them back. See `docs/features/legitscript.md` and `docs/features/homepage.md`.

**Branded vial photos replaced 2026-09-13 (per Matt):** the branded set (`compounded-semaglutide-vial.webp` / `compounded-tirzepatide-vial.webp`) swapped from square room-set studio photos to transparent-cutout renders of the actual labeled vial (gold cap, black printed label, honeycomb motif) at 1024x1280 - same filenames, so no import changes were needed anywhere the switchboard is consumed (route heroes, `TreatmentLineup.tsx`, `TreatmentShowcase.tsx`, `boot-assets.ts`). `semaglutide.tsx`/`tirzepatide.tsx` heroes were also switched from `aspect-square`/`object-cover` to `aspect-[4/5]`/`object-contain` - the same crop fix already applied to the oral-tablet money pages above, now needed here too since the new photo is a portrait cutout, not a square studio frame that could tolerate a center-crop. The unbranded set is untouched (still square studio shots) since only `"branded"` mode's photos changed.

## Routes

| Route | File | Notes |
|-------|------|-------|
| `/tirzepatide` | `src/routes/tirzepatide.tsx` | Compounded tirzepatide landing page |
| `/semaglutide` | `src/routes/semaglutide.tsx` | Compounded semaglutide landing page |
| `/glp-1` | `src/routes/glp-1.tsx` | National cash-pay GLP-1 category page (not in primary nav/footer). Shares `Glp1LandingPage` with city landers. |
| `/glp-1-houston` | `src/routes/glp-1-houston.tsx` | Houston cash-pay GLP-1 ads landing. Future cities: `/glp-1-{city}` under the same template - see "City GLP-1 pages" below |
| `/weight-loss` | `src/routes/weight-loss.tsx` | Overview page - linked from footer, see below |
| `/oral-finasteride` | `src/routes/oral-finasteride.tsx` | **Money page** (2026-09-03) - the FDA-approved generic finasteride, not compounded (see product table above) |
| `/oral-minoxidil-men` | `src/routes/oral-minoxidil-men.tsx` | **Money page** (2026-09-09) - the FDA-approved generic oral minoxidil, not compounded, used off-label for hair loss; single-sex page (see "Single-sex product pages" above) |
| `/oral-minoxidil-women` | `src/routes/oral-minoxidil-women.tsx` | **Money page** (2026-09-09) - same product as above, single-sex page |
| `/hair-loss-spray-men` | `src/routes/hair-loss-spray-men.tsx` | **Money page** (2026-09-09) - compounded topical finasteride spray, men only |
| `/hair-loss-spray-women` | `src/routes/hair-loss-spray-women.tsx` | **Money page** (2026-09-09) - compounded topical biotin/melatonin spray, women only |
| `/tadalafil` | `src/routes/tadalafil.tsx` | **Money page** (2026-09-03) - the FDA-approved generic tadalafil (generic Cialis®), not compounded (see product table above) |
| `/sildenafil` | `src/routes/sildenafil.tsx` | **Money page** (2026-09-03) - the FDA-approved generic sildenafil (generic Viagra®), not compounded (see product table above) |
| `/ed-mints` | `src/routes/ed-mints.tsx` | **Money page** - 2 dissolve-under-the-tongue combo products, each its own pricing card, disclaimer set, and CTA/Bask intake (2026-09-03) |
| `/nad-plus` | `src/routes/nad-plus.tsx` | **Money page** (relaunched 2026-09-16) - compounded NAD+ injections, real vial photography, interactive 3-month/1-month pricing picker |
| `/sermorelin` | `src/routes/sermorelin.tsx` | **Money page** (relaunched 2026-09-17) - compounded sermorelin injections, real vial photography |
| `/ed` | `src/routes/ed.tsx` | Overview page (restructured 2026-09-03, was a money page) - tadalafil vs. sildenafil comparison, links onward to `/tadalafil` and `/sildenafil` |
| `/sexual-health` | `src/routes/sexual-health.tsx` | Category hub linking to `/tadalafil`, `/sildenafil`, `/ed-mints` (TRT paused, see above) - linked from footer, see "Category hub pages" above |
| `/hair-loss` | `src/routes/hair-loss.tsx` | Category hub linking to `/oral-finasteride` (designed to grow) - linked from footer. Merged 2026-09-04 from the former `/hair` (this hub) and `/hairloss` (a separate overview page); see "Category hub pages" above |
| `/trt` | `src/routes/trt.tsx` | **Paused** - redirect-to-home stub, see above |
| `/wellness` | `src/routes/wellness.tsx` | **Paused** - redirect-to-home stub, see above |

Shared building blocks (pricing card, comparison table, FAQ accordion, breadcrumb) live in `src/components/site/TreatmentPageBlocks.tsx`. Copy/data (steps, FAQ items, eligibility bullets) stays local to each route file - do not extract it into a shared data file, each page is meant to have genuinely distinct copy.

`faqPageJsonLd()` and `breadcrumbJsonLd()` (in `src/lib/seo.ts`) generate JSON-LD from the same arrays that render the visible FAQ/breadcrumb - keep them in sync if you edit either.

## First-visit splash and LCP prefetch

Google → Beema document loads show `SiteBootLoader` (hex draw + stacked Beema / Health wordmark) until the document, fonts, and **this URL's LCP photo** are ready. In-app client navigations do not remount it. Bask already shows a loader on the hop to intake.

`bootImagePreloadLinks(path)` is spread into each lander's `head()` links. `criticalBootImageUrls` in `src/lib/boot-assets.ts` must stay LCP-only - extra preloads delay Google LCP:

| URL | Waits / preloads (high) | Then warms (low) |
|-----|-------------------------|------------------|
| `/semaglutide`, `/tirzepatide` | That page's branded vial (hero `<img>` also has `fetchPriority="high"`) | The other vial |
| `/ed-mints` | The ODT product photo (hero `<img>` also has `fetchPriority="high"`, 2026-09-03) | None |
| `/tadalafil`, `/sildenafil`, `/oral-finasteride` | That page's bottle photo (hero `<img>` also has `fetchPriority="high"`) | None |
| `/hair-loss-spray-men`, `/hair-loss-spray-women` | That page's bottle photo (hero `<img>` also has `fetchPriority="high"`, 2026-09-09) | None |
| `/oral-minoxidil-men`, `/oral-minoxidil-women` | The shared minoxidil bottle photo (hero `<img>` also has `fetchPriority="high"`, 2026-09-09) | None |
| `/nad-plus` | The NAD+ vial photo (hero `<img>` also has `fetchPriority="high"`, 2026-09-16) | None |
| `/sermorelin` | The sermorelin vial photo (hero `<img>` also has `fetchPriority="high"`, 2026-09-17) | None |
| `/glp-1`, `/glp-1-houston` | None (headline is LCP) | LegitScript seal only. Do not fetch unused vial PNGs. |
| `/weight-loss` | None | Both vials for `TreatmentLineup` |

Kill switch: `SITE_BOOT_LOADER_ENABLED`. Homepage hero prefetch: `docs/features/homepage.md`. Shared lander table: `docs/features/landing-pages.md`.

## `/weight-loss` is a linked overview page

Previously `/weight-loss` was kept as a deliberate orphan (no internal links anywhere on the site) while still being sitemapped at priority 0.9, on the reasoning that it would be retired once the tirzepatide/semaglutide pages fully replaced it. That left it as a genuine orphan page at a high sitemap priority - a real inconsistency for an SEO-focused site, since Google's crawl/ranking signals come from internal link equity, not sitemap presence alone.

As of the 2026-07-30 SEO pass, that decision was reversed: `/weight-loss` is real, unique, non-duplicate content (its own hero, benefits, "who this is for" section, and CTA - not a stub) that targets broader, higher-volume, non-brand search intent than the drug pages can. It is now:

- Linked from the footer Care column (`COLUMNS[0].links` in `SiteFooter.tsx`), not from the header's Weight Loss dropdown
- Linked contextually from `/semaglutide` and `/tirzepatide` ("Learn about our weight-loss program")
- Down-ranked in `public/sitemap.xml` to priority `0.7` (below the two drug pages at `0.9`, which remain the primary conversion targets, and `/how-it-works` at `0.8`)

If a future change needs to re-orphan or retire this page, that's a deliberate call to make with the team, not a default to restore - update this doc and the `COLUMNS` comments together with the code.

## Nav: category dropdowns (Weight Loss / Sexual Health / Hair Loss)

Reorganized 2026-08-27, Good Life Meds style, replacing the previous same-day flat "Treatments" dropdown (one list of all 7 medications). `SiteHeader.tsx` renders one medication dropdown per **live** category, each scoped to that category's *specific medication pages only* - the category's hub page stays out of the header (see below). Wellness is currently paused entirely (see below) so it has no dropdown right now.

| Dropdown | Const | Shape | Items |
|---|---|---|---|
| Weight Loss | `WEIGHT_LOSS_ITEMS` | flat `NavItem[]` | Compounded Tirzepatide, Compounded Semaglutide |
| Sexual Health | `SEXUAL_HEALTH_SECTIONS` | sectioned (2026-08-29) | **For Men**: Tadalafil (→ `/tadalafil`), Sildenafil (→ `/sildenafil`), ED Mints (→ `/ed-mints`) - all 3 link straight to their money page, not through `/ed` (2026-09-03, see "Money-page architecture" above). No "For Women" section yet - see below |
| Hair Loss | `HAIR_SECTIONS` | sectioned (2026-08-28) | **For Men**: Oral Minoxidil, Oral Finasteride, Hair Loss Spray (2026-09-09, each → its own money page, not `/hair-loss`). **For Women**: Oral Minoxidil, Hair Loss Spray (2026-09-09) - "Oral Hair Compound" stays out, see above |
| Wellness | `WELLNESS_ITEMS` | flat `NavItem[]`, 2 items (grew from 1 on 2026-09-17) | NAD+ (→ `/nad-plus`, 2026-09-16), Sermorelin (→ `/sermorelin`, 2026-09-17) |

**Sectioned dropdowns** (`NavSection = { heading, items }`, an optional `sections` prop alongside the flat `items` prop on both `DesktopNavDropdown` and `MobileNavDropdown`) render a For Men / For Women two-column grid instead of a flat list - `DesktopNavDropdown` collapses to one column when only one section has items (Sexual Health today, and Hair Loss too as of 2026-09-03 now that its "For Women" section is fully commented out). Add `sections` to a dropdown only when the category is genuinely split by sex; Weight Loss stays a flat list.

**Do not add an empty/coming-soon "For Women" section** to Sexual Health before a women's product actually ships - matches the sitewide "no coming-soon placeholders in live nav" rule (see the Resources/More section below). Add the second section (same shape `HAIR_SECTIONS` had before 2026-09-03) the day a women's sexual-health product goes live, not before.

**Hair Loss grew from 1 to 5 live money pages on 2026-09-09** (Oral Finasteride, Oral Minoxidil (Men), Oral Minoxidil (Women), Hair Loss Spray (Men), Hair Loss Spray (Women)) - see the product table and "Oral Minoxidil and both sexes' Hair Loss Spray launched" note above. `GetStartedModal.tsx`'s Hair category keeps its `sexGate` Male/Female step (Matt's call, 2026-09-09, over dropping it for a flat list like Sexual Health) - through 2026-09-09 it was a "not yet, but soon" placeholder that auto-resolved Male straight to the single live product and dead-ended Female; now that both sexes have live products, selecting Male or Female instead filters the category's `products` down to that sex's subset (via each product's `sex` tag). Every Hair product carries a `sex` tag today, including Oral Minoxidil - it gets a male-tagged and a female-tagged entry (both resolving to the same `ORAL_MINOXIDIL_INTAKE_URL`, matching its 2 single-sex pages) rather than one untagged entry shown to both, so this picker never implies one sex's product to the other - see "Single-sex product pages" above. The nav dropdown's label reads "Hair Loss" (renamed 2026-09-04 from "Hair", alongside the `/hair`+`/hairloss` → `/hair-loss` route merge above); the modal's category label and the homepage's "More than weight loss" card were renamed to match at the same time.

**`GetStartedModal.tsx` picked up a 4th category, Wellness, on 2026-09-16** alongside the header's new dropdown - at launch a single NAD+ product, so `autoAdvanceCtaId()`'s existing single-product shortcut resolved it straight to `nad_hero` with no step 2, the same shortcut Weight Loss's `directCtaId` and Hair's original single-product state relied on. The step-1 category grid went from `sm:grid-cols-3` to a 2x2 `grid-cols-2 sm:grid-cols-4` to fit the 4th tile. **Sermorelin joined Wellness's `products` array on 2026-09-17**, which removed the single-product shortcut - Wellness now shows step 2 (NAD+ vs. Sermorelin) the same way Sexual Health does, with no `directCtaId`. The homepage's "More than weight loss" section (`WellnessLineupSection.tsx`) was **not** updated - it stayed a 2-card Sexual Health/Hair Loss grid, since it surfaces category hubs (`/sexual-health`, `/hair-loss`) and neither NAD+ nor Sermorelin has a relaunched hub to link to (see "Category hub pages" above - `/wellness` stays paused).

Add a new medication page to the matching category's items/section array and to that category's hub-page `LINEUP` array, linking directly to the new page's own route (not the footer Care column - see "Money-page architecture" above), rather than adding a new top-level nav entry or reviving the flat list. Wellness used the header's last open slot for its 2026-09-16 relaunch - the header is now at 5 dropdowns (Weight Loss/Sexual Health/Hair Loss/Wellness/More) and a genuinely new category beyond these is a deliberate call to make with the team, not a default.

Every category's hub page (`/weight-loss`, `/sexual-health`, `/hair-loss`) stays **out of the header** - linked from the site footer Care column and from in-page copy only, matching the pre-existing `/weight-loss` decision. `/how-it-works` is in the **More** header dropdown and footer Resources column (care-process overview, not a medication page). On `/tirzepatide`, `/semaglutide`, `/glp-1`, and `/glp-1-houston`, the hero "How it works" / "How care works" button is an on-page jump (`hash="how-it-works"`) to `<HowItWorksSteps />` on that same page, not a navigation to `/how-it-works/`.

Hover/tap behavior is the same shared pair as the other menus:

- **Desktop** - `DesktopNav` / `DesktopNavDropdown`. Click a trigger to open, click it again (or outside / Escape) to close, hover another trigger to switch. The open panel fades and slides in (opacity + translate only - no Radix DropdownMenu; that Popper flicker is why these stay in-flow). Only one panel is open at a time; sibling labels dim while a menu is open.
- **Mobile** - `MobileNavDropdown`, a tap-to-expand disclosure inside the mobile menu (see `docs/features/homepage.md` for the `CircleRevealMenu` shell it lives in). Local `expanded` state collapses it back down every time the mobile menu reopens; the reveal/collapse is animated (Motion `AnimatePresence` + height/opacity), matching the site's other transitions.

Keep `/glp-1` in the footer Care column, not in the header - it's a national cash-pay category page distinct from the four medication-category hubs above. Do **not** add city/geo GLP-1 ads landers (`/glp-1-houston`, future `/glp-1-{city}`) to primary nav or footer - those stay ad/SEO entry points.

## Nav: "More" dropdown (merged from "Resources" + "About" 2026-08-27)

`SiteHeader.tsx` renders **More** - the free content library plus the care-process overview plus the company cluster, all in one dropdown (`MORE_ITEMS`). It uses the same `DesktopNavDropdown` / `MobileNavDropdown` pair as the category dropdowns. Keep the label literal ("More") so it does not compete with Hive (the patient portal at `hive.beemahealth.com`) and does not imply it's another product category.

This was two separate dropdowns (Resources: how it works, recipes, learn; About: about us, FAQ, contact us) until the 4 new category dropdowns (Weight Loss/Sexual Health/Hair Loss/Wellness) pushed the header to 6 total - merging these two back down to keep the 4 treatment categories as the header's "main groups" without adding more utility dropdowns alongside them. Nothing was removed: every item is still one click away, just under one label instead of two. The **footer keeps its separate Resources and Trust columns** unchanged - this merge is a header-only consolidation.

Live items in `MORE_ITEMS` today: `/how-it-works/`, `/recipes/`, `/learn/`, `/about/`, `/faq/`, `/contact/`. Add workout videos, cooking videos, and other no-account resources here (and in the footer Resources column) when they ship - do not add coming-soon placeholders to the live nav. Add Safety or other trust pages here only if they need a persistent header slot; today Safety stays in the footer Trust column plus in-page treatment links. The footer Trust column also has an external "Leave a Google review" link (`GOOGLE_REVIEW_URL` in `src/lib/google-business.ts`) - the write-review URL, not the listing URL used in Organization `sameAs`.

`/the-comb/` is a retired branded overview that redirects home. Do not relink it.

The homepage `FreeResourcesSection` is the in-page spotlight for the same library (headline: "Free resources to help you get started").

## City GLP-1 pages

Google Ads can expand beyond Houston. Live shape:

| URL | Role |
|-----|------|
| `/glp-1` | National/category hub (`<Glp1LandingPage market="national" />`) |
| `/glp-1-houston` | Houston ads LP (`<Glp1LandingPage market="houston" />`) |
| `/glp-1-austin`, … | Future city LPs: add a market to `src/lib/glp-1-landing.ts` and a thin route file |

Keep city pages out of the category dropdowns so nav does not grow with every market. Ads land on the city URL. The national hub is linked from the footer Care column (`GLP-1 Care` → `/glp-1/`); city landers stay out of nav/footer. Shared sections live in `Glp1LandingPage`; only market copy, canonicals, and JSON-LD differ. Each page self-canonicalizes - never canonicalize a city page to `/glp-1/`.

## Medication cards

`TreatmentShowcase.tsx` (homepage) and `TreatmentLineup.tsx` (`/weight-loss` page) both surface GLP-1 medication only - not updated for the 5 new product lines or 3 new hubs, which is deliberate for now: the homepage stays focused on the flagship GLP-1 offering, and each new hub's own `SimpleCategoryLineup` (see "Category hub pages" above) is the equivalent for its category. `TreatmentLineup.tsx` still renders one full-card `<Link>` per medication (not nested interactive elements) pointing at that medication's own page (`/tirzepatide/`, `/semaglutide/`) - never at `/weight-loss/` itself.

**`TreatmentShowcase.tsx` was redesigned 2026-09-13 (per Matt)** from that same two-full-card-links layout into a single tabbed panel: a `role="tablist"` pair of buttons (Tirzepatide first/default, then Semaglutide - `useState` holds the active id, no URL/query param) swaps an `AnimatePresence`-crossfaded panel below showing that medication's full uncropped bottle photo (`object-contain`, not cropped/cover) on one side and its real interactive pricing selector - `CompoundedPriceLockup` at its default `interactive={true}`, the same component the medication's own page uses, not the compact `interactive={false}` teaser the old cards used - on the other, plus an explicit `Explore {name}` `<Button>`/`<Link>` (not a page-wide anchor, since the pricing selector's own plan tabs are nested interactive elements now). This was a direct fix for the old cards' short, wide `object-cover` crop, which zoomed so far into the vial photo that the drug name printed on the label was cropped out of frame - see "Branded vial photos replaced 2026-09-13" above for the photo swap that triggered this. CTA copy is still `Explore {treatment.name}` (e.g. "Explore Compounded Tirzepatide"), and the panel still links to `/glp-1/` ("Explore GLP-1 care") above the tabs. These two files still duplicate their own local `TREATMENTS` array (pre-existing pattern) - add a new GLP-1 medication to both when it gets its own page. Whether the homepage should surface the other 3 categories too is an open homepage-design question, not answered by this change.

## Structured data

Every treatment-adjacent page carries page-specific JSON-LD alongside the sitewide `MedicalOrganization`/`WebSite` schema (`ORGANIZATION_JSONLD`/`WEBSITE_JSONLD` in `src/lib/seo.ts`, rendered in the root layout):

- `/tirzepatide`, `/semaglutide`, `/oral-finasteride`, `/oral-minoxidil-men`, `/oral-minoxidil-women`, `/hair-loss-spray-men`, `/hair-loss-spray-women`, `/tadalafil`, `/sildenafil`, `/ed-mints`, `/nad-plus`, `/sermorelin`, `/ed` — `BreadcrumbList` + `FAQPage` + `serviceJsonLd()` (each has a visible FAQ accordion that matches its JSON-LD - true for the overview page `/ed` too, not just the money pages). `/trt` carries the same shape while paused - its JSON-LD is dormant along with the rest of the page (redirect stub renders nothing); `/nad-plus` and `/sermorelin` relaunched 2026-09-16/2026-09-17 respectively so their JSON-LD is live again. `/hairloss` carried this shape too before being merged into `/hair-loss` (below) on 2026-09-04
- `/glp-1` — `BreadcrumbList` + `FAQPage` + `serviceJsonLd()` (national cash-pay GLP-1 category page; visible FAQ matches JSON-LD; canonical `https://beemahealth.com/glp-1/`)
- `/glp-1-houston` — `BreadcrumbList` + `FAQPage` + `serviceJsonLd()` (Houston cash-pay GLP-1 ads + local SEO page; visible FAQ matches JSON-LD; canonical `https://beemahealth.com/glp-1-houston/`)
- `/weight-loss`, `/sexual-health`, `/hair-loss` — `BreadcrumbList` + `serviceJsonLd()` (each a `Service` describing the category program itself; no visible FAQ content on any hub, so no `FAQPage`). `/wellness` carried the same shape before being paused
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
| `src/routes/glp-1.tsx` | National cash-pay GLP-1 category page |
| `src/routes/glp-1-houston.tsx` | Houston cash-pay GLP-1 ads + local SEO page |
| `src/components/site/Glp1LandingPage.tsx` | Shared GLP-1 landing layout (`market="national" \| "houston"`) |
| `src/lib/glp-1-landing.ts` | Market copy, canonicals, JSON-LD head for both GLP-1 routes |
| `src/lib/boot-assets.ts` | LCP vs warmup photo lists for the first-visit splash |
| `src/components/brand/SiteBootLoader.tsx` | Branded overlay (root shell, first document load) |
| `src/components/site/TreatmentPageBlocks.tsx` | Shared breadcrumb, pricing card, comparison table, FAQ accordion |
| `src/lib/medication-pricing.ts` | Single source of truth for GLP-1 pricing — never hardcode `$` amounts elsewhere |
| `src/lib/simple-treatment-pricing.ts` | Single source of truth for the non-GLP-1 products' pricing (Monthly/Quarterly, no promo code). `NAD_PRICING` and `SERMORELIN_PRICING` are live again (relaunched 2026-09-16 and 2026-09-17 respectively); `TRT_PRICING` stays defined but unused while paused; `ED_COMBO_PRICING` stays defined but superseded by `ED_MINTS_RDT_PRICING`; `HAIRLOSS_WOMENS_COMPOUND_PRICING` stays defined but unused, not part of the 2026-09-09 launch |
| `src/routes/oral-finasteride.tsx`, `oral-minoxidil-men.tsx`, `oral-minoxidil-women.tsx`, `hair-loss-spray-men.tsx`, `hair-loss-spray-women.tsx`, `tadalafil.tsx`, `sildenafil.tsx`, `ed-mints.tsx` | The 8 live non-GLP-1 **money pages** (finasteride/tadalafil/sildenafil/ed-mints 2026-09-03; oral minoxidil (2 pages) + hair loss spray (2 pages) 2026-09-09) |
| `src/components/site/GetStartedModal.tsx` | Homepage "Get Started" category → product picker; Hair category keeps its Male/Female `sexGate` step, which now filters into a 3-item (male) or 2-item (female) product list instead of a single auto-resolve/dead-end (2026-09-09); 4th category Wellness added 2026-09-16 (single-product NAD+ auto-advance at launch, now a 2-product step-2 picker since Sermorelin joined 2026-09-17) |
| `src/routes/ed.tsx` | The 1 live non-GLP-1 **overview page** (restructured 2026-09-03 from a money page - see "Money-page architecture" above) |
| `src/routes/trt.tsx`, `wellness.tsx` | Paused - redirect-to-home stubs, full content in git history |
| `src/routes/nad-plus.tsx` | Relaunched 2026-09-16 - see "Money page" row above |
| `src/routes/sermorelin.tsx` | Relaunched 2026-09-17 - see "Money page" row above |
| `src/routes/sexual-health.tsx`, `hair-loss.tsx` | The 2 live category hub pages (`/weight-loss` is the pre-existing 3rd). `hair-loss.tsx` merged the former `hair.tsx` and `hairloss.tsx` on 2026-09-04 - see "Category hub pages" above |
| `src/lib/cta-ids.ts` | `CTA_IDS`, `resolveCta()` — the CTA switchboard |
| `src/lib/seo.ts` | `faqPageJsonLd()`, `breadcrumbJsonLd()`, `serviceJsonLd()`, `medicalWebPageJsonLd()`, `canonicalUrl()` |
| `src/components/site/SiteHeader.tsx`, `SiteFooter.tsx` | Weight Loss / Sexual Health / Hair Loss / Wellness / More dropdowns (`DesktopNavDropdown` / `MobileNavDropdown`, `sections` prop for For Men/Women); footer Care + Resources + Trust columns (Trust includes the Google review ask) |
| `src/lib/google-business.ts` | GBP listing URL (`sameAs`) vs write-review URL (footer + `/contact/`) |
| `src/lib/marketing-copy.ts` | `FIRST_MONTH_PROMO_LINE` — the one-time, 3-month-only promo code promoted alongside pricing |
| `src/components/home/TreatmentShowcase.tsx`, `src/components/site/TreatmentLineup.tsx` | Medication cards (home / `/weight-loss`) |
| `public/sitemap.xml`, `public/llms.txt`, `src/lib/__tests__/sitemap.test.ts` | Keep in sync when adding a page |
