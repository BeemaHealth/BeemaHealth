# Task 1 — Marketing site analytics audit

**Date:** 2026-08-08  
**Scope:** Beema Health marketing/SEO site (React + TanStack Start, GitHub Pages).  
**Hard rules applied:** No publish to GTM/GA4/Ads/Meta. No PHI in pixels, dataLayer, or event names. Specs/files only.

---

## Executive summary

The live marketing site already installs **GTM** (`GTM-MHHJ44GF`) and **Google Ads** (`AW-18301765593`) from hardcoded public IDs in `src/lib/gtm.ts` (production hostname only), plus optional **GA4** / **Meta** / **Ads conversion-label** helpers from Vite env via `src/lib/ad-conversions.ts`. Production `.env.production` sets `VITE_GA_MEASUREMENT_ID=G-03PMCCSD3R` and `VITE_GTM_CONTAINER_ID=GTM-MHHJ44GF` (GTM env var is **unused** by code). Live CTAs use `resolveCta()` → full Bask path `https://q.beemahealth.com/start-online-visit/weightloss`. No bare `q.beemahealth.com/` root links found in live code. Custom `dataLayer` push is limited to `intake_handoff` + `cta_location` (no PHI).

---

## Inventory

| # | Mechanism | File(s) | ID / value | Source | Duplicates? | Notes |
|---|-----------|---------|------------|--------|-------------|-------|
| 1 | **GTM loader** (standard `gtm.js` IIFE + noscript iframe) | `src/lib/gtm.ts` → `GTM_HEAD_SCRIPT`; `src/routes/__root.tsx` `RootShell` | `GTM-MHHJ44GF` | **Hardcoded** constant `GTM_CONTAINER_ID` | Same ID as Bask Integrations and as unused `VITE_GTM_CONTAINER_ID` | Loads only when `hostname === beemahealth.com`. Script URL is `https://www.googletagmanager.com/gtm.js` (not the Bask first-party proxy — that proxy applies on Bask’s host). |
| 2 | **Google Ads gtag.js** account tag | `src/lib/gtm.ts` → `GOOGLE_ADS_HEAD_SCRIPT`; `__root.tsx` | `AW-18301765593` | **Hardcoded** `GOOGLE_ADS_ID` | Would duplicate if `VITE_GOOGLE_ADS_ID` is set to the same AW id (code comments warn) | Hostname-gated. Config only — no conversion label in shell. |
| 3 | **GA4 via gtag** | `src/lib/ad-conversions.ts` (`ensureGoogleTag`, `trackGaPageView`); called from `src/lib/analytics.ts` → `trackPageViewed` | `G-03PMCCSD3R` in prod | **Env** `VITE_GA_MEASUREMENT_ID` | Risk of **double page_view** if GTM also fires GA4 Config/`page_view` on `beemahealth.com` | `send_page_view: false` on config; SPA routes fire `page_view` manually. |
| 4 | **Meta Pixel** | `src/lib/ad-conversions.ts` (`ensureMetaPixel`, `trackWaitlistLeadConversion`) | unset in prod (commented in `.env.production`) | **Env** `VITE_META_PIXEL_ID` | None while unset | `PageView` on init; `Lead` on legacy waitlist submit only. No Advanced Matching / no user data in code. |
| 5 | **Google Ads conversion (Lead)** | `ad-conversions.ts` `trackWaitlistLeadConversion` | needs `VITE_GOOGLE_ADS_ID` + `VITE_GOOGLE_ADS_CONVERSION_LABEL` | **Env** | Overlaps conceptually with shell AW config if same AW id is also set here | Legacy waitlist path only. Prod env does **not** set conversion label. |
| 6 | **Custom dataLayer: `intake_handoff`** | `src/lib/gtm.ts` `trackIntakeHandoff`; wired in `src/lib/cta-ids.ts` `resolveCta().onClick` | event `intake_handoff`, param `cta_location` (= CTA id) | N/A | Intended for GTM (not yet specified in live container by this repo) | **No PHI** — only stable CTA id strings (`home_hero`, etc.). |
| 7 | **First-party FunnelEvent API** | `src/lib/analytics.ts` → `trackFunnelEventApi` | N/A (Django `/api/analytics/events/`) | Backend (legacy) | Parallel to GA4; no-ops without API | Properties allowlist excludes PHI fields. Not an ad pixel. |
| 8 | **UTM / click-id sessionStorage** | `src/lib/utm.ts` | keys: `utm_*`, `fbclid`, `gclid`, `cta_id`, referrer, landing_path | URL + sessionStorage | Fed into Bask link query via `resolveCta` | Explicitly non-PHI attribution only. |
| 9 | **Formspree waitlist** | `src/routes/waitlist.tsx` | Formspree endpoint | Form body | Email/name go to Formspree **only** — not to `fbq`/`gtag`/`dataLayer` | `trackWaitlistSubmit` fires Lead **without** attaching form fields. |
| 10 | **CSP allowlist for tags** | `__root.tsx` head CSP | googletagmanager, facebook, GA connect | Hardcoded CSP | — | Permits GTM/gtag/Meta; does not itself load tags. |

---

## CTA / Bask URL audit

| Check | Result |
|-------|--------|
| Canonical intake URL | `https://q.beemahealth.com/start-online-visit/weightloss` in `DEFAULT_CTA_TARGET` (`cta-ids.ts`) |
| Live CTAs use `resolveCta()` | Home hero/mid, footer, mobile nav, treatment pages, BMI CTA, how-it-works, about, faq, safety, contact, LP, login prompt — **yes** |
| Bare `https://q.beemahealth.com` (no path) in live code | **None found** |
| Legacy waitlist links still in dead/commented pricing code | Commented-out `/pricing` body still references `WAITLIST_PATH` — **not live** (route redirects to `/`) |
| `intake_handoff` on Bask CTAs | Fired via `cta.onClick` when destination host is `q.beemahealth.com` |

---

## PHI / user-input risk flags

| Location | What is written | Risk |
|----------|-----------------|------|
| `trackIntakeHandoff` | `event`, `cta_location` | **OK** — CTA id only |
| `trackGaPageView` | `page_title`, `page_path`, optional `cta_id` | **OK** — path may include `utm_*` / `cta_id` query (attribution, not PHI) |
| `trackWaitlistLeadConversion` | Meta `Lead`, Ads `conversion`, GA4 `generate_lead` | **OK** — no email/name args; waitlist form PHI goes to Formspree only |
| `getAttributionForSubmit` | utm/cta/referrer to Formspree | **OK** for Formspree; must never be piped to pixels |
| BMI calculator | Height/weight/BMI stay in React state; CTA does not send BMI to analytics | **OK** |
| Bask dataLayer (partner) | Docs mention `eventModel.userId`, `sessionId`, `screen_name`, `questionnaire_name`, ecommerce | **Do not map `userId` (or any form field) into GA4/Ads/Meta.** Screen names must be step IDs, not answers. See Bask-side list. |

**No marketing-site code path was found that writes name, email, phone, address, DOB, medication, dose, condition, eligibility result, or questionnaire answers into `dataLayer`, gtag, or fbq.**

---

## Double-counting / drift notes

1. **GTM env unused:** `VITE_GTM_CONTAINER_ID` is in `.env.production` and `vite-env.d.ts`, but load path is hardcoded `GTM_CONTAINER_ID` in `gtm.ts`. Docs in `docs/features/analytics.md` still describe `ensureGtmContainer` in `ad-conversions.ts` — **that function does not exist**; GTM is shell-installed. Recommendation: update the feature doc (awaiting approval).
2. **GA4 dual path:** Marketing SPA already sends GA4 `page_view` via `VITE_GA_MEASUREMENT_ID`. GTM GA4 Configuration for the **same** property on `beemahealth.com` would double-count. Spec scopes GA4 Config primarily to Bask hostname; Conversion Linker on both.
3. **Ads dual path:** Shell always configs `AW-18301765593` on production marketing host. Leave purchase/Lead conversions to GTM on Bask (and optional env Lead on waitlist).
4. **Missing SPA page views (fixed in this change):** `/how-it-works` and `/about` did not call `trackPageViewed` — they would not emit GA4 `page_view` via `ad-conversions`. Added.

---

## Doc vs code discrepancy (needs your call)

| Doc (`docs/features/analytics.md`) | Code |
|------------------------------------|------|
| GTM loaded from `VITE_GTM_CONTAINER_ID` via `ensureGtmContainer` in `ad-conversions.ts` | GTM hardcoded in `gtm.ts`, injected in `__root.tsx` RootShell; `initAdPixels` explicitly does **not** inject GTM |
| Heavy focus on Django `FunnelEvent` / staff analytics | Live product is Bask intake; first-party API is optional/legacy |

**Recommendation:** Update `analytics.md` to match the shell + env split (and mark FunnelEvent as legacy). Do not change code to re-introduce env-driven GTM unless you want preview builds to load GTM without the hostname gate.
