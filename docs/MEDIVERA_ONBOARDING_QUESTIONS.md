# MediVera / LifeFile — 30-Minute Onboarding Call

Bring this doc to the call. Check items off and fill the notes table at the bottom.

**Context:** Aretide is DTC (Direct-to-consumer) telehealth. Patients intake on our site → separate physician network prescribes → we send approved Rx to MediVera/LifeFile for mail-order fulfillment. Patients only see Aretide.

**Already confirmed (email — do not re-ask):**
- MediVera = pharmacy fulfillment only; no clinician network
- White-label OK; MediVera does not interact with patients
- Order/refill/shipping updates via **webhooks**
- Testing happens through **API onboarding** (sandbox access expected Monday June 22nd after call
- **No minimum order volume**
- They will discuss physician network partners on the call

---

## 1. API access & sandbox (~5 min)

1. **Sandbox access**
   - Sandbox base URL and credentials (Basic Auth, `X-Vendor-ID`, `X-Location-ID`, `X-API-Network-ID`) — when do we receive them?
   - Confirm sandbox = test environment (orders without real fulfillment/shipping charges) and how we promote to production.

2. **Sample payloads**
   - One complete successful `POST /order` request + response JSON.
   - Sample Data Push webhook JSON for MVP events: processing, shipped (with tracking), on hold, cancelled, unable to fill.

---

## 2. Shipping codes (~3 min)

3. **Shipping code documentation**
   - Please share documentation for all valid `shipping.service` and `shipping.handlingService` integer codes (not just one default — we would like the full list, descriptions, and when to use each).

---

## 3. Product catalog & provider alignment (~8 min)

4. **What MediVera can fill**
   - Full formulary you can fulfill today and upcoming: **GLP-1, GLP-2, GLP-3** (and any new releases), with expected availability dates and **states** each is available in.
   - For each product: `lfProductID`, API `drugName`, strength, form, `scheduleCode`.

5. **Provider / formulary alignment**
   - Do you maintain a prescriber-facing formulary aligned with what your API accepts?
   - Do you integrate with physician networks (e.g. OpenLoop, CareValidate, SteadyMD)? If so, is the same product list used end-to-end?
   - We need the authoritative list our prescribing partners must use — not our planned patient-facing options.

---

## 4. Order payload gaps (~5 min)

6. **Patient gender**
   - Our UI collects male/female only (maps to LifeFile `f`/`m`). Should we add intersex/unknown options, and which LifeFile `gender` value for each?

7. **Clinical allergy codes**
   - We collect allergies as free text (name + reaction). Patients do **not** supply medical codes.
   - If `clinical[]` codes are required: which coding system, and can you provide a **code list** we map patient-reported allergies to (not patient-entered codes)?

8. **Billing / insurance**
   - Cash-pay orders: confirm we can omit insurance fields entirely and use `billing.payorType: "pat"`.
   - Insurance: we may support insurance on MVP, but billing is between the **prescribing provider network** and MediVera — confirm we do not need patient insurance fields in our order payload for cash-pay, and what fields apply if insurance is involved later.

9. **Prescriber minimum fields**
   - Confirm minimum required prescriber fields for a successful order (NPI, name, license, DEA if applicable, address, phone, etc.). Prescriber data comes from our physician network, not the patient.

10. **Onboarding constants**
    - What is `practice.id` — assigned to us during onboarding?
    - Any other required config values we should store (beyond vendor/location/network IDs and shipping codes)?

---

## 5. Webhooks — gaps only (~3 min)

Their docs cover Basic Auth, POST to our URL, return 200/500. Ask only what the docs do not spell out:

11. **Order matching (why we ask):** When a webhook arrives, we must link it to the correct internal order. Should we match on LifeFile `orderId`, our `referenceId` (`order.general.referenceId`), or both?

12. **Retry policy:** If we return HTTP 500, how many times and how often does LifeFile retry?

13. **MVP event subscription:** Which Rx/order events should we subscribe to at launch (confirm shipped + tracking is included)?

---

## 6. Pricing & business — Charlie review (~5 min)

_Section for Charlie. MediVera already confirmed no minimum volume._

14. **API & fulfillment pricing**
    - Per-prescription / per-fill fees for API orders?
    - Compounded vs FDA-approved pricing differences?
    - Any setup, monthly platform, or integration fees?

15. **Shipping costs**
    - How is shipping priced (flat rate, by service code, by zone)?
    - Cold-chain / injectable handling surcharges?

16. **Insurance / cash-pay**
    - How does insurance billing work on your side vs cash-pay?
    - Any pricing impact for us if patients pay through insurance vs out of pocket?

17. **Volume & SLA (pricing context)**
    - Any volume tiers or pricing changes as we scale?
    - Typical **processing and shipping timelines** once an order is submitted.

---

## 7. Partnerships — discussion, not a formal question (~2 min)

Ensure on the call they walk through **physician network partners** they commonly work with (they said they would discuss this). No need to ask from scratch unless they skip it.

---

## Notes from call

| Topic | Answer | Owner | Follow-up |
|-------|--------|-------|-----------|
| Sandbox URL + credentials + ETA | | | |
| Vendor / Location / Network IDs | | | |
| Shipping code documentation | | | |
| Full formulary (GLP-1/2/3, states, lfProductID) | | | |
| Provider formulary / partner alignment | | | |
| Allergy code list (if required) | | | |
| Cash-pay / insurance payload rules | | | |
| Min prescriber fields | | | |
| practice.id + config constants | | | |
| Webhook match field (orderId vs referenceId) | | | |
| Webhook retry policy | | | |
| Pricing (API, fill, shipping) | Charlie | | |
| Processing / shipping SLA | | | |
| Physician partners discussed | | | |
