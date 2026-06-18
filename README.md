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
| EC2 | Amazon Elastic Compute Cloud |
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

### Already installed? Run these

From the **repo root**, open **two terminals** and run one command in each:

| Terminal | Command | URL |
|----------|---------|-----|
| **Frontend** | `npm run dev` | http://localhost:8080/ |
| **Backend** | `npm run dev:backend` | http://localhost:8000/api/health/ |

Assumes you have already run [first-time setup](#first-time-setup): **Docker Desktop**, `npm install`, a root `.env.dev` (or `.env`), and backend migrations.

Full local dev guide (identical setup on every machine): **[docs/LOCAL-DEV.md](docs/LOCAL-DEV.md)**

### Doc index

| Goal | Where to go |
|------|-------------|
| Local dev setup (Docker, prerequisites) | [docs/LOCAL-DEV.md](docs/LOCAL-DEV.md) |
| HIPAA compliance (agents) | [docs/HIPAA.md](docs/HIPAA.md) |
| Input validation & security tests | [docs/INPUT_VALIDATION_TESTS.md](docs/INPUT_VALIDATION_TESTS.md) |
| First-time install (deps, env, DB) | [First-time setup](#first-time-setup) below |
| Connect frontend to backend | `.env.dev` + [Frontend ↔ API](#frontend--api) below |
| Understand database tables | [backend/DATABASE.md](backend/DATABASE.md) |
| Which table owns each patient field (no duplicates) | [backend/DATABASE.md — Canonical field ownership](backend/DATABASE.md#canonical-field-ownership-no-duplicates) |
| Deploy backend (Heroku vs AWS) | [backend/HOSTING.md](backend/HOSTING.md) |
| Deploy frontend (GitHub Pages) | [docs/DEPLOY-FRONTEND.md](docs/DEPLOY-FRONTEND.md) |
| Restore removed marketing pages (pricing, nav, etc.) | [docs/archived-marketing-pages.md](docs/archived-marketing-pages.md) |

---

## Repository layout

```
Aretide/
├── README.md                 ← You are here (doc index)
├── AGENTS.md                 ← AI agent guide (production standards, tests, security)
├── .env.dev                  ← Dev env (ARETIDE_ENV=dev)
├── src/                      ← React / TanStack Start frontend
├── backend/                  ← Django REST API
│   ├── README.md             ← Backend setup, API list, HIPAA notes
│   ├── DATABASE.md           ← Tables, schema decisions, data flow
│   ├── HOSTING.md            ← Heroku Shield (pending BAA) vs AWS EC2
│   └── deploy/aws.md         ← AWS EC2 deployment outline
├── docs/
│   ├── LOCAL-DEV.md                    ← Docker local dev (required for backend)
│   ├── DEPLOY-FRONTEND.md              ← GitHub Pages + aretide.com deploy guide
│   ├── archived-marketing-pages.md   ← Removed marketing nav + pages (restore guide)
│   └── archived-marketing/           ← Full source copies from pre-MVP site
├── scripts/
│   └── dev-backend.sh                ← Starts backend via Docker Compose
├── deploy-frontend-prod.sh           ← Publish frontend to gh-pages
└── Starting Point/
    └── launchPlan.md         ← 20-step MVP launch plan (Steps 1–12 = ship; 13–20 = optimize)
```

---

## Documentation index

### Project & product

| File | Contents |
|------|----------|
| [Starting Point/launchPlan.md](Starting%20Point/launchPlan.md) | **20-step MVP launch plan** — turnkey partner first; Steps 1–12 required to launch; offerings, unit economics, risks in appendices |
| [docs/archived-marketing-pages.md](docs/archived-marketing-pages.md) | **Removed marketing site** — nav links, page content, and step-by-step restore instructions for `/pricing`, `/switch`, `/insurance`, `/clinicians`, `/safety`, `/faq`, `/learn`, full `/how-it-works` |

### Development

| File | Contents |
|------|----------|
| [docs/LOCAL-DEV.md](docs/LOCAL-DEV.md) | **Local dev with Docker** — prerequisites, first-time setup, daily commands, troubleshooting |

### Frontend (React / TanStack Start)

| File | Contents |
|------|----------|
| [src/routes/README.md](src/routes/README.md) | File-based routing conventions (`__root.tsx`, dynamic routes, no `src/pages/`) |
| [src/lib/types/mvp.ts](src/lib/types/mvp.ts) | TypeScript types shared with the API (users, intake, consent, etc.) |
| [src/lib/api/client.ts](src/lib/api/client.ts) | API client — calls Django when `VITE_API_URL` is set |
| [src/lib/safety-flags.ts](src/lib/safety-flags.ts) | Client-side safety flag logic (mirrored in backend) |

**Key frontend routes:** See [src/routes/README.md](src/routes/README.md) for the Step 1–8 route map (`/`, `/qualify`, `/intake`, `/consent`, `/dashboard`, `/admin`).

### Backend (Django + DRF)

| File | Contents |
|------|----------|
| [backend/README.md](backend/README.md) | **How to run the backend** (Docker), API endpoints, roles, HIPAA technical safeguards |
| [backend/DATABASE.md](backend/DATABASE.md) | **All database tables**, relationships, design decisions, JSON vs columns, API/type mapping |
| [backend/HOSTING.md](backend/HOSTING.md) | **Production hosting** — Heroku Shield (pending BAA) vs AWS EC2 |
| [backend/deploy/aws.md](backend/deploy/aws.md) | AWS EC2 production deployment (RDS, S3, ALB, BAA) |

### Configuration

| File | Contents |
|------|----------|
| `.env.dev` | `VITE_API_URL`, `DATABASE_URL`, `FERNET_KEY`, AWS/S3, CORS (see `backend/README.md` for staging/production) |
| [.env.production.example](.env.production.example) | Production `VITE_API_URL` for frontend deploy |

### Deployment

| File | Contents |
|------|----------|
| [docs/DEPLOY-FRONTEND.md](docs/DEPLOY-FRONTEND.md) | **GitHub Pages + aretide.com** — one-time setup and `deploy-frontend-prod.sh` |

---

## First-time setup

Do this once before using the [one-command launch](#already-installed-run-these) above. See **[docs/LOCAL-DEV.md](docs/LOCAL-DEV.md)** for the full guide.

### 0. Docker Desktop

Install and start [Docker Desktop](https://www.docker.com/products/docker-desktop/) — **required** for the backend.

### 1. Frontend dependencies

```bash
npm install
```

### 2. Environment

Create `.env.dev` at the repo root. Set `VITE_API_URL=/api` (Vite proxies to the API) and generate `FERNET_KEY`. The backend and frontend both use `ARETIDE_ENV` (default `dev`) to load `.env.dev`. A legacy root `.env` still works as a fallback overlay.

### 3. Backend (Docker)

Build and start Postgres + API (first run downloads images):

```bash
npm run dev:backend
```

In a **second terminal**, run migrations and create an admin user:

```bash
docker compose -f backend/docker-compose.yml exec api python manage.py migrate
docker compose -f backend/docker-compose.yml exec api python manage.py createsuperuser
```

After that, day-to-day dev is `npm run dev` + `npm run dev:backend` in two terminals.

---

## Frontend

**Stack:** React 19, TanStack Start, TanStack Router, Tailwind, shadcn/ui.

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (http://localhost:8080/) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

---

## Backend

**Stack:** Django 5, Django REST Framework (DRF), PostgreSQL 16 (Docker), Token auth.

Local dev requires **Docker** — see [docs/LOCAL-DEV.md](docs/LOCAL-DEV.md).

| Command | Purpose |
|---------|---------|
| `npm run dev:backend` | Start API + Postgres via Docker Compose |
| `docker compose -f backend/docker-compose.yml exec api python manage.py migrate` | Apply DB migrations |
| `docker compose -f backend/docker-compose.yml exec api python manage.py createsuperuser` | Create admin user |

API health check: http://localhost:8000/api/health/  
API docs: http://localhost:8000/api/docs/

Production: **AWS EC2** ([backend/deploy/aws.md](backend/deploy/aws.md)) or **Heroku Shield** if BAA confirmed ([backend/HOSTING.md](backend/HOSTING.md))

---

## Frontend ↔ API

1. Create or edit `.env.dev` at the repo root (`ARETIDE_ENV=dev` is the default; a legacy root `.env` still works as a fallback overlay).
2. Set `ARETIDE_ENV=dev` and `VITE_API_URL=/api` (Vite proxies API requests to `localhost:8000` in dev).
3. Generate `FERNET_KEY` for the backend.
4. Restart both servers after changing env vars.

**Environment switching:** `ARETIDE_ENV` selects `.env.dev`, `.env.staging`, or `.env.production`. Frontend npm scripts map to Vite modes: `npm run dev` → dev, `npm run build:staging` → staging, `npm run build` → production.

PHI must **never** be stored in `localStorage` or `sessionStorage`. When `VITE_API_URL` is set, the frontend sends PHI to the API. A temporary `localStorage` fallback in the prototype will be removed.

**Pre-account eligibility:** Visitors answer several quiz steps before registering. Progress is persisted **server-side** and tied to the browser via an `HttpOnly` funnel cookie — not `localStorage`, not IP address. Registration claims that draft and attaches it to the new user. Full requirements: [backend/DATABASE.md — Anonymous funnel session](backend/DATABASE.md#anonymous-funnel-session-pre-account).

---

## Where to deploy the backend (PHI — Protected Health Information)

**PHI** means patient-identifying health data: names, contact info, dates of birth, questionnaire answers, uploaded documents, and similar records. **Do not use standard Heroku for real patient data.**

| Option | PHI-safe? (Protected Health Information) | Summary |
|--------|-----------|---------|
| **Local Docker** | No | Development and fake data only — [docs/LOCAL-DEV.md](docs/LOCAL-DEV.md) |
| **Heroku Shield + BAA** | Yes, if contracted | Alternate if Salesforce confirms Shield + BAA |
| **Standard Heroku** | **No** | Not permitted for PHI (Protected Health Information) |
| **AWS EC2 + RDS + S3 + BAA** | Yes | **Planned production path** — [backend/deploy/aws.md](backend/deploy/aws.md) |

Full research and go/no-go checklist: **[backend/HOSTING.md](backend/HOSTING.md)**

**Current plan:** Develop locally with Docker. Complete Heroku BAA inquiry in parallel. **Default production to AWS EC2** unless Heroku Shield + BAA is confirmed and preferred.

---

## For AI agents

**Start here:** **[AGENTS.md](AGENTS.md)** — production mindset, architecture, testing requirements, security checklist, and workflow.

| Topic | Read first |
|-------|------------|
| Agent engineering guide (tests, validation, PHI) | **`AGENTS.md`** |
| HIPAA compliance checklist for agents | **`docs/HIPAA.md`** |
| Input validation & attack-payload tests | `docs/INPUT_VALIDATION_TESTS.md` |
| Database schema / tables / why JSON | `backend/DATABASE.md` |
| Canonical field ownership (no duplicate storage) | `backend/DATABASE.md#canonical-field-ownership-no-duplicates` |
| Pre-account funnel session (cookie + server draft) | `backend/DATABASE.md#anonymous-funnel-session-pre-account` |
| Run backend, API routes, auth | `backend/README.md`, `docs/LOCAL-DEV.md` |
| Production hosting, HIPAA infra | `backend/HOSTING.md` |
| AWS EC2 deploy | `backend/deploy/aws.md` |
| Frontend routes | `src/routes/README.md` |
| API ↔ frontend types | `src/lib/types/mvp.ts`, `src/lib/api/client.ts` |
| MVP launch plan (build order, success criteria) | `Starting Point/launchPlan.md` |
| Restore archived marketing pages / nav | `docs/archived-marketing-pages.md` |
| Env vars | `.env.dev`, `.env.staging`, `.env.production` — `backend/README.md` |

**Do not** treat local Docker or browser `localStorage` as HIPAA-compliant storage for PHI (Protected Health Information).

---

## Related links (internal)

- [docs/LOCAL-DEV.md](docs/LOCAL-DEV.md)
- [backend/README.md](backend/README.md)
- [backend/DATABASE.md](backend/DATABASE.md)
- [backend/HOSTING.md](backend/HOSTING.md)
- [backend/deploy/aws.md](backend/deploy/aws.md)
- [src/routes/README.md](src/routes/README.md)
- [Starting Point/launchPlan.md](Starting%20Point/launchPlan.md)
- [docs/archived-marketing-pages.md](docs/archived-marketing-pages.md)
