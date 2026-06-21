# Provider API manual testing (curl cookbook)

The React `/admin` routes are disabled. Use Django admin (`http://localhost:8000/admin/`), API docs (`/api/docs/`), or curl with a **provider token**.

## Setup

1. Create a provider user:
   ```bash
   docker compose -f backend/docker-compose.yml exec api python manage.py shell -c \
     "from apps.accounts.models import User; u=User.objects.get(email='provider@example.com'); u.is_provider=True; u.save()"
   ```
2. Get a provider token:
   ```bash
   curl -s -X POST http://localhost:8000/api/auth/login/ \
     -H "Content-Type: application/json" \
     -d '{"email":"provider@example.com","password":"YOUR_PASSWORD"}'
   ```

Export `TOKEN` and `PATIENT_ID` for the commands below.

## Set more_info_needed

```bash
curl -X PATCH "http://localhost:8000/api/admin/patients/${PATIENT_ID}/" \
  -H "Authorization: Token ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status":"more_info_needed","decision":"needs_more_info","patient_note":"Please update your address."}'
```

## Patient resubmit (patient token)

```bash
# PATCH intake while more_info_needed
curl -X PATCH http://localhost:8000/api/medical-intakes/me/ \
  -H "Authorization: Token ${PATIENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"identity":{"address":"456 Oak Ave","city":"Denver","zip":"80203"}}'

curl -X POST http://localhost:8000/api/medical-intakes/me/resubmit/ \
  -H "Authorization: Token ${PATIENT_TOKEN}"
```

Verify submission v2:

```bash
curl "http://localhost:8000/api/admin/patients/${PATIENT_ID}/" \
  -H "Authorization: Token ${TOKEN}"
```

## Create prescription (provider)

```bash
curl -X POST "http://localhost:8000/api/admin/patients/${PATIENT_ID}/prescription/" \
  -H "Authorization: Token ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"medication_name":"Wegovy","dosage":"0.25 mg","frequency":"Once weekly","route":"injection"}'
```

## Mock doctor webhook (integration testing)

```bash
curl -X POST http://localhost:8000/api/webhooks/doctor/ \
  -H "Authorization: Bearer ${DOCTOR_WEBHOOK_SECRET}" \
  -H "Content-Type: application/json" \
  -d @backend/apps/integrations/tests/fixtures/doctor_approved.json
```

## Mock LifeFile webhook

```bash
curl -X POST http://localhost:8000/api/webhooks/lifefile/ \
  -u "${LIFEFILE_WEBHOOK_USER}:${LIFEFILE_WEBHOOK_PASSWORD}" \
  -H "Content-Type: application/json" \
  -d @backend/apps/pharmacy/tests/fixtures/lifefile_shipped.json
```

## Automated integration smoke (preferred)

After backend unit tests, `npm run test:backend` runs `smoke_clinical_flow`, which chains the full mock clinical path in one command:

```bash
npm run test:backend
# or only the smoke step:
cd backend && python manage.py smoke_clinical_flow --settings=config.settings_test
# against Docker dev DB:
./scripts/smoke-integration.sh
```

Flow exercised: provider sets `more_info_needed` → patient PATCH + resubmit → doctor webhook (approved + Rx) → `POST /api/pharmacy/orders/` (mock adapter) → LifeFile shipped webhook → asserts review approved, order shipped, tracking set.
