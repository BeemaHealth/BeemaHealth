Sourced from LegitScript's published pages as of 2026-08-16 — re-verify before relying on this for a live application or compliance decision, as LegitScript revises these pages without notice.

# The 9 LegitScript Healthcare Merchant Certification Standards

Source: [Healthcare Certification](https://www.legitscript.com/certification/healthcare-certification/) (fetched 2026-08-16). Quotes below are as extracted from that page; treat exact wording as close paraphrase rather than a guaranteed verbatim legal quote — pull the live page for anything going into a contract, application, or dispute.

## 1. Licensure & Business Registration
> "Merchants must be adequately licensed for the services they offer and in the jurisdictions they serve."

**Beema implication:** Beema itself doesn't prescribe or dispense — Bask's provider network and pharmacy partners do. This standard's licensure burden sits primarily on Bask's side of the split, but Beema's marketing site still needs to accurately reflect service areas (ties to Standard 5) and not imply Beema itself holds prescribing/dispensing authority it doesn't have.

## 2. Legal Compliance
> "The applicant must comply with all provisions of applicable laws and regulations, including all applicable laws, regulations and required licensing, registration or authorizations necessary to prescribe and/or dispense medications."

**Beema implication:** Broad catch-all. For Beema specifically this mostly flows through to whichever entity actually prescribes/dispenses (Bask + its network), but if Beema's site content facilitates or directs a transaction, Beema is not automatically insulated just because it doesn't hold the pharmacy license itself — see Standard 4.

## 3. Prior Discipline and History
> "The applicant or their business, including principals, key staff, and any medical or pharmacy practitioner associated with the website or business must disclose any prior criminal, regulatory, or civil violations, along with any ongoing, resolved or otherwise addressed litigation, that involves the applicant at any time over the past ten years."

**Beema implication:** 10-year lookback covers the applicant entity, its principals, key staff, and any associated medical/pharmacy practitioner — which for Beema likely extends into Bask's clinical staff if Bask's practitioners are "associated with" Beema's website/business in LegitScript's eyes. Don't assume Beema's own clean history is sufficient if the application has to disclose an associated practitioner network.

## 4. Affiliates and Partners
> Applicants must ensure affiliates and partners comply with program standards. Partners essential to care (such as pharmacies) "are generally required to be LegitScript-certified or accredited by another recognized body, with limited exceptions."

The terms and conditions add: applicants must fully disclose affiliates ("any individual, business, or entity who previously, currently, or is expected to have a commercial and/or professional relationship") and agree not to "link or otherwise refer Internet users to healthcare merchant or advertiser websites that are not approved by LegitScript." ([Terms and Conditions](https://www.legitscript.com/certification/healthcare-certification/terms-and-conditions/), fetched 2026-08-16)

**Beema implication:** This is the standard most directly shaped by the Beema/Bask split. Bask and its pharmacy network are "partners essential to care" — the general rule is they need their own LegitScript certification or equivalent accreditation. Beema's application would need to disclose Bask as an affiliate, and the "cannot link to non-approved healthcare websites" clause means Beema's CTAs into Bask's intake flow are only safe if Bask's domain is itself LegitScript-approved (or otherwise falls under a documented exception). This has not been confirmed in writing — see the "practical default" note in SKILL.md.

## 5. Patient Services
> "Applicants' websites must clearly disclose all states, territories, provinces, and/or countries in which applicants' services are available."

**Beema implication:** Direct, concrete requirement on Beema's own marketing site copy. State-availability disclosure needs to be visible and needs to match reality — and needs to match whatever geo-targeting list is used for Google/Meta ads (see [[google-ads-compliance]], [[meta-ads-compliance]]).

## 6. Privacy
> "The applicant must comply with all provisions of applicable laws and regulations pertaining to protected information or protected health information, including privacy provisions."

**Beema implication:** Reinforces Beema's existing standing rule: no PHI in localStorage/sessionStorage, analytics, logs, or ad pixels on the marketing site. Published privacy policy required.

## 7. Validity of Prescription
> "The applicant shall only dispense or offer to dispense prescription drugs upon receipt of a valid prescription issued by a person authorized to prescribe under applicable laws."

**Beema implication:** Beema's marketing copy must never imply that medication is dispensed, guaranteed, or available before a licensed provider (on Bask's side) actually reviews the patient. This is the standard most often violated by aggressive CTA copy ("get your prescription today," "guaranteed approval").

## 8. Transparency
> "The applicant and its affiliates must ensure that all practices and offers are accurate, transparent, and not misleading to patients or the public."

**Beema implication:** Covers unsupported/superlative treatment claims, undisclosed pricing, and vague claims about what Beema vs. Bask actually does. Also the standard most likely to overlap with FTC/FDA advertising substantiation requirements — flag both when relevant.

## 9. Advertising
> "Applicants and certified clients must advertise in a manner that is transparent and in accordance with all applicable laws and regulations."

**Beema implication:** This is the standard that ties LegitScript certification to Google/Meta ad policy compliance. An ad that violates Google's or Meta's own terms (see [[google-ads-compliance]], [[meta-ads-compliance]]) is not just a platform problem — it can itself be evidence against Standard 9 and put certification at risk.

---

## Application Process (as published)

1. Check eligibility
2. Gather documentation
3. Submit application
4. Expert review
5. Get certified

LegitScript also publishes application checklists for several categories, including Standard Healthcare and Pharmaceutical Manufacturer, plus regional variants (Spain, New Zealand, India, Japan, UK, Indonesia, Philippines were listed at fetch time). Confirm current checklist availability and category names on the live site before starting a real application — don't reconstruct a checklist from this file.

## Pricing (as published on the certification page, fetched 2026-08-16)

- **Application fee:** $975 per website (nonrefundable)
- **Expedited processing add-on:** $2,500 (review starts within 2 business days)
- **Annual certification fee:** $2,150 per website
- **Probationary certification annual fee:** $3,995 per website

These figures came directly off the live LegitScript certification page at fetch time and are per-website (i.e., per certified domain) — if Beema and Bask each need separate certifications on separate domains, these fees would apply per domain, not once for the whole arrangement. Re-verify before budgeting or committing; LegitScript can and does change pricing without a visible changelog.
