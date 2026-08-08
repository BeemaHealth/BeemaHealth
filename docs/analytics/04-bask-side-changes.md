# Bask-side changes (not marketing-site)

These cannot be done in the Beema marketing repo. Track with Bask / Bask admin.

| # | Need | Why | Owner |
|---|------|-----|-------|
| 1 | Confirm GTM container `GTM-MHHJ44GF` is saved under Bask → Settings → Integrations → Google Tag Manager | Container must load on `q.beemahealth.com` | Beema ops + Bask |
| 2 | Confirm how `gtm.js` is loaded (`analytics.bask.health` vs `googletagmanager.com`) and whether GTM Preview works | First-party proxy breaks Tag Assistant; affects QA plan | Bask |
| 3 | Provide a **canonical dataLayer catalog** for weight-loss intake: exact event names, nesting (`questionnaire_name` / `screen_name` vs `eventModel.*`), and when each fires | Spec maps T4/T5 to these keys; nesting is currently dual-documented | Bask |
| 4 | **Confirm** whether `event: 'purchase'` (or alternate) fires on order-complete / Thank You, and which ecommerce fields are set (`transaction_id`, `value`, `currency`, items) | T5/T6 are **paused** until confirmed — do not assume | Bask |
| 5 | Ensure `userId` / PII in dataLayer are **never** required for analytics tags; prefer opaque session ids if needed | HIPAA — ad platforms must not receive PHI | Bask + Beema compliance |
| 6 | Ensure `screen_name` / `questionnaire_name` are opaque step keys (e.g. `height_weight`), not answer text or medication labels | Prevent accidental PHI in GA4 event params | Bask |
| 7 | If ecommerce `items[].item_name` contains medication names, omit items from GA4 purchase or replace with generic SKU | Medication names must not reach GA4/Ads | Bask or GTM (omit items param) |
| 8 | Preserve marketing handoff query params (`utm_*`, `gclid`, `fbclid`, `cta_id`) through intake → checkout | Attribution + Conversion Linker effectiveness | Bask (`signUpSearchParams` / equivalent) |
| 9 | Optionally emit a dedicated non-PHI `order_complete` custom event if `purchase` is missing or unstable | Unblocks T5/T6 without guessing | Bask |
| 10 | Document whether cross-domain linker params are stripped on redirects inside Bask | If stripped, Ads attribution breaks at purchase | Bask |

**Not Bask:** Marketing CTA URL, `intake_handoff` push, GA4 SPA pageviews, Meta/waitlist Lead — owned by this repo.
