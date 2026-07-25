# Homepage sections & site nav shell

Homepage-specific sections that don't fit neatly under another feature doc, plus the mobile nav shell (`CircleRevealMenu`) they — and every other page — share via `SiteHeader.tsx`.

## Hero (`src/components/home/HomeHero.tsx`)

Full-viewport two-column hero with scroll-linked parallax (headline, photo, floating vial) via `motion/react`'s `useScroll`/`useTransform`, keyed off `heroRef`.

**The marquee band is viewport-fixed (`position: fixed`), not positioned against the hero `<section>`'s own box.** This replaced an earlier "Scroll" cue in the same spot. The reason: the headline's fluid `clamp()` font size can wrap to extra lines at some viewport widths (it's tuned to fit a `calc(100svh - 4rem)` budget on typical laptop windows, but wider/narrower windows can still wrap more than the intended 3 lines), which grows the section past that budget. Anchoring the marquee to the section's bottom edge — or trying to fit it inside via flexbox `min-h-0` — just means it inherits that overflow and gets pushed below the fold again along with the rest of the content. Fixing it to the viewport instead guarantees it's visible on initial load regardless of how tall the hero content actually renders.

It fades out (`marqueeOpacity`, a `useTransform` off the same `scrollYProgress`) over the first ~12% of hero scroll so it doesn't linger fixed over content further down the page. Under reduced motion it stays at opacity 1 and renders `absolute` instead of `fixed` (falls back to normal in-flow behavior rather than staying pinned to the viewport indefinitely).

If you need to change hero copy/layout again and something ends up positioned "at the bottom of the hero," default to viewport-relative (`fixed`) rather than section-relative (`absolute` against the hero's own box) unless you're certain the hero's height is stable across breakpoints.

## Trust signals (`src/components/home/TrustSignals.tsx`, `src/lib/trust-signals.ts`)

Icon-card grid rendered right after the hero, sourced from `TRUST_SIGNALS` in `trust-signals.ts` — the single source of truth for trust claims shown across header/footer/homepage/waitlist.

**Only add claims that are true today.** The file's own comment is explicit: no invented credentials, certifications, or review scores. LegitScript is deliberately absent because certification hasn't started — don't add it preemptively.

## Mobile nav shell: `CircleRevealMenu` (`src/components/site/CircleRevealMenu.tsx`)

Full-screen circular-reveal menu used by `SiteHeader.tsx`'s mobile hamburger trigger (sitewide, not homepage-only). A filled circle grows from the trigger's screen position to cover the viewport, then menu content fades in on top; closing reverses the sequence.

Built directly on Radix `Dialog` (`forceMount` + `AnimatePresence`) rather than the shared `Sheet` primitive — that keeps focus trap / Escape / scroll lock intact while the circular-reveal visual is fully custom. Content inside it (the "Weight Loss" tap-to-expand dropdown, nav links, phone/socials) is documented in `docs/features/treatment-pages.md`'s nav section.

## Key files

| File | Role |
|------|------|
| `src/components/home/HomeHero.tsx` | Hero, viewport-fixed marquee |
| `src/components/home/TrustSignals.tsx`, `src/lib/trust-signals.ts` | Trust claims band |
| `src/components/site/CircleRevealMenu.tsx` | Full-screen mobile menu shell (sitewide) |
| `src/components/site/SiteHeader.tsx` | Mobile menu content, incl. `MobileWeightLossDropdown` |
| `src/components/home/home-motion.tsx` | `EASE_OUT`, `Marquee`, `LineReveal` — shared motion primitives used above |
