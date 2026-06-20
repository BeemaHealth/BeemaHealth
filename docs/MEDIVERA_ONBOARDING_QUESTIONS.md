# MediVera / LifeFile — Onboarding Call Questions

Use this checklist on your Monday call with MediVera. Check off answers as you go and paste responses below each question.

**Context:** Aretide is a direct-to-consumer (DTC) telehealth weight-loss platform. Patients complete intake on our site; a separate physician network reviews and prescribes; we send approved prescriptions to MediVera/LifeFile for mail-order fulfillment. Patients only see the Aretide brand.

**Reference:** LifeFile API docs (POST `/order`, Data Push webhooks, Basic Auth + `X-Vendor-ID` / `X-Location-ID` / `X-API-Network-ID` headers).

---

## API access and sandbox testing

1. **Sandbox credentials and timeline**
   - What is the sandbox/test API base URL?
   - What credentials will we receive for the sandbox (Basic Auth username/password, Vendor ID, Location ID, API Network ID) and when?
   - I am assuming sandbox is a separate environment from production, and how do we promote to production?

2. **Test orders**
   - Is there a test mode that creates orders without real fulfillment or shipping charges?
   - Can you provide a complete sample **successful** `POST /order` JSON request and response?

3. **Sample webhook payloads**
   - Can you provide complete sample **Data Push webhook** payloads (JSON preferred) for each event we should handle in MVP?
     - Order received / processing
     - Shipped (with tracking number and carrier)
     - On hold
     - Cancelled
     - Out of stock / unable to fill

4. **Mock testing before sandbox**
   - Before we have sandbox access, can you confirm our planned local approach: mock LifeFile server in tests + webhook receiver that logs raw payloads and returns 200?
   - Once sandbox is live, what is the recommended first test order workflow?

---

## Shipping configuration (not patient address)

5. **`shipping.service` integer code**
   - What is the exact integer value for `shipping.service` for standard home delivery of GLP-1 injectables to patients?
   - Are there alternate codes for expedited or overnight shipping we should know about?

6. **`shipping.handlingService` integer code**
   - What is the exact integer value for `shipping.handlingService` for cold-chain / refrigerated injectable handling?
   - Are there different handling codes by product or season?

7. **Ship-to patient only**
   - For MVP we always use `recipientType: patient` and ship to the patient's home address. Is that correct for all GLP-1 orders you fulfill?

---

## Product catalog and prescribing alignment

8. **Full medication catalog**
   - What medications can MediVera currently fulfill (FDA-approved and compounded GLP-1s)?
   - Please share the full list with, for each product:
     - Display name
     - `lfProductID`
     - `drugName` / strength / form as used in the API
     - `scheduleCode`
     - Cash-pay vs insurance eligibility

9. **Limited formulary for doctors**
   - We plan to offer a small set of treatment options (e.g. Zepbound, Wegovy, compounded semaglutide). Can you confirm which of these you can fulfill?
   - We need doctors to prescribe **only** products on your formulary — can you provide the authoritative list we should give our physician network?

10. **Upcoming GLP-1 products**
    - You mentioned a list of upcoming compounded GLP-1 offerings once legally permitted — can we receive that list and expected availability dates?

---

## Patient demographics and clinical data

11. **Sex / gender in the UI**
    - Our intake UI currently requires patients to select male or female for both sex assigned at birth and gender identity (we map female→`f`, male→`m` for LifeFile `patient.gender`).
    - Should we allow patients to select **intersex** and/or **unknown** for sex assigned at birth, gender identity, or both?
    - If yes, which LifeFile `patient.gender` value should we send for each?

12. **Clinical allergy / condition codes**
    - Our intake collects patient-reported allergies as free text (allergy name + reaction), not medical codes (RxNorm, ICD-10, etc.).
    - For the `clinical[]` array on orders, is a **code** required for allergies, conditions, and current medications?
    - If codes are required, which coding system do you expect, and can we use a placeholder (e.g. `PATIENT_REPORTED`) when the patient did not supply a code?
    - If only `description` is required, is our free-text allergy list acceptable for compounded GLP-1 orders?

---

## Billing and insurance

13. **Payor type for cash-pay patients**
    - For direct-to-consumer orders where the **patient pays** (cash-pay through our platform, not the clinic), is `billing.payorType: "pat"` always correct?
    - When would `billing.payorType: "doc"` apply in a telehealth model?

14. **Insurance fields**
    - Do you need insurance provider / member ID in the order payload for cash-pay orders, or can we omit insurance fields entirely when the patient is paying out of pocket?
    - If we support insurance billing later, what fields are required?

---

## Prescription and prescriber requirements

15. **Prescription PDF (`order.document.pdfBase64`)**
    - Is a base64-encoded prescription PDF required for compounded semaglutide / tirzepatide, or only for controlled substances?

16. **Rx UUID**
    - Is `rxs[].uuid` (UUID v4) required for all new prescriptions?

17. **Schedule codes**
    - What are the valid `rxs[].scheduleCode` values for each GLP-1 product you fulfill?

18. **Practice ID**
    - What is `practice.id` in the order payload — is it assigned to us during onboarding?

19. **Prescriber fields**
    - Confirm the minimum required prescriber fields for a successful order (NPI, name, license state/number, DEA, address, phone, etc.).
    - Will prescriber data come from our physician network (not stored on the patient record)?

---

## Webhooks (Data Push Service)

20. **Event subscription**
    - Which Rx events and order status changes should we subscribe to for MVP?

21. **Webhook authentication**
    - Data Push uses Basic Auth with credentials we provide — confirm the scheme and header format.

22. **Order matching**
    - How should we match inbound webhooks to our internal orders — LifeFile `orderId`, our `referenceId` in `order.general.referenceId`, or both?

23. **Retry policy**
    - If our endpoint returns HTTP 500, how many times and how often does LifeFile retry?

24. **Webhook testing in development**
    - Can you send a test Data Push payload to a staging URL during onboarding?
    - Do you support registering a temporary URL (e.g. ngrok) for initial webhook testing?

---

## Capacity, routing, and scale (post-MVP — optional to ask)

25. **Pharmacy readiness / capacity**
    - Is there an API endpoint to check whether MediVera is accepting new orders before we submit?
    - At higher volume, can you signal that you cannot accept orders temporarily so we can route to a backup pharmacy partner?
    - (Note: Not required for MVP launch if you can support our initial volume — asking for future architecture planning.)

---

## Operational and partnerships

26. **Onboarding timeline**
    - What is the typical timeline from this call to first successful sandbox test order?

27. **SLA and volume**
    - Is there a minimum order volume requirement?
    - What are typical processing and shipping timelines once an order is submitted?

28. **Physician network referrals**
    - Since MediVera does not provide clinicians, do you recommend physician networks you commonly integrate with (OpenLoop, CareValidate, SteadyMD, etc.)?

---

## Notes from call

_Paste answers, contact names, credential delivery method, and follow-up action items here._

| Topic | Answer | Owner | Follow-up |
|-------|--------|-------|-----------|
| Sandbox URL | | | |
| Vendor / Location / Network IDs | | | |
| shipping.service code | | | |
| shipping.handlingService code | | | |
| Product catalog / lfProductID list | | | |
| Sample order JSON | | | |
| Sample webhook JSON | | | |
| | | | |
