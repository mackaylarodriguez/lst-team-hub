-- Same access pattern as trip_budgets: admin/staff manage rows.

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
