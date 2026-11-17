---
name: beema-ad-video
description: Create PAID advertising video variations for Beema Health (Meta, TikTok, YouTube, Google) from the shared hook/meat/CTA library for sildenafil, tadalafil, ED Mints (optional mention), compounded tirzepatide and compounded semaglutide, including 9:16, 4:5 and 1:1 renders, full on-screen and voiced safety information, city-targeted variants, a measurement plan, and a test log. Use when Matt asks for ad creative, an ad batch, hook/meat/CTA ad tests, ad renders by platform, or ad performance analysis. Never launches or raises spend without explicit approval. For organic social use beema-organic-video.
---

# Beema paid-ad video skill

Same engine as organic (`shorts/engine/`, see its README) with `--format ad`. Differences are deliberate.

## Hard rules
- **Never launch, edit, pause-resume, or increase spend** in any ad account, and never use the meta-ads write tools, without Matt's explicit approval in that message. Reading/reporting is fine. Hand off creative; Matt uploads.
- All organic hard rules apply (no brands, no FDA-approved claims for compounded products, no testimonials, no performance claims, no staging code).
- **Platform gate first.** Before recommending spend, confirm for THIS product and platform: active LegitScript certification, Meta Prescription Drug authorization, Google healthcare pre-approval, TikTok's current Rx policy (sources conflict). Use the `legitscript-compliance`, `meta-ads-compliance` and `google-ads-compliance` skills. Compounded GLP-1 ads are the highest risk. Do not assume LegitScript covers every ad.
- **No LegitScript seal or certification claim in ad creative.** Ad format also blocks second-person condition/body copy (Meta personal attributes); `library lint` writes `compliance/library_report_ad.json` listing which hooks are ad-safe.
- Ads include the full Important Safety Information, voiced and on screen, and "Adults 18+" on the end card. Whether this satisfies the adequate-provision approach is a counsel decision (flagged on every ad package).
- City-specific campaigns (Houston, Boston, others): localize only targeting/landing page and, if needed, a "telehealth for [city] residents" line. NEVER imply a physical Beema clinic. Do not add city names to the library hooks; pass them as campaign metadata.
- Re-verify every price with Matt before spend (`beema.py check-prices` only proves the numbers exist in the pricing lib, which has been stale before).

## Workflow
1. Choose a small batch (6 to 12 variations), not 750. Prefer ad-safe hooks (`library_report_ad.json` status AUTO_CHECKS_PASSED), 1 to 2 meats, 2 CTAs. Use organic winners as candidates only.
2. `beema.py compose --product P --hook ID --meat ID --cta ID --format ad [--mints] [--aspect 4x5|1x1]`. `--mints` adds the compliant ED Mints mention (compounded, not FDA-approved, provider decides, no timing claim).
3. Review stills and compliance output; resolve REVIEW items; `registry signoff`.
4. Hand the MP4s, captions, and a test plan to Matt. Test one variable at a time: hooks first, then meats, then CTAs.
5. Measure creative separately from targeting, landing page, and funnel: hook retention and 3-second abandonment, average watch time, completion, CTR, CPC, landing-page conversion, cost per qualified lead, CAC, ROAS only with trustworthy revenue attribution. Import with `registry import-metrics` (rows with `kind=ad`). Record winners/losers with `registry mark ID winner|loser|retired`.
6. Always say what was NOT measured. Never fabricate numbers; if an API is missing, use manual CSV import.
