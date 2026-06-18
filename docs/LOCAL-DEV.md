# Local development (Docker)

> **Documentation index:** [../README.md](../README.md)

All developers run the **same backend stack** via Docker Compose: **PostgreSQL 16** + **Python 3.12** + Django. This avoids machine-specific drift (Homebrew Postgres versions, system Python, venv paths) and matches the **production container** deployed to AWS EC2.

The frontend runs on the host with Node.js (`npm run dev`). Only the backend is containerized locally.

## Prerequisites

Install these once on every machine:

| Tool | Purpose | Install |
|------|---------|---------|
| **Docker Desktop** | Backend API + Postgres | See [Install Docker Desktop](#install-docker-desktop) below |
| **Node.js 20+** | Frontend (Vite) | [nodejs.org](https://nodejs.org/) or `brew install node` |

### Install Docker Desktop

Docker cannot be installed automatically by `npm run dev:backend` — it is a system app that needs your password, license acceptance, and a one-time GUI setup.

**macOS (Homebrew — recommended):**

```bash
brew install --cask docker
open -a Docker
```

Wait until the Docker whale icon in the menu bar stops animating (Docker is running). Then verify:

```bash
docker --version
docker compose version
```

**macOS (direct download):** [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/)

**After install:** Docker Desktop must be **running** before `npm run dev:backend`.

Verify all prerequisites:

```bash
docker --version
docker compose version
node --version
npm --version
```

Docker Desktop must be **running** before starting the backend.

## First-time setup

From the repo root:

```bash
npm install
```

Create or edit `.env.dev` at the repo root (`ARETIDE_ENV=dev` is the default):

- `ARETIDE_ENV=dev`
- `VITE_API_URL=/api` (proxied to the API in dev)
- `FERNET_KEY` — generate with:
  ```bash
  python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  ```

Build and start the backend (first run downloads images and builds the API container):

```bash
npm run dev:backend
```

In a **second terminal**, run migrations and create an admin user:

```bash
docker compose -f backend/docker-compose.yml exec api python manage.py migrate
docker compose -f backend/docker-compose.yml exec api python manage.py createsuperuser
```

Start the frontend in a **third terminal**:

```bash
npm run dev
```

Open http://localhost:8080/ (frontend) and http://localhost:8000/api/health/ (backend).

## Day-to-day commands

Open **two terminals** from the repo root:

| Terminal | Command | URL |
|----------|---------|-----|
| Frontend | `npm run dev` | http://localhost:8080/ |
| Backend | `npm run dev:backend` | http://localhost:8000/api/health/ |

### Other useful commands

```bash
# Apply new migrations after pulling code
docker compose -f backend/docker-compose.yml exec api python manage.py migrate

# Django shell
docker compose -f backend/docker-compose.yml exec api python manage.py shell

# Stop backend containers (Ctrl+C in the backend terminal, or)
docker compose -f backend/docker-compose.yml down

# Rebuild after dependency changes in backend/requirements/
docker compose -f backend/docker-compose.yml up --build
```

## What Docker runs locally

Defined in `backend/docker-compose.yml`:

| Service | Image | Port |
|---------|-------|------|
| `db` | `postgres:16-alpine` | 5432 |
| `api` | Built from `backend/Dockerfile` (dev command: `runserver`) | 8000 |

Postgres data persists in a Docker volume (`postgres_data`) across restarts.

## Relationship to production

| | Local (`docker-compose`) | Production (AWS EC2) |
|--|--------------------------|----------------------|
| App image | Same `backend/Dockerfile` base | Same `backend/Dockerfile` |
| App server | Django `runserver` (dev only) | **gunicorn** (from Dockerfile `CMD`) |
| Database | Postgres container | **RDS** PostgreSQL 16 |
| TLS / domain | None | ALB or reverse proxy + ACM |

See [backend/deploy/aws.md](../backend/deploy/aws.md) for production deployment.

## Troubleshooting

### `docker: command not found`

Install and start [Docker Desktop](https://www.docker.com/products/docker-desktop/), then retry.

### Port 8000 already in use

Another process (often a leftover backend) is using the port:

```bash
lsof -ti:8000 | xargs kill
```

Then run `npm run dev:backend` again.

### Port 5432 already in use

Another Postgres instance (e.g. Homebrew) is bound to 5432. Stop it:

```bash
brew services stop postgresql@15   # or your installed version
```

Or change the host port mapping in `backend/docker-compose.yml` (not recommended for team consistency).

### Frontend cannot reach the API

Confirm `.env.dev` has `VITE_API_URL=/api` and restart `npm run dev` after changing env vars.

### `FERNET_KEY` / encryption errors

Ensure `FERNET_KEY` is set in the repo root `.env.dev`. `npm run dev:backend` passes it via `--env-file .env.dev` (when `ARETIDE_ENV=dev`).

### Email verification during signup

After creating an account at `/qualify`, check Docker logs for the verification link:

```bash
docker compose -f backend/docker-compose.yml logs -f api
```

Look for `Email verification link for …` and open that URL. Intake (`/intake`) requires `email_verified=true`.
