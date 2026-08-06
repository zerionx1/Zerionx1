alter table public.watchlists
  add column if not exists description text not null default '',
  add column if not exists color text not null default 'champagne',
  add column if not exists sort_order integer not null default 0;

create index if not exists watchlists_owner_sort
on public.watchlists(owner_id, sort_order, created_at);

create unique index if not exists watchlists_owner_name_unique
on public.watchlists(owner_id, lower(name));
