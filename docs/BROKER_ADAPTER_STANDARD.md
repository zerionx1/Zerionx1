# Broker Adapter Standard

Every adapter must isolate credentials in a secrets vault, support idempotent submissions, normalize statuses, expose health, honour rate limits, and provide authoritative order/position snapshots. Public-data access never implies permission to place live orders. Broker and exchange KYC rules remain applicable.
