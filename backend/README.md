# Beema Health Backend (Django + DRF)

> **Documentation index:** [../README.md](../README.md) — links to all project docs (includes acronym glossary). **Launch plan:** [Starting Point/launchPlan.md](../Starting%20Point/launchPlan.md) — API endpoints below map to Steps 2–8; partner/pharmacy/Stripe integrations are Steps 9–11.

**DRF** = Django REST Framework. **HIPAA** = Health Insurance Portability and Accountability Act. **PHI** = **Protected Health Information** (patient-identifying health data: name, DOB, phone, intake answers, uploads, etc.).

HIPAA-aligned technical controls for telehealth intake. **Local development is not HIPAA-compliant.** Do not store real patient PHI until production infrastructure and administrative safeguards are in place.

## Quick start (Docker — required)

Local backend development uses **Docker Compose** so every developer gets the same Postgres 16 + Python 3.12 environment. Full guide: **[docs/LOCAL-DEV.md](../docs/LOCAL-DEV.md)**.

From the repo root (after [first-time setup](../README.md#first-time-setup)):

```bash
npm run dev:backend
```

Migrations run automatically when the API container starts. First-time only — create an admin user:

```bash
docker compose -f backend/docker-compose.yml exec api python manage.py createsuperuser
```

To run migrations manually (e.g. after pulling new migration files without restarting):

```bash
docker compose -f backend/docker-compose.yml exec api python manage.py migrate
```

API: http://localhost:8000/api/health/  
Docs: http://localhost:8000/api/docs/  
Admin: http://localhost:8000/admin/ (use `createsuperuser` credentials; requires `CSRF_TRUSTED_ORIGINS` for localhost — included in `.env.dev`)

## API endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/funnel/session/` | Public — anonymous funnel ([DATABASE.md — Anonymous funnel session](DATABASE.md#anonymous-funnel-session-pre-account)) |
| GET/PATCH | `/api/funnel/eligibility/` | Funnel cookie |
| POST | `/api/auth/register/` | Public (claims funnel cookie; sends verification email) |
| POST | `/api/auth/login/` | Public |
| POST | `/api/auth/logout/` | Token |
| POST | `/api/auth/verify-email/` | Public — verify email with token from link |
| POST | `/api/auth/resend-verification/` | Token — resend verification email |
| GET/PATCH | `/api/eligibility/me/` | Patient |
| POST | `/api/eligibility/` | Patient |
| GET/PATCH | `/api/medical-intakes/me/` | Patient |
| POST | `/api/medical-intakes/` | Patient |
| GET/POST | `/api/consent-records/me/` | Patient |
| GET | `/api/dashboard/me/` | Patient |
| GET/POST | `/api/documents/` | Patient |
| GET | `/api/admin/patients/` | Provider |
| GET/PATCH | `/api/admin/patients/{id}/` | Provider |

## Roles

- **Patient** (`is_patient=True`): default on registration
- **Provider** (`is_provider=True`): set via `createsuperuser` or Django admin

```bash
docker compose -f backend/docker-compose.yml exec api python manage.py shell -c "from apps.accounts.models import User; u=User.objects.get(email='provider@example.com'); u.is_provider=True; u.save()"
```

## HIPAA technical safeguards (implemented)

- **TLS** (Transport Layer Security) required in production (`SECURE_SSL_REDIRECT`, **HSTS** (HTTP Strict Transport Security))
- PostgreSQL encryption at rest (hosting provider responsibility)
- Field-level encryption for phone/**DOB** (date of birth)/address (`django-fernet-fields-v2`)
- **S3** (Amazon Simple Storage Service) **SSE-KMS** (Server-Side Encryption with AWS Key Management Service) for documents when `AWS_STORAGE_BUCKET_NAME` is set
- Token authentication with rate limiting on auth endpoints
- PHI access audit log (`audit_events` table)
- **RBAC** (Role-Based Access Control): patients see only `/me/`; providers see `/api/admin/`
- Colorado-only validation on registration and eligibility
- No PHI in application logs

## HIPAA administrative launch blockers (required before real PHI)

See [HOSTING.md](./HOSTING.md) for hosting go/no-go and:

1. Signed **BAA** (Business Associate Agreement) with hosting provider (Heroku Shield or **AWS**)
2. BAAs with all subprocessors (email, monitoring, etc.)
3. Privacy Policy + Notice of Privacy Practices
4. Security risk assessment (annual)
5. Workforce access policies and training
6. Breach notification procedure
7. Colorado telehealth legal review
8. Covered entity vs Business Associate structure with counsel

> **Disclaimer:** This codebase implements HIPAA-aligned technical controls. Final compliance requires legal counsel and a completed risk assessment.

## Production deployment

### AWS EC2 (planned)

- **EC2** instance running the production Docker image + **RDS** (encrypted) + S3 (SSE-KMS)
- Set `HOSTING_TARGET=aws`
- Enable AWS BAA before PHI
- Details: [deploy/aws.md](./deploy/aws.md)

### Heroku Shield (alternate — if BAA confirmed)

- Shield Private Space + Shield Postgres + Shield Dynos only
- Set `HOSTING_TARGET=heroku_shield`
- Use `Procfile` release phase for migrations

## Frontend integration

Each patient field has a single canonical table — no duplicate storage across `users`, `patient_profiles`, `eligibility_responses`, or intake JSON. See [DATABASE.md — Canonical field ownership](DATABASE.md#canonical-field-ownership-no-duplicates).

Environment files live at the repo root as `.env.dev`, `.env.staging`, or `.env.production`. Set `BEEMAHEALTH_ENV` to pick which file the backend loads (`dev` is the default). `npm run dev` uses Vite mode `dev` (`.env.dev`); `npm run build:staging` uses `.env.staging`.

```
BEEMAHEALTH_ENV=dev
VITE_API_URL=/api
```

Restart the Vite dev server after changing env vars.

## Email verification (local dev)

Registration sends a verification email using Django's **console email backend** (default in dev). The verification link is also logged by the API:

```bash
docker compose -f backend/docker-compose.yml logs -f api
```

After signing up, look for a line like:

```
Email verification link for you@example.com: http://localhost:8080/verify-email?token=...
```

Open that URL in the browser to verify, then continue to `/intake`.

To resend from the UI, use the **Resend verification email** button on `/verify-email/pending`.
