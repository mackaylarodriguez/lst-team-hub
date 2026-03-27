create table if not exists public.trip_meetings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text,
  scheduled_at timestamp with time zone not null,
  notes_after text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists trip_meetings_trip_id_scheduled_idx
  on public.trip_meetings (trip_id, scheduled_at);
