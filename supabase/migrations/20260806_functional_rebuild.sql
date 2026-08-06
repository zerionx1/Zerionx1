create table if not exists public.trade_journal (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null, side text not null check (side in ('buy','sell')), quantity numeric not null check (quantity>0),
  entry_price numeric not null check (entry_price>=0), exit_price numeric, pnl numeric, notes text not null default '',
  tags jsonb not null default '[]'::jsonb, opened_at timestamptz not null default now(), closed_at timestamptz
);
alter table public.trade_journal enable row level security;
drop policy if exists owner_all on public.trade_journal;
create policy owner_all on public.trade_journal for all using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create index if not exists trade_journal_owner_opened on public.trade_journal(owner_id,opened_at desc);
