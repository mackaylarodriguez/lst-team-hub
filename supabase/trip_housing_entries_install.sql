-- One-shot install for multiple housing slots on the Budget page.
-- Prerequisite: run `trip_budgets_rls.sql` first so `private.current_profile_role()` exists
-- (same helper used for trip_budgets RLS).

-- === From trip_housing_entries.sql ===

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

-- === From trip_housing_entries_rls.sql ===

alter table public.trip_housing_entries enable row level security;

drop policy if exists "trip_housing_entries_select_access" on public.trip_housing_entries;
create policy "trip_housing_entries_select_access"
on public.trip_housing_entries for select to authenticated
using (private.current_profile_role() in ('admin', 'staff'));

drop policy if exists "trip_housing_entries_insert_access" on public.trip_housing_entries;
create policy "trip_housing_entries_insert_access"
on public.trip_housing_entries for insert to authenticated
with check (private.current_profile_role() in ('admin', 'staff'));

drop policy if exists "trip_housing_entries_update_access" on public.trip_housing_entries;
create policy "trip_housing_entries_update_access"
on public.trip_housing_entries for update to authenticated
using (private.current_profile_role() in ('admin', 'staff'))
with check (private.current_profile_role() in ('admin', 'staff'));

drop policy if exists "trip_housing_entries_delete_access" on public.trip_housing_entries;
create policy "trip_housing_entries_delete_access"
on public.trip_housing_entries for delete to authenticated
using (private.current_profile_role() in ('admin', 'staff'));
