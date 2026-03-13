create table if not exists public.trip_activity (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  actor_email text,
  event_type text not null,
  message text not null,
  created_at timestamp with time zone not null default now()
);

create index if not exists trip_activity_trip_id_idx
  on public.trip_activity (trip_id, created_at desc);
