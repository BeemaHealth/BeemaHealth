# AWS (Amazon Web Services) deployment outline (HIPAA fallback)

> **Documentation index:** [../../README.md](../../README.md) — links to all project docs (includes acronym glossary).

**BAA** = Business Associate Agreement. **HIPAA** = Health Insurance Portability and Accountability Act.

Use when Heroku Shield + BAA is unavailable. See [HOSTING.md](../HOSTING.md).

## Prerequisites

1. Sign AWS BAA via AWS Artifact
2. Create **VPC** (Virtual Private Cloud) with private subnets for RDS and ECS tasks
3. Enable encryption on **RDS** (Relational Database Service) PostgreSQL 16
4. Create **S3** (Simple Storage Service) bucket with default **SSE-KMS** (Server-Side Encryption with AWS Key Management Service) encryption
5. Store secrets in AWS Secrets Manager (`SECRET_KEY`, `FERNET_KEY`, `DATABASE_URL`)

## Environment variables (ECS task / EB)

**ECS** = Elastic Container Service. **EB** = Elastic Beanstalk.

```
DEBUG=false
HOSTING_TARGET=aws
DATABASE_SSL_REQUIRE=true
SECURE_SSL_REDIRECT=true
# CORS = Cross-Origin Resource Sharing
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
AWS_STORAGE_BUCKET_NAME=aretide-phi-documents
AWS_S3_REGION_NAME=us-west-2
```

## Deploy steps (high level)

1. Build and push Docker image to **ECR** (Elastic Container Registry)
2. Run RDS migrations via one-off ECS task: `python manage.py migrate`
3. Deploy ECS service behind **ALB** (Application Load Balancer) with **ACM** (AWS Certificate Manager) **TLS** (Transport Layer Security) certificate
4. Point frontend `VITE_API_URL` to `https://api.your-domain.com/api`

## Ongoing compliance

- Enable CloudTrail and VPC flow logs
- Restrict security groups (ALB → ECS → RDS only)
- Rotate `FERNET_KEY` and database credentials per policy
- Review `audit_events` table regularly
