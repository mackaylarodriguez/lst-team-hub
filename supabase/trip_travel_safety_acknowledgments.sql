-- One acknowledgment row per participant per trip (version stored; update when re-acknowledging).
create table if not exists public.trip_travel_safety_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  acknowledged_version integer not null,
  acknowledged_at timestamp with time zone not null default now(),
  unique (trip_id, user_id)
);

create index if not exists trip_travel_safety_ack_trip_idx
  on public.trip_travel_safety_acknowledgments (trip_id);

create index if not exists trip_travel_safety_ack_user_idx
  on public.trip_travel_safety_acknowledgments (user_id);
