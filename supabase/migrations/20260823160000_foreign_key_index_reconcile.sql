create index if not exists algo_deployments_broker_connection_id_idx
on public.algo_deployments(broker_connection_id);

create index if not exists algo_deployments_strategy_id_idx
on public.algo_deployments(strategy_id);

create index if not exists algo_observations_deployment_id_idx
on public.algo_observations(deployment_id);

create index if not exists audit_events_actor_id_idx
on public.audit_events(actor_id);

create index if not exists execution_approvals_deployment_id_idx
on public.execution_approvals(deployment_id);

create index if not exists paper_orders_account_id_idx
on public.paper_orders(account_id);

create index if not exists paper_positions_owner_id_idx
on public.paper_positions(owner_id);

create index if not exists payment_requests_reviewed_by_idx
on public.payment_requests(reviewed_by);

create index if not exists platform_settings_updated_by_idx
on public.platform_settings(updated_by);

create index if not exists price_alerts_owner_id_idx
on public.price_alerts(owner_id);

create index if not exists user_notifications_opportunity_id_idx
on public.user_notifications(opportunity_id);
