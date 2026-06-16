# Aretide

Colorado-first telehealth medical weight-loss intake platform. This repo contains the **React frontend** (TanStack Start) and **Django REST (Representational State Transfer) API (Application Programming Interface) backend**.

Use this file as the **documentation index** — for humans and AI agents. When looking something up, start here, then follow the link to the right doc.

---
https://aretide.com/
## Glossary (acronyms used in this repo)

| Acronym | Stands for |
|---------|------------|
| ACM | AWS Certificate Manager |
| ALB | Application Load Balancer |
| API | Application Programming Interface |
| AWS | Amazon Web Services |
| BAA | Business Associate Agreement |
| CAC | Customer Acquisition Cost |
| CORS | Cross-Origin Resource Sharing |
| DO | Doctor of Osteopathic Medicine |
| DOB | Date of birth |
| DRF | Django REST Framework |
| EB | Elastic Beanstalk |
| ECS | Amazon Elastic Container Service |
| ECR | Elastic Container Registry |
| EHR | Electronic Health Record |
| FDA | U.S. Food and Drug Administration |
| FK | Foreign key |
| GLP-1 | Glucagon-like peptide-1 (weight-loss medication class) |
| HIPAA | Health Insurance Portability and Accountability Act |
| HSTS | HTTP Strict Transport Security |
| JSON | JavaScript Object Notation |
| LLC | Limited Liability Company |
| MD | Doctor of Medicine |
| MSO | Management Services Organization |
| MVP | Minimum Viable Product |
| NP | Nurse Practitioner |
| PC | Professional Corporation |
| PHI | **Protected Health Information** — any health data that can identify a patient (e.g. name, date of birth, phone, medical intake answers, lab uploads, insurance card images) |
| QA | Quality Assurance |
| RBAC | Role-Based Access Control |
| RDS | Amazon Relational Database Service |
| REST | Representational State Transfer |
| S3 | Amazon Simple Storage Service |
| SEO | Search Engine Optimization |
| SQL | Structured Query Language |
| SSE-KMS | Server-Side Encryption with AWS Key Management Service |
| TLS | Transport Layer Security |
| URL | Uniform Resource Locator |
| UUID | Universally Unique Identifier |
| VPC | Virtual Private Cloud |

---

## Quick start

| Goal | Where to go |
|------|-------------|
| Run the frontend locally | [Frontend setup](#frontend) below |
| Run the backend locally | [backend/README.md](backend/README.md) |
| Connect frontend to backend | [.env.example](.env.example) + [Frontend ↔ API](#frontend--api) below |
| Understand database tables | [backend/DATABASE.md](backend/DATABASE.md) |
| Deploy backend (Heroku vs AWS) | [backend/HOSTING.md](backend/HOSTING.md) |
| Deploy frontend (GitHub Pages) | [docs/DEPLOY-FRONTEND.md](docs/DEPLOY-FRONTEND.md) |
| Restore removed marketing pages (pricing, nav, etc.) | [docs/archived-marketing-pages.md](docs/archived-marketing-pages.md) |

---

## Repository layout

```
Aretide/
├── README.md                 ← You are here (doc index)
├── .env.example              ← Env vars for frontend + backend
├── src/                      ← React / TanStack Start frontend
├── backend/                  ← Django REST API
│   ├── README.md             ← Backend setup, API list, HIPAA notes
│   ├── DATABASE.md           ← Tables, schema decisions, data flow
│   ├── HOSTING.md            ← Heroku Shield vs AWS for PHI (Protected Health Information)
│   └── deploy/aws.md         ← AWS deployment outline
├── docs/
│   ├── DEPLOY-FRONTEND.md              ← GitHub Pages + aretide.com deploy guide
│   ├── archived-marketing-pages.md   ← Removed marketing nav + pages (restore guide)
│   └── archived-marketing/           ← Full source copies from pre-MVP site
├── deploy-frontend-prod.sh           ← Publish frontend to gh-pages
└── Starting Point/
    └── launchPlan.md         ← Product / business launch plan
```

---

## Documentation index

### Project & product

| File | Contents |
|------|----------|
| [Starting Point/launchPlan.md](Starting%20Point/launchPlan.md) | MVP (Minimum Viable Product) offerings, legal/compliance goals, Colorado telehealth scope, business context |
| [docs/archived-marketing-pages.md](docs/archived-marketing-pages.md) | **Removed marketing site** — nav links, page content, and step-by-step restore instructions for `/pricing`, `/switch`, `/insurance`, `/clinicians`, `/safety`, `/faq`, `/learn`, full `/how-it-works` |

### Frontend (React / TanStack Start)

| File | Contents |
|------|----------|
| [src/routes/README.md](src/routes/README.md) | File-based routing conventions (`__root.tsx`, dynamic routes, no `src/pages/`) |
| [src/lib/types/mvp.ts](src/lib/types/mvp.ts) | TypeScript types shared with the API (users, intake, consent, etc.) |
| [src/lib/api/client.ts](src/lib/api/client.ts) | API client — calls Django when `VITE_API_URL` is set |
| [src/lib/safety-flags.ts](src/lib/safety-flags.ts) | Client-side safety flag logic (mirrored in backend) |

**Key frontend routes:** `/` (landing), `/qualify` (eligibility), `/intake`, `/consent`, `/dashboard`, `/admin`

### Backend (Django + DRF)

| File | Contents |
|------|----------|
| [backend/README.md](backend/README.md) | **How to run the backend** (Docker + local Python), API endpoints, roles, HIPAA technical safeguards, frontend integration |
| [backend/DATABASE.md](backend/DATABASE.md) | **All database tables**, relationships, design decisions, JSON vs columns, API/type mapping |
| [backend/HOSTING.md](backend/HOSTING.md) | **Where to deploy for PHI (Protected Health Information)** — Heroku Shield + BAA requirements vs AWS fallback |
| [backend/deploy/aws.md](backend/deploy/aws.md) | AWS production deployment steps (ECS, RDS, S3, BAA) |

### Configuration

| File | Contents |
|------|----------|
| [.env.example](.env.example) | `VITE_API_URL`, `DATABASE_URL`, `FERNET_KEY`, AWS/S3, CORS |
| [.env.production.example](.env.production.example) | Production `VITE_API_URL` for frontend deploy |

### Deployment

| File | Contents |
|------|----------|
| [docs/DEPLOY-FRONTEND.md](docs/DEPLOY-FRONTEND.md) | **GitHub Pages + aretide.com** — one-time setup and `deploy-frontend-prod.sh` |

---

## Frontend

**Stack:** React 19, TanStack Start, TanStack Router, Tailwind, shadcn/ui.

```bash
npm install
npm run dev
```

Opens at **http://localhost:8080/** by default.

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

---

## Backend

**Stack:** Django 5, Django REST Framework (DRF), PostgreSQL, Token auth.

Full instructions: **[backend/README.md](backend/README.md)**

**Docker (recommended):**

```bash
cd backend
docker compose up --build
docker compose exec api python manage.py migrate
docker compose exec api python manage.py createsuperuser
```

API health check: http://localhost:8000/api/health/  
API docs: http://localhost:8000/api/docs/

---

## Frontend ↔ API

1. Copy [.env.example](.env.example) to `.env` at the repo root.
2. Set `VITE_API_URL=http://localhost:8000/api`
3. Generate `FERNET_KEY` for the backend (see `.env.example` comments).
4. Restart both servers after changing env vars.

When `VITE_API_URL` is set, the frontend sends PHI (Protected Health Information) to the API instead of `localStorage`.

---

## Where to deploy the backend (PHI — Protected Health Information)

**PHI** means patient-identifying health data: names, contact info, dates of birth, questionnaire answers, uploaded documents, and similar records. **Do not use standard Heroku for real patient data.**

| Option | PHI-safe? (Protected Health Information) | Summary |
|--------|-----------|---------|
| **Local / Docker** | No | Development and fake data only |
| **Heroku Shield + BAA** | Yes, if contracted | Shield Private Space, Shield Postgres, Shield Dynos only; signed BAA (Business Associate Agreement) with Salesforce required |
| **Standard Heroku** | **No** | Not permitted for PHI (Protected Health Information) |
| **AWS (Amazon Web Services) + BAA** | Yes | Recommended fallback if Heroku BAA unavailable — RDS (Relational Database Service), S3 (Simple Storage Service), ECS (Elastic Container Service) / EB (Elastic Beanstalk) |

Full research and go/no-go checklist: **[backend/HOSTING.md](backend/HOSTING.md)**

**Current recommendation:** Confirm Heroku Shield + BAA with Salesforce. If unavailable within ~2 weeks, use **AWS** ([backend/deploy/aws.md](backend/deploy/aws.md)).

---

## For AI agents

When answering questions about this codebase:

| Topic | Read first |
|-------|------------|
| Database schema / tables / why JSON | `backend/DATABASE.md` |
| Run backend, API routes, auth | `backend/README.md` |
| Production hosting, HIPAA infra | `backend/HOSTING.md` |
| AWS deploy | `backend/deploy/aws.md` |
| Frontend routes | `src/routes/README.md` |
| API ↔ frontend types | `src/lib/types/mvp.ts`, `src/lib/api/client.ts` |
| MVP product scope | `Starting Point/launchPlan.md` |
| Restore archived marketing pages / nav | `docs/archived-marketing-pages.md` |
| Env vars | `.env.example` |

**Do not** treat local Docker or browser `localStorage` as HIPAA-compliant storage for PHI (Protected Health Information).

---

## Related links (internal)

- [backend/README.md](backend/README.md)
- [backend/DATABASE.md](backend/DATABASE.md)
- [backend/HOSTING.md](backend/HOSTING.md)
- [backend/deploy/aws.md](backend/deploy/aws.md)
- [src/routes/README.md](src/routes/README.md)
- [Starting Point/launchPlan.md](Starting%20Point/launchPlan.md)
- [docs/archived-marketing-pages.md](docs/archived-marketing-pages.md)
