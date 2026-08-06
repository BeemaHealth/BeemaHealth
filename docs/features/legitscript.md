# LegitScript certification & advertising readiness

**Status (August 2026): Beema Health is LegitScript certified and fully launched.** Paid advertising (Google Ads, Meta, Microsoft, TikTok, etc. that require LegitScript for telehealth / Rx) is unblocked.

## What agents must know

1. **Do not treat the site as pre-launch or waitlist-mode.** Those phases are over.
2. **Live architecture:** this repo = marketing/SEO. [Bask](https://bask.co/) = **intake** (one questionnaire — not separate eligibility + intake), checkout, backend, and patient portal (Hive). CTAs → Bask via `resolveCta()`.
3. **Do claim LegitScript certification when it’s relevant** (trust, ads readiness, E-E-A-T). Do **not** invent other credentials, review scores, or pharmacy certifications.
4. **Compliance copy rules still apply after certification.** §F1.1 in `docs/marketing/SEO-AEO-GEO-PLAN.md` and the Compliance section in `docs/features/treatment-pages.md` remain hard constraints on compounded GLP‑1 marketing.
5. **Seal markup is centralized.** Verify URL, image, and display size live in `src/lib/legitscript.ts`. UI: `LegitScriptSeal` → optional `FloatingLegitScriptSeal` on the homepage hero.

## Verify URL & seal

| | |
|---|---|
| Verify page | `https://www.legitscript.com/websites/?checker_keywords=beemahealth.com` |
| Seal image | `https://static.legitscript.com/seals/51697885.png` |
| Native size | 73×79 (LegitScript: don’t shrink below this) |
| Display size | See `LEGITSCRIPT_SEAL_WIDTH` / `HEIGHT` in `src/lib/legitscript.ts` (~1.25× native on the hero) |

Placement today: floating seal on the homepage hero (beside the headline on mobile; top-left of the hexagon photo on desktop). Reusable anywhere via `LegitScriptSeal`.

## Launch architecture

| Surface | Status |
|---------|--------|
| Marketing / SEO site (this repo’s frontend) | **Live** |
| Bask **intake** + checkout | **Live** — all marketing CTAs via `resolveCta()` → Bask |
| Hive patient portal login | **Live** (`HIVE_LOGIN_URL` in `cta-ids.ts`) |
| In-repo Django + old `/qualify`/`/intake`/… routes | **Legacy only** — not the live product; see `docs/BACKEND-DEFERRED.md` |

## Advertising

- LegitScript certification is the prerequisite for Google / Meta / Microsoft / TikTok healthcare & telehealth Rx ads — **cleared**.
- Keep ad creative and landing pages inside §F1.1 compounded-copy rules.
- Pixels only on public marketing / `lp.*` routes — never send PHI (`docs/features/analytics.md`).

## Key files

| File | Role |
|------|------|
| `src/lib/legitscript.ts` | Single source of truth: verify URL, seal src, sizes, alt/title |
| `src/components/site/LegitScriptSeal.tsx` | Clickable seal markup |
| `src/components/home/FloatingLegitScriptSeal.tsx` | Shared float animation for the hero |
| `src/components/home/HomeHero.tsx` | Mobile + desktop placement only |
| `src/lib/__tests__/legitscript.test.ts` | URL + size regression tests |
| `docs/marketing/SEO-AEO-GEO-PLAN.md` §F1 / §F1.1 | Ads strategy + ongoing content rules |
