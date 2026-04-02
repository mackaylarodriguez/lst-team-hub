-- Allow trip participants on trip_team_members (email match) to read and insert trip_activity,
-- not only trip_assignments. Fixes workers completing training / tasks without an assignment row.
-- Requires: private_trip_access_helpers.sql (run first). Then run after trip_activity_rls.sql on existing DBs.

drop policy if exists "trip_activity_select_access" on public.trip_activity;
create policy "trip_activity_select_access"
on public.trip_activity
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or private.user_is_assigned_or_rostered_for_trip(trip_id)
);

drop policy if exists "trip_activity_insert_access" on public.trip_activity;
create policy "trip_activity_insert_access"
on public.trip_activity
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
  or private.user_is_assigned_or_rostered_for_trip(trip_id)
);
