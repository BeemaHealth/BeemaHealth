---
name: google-ads-compliance
description: Google Ads healthcare/medicines policy for Beema Health — the two-gate certification path (LegitScript accreditation plus Google's own healthcare certification), the registration form, US rules for prescription drug terms in ads, landing pages, and keywords, the sensitive-interest-category restrictions that block remarketing and Customer Match for health advertisers, enforcement severity tiers, and pre-flight review of ad copy and landing pages. Use whenever Matt or Charlie mention Google Ads, Search/PMax/Demand Gen, Google healthcare certification, an ad disapproval or account suspension, keyword lists with drug names (semaglutide, tirzepatide, Ozempic, Wegovy, Zepbound, Mounjaro), remarketing/audiences/Customer Match, landing-page requirements for paid traffic, or ask "can we run this on Google" / "why did Google reject this". Also use before shipping any landing page meant as a Google Ads destination. Pair with legitscript-compliance for certification status itself.
---

# Google Ads Compliance for Beema Health

Reference and review skill. Its job is to keep Beema's Google Ads account alive and its GLP-1 campaigns serving, by getting the certification sequence right up front and catching policy problems in copy, keywords, targeting, and landing pages before Google does.

Verified against Google's published policies via direct fetch, Aug 2026. Google revises these pages in place and maintains a policy change log — for anything load-bearing, re-check the live page rather than trusting this file. Primary sources are listed in `references/policy-map.md`.

## Beema's structural situation (read this first)

Beema owns the marketing site (React/Vite, GitHub Pages). Bask Health operates the portal, backend, payments, and fulfillment. Google's healthcare certification is granted against **a specific Google Ads customer ID paired with a specific certified domain**, and the certified domain has to line up with the LegitScript accreditation. That produces three questions to resolve before anyone touches an application form:

1. **Whose Google Ads account runs the ads?** Beema's own, or a partner/agency account? Applications are made at the **child account level, not the MCC/manager level** — an application filed at the manager level will not do what you want.
2. **Which domain is the certified domain?** If ads point at beemahealth.com but LegitScript certified a different domain (Bask's, say), the mismatch is the single most likely cause of a denial. Google explicitly checks that the site is fully functional, globally accessible, and meets policy requirements for the certification type claimed.
3. **Which certification category matches Beema's business model?** Google names Online Pharmacy, Addiction Services, Telemedicine, Health Insurance, and Pharmaceutical Manufacturer, and says plainly not to apply for a category that doesn't match. Beema connecting patients to providers and contracted pharmacies points at **Telemedicine**, not Online Pharmacy — but confirm against what LegitScript actually certified before filing. See [[legitscript-compliance]].

Never assume any of the three. If they're unconfirmed, say so instead of drafting the application.

## The two gates

Being LegitScript-certified is necessary and **not sufficient**. Google's own line, repeated across the healthcare policy pages, is that advertisers must *also* be certified with Google.

**Gate 1 — third-party accreditation.** For US telemedicine, Google accepts LegitScript's Healthcare Merchant Certification Program, which offers telemedicine certification to sites that provide virtual healthcare services and facilitate prescribing. (For pharmacies specifically, Google also accepts NABP Digital Pharmacy Accreditation or a .Pharmacy domain — not Beema's path.)

**Gate 2 — Google healthcare certification.** Start at Google's troubleshooter: https://support.google.com/google-ads/troubleshooter/6099627 (no login required) — this is a **pre-screening questionnaire** (organization type, country of licensure, which permission you're requesting), not the full application. It routes you to the actual certification intake, which is where the rest of these are collected:

- Google Ads **customer ID** (from the top of the account pages) and the **certified domain**
- The **LegitScript Public Verification Link**
- Filed at the **child account level**
- A **separate application per location or group of locations** — certification is not global
- If an agency is applying on Beema's behalf, documentation of the relationship with the advertiser or license holder

Walk the live flow before telling Matt/Charlie exactly what a given screen asks for — see `references/policy-map.md`.

If the application is denied, read the denial reason before resubmitting. Google flags two recurring causes: the site not meeting criteria for the claimed certification type, and the site containing terms (such as prescription drug terms) the advertiser isn't certified for. Fix and reapply, or reply to the rejection email with an explanation if it looks like an error.

## US rules that actually govern Beema's campaigns

**Where ads can run.** Google permits promotion of prescription drug services only in an enumerated list of countries. The US is on it. Anything outside that list is not a "try it and see" — it's disallowed.

**Prescription drug terms — the asymmetry that matters.** For campaigns targeting Canada, New Zealand, or the United States, prescription drug terms may be used for promotional purposes in ads and landing pages, including content promoting branding, use, sale, and distribution. **Certification is not required to use the terms in ads and landing pages, but it *is* required to keyword-target them.** Separately, certification is required regardless for the business type — telemedicine providers included.

Practical read for Beema: writing "semaglutide" on a landing page is a different act from bidding on [semaglutide] as a keyword. The second needs approval; the first doesn't, though everything else on the page still has to comply. Note that this US latitude is unusual — most other countries prohibit prescription drug terms in ads and landing pages entirely, so a copy pattern that's fine for US campaigns is not portable.

**Targeting — the restriction most likely to break the media plan.** Health is a **sensitive interest category** under Google's personalized advertising policy. Advertisers promoting in sensitive interest categories **cannot use advertiser-curated audiences**:

| Not allowed | Allowed |
|---|---|
| Customer Match | In-market segments |
| Your data segments (remarketing) | Affinity segments |
| Audience expansion | Demographics and detailed demographics |
| Lookalike segments | Life events, location targeting |

Two corollaries worth surfacing early rather than after a campaign stalls:

- **Demand Gen campaigns use advertiser-curated audiences by default** and may be restricted from serving for sensitive-category advertisers. Don't plan a Demand Gen-led launch without checking this.
- **Custom segments** built on sensitive creative assets or pointing at sensitive landing pages will serve only in Display campaigns to non-sensitive audiences or contextually; other campaign types using them won't be eligible.

So: no retargeting the quiz abandoners, no uploading a patient or lead list for Customer Match, no lookalikes off converters. If a plan assumes any of those, flag it as non-viable rather than optimizing around it. Contextual, intent-based Search and predefined Google audiences are the surface that actually works here.

**PII.** Ads may not collect or contain PII (email, phone, card numbers) except through a Google-provided ad format designed for it. PII must not be attached to data segments, cookies, or feeds, and must not be sent to Google through tags. This dovetails with Beema's standing rule that the marketing site keeps PHI out of analytics, pixels, and URLs entirely — Google's rule is narrower than Beema's, so Beema's rule governs.

## Enforcement severity — not all violations are equal

This distinction is worth knowing before advising anyone to "just test it":

- **Prescription drug services violations**: a warning is issued at least 7 days before any account suspension. Recoverable.
- **Unauthorized pharmacies violations** (offering prescription drugs without a prescription; targeting locations where you aren't licensed): Google classes these as **egregious**. Accounts are suspended **on detection, without prior warning**, and the advertiser is not permitted to advertise with Google Ads again. Reinstatement only in compelling circumstances.

Beema's two live exposures on the egregious tier are (a) copy that reads as offering medication without a prescription, and (b) running ads into states where Bask's provider network isn't licensed. The second one is not hypothetical — geo targeting is set by Beema, licensure is Bask's, and nobody catches the gap unless someone reconciles the two lists. Ads should be geo-limited to the states where service is actually available, and that list should match the state-availability disclosure the site is required to publish under LegitScript Standard 5.

**Unapproved substances** is a separate near-permanent trap if Beema ever expands into supplements: products containing hCG in relation to weight loss are prohibited outright, as are products that imply they're as effective as prescription drugs, and non-approved products marketed as safe or effective for treating a condition.

## Reviewing ad copy and landing pages

When asked to write or approve anything destined for Google Ads traffic, check in this order:

1. **Sequencing** — does the copy imply medication before a licensed provider's evaluation? ("Get your prescription today," "guaranteed approval," "start today.") Rewrite to condition on provider review. This is simultaneously a Google problem and LegitScript Standard 7.
2. **Claims** — any efficacy figure, percentage, timeframe, or "clinically proven" needs a real citation. Unsupported benefit claims hit Google's Misrepresentation policy and LegitScript Standard 8.
3. **Compounded vs FDA-approved** — copy must not conflate compounded semaglutide/tirzepatide with the FDA-approved branded products, or imply equivalence in approval status. Brand names belong to their manufacturers; using them invites both trademark and misrepresentation review.
4. **Geo** — is the geo-targeting list ⊆ the states where service is genuinely available?
5. **Landing page** — reachable, functional, globally accessible, no broken paths, state-availability disclosure visible, pricing disclosed clearly, privacy policy present, no PHI collection on Beema's side. Google reviews the destination, not just the ad, and errs toward caution on pages that link or refer to anything resembling online prescribing or dispensing.
6. **Handoff** — if the page hands users to Bask's portal, the transition should be honest about who is providing care. A destination that obscures the handoff reads badly under both Google's destination requirements and LegitScript Standard 8.

"Eligible (limited)" status on an approved healthcare ad is normal and expected — it means the ad serves only in permitted locations, not that something is broken.

## When answering a question with this skill

- Distinguish **documented Google policy** from **inference** from **"you need to ask Google/a lawyer."** Say which one you're giving. Anything involving current policy specifics, form fields, or enforcement behavior can be stale — web search the live page rather than reciting this file when the answer materially affects spend or an application.
- Flag rather than route around: if a proposed campaign structure conflicts with a policy, name the policy and the consequence tier instead of quietly proposing a workaround. Circumvention of platform policy is itself grounds for LegitScript revocation under Standard 9.
- If the question is really about certification status, entity, or domain coverage, that's [[legitscript-compliance]]. If it's about Meta, that's [[meta-ads-compliance]].
