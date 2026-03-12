create table if not exists public.trip_overview_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips(id) on delete cascade,
  note text,
  updated_at timestamp with time zone default now()
);
