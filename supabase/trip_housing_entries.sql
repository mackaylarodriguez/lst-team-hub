-- Extra team housing links/PDFs beyond trip_budgets.housing_link / housing_pdf_url (multiple per trip).

create table if not exists public.trip_housing_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  sort_order int not null default 0,
  label text,
  housing_link text,
  housing_pdf_url text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists trip_housing_entries_trip_id_idx
  on public.trip_housing_entries (trip_id);

create index if not exists trip_housing_entries_trip_sort_idx
  on public.trip_housing_entries (trip_id, sort_order);

comment on table public.trip_housing_entries is 'Additional housing URLs/PDFs for a trip; primary housing stays on trip_budgets.';
