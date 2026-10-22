# Docker deployment

## Run locally

Copy `.env.example` to `.env`, fill in valid application credentials, then run:

```sh
docker compose up --build
```

Compose starts the API, PostgreSQL with pgvector, and Redis. The API applies Prisma migrations at startup, including the migration that enables the `vector` extension. PostgreSQL and Redis data are stored in named volumes and survive container restarts and replacement. `docker compose down -v` removes the volumes and permanently deletes their data.

The API image uses Alpine, installs OpenSSL for Prisma's musl-based Linux engines, and grants the runtime user write access to Prisma's engine directory. The app service's `env_file` passes `.env` into the container; `--env-file .env` supplies values for Compose-file interpolation. The local Redis service is standalone and does not use TLS, so Compose configures `REDIS_CLUSTER=false` and `REDIS_TLS=false`. Rebuild and recreate the API after changing application code or the Dockerfile with `docker compose --env-file .env up -d --build --force-recreate app`.

The Compose database credentials are only for local development. Do not deploy that database configuration to AWS.

## Publish and run on AWS

Build the API image with `docker build -t ecommerce-api .`, then tag and push it to your ECR repository using the AWS ECR login/tag/push commands for your account and region. ECR stores images; it does not run containers, provide their environment variables, or persist database files.

Run the image with ECS/Fargate (or another container service). Configure the application variables declared in `src/config/env.ts` in the ECS task definition. Inject credentials through AWS Secrets Manager or SSM Parameter Store rather than baking them into the image. `DATABASE_URL` must point to a PostgreSQL database where the `vector` extension is available. For durable production storage, use RDS for PostgreSQL with pgvector support and automated backups. Do not put the production database inside the disposable API container. Point `REDIS_HOST` at a managed Redis endpoint such as ElastiCache.

The image defaults to port 3000; map the ECS container port accordingly. The container runs Prisma migrations before starting the API, so its database user needs permission to apply schema changes and create the required extension (or an administrator should enable pgvector before deployment).

## Runtime environment variables

Required by the app unless a default is shown in parentheses:

- `NODE_ENV` (`development`), `PORT` (3000), `DATABASE_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `CLIENT_URL` (http://localhost:3000)
- `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GEMINI_API_MODEL` (`gemini-embedding-001`)
- `REDIS_HOST` (127.0.0.1), `REDIS_PORT` (6379), `REDIS_PASSWORD` (optional), `REDIS_DB` (0), `REDIS_TLS` (`false`; set to `true` for TLS-enabled Redis endpoints), `REDIS_CLUSTER` (`false`; set to `true` only when connecting to a Redis Cluster)
- `SMTP_HOST`, `SMTP_PORT` (465), `SMTP_SECURE` (false), `SMTP_USER`, `SMTP_PASS`
- `PAYMENT_GATEWAY` (`RAZORPAY`), `PAYMENT_KEY_ID`, `PAYMENT_KEY_SECRET`, `PAYMENT_WEBHOOK_SECRET`
- `GROQ_API_KEY`, `GROQ_MODEL`

`KAFKA_BROKERS` and `KAFKA_CLIENT_ID` appear in the existing `.env` but are not read by the current application configuration.
