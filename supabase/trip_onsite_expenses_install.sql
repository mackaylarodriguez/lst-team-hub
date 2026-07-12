-- On-site expense line items for Budget → On-site expenses tab.
-- Run in Supabase SQL editor, then add RLS policies matching trip_tickets if needed.

create table if not exists public.trip_onsite_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  description text,
  amount text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trip_onsite_expenses_trip_id_idx
  on public.trip_onsite_expenses (trip_id);

alter table public.trip_onsite_expenses enable row level security;
