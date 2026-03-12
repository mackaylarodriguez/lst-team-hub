create table if not exists public.trip_overview_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  note text,
  author_name text,
  author_email text,
  updated_at timestamp with time zone default now()
);

create index if not exists trip_overview_notes_trip_id_idx
  on public.trip_overview_notes (trip_id);
