Sourced from Meta's published Advertising Standards and Business Help Center as of 2026-08-16 — re-verify before relying on this for a live application, ad launch, or compliance decision, as Meta updates these pages in place without version history.

# Meta Policy Map — Source Index

Each entry: topic, primary source URL, what it says, verification status.

## Prescription drug advertising (authorization gate)

**Source**: [Drugs and Pharmaceuticals — Transparency Center](https://transparency.meta.com/policies/ad-standards/restricted-goods-services/drugs-pharmaceuticals/)
**Status**: Directly fetched and confirmed 2026-08-16.

- Online pharmacies and telehealth providers must be **"actively certified with LegitScript"** before running prescription drug ads.
- Pharmaceutical manufacturers get a second path: LegitScript certification, *or* Meta's own internal review process (no LegitScript required for that path). Beema is a telehealth provider, not a manufacturer — the LegitScript path is the only one available to it. SKILL.md's framing of this is accurate.
- Geographic scope: ads may only target **United States, Canada, or New Zealand**, and only in countries where the advertiser is certified. Confirmed accurate.
- Age: **"Meta doesn't allow targeting for prescription drugs to people under the age of 18."** Confirmed accurate.
- Permitted claims: ads may share information on **medical efficacy, accessibility, and affordability** of treatments, and must include a disclaimer to consult a licensed health professional or obtain a valid prescription. Matches SKILL.md's "medical efficacy, affordability, and accessibility" framing.
- Educational exemption: advertisers **don't need written authorization** to run ads that educate, advocate, or serve as public service announcements about prescription drugs, **or to promote telehealth services generally**. That last clause (telehealth services generally) is a refinement SKILL.md doesn't currently state explicitly — worth adding: Beema can likely run general "what is telehealth weight management" education/PSA content, and even non-prescription-specific telehealth service promotion, without authorization, as long as it doesn't cross into promoting delivery/dispensing of a specific prescription drug.

## Personal Attributes (privacy violations)

**Source**: [Privacy Violations and Personal Attributes — Transparency Center](https://transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes)
**Status**: Directly fetched and confirmed 2026-08-16.

- Full protected list: race, ethnicity, religion, beliefs, age, sexual orientation or practices, gender identity, disability, **physical or mental health (including medical conditions)**, vulnerable financial status, voting status, trade union membership, criminal record, or name.
- Prohibited: sharing or asking for personal attributes of a user or their family; implying the advertiser knows someone's attributes; "you/your" language *when it references a protected attribute*.
- Permitted: broad, non-personal references (e.g., "American," "New Yorker"); passing reference to gender or age ranges; "you/your" language *not* tied to a protected attribute; public health announcements that don't assert the viewer has the condition; celebrities/fictional characters in creative.
- Official worked examples (verbatim from Meta): **Permitted** — "Meet seniors," "Find black singles today," "Bulimia counseling available." **Prohibited** — "Meet other seniors," "Are you gay?," "Depression getting you down? Get help now." These are the canonical calibration examples — use them over invented ones when explaining the line to Matt/Charlie.

## Health and Wellness

**Source**: [Health and Wellness — Transparency Center](https://transparency.meta.com/policies/ad-standards/restricted-goods-services/health-wellness/)
**Status**: Directly fetched 2026-08-16. **Material discrepancy found vs. SKILL.md — see below.**

- Confirmed current text: ads promoting weight-loss/gain products or services must not contain "statements of inferiority about physical appearance" and must not depict a "close up on specific body area by pinching fat."
- Confirmed: ads promoting weight loss/gain or cosmetic procedures must be **targeted to people 18 or older**. This is a separate 18+ gate from the prescription-drug 18+ gate — both apply to Beema's core GLP-1 weight-loss creative.
- **Discrepancy — enforcement model changed July 22, 2026** (before this doc's verification date, so this is current, not stale): Meta rewrote Health & Wellness Advertising Standards from **product-based to claims-based enforcement**. Under the old model, before/after transformation imagery for weight-loss products was essentially auto-rejected regardless of what the ad claimed. Under the new model, **before/after imagery is no longer auto-rejected** for weight-loss/cosmetic ads (18+ targeted) — review now looks at whether the *claims* made are compliant (no promised specific outcome/timeframe without disclaimer, no sensational/exaggerated language), not at the mere presence of the imagery format. Pinched-fat close-ups, sensational health claims, and similar remain banned outright regardless of claims framing.
- **What this means for SKILL.md**: the line "Before/after transformation framing is restricted for weight-loss products... all high-rejection" is now stale/overstated as a blanket rule. It's more accurate to say before/after framing is *higher-risk and claims-dependent* — it survives review if the surrounding copy makes no unsubstantiated outcome/timeframe claim, and still fails if it does (or if it's a pinched-fat/tape-measure/problem-area shot, which are separately and unconditionally banned). Recommend updating that bullet; low-severity, not urgent, but should say "claims-dependent, not auto-rejected as of the July 2026 policy rewrite" rather than "high-rejection."
- Enforcement rollout note (secondary/industry sourcing, not Meta's own text — labeled as such): agency reporting describes several weeks of inconsistent automated enforcement following the July 22 rewrite, with advice to appeal incorrect rejections rather than assume a rejected ad is definitely non-compliant during that window.

## Business Tools / sensitive data (pixel, Conversions API)

**Source**: multiple secondary/industry sources (Freshpaint, Stape, Tealium, Penrod, sagapixel) describing Meta's Restricted Data Use policy for health & wellness advertisers; Meta's own Business Tools Terms are the underlying primary source but were not directly fetched in this pass — **treat the specifics below as industry-reported, not verbatim Meta policy text, and re-verify against Meta's Business Tools Terms and Business Help Center before relying on exact funnel-stage cutoffs.**

- Meta began restricting custom audiences and custom conversions built from data that suggests health conditions or financial status, with a rollout beginning **September 2, 2025**.
- Restriction tiers are reported to vary by advertiser categorization and region: US/Canada advertisers in restricted categories reportedly lose the ability to optimize toward lead-gen and sales-level events (mid/lower-funnel), while upper-funnel events (PageView, ViewContent, Landing Page View) remain usable; EU advertisers reportedly face a stricter cutoff on web-activity-based optimization generally.
- Reported terminology note: the mechanism industry sources describe is generally called **"Restricted Data Use"** and operates through account/domain-level categorization, not a feature literally labeled "Events Manager data-source classification" in Meta's UI. SKILL.md's framing (a domain-level classification, evaluated separately from ad content, independent of whether ads pass creative review) is **conceptually accurate** and a reasonable way to explain the mechanism to Matt/Charlie, but the exact product surface/terminology should be re-verified against Meta's current Business Help Center and Events Manager UI before it's stated as precise Meta terminology in front of the user.
- Consistent across sources: Conversions API does **not** bypass these restrictions — server-side events are subject to the same sensitive-data rules as the pixel. Custom event names that themselves reveal a health condition, treatment, or appointment intent (e.g. naming a custom event after a diagnosis or medication) are flagged as risk factors across every source reviewed.

## Ad review standard (implication vs. intent)

**Status**: Not independently verified against a single Meta policy statement in this pass; this is the framing already in SKILL.md and is broadly consistent with how Meta describes automated review across its Advertising Standards intro pages (misleading-content and personal-attributes enforcement both key off what a "reasonable person" would perceive from the ad, not the advertiser's stated intent). Re-verify against [Introduction to the Advertising Standards](https://transparency.meta.com/policies/ad-standards/) if this framing needs to be quoted precisely.
