Sourced from Meta's published Advertising Standards and Business Help Center as of 2026-08-16 — re-verify before relying on this for a live application, ad launch, or compliance decision, as Meta updates these pages in place without version history.

# Meta Creative Rules — Rewrite Patterns for GLP-1 / Weight-Loss Copy

Labels used below: **[Meta policy text]** = directly documented in Meta's Transparency Center (fetched 2026-08-16, see `policy-map.md` for exact source). **[pattern]** = inferred/observed guidance — how enforcement commonly behaves per agency/community reporting, not verbatim Meta policy. Don't present a `[pattern]` line to Matt/Charlie as if it were `[Meta policy text]`.

## Personal Attributes — worked examples

**[Meta policy text]** Meta's own canonical examples, verbatim from the Privacy Violations and Personal Attributes standard:

| Status | Example |
|---|---|
| Permitted | "Meet seniors" |
| Prohibited | "Meet other seniors" |
| Permitted | "Find black singles today" |
| Prohibited | "Are you gay?" |
| Permitted | "Bulimia counseling available" |
| Prohibited | "Depression getting you down? Get help now" |

The pattern in Meta's own examples: naming the *service* is fine ("counseling available," "seniors" as an audience descriptor in third person); asking or asserting something *about the reader* ("are you," "getting you down," "other" implying the reader already belongs to that group) is what triggers it.

**[pattern] GLP-1/weight-loss-specific extensions**, built on that same test, read the line without the product name and ask whether it describes the offering or profiles the reader:

| Rejected (asserts/implies a personal attribute) | Compliant reframe |
|---|---|
| "Struggling with your weight?" | "Medical weight management, provider-reviewed." |
| "Your BMI may qualify you for GLP-1 treatment." | "GLP-1 treatment options are available for eligible patients." |
| "Lose your belly fat with semaglutide." | "Semaglutide is one of the treatments providers may prescribe." |
| "Tired of diets that don't work for you?" | "A different approach to weight management." |
| "Help your spouse get treated." | "Treatment options for adults seeking weight management support." |
| "Is your weight affecting your health?" | "Weight management support, from consult to prescription." |
| "Finally, GLP-1 for people like you." | "GLP-1 treatment, prescribed by licensed providers." |
| "Obesity doesn't have to define you." | "A provider-led approach to obesity treatment." |
| Image text: "Are you overweight?" over a photo | Image text: "Medical weight management program" over the same photo |

**[Meta policy text]** Explicitly fine regardless of the above: broad demographic references ("American," "New Yorker"), passing references to gender or age ranges, "you/your" language *not* tied to a protected attribute ("Find a licensed provider near you," "Your appointment is confirmed"), and public-health-style announcements that don't assert the viewer personally has the condition.

## Health and Wellness — before/after, body imagery, self-perception

**[Meta policy text]**, confirmed current 2026-08-16:

- Weight-loss/gain ads must not contain "statements of inferiority about physical appearance."
- Weight-loss/gain ads must not depict a "close up on specific body area by pinching fat" — this is banned outright, not claims-dependent.
- Weight-loss/gain and cosmetic-procedure ads must target **18+ only**.

**Policy shift as of July 22, 2026** (before this doc's verification date — current, not stale): Health & Wellness enforcement moved from *product-based* (certain formats auto-rejected regardless of copy) to *claims-based* (the imagery survives or fails based on what the surrounding claims say). Concretely: **before/after transformation imagery for weight-loss ads is no longer auto-rejected** the way it used to be. It now lives or dies on the claim attached to it.

| Format | Outcome under current (claims-based) review | Why |
|---|---|---|
| Before/after photo pair, no caption implying a guaranteed/specific result, targeted 18+ | Likely survives | No violative claim attached; format alone is no longer auto-rejected |
| Before/after photo pair + "Lose 20% of your body weight in 3 months" | **[pattern]** Rejected | Specific outcome + timeframe, no disclaimer — a claims violation, separate from the before/after format itself |
| Before/after photo pair + testimonial framed around the *service experience* ("My provider found the right dose for me") | **[pattern]** More likely to survive | No outcome/timeframe promise; still needs FTC/FDA substantiation and typicality disclosure independent of Meta |
| Close-up, pinching a fold of fat | **[Meta policy text]** Rejected regardless of claim | Named and banned outright, not subject to the claims-based carve-out |
| Tape measure around the body | **[pattern]** High-rejection | Consistently named across agency reporting as a self-perception/body-shame trigger; treat as a bright line even without a direct quote for this exact prop |
| Headline: "Don't let your weight hold you back any longer" | **[pattern]** High-rejection | Reads as a statement of inferiority about appearance layered onto a personal-attribute assertion |
| Headline: "A weight management program built around your provider visits" | **[pattern]** Lower risk | Service-focused, no inferiority framing, no personal-attribute assertion |

**Practical guidance for Beema**: before/after is no longer a hard no, but it is not a green light either — it inherits whatever risk the surrounding copy carries. Given Beema's copy otherwise leans on provider-reviewed, no-guarantee language anyway (see the legitscript-compliance skill's Standard 8 transparency rules and the FTC/FDA substantiation requirement noted below), the safer default is still to lead with the clinical/consultation process and pricing transparency rather than transformation imagery — not because the format is banned, but because it raises the bar on every other line in the ad needing to be claims-clean.

## Misleading claims — Meta's stated review standard

**[pattern, consistent with Meta's general Advertising Standards framing but not independently re-quoted in this pass]**: Meta's automated review evaluates the ad as a reasonable viewer would encounter it — if it would create false expectations, it's rejected regardless of the advertiser's intent. Recurring failure modes for GLP-1 copy specifically:

- Outcome claims stating or implying a specific result that isn't typical or guaranteed ("lose 20% of your body weight")
- Unsubstantiated statistics ("9 out of 10 patients…")
- Conflating compounded semaglutide/tirzepatide with the FDA-approved branded products, or implying equivalent approval status
- Using brand names (Ozempic, Wegovy, Mounjaro, Zepbound) in ways that imply Beema dispenses or is affiliated with them
- Implying prescription or approval is automatic, fast, or guaranteed

None of these five are quoted verbatim from a single Meta policy page in this pass — they're the practical failure modes implied by combining the Health and Wellness standard, the Drugs and Pharmaceuticals standard's disclaimer requirement, and general misleading-content enforcement. Re-verify against [Introduction to the Advertising Standards](https://transparency.meta.com/policies/ad-standards/) before citing any of these as a named, quotable Meta rule.

## FTC/FDA overlap reminder

Meta clearing a testimonial or before/after pair does not make it FTC-compliant, and vice versa — both regimes apply independently. A testimonial used in Meta creative still needs typicality context ("results not typical" or the actual typical range) and substantiation under FTC endorsement guidance, regardless of what Meta's ad review allows through.
