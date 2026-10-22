---
name: landing-page-clarity
description: Framework for writing and reviewing the first screen of Beema Health landing pages and CRO variants so a visitor instantly knows what the product is, what it will do for them, and why to act now. Covers the 3-second test, the 40-character title formula, 300-character benefit-led lead copy (80/20 rule), urgency rules, and the product photo mix (clarity shots, lifestyle, infographics). Use whenever Matt asks to write, redesign, score, or critique a landing page, hero, H1, product description, or product imagery, or when creating a new CRO variant.
---

# Landing page clarity

Source: a TikTok breakdown Matt liked, adapted to Beema Health. This is
**part one: clarity**. A visitor decides in about 3 seconds. Part two is
**confidence** ("can I trust this brand?"), which is the social proof, trust,
and credentials work. A page needs both, in that order.

Read `AGENTS.md`, `CLAUDE.md`, and the `cro-variant-editing` skill too. Their
rules win. Everything below must also pass `legitscript-compliance`,
`google-ads-compliance`, and `meta-ads-compliance`.

## The 3-second test

Within 3 seconds of landing, on a phone, without scrolling, the visitor must be
able to answer:

1. **What is this product?**
2. **What is it going to do for me?**
3. **Why should I act right now?**

Score every hero and variant against these three, in writing, before and after
an edit. "Mostly" and "partly" are honest scores; say them. Most of the
first-screen real estate is three things: the **title (H1)**, the **description
(lead copy)**, and the **photos**.

## 1. Titles: category + benefit + context, 40 characters or fewer

Branded or version-number titles ("Ultra Boost 3000", "Starter Kit 2.0") are
useless to humans, to Google, and to AI answer engines. A title has three boxes:

| Box | Meaning | Example |
|---|---|---|
| Category | What the product is | GLP-1 weight-loss care |
| Benefit | What it does for them | (weight-loss support) |
| Context | Where, how often, or who it is for | in Houston, online, daily, adults |

- Keep the whole title at **40 characters or fewer**. Count it. Reference:
  the original example "Daily energy and gut health supplement" is 36
  (category supplement, benefit energy and gut health, context daily).
- For Beema Health: "Online GLP-1 weight-loss care in Houston" is exactly 40.
  "Houston online GLP-1 weight-loss care" is 37.
- The H1 is the title. It should contain the searchable category and the
  market. Do not spend it on a slogan or a brand flourish.
- Put the extra promise ("from home", "shipped to your door") in the lead copy,
  not the title.
- One H1 per page. Keep the `<title>` and meta description in the route's
  shared head (`glp1Head`), not in a variant.

## 2. Descriptions: about 300 characters, 80% benefit, 20% feature

Nobody reads 800 words on a first screen. Write a punchy lead of roughly
**300 characters**.

- **80/20 rule:** 80% benefits, 20% features. A feature describes the product;
  a benefit speaks to an outcome and an emotion. Every feature must be
  translated into a benefit or cut as noise.
- **Open with urgency:** a problem, an agitation, or the cost of inaction, so
  the reader feels "I need to deal with this now". Then the benefit, then one
  feature as proof.
- Write for the emotion: feeling in control, being supported, not doing it
  alone, finally having a plan. Not for the mechanism.
- Keep sentences short. No jargon the visitor did not use to search.

### Compliance guardrails on benefit and urgency copy

These are non-negotiable and they limit the framework:

- **No results claims.** No weight-loss numbers, timelines ("lose 20 lbs in 8
  weeks"), testimonials stating results, or before/after framing. Google and
  Meta restrict it; Meta bans body-shame and before/after in weight-loss ads.
- **Never guarantee a prescription.** Say prescribing is up to a licensed
  provider. Completing intake does not guarantee anything.
- **Outcome-adjacent benefit language is fine**: "medical support for your
  weight-loss goals", "a licensed provider builds your plan", "no waiting
  room". Outcome promises are not.
- **No fake urgency.** No countdown timers that reset, no invented scarcity
  ("only 3 spots left"), no fabricated social proof or counts. It is deceptive
  and it risks ad-account bans. Urgency must be **true**:
  - a real, dated promotion (confirm terms and expiry with Matt first),
  - the real cost of waiting ("every month you wait is another month without
    a plan", stated without shame or fear),
  - the low-friction start ("no payment required to start", a few minutes),
  - real price anchors from `src/lib/medication-pricing.ts`.
- Cash-pay, compounded-medication, and LegitScript wording follow the
  compliance skills. "Beema Health" always, never bare "Beema". No em dashes.
- Pricing must come from `src/lib/medication-pricing.ts`. Never hardcode
  prices in copy.

## 3. Photos: 5 minimum, 10 ideal, in three kinds

The finish matters most. Aim for a mix of:

1. **Clarity (product) shots.** Standalone, clean, isolated, distraction-free.
   The buyer gets instant clarity on what is being bought. This is the shot Matt
   wants most. For Beema Health these are the vial and syringe images from
   `resolveVialImagery(...)`. Show them large, uncluttered, above or beside the
   H1, with no text over them.
2. **Lifestyle shots.** The product in the hands or life of the ideal
   customer, so the visitor can picture owning it.
3. **Infographics.** A product image with a **benefit callout baked in**. Most
   Amazon listings have them and most brands skip them. Examples for us: an
   "everything included in one monthly price" graphic (provider care,
   medication, supplies, shipping), a 3-step "intake, provider review, shipped"
   graphic, a "what happens after you start" timeline. These can be built in
   code (SVG/HTML) so they stay crisp and indexable, and so prices stay in sync.

### Photo rules specific to Beema Health

- **Never fabricate lifestyle imagery of "patients".** No AI-generated or
  stock people presented as Beema Health patients. It reads as deceptive on a
  health ad and can fail LegitScript and Meta review. Lifestyle shots require
  real people with signed releases. Until we have them, the real patient video
  (YouTube, `ZRzKvDBRjYs` on glp-1-houston) is the only human content.
- Physician headshots (Arora Health) must never appear next to pricing, CTAs,
  testimonials, or in ads. See `src/lib/medical-team.ts` for the license rules.
- Every image: descriptive alt text, explicit `width` and `height`, the LCP
  image gets `fetchPriority="high"` and is never wrapped in an animation that
  starts at opacity 0 (see `docs/features/treatment-pages.md`).
- Mobile first. Most traffic is phone. The primary CTA and the product shot
  should both be visible without scrolling on a typical phone.

## Design principles that go with it

- No decorative "eyebrow" pill tags above every section title. They read as
  AI-generated. Use plain headings.
- Plain, flat backgrounds over mesh gradients and floating shapes on the hero.
- One primary CTA per screen, full width on mobile, repeated after each major
  proof section. No fixed bottom bars (Matt removed it).
- Do not make trust badges (like the Google rating) clickable unless asked.
- LegitScript is not a visitor-facing hook on landing pages. Most people do not
  know what it is. Keep it off the page body unless Matt asks.

## Review checklist (copy into your answer when scoring a page)

```
3-second test        what it is [ ]   what it does for me [ ]   why now [ ]
Title                category [ ] benefit [ ] context [ ]   <= 40 chars [ ]   count: __
Lead copy            ~300 chars [ ]   80% benefit [ ]   opens with real urgency [ ]
Photos               clarity shot [ ] lifestyle (real only) [ ] infographic [ ]   count: __
Compliance           no results claims [ ]  no guarantees [ ]  no fake urgency [ ]
                     prices from pricing lib [ ]  no em dashes [ ]  "Beema Health" [ ]
Mobile               CTA above the fold [ ]  product shot visible [ ]
```

Report scores honestly. If a box is "partly", say what is missing and what the
smallest compliant fix is.

## Where this applies

- New variants: score the parent with the checklist, state which single
  element the variant changes, and keep the rest identical (see
  `cro-variant-editing`). Clarity changes (title, lead, photos) are good single
  hypotheses to test sequentially.
- Pages: `glp-1-houston`, `semaglutide-houston`, `tirzepatide-houston`,
  `sildenafil-boston`, `tadalafil-boston`, `ed-mints-boston`. ED pages carry
  extra Google and Meta restrictions; run the compliance skills first.
- After clarity, move to **confidence**: reviews, credentials, provider
  oversight, transparent pricing, guarantees we can honestly make. That is the
  second half of the framework and is not covered here.
