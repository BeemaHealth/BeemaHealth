# CLAUDE.md - Beema Health project guide for Claude Code

Read `AGENTS.md` first - it is the authoritative engineering guide. This file contains Claude Code-specific context and mirrors the always-apply Cursor rule (`beemahealth-core.mdc`).

---

## Company & product

**Beema Health** ([beemahealth](https://beemahealth/)) - HIPAA-aligned telehealth medical weight-loss.

**Live product:** This repo is the **marketing/SEO site**. [Bask](https://bask.co/) owns **intake** (one long questionnaire - do not split “eligibility” vs “intake”), checkout, backend, and the patient portal (Hive login). Marketing CTAs → Bask via `resolveCta()`.

**Compliance:** HIPAA. Do not put PHI in browser storage on this site. **LegitScript certified** (August 2026) - paid ads unblocked; see `docs/features/legitscript.md`.

**Current phase:** **Launched.** Do not describe an in-house `/qualify` → `/intake` → `/consent` → `/dashboard` funnel as the product. Leftover code for that lives in-repo as **legacy** only - `docs/BACKEND-DEFERRED.md`.

---

## Production mindset (non-negotiable)

- Nothing is a prototype. Write as if this ships today.
- Error handling, validation, tests, security, and copy quality are included on every change.
- **Never store PHI in `localStorage` or `sessionStorage`.**
- No PHI in logs, analytics, or ad pixels.

---

## Stack

| Layer | Tech | Role |
|-------|------|------|
| Marketing frontend | React 19, TanStack Start/Router, Tailwind, shadcn/ui, Vitest | **Live** - primary work in this repo |
| Intake / checkout / portal | Bask (+ Hive) | **Live** - outside this repo |
| `backend/` Django | Django 5, DRF, PostgreSQL | **Legacy only** - see `docs/BACKEND-DEFERRED.md` |

---

## New feature requests

Before writing any code for a new feature, run `/start-feature` (branch setup) then `/discover-feature` (blindspot pass → prototype → interview → plan) for non-trivial work. Full instructions live in `.claude/commands/`. Never push - the user pushes when ready.

---

## Workflow on every task

### 1. Orient - read before coding

| Topic | Doc |
|-------|-----|
| Input validation (marketing UI) | `docs/INPUT_VALIDATION_TESTS.md` |
| Color scheme | `src/lib/design-tokens.ts`, `src/styles.css` |
| Compliance / PHI / HIPAA | `docs/HIPAA.md` |
| **LegitScript / launch / Bask intake** | `docs/features/legitscript.md` |
| **Analytics & tracking** | `docs/features/analytics.md` |
| **Landing pages** | `docs/features/landing-pages.md` |
| **Treatment pages + CTA → Bask** | `docs/features/treatment-pages.md` |
| **BMI calculator** | `docs/features/bmi-calculator.md` |
| **Homepage / hero** | `docs/features/homepage.md` |
| **SEO / GEO audits & tooling** | `claude-seo` plugin - see "SEO tooling" below |
| Legacy Django / old funnel routes | `docs/BACKEND-DEFERRED.md` - only if the user asks |

Match existing patterns. Prefer minimal, focused diffs. If docs and code disagree, tell the user - do not silently fix either side.

### SEO tooling

The [`claude-seo`](https://github.com/AgriciDaniel/claude-seo) plugin is installed globally in Claude Code. Use it for SEO/GEO work instead of ad hoc checks:

- `/seo audit <url>` - full site audit
- `/seo page <url>` - single-page deep dive
- `/seo schema <url>` - Schema.org / JSON-LD validation
- `/seo sitemap` - validates `public/sitemap.xml`
- `/seo geo <url>` - AI Overviews / ChatGPT / Perplexity citability

Only point it at public marketing routes (`/`, `/how-it-works`, `/safety`, treatment pages) - never at Bask/Hive or leftover non-marketing routes. Treat its output as PR input, not something to auto-apply.

### Feature docs

`docs/features/` has one doc per platform feature area.

**Discrepancy check:** When working in a feature area that has a `docs/features/` doc, skim it against the actual code. If anything is wrong or out of date, tell the user what the doc says, what the code actually does, and your recommendation. Do not silently fix either side - wait for the user to decide.

**Missing doc:** Before finishing any task that adds or significantly changes a feature, check if a doc exists. If not, ask: **"Should I create a feature doc for [feature name] in `docs/features/`?"** Do not create it without asking first.

### 2. Implement with defense in depth

Marketing-site inputs:

```
UI route/component → field validators → external non-PHI destination if any
```

Bask owns intake validation and PHI. Do not route new product intake through legacy `qualify-steps` / `intake-steps` / Django unless the user asks.

### 3. Test before finishing

```bash
npm test             # frontend (Vitest) - preferred, default
npx tsc --noEmit     # required when any TS/TSX changed - not optional
# ESLint on changed files only (not npm run lint project-wide):
FILES=$(git diff --name-only --diff-filter=ACMR HEAD -- '*.ts' '*.tsx')
[ -n "$FILES" ] && echo "$FILES" | xargs npx eslint
```

Report in chat: test count + pass/fail, ESLint result, `tsc --noEmit` result - all on changed files. Fix regressions; do not skip failures. Add tests when behavior is new or uncovered.

### 4. Do not edit agent docs without approval

If `AGENTS.md` or `.cursor/rules/*` disagrees with the code, tell the user, propose the fix, and wait for approval.

---

## New user input checklist (marketing site)

- [ ] Validator in `src/lib/form-validation.ts` or `src/lib/address-validation.ts` when applicable
- [ ] Tests with SQL injection, XSS, path traversal, command injection, overflow for strict fields
- [ ] No PHI in storage, logs, or pixels

---

## Design system

Raw palette: **`src/styles.css`** (oklch values in `:root`).
Usage: **`src/lib/design-tokens.ts`** - import from here, never hardcode ad hoc colors.

---

## Code conventions

- **No em dashes:** Never use the Unicode em dash (U+2014) in source, comments, UI copy, meta, JSON-LD, or tests. Use a spaced hyphen ` - `, a plain `-`, or rephrase. See `.cursor/rules/no-em-dashes.mdc` and `AGENTS.md`.
- Frontend routes: file-based in `src/routes/` - see `src/routes/README.md`. Do not create `src/pages/`.
- Commits: only when the user asks. No `--no-verify`, no force-push to main.
- Scope: smallest correct diff. No drive-by refactors.
- **Launched + Bask intake + LegitScript certified.** CTAs: `resolveCta(CTA_IDS.x)` → Bask **intake**. Seal: `src/lib/legitscript.ts`. See `docs/features/legitscript.md` and `docs/features/treatment-pages.md`.

---

## Common commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Marketing frontend → http://localhost:8080 |
| `npm test` | Frontend tests (Vitest) - preferred default |
| `npx tsc --noEmit` | TypeScript check - required after any TS/TSX change |

---

**Authoritative docs:** `AGENTS.md`, `docs/features/legitscript.md`, `docs/INPUT_VALIDATION_TESTS.md` (frontend), `docs/BACKEND-DEFERRED.md` (legacy only)
