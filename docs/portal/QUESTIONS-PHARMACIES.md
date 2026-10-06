# Questions for pharmacies (LifeFile / MediVera and any future pharmacy)

Complements `docs/MEDIVERA_ONBOARDING_QUESTIONS.md`, which holds the answers already confirmed with MediVera. Ask every pharmacy the same list.

## API and events

| # | Question | Notes |
|---|----------|-------|
| 1 | Sandbox credentials and the path to production. | |
| 2 | Full list of order statuses and the webhook events for each, with sample payloads. | |
| 3 | Webhook signature scheme, retry policy, and idempotency keys. How do we replay missed events? | |
| 4 | Can we cancel or modify an order after submit? Until when? | |
| 5 | Can we query order status on demand as a fallback to webhooks? | |

## Catalog and routing

| # | Question | Notes |
|---|----------|-------|
| 6 | Formulary with product IDs, strengths, forms, and availability by state. | |
| 7 | Do you accept prescriptions from any prescriber network, or only specific ones? | |
| 8 | How do you handle out-of-stock, state restrictions, and unable-to-fill? Do you notify us before a patient is affected? | |
| 9 | Volume limits per day, and behavior when over the limit (needed for replacement routing). | |
| 10 | Refill model: new order per refill, or a standing prescription we trigger? | |
| 11 | Dose escalation: can we ship different strengths on a schedule against one prescription? | |

## Fulfillment

| # | Question | Notes |
|---|----------|-------|
| 12 | Shipping carriers, service codes, cutoffs, and tracking webhook timing. | |
| 13 | Cold-chain handling and replacement policy for damaged shipments. | |
| 14 | Packaging and labels: white-label, patient-facing branding, included inserts. | |
| 15 | Patient address validation and what happens on a failed delivery. | |

## Business and compliance

| # | Question | Notes |
|---|----------|-------|
| 16 | Per-order pricing, minimums, and price change notice. | |
| 17 | Will you sign a BAA? Provide state licenses, accreditation, and incident-notification terms. | |
| 18 | Will you talk to patients directly, or only to us? | |
| 19 | Data retention and export. Offboarding terms. | |
| 20 | Compounded vs commercial product: which do you supply, and what disclosures do you require on our site? | |
