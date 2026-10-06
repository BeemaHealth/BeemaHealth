# Beema Health patient portal and backend - build plan (branch `fuck-bask`)

Status: **planning. Docs are ready for owner review; backend scaffold exists in `backend/` with no models yet.** Do not merge to `main` until doctor-network and pharmacy routing are fully linked and tested.

Replaces Bask (intake, checkout, backend, Hive portal) with an in-house system. Supersedes the legacy `backend/` design (single network, in-house funnel). See `docs/BACKEND-DEFERRED.md` for what exists today.

## Decisions made

| Topic | Decision |
|-------|----------|
| Prescribing | Doctors always prescribe. Beema never prescribes. |
| Drug selection | Patient picks the drug, which selects that drug's questionnaire. Answers drive dose and cadence (monthly, quarterly, etc.) and are confirmed by the clinician. |
| Doctor networks | First: Beluga. Others later, so everything goes through an adapter interface. |
| Network integration | Webhooks and API only. No logins for network clinicians. |
| Pharmacy routing | Per-product mode: `network_routes` or `beema_routes`. Flip per product. |
| Payments | Stripe, owned by Beema (subscriptions, coupons, price overrides, refunds). |
| Hosting | AWS with a signed BAA. |
| SMS | Twilio, one-way alerts only, content-free. |
| Email | AWS SES, content-free alerts. |
| Migration | Schema must be able to hold Bask exports. No import tool in this phase. |
| Build approach | Fresh schema, port selectively from legacy (questionnaire engine, LifeFile adapter, Beluga webhook logic). |
| Billing | Subscriptions (1/3/6/12 month) plus one-time charges. Prepaid 3/6/12 terms ship in 3-month batches and cannot be canceled for a refund. 1-month plans cancel before renewal. Not-prescribed patients are refunded, Beema absorbs the doctor fee. Details in `SCHEMA.md`. |
| Catalog size | Existing products on the marketing site plus 5-10 more. Small, so config over UI. |

## Scope model (users, scopes, roles)

Permissions, not hardcoded roles. Every staff user has one or more **grants**: `(scope, role)`.

- Scope: `beema` (global), `network:<id>`, `pharmacy:<id>`.
- Role: `admin`, `clinician`, `support`, `read_only`.
- Patients are a separate identity type with access only to their own records.
- Individual doctors are modeled as a one-clinician network (no special code path).
- Every grant check is enforced server-side in one policy layer. Every PHI read and write is audit logged (who, what, when, why, from where).

Open: whether network and pharmacy staff get any UI in v0 (see Admin and staff tooling).

## Domain model (draft entities)

Identity and access: `User`, `PatientProfile`, `Organization` (network or pharmacy), `Grant`, `AuditEvent`.

Catalog: `Product` (the sellable thing), `ProductVariant` (drug, strength, form), `Plan` (cadence and price: monthly, quarterly, etc.), `Price` (versioned, with override history).

Clinical flow: `Questionnaire` + `QuestionnaireVersion` (immutable once published) + `Submission` (frozen snapshot of answers), `ClinicalOutcome` (eligible, contraindicated, dose recommendation, cadence), `Visit` (network review), `Prescription`.

Routing: `RoutingRule` (filters: state, product, first fill vs refill, cadence), `NetworkRoute`, `PharmacyRoute`, `ReplacementRule`, `RoutingDecision` (logged with the inputs that produced it, flagged for review when no match).

Fulfillment: `Order`, `Shipment`, `RefillRequest`, `DoseLog`, `CareEvent` (normalized timeline from vendor webhooks).

Billing: `Subscription`, `Invoice`, `PaymentMethod` (Stripe tokens only), `Coupon`, `CouponRedemption`, `AffiliateLink`, `AffiliateAttribution`, `StoreCredit`, `PriceOverride`.

Messaging: `Thread`, `Message`, `Attachment`, `NotificationPreference`, `NotificationDelivery`.

Events: `InboundEvent` (raw webhook, signature verified, idempotency key, processed status, retry), `OutboundCall` (adapter requests and responses, redacted).

Patient health data: `HealthRecord` (weight, calories, exercise, side effects), `Goal`, `Document` (labs, uploads, S3 with presigned URLs).

## Questionnaire to prescription flow

1. Marketing CTA carries a `product` key. Routing sends the patient into that drug's questionnaire (already how `resolveCta()` works conceptually).
2. Questionnaire runs against a pinned immutable version. Server validates every answer. A **global layout** (shell, progress, typography, spacing) wraps every questionnaire, with per-questionnaire overrides.
3. Submission is frozen. A deterministic **outcome function** maps answers to: eligible or not, recommended dose, cadence, and flags for clinician attention.
4. Routing engine picks the network (and pharmacy if the product is `beema_routes`) from rules. If dose is out of range or no route matches, the case is **flagged for staff review**, never silently dropped (this mirrors Bask's behavior, see `docs/bask/storefront/products/medication-routing.md`).
5. Adapter submits the visit to the network. Network webhooks drive status: reviewed, prescribed, denied, needs more info.
6. On prescription, either the network routes to its pharmacy, or Beema sends the order to its chosen pharmacy (LifeFile first). Pharmacy webhooks drive shipment state.

Rules that matter for HIPAA: outcome and routing logic runs server-side only. Nothing about drug, condition, or answers goes in a browser store, a log, or an ad pixel.

## Adapter interfaces

`NetworkAdapter`: `submit_visit`, `send_message`, `fetch_status`, `handle_webhook`, `capabilities()` (video visit support, messaging support, etc.).

`PharmacyAdapter`: `submit_order`, `cancel_order`, `handle_webhook`, `catalog()`.

Both go through one inbound pipeline: verify signature, persist raw event, dedupe by idempotency key, enqueue, apply to domain state, notify. Dead-letter queue and replay tooling are part of v0, not a later addition.

Beluga adapter: port from legacy `integrations` and `docs/features/beluga-integration.md`. LifeFile adapter: port from `backend/apps/pharmacy`.

## Pricing and promotions

- `Price` rows are versioned. Staff overrides are a separate audited table that wins over the base price, with reason and expiry.
- Coupons: percent or fixed, stackable flag and stack order, first-order only, per-drug limits, start and end dates, global and per-patient usage caps, patient allowlist or all patients.
- Affiliates: tracked links, attribution stored on the patient record (non-PHI identifier), payout reporting later.
- Store credit as a ledger, never a mutable balance.
- Everything is controllable by Beema staff only. All changes audited.

## Messaging and notifications

- Secure in-portal threads between patient and clinician (via network adapter webhooks and API) and between patient and Beema support.
- SMS (Twilio) and email (SES) are **content-free alerts** ("you have a new message, log in to read it"). No PHI, no drug names, no clinical content.
- Patient preferences and consent (TCPA, opt-out) stored per channel.
- One-way SMS only for v0.

## Patient portal (parity with the Bask screenshot, then simplify)

Nav: Home, Chat, Treatments, Shots (dose log), Shop, Labs, Goals.

Home: quick actions (track order, manage shipment, add or adjust dose, health records, upgrade plan, request refill), upcoming dates, treatment cards with payment-error and action-required states, health records.

v0 scope (decided): Home, Chat, Treatments, Shots (dose log), Account (profile, billing and shipping, PHI download and deletion request). Not in v0: Shop, Labs, Goals, "Suggested for you", medication-levels graph, AI drafting.

## Admin and staff tooling (decided)

Concern raised: an admin dashboard means edits there must stay consistent with questionnaires and routing.

Decision for v0 (owner approved):

1. **No questionnaire or routing builder UI.** Questionnaires, catalog, plans, routing rules, and coupon templates are **versioned definitions in the repo** (JSON or YAML, schema validated in CI), loaded by a publish command. Changing a questionnaire or route is a reviewed code change and creates a new immutable version. This removes the "admin edit drifts from the live questionnaire" problem entirely.
2. **Reuse the existing questionnaire engine** (field types, routing, validation) as the renderer. Skip the staff flowchart builder for now. Add a better layout and theme system and a global layout.
3. **Minimal staff console** for operations only: patient lookup and status edits, order and shipment view, message inbox, flagged-routing queue, dead-letter events, coupon creation and price overrides (audited), refund actions. Built with Django admin plus a few custom views, not a bespoke React admin.
4. **Defer** financial dashboards, analytics, notifications builder, affiliate dashboards, and store credit UI. Stripe Dashboard covers finance in the meantime.

Revisit a builder UI only once definitions-in-repo becomes a bottleneck.

## Compliance and security baseline

- AWS BAA, HIPAA-eligible services only. Encryption at rest (KMS) and in transit. Private networking for the DB.
- BAAs required: AWS, Twilio, Stripe (confirm), every network and pharmacy, any error-tracking and logging vendor.
- Field-level encryption for the highest-risk fields. Short-lived presigned URLs for documents.
- Audit log is append-only. Break-glass access is logged and reviewed.
- Patient auth: email OTP or magic link plus optional passkey. Session in HttpOnly cookies. No PHI or tokens in browser storage.
- Logging and analytics: allowlisted event names and fields only. Pixel and Conversions API events carry no health data.
- Retention and deletion policy, backups, restore drills, incident response runbook (use `docs/HIPAA.md` as the base).

## Phases

1. **Foundation**: repo layout, AWS and environments, auth, scopes and grants, audit log, inbound event pipeline.
2. **Catalog and questionnaires**: product, plan, price schema. Port and slim the questionnaire engine. Global layout. First drug questionnaire end to end.
3. **Routing and Beluga**: routing engine with flagged-review queue. Beluga adapter. Visit submit and webhook status.
4. **Pharmacy**: LifeFile adapter, `beema_routes` mode, replacement routing.
5. **Billing**: Stripe subscriptions, coupons, overrides, affiliates.
6. **Portal**: Home, Chat, Treatments, Shots, account.
7. **Messaging and notifications**: threads, Twilio, SES, preferences.
8. **Staff console and hardening**: ops views, pen test, load test, restore drill, cutover plan, Bask migration.

## Open questions (still need an owner or vendor answer)

1. Beluga: webhook reliability, authentication, prescriber NPI, pharmacy override. See `QUESTIONS-DOCTOR-NETWORKS.md`.
2. Bask: how prepaid terms, cancellations and refunds work today. See `QUESTIONS-BASK.md`.
3. Pharmacies: see `QUESTIONS-PHARMACIES.md`.
4. Refund rules when treatment stops mid-term or a batch cannot ship (see `SCHEMA.md`, billing section). Needs owner and attorney input.
5. Whether to show prepaid patients a one-click "turn off auto-renew" (recommended, likely legally required in some states).
6. Stripe: BAA status, and whether prepaid terms are one-time charges or Stripe Billing schedules.

Settled: stack is Django, hosting AWS, SMS Twilio one-way, email SES, code in `backend/`, legacy in `old_backend/`.
