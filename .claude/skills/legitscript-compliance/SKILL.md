---
name: legitscript-compliance
description: LegitScript Healthcare Merchant Certification for telehealth/GLP-1 businesses like Beema Health — the 9 certification standards, what they mean for a marketing-site-only entity routing fulfillment through a backend partner (e.g. Bask Health), pricing, application checklist, site-copy red flags, and post-certification rules on describing the certification (approved language, seal placement limits, endorsement/quality/competitor prohibitions, Public Verification Link vs certified URL). Use whenever Matt or Charlie ask about LegitScript, certification status, the seal, "can we say we're certified", FDA/FTC claims for GLP-1 content, whether site copy or a partner arrangement would pass review, or when drafting marketing-site content, disclaimers, or pricing pages. Also use before publishing pages via cluster-page-publisher if the content makes medical claims. Hand platform-specific ad policy to google-ads-compliance and meta-ads-compliance.
---

# LegitScript Compliance for Beema Health

Reference skill, not a code-changing skill. Its job is to give accurate, sourced answers about LegitScript's actual requirements and flag when something Matt/Charlie are building or discussing would put certification (Beema's own, or reliance on a partner's) at risk. It does not replace legal counsel — say so when the question is genuinely a legal judgment call rather than a documented standard.

## Beema's specific structural situation (read this first)

Per [[beema-launch]] / [[profile]] context: Beema Health owns and operates the **marketing site only** (React/Vite, GitHub Pages). Bask Health owns the backend, patient portal, patient data, payments, and clinical/fulfillment pipeline. This matters directly for certification:

- **Who needs to be certified?** LegitScript certifies specific *domains/websites*, not abstract companies. Standard 4 (Affiliates and Partners, below) says a merchant's fulfillment partners — e.g. partner pharmacies "responsible for the fulfillment of prescription medication to patients" — are generally required to be LegitScript-certified or accredited by another recognized body themselves. That means there are two separate questions Beema has to keep straight, and conflating them is the single biggest risk area:
  1. **Does beemahealth.com (the marketing domain) need its own certification?** Yes, almost certainly, if Beema runs paid ads (Google/Meta/etc.) referencing prescription treatment from its own ad accounts, or processes any CNP transactions itself. If Bask's domain is what actually transacts and Beema's site only educates/refers, the analysis changes — this is exactly why [[beema-launch]] flags "which entity holds LegitScript certification, which domain it covers, and whether ads run from Beema's own ad accounts" as the most critical unresolved item. Do not assume either answer; treat it as open until Matt/Charlie get written confirmation from Bask.
  2. **Is Bask (and Bask's pharmacy network) itself certified/accredited?** This is Beema's Standard-4 exposure as an "affiliate" — if Bask or its pharmacy partners aren't properly licensed/certified, that's a disqualifying risk that flows back to Beema, not just a Bask problem.
- **Practical default**: until that written confirmation exists, treat both (1) and (2) as unresolved compliance risk, not settled. Don't tell Matt/Charlie "you're covered because Bask is certified" — that's an assumption, not a verified fact.

## The 9 LegitScript Healthcare Certification Standards

Source: LegitScript's own certification page (verified current as of Aug 2026 — re-check https://www.legitscript.com/certification/healthcare-certification/ if it's been a while, standards do get revised). Full text and Beema-specific implications in `references/nine-standards.md` — read it before answering any specific "would X pass certification" question. Summary:

1. **Licensure & Business Registration** — properly licensed in every jurisdiction where medications are prescribed/dispensed AND where the patient is located.
2. **Legal Compliance** — full compliance with prescribing/dispensing law; can't facilitate unapproved or unauthorized medications.
3. **Prior Discipline and History** — 10-year disclosure requirement for the applicant, principals, key staff, and any associated medical/pharmacy practitioner; recent/repeated disciplinary action can be disqualifying.
4. **Affiliates and Partners** — everyone in the chain (partner pharmacies, co-owned companies, staff, promoted entities) must comply; fulfillment partners generally must themselves be certified/accredited.
5. **Patient Services** — website must clearly disclose every state/territory/country where services are actually available.
6. **Privacy** — HIPAA (or applicable regional equivalent) compliance, published privacy policy, SSL/TLS for anything sensitive.
7. **Validity of Prescription** — no prescribing/dispensing before a licensed provider actually reviews the patient; must follow applicable telemedicine law.
8. **Transparency** — no misleading claims anywhere (site, pharmacy, practitioners, drugs, pricing); explicitly includes unsupported benefit claims (FTC/FDA-adjacent).
9. **Advertising** — ads must be accurate, non-misleading, and not violate the ad platform's own terms of service; circumvention attempts are grounds for denial/revocation.

## After certification is granted (language and seal usage)

Certification is not the finish line — LegitScript issues merchant-facing rules about how the certification may be described, and those rules are enforceable through the terms Beema agreed to. Full detail in `references/certification-language-usage.md`; **read that file before approving any copy that mentions LegitScript**. The short version:

- **Allowed**: stating certified status ("We're LegitScript-certified!"), explaining that certification demonstrates compliance with LegitScript's standards, describing LegitScript as a merchant/advertiser certification and monitoring body, and linking to LegitScript's certification and standards pages.
- **Seal placement is narrow**: LegitScript's terms specify the *home page* of the certified website, not "anywhere on the site" — confirm with LegitScript before placing it on a treatment or pricing page. It must also be the live, auto-refreshing embed (a static screenshot violates the terms) and hyperlink only to legitscript.com. Not printed materials, not ad creative, not decks, not email, not social — no digital use outside the certified site's home page. See `references/certification-language-usage.md` for sourced detail.
- **Never imply** endorsement or sponsorship, never treat certification as a statement about product quality or safety, and never imply that a competitor's lack of certification means they're unethical or subpar. That last one is the easiest for GLP-1 competitive copy to trip.
- **Scope honestly**: certification attaches to a specific entity and specific domain(s). Given the Beema/Bask split, do not let copy imply the whole patient journey is certified when only one domain is. Confirm entity, domain, and active status in writing before any certification claim ships.

## Handing off to the ad platforms

Once certification exists, each ad platform has its own separate approval gate on top of it — being LegitScript-certified does not by itself make ads eligible on either Google or Meta.

- **Google**: [[google-ads-compliance]] — LegitScript accreditation *plus* Google's own healthcare certification, applied for per location at the child-account level, with the Public Verification Link.
- **Meta**: [[meta-ads-compliance]] — active LegitScript certification *plus* Meta's Prescription Drug Ads authorization under Business Settings → Authorizations and Verifications, using the certified website URL (not the verification link).

Two things this skill owns that those skills defer back to it: (a) whether the certification is active and what it actually covers, and (b) whether the classification claimed on a platform form (Online Pharmacy vs Telemedicine vs Pharmaceutical Manufacturer) matches what LegitScript actually certified. A classification mismatch between the Public Verification Link and a platform application is a self-inflicted rejection.

Also relevant: Standard 9 makes platform ad-policy violations a *certification* issue. An ad that gets Beema suspended on Meta isn't only a media problem — apparent circumvention of platform policy can be grounds for denial or revocation of certification itself.

## When answering a compliance question

1. **Identify which standard(s) are actually implicated** — most real questions ("can we say X on the pricing page," "can we advertise before Bask confirms Y") map cleanly to Standard 5 (state coverage), 6 (privacy/PHI), 7 (sequencing — no claims implying prescription before provider review), 8 (transparency/claims), or 9 (ad copy).
2. **Separate "documented LegitScript standard" from "reasonable inference" from "you need a lawyer."** State which one you're giving. Never present an inference as a hard requirement.
3. **For anything involving current pricing, fee amounts, ad platform policy specifics, or recent enforcement actions** (FDA warning letters, platform policy changes) — these move fast and this skill's cached numbers can go stale. Web search current figures rather than reusing what's in `references/`; note the source and date.
4. **For site-copy review** (before publishing via cluster-page-publisher or otherwise): check for (a) unsupported/superlative treatment claims, (b) missing state-availability disclosure, (c) anything implying a guaranteed outcome or implying prescription happens before provider review, (d) pricing that isn't clearly disclosed, (e) PHI anywhere in analytics/forms/URLs.
5. **Flag, don't fix silently**: if something in the current site or a proposed partner arrangement looks like it conflicts with a standard, say so explicitly and cite the standard number — don't just quietly route around it.

## What this skill is not

- Not legal advice, and Matt/Charlie's userPreferences already ask for that caveat on regulated topics — apply it here too.
- Not the FDA/FTC advertising playbook itself (that lives in the marketing master prompt referenced in [[beema-launch]]) — this skill is specifically about the LegitScript certification standards and how they interact with Beema/Bask's split ownership structure. Pull in FDA/FTC ad guardrails when a question needs them, but LegitScript Standard 8/9 is the throughline.
- Not the platform playbooks. Questions about Google Ads certification forms, keyword eligibility, audience restrictions, or disapprovals belong in [[google-ads-compliance]]; questions about Meta authorization, ad creative rules, personal-attributes rejections, or pixel/data-source classification belong in [[meta-ads-compliance]]. Use this skill for the certification underneath both.
- Not a substitute for the actual application checklists — for a real application, point to LegitScript's own checklists (linked in `references/nine-standards.md`) rather than reconstructing them from memory.
