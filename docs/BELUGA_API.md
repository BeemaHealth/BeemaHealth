# Beluga Health API — agent pointer

The **full vendor API reference** lives at:

**`docs/vendor/BELUGA_API.md`**

That file is **gitignored** (proprietary Beluga Health content). It must be present locally for Beluga integration work. If missing, restore it from the team's secure copy.

## When to read it

- Building or modifying the Beluga visit creation flow (POST to Beluga API)
- Handling Beluga webhooks (RX_WRITTEN, CONSULT_CONCLUDED, pharmacy/lab/tracking events)
- AutoRx GLP-1 titration protocol logic
- weightlossCheckin visit submissions
- Medication pricing and catalog lookups (semaglutide, tirzepatide, branded GLP-1s, ED)
- Pharmacy search or patient data retrieval (GET endpoints)
- Cost structure / billing questions (platform fees, clinical fees, facilitation fees)
