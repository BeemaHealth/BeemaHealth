# HIPAA compliance guide for Aretide agents

**Purpose:** Give AI agents a checklist to evaluate whether code and infrastructure changes are **HIPAA-aligned** for Aretide — a telehealth platform that stores **PHI** (Protected Health Information).

> **This is not legal advice.** Aretide implements technical safeguards in code, but full HIPAA compliance also requires signed **BAAs** (Business Associate Agreements), policies, training, and legal review. When in doubt, flag the issue to the user rather than assuming compliance.

**Related docs:** [AGENTS.md](../AGENTS.md) · [backend/HOSTING.md](../backend/HOSTING.md) · [backend/README.md](../backend/README.md) · [backend/DATABASE.md](../backend/DATABASE.md) · [docs/INPUT_VALIDATION_TESTS.md](./INPUT_VALIDATION_TESTS.md)

---

## Quick agent checklist (run before finishing any task)

Use this when your change touches patient data, auth, storage, logging, APIs, or deployment.

| # | Question | Must be |
|---|----------|---------|
| 1 | Does this store PHI in `localStorage`, `sessionStorage`, cookies readable by JS, or URL query params? | **No** |
| 2 | Does this log PHI (names, DOB, phone, intake answers, tokens) to console, files, or error trackers? | **No** |
| 3 | Does this expose PHI to unauthenticated users or wrong role (patient vs provider)? | **No** |
| 4 | Is PHI transmitted only over HTTPS in production? | **Yes** |
| 5 | Are new write endpoints authenticated, validated server-side, and covered by tests? | **Yes** |
| 6 | Does this use parameterized queries / ORM (no raw SQL with user input)? | **Yes** |
| 7 | Does this add a subprocessor (email, analytics, AI API) that receives PHI? | **Flag for BAA** |
| 8 | Is real patient data being used in local Docker dev? | **No — fake data only** |

If any answer is wrong, **stop and fix** or explain the risk to the user before marking the task done.

---

## What counts as PHI in this project

**PHI** = health information that identifies a person. In Aretide, treat all of the following as PHI:

| Category | Examples in this codebase |
|----------|---------------------------|
| Identity | Name, email, phone, DOB, state, address, emergency contact |
| Clinical screening | Eligibility answers, height/weight/BMI, safety/contraindication responses |
| Medical intake | All 12 intake steps — conditions, meds, allergies, labs, lifestyle, pregnancy |
| Legal/clinical consent | Typed signature, acknowledgment timestamps |
| Documents | Lab uploads, ID images, insurance cards (`/api/documents/`) |
| Derived clinical data | Safety flags, provider review notes |

**Not PHI (generally):** anonymous funnel session IDs (HttpOnly cookie), auth token string (still protect it — session credential), non-identifying marketing page content.

When unsure, **treat it as PHI**.

---

## HIPAA Security Rule — how Aretide maps to code

HIPAA’s Security Rule has three safeguard categories. Below: what Aretide requires and what is **already implemented** vs **still required**.

### Administrative safeguards (policies & process)

These are **launch blockers for real PHI** — not fully automatable in code:

| Requirement | Status | Agent action |
|---------------|--------|--------------|
| Signed BAA with hosting (AWS or Heroku Shield) | **Required before prod PHI** | Do not deploy real patients to non-BAA infra — see [HOSTING.md](../backend/HOSTING.md) |
| BAAs with subprocessors (email, monitoring, etc.) | **Required** | Flag any new vendor that receives PHI |
| Privacy Policy + Notice of Privacy Practices | **Required** | Do not change legal copy without user/legal review |
| Security risk assessment | **Required (annual)** | Note new risks when adding features |
| Workforce access policies & training | **Required** | Provider admin access is sensitive |
| Breach notification procedure | **Required** | Escalate suspected breaches to user immediately |
| Colorado telehealth legal review | **Required** | Jurisdiction-specific — flag legal questions |
| CE vs BA entity structure | **Legal counsel** | Do not assume in code |

### Physical safeguards

| Requirement | Status | Agent action |
|---------------|--------|--------------|
| Production in BAA-covered datacenter | Planned AWS EC2/RDS/S3 | See [deploy/aws.md](../backend/deploy/aws.md) |
| Local Docker dev | **Not HIPAA-compliant** | Never use real patient data locally |
| Workstation/device policy | Organizational | Remind user this is outside codebase scope |

### Technical safeguards (what agents enforce in code)

#### 1. Access control

| Control | Implementation | Agent rules |
|---------|----------------|-------------|
| Authentication | DRF Token auth | New `/me/` endpoints → `IsPatient` or `IsProvider` |
| Role separation | Patients: `/api/*/me/`; Providers: `/api/admin/` | Never give patients admin routes; never expose other users’ records |
| Rate limiting | Auth endpoints throttled (`auth: 20/minute`) | Apply throttling to new public endpoints that touch accounts |
| Minimum necessary | Serializers return only needed fields | Do not add “dump all data” debug endpoints |

**Permission classes:** `backend/apps/accounts/permissions.py` — `IsPatient`, `IsProvider`

#### 2. Audit controls

| Control | Implementation | Agent rules |
|---------|----------------|-------------|
| PHI access logging | `audit_events` table via `log_audit_event()` | Log create/read/update on PHI resources — follow existing views |
| What is logged | `user`, `action`, `resource_type`, `resource_id`, `ip`, `user_agent` | **Do not log PHI field values** in audit rows |
| Read deduplication | `READ_DEDUPE_SECONDS = 60` in `log_audit_event()` | First PHI **read** per `(user, resource_type, resource_id)` per 60s window; anonymous funnel reads also match `ip_address` |
| Writes and auth | Always logged (never deduped) | **create**, **update**, **delete**, **login**, **logout** always insert a row |
| Middleware | `AuditMiddleware` — PHI path prefixes defined | Extend `PHI_PATH_PREFIXES` if new PHI API namespaces added |

**Read deduplication policy:** Application audit logs record the first PHI **read** of a given resource per user (or per IP for anonymous funnel sessions) within a 60-second window. Repeated reads of the same resource in that window are not logged separately. All **create**, **update**, **delete**, and **authentication** events are always logged. This satisfies §164.312(b) by recording meaningful access and all mutations without logging duplicate fetches caused by page remounts or dev tooling.

**Code:** `backend/apps/audit/services.py`, `backend/apps/audit/middleware.py`

#### 3. Integrity

| Control | Implementation | Agent rules |
|---------|----------------|-------------|
| Input validation | Frontend + backend validators | See [INPUT_VALIDATION_TESTS.md](./INPUT_VALIDATION_TESTS.md) |
| No SQL injection | Django ORM only | Never concatenate user input into SQL |
| Status guards | e.g. cannot revert submitted intake to draft | Preserve business-rule integrity checks |

#### 4. Transmission security

| Control | Implementation | Agent rules |
|---------|----------------|-------------|
| TLS in production | `SECURE_SSL_REDIRECT`, HSTS when `DEBUG=False` | Never disable TLS flags for prod |
| DB SSL | `DATABASE_SSL_REQUIRE=true` in production | Required for RDS |
| CORS | Explicit allowed origins only | Do not use `CORS_ALLOW_ALL_ORIGINS` |
| CSRF | Enabled for session/admin | Keep CSRF trusted origins accurate |

**Config:** `backend/config/settings.py`

#### 5. Encryption

| Data | At rest | Agent rules |
|------|---------|-------------|
| Phone, DOB | `EncryptedCharField` / `EncryptedDateField` (Fernet) on `users` | New sensitive scalar fields → use `django-fernet-fields-v2` |
| Address, emergency contact | Encrypted on `patient_profiles` | Same |
| Funnel DOB (pre-account) | Encrypted on `eligibility_responses` | Same |
| Database | Provider responsibility (RDS encryption) | Enable encryption on prod DB |
| Documents (S3) | SSE-KMS when `AWS_STORAGE_BUCKET_NAME` set | Do not store uploads on local disk in prod |
| Fernet key | `FERNET_KEY` env var | Never commit keys; rotate via secrets manager in prod |

**Generate production key:**
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Intake JSON columns are **not** individually Fernet-encrypted today — they rely on database-level encryption at rest. Do not copy PHI to unencrypted caches (Redis, etc.) without explicit design review.

---

## Frontend PHI rules

| Rule | Detail |
|------|--------|
| **No PHI in browser storage** | `localStorage` / `sessionStorage` must not hold intake, eligibility, or clinical data |
| **Allowed in browser** | Auth token (memory/`localStorage` for session — minimize exposure); HttpOnly funnel cookie (opaque, not readable by JS) |
| **API-only PHI path** | When `VITE_API_URL` is set, PHI goes to Django API only |
| **React rendering** | Never use `dangerouslySetInnerHTML` with user content; React escapes by default — keep it that way |
| **Error messages** | Do not echo raw PHI back in client error toasts from server payloads |

### Known non-compliant gap (do not extend)

`src/lib/storage.ts` — **temporary localStorage fallback** when API is unavailable. Marked for removal. Agents must:

- **Not add new PHI writes to this module**
- **Not add features that depend on localStorage for clinical data**
- Prefer removing/refactoring toward API-only when touching this file

---

## Backend PHI rules

| Rule | Detail |
|------|--------|
| **Validate all inputs** | Serializers + `apps/common/validation/` — see [INPUT_VALIDATION_TESTS.md](./INPUT_VALIDATION_TESTS.md) |
| **No PHI in logs** | `settings.py`: “never log PHI in request bodies” — do not add request-body logging middleware |
| **Email in dev** | Console backend logs verification links — **dev only**; prod needs BAA-covered email provider |
| **Canonical storage** | One field → one table — see [DATABASE.md](../backend/DATABASE.md#canonical-field-ownership-no-duplicates) |
| **Deduplication** | Intake serializer strips duplicate keys — do not bypass dedupe for “convenience” |

---

## Infrastructure: where PHI may live

| Environment | Real PHI allowed? | Notes |
|-------------|-------------------|-------|
| Local Docker | **No** | Fake/test data only |
| Staging | Only with BAA + fake/synthetic data policy | Treat like prod technically |
| Production AWS EC2 + RDS + S3 | **Yes, after AWS BAA** | Default planned path |
| Heroku Shield | **Yes, after Salesforce BAA** | Alternate if confirmed |
| Standard Heroku | **Never** | Not permitted |
| GitHub Pages (frontend) | Static assets only — **no PHI stored** | Frontend must not embed PHI in build |

Full hosting decision tree: [backend/HOSTING.md](../backend/HOSTING.md)

---

## Agent decision tree: “Is my change HIPAA-aligned?”

```
Does it touch patient health or identifying data?
├── No → Apply general security hygiene; run tests if logic changed
└── Yes →
    ├── Stored only on server (not browser storage)? ──No──► STOP — fix storage
    ├── Authenticated + authorized role? ──No──► STOP — add permissions
    ├── Validated frontend + backend? ──No──► STOP — add validators + tests
    ├── Logged without PHI values? ──No──► STOP — fix logging
    ├── Uses ORM (no raw SQL)? ──No──► STOP — use ORM
    ├── New third-party service sees data? ──Yes──► FLAG — BAA required
    └── Deployed to BAA-covered prod only? ──No──► OK for dev with fake data
```

---

## Pre-launch compliance gate (real patients)

Before accepting real Colorado patient PHI in production, confirm with the user that these are done:

- [ ] AWS BAA (or Heroku Shield BAA) signed
- [ ] BAAs for email, document storage, and any other subprocessors
- [ ] Production: TLS, RDS encryption, S3 SSE-KMS, secrets in Secrets Manager
- [ ] `FERNET_KEY` and `SECRET_KEY` are production-grade and not in git
- [ ] Privacy Policy, telehealth consent, and NPP published
- [ ] Security risk assessment completed
- [ ] Breach notification procedure documented
- [ ] `src/lib/storage.ts` localStorage PHI fallback removed or disabled in production builds
- [ ] Legal review of Colorado telehealth + MSO/PC structure

---

## When you find a HIPAA gap in code

1. **Do not silently ignore it** — tell the user what is non-compliant and the risk.
2. **Fix it in code** if the fix is clear and in scope (e.g. adding server validation, removing a PHI log).
3. **Do not edit this file or `AGENTS.md`** to “waive” a requirement — propose doc changes to the user first.
4. **Run `npm run test:all`** after security-related fixes.

---

## File reference index

| Topic | Location |
|-------|----------|
| Encrypted model fields | `backend/apps/accounts/models.py`, `backend/apps/patients/models.py` |
| Audit logging | `backend/apps/audit/` |
| Security settings | `backend/config/settings.py` |
| PHI type comments | `src/lib/types/mvp.ts` |
| API client (PHI path) | `src/lib/api/client.ts` |
| localStorage gap | `src/lib/storage.ts` |
| Hosting / BAA | `backend/HOSTING.md`, `backend/deploy/aws.md` |
| Input attack tests | `docs/INPUT_VALIDATION_TESTS.md` |
| Agent workflow | `AGENTS.md` |

---

## Glossary

| Term | Meaning |
|------|---------|
| **HIPAA** | US law governing protected health information |
| **PHI** | Protected Health Information — identifiable health data |
| **BAA** | Business Associate Agreement — required contract with vendors that handle PHI |
| **CE** | Covered Entity — health plan, clearinghouse, or provider who transmits PHI electronically |
| **BA** | Business Associate — entity that handles PHI on behalf of a CE |
| **NPP** | Notice of Privacy Practices |
| **TLS** | Encryption in transit |
| **SSE-KMS** | S3 server-side encryption with AWS KMS keys |
