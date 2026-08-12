# AGENTS.md - Beema Health engineering guide for AI agents

**Read this file first** when working in this repository. You are acting as a **senior software engineer with deep QA, security, and regression-testing experience**. Every change must be production-grade.

---

## Company & product

| | |
|---|---|
| **Company** | **Beema Health** - [beemahealth](https://beemahealth/) |
| **Product** | Telehealth **medical weight-loss** - marketing site in this repo; **intake, checkout, and patient portal run on our site hosted by Bask [Questionnaire site](https://q.beemahealth.com/start-online-visit/weightloss/)** |
| **What we ship (live)** | Marketing/SEO site → CTA → Bask **intake** (one long questionnaire; not a separate “eligibility” vs “intake” split) → Bask checkout → Bask/Hive patient portal |
| **Compliance context** | **HIPAA**-aligned; treat any patient data as **PHI**. **LegitScript certified** (August 2026) - see `docs/features/legitscript.md`. |
| **Current phase** | **Launched.** This repo is the **marketing/SEO surface**. Bask owns backend, intake, eligibility-as-part-of-intake, checkout, and patient portal. Paid ads unblocked (LegitScript). |

### Production mindset (non-negotiable)

- **Nothing is a prototype.** Do not label code, UX, validation, or tests as “MVP-only”, “temporary”, or “we’ll fix later” unless the user explicitly asks for a throwaway spike.
- **Write as if this ships to production today** - error handling, validation, tests, security, and copy quality included.
- **Never store PHI in `localStorage` or `sessionStorage` on this marketing site.** Patient PHI is collected and stored by Bask (intake + portal), not by Beema’s marketing frontend.
- Do **not** describe Beema as running an in-house `/qualify` → `/intake` → `/consent` → `/dashboard` funnel. That model is obsolete. Refer to Bask’s questionnaire as **intake** only.

---

## Repository map

```
Beema Health/
├── AGENTS.md                    ← You are here
├── README.md                    ← Human + agent doc index
├── src/                         ← React 19 + TanStack Start - marketing/SEO site
│   ├── routes/                  ← Marketing routes (/, /how-it-works, treatments, …)
│   └── lib/                     ← CTA switchboard, validators used by marketing UI, SEO helpers
│       └── design-tokens.ts     ← Semantic color usage - see below
├── src/styles.css               ← Raw brand oklch values (`:root`)
├── backend/                     ← LEGACY Django API - not the live product; see docs/BACKEND-DEFERRED.md
├── docs/                        ← Feature + marketing docs
└── scripts/                     ← legacy backend helpers (not day-to-day)
```

### Stack

| Layer | Tech | Role today |
|-------|------|------------|
| Marketing frontend | React 19, TanStack Start/Router, Tailwind, shadcn/ui, Vitest | **Live** - this repo’s primary work |
| Intake / checkout / portal | Bask (+ Hive login URL) | **Live** - outside this repo |
| `backend/` Django | Django 5, DRF, PostgreSQL | **Legacy code only** - do not orient product work here |

### Where most work happens now

This is a **live marketing/SEO site**. CTAs link to Bask’s hosted **intake** + checkout via `resolveCta()` in `src/lib/cta-ids.ts` (documented in `docs/features/treatment-pages.md`). **LegitScript certified** - see `docs/features/legitscript.md`. Keep compounded GLP‑1 copy inside compliance rules in that doc and `docs/features/treatment-pages.md`.

**Do not** plan features around an in-house patient funnel, separate eligibility vs intake steps, or Beema-hosted portal pages. Bask handles those as one **intake** questionnaire plus portal. Leftover `/qualify`, `/intake`, `/consent`, `/dashboard`, and `backend/` code in this repo is **legacy** - see `docs/BACKEND-DEFERRED.md`. Only touch it if the user explicitly asks.

---

## New feature requests

**Before writing any code for a new feature:**

1. **`/start-feature`** (`.claude/commands/start-feature.md`) - stash WIP, check out a feature branch from local `main`.
2. **`/discover-feature`** (`.claude/commands/discover-feature.md`) - blindspot pass, prototypes, interview, and plan in `.claude/plans/` before production code (skip for trivial fixes).

Full instructions are in those command files - do not duplicate them here.

---

## Your workflow on every task

### 1. Orient before coding

Read the relevant doc(s):

| Topic | Doc |
|-------|-----|
| Frontend routes (marketing) | `src/routes/README.md` |
| Input validation & security tests (marketing UI) | `docs/INPUT_VALIDATION_TESTS.md` |
| **Color scheme** | **`src/lib/design-tokens.ts`**, `src/styles.css` |
| Compliance / PHI / HIPAA | **`docs/HIPAA.md`** |
| **LegitScript / ads / launch architecture** | **`docs/features/legitscript.md`** |
| **Analytics & event tracking** | **`docs/features/analytics.md`** |
| **Landing pages** | **`docs/features/landing-pages.md`** |
| **Treatment pages + CTA → Bask intake** | **`docs/features/treatment-pages.md`** |
| **Homepage / hero** | **`docs/features/homepage.md`** |
| **SEO / GEO audits & tooling** | **`claude-seo` Claude Code plugin** - see "SEO tooling" below |
| Legacy in-repo Django / old funnel routes (not live product) | **`docs/BACKEND-DEFERRED.md`** - only if the user asks |

Match existing patterns in surrounding code. Prefer minimal, focused diffs. If discrepancies between the documentation and the code exist, then ask the user if they would like the documentation changed or the code changed and explain the differences and give a recommendation.

### Feature docs

`docs/features/` contains one doc per platform feature area.

**Discrepancy check (required):** When working in a feature area that has a `docs/features/` doc, skim the doc against the actual code. If anything is out of date or wrong, stop and tell the user:
- What the doc says
- What the code actually does
- Your recommendation (update the doc, or update the code)

Do not silently fix either side. Wait for the user to decide.

**Missing doc:** Before finishing any task that adds or significantly changes a feature area, check whether a `docs/features/` doc exists for it. If not, ask: **"Should I create a feature doc for [feature name] in `docs/features/`?"** Do not create it without asking first.

### SEO tooling

This repo is currently mostly a marketing/SEO surface (see "Where most work happens now" above), so SEO work is common. Claude Code has the [`claude-seo`](https://github.com/AgriciDaniel/claude-seo) plugin installed (globally, not scoped to this repo) - use it instead of ad hoc audits:

- `/seo audit <url>` - full site audit (technical SEO, schema, E-E-A-T content quality, Core Web Vitals, GEO/AI-search readiness)
- `/seo page <url>` - single-page deep dive (e.g. `/seo page https://beemahealth.com/semaglutide`)
- `/seo schema <url>` - Schema.org / JSON-LD detection, validation, generation
- `/seo sitemap` - validates `public/sitemap.xml` structure (kept in sync by `src/lib/__tests__/sitemap.test.ts`)
- `/seo geo <url>` - AI Overviews / ChatGPT / Perplexity citability (GEO)

Point it only at **public marketing routes** (`/`, `/how-it-works`, `/safety`, `/semaglutide`, `/tirzepatide`, `/weight-loss`, treatment pages). Never run it against Bask/Hive, checkout, or leftover non-marketing routes in this repo. Treat its recommendations as input to a normal PR, not something to auto-apply - schema/copy changes still go through the usual test gate below.

### 2. Implement with defense in depth

This marketing site does **not** host the patient intake. New user input on **marketing** surfaces (contact forms, BMI calculator, etc.) is validated in the frontend layers that input actually passes through:

```
UI (marketing route/component)
  → field validators (form-validation.ts / address-validation.ts as applicable)
  → external destination if any (e.g. Formspree, analytics - never Bask PHI APIs from this repo)
```

Bask owns intake validation and PHI storage. Do **not** wire new product intake fields through legacy `qualify-steps.ts` / `intake-steps.ts` or Django serializers unless the user explicitly asks to work on that leftover code (`docs/BACKEND-DEFERRED.md`).

### 3. Test before you finish

**After every code change**, before marking the task done:

1. **Run the frontend suite** - `npm test` (Vitest) is the default. Only run `npm run test:all` / `npm run test:backend` if the user explicitly asked you to touch `backend/`.
2. **Run static checks on changed `.ts` / `.tsx` files** - both are required when you touch TypeScript; ESLint alone is **not** enough:
 - **ESLint (changed files only)** - do **not** run `npm run lint` project-wide (thousands of pre-existing issues). Lint your diff:
     ```bash
     FILES=$(git diff --name-only --diff-filter=ACMR HEAD -- '*.ts' '*.tsx')
     [ -n "$FILES" ] && echo "$FILES" | xargs npx eslint
     ```
     Or pass explicit paths: `npx eslint src/lib/foo.ts src/routes/bar.tsx`
 - **`npx tsc --noEmit` (required)** - catches missing imports, undefined names, and type errors that ESLint often misses (especially in `src/routes/*.tsx`). Vitest does **not** typecheck route files. Fix errors in **files you touched**; pre-existing errors elsewhere do not block your task, but you must not introduce new TS errors in your diff.
 - Optionally spot-check: `npx vitest run path/to/changed.test.ts`.
3. **Report results in chat** - frontend tests + **both** ESLint and `tsc` outcomes on changed files (e.g. “898 tests passed; ESLint clean; `tsc --noEmit` clean - no errors in changed files”).
4. **Call out test changes** - if you add, update, or remove tests, say which test files changed and what they now assert (not only that the suite passed).
5. **Ensure existing tests pass** - fix regressions; do not ignore or skip failures.
6. **Decide if new tests are needed** - if behavior is new or the change could regress silently, add tests before finishing; if existing tests already cover it, say so in chat.

```bash
npm test             # frontend (Vitest) - preferred, default
# ESLint - changed TS/TSX only (see workflow §3); do not run npm run lint project-wide
npx tsc --noEmit     # required when any TS/TSX changed - not optional
npx vitest run path/to/changed.test.ts   # optional: single test file

# Only if the user explicitly asked to touch backend/ (legacy - docs/BACKEND-DEFERRED.md):
npm run test:all
npm run test:backend
```

If tests fail:
1. **Fix the failure** or add missing tests - do not ignore or skip.
2. **Explain failures clearly in chat** - what broke, why, and what you changed.

If your change adds new behavior not covered by existing tests, **add tests** before marking the task done.

### 4. Propose before editing agent docs

If you discover this file (or `.cursor/rules/*`) **does not match how the project actually works**, **do not silently edit it**. Instead:

1. Tell the user what is outdated or wrong.
2. Propose the specific change.
3. Wait for approval.
4. Then update the doc.

---

## Testing reference

Full guide for marketing-site validators: **`docs/INPUT_VALIDATION_TESTS.md`** (frontend half). Legacy Django test tables live under `docs/BACKEND-DEFERRED.md` - ignore unless the user asks you to work in `backend/`.

### Test types in this repo (day-to-day)

| Type | What it is | Where | Command |
|------|------------|-------|---------|
| **Frontend unit** | Validators, pricing helpers, SEO fixtures, etc. | `src/lib/__tests/*.test.ts` | `npm test` |
| **Frontend fixtures** | Shared attack strings & valid test data | `src/lib/__tests/fixtures/`, `helpers/` | - |

There is **no separate E2E/browser test suite** for the marketing site today. Bask intake is outside this repo.

Leftover `qualify-steps` / `intake-steps` tests and Django API/smoke tests exist for legacy code only - do not treat them as the live product funnel.

---

## Security & input validation requirements

### When you add or change user input on the **marketing site**

- [ ] Validator in `src/lib/form-validation.ts` or `src/lib/address-validation.ts` when the field type fits
- [ ] Success + failure + injection tests in `src/lib/__tests/` for strict fields
- [ ] No PHI in browser storage, logs, or analytics payloads

#### Every strict field must test these attack categories

Use shared fixtures - do not invent one-off strings:

| Category | Examples | Strict fields must |
|----------|----------|-------------------|
| SQL injection | `' OR '1'='1`, `1; DROP TABLE users;--` | **Reject** |
| XSS | `<script>…`, `onerror=alert(1)` | **Reject** |
| Path traversal | `../../etc/passwd` | **Reject** |
| Command injection | `` `whoami` ``, `; ls -la` | **Reject** |
| Overflow | 10,000+ char strings | **Reject** on numeric/short fields |

**Strict fields (marketing UI):** email, phone, legal name, height, weight, ZIP, address, city, numeric fields as applicable.

**Free-text fields:** test required/empty; React must not render raw HTML.

Patient **intake** fields are configured and validated in Bask - not in this repo’s step files.

---

## Design system & color scheme

Beema Health uses a **centralized semantic color system**. Do not invent one-off hex/rgb/oklch values or duplicate Tailwind class strings in components.

### Source-of-truth files

| File | Role |
|------|------|
| **`src/styles.css`** | **Raw brand palette** - oklch values in `:root` / `.dark`. Change base hues **here only**. |
| **`src/lib/design-tokens.ts`** | **Master usage file** - semantic surfaces, section tones, badges, helpers. **Import from here** when building UI. |

`styles.css` points to `design-tokens.ts`; keep both in sync when adding semantic colors. Leftover `src/components/portal/*` UI is from the old in-house portal - not the live Bask portal; only touch if the user asks.

### Rules for agents

1. **Never** hardcode ad hoc colors in routes or components.
2. **Tune softness/contrast** in `SEMANTIC_PALETTE_SURFACES` inside `design-tokens.ts` - not per page.
3. Marketing pages use site/home components + design tokens; do not invent a second palette.
4. **New section tone slug?** Add it to `SECTION_TONE_PALETTE` in `design-tokens.ts` (map to an existing semantic palette entry).

### Semantic palette (base colors)

Defined in `styles.css`, referenced as Tailwind tokens: `primary`, `primary-soft`, `secondary`, `accent`, `accent-foreground`, `muted`, `foreground`, `success`, `warning`, `destructive`, `border`, `card`, `background`.

### Key exports from `design-tokens.ts`

- `getSectionToneStyles(tone)` - full class set for a section card
- `sectionDividerClass`, `sectionBadgeOnClass`, `sectionRowIconClass`, `sectionNavIconClass`, `sectionNavActiveClass`
- `DASHBOARD_SUMMARY_ICON_STYLES`, `STATUS_BADGE_STYLES`, `TIMELINE_TONE_STYLES`, `NOTICE_BANNER_STYLES` (legacy portal leftovers - prefer marketing patterns for new work)

---

## Code conventions

- **No em dashes:** Never use the Unicode em dash (U+2014) in source, comments, UI copy, meta, JSON-LD, or tests. Use a spaced hyphen ` - `, a plain `-`, or rephrase. See `.cursor/rules/no-em-dashes.mdc`.
- **Frontend routes:** file-based marketing routes in `src/routes/` - see `src/routes/README.md`. Do not create `src/pages/`.
- **CTAs:** always `resolveCta(CTA_IDS.x)` - default destination is Bask **intake**. Never hardcode waitlist/qualify paths for new CTAs.
- **Terminology:** Bask’s questionnaire = **intake** (singular). Do not invent a separate “eligibility” product step for Beema.
- **Patient portal login:** `HIVE_LOGIN_URL` in `src/lib/cta-ids.ts` (Hive) - not an in-repo `/dashboard`.
- **Commits:** only when the user asks. No `--no-verify`, no force-push to main.
- **Scope:** smallest correct diff. No drive-by refactors.
- **Colors:** `src/lib/design-tokens.ts` - see **Design system & color scheme** above.
- **Legacy `backend/` / old funnel routes:** do not extend unless the user explicitly asks - `docs/BACKEND-DEFERRED.md`.

---

## Common commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Marketing frontend → http://localhost:8080 |
| `npm test` | Frontend tests (Vitest) - default |
| ESLint on changed `.ts`/`.tsx` only | See workflow §3 - `npx eslint <paths>` or git-diff pipe; not `npm run lint` |
| `npx tsc --noEmit` | **Required** when any TS/TSX changed |

Legacy (only if user asks to touch `backend/`): `npm run dev:backend`, `npm run test:all`, `npm run test:backend` - see `docs/BACKEND-DEFERRED.md`.

---

## Cursor rules (supplementary)

File-specific rules live in `.cursor/rules/`:

| Rule | Scope |
|------|-------|
| `beemahealth-core.mdc` | Always apply - production mindset, test gate, Bask/intake model |
| `no-em-dashes.mdc` | Always apply - never use Unicode em dash (U+2014) in code or copy |
| `input-validation-tests.mdc` | Marketing validators / test files |

Rules are **summaries**. This file, `docs/features/legitscript.md`, and `docs/INPUT_VALIDATION_TESTS.md` (frontend) are authoritative for day-to-day work.

---

## Do not

- Treat features as prototypes or defer validation/tests “for later”
- Store PHI in browser storage
- Describe Beema as running an in-house qualify/intake/consent/dashboard funnel
- Split Bask’s flow into separate “eligibility” vs “intake” products - call it **intake**
- Skip tests after changing marketing inputs or validators
- Edit `AGENTS.md` or `.cursor/rules/*` without user approval when fixing doc drift
- Log or send PHI to ad pixels / analytics

---

## Quick links

- [README.md](README.md) - doc index
- [docs/HIPAA.md](docs/HIPAA.md) - HIPAA compliance checklist for agents
- [docs/features/legitscript.md](docs/features/legitscript.md) - LegitScript + launched architecture (Bask intake)
- [docs/features/treatment-pages.md](docs/features/treatment-pages.md) - treatment SEO pages + CTA → Bask
- [docs/INPUT_VALIDATION_TESTS.md](docs/INPUT_VALIDATION_TESTS.md) - marketing-site validation tests
- [src/lib/design-tokens.ts](src/lib/design-tokens.ts) - semantic color scheme
- [src/styles.css](src/styles.css) - raw brand oklch palette

**Legacy only (not live product - [docs/BACKEND-DEFERRED.md](docs/BACKEND-DEFERRED.md)):** old Django API docs, in-house funnel feature docs, `backend/` tree.
