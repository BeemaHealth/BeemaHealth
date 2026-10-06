# Portal schema and flows (draft 1)

Companion to `PLAN.md`. Design only: no Django models yet. Review the flows first, then models get generated from the ERDs.

Reference screens: Bask patient portal (Home, Treatments, Shots, Account) and Bask admin Messages (lanes, assignees, notes, details panel).

## Beluga integration model (confirmed from `docs/vendor/BELUGA_API.md`)

Beluga needs **no clinician login on our side**. The contract is:

- Outbound: `POST` the visit (`formObj`), patient chat messages, customer-service messages. Bearer API key.
- Inbound webhooks: `RX_WRITTEN`, `CONSULT_CONCLUDED`, `CONSULT_CANCELED`, `DOCTOR_CHAT`, `CS_MESSAGE`, video booking events (`BOOKING_CREATED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`, `NO_SHOW`), pharmacy status, package tracking, lab status.
- Beluga's doctors work in Beluga's own tools. We only render their chat messages, prescriptions and statuses in our portal. Beluga also hosts and schedules the video visits and sends us the booking events.
- Their own "minimum integration requirements" list says the same: receiver endpoint with auth, outbound API client, questionnaire flow, SKU to `medId` catalog mapping.

Implications and gaps to resolve with Beluga (added to `QUESTIONS-DOCTOR-NETWORKS.md`):

- The webhook doc says "implement auth" but does not state the scheme (shared secret, HMAC, IP allowlist). No event id, retry policy, or ordering guarantee is documented. We must dedupe ourselves and reconcile with `GET /visit/externalFetch/{masterId}`.
- Beluga rejects empty, null or undefined fields. Our mapper must validate before sending.
- `RX_WRITTEN` gives `docName` but not prescriber NPI. See the `beema_routes` risk below.

## Critical review of the plan

1. **`beema_routes` may not be possible with Beluga.** Beluga writes the prescription and sends it to a pharmacy. Sending that order ourselves to LifeFile needs prescriber identity and a valid Rx, and `RX_WRITTEN` returns only `docName`, no NPI. The owner expects Beluga to give one NPI to hardcode. That is plausible but unconfirmed, and one risk remains: a prescription legally belongs to the individual physician who wrote it, so a pharmacy may reject an order whose NPI does not match that physician. A network-level NPI works only if Beluga says so in writing (Q17a, X8). Until then, `Prescription.prescriber_npi` is nullable and the Beema-pharmacy path stays off. Mode one (`network_routes`) is safe.
2. **Network and pharmacy scoped users are mostly moot in v0.** If Beluga's doctors never log in, `network:<id>` grants have no users. Keep the `Organization` table (it holds integration config and routing), but do not build network-user UI or flows. Individual-doctor onboarding is a different future mode and will need a clinician console. Do not design for it now.
3. **Three different "frequencies" are being conflated in the Bask UI.** "Ships every 6 months", "7.5 mg weekly", and "next payment Oct 7" are dose interval, shipment interval and billing interval. They must be separate fields on the plan, or the schema will break the first time a quarterly shipment meets a monthly payment.
4. **"Estimated medication levels" graph.** This is a pharmacokinetic estimate shown to patients. It is a medical-claim and LegitScript risk, and it needs clinical sign-off on the half-life model. Recommend cutting it from v0. Keep the dose log; the graph can come later with clinical and compliance review.
5. **"AI drafting" in the admin inbox.** Sending patient messages to an LLM is a PHI disclosure and needs a BAA with the model provider. Defer. Do not plan for it in v0.
6. **Shots page backfill and overdue doses are self-reported.** The patient says they took it. That is useful data but not clinical truth, so the dose log must distinguish `scheduled`, `taken` and `skipped`, and record who entered it. Do not drive prescription or refill logic from it without a clinician rule.
7. **Internal notes and assignee fields on threads are PHI too.** Notes need the same audit and access rules as messages.
8. **Margin tracking.** Beluga charges us fees per visit, per shipment and per facilitation (see the pricing tables in their doc). We collect from the patient through Stripe. Without a `VendorCost` ledger you cannot see margin per patient or per coupon. Include it from the start.
9. **Stripe and PHI.** Stripe receives product names and descriptions. Use neutral labels ("Beema Health membership") and a neutral statement descriptor. Never put drug or condition in Stripe metadata.
10. **Chat is bridged, not native.** A doctor reply arrives as a webhook, and our outbound message is a POST that can fail. Messages need a delivery state and a retry queue, or patients will see messages that the doctor never received.

## Flow 1: system overview

```mermaid
flowchart LR
  subgraph Public
    MK[Marketing site<br/>CTA with product key]
  end
  subgraph Beema["Beema backend (Django, AWS)"]
    Q[Questionnaire engine]
    R[Routing engine]
    B[Billing<br/>Stripe]
    M[Messaging]
    E[Inbound event pipeline]
    P[Patient portal API]
    S[Staff console]
  end
  subgraph Vendors
    BEL[Beluga<br/>doctor network]
    LF[LifeFile pharmacy]
    ST[Stripe]
    TW[Twilio SMS]
    SES[AWS SES]
  end
  MK --> Q --> R
  R -->|visit submit| BEL
  R -.->|beema_routes only| LF
  B <--> ST
  BEL -->|webhooks| E
  LF -->|webhooks| E
  ST -->|webhooks| E
  E --> P
  M <--> BEL
  M --> TW
  M --> SES
  P --- M
  S --- M
  S --- B
```

## Flow 2: new patient, questionnaire to prescription

```mermaid
flowchart TD
  A[Patient clicks CTA for a drug] --> B[Pinned questionnaire version loads]
  B --> C[Answers validated server side]
  C --> D[Frozen Submission]
  D --> E{Outcome function}
  E -->|contraindicated| X1[Not eligible: show result,<br/>no PHI stored beyond submission]
  E -->|eligible| F[Recommended dose and cadence]
  F --> G[Account created, magic link or OTP]
  G --> H[Checkout: Stripe, coupon applied]
  H -->|payment fails| H1[Retry or abandon,<br/>abandoned-checkout email]
  H -->|payment ok| I[Routing engine]
  I --> J{Rule match?<br/>state, product, dose range,<br/>fill type}
  J -->|no match| K[Flagged for staff review queue]
  J -->|match| L[Visit submitted to network adapter]
  K -->|staff resolves| L
  L --> M[Treatment status: pending visit]
  M --> N{Webhook outcome}
  N -->|CONSULT_CANCELED| O[Needs action banner,<br/>refund decision]
  N -->|RX_WRITTEN + CONCLUDED prescribed| P[Prescription stored]
  N -->|CONSULT_CONCLUDED referred| Q2[Not prescribed: refund and notify]
  P --> R2{Product routing mode}
  R2 -->|network_routes| S1[Network sends Rx to its pharmacy]
  R2 -->|beema_routes| S2[Order sent to Beema pharmacy via adapter]
  S1 --> T[Pharmacy and tracking webhooks]
  S2 --> T
  T --> U[Shipment timeline, SMS and email alerts]
```

## Flow 3: inbound webhook pipeline (every vendor)

```mermaid
sequenceDiagram
  participant V as Vendor
  participant API as Webhook endpoint
  participant DB as InboundEvent table
  participant W as Worker
  participant D as Domain state
  participant N as Notifier
  V->>API: POST event
  API->>API: Verify auth (secret or signature)
  API->>DB: Insert raw event with dedupe key
  alt duplicate key
    API-->>V: 200 (ignored)
  else new
    API-->>V: 200 (fast)
    DB->>W: Enqueue
    W->>D: Resolve masterId to Visit, apply transition
    alt unknown masterId or invalid transition
      W->>DB: Mark failed, dead-letter queue
    else ok
      W->>N: Fire alert (content free)
    end
  end
  Note over W,V: Nightly reconcile: fetch visit state<br/>from vendor and repair any missed events
```

The dedupe key is a hash of vendor, masterId, orderId, event name and payload because Beluga documents no event id.

## Flow 4: messaging (bridged to Beluga)

```mermaid
flowchart TD
  P1[Patient sends message in portal] --> S[Message saved: status queued]
  S --> Q{Conversation kind}
  Q -->|doctor| BEL[Adapter POST to Beluga chat endpoint<br/>with masterId]
  Q -->|support| INB[Staff inbox]
  BEL -->|ok| D1[status: delivered]
  BEL -->|error| RT[Retry queue, then staff alert]
  WH[DOCTOR_CHAT webhook] --> M2[Message saved, direction in]
  M2 --> AL[Alert patient:<br/>SMS and email, no content]
  INB --> R3[Staff replies in console]
  R3 --> AL
  CS[CS_MESSAGE webhook] --> INB
```

Admin inbox lanes (from the Bask screenshot) fall out of conversation state rather than separate tables:
Active, Awaiting store reply, Awaiting doctor reply, Your inbox, Unassigned, Archived.

## Flow 5: treatment lifecycle (state machine)

```mermaid
stateDiagram-v2
  [*] --> questionnaire_in_progress
  questionnaire_in_progress --> not_eligible
  questionnaire_in_progress --> awaiting_payment
  awaiting_payment --> routing_review: no rule match
  awaiting_payment --> pending_visit: routed
  routing_review --> pending_visit: staff resolves
  pending_visit --> needs_patient_action: more info or booking
  needs_patient_action --> pending_visit
  pending_visit --> canceled: CONSULT_CANCELED
  pending_visit --> prescribed: RX_WRITTEN
  pending_visit --> referred: CONSULT_CONCLUDED referred
  prescribed --> active: first shipment delivered
  active --> refill_due
  refill_due --> pending_visit: titration or renewal visit
  refill_due --> active: same-dose refill shipped
  active --> paused
  paused --> active
  active --> ended
  canceled --> [*]
  referred --> [*]
  not_eligible --> [*]
  ended --> [*]
```

"Pending" and "Active" tabs on the Treatments page map to these states. The portal "Required action" banner is any treatment in `needs_patient_action` or a failed payment.

## Flow 6: subscription, coupon and price resolution

```mermaid
flowchart TD
  A[Checkout for Plan] --> B[Base price from Plan price version]
  B --> C{Staff PriceOverride active?}
  C -->|yes| D[Override price wins]
  C -->|no| E[Base price]
  D --> F
  E --> F[Apply coupons]
  F --> G{Coupon valid?}
  G -->|expired, capped, wrong drug,<br/>not first order, not eligible patient| H[Reject with reason]
  G -->|ok| I[Apply in stack order,<br/>percent then fixed, floor at zero]
  I --> J[Store credit applied last]
  J --> K[Stripe charge or subscription]
  K --> L[VendorCost accrued for the order:<br/>visit fee, drug, facilitation]
  K -->|decline| M[Dunning: retry, then Required action in portal]
```

## ERDs (fields trimmed to what drives decisions)

All money fields are integer cents. All PHI tables are audit logged. Every table has `id` (UUID), `created_at`, `updated_at`.

### Identity and access

```mermaid
erDiagram
  USER ||--o| PATIENT_PROFILE : is
  USER ||--o{ GRANT : has
  ORGANIZATION ||--o{ GRANT : scopes
  USER ||--o{ AUDIT_EVENT : performs
  USER {
    string email
    string password_hash_or_passkey
    string kind "patient|staff"
    bool mfa_enabled
  }
  PATIENT_PROFILE {
    string first_name
    string last_name
    date dob
    string phone
    string sex_at_birth
    json shipping_address
    json billing_address
    string affiliate_ref "non PHI id"
  }
  ORGANIZATION {
    string kind "beema|network|pharmacy"
    string name
    json integration_config "secrets via KMS, not here"
  }
  GRANT {
    string role "admin|clinician|support|read_only"
  }
  AUDIT_EVENT {
    string action
    string object_type
    uuid object_id
    string reason
    string ip
  }
```

### Catalog and pricing

```mermaid
erDiagram
  PRODUCT ||--o{ PRODUCT_VARIANT : has
  PRODUCT ||--o{ PLAN : sold_as
  PLAN ||--o{ PLAN_PRICE : versioned
  PLAN ||--o{ PLAN_PHASE : dose_steps
  PLAN ||--o{ PRICE_OVERRIDE : may_have
  PRODUCT_VARIANT ||--o{ VARIANT_MAPPING : mapped_for
  ORGANIZATION ||--o{ VARIANT_MAPPING : vendor_ids
  PRODUCT {
    string slug "tirzepatide"
    string questionnaire_slug
    string routing_mode "network_routes|beema_routes"
  }
  PRODUCT_VARIANT {
    string drug
    string strength
    string form
  }
  PLAN {
    string name "Monthly, 3 months, 6 months, Annual, Starter pack"
    string kind "standard|starter_pack"
    int term_months "1|3|6|12"
    int bill_interval_months "term for prepaid, 1 for monthly"
    int ship_interval_months "ships on its own schedule"
    int supply_days_per_shipment
    bool allows_coupons "false for starter pack"
    bool stackable_with_term_discount
  }
  PLAN_PHASE {
    int sequence "1, 2, 3"
    int start_month
    uuid variant_id "dose for this phase"
    int dose_interval_days "7 for weekly"
  }
  PLAN_PRICE {
    int amount_cents
    date effective_from
  }
  PRICE_OVERRIDE {
    int amount_cents
    string reason
    date expires_at
    uuid created_by
  }
  VARIANT_MAPPING {
    string vendor_sku "Beluga medId, LifeFile lfProductID"
  }
```

### Questionnaire, routing and clinical flow

```mermaid
erDiagram
  QUESTIONNAIRE ||--o{ QUESTIONNAIRE_VERSION : versions
  QUESTIONNAIRE_VERSION ||--o{ SUBMISSION : answered_as
  SUBMISSION ||--|| CLINICAL_OUTCOME : yields
  PATIENT_PROFILE ||--o{ TREATMENT : has
  PRODUCT ||--o{ TREATMENT : of
  TREATMENT ||--o{ SUBMISSION : started_by
  TREATMENT ||--o{ ROUTING_DECISION : routed_by
  ROUTING_RULE ||--o{ ROUTING_DECISION : used
  TREATMENT ||--o{ VISIT : has
  VISIT ||--o{ PRESCRIPTION : issues
  ORGANIZATION ||--o{ VISIT : handled_by
  TREATMENT {
    string status "state machine"
    uuid plan_id
    uuid current_variant_id
    int titration_level
  }
  SUBMISSION {
    json answers_snapshot "frozen"
    string version_hash
  }
  CLINICAL_OUTCOME {
    bool eligible
    json flags
    uuid recommended_variant_id
    uuid recommended_plan_id
  }
  ROUTING_RULE {
    json filters "state, product, fill_type, cadence"
    uuid network_org_id
    uuid pharmacy_org_id
    int dose_min_mg
    int dose_max_mg
    int priority
  }
  ROUTING_DECISION {
    json inputs
    string result "routed|flagged"
    uuid resolved_by
  }
  VISIT {
    string external_id "Beluga masterId"
    string status
    string kind "initial|titration|refill|renewal"
    datetime scheduled_at
    string video_location
  }
  PRESCRIPTION {
    string external_rx_id
    string drug
    string strength
    int quantity
    int refills
    string prescriber_name
    string prescriber_npi "nullable, see risk 1"
    date expires_at
  }
```

Beluga `masterId` resolution (from the legacy integration): the initial consult and same-dose refills share one `masterId`, titration visits get a new one. So `Visit.external_id` is not unique per treatment, and inbound events resolve masterId to Visit to Treatment.

### Fulfillment, doses and health data

```mermaid
erDiagram
  PRESCRIPTION ||--o{ ORDER : fulfilled_by
  TREATMENT ||--o{ ORDER : has
  ORDER ||--o{ SHIPMENT : ships_as
  ORDER ||--o{ CARE_EVENT : timeline
  TREATMENT ||--o{ DOSE_LOG : tracks
  PATIENT_PROFILE ||--o{ HEALTH_METRIC : records
  PATIENT_PROFILE ||--o{ GOAL : sets
  PATIENT_PROFILE ||--o{ DOCUMENT : uploads
  ORDER {
    uuid pharmacy_org_id
    string external_order_id
    string status
    string fill_type "initial|refill"
  }
  SHIPMENT {
    string carrier
    string tracking
    string status
    date delivered_on
  }
  CARE_EVENT {
    string source "beluga|lifefile|stripe|staff"
    string event
    json payload_redacted
  }
  DOSE_LOG {
    datetime scheduled_at
    datetime taken_at "nullable"
    string status "scheduled|taken|skipped"
    string strength
    string injection_site
    int pain_0_5
    string notes
    string entered_by "patient|staff"
  }
  HEALTH_METRIC {
    string kind "weight|calories|exercise|side_effect"
    date on_date
    decimal value
    string unit
  }
  GOAL {
    string kind
    decimal target
  }
  DOCUMENT {
    string s3_key
    string kind "lab|id|photo"
  }
```

Weight, calories and exercise on the Shots page come from `HEALTH_METRIC` joined by date, not copied onto the dose.

### Billing and promotions

```mermaid
erDiagram
  PATIENT_PROFILE ||--o{ SUBSCRIPTION : has
  TREATMENT ||--o| SUBSCRIPTION : billed_by
  SUBSCRIPTION ||--o{ INVOICE : generates
  COUPON ||--o{ COUPON_REDEMPTION : redeemed
  INVOICE ||--o{ COUPON_REDEMPTION : applies
  INVOICE ||--o{ INVOICE_LINE : contains
  INVOICE ||--o{ REFUND : may_have
  AFFILIATE_LINK ||--o{ AFFILIATE_ATTRIBUTION : attributes
  PATIENT_PROFILE ||--o{ STORE_CREDIT_ENTRY : ledger
  ORDER ||--o{ VENDOR_COST : accrues
  SUBSCRIPTION {
    string stripe_subscription_id "null for prepaid terms billed once"
    string status "active|pending_cancel|canceled|completed|past_due"
    string commitment "renewing_monthly|prepaid_term"
    int term_months "1|3|6|12"
    date term_starts_on
    date term_ends_on
    date paid_through "last day already paid for"
    date next_bill_on "null once fully prepaid"
    date next_ship_on
    int batches_total "e.g. 4 for annual shipped quarterly"
    int batches_shipped
    bool cancel_requested
    date cancel_effective_on
    bool renews_at_term_end
  }
  INVOICE {
    string kind "subscription|one_time"
    int total_cents
    string stripe_invoice_id
    string status
  }
  INVOICE_LINE {
    string description_internal
    int amount_cents
    uuid plan_id "nullable for one-time items"
    uuid product_id
  }
  REFUND {
    int amount_cents
    string reason "not_prescribed|billing_error|goodwill|legal"
    uuid approved_by
  }
  COUPON {
    string code
    string kind "percent|fixed"
    int value
    bool stackable
    int stack_order
    bool first_order_only
    json product_ids
    json eligible_term_months "e.g. [3,6,12], null = any"
    bool excludes_starter_pack
    datetime starts_at
    datetime ends_at
    int global_cap
    int per_patient_cap
    json patient_allowlist "null = everyone"
  }
  AFFILIATE_LINK {
    string slug
    uuid coupon_id "optional"
    string payout_terms
  }
  STORE_CREDIT_ENTRY {
    int delta_cents "ledger, never a balance"
    string reason
  }
  VENDOR_COST {
    string vendor
    string kind "visit|drug|facilitation|shipping"
    int amount_cents
  }
```

### Messaging, notifications and events

```mermaid
erDiagram
  PATIENT_PROFILE ||--o{ CONVERSATION : has
  CONVERSATION ||--o{ MESSAGE : contains
  CONVERSATION ||--o{ INTERNAL_NOTE : annotated
  MESSAGE ||--o{ ATTACHMENT : has
  PATIENT_PROFILE ||--o{ NOTIFICATION_PREFERENCE : sets
  PATIENT_PROFILE ||--o{ NOTIFICATION_DELIVERY : receives
  CONVERSATION {
    string kind "doctor|support"
    uuid treatment_id "optional"
    uuid visit_id "optional, carries masterId"
    string state "awaiting_staff|awaiting_doctor|awaiting_patient|closed"
    uuid assignee_id
    bool archived
  }
  MESSAGE {
    string direction "in|out"
    string sender_role "patient|doctor|customer_success|support|system"
    uuid sender_user_id "null for doctor, doctor is external"
    string sender_display_name "e.g. Dr. name from docName, or staff first name"
    string body
    string delivery_status "queued|delivered|failed"
    int attempts
  }
  NOTIFICATION_PREFERENCE {
    string channel "sms|email"
    bool enabled
    datetime consented_at
    datetime opted_out_at
  }
  NOTIFICATION_DELIVERY {
    string channel
    string template_key "content free"
    string status
    string provider_message_id
  }
  INBOUND_EVENT {
    string vendor
    string dedupe_key
    json raw_payload
    string status "received|processed|failed|dead"
    int attempts
  }
```

`INBOUND_EVENT` and `OUTBOUND_CALL` have no foreign keys because they must survive unresolved events (an unknown masterId still needs to be stored and replayable).

## Open questions from this draft

1. **Where does the new code live?** Options: (a) new top-level directory (for example `portal/`) next to the legacy `backend/`, port in what we keep, delete legacy when we merge; (b) rewrite inside `backend/`. Recommendation: (a), so legacy stays readable as a reference and nothing half-migrated lingers in the apps list.
2. **One conversation per doctor or one per patient?** The draft has one per kind, and the patient sees a single Chat with doctor and support threads. Bask shows one chat. Confirm.
3. **Cut the medication-levels graph and AI drafting from v0?** Recommended above.
4. **Treatment cards show "Weekly" and "Ships every 6 months".** Confirm the plan fields in `PLAN` (dose, ship and bill intervals) cover every plan you sell. Send me the plan list from the marketing site if any plan breaks the three-interval model.
5. **Account page tabs (Profile, Billing and Shipping, PHI).** Confirm what "PHI" holds. I assume medical history, allergies, medications and ID documents.

## Decisions from review round 2

- Code lives in a new `backend/` (same layout as before). Legacy renamed to `old_backend/`.
- Dosing, shipping and billing are separate fields (see `PLAN`). Confirmed.
- Medication-levels graph and AI drafting are out of v0.
- Dose logging by the patient stays in v0 (the doctor uses it). Confirmed.
- A vendor-cost ledger is in v0, modeled on Bask: the patient pays Beema, vendor charges accrue as `VENDOR_COST`, and profit is the difference. Confirmed.
- Chat shows who is speaking with a role label: Doctor, Customer Success Manager, or Support (`MESSAGE.sender_role`). Doctor messages carry the doctor's name from Beluga's `docName`.
- Stripe product labels are neutral. A simple mapping from internal product to Stripe label.
- Account page "PHI" tab: **download my data** and **request deletion**, nothing else (see Bask screenshot). Deletion is a request that staff review, because HIPAA retention rules can require keeping records. Needs `DATA_REQUEST` (kind: export|deletion, status, reviewed_by, completed_at).

## Pricing facts found in the marketing site (`src/lib/medication-pricing.ts`)

These drove the plan model above. Verify before launch.

| Fact | Schema impact |
|------|---------------|
| Plans are 1, 3, 6, 12 month prepaid terms with a lower effective monthly rate. | `Plan.term_months` and `bill_interval_months` differ from `ship_interval_months`. A 12-month plan is one charge but many shipments. |
| Tirzepatide has a 3-month starter pack ($597) that steps through doses 2.5mg, 5mg, 7.5mg. | `PLAN_PHASE` holds the dose per month. Starter pack has `allows_coupons = false`. |
| Starter pack and multi-month discounts do not stack. | `stackable_with_term_discount` on the plan. |
| Promo code: one-time, once per patient, 3/6/12-month plans only, not 1-month, not starter. | `Coupon.per_patient_cap = 1`, `eligible_term_months = [3,6,12]`, `excludes_starter_pack = true`. |
| Prepaid terms mean refunds and cancellations mid-term need a rule. | Open: refund policy for unused months (Stripe proration or manual). Needs a business decision. |

New open question: **what happens to a prepaid 6 or 12 month patient who is not prescribed, cancels at month 2, or changes drug?** The schema can model any answer, but the refund rule must come from you and your compliance review.

## Billing model: subscriptions and one-time charges

Two kinds of money movement, both on `INVOICE`:

- **Subscription invoices**: the first and renewal charges for a plan.
  - 1 month: renews monthly until the patient cancels.
  - 3, 6 and 12 months: one prepaid charge up front. Shipments are delivered **three months at a time** (3 months = 1 batch, 6 months = 2 batches, 12 months = 4 batches). At term end the plan either renews (if the patient agreed to auto-renew at checkout) or completes.
- **One-time charges**: anything not tied to a term (a single add-on product, a dose-change fee, a reship fee, a manual staff charge). Same coupon engine, same `INVOICE` and `VENDOR_COST` ledger, but no `SUBSCRIPTION` row.

## Cancellation and refund rules (owner's policy, draft)

| Situation | Rule |
|-----------|------|
| Patient is **not prescribed** (visit ends `referred` or the patient is ineligible) | Beema pays the doctor fee. Patient is marked ineligible for that drug. Patient is refunded the charge (assumed, confirm). |
| **1-month plan**, cancels **before the next renewal** | Cancels with no further charge. No refund for the month already paid once the prescription has been sent and is being processed. |
| **3, 6 or 12-month plan** (already paid for all doses) | Cannot cancel for a refund. Shipments continue in 3-month batches until the term is used up. A cancel request only turns off renewal at term end. |
| Prescription **not yet sent** and patient cancels a paid month | Open question: refund or not? The rule above only covers "prescription sent and processing". |

```mermaid
flowchart TD
  A[Patient taps Cancel] --> B{Plan commitment}
  B -->|renewing monthly| C{Renewal already charged<br/>for this month?}
  C -->|no| D[Cancel now:<br/>no further charges]
  C -->|yes| E{Prescription sent<br/>to pharmacy?}
  E -->|yes| F[Cancel effective at renewal:<br/>no refund for this month]
  E -->|no| G[Staff review:<br/>refund decision]
  B -->|prepaid 3 / 6 / 12 months| H[Turn off renewal at term end only.<br/>Remaining batches still ship.<br/>No refund.]
  A2[Visit ends not prescribed] --> I[Mark patient ineligible for drug]
  I --> J[Refund patient<br/>Beema absorbs doctor fee as VendorCost]
```

Problems with this policy that need your attention (not blockers for the schema, which can model any rule):

1. **Disclosure.** "No cancellation after prepaying" must be shown clearly at checkout and in the terms, with the patient's explicit acknowledgment stored. Without that, card chargebacks will go against you.
2. **Auto-renewal laws.** Several states (California is the strictest) require clear disclosure of auto-renewal and an easy way to cancel renewal online. The portal needs a one-click "turn off renewal" for every plan, including prepaid ones. Check with your attorney.
3. **Doctor stops treatment mid-term.** If a clinician discontinues the drug for safety (side effect, new contraindication), you cannot ship remaining prepaid batches. Most states and card networks expect a refund of the unshipped portion. The schema has `REFUND.reason = legal` for this. Decide the rule.
4. **Shipments that cannot be filled** (state restriction, pharmacy out of stock): same question for unshipped batches.
5. **Prepaid terms and Beluga's schedule.** Beluga needs a titration or renewal visit at month 3 for GLP-1 (see their doc). If a 6-month patient fails the month-3 check-in, the second batch should not ship. That is the same "unshipped portion" refund question.
