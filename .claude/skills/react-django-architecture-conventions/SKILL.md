---
name: react-django-architecture
description: Architecture and code-convention standards for any project with a React, Vite, or React Native frontend and a Django / Django REST Framework backend (e.g., the Aretide telehealth platform). Use this skill whenever writing, reviewing, refactoring, or scaffolding frontend or backend code for such a project — including creating new pages/components, adding API endpoints, wiring frontend to backend, setting up a new app, styling/theming work, or answering "how should we structure this" questions. Apply it even if the user doesn't mention architecture explicitly; it defines URL versioning, centralized API clients, centralized colors/theme, naming conventions, env-var handling, and PHI-safe logging rules that all code must follow.
---

# React + Django Architecture Conventions

Standards for full-stack projects with a React/Vite or React Native frontend and a Django REST Framework backend. When writing or reviewing code in such a project, conform new code to these conventions and flag existing code that violates them (fix opportunistically when the change is small; otherwise note it).

Guiding principle: **one obvious place for everything.** Colors live in one file. API calls live in one module. URLs follow one pattern. A new engineer (or a future Claude session) should never have to guess where something goes.

---

## 1. API URL structure (versioning + app isolation)

Every backend endpoint follows:

```
{BASE_URL}/api/v{X}/{appname}/{resource}/
```

Examples:
- `https://api.example.com/api/v1/patients/intake/`
- `https://api.example.com/api/v1/cases/123/status/`
- `https://api.example.com/api/v1/partners/pharmacy-orders/`

Rules:
- `v1` from day one, even for an MVP. Versioning retrofits are painful; a prefix is free.
- `{appname}` matches the Django app name. This gives app isolation: each Django app owns its own `urls.py`, and the project `urls.py` only includes them:

```python
# project/urls.py
urlpatterns = [
    path("api/v1/patients/", include("patients.urls")),
    path("api/v1/cases/", include("cases.urls")),
    path("api/v1/partners/", include("partners.urls")),
]
```

- Trailing slashes on all endpoints (Django default). Be consistent — mixed slash usage causes silent 301s and CORS pain.
- Resource names are plural nouns, kebab-case in URLs (`pharmacy-orders`, not `pharmacyOrders` or `pharmacy_orders`).
- No verbs in URLs. Actions that don't map to CRUD use DRF `@action` sub-routes: `POST /api/v1/cases/123/approve/`.
- Breaking changes → new version namespace (`api/v2/...`), never silent mutation of v1 response shapes.

## 2. Centralized frontend API client

All HTTP calls live in a single API layer. Components never call `fetch`/`axios` directly.

```
src/
  api/
    client.js        # axios/fetch instance: BASE_URL, auth header, interceptors
    patients.js      # patient endpoints
    cases.js         # case endpoints
    partners.js      # partner endpoints
```

For small projects a single `src/api.js` is fine; split by domain once it exceeds ~200 lines.

```javascript
// src/api/client.js
const BASE_URL = import.meta.env.VITE_API_BASE_URL; // never hardcoded

// src/api/patients.js
import { client } from "./client";
export const submitIntake = (data) => client.post("/api/v1/patients/intake/", data);
export const getIntakeStatus = (caseId) => client.get(`/api/v1/cases/${caseId}/status/`);
```

Components import named functions, not URLs:

```javascript
import { submitIntake } from "@/api/patients";
```

Why: swapping backends, adding auth headers, retry logic, or mocking for demo mode becomes a one-file change. It also gives one choke point for enforcing the PHI rules in §7.

The client handles cross-cutting concerns exactly once:
- Base URL from env var
- Auth token injection (interceptor / wrapper)
- 401 → logout/refresh handling
- Consistent error normalization (components receive a predictable error shape)

Demo/mock mode: implement as an alternate client or a flag inside the API layer (`VITE_DEMO_MODE=true` returns clearly-labeled mock data), never as scattered `if (demo)` checks inside components.

## 3. Centralized colors and theme

All colors, spacing scale, and font tokens live in one place. No hex codes in component files — ever.

**Vite/React (CSS variables preferred):**

```css
/* src/styles/theme.css */
:root {
  --color-primary: #0f766e;
  --color-primary-hover: #115e59;
  --color-surface: #ffffff;
  --color-text: #1f2937;
  --color-text-muted: #6b7280;
  --color-danger: #dc2626;
  --color-success: #16a34a;
  --radius-md: 8px;
  --space-4: 16px;
}
```

If using Tailwind, the same tokens go in `tailwind.config.js` `theme.extend.colors` — the config file *is* the central palette; still no arbitrary values like `bg-[#0f766e]` in components.

**React Native:**

```javascript
// src/styles/theme.js
export const colors = { primary: "#0f766e", surface: "#ffffff", /* ... */ };
export const spacing = { sm: 8, md: 16, lg: 24 };
```

Name tokens semantically (`--color-primary`, `--color-danger`), not literally (`--teal`, `--red`). Semantic names survive a rebrand.

## 4. Naming conventions

The seam between snake_case (Python/JSON) and camelCase (JS) is where bugs live. Pick one policy and enforce it:

**Default policy: the API speaks snake_case end to end.** DRF serializers emit snake_case; the frontend uses snake_case for any object that came from or goes to the API (`patient.date_of_birth`), and camelCase for everything purely frontend (`isLoading`, `handleSubmit`). Do not hand-convert casing at random call sites — that guarantees drift. (If the project instead adopts an automatic converter such as `djangorestframework-camel-case`, then the frontend is all-camelCase; the point is one policy, applied by machinery, not by hand.)

| Thing | Convention | Example |
|---|---|---|
| Django model class | PascalCase singular | `PatientCase`, `PharmacyOrder` |
| Django model field | snake_case | `date_of_birth`, `external_partner_ref` |
| Django app | snake_case plural-ish domain | `patients`, `cases`, `partners` |
| DRF serializer | Model + Serializer | `PatientCaseSerializer` |
| DRF viewset | Model + ViewSet | `PatientCaseViewSet` |
| Service/adapter module | snake_case | `services/partner_routing.py`, `adapters/turnkey_client.py` |
| URL path segment | kebab-case plural | `/pharmacy-orders/` |
| React component file + name | PascalCase | `IntakeStepBasics.jsx` |
| React hook | `use` prefix camelCase | `useIntakeForm` |
| Non-component JS file | camelCase or kebab-case (pick one per repo) | `api/patients.js` |
| JS constant | SCREAMING_SNAKE | `MAX_INTAKE_STEPS` |
| Boolean names | `is/has/can` prefix | `is_eligible`, `hasSubmitted` |
| Env vars | SCREAMING_SNAKE, frontend-prefixed | `VITE_API_BASE_URL`, `DJANGO_SECRET_KEY` |

Status fields: use Django `TextChoices` enums, stored as strings, mirrored as frontend constants in one file (`src/constants/status.js`) — never string literals scattered through components.

## 5. Backend structure (Django/DRF)

Each Django app keeps a consistent internal layout:

```
cases/
  models.py
  serializers.py
  views.py          # thin: auth, validation, delegation
  urls.py
  services/         # business logic (case transitions, eligibility)
  adapters/         # third-party/partner integrations
  tests/
```

Rules:
- **Views are thin.** Business logic lives in `services/`; views validate input, call a service, return a response.
- **All third-party/partner logic lives in adapters** behind an interface (abstract base class or protocol), so a turnkey partner can be swapped without touching core workflow. Never call a partner API directly from a view or model method.
- Serializers are the validation boundary — request bodies are always validated by a serializer before touching a service.
- Secrets and partner credentials come from environment variables (`os.environ` / `django-environ`), never committed, never hardcoded, with distinct values per environment.
- Every schema change ships with a migration; never edit applied migrations.
- Cross-app imports go through services, not by reaching into another app's models from a view.

## 6. Environment configuration

- Frontend: only `VITE_`-prefixed vars are exposed to the browser (Vite requirement). **Nothing secret ever goes in frontend env vars** — anything shipped to the browser is public.
- One `.env.example` per side (frontend, backend) listing every required var with placeholder values, committed; real `.env` files gitignored.
- `BASE_URL` differs per environment (local/staging/prod) via env var only — no `if (window.location...)` logic and no hardcoded localhost URLs in committed code.

## 7. Logging, errors, and sensitive data (PHI-aware)

For health/telehealth projects (and a good default anywhere):

- **Never log request/response bodies that may contain PHI** — no patient names, DOB, intake answers, medications in backend logs, frontend `console.log`, analytics events, or error-tracker payloads. Log opaque IDs (`case_id=123`) instead.
- Frontend error messages shown to users are generic ("Something went wrong submitting your intake"); details stay server-side keyed by a request/correlation ID.
- Failed partner-API-call logs record endpoint, status code, correlation ID, and internal case ID — not the payload.
- Audit-relevant actions (provider decisions, status changes, manual overrides) are written as explicit audit records (who, what, when, before → after), not inferred from logs.

## 8. Frontend structure

```
src/
  api/           # §2
  components/    # reusable presentational components
  pages/         # route-level components (or screens/ in RN)
  hooks/
  constants/     # status enums, step definitions
  styles/        # theme.css / theme.js  (§3)
  utils/
```

- Multi-step forms (e.g., intake): one parent owns state + step index; each step is its own component receiving `data`/`onChange`; step order defined in one constants array so reordering is a one-line change.
- Reusable components take props; no component reaches into global state it doesn't need.
- Mock/demo data is clearly labeled (`MOCK_`, `mockPatients.js` in a `mocks/` folder) and never mixed into real API modules.

## 9. Review checklist

When touching code in this stack, verify:

1. New endpoints follow `/api/v1/{appname}/...` and live in the app's `urls.py`.
2. No `fetch`/`axios` outside the `api/` layer; no hardcoded URLs or base URLs in components.
3. No hex colors or magic spacing values in components — tokens only.
4. Naming matches the table in §4; casing policy at the API seam is consistent.
5. No secrets in code or frontend env; `.env.example` updated for new vars.
6. Partner/third-party calls go through adapters; views stay thin.
7. Nothing that could be PHI appears in logs, analytics, or error messages.
8. Mock data is labeled as mock; demo mode is a flag in the API layer, not scattered conditionals.