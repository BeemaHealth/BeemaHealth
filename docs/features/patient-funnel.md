# Patient Funnel

The funnel has two phases: **anonymous pre-signup** and **authenticated post-signup**. Pre-signup data is never stored in the browser — it lives server-side behind an HttpOnly cookie.

## Phase 1 — Anonymous (pre-signup)

When a user hits `/qualify`, the frontend calls `POST /api/funnel/session/`. The backend creates a `FunnelSession` row and returns a session token stored in an HttpOnly cookie. All subsequent pre-signup API calls are authenticated by that cookie.

**`FunnelSession`** (`funnel_sessions` table) records:
- UTM params captured at first touch (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`)
- `landing_page_slug` — which landing page the user arrived from (empty if direct)
- `experiment_id` + `variant_key` — which A/B variant they were assigned
- `qualify_questionnaire_version_id` — the questionnaire version they were shown
- `status`: `active` → `claimed` on account creation, or `expired`/`abandoned`

The frontend `PATCH /api/funnel/eligibility/` after each qualify step, building up the `EligibilityResponse` row attached to the session.

**`EligibilityResponse`** (`eligibility_responses` table) holds all pre-signup answers:
- Treatment interest, primary goal, treatment priority
- Height/weight/goal weight, BMI (auto-calculated)
- DOB (field-level encrypted), state (Colorado-only validation)
- Safety screen JSON, `safety_concern_flag`
- `is_likely_eligible` + `disqualification_reason` — set by backend eligibility service
- `questionnaire_responses` JSON — raw dynamic questionnaire answers keyed by field_key

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
| `src/lib/utm.ts` | UTM capture from URL params → session storage (non-PHI only) |
