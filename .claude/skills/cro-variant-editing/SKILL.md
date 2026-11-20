---
name: cro-variant-editing
description: >-
  How the Beema Health CRO Lab and landing-page variant system work, and the
  rules for safely editing a variant. Use whenever Matt asks to edit, create,
  duplicate, rename, preview, switch, or deploy a landing page variant (v1-control,
  v2-variant-b, etc.), mentions the CRO dashboard or `npm run cro`, or asks to
  change copy or layout on glp-1-houston, semaglutide-houston, tirzepatide-houston,
  sildenafil-boston, tadalafil-boston, or ed-mints-boston.
---

# Editing CRO landing-page variants

Read `AGENTS.md` and `CLAUDE.md` first; their rules still apply. Also read
`docs/features/landing-pages.md` and `tools/cro-lab/README.md`.

## The model in one minute

- Six ad landing pages are served through variants: `glp-1-houston`,
  `semaglutide-houston`, `tirzepatide-houston`, `sildenafil-boston`,
  `tadalafil-boston`, `ed-mints-boston`.
- Each page has a folder `src/landing-variants/<page>/` with:
  - `v1-control.tsx`: the original page. **Variant 0.** It is the baseline for
    every comparison. Treat it as read-only unless Matt names it explicitly.
  - `v2-variant-b.tsx`, `v3-...tsx`: drafts and tests, one file per variant.
    A file exports `variant: LandingVariant` (`id` equals the file name, `label`,
    `Component`).
  - `shared.ts` (most pages): TITLE, DESCRIPTION, SERVICE_DESCRIPTION,
    area-served and FAQ_ITEMS, shared so SEO, JSON-LD, and ad-reviewed copy stay
    identical across variants.
- `src/routes/<page>.tsx` keeps head metadata, JSON-LD, and
  `trackPageViewed(...)`, then renders `<LandingExperiment page="<page>" />`.
- `src/landing-variants/experiments.json` says which variant is live per page
  (one live at 100%, the rest draft at 0). `experiments.generated.ts` is
  **generated** from it and imports only the live variant, so drafts never ship.
  Do not hand-edit either file; the CRO Lab rewrites them ("Make main locally").
- glp-1-houston: `v1-control.tsx` wraps the shared `Glp1LandingPage` component
  and `v2-variant-b.tsx` is a full copy with `market` fixed to "houston". Both
  call `trackPageViewed` inside the component. Leave those calls in place.
- Preview any variant locally (including a draft): the dev server (user-run)
  serves `/<page>/?preview_variant=<variant-id>`. Preview visits are not tracked.
- The CRO Lab (`npm run cro`, port 8787 by default) is a local dashboard in
  `tools/cro-lab/`. Live mode reads GA4 property 546707320 read-only. Its state
  lives in `tools/cro-lab/data/lab.json` (variants, go-live windows, notes).
  Demo mode uses fake data and never touches files.

## Tracking: how it connects (read before touching CTAs or running browser checks)

- Every landing page is an experiment, including a lone control: `experiments.json`
  gives it `<page>-e1` with one variant at 100%. "Control only" pages still send
  `experiment_id`, `variant_id`, `landing_page_id`.
- CTA click: `resolveCta(...).onClick` in `src/lib/cta-ids.ts` calls
  `trackIntakeHandoff` once. That is **one dataLayer push** (`intake_handoff`,
  `cta_location` = the CtaId, plus the experiment ids). Never add a second send
  (no `gtag('event','intake_handoff')`, no extra push): gtag calls also land in
  the dataLayer and double-fire every GTM tag, which duplicated Meta Leads.
- GTM container `GTM-MHHJ44GF`: trigger "Intake Handoff Trigger" fires
  "GA4 - Intake Handoff" (params via Data Layer Variables `cta_location`,
  `experiment_id`, `variant_id`, `landing_page_id`) and "Meta - Lead (Intake
  Handoff)". Both are "Once per event". New parameters need a GTM variable and
  a GA4 tag parameter, plus a GA4 event-scoped custom dimension for reports.
- `variant_exposure` is a direct GA4 hit (`trackGaEvent`), once per page load.
- The CRO Lab counts handoffs by event name and landing page, and ties signups
  and purchases to a page via `cta_id` / `src_page` in the **Bask URL query**
  (`buildCtaSearch`), not via event parameters. Keep those URL params.
- Matt's browser usually has `?exp_exclude=1` set, which omits the three
  experiment ids on purpose. To verify them, visit `?exp_exclude=0`, test, then
  restore `?exp_exclude=1`. `?ga_debug=1` sends events from non-production
  hosts and enables DebugView; `?preview_variant=` sends none.
- Browser-automation sessions (Claude in Chrome): read-only by default. Do not
  publish GTM, change Meta or GA4 settings, or complete a Bask intake unless
  the prompt says so. Cancel the navigation to q.beemahealth.com after clicks.
  Expect exactly 1 `intake_handoff` and 1 Meta Lead per click. The tracking
  setup page is `tools/cro/index.html`. Give Chrome prompts this section.

## Status words (do not mix them up)

- **Live**: confirmed in production. Comes only from a recorded go-live window
  (`deployments` in `lab.json`), set by Matt via "Set go-live time".
- **Testing locally**: the variant that `experiments.json` currently serves in
  the local code ("Make main locally"). Not shipped, not ready.
- **Ready to deploy**: set only when Matt clicks "Mark ready to deploy".
  Never set it yourself.
- Making a variant main locally changes local code only. Nothing deploys until
  Matt runs `npm run deploy:production`.

## Rules when editing a variant

0. **Never edit what is live.** The live variant (usually `v1-control`; check
   `experiments.json` and the lab's go-live windows) and everything it renders
   are read-only for variant work. That includes shared components the control
   imports: `Glp1LandingPage`, `TreatmentPricingCard` / `TreatmentPageBlocks`,
   `CompoundedPriceLockup`, `HowItWorksSteps`, `MedicalTeamSection`,
   `MarketingLayout`, `primitives`, and anything in `src/routes/` or
   `src/lib/` the live page uses. Editing any of them changes production the
   moment it deploys, even if you only meant to change a draft.
   - Before touching any file outside `src/landing-variants/<page>/<variant>.tsx`,
     search for its importers (`grep -rn "<Component>" src`). If `v1-control`,
     a route, or another page uses it, do not edit it in place.
   - If a draft needs different behavior, add an **opt-in prop that defaults to
     the old behavior** (example: `compact` on `TreatmentPricingCard`) or copy
     the component into the variant folder, and pass the opt-in only from draft
     variants. Never pass it from `v1-control` or the live variant.
   - After the edit, confirm `git diff --stat` shows no change to
     `v1-control.tsx`, `Glp1LandingPage.tsx`, or route files, and that default
     renders are unchanged. State this in your report.
   - If Matt asks for a change "on all variants" or "everywhere", it still means
     draft variants only unless he explicitly says to change the live page.
     Ask before changing live behavior.

1. **Edit only the variant file Matt names.** Find it from the dashboard's
   "Copy Claude instruction", or `src/landing-variants/<page>/<id>.tsx`.
2. **Preserve everything else.** Do not edit other variants, the control,
   `shared.ts`, route head/JSON-LD, `experiments.json`, `experiments.generated.ts`,
   or `lab.json` unless Matt asks for that specific file. Never delete or rename a
   variant file (the id equals the file name and is recorded in analytics and
   history). Do not remove a variant from the dashboard to "clean up".
3. **Change only what the hypothesis says.** If the dashboard record has
   "What changed" / "Hypothesis", keep every other element identical to the
   parent variant so the test isolates one change. Surprising extra edits ruin
   a sequential comparison.
4. **Never touch tracking:** `trackPageViewed`, CTA ids (`resolveCta(CTA_IDS...)`),
   `variant_id` / `experiment_id` plumbing, GTM/dataLayer code. No PHI in
   analytics, logs, or storage.
5. **Do not alter shared components in place.** If a change needs
   `Glp1LandingPage` or another shared component, copy it into the variant
   (as v2 did) or add a prop that defaults to old behavior. A shared edit
   changes the live control.
6. **Copy and compliance:** no em dashes (U+2014); "Beema Health", never bare
   "Beema"; no guarantee language (completing intake does not guarantee a
   prescription); cash-pay, LegitScript, and pricing wording must follow
   `legitscript-compliance`, `google-ads-compliance`, and `meta-ads-compliance`
   skills when the copy makes medical, price, or certification claims. Use
   `src/lib/design-tokens.ts` for colors.
7. **Creating a new variant:** copy the parent file to
   `src/landing-variants/<page>/vN-short-name.tsx`, set `id` to match the file
   name, give it a clear `label`. Do not register it as live. Matt creates the
   dashboard record (or tell him to use "Create variant", which also syncs
   files on disk). It starts as a draft at 0%.
8. **Never start, stop, or restart `npm run dev` or `npm run cro`.** They are
   user-run. Ask Matt if they are down. Do not kill processes.
9. **Never push. Commit only when asked.** No branch switching or stashing
   unless asked. Never run the deploy command.

## Editing the dashboard itself (`tools/cro-lab`)

- Server: `tools/cro-lab/server/` (`index.ts`, `ga4.ts`, `experiments.ts`,
  `variants.ts`, `store.ts`). UI: `tools/cro-lab/web/src/`. Shared pure logic and
  tests: `tools/cro-lab/shared/`.
- Metrics come from GA4 keyed by landing `pagePath`; variants are attributed by
  confirmed go-live windows, not by the `variant_id` dimension. Days before
  2026-10-19 have no handoff tracking and are never counted as zero.
- Tests: `npm run cro:test`. Also run `npx tsc --noEmit -p tools/cro-lab`.
- `node tools/cro-lab/server/index.ts` does not auto-reload unless started
  with `npm run cro`; remind Matt to restart it after server changes.

## Before finishing a variant edit

```bash
npm test
npx tsc --noEmit        # pre-existing errors in AuthContext.tsx and intake-steps.test.ts are unrelated
FILES=$(git diff --name-only --diff-filter=ACMR HEAD -- '*.ts' '*.tsx')
[ -n "$FILES" ] && echo "$FILES" | xargs npx eslint
```

Report test count, `tsc`, and ESLint results. Tell Matt the preview URL
(`/<page>/?preview_variant=<id>`) and which single file changed. Remind him that
nothing is live until he deploys and records the go-live time.
