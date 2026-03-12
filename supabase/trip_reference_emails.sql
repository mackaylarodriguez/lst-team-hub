create table if not exists public.trip_reference_emails (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reference_name text,
  reference_email text,
  reference_phone text,
  sent boolean not null default false,
  received boolean not null default false,
  sent_date date,
  updated_at timestamp with time zone default now()
);

create unique index if not exists trip_reference_emails_unique_idx
  on public.trip_reference_emails (trip_id, user_id);
