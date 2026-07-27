# Backend — deferred (not active work)

Beema is **not hosting or running its own backend for the foreseeable future**. [Bask](https://bask.co/) is the storefront/checkout/questionnaire platform for this phase — marketing CTAs link out to Bask-hosted questionnaires and checkout (see `src/lib/cta-ids.ts`) instead of the in-house `/qualify` → `/intake` → `/consent` → `/dashboard` flow.

The Django backend in `backend/` and everything below is **intact and accurate** — it is not being deleted, and nothing here is stale. It's reference material for a later resumption, not part of day-to-day orientation. Don't route new feature work through these docs, and don't touch `backend/` code, unless the user explicitly asks to resume backend work.

## Where everything still lives

| Topic | Doc |
|-------|-----|
| Backend setup, API list, HIPAA notes | `backend/README.md` |
| Database schema, canonical field ownership | `backend/DATABASE.md` |
| Production hosting (Heroku Shield vs AWS) | `backend/HOSTING.md` |
| Local Docker dev | `docs/LOCAL-DEV.md` |
| Patient funnel (qualify → account, session/cookie) | `docs/features/patient-funnel.md` |
| Medical intake (12-step questionnaire) | `docs/features/medical-intake.md` |
| Staff CRM | `docs/features/staff-crm.md` |
| Dynamic questionnaire system | `docs/features/dynamic-questionnaire.md`, `docs/DYNAMIC_QUESTIONNAIRE_SYSTEM.md` |
| Medications catalog | `docs/features/medications.md` |
| Beluga integration (consults, refills, webhooks) | `docs/features/beluga-integration.md` |
| Beluga provider/pharmacy API | `docs/BELUGA_API.md` (pointer; gitignored spec at `docs/vendor/BELUGA_API.md`) |
| LifeFile / MediVera pharmacy API | `docs/LIFEFILE_MEDIVERA_API.md` (pointer; gitignored spec at `docs/vendor/`) |
| Intake schema reference | `docs/BEEMAHEALTH_INTAKE_SCHEMA_V2.md` |
| MediVera onboarding questions | `docs/MEDIVERA_ONBOARDING_QUESTIONS.md` |
| Provider API testing | `docs/PROVIDER_API_TESTING.md` |

Not deferred — still active, still frontend-relevant:

- `docs/features/analytics.md` — GA4/UTM/CTA attribution tracking is live on the marketing site regardless of backend status; only its `FunnelEvent` server-storage and staff-analytics-view sections are dormant.
- `docs/INPUT_VALIDATION_TESTS.md` — the frontend validator/test guidance stays mandatory; only the backend serializer half is dormant.

## When backend work resumes

Re-point `CLAUDE.md` / `AGENTS.md` / `.cursor/rules/beemahealth-core.mdc`'s orient tables and default test commands back at these docs, and restore `npm run test:all` (frontend + backend) as the default test command.
