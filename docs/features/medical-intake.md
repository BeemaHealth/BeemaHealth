# Medical Intake

The intake collects clinical information providers need to prescribe. It runs **after** account creation and email verification.

## Data model

**`MedicalIntake`** (`medical_intakes` table) — one per user, updated in-place across sessions:
- `status`: `draft` → `submitted` → `under_review` → `approved` / `rejected`
- Each clinical section is a separate JSON column:
  - `identity`, `body_metrics`, `weight_history`, `medical_conditions`, `family_history`
  - `medications`, `allergies`, `pregnancy`, `lifestyle`, `labs`
  - `medication_preferences`, `safety_acknowledgments`, `account_screening`
- `questionnaire_responses` JSON — raw dynamic answers keyed by `field_key` (dynamic mode)
- `questionnaire_version_id` — pinned intake version UUID (**immutable** after first set)
- `working_version` — increments on patient resubmit after changes

**`IntakeSubmission`** — immutable point-in-time snapshot at submit:
- `snapshot` JSON — provider-facing denormalized payload
- `questionnaire_version_id` — intake version at submit
- `snapshot.questionnaire` — `{ version_id, slug, responses, display }` for dynamic intakes

**`SafetyFlag`** — contraindication flags from intake answers.

## Flow

1. Patient completes `/qualify` and creates an account
2. Email verification required before intake
3. `/intake` resolves intake questionnaire from qualify routing rules → loads published intake version
4. Dynamic mode: `IntakeDynamicFlow` PATCHes sections via `questionnaire_responses` + `maps_to_section`
5. Hardcoded fallback: `IntakeFlow` + `intake-steps.ts` when feature flag off
6. Submit creates `IntakeSubmission` snapshot with questionnaire metadata frozen

## Dynamic vs hardcoded

| Mode | When | UI |
|------|------|-----|
| **Dynamic funnel** | `VITE_DYNAMIC_QUESTIONNAIRES=true`, funnel `/intake` | `IntakeDynamicFlow` + staff-configured steps/fields |
| **Hardcoded funnel** | Flag off | `IntakeFlow` 12-step wizard |
| **Portal display** | `/dashboard/intake` | `DynamicIntakePortalView` when pinned version + responses exist; else hardcoded read-only |

Field answers map to JSON sections via `maps_to_section` on each field definition.

## Portal display (dynamic)

When `questionnaire_version_id` and `questionnaire_responses` are present:
- Fetch pinned version schema (staff-defined steps/fields)
- Render read-only labels + submitted values grouped by step
- Submitted snapshot uses the same labels frozen at submit time

Legacy patients without dynamic data keep the hardcoded `IntakeSubmissionViewer` / step read-only views.

## External API integration — Beluga Health only

**Aretide calls Beluga Health exclusively. No outbound calls are made to LifeFile/MediVera.**

| Stage | What happens |
|-------|-------------|
| Consent signed | `build_beluga_visit_payload` assembles the Beluga `formObj` from questionnaire field mappings and freezes it in `IntakeSubmission.snapshot["beluga_visit_payload"]` |
| Provider approves | A Beluga visit creation call (`POST` to Beluga API) is made using the frozen payload |
| Status updates | Beluga sends webhook events back (RX_WRITTEN, CONSULT_CONCLUDED, shipping, etc.) |

LifeFile/MediVera adapters exist in `backend/apps/pharmacy/adapters/lifefile.py` and `pharmacy/services.py` but **must not be wired to any live outbound flow**. The mock adapter is used locally; production uses Beluga only.

The Beluga visit payload is built from `beluga:fieldName` annotations (`maps_to_section`) on each questionnaire field. The full field list lives in `backend/apps/questionnaires/beluga_payload.py` (`BELUGA_VISIT_REQUIRED_MAPPINGS`) and mirrored in `src/components/questionnaire/builder/field-catalog.ts` (`BELUGA_FIELD_OPTIONS`). Both must stay in sync.

## Key files

| File | Role |
|------|------|
| `src/routes/intake.tsx` | Intake funnel route |
| `src/routes/dashboard.intake.tsx` | Portal intake page |
| `src/components/questionnaire/IntakeDynamicFlow.tsx` | Dynamic funnel intake |
| `src/components/questionnaire/DynamicIntakePortalView.tsx` | Portal read-only dynamic display |
| `src/lib/intake-steps.ts` | Hardcoded step definitions (fallback) |
| `backend/apps/intakes/submissions.py` | Snapshot builder + version pinning |
| `backend/apps/intakes/models.py` | MedicalIntake, IntakeSubmission |
| `backend/apps/questionnaires/services.py` | Resolve intake slug from qualify rules |
| `backend/apps/questionnaires/beluga_payload.py` | Beluga `formObj` builder |
| `src/components/questionnaire/builder/field-catalog.ts` | Frontend Beluga field option list |
