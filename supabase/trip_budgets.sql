create table if not exists public.trip_budgets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  team_name text,
  project_start_date date,
  project_end_date date,
  site_country text,
  site_city text,
  team_accountant text,
  budget_amount text,
  returned_amount text,
  housing_amount text,
  notes text,
  num_workers integer,
  tshirts text,
  workbooks text,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  unique(trip_id)
);

create index if not exists trip_budgets_trip_id_idx on public.trip_budgets (trip_id);
