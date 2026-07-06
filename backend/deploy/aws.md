# AWS (Amazon Web Services) deployment outline — EC2

> **Documentation index:** [../../README.md](../../README.md) — links to all project docs (includes acronym glossary).

**BAA** = Business Associate Agreement. **HIPAA** = Health Insurance Portability and Accountability Act. **EC2** = Amazon Elastic Compute Cloud.

**Planned production path:** Django API in a **Docker container** on **EC2**, with **RDS** PostgreSQL and **S3** for documents. Heroku Shield remains an alternate if a BAA is confirmed — see [HOSTING.md](../HOSTING.md).

HIPAA does **not** require ECS, Fargate, or Elastic Beanstalk. A properly configured EC2 instance with encryption, access controls, and a signed AWS BAA is a valid approach.

## Architecture

| Component | Service |
|-----------|---------|
| API | **EC2** instance running the production Docker image (`backend/Dockerfile` → gunicorn) |
| Database | **RDS** (Relational Database Service) PostgreSQL 16 — encryption at rest enabled |
| Documents | **S3** (Simple Storage Service) with **SSE-KMS** (Server-Side Encryption with AWS Key Management Service) |
| TLS (Transport Layer Security) | **ACM** (AWS Certificate Manager) + **ALB** (Application Load Balancer) → EC2 |
| Secrets | AWS Secrets Manager or SSM Parameter Store |
| Network | **VPC** (Virtual Private Cloud) — private subnet for RDS; EC2 in public or private subnet with ALB ingress |
| Audit | CloudTrail + application `audit_events` table |

```
Internet → ALB (HTTPS) → EC2 (Docker: gunicorn :8000) → RDS (PostgreSQL)
                              ↓
                             S3 (document uploads)
```

## Prerequisites

1. Sign **AWS BAA** via AWS Artifact (required before real PHI)
2. Create **VPC** with public subnet(s) for ALB/EC2 and private subnet for RDS
3. Provision **RDS** PostgreSQL 16 with encryption at rest and automated backups
4. Create **S3** bucket with default **SSE-KMS** encryption
5. Store secrets in Secrets Manager: `SECRET_KEY`, `FERNET_KEY`, `DATABASE_URL`
6. Launch **EC2** instance (Amazon Linux 2023 or Ubuntu LTS); install Docker

## Environment variables (production)

Set on the EC2 host (env file, Secrets Manager pull at boot, or orchestration script):

```
DEBUG=false
HOSTING_TARGET=aws
SECRET_KEY=<from-secrets-manager>
FERNET_KEY=<from-secrets-manager>
DATABASE_URL=postgres://<user>:<pass>@<rds-endpoint>:5432/aretide
DATABASE_SSL_REQUIRE=true
SECURE_SSL_REDIRECT=true
# CORS = Cross-Origin Resource Sharing
CORS_ALLOWED_ORIGINS=https://beemahealth.com,https://www.beemahealth
AWS_STORAGE_BUCKET_NAME=beemahealth-phi-documents
AWS_S3_REGION_NAME=us-west-2
AWS_ACCESS_KEY_ID=<instance-role-preferred>
AWS_SECRET_ACCESS_KEY=<instance-role-preferred>
```

Prefer an **IAM instance role** for S3 access instead of long-lived access keys.

## Deploy steps (high level)

1. **Build** the production image locally or in CI:
   ```bash
   docker build -t beemahealth-api:latest backend/
   ```
2. **Transfer** the image to EC2 (push to ECR and pull on EC2, or `docker save` / `docker load` for early setups)
3. **Run migrations** once against RDS:
   ```bash
   docker run --rm --env-file /path/to/prod.env beemahealth-api:latest python manage.py migrate --noinput
   ```
4. **Start the API** on EC2 (systemd unit, `docker run -d`, or a small `docker-compose.prod.yml`):
   ```bash
   docker run -d --name beemahealth-api --restart unless-stopped \
     -p 8000:8000 --env-file /path/to/prod.env beemahealth-api:latest
   ```
5. Configure **ALB** target group → EC2:8000 with **ACM** TLS certificate
6. Point frontend `VITE_API_URL` to `https://api.your-domain.com/api`

## Security groups

| From | To | Port |
|------|-----|------|
| Internet (via ALB) | ALB | 443 |
| ALB | EC2 | 8000 |
| EC2 | RDS | 5432 |
| EC2 | S3 | 443 (via VPC endpoint or NAT) |

Do not expose RDS to the public internet.

## Ongoing compliance

- Enable CloudTrail and VPC flow logs
- Patch EC2 AMI and rotate container images regularly
- Rotate `FERNET_KEY` and database credentials per policy
- Review `audit_events` table regularly
- Restrict SSH to a bastion or SSM Session Manager (no open port 22 from `0.0.0.0/0`)

## Region

Deploy to **us-west-2** (close to Colorado) unless counsel advises otherwise.
