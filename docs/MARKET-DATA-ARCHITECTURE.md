# Market Data Architecture

The domain layer is provider-neutral. `QuoteStore` is the boundary between UI/API code and future provider adapters. Phase 2 ships a deterministic sample store so workflows can be developed without misrepresenting sample values as live data.

Future production adapters must implement authentication, entitlement checks, rate-limit handling, sequence validation, stale-feed detection, clock drift monitoring and provider failover.
