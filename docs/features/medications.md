# Medications

The medication catalog is the source of truth for what treatments Aretide offers. Each medication can have its own qualify questionnaire and intake questionnaire, enabling different question sets per drug without code changes.

## Data model

**`Medication`** (`medications` table):
- `slug` — URL-safe unique identifier (e.g. `semaglutide-2-4mg`)
- `name` — display name (e.g. "Semaglutide 2.4mg Weekly Injection")
- `drug_type` — `semaglutide` | `tirzepatide` | `other`
- `delivery_type` — `injection` | `daily_pill`
- `price_cents` — monthly price in USD cents
- `active` — controls patient-facing visibility

## Relationship to questionnaires

A `Questionnaire` row has an optional `medication` FK. When the dynamic questionnaire system is enabled and a patient selects a medication, the backend looks up the active published questionnaire version for that medication and returns it for the qualify/intake flow. If no questionnaire is configured for the medication, the system falls back to the hardcoded questions.

This means:
- Adding a new medication does not require code changes (staff creates it in the CRM)
- Customizing questions per medication also requires no code changes (staff builds the questionnaire)
- Switching providers or question sets is a CRM operation, not a deploy

## Staff workflow

`/staff/medications` — CRUD for the catalog. Deactivating a medication hides it from patients but preserves all historical data. Deleting a medication is blocked if any questionnaires or patient records reference it.

## Key files

| File | Role |
|------|------|
| `backend/apps/questionnaires/models.py` | Medication model (lives in questionnaires app) |
| `src/routes/staff.medications.tsx` | Staff medication catalog UI |
| `backend/apps/questionnaires/serializers.py` | Medication serializer + validation |
| `backend/apps/questionnaires/services.py` | Questionnaire resolution logic (medication → version) |
