# Dynamic Questionnaire System

**Quick reference for production code.** Roadmap items live in `docs/DYNAMIC_QUESTIONNAIRE_SYSTEM.md` (marked **PLANNED** there).

## Status (implemented today)

| Area | Status |
|------|--------|
| Four-level hierarchy (Questionnaire → Version → Step → Field) | **Built** |
| Staff flowchart builder + routing rules | **Built** (draft-only edit) |
| Publish / archive / duplicate versions | **Built** |
| Multiple published qualify versions, CTA-mapped entry + one default | **Built** (see Publishing) |
| Qualify → intake routing (`intake_routing_rules` on version) | **Built** |
| Funnel dynamic qualify/intake (`/qualify`, `/intake` funnel mode) | **Built** (feature flag) |
| Server-side answer validation vs pinned version | **Built** |
| CTA → qualify entry routing + attribution (`cta_id`) | **Built** |
| Dynamic patient portal intake display | **Built** (pinned version + responses) |
| Immutable submission snapshots with questionnaire metadata | **Built** |
| Version deletion | **Not available** (by design — see Deletion policy) |
| Canonical keys, provider API mapping, DrugType table, M2M medications | **PLANNED** — see design doc |

## Data model (four-level hierarchy)

```
Questionnaire  (slug, type: qualify|intake, optional medication FK)
  └── QuestionnaireVersion  (version_label, status, intake_routing_rules + cta_ids + is_default_entry on qualify versions)
        └── QuestionnaireStep  (step_key, sort_order, title, subtitle, progress_level, visibility_rule, routing_rules, position_x/y)
              └── QuestionnaireField  (field_key, field_type, label, help_text, options, validation_rules, maps_to_section, plugin_id, sort_order, required)
```

### Field types (`QuestionnaireField.field_type`)

| Type | Renders | Notes |
|------|---------|-------|
| `text`, `textarea`, `number`, `email`, `phone`, `date` | Standard inputs | `maps_to_section` writes into intake JSON / Beluga |
| `dob` | **Date of birth** — separate MM / DD / YYYY inputs with scroll-pickers | Stores ISO `YYYY-MM-DD`; month clamped 1–12, day clamped to month length, year 1900–current; formats `MM/DD/YYYY` for Beluga; 18+ validation. Maps to `beluga:dob`. See `src/lib/questionnaire/dob-field.ts` + `QuestionnaireDateOfBirthField.tsx`. |
| `yes_no` | Two side-by-side options | Per-option Beluga mapping allowed |
| `single_choice` | One-of options | **Field-level** Beluga mapping (`maps_to_section = beluga:sex`); selected option's label is sent |
| `multi_choice` | Many-of options | **Per-option** Beluga mapping |
| `address_group` | Nominatim shipping/home address | Sub-field mappings (`address`/`city`/`state`/`zip`) → intake section + Beluga |
| `account` | Email + password signup (one per step) | Sub-field mappings to Django register API + Beluga (`firstName`/`lastName`/`phone`/`email`). **Field id is fixed.** |
| `review` | **Review & confirm** — see Review step below | Confirmation flag only; gates advancing |
| `legal_consent` | TOS / Privacy / Telehealth links + checkbox | Accepting it satisfies the consent gate at submit (see Legal consent below). Maps to `beluga:consentsSigned`. |

Staff add field types in the **Add question** modal; reorder via drag handle and duplicate via the copy icon in the step field editor (`StepFieldsEditor.tsx`). The **Field ID** is editable per field (draft only, account excluded); it must be unique across the whole version and renaming it rewrites any routing rules that referenced it.

### Review step (`review` field)

Built by `buildBelugaDoctorReview` (`src/lib/questionnaire/beluga-review.ts`) from qualify + intake bindings and account/profile values. Three render variants (`QuestionnaireReviewField.tsx`):

- **`patient`** (live `/intake` + portal): production view only — shows the values that will be sent, a confirm checkbox, and a "details still needed" banner when required Beluga fields are unresolved. **No** dev table, no API field names, no "other answers" / doctor wording.
- **`preview`** (staff builder): dev view by default (API `formObj` table + expected types via `BelugaPayloadDevTable.tsx`) with a toggle to the production view. Dev table is gated to `import.meta.env.DEV`.
- **`staff`**: placeholder text in builder nodes.

The review needs `qualifySchema`, `qualifyResponses`, `registration`, and `accountExtras` passed in to resolve account demographics (first/last name, email, phone). `accountExtras` is built from the signed-in user + patient profile + eligibility (see `IntakeDynamicFlow.buildAccountExtras`). **Account demographics come from `session.user`** — read auth via `const { session } = useAuth()` then `session.user`, not a non-existent `user` key.

### Legal consent at intake vs eligibility

Terms / Privacy / Telehealth can be accepted **either**:
1. Legacy: at `/qualify` → `EligibilityResponse.pre_signup_consents = {terms, privacy, telehealth}`, or
2. Dynamic: via a `legal_consent` field during the intake (stored `true` in `questionnaire_responses`).

The final consent submission (`POST /api/consent-records/me/`, `ConsentMeView`) accepts **either** path. `responses_accept_legal_consent(version_id, responses)` in `questionnaires/services.py` detects an accepted `legal_consent` field on the pinned version.

### Publishing rules

- **Qualify:** **Multiple** qualify versions may be published at once. Each is an entry point reached via the CTA ids mapped to it (`QuestionnaireVersion.cta_ids`). Each `cta_id` maps to **at most one** published qualify version; publishing a version transfers any CTA ids it claims away from other published qualify versions. Publishing a new version of the **same** qualify questionnaire archives that questionnaire's prior published version.
- **Default entry:** Exactly one published qualify version may be flagged `is_default_entry`. It serves any CTA or landing page with no explicit `cta_id` mapping. If none is flagged, the most recently published qualify version is used as fallback.
- **Intake:** Each intake questionnaire slug may have **one** published version at a time. **Multiple** intake questionnaires may be published simultaneously (e.g. different medications or paths).
- Publishing requires at least one step. Only `draft` versions can be edited or published.

### Version immutability

- Patients are pinned to the version active when their funnel session starts (`FunnelSession.qualify_questionnaire_version_id`, `EligibilityResponse.questionnaire_version_id`).
- Intake uses `MedicalIntake.questionnaire_version_id` once set; it cannot be changed via PATCH ("Questionnaire version cannot be changed.").
- `IntakeSubmission.questionnaire_version_id` and dynamic answers are frozen at submit time in the submission snapshot.
- Published/archived versions are read-only in the staff builder. **Duplicate to draft** to make changes.

#### Serving a pinned version (`ActiveQuestionnaireView`, `?version_id=`)

When a patient requests their pinned version, `GET /api/questionnaires/<slug>/active/?version_id=` decides whether to honor it:

| Pinned version status | `qualify` slug | non-qualify (`intake`) slug |
|-----------------------|----------------|------------------------------|
| `published` | served as-is | served as-is |
| `archived` | **falls back** to latest published qualify entry (pre-account funnel advances) | **served as-is** (patient mid-intake keeps their version) |
| `draft` | falls back | falls back |

This is why publishing a new intake version does **not** break patients already filling out the old one — they finish on the archived version they started. Tests: `test_active_intake_serves_archived_pinned_version`, `test_active_qualify_falls_back_when_pinned_version_archived`.

### Editing the version label (rename) — any status

`PATCH /api/staff/questionnaires/<slug>/versions/<id>/` with `version_label` is allowed on **draft, published, and archived** versions (rename is cosmetic metadata). The backend enforces uniqueness within the questionnaire (`unique_questionnaire_version_label`, max 32 chars) and returns 400 on clash. Schema/routing edits (`intake_routing_rules`, `cta_ids`, `is_default_entry`, steps, fields) remain **draft-only**. Frontend rename UI: `src/routes/staff.questionnaires.$slug.index.tsx`.

### Deletion policy

- **Questionnaire versions cannot be deleted** (draft, published, or archived).
- Steps and fields on **draft** versions can be deleted.
- **Why:** Active funnel sessions, in-progress patients, analytics, and provider records reference version IDs. Deleting a version a patient is filling out would break their flow and corrupt attribution.
- **Workaround:** Archive by publishing a replacement; duplicate old versions for reference.

### Qualify → intake routing

On **qualify** versions only, `intake_routing_rules` is a JSON array:

```json
[
  { "when_field": "treatment_interest", "when_value": "glp1_injections", "intake_questionnaire_slug": "intake-semaglutide" },
  { "when_field": "__default__", "when_value": "", "intake_questionnaire_slug": "intake-default" }
]
```

When the patient reaches `/intake`, the backend resolves the intake questionnaire slug from the pinned qualify version + `questionnaire_responses`, then loads the **published** intake version for that slug.

Staff configure rules in the flowchart builder (**Intake routing** panel on qualify drafts).

### Field mapping

- **`maps_to_section`** (built): writes answers into `MedicalIntake` JSON sections (`identity`, `body_metrics`, …) and `questionnaire_responses`.
- **`canonical_key`** (PLANNED): stable internal schema — not in code yet.

### Step routing (within a questionnaire)

- `routing_rules` on a step: `[{ when_field, when_value, next_step_key }]`.
- `__default__` when_field = default sequential connection override.
- `visibility_rule` on a step controls conditional show/hide.

## Experiments (A/B testing)

```
Experiment  (questionnaire FK, status: draft|running|stopped|archived)
  └── ExperimentVariant  (variant_key, questionnaire_version FK, weight_percent)
```

Running experiments assign funnel sessions to variants by weight. `experiment_id` + `variant_key` are stored on `FunnelSession` and every `FunnelEvent`.

## Feature flag

- Frontend: `VITE_DYNAMIC_QUESTIONNAIRES=true`
- Backend: `DYNAMIC_QUESTIONNAIRES=True`

When off (or no published version), the app falls back to hardcoded `qualify-steps.ts` / `intake-steps.ts`.

## CTA → qualify entry + attribution

Every marketing "Get started" / "See if you qualify" link carries a stable **`cta_id`** query param (e.g. `home_hero`, `pricing_footer`, `nav_header`), defined in `src/lib/cta-ids.ts`.

- **Entry routing:** On funnel session creation the `cta_id` resolves which **published qualify version** the patient enters (`get_qualify_version_for_cta`). A CTA mapped to a qualify version enters that version; an unmapped CTA enters the **default-entry** qualify version. Staff map CTA ids to a qualify draft via the **Entry points** panel in the builder.
- **Attribution:** `cta_id` is stored on `FunnelSession` (via `/api/funnel/session/` create or `/api/funnel/session/attribution/` PATCH) and included in analytics events so placements, qualify versions, and intake versions can all be compared.

See `docs/features/analytics.md` and `docs/features/patient-funnel.md`.

## Staff builder

`/staff/questionnaires` — list questionnaires → manage versions → **Edit / preview** opens `FlowchartBuilder.tsx`.

| Mode | Behavior |
|------|----------|
| **Draft** | Drag steps (Select tool), add connections, edit fields, publish |
| **Published / archived** | Read-only canvas + preview; duplicate to edit |

Tools: **Select** (move steps), **Connect** (click answer → click target step). **Add connection** panel for conditional rules.

## Patient / portal boundaries

| Surface | Dynamic? |
|---------|----------|
| `/qualify` (funnel) | Yes, when flag on |
| `/intake` (funnel) | Yes, when flag on |
| `/dashboard/intake` (portal) | Yes — read-only display from pinned version + `questionnaire_responses`; legacy hardcoded fallback |
| Provider submission snapshot | Includes `questionnaire_version_id`, `questionnaire_responses`, display labels |

## Known gaps / follow-ups

- **Portal read-only review shows "details still needed".** `DynamicIntakePortalView.tsx` renders the `review` field via `renderQuestionnaireField` **without** passing `qualifySchema`, `qualifyResponses`, `registration`, or `accountExtras`, and without hydrating address responses (`hydrateAddressResponsesFromIntake`). So on `/dashboard/intake` the review re-computes with no account/qualify context and reports required Beluga fields as missing even on a submitted intake. The portal review should instead render evidence that the patient reviewed & agreed (from the frozen submission snapshot), not re-run the live gate. The submission snapshot (`IntakeSubmission.snapshot.dynamic_questionnaire`) is the immutable source of truth.
- **No surfaced proof the Beluga `formObj` POST will succeed.** The dev review table (`BelugaPayloadDevTable.tsx`) previews `formObj` keys/values/expected-types in builder preview only (DEV gate). There is no staff-facing validation that a submitted intake's resolved payload satisfies all `BELUGA_VISIT_REQUIRED_MAPPINGS` before/after submit. See `docs/vendor/BELUGA_API.md` (POST Visit Form Submission) for required fields.

## Key files

| File | Role |
|------|------|
| `backend/apps/questionnaires/models.py` | Data model |
| `backend/apps/questionnaires/services.py` | Publish, duplicate, resolve intake slug |
| `backend/apps/questionnaires/validation.py` | Server-side field validation |
| `backend/apps/intakes/submissions.py` | Immutable snapshots + version pinning |
| `src/components/questionnaire/FlowchartBuilder.tsx` | Staff canvas + field editor |
| `src/components/questionnaire/QualifyDynamicFlow.tsx` | Patient qualify |
| `src/components/questionnaire/IntakeDynamicFlow.tsx` | Patient intake funnel |
| `src/components/questionnaire/DynamicIntakePortalView.tsx` | Portal read-only display |
| `src/components/questionnaire/QuestionnaireReviewField.tsx` | Review variants (patient/preview/staff) |
| `src/components/questionnaire/QuestionnaireReviewProductionView.tsx` | Patient-facing review UI |
| `src/components/questionnaire/BelugaPayloadDevTable.tsx` | Dev `formObj` preview (DEV only) |
| `src/lib/questionnaire/beluga-review.ts` | Beluga binding resolution + required mappings |
| `src/lib/questionnaire/dob-field.ts` | DOB parse/format/validate helpers |
| `src/components/questionnaire/builder/StepFieldsEditor.tsx` | Step field list: reorder, duplicate, edit id |
| `backend/apps/consents/views.py` | Consent submit — accepts eligibility or intake `legal_consent` |
| `docs/DYNAMIC_QUESTIONNAIRE_SYSTEM.md` | Full design + **PLANNED** items |
