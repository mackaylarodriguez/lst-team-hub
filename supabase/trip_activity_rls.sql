-- Requires: private_trip_access_helpers.sql

alter table public.trip_activity enable row level security;

drop policy if exists "trip_activity_select_access" on public.trip_activity;
create policy "trip_activity_select_access"
on public.trip_activity
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff', 'leader')
  or private.user_is_assigned_or_rostered_for_trip(trip_id)
);

drop policy if exists "trip_activity_insert_access" on public.trip_activity;
create policy "trip_activity_insert_access"
on public.trip_activity
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff', 'leader')
  or private.user_is_assigned_or_rostered_for_trip(trip_id)
);
