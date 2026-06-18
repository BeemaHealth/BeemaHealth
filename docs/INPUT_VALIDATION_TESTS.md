# Input validation test suite

This document explains how Aretide validates user input in the qualify and intake flows, how we test for common attack payloads, and what to do when adding new fields.

## Quick start

```bash
npm test              # frontend validation tests (Vitest)
npm run test:backend  # backend validation tests (Django)
npm run test:all      # both suites
npm run test:watch    # frontend only, re-run on changes
```

## Architecture

```
User input (qualify.tsx / intake.tsx)
        ↓
Step validators (qualify-steps.ts / intake-steps.ts)
        ↓
Field validators (form-validation.ts / address-validation.ts)
        ↓
API POST/PATCH
        ↓
Django serializers (call apps/common/validation/*)
        ↓
Parameterized ORM / JSON storage
```

| Layer | File | Responsibility |
|-------|------|----------------|
| Frontend primitives | `src/lib/form-validation.ts` | Email, phone, names, numbers, med/allergy rows, labs |
| Frontend address | `src/lib/address-validation.ts` | Street, city, ZIP, verified-address gate |
| Frontend qualify | `src/lib/qualify-steps.ts` | Per-step rules for `/qualify` |
| Frontend intake | `src/lib/intake-steps.ts` | Per-step rules for `/intake` |
| **Backend shared** | `backend/apps/common/validation/` | Python mirror of frontend field rules |
| **Backend serializers** | `apps/*/serializers.py` | Enforce validation on every POST/PATCH |
| Frontend tests | `src/lib/__tests/*.test.ts` | Step + field unit tests |
| **Backend tests** | `backend/apps/*/tests/` | Serializer unit + API integration tests |

## Test file layout

```
src/lib/__tests__/
├── fixtures/
│   └── malicious-payloads.ts   # Shared attack strings
├── helpers/
│   └── test-data.ts            # validQualifySlice(), validIntake(), etc.
├── form-validation.test.ts     # Primitive validators
├── address-validation.test.ts  # Address helpers
├── qualify-steps.test.ts       # All qualify steps
└── intake-steps.test.ts        # All 12 intake steps
```

### Backend test layout

```
backend/apps/common/validation/
├── form.py              # is_valid_email, is_valid_phone, validate_weight_lbs, …
├── address.py           # is_valid_us_zip, is_valid_street_address, …
├── eligibility.py       # validate_eligibility_fields()
├── intake.py            # validate_intake_payload() — sections in PATCH body
└── payloads.py          # SQL_INJECTION, XSS_PAYLOADS, STRICT_FIELD_ATTACKS

backend/apps/common/tests/           # unit tests for shared validators
backend/apps/accounts/tests/         # POST /api/auth/register/
backend/apps/eligibility/tests/      # PATCH /api/eligibility/me/, /api/funnel/eligibility/
backend/apps/intakes/tests/          # PATCH /api/medical-intakes/me/
backend/apps/consents/tests/         # POST /api/consent-records/me/
```

### Endpoints that must have validation tests

| Method | Path | Serializer | Test file |
|--------|------|------------|-----------|
| POST | `/api/auth/register/` | `RegisterSerializer` | `accounts/tests/test_register_api.py` |
| PATCH | `/api/funnel/eligibility/` | `EligibilitySerializer` | `eligibility/tests/test_funnel_eligibility_api.py` |
| PATCH | `/api/eligibility/me/` | `EligibilitySerializer` | `eligibility/tests/test_eligibility_api.py` |
| PATCH | `/api/medical-intakes/me/` | `MedicalIntakeSerializer` | `intakes/tests/test_intake_api.py` |
| POST | `/api/consent-records/me/` | `ConsentRecordSerializer` | `consents/tests/test_consent_api.py` |

When adding a new write endpoint, add a matching `test_*_api.py` that asserts **201/200 on valid payload** and **400 on malicious payloads**.

## Attack payloads we test

`malicious-payloads.ts` exports reusable strings:

| Export | Examples | Expected on strict fields |
|--------|----------|---------------------------|
| `SQL_INJECTION` | `' OR '1'='1`, `1; DROP TABLE users;--` | **Reject** (numeric, email, phone, zip) |
| `XSS_PAYLOADS` | `<script>alert(1)</script>`, `onerror=alert(1)` | **Reject** on email, name, address |
| `PATH_TRAVERSAL` | `../../etc/passwd` | **Reject** on email and strict text |
| `COMMAND_INJECTION` | `` `whoami` ``, `; ls -la` | **Reject** on strict text |
| `OVERFLOW` | 10,000-char strings | **Reject** on numeric fields |
| `STRICT_FIELD_ATTACKS` | Union of the above | Use with `it.each()` for typed fields |
| `KNOWN_NAME_FORMAT_PASSES` | `admin'--` | **Passes** name/city regex; document only |

### Strict vs free-text fields

**Strict fields** (format validation must reject attacks):

- Email, phone, legal name
- Height, weight, lab numbers
- US ZIP, street address (basic XSS patterns blocked)
- City (letters, spaces, apostrophe, hyphen only)

**Free-text fields** (may accept SQL/XSS as literal strings):

- Medication dose, allergy reaction, stop reason, lifestyle notes
- These are stored as JSON text; safety depends on **parameterized DB queries** and **React output encoding**, not regex rejection.

Tests for free-text document acceptance explicitly, e.g.:

```typescript
it("accepts SQL literal in optional free-text stop_reason", () => {
  // payload passes step validation; backend must not concatenate into SQL
});
```

## What each test file covers

### `form-validation.test.ts`

- `isFilled`, parsers, email, phone, person name
- Height/weight validators with `SQL_INJECTION`
- Medication/allergy row required fields
- Optional numeric labs
- Overflow strings on weight fields

### `address-validation.test.ts`

- ZIP format (5-digit and ZIP+4)
- Street must include a number and block obvious XSS
- City format
- `isIdentityAddressComplete` requires `address_verified === "true"`

### `qualify-steps.test.ts`

- Happy path for every pre-signup step + account step
- Required-field failures (DOB under 18, missing consents, etc.)
- Account step: malicious first/last name, email, phone, short password
- Body metrics: SQL in height/weight fields

### `intake-steps.test.ts`

- Happy path for all 12 steps (with `validEligibility()`)
- Identity: verified address, emergency phone attacks
- Body metrics, weight history (per-med details)
- Medications, allergies, labs, pharmacy phone
- Safety acknowledgments
- `normalizeIntake` does not crash on malicious nested JSON

## Adding a new input field

When you add or change a form field, follow this checklist:

### 1. Put validation in the right layer

- Reusable format rule → `form-validation.ts` or `address-validation.ts`
- Step-specific rule (checkboxes, conditional lists) → `qualify-steps.ts` or `intake-steps.ts`

### 2. Decide field type

| Type | Validator pattern | Attack expectation |
|------|-------------------|------------------|
| Email | `isValidEmail` | Reject all `STRICT_FIELD_ATTACKS` and `maliciousEmails()` |
| Phone | `isValidPhone` | Reject all `STRICT_FIELD_ATTACKS` |
| Name | `isValidPersonName` | Reject XSS; document any SQL probes in `KNOWN_NAME_FORMAT_PASSES` |
| Number | `parsePositiveNumber` / `parseNonNegativeInt` | Reject all `SQL_INJECTION` |
| Free text | `isFilled` only | Test required/empty; optionally document literal SQL acceptance |
| Enum / boolean | Type check in step validator | Test missing vs valid selection |

### 3. Add tests

1. **Success case** — valid value passes step/field validator
2. **Failure cases** — empty, wrong type, out-of-range, missing dependent fields
3. **Injection cases** — run `STRICT_FIELD_ATTACKS` through strict validators with `it.each()`
4. **Update helpers** — extend `validQualifySlice()`, `validAccountFields()`, or `validIntake()` in `test-data.ts`

Example for a new strict field:

```typescript
// form-validation.test.ts
it.each(STRICT_FIELD_ATTACKS)("rejects malicious widget code %j", (payload) => {
  expect(isValidWidgetCode(payload)).toBe(false);
});

// qualify-steps.test.ts (if on a step)
it.each(STRICT_FIELD_ATTACKS)("rejects widget code on account step %j", (payload) => {
  expect(getQualifyStepError("account", validQualifySlice(), validAccountFields({ widgetCode: payload }))).not.toBeNull();
});
```

### 4. Run tests

```bash
npm test              # frontend
npm run test:backend  # backend
npm run test:all      # both
```

All tests must pass before merging.

### 5. Backend (required for every POST/PATCH field)

1. Add or reuse validator in `backend/apps/common/validation/`
2. Wire into the serializer's `validate()` or `validate_<field>()` method
3. Add API test in the matching `backend/apps/<app>/tests/test_*_api.py`
4. Use payloads from `backend/apps/common/validation/payloads.py` (mirrors frontend fixtures)

Example backend API test:

```python
def test_rejects_malicious_phone(self):
    for payload in STRICT_FIELD_ATTACKS:
        with self.subTest(payload=payload):
            response = self.client.post(self.url, valid_register_payload(phone=payload), format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

## Common manual payloads (for QA)

Use these in browser devtools or API clients when spot-checking:

**SQL injection**

```
' OR '1'='1
1; DROP TABLE users;--
admin'--
```

**XSS**

```
<script>alert('xss')</script>
"><img src=x onerror=alert(1)>
javascript:alert(1)
```

**Path traversal**

```
../../etc/passwd
%2e%2e%2fetc%2fpasswd
```

**Command injection**

```
; ls -la
| cat /etc/passwd
`whoami`
```

**Overflow**

Paste 10,000+ characters into any numeric or short-text field.

Expected UI behavior: inline error from `getQualifyStepError` / `getIntakeStepError`, Continue button stays disabled.

Expected API behavior: `400 Bad Request` with serializer validation errors; malicious payloads must never persist.

## Backend validation

Backend serializers call shared validators in `backend/apps/common/validation/` — keep these in sync with the TypeScript validators.

| Serializer | Validates |
|------------|-----------|
| `RegisterSerializer` | email, first_name, last_name, phone, password (Django validators) |
| `EligibilitySerializer` | height/weight ranges, goal < current, is_18_or_older |
| `MedicalIntakeSerializer` | identity address/phone, body_metrics weights, labs, pharmacy phone, med/allergy rows |
| `ConsentRecordSerializer` | all ack booleans must be true, typed_signature name format |

Run backend tests:

```bash
npm run test:backend
# or: ./scripts/test-backend.sh
```

Uses SQLite in-memory via `config/settings_test.py` — no Docker required.

## Related files

- Cursor agent rule: `.cursor/rules/input-validation-tests.mdc`
- Frontend validators: `src/lib/form-validation.ts`, `src/lib/address-validation.ts`
- Frontend step logic: `src/lib/qualify-steps.ts`, `src/lib/intake-steps.ts`
- Backend validators: `backend/apps/common/validation/`
- Backend test runner: `scripts/test-backend.sh`
