# Architecture Baseline
- Next.js App Router serves public, workspace and admin surfaces.
- Server-only modules own secrets and privileged logic.
- API responses use typed envelopes and request IDs.
- Money-sensitive functionality will use durable intent, idempotency and reconciliation services in later phases.
- Vercel hosts the web/control plane; continuous market ingestion and execution workers are separate durable services when introduced.
