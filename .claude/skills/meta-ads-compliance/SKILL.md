---
name: meta-ads-compliance
description: Meta (Facebook/Instagram) advertising policy for Beema Health — the Prescription Drug Ads authorization path (active LegitScript certification plus Meta approval under Business Settings, Authorizations and Verifications), picking the right classification, country and 18+ limits, the Personal Attributes rule that rejects most health copy, the Health and Wellness rules banning before/after and body-shame framing in weight-loss ads, and the separate Events Manager data-source classification that suppresses pixel conversions independently of ad approval. Use whenever Matt or Charlie mention Meta, Facebook, Instagram, Advantage+, Meta ad copy or creative, an ad rejection or account restriction, the pixel/Conversions API/Events Manager, prescription drug authorization, or ask "will Meta approve this" / "why was this rejected". Also use before writing any GLP-1 or weight-loss social creative. Pair with legitscript-compliance for certification status itself.
---

# Meta Ads Compliance for Beema Health

Reference and creative-review skill. Meta is the harder of the two major platforms for GLP-1 telehealth: the authorization gate is narrower than Google's, the creative rules cut directly against how weight-loss marketing is normally written, and enforcement is heavily automated and evaluates *implication*, not intent.

Verified against Meta's Transparency Center and Business Help Center, Aug 2026. Meta updates these standards in place without version history — re-check live before committing spend. Sources in `references/policy-map.md`; creative rewrite patterns in `references/creative-rules.md`.

## Three independent layers (the thing most people get wrong)

Meta runs three separate systems that can each block Beema, and fixing one does not fix another:

1. **Community Standards** — platform-wide content rules, applies to organic and paid.
2. **Advertising Standards** — paid eligibility and creative rules, evaluated in Ads Manager. A rejection message names which standard was triggered.
3. **Data-source classification** — evaluated in Events Manager, on the *domain*. Meta can classify beemahealth.com as health-related and suppress conversion events from it while ads still deliver clicks normally.

An ad can pass review while the pixel is silently restricted, and vice versa. When Matt or Charlie say "Meta broke," the first question is *which interface is showing the problem* — Ads Manager or Events Manager. Rewriting creative will never restore suppressed events, and cleaning up event data will never un-reject an ad.

## The authorization gate

**Prescription drug advertising on Meta requires prior written permission.** There is no test-and-see path.

For telehealth, LegitScript is the only route. Meta requires online pharmacies and telehealth providers to be **actively certified with LegitScript**, then to request authorization from Meta. (Pharmaceutical manufacturers have an alternate path through Meta's internal review that doesn't require LegitScript — not Beema's path.)

Sequence:

1. **Hold active LegitScript certification.** No active certification → no Meta application. If certification lapses, Meta revokes the authorization. Treat renewal as an ad-account availability dependency, not a back-office chore. See [[legitscript-compliance]].
2. **Confirm the primary classification** on the LegitScript Public Verification Link — Online Pharmacy, Telemedicine, or Pharmaceutical Manufacturer. Meta's form asks you to select one, and it must match what LegitScript actually certified. Beema's model (connecting patients to providers and contracted pharmacies, not dispensing) points at **Telemedicine** — verify, don't assume.
3. **Apply in Meta.** Business Settings or Ad Account Settings → **Authorizations and Verifications** → **Prescription Drug Ads**. Supply the business name, the specific ad accounts, and the **certified website URL — not the Public Verification Link.** These two URLs get swapped constantly and it stalls applications.
4. **Only run where certified.** Certification and authorization are per-country.

**Country scope is narrow**: Meta permits prescription drug advertising in the **United States, Canada, and New Zealand** only. Advertisers must be certified in each country they target and must show evidence they're appropriately licensed or otherwise lawful in those countries.

**Age**: no prescription drug or online pharmacy targeting to people under 18. Weight-loss products and services are separately restricted to 18+.

**What authorization buys**: the ability to promote the delivery, distribution, or dispensing of prescription drugs to 18+ audiences — but only in the context of **medical efficacy, affordability, and accessibility**. That framing is the permitted lane; it is not a general license to advertise a drug however you like.

**What doesn't need authorization**: ads that educate, advocate, or serve as public service announcements about prescription drugs. This is a real strategic option — Beema can run educational GLP-1 content pre-authorization, provided the creative genuinely educates rather than functioning as a disguised product ad. Don't oversell this as a loophole; a "PSA" that ends in a signup CTA for a prescription service will be read as a product ad.

## Personal Attributes — the rule that rejects the most copy

Meta's Advertising Standards prohibit content that asserts or implies personal attributes, including **direct or indirect** assertions or implications about physical or mental health, including medical conditions. It also prohibits implying knowledge of a user's or their family's medical information.

The test: **read the sentence without the product name. Does it describe what Beema offers, or does it tell the reader something about themselves?**

| Rejected | Compliant reframe |
|---|---|
| "Struggling with your weight?" | "Medical weight management, provider-reviewed." |
| "Your BMI may qualify you for GLP-1 treatment." | "GLP-1 treatment options are available for eligible patients." |
| "Lose your belly fat with semaglutide." | "Semaglutide is one of the treatments providers may prescribe." |
| "Tired of diets that don't work for you?" | "A different approach to weight management." |
| "Help your spouse get treated." | "Treatment options for adults seeking weight management support." |

"You" is not itself banned — Meta explicitly permits you/your language *without* a personal attribute, passing references to gender or age ranges, and broad references like where someone lives. "Find a licensed provider near you" is fine. "Your weight is holding you back" is not.

Enforcement in 2025–2026 has moved toward catching indirect implication, so soft phrasings that obviously mean *you* still get caught. Imagery counts too: a photo showing someone with visible signs of a condition next to "relief is possible" reads as an implied assertion about the viewer.

## Health and Wellness creative rules

Weight-loss products and services are restricted from targeting under-18s, and the content rules are strict in ways that collide head-on with standard GLP-1 creative:

- **No negative self-perception.** Meta prohibits content that implies or attempts to generate negative self-perception in order to promote diet, weight loss, or other health-related products. No shame framing, no "don't be embarrassed," no exploiting insecurity.
- **No idealized bodies.** Ads shouldn't highlight a specific body or figure as desirable or idealized.
- **No statements of inferiority about appearance** — terms, descriptions, or questions that attack someone's appearance, specific body parts, or hygiene.
- **Before/after transformation framing** — Meta rewrote this enforcement from product-based to claims-based on July 22, 2026: before/after imagery for weight-loss ads is no longer auto-rejected on its own, it now survives or fails based on the claims attached to it. Tape-measures-around-a-body and pinching-fat close-ups remain banned outright regardless of claims. Treat before/after as claims-dependent, not a hard ban — see `references/creative-rules.md`.

What works instead: neutral demonstration, the clinical/consultation process, provider credentials, pricing transparency, access and convenience, and testimonials framed around the *service experience* rather than body transformation. Realistic, non-ideal depictions of ordinary people are fine.

Note the collision with FTC/FDA substantiation rules: testimonials that do get used still need typicality context and substantiation. Meta permitting a testimonial does not make it FTC-compliant, and vice versa. Both apply.

## Misleading claims

Meta's automated review evaluates the ad as a user would encounter it — if it would create false expectations in a reasonable user, it's rejected regardless of intent. The recurring failure modes for this category:

- outcome claims stating or implying a specific result that isn't typical or guaranteed ("lose 20% of your body weight")
- unsubstantiated statistics ("9 out of 10 patients…")
- conflating compounded semaglutide/tirzepatide with the FDA-approved branded products, or implying equivalent approval status
- using brand names (Ozempic, Wegovy, Mounjaro, Zepbound) in ways that imply Beema dispenses or is affiliated with them
- implying prescription or approval is automatic, fast, or guaranteed — which is also LegitScript Standard 7

## Pixel, Conversions API, and PHI

Beema's standing architecture rule already says the marketing site keeps PHI out of analytics, pixels, webhooks, and URLs. Meta's requirements sit on top of that:

- Never send health-condition signals, intake answers, eligibility results, or anything resembling a diagnosis through the pixel or CAPI. Meta's Business Tools terms prohibit sending sensitive health data, and doing so risks both a business-tools enforcement action and a HIPAA-adjacent problem depending on what's collected.
- Event names matter. A custom event named `glp1_eligible` or `qualified_semaglutide` is itself a health signal. Name events for the funnel action, not the medical inference.
- The handoff to Bask's portal is the natural PHI boundary. Conversion tracking should stop at, or be defined by, actions on Beema's own domain. Anything that would require reading state out of Bask's system is a request to Bask, not something Beema builds.
- Data-source classification is domain-level and independent of ad approval. If events start getting suppressed, check Events Manager, not the ad.

## Reviewing a Meta ad before it ships

1. **Authorization** — is it in place, active, and does the country targeting sit inside US/CA/NZ and inside where Beema is certified?
2. **Age** — 18+ enforced?
3. **Personal attributes** — run the sentence test on every line, including the primary text, headline, description, and any on-image text.
4. **Health and wellness** — any shame framing, idealized body, before/after, tape measure, problem-area closeup?
5. **Claims** — every outcome, statistic, and timeframe substantiated? Any compounded-vs-branded conflation?
6. **Sequencing** — does anything imply medication precedes provider evaluation?
7. **Landing page** — the destination is reviewed too. State-availability disclosure present, pricing clear, no PHI collection, honest about the Bask handoff.
8. **Seal** — the LegitScript seal does **not** belong in ad creative. It's licensed for the certified site only. See [[legitscript-compliance]].

## When answering a question with this skill

- Separate **documented Meta policy** from **observed enforcement behavior** from **inference**. Meta's published standards are thinner than its actual enforcement, so a lot of practical guidance here is pattern, not published rule — say which is which rather than presenting agency-blog folklore as policy.
- Rejections name a standard. Ask for the exact rejection text before theorizing; it's the highest-signal input available.
- Don't propose circumvention. Apparent circumvention of a platform's ad policy is independently grounds for LegitScript denial or revocation under Standard 9 — so a clever workaround risks the certification that makes the whole channel possible.
- Google questions go to [[google-ads-compliance]]; certification status, entity, and domain coverage go to [[legitscript-compliance]].
