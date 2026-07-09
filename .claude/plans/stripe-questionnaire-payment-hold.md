# Stripe Auth-Hold Payment Component in the Dynamic Questionnaire — Implementation Plan

> Companion to `.claude/plans/beluga-stripe-payment-pricing.md` (the "pricing plan"). That plan owns
> pricing rules, medication charges, fulfillment gating, and the staff pricing admin. **This plan owns**:
> the questionnaire-embedded card-collection component (auth hold), its A/B-testable placement, the
> patient-profile Payment tab, and the full error/testing surface for both.
>
> **⚠ Legal gate carries over.** Placing an authorization hold before a prescription (or before the
> patient even finishes qualifying) is patient-facing money movement. The hold amount, what it is
> called, when it is captured, and the disclosure copy shown next to the card form all require
> healthcare-counsel sign-off (Phase 0 of the pricing plan). Build everything below behind the
> feature flag; do not enable in production until legal approves amount + copy.

---

## 0 — Corrections to the existing pricing plan (apply these regardless)

| # | Pricing-plan statement | Correction |
|---|---|---|
| C1 | "Ensure Stripe HIPAA BAA is signed before go-live" (Section 5) | **Stripe does not sign HIPAA BAAs.** The compliant posture is the HIPAA payment-processing exception: a financial institution processing consumer payment transactions is not a business associate. That exception only protects you if **no PHI is ever sent to Stripe**: no medication names, doses, conditions, questionnaire slugs that reveal treatment (e.g. `intake-semaglutide`), or clinical status in `metadata`, `description`, `statement_descriptor`, Stripe Product/Price names, or Customer fields beyond name/email/address needed for payment. Use opaque UUIDs in metadata (`user_id`, `intake_id`). Statement descriptor: `BEEMA HEALTH` — never a treatment reference. |
| C2 | Uses `sk_` secret key | Use a **restricted API key (`rk_`)** with only: Customers (write), PaymentIntents (write), SetupIntents (write), PaymentMethods (write), Webhook Endpoints (read). Separate RAKs per environment; IP-allowlist the production key; pre-commit hook for `sk_`/`rk_` patterns. |
| C3 | `payment_method_types` not mentioned | **Never pass `payment_method_types`** on any PaymentIntent/SetupIntent. Omit it — Stripe's dynamic payment methods automatically excludes methods incompatible with `capture_method: "manual"`. Restrict methods (if ever needed) via Dashboard payment-method configurations, not code. |
| C4 | Visit fee = immediate charge with `setup_future_usage` | Superseded **for the questionnaire flow** by the auth hold in this plan (capture replaces the immediate charge). The pricing plan's medication off-session charge, webhooks table, decline-message table, and models all still apply. |

---

## 1 — Core payment design: auth hold with saved-card fallback

### The flow

```
Questionnaire step with payment field (position varies per A/B variant, always after account step)
  → POST /api/payments/payment-hold/            (idempotent per user+intake)
  → PaymentIntent: capture_method="manual", setup_future_usage="off_session",
                   customer=cus_…, amount=server-configured hold amount
  → Payment Element renders (hosted iframe, SAQ-A)
  → patient confirms (3DS if required)
  → PI status: requires_capture  →  webhook payment_intent.amount_capturable_updated
  → AuthorizationHold.status = "held"  →  step becomes valid, patient advances
  …patient finishes intake, provider reviews…
  → CAPTURE on approval/prescription:  stripe.PaymentIntent.capture(pi, amount_to_capture=…)
  → or CANCEL on disqualify/abandon:   stripe.PaymentIntent.cancel(pi)   (releases hold)
  → or EXPIRED (>7 days uncaptured):   create fresh off-session PI with the saved payment method
```

### Hard constraints you must design around (these are Stripe facts, not choices)

1. **Card auth holds expire in ~7 days** (some issuers/methods less). If provider review can exceed
   that, the hold is gone by capture time. Mitigation is built in: `setup_future_usage:
   "off_session"` on the same PaymentIntent saves the card, so an expired hold degrades to a normal
   off-session charge — exactly the pricing plan's medication-charge machinery. **The hold is an
   optimization, never the only path to payment.**
2. **You can capture at most the authorized amount, once** (remainder auto-released; partial capture
   OK). If the final amount exceeds the hold (dose change), you cannot capture more — cancel the
   hold (or capture it as partial payment only if legal approves) and create a new PI for the full
   amount with the saved PM, honoring the pricing plan's ">20% drift → confirm screen" rule.
3. **Uncaptured holds are patient-visible** as "pending" on their bank statement. Copy next to the
   card form must say a temporary hold (not a charge) is placed, the amount, and when it is captured
   or released. High cancel-without-capture rates also degrade issuer trust — keep the hold amount
   modest (visit fee, not estimated medication cost) and release promptly.
4. **The hold amount is decided server-side only** (from `VisitPricingConfig` /
   `PricingRule` in the pricing plan). The questionnaire field JSON never contains an amount and the
   client never sends one — a republished questionnaire must not be able to change what patients pay,
   and a tampered client must not either.

### Why auth hold (vs. SetupIntent-only) — and keep both

A `SetupIntent` ($0, save card only) has less friction and no 7-day clock, but doesn't verify funds
and feels less committal. Since the whole point is A/B experimentation, make the mode a component
config: `payment_mode: "auth_hold" | "setup_only"` on the plugin field's `options`. Same component,
same endpoints (SetupIntent branch skips capture entirely — medication/visit charged off-session
later). You can then A/B *placement* and *mode*. Ship `auth_hold` first if you only want one.

---

## 2 — Questionnaire integration

### Field type: reuse `plugin`

`QuestionnaireField.FieldType.PLUGIN` already exists with `plugin_id` (precedent:
`ACCOUNT_REGISTRATION_PLUGIN`, `intake_review`). **No enum migration.**

- `field_type = "plugin"`, `plugin_id = "stripe_payment_hold"`.
- `options` (staff-editable in builder): `{ "payment_mode": "auth_hold" }` plus display copy keys.
  No amounts.
- Register in `FieldRegistry.tsx` → renders `QuestionnairePaymentField.tsx`.
- Add to the builder's **Add question** modal; builder node shows a placeholder card
  ("Payment — auth hold") in staff/preview variants, never live Stripe in the builder.

### Publish-time validation (backend `questionnaires/services.py`, mirrors account-field rules)

- At most **one** payment field per version.
- Payment field's step must be **after** the step containing the `account` field in every
  reachable path (walk `routing_rules`; if any path reaches payment before account → publish 400).
  Rationale: PaymentIntents need a `StripeCustomer` tied to a `User`. (Pre-account guest customers
  + merge is possible but explicitly out of scope v1 — big fraud/orphan surface.)
- Payment field cannot be on a step with a `visibility_rule` that could skip it silently while the
  version is used in a paid flow — either it's on every path or the version is invalid. (If you
  want "payment only for some answers," model that as separate versions in the experiment.)
- `payment_mode` must be one of the two allowed values.

### Step gating & re-entry (frontend `IntakeDynamicFlow` / `QualifyDynamicFlow`)

- The step is **not advanceable** until the component reports a terminal-good state
  (`held` for auth_hold, `saved` for setup_only). Store `{"payment_status": "held"}` in
  `questionnaire_responses[field_key]` for routing/analytics — status only, no Stripe IDs in
  responses (they end up in immutable snapshots).
- **Back-navigation / refresh / resume:** on mount, `GET /api/payments/payment-hold/me/`. If a hold
  is already active → render the "card on file: Visa •••• 4242, hold placed" state with a
  "Use a different card" action (backend cancels old PI, creates new one). Never create a second
  concurrent hold — the create endpoint is idempotent (returns the existing active hold).
- **Version pinning:** patients finish on their pinned version (existing behavior). Because amounts
  are server-side, an old pinned version with a payment field keeps working when pricing changes.

### A/B testing (existing Experiment system — no new machinery)

- Variants = questionnaire versions with the payment step at different positions (or
  `setup_only` vs `auth_hold`, or no payment field as control). `ExperimentVariant.weight_percent`
  splits traffic; `experiment_id`/`variant_key` already land on `FunnelSession` and every
  `FunnelEvent`.
- Emit funnel events from the component: `payment_step_viewed`, `payment_element_loaded`,
  `payment_confirm_attempted`, `payment_hold_placed`, `payment_failed` (with decline *category*,
  never raw code), `payment_step_abandoned`. That gives per-variant conversion + drop-off.
- Guard: an experiment mixing versions **with and without** a payment field is valid (that's the
  point) but staff UI should badge which variants collect payment, so nobody ships a 50% "free"
  arm by accident.

---

## 3 — Data model (additions to the pricing plan's `payments` app)

Reuse from the pricing plan verbatim: `StripeCustomer`, `StripePaymentMethod`,
`StripeWebhookEvent`, `PatientBillingStatus`, `PriceQuote`. Add:

#### `AuthorizationHold` (`authorization_holds`)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user` | FK → User | |
| `intake` | FK → MedicalIntake, null | Or funnel session ref if hold occurs pre-intake |
| `questionnaire_version` | FK → QuestionnaireVersion, null | Attribution/audit |
| `experiment_id` / `variant_key` | nullable | Denormalized for analysis |
| `payment_mode` | CharField | `auth_hold`, `setup_only` |
| `stripe_payment_intent_id` | EncryptedCharField, null | auth_hold mode |
| `stripe_setup_intent_id` | EncryptedCharField, null | setup_only mode |
| `amount_cents` | IntegerField | Snapshot of server-configured hold amount (0 for setup_only) |
| `pricing_config_snapshot` | JSONField | Which config produced the amount |
| `status` | CharField | See state machine below |
| `status_reason` | CharField(128) | e.g. `issuer_declined`, `expired`, `patient_disqualified` |
| `captured_amount_cents` | IntegerField, null | |
| `held_at` / `captured_at` / `canceled_at` / `expires_at` | DateTimeField | `expires_at = held_at + 7 days` (conservative) |
| `idempotency_key` | CharField(64) unique | `hold-{user_id}-{intake_id}` |
| `created_at` / `updated_at` | | |

**State machine** (enforce transitions in one service function; illegal transition → log + staff alert, never silent):

```
created → processing → held → captured
                     ↘ requires_action → held | failed
        → failed (re-creatable)
held → canceled          (disqualified / abandoned / staff release / card change)
held → expired           (7-day clock; webhook or sweep) → fallback_charge_pending → captured_via_new_pi | failed
```

`PatientPrescription`/approval flow gains one call site: `capture_or_charge(user)` — captures the
hold if `held`, else falls back to off-session PI with the default saved PM (which is the pricing
plan's medication-charge path).

---

## 4 — Backend API

New endpoints (add to the pricing plan's `payments` app table):

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/payments/payment-hold/` | `IsPatient` | Idempotent create-or-return. Creates `StripeCustomer` if needed, creates manual-capture PI (or SetupIntent per version's `payment_mode` — **mode read from the pinned version server-side**, not from request body). Returns `client_secret`, `amount_cents`, `payment_mode`, display copy. Rate limit 5/min/user. |
| `GET` | `/api/payments/payment-hold/me/` | `IsPatient` | Current hold status + card display fields for re-entry UI. |
| `POST` | `/api/payments/payment-hold/change-card/` | `IsPatient` | Cancel active PI, create replacement, return new `client_secret`. Rate limit 3/min. |
| `POST` | `/api/payments/stripe-webhook/` | Stripe signature | As pricing plan; new events below. |

Request body of `payment-hold` create: **empty** (or just `{}`); everything — amount, mode, customer —
is derived server-side from the authenticated user's pinned version and pricing config. There is
nothing for the client to tamper with, and nothing needing new injection validators beyond DRF's
empty-body handling. (Any future client-supplied field goes through
`apps/common/validation/` + malicious-payload tests per house rules.)

### Stripe calls (Python SDK, latest; pin API version)

```python
stripe.PaymentIntent.create(
    amount=hold_amount_cents,            # server-derived
    currency="usd",
    customer=stripe_customer_id,
    capture_method="manual",
    setup_future_usage="off_session",    # card survives hold expiry
    statement_descriptor_suffix=None,    # account-level "BEEMA HEALTH"; no treatment words
    metadata={"user_id": str(user.id), "intake_id": str(intake.id),
              "hold_id": str(hold.id)},  # opaque IDs only — C1
    idempotency_key=hold.idempotency_key,
)
# NOTE: no payment_method_types (C3). No description. No PHI anywhere.
```

Capture: `stripe.PaymentIntent.capture(pi_id, amount_to_capture=final_cents, idempotency_key=f"cap-{hold.id}")`
where `final_cents <= amount_cents` (constraint 2 in §1; larger → cancel + new PI path).
Cancel: `stripe.PaymentIntent.cancel(pi_id, cancellation_reason="requested_by_customer" | "abandoned")`.

### Webhook events (adds to pricing plan's table)

| Event | Action |
|---|---|
| `payment_intent.amount_capturable_updated` | Auth succeeded → `AuthorizationHold.status = "held"`, set `held_at`/`expires_at`; persist PM to `StripePaymentMethod` (brand/last4/exp from the PI's payment method). This — not client-side confirm resolution — is the source of truth that unlocks the step server-side. |
| `payment_intent.canceled` | If `cancellation_reason == "expired"` (or hold past `expires_at`) → `expired` + enqueue fallback decision; else confirm our own cancel → `canceled`. |
| `charge.expired` | Belt-and-suspenders for auth expiry on the charge object → same as expired path. |
| `payment_intent.payment_failed` | `failed` + patient-safe message (pricing plan's decline table). |
| `charge.dispute.created` | Staff alert; freeze patient billing status pending review. |
| `charge.refunded`, `setup_intent.succeeded`, `payment_method.updated`, `customer.deleted` | As pricing plan. |

All handlers: verify signature (`stripe.Webhook.construct_event`), dedupe on `stripe_event_id`,
**tolerate out-of-order delivery** (e.g. `amount_capturable_updated` after our own capture → no-op,
guarded by the state machine), and never trust webhook-only data over a fresh
`PaymentIntent.retrieve` when making money-moving decisions (capture/cancel).

### Hold lifecycle jobs (management commands / scheduled)

1. **Orphan sweep** (hourly): cancel PIs in `held` whose intake was never submitted within
   `HOLD_ABANDON_HOURS` (default 48) → `canceled(status_reason="abandoned")`, notify patient
   ("we released the temporary hold").
2. **Expiry sweep** (hourly): holds past `expires_at` still `held` and not yet captured → mark
   `expired`, do **not** auto-charge (charging happens only at the approval call site).
3. **Disqualification hook**: when eligibility/intake marks the patient disqualified or the consult
   is canceled/referred → immediate cancel of any active hold. This must fire from the same code
   path that records disqualification, not a cron.
4. **Reconciliation** (daily): list Stripe PIs with our metadata vs. local `AuthorizationHold` rows;
   any PI with no local row or state mismatch → staff alert. Catches missed webhooks.

---

## 5 — Frontend component

`src/components/payments/QuestionnairePaymentField.tsx` (+ registered in `FieldRegistry.tsx`):

- Loads `@stripe/stripe-js` + `@stripe/react-stripe-js`; `loadStripe(VITE_STRIPE_PUBLISHABLE_KEY)`
  memoized at module scope. Publishable key via env, never hardcoded.
- On mount: `GET payment-hold/me/` → branch: fresh form | already-held summary | failed-retry.
- Fresh: `POST payment-hold/` → `<Elements options={{clientSecret}}>` → **Payment Element**
  (never Card Element), appearance themed from `design-tokens.ts` values.
- Confirm: `stripe.confirmPayment({ elements, redirect: "if_required" })`. Handle the 3DS modal
  in-place; only fall back to `return_url` for redirect-based methods (return route
  `/intake?payment_return=1` re-enters the same step and polls status).
- After confirm resolves, **poll `payment-hold/me/` until backend (webhook) says `held`** — do not
  unlock the step from the client-side confirm result alone (max ~15s poll, then show "verifying…"
  with the step still advancing blocked; webhook lag beyond that → allow advance only if a direct
  status endpoint check against the backend, which itself retrieves the PI, confirms
  `requires_capture`).
- Copy requirements on the form (legal-approved): amount, "temporary hold, not a charge," when it's
  captured, when it's released, link to payment terms.
- No Stripe IDs, no card data ever in React state/DOM/analytics; only brand + last4 from our API.

### Patient profile — Payment tab

New portal section on account settings using `AccountSectionCard` + a `SectionTone`:

- Route: `src/routes/dashboard.payment.tsx` (already in pricing plan) plus a tab entry in account
  settings navigation.
- Shows: saved card (brand, last4, exp, default badge), current hold status if any ("$X hold placed
  MMM D — released or captured when your provider completes review"), charge history
  (`VisitCharge`/`MedicationCharge` statuses from pricing plan).
- Actions: **Update card** → `POST setup-payment-method/` (SetupIntent) → Payment Element →
  new PM becomes default; backend detaches the old PM (`stripe.PaymentMethod.detach`) unless it
  backs an active uncaptured hold — in that case the new card takes over via the change-card flow.
  **Remove card** → blocked (409 + explanation) while an active hold or unpaid charge exists.
- Expired-card nudge: if default PM expires before next expected charge, banner + email.

---

## 6 — Error catalog (design for every one of these)

### A. Client-side / Payment Element

| Failure | Handling |
|---|---|
| Stripe.js fails to load (adblock, CSP, network) | Detect `loadStripe` rejection/timeout → non-Stripe fallback UI: "We can't load our secure payment form. Disable ad blockers or try another browser." Step stays blocked; emit `payment_element_load_failed` funnel event (A/B integrity!). |
| `payment-hold` POST fails (500/502/network) | Retry button with backoff; generic message; no auto-retry loop. |
| Card declined at confirm | Map decline category → pricing plan's patient-message table; form stays editable; count attempts. |
| ≥5 failed confirm attempts | Soft-lock the form 15 min (server-enforced via rate limit) — this endpoint is a **card-testing target**; also enable Stripe Radar rules. |
| 3DS challenge abandoned/failed | PI returns `requires_action`/failed → "Your bank needs to verify this card" + retry. |
| Patient closes tab mid-confirm | Re-entry flow (§2) resolves actual state from backend on return; orphan sweep covers never-returns. |
| Double-click / double-submit | Disable button during confirm; backend idempotency key makes duplicate creates safe. |
| Redirect-method return lands on stale session | Return route re-authenticates, reloads pinned version, polls hold status. |

### B. Server-side / Stripe API

| Failure | Handling |
|---|---|
| Stripe API down/timeout on create | 502 + safe message; idempotency key makes retry safe; circuit-breaker log after N consecutive failures → staff alert. |
| `CardError` on capture (rare but possible) | Fall through to saved-PM off-session charge; if that fails → pricing plan's payment-failed flow. |
| Capture on already-expired auth (`payment_intent` not capturable) | Catch `InvalidRequestError` → mark `expired` → fallback charge path. Never surface raw Stripe errors. |
| Capture amount > authorized | Guarded before the API call (constraint §1.2): route to cancel + new-PI + patient confirm screen. |
| Idempotency conflict (same key, different params) | Bug signal — 500, log (no PHI), staff alert. |
| Rate-limited by Stripe (429) | SDK auto-retries; surface as transient 502 if exhausted. |
| RAK missing a permission (403) | Startup healthcheck hits a harmless read with the key in non-prod; deploy-time failure, not patient-time. |

### C. Webhooks

| Failure | Handling |
|---|---|
| Invalid signature | 400, log event type only. |
| Duplicate event | Dedupe table → 200 no-op. |
| Out-of-order (e.g. canceled before capturable_updated) | State machine rejects illegal transition → no-op + warn log. |
| Missed webhook entirely | Daily reconciliation job (§4) + on-demand PI retrieve before any capture/cancel decision. |
| Handler raises mid-processing | Return non-2xx so Stripe retries; handlers must be idempotent. |

### D. Business/lifecycle

| Scenario | Handling |
|---|---|
| Patient disqualified after hold placed | Immediate cancel from disqualification code path; patient notification "hold released, nothing charged." |
| Patient abandons questionnaire | 48h orphan sweep cancels; notification. |
| Provider review exceeds 7 days | Hold expires → saved-PM off-session charge at approval; if `authentication_required` off-session → patient email + dashboard `requires_action` flow (pricing plan). |
| Final price > hold amount | >20% drift rule: confirm screen, then new PI. ≤ hold: partial capture, remainder auto-released. |
| Patient changes card mid-flow | change-card endpoint: cancel old PI → new PI; never two live holds (enforced by idempotency + state check). |
| Duplicate intakes / restarted funnel | Idempotency key scoped to user+intake; new intake with abandoned old hold → sweep or explicit cancel on new hold create. |
| Refund after capture | `charge.refunded` webhook path (pricing plan); staff-initiated only. |
| Dispute | `charge.dispute.created` → staff alert + billing freeze. |
| Stripe account under review / payouts paused | Ops runbook item; monitoring on `account.updated`. |

---

## 7 — Security / compliance checklist

- [ ] PCI **SAQ-A**: Payment Element hosted iframe only; card data never touches React state, our
      DOM, our servers, our logs. No `createToken`/`createPaymentMethod` legacy calls.
- [ ] **No PHI to Stripe** (C1): metadata = opaque UUIDs; no treatment words in descriptors,
      descriptions, product names, or customer notes. Add a unit test asserting the metadata
      builder rejects non-UUID values.
- [ ] RAK (`rk_`) with least privilege, per-env, IP-allowlisted in prod (C2); keys in env/secrets
      manager, never in repo; pre-commit scan for `sk_|rk_` live-key patterns.
- [ ] Webhook signature verification + event dedupe + Stripe IP allowlist at the edge.
- [ ] `stripe_*_id` fields encrypted at rest, never logged in plaintext (pricing plan rule).
- [ ] Amounts and payment_mode are server-derived only; client body carries nothing money-related.
- [ ] Rate limits: hold create 5/min/user, change-card 3/min, confirm-failure soft-lock; Radar on.
- [ ] Patient serializers expose only: status, amount_cents, brand, last4, exp, timestamps.
- [ ] Card-update SetupIntent requires fresh authentication (session, not remembered device).
- [ ] Funnel events carry decline **category** buckets, never raw decline codes or card metadata.

---

## 8 — Testing guide

### 8.1 Unit — backend (`backend/apps/payments/tests/`, mock the `stripe` module)

`test_payment_hold_api.py`
- create: patient → 201 with client_secret; unauthenticated → 401; second call → 200 returns same
  hold (idempotent); staff/provider role → 403; rate limit exceeded → 429.
- create derives amount from server config — assert a request body containing `amount` is ignored
  (or 400s).
- create with payment field absent from pinned version → 409 (can't hold without a payment step).
- change-card: cancels old PI (mock assert), creates new, old hold `canceled`.
- Stripe SDK raises `APIConnectionError` → 502, safe body, no stack/PHI in response.

`test_hold_state_machine.py`
- every legal transition; every illegal transition rejected + logged.
- capture when `held` → captured, `captured_amount_cents` set; capture > authorized → guarded,
  routed to new-PI path; capture when `expired` → fallback charge invoked.
- disqualify hook cancels active hold; cancel is a no-op (not error) when already captured/canceled.

`test_stripe_webhooks.py` (extend pricing plan's file; build events with real
`stripe.Webhook` signing against a test secret — don't bypass verification in tests)
- `amount_capturable_updated` → `held`, PM row created with brand/last4.
- `payment_intent.canceled` reason=expired → `expired`; our-own-cancel → `canceled`.
- duplicate event id → no-op; bad signature → 400; out-of-order canceled→capturable → rejected.

`test_hold_sweeps.py`
- orphan sweep cancels 49h-old unsubmitted hold, leaves 47h-old; expiry sweep marks past-`expires_at`;
  reconciliation flags a PI with no local row (mocked list).

`test_publish_validation.py` (`questionnaires` app)
- publish with two payment fields → 400; payment step reachable before account step on any routing
  path → 400; valid placement → publishes; `payment_mode` invalid → 400.

### 8.2 Unit — frontend (Vitest, mock `@stripe/react-stripe-js`)

`src/components/payments/__tests__/QuestionnairePaymentField.test.tsx`
- renders form on fresh mount; renders card-on-file summary when API says `held`; step invalid
  until status `held`; advance blocked on `failed`.
- `loadStripe` rejection → fallback UI + funnel event emitted.
- confirm success → polls status endpoint → unlocks only after backend `held`.
- decline → patient-safe message shown, raw code absent from DOM.
- double-submit → single POST (button disabled).
- payment step emits `payment_step_viewed` with experiment/variant when session has one.

House rules: run `npm run test:all`, `npx tsc --noEmit`, ESLint on changed files; no new free-text
user input here, but keep the malicious-payload suites green.

### 8.3 Integration — real Stripe test mode

Setup:
```bash
stripe login                       # test mode; or `stripe sandbox create`
stripe listen --forward-to localhost:8000/api/payments/stripe-webhook/
# put the printed whsec_… in backend env as STRIPE_WEBHOOK_SECRET
npm run dev & npm run dev:backend
```

Test cards (Payment Element, any future expiry / any CVC):

| Card | Behavior to verify |
|---|---|
| `4242 4242 4242 4242` | Auth succeeds → `requires_capture`; Dashboard shows uncaptured PI; DB `held`. |
| `4000 0025 0000 3155` | 3DS challenge in-element → complete → `held`; also test **abandoning** the modal → still blocked. |
| `4000 0000 0000 9995` | `insufficient_funds` decline → patient message, retry works. |
| `4000 0000 0000 0002` | Generic decline. |
| `4000 0000 0000 0069` / `0127` | Expired card / incorrect CVC messages. |
| `4100 0000 0000 0019` | Radar block → treated as decline, no crash. |
| `4000 0082 6000 3178` | Attaches/authorizes but **off-session charge fails** — the key card for testing the expired-hold fallback failure path. |

Manual-capture specifics to exercise against real test mode:
1. Place hold → capture full amount from a Django shell/management command → Dashboard shows
   captured; DB `captured`.
2. Place hold → **partial** capture (e.g. 60%) → verify remainder released.
3. Place hold → cancel → bank-side hold released; DB `canceled`.
4. Expiry can't be waited out: simulate by (a) `stripe trigger payment_intent.canceled` shaped
   events in unit tests, and (b) in test mode, cancel the PI then run the approval flow → assert
   fallback off-session charge path executes with the saved PM.
5. `stripe trigger payment_intent.amount_capturable_updated` etc. for webhook plumbing smoke.

### 8.4 End-to-end manual QA script (staging, feature flag on)

1. Staff: duplicate a qualify/intake version → add payment field mid-questionnaire (after account
   step) → attempt invalid placements (before account, two fields) → confirm publish blocked →
   publish valid version → create experiment: variant A payment-early, variant B payment-late,
   50/50.
2. Patient A (fresh incognito): enter via CTA → verify variant assignment logged → reach payment
   step → 4242 card → hold placed → refresh page → card-on-file state, no second PI in Dashboard →
   back-navigate and return → same → finish intake → approve as provider → capture fires → bank
   "pending" becomes charge.
3. Patient B: 3DS card; complete challenge; verify.
4. Patient C: decline card twice, then 4242 → succeeds; verify attempt counting.
5. Patient D: place hold → abandon → run orphan sweep → hold canceled in Dashboard.
6. Patient E: place hold → answer a disqualifying question → hold canceled immediately.
7. Patient F: place hold → cancel PI in Dashboard (simulating expiry) → approve → off-session
   fallback charge succeeds.
8. Portal: each patient sees correct Payment tab state (card, hold status, history); update card
   flow; remove-card blocked while hold active.
9. Analytics: per-variant funnel events present; decline codes absent from events.
10. Kill the `stripe listen` forwarder, place a hold, restart forwarder → Stripe redelivers →
    state converges (webhook resilience).

### 8.5 Smoke test addition (`smoke_clinical_flow.py`)

Insert hold lifecycle into the existing clinical smoke: consent → hold placed (mock) →
`amount_capturable_updated` applied → provider approval → capture called (mock assert) →
`RX_WRITTEN` continues into the pricing plan's medication-charge smoke path. Second scenario:
expired hold → fallback charge → success.

---

## 9 — Rollout

1. Build behind `VITE_DYNAMIC_QUESTIONNAIRES` + new `PAYMENTS_ENABLED` (frontend + backend) flags;
   `payment_mode` config additionally gated so the component renders a no-op placeholder if
   payments are off (a published version with a payment field must not brick the funnel).
2. Ship Payment tab + SetupIntent card management first (no money movement — lowest legal risk),
   then auth-hold component to staging, then legal sign-off on amount + copy, then production
   experiment at low traffic %.
3. Go-live checklist: Stripe go-live checklist, live RAK + IP allowlist, live webhook endpoint +
   secret, Radar rules on, statement descriptor verified, reconciliation job scheduled, dashboards
   for hold conversion + expiry rate + fallback-charge rate.

## 10 — Open questions (decide before build)

1. **Hold amount** — visit fee only (recommended: small, defensible, capturable ≤7 days) or larger?
   Legal question first, product second.
2. Capture trigger — provider approval, or `RX_WRITTEN`? (Approval recommended; it's the moment
   service is rendered and it's earlier, beating the 7-day clock more often.)
3. If patient is *not* prescribed after a captured visit fee — refund policy (pricing plan L4).
4. `setup_only` mode in v1, or auth-hold only?
5. Does the payment step live in qualify or intake questionnaires (or both)? Account field exists
   in qualify flows — placement after it is possible in either; analytics differ.
