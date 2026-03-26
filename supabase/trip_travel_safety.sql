-- One row per trip: travel & safety content and global content version.
create table if not exists public.trip_travel_safety (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  entry_requirements text,
  entry_last_verified_date date,
  safety_security text,
  safety_last_verified_date date,
  reference_links text,
  content_version integer not null default 1,
  updated_at timestamp with time zone default now()
);

create index if not exists trip_travel_safety_updated_at_idx
  on public.trip_travel_safety (updated_at desc);
