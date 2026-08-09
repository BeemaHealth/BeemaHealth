# BMI calculator

A client-side, informational-only BMI calculator embedded on the treatment pages (`/tirzepatide`, `/semaglutide`) and the educational guide (`/learn/initial-research`). It is **not** part of medical intake — no data it collects is submitted to the backend, stored, or attached to a patient record. It exists purely to give visitors a quick, self-serve reference point before they decide whether to start an eligibility check.

## Why this design

- **No PHI, no backend call.** Height/weight/BMI live in local component state only (`useState`) and never leave the browser. This is why it's excluded from the frontend↔backend defense-in-depth validation chain described in `AGENTS.md` — there's no API call to protect.
- **No color-coded "shaming."** Unlike typical BMI-calculator UIs (red/yellow/green traffic-lighting by category), the gauge uses a single brand hue (`primary`) throughout, on Beema's own dark `bg-grad-ink` card treatment (same pattern as the About page Mission section). The category list below the gauge is plain text rows with the active category subtly highlighted — never colored red or flagged as "bad."
- **CTA only appears at BMI ≥ 30** (`BMI_CTA_THRESHOLD` in `src/lib/bmi.ts`), not at "Overweight" (25+) like some competitor calculators. This is a deliberate product choice — change `BMI_CTA_THRESHOLD` to move it.

## BMI math

`src/lib/bmi.ts` is the single source of truth:

- `computeBmi(heightFt, heightIn, weightLbs)` — standard `703 × lb / in²` formula. Returns `null` for non-positive/non-finite input rather than throwing.
- `bmiCategory(bmi)` — returns `"underweight" | "healthy" | "overweight" | "obesity"` using standard CDC-style breakpoints (18.5 / 25 / 30).
- `BMI_CATEGORIES` — display labels + range strings for the four categories, in order.
- `BMI_SCALE_MIN` / `BMI_SCALE_MAX` (15–40) — the gauge's visual range; values outside this are clamped for the needle position only (the displayed number is never clamped).
- `BMI_CTA_THRESHOLD` (30) — the only place the "show CTA" cutoff is defined.

Tests: `src/lib/__tests__/bmi.test.ts`.

## Component

`src/components/site/BmiCalculator.tsx` — `<BmiCalculator ctaId={...} medicationLabel="tirzepatide" />` (omit `medicationLabel` on educational pages for medication-neutral CTA copy):

- Left: height (ft/in) + weight (lb) inputs, validated with the same `validateHeightFt` / `validateHeightIn` / `validateWeightLbs` used by the qualify/intake flow (`src/lib/form-validation.ts`) — kept in sync automatically since it imports them rather than reimplementing bounds.
- Right: an SVG semicircle gauge (hand-built polar-to-cartesian arc math, no charting library) showing a needle position, the numeric BMI, and the four category rows. When BMI ≥ `BMI_CTA_THRESHOLD`, a callout + "Get started" button appears, wired through `resolveCta(ctaId)` per the CTA switchboard rules in `docs/features/treatment-pages.md` — never a hardcoded link.

## CTA ids

Added to `CTA_IDS` in `src/lib/cta-ids.ts`: `tirzepatide_bmi`, `semaglutide_bmi`, `learn_initial_research_bmi`. All fall back to `DEFAULT_CTA_TARGET` (Bask **intake**) like every other marketing CTA.

## Key files

| File | Role |
|------|------|
| `src/lib/bmi.ts` | BMI formula, category thresholds, CTA threshold |
| `src/lib/__tests__/bmi.test.ts` | Formula + category boundary tests |
| `src/components/site/BmiCalculator.tsx` | The calculator UI (form + gauge + conditional CTA) |
| `src/routes/tirzepatide.tsx`, `src/routes/semaglutide.tsx` | Each renders `<BmiCalculator>` with its own `ctaId` and `medicationLabel` |
| `src/routes/learn.initial-research.tsx` | Educational guide embeds the same calculator (no `medicationLabel`) |
| `src/lib/form-validation.ts` | Shared height/weight validators (reused, not reimplemented) |
