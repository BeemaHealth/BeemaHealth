# Task 2 — GTM tag specification (GTM-MHHJ44GF)

**Container:** Beema Health Questionnaire (`GTM-MHHJ44GF`) — account `6368696783`, container `259765761`  
**GA4 property:** `G-03PMCCSD3R`  
**Google Ads:** `AW-18301765593`  
**Import file:** [`gtm-container-GTM-MHHJ44GF-import.json`](./gtm-container-GTM-MHHJ44GF-import.json) — workspace import only; **do not publish** until verification.

### PHI guardrails (apply to every tag)

| Guardrail                          | Requirement                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| User-provided data                 | **Off** — never enable Enhanced Conversions / user-provided data                                                     |
| Automatic advanced matching (Meta) | **Off** — Meta not in this container; keep off if added later                                                        |
| Form / DOM variables               | **None** — no Auto-Event Form variables, no CSS selectors on inputs                                                  |
| Identity                           | **Never** map Bask `userId`, email, phone, name, DOB, address                                                        |
| Clinical content                   | **Never** send medication name, dose, condition, eligibility, or answer text                                         |
| Allowed DL keys                    | `event`, `questionnaire_name`, `screen_name`, `cta_location`, ecommerce `transaction_id` / `value` / `currency` only |
| Firing                             | Prefer named Custom Event / step triggers over All Pages where possible                                              |
| Event names                        | Funnel **actions** only (`intake_handoff`, `questionnaire_screen_view`, `purchase`) — never medical inferences       |

---

## Tag / trigger / variable table

| Row | Name                                          | Tag type                                  | Trigger                                                          | dataLayer / variables read                                                                                                            | Firing scope                                  | Confirmed DL event?                                                                                                                                                                              | PHI notes                                                                                                                                                                  |
| --- | --------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | **Conversion Linker**                         | Conversion Linker (`gclidw`)              | All Pages                                                        | (none)                                                                                                                                | `beemahealth.com` **and** `q.beemahealth.com` | N/A (pageview)                                                                                                                                                                                   | No user data. Needed for gclid persistence across marketing → Bask.                                                                                                        |
| T2  | **GA4 Configuration**                         | Google Tag / GA4 Config (`googtag`)       | All Pages **where** Page Hostname contains `q.beemahealth.com`   | Constant `GA4 Measurement ID` = `G-03PMCCSD3R`                                                                                        | **Bask only**                                 | N/A                                                                                                                                                                                              | Do **not** fire on marketing host (SPA already sends GA4 via `VITE_GA_MEASUREMENT_ID`). Config: send page_view on Bask; **no** user_id; **no** user properties from forms. |
| T3  | **GA4 — intake_handoff**                      | GA4 Event (`gaawe`)                       | CE — `intake_handoff`                                            | DLV `cta_location` → event param `cta_location`                                                                                       | Marketing host (where `resolveCta` pushes)    | **Confirmed in marketing code** (`trackIntakeHandoff`)                                                                                                                                           | Event name = funnel action. Param = CTA id string only.                                                                                                                    |
| T4  | **GA4 — questionnaire_screen_view**           | GA4 Event (`gaawe`)                       | CE — `screen_view` **and** Hostname contains `q.beemahealth.com` | DLV `questionnaire_name`, DLV `screen_name` (and/or `eventModel.questionnaire_name` / `eventModel.screen_name` — see variables)       | Bask questionnaire                            | **Confirmed by product requirement** (Bask pushes `screen_view` with those fields). Map exact nesting after one live Preview/network capture.                                                    | Params are **screen identifiers**, not answers. If live values ever contain free-text answers, **pause tag** and ask Bask to emit opaque step keys.                        |
| T5  | **GA4 — purchase**                            | GA4 Event (`gaawe`) event name `purchase` | CE — `purchase` **and** Hostname contains `q.beemahealth.com`    | DLV `ecommerce.transaction_id`, `ecommerce.value`, `ecommerce.currency` (if present)                                                  | Bask Thank You / order-complete               | **UNCONFIRMED** — `docs/features/analytics.md` claims purchase on Thank You; **not verified** against a live dataLayer dump in this audit. Tag is **paused** in the import JSON until confirmed. | No item name/SKU if those encode medication. No PII. Transaction id + value + currency only.                                                                               |
| T6  | **Google Ads — Purchase conversion**          | Ads Conversion Tracking (`awct`)          | Same as T5 (CE — `purchase` on Bask)                             | Constant Ads ID `AW-18301765593`; Constant **Conversion Label** (placeholder — set in GTM UI after Ads creates the conversion action) | Bask only                                     | **UNCONFIRMED** (depends on T5 event)                                                                                                                                                            | **Paused** until purchase event confirmed **and** conversion label filled. Enhanced conversions **off**.                                                                   |
| T7  | _(Optional)_ **GA4 — generate_lead waitlist** | —                                         | —                                                                | —                                                                                                                                     | —                                             | Covered by marketing `ad-conversions.ts`, not GTM                                                                                                                                                | Do not duplicate in GTM unless waitlist Lead moves entirely into GTM.                                                                                                      |

### Variables (create these; do **not** create variables for `userId`, email, phone, name, or form fields)

| Variable                              | Type                | Key / value                                |
| ------------------------------------- | ------------------- | ------------------------------------------ |
| `Const - GA4 Measurement ID`          | Constant            | `G-03PMCCSD3R`                             |
| `Const - Google Ads ID`               | Constant            | `18301765593` (numeric portion for `awct`) |
| `Const - Google Ads Conversion Label` | Constant            | `REPLACE_ME_AFTER_ADS_SETUP`               |
| `DLV - cta_location`                  | Data Layer Variable | `cta_location`                             |
| `DLV - questionnaire_name`            | Data Layer Variable | `questionnaire_name`                       |
| `DLV - screen_name`                   | Data Layer Variable | `screen_name`                              |
| `DLV - eventModel.questionnaire_name` | Data Layer Variable | `eventModel.questionnaire_name`            |
| `DLV - eventModel.screen_name`        | Data Layer Variable | `eventModel.screen_name`                   |
| `DLV - ecommerce.transaction_id`      | Data Layer Variable | `ecommerce.transaction_id`                 |
| `DLV - ecommerce.value`               | Data Layer Variable | `ecommerce.value`                          |
| `DLV - ecommerce.currency`            | Data Layer Variable | `ecommerce.currency`                       |

T4 should prefer flat keys if present, else `eventModel.*` (configure event params with the keys Bask actually emits once confirmed — import JSON maps both via a note; primary mapping uses flat + eventModel fallbacks documented in verification).

### Triggers

| Trigger                 | Type         | Condition                                                                |
| ----------------------- | ------------ | ------------------------------------------------------------------------ |
| All Pages               | Page View    | —                                                                        |
| Bask Hostname           | Page View    | `{{Page Hostname}}` contains `q.beemahealth.com`                         |
| CE - intake_handoff     | Custom Event | Event name equals `intake_handoff`                                       |
| CE - screen_view (Bask) | Custom Event | Event = `screen_view` **AND** Page Hostname contains `q.beemahealth.com` |
| CE - purchase (Bask)    | Custom Event | Event = `purchase` **AND** Page Hostname contains `q.beemahealth.com`    |

---

## Architecture sketch

```
beemahealth.com                          q.beemahealth.com (Bask)
─────────────────                        ─────────────────────────
GTM-MHHJ44GF (gtm.js)                    GTM-MHHJ44GF (via Bask; gtm.js may
Shared GA4 + Ads gtag loader                load from analytics.bask.health)
GA4 SPA page_view (VITE_GA_…)            T2 GA4 Config (Bask-only)
T1 Conversion Linker                     T1 Conversion Linker
T3 intake_handoff → GA4                  T4 screen_view → GA4 event
resolveCta → full /start-online-visit/…  T5/T6 purchase (paused until confirmed)
```
