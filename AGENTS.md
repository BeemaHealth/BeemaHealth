# AGENTS.md — Aretide engineering guide for AI agents

**Read this file first** when working in this repository. You are acting as a **senior software engineer with deep QA, security, and regression-testing experience**. Every change must be production-grade.

---

## Company & product

| | |
|---|---|
| **Company** | **Aretide** — [aretide.com](https://aretide.com/) |
| **Product** | Telehealth **medical weight-loss intake** platform |
| **What we ship** | Patient qualification → account → medical intake → consent → provider review → perscription routed → patient dashboard updated with this information |
| **Compliance context** | **HIPAA**-aligned design; handles **PHI** (Protected Health Information). Treat all patient data as real and sensitive — even in local dev. |

### Production mindset (non-negotiable)

- **Nothing is a prototype.** Do not label code, UX, validation, or tests as “MVP-only”, “temporary”, or “we’ll fix later” unless the user explicitly asks for a throwaway spike.
- **Write as if this ships to production today** — error handling, validation, tests, security, and copy quality included.
- **Local Docker is not HIPAA-compliant** for real patient data, but **code standards are still production standards**.
- **Never store PHI in `localStorage` or `sessionStorage`.** Pre-account funnel data lives server-side behind an HttpOnly cookie.

---

## Repository map

```
Aretide/
├── AGENTS.md                    ← You are here
├── README.md                    ← Human + agent doc index
├── src/                         ← React 19 + TanStack Start frontend
│   ├── routes/                  ← File-based routes (/qualify, /intake, …)
│   └── lib/                     ← API client, validators, types, step logic
├── backend/                     ← Django 5 + DRF + PostgreSQL
│   ├── apps/                    ← Domain apps (accounts, eligibility, intakes, …)
│   └── apps/common/validation/  ← Shared backend input validators
├── docs/                        ← Deep dives (LOCAL-DEV, INPUT_VALIDATION_TESTS, …)
└── scripts/                     ← dev-backend.sh, test-backend.sh
```

### Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TanStack Start/Router, Tailwind, shadcn/ui, Vitest |
| Backend | Django 5, DRF, PostgreSQL 16 (Docker locally), Token auth |
| Types | `src/lib/types/mvp.ts` mirrors API shapes — keep in sync |

### Patient funnel (where most work happens)

1. **`/qualify`** — pre-signup eligibility quiz + account creation (`POST /api/auth/register/`)
2. **`/intake`** — 12-step medical questionnaire (`PATCH /api/medical-intakes/me/`)
3. **`/consent`** — legal acknowledgments + signature (`POST /api/consent-records/me/`)
4. **`/dashboard`** — post-submission status

Pre-signup progress: `POST /api/funnel/session/` + `PATCH /api/funnel/eligibility/` (HttpOnly cookie).

**Canonical data ownership:** see `backend/DATABASE.md` — do not duplicate fields across tables/JSON blobs.

---

## Your workflow on every task

### 1. Orient before coding

Read the relevant doc(s):

| Topic | Doc |
|-------|-----|
| Database / field ownership | `backend/DATABASE.md` |
| Run backend, API list | `backend/README.md`, `docs/LOCAL-DEV.md` |
| Frontend routes | `src/routes/README.md` |
| Input validation & security tests | `docs/INPUT_VALIDATION_TESTS.md` |
| API types & client | `src/lib/types/mvp.ts`, `src/lib/api/client.ts` |
| Compliance / PHI / HIPAA | **`docs/HIPAA.md`**, `backend/HOSTING.md` |

Match existing patterns in surrounding code. Prefer minimal, focused diffs. If discrepancies between the documentation and the code exist, then ask the user if they would like the documentation changed or the code changed and explain the differences and give a recommendation. 

### 2. Implement with defense in depth

User input is validated at **three layers**:

```
UI route (qualify.tsx / intake.tsx)
  → step validators (qualify-steps.ts / intake-steps.ts)
  → field validators (form-validation.ts / address-validation.ts)
  → API POST/PATCH/PUT
  → Django serializer + apps/common/validation/*
  → parameterized ORM / JSON storage
```

Both frontend **and** backend must reject malicious input on strict fields.

### 3. Test before you finish

**After every code change**, before marking the task done:

1. **Run the full suite** — `npm run test:all` (frontend Vitest + backend Django).
2. **Run static checks on changed `.ts` / `.tsx` files only** — fix TypeScript/ESLint diagnostics in files you touched:
   - **ESLint (changed files only)** — do **not** run `npm run lint` project-wide (thousands of pre-existing issues). Lint your diff:
     ```bash
     FILES=$(git diff --name-only --diff-filter=ACMR HEAD -- '*.ts' '*.tsx')
     [ -n "$FILES" ] && echo "$FILES" | xargs npx eslint
     ```
     Or pass explicit paths: `npx eslint src/lib/foo.ts src/routes/bar.tsx`
   - `npx tsc --noEmit` — TypeScript; fix errors in **files you touched** (imports, types, test helpers). Pre-existing errors elsewhere do not block your task, but new errors in your diff must be zero.
   - Optionally spot-check: `npx vitest run src/lib/__tests__/qualify-steps.test.ts` (or the specific test file you edited).
3. **Report results in chat** — state explicitly that frontend and backend tests ran, plus lint/tsc outcome on changed files (e.g. “342 tests passed; lint clean; no TS errors in qualify-steps.test.ts”).
4. **Call out test changes** — if you add, update, or remove tests, say which test files changed and what they now assert (not only that the suite passed).
5. **Ensure existing tests pass** — fix regressions; do not ignore or skip failures.
6. **Decide if new tests are needed** — if behavior is new or the change could regress silently, add tests before finishing; if existing tests already cover it, say so in chat.

```bash
npm run test:all     # frontend (Vitest) + backend (Django) — preferred
npm test             # frontend only
npm run test:backend # backend only
# ESLint — changed TS/TSX only (see workflow §3); do not run npm run lint project-wide
npx tsc --noEmit     # TypeScript — fix errors in files you edited
npx vitest run path/to/changed.test.ts   # optional: single test file
```

If tests fail:
1. **Fix the failure** or add missing tests — do not ignore or skip.
2. **Explain failures clearly in chat** — what broke, why, and what you changed.

If your change adds new behavior not covered by existing tests, **add tests** before marking the task done.

### 4. Propose before editing agent docs

If you discover this file (or `.cursor/rules/*`) **does not match how the project actually works**, **do not silently edit it**. Instead:

1. Tell the user what is outdated or wrong.
2. Propose the specific change.
3. Wait for approval.
4. Then update the doc.

---

## Testing reference

Full guide: **`docs/INPUT_VALIDATION_TESTS.md`**

### Test types in this repo

| Type | What it is | Where | Command |
|------|------------|-------|---------|
| **Frontend unit** | Validator & step logic in isolation | `src/lib/__tests/*.test.ts` | `npm test` |
| **Frontend fixtures** | Shared attack strings & valid test data | `src/lib/__tests/fixtures/`, `helpers/` | — |
| **Backend unit** | Python validator functions | `backend/apps/common/tests/` | `npm run test:backend` |
| **Backend API integration** | POST/PATCH returns 400 on attacks, 200/201 on valid | `backend/apps/*/tests/test_*_api.py` | `npm run test:backend` |

There is **no separate E2E/browser test suite** today. API integration tests are our backend regression layer.

### Frontend test files

| File | Covers |
|------|--------|
| `form-validation.test.ts` | Email, phone, names, numbers, med/allergy rows, labs |
| `address-validation.test.ts` | ZIP, street, city, verified address |
| `qualify-steps.test.ts` | All qualify steps + account signup |
| `intake-steps.test.ts` | All 12 intake steps |

Config: `vitest.config.ts` — tests match `src/**/*.test.ts`.

### Backend test files

| File | Endpoint |
|------|----------|
| `accounts/tests/test_register_api.py` | `POST /api/auth/register/` |
| `eligibility/tests/test_eligibility_api.py` | `PATCH /api/eligibility/me/` |
| `eligibility/tests/test_funnel_eligibility_api.py` | `PATCH /api/funnel/eligibility/` |
| `intakes/tests/test_intake_api.py` | `PATCH /api/medical-intakes/me/` |
| `consents/tests/test_consent_api.py` | `POST /api/consent-records/me/` |
| `common/tests/test_form_validation.py` | Shared Python validators |
| `common/tests/test_address_validation.py` | Address validators |

Runner: `scripts/test-backend.sh` — uses SQLite in-memory via `backend/config/settings_test.py`.

---

## Security & input validation requirements

### When you add or change any user input

Complete **all** of the following:

#### Frontend
- [ ] Validator in `src/lib/form-validation.ts` or `src/lib/address-validation.ts`
- [ ] Step rule in `src/lib/qualify-steps.ts` or `src/lib/intake-steps.ts`
- [ ] Success + failure + injection tests in `src/lib/__tests/`
- [ ] Update `test-data.ts` helpers if needed

#### Backend (required for every POST/PATCH field)
- [ ] Validator in `backend/apps/common/validation/`
- [ ] Hook in the relevant `serializers.py` (`validate()` or `validate_<field>()`)
- [ ] API test in `backend/apps/<app>/tests/test_*_api.py`
- [ ] Keep `payloads.py` in sync with frontend `malicious-payloads.ts`

#### Every strict field must test these attack categories

Use shared fixtures — do not invent one-off strings:

| Category | Examples | Strict fields must |
|----------|----------|-------------------|
| SQL injection | `' OR '1'='1`, `1; DROP TABLE users;--` | **Reject** |
| XSS | `<script>…`, `onerror=alert(1)` | **Reject** |
| Path traversal | `../../etc/passwd` | **Reject** |
| Command injection | `` `whoami` ``, `; ls -la` | **Reject** |
| Overflow | 10,000+ char strings | **Reject** on numeric/short fields |

**Strict fields:** email, phone, legal name, height, weight, ZIP, address, city, numeric labs.

**Free-text fields** (med dose, reactions, notes): test required/empty; SQL may pass as literal — backend must use parameterized queries; React must not render raw HTML.

### Backend security checklist (every new endpoint or serializer)

- [ ] Auth permission class correct (`AllowAny` vs `IsPatient` vs provider)
- [ ] Input validated in serializer — never trust client-only checks
- [ ] No raw SQL string concatenation with user input
- [ ] No PHI logged to console or error messages
- [ ] Rate limiting considered for public endpoints (auth throttle exists on register/login)
- [ ] API test proves malicious payloads return **400 Bad Request**

---

## Code conventions

- **Frontend routes:** file-based in `src/routes/` — see `src/routes/README.md`. Do not create `src/pages/`.
- **API client:** `src/lib/api/client.ts` — extend here for new endpoints.
- **Types:** update `src/lib/types/mvp.ts` when API shapes change.
- **Backend:** one Django app per domain under `backend/apps/`.
- **Commits:** only when the user asks. No `--no-verify`, no force-push to main.
- **Scope:** smallest correct diff. No drive-by refactors.

---

## Common commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Frontend → http://localhost:8080 |
| `npm run dev:backend` | Backend + Postgres via Docker → http://localhost:8000 |
| `npm run test:all` | Run all validation/regression tests |
| ESLint on changed `.ts`/`.tsx` only | See workflow §3 — `npx eslint <paths>` or git-diff pipe; not `npm run lint` |
| `docker compose -f backend/docker-compose.yml exec api python manage.py migrate` | Apply migrations |

---

## Cursor rules (supplementary)

File-specific rules live in `.cursor/rules/`:

| Rule | Scope |
|------|-------|
| `aretide-core.mdc` | Always apply — production mindset, test gate |
| `input-validation-tests.mdc` | Validators, serializers, test files |

Rules are **summaries**. This file and `docs/INPUT_VALIDATION_TESTS.md` are authoritative.

---

## Do not

- Treat features as prototypes or defer validation/tests “for later”
- Store PHI in browser storage
- Skip tests after changing inputs, serializers, or validators
- Edit `AGENTS.md` or `.cursor/rules/*` without user approval when fixing doc drift
- Use standard Heroku (non-Shield) for real PHI — see `backend/HOSTING.md`
- Log request bodies containing PHI

---

## Quick links

- [README.md](README.md) — doc index
- [docs/HIPAA.md](docs/HIPAA.md) — HIPAA compliance checklist for agents
- [docs/INPUT_VALIDATION_TESTS.md](docs/INPUT_VALIDATION_TESTS.md) — validation test bible
- [docs/LOCAL-DEV.md](docs/LOCAL-DEV.md) — Docker setup
- [backend/DATABASE.md](backend/DATABASE.md) — schema & data flow
- [backend/README.md](backend/README.md) — API endpoints
- [Starting Point/launchPlan.md](Starting%20Point/launchPlan.md) — product launch plan
