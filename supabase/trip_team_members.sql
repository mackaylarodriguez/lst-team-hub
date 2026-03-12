create table if not exists public.trip_team_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  start_date date,
  end_date date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists trip_team_members_trip_id_idx
  on public.trip_team_members (trip_id);

create index if not exists trip_team_members_email_idx
  on public.trip_team_members (lower(email));
