# Marketing:
1. Patient orders 6 months, and then only uses 3mo of the supply and we should give a credit to them

# Beema Health — Marketing frontend redesign (frontend only)

You are redesigning the **public marketing frontend** of this telehealth weight-loss product. Rebrand from **Aretide** to **Beema Health**. Ship production-quality UI — not a prototype.

Read `AGENTS.md` and `src/CLAUDE.md` first. Follow existing patterns (TanStack file routes in `src/routes/`, design tokens, no `src/pages/`).

## Hard scope boundaries (non-negotiable)

### DO
- Redesign **marketing / public** pages and shared marketing chrome only
- Fully rebrand colors, typography, logo, copy, and visual language to Beema Health
- Add an **About** page with brand lore (see below)
- Add tasteful animations and responsive art direction
- Keep product focus: **weight loss only** for now (no sexual health / hair / multi-vertical nav)

### DO NOT
- Touch the **dynamic questionnaire system** (`src/components/questionnaire/**`, `src/routes/staff.questionnaires*`, questionnaire builder, Beluga field mappings, etc.)
- Redesign or refactor patient funnel internals (`/qualify`, `/intake`, `/consent` step logic, validators, API clients for intake)
- Redesign staff CRM, messaging, dashboard portal internals, or backend apps
- Change backend business logic, serializers, migrations, or Beluga integration
- Edit `AGENTS.md` or `.cursor/rules/*`
- Invent new product verticals or multi-category mega-menus

If a CTA currently goes to `/qualify`, leave the **route wiring alone** for now (a separate task will add a Bask redirect toggle). You may restyle CTA buttons and marketing copy around them.

## Brand assets

Logo files (use these; do not invent a different mark):
- Light / icon: `src/assets/beema-logo.svg` (or whatever path exists — find and use the Beema logo assets in `src/assets/`)
- Dark lockup: use the black-background wordmark variant if present

Logo meaning (every visual choice should reinforce this):
- **Bee** — precision, trust, community, health, consistency
- **Infinity wings** — health is a lifelong journey; continuous care; the ability to improve forever is what lets you fly
- **Hexagon** — nature’s most efficient shape; strength with minimal waste; how healthcare tech should work

Brand name meaning (pick one and use consistently):
> Inspired by the honey bee, Beema represents a smarter approach to healthcare—built on consistency, trust, and long-term results.

## Color system (full retheme — not a partial tint)

Replace the current green/teal Aretide palette with a **black / white / honey-yellow** system.

Update:
1. `src/styles.css` — `:root` and `.dark` oklch tokens (primary = honey yellow, foreground/background = black/white neutrals)
2. `src/lib/design-tokens.ts` — section tones / surfaces so portal cards still work if they inherit tokens, but **do not redesign portal UX**
3. Any hardcoded Aretide greens in marketing components

Palette intent:
- Background: clean white or near-white
- Text: near-black
- Primary accent: warm honey / goldenrod yellow (match logo)
- Secondary surfaces: black sections for contrast (hero bands, footer, manifesto blocks)
- Borders/muted: cool neutrals, not green-tinted
- High contrast, premium, clinical-but-modern — not playful cartoon yellow

Never invent one-off hex colors in components; always go through CSS variables / tokens.

## Design references & quality bar

### Visual inspiration
- [Good Life Meds](https://www.goodlifemeds.com/) — clean hierarchy, strong product cards, trust strips, calm premium telehealth feel. Match that level of polish; we want **more** motion than they have, but never gimmicky.

### Healthcare UX best practices (must follow)
Source: https://bask.health/blog/health-care-web-design

Apply these principles:
1. **Trust before conversion** — credentials, privacy, licensed providers, US pharmacies, clear disclaimers
2. **Clear structure** — homepage → how it works → treatment/weight-loss → pricing → FAQ → about → legal
3. **Transparent pricing** — no hidden-fee vibes; keep/improve `/pricing`
4. **Plain language** — no medical jargon walls
5. **Separate education from intake** — marketing educates; CTAs hand off to care flow
6. **Visible compliance** — privacy/HIPAA cues, medical disclaimers (“prescription not guaranteed”, licensed provider review)
7. **Strong CTAs** above the fold (“Start your consultation”, “Check eligibility”)
8. **Social proof / credibility** where we have real claims only — do not invent patient counts or reviews
9. **Consistent branding** across all marketing pages (no one-off page styles)

Essential marketing pages to cover (restyle existing; add About):
| Page | Route |
|------|--------|
| Homepage | `/` |
| How it works | `/how-it-works` |
| Weight loss / treatments | `/weight-loss` (and related marketing treatment UI) |
| Pricing | `/pricing` |
| FAQ | `/faq` |
| Safety / clinicians if marketing | `/safety`, `/clinicians` as applicable |
| Contact | `/contact` |
| **About (new)** | `/about` |
| Shared chrome | `MarketingLayout`, nav, footer, primitives in `src/components/site/` |

Legal pages: update brand name/copy lightly; do **not** rewrite legal substance unless it’s a simple Aretide→Beema Health string replace. Flag if legal entity name needs human review.

## Art direction (this is the differentiator)

Make it look like a **senior product designer** shipped it:

1. **Clipping / geometric art**
   - Hexagon masks, clipped photography, diagonal or honeycomb-inspired crop shapes
   - Use CSS `clip-path`, masked images, or SVG masks — not random blobs
   - Subtle infinity / wing motifs as decorative linework (tasteful, not logo spam)

2. **Photos with gradients**
   - Lifestyle / wellness imagery with black→transparent or yellow-tinted gradient overlays
   - Text legible on overlays (WCAG contrast)
   - Prefer existing assets in `src/assets/` or high-quality placeholders; don’t break builds with missing remote images

3. **Motion**
   - Scroll-reveal (fade/slide) for sections
   - Subtle hero motion (gradient shift, soft parallax on desktop only)
   - Staggered card entrances
   - Respect `prefers-reduced-motion: reduce` — disable non-essential animation

4. **Responsive & device-capable features**
   - Mobile-first layouts; no horizontal scroll
   - Touch targets ≥ 44px on mobile
   - **No hover-only interactions on touch devices** — use `@media (hover: hover) and (pointer: fine)` for hover effects; on touch, use tap/active states or always-visible UI
   - Desktop can use hover lifts, underline reveals, image zooms; phones must not depend on hover
   - Sticky mobile CTA bar is OK if it doesn’t block content

5. **Typography**
   - Keep or upgrade display/body fonts for a premium health brand (current: Outfit + Figtree — replace only if the new pair is clearly better and loaded in `__root.tsx`)
   - Strong hierarchy: large display headlines, calm body, yellow accents sparingly

## About page — brand manifesto (use this lore)

Create `/about` with a narrative structure, not a wall of text. Suggested sections:
1. Hero: “Health isn’t a destination. It’s a lifelong journey.”
2. Manifesto block (black background, yellow accents):

> At Beema Health, we believe the best healthcare works the way nature does.
>
> Honey bees are among nature’s most efficient and essential builders. Every action serves a purpose. Every member contributes to something greater than themselves. Together, they create thriving communities.
>
> That’s how we believe healthcare should work.
>
> Our bee represents precision, trust, and collaboration. The infinity-shaped wings symbolize lifelong wellness—because health isn’t a finish line, it’s a continuous journey. The hexagon reflects efficiency and strength, inspired by one of nature’s most perfect designs.
>
> At Beema Health, our mission is simple: connect patients, providers, and technology to deliver care that’s smarter, more personal, and built for lasting results.

3. Five pillars (Bee meanings): Precision, Trust, Community, Health, Consistency — short cards
4. Infinity / continuous care section
5. Hexagon / efficiency section
6. CTA to start eligibility / consultation

Wire `/about` into nav + footer. Update `routeTree` via normal TanStack file-route conventions.

## Copy / naming

- Replace user-facing “Aretide” with “Beema Health” on marketing pages, titles, meta descriptions, nav, footer
- Keep internal package names / API paths / storage keys as-is unless purely display strings
- Weight-loss positioning: licensed provider review, online intake, discreet delivery, transparent pricing — no prescription guarantees
- Tagline options (pick one): “Continuous care. Precision medicine.” or “Lifelong wellness, engineered with care.”

## Implementation notes

- Primary work lives in:
  - `src/styles.css`, `src/lib/design-tokens.ts`
  - `src/components/site/**`
  - `src/routes/index.tsx`, `how-it-works.tsx`, `weight-loss.tsx`, `pricing.tsx`, `faq.tsx`, `contact.tsx`, new `about.tsx`, `__root.tsx` (fonts/meta if needed)
  - Marketing layout / logo components
- Prefer extending `src/components/site/primitives` over one-off page CSS
- Use Tailwind + existing shadcn/ui patterns
- Accessibility: focus rings, semantic headings, alt text on logo/images, contrast on yellow-on-white and yellow-on-black
- Do not store PHI in localStorage/sessionStorage (unchanged)

## Acceptance criteria

- [ ] Site reads as Beema Health end-to-end on marketing pages (logo, colors, copy)
- [ ] Palette is fully black/white/honey-yellow — no leftover Aretide green/teal on marketing surfaces
- [ ] Homepage feels premium (Good Life Meds bar or better), with clipping/gradient art and restrained animation
- [ ] About page tells the bee / infinity / hexagon story
- [ ] Desktop and mobile both excellent; hover effects gated to fine-pointer devices
- [ ] `prefers-reduced-motion` respected
- [ ] No questionnaire / staff / backend / funnel-logic changes
- [ ] `npx tsc --noEmit` clean on changed files
- [ ] ESLint clean on changed `.ts`/`.tsx`
- [ ] `npm run test:all` passes (or fix only regressions you introduce)

Work in focused commits of logic if you commit (only if asked). Prefer one cohesive visual system over many disconnected experiments.

Start by inventorying marketing components and the current palette, then retheme tokens, then redesign homepage + layout, then secondary pages + About.