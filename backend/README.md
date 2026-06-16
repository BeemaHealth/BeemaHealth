# Aretide Backend (Django + DRF)

> **Documentation index:** [../README.md](../README.md) — links to all project docs (includes acronym glossary).

**DRF** = Django REST Framework. **HIPAA** = Health Insurance Portability and Accountability Act. **PHI** = **Protected Health Information** (patient-identifying health data: name, DOB, phone, intake answers, uploads, etc.).

HIPAA-aligned technical controls for telehealth intake. **Local development is not HIPAA-compliant.** Do not store real patient PHI until production infrastructure and administrative safeguards are in place.

## Quick start (Docker)

```bash
cd backend
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Add output to FERNET_KEY in ../.env

docker compose up --build
docker compose exec api python manage.py migrate
docker compose exec api python manage.py createsuperuser
```

API (Application Programming Interface): http://localhost:8000/api/health/  
Docs: http://localhost:8000/api/docs/

## Quick start (local Python)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements/dev.txt
export DATABASE_URL=postgres://aretide:aretide@localhost:5432/aretide
export SECRET_KEY=dev-secret
export FERNET_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
python manage.py migrate
python manage.py runserver 8000
```

## API endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register/` | Public |
| POST | `/api/auth/login/` | Public |
| POST | `/api/auth/logout/` | Token |
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
python manage.py shell -c "from apps.accounts.models import User; u=User.objects.get(email='provider@example.com'); u.is_provider=True; u.save()"
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

1. Signed **BAA** (Business Associate Agreement) with hosting provider (Heroku Shield or **AWS** (Amazon Web Services))
2. BAAs with all subprocessors (email, monitoring, etc.)
3. Privacy Policy + Notice of Privacy Practices
4. Security risk assessment (annual)
5. Workforce access policies and training
6. Breach notification procedure
7. Colorado telehealth legal review
8. Covered entity vs Business Associate structure with counsel

> **Disclaimer:** This codebase implements HIPAA-aligned technical controls. Final compliance requires legal counsel and a completed risk assessment.

## Production deployment

### Heroku Shield (if BAA confirmed)

- Shield Private Space + Shield Postgres + Shield Dynos only
- Set `HOSTING_TARGET=heroku_shield`
- Use `Procfile` release phase for migrations

### AWS (recommended fallback)

- **ECS** (Elastic Container Service) Fargate or Elastic Beanstalk + **RDS** (Relational Database Service, encrypted) + S3 (SSE-KMS)
- Set `HOSTING_TARGET=aws`
- Enable AWS BAA before PHI

## Frontend integration

Set in repo root `.env`:

```
VITE_API_URL=http://localhost:8000/api
```

Restart the Vite dev server after changing env vars.
