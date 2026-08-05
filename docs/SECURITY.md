# Security Baseline
No secrets are committed or exposed to browser code. Privileged actions require role checks and later step-up authentication. Logs redact secret-like fields. API routes return request IDs. Live execution stays globally disabled until Phase 5 gates pass.
