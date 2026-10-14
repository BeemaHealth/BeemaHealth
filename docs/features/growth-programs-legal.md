# Growth programs: patient stories, referrals, and creators (legal design)

**Status:** DESIGN ONLY. Nothing here is built or published. Drafted 2026-10-12 from public-source research, not from counsel. Every legal text below is a **draft for attorney review**, not final language. Do not ship any of it until the "Launch gate" at the bottom is complete.

**Programs covered**

| # | Program | Pays | Modeled on |
|---|---------|------|------------|
| A | Patient story (video) program | $100 credit toward the patient's own care | Trava "Share Your Testimony" |
| B | Patient referral program | Equal credit to referrer and friend | Trava / GrowSurf-style refer-a-friend |
| C | Creator (influencer) program | Affiliate compensation for new patients | Trava influencer program |

The Facebook group is out of scope (deprioritized by Matt).

**Business facts (from Matt):** all 50 states; cash-pay only, never billed to Medicare, Medicaid, or any insurer; Bask is the contracting entity; Bask integrates affiliate platforms (GrowSurf and others).

---

## 0. What Trava actually publishes (so we do not over-trust it)

Reviewed 2026-10-12: `taketrava.com` Terms, Privacy Policy, Telehealth Consent & Open Payment Notice, Testimonies page, Influencer Program page.

- The "Open Payment Notice" is only the federal Sunshine Act explainer (manufacturer-to-physician payments) plus a CMS link. It does **not** disclose payments to creators, referrers, or testimonial givers.
- Their Terms have **no** referral, affiliate, influencer, endorsement, promo-code, or video-submission terms. The only hook is a generic perpetual, irrevocable, no-compensation "License to Information Submitted."
- Their Testimonies page offers "$100 off your next Trava order" with **no** compensation disclosure, no results-not-typical language, and no HIPAA release visible.
- Their legal pages contain unresolved drafting notes (`[COUNSEL: ...]`).
- Their creator terms (commission, disclosure, claim rules) live behind an Everflow signup portal we could not read.

**Conclusion:** Trava's public copy is not a legal template. We copy their program shape (modal, $100 credit, 30-90 second vertical video, 10k-style creator gate, monthly payouts) and build the legal layer they do not show.

---

## 1. Shared foundations (apply to all three programs)

### 1.1 Non-negotiable design rules

1. **Clinical independence.** No reward, credit, or commission may depend on which drug, dose, plan, or quantity a patient is prescribed. Providers and pharmacies never receive anything for program participation. Programs never appear inside clinical workflows (intake, provider messages, prescription notices).
2. **No referral payment to licensed professionals.** Physicians, NPs, PAs, nurses, pharmacists, and Beema/Bask/Care Partner staff cannot receive creator or referral compensation for sending patients. State all-payor laws (for example California B&P Code 650, Florida 817.505) reach "all persons" in some states, and licensed referrers are the worst case.
3. **No PHI leakage.** A referrer, creator, or story submitter must never learn whether any specific person became a patient, what they were prescribed, or anything clinical. Programs report only anonymous counts and credit amounts.
4. **Rewards are credits, not cash, for patients.** Patient-facing rewards (A and B) are credits against the patient's own future Beema Health charges. Not transferable, no cash value, no cash-out.
5. **Reward amounts are flat and the same for everyone.** No tiering by drug, price paid, or order size for patient-facing credits.
6. **Disclose every material connection**, in the same place and format as the endorsement (FTC Endorsement Guides, 16 CFR 255).
7. **Never pay or reward based on sentiment.** Approval or payment cannot depend on a positive review (16 CFR 465.4). Negative or neutral honest stories earn the same reward.
8. **State gating.** Everything must be switchable per state with a single config list (see 1.3).
9. **Opt-in only, always optional.** Participation never affects care, pricing eligibility, or access.
10. **Brand rule:** always "Beema Health", never bare "Beema" in shipped copy. No em dashes in copy, code, or tests (repo rule).

### 1.2 Roles and entity decisions (needs Bask answers)

- Bask is the contracting entity. Confirm whether program credits are issued as Bask discount codes, whether Bask's provider network or pharmacy agreements restrict third-party payments, and who is the "covered entity" for patient-submitted video (see Bask questions, section 7).
- Marketing site (this repo) hosts landing pages, public terms, and application pages only. **No PHI storage in this repo or browser storage.** Video upload and signed authorizations must live in a HIPAA-appropriate system (Bask portal or a vendor under a BAA). Marketing pages link out.
- Creators and referrers are independent persons, not employees, agents, or Care Partners.

### 1.3 Restricted-state switch (the 50-state problem)

Add a single config (suggested `src/lib/growth-programs.ts`) exporting:

```
PROGRAM_RESTRICTED_STATES: Record<'story' | 'referral' | 'creator', string[]>
```

Provisional seed list pending the real state review (these are only the states our research named as having all-payor or strict fee-splitting rules, and the list is **not** exhaustive): `FL, CA, TX, IL, NY`.

Recommended default behavior until counsel clears a state:
- **Creator commission program:** creators located in a restricted state cannot join; new patients in a restricted state do not generate commission (they still receive care normally; the creator is told only "not eligible," never why or who).
- **Referral program:** credit-only flat program may stay on, but Matt/counsel must decide whether to exclude restricted states for the cash-equivalent value.
- **Story program:** state-agnostic in law terms but confirm state testimonial/advertising rules; keep on everywhere unless counsel flags a state.

Status of this list is a **decision for Matt/counsel**, not something code should invent. Keep the data in config, not hardcoded in components.

### 1.4 Records to retain (minimum)

| Record | Retain | Why |
|--------|--------|-----|
| Signed story authorization + release | 6 years from signing or last effective date | HIPAA documentation retention |
| Published testimonial + the exact disclosure shown | life of use + 6 years | FTC substantiation |
| Creator agreement, W-9, payout ledger | 7 years | tax and defense |
| Creator content approvals/monitoring log | 3 years minimum | advertiser liability for creator claims |
| Referral credit ledger (anonymous) | 7 years | accounting |

### 1.5 Where new language goes (summary matrix)

| Location | What changes |
|----------|--------------|
| `src/routes/legal.terms.tsx` | Edit "Prices, promotions" (line ~452), "Electronic records, email, SMS" (~690), "User submissions and feedback" (~882), "Beema Health's role and independent Care Partners" (~181); add new sections (see section 6) |
| `src/routes/legal.privacy.tsx` | Edit "Information We Collect," "Consumer Health Data," "How We Disclose Information," "Sale, Sharing, and Targeted Advertising," "Email, Telephone, and SMS," "Pricing, Promotions, and Advertisements" |
| `src/routes/legal.telehealth-consent.tsx` | One acknowledgment: programs are optional, never affect care, Providers are not compensated |
| `src/routes/legal.hipaa.tsx` | One paragraph on marketing/testimonial authorization and right to revoke |
| New legal pages | `/legal/referral-terms`, `/legal/story-program-terms`, `/legal/creator-program-terms` (public summary; full agreement signed at onboarding) |
| New marketing pages | `/refer`, `/share-your-story`, `/creators` (indexable landing pages; application and upload flows noindex) |
| Footer (`SiteFooter.tsx`) | Links to the three program-terms pages |
| Emails | Footer strings in section 5; referral CTA only in marketing/lifecycle emails |
| Analytics | No pixels or analytics events with patient identifiers on upload/authorization pages (see `docs/features/analytics.md`) |

Existing-docs discrepancy found while researching: the current Terms "User submissions and feedback" section grants a generic perpetual feedback license "unrelated to your personal health information" and says nothing about testimonials. That is compatible with, but does not cover, a paid health-testimonial program. Recommend a carve-out (section 6.3) rather than relying on it.

---

## 2. Program A: Patient story (video) program

### 2.1 What it is

Active adult patients may submit a short selfie video about their experience. If the submission passes a content-and-compliance review, they get a **$100 credit** toward their next Beema Health charge. Beema Health may then publish approved videos on the site, social, and (only if cleared) paid ads.

### 2.2 Eligibility

- 18 or older, current or former Beema Health patient with at least one completed paid order (verify via Bask, never via a self-reported claim).
- Not a Beema Health, Bask, or Care Partner employee/contractor or a licensed clinician, not a creator in program C.
- One rewarded submission per patient per 12 months (suggested).
- Located in a state where the program is enabled (section 1.3).

### 2.3 Trava's flow, adapted

| Trava | Beema Health version | Why changed |
|-------|----------------------|-------------|
| "Submit A Video About Your Success!" | **"Share Your Beema Health Story"** | "Success" invites sentiment-conditioned content (16 CFR 465.4) |
| "Get $100 Off Your Next Order" | Same, plus visible "Compensated" line | FTC disclosure |
| 30-90 sec, vertical, selfie | Same | Fine |
| "Share where you started, where you are now" | "Tell us about your experience in your own words. Any honest experience is welcome." | Avoid scripting results |
| First name only | Same | PHI minimization |
| "Mention TRAVA by name" | "Please mention Beema Health by name" | Fine; same ask |
| Before/after photos optional | **Not accepted at launch** | Meta bans before/after in ads; substantiation burden; revisit later |
| Approved submissions get a code in 3-5 days | Same, credit issued after approval | Fine |

### 2.4 Submission flow (UI + system)

1. Patient opens `/share-your-story` (public landing, indexable) and clicks "Submit your story." Sign-in required (portal) so we can verify patient status without the marketing site holding PHI.
2. Step 1: **Read the program terms** (summary on screen, full link).
3. Step 2: **Authorization and release** (section 2.7). Four separate unchecked boxes, each required, plus typed full name + date as e-signature.
4. Step 3: **Upload** the video (and, if needed, a still). Upload target must be the Bask portal or a BAA-covered vendor, **not** this site's storage.
5. Step 4: Confirmation: "We review within 3 to 5 business days. You will receive your $100 credit after approval, whether or not we publish your video."
6. Reviewer queue (internal, staff-only) per 2.5.
7. On approval: credit issued via Bask discount code or ledger credit; patient emailed the confirmation (no health details in the email).
8. On rejection: explain the technical or compliance reason, offer a re-record, never cite sentiment.

### 2.5 Review (screening) before any publishing

Two checkpoints: **approval for reward** (low bar: authentic, technically usable, complies with 2.6) and **approval to publish** (higher bar: marketing/compliance sign-off). Reward does not depend on publication.

**Reject or ask to re-record if the video:**
- Names brand drugs (Ozempic, Wegovy, Zepbound, Mounjaro) or says "same as" / "just like" / "generic of" an FDA-approved drug.
- Claims or implies compounded medication is FDA-approved, clinically proven, or equivalent to an approved product.
- States specific weight-loss numbers, timeframes, dosages, or dose changes that Beema Health cannot substantiate (launch rule: no numbers unless verified against the clinical record and the patient authorized that check).
- Gives medical advice ("you should ask for X," dose guidance) or tells viewers to stop or change other treatment.
- Shows another identifiable person, minors, other people's PHI, prescription labels with names/addresses, pharmacy names, or the patient's last name, city, employer, or date of birth.
- Includes unreviewed claims about side effects, safety, "no side effects," or "guaranteed" results.
- Disparages competitors or other telehealth providers by name, or makes claims about LegitScript beyond approved wording.
- Contains music/clips they do not own, or is clearly scripted or paid-read.

**Never reject because the story is neutral or negative about outcomes.** Document this in the reviewer checklist and keep the log.

**For paid-ad use only (extra gate):** no body-shaming "before" framing, no personal-attribute framing ("Are you overweight?"), no before/after imagery. Run through `meta-ads-compliance` and `google-ads-compliance` before any ad use. Do not use testimonials in ads at all until both platform authorizations are confirmed active.

### 2.6 Content guidelines shown to the patient

- Use first name only. Do not show your last name, address, or date of birth.
- Speak in your own words about your experience. Positive, mixed, and negative experiences are welcome.
- Please mention Beema Health by name.
- Please do not name brand-name medications, give dosing, or give medical advice. Say "the medication my provider prescribed."
- Please do not state exact pounds lost or timeframes unless we ask you to confirm them against your records.
- Keep others out of the frame.
- You are being compensated for your time with a $100 credit. This will be disclosed whenever your video is shown.

### 2.7 Authorization and release (DRAFT language)

Present as one scrollable document with four required, separately-checked statements. Must be signed before upload is enabled.

```
BEEMA HEALTH STORY PROGRAM: AUTHORIZATION AND MEDIA RELEASE

1. What I am authorizing. I authorize Beema Health LLC ("Beema Health") and
   its independently licensed Care Partners to use and disclose my video
   story, my image, voice, and first name, and any health information that I
   choose to reveal in them, for the purpose of publicly marketing and
   promoting Beema Health and its services, including on its website,
   social media, email, and, if I separately agree below, paid advertising.

2. Who receives it. Beema Health may disclose this material to the
   general public and to service providers that host or distribute it. Once
   shared publicly, it may be viewed, copied, or shared further by others,
   and federal privacy law may no longer protect it.

3. What information. The video, image, voice, first name, and statements I
   make about my experience and health. No other medical records will be
   disclosed under this authorization.

4. Compensation. I will receive a $100 credit toward my own future Beema
   Health charges for submitting a story that meets the program guidelines.
   The credit has no cash value, is not transferable, and may be limited or
   expire as stated in the Story Program Terms. I will receive the credit
   whether or not Beema Health publishes my story, and the credit does not
   depend on whether my story is positive or negative.

5. Voluntary. My care, prices, and eligibility do not depend on whether I
   sign. I may decline without penalty.

6. Expiration. This authorization expires two (2) years after the date I
   sign, unless I revoke it earlier.

7. Right to revoke. I may revoke this authorization at any time by emailing
   [privacy@beemahealth.com] or using [portal link]. Revocation will not
   affect uses made before Beema Health receives it. After I revoke,
   Beema Health will stop new uses and remove my story from channels it
   controls within [10] business days, but cannot recall copies already
   shared by third parties or paid advertising already delivered.

8. Honesty. The statements in my video reflect my real experience. I
   was not told what to say, and I am not required to say anything positive.

9. Rights. I own what I record and have the right to grant these rights. I
   grant Beema Health a [non-exclusive, worldwide, royalty-free] license to
   edit (for length, captions, and compliance) and display the material for
   the purposes above for the authorization period.

10. I understand I am entitled to a copy of this form.

[ ] I have read and agree to the Authorization and Media Release above.
[ ] I understand that I am being compensated and that the compensation will be
    disclosed with my story.
[ ] I authorize use of my story on Beema Health's website, social channels,
    and email.
[ ] (Optional, separate) I also authorize use in paid advertising.

Typed full legal name: ____________    Date: ____________
```

This draft is built to satisfy HIPAA marketing authorization elements (45 CFR 164.508(c)): description of information, who discloses, who receives, purpose, expiration, revocation right and how, no conditioning of treatment, redisclosure warning, signature and date. **Counsel must confirm** it before use, and confirm which entity is the covered entity (Bask, the provider group, or us).

### 2.8 Public disclosure (strings and placement)

- **On the published page / card (visible without a click):** "Compensated patient story. Individual results vary and are not typical."
- **In-video overlay for the first 3 seconds and audio/caption mention when used as an ad or social post:** "Compensated testimonial."
- **For any result claim shown:** "Typical results: [typical results statement, to be written from substantiated data]." Do not use "results not typical" alone as a cure (the FTC Guides require disclosing generally expected results when the testimonial implies otherwise).
- **Compounded product line (where a medication is shown or named):** "Compounded medications are not FDA-approved and have not been reviewed by FDA for safety, effectiveness, or quality." Source consistent with the compliance rules already in `docs/features/treatment-pages.md`.
- **Page footer where testimonials live:** "These stories are shared by patients who received a $100 credit toward their care. Beema Health does not edit stories for sentiment. Care is provided by independently licensed Providers and a prescription is issued only if clinically appropriate."

### 2.9 Credit mechanics (also see Story Program Terms, section 6.4)

- $100 credit, usable on the patient's own next Beema Health charge, not combinable except as allowed, no cash value, expires after [12] months, nonrefundable, voided on fraud.
- If the patient cancels or is refunded, an unredeemed credit is forfeited; a redeemed credit is not clawed back except for fraud.
- Do not issue until approval (not "on submission").

### 2.10 Takedown and revocation workflow

- Request via privacy contact or portal.
- Remove from site, organic social, email within [10] business days; pause paid ads within [2] business days of revocation.
- Keep the authorization record (for HIPAA retention), delete the video file within [30] days unless a legal hold applies.

---

## 3. Program B: Patient referral program

### 3.1 What it is

Each patient gets a personal link/code. A friend who uses it and becomes a paying patient gets **equal credit** and so does the referrer ("50/50"). Suggested starting point: **$50 credit for each side**. Matt to confirm the amount (and whether "50/50" meant equal credits or a revenue split; this design assumes equal credits).

### 3.2 Design

| Item | Rule |
|------|------|
| Who can refer | Current patients in good standing, 18+. Not licensed clinicians, not Care Partner/Bask/Beema staff. |
| Who can be referred | New patients only; never an existing/previous patient; one referral credit per new patient. |
| Trigger | Friend completes the first **paid** order and passes the refund/chargeback window [14 days]. |
| Reward type | Credit on the patient's own account. No cash. |
| Amount | Same for everyone, regardless of drug/plan/price. Suggested $50 + $50. |
| Cap | [10] rewarded referrals or $[500] of credit per referrer per 12 months (suggested; protects against "brokering at volume" and abuse). |
| Expiry | [12] months from issue. |
| Stacking | Referral credit cannot combine with other promotions unless stated. |
| Self-referral / households | Prohibited; matching name, address, payment method, device counts as self-referral. |
| Coupon sites / public posting | Prohibited. Link is for personal sharing with people the referrer actually knows. Public posting, paid ads, or social-audience promotion = Creator program (C). |
| Eligibility by state | Respect `PROGRAM_RESTRICTED_STATES.referral`. |

### 3.3 "TCPA and CAN-SPAM safe" share flow, in plain terms

- **TCPA** governs texts and calls (consent for marketing). **CAN-SPAM** governs commercial email (sender ID, physical address, working unsubscribe). The bigger risk in referral programs is **state texting law, especially Washington's CEMA**, which can make a company liable for texts that other people send if the company "assists in the transmission," at $500 per text. Companies have been sued and settled over refer-a-friend texts.
- **Therefore the share flow must never send anything to the friend.**

Build rules:
1. The patient gets a link/code and shares it **themselves** through their own phone, email, or apps. We do not send texts or emails to the friend.
2. **No contact import**, no "enter your friend's phone or email," no "we'll send it for you."
3. **No pre-filled SMS body.** If we offer a native share sheet, share only the link and a neutral, editable title. Do not offer a canned message that we transmit. (Courts have treated a canned message plus link as "assistance.")
4. Friend-facing pages (`/refer?code=...`) are normal web pages, no auto-capture of the friend's phone/email before they choose to start intake.
5. Our own emails to **our own patients** about the program (their own referral link, credit earned) are fine as normal program messages with unsubscribe and the footer in section 5.
6. Consent language for our SMS to patients: marketing SMS needs prior express written consent per the existing Privacy Policy SMS section; do not text referral promos to patients who did not opt in to marketing texts.

### 3.4 What the referrer sees and what the friend consents to

- Referrer dashboard: "Referral credits earned: $X" and "Referral credits pending," **no names, no statuses, no counts that reveal an individual.** Show only an aggregate count of credits (consider rounding or batching with a small delay so a small group of friends cannot be inferred).
- At the friend's checkout, a short required checkbox (shown only when a referral code is present): "I agree Beema Health may tell the person who shared this link that a reward was earned. No other information about me will be shared."
- Do not tell the friend who referred them by name unless the referrer is visibly known in the link text and consents.

### 3.5 Required disclosure at point of share

On `/refer`, in the portal share screen, and in referral emails (visible, not a footnote):
> "Refer a friend and you each get a $[50] credit toward your own Beema Health care after their first paid order. Credits have no cash value. We do not tell you who became a patient. Share only with people you know. Terms apply: [link]."

### 3.6 Clinical-independence safeguards

- Never frame the referral as tied to a specific medication ("refer for tirzepatide").
- Provider communications and clinical emails never contain referral CTAs.
- The credit is a general account credit, not a medication discount.

### 3.7 Tooling note

If using GrowSurf (or another platform Bask supports), **confirm in writing**: what data fields it receives, that it does not receive health information or medication, whether a BAA is needed, whether it hosts participant lists with names, and that it cannot email or text the referred friend on our behalf in a way that triggers 3.3.

---

## 4. Program C: Creator (influencer) program

### 4.1 What it is

Social creators with **5,000+ followers on TikTok or Instagram** can apply to promote Beema Health with a unique tracking link/code and earn **affiliate compensation per new patient**, per Matt's plan (amount undetermined, possibly varying by drug).

### 4.2 Compensation: decision needed (highest-risk element)

Research summary: per-patient or percentage compensation tied to patient volume is the structure most scrutinized under state all-payor anti-kickback and fee-splitting laws, even for cash-pay. Varying pay by drug or order value makes it more value-based and therefore riskier. Trava does not publish its rates, structure, or state restrictions.

| Option | Structure | Risk | Recommendation |
|--------|-----------|------|----------------|
| C1 | Flat fee for defined content deliverables (for example, $X per approved post/video), no per-patient element | Lowest | Safest default; use where unsure |
| C2 | **Flat** bounty per new patient, same amount for every drug/plan, capped, state-gated | Moderate to high | Reasonable target given Matt's goal, **only** in states counsel clears, and recommend counsel review |
| C3 | Per-patient commission that varies by drug or revenue (Trava-style per Matt) | Highest | Do not launch without written counsel sign-off per state; this is exactly the volume/value-linked structure sources flag |

**Recommended launch posture:** start with C1 everywhere and C2 in cleared states, move to C3 only with counsel. This is Matt's decision; the doc does not make it. Whatever is chosen: compensation is paid for marketing services at documented fair-market value, not for clinical referrals, and creators never see which patients converted.

### 4.3 Eligibility and vetting

- 5,000+ followers on TikTok or Instagram (verify via public profile; recheck at 6 months).
- 18+, US-based, resident in a creator-enabled state.
- Public, original content about fitness, wellness, weight loss, or lifestyle.
- **Excluded:** licensed healthcare professionals and students (MD, DO, NP, PA, RN, pharmacist, dietitian/RD for clinical claims), Beema/Bask/Care Partner staff, current patients promoting their own treatment inside the creator program (they can use program B), anyone with prior FTC, FDA, or platform enforcement history.
- **Pre-vetting of existing content:** reviewer scans the past 3 months for prohibited claims, other telehealth/GLP-1 promotions, body-shaming, or unsubstantiated medical claims.
- Applications reviewed within [5] business days; no minimum-spend obligation; no cost to join.

### 4.4 Creator agreement (key clauses to draft)

Keep the public page short and sign a real agreement at onboarding (can be an e-signed click-through hosted by the affiliate platform, but we own the text).

1. **Independent contractor.** No employment, agency, partnership, or authority to bind Beema Health.
2. **Services and compensation.** Exhibit lists the chosen model (C1/C2/C3), amounts, payment schedule (monthly, net [30] after the patient's refund window), minimum payout, currency, taxes (W-9, 1099-NEC at the IRS threshold), clawback for refunds/chargebacks/fraud.
3. **Fair-market-value and no-referral-of-care statement.** "Compensation is for advertising services only. Creator does not provide, recommend, or influence clinical decisions and has no role in whether any person receives treatment."
4. **Material-connection disclosure duty** (4.5).
5. **Approved claims and prohibited claims** (4.6), with the right to require edits or removal.
6. **Content approval.** First [3] posts pre-approved; afterward spot-checked weekly. Beema Health may require removal within [24] hours.
7. **No health advice and no PHI.** Creator may not collect, ask for, or discuss any follower's health information, answer clinical questions (redirect to the portal), or receive patient names/status from Beema Health.
8. **Tracking only via assigned link/code.** No cookie stuffing, no brand-keyword bidding, no coupon/deal sites, no incentivized or fake accounts, no self-referral, no household referral.
9. **Paid amplification.** Boosting/whitelisting only with written approval and the advertiser account's compliance; all paid use must comply with Meta/Google/TikTok health ad policies.
10. **Trademarks.** Use of the Beema Health name and approved assets only. **No use of the LegitScript seal or implying LegitScript endorses the creator or any product.** Creators may state "Beema Health is LegitScript-certified" only in the exact approved wording and without implying endorsement.
11. **Insurance/no earnings promise** (4.8).
12. **Indemnity** for creator's content and violations; **termination** for breach with commission forfeiture on violation-related conversions.
13. **State restrictions clause.** Beema Health may exclude or stop crediting conversions from restricted states at any time.
14. **Confidentiality, data-protection, governing law, dispute resolution** consistent with Terms (arbitration/class waiver is in the existing Terms; counsel to align).
15. **Records and audit.** Beema Health may review content and tracking logs; creator keeps copies of disclosures for [12] months.

### 4.5 Required disclosures (creator-facing rules and sample strings)

Must be clear, conspicuous, and in the same location and format as the endorsement:

- **Video:** spoken and on-screen in the first seconds: "Paid partnership with Beema Health. I earn a commission if you become a patient."
- **Caption:** begin with "#ad" or "Paid partner of Beema Health" (not buried in hashtags or after "more").
- **Platform tools:** use Instagram's Paid Partnership label and TikTok's branded-content/commercial-content toggle.
- **Link/bio:** "Affiliate link: I earn a commission."
- **Stories/short video:** disclosure on the screen long enough to read, and also spoken.
- "Clicking 'see more' for disclosure" and generic profile-level disclosure are **not** enough.

Creators must also add, in or near any post that mentions medication or results:
> "Prescription required. A licensed provider decides if treatment is right for you. Compounded medications are not FDA-approved. Individual results vary."

### 4.6 Claim rules (pull exact wording from `docs/features/treatment-pages.md` and `docs/marketing/SEO-AEO-GEO-PLAN.md` section F1.1)

**Allowed:** personal-experience statements the creator can truthfully make, how to start (intake via the tracking link), neutral descriptions approved in the claim library.

**Prohibited:**
- Guaranteed or typical-weight-loss numbers, timeframes, or "melt fat" style claims.
- "Same as Ozempic / Wegovy / Zepbound / Mounjaro," "generic," "cheaper Ozempic."
- Calling compounded products FDA-approved, clinically proven, or safe with "no side effects."
- Dosing, titration, stop/switch advice, or telling people to skip a provider.
- Before/after photos for paid or amplified content; body-shame, "are you overweight?" framing, personal-attribute targeting.
- Price promises not currently published; "as low as" pricing without current terms.
- Impersonating a provider, or stating or implying they are medical professionals.
- Naming LegitScript beyond approved wording; implying endorsement by FDA, Bask, or any regulator.
- Asking followers to DM health information.
- Disparaging competitors.

### 4.7 Monitoring and enforcement (because we are liable for creator claims)

- Weekly scan of every active creator's posts mentioning Beema Health (manual to start; tooling later).
- Violation ladder: edit/remove within 24 hours, strike 1 warning, strike 2 commission hold, strike 3 termination. Immediate termination for serious health-claim or no-disclosure violations.
- Keep a log (creator, post URL, date, issue, action). Screenshot every creator post for the records in 1.4.

### 4.8 Public creator page (`/creators`) copy guardrails

- Keep Trava's eligibility style, but use 5,000 followers (TikTok or Instagram).
- **Do not** promise earnings or use "high earning" language. Required disclaimer: "Earnings are not guaranteed. Compensation depends on the program terms and on actual, eligible new patients, and many creators earn nothing."
- State: "Beema Health may limit or exclude certain states."
- State: "Creators never receive patient information."
- Link to the public Creator Program Terms and the FTC disclosure requirements.
- Application is `noindex`; landing page is indexable.

### 4.9 Payout operations

- Tracking via the affiliate platform Bask supports (confirm: Everflow, GrowSurf, or other).
- Payout only after the patient's first paid order clears and the refund window passes; reverse on refund/chargeback.
- Tax: W-9 on file before first payout; 1099-NEC when annual payments reach the IRS threshold.
- Reporting to creators: anonymous counts and payout dollars only. No patient identifiers, medications, or states of residence.

---

## 5. Where the language shows up: emails and UI strings

### 5.1 Email footers (CAN-SPAM-aligned: physical address, unsubscribe, clear sender)

**Marketing/lifecycle emails that include the referral CTA:**
> "Refer a friend: you each get a $[50] credit toward your own Beema Health care after their first paid order. Credits have no cash value and terms apply: [Referral Terms]. Beema Health LLC, [physical address]. [Unsubscribe]."

**Transactional emails (order, shipping):** do not add program promotion; if Matt wants it, add a one-line neutral link ("Refer a friend") so the message stays primarily transactional, and have counsel review.

**Story program email (invite and approval):**
> "Sharing your story is optional and does not affect your care. If you share, you will receive a $100 credit toward your own Beema Health care. We disclose this credit whenever we show your story. [Story Program Terms]."

**Creator emails:**
> "You are a paid partner of Beema Health. You must disclose that relationship clearly in every post. Never share or ask for health information. See the Creator Program Terms: [link]."

### 5.2 Inline UI strings

| Place | String |
|-------|--------|
| Referral landing and share modal | The 3.5 notice |
| Friend checkout (code present) | "A friend shared this link. You and they each get a $[50] credit after your first paid order." + the 3.4 consent checkbox |
| Story program landing | "Compensated: $100 credit for approved submissions. Any honest experience is welcome." |
| Published testimonial | 2.8 strings |
| Creator application | "By applying you agree to the Creator Program Terms and to disclose your relationship in every post." |

---

## 6. Draft legal text to add to existing legal pages

All drafts. Section numbers refer to current `legal.terms.tsx` titles; actual numbering is generated, so insert by title.

### 6.1 `legal.terms.tsx`: "Prices, promotions, and product availability" (add)

> "Credits and rewards. Beema Health may offer referral credits, story-program credits, or other account credits ('Credits'). Credits apply only to the account holder's own future Beema Health charges, have no cash value, cannot be sold, transferred, or exchanged for cash, may expire, may not be combined with other offers unless stated, and may be limited, adjusted, or cancelled for fraud, abuse, or violation of program terms. Credits are not payment for medical services and are not tied to any particular medication, dose, or plan. If an order is refunded or cancelled, associated unredeemed Credits may be forfeited as stated in the applicable program terms."

### 6.2 `legal.terms.tsx`: new section "Referral, story, and creator programs"

> "Beema Health may offer optional programs under separate terms: the Referral Program, the Story Program, and the Creator Program (each a 'Program'). Participation is voluntary and does not affect your care, eligibility for treatment, or prices. Providers, pharmacies, and other Care Partners do not receive compensation for referring patients to, or for participation in, any Program. Rewards are not conditioned on any clinical decision. Beema Health will not tell a referrer or creator who became a patient or share health information with them. If you participate, you agree to the applicable Program terms, which may be updated. Beema Health may exclude states or individuals from any Program."

### 6.3 `legal.terms.tsx`: "User submissions and feedback" (add carve-out)

> "Stories, videos, and testimonials submitted through the Story Program are governed by the Story Program Terms and your signed Authorization and Media Release, not by this section. We will not use your health information or likeness for marketing without that signed authorization, and you may revoke it as described there."

### 6.4 New page `/legal/story-program-terms` (outline)

Eligibility; one reward per patient per 12 months; no sentiment conditioning; approval criteria (technical and compliance, never positive/negative); reward timing and expiry; compensation disclosure; content restrictions (2.5/2.6); authorization incorporated; revocation and takedown (2.10); license scope; modification/termination; state exclusions; dispute resolution per Terms.

### 6.5 New page `/legal/referral-terms` (outline)

Eligibility and exclusions (3.2); reward and cap; flat and drug-independent; first-paid-order trigger and refund window; no cash value; expiry; no coupon sites or public posting; fraud and self-referral; share-only-by-yourself rule and no contact import; no sharing of patient status; consent checkbox; Programs may exclude states; changes/termination; link to full Terms.

### 6.6 New page `/legal/creator-program-terms` (outline, public summary)

Eligibility (5,000+ TikTok or Instagram, 18+, US, excluded professions); compensation model and disclaimers (4.8); disclosure requirements (4.5); claim rules (4.6); monitoring and enforcement (4.7); payout/tax (4.9); no patient information provided; state exclusions; termination; indemnity; link to the signed Creator Agreement.

### 6.7 `legal.telehealth-consent.tsx` (one acknowledgment)

> "I understand that my treatment, prices, and eligibility do not depend on participating in any Beema Health referral, story, or creator program. My Provider does not receive compensation for referring patients or for any program and makes clinical decisions independently."

### 6.8 `legal.privacy.tsx` (additions by existing section title)

- **Information We Collect:** "If you join the Referral, Story, or Creator Program, we collect program data such as your referral link, credit balance, video submissions, signed authorization, contact and payout details, and tax information (creators)."
- **Consumer Health Data:** "A story you choose to submit may reveal health information. We process it only under your signed authorization and, where state law requires, a separate consent. You can revoke at any time." (Flag for counsel: Washington My Health My Data Act and similar state health-data laws may require extra consent for collecting or sharing health-related data for marketing. This was **not** researched here and must be verified.)
- **How We Disclose Information:** "We use service providers to run these programs (for example, referral and affiliate tracking and payments). We do not give referrers or creators information about who became a patient. We do not give health information to referral or affiliate platforms."
- **Sale, Sharing, and Targeted Advertising:** confirm affiliate tracking cookies/pixels are described and that no health data flows to ad platforms from program pages.
- **Email, Telephone, and SMS Communications:** note that referral reminders are sent by email or, with marketing SMS consent, by text, and that we never text or email your friends for you.
- **Pricing, Promotions, and Advertisements:** same text as 6.1.

### 6.9 `legal.hipaa.tsx`

Add: "We do not use or disclose your protected health information for marketing, including testimonials, without your written authorization. Authorizations can be revoked at any time."

---

## 7. Questions to ask the Bask team

1. Which entity is the covered entity for patient-submitted videos and for referral/credit data? Where are signed authorizations and video files stored, and under whose BAA?
2. Do Bask's provider-network and pharmacy agreements restrict compensating third parties (patients or creators) for referrals or testimonials, including credits?
3. Can Bask apply program credits programmatically (flat $ amount, expiry, one-time, no stacking) and tie them to the referrer's own account?
4. How do GrowSurf and other affiliate tools connect to Bask orders? Exactly what data do they receive, do they receive any health information, who holds the BAA, and can they email/text referred friends?
5. How does Bask handle refunds and chargebacks relative to credits and affiliate payouts (clawbacks)?
6. Does Bask or the provider network require review/approval of creator or testimonial content, program terms, or ads that mention programs?
7. Who issues 1099s and runs payouts for creators, and can payouts be flat-fee or tiered by plan without exposing patient identity?
8. Does Bask restrict marketing to or from specific states, and does the physician network have state-by-state restrictions?
9. Can Bask suppress program attribution and commissions by the patient's state (restricted-state switch)?
10. What is LegitScript's stance on patient incentives, testimonials, and affiliate programs? (Ask LegitScript directly too. The certification depends on Standards 8 and 9.)
11. Is the "Open Payment Notice" relevant to our arrangement (do any Care Partner clinicians receive manufacturer payments)?

---

## 8. State-law and counsel questions (carried from research)

Pending: no lawyer yet. These are the items counsel (or a diligent state-by-state pass) must answer before enabling commissions:

1. Which states' patient-brokering, anti-kickback, or fee-splitting laws reach commissions, bounties, or credits for referring cash-pay patients? (Examples found: Florida 817.505, California B&P 650, Texas Occ. Code 102.001, Illinois Medical Practice Act, New York fee-splitting rules. List is **not** exhaustive.)
2. Do any state medical boards treat per-patient payments to unlicensed marketers or influencers as fee splitting? (Some sources say yes, others say it depends on structure; sources conflict by state.)
3. State testimonial, advertising, and compounded-drug advertising rules for prescription drugs.
4. State consumer-protection rules for credits, gift cards, rewards, and auto-renewals.
5. State health-data privacy laws that need extra consent for marketing use of health information (Washington MHMDA and similar).
6. Texting laws for referral programs (Washington CEMA and similar).
7. Whether our provider/MSO structure raises corporate-practice-of-medicine issues for paying creators.
8. The practical result: very likely "launch commissions in cleared states only."

Research confidence note: findings came from secondary law-firm and news sources, several of which conflict. The FDA warning-letter waves (30 letters in March 2026, 25 in June 2026) concern equivalence/compounding claims; no source found addressed creator testimonials specifically.

---

## 9. Build plan (after launch gate)

1. `src/lib/growth-programs.ts` (state config, amounts, copy strings in one place) + tests.
2. New legal routes (`legal.referral-terms.tsx`, `legal.story-program-terms.tsx`, `legal.creator-program-terms.tsx`) using the existing `LegalDocument` component; footer links.
3. Edits to `legal.terms.tsx`, `legal.privacy.tsx`, `legal.telehealth-consent.tsx`, `legal.hipaa.tsx` (6.1 to 6.9).
4. Marketing pages `/refer`, `/share-your-story`, `/creators` with `resolveCta()` where intake CTAs apply; applications and uploads **link out** to Bask or the BAA vendor.
5. Analytics: confirm no pixels/events with patient context on program pages; add tests.
6. Email templates in `docs/features/patient-email-campaigns.md` updated with the section 5 footers.
7. Reviewer SOP (story screening, creator monitoring) as internal docs.
8. Update this doc's status and `CLAUDE.md` pointer when each program ships.

---

## 10. Launch gate (all must be true per program)

- [ ] Counsel (or Matt's documented decision with counsel review) approved the compensation structure and restricted-state list.
- [ ] Bask answers received in writing (section 7).
- [ ] Authorization/release language reviewed by counsel (Program A).
- [ ] Storage for videos/authorizations confirmed HIPAA-appropriate (Program A).
- [ ] Referral/affiliate platform data flows confirmed PHI-free (Programs B, C).
- [ ] Share flow verified to send nothing to the friend (Program B).
- [ ] Creator agreement and claim library final; monitoring owner assigned (Program C).
- [ ] All legal pages updated and live **before** any program is announced.
- [ ] No em dashes, no PHI in storage/logs/analytics; `npm test`, `npx tsc --noEmit`, ESLint on changed files clean.

---

## Sources (secondary; verify against primary text)

- Wilson Sonsini, "But We Don't Take Insurance" (2026-04-13): https://www.jdsupra.com/legalnews/but-we-don-t-take-insurance-why-cash-5942358/
- Florida 817.505: https://florida.public.law/statutes/fla._stat._817.505
- FTC Consumer Reviews and Testimonials rule (16 CFR 465): https://www.goodwinlaw.com/en/insights/blogs/2024/08/ftc-publishes-new-rule-banning-fake-reviews-and-testimonials
- FTC Endorsement Guides (2023): https://www.dwt.com/insights/2023/07/ftc-advertising-endorsement-and-testimonial-guides
- Manatt, influencer marketing in healthcare: https://www.manatt.com/insights/newsletters/health-highlights/influencer-and-content-marketing-challenges-and-op
- Washington CEMA and referral texts: https://dailyjournal.com/articles/388539-cema-expands-liability-for-text-based-referral-marketing-in-washington
- HHS HIPAA marketing guidance: https://www.hhs.gov/sites/default/files/ocr/privacy/hipaa/understanding/coveredentities/marketing.pdf
- FDA compounded GLP-1 warning letters (2026): https://www.foley.com/p/102mmr0/glp1-compliance-fda-targets-telehealth-marketing-in-30-new-warning-letters/
- Trava pages reviewed: taketrava.com/terms-conditions, /privacy-policy, /telehealth-consent-open-payment-notice, /testimonies, /influencer-program
