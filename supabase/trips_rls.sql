-- Requires: private_trip_access_helpers.sql

alter table public.trips enable row level security;

drop policy if exists "trips_select_access" on public.trips;
create policy "trips_select_access"
on public.trips
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or id in (
    select trip_id
    from public.trip_assignments
    where user_id = auth.uid()
  )
  or private.user_is_assigned_or_rostered_for_trip(id)
);

drop policy if exists "trips_insert_access" on public.trips;
create policy "trips_insert_access"
on public.trips
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trips_update_access" on public.trips;
create policy "trips_update_access"
on public.trips
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
)
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trips_delete_access" on public.trips;
create policy "trips_delete_access"
on public.trips
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);
