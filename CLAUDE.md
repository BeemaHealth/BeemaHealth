# CLAUDE.md — Aretide project guide for Claude Code

Read `AGENTS.md` first — it is the authoritative engineering guide. This file contains Claude Code-specific context and mirrors the always-apply Cursor rule (`aretide-core.mdc`).

---

## Company & product

**Aretide** ([aretide.com](https://aretide.com/)) — HIPAA-aligned telehealth medical weight-loss intake platform.
Patient funnel: qualification → account → medical intake → consent → provider review → prescription → patient dashboard.

**Compliance:** HIPAA. All patient data is PHI — treat it as real and sensitive even in local dev.

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
| Backend | Django 5, DRF, PostgreSQL 16 (Docker locally), Token auth |
| Types | `src/lib/types/mvp.ts` mirrors API shapes — keep in sync |

---

## New feature requests

Before writing any code for a new feature, run `/start-feature`. That skill clones the repo from GitHub, creates and checks out the feature branch, and defines the testing gate. Full instructions live there. Never push — the user pushes when ready.

---

## Workflow on every task

### 1. Orient — read before coding

| Topic | Doc |
|-------|-----|
| Database / field ownership | `backend/DATABASE.md` |
| Run backend, API list | `backend/README.md`, `docs/LOCAL-DEV.md` |
| LifeFile / MediVera pharmacy API | `docs/vendor/LIFEFILE_MEDIVERA_API.md` (gitignored; pointer at `docs/LIFEFILE_MEDIVERA_API.md`) |
| Beluga Health provider/pharmacy API | `docs/vendor/BELUGA_API.md` (gitignored; pointer at `docs/BELUGA_API.md`) |
| Input validation & security tests | `docs/INPUT_VALIDATION_TESTS.md` |
| API types & client | `src/lib/types/mvp.ts`, `src/lib/api/client.ts` |
| Color scheme / portal UI | `src/lib/design-tokens.ts`, `src/styles.css` |
| Compliance / PHI / HIPAA | `docs/HIPAA.md`, `backend/HOSTING.md` |
| **Patient funnel** | `docs/features/patient-funnel.md` |
| **Medical intake** | `docs/features/medical-intake.md` |
| **Analytics & tracking** | `docs/features/analytics.md` |
| **Landing pages** | `docs/features/landing-pages.md` |
| **Staff CRM** | `docs/features/staff-crm.md` |
| **Medications catalog** | `docs/features/medications.md` |
| **Dynamic questionnaire system** | `docs/features/dynamic-questionnaire.md` |

Match existing patterns. Prefer minimal, focused diffs. If docs and code disagree, tell the user — do not silently fix either side.

### Feature docs

`docs/features/` has one doc per platform feature area.

**Discrepancy check:** When working in a feature area that has a `docs/features/` doc, skim it against the actual code. If anything is wrong or out of date, tell the user what the doc says, what the code actually does, and your recommendation. Do not silently fix either side — wait for the user to decide.

**Missing doc:** Before finishing any task that adds or significantly changes a feature, check if a doc exists. If not, ask: **"Should I create a feature doc for [feature name] in `docs/features/`?"** Do not create it without asking first.

### 2. Implement with defense in depth

New user input requires validators at **every layer**:

```
UI route → step validators → field validators → API POST/PATCH
→ Django serializer → apps/common/validation/* → parameterized ORM
```

### 3. Test before finishing

```bash
npm run test:all     # frontend (Vitest) + backend unit tests + smoke_clinical_flow — preferred
npm test             # frontend only
npm run test:backend # backend unit tests + smoke_clinical_flow
npx tsc --noEmit     # required when any TS/TSX changed — not optional
# ESLint on changed files only (not npm run lint project-wide):
FILES=$(git diff --name-only --diff-filter=ACMR HEAD -- '*.ts' '*.tsx')
[ -n "$FILES" ] && echo "$FILES" | xargs npx eslint
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

#### Backend
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
- Backend: one Django app per domain under `backend/apps/`.
- Commits: only when the user asks. No `--no-verify`, no force-push to main.
- Scope: smallest correct diff. No drive-by refactors.

---

## Common commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Frontend → http://localhost:8080 |
| `npm run dev:backend` | Backend + Postgres via Docker → http://localhost:8000 |
| `npm run test:all` | All tests (frontend + backend + smoke) |
| `npx tsc --noEmit` | TypeScript check — required after any TS/TSX change |
| `docker compose -f backend/docker-compose.yml exec api python manage.py migrate` | Apply migrations |

---

**Authoritative docs:** `AGENTS.md`, `docs/INPUT_VALIDATION_TESTS.md`, `backend/DATABASE.md`
