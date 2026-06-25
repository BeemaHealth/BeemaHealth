# backend/CLAUDE.md — Backend context for Claude Code

Loaded when working in `backend/`. See root `CLAUDE.md` and `AGENTS.md` for full project standards.

---

## Backend input validation

When adding or changing any user input in `backend/`:

| Write endpoint | Serializer | Shared validator |
|----------------|------------|------------------|
| `POST /api/auth/register/` | `RegisterSerializer` | `validation/form.py` |
| `PATCH /api/eligibility/me/` | `EligibilitySerializer` | `validation/eligibility.py` |
| `PATCH /api/funnel/eligibility/` | `EligibilitySerializer` | `validation/eligibility.py` |
| `PATCH /api/medical-intakes/me/` | `MedicalIntakeSerializer` | `validation/intake.py` |
| `POST /api/consent-records/me/` | `ConsentRecordSerializer` | `validation/form.py` |

Test files: `backend/apps/<app>/tests/test_*_api.py` — run `npm run test:backend`
Attack payloads: `backend/apps/common/validation/payloads.py` (keep in sync with `src/lib/__tests__/fixtures/malicious-payloads.ts`)

### Required test cases

1. Success — valid payload returns 200/201
2. Empty / missing — returns 400
3. Invalid format — wrong type or out of range → 400
4. Injection (strict fields) — SQL, XSS, path traversal, command injection → 400

### Checklist for new backend inputs

- [ ] Validator in `backend/apps/common/validation/`
- [ ] Hook in relevant `serializers.py` (`validate()` or `validate_<field>()`)
- [ ] API test asserting 400 on malicious payloads
- [ ] `payloads.py` updated to match frontend fixtures
- [ ] `npm run test:all` passes

### Security checklist (every new endpoint or serializer)

- [ ] Auth permission class correct (`AllowAny` vs `IsPatient` vs provider)
- [ ] Input validated in serializer — never trust client-only checks
- [ ] No raw SQL string concatenation with user input
- [ ] No PHI logged to console or error messages
- [ ] Rate limiting considered for public endpoints
- [ ] API test proves malicious payloads return 400 Bad Request

---

## LifeFile / MediVera pharmacy API

Before changing pharmacy fulfillment, LifeFile adapters, mappers, webhooks, or `LIFEFILE_*` settings:

1. **Read `docs/vendor/LIFEFILE_MEDIVERA_API.md`** — full vendor API spec (gitignored locally), partner scope Q&A, and Aretide field mapping.
2. If that file is missing, read the pointer at `docs/LIFEFILE_MEDIVERA_API.md` and ask the user to restore it.

### Key facts

- MediVera = **pharmacy fulfillment only** (no clinician network). Provider approval happens elsewhere; `POST /order` fires after Rx approval.
- Outbound: `POST /order` with Basic Auth + `X-Vendor-ID`, `X-Location-ID`, `X-API-Network-ID`.
- Inbound: webhooks for order/shipping/refill status (Basic Auth on our endpoint).
- Mapper: `backend/apps/pharmacy/mappers/lifefile.py`
- Adapter: `backend/apps/pharmacy/adapters/lifefile.py`
- Open onboarding gaps: `docs/MEDIVERA_ONBOARDING_QUESTIONS.md`

---

## Database

Field ownership and schema: `backend/DATABASE.md` — do not duplicate fields across tables or JSON blobs.

Runner: `scripts/test-backend.sh` — uses SQLite in-memory via `backend/config/settings_test.py`.

---

## Backend test files

| File | Endpoint |
|------|----------|
| `accounts/tests/test_register_api.py` | `POST /api/auth/register/` |
| `eligibility/tests/test_eligibility_api.py` | `PATCH /api/eligibility/me/` |
| `eligibility/tests/test_funnel_eligibility_api.py` | `PATCH /api/funnel/eligibility/` |
| `intakes/tests/test_intake_api.py` | `PATCH /api/medical-intakes/me/` |
| `consents/tests/test_consent_api.py` | `POST /api/consent-records/me/` |
| `common/tests/test_form_validation.py` | Shared Python validators |
| `common/tests/test_address_validation.py` | Address validators |

Clinical integration smoke: `backend/apps/integrations/management/commands/smoke_clinical_flow.py` (runs as part of `npm run test:backend`).
