# Dynamic Questionnaire System — Design Document

**Status:** Active development on `feature/dynamic-questionnaire-system`.  
**Last updated:** 2026-06-25

> **Read `docs/features/dynamic-questionnaire.md` first** for what is **implemented today**.  
> Sections below marked **(PLANNED)** are design targets not yet in code.  
> Field mapping in code uses **`maps_to_section`**, not `canonical_key`.

---

## Implemented today (summary)

- Questionnaire → Version → Step → Field hierarchy with flowchart positions and step `routing_rules`
- Staff builder (`FlowchartBuilder.tsx`), publish/archive/duplicate, draft-only edits
- One globally published qualify version; many published intake questionnaire slugs
- Qualify `intake_routing_rules` → resolves intake questionnaire at `/intake`
- Version pinning on funnel session, eligibility, medical intake, intake submission
- Dynamic funnel qualify/intake (feature flag); dynamic portal read-only display
- CTA `cta_id` attribution on funnel session + analytics properties
- **No version deletion** — duplicate or archive instead

---

## Git branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production. Hardcoded qualify/intake. Analytics only for hardcoded steps + page navigation. No dynamic questionnaire code. |
| `feature/dynamic-questionnaire-system` | This branch. Everything dynamic: medications, questionnaire builder, provider mapping, analytics per version. **Work here, not on main.** |

**Backwards compatibility requirement:** The dynamic system on the feature branch must degrade gracefully. If a questionnaire is not configured for a medication, the app falls back to the hardcoded questions on main. This is enforced with a feature flag (`VITE_DYNAMIC_QUESTIONNAIRES=true` frontend, `DYNAMIC_QUESTIONNAIRES=True` backend setting). Main never has this flag set.

---

## Known bugs / remaining Phase 1 items

1. **(PLANNED) Drug type "Other" input** — managed `DrugType` table not built; `drug_type` is an enum on `Medication`.
2. **Price input** — medication price UX may still need plain-text dollars input in staff CRM.
3. ~~**"Manage versions" navigation**~~ — fixed (`staff.questionnaires.$slug` + index route).

---

## The core vision

Replace every hardcoded qualify/intake question with a database-driven, version-controlled questionnaire system that:

1. Staff can edit in the CRM without a code deploy
2. Supports different question sets per medication
3. Maps patient answers to whatever provider (doctor network) API we're integrated with — without code changes when we switch providers
4. Records every answer against the exact questionnaire version that was shown, forever
5. Makes the patient portal intake display fully dynamic
6. Allows staff to add/remove/reorder steps (including a payment step) at any time
7. Tracks user navigation across all pages of the site — not just funnel steps

---

## Part 1 — Data model

### 1.1 Drug types (managed list, not hardcoded)

```
DrugType
  id        UUID
  name      string    e.g. "Semaglutide", "Tirzepatide", "Tadalafil"
  slug      string    unique, e.g. "semaglutide"
  notes     text      internal — e.g. "GLP-1/GIP dual agonist"
  created_at
  updated_at
```

**Staff workflow:**
- CRM shows a drug type list under `/staff/drug-types`
- Medication form has a `drug_type` dropdown populated from this table
- When "Other" is selected, a text input appears; on save, a new `DrugType` row is created and immediately available in the dropdown
- Drug types can be edited and deleted (guarded if any medication references them)

**On GLP-1 / GLP-2 for tirzepatide:** Tirzepatide is a dual GLP-1/GIP agonist — not GLP-2. For our purposes `drug_type` is a business/display label, not a pharmacological classification. Add whatever terms make sense for staff and patients.

---

### 1.2 Medications

```
Medication
  id              UUID
  name            string        e.g. "Semaglutide 2.4mg Weekly Injection"
  slug            string unique e.g. "semaglutide-2-4mg"
  drug_type       FK → DrugType
  delivery_type   enum: injection | daily_pill | weekly_pill | patch | other
  price_cents     integer       monthly price in USD cents
  description     text          shown on /medications/[slug] marketing page
  is_active       bool          controls visibility to patients in drug selection
  sort_order      integer       order in drug selection screen
  created_at / updated_at
```

Each medication gets a marketing page at `/medications/[slug]`. Staff edits description/price in the CRM. A medication is only shown to patients in the drug selection step if `is_active=true` AND it has an active qualify AND an active intake questionnaire assigned.

---

### 1.3 Questionnaire ↔ medication assignment

**A questionnaire can apply to multiple medications. A medication must have exactly one active qualify and one active intake questionnaire.**

```
Questionnaire
  id                  UUID
  slug                string unique   e.g. "qualify-glp1", "intake-semaglutide"
  questionnaire_type  enum: qualify | intake
  title               string
  description         text (internal notes)
  created_at / updated_at

QuestionnaireMedication  (join table)
  questionnaire   FK → Questionnaire
  medication      FK → Medication
  UNIQUE (questionnaire, medication)
```

**Examples:**
- "Qualify GLP-1" → assigned to both Semaglutide and Tirzepatide (shared questions)
- "Intake Semaglutide" → assigned only to Semaglutide
- A future ED qualify → assigned only to Tadalafil

**Patient funnel entry:**
```
Patient selects Drug A
→ system finds: Questionnaire where type=qualify AND medication=Drug A AND published version exists
→ runs that version's steps
```

If no medication-specific questionnaire exists: show a warning in the CRM on that medication's card. Do not show the medication to patients until it has questionnaires assigned.

---

### 1.4 Versions

```
QuestionnaireVersion
  id              UUID
  questionnaire   FK → Questionnaire
  version_label   string     e.g. "1.0.0"
  status          enum: draft | published | archived
  published_at    timestamp
  changelog       text       staff notes on what changed between versions
  created_by      FK → User
```

**Rules:**
- One `published` version per questionnaire at a time
- Patients are pinned to the version active when their session started — mid-funnel version changes don't affect them
- `IntakeSubmission.questionnaire_version_id` is immutable once set
- `EligibilityResponse.qualify_questionnaire_version_id` is immutable once set
- Archiving a version has no effect on past submissions

---

### 1.5 Steps and fields

```
QuestionnaireStep
  id              UUID
  version         FK → QuestionnaireVersion
  step_key        string    e.g. "body_metrics" (lowercase alphanumeric + underscores)
  sort_order      integer
  title           string
  subtitle        text
  visibility_rule JSON      step-level conditional show/hide
  changelog       text      optional per-step change note

QuestionnaireField
  id                  UUID
  step                FK → QuestionnaireStep
  field_key           string    e.g. "current_weight_lbs" (same format as step_key)
  field_type          enum      (see §2.1)
  label               string    patient-facing label
  help_text           text      optional hint below the field
  placeholder         string    optional input placeholder
  options             JSON      [{value, label}] for choice fields
  validation_rules    JSON      [{type, value, message}]
  canonical_key       string    maps to our internal canonical schema (see §3)
  required            bool
  sort_order          integer
  is_phi              bool      marks field as Protected Health Information
  also_sets_user_field  string  if set, answer is also saved to User.[field] (e.g. "first_name")
  visibility_rule     JSON      field-level conditional show/hide
```

**`also_sets_user_field`:** For fields like legal first name and last name — the answer is saved to the user's account fields at intake time. If the user later changes their name in account settings, the intake record is NOT modified (intake is immutable). This is already the intended behavior; `also_sets_user_field` just makes the mapping explicit and configurable by staff.

---

## Part 2 — Field types and input security

### 2.1 Supported field types

| Type | Patient sees | Server-side validation |
|------|-------------|----------------------|
| `text` | Single-line input | min/max length, pattern regex, injection checks |
| `textarea` | Multi-line input | min/max length, injection checks (XSS), React escapes output |
| `number` | Numeric input | min, max, integer_only flag |
| `email` | Email input | RFC format |
| `phone` | Phone input | E.164 format |
| `date` | Date picker | min_date, max_date, age check |
| `yes_no` | Two buttons | value must be `true` or `false` |
| `single_choice` | Dropdown or card | value must be in options list |
| `multi_choice` | Checkboxes | each value must be in options list, min/max selections |
| `height` | ft + in compound | range: 1ft–9ft |
| `weight` | lbs input | range: 50–999 lbs |
| `address_group` | Address sub-fields | ZIP format, US state enum |
| `file_upload` | File picker | mime type allowlist, max size |
| `signature` | Drawing pad | presence required |
| `payment` | Stripe embed | plugin — card auth only, not charged until Rx approved |
| `plugin` | Custom component | declared by `plugin_id`, not staff-configurable |

**"No hacking possible" enforcement:**
The server validates every submitted answer against the field's `field_type` and `validation_rules` from the pinned questionnaire version. Client-side validation is UX only. Answers to `single_choice`/`multi_choice` fields are checked against the options list — a value not in the options is rejected even if a patient crafts a raw API request. Free-text fields run injection pattern checks.

---

## Part 3 — Provider API mapping

### The key insight

Different drugs can use different provider (doctor network) APIs. The API may expect different field names for the same data (e.g. `drug_name` vs `name`, `legal_first_name` vs `first_name`).

**Solution: staff defines the provider's expected JSON schema in the CRM, then maps each questionnaire field's answer to a path in that schema. No code changes needed to add a provider or switch providers.**

> Note: LifeFile/MediVera is a **pharmacy** API — we are NOT sending clinical orders to them. This mapping is for **doctor network / provider APIs** that receive the clinical intake for physician review and prescription.

---

### 3.1 Provider models

```
ProviderIntegration
  id                UUID
  name              string    e.g. "Cerebral Health Network"
  slug              string    unique, e.g. "cerebral"
  auth_type         enum: basic | bearer | api_key | oauth2
  api_base_url      string
  is_active         bool
  notes             text      internal
  created_at / updated_at

ProviderApiSchema
  id                UUID
  provider          FK → ProviderIntegration
  schema_type       enum: intake_submission | refill_request | patient_update
  json_schema       JSON      the exact JSON shape the provider expects
  version           string    e.g. "v2"
  is_active         bool
  created_at / updated_at

ProviderMedication  (which drugs this provider handles)
  provider          FK → ProviderIntegration
  medication        FK → Medication
  UNIQUE (provider, medication)
```

---

### 3.2 The two-layer mapping

**Layer 1 — Canonical schema (our stable internal keys)**

Every `QuestionnaireField` has an optional `canonical_key`. This is our internal stable identifier for the data the field collects. The canonical key list is owned by the developer (Matt) and configured via the `/staff/canonical-keys` UI.

```
Canonical key examples:
  patient.legal_first_name
  patient.legal_last_name
  patient.dob
  patient.sex_assigned_at_birth
  patient.weight_lbs
  patient.height_inches
  patient.bmi
  patient.state
  patient.phone
  patient.email
  clinical.current_medications
  clinical.known_conditions
  clinical.allergies
  clinical.pregnancy_status
  clinical.prior_glp1_use
  clinical.goal_weight_lbs
  clinical.primary_care_physician
  treatment.drug_slug
  treatment.delivery_preference
  treatment.primary_goal
  payment.card_authorized
  consent.hipaa_acknowledged
  consent.telehealth_acknowledged
```

**Fields without a canonical key** are stored in our database only — they're used for internal analytics, research, or UX purposes but are never sent to any provider.

**Layer 2 — Provider field mapping (per-provider, staff-configurable)**

```
ProviderFieldMapping
  id              UUID
  provider        FK → ProviderIntegration
  canonical_key   string    e.g. "patient.weight_lbs"
  provider_path   string    JSONPath in provider schema e.g. "$.patient.weight.value"
  transform       string    optional — e.g. "lbs_to_kg", "date_to_yyyymmdd", "bool_to_yn"
  notes           text      e.g. "Provider expects metric units"
  created_at / updated_at
```

**Staff workflow for a new provider:**
1. `/staff/providers` → "Add provider"
2. Enter name, auth type, base URL
3. Under "Intake schema": paste the provider's expected JSON for a full intake submission
4. The UI shows a field-mapping table: for each canonical key, enter the JSONPath in the provider's schema
5. Optionally select a transform (unit conversion, date format, etc.)
6. Click "Test mapping" — runs against a synthetic patient record, shows the output JSON
7. Save and mark active

**At submission time:**
```python
def build_provider_payload(submission, provider):
    canonical = build_canonical_payload(submission)  # keyed by canonical_key
    mappings = ProviderFieldMapping.objects.filter(provider=provider)
    payload = {}
    for mapping in mappings:
        value = canonical.get(mapping.canonical_key)
        if value is not None:
            value = apply_transform(value, mapping.transform)
            set_jsonpath(payload, mapping.provider_path, value)
    return payload
```

**Switching providers:** Create a new `ProviderIntegration`, add `ProviderMedication` rows for which drugs it handles, add field mappings, test, flip `is_active`. No questionnaire changes. No code deploys.

---

### 3.3 What about different field names per provider?

This is exactly why the canonical layer exists. If Provider A calls it `drug_name` and Provider B calls it `name`:

- Questionnaire field has `canonical_key = "treatment.drug_slug"`
- Provider A mapping: `canonical_key="treatment.drug_slug"` → `provider_path="$.drug_name"`
- Provider B mapping: `canonical_key="treatment.drug_slug"` → `provider_path="$.name"`

The questionnaire never changes. Only the mapping changes per provider.

---

## Part 4 — Patient funnel (complete, including page navigation tracking)

```
[User arrives at beemahealth]
  → FunnelEvent: page_viewed { page: "home" }

[User navigates to /weight-loss]
  → FunnelEvent: page_viewed { page: "weight_loss" }

[User navigates to /pricing]
  → FunnelEvent: page_viewed { page: "pricing" }

[User navigates to /faq]
  → FunnelEvent: page_viewed { page: "faq" }

[User navigates to /safety]
  → FunnelEvent: page_viewed { page: "safety" }

[User navigates to /contact]
  → FunnelEvent: page_viewed { page: "contact" }

[User navigates to /legal/privacy]
  → FunnelEvent: page_viewed { page: "privacy" }

[User navigates to /legal/terms]
  → FunnelEvent: page_viewed { page: "terms" }

[User navigates to /legal/telehealth-consent]
  → FunnelEvent: page_viewed { page: "telehealth_consent" }

[User clicks "Get started"]
  → FunnelSession created (anonymous, HttpOnly cookie)
  → UTM params captured
  → FunnelEvent: funnel_started

[Drug selection screen]
  → FunnelEvent: page_viewed { page: "drug_selection" }
  → User selects Drug A
  → FunnelSession.medication_id = Drug A
  → FunnelEvent: drug_selected { drug_slug: "semaglutide" }
  → Active qualify questionnaire version for Drug A is pinned to FunnelSession

[Qualify questionnaire — dynamic steps]
  → For each step viewed: FunnelEvent: step_viewed { slug: "qualify", step_key: "...", step_index: N, total_steps: M }
  → For each step completed: FunnelEvent: step_completed { same fields, duration_ms }
  → Answers PATCH'd to /api/funnel/eligibility/ (validated against pinned version)
  → Stored in EligibilityResponse.questionnaire_responses JSONB

[Eligibility decision — what makes a user ineligible]
  The following rules are evaluated server-side on submission of the final qualify step:
  - BMI < 27 → "needs clinician review" (not auto-disqualified, flagged for provider)
  - Age < 18 → disqualified (hard block)
  - Safety screen: pregnant, breastfeeding, trying to conceive → disqualified
  - Safety screen: prior severe GLP-1 reaction → disqualified
  - Safety screen: certain medical conditions (configured per questionnaire version)
  These rules are currently hardcoded in derive_eligibility_flags(). In the dynamic system,
  disqualification rules will move to a per-version configuration table (future phase).

[Account creation step — last qualify step]
  → User enters email, password, name, phone
  → Account created, FunnelSession claimed by user
  → FunnelEvent: account_created { user_id: "..." }

[Email verification]
  → FunnelEvent: email_verified

[Intake questionnaire — dynamic steps, same tracking pattern as qualify]
  → Active intake questionnaire version for Drug A is pinned to MedicalIntake
  → For each step: step_viewed / step_completed events
  → Answers PATCH'd to /api/medical-intakes/me/

[Payment step — configured as a step in intake by staff]
  → Plugin type: "payment" renders Stripe card element
  → Card is authorized (not charged) — amount = Medication.price_cents
  → Charge fires after physician approves prescription
  → FunnelEvent: payment_authorized

[Consent step]
  → Signature stored in consent_records (separate, compliance)
  → FunnelEvent: consent_signed

[Submission]
  → IntakeSubmission created:
      questionnaire_version_id   (immutable)
      questionnaire_responses    (full JSONB snapshot of all answers)
      canonical_payload          (built from field canonical_keys)
  → Provider API payload built via ProviderFieldMapping for Drug A's provider
  → Sent to provider for physician review
  → FunnelEvent: intake_submitted

[Provider review → Prescription → Pharmacy]
  → Unchanged from current flow
```

**Staff analytics sees:** For any given FunnelSession, the full path from first page visited through every step they completed, which drug they selected, where they dropped off, how long since last activity.

---

## Part 5 — Analytics (both branches)

### Main branch (hardcoded)

All page navigation and hardcoded qualify/intake steps are tracked:

```
Pages tracked: home, weight_loss, pricing, faq, safety, contact,
               privacy, terms, telehealth_consent, drug_selection
Qualify steps: treatment_interest, primary_goal, body_metrics,
               safety_screen, account (hardcoded keys)
Intake steps:  identity_contact, medical_history, ... (hardcoded 12 steps)
```

Staff analytics page on main shows:
- Page-by-page navigation funnel (home → pricing → get_started → ...)
- Qualify drop-off by step
- Intake drop-off by step
- Conversion rate from session start → account created → intake submitted

### Feature branch (dynamic)

All of the above, plus:
- Drop-off is keyed by `(questionnaire_version_id, step_key)` — so you see drop-off per version, not just globally
- When a new version is published, analytics show both old and new version conversion side by side
- Staff can filter analytics by questionnaire version, drug, UTM source, date range

**PHI rule (both branches):** FunnelEvents store no patient answers. Only step keys, step indices, durations, and page names. Individual answers stay in `EligibilityResponse`/`MedicalIntake` behind audit logging.

---

## Part 6 — Patient portal (medical intake display)

**Problem today:** Hardcoded 12-step display.

**Solution:** Intake display renders from `IntakeSubmission`:
- Fetch the pinned `questionnaire_version_id`'s schema (steps + fields)
- Render each step with the patient's stored `questionnaire_responses[field_key]`
- Step count = however many steps were in that version

This means the portal always matches what the patient actually answered, regardless of how many steps the current published version has.

---

## Part 7 — Refill policy (decided)

**Option A — Refill is unconditional (selected).** Patients request a refill without re-answering the intake. Provider reviews their prior submission. If the provider needs updated clinical information, they request it separately.

**Future:** Add a staff-configurable flag `requires_refill_reconfirmation` on `QuestionnaireVersion` for when the clinical team decides certain version changes require patient re-confirmation.

---

## Part 8 — What happens to existing patients during migration

When the dynamic system launches:

1. Create questionnaire versions in the builder that mirror the current hardcoded questions exactly (matching `field_key` values)
2. Write a data migration: set `questionnaire_version_id` on existing `EligibilityResponse` and `MedicalIntake` records
3. Build `questionnaire_responses` JSONB from existing structured columns (`height_ft`, `weight_lbs`, etc.) for existing records
4. Patient portal can then render legacy records from the JSONB snapshot using the legacy version schema
5. Existing structured columns are kept in the DB as audit record but deprecated in code

**Provider compatibility:** Existing `IntakeSubmission` records have a `canonical_payload` built at submission time (once we add canonical_key to fields). For records submitted before this system exists, the existing structured data is the canonical record — no retroactive mapping needed.

---

## Part 9 — Open question decisions (logged)

| # | Question | Decision |
|---|---------|---------|
| Q1 | Who owns canonical schema? | Matt (developer) for now. Canonical keys are configurable via `/staff/canonical-keys` UI — add/edit/delete. Engineering owns the code; staff can see and map to existing keys. |
| Q2 | New provider: map from scratch or inherit? | Map from scratch per provider. Each provider gets its own complete `ProviderFieldMapping` set. One-time staff task in CRM. |
| Q3 | Drug selection UX? | Explicit first screen after "Get started". Patient sees medication cards. If multiple categories in future (weight loss + ED), show category first then drug within category. |
| Q4 | Questionnaires shared across medications? | Yes — questionnaire can be assigned to multiple medications. `FunnelSession.medication_id` records the specific drug selected even when questionnaire is shared. |
| Q5 | Medication with no questionnaire assigned? | Hidden from patients. CRM shows a warning badge. |
| Q6 | Payment step placement? | Staff adds a `plugin` step with `plugin_id: "payment"` wherever they want in the intake. Card is authorized (not charged) at that step. Charged after Rx approval. |
| Q7 | What is v1.0.0 of qualify/intake? | Placeholder scaffolding only — must not be shown to real patients. Full clinical question set must be entered in the builder and published before going live. |
| Q8 | Provider schema versioning? | `IntakeSubmission` stores canonical answers. Provider mapping re-runs at submission time using the current active provider schema. Past submissions are not re-mapped. |
| Refill | When do refill patients re-answer? | Option A — unconditional refill, no re-answering. Revisit when questionnaire is stable. |
| Provider | LifeFile/MediVera role? | Pharmacy API only — no clinical intake sent there. Provider mapping is for the doctor network API only. |

---

## Part 10 — Implementation order (Phase 1 first — no exceptions)

### Phase 1 — Bugs and foundation (must complete before any new feature coding)

- [ ] Fix price input (text field, not number stepper)
- [ ] Fix "Manage versions" navigation
- [ ] Add `DrugType` managed-list model with "Other" text input in medication form
- [ ] Add `canonical_key` field to `QuestionnaireField` (DB + builder UI)
- [ ] Create `/staff/canonical-keys` — add/edit/delete canonical keys with descriptions
- [ ] Create `/staff/providers` — provider integrations with JSON schema paste + field mapping UI
- [ ] Update analytics to track all page navigation (home, pricing, FAQ, safety, contact, legal pages)
- [ ] Write the design decisions above into AGENTS.md as permanent architecture notes

### Phase 2 — Drug selection + medication-specific questionnaire loading

- [ ] Drug selection screen in patient funnel (after "Get started")
- [ ] `FunnelSession.medication_id` and `MedicalIntake.medication_id`
- [ ] Questionnaire lookup by medication (with fallback to default)
- [ ] `QuestionnaireMedication` join table + staff assignment UI
- [ ] Patient portal intake display renders dynamically from submission snapshot

### Phase 3 — Provider adapter

- [ ] `ProviderIntegration`, `ProviderApiSchema`, `ProviderFieldMapping`, `ProviderMedication` models
- [ ] Staff CRM: paste JSON schema, map canonical keys to JSONPaths, test mapping
- [ ] `build_canonical_payload()` and `build_provider_payload()` at submission
- [ ] Replace hardcoded LifeFile mapper with provider-agnostic adapter

### Phase 4 — Analytics per version

- [ ] FunnelEvent tracks all page navigation (both branches)
- [ ] Staff analytics: page funnel view, qualify/intake drop-off by step and version
- [ ] Filter by drug, version, UTM, date range

### Phase 5 — Clinical rules configuration (future)

- [ ] Move disqualification rules out of hardcoded `derive_eligibility_flags()` into per-version config
- [ ] Staff can mark which conditions trigger clinician review vs hard disqualification

---

## Appendix — What "completely dynamic" means and doesn't mean

**Means:**
- No question text is hardcoded in frontend or backend
- No step count is hardcoded anywhere
- No field keys are hardcoded in validation logic
- Provider payload is built from a mapping table
- Staff can add a question, step, or option and publish — zero code deploys

**Does NOT mean:**
- Staff can change frontend UI components (those stay in code)
- Staff can bypass HIPAA compliance controls
- Staff can inject HTML or scripts into question text (sanitized server-side)
- Staff can reconfigure how Stripe, email verification, or consent signatures work (those are plugins, not schema-driven)

---

*This document is the source of truth for this feature. Update it as decisions are made. Do not write code that contradicts this document without updating the document first.*
