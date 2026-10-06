# Beema Health portal backend (branch `fuck-bask`)

New Django backend replacing Bask. Design lives in `../docs/portal/` (`PLAN.md`, `SCHEMA.md`). The previous in-house backend is in `../old_backend/` and is a reference only.

Differences from the legacy stack, so both can coexist locally:

| | old_backend | backend |
|---|---|---|
| Compose project | `beemahealth` | `beemahealth_portal` |
| API port | 8000 | 8001 |
| Postgres port | 5432 | 5433 |

Never put PHI in logs. See `../docs/HIPAA.md`.
