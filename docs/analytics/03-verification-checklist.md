# Manual verification checklist

**Do not publish** the imported workspace until each row below passes.  
**Important:** On Bask, `gtm.js` may be served from `analytics.bask.health` (first-party proxy). That **breaks** standard GTM Preview / Tag Assistant connectivity. Prefer network + GA4 DebugView methods below on Bask; use GTM Preview on `beemahealth.com` where the container loads from `www.googletagmanager.com`.

---

## Prep

1. Import [`gtm-container-GTM-MHHJ44GF-import.json`](./gtm-container-GTM-MHHJ44GF-import.json) into a **new workspace** (Merge → rename conflicts). Do **not** publish.
2. In GA4 Admin → DebugView, open a browser with GA Debug / `debugger` extension **or** append `?gtm_debug=1` only on **non-public** test links (never on ads).
3. Keep DevTools → Network open; filter `google-analytics.com`, `googleadservices`, `doubleclick`, `collect`, `g/collect`, `gtm.js`.

---

## Per-tag checks

| Tag | Walkthrough | Observe |
|-----|-------------|---------|
| **T1 Conversion Linker** | Visit `https://beemahealth.com/?gclid=TEST_GCLID` then click Get Started to Bask | Network: linker / Ads cookies set (`_gcl_*`). On Bask URL, `gclid` or linker params preserved when possible. GTM Preview (marketing only): Conversion Linker fires once per page. |
| **T2 GA4 Config (Bask)** | Open Bask intake URL with GTM loaded | Network: `g/collect` or `collect` hits for measurement ID `G-03PMCCSD3R`. **Marketing** pageviews should still come from site gtag (`VITE_GA_…`), not a second GTM Config on `beemahealth.com`. Confirm no duplicate Config on marketing. |
| **T3 intake_handoff** | On marketing, open Console: after clicking a CTA, before navigation, `dataLayer` should contain `{event:'intake_handoff', cta_location:'…'}`. Prefer GTM Preview on marketing. | GA4 DebugView: event `intake_handoff` with param `cta_location` matching CTA id (`home_hero`, etc.). Payload must **not** include email/name/phone. |
| **T4 questionnaire_screen_view** | Advance 2–3 Bask questionnaire screens | Console (if accessible): `screen_view` pushes with `questionnaire_name` / `screen_name` (or under `eventModel`). Network/GA4 DebugView: GA4 event `questionnaire_screen_view` (or mapped name) with those two params only — **no** `userId`, answers, or meds. If Preview fails due to proxy: rely on DebugView + `dataLayer` logging bookmarklet / Bask support. |
| **T5 GA4 purchase** *(paused until confirmed)* | Complete a **test** checkout to Thank You | **First confirm** `dataLayer` has `event: 'purchase'` (or document actual event name). Only then unpause. DebugView: `purchase` with `transaction_id` / value / currency. No PII / no medication item names. |
| **T6 Ads purchase** *(paused)* | Same as T5 after Ads conversion action + label set in Const variable | Network: `googleadservices` / Ads conversion ping with `AW-18301765593/LABEL`. Enhanced conversions must not send email hashes from Bask. |

---

## Proxy / Preview workaround (Bask)

Because `analytics.bask.health` breaks Tag Assistant:

1. Ask Bask whether Preview/debug query params are forwarded, **or**
2. Inject a temporary console logger (Bask-side) that prints `dataLayer` pushes (no PHI), **or**
3. Use GA4 DebugView device debug mode tied to your tester client id, **or**
4. Inspect Network for `g/collect` event names (`en=questionnaire_screen_view`, `en=purchase`, etc.).

Do **not** paste real patient questionnaire content into tickets or screenshots.

---

## Negative tests (PHI)

| Test | Expected |
|------|----------|
| Fill Bask name/email/phone fields | No GA4/Ads hit includes those values in query or payload |
| Answer a clinical question | No event param echoes the answer text |
| Marketing waitlist submit | Formspree receives email; `fbq`/`gtag` Lead calls have no email argument (if Meta/Ads Lead env enabled) |
