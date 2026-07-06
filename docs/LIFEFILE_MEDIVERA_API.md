# Life File / MediVera API — agent pointer

The **full vendor API reference** lives at:

**`docs/vendor/LIFEFILE_MEDIVERA_API.md`**

That file is **gitignored** (proprietary Life File PDF content). It must be present locally for pharmacy integration work. If missing, restore it from the team's secure copy or re-create from the Life File API Reference v1.260421.0 PDF.

## When to read it

- Implementing or changing `backend/apps/pharmacy/` (LifeFile adapter, mapper, webhooks)
- Configuring `LIFEFILE_*` environment variables
- Mapping Beema Health patient/prescription data to `POST /order` payloads
- Debugging webhook handling or smoke clinical flow

## Related docs

| Doc | Purpose |
|-----|---------|
| [`docs/vendor/LIFEFILE_MEDIVERA_API.md`](vendor/LIFEFILE_MEDIVERA_API.md) | Full API spec + Beema Health field mapping (gitignored) |
| [`docs/MEDIVERA_ONBOARDING_QUESTIONS.md`](MEDIVERA_ONBOARDING_QUESTIONS.md) | Open onboarding questions for the vendor call |
| [`docs/PROVIDER_API_TESTING.md`](PROVIDER_API_TESTING.md) | Physician network (OpenLoop) integration testing |
