# Patient Funnel

The funnel has two phases: **anonymous pre-signup** and **authenticated post-signup**. Pre-signup data is never stored in the browser — it lives server-side behind an HttpOnly cookie.

## Phase 1 — Anonymous (pre-signup)

When a user hits `/qualify`, the frontend calls `POST /api/funnel/session/`. The backend creates a `FunnelSession` row and returns a session token stored in an HttpOnly cookie. All subsequent pre-signup API calls are authenticated by that cookie.

**`FunnelSession`** (`funnel_sessions` table) records:
- UTM params captured at first touch (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`)
- `landing_page_slug` — which landing page the user arrived from (empty if direct)
- `cta_id` — which marketing CTA the user clicked (e.g. `home_hero`, `nav_header`); attribution only
- `experiment_id` + `variant_key` — which A/B variant they were assigned
- `qualify_questionnaire_version_id` — the questionnaire version they were shown (pinned for the session)
- `status`: `active` → `claimed` on account creation, or `expired`/`abandoned`

The home page may create a funnel session early (`src/routes/index.tsx`) with UTMs; `/qualify` ensures a session exists and pins the qualify version resolved from the entry `cta_id` (or the default-entry qualify version).

## CTA → qualify entry + attribution

All "See if you qualify" / get-started links use stable **`cta_id`** values in the URL (e.g. `/qualify?cta_id=home_hero`).

- **Entry routing:** the `cta_id` selects which published qualify version the patient enters. Staff map CTA ids to a qualify version in the builder's **Entry points** panel; unmapped CTAs fall back to the default-entry qualify version.
- **Attribution:** `cta_id` is stored on `FunnelSession` and included in analytics events so placement, qualify version, and intake version can all be compared (see `docs/features/analytics.md`).

## Dynamic qualify (feature flag on)

When `VITE_DYNAMIC_QUESTIONNAIRES=true`:
- `/qualify` renders `QualifyDynamicFlow` using `GET /api/questionnaires/qualify/active/` (or pinned `version_id` from session).
- Answers accumulate in `EligibilityResponse.questionnaire_responses` keyed by `field_key`.
- `questionnaire_version_id` is set at session start and is **immutable** after first write.
- Step navigation follows each step's `routing_rules` (conditional + default).

## Qualify → intake handoff

When the patient reaches `/intake`:
1. Backend resolves **intake questionnaire slug** from the pinned qualify version's `intake_routing_rules` + `questionnaire_responses`.
2. Loads the **published** intake version for that slug.
3. Pins `MedicalIntake.questionnaire_version_id` to that intake version.

Multiple intake questionnaires may be published at once (different slugs), and **multiple qualify versions** may be published at once — each reached via its mapped CTA ids, with one default-entry qualify for unmapped CTAs.

**`EligibilityResponse`** (`eligibility_responses` table) holds all pre-signup answers:
- Treatment interest, primary goal, treatment priority
- Height/weight/goal weight, BMI (auto-calculated)
- DOB (field-level encrypted), state (Colorado-only validation)
- Safety screen JSON, `safety_concern_flag`
- `is_likely_eligible` + `disqualification_reason` — set by backend eligibility service
- `questionnaire_responses` JSON — raw dynamic questionnaire answers keyed by field_key
- `questionnaire_version_id` — pinned qualify version UUID (immutable after set)
- `selected_intake_questionnaire_slug` — resolved intake questionnaire slug (set when entering intake)

## Phase 2 — Account creation

`POST /api/auth/register/` claims the funnel session:
- Creates a `User` row
- Transfers `EligibilityResponse` from the session to the new user (sets `user` FK, clears `funnel_session`)
- Sets `FunnelSession.status = claimed`
- Returns an auth token for all subsequent requests

After registration the user proceeds through email verification (`/verify-email`) before continuing to `/intake`.

## Feature flag

Dynamic questionnaires in the qualify flow are gated behind `VITE_DYNAMIC_QUESTIONNAIRES=true` (frontend) and `DYNAMIC_QUESTIONNAIRES=True` (Django setting). Without the flag the hardcoded qualify steps in `src/lib/qualify-steps.ts` are used instead.

## Key files

| File | Role |
|------|------|
| `src/routes/qualify.tsx` | Qualify flow UI + step navigation |
| `src/lib/qualify-steps.ts` | Hardcoded step definitions + validators |
| `backend/apps/eligibility/models.py` | FunnelSession, EligibilityResponse |
| `backend/apps/eligibility/views.py` | Funnel session + eligibility endpoints |
| `backend/apps/eligibility/services.py` | Eligibility evaluation logic |
| `backend/apps/accounts/` | Registration, login, email verification |
| `src/lib/cta-ids.ts` | Stable CTA id constants for marketing links |
| `src/components/questionnaire/QualifyDynamicFlow.tsx` | Dynamic qualify UI |
