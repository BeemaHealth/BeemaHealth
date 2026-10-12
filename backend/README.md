# Beema Health Portal Backend

New Django 5 backend for the telemedicine patient portal (intake, treatments, billing, messaging, fulfillment). Replaces the Bask platform's portal layer for Beema-owned operations. Design lives in `../docs/portal/BUILD-SPEC.md`. The previous in-house backend is in `../old_backend/` and is a reference only - never import from it.

Differences from the legacy stack (both can coexist locally):

| | old_backend | backend |
|---|---|---|
| Compose project | `beemahealth` | `beemahealth_portal` |
| API port | 8000 | 8001 |
| Postgres port | 5432 | 5433 |

## App Map

| App | Purpose |
|---|---|
| `apps.common` | Shared base model, crypto, exceptions, utilities |
| `apps.accounts` | User authentication, staff permissions, grants, magic links |
| `apps.patients` | Patient profiles, addresses, allergies, medications, conditions, consent records, data export requests |
| `apps.audit` | Append-only audit log (reads, writes, logins, exports, break-glass access) |
| `apps.catalog` | Products, variants, plans, pricing, price overrides |
| `apps.questionnaires` | Questionnaire engine: definitions, submissions, node evaluation, file uploads |
| `apps.clinical` | Treatments, visits, prescriptions, action items, dose logs, health metrics, state machine |
| `apps.routing` | Routing rules, routing decisions, variant replacement (doctor network vs pharmacy routing) |
| `apps.fulfillment` | Orders, shipment batches, shipments, care events (append-only) |
| `apps.billing` | Subscriptions, invoices, coupons, refunds, Stripe webhooks, vendor costs |
| `apps.messaging` | Conversations, messages, attachments, notifications, abandoned checkout drips |
| `apps.integrations` | Beluga (doctor network), LifeFile (pharmacy), Stripe webhook ingestion and processing |

## Running Tests

```bash
cd /Users/mattaertker/Documents/Github/BeemaHealth/backend
. /private/tmp/claude-501/-Users-mattaertker-Documents-Github-BeemaHealth/f1800c72-3cf5-4337-80ee-5c0f532dda57/scratchpad/venv/bin/activate
SECRET_KEY=x DATABASE_URL=sqlite:///:memory: DEBUG=true python manage.py test apps.<app> --settings=config.settings_test
```

## Seed Definitions

After the Docker stack is running, populate the catalog, layouts, questionnaires, and routing rules:

```bash
python manage.py load_definitions      # Catalog, routing organizations, routing rules
python manage.py load_questionnaires   # Questionnaire definitions and layouts
```

## Django Admin

Create a superuser to access the admin at `/admin/`:

```bash
python manage.py createsuperuser
```

Admin sections per app (staff can edit):
- **Accounts**: Users, Organizations, Grants, StaffProfiles, MagicLinkTokens
- **Patients**: PatientProfiles, Addresses, Allergies, Medications, Conditions, Consent Records, Identity Documents, Data Requests
- **Audit**: AuditEvents (read-only, append-only)
- **Catalog**: Products, ProductVariants, VariantMappings, Plans, PlanPrices, PlanPhases, PriceOverrides
- **Questionnaires**: Questionnaires, QuestionnaireVersions, Layouts, Submissions, SubmissionFiles
- **Clinical**: Treatments, Visits, Prescriptions, ActionItems, DrugIneligibilities, DoseLogs, HealthMetrics (filterable by state)
- **Routing**: RoutingRules, RoutingDecisions, ReplacementRules
- **Fulfillment**: Orders, ShipmentBatches, Shipments, CareEvents (read-only, append-only)
- **Billing**: Subscriptions, Invoices, InvoiceLines, Coupons, CouponRedemptions, Refunds, VendorCosts, StoreCreditEntries, AffiliateLinks
- **Messaging**: Conversations (Active, Awaiting store reply, Awaiting doctor reply, Your inbox, Unassigned, Archived), Messages, InternalNotes, NotificationDeliveries, AbandonedCheckouts
- **Integrations**: InboundEvents (read/replay), OutboundCalls (read-only)

## API Prefix Map

| Prefix | App |
|---|---|
| `/api/v1/auth/` | accounts (login, logout, magic links, OTP, me, CSRF) |
| `/api/v1/patients/` | patients (profile, addresses, allergies, meds, conditions, consents, data requests, exports) |
| `/api/v1/catalog/` | catalog (products, plans, pricing) |
| `/api/v1/questionnaires/` | questionnaires (start, current node, answer, upload) |
| `/api/v1/treatments/` | clinical (treatments, doses, health metrics, action items, cancel) |
| `/api/v1/fulfillment/` | fulfillment (orders, shipments, refills) |
| `/api/v1/billing/` | billing (quote, checkout, subscriptions, invoices, payment methods, auto-renew) |
| `/api/v1/messaging/` | messaging (conversations, messages, attachments) |
| `/api/v1/webhooks/` | integrations (Beluga, LifeFile, Stripe webhooks - CSRF exempt, always 200) |
| `/admin/` | Django admin (superuser only) |

## Local Development

The Docker Compose stack (database, optional Redis) is user-owned: you start, stop, and restart it. The backend API server is not started by this repo - start it in a separate terminal with `python manage.py runserver 0.0.0.0:8001` or as configured in your IDE.

Environment variables are read from `.env` (copy from `.env.example` and fill in values - never commit secrets). Required in production: `FIELD_ENCRYPTION_KEY`, `STRIPE_SECRET_KEY`, `BELUGA_API_KEY`, `BELUGA_WEBHOOK_SECRET`, and either `TWILIO_AUTH_TOKEN` + `SMS_BACKEND=twilio` or `EMAIL_NOTIFY_BACKEND=ses`.

Debug mode (`DEBUG=true`) disables SSL checks and serves static files. Never use in production.
