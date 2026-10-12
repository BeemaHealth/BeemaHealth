# Build spec (orchestrator contract)

Every sub-agent builds against this file. It overrides `SCHEMA.md` and `PLAN.md` where they differ. Read `PLAN.md` and `SCHEMA.md` for background, then this file for exact names and rules.

Repo root: `/Users/mattaertker/Documents/Github/BeemaHealth`. New backend: `backend/` (Django 5, DRF, Python 3.12). Legacy code in `old_backend/` is reference only: never edit it, never import from it. You may read it to port logic.

## Hard rules

1. **No em dashes** (U+2014) anywhere: code, comments, copy, tests, docs. Use ` - ` or rephrase.
2. **No PHI in logs, exceptions, analytics, or error messages.** Log ids, never names, emails, answers, or message bodies.
3. **Never start, stop, or kill any server** (`runserver`, Docker, Vite, `npm run dev`). Run tests only with the command below.
4. **No git commits, no branch changes, no pushes.** Do not edit `CLAUDE.md`, `AGENTS.md`, or `.cursor/rules`.
5. **Do not create migrations.** The orchestrator runs `makemigrations` once after all apps exist. Do not edit files outside your owned paths. If you need a change in another app, write it in your final report under "Needs from others".
6. Money is **integer cents**. IDs are UUIDs via `apps.common.models.BaseModel` (fields `id`, `created_at`, `updated_at`; all models inherit it). Time zone aware datetimes only (`django.utils.timezone.now`).
7. **Every model must be registered in its app `admin.py`** with `list_display`, `search_fields`, `list_filter`, `readonly_fields` for ids and timestamps, and sensible inlines. Append-only or vendor-owned data (`AuditEvent`, `InboundEvent`, `OutboundCall`, `CareEvent`) is read-only in admin. PHI free-text fields display but audit-log views via `audit.log`. The owner must be able to see and edit everything in Django Admin.
8. Every model has a `__str__` that contains **no PHI** (use ids and non-identifying labels).
9. Write unit tests as you go in `apps/<app>/tests/test_*.py` (package with `__init__.py`). Cover happy path, edge cases, and failure modes. Security-relevant code (auth, permissions, webhooks, coupons, refunds) needs adversarial tests.
10. Code reads like the surrounding code: type hints on public functions, short docstrings, no dead code, no drive-by refactors.

## How to run tests

```bash
cd /Users/mattaertker/Documents/Github/BeemaHealth/backend
. /private/tmp/claude-501/-Users-mattaertker-Documents-Github-BeemaHealth/f1800c72-3cf5-4337-80ee-5c0f532dda57/scratchpad/venv/bin/activate
SECRET_KEY=x DATABASE_URL=sqlite:///:memory: DEBUG=true python manage.py test apps.<app> --settings=config.settings_test
```

Other agents are writing other apps at the same time. If `manage.py check` or your test run fails because **another app** is missing a model or has a syntax error, wait 60 seconds and retry (up to 5 times). Do not edit their files. Until the foundation app (`accounts`) exists you can still write code and run `python -m py_compile` on your files.

## App ownership and models

Foreign keys across apps use string references (`"accounts.User"`, `"patients.PatientProfile"`) and `settings.AUTH_USER_MODEL`. Create exactly these model names. Add fields freely inside your own app, but keep the names below and the fields cross-app code needs.

### `common` (orchestrator, done): `BaseModel`. Foundation agent adds `common/crypto.py` (Fernet `EncryptedTextField`, `EncryptedJSONField`, key from `settings.FIELD_ENCRYPTION_KEY`, raises on missing key when `DEBUG` is false), `common/exceptions.py`, `common/utils.py` as needed.

### `accounts` (agent: foundation)
- `User` (custom, `AUTH_USER_MODEL`, email is `USERNAME_FIELD`, case-insensitive unique): `email`, `first_name`, `last_name`, `phone` (E.164), `kind` (`patient|staff|system`), `is_active`, `is_staff`, `is_superuser`, `timezone`, `language`, `avatar_s3_key`, `email_verified_at`, `phone_verified_at`, `mfa_enabled`, `mfa_secret` (encrypted), `failed_login_count`, `locked_until`, `last_login_ip`, `password_changed_at`, `terms_accepted_at`, `terms_version`, `deactivated_at`. Manager with `create_user`, `create_superuser`.
- `Organization`: `kind` (`beema|network|pharmacy`), `name`, `slug`, `is_active`, `integration_adapter` (str key such as `beluga`, `lifefile`), `config` (JSON, non-secret only), `notes`.
- `Grant`: `user`, `organization`, `role` (`admin|clinician|support|customer_success|read_only`), `is_active`. Unique (user, organization, role).
- `StaffProfile`: one-to-one `user`, `display_title` (e.g. "Customer Success Manager"), `display_name`, `message_role` (`customer_success|support|admin`), `npi` (blank).
- `MagicLinkToken`: hashed token, `user`, `purpose` (`login|claim|email_verify`), `expires_at`, `used_at`, `requested_ip`.
- `apps/accounts/policy.py`: `has_grant(user, role=None, scope=None) -> bool`, `can_view_patient(user, patient_profile) -> bool`, `can_edit_patient(...)`. Superusers pass all checks. Patient users may only access their own profile.
- `apps/accounts/permissions.py` (DRF): `IsPatient`, `IsStaffUser`, `HasGrant` (configurable role and scope), `IsOwnerPatient`. Helper `get_patient_profile(user) -> PatientProfile` raising `PermissionDenied` if none.
- Auth API (`apps/accounts/urls.py`): email OTP or magic link login (`request-link`, `verify`), password login optional, `logout`, `me` (GET and PATCH basic fields), `csrf` bootstrap. Session cookies (HttpOnly). Throttle auth endpoints. Responses never reveal whether an email exists. Account lockout after repeated failures.
- Admin: `UserAdmin` with grants inline and staff profile inline.

### `patients` (agent: foundation)
- `PatientProfile`: one-to-one `user`, `date_of_birth`, `sex_at_birth`, `gender_identity`, `height_inches`, `starting_weight_lbs`, `goal_weight_lbs`, `preferred_pharmacy_note`, `affiliate_ref` (non PHI id), `acquisition` (JSON utm, non PHI), `ineligible_notes`.
- `Address`: `patient`, `kind` (`home|shipping|billing`), `line1`, `line2`, `city`, `state` (2 letters), `zip_code`, `is_default`, `validated_at`.
- `EmergencyContact`, `Allergy` (`name`, `reaction`, `severity`), `PatientMedication` (`name`, `dose`, `frequency`, `is_current`), `MedicalCondition` (`name`, `notes`, `diagnosed_on`), `IdentityDocument` (`s3_key`, `kind`, `status` `pending|verified|rejected`, `verified_by`, `verified_at`). Sensitive free text fields use `EncryptedTextField`.
- `ConsentRecord`: `patient`, `kind` (`terms|privacy|hipaa_notice|telehealth|weight_loss|glp1|truthfulness|pregnancy|gallbladder|no_cancel_after_submit|auto_renew`), `version`, `accepted_at`, `ip`, `user_agent_hash`. Immutable (admin read-only, model blocks update).
- `DataRequest`: `patient`, `kind` (`export|deletion`), `status` (`requested|in_review|completed|denied`), `reviewed_by`, `completed_at`, `notes`. Service `build_export(patient) -> dict` (JSON of everything about the patient: profile, addresses, allergies, medications, conditions, consents; other apps contribute through a registry `patients.export.register(callable)` that clinical, billing, messaging call at import time).
- API (`apps/patients/urls.py`): `GET/PATCH me/profile`, addresses CRUD, allergies, medications, conditions (all scoped to the logged in patient), `POST data-requests` (export or deletion), `GET data-requests`, `GET export` (returns the export dict, audit logged), identity document presign stub.

### `audit` (agent: foundation)
- `AuditEvent` (append only; no update or delete in model `save` and in admin): `actor` (nullable user), `actor_label`, `action` (`read|create|update|delete|login|logout|export|break_glass|webhook`), `object_type`, `object_id`, `patient_id` (nullable UUID for filtering), `reason`, `ip`, `metadata` (JSON, never PHI values), `created_at`.
- `apps/audit/services.py`: `log(request_or_none, action, obj=None, *, actor=None, reason="", metadata=None)`. DRF mixin `AuditedViewMixin` that logs reads and writes of PHI objects. Management command `audit_prune_check` that only reports.

### `catalog` (agent: catalog)
- `Product`: `slug`, `name`, `category` (`weight_loss|sexual_health|other`), `is_active`, `questionnaire_slug`, `routing_mode` (`network_routes|beema_routes`), `neutral_label` (Stripe-safe, no drug names), `requires_ineligibility_check`.
- `ProductVariant`: `product`, `drug` (`semaglutide|tirzepatide|...`), `additive` (`none|b12|glycine`), `phase` (`titration|maintenance`), `strength_mg` (decimal, nullable), `form`, `is_active`, `slug`.
- `VariantMapping`: `variant`, `organization`, `vendor_sku` (Beluga `medId`, LifeFile `lfProductID`), `notes`.
- `Plan`: `product`, `variant` (nullable), `slug`, `name`, `kind` (`standard|starter_pack|one_time`), `term_months` (1|3|6|12, null for one-time), `billing_commitment` (`renewing_monthly|prepaid_term|one_time`), `bill_interval_months`, `ship_interval_months`, `supply_days_per_shipment`, `allows_coupons`, `stackable_with_term_discount`, `is_active`, `renews_at_term_end_default`.
- `PlanPrice`: `plan`, `amount_cents`, `effective_from`, `effective_to` (nullable), `currency` (`usd`). Service `current_price(plan, at=None)`.
- `PlanPhase`: `plan`, `sequence`, `start_month`, `variant`, `dose_interval_days`.
- `PriceOverride`: `plan`, `patient` (nullable), `amount_cents`, `reason`, `expires_at`, `created_by`, `is_active`. Audited.
- `apps/catalog/loader.py` and management command `load_definitions`: loads `backend/definitions/catalog/*.yaml` (idempotent upserts by slug). Seed the weight-loss catalog from `src/lib/medication-pricing.ts` (semaglutide and tirzepatide prices, 1/3/6/12 month plans, tirzepatide starter pack $597 with phases 2.5mg, 5mg, 7.5mg) and variants for drug x additive (b12|glycine) x phase (titration|maintenance). Add inactive stubs for the other marketing products (check `src/lib/sexual-health-page.ts`).
- Service `availability`: `catalog.services.resolve_variant(drug, additive, phase) -> ProductVariant`.
- API: `GET products`, `GET products/<slug>/plans` (public, read only, cacheable).

### `questionnaires` (agent: questionnaires)
- `Questionnaire`: `slug`, `title`, `product_slug`, `is_active`.
- `QuestionnaireVersion`: `questionnaire`, `version_label`, `status` (`draft|published|archived`), `definition` (JSON, the full flow graph), `definition_hash`, `layout` (FK `Layout`, nullable), `published_at`. **Immutable once published** (model-level guard plus admin read-only). Publishing from `definitions/questionnaires/*.json` via `load_definitions`.
- `Layout`: `slug`, `name`, `config` (JSON: global shell, progress bar style, colors from design tokens, copy slots). Seed `definitions/layouts/default.json`. Per-questionnaire override keys allowed.
- `Submission`: `patient` (nullable until account creation step), `anonymous_token` (random, HttpOnly cookie, for pre-account steps), `version`, `status` (`in_progress|submitted|disqualified|abandoned`), `answers` (EncryptedJSONField), `current_node`, `path` (list of visited node ids), `outcome` (JSON), `selected_plan` (FK `catalog.Plan`, nullable), `started_at`, `account_created_at`, `submitted_at`, `utm` (JSON non PHI), `last_activity_at`.
- `SubmissionFile`: `submission`, `kind` (`id_photo|glp1_proof|other`), `s3_key`, `status`.
- `apps/questionnaires/engine.py` (pure, heavily unit tested): `next_node(definition, answers, current_node) -> node`, `validate_answer(node, value)`, `evaluate(definition, answers) -> Outcome` (`eligible`, `disqualified`, `disqualify_reason`, `flags`, `selected_variant_key`, `candidate_plan_slugs`). Node types: `radio`, `multi_select`, `text`, `textarea`, `number`, `date`, `empty_page` (content only), `auth` (account creation gate), `basics` (dob, gender, zip, phone), `bmi`, `safety_consent`, `zip_router`, `answer_router`, `allergies`, `add_medication`, `med_conditions`, `file_input`, `id_photo`, `checkout`, `no_proceed`, `thank_you`. Validation is server side against the pinned version only.
- Weight loss definition file `definitions/questionnaires/weight_loss.v1.json` (see "Weight loss flow" below).
- API: `POST start` (creates Submission, sets anonymous cookie), `GET current` (returns current node, visited path, progress, layout), `POST answer` (validate, advance, persist), `POST claim` (after account creation, attach Submission to the patient), `POST upload-url`. Rate limited. Anonymous endpoints never return stored answers back to unauthenticated callers beyond the current node's own previous answer.
- Interface offered to other apps: `questionnaires.services.get_submission_for_patient(...)`, `questionnaires.services.build_visit_payload(submission) -> dict` (neutral intermediate form that the Beluga mapper in `integrations` converts to `formObj`).

### `clinical` (agent: clinical-routing)
- `Treatment`: `patient`, `product`, `plan`, `variant`, `submission` (FK `questionnaires.Submission`), `status` (state machine below), `requested_dose_label`, `requested_strength_mg`, `prescribed_strength_mg` (nullable), `dose_changed_by_doctor` (bool), `titration_level`, `submitted_to_network_at` (nullable, set when the visit is POSTed to the network), `network` (FK `accounts.Organization`, nullable), `pharmacy` (FK `accounts.Organization`, nullable), `started_at`, `ended_at`, `end_reason`.
- `Visit`: `treatment`, `kind` (`initial|titration|refill|renewal`), `external_id` (Beluga `masterId`, not unique), `status`, `scheduled_at`, `video_location`, `outcome` (`prescribed|referred|canceled|none`), `submitted_at`, `concluded_at`, `doctor_name`.
- `Prescription`: `treatment`, `visit`, `external_rx_id`, `external_med_id`, `drug`, `strength`, `quantity`, `refills`, `prescriber_name`, `prescriber_npi` (nullable), `pharmacy_notes`, `written_at`, `expires_at`.
- `ActionItem`: `treatment` (nullable), `patient`, `kind` (`complete_visit|payment_failed|upload_id|upload_proof|book_visit|answer_followup|confirm_address`), `title`, `body`, `is_open`, `resolved_at`. Drives the portal "Required action" banner.
- `DrugIneligibility`: `patient`, `product`, `drug`, `reason`, `source_treatment`, `lifted_by`, `lifted_at`. A patient not prescribed is marked ineligible for that drug.
- `DoseLog`: `treatment`, `scheduled_at`, `taken_at` (nullable), `status` (`scheduled|taken|skipped`), `strength_mg`, `dose_number`, `injection_site`, `pain_0_5`, `notes`, `entered_by` (`patient|staff`). Service `generate_dose_schedule(treatment)` from the plan and prescription.
- `HealthMetric`: `patient`, `kind` (`weight|calories|exercise|side_effect`), `on_date`, `value`, `unit`, `notes`.
- State machine in `clinical/services.py`: `transition(treatment, new_status, *, actor=None, reason="")`. States: `questionnaire_in_progress, not_eligible, awaiting_payment, awaiting_visit_completion, routing_review, pending_visit, needs_patient_action, canceled, prescribed, referred, active, refill_due, paused, ended`. Reject invalid transitions with `InvalidTransition`. Every transition writes a `fulfillment.CareEvent` via `apps.fulfillment.services.record_event` (guarded import) and, when the new state needs patient attention, opens an `ActionItem`.
- Key services: `start_treatment_from_submission(submission)`, `mark_submitted_to_network(treatment, visit)`, `apply_visit_outcome(visit, outcome)` (referred or canceled => `DrugIneligibility` and billing refund via `billing.services.refund_not_prescribed`), `apply_prescription(visit, rx_data)` (sets `prescribed_strength_mg`; if different from requested, `dose_changed_by_doctor = True`, patient notified), `can_cancel(treatment) -> bool` (False once `submitted_to_network_at` is set).
- API: patient scoped `treatments` list and detail (Active and Pending tabs), `dose-logs` CRUD (patient can add, edit own, backfill overdue), `health-metrics`, `action-items`, `home` summary endpoint (quick actions, upcoming dates, treatment cards, health records), `treatments/<id>/cancel`.

### `routing` (agent: clinical-routing)
- `RoutingRule`: `name`, `priority`, `is_active`, `product` (nullable), `states_mode` (`all|only|except`), `states` (JSON list), `fill_type` (`initial|refill|any`), `term_months` (JSON list, empty = any), `network` (FK Organization), `pharmacy` (FK Organization, nullable), `dose_min_mg`, `dose_max_mg`, `orders_per_day_threshold`, `route_errors_only`, `refill_only`.
- `RoutingDecision`: `treatment`, `rule` (nullable), `result` (`routed|flagged`), `inputs` (JSON non PHI summary: state, product, strength, fill_type), `flag_reason`, `resolved_by`, `resolved_at`.
- `ReplacementRule`: `source_variant`, `source_pharmacy`, `target_variant`, `target_pharmacy`, `route_errors_only`, `refill_only`, `orders_per_day_threshold`.
- `routing/engine.py`: `route(treatment, fill_type="initial") -> RoutingDecision`. Most specific matching rule wins (state filter beats `all`, then lower `priority` number). No match or dose out of range => `flagged` and the treatment moves to `routing_review`. `is_available(state, variant) -> bool` is called by the questionnaire `zip_router` node so a patient never reaches checkout for a product with no route. `resolve_flag(decision, user, rule)` for staff. Staff queue is a filtered admin changelist plus an admin action to re-run routing.
- Routing mode lives on `Product.routing_mode`. `network_routes`: Beluga routes to its own pharmacy. `beema_routes`: after `RX_WRITTEN` we create a fulfillment `Order` for the pharmacy chosen by the rule (feature flag `BEEMA_PHARMACY_ROUTING_ENABLED`, default off).
- Seed rules in `definitions/catalog/routing.yaml`: one Beluga rule for the weight-loss product covering the states the product is sold in (read the state list from `src/lib/us-states.ts` and the legitscript doc; default all states except where the legacy docs list exclusions).

### `fulfillment` (agent: integrations-fulfillment)
- `Order`: `treatment`, `prescription` (nullable), `subscription` (nullable), `batch` (nullable FK `ShipmentBatch`), `pharmacy` (FK Organization), `external_order_id`, `status` (`pending|submitted|in_fulfillment|shipped|delivered|failed|canceled`), `fill_type`, `submitted_at`.
- `ShipmentBatch`: `subscription` (FK `billing.Subscription`), `sequence`, `due_on`, `supply_days`, `status` (`scheduled|released|shipped|skipped|refunded`), `order` (nullable). Service `create_batches(subscription)` (3 and 12 month prepaid: batches of 3 months each; monthly: one per renewal). Release a batch only when the treatment is `active` or `prescribed` and the prior visit rules allow it (a GLP-1 month-3 check-in must be complete before batch 2).
- `Shipment`: `order`, `carrier`, `tracking_number`, `tracking_url`, `status`, `shipped_at`, `delivered_on`.
- `CareEvent` (append only): `treatment` (nullable), `patient` (nullable), `source` (`beluga|lifefile|stripe|staff|system`), `event`, `payload_redacted` (JSON, no PHI), `occurred_at`. `record_event(...)` service.
- `fulfillment/pharmacy.py`: `PharmacyAdapter` ABC (`submit_order`, `cancel_order`, `handle_webhook`) and `LifeFileAdapter` (port field mapping from `old_backend/apps/pharmacy` and `docs/vendor/LIFEFILE_MEDIVERA_API.md` if present). Behind the feature flag. Include a `FakePharmacyAdapter` for tests.
- API: patient `orders` (track order), `shipments`, next shipment info, `request-refill` (cooldown rules from `src/lib/refill-cooldown.ts`).

### `billing` (agent: billing)
- `Subscription`: `patient`, `treatment` (nullable), `plan`, `status` (`active|pending_cancel|canceled|completed|past_due`), `commitment` (`renewing_monthly|prepaid_term`), `term_months`, `term_starts_on`, `term_ends_on`, `paid_through`, `next_bill_on` (null if fully prepaid), `next_ship_on`, `batches_total`, `batches_shipped`, `cancel_requested`, `cancel_effective_on`, `renews_at_term_end`, `stripe_customer_id`, `stripe_subscription_id` (blank for prepaid).
- `Invoice`: `patient`, `subscription` (nullable), `kind` (`subscription|one_time`), `status` (`draft|open|paid|failed|refunded|partially_refunded|void`), `subtotal_cents`, `discount_cents`, `credit_cents`, `total_cents`, `stripe_payment_intent_id`, `stripe_invoice_id`, `paid_at`.
- `InvoiceLine`: `invoice`, `description_internal`, `neutral_description`, `amount_cents`, `plan` (nullable), `product` (nullable).
- `Coupon`: `code` (case-insensitive unique), `kind` (`percent|fixed`), `value`, `stackable`, `stack_order`, `first_order_only`, `products` (M2M catalog.Product, empty = any), `eligible_term_months` (JSON, empty = any), `excludes_starter_pack`, `starts_at`, `ends_at`, `global_cap`, `per_patient_cap`, `patients` (M2M PatientProfile, empty = everyone), `is_active`, `affiliate` (FK nullable).
- `CouponRedemption`: `coupon`, `patient`, `invoice`, `amount_cents`. 
- `AffiliateLink`: `slug`, `name`, `coupon` (nullable), `payout_terms`, `is_active`. `AffiliateAttribution`: `affiliate`, `patient`, `first_touch_at`, `source`.
- `StoreCreditEntry` (ledger): `patient`, `delta_cents`, `reason`, `invoice` (nullable), `created_by`.
- `Refund`: `invoice`, `amount_cents`, `reason` (`not_prescribed|canceled_before_submission|doctor_stopped|unfillable|billing_error|goodwill|legal`), `approved_by` (nullable), `stripe_refund_id`, `status`.
- `VendorCost`: `treatment`, `order` (nullable), `vendor` (Organization), `kind` (`visit|drug|facilitation|shipping|other`), `amount_cents`, `incurred_at`, `invoice` (nullable, the patient invoice it offsets), `notes`. Admin shows margin per invoice and per patient.
- `PriceOverride` lives in `catalog`.
- `billing/pricing.py`: `quote(patient, plan, coupon_codes=(), use_store_credit=False, at=None) -> Quote` (dataclass, no DB writes): base price from `PlanPrice`, then `PriceOverride`, then coupons (percent before fixed within stack order, `stackable` rules, floor at zero, first-order-only, per-product, term eligibility, `excludes_starter_pack`, caps, patient allowlist), then store credit last. Rejected coupons return structured reasons. Raises nothing for invalid coupons, returns reasons.
- `billing/stripe_client.py`: thin wrapper over the `stripe` library with a `FakeStripeClient` for tests; `settings.STRIPE_SECRET_KEY` empty => fake client in tests only, error otherwise. Neutral descriptions and descriptor, no drug or condition in Stripe metadata (use `plan.product.neutral_label` and internal UUIDs).
- `billing/services.py`: `create_checkout(patient, plan, coupon_codes, ...)` (creates Invoice and PaymentIntent, stores consent records for `no_cancel_after_submit` and `auto_renew` passed in), `handle_payment_succeeded`, `handle_payment_failed` (opens `clinical.ActionItem` `payment_failed`), `start_subscription(invoice)`, `request_cancel(subscription, user)`, `set_auto_renew(subscription, enabled)`, `refund_not_prescribed(treatment)` (full refund, `VendorCost` stays), `refund_canceled_before_submission(treatment)`, `refund_unshipped_batches(subscription, reason)` (refund the unshipped share by batch), `run_renewals(today)` (management command `run_renewals`), `charge_one_time(patient, items, ...)`.
- **Cancellation rules (owner policy, implement exactly):**
  1. If `treatment.submitted_to_network_at` is null, the patient may cancel and receives a full refund.
  2. Once submitted to the doctor network the patient may not cancel and is not refunded (they accepted this in a consent recorded at checkout, `no_cancel_after_submit`).
  3. Monthly plan: cancel before the next renewal date stops all future charges, no refund for the month already paid once rule 2 applies.
  4. Prepaid 3, 6, 12 month plans: no cancel for refund after submission. A cancel request only sets `renews_at_term_end = false` (auto-renew off), remaining batches still ship in 3 month batches.
  5. Not prescribed (`referred` or canceled by the doctor before a prescription): full refund to the patient, `DrugIneligibility` created, Beema keeps the doctor `VendorCost`.
  6. Doctor stops the drug mid term or a batch cannot be filled: refund the unshipped batches.
  7. Auto-renew can be turned off by the patient at any time with one call.
- `billing/webhooks.py`: Stripe event handlers (`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`) called by `integrations` after verification.
- API: patient `quote` (coupon preview), `checkout`, `subscriptions`, `subscriptions/<id>/auto-renew`, `invoices`, `payment-methods` (list, set default via Stripe setup intent).

### `messaging` (agent: messaging)
- `Conversation`: `patient`, `kind` (`doctor|support`), `treatment` (nullable), `visit` (nullable, carries masterId), `state` (`awaiting_staff|awaiting_doctor|awaiting_patient|closed`), `assignee` (nullable user), `archived`, `last_message_at`, `unread_for_patient`, `unread_for_staff`.
- `Message`: `conversation`, `direction` (`in|out`), `sender_role` (`patient|doctor|customer_success|support|system`), `sender_user` (nullable), `sender_display_name`, `body` (EncryptedTextField), `is_media`, `delivery_status` (`queued|delivered|failed`), `attempts`, `last_error` (no PHI), `external_id`, `sent_at`.
- `Attachment`: `message`, `s3_key`, `mime`, `size`. `InternalNote`: `conversation`, `author`, `body` (encrypted).
- `NotificationDelivery`: `patient`, `channel` (`sms|email`), `template_key`, `status`, `provider_message_id`, `error`, `sent_at`. **Content free**: templates contain no names of drugs, conditions, or message content. Keys: `new_message`, `rx_written`, `shipped`, `delivered`, `payment_failed`, `action_required`, `visit_scheduled`, `refill_due`, `abandoned_checkout_1..7`.
- `AbandonedCheckout`: `submission` or `patient`, `email`, `started_at`, `reached_checkout_at`, `completed_at` (nullable), `emails_sent` (JSON list of step numbers), `stopped_at`. **Drip schedule (hours after abandonment): 1, 3, 24, 48, 72, 168, 336, then stop.** Service `due_abandoned_emails(now)` and management command `send_abandoned_checkout_emails`. Stops when the patient completes checkout or returns and finishes. Idempotent per step.
- `messaging/notifiers.py`: `Notifier` ABC; `ConsoleNotifier`, `TwilioSmsNotifier` (one way SMS, STOP honored, a `sms_opted_out` check on `patients` consent), `SesEmailNotifier`; choose by `settings.SMS_BACKEND` and `EMAIL_NOTIFY_BACKEND`. v0 has no patient notification preference screen (later). Always send both channels when a phone and email exist, except abandoned checkout which is email only.
- `messaging/services.py`: `send_patient_message(conversation, user, body, attachments=())` (saves queued, hands to the network adapter through `integrations.services.send_chat_to_network` guarded import), `receive_doctor_message(treatment_or_visit, body, external_id, doctor_name)` (idempotent by `external_id`), `receive_cs_message(...)`, `staff_reply(conversation, staff_user, body)`, `deliver_pending_messages()` (retry queue with backoff, then staff alert), `compute_state(conversation)`.
- Admin lanes (Active, Awaiting store reply, Awaiting doctor reply, Your inbox, Unassigned, Archived) as admin list filters; `MessageInline` on `Conversation`; admin actions: assign to me, archive, mark unread.
- API: patient `conversations` (one chat UI with doctor and support threads, messages labelled by `sender_role` as "Doctor", "Customer Success Manager", "Support"), `messages` list and send, `mark-read`, `attachments/upload-url`. Staff reply is through admin in v0 (service function plus an admin custom view with a reply box).

### `integrations` (agent: integrations-fulfillment)
- `InboundEvent`: `vendor` (`beluga|lifefile|stripe`), `dedupe_key` (unique), `event_type`, `external_ref` (masterId or orderId), `raw_payload` (JSON; PHI possible so admin shows it only to superusers), `status` (`received|processed|failed|dead|ignored`), `attempts`, `last_error`, `received_at`, `processed_at`.
- `OutboundCall`: `vendor`, `endpoint_name`, `treatment` (nullable), `request_summary` (redacted, no PHI), `status_code`, `ok`, `attempts`, `error`, `duration_ms`.
- `integrations/adapters/base.py`: `NetworkAdapter` ABC (`submit_visit`, `send_message`, `fetch_visit`, `parse_webhook`, `capabilities`). `integrations/adapters/beluga.py`: `BelugaAdapter` implementing Beluga's documented API (`docs/vendor/BELUGA_API.md`, `docs/vendor/Beluga Required fields for api.md`, `docs/features/beluga-integration.md`; port logic from `old_backend/apps/integrations` and `old_backend/apps/intakes`). Includes `mapper.py` (neutral payload to `formObj`, **rejects empty, null, undefined, and empty string values before sending**), endpoint paths from settings (`BELUGA_VISIT_PATH`, `BELUGA_CHAT_PATH`), Bearer auth, timeouts, 3 retries with backoff on 5xx, and a `FakeBelugaTransport` for tests. Never log request bodies.
- `integrations/webhooks.py`: `ingest(vendor, headers, raw_body) -> InboundEvent`: verify auth (Beluga: shared secret header compared with `hmac.compare_digest`, setting `BELUGA_WEBHOOK_SECRET`; Stripe: `stripe.Webhook.construct_event`), compute the dedupe key (sha256 of vendor, masterId or orderId, event name, canonical payload), insert-or-ignore, return fast. `process(event)` (idempotent) dispatches: `RX_WRITTEN` -> `clinical.services.apply_prescription`; `CONSULT_CONCLUDED` -> `apply_visit_outcome`; `CONSULT_CANCELED` -> outcome canceled; `DOCTOR_CHAT` -> `messaging.services.receive_doctor_message`; `CS_MESSAGE` -> `receive_cs_message`; booking events -> visit scheduling, ActionItem, notification; pharmacy, package, lab events -> `fulfillment` CareEvent, Order, Shipment updates and notifications. Unknown masterId or invalid transition => mark `failed`, never raise to the vendor. A `process_pending_events` management command with backoff and a `dead` state after N attempts. Admin actions: replay, mark ignored.
- `integrations/services.py`: `submit_visit_for_treatment(treatment)` (maps the submission, calls the adapter, stores `Visit.external_id`, calls `clinical.services.mark_submitted_to_network`), `send_chat_to_network(message)`, `reconcile_visits()` (management command `reconcile_visits` fetching `externalFetch/{masterId}` for open visits and repairing state).
- Views and urls: `POST /api/v1/webhooks/beluga/`, `POST /api/v1/webhooks/stripe/` (CSRF exempt, always 200 after persist, constant time compare, body size cap, no PHI logged).

## Cross-app call rules

- Import another app's **services only inside functions** (lazy) or guarded with try/except ImportError at the call site when that app may not exist yet. Models are referenced by string in FKs. Never import another app's views.
- Use these exact service names where listed above. If you need an additional cross-app function, add it in your own app and note it under "Needs from others".
- Patient scoped API views must use `get_patient_profile(request.user)` and filter every queryset by that patient. Add a test that patient A cannot read patient B's objects for every list or detail endpoint.

## Weight loss flow (from the Bask questionnaire builder; encode as `weight_loss.v1.json`)

Order of nodes (ids are snake_case; keep copy short and plain, no em dashes, no unsubstantiated claims):

1. `motivation` radio ("What's your motivation to lose weight?").
2. `weight_goal` radio ("What is your weight loss goal?").
3. `goal_closer` empty page ("Your goal is closer than you think").
4. `prior_programs` radio ("How many different weight loss programs have you tried?").
5. `family_history` radio ("Do you have family members who struggle with weight?").
6. `genetics` empty page ("Genetics play a role").
7. `sleep` radio ("How much sleep do you get?"), `sleep_note` empty page ("Sleep is not optional").
8. `login_nudge` empty page ("A gentle nudge: login is about to happen"), `auth` (account creation: email, then OTP or magic link, creates `User` and `PatientProfile`, then `claim` attaches the Submission).
9. `basics` (date of birth, sex at birth or gender, zip, phone). Age must be 18+ else `no_proceed`.
10. `glp1_history` radio ("Are you currently, or have you been in the past, on a GLP-1 medication?"). Branch:
    - **Current or past user**: `current_med` radio (semaglutide or tirzepatide; SVQ Sema / Tirz), `current_dose` radio (dose list per drug), `dose_preference` radio (stay same or go down; if down `dose_down_detail` textarea), `last_injection` radio (when was the last injection), `glp1_photo` radio (do you have a photo of your current medication; if yes later `glp1_proof` file input), `side_effects` radio (currently experiencing any; if yes `side_effects_detail` textarea), then `bmi_current` (minimum **20**).
    - **New user**: `bmi_new` (minimum **25**), computed from height and weight collected in the node.
    - Below the minimum BMI => `no_proceed` (disqualification page, mark `disqualified`, no PHI beyond the submission).
11. `bmi_consent` safety consent (acknowledges BMI based eligibility).
12. `drug_choice` radio ("Semaglutide or Tirzepatide?" with a short comparison).
13. `zip_router` (uses `routing.engine.is_available(state, variant)` for the chosen drug; unavailable => `no_proceed` with a clear "not available in your state yet" page and email capture, not a dead end at checkout).
14. `additive_choice` radio (B12 or Glycine), one per drug.
15. `phase_router` answer router: new user or dose increase => `titration`; current user staying at current dose => `maintenance`.
16. `checkout` node (per drug x additive x phase, 8 variants; each offers the plans from the catalog for that product). Checkout happens **before** the medical visit.
17. `medical_intro` empty page ("You must finish your medical questionnaire to the end for your prescription"), then:
    - `conditions` multi select (pancreatitis, thyroid cancer or MEN2 family history, gallbladder disease, kidney disease, diabetes type 1, eating disorder, etc.). Gallbladder selection triggers a `gallbladder_consent` safety consent; `conditions_detail` textarea.
    - `gastric_bypass` radio ("past 6 months?"); yes => `no_proceed`.
    - `allergy_confirm` multi select, `medications` multi select, `gender_router` (female => `pregnancy` radio plus `pregnancy_consent`; pregnant, breastfeeding, or planning => `no_proceed`).
    - `add_medication`, `allergies`, `med_conditions`.
    - Current user only: `glp1_proof` file input, then `id_verification` id photo (required for all, per Beluga).
    - `extra_notes` textarea, `glp1_consent`, `truthfulness_consent`, `weight_loss_consent`, `thank_you` (end).
18. Any `no_proceed` node ends the Submission as `disqualified` with a `reason`. Checkout and the medical questionnaire both end with Treatment states per `clinical`.

Flow control: the engine, not the client, decides the next node. The client can only submit the answer to the current node. Branches reference answer values by key, so copy edits do not break routing.

## Global layout and theme

`definitions/layouts/default.json` holds the shell shared by all questionnaires: progress style, header (logo slot), footer legal text slots, back button behavior, color tokens (reference names from `src/lib/design-tokens.ts`, never raw hex in questionnaire definitions), max width, and per-node-type overrides. A questionnaire version points at one layout; a node may override copy and icon only.

## Frontend (wave C)

React 19, TanStack Router file routes in `src/routes/`, Tailwind, shadcn/ui, tokens from `src/lib/design-tokens.ts`, tests with Vitest. Patient portal routes under `src/routes/portal*`; API client under `src/lib/api/portal/*` using `fetch` with `credentials: "include"` and the CSRF header. No PHI in `localStorage` or `sessionStorage`. No em dashes. Portal screens: Home, Chat, Treatments (Active and Pending), Shots (next doses, backfill overdue, history with weight, calories, exercise, notes), Account (Profile, Billing and Shipping, PHI with download and deletion request), Required-action banner, notification bell, avatar menu. Questionnaire runner renders any definition from the API using the layout config. Legacy routes (`/dashboard`, `/staff.dev`, `/qualify`, `/intake`) are not touched.

## Deliverable format for every agent

Final message (keep under 400 words): files created or changed, test command and result (counts), anything left undone, and "Needs from others". No code dumps.
