# Hosting Go/No-Go: Heroku Shield vs AWS

> **Documentation index:** [../README.md](../README.md) — links to all project docs (includes acronym glossary).

**AWS** = Amazon Web Services. **BAA** = Business Associate Agreement. **PHI** = **Protected Health Information** — any health data tied to an identifiable patient (name, date of birth, phone, intake answers, uploaded labs/ID, etc.).

**Status:** Decision required before production PHI.

## Heroku

| Requirement | Detail |
|-------------|--------|
| PHI-safe tier | **Heroku Shield only** (Private Space, Shield Dynos, Shield Postgres) — required for Protected Health Information |
| BAA | Signed Business Associate Agreement with Salesforce |
| Standard Heroku | **Not permitted for PHI** (Protected Health Information) |

### Action items

1. Open a Salesforce/Heroku support ticket: request **Shield + BAA** for a new telehealth account
2. Confirm pricing (Shield is significantly more expensive than standard Heroku)
3. As of early 2026, verify whether **new enterprise/BAA contracts** are available to new customers

### If approved

- Set `HOSTING_TARGET=heroku_shield` in production env
- Use only Shield-tier add-ons for any service touching PHI
- Deploy via `Procfile` with `release: python manage.py migrate`

## AWS (Amazon Web Services) (fallback)

Use if Heroku BAA is unavailable or cost-prohibitive.

| Component | Service |
|-----------|---------|
| API (Application Programming Interface) | **ECS** (Elastic Container Service) Fargate or Elastic Beanstalk |
| Database | **RDS** (Relational Database Service) PostgreSQL 16 (encryption at rest enabled) |
| Documents | **S3** (Simple Storage Service) with **SSE-KMS** (Server-Side Encryption with AWS Key Management Service) |
| Secrets | Secrets Manager |
| TLS (Transport Layer Security) | **ACM** (AWS Certificate Manager) + **ALB** (Application Load Balancer) |
| Audit | CloudTrail + application `audit_events` table |

### Action items

1. Create AWS account and sign **AWS BAA** (AWS Artifact)
2. Deploy to `us-west-2` (close to Colorado)
3. Set `HOSTING_TARGET=aws`
4. Enable `DATABASE_SSL_REQUIRE=true` and `SECURE_SSL_REDIRECT=true`

## Current recommendation

Build and test locally with Docker Compose (no real PHI). Complete the Heroku BAA inquiry in parallel. **Default to AWS if Heroku cannot offer a BAA within 2 weeks.**

## Record decision

| Date | Decision | Notes |
|------|----------|-------|
| | | |
