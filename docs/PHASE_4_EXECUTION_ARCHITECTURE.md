# Phase 4 Execution Architecture

Live orders use: intent → risk preflight → explicit user confirmation → durable queue → broker adapter → receipt → reconciliation. Vercel serves the UI and control APIs; a durable worker is required for continuous execution and reconciliation. Live execution stays disabled until all production dependencies pass readiness checks.
