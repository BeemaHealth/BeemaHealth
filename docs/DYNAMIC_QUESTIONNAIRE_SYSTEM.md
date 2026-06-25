# Dynamic Questionnaire System — Design Document

**Status:** Pre-implementation design. Resolve all open questions before writing more code.  
**Last updated:** 2026-06-24

---

## Why this document exists

The staff CRM currently has partial scaffolding for a dynamic questionnaire builder. Before going further, several foundational design questions must be answered — some of them architectural, some regulatory (HIPAA + clinical), some business-model-level. Building on a wrong foundation will mean ripping it out again. This document names every question, proposes a recommended answer, and states what we need to decide before writing more code.

---

## The core vision (what we're building)

**Goal:** Replace every hardcoded qualify/intake question in the codebase with a database-driven, version-controlled questionnaire system that:

1. Staff can edit in the CRM without a code deploy
2. Supports different question sets per medication
3. Maps patient answers to whatever provider API we're integrated with, without code changes when we switch providers
4. Tracks every answer against the exact questionnaire version that was shown, forever
5. Makes the patient portal medical intake display dynamic (not hardcoded 12 steps)
6. Allows adding a payment step, consent step, or any other step by staff at any time

Think of it as **Google Forms + an ETL mapping layer + clinical versioning** — all inside the staff CRM.

---

## Part 1 — Data model

### 1.1 Drug types (the managed list problem)

**Problem today:** `drug_type` is hardcoded as `semaglutide | tirzepatide | other`. Staff can't add new drug types without a code deploy.

**Proposed model:**

```
DrugType
  id        UUID
  name      string (e.g. "Semaglutide", "Tirzepatide", "Tadalafil")
  slug      string unique (e.g. "semaglutide", "tirzepatide", "tadalafil")
  notes     text (internal — e.g. "GLP-1/GIP dual agonist")
  created_at
```

- Staff creates drug types in the CRM.  
- The Medication form has a `drug_type` dropdown that is populated from this table.  
- When "Other" is selected, a text input appears. On save, a new `DrugType` row is created and becomes immediately available in the dropdown for subsequent medications.  
- Drug types can be edited and deleted (with a guard if any medication references them).

**On the GLP-1 / GLP-2 debate for tirzepatide:** Tirzepatide is technically a dual GLP-1/GIP agonist, not GLP-2. For our purposes `drug_type` is a business/display classification, not a pharmacological one. Add whatever labels make sense for patients and staff. Don't couple this to scientific terminology.

---

### 1.2 Medications

```
Medication
  id              UUID
  name            string        e.g. "Semaglutide 2.4mg Injection"
  slug            string unique e.g. "semaglutide-2-4mg"
  drug_type       FK → DrugType
  delivery_type   enum: injection | daily_pill | weekly_pill | patch | other
  price_cents     integer       monthly price in USD cents
  description     text          shown on /medications/[slug] marketing page
  is_active       bool          controls visibility to patients
  sort_order      integer       controls order in the drug-selection step
  created_at / updated_at
```

Each medication gets a public marketing page at `/medications/[slug]` with name, description, price, how it works, etc. Staff edits this through the CRM. This is separate from the questionnaire system but uses the same medication record.

---

### 1.3 Questionnaires and medications — the mapping

**Key design decision: one questionnaire can apply to multiple medications.**

```
Questionnaire
  id                  UUID
  slug                string unique   e.g. "qualify-glp1", "intake-semaglutide"
  questionnaire_type  enum: qualify | intake
  title               string
  description         text (internal notes)
  created_at / updated_at

QuestionnaireMedication (join table)
  questionnaire  FK → Questionnaire
  medication     FK → Medication
  PRIMARY KEY (questionnaire, medication)
```

This means:
- "Qualify GLP-1" can apply to both Semaglutide and Tirzepatide — one questionnaire, two medications
- "Intake Semaglutide" can apply only to Semaglutide — one questionnaire, one medication
- Every medication must have exactly one active qualify questionnaire and one active intake questionnaire (enforced at publish time)
- Staff assigns medications to questionnaires, not the other way around

**Patient funnel entry:**

```
Patient arrives → drug selection screen → selects Drug A
→ system looks up: active qualify questionnaire for Drug A
→ runs that questionnaire
→ intake: active intake questionnaire for Drug A
```

If no medication-specific questionnaire exists for a drug, it falls back to the default (slug="qualify" or "intake").

---

### 1.4 Versioning — how it works

```
QuestionnaireVersion
  id              UUID
  questionnaire   FK → Questionnaire
  version_label   string     e.g. "1.0.0", "1.1.0"
  status          enum: draft | published | archived
  published_at    timestamp
  changelog       text       (staff notes on what changed)
  created_by      FK → User
```

**Rules:**
- Only one `published` version per questionnaire at a time
- Patients are **pinned to the version that was active when they started** their funnel session — mid-funnel version changes do not affect them
- `IntakeSubmission` stores `questionnaire_version_id` so we know forever which version a patient answered
- `EligibilityResponse` stores `qualify_questionnaire_version_id` for the same reason
- Archiving a version does not affect past submissions — those records are immutable

---

### 1.5 Steps and fields (the questionnaire content)

```
QuestionnaireStep
  id              UUID
  version         FK → QuestionnaireVersion
  step_key        string   e.g. "body_metrics"
  sort_order      integer
  title           string
  subtitle        text
  visibility_rule JSON    (conditional step — show/hide based on prior answers)

QuestionnaireField
  id                  UUID
  step                FK → QuestionnaireStep
  field_key           string   e.g. "current_weight_lbs"
  field_type          enum (see §2.1)
  label               string   patient-facing label
  help_text           text     optional hint below the field
  placeholder         string   optional input placeholder
  options             JSON     [{value, label}] for choice types
  validation_rules    JSON     [{type, value, message}]
  canonical_key       string   maps to our internal canonical schema (see §3)
  provider_path       string   JSON path in the provider's API payload (see §3)
  required            bool
  sort_order          integer
  is_phi              bool     marks field as Protected Health Information
  visibility_rule     JSON     field-level conditional show/hide
```

---

## Part 2 — Field types and input security

### 2.1 Supported field types

| Type | Patient sees | Validation |
|------|-------------|------------|
| `text` | Single-line input | min/max length, pattern regex |
| `textarea` | Multi-line input | min/max length |
| `number` | Numeric input | min, max, integer_only |
| `email` | Email input | RFC email format |
| `phone` | Phone input | E.164 format |
| `date` | Date picker | min_date, max_date, age check |
| `yes_no` | Two buttons | — |
| `single_choice` | Dropdown or radio | enum (value must be in options) |
| `multi_choice` | Checkboxes | min/max selections |
| `height` | ft + in compound | range check |
| `weight` | lbs or kg | range check |
| `address_group` | Address sub-fields | ZIP format, state enum |
| `file_upload` | File picker | mime type, max size |
| `signature` | Drawing pad | presence required |
| `payment` | Stripe embed | plugin only — no staff config |
| `plugin` | Custom component | declared by plugin_id |

**How "no hacking is possible":**

The field type determines what the backend will accept for that field's answer, regardless of what the client sends. For every PATCH to eligibility/intake:

1. Server looks up the active questionnaire version
2. Finds the field definition by `field_key`
3. Validates the submitted value against `field_type` + `validation_rules` + `is_phi` rules
4. Rejects anything that doesn't pass — 400 with field-specific error

Staff cannot create a field type that bypasses validation — the type must be in the allowlisted enum. Free-text fields (`text`, `textarea`) run injection checks (SQL, XSS, command injection patterns) server-side via `apps/common/validation/`. Answers to `single_choice`/`multi_choice` are validated against the options list — a value not in the options is rejected even if a patient crafts a raw API request.

---

## Part 3 — Provider API mapping (the hard part)

This is the most architecturally significant piece. Here is the proposed approach.

### 3.1 The problem

We have dynamic questionnaire answers keyed by `field_key` (e.g. `current_weight_lbs = 220`).  
Provider APIs expect a fixed JSON shape (e.g. `{"patient": {"weight": {"value": 220, "unit": "lbs"}}}`).  
When we switch providers, the shape changes. We don't want to change questionnaire definitions — only the mapping.

### 3.2 The two-layer approach

**Layer 1 — Canonical schema (ours, stable)**

We define a canonical internal schema for clinical data. Every `QuestionnaireField` optionally has a `canonical_key` that maps it to this schema. The canonical schema never changes (we only add to it, never rename or delete):

```
canonical_keys (examples):
  patient.dob
  patient.sex_assigned_at_birth
  patient.weight_lbs
  patient.height_inches
  patient.bmi
  patient.state
  clinical.current_medications
  clinical.conditions
  clinical.allergies
  clinical.pregnancy_status
  clinical.prior_glp1_use
  clinical.goal_weight_lbs
  treatment.drug_slug
  treatment.delivery_preference
  consent.hipaa_acknowledged
  consent.telehealth_acknowledged
```

When a patient submits, we build a canonical payload from their answers by walking every field's `canonical_key`.

**Layer 2 — Provider adapter (per-provider, replaceable)**

Each provider has a JSON schema definition stored in the database:

```
ProviderIntegration
  id                  UUID
  name                string    e.g. "LifeFile / MediVera"
  slug                string    e.g. "lifefile"
  api_base_url        string
  auth_type           enum: basic | bearer | api_key
  is_active           bool
  created_at / updated_at

ProviderApiSchema
  id                  UUID
  provider            FK → ProviderIntegration
  schema_type         enum: order | patient | prescription | refill
  json_schema         JSON    (the exact JSON shape the provider expects)
  version             string
  is_active           bool

ProviderFieldMapping
  id                  UUID
  provider            FK → ProviderIntegration
  canonical_key       string    e.g. "patient.weight_lbs"
  provider_path       string    JSONPath e.g. "$.patient.weight.value"
  transform           string    optional — e.g. "lbs_to_kg", "date_to_iso"
  created_at / updated_at
```

**Staff workflow for a new provider:**

1. Go to `/staff/providers` → "Add provider"
2. Paste the provider's expected JSON schema for an order
3. For each `canonical_key`, specify the JSONPath in the provider's schema
4. Test with a synthetic patient record
5. Save and mark active

**At submission time:**

```python
def build_provider_payload(submission, provider):
    canonical = build_canonical_payload(submission)
    mappings = ProviderFieldMapping.objects.filter(provider=provider)
    payload = {}
    for mapping in mappings:
        value = canonical.get(mapping.canonical_key)
        if value is not None:
            value = apply_transform(value, mapping.transform)
            set_jsonpath(payload, mapping.provider_path, value)
    return payload
```

**When we switch providers:** Create a new `ProviderIntegration`, add field mappings for the new provider's schema, test, then flip `is_active`. No questionnaire changes needed. No code deploys needed.

**What this means for the questionnaire builder:** Staff must set `canonical_key` on every field that needs to reach the provider. Fields without a canonical key are "analytics only" — they're stored in our DB but not sent to any provider. This lets staff add questions freely without breaking integrations.

---

## Part 4 — Patient funnel (end to end)

```
1. Patient arrives at aretide.com (from ad, organic, etc.)
   → FunnelSession created (UTM captured, version pinned)

2. Drug selection step (first qualify step)
   → Patient picks: "I'm interested in [Medication A]"
   → Session.medication_id = A

3. Qualify questionnaire (medication A's active qualify version)
   → Dynamic steps driven by questionnaire version
   → Each PATCH to /funnel/eligibility/ validates against the version's field rules
   → Answers stored in EligibilityResponse.questionnaire_responses JSONB

4. Eligibility decision
   → Derived from canonical answers (BMI, age, safety screens)
   → If disqualified → friendly message, no account created
   → If eligible → proceed to account creation

5. Account creation step (last qualify step)
   → Email, password, name, phone
   → FunnelSession.claimed_by_user = new user

6. Email verification

7. Intake questionnaire (medication A's active intake version)
   → Dynamic steps driven by questionnaire version
   → Answers stored in MedicalIntake.questionnaire_responses JSONB
   → Version pinned to intake: MedicalIntake.questionnaire_version_id

8. Payment step (configured as a step in the intake questionnaire by staff)
   → Plugin type: "payment" → Stripe integration
   → Not staff-configurable beyond on/off placement

9. Consent step
   → Signatures stored separately (compliance requirement — not in questionnaire JSONB)

10. Submission
    → IntakeSubmission created with:
       - questionnaire_version_id
       - snapshot of all answers (JSONB)
       - canonical payload built from answers
    → Provider API payload built via ProviderFieldMapping
    → Sent to provider

11. Provider review → Prescription → Pharmacy fulfillment
    (unchanged from current flow)
```

---

## Part 5 — Patient portal (medical intake display)

**Problem today:** The patient portal intake display is hardcoded to 12 steps.

**Solution:** The patient portal renders the intake from the `IntakeSubmission` record, which contains both:
- `questionnaire_version_id` — so we can fetch the version's step/field schema
- `questionnaire_responses` JSONB — the actual answers

The portal fetches the version schema and renders each step/field with the patient's stored answer — exactly what they filled out, in the order they filled it out.

**What this means:** The step count in the portal is always correct because it's driven by how many steps the version had, not a hardcoded number.

---

## Part 6 — What happens when we change a questionnaire?

This is the most important clinical question. Here are the rules:

### 6.1 Active patients (currently in the funnel)

They are pinned to the version they started. They complete what they started. No impact.

### 6.2 Submitted patients (awaiting provider review or already prescribed)

Their `IntakeSubmission.questionnaire_version_id` is immutable. The provider received their answers mapped from whatever version they answered. No re-answering required. The provider's decision is based on their submitted record.

### 6.3 Refill patients (returning for a refill)

This is the hard question. Options:

| Option | Description | Tradeoff |
|--------|-------------|----------|
| **A. Refill is always unconditional** | Patient just requests a refill; no re-answering | Simple, but clinically risky if we've added new safety screens |
| **B. Re-answer if version changed** | Patient re-answers the full intake if current version ≠ their pinned version | Annoying for patients, but clinically complete |
| **C. Re-answer only flagged questions** | Staff marks certain questions as "re-answer required at refill if this question was added after their version" | Complex to implement, best UX |
| **D. Clinical review at refill** | Provider reviews prior record + new questions; no patient re-answering | Puts burden on provider, not patient |

**Recommendation:** Start with Option A (unconditional refill) while the questionnaire is still being tuned. Add a staff-configurable flag `requires_refill_reconfirmation: bool` on `QuestionnaireVersion` that, when true, prompts refill patients to re-answer only the new steps (steps with sort_order ≥ their prior version's step count).

Option C (flagging individual questions) should be a future enhancement once the questionnaire is stable.

### 6.4 The "we changed questions and the provider API needs different fields" edge case

If we add a new question that maps to a canonical key the provider requires for new prescriptions, we have two choices:

1. Require all existing patients to re-answer before their next prescription renewal
2. Provide a default value for the new field for existing patients and note it in the provider record

This is a **clinical operations decision**, not a software decision. The clinical team and legal must own this answer. We should expose the mechanism (flagging fields as "required for prescriptions, must be answered") but not decide the clinical policy.

---

## Part 7 — Analytics per questionnaire version

For every question that has analytics enabled, we track:

```
QuestionnaireAnswer (analytics, no PHI)
  id                        UUID
  questionnaire_version_id  UUID
  step_key                  string
  field_key                 string
  answer_hash               string   SHA-256 of the answer (for counting, not reading)
  answer_bucket             string   for numeric fields: bucketed range (e.g. "200-250 lbs")
  funnel_session_id         UUID
  created_at

QuestionnaireDropOff (analytics)
  questionnaire_version_id  UUID
  step_key                  string   last step the patient was on before abandoning
  count                     integer  aggregated daily
  date                      date
```

**PHI rule:** We never store raw free-text answers in analytics tables. Numeric answers are bucketed. Choice answers are stored as their option `value` (which is a machine key, not PHI). Staff can see aggregate distributions per question per version, not individual answers (those stay in `MedicalIntake.questionnaire_responses` which is behind audit logging).

---

## Part 8 — Known bugs to fix before next feature work

1. **Drug type "Other" input** — currently no text input appears; need to add a text input when "Other" is selected and save as a new `DrugType` row
2. **Price input** — the number input uses `step="0.01"` which makes arrow keys change by 1 cent; should be a regular text input that parses dollars with a `$` prefix
3. **"Manage versions" navigation** — clicking "Manage versions" in the questionnaire list does nothing; likely a TanStack Router `<Link>` rendering issue or missing route registration; needs debugging

---

## Part 9 — Open design questions (must answer before coding)

These require human decisions. The answers will shape the next 3–6 months of implementation.

### Q1: Who owns the canonical schema?
**Question:** The canonical key list (`patient.weight_lbs`, `clinical.conditions`, etc.) must be curated by someone. Every time we add a new questionnaire question that should reach the provider, it needs a canonical key. Who adds canonical keys, and what's the approval process?  
**Recommended answer:** Canonical keys are defined in code (a Python Enum or JSON file in `apps/integrations/canonical_schema.py`). Staff can see the list in the CRM. Only engineering adds new keys via PR. This keeps the mapping layer auditable.

### Q2: When a new provider integration is added, do we re-map from scratch or inherit?
**Question:** If we switch from LifeFile/MediVera to a different provider, do we manually map all fields again, or do we inherit the canonical → LifeFile mappings?  
**Recommended answer:** Map from scratch per provider. The canonical schema is the common language. Each provider gets its own complete `ProviderFieldMapping` set. This is a one-time staff task per provider, done in the CRM.

### Q3: What is the drug selection UX?
**Question:** Do patients see a grid of medication cards at the start of qualify ("Which medication are you interested in?") or does the current qualify flow remain ("Which delivery format interests you most?") and we derive the medication from their answers?  
**Recommended answer:** Make drug selection explicit and first. Patient clicks "Get started" → sees medication cards (Semaglutide / Tirzepatide / future ED medications). This selection drives which questionnaire loads. The current "delivery format" step can become a step inside the medication-specific qualify questionnaire if needed.

### Q4: How do we handle medications that share a questionnaire?
**Question:** If Semaglutide and Tirzepatide both use "Qualify GLP-1", the patient still selected a specific medication. Where do we record their specific medication choice?  
**Recommended answer:** Store `FunnelSession.medication_id` and `MedicalIntake.medication_id` from the drug selection step. Even if the questionnaire is shared, the medication is pinned. The provider receives the specific medication slug as a canonical field (`treatment.drug_slug`).

### Q5: What happens if a medication has no questionnaire assigned?
**Question:** Staff creates a new medication but hasn't created or assigned a questionnaire yet.  
**Recommended answer:** That medication is not visible to patients (not shown in the drug selection step). The CRM shows a warning: "This medication has no active qualify questionnaire — patients cannot see it." A medication is only visible if it has an active qualify AND active intake questionnaire.

### Q6: How do we handle the payment step?
**Question:** Staff wants to add a payment step "at any point we choose" in the intake flow.  
**Recommended answer:** Payment is a `plugin` type step with `plugin_id: "payment"`. Staff adds it to the intake questionnaire like any other step. The plugin renders the Stripe payment form. The step is considered "complete" when payment is confirmed. This means staff can put it before or after clinical questions as business needs change. Technically, the payment amount comes from `Medication.price_cents`, not from the questionnaire. Staff should be warned that moving the payment step affects conversion analytics.

### Q7: What is "version 1.0.0" of the qualify/intake questionnaire?
**Question:** The current seeded qualify has 3 steps (treatment interest, primary goal, account) and intake has 2 steps (identity/contact, review). These are placeholders. What are the actual clinical questions we want?  
**Recommended answer:** This is a clinical + business decision. Before launching the dynamic system to patients, the full question set (with proper clinical validation) must be entered into the builder and published as the active version. The seeded v1.0.0 should not be presented to actual patients — it is a scaffolding example only.

### Q8: How do we handle versioning of the provider schema?
**Question:** If LifeFile/MediVera changes their API schema, do we need to update all past `IntakeSubmission` records?  
**Recommended answer:** No. `IntakeSubmission` stores our canonical answers. The provider schema is only used at submission time (when we send the order). For re-submissions or refills, we re-run the mapping at that moment using the current active provider schema. Past submissions are not re-mapped retroactively.

---

## Part 10 — Implementation order (recommended)

Do not begin Phase 2 until Phase 1 decisions are fully signed off.

### Phase 1 — Fix bugs and stabilize what's built (1 week)
- [ ] Fix drug type "Other" input → create `DrugType` model and managed list
- [ ] Fix price input (text input, not number stepper)
- [ ] Fix "Manage versions" navigation
- [ ] Add `canonical_key` field to `QuestionnaireField` (no UI yet)
- [ ] Write the canonical schema as a Python Enum in code
- [ ] Answer all Q1–Q8 above

### Phase 2 — Drug selection + medication-specific questionnaire loading (2 weeks)
- [ ] Drug selection as first step of patient funnel
- [ ] `FunnelSession.medication_id` and `MedicalIntake.medication_id`
- [ ] Questionnaire lookup by medication
- [ ] Qualify and intake renderer uses medication context
- [ ] Patient portal intake display is fully dynamic

### Phase 3 — Canonical mapping + provider adapter (2–3 weeks)
- [ ] `ProviderIntegration`, `ProviderApiSchema`, `ProviderFieldMapping` models
- [ ] Staff CRM: paste provider JSON schema, map canonical keys to JSONPaths
- [ ] `build_canonical_payload()` and `build_provider_payload()` at submission
- [ ] Test with LifeFile/MediVera

### Phase 4 — Analytics per version (1 week)
- [ ] `QuestionnaireAnswer` and `QuestionnaireDropOff` tables
- [ ] Staff analytics dashboard: answer distributions per question per version
- [ ] Funnel drop-off by step

### Phase 5 — Refill questionnaire policy (1 week, after clinical team input)
- [ ] `requires_refill_reconfirmation` flag on `QuestionnaireVersion`
- [ ] Refill path checks version delta and prompts re-answer if flagged

---

## Appendix A — What "completely dynamic" actually means

"Completely dynamic" means:
- No question text is hardcoded in the frontend or backend
- No step count is hardcoded anywhere
- No field keys are hardcoded in validation logic (validation comes from the version schema)
- The provider payload is built from a mapping table, not code
- A non-technical staff member can add a question, add a step, change an option, reorder steps, publish a new version, and have it live for new patients — with zero code deploys

What it does NOT mean:
- Staff can change the frontend UI components (those stay in code)
- Staff can bypass HIPAA compliance controls
- Staff can arbitrarily inject HTML or scripts into question text (sanitized at save)
- The patient funnel rendering logic is removed (it just becomes data-driven)

---

## Appendix B — What existing data migration looks like

When we switch from hardcoded questions to dynamic questions, existing patient records were answered against the hardcoded schema. We need to:

1. Create a `Questionnaire` + `QuestionnaireVersion` that mirrors the old hardcoded questions exactly (with matching `field_key` values)
2. Write a data migration that sets `questionnaire_version_id` on existing `EligibilityResponse` and `MedicalIntake` records to this "legacy v0" version
3. Build a `questionnaire_responses` JSONB snapshot from the existing structured columns on those records
4. The patient portal can then render legacy records from the `questionnaire_responses` snapshot using the legacy version schema

Existing structured columns (`height_ft`, `weight_lbs`, `sex_assigned_at_birth`, etc.) can be kept in the database as a safety net but deprecated in code once the migration is verified. They are never deleted because they are part of the audit record.

---

*This document is the source of truth for this feature. Update it as decisions are made. Do not write code that contradicts this document without updating the document first.*
