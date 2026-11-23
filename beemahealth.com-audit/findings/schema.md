# Schema.org / JSON-LD Audit - beemahealth.com

**Scope note:** This pass combined a live fetch of the homepage (`render_page.py --json-ld-output`) with direct source-code review of the schema-generating functions in `src/lib/seo.ts` and `src/lib/recipe-seo.ts`, and a repo-wide grep of every call site for those functions. Investigation was stopped early per the coordinator; several planned live-page fetches (`/semaglutide/`, `/tirzepatide/`, `/glp-1/`, `/glp-1-houston/`, `/faq/`, individual `/learn/weight-loss/` articles, recipe pages, legal pages) were **not** executed this session. Findings below are marked either "live-verified" (homepage) or "source-verified" (inferred from the shared TypeScript schema builders and their confirmed call sites - high confidence for a statically prerendered site, but not a substitute for a live syntax check).

---

## Detection results

### Homepage (`/`) - live-verified via `render_page.py --json-ld-output`

Two JSON-LD blocks, both syntactically valid (parser reports `valid: true` for both, `block_count: 2`, `processed_count: 2`, not truncated):

**Block 1 - `MedicalOrganization`**
```json
{
  "@context": "https://schema.org",
  "@type": "MedicalOrganization",
  "@id": "https://beemahealth.com/#organization",
  "name": "Beema Health",
  "url": "https://beemahealth.com/",
  "logo": "https://beemahealth.com/beemahealth-logo.png",
  "description": "Beema Health is a US telehealth medical weight-loss service. ...",
  "areaServed": { "@type": "Country", "name": "United States" },
  "sameAs": [
    "https://g.page/r/CUEUJWP1F6UjEBI",
    "https://www.facebook.com/beemahealthofficial",
    "https://www.instagram.com/beemahealth",
    "https://www.tiktok.com/@beema.health",
    "https://www.reddit.com/r/beemahealth/",
    "https://x.com/beemahealth"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "support@beemahealth.com",
    "telephone": "+13033514505",
    "url": "https://beemahealth.com/contact/",
    "contactType": "Customer Support"
  }
}
```

**Block 2 - `WebSite`**
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://beemahealth.com/#website",
  "url": "https://beemahealth.com/",
  "name": "Beema Health",
  "publisher": { "@id": "https://beemahealth.com/#organization" }
}
```

### Source-verified schema architecture (`src/lib/seo.ts`, `src/lib/recipe-seo.ts`)

Shared builder functions and their confirmed call sites (via repo grep):

| Function | Emits | Called by |
|---|---|---|
| `ORGANIZATION_JSONLD` / `WEBSITE_JSONLD` | `MedicalOrganization`, `WebSite` | Root layout (site-wide, homepage-confirmed) |
| `serviceJsonLd()` | `Service` (+ `Offer`) | `semaglutide.tsx`, `tirzepatide.tsx`, `weight-loss.tsx` |
| `medicalWebPageJsonLd()` | `MedicalWebPage` | `learn.semaglutide-vs-tirzepatide.tsx`, `learn.index.tsx`, `safety.tsx`, `learn.resistance-training.tsx`, `learn.initial-research.tsx`, `how-it-works.tsx`, `about.tsx`, `learn.rest-intervals.tsx`, `learn/$vertical.index.tsx` |
| `faqPageJsonLd()` | `FAQPage` | `learn.semaglutide-vs-tirzepatide.tsx`, `semaglutide.tsx`, `tirzepatide.tsx`, `learn.resistance-training.tsx`, `learn.initial-research.tsx`, `learn.rest-intervals.tsx`, `faq.tsx` |
| `breadcrumbJsonLd()` | `BreadcrumbList` | `learn.semaglutide-vs-tirzepatide.tsx`, `semaglutide.tsx`, `safety.tsx`, `weight-loss.tsx`, `tirzepatide.tsx`, `learn.resistance-training.tsx`, `learn.initial-research.tsx`, `learn.rest-intervals.tsx`, `faq.tsx`, `recipes/$slug.tsx`, `how-it-works.tsx`, `about.tsx`, `recipes/index.tsx`, `components/site/TreatmentPageBlocks.tsx` |
| `recipeJsonLd()` / `recipeCollectionJsonLd()` | `Recipe`, `ItemList` | `recipes/$slug.tsx`, `recipes/index.tsx` |
| `CLINICAL_REVIEWER_JSONLD` (`reviewedBy`) | attached conditionally inside `serviceJsonLd()`/`medicalWebPageJsonLd()` via a `reviewedByClinicalLead` flag | opt-in per call site - **actual per-page flag values not inspected this session** |

No other file in `src/` defines an independent `@context` block - `seo.ts` and `recipe-seo.ts` are the sole schema sources, so this call-site map should be a reliable proxy for what each route renders on a statically prerendered site.

---

## Validation results

| Check | Result |
|---|---|
| `@context` is `https://schema.org` (not http) | Pass - confirmed in both source builders and live homepage output |
| `@type` values are valid, non-deprecated | Pass - `MedicalOrganization`, `WebSite`, `Service`, `MedicalWebPage`, `FAQPage`, `BreadcrumbList`, `Recipe`, `ItemList`. None are deprecated types. `HowToStep` appears only nested inside `Recipe.recipeInstructions` (the standard Google-supported pattern for recipe steps), not as a standalone `HowTo` rich-result type - correctly not the deprecated one. |
| Absolute URLs | Pass - `canonicalUrl()`/`absoluteUrl()` helpers used throughout; homepage URLs are absolute with trailing slashes matching the site's canonical convention |
| ISO 8601 dates | Pass where dates are emitted - `recipeJsonLd()` uses `RECIPE_PUBLISHED_DATE`/`RECIPE_MODIFIED_DATE` constants and `medicalWebPageJsonLd()`/`serviceJsonLd()` accept a `dateModified` string documented as `YYYY-MM-DD` |
| No placeholder text | Pass on homepage (live-verified); no `[Business Name]`-style placeholders found in source builders |
| No duplicate/conflicting schema across page types | Pass (source-verified) - `MedicalOrganization`/`WebSite` are declared once (root layout) and referenced elsewhere only via `@id` (`publisher: { "@id": ".../#organization" }`, `provider: { "@id": ... }`). Each page type calls at most one "primary" entity builder (`Service` on treatment pages, `MedicalWebPage` on informational pages, `Recipe` on recipe pages) plus optional `FAQPage`/`BreadcrumbList` - no evidence of two competing primary types on the same route. |
| `E.164` phone format | Pass - `+13033514505` |

---

## Findings

### 1. [Info] Homepage `MedicalOrganization` + `WebSite` schema is well-built - no action needed
**Evidence:** Live-verified JSON-LD above. Correctly uses `MedicalOrganization` (not `LocalBusiness`) given the company has no physical location, appropriately omits `address`, uses `@id` cross-referencing between `WebSite.publisher` and the organization node, and keeps `sameAs` limited to real, live social profiles with no placeholders.
**Recommendation:** None required. Optional low-value enhancement: if the site never ships an internal search feature, no `WebSite.potentialAction.SearchAction` is needed - do not add one speculatively.

### 2. [Info] Recipe schema's omission of `nutrition`/`aggregateRating`/`reviewedBy` is confirmed current and test-guarded - not a gap
**Evidence:** `src/lib/recipe-seo.ts` `recipeJsonLd()` does not set `nutrition`, `aggregateRating`, `review`, or `reviewedBy`. `src/lib/__tests__/recipes.test.ts` lines 572-624 (`"uses ItemList and Recipe schema without unsupported clinical or nutrition claims"`) explicitly asserts `expect(schema).not.toHaveProperty("nutrition")`, `.not.toHaveProperty("aggregateRating")`, `.not.toHaveProperty("review")`, `.not.toHaveProperty("reviewedBy")`, and further asserts the route source never contains `MedicalWebPage`, `reviewedBy`, `aggregateRating`, or a literal `nutrition: {` block.
**Recommendation:** Do not add these properties. This matches the base-context guardrail; the test still exists and still enforces it as of this audit.

### 3. [Info] `FAQPage` schema is present on multiple pages - no Google SERP benefit going forward, downgrade priority
**Evidence:** `faqPageJsonLd()` is called from `semaglutide.tsx`, `tirzepatide.tsx`, `faq.tsx`, `learn.semaglutide-vs-tirzepatide.tsx`, `learn.resistance-training.tsx`, and `learn.initial-research.tsx`. Google retired FAQ rich results for all sites (May 7, 2026); this markup no longer produces a SERP feature.
**Recommendation:** Leave existing `FAQPage` blocks in place (harmless, syntactically correct, possible unconfirmed AI/GEO signal) but treat as Info, not a growth lever. Do not invest further effort adding `FAQPage` to additional pages on the expectation of a Google rich result. If any of these pages are genuine user-submitted Q&A rather than editorial FAQ content, `QAPage` would be the correct type instead - not evaluated this session which (if any) fit that description.

### 4. [Medium - needs live verification] `/glp-1/` and `/glp-1-houston/` do not appear in any schema builder's call-site list
**Evidence:** Repo-wide grep for callers of `serviceJsonLd()`, `medicalWebPageJsonLd()`, `faqPageJsonLd()`, and `breadcrumbJsonLd()` returned `src/routes/glp-1.tsx` and `src/routes/glp-1-houston.tsx` in **none** of the four lists, and `seo.ts`/`recipe-seo.ts` are the only files in the repo that define a `@context` block. This suggests these two pages may currently ship with zero JSON-LD, unlike their sibling treatment pages `/semaglutide/` and `/tirzepatide/` (which get `Service` + `FAQPage` + `BreadcrumbList`). It is possible `glp-1.tsx`/`glp-1-houston.tsx` render `TreatmentPageBlocks` (a confirmed `breadcrumbJsonLd()` caller) and inherit a `BreadcrumbList` that way - this was not confirmed.
**Recommendation:** Live-verify with `render_page.py --json-ld-output` before treating this as confirmed. If no schema is present, add `Service` (matching the `serviceJsonLd()` pattern already used on `/semaglutide/`/`/tirzepatide/`) plus `BreadcrumbList` to both pages for architectural consistency with the rest of the treatment-page cluster.

### 5. [Medium/High - needs live verification] Individual `/learn/weight-loss/<slug>/` articles are not confirmed callers of any schema builder
**Evidence:** `src/routes/learn/$vertical.index.tsx` (the hub, e.g. `/learn/weight-loss/`) is a confirmed `medicalWebPageJsonLd()` caller, but `src/routes/learn/$vertical.$slug.tsx` - the template that renders every individual guide (e.g. `/learn/weight-loss/glp-1-nausea/`, and roughly 60-70 other slugs per `url-list.txt`) - did not appear in the caller list for `medicalWebPageJsonLd()`, `breadcrumbJsonLd()`, `faqPageJsonLd()`, or `serviceJsonLd()`. This is the single largest content cluster on the site (the `/learn/weight-loss/` directory), so if confirmed, it represents the highest-leverage schema gap: no `Article`/`MedicalWebPage` typing, no `BreadcrumbList`, and no visible mechanism for `reviewedBy` on per-article pages, even though `src/lib/seo.ts` documents a `reviewedByClinicalLead` opt-in specifically intended for "clinical/medical guidance" content.
**Recommendation:** This must be live-verified before acting on it (`render_page.py --json-ld-output` against `/learn/weight-loss/glp-1-nausea/` or similar) - it is plausible `$vertical.$slug.tsx` builds its own inline JSON-LD object rather than calling the shared `seo.ts` helpers, which would not show up in this grep. If verification confirms no schema, recommend: (a) `MedicalWebPage` (or `Article`/`BlogPosting` if editorial rather than clinical framing is more accurate) via `medicalWebPageJsonLd()` for consistency with the rest of the informational-page pattern, (b) `BreadcrumbList` matching the visible Learn > Weight Loss > [Article] trail, and (c) apply the existing `reviewedByClinicalLead` pattern only on articles that have a named reviewer disclosed on-page, per the compliance-guarded pattern already established elsewhere in the codebase - do not add `reviewedBy` to articles without a genuine named reviewer.

### 6. [Info] Prescription-service pricing correctly modeled as `Service` + `Offer`, not `Product`/`Drug`
**Evidence:** `serviceJsonLd()` in `src/lib/seo.ts` (lines 196-203 comment) explicitly documents that pricing is modeled as `Service.offers.Offer` rather than a shoppable `Product`, because Google's Merchant/Product structured-data policies prohibit shoppable Product markup for prescription medications, and intake does not guarantee a prescription.
**Recommendation:** None - this is the correct approach and should not be changed to `Product`/`AggregateOffer` even if asked to "improve" rich-result eligibility; doing so would risk a Merchant Center-style policy violation for prescription-gated goods.

### 7. [Not checked] Legal pages (`/legal/privacy/`, `/legal/terms/`, `/legal/refund/`, `/legal/shipping/`, `/legal/physician-code-of-conduct/`, `/legal/hipaa/`, `/legal/telehealth-consent/`)
**Evidence:** None of these routes appeared in any of the four schema-builder caller lists gathered this session, suggesting no JSON-LD on legal pages, but the routes themselves were not individually grepped or live-fetched.
**Recommendation:** Low priority. A `WebPage` block (name, url, isPartOf → `#website`, dateModified) would be a minor completeness improvement but has no material SEO/rich-result upside for policy pages. Not worth prioritizing.

### 8. [Not checked] `reviewedByClinicalLead` actual usage per call site
**Evidence:** The mechanism exists (`serviceJsonLd()`/`medicalWebPageJsonLd()` both accept the flag, gated to a real NPI-sourced `Physician` object per `CLINICAL_REVIEWER_JSONLD`), and confirmed callers include `safety.tsx`, `semaglutide.tsx`, `tirzepatide.tsx`, and several `learn.*` pages - but which of those calls actually pass `reviewedByClinicalLead: true` vs. `false`/omitted was not inspected this session.
**Recommendation:** Spot-check a follow-up pass to confirm the flag is only `true` on pages that visibly disclose Dr. Arora (or equivalent named reviewer) on-page, consistent with the compliance-guarded pattern already confirmed for recipes (Finding 2). This is a compliance-adjacent check, not just an SEO one - treat any mismatch as higher severity than a typical schema gap.

### 9. [Not checked - live syntax verification] `/semaglutide/`, `/tirzepatide/`, `/glp-1/`, `/glp-1-houston/`, `/faq/`, `/learn/weight-loss/` article pages, recipe detail pages, and legal pages
**Evidence:** Only the homepage was fetched live this session (`render_page.py --json-ld-output`). All other pages were assessed by source-code inference only, which is high-confidence for a statically prerendered React/TanStack site but does not catch build-time serialization bugs (e.g. `JSON.stringify` edge cases, trailing commas from manual template concatenation, or route-specific data not visible in the shared builders).
**Recommendation:** Before shipping any fix, live-fetch the specific page(s) affected with `claude-seo run render_page.py <url> --mode never --json-ld-output <file>` to confirm the actual rendered JSON-LD matches the source-code inference above, particularly for Findings 4 and 5.

---

## Summary of severities

| Severity | Count | Items |
|---|---|---|
| Critical | 0 | - |
| High | 0 | - |
| Medium | 2 | Findings 4, 5 (both pending live verification) |
| Low | 1 | Finding 7 |
| Info | 4 | Findings 1, 2, 3, 6 |
| Not checked | 2 | Findings 8, 9 |
