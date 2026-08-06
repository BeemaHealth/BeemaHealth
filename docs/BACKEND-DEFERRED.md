# Legacy backend & in-house funnel (not the live product)

**Live product:** Marketing site (this repo) + [Bask](https://bask.co/) for **intake** (one long questionnaire — not a separate eligibility vs intake product), checkout, backend, and patient portal (Hive). See `docs/features/legitscript.md` and `src/lib/cta-ids.ts` (`resolveCta()`).

The `backend/` Django tree and old in-repo routes (`/qualify`, `/intake`, `/consent`, `/dashboard`, etc.) are **leftover from a previous in-house funnel**. They are **not** what Beema runs today. Do **not** orient new features, CTAs, or agent workflows around them.

This file indexes that legacy material so it isn’t lost. **Don’t route day-to-day work through these docs**, and **don’t touch `backend/` or revive the old funnel**, unless the user explicitly asks.

## Terminology (live)

| Say | Don’t say (for the live product) |
|-----|----------------------------------|
| Bask **intake** | Separate Beema “eligibility” then “intake” |
| Bask / Hive portal | In-house `/dashboard` as the patient app |
| Marketing CTAs → Bask | CTAs → `/qualify` or `/waitlist` as the primary path |

## Where legacy docs still live

| Topic | Doc |
|-------|-----|
| Backend setup, API list, HIPAA notes | `backend/README.md` |
| Database schema, canonical field ownership | `backend/DATABASE.md` |
| Production hosting (Heroku Shield vs AWS) | `backend/HOSTING.md` |
| Local Docker dev | `docs/LOCAL-DEV.md` |
| Old patient funnel (qualify → account, session/cookie) | `docs/features/patient-funnel.md` |
| Old 12-step medical intake | `docs/features/medical-intake.md` |
| Staff CRM | `docs/features/staff-crm.md` |
| Dynamic questionnaire system | `docs/features/dynamic-questionnaire.md`, `docs/DYNAMIC_QUESTIONNAIRE_SYSTEM.md` |
| Medications catalog | `docs/features/medications.md` |
| Beluga integration | `docs/features/beluga-integration.md` |
| Beluga provider/pharmacy API | `docs/BELUGA_API.md` (pointer; gitignored spec at `docs/vendor/BELUGA_API.md`) |
| LifeFile / MediVera pharmacy API | `docs/LIFEFILE_MEDIVERA_API.md` (pointer; gitignored spec at `docs/vendor/`) |
| Intake schema reference | `docs/BEEMAHEALTH_INTAKE_SCHEMA_V2.md` |
| MediVera onboarding questions | `docs/MEDIVERA_ONBOARDING_QUESTIONS.md` |
| Provider API testing | `docs/PROVIDER_API_TESTING.md` |

Still active and frontend-relevant (not legacy):

- `docs/features/analytics.md` — GA4/UTM/CTA attribution on the marketing site
- `docs/INPUT_VALIDATION_TESTS.md` — marketing-site validator guidance (ignore the Django half unless asked)
- `docs/features/legitscript.md`, `docs/features/treatment-pages.md`, `docs/features/homepage.md`, etc.

## If the user explicitly asks to work on legacy code

Re-read the relevant docs above, run backend tests only for that task (`npm run test:backend` / `npm run test:all`), and keep changes scoped. Do not silently treat a resume of Django as a product-direction change without confirmation.
