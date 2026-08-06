-- ZIP 3 indexes for strategy marketplace, versioning and persisted backtest research.
create index if not exists strategies_owner_status_updated
on public.strategies(owner_id, status, updated_at desc);

create index if not exists strategy_versions_owner_strategy_version
on public.strategy_versions(owner_id, strategy_id, version desc);

create index if not exists backtests_owner_created
on public.backtests(owner_id, created_at desc);
