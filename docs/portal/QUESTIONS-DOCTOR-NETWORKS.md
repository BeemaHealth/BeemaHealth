# Questions for doctor networks (Beluga and any future network)

Ask every network the same list so we can compare them. Record answers in the notes column.

## Integration model

| # | Question | Notes |
|---|----------|-------|
| 1 | Do you offer a webhook-plus-API integration with no clinician login on our side? | |
| 2 | Sandbox access, credentials, and the path to production. | |
| 3 | Webhook events you send, with sample payloads, retry policy, signature scheme, and ordering guarantees. | |
| 4 | Is there an idempotency key on each event? How do we replay missed events? | |
| 4a | Webhook authentication scheme (shared secret, HMAC, IP allowlist)? Beluga's doc says only "implement auth". | |
| 5 | Rate limits and expected latency from visit submit to clinician review. | |

## Clinical flow

| # | Question | Notes |
|---|----------|-------|
| 6 | Do you accept our questionnaire answers as structured data? What is the required field list and format? | |
| 7 | Can you accept a recommended dose and cadence from us, or does the clinician decide from scratch? | |
| 8 | Which states do you cover for each drug (semaglutide, tirzepatide, others)? | |
| 9 | Which visits are synchronous (video or phone), which are async, and who decides? | |
| 10 | Who runs and hosts the video visit, and who handles scheduling? Do we need to build either? | |
| 11 | How are refills and dose changes handled (new visit, async check-in, auto-renew)? | |
| 12 | How are denials, contraindications, and "needs more info" returned to us? | |

## Messaging

| # | Question | Notes |
|---|----------|-------|
| 13 | Can the clinician and patient message through our portal via API, with no separate patient login? | |
| 14 | Are attachments supported (photos, labs) in both directions? | |
| 15 | Expected clinician response time and any SLA. | |

## Pharmacy and prescriptions

| # | Question | Notes |
|---|----------|-------|
| 16 | Do you route prescriptions to your own pharmacies? Can we override and choose the pharmacy per order? | |
| 17 | Can you send prescriptions to a pharmacy we pick (for example via LifeFile)? Any fee? | |
| 17a | If we send the order ourselves, what prescriber identity (NPI, signed Rx) do you provide so a pharmacy can accept it? Without it we cannot offer a Beema-chosen pharmacy. | |
| 18 | What prescription data do we get back (drug, strength, quantity, refills, NPI, expiry)? | |

## Business and compliance

| # | Question | Notes |
|---|----------|-------|
| 19 | Pricing model (per visit, per patient per month, per renewal) and minimums. | |
| 20 | Will you sign a BAA? Provide your HIPAA, SOC 2, and incident-notification terms. | |
| 21 | White-label: do patients ever see your brand? | |
| 22 | Data ownership, export, and offboarding terms. | |
| 23 | Malpractice and licensure coverage by state, and LegitScript status. | |
| 24 | Can we onboard our own individual doctors alongside your network? | |

## Webhook reliability (plain-language version, send this section to Beluga as written)

**The short story.** When something happens on your side (a doctor writes a prescription, a doctor sends the patient a message, a package ships), your system sends our system a small message called a webhook. It is like a delivery driver ringing our doorbell to say "something arrived." We then tell the patient.

The problem: doorbells can fail. Our house might be briefly offline, or your driver might ring twice, or ring in the wrong order. Your documentation says to "implement auth" on the doorbell, but does not say what happens in these situations. We need to know, because a missed message could mean a patient never hears that their prescription is ready.

| # | Question | Why we are asking |
|---|----------|-------------------|
| W1 | Does every webhook have its own unique ID number (like a receipt number)? If not, how should we tell a real new message from an accidental duplicate? | If you ring twice for the same event, we must not send the patient two texts or ship two orders. |
| W2 | How exactly do we prove a webhook really came from Beluga? (A secret password in a header? A signature we can check? A fixed list of your server addresses?) | Anyone could pretend to be Beluga and tell us a fake prescription was written. |
| W3 | If our server is down or answers with an error, do you try again? How many times, and how long do you wait between tries? When do you give up? | This decides how long a patient could wait unknowingly. |
| W4 | Is there a way to ask you "what are all the events for this visit?" so we can catch anything we missed? (We know about the visit lookup call. Does it show every event, including chat messages?) | We want a safety net that checks every night. |
| W5 | Do you promise to send events in the order they happened? | Example: if "shipped" arrives before "prescription written," we must not get confused. |

**Scenarios where we do not know what Beluga does. Please tell us for each:**

1. **Our server is down for 2 hours** while a doctor writes a prescription and sends the patient a message. When we come back, do you resend both? Do they arrive in the right order? Or are they lost?
2. **You send the same `RX_WRITTEN` twice** by accident (maybe your system retried). Will the second one look identical to the first? Is there any field that is different, so we can tell it is a repeat?
3. **A message from the doctor arrives before we know about the visit.** (For example, the visit was just created and the webhook beat our own database save.) Do you retry later, or is it gone?
4. **The patient sends a message to the doctor and your chat endpoint answers with an error or does not answer at all.** Did the doctor get the message or not? Is it safe for us to send it again, or will the doctor see it twice?
5. **A doctor cancels a visit after writing a prescription.** What events do we get, and in what order? Is the prescription still valid?
6. **A visit changes hands.** For example, the first doctor passes the patient to another doctor. Does the `masterId` stay the same? Does `docName` in later events change?
7. **A webhook arrives for a `masterId` we have never heard of.** Can this happen on your side (for example, a visit created by hand by Beluga staff)? What should we do with it?
8. **You change the format of a webhook** (a new field, a renamed field). How much notice do we get? Is there a version number we can check?
9. **A package is marked delivered and then a "delivery failed" event arrives afterward.** Which one is true? Does the later event always win?
10. **We send a visit and your system answers with an error after it already saved it.** If we send it again, do you create a second visit for the same patient, or do you recognize it? Is there a field we can send to prevent duplicates?

## Other open questions (carried over from the repo-root `questions to beluga health:.md.md`)

| # | Question | Notes |
|---|----------|-------|
| X1 | What is the `visitType` string for a GLP-1 weight-loss titration check-in? | |
| X2 | What are the paths for the refill, auto-rx, and photo endpoints (`{refill_endpoint}`, `{autorx_endpoint}`, `{photo_endpoint}`)? | |
| X3 | Does `pharmacyId` come back in any webhook, or must we pass it in? If we pass it, where do we get it? | |
| X4 | For "Stay the same" on a dose-change visit, do we use the titration check-in or the same-dose refill endpoint? | |
| X5 | Does Beluga require a valid government ID for weight-loss prescriptions? | |
| X6 | When may a patient request a refill, and how long after the prescription is written? | |
| X7 | Can we charge the patient after Beluga approves and hold pharmacy fulfillment until payment succeeds? | |
| X8 | Is there a single prescriber NPI for all Beluga prescriptions, or does each individual doctor have their own? (Needed only if we ever route orders to our own pharmacy.) | |
