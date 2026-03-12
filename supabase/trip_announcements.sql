create table if not exists public.trip_announcements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  message text not null,
  author_name text,
  author_email text,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create index if not exists trip_announcements_trip_id_idx
  on public.trip_announcements (trip_id);
