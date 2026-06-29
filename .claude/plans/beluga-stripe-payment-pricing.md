# Aretide — Beluga + Stripe Payment/Pricing: Engineering Plan

> **⚠ This document is an engineering plan, not legal advice.** The permissible fee structure for telehealth platforms — including what may be charged for clinical consultations, medication, and platform services — varies by state and is governed by healthcare regulations that differ from ordinary commerce. All fee amounts, fee types, and patient disclosures described here are **placeholders pending review and approval by qualified healthcare counsel before any production implementation.** Do not implement the pricing, fee collection, or patient-facing copy in Sections 2, 4, and 6b until legal has signed off.

---

## Executive Summary

The integration adds revenue infrastructure across two moments: (1) charges related to the clinical visit (constrained by telehealth law), and (2) charges related to medication and platform services (structure TBD by legal). The architectural work spans Stripe, Beluga, and a new `payments` Django app.

**What Beluga confirmed (Joshua's response):**
- Telehealth regulations prohibit profiting from a clinical consultation charge — the consult fee must be a pass-through of Beluga's cost, with any Aretide revenue structured as a separate service/platform fee if permitted by counsel.
- Medication pricing is similarly constrained; many compliant platforms use a **subscription/membership model** to capture platform revenue rather than markup on individual medication charges.
- Order cancellation before pharmacy fulfillment is currently possible, but only **via Slack** — there is no Beluga API for hold/release. Slack cancellation is an operational fallback, not a reliable automated gate.
- Disqualification at the doctor level is rare: patients who would not qualify are typically screened out before the visit is sent to Beluga, so the practical risk of a completed visit that results in no prescription is low.

**Consequences for the plan:**
1. `strict` payment gating (hold pharmacy fulfillment until payment clears) is **not currently achievable** for Beluga-routed prescriptions via API. The realistic mode for Beluga-routed prescriptions is `advisory` with `manual_cancel_before_fulfillment` as the operational fallback.
2. Fee framing throughout is changed from "margin" to "service fee / platform fee" pending legal guidance on what is permissible.
3. A **subscription architecture** is added as the primary revenue model under evaluation: monthly Aretide membership covers platform access, care coordination, refill management, and support. Medication and consult costs are charged as pass-throughs or offset against the subscription at legal's direction.
4. Legal/compliance review is added as a required Phase 0 gate — no pricing logic or fee collection is implemented until the permissible fee model is confirmed.

Stripe is net-new to the codebase. No payment models, SDK dependencies, or routes exist today.

---

## Phased Implementation Plan

### Phase 0 — Legal/Compliance + Vendor Confirmation (no code, 1–2 weeks)

**Block all pricing implementation on this phase.** Two parallel workstreams:

**0A — Legal/compliance review (required before any fee collection):**
- What clinical consultation fees may Aretide charge patients beyond Beluga pass-through cost?
- May Aretide add a service/platform fee on top of medication vendor cost, or must medication be pure pass-through?
- Is a subscription/membership model the preferred compliance path?
- What patient disclosures are required, by what states, at what point in the funnel?
- What copy is required on estimated medication pricing ("only charged if prescribed")?
- May Aretide charge a visit fee for a consult that results in no prescription?

**0B — Beluga operational questions:**
- Confirm exact window between `RX_WRITTEN` and pharmacy fulfillment (how much time does Slack cancellation realistically allow?).
- Can Beluga add an API-based cancellation or hold endpoint to their roadmap?
- What Beluga webhook event, if any, indicates the order is no longer cancelable?
- Exact `visitType` strings and URL paths for all placeholder endpoints.
- Photo ID verification requirements for weight loss.

**Acceptance criteria:** Written legal guidance on fee model; written Beluga response on Slack cancellation window and API roadmap.

---

### Phase 1 — Neutral Data Foundation (≈1 week)

Build models and migrations that are structurally correct regardless of which fee model legal approves. No pricing logic, no fee amounts hardcoded.

Includes: `BelugaMedicationSku`, `PricingRule` (fields defined but fee_type left flexible), `VisitPricingConfig`, `StripeCustomer`, `StripePaymentMethod`, `VisitCharge`, `MedicationCharge`, `FulfillmentGate`, `PatientBillingStatus`, `PriceQuote`, `StripeWebhookEvent`, `PricingAuditEvent`, `SubscriptionPlan`, `PatientSubscription`.

**Acceptance criteria:** All migrations apply; models queryable; existing tests green; `Medication.price_cents` zero-filled and deprecated.

---

### Phase 2 — Stripe Customer + Visit Payment + Saved Card (≈1.5 weeks)

Add `stripe` SDK. Implement visit-fee PaymentIntent (pass-through consult cost + permitted service fee per legal). Save card via `setup_future_usage`. Wire Stripe webhooks idempotently. Submit Beluga visit only after payment succeeds.

**Gate:** Legal must have approved the visit fee amount and disclosure copy before patient-facing UI ships.

**Acceptance criteria:** Patient pays visit fee; card saved; webhooks idempotent; `PriceQuote` created; Beluga visit submitted after payment; backend tests pass; `tsc --noEmit` clean.

---

### Phase 3 — Subscription Billing (≈1.5 weeks, if subscription model approved)

Implement Stripe Billing (Subscriptions). `SubscriptionPlan` and `PatientSubscription` models live. Patient starts subscription during checkout. Subscription status gates refills and ongoing care services.

**Gate:** Legal must have confirmed subscription model and copy.

**Acceptance criteria:** Patient can start, manage, and cancel subscription; subscription status checked before refill; failed subscription payment surfaced in dashboard; Stripe subscription webhooks handled.

---

### Phase 4 — Medication Charge + Advisory Fulfillment Gate (≈1.5 weeks)

On `RX_WRITTEN`: create `MedicationCharge`, attempt off-session charge, record `FulfillmentGate` in `advisory` mode. On payment failure: notify patient and staff; staff uses Slack to attempt Beluga cancellation before pharmacy fulfillment if within the cancellation window. Block refills/check-ins until resolved.

**Gate:** Legal must have approved medication fee structure. Beluga Slack cancellation window must be documented.

**Acceptance criteria:** `MedicationCharge` created on `RX_WRITTEN`; charge attempted; failure surfaces to staff dashboard with Slack cancellation prompt and time elapsed since `RX_WRITTEN`; refills blocked until resolved; smoke tests cover success and failure paths.

---

### Phase 5 — Staff Pricing Admin + Quote Inspector (≈4 days)

Backend CRUD for `PricingRule`, `VisitPricingConfig`. Staff pricing screen. Quote Inspector. Patient billing status management.

**Acceptance criteria:** Staff can change service fees without code deploy; Quote Inspector shows full cost breakdown; changes audit-logged; unauthorized access 403.

---

### Phase 6 — Patient UX Polish (≈4 days)

Intake checkout UI, cost estimate display, payment-failed dashboard state, subscription management page, payment retry flow.

**Acceptance criteria:** Patient sees compliant pricing copy pre-intake; checkout shows fee breakdown; dashboard shows payment/subscription status clearly; retry works.

---

### Phase 7 — Hardening & Own-Pharmacy Gate (future)

If Aretide builds a direct pharmacy relationship (not Beluga-routed), implement hard `strict` payment gate (do not create pharmacy order until charge succeeds). Idempotency audit, catalog sync automation, Beluga API cancellation endpoint (if they add it).

---

## Section 1 — Data Model

### 1.1 New models

#### `BelugaMedicationSku` (`beluga_medication_skus`)

A child of the existing `Medication` model (`apps/questionnaires/models.py`). **`Medication` is not replaced** — it remains the patient-facing treatment entity and questionnaire-routing source of truth. `BelugaMedicationSku` adds Beluga-specific vendor cost and fulfillment metadata for each dose/supply-duration variant.

One `Medication` (e.g. Semaglutide) maps to many `BelugaMedicationSku` rows (0.2mg/1-month, 0.6mg/3-month, etc.).

`Medication.price_cents` is **deprecated** — set to 0 on migration; all patient pricing flows through `BelugaMedicationSku` + `PricingRule`.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `medication` | FK → Medication | Parent treatment/program |
| `vendor` | FK → ApiVendor | Always the Beluga `ApiVendor` row |
| `beluga_med_id` | CharField(128) unique | The `medId` in Beluga payloads |
| `display_name` | CharField(256) | Patient-facing label |
| `concentration` | CharField(256) | e.g. "Semaglutide + Glycine 4mg/0.5mg/mL × 1ml" |
| `supply_days` | PositiveSmallIntegerField | `30` or `90` |
| `program_type` | CharField(32) | `autorx`, `standard`, `refill` |
| `vendor_drug_cost_cents` | IntegerField | Aretide's cost to Beluga |
| `vendor_shipping_cost_cents` | IntegerField | |
| `vendor_dispense_fee_cents` | IntegerField | Branded / Partner 2 items |
| `vendor_facilitation_fee_cents` | IntegerField | Per-shipment facilitation at current tier |
| `refill_min_days` | PositiveSmallIntegerField | Earliest Beluga accepts next refill (15 for 1-mo, 60 for 3-mo) |
| `refill_max_days` | PositiveSmallIntegerField | Latest Beluga accepts (60 for 1-mo, 120 for 3-mo) |
| `is_active` | BooleanField | |
| `catalog_snapshot` | JSONField | Raw Beluga catalog row at last sync |
| `last_synced_at` | DateTimeField | |
| `created_at` / `updated_at` | DateTimeField | |

**Never expose `vendor_*_cost_cents` fields in patient-facing API responses.**

---

#### `PricingRule` (`pricing_rules`)

Configures per-drug and default service fee and fulfillment gate behavior. Editable by staff without code deploy. **Fee field names use "service_fee" pending legal confirmation of permissible fee structure.**

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `rule_type` | CharField(32) | `default`, `category_override`, `item_override` |
| `category` | CharField(32) | Nullable; for `category_override` |
| `sku` | FK → BelugaMedicationSku | Nullable; for `item_override` |
| `fee_type` | CharField(32) | `service_fee_percent`, `subscription_allocation`, `pass_through_only` — set after legal review |
| `service_fee_pct` | DecimalField(5,2) | Aretide's service fee as % of vendor total. **Requires legal approval before use.** |
| `service_fee_floor_cents` | IntegerField | Minimum service fee in cents. **Requires legal approval before use.** |
| `stripe_fee_pass_through` | BooleanField | Whether Stripe ~2.9% + 30¢ is added to patient price |
| `allowed_supply_days` | ArrayField(int) | `[30]`, `[90]`, `[30, 90]` |
| `mvp_supply_strategy` | CharField(32) | `one_month_trial`, `three_month_minimum`, `staff_configured` |
| `requires_payment_before_fulfillment` | BooleanField | Default True |
| `payment_gate_mode` | CharField(32) | `advisory`, `manual_cancel_before_fulfillment`, `disabled` — no `strict` until Beluga has API hold |
| `is_active` | BooleanField | |
| `notes` | TextField | Staff-facing rationale including legal basis for fee |
| `legal_approval_ref` | CharField(128) | Reference to legal memo or ticket that approved this rule |
| `created_by` | FK → User | |
| `created_at` / `updated_at` | DateTimeField | |

**Rule resolution priority:** `item_override` > `category_override` > `default`. Only one active rule per type+scope; enforced in service layer.

---

#### `VisitPricingConfig` (`visit_pricing_configs`)

Doctor visit fee by visit type. **Per Joshua's response: the visit charge to patients must be the Beluga pass-through cost plus any separately structured service/platform fee — not a profit on the clinical charge itself.** Fee type and amounts require legal approval.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `visit_type` | CharField(64) | Maps to Beluga `visitType` strings |
| `beluga_cost_cents` | IntegerField | Aretide's cost for this visit type (pass-through) |
| `aretide_service_fee_cents` | IntegerField | **Zero until legal confirms this is permissible** |
| `total_patient_charge_cents` | IntegerField | `beluga_cost_cents + aretide_service_fee_cents` |
| `display_label` | CharField(128) | Patient-facing label |
| `fee_disclosure_copy` | TextField | Patient-facing disclosure of what the fee covers. **Requires legal review.** |
| `is_active` | BooleanField | |
| `legal_approval_ref` | CharField(128) | |
| `created_by` | FK → User | |
| `created_at` / `updated_at` | DateTimeField | |

**Known Beluga costs (0–3K volume tier, for reference only — do not set patient charges without legal sign-off):**
- AutoRx GLP-1 initial: $55
- Standard async: $30
- Standard sync: $45

---

#### `SubscriptionPlan` (`subscription_plans`)

Defines a recurring Aretide membership tier. **This model is built speculatively — whether to use subscription billing vs. per-transaction fees is a legal/product decision pending Phase 0.**

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | CharField(128) | e.g. "Aretide GLP-1 Care" |
| `slug` | SlugField unique | |
| `stripe_price_id` | CharField(64) | Stripe Price object ID (`price_…`) |
| `billing_interval` | CharField(16) | `month`, `year` |
| `amount_cents` | IntegerField | Recurring charge amount |
| `includes_visit_fee` | BooleanField | Whether the visit cost is bundled or billed separately |
| `includes_medication_pass_through` | BooleanField | Whether medication vendor cost is billed separately |
| `description` | TextField | What the subscription covers (patient-facing) |
| `coverage_copy` | TextField | Explicit list of what is/isn't included. **Requires legal review.** |
| `is_active` | BooleanField | |
| `legal_approval_ref` | CharField(128) | |
| `created_at` / `updated_at` | DateTimeField | |

---

#### `PatientSubscription` (`patient_subscriptions`)

Per-patient subscription state.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user` | OneToOneField → User | |
| `plan` | FK → SubscriptionPlan | |
| `stripe_subscription_id` | EncryptedCharField(128) | `sub_…` |
| `stripe_subscription_item_id` | CharField(64) | For metered billing items |
| `status` | CharField(32) | `active`, `past_due`, `canceled`, `incomplete`, `trialing` — mirrors Stripe status |
| `current_period_start` | DateTimeField | |
| `current_period_end` | DateTimeField | |
| `cancel_at_period_end` | BooleanField | |
| `canceled_at` | DateTimeField | |
| `trial_end` | DateTimeField | |
| `created_at` / `updated_at` | DateTimeField | |

---

#### `StripeCustomer` (`stripe_customers`)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user` | OneToOneField → User | |
| `stripe_customer_id` | EncryptedCharField(64) | `cus_…` |
| `created_at` / `updated_at` | DateTimeField | |

---

#### `StripePaymentMethod` (`stripe_payment_methods`)

Saved payment methods. No card data on our servers.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user` | FK → User | |
| `stripe_payment_method_id` | EncryptedCharField(64) | `pm_…` |
| `card_brand` | CharField(16) | `visa`, `mastercard`, etc. — from Stripe |
| `card_last4` | CharField(4) | Display only |
| `card_exp_month` | PositiveSmallIntegerField | |
| `card_exp_year` | PositiveSmallIntegerField | |
| `is_default` | BooleanField | |
| `stripe_setup_intent_id` | CharField(64) | Audit/reconciliation |
| `created_at` / `updated_at` | DateTimeField | |

---

#### `VisitCharge` (`visit_charges`)

The clinical consultation charge.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user` | FK → User | |
| `visit_pricing_config` | FK → VisitPricingConfig | Config snapshot at charge time |
| `beluga_pass_through_cents` | IntegerField | Portion that is Beluga cost pass-through |
| `aretide_service_fee_cents` | IntegerField | Portion that is Aretide service fee (zero until legal approves) |
| `total_amount_cents` | IntegerField | Sum charged |
| `stripe_payment_intent_id` | EncryptedCharField(128) | |
| `stripe_charge_id` | EncryptedCharField(128) | |
| `status` | CharField(32) | `pending`, `succeeded`, `failed`, `refunded` |
| `failure_reason` | CharField(256) | |
| `idempotency_key` | CharField(64) | `visit-{user_id}-{intake_id}` unique |
| `charged_at` | DateTimeField | |
| `created_at` / `updated_at` | DateTimeField | |

---

#### `MedicationCharge` (`medication_charges`)

Post-approval medication and service fee charge.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user` | FK → User | |
| `prescription` | FK → PatientPrescription | |
| `sku` | FK → BelugaMedicationSku | Nullable; matched by `beluga_med_id` |
| `pricing_rule_snapshot` | JSONField | Full rule state at charge time |
| `vendor_total_cost_cents` | IntegerField | Drug + shipping + facilitation |
| `aretide_service_fee_cents` | IntegerField | **Zero until legal approves fee model** |
| `stripe_fee_cents` | IntegerField | |
| `patient_price_cents` | IntegerField | Final amount charged |
| `stripe_payment_intent_id` | EncryptedCharField(128) | |
| `stripe_charge_id` | EncryptedCharField(128) | |
| `status` | CharField(32) | `pending`, `requires_action`, `succeeded`, `failed`, `refunded` |
| `failure_code` | CharField(64) | |
| `failure_message` | CharField(256) | Patient-safe message |
| `retry_count` | PositiveSmallIntegerField | Max 3 |
| `last_retry_at` | DateTimeField | |
| `idempotency_key` | CharField(64) | `med-{user_id}-{prescription_id}-{attempt}` |
| `created_at` / `updated_at` | DateTimeField | |

---

#### `FulfillmentGate` (`fulfillment_gates`)

Tracks the advisory payment-and-fulfillment state for a prescription. **Note: for Beluga-routed prescriptions, this is advisory — Beluga may already be routing to pharmacy. `strict` mode (guaranteed hold) is only possible with Aretide's own pharmacy relationship or a future Beluga API hold endpoint.**

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `prescription` | OneToOneField → PatientPrescription | |
| `gate_mode` | CharField(32) | `advisory`, `manual_cancel_before_fulfillment`, `disabled` |
| `status` | CharField(32) | `awaiting_payment`, `payment_succeeded`, `payment_failed`, `fulfillment_triggered`, `cancellation_requested`, `cancellation_confirmed`, `cancellation_too_late` |
| `medication_charge` | FK → MedicationCharge | |
| `beluga_fulfillment_endpoint` | CharField(32) | `autorx`, `refill`, `update_visit` |
| `fulfillment_payload` | JSONField | Payload frozen at prescription receipt |
| `fulfillment_response` | JSONField | Beluga's response if called |
| `rx_written_at` | DateTimeField | When `RX_WRITTEN` was received — used to show time elapsed for Slack cancellation |
| `slack_cancellation_requested_at` | DateTimeField | When staff sent Slack cancellation |
| `slack_cancellation_confirmed_at` | DateTimeField | When staff confirmed Beluga acknowledged cancellation |
| `blocked_reason` | CharField(256) | |
| `created_at` / `updated_at` | DateTimeField | |

---

#### `PriceQuote` (`price_quotes`)

Append-only log of every pricing computation. Powers the staff Quote Inspector. Never deleted.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user` | FK → User | |
| `sku` | FK → BelugaMedicationSku | Nullable for visit-fee quotes |
| `pricing_rule` | FK → PricingRule | Rule selected |
| `quote_type` | CharField(32) | `visit_fee`, `subscription_fee`, `medication_estimate`, `medication_final_charge` |
| `beluga_consult_cost_cents` | IntegerField | Visit quotes: Beluga consult cost |
| `vendor_drug_cost_cents` | IntegerField | Medication quotes |
| `vendor_shipping_cost_cents` | IntegerField | |
| `vendor_dispense_fee_cents` | IntegerField | |
| `vendor_facilitation_fee_cents` | IntegerField | |
| `vendor_total_cents` | IntegerField | Sum of vendor inputs |
| `supply_days` | PositiveSmallIntegerField | |
| `service_fee_pct` | DecimalField(5,2) | Fee % used from rule |
| `service_fee_floor_cents` | IntegerField | Floor from rule |
| `price_from_percent_cents` | IntegerField | `vendor_total / (1 - service_fee_pct)` |
| `price_from_floor_cents` | IntegerField | `vendor_total + service_fee_floor_cents` |
| `price_before_stripe_cents` | IntegerField | `max(price_from_percent, price_from_floor)` |
| `service_fee_applied_cents` | IntegerField | `price_before_stripe - vendor_total` |
| `floor_was_binding` | BooleanField | True if floor produced a higher price than percent |
| `stripe_fee_cents` | IntegerField | |
| `patient_price_cents` | IntegerField | Final charge |
| `subscription_allocation_cents` | IntegerField | If subscription model: portion of subscription fee allocated to this charge |
| `legal_pricing_basis` | CharField(256) | From `PricingRule.notes` / `legal_approval_ref` — explains why this fee is permissible |
| `rule_selection_reason` | CharField(64) | `item_override`, `category_override`, `default` |
| `sku_selection_reason` | CharField(128) | |
| `beluga_master_id` | CharField(128) | |
| `prescription_id` | UUIDField | Nullable |
| `stripe_payment_intent_id` | CharField(128) | Nullable |
| `created_at` | DateTimeField | Immutable |

---

#### `PatientBillingStatus` (`patient_billing_statuses`)

One-to-one with `User`. Enables any part of the system to quickly check "can this patient get service?"

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user` | OneToOneField → User | |
| `status` | CharField(32) | `current`, `payment_due`, `collections_referred`, `blocked` |
| `overdue_since` | DateTimeField | When last charge failed |
| `overdue_charge` | FK → MedicationCharge | Which charge is unpaid |
| `subscription_status` | CharField(32) | Denormalized from `PatientSubscription.status` for fast queries |
| `escalated_at` | DateTimeField | |
| `escalated_by` | FK → User | |
| `notes` | TextField | Staff-only |
| `created_at` / `updated_at` | DateTimeField | |

---

### 1.2 Extensions to existing models

**`Medication`**: No structural changes. Deprecate `price_cents` (zero-fill on migration; remove column later).

**`PatientPrescription`**: Add `fulfillment_gate_status` (denormalized, synced by `FulfillmentGate` signal). Add `quoted_patient_price_cents` (nullable). Add `beluga_sku` FK → `BelugaMedicationSku` (nullable; matched by `beluga_med_id`).

**`PharmacyProductCatalog`**: Built for LifeFile/MediVera (inactive). Do not extend for Beluga. `BelugaMedicationSku` is canonical.

**`ProviderReview`**: No changes needed.

### 1.3 What is NOT stored

- Raw card numbers, CVVs, or full card details — Stripe only
- Stripe webhook raw payloads — idempotency key + event type only
- Vendor cost data in patient-facing API responses
- PHI in logs
- `stripe_customer_id` or `stripe_payment_intent_id` in plaintext logs

---

## Section 2 — Patient UX

> **All patient-facing copy in this section is a draft. Every price, fee label, and disclosure must be reviewed and approved by healthcare counsel before it is shown to patients.**

### Before intake (pricing page / landing page)

Present costs in a way that complies with telehealth disclosure requirements. Pending legal guidance, use ranges and avoid specific fee commitments:

- "Provider consultation: included with your care plan" (if subscription model) **or** "Provider consultation: $X" (if per-visit fee — requires legal approval of amount and label)
- "Medication: estimated $X–$Y/month if prescribed, charged separately only if your provider prescribes it"
- Explicit disclosure: what the consultation covers, what it does not, what happens if not prescribed

**Do not show Beluga vendor costs, facilitation fees, or internal service fee percentages.**

### Checkout step (after consent)

Three payment flow options — which one ships depends on the legal/product decision from Phase 0:

**Option A — Subscription-first (recommended if legal approves):**
1. Patient starts Aretide membership subscription (Stripe Billing).
2. First month charged now; subscription covers care coordination, messaging, refill management, and platform access.
3. Provider consultation and medication are disclosed as separate pass-through charges (if applicable) or included in subscription.
4. Card saved via subscription creation (no separate SetupIntent needed — Stripe Billing handles it).

**Option B — Per-visit + saved card (fallback):**
1. Patient pays visit fee (Beluga cost pass-through + permitted service fee).
2. Card saved via `setup_future_usage: "off_session"` on the visit-fee PaymentIntent (see Section 5).
3. Medication charge is attempted off-session after prescription; if fails, patient updates card and retries.
4. If medication charge fails and Beluga has already routed to pharmacy, staff attempts Slack cancellation.

**Option C — Own-pharmacy (future, not MVP):**
1. Patient pays visit fee and saves card.
2. Medication charge attempted before pharmacy order is created.
3. Because Aretide controls the pharmacy order, fulfillment only starts after charge succeeds — this is a hard gate, not advisory.

### After prescription approval

Dashboard notification: "Your provider has approved your treatment. We're processing your medication payment."

- If charge succeeds quickly: "Payment confirmed — your pharmacy order is being prepared."
- If charge fails (see below).

### If medication payment fails

Dashboard banner:
- "We weren't able to process your medication payment."
- If within Slack cancellation window: staff is simultaneously alerted to attempt Beluga cancellation.
- CTA: "Update payment method" → `/dashboard/payment`.
- On card update + retry: if charge succeeds before pharmacy has fulfilled, normal fulfillment. If pharmacy has already fulfilled: patient owes for medication received; staff handles per collections policy.

**Patient-facing messages never expose Stripe decline codes, internal error strings, or Beluga API responses.**

### If not prescribed

- No medication charge.
- No `FulfillmentGate` created.
- Visit fee status: whether it is refunded if not prescribed is a **legal/product decision** not made by this plan. System must support refund (`charge.refunded` webhook) regardless.

### Cost transparency copy requirements

- Never promise "your medication will cost $X" — use estimated ranges with disclaimer.
- All estimated prices must note they depend on prescribed dose (which may differ from estimate).
- Subscription copy must explicitly list what is and is not included.
- A "charges only if prescribed" disclosure is required on any page that collects payment information before prescription.

---

## Section 3 — Staff/Dev UX

### Staff Pricing Admin screen

**Route**: `src/routes/staff.pricing.tsx`
**Permission**: `IsStaff` — no public read, no patient write.

**Sections:**

1. **Visit Fees** — `VisitPricingConfig` table:
   - Beluga cost (pass-through), Aretide service fee (initially $0), total patient charge, disclosure copy.
   - All amounts read-only until legal has signed off; then editable by staff with `pricing_admin` permission.

2. **Pricing Rules** — `PricingRule` table:
   - Fee type, service fee %, floor, gate mode, supply strategy, legal approval reference.
   - `fee_type = pass_through_only` is the safe default until legal approves service fees.
   - Preview: "At this rule, vendor total $83.75 → patient price $X."

3. **Subscription Plans** — `SubscriptionPlan` table:
   - Plan name, Stripe Price ID, amount, what's included, legal approval reference.
   - Active/inactive toggle.

4. **Medication Catalog** — `BelugaMedicationSku` read-only table:
   - Beluga med ID, display name, vendor cost breakdown, computed patient price at current rule.
   - Active/inactive toggle. Last synced date.

5. **Audit Log** — `PricingAuditEvent` records. Read-only. Last 200 entries.

6. **Quote Inspector** — Searchable `PriceQuote` table:

   | Column | Notes |
   |---|---|
   | Quote ID | UUID, linkable |
   | Patient | Name + email |
   | Quote type | visit_fee / subscription / medication_estimate / medication_final_charge |
   | Beluga masterId | |
   | Prescription ID | |
   | Stripe PaymentIntent ID | |
   | SKU | BelugaMedicationSku display name |
   | Supply days | |
   | Beluga consult cost | Visit quotes |
   | Vendor drug / shipping / facilitation | Medication quotes |
   | Vendor total | |
   | Service fee % used | |
   | Price from % | `vendor_total / (1 - fee_pct)` |
   | Price from floor | `vendor_total + floor` |
   | Floor binding? | Whether floor produced higher price |
   | Service fee applied | Actual fee dollars |
   | Stripe fee | |
   | Patient price | Final |
   | Subscription allocation | If subscription model |
   | Legal pricing basis | From rule notes/ref |
   | Rule selection reason | |
   | SKU selection reason | |
   | Created at | |

   **Search**: patient email, prescription UUID, Beluga masterId, Stripe PaymentIntent ID, quote ID, date range, quote type.

7. **Billing Status** — Patients with `payment_due` or `collections_referred` status. Columns: patient, overdue since, overdue amount, time since `RX_WRITTEN`, Slack cancellation status. Staff actions: mark resolved, comp, escalate.

**Permissions:**
- `GET /api/staff/pricing/*` — `IsStaff`
- `PATCH /api/staff/pricing/*` — `IsStaff` + `pricing_admin` group
- No public read of any fee data

---

## Section 4 — Pricing Calculation

> **All formulas and amounts in this section require legal approval before use in production. Until legal confirms the permissible fee model, all `service_fee_pct` values should be set to 0 and `fee_type = pass_through_only`.**

### Doctor visit charge

```
total_patient_charge = beluga_consult_pass_through + aretide_service_fee
```

Per Joshua's response: telehealth regulations prohibit profiting from the clinical consultation charge. The consult cost must be disclosed as a pass-through of Beluga's cost. An Aretide service fee may be separately permissible, depending on how it is structured and disclosed. **Do not set `aretide_service_fee_cents > 0` until legal confirms.**

### Medication patient price

**Corrected formula** (fixes bug in previous draft where price and margin floor were compared on mismatched scales):

```python
# Step 1: compute vendor total
vendor_total = (
    vendor_drug_cost_cents
    + vendor_shipping_cost_cents
    + vendor_dispense_fee_cents
    + vendor_facilitation_fee_cents
)

# Step 2: compute price two ways, take the higher
price_from_percent = math.ceil(vendor_total / (1 - service_fee_pct))
    # e.g., $8375 / (1 - 0.35) = $12885 cents = $128.85
price_from_floor = vendor_total + service_fee_floor_cents
    # e.g., $8375 + $4000 = $12375 cents = $123.75

price_before_stripe = max(price_from_percent, price_from_floor)
floor_was_binding = (price_from_floor > price_from_percent)

# Step 3: service fee applied
service_fee_applied = price_before_stripe - vendor_total

# Step 4: Stripe fee (if pass-through enabled)
stripe_fee = math.ceil(price_before_stripe * 0.029) + 30

# Step 5: final price
patient_price = price_before_stripe + stripe_fee
```

**Previous bug:** The prior version compared `vendor_total / (1 - margin_pct)` (a full price) against `margin_floor_cents` (a margin amount) inside `max()`. These are not the same unit. The corrected version computes both a full price from percent and a full price from floor, then takes the max of two prices.

**Note on service fee naming:** The fields are called `service_fee_pct` and `service_fee_floor_cents`, not "margin." What Aretide can call this, how it must be disclosed to patients, and whether it is legally permissible as a standalone line item vs. bundled into a subscription allocation is a legal question.

### Rounding

Always `math.ceil()` to whole cents. Never display fractional cents.

### Catalog cost drift

If `vendor_total` at final charge time differs from the estimate shown at intake by more than 15%, log a `PricingAuditEvent` alert. Do not silently charge a materially different amount — require staff review at this threshold.

### What we do NOT charge for

- `CONSULT_CONCLUDED` with `visitOutcome = referred`: no medication charge.
- `CONSULT_CANCELED`: visit fee refund is a product/legal decision. System must support refund flow regardless.

---

## Section 5 — Stripe Architecture

### Library

Backend: `stripe` Python SDK (latest). Frontend: `@stripe/stripe-js` + `@stripe/react-stripe-js`.

Settings: `STRIPE_SECRET_KEY` (backend only), `STRIPE_PUBLISHABLE_KEY` (frontend-safe), `STRIPE_WEBHOOK_SECRET`.

**Before go-live:** Ensure Stripe HIPAA BAA is signed. Treat `stripe_customer_id` as PHI: encrypted at rest, never logged in plaintext.

### Visit fee — PaymentIntent with `setup_future_usage`

**Decision: use `setup_future_usage: "off_session"` on the visit-fee PaymentIntent** (not a separate SetupIntent at checkout).

| Approach | UX | Complexity | Verdict |
|---|---|---|---|
| **A — `setup_future_usage: "off_session"` on visit-fee PaymentIntent** | One card form. Single `confirmPayment()`. Stripe saves card automatically. | Low | **Recommended** |
| **B — Separate SetupIntent** | Two forms or two steps; confusing UX with no clear advantage at this scale | High | Not recommended at MVP |

Implementation:
1. `POST /api/payments/visit-charge/` → creates `StripeCustomer` if needed; creates PaymentIntent with `amount`, `currency: "usd"`, `setup_future_usage: "off_session"`, `customer`, `metadata: { user_id, intake_id }`. Returns `client_secret`.
2. Frontend: Stripe Payment Element → `stripe.confirmPayment({ clientSecret, confirmParams: { return_url } })`.
3. On `payment_intent.succeeded` webhook: set `VisitCharge.status = "succeeded"`, extract `payment_intent.payment_method`, create `StripePaymentMethod` with card details, submit Beluga visit.

A standalone `POST /api/payments/setup-payment-method/` (SetupIntent) is only used for **card-update/retry flows** where there is no concurrent charge.

### Subscription billing — Stripe Billing (if approved by legal)

1. `POST /api/payments/start-subscription/` → creates `StripeCustomer` if needed, creates Stripe `Subscription` with `price_id` from `SubscriptionPlan.stripe_price_id`. Returns `client_secret` for the initial payment.
2. Frontend: Stripe Payment Element for subscription confirmation.
3. On `customer.subscription.created` / `invoice.payment_succeeded` webhooks: update `PatientSubscription.status`.
4. On `invoice.payment_failed`: update `PatientBillingStatus.subscription_status = "past_due"`, notify patient.

### Medication off-session charge — PaymentIntent

Triggered from `apply_beluga_webhook` on `RX_WRITTEN`:

1. Look up default `StripePaymentMethod`.
2. Compute `patient_price_cents` via pricing formula (using `PricingRule` for the SKU). Create `PriceQuote`.
3. Create Stripe PaymentIntent: `confirm=True`, `off_session=True`, `payment_method`, `customer`, `idempotency_key`.
4. Create `FulfillmentGate(gate_mode="advisory", status="awaiting_payment", rx_written_at=now)`.
5. Outcomes:
   - **Succeeds** → `MedicationCharge.status = "succeeded"` → `FulfillmentGate.status = "payment_succeeded"` → if `beluga_fulfillment_endpoint` is partner-controlled (e.g. `autorx`), call it now; otherwise log that Beluga has routed.
   - **Requires authentication** → `status = "requires_action"` → notify patient to authenticate.
   - **Declined** → `status = "failed"` → notify patient + staff; staff manually attempts Slack cancellation (see Section 6).

### Webhook security

Verify all Stripe webhooks with `stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)`. Reject invalid signatures with 400. Deduplicate by `stripe_event_id` in `StripeWebhookEvent` table. Replay safe.

### Stripe events to handle

| Event | Action |
|---|---|
| `payment_intent.succeeded` | Update `VisitCharge` or `MedicationCharge`; trigger partner-controlled fulfillment if applicable |
| `payment_intent.payment_failed` | Update charge status; notify patient + staff |
| `payment_intent.requires_action` | Mark `requires_action`; send patient back to authenticate |
| `customer.subscription.created` | Create/update `PatientSubscription` |
| `customer.subscription.updated` | Update `PatientSubscription` status/period |
| `customer.subscription.deleted` | Mark `PatientSubscription.status = "canceled"` |
| `invoice.payment_succeeded` | Update `PatientBillingStatus.subscription_status = "active"` |
| `invoice.payment_failed` | Update `PatientBillingStatus.subscription_status = "past_due"`; notify |
| `setup_intent.succeeded` | Create `StripePaymentMethod` (card-update flow only) |
| `payment_method.updated` | Update `StripePaymentMethod` card details |
| `charge.refunded` | Update charge status to `refunded` |
| `customer.deleted` | Alert staff; clear customer ID |

### Decline code patient messages

| Stripe code | Patient message |
|---|---|
| `insufficient_funds` | "Your card was declined due to insufficient funds. Please use a different card." |
| `card_declined` | "Your card was declined. Please use a different card or contact your bank." |
| `expired_card` | "Your card has expired. Please update your payment method." |
| `authentication_required` | "Your bank requires you to verify this payment. Please log in to complete it." |

Never expose raw Stripe error strings to patients.

---

## Section 6 — Beluga Architecture

### Where visits are submitted

Beluga visit submission fires only after visit payment succeeds:

```
Old: Consent signed → Beluga visit submitted
New: Consent signed → visit-fee PaymentIntent → on payment_intent.succeeded → Beluga visit submitted
```

The frozen `beluga_visit_payload` in `IntakeSubmission.snapshot` is built at consent (as today). HTTP call to Beluga fires only after `VisitCharge.status == "succeeded"`.

### Where RX_WRITTEN triggers medication charge

New behavior in `apply_beluga_webhook` on `RX_WRITTEN`:

```python
# On RX_WRITTEN:
1. Create PatientPrescription (as today)
2. Match med to BelugaMedicationSku by beluga_med_id
3. Compute patient_price_cents; create PriceQuote
4. Create FulfillmentGate(
       gate_mode="advisory",
       status="awaiting_payment",
       rx_written_at=now,
       beluga_fulfillment_endpoint=...,   # "autorx" or "update_visit"
       fulfillment_payload=...            # frozen payload
   )
5. Create MedicationCharge(status="pending")
6. Attempt off-session Stripe charge
7. Do NOT call any Beluga fulfillment endpoint at this point
```

### Fulfillment gate reality for Beluga-routed prescriptions

**Joshua confirmed:** Beluga does not have an API hold/release endpoint. Cancellation is currently possible before pharmacy fulfillment, but only via Slack. This is the complete picture:

| Program type | Who controls fulfillment trigger | Gate mode available | Notes |
|---|---|---|---|
| GLP-1 AutoRx (subsequent shipments) | Aretide — must call `autorx_endpoint` | `strict` is achievable | Do not call `autorx_endpoint` until payment succeeds |
| Standard programs (initial Rx) | Beluga routes automatically after clinician approval | `advisory` only | Payment gate is best-effort; Slack cancellation is the fallback |
| Own-pharmacy (future) | Aretide — controls pharmacy order creation | `strict` is achievable | Do not create pharmacy order until payment succeeds |

**`strict` mode (`payment_gate_mode = "strict"`) is only valid when Aretide controls the fulfillment trigger.** For Beluga-routed prescriptions on standard programs, remove `strict` from the allowed options. The system must prevent a `payment_gate_mode = "strict"` setting on rules that apply to standard Beluga programs.

### Advisory gate + Slack cancellation fallback (standard programs)

On `MedicationCharge` failure for a standard Beluga program:

1. `FulfillmentGate.status = "payment_failed"`.
2. `PatientBillingStatus.status = "payment_due"`.
3. Staff dashboard shows: patient name, time since `RX_WRITTEN`, prescription details, Slack cancellation prompt.
4. Staff manually contacts Beluga via Slack to request cancellation before pharmacy fulfillment.
5. Staff records outcome:
   - Cancellation confirmed → `FulfillmentGate.status = "cancellation_confirmed"`. Patient owes nothing; retry when card updated.
   - Cancellation too late (pharmacy already processing) → `FulfillmentGate.status = "cancellation_too_late"`. Patient received medication unpaid; staff handles per collections policy.
6. Staff updates `FulfillmentGate` manually via staff API.

**This is an operational process, not an automated gate.** The plan acknowledges this is imperfect and is a reason to prioritize: (a) asking Beluga for an API cancellation endpoint, and (b) building own pharmacy relationships where Aretide can hard-gate.

### On successful payment for partner-controlled fulfillment (AutoRx)

```python
def trigger_autorx_fulfillment(fulfillment_gate: FulfillmentGate):
    response = beluga_client.post_autorx(fulfillment_gate.fulfillment_payload)
    fulfillment_gate.fulfillment_response = response
    if response.get("status") in ("NEW_RX_SENT", 200):
        fulfillment_gate.status = "fulfillment_triggered"
    else:
        fulfillment_gate.status = "fulfillment_error"
        # Alert staff — do not charge again
    fulfillment_gate.save()
```

AutoRx error codes `MAX_MONTHS_REACHED`, `NEEDS_CHECKIN`, `TOO_LONG_AGO` must trigger staff alerts.

---

## Section 6b — AutoRx, Supply Duration, and Payment-Gating Operating Modes

### Beluga AutoRx protocol

| Month | Event | Beluga billing |
|---|---|---|
| 0 | Initial async physician consult | $55 (covers month-0 + month-3 check-in) |
| 1 | Shipment 1 + facilitation | medication cost + $15–$20 facilitation |
| 3 | Check-in visit | $0 (prepaid at month 0) |
| 4 | Shipment 2 + facilitation (titrated) | medication cost + $15–$20 facilitation |
| 6 | Protocol complete / renew | — |

Catalog refill windows:

| Supply | Min days since last Rx | Max days |
|---|---|---|
| 1-month | 15 | 60 |
| 3-month | 60 | 120 |

**GLP-1 AutoRx is naturally gateable:** each shipment requires Aretide to call `POST {autorx_endpoint}`. Simply do not call it until payment succeeds. This is the only currently available hard gate for Beluga-integrated fulfillment.

### Payment gate modes (updated)

**`advisory`** — Default for standard programs.

System attempts payment; if it fails, staff is notified and must attempt Slack cancellation with Beluga. Refills/check-ins are blocked until billing is resolved, but pharmacy fulfillment may already have occurred.

**`manual_cancel_before_fulfillment`** — Operational mode for standard programs when the team wants to be explicit about the Slack process.

Same as `advisory` but the staff UI and notification copy are more prominent about the need to contact Beluga via Slack immediately. Staff dashboard shows elapsed time since `RX_WRITTEN` as a countdown.

**`disabled`** — No automated charge. Staff handles billing manually. Fulfillment proceeds.

**`strict`** — Only valid when `beluga_fulfillment_endpoint = "autorx"` or when Aretide has a direct pharmacy relationship. System must validate at rule creation that `strict` is only set on rules where Aretide controls fulfillment.

### Supply strategy

| Strategy | Behavior |
|---|---|
| `one_month_trial` | Select 30-day SKU for first fill. Limits unpaid exposure on standard programs. |
| `three_month_minimum` | Select 90-day SKU. Preferred for AutoRx (gateable). Fail loudly if no 90-day SKU matches. |
| `staff_configured` | SKU selected manually per patient. System blocks automation until staff acts. |

### MVP supply strategy recommendation

| Scenario | Recommended config |
|---|---|
| GLP-1 AutoRx — gateable via `autorx_endpoint` | `strict`, `three_month_minimum`. Hard gate is safe. |
| Standard programs — Beluga routes automatically | `advisory` or `manual_cancel_before_fulfillment`, `one_month_trial`. Limits unpaid exposure to smaller fill. |
| Own pharmacy (future) | `strict` regardless of supply duration. |

### Unpaid medication policy

When `MedicationCharge.status = "failed"`:

1. `PatientBillingStatus.status = "payment_due"`. Staff alerted for Slack cancellation if within window.
2. Patient notifications: day 0, day 3, day 7 via `queue_status_notification`.
3. Patient updates card → `POST /api/payments/retry-medication-charge/` → retry off-session charge.
4. **Blocked while `payment_due`:** refill requests, titration check-ins, AutoRx calls, subscription benefits. Enforced in service layer, not just API.
5. After `PAYMENT_ESCALATION_DAYS` (default: 14), set `status = "collections_referred"` and alert staff.
6. **Collections is never automatic.** Requires legal/compliance-approved policy and manual staff action.
7. Staff can manually reset to `current` after confirming resolution.

---

## Section 7 — Backend API Plan

### New Django app: `backend/apps/payments/`

### New endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/payments/visit-charge/` | `IsPatient` | Create `VisitCharge` + PaymentIntent with `setup_future_usage`; return `client_secret` |
| `POST` | `/api/payments/start-subscription/` | `IsPatient` | Create Stripe Subscription; return `client_secret` |
| `GET` | `/api/payments/subscription/me/` | `IsPatient` | Current `PatientSubscription` status |
| `POST` | `/api/payments/cancel-subscription/` | `IsPatient` | Cancel at period end |
| `POST` | `/api/payments/setup-payment-method/` | `IsPatient` | SetupIntent for card-update/retry flow only |
| `GET` | `/api/payments/payment-methods/` | `IsPatient` | List saved payment methods |
| `DELETE` | `/api/payments/payment-methods/{id}/` | `IsPatient` | Remove PM |
| `POST` | `/api/payments/retry-medication-charge/` | `IsPatient` | Retry failed `MedicationCharge` after card update |
| `GET` | `/api/payments/medication-charge/me/` | `IsPatient` | Current charge status |
| `GET` | `/api/payments/price-estimate/` | `IsPatient` | Estimated prices for their program path |
| `POST` | `/api/payments/stripe-webhook/` | `StripeWebhookPermission` | Stripe webhook receiver |
| `GET` | `/api/staff/pricing/visit-fees/` | `IsStaff` | List `VisitPricingConfig` |
| `PATCH` | `/api/staff/pricing/visit-fees/{id}/` | `IsStaff` | Update visit fee |
| `GET` | `/api/staff/pricing/rules/` | `IsStaff` | List `PricingRule` |
| `POST` | `/api/staff/pricing/rules/` | `IsStaff` | Create rule |
| `PATCH` | `/api/staff/pricing/rules/{id}/` | `IsStaff` | Update rule |
| `DELETE` | `/api/staff/pricing/rules/{id}/` | `IsStaff` | Deactivate rule |
| `GET` | `/api/staff/pricing/catalog/` | `IsStaff` | List `BelugaMedicationSku` |
| `PATCH` | `/api/staff/pricing/catalog/{id}/` | `IsStaff` | Toggle active; update notes |
| `GET` | `/api/staff/pricing/estimate/` | `IsStaff` | Preview patient price at current rules |
| `GET` | `/api/staff/pricing/quotes/` | `IsStaff` | Quote Inspector |
| `GET` | `/api/staff/pricing/quotes/{id}/` | `IsStaff` | Single quote detail |
| `GET` | `/api/staff/pricing/plans/` | `IsStaff` | List `SubscriptionPlan` |
| `PATCH` | `/api/staff/pricing/plans/{id}/` | `IsStaff` | Update plan |
| `GET` | `/api/staff/billing/patient-status/` | `IsStaff` | List patients with open billing issues |
| `PATCH` | `/api/staff/billing/patient-status/{user_id}/` | `IsStaff` | Resolve, comp, or escalate |
| `PATCH` | `/api/staff/billing/fulfillment-gates/{id}/` | `IsStaff` | Record Slack cancellation outcome |

### Security and PHI checklist

- `/api/payments/visit-charge/`: rate-limit 3/min per user; idempotency key; return existing if already created.
- `/api/payments/stripe-webhook/`: no auth token; Stripe signature only; log event type only.
- `/api/staff/pricing/*`: `IsStaff` + `pricing_admin` group for writes.
- Never log `stripe_payment_intent_id`, `stripe_customer_id`, or `stripe_subscription_id` in plaintext.
- Patient-facing serializers: never expose `vendor_*_cost_cents`, `service_fee_pct`, `service_fee_applied_cents`, or `legal_pricing_basis`.

### Validation

- `amount_cents`: positive int, 100–500000 range.
- `stripe_payment_method_id`: must match `^pm_[a-zA-Z0-9_]+$`.
- `service_fee_pct`: 0.00–90.00 (upper bound enforced; even if legal approves a fee, enforce a ceiling in code).
- `payment_gate_mode = "strict"` only valid when `sku.program_type == "autorx"` or when own-pharmacy flag set.
- Staff pricing fields: run through `apps/common/validation/` injection checks.

### Serializers

- `VisitChargeSerializer` (patient): `status`, `total_amount_cents`, `charged_at`, `failure_reason`. No `stripe_*` IDs.
- `MedicationChargeSerializer` (patient): `status`, `patient_price_cents`, `failure_message`, `retry_count`. No cost breakdown.
- `PricingRuleStaffSerializer`: all fields. `IsStaff` only.
- `BelugaMedicationSkuStaffSerializer`: all vendor costs. `IsStaff` only.
- `BelugaMedicationSkuPatientSerializer`: `display_name`, `category`, estimated `patient_price_cents` only.
- `FulfillmentGateStaffSerializer`: all fields including `rx_written_at`, Slack cancellation fields. `IsStaff` only.

---

## Section 8 — Frontend Plan

### New routes

| Route file | Path | Purpose |
|---|---|---|
| `src/routes/checkout.tsx` | `/checkout` | Visit fee payment + card save (Option B) or subscription start (Option A) |
| `src/routes/dashboard.payment.tsx` | `/dashboard/payment` | Card update, retry |
| `src/routes/dashboard.subscription.tsx` | `/dashboard/subscription` | Subscription status, cancel, renew |
| `src/routes/staff.pricing.tsx` | `/staff/pricing` | Staff pricing admin + Quote Inspector |

### Updated routes

- `src/routes/consent.tsx`: After consent, redirect to `/checkout` instead of `/dashboard`.
- `src/routes/dashboard.index.tsx`: Show `PaymentFailedBanner` when `medication_charge.status == "failed" | "requires_action"` or `subscription.status == "past_due"`.
- `src/routes/pricing.tsx`: Replace hardcoded prices with API data from `GET /api/payments/price-estimate/`. Static fallback while API is built.

### New components

- `src/components/payments/VisitCheckout.tsx`: Single Stripe Payment Element (`setup_future_usage`). Price breakdown with labels legal has approved.
- `src/components/payments/SubscriptionCheckout.tsx`: Stripe Payment Element for subscription. Shows what plan includes.
- `src/components/payments/PaymentFailedBanner.tsx`: Dashboard banner. Failure reason, CTA.
- `src/components/payments/UpdatePaymentMethod.tsx`: Stripe Element for card-update/retry.
- `src/components/payments/SubscriptionStatus.tsx`: Plan name, next billing date, cancel option.
- `src/components/staff/PricingAdmin.tsx`: All seven staff sections (visit fees, rules, subscription plans, catalog, audit log, Quote Inspector, billing status).
- `src/components/payments/MedicationPriceEstimate.tsx`: Pre-intake range display. Disclaimer: "only if prescribed."

### Type updates — `src/lib/types/mvp.ts`

```typescript
export interface VisitCharge {
  id: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  total_amount_cents: number;
  charged_at: string | null;
  failure_reason: string | null;
}

export interface MedicationCharge {
  id: string;
  status: "pending" | "requires_action" | "succeeded" | "failed" | "refunded";
  patient_price_cents: number;
  failure_message: string | null;
  retry_count: number;
}

export interface PatientSubscription {
  id: string;
  plan_name: string;
  status: "active" | "past_due" | "canceled" | "incomplete" | "trialing";
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface SavedPaymentMethod {
  id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  is_default: boolean;
}

export interface PriceEstimate {
  visit_fee_cents: number;
  visit_fee_label: string;
  subscription_amount_cents: number | null;
  subscription_label: string | null;
  medication_low_cents: number;
  medication_high_cents: number;
  medication_note: string;
}
```

### API client additions — `src/lib/api/client.ts`

- `createVisitCharge()` → `POST /api/payments/visit-charge/`
- `startSubscription(planSlug)` → `POST /api/payments/start-subscription/`
- `getSubscription()` → `GET /api/payments/subscription/me/`
- `cancelSubscription()` → `POST /api/payments/cancel-subscription/`
- `createSetupIntent()` → `POST /api/payments/setup-payment-method/` (card-update only)
- `getPaymentMethods()` → `GET /api/payments/payment-methods/`
- `retryMedicationCharge()` → `POST /api/payments/retry-medication-charge/`
- `getMedicationCharge()` → `GET /api/payments/medication-charge/me/`
- `getPriceEstimate()` → `GET /api/payments/price-estimate/`
- Staff: `getQuotes(filters)` → `GET /api/staff/pricing/quotes/`

### No PHI in frontend

- No `stripe_payment_intent_id`, `stripe_customer_id`, or `stripe_subscription_id` in the DOM.
- `card_last4` and `card_brand` shown only to the authenticated patient, never in logs.
- Stripe card input is always in a hosted iframe — no card data in React state.

---

## Section 9 — Testing Plan

### Unit tests — pricing formula

`backend/apps/payments/tests/test_pricing.py`:

- Percent-based fee (35%): correct `price_before_stripe` and `service_fee_applied` for three catalog items.
- Floor binding: when percent produces lower price than floor, `floor_was_binding = True` and floor price is used.
- Percent binding: when percent produces higher price, `floor_was_binding = False`.
- Stripe fee pass-through: adds correct amount.
- Rounding: `math.ceil()` on every fractional cent.
- Edge cases: `vendor_total = 0` raises; `service_fee_pct >= 1.0` raises; `service_fee_pct < 0` raises.
- `fee_type = pass_through_only`: service fee applied is zero regardless of pct/floor fields.

### Backend API tests

`backend/apps/payments/tests/test_payment_api.py`:

- `POST /api/payments/visit-charge/`: patient → 201; unauthenticated → 401; duplicate idempotency key → returns existing; Stripe error → 502 with safe message.
- `POST /api/payments/start-subscription/`: patient → 201; duplicate → 409.
- `POST /api/payments/retry-medication-charge/`: callable when `status == "failed"`; calling when `succeeded` → 409; retry count > 3 → 429.
- `GET /api/staff/pricing/rules/`: staff → 200; patient → 403.
- `PATCH /api/staff/pricing/rules/{id}/` with `payment_gate_mode = "strict"` on a standard program rule → 400.
- SQL injection in `notes` field → treated as literal text (parameterized ORM).

### Stripe webhook tests

`backend/apps/payments/tests/test_stripe_webhooks.py`:

- `payment_intent.succeeded` (visit) → `VisitCharge.status = "succeeded"`, `StripePaymentMethod` created.
- `payment_intent.succeeded` (medication, AutoRx) → `MedicationCharge = succeeded`, `FulfillmentGate = fulfillment_triggered`, `autorx_endpoint` called.
- `payment_intent.succeeded` (medication, standard) → `MedicationCharge = succeeded`, `FulfillmentGate = payment_succeeded`, no endpoint called (Beluga already routed).
- `payment_intent.payment_failed` → charge failed, `PatientBillingStatus = payment_due`, staff notification queued.
- `invoice.payment_failed` → `PatientSubscription.status = "past_due"`.
- `customer.subscription.deleted` → `PatientSubscription.status = "canceled"`.
- Invalid Stripe signature → 400.
- Duplicate `stripe_event_id` → idempotent.

### Beluga webhook tests

`backend/apps/integrations/tests/test_beluga_webhook_payments.py`:

- `RX_WRITTEN` → `FulfillmentGate(gate_mode="advisory", status="awaiting_payment")` created; no fulfillment endpoint called.
- `RX_WRITTEN` → `MedicationCharge(status="pending")` and `PriceQuote` created.
- `CONSULT_CONCLUDED` with `referred` → no `MedicationCharge`.
- `CONSULT_CANCELED` → no `MedicationCharge`.

### Advisory gate + Slack cancellation tests

- `RX_WRITTEN` → charge fails → `FulfillmentGate.status = "payment_failed"` → `PatientBillingStatus = payment_due` → staff notification includes `rx_written_at` timestamp.
- `PATCH /api/staff/billing/fulfillment-gates/{id}/` with `cancellation_confirmed` → `FulfillmentGate.status = "cancellation_confirmed"`.
- `PATCH` with `cancellation_too_late` → `FulfillmentGate.status = "cancellation_too_late"`.
- Patient retries → charge succeeds → `FulfillmentGate.status = "payment_succeeded"` → if AutoRx, `autorx_endpoint` called.

### Smoke test additions — `smoke_clinical_flow.py`

**Option B success path:**
1. Consent signed → visit charge PaymentIntent created (mocked) → `setup_future_usage` → card saved.
2. Beluga visit submitted after payment.
3. `RX_WRITTEN` → `FulfillmentGate(advisory)` created, `MedicationCharge` pending.
4. Mock `payment_intent.succeeded` (AutoRx) → `MedicationCharge = succeeded` → `autorx_endpoint` called.
5. Assert: `FulfillmentGate.status = "fulfillment_triggered"`, `PatientBillingStatus.status = "current"`.

**Advisory failure path:**
1. `RX_WRITTEN` → mock `payment_intent.payment_failed`.
2. Assert: `FulfillmentGate.status = "payment_failed"`, `PatientBillingStatus = payment_due`, no endpoint called.
3. Staff records Slack cancellation confirmed → `FulfillmentGate.status = "cancellation_confirmed"`.
4. Patient retries → mock success → `FulfillmentGate.status = "payment_succeeded"`.

---

## Section 10 — Open Questions & Risks

### Legal/compliance questions (required before any pricing implementation)

> **⚠ These questions require qualified healthcare counsel, not internal team discussion.**

**L1 — Clinical consultation fees:**
What may Aretide charge patients for a telehealth clinical consultation? Must the charge be a pure pass-through of Beluga's cost? May Aretide add a separately disclosed "platform service fee"? What must the disclosure say?

**L2 — Medication fees:**
May Aretide add a service fee on top of medication vendor cost, or must medication be a pass-through? If a service fee is permissible, how must it be structured and disclosed?

**L3 — Subscription model:**
Is a monthly membership/subscription the preferred compliance path for capturing Aretide's platform revenue? What must the subscription disclose as included vs. excluded? Which states have additional telehealth subscription regulations?

**L4 — No-prescription visit fee:**
If a patient completes and pays for the consultation but is not prescribed medication, is the visit fee refundable? What must the patient be told at intake about refund policy?

**L5 — Estimated pricing disclosures:**
What copy is required when showing estimated medication pricing to patients before they know whether they'll be prescribed? Is "only charged if prescribed" sufficient, or is additional state-specific language required?

**L6 — Collections:**
If medication is shipped and payment fails, what is the legal process for recovering the debt? Which states have restrictions on collecting unpaid medical-adjacent bills?

### Beluga operational questions

**B1 — Slack cancellation window (CRITICAL):**
What is the typical window between `RX_WRITTEN` and pharmacy fulfillment during which a Slack cancellation request is effective? Is this 30 minutes? 2 hours? 24 hours? The staff advisory process depends on knowing this.

**B2 — API cancellation endpoint:**
Is an API-based order cancel or hold/release endpoint on Beluga's roadmap? What is the timeline?

**B3 — Cancellation webhook:**
Is there a webhook event that indicates a Beluga order is no longer cancelable (pharmacy has started fulfillment)?

**B4 — Financial responsibility:**
If a Slack cancellation is requested but arrives too late and the pharmacy has already shipped, who bears the cost — Aretide or Beluga?

**B5 — Exact visitType strings and endpoint paths:**
Exact `visitType` values for GLP-1 initial (AutoRx), check-in, standard async, standard sync. Exact URL paths for all placeholder endpoint names in the documentation.

**B6 — Photo ID for weight loss:**
Is `patientVerified: true` + `verificationId` accepted, or is photo upload required?

**B7 — Catalog pricing changes:**
How frequently do catalog medication costs change? API/webhook, or email/Airtable notification?

**B8 — AutoRx month-3 check-in:**
Is there any additional fee for the month-3 check-in, or is it fully covered by the initial $55?

### Other known risks

**Advisory gate exposure:** If a medication charge fails and Beluga has already routed to pharmacy, Aretide bears the vendor cost. Mitigation: use `one_month_trial` supply strategy for standard programs to limit maximum exposure per incident; use `strict` mode (AutoRx endpoint control) wherever possible.

**3DS / requires_action rate:** Expect 5–10% of off-session charges to require customer authentication (SCA). Test `requires_action` handling before launch with Stripe's test cards.

**Dose change from estimate to final charge:** Provider may prescribe a different dose. If final charge is >20% higher than the estimate shown at intake, show a one-screen "confirm this charge" before processing.

**Stripe fee estimation:** `0.029 * price + 0.30` is an approximation (varies by card type, international cards). Build into service fee estimate for MVP; reconcile monthly.

**Volume tier transitions:** When Aretide crosses a Beluga volume tier, facilitation fee drops. Staff must update `vendor_facilitation_fee_cents` on catalog SKUs at tier crossing.

**PCI scope:** Stripe Elements (hosted iframes) → PCI SAQ-A. Do not introduce any server-side card data handling. Annual SAQ-A attestation required.

**HIPAA + Stripe BAA:** Must be signed before any real patient payment data is processed.

---

## Proposed Model Names Summary

| Model | App | Status | Purpose |
|---|---|---|---|
| `BelugaMedicationSku` | `questionnaires` (child of `Medication`) | New | Beluga medId, vendor costs, refill windows per dose/supply variant |
| `PricingRule` | `payments` | New | Service fee config, supply strategy, gate mode; editable by staff; requires legal_approval_ref |
| `VisitPricingConfig` | `payments` | New | Consult pass-through cost + permitted service fee by visit type |
| `SubscriptionPlan` | `payments` | New | Stripe Price + plan description; requires legal approval |
| `PatientSubscription` | `payments` | New | Per-patient Stripe subscription state |
| `StripeCustomer` | `payments` | New | User → `cus_` ID (encrypted) |
| `StripePaymentMethod` | `payments` | New | Saved `pm_` ID + card display fields |
| `VisitCharge` | `payments` | New | Consultation PaymentIntent record; split into pass-through + service fee |
| `MedicationCharge` | `payments` | New | Medication PaymentIntent record |
| `FulfillmentGate` | `payments` | New | Advisory fulfillment tracking; Slack cancellation audit trail |
| `PatientBillingStatus` | `payments` | New | Per-patient billing state; blocks refills/services when payment_due |
| `PriceQuote` | `payments` | New | Append-only pricing computation log with legal basis field |
| `StripeWebhookEvent` | `payments` | New | Idempotency dedup for Stripe events |
| `PricingAuditEvent` | `payments` | New | Staff pricing rule change log |
| `Medication` | `questionnaires` | Modified | `price_cents` deprecated (zero-fill; remove column later) |
| `PatientPrescription` | `prescriptions` | Modified | Add `beluga_sku` FK, `fulfillment_gate_status`, `quoted_patient_price_cents` |

---

## Acceptance Criteria by Phase

| Phase | Done when |
|---|---|
| 0 | Written legal guidance on permissible fee model and required disclosures. Written Beluga response on Slack cancellation window and API roadmap. |
| 1 | All migrations apply; all new models queryable; `Medication.price_cents` zero-filled; existing tests green. `PricingRule.fee_type = pass_through_only` is the default (no fee collected yet). |
| 2 | Patient pays visit charge (pass-through only until legal approves more); card saved via `setup_future_usage`; `PriceQuote` created; Beluga visit submitted post-payment; Stripe webhooks idempotent; `tsc --noEmit` clean. |
| 3 | Subscription flow functional end-to-end (if legal approves); subscription status gates refill access; failed subscription surfaced in dashboard; webhooks handled. |
| 4 | `RX_WRITTEN` → advisory `FulfillmentGate` created; charge attempted; on failure: staff dashboard shows `rx_written_at` timestamp and Slack prompt; staff can record cancellation outcome; refills blocked while `payment_due`; smoke tests pass both paths. |
| 5 | Staff can view and edit pricing config without code deploy; Quote Inspector shows correct cost breakdown with legal basis; `strict` mode rejected for standard program rules; audit log captures all changes; unauthorized access 403. |
| 6 | Patient-facing checkout compliant with legal-approved copy; price estimate accurate; subscription management page functional; payment retry works; Stripe Elements render in browser test. |
