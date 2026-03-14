create table if not exists public.recruiting_saved_filters (
  id uuid primary key default gen_random_uuid(),
  recruiting_year integer not null,
  filter_name text not null,
  filter_config jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists recruiting_saved_filters_year_idx
  on public.recruiting_saved_filters (recruiting_year, created_at desc);
