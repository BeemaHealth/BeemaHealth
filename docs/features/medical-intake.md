# Medical Intake

The intake is a 12-step medical questionnaire completed after account creation. It collects the clinical information providers need to prescribe.

## Data model

**`MedicalIntake`** (`medical_intakes` table) — one per user, updated in-place across sessions:
- `status`: `draft` → `submitted` → `under_review` → `approved` / `rejected`
- Each clinical section is a separate JSON column (not one blob), so providers and serializers can address sections independently:
  - `identity`, `body_metrics`, `weight_history`, `medical_conditions`, `family_history`
  - `medications`, `allergies`, `pregnancy`, `lifestyle`, `labs`
  - `medication_preferences`, `safety_acknowledgments`, `account_screening`
- `questionnaire_responses` JSON — raw dynamic questionnaire answers (when dynamic flag is on)
- `working_version` — increments each time the patient resubmits after changes

**`IntakeSubmission`** — point-in-time snapshot when the intake is submitted, versioned. The snapshot is what providers review; the live `MedicalIntake` row can be updated without losing submission history.

**`SafetyFlag`** — raised by backend logic when intake answers indicate a contraindication. Flags can block submission or route to clinician review.

## Flow

1. Patient completes `/qualify` and creates an account
2. Email verification required before intake is accessible
3. `/intake` loads `GET /api/medical-intakes/me/` — creates the row if it doesn't exist yet
4. Each step PATCHes the relevant JSON section: `PATCH /api/medical-intakes/me/`
5. Final step triggers submission: `POST /api/medical-intakes/me/submit` (or via status transition on PATCH)
6. An `IntakeSubmission` snapshot is created; status moves to `submitted`
7. Intake visible to providers at `GET /api/admin/patients/{id}/`

## Step structure

Steps are defined in `src/lib/intake-steps.ts` (hardcoded) or driven dynamically when `VITE_DYNAMIC_QUESTIONNAIRES=true`. Each step has:
- A `step_key` (matches the JSON section name where possible)
- Field validators from `src/lib/form-validation.ts`
- A portal UI tone/icon from `src/lib/intake-portal-ui.ts`

## Key files

| File | Role |
|------|------|
| `src/routes/intake.tsx` | Intake flow UI |
| `src/lib/intake-steps.ts` | Hardcoded step definitions + validators |
| `src/lib/intake-portal-ui.ts` | Step colors/icons for the portal display |
| `backend/apps/intakes/models.py` | MedicalIntake, IntakeSubmission, SafetyFlag |
| `backend/apps/intakes/serializers.py` | Section-level validation |
| `backend/apps/intakes/views.py` | GET/PATCH/submit endpoints |
| `src/routes/dashboard.intake.tsx` | Post-submission read-only view in the dashboard |
