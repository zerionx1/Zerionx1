alter table public.payment_requests
add column if not exists payment_proof_data text;

alter table public.payment_requests
add column if not exists submitted_from_plan text;

alter table public.payment_requests
add column if not exists requested_plan_name text;
