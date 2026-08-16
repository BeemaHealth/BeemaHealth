Sourced from Google's published Ads policies as of 2026-08-16 — re-verify before relying on this for a live application, campaign launch, or compliance decision, as Google revises these pages in place without version history.

**Context**: Google restructured its Healthcare and Medicines policy effective **October 29, 2025**, splitting what used to be one page into several: Prescription drug services, Restricted drug terms, Pharmaceutical manufacturers, Unauthorized pharmacies, Unapproved substances, etc. Older blog posts and agency guides predating that date may describe the old structure — prefer the `support.google.com/adspolicy/answer/...` pages below over secondary sources.

## Healthcare and medicines — policy overview

https://support.google.com/adspolicy/answer/176031?hl=en

Umbrella page linking to all healthcare sub-policies: Prescription drug services, Restricted drug terms, Pharmaceutical manufacturers, Unauthorized pharmacies, Unapproved substances, Prescription opioid painkillers, Speculative/experimental medical treatment, Clinical trial recruitment, Addiction services, Abortion, Birth control/fertility/testing, HIV home tests, Health insurance. Most require certification before serving ads. Confirms the two-tier enforcement split: standard violations get a warning; **egregious** violations ("unlawful or poses significant harm to users") get the account suspended on detection, without warning, and the advertiser is not allowed to advertise with Google Ads again.

## Prescription drug services

https://support.google.com/adspolicy/answer/15598647?hl=en

Covers online pharmacies and telemedicine providers (Beema's category). Confirmed:
- Advertisers must be certified before serving ads for this category.
- "For some certifications, you may need to obtain third-party accreditation first (for example, from LegitScript, NABP, or G2)."
- Geographic split: promotion permitted in **36 specific locations** (includes Australia, Canada, US, UK, Germany, France, Japan, and others); **keyword bidding** on prescription drug terms is permitted in a narrower set of **22 of those 36** (China, Hong Kong, India, Mexico, Russia, Taiwan, Brazil excluded from keyword-bidding eligibility even where general promotion is allowed).
- **Violations of this policy get a 7-day warning before suspension** — matches SKILL.md's "Prescription drug services violations: warning issued at least 7 days prior" claim. Confirmed, not egregious-tier by default.

## Restricted drug terms

https://support.google.com/adspolicy/answer/15595717?hl=en

This is the page that actually governs the ads/landing-page vs. keyword-targeting split SKILL.md describes. Confirmed almost verbatim:
- **Canada, New Zealand, United States**: advertisers may use prescription drug terms for promotional purposes in ads and landing pages. **"You don't need to be certified in order to use prescription drug terms in ads and landing pages."** Certification **is** required to keyword-target those terms. Certification is required regardless for the business type itself (online pharmacies, telemedicine, pharmaceutical manufacturers) — using the terms doesn't exempt you from the underlying Prescription drug services certification requirement.
- **All other locations**: prescription drug terms cannot appear in ads or landing pages at all (narrow non-promotional exceptions: regulatory warnings, legal notices, public health campaigns, academic publications). Certified online pharmacies/telemedicine providers may still target the terms as keywords even here.
- Animal drug terms: separate carve-out for Canada/US: prescription animal drug terms not prone to human misuse have their own rules; keyword-targeting them still needs certification.
- Application intake: business type, location-specific requirements, submitted via Google's online form **at the child account level (not manager/MCC account)**, with Google Ads customer ID and certified domain. This confirms the "child account level, not MCC" and "customer ID + certified domain" claims in SKILL.md.

**SKILL.md says "US, Canada, New Zealand" for the terms-without-certification carve-out — confirmed exactly correct against this live page.** (A separate, older Businesswire item from LegitScript about "Google recognizing LegitScript telemedicine certification" in "US, Canada, Sweden, France, South Africa" is talking about *where LegitScript's certification is accepted as the accreditation gate at all*, which is a different and broader question than "where you may use drug terms without being certified." Don't conflate the two — flag this distinction if a country outside US/CA/NZ ever comes up.)

## Prescription drugs (drug name reference list)

https://support.google.com/adspolicy/answer/2430794?hl=en

Not a policy page — a non-exhaustive alphabetical list (~2,000+ names) of the drug terms Google's Restricted drug terms policy monitors. Useful only as a lookup, e.g. to confirm "semaglutide," "tirzepatide," "Ozempic," "Wegovy," "Zepbound," "Mounjaro" are on Google's radar as restricted terms (they are — GLP-1 drugs are squarely in scope).

## Pharmaceutical manufacturers

https://support.google.com/adspolicy/answer/15597836?hl=en

Not Beema's path (Beema is a telemedicine provider, not a manufacturer) but worth knowing the boundary: manufacturers must be certified by Google to advertise Rx drugs and OTC medicines in select locations, and can advertise without needing LegitScript specifically — a separate certification track from Prescription drug services.

## Unauthorized pharmacies (the egregious tier)

https://support.google.com/adspolicy/answer/15596326?hl=en-IE

This is the specific page behind SKILL.md's "egregious" claim, confirmed:
- Violations are classified egregious: "unlawful or poses significant harm to our users."
- **Accounts suspended on detection, without prior warning; advertiser not permitted to advertise with Google Ads again.** Reinstatement only in compelling, well-documented circumstances via appeal.
- The two common triggers named: **offering prescription drugs without requiring a prescription**, and **targeting locations where you aren't licensed to operate or sell the product**. Both map directly to SKILL.md's "Beema's two live exposures" callout (sequencing copy, and geo-targeting outrunning Bask's provider licensure).

## Unapproved substances

https://support.google.com/adspolicy/answer/15595718?hl=en (see also https://support.google.com/adspolicy/answer/2423645?hl=en, an older/related page — check both resolve to current content)

Confirmed: hCG products "in relation to weight loss or weight control" are prohibited outright, as are products implying they're as effective as prescription/controlled substances, and non-government-approved products marketed as safe/effective for treating a condition. **This category gets the standard 7-day-warning treatment, not the egregious no-warning tier** — worth noting as a correction to how SKILL.md groups it (SKILL.md places "Unapproved substances" right after the egregious-tier discussion without explicitly stating its own enforcement tier; clarify if this ever becomes load-bearing that unapproved-substances violations are warned first, unlike unauthorized-pharmacy violations).

## Restricted targeting in Personalized advertising (the audience table)

https://support.google.com/adspolicy/answer/143465?hl=en, and the newer https://support.google.com/adspolicy/answer/16701855?hl=en ("Health in personalized advertising," defines Health as a sensitive interest category — includes physical/mental health conditions, chronic conditions, sexual/reproductive health, OTC medications and medical devices used to manage chronic conditions, intimate-body-part health, invasive procedures including cosmetic surgery/injections)

Confirmed against SKILL.md's table, verbatim structure matches:
- **Not allowed for sensitive-category advertisers**: Customer Match, "your data segments" (remarketing), audience expansion, lookalike/similar segments. Reason given: "these audiences... may inadvertently contain sensitive user signals."
- **Allowed**: in-market segments, affinity segments, demographics and detailed demographics (with exceptions), life events, location targeting, custom segments (with restrictions). Predefined Google audiences are allowed because sensitive signals are auto-excluded from them; advertiser-curated audiences are not, because they risk inadvertently encoding sensitive signals.
- **Demand Gen / Discovery**: "use advertiser-curated audiences by default and may be restricted from serving" for sensitive-category advertisers — confirms SKILL.md's Demand Gen caveat.
- **Custom segments on sensitive assets/pages**: will only serve in Display campaigns to non-sensitive audiences or contextually — confirms SKILL.md's caveat.
- **Recent update (2025)**: the Health category was clarified to exclude "content directed at healthcare professionals in their professional capacity" — not relevant to Beema's patient-facing targeting, but worth knowing if B2B/provider-recruitment campaigns ever come up.

## PII / data collection

https://support.google.com/adspolicy/answer/6020956, https://support.google.com/google-ads/answer/6389382?hl=en, https://support.google.com/google-ads/answer/7686480?hl=en

Confirmed: advertisers can't collect PII (email, phone, card numbers) within ad formats not designed for it; can't attach PII to data segments, cookies, or feeds; can't send PII to Google via tags. Google's PII definition is narrower/different from GDPR's "personal data" — don't treat the two as interchangeable when advising on EU-adjacent questions (not currently relevant to Beema's US-only footprint, but flag if that changes).

## Healthcare certification application flow — discrepancy found

https://support.google.com/google-ads/troubleshooter/6099627 **does resolve**, but it is a **pre-screening questionnaire**, not the full application SKILL.md describes. Live content asks only for: organization type (e.g. "Prescription drug services provider (online pharmacy, telemedicine)," "Pharmaceutical Manufacturer," etc.), the country where the org is licensed, and which permission is being requested (prescription drug terms in ads/keywords, or addiction-services keyword targeting). It does **not** itself collect customer ID, certified domain, or the LegitScript Public Verification Link on the page fetched.

**SKILL.md says the Gate 2 application needs customer ID, certified domain, LegitScript Public Verification Link, filed at child-account level, one application per location.** The customer-ID/domain/child-account/LegitScript-link requirements are independently confirmed by the Restricted drug terms page's certification intake description, so they're accurate as *requirements of the certification process overall* — but they may live in a later step of the flow (after this pre-screening questionnaire routes the advertiser onward), not on the troubleshooter page itself. Correction for SKILL.md: describe the troubleshooter as the *entry point/pre-screen* rather than implying it's the single form collecting all those fields — walk the flow live before telling Matt/Charlie exactly what a specific screen asks for.

## What to re-verify before anything load-bearing

- The 36-country promotion list and 22-country keyword-bidding subset (named on the Prescription drug services page) — get the actual list if a non-US market ever comes up; not reproduced here in full.
- Whether the troubleshooter's pre-screen still leads to the customer-ID/domain/LegitScript-link form described above, and what that next-step form actually looks like — walk it live rather than trusting this summary.
- Whether "Unapproved substances" enforcement is confirmed 7-day-warning tier by the live page text, not just inferred from the overview page's general two-tier framing.
