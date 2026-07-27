# CLAUDE.md — Beema Health project guide for Claude Code

Read `AGENTS.md` first — it is the authoritative engineering guide. This file contains Claude Code-specific context and mirrors the always-apply Cursor rule (`beemahealth-core.mdc`).

---

## Company & product

**Beema Health** ([beemahealth](https://beemahealth/)) — HIPAA-compliant telehealth medical weight-loss intake platform.
Patient funnel: qualification → account → medical intake → consent → provider review → prescription → patient dashboard.

**Compliance:** HIPAA. All patient data is PHI — treat it as real and sensitive even in local dev.

**Current phase:** Beema is not hosting or running its own backend for the foreseeable future — [Bask](https://bask.co/) is the storefront/checkout/questionnaire platform for this phase, and marketing CTAs link out to Bask instead of the in-house funnel. The Django backend in this repo is intact and accurate but dormant — see `docs/BACKEND-DEFERRED.md` before touching it or routing work through its docs.

---

## Production mindset (non-negotiable)

- Nothing is a prototype. Write as if this ships today.
- Error handling, validation, tests, security, and copy quality are included on every change.
- **Never store PHI in `localStorage` or `sessionStorage`.** Pre-account data lives server-side behind an HttpOnly cookie.
- Parameterized ORM/DB queries only — no raw SQL string concatenation with user input.
- No PHI in logs or error messages.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TanStack Start/Router, Tailwind, shadcn/ui, Vitest |
| Backend | Django 5, DRF, PostgreSQL 16 (Docker locally), Token auth — **dormant, see `docs/BACKEND-DEFERRED.md`** |
| Types | `src/lib/types/mvp.ts` mirrors API shapes — keep in sync |

---

## New feature requests

Before writing any code for a new feature, run `/start-feature` (branch setup) then `/discover-feature` (blindspot pass → prototype → interview → plan) for non-trivial work. Full instructions live in `.claude/commands/`. Never push — the user pushes when ready.

---

## Workflow on every task

### 1. Orient — read before coding

| Topic | Doc |
|-------|-----|
| Input validation & security tests (frontend) | `docs/INPUT_VALIDATION_TESTS.md` |
| API types & client | `src/lib/types/mvp.ts`, `src/lib/api/client.ts` |
| Color scheme / portal UI | `src/lib/design-tokens.ts`, `src/styles.css` |
| Compliance / PHI / HIPAA | `docs/HIPAA.md` |
| **Analytics & tracking** | `docs/features/analytics.md` |
| **Landing pages** | `docs/features/landing-pages.md` |
| **Treatment pages (per-medication SEO pages, CTA switchboard)** | `docs/features/treatment-pages.md` |
| Backend (dormant — Django, patient funnel, medical intake, staff CRM, medications, dynamic questionnaire, LifeFile/Beluga vendor APIs) | `docs/BACKEND-DEFERRED.md` |

Match existing patterns. Prefer minimal, focused diffs. If docs and code disagree, tell the user — do not silently fix either side.

### Feature docs

`docs/features/` has one doc per platform feature area.

**Discrepancy check:** When working in a feature area that has a `docs/features/` doc, skim it against the actual code. If anything is wrong or out of date, tell the user what the doc says, what the code actually does, and your recommendation. Do not silently fix either side — wait for the user to decide.

**Missing doc:** Before finishing any task that adds or significantly changes a feature, check if a doc exists. If not, ask: **"Should I create a feature doc for [feature name] in `docs/features/`?"** Do not create it without asking first.

### 2. Implement with defense in depth

New user input requires validators at **every layer** the input actually passes through. With the backend dormant (`docs/BACKEND-DEFERRED.md`), that's normally just:

```
UI route → step validators → field validators → external API (e.g. Bask)
```

The full frontend → Django serializer → parameterized ORM chain only applies if a task explicitly resumes backend work.

### 3. Test before finishing

```bash
npm test             # frontend (Vitest) — preferred, default
npx tsc --noEmit     # required when any TS/TSX changed — not optional
# ESLint on changed files only (not npm run lint project-wide):
FILES=$(git diff --name-only --diff-filter=ACMR HEAD -- '*.ts' '*.tsx')
[ -n "$FILES" ] && echo "$FILES" | xargs npx eslint

# Only if a task explicitly touches backend/ (dormant otherwise):
npm run test:all      # frontend + backend unit tests + smoke_clinical_flow
npm run test:backend  # backend unit tests + smoke_clinical_flow
```

Report in chat: test count + pass/fail, ESLint result, `tsc --noEmit` result — all on changed files. Fix regressions; do not skip failures. Add tests when behavior is new or uncovered.

### 4. Do not edit agent docs without approval

If `AGENTS.md` or `.cursor/rules/*` disagrees with the code, tell the user, propose the fix, and wait for approval.

---

## New user input checklist

#### Frontend
- [ ] Validator in `src/lib/form-validation.ts` or `src/lib/address-validation.ts`
- [ ] Step rule in `src/lib/qualify-steps.ts` or `src/lib/intake-steps.ts`
- [ ] Tests with SQL injection, XSS, path traversal, command injection, overflow

#### Backend (dormant — only applies if a task explicitly resumes backend work; see `docs/BACKEND-DEFERRED.md`)
- [ ] Validator in `backend/apps/common/validation/`
- [ ] Hook in relevant `serializers.py` (`validate()` or `validate_<field>()`)
- [ ] API test in `backend/apps/<app>/tests/test_*_api.py` returning 400 on malicious payloads
- [ ] Keep `payloads.py` in sync with frontend `malicious-payloads.ts`

---

## Design system

Raw palette: **`src/styles.css`** (oklch values in `:root`).
Usage: **`src/lib/design-tokens.ts`** — import from here, never hardcode ad hoc colors.
Portal sections: use `AccountSectionCard` + a `tone` from `SectionTone` / `SECTION_TONE_PALETTE`.

---

## Code conventions

- Frontend routes: file-based in `src/routes/` — see `src/routes/README.md`. Do not create `src/pages/`.
- API client: extend `src/lib/api/client.ts` for new endpoints.
- Backend: one Django app per domain under `backend/apps/` — dormant, see `docs/BACKEND-DEFERRED.md`.
- Commits: only when the user asks. No `--no-verify`, no force-push to main.
- Scope: smallest correct diff. No drive-by refactors.
- **This marketing site is pre-launch (waitlist mode).** The real checkout/questionnaire flow is being handled by Bask, a third-party storefront platform — not an in-house backend — for the foreseeable future; this repo is currently just the marketing/SEO surface. Every CTA button must call `resolveCta(CTA_IDS.x)` from `src/lib/cta-ids.ts` rather than hardcoding a waitlist path/label, so the whole site (or individual CTAs) can be repointed at Bask's live links from that one file when they're ready. See `docs/features/treatment-pages.md`.

---

## Common commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Frontend → http://localhost:8080 |
| `npm test` | Frontend tests (Vitest) — preferred default |
| `npx tsc --noEmit` | TypeScript check — required after any TS/TSX change |
| `npm run dev:backend` | *(dormant)* Backend + Postgres via Docker → http://localhost:8000 |
| `npm run test:all` | *(dormant)* All tests (frontend + backend + smoke) |
| `docker compose -f backend/docker-compose.yml exec api python manage.py migrate` | *(dormant)* Apply migrations |

---

**Authoritative docs:** `AGENTS.md`, `docs/INPUT_VALIDATION_TESTS.md`, `docs/BACKEND-DEFERRED.md`
