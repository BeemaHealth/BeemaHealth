# Hosting Go/No-Go: Heroku Shield vs AWS EC2

> **Documentation index:** [../README.md](../README.md) — links to all project docs (includes acronym glossary).

**AWS** = Amazon Web Services. **BAA** = Business Associate Agreement. **EC2** = Amazon Elastic Compute Cloud. **PHI** = **Protected Health Information** — any health data tied to an identifiable patient (name, date of birth, phone, intake answers, uploaded labs/ID, etc.).

**Status:** Heroku BAA inquiry in progress. **Default production plan: AWS EC2** (see [deploy/aws.md](./deploy/aws.md)).

## Heroku (alternate — pending BAA response)

| Requirement | Detail |
|-------------|--------|
| PHI-safe tier | **Heroku Shield only** (Private Space, Shield Dynos, Shield Postgres) |
| BAA | Signed Business Associate Agreement with Salesforce |
| Standard Heroku | **Not permitted for PHI** |

### Action items

1. Open a Salesforce/Heroku support ticket: request **Shield + BAA** for a new telehealth account
2. Confirm pricing (Shield is significantly more expensive than standard Heroku)
3. As of early 2026, verify whether **new enterprise/BAA contracts** are available to new customers

### If approved

- Set `HOSTING_TARGET=heroku_shield` in production env
- Use only Shield-tier add-ons for any service touching PHI
- Deploy via `Procfile` with `release: python manage.py migrate`

## AWS EC2 (planned production path)

Use when Heroku BAA is unavailable, declined, or cost-prohibitive. **We are not using Elastic Beanstalk, ECS, or Fargate** for this project.

| Component | Service |
|-----------|---------|
| API | **EC2** running the production Docker image (`backend/Dockerfile`) |
| Database | **RDS** PostgreSQL 16 (encryption at rest enabled) |
| Documents | **S3** with **SSE-KMS** |
| TLS | **ACM** + **ALB** in front of EC2 |
| Secrets | Secrets Manager |
| Audit | CloudTrail + application `audit_events` table |

HIPAA requires a **signed AWS BAA**, encryption, access controls, and administrative safeguards — not a specific compute product like ECS. EC2 with RDS and S3 is a standard HIPAA-eligible architecture when configured correctly.

### Action items

1. Create AWS account and sign **AWS BAA** (AWS Artifact)
2. Deploy to `us-west-2` (close to Colorado)
3. Set `HOSTING_TARGET=aws`
4. Enable `DATABASE_SSL_REQUIRE=true` and `SECURE_SSL_REDIRECT=true`
5. Follow [deploy/aws.md](./deploy/aws.md)

## Local development

All developers use **Docker Compose** for the backend so every machine runs the same Postgres 16 + Python 3.12 stack. See [docs/LOCAL-DEV.md](../docs/LOCAL-DEV.md).

Local Docker is **not** HIPAA-compliant — use fake data only.

## Current recommendation

1. **Develop locally** with Docker Compose ([docs/LOCAL-DEV.md](../docs/LOCAL-DEV.md))
2. **Complete Heroku BAA inquiry** in parallel
3. **Plan production on AWS EC2** unless Heroku Shield + BAA is confirmed and preferred
4. Sign AWS BAA before any real PHI reaches production infrastructure

## Record decision

| Date | Decision | Notes |
|------|----------|-------|
| | | |
