# Founder Admin OS Architecture

The Admin OS is a control plane, not a secret store or execution engine. It writes validated configuration and approval records. Runtime services consume versioned configuration with safe defaults. High-risk changes require reason capture, audit events, optional dual approval and rollback metadata.
