# Deployment Runbook
1. Protect main branch and require CI.
2. Configure preview, staging and production separately.
3. Keep secrets in Vercel or a dedicated vault.
4. Run migrations before traffic promotion.
5. Verify `/api/health/live`, `/api/health/ready`, authentication and market-data freshness.
6. Keep live execution disabled for the first production release.
7. Promote gradually and monitor errors, latency and reconciliation.
8. Roll back immediately on order-state inconsistency.
