-- Allow workers on trip_team_members (email match to profile) to read trip_travel_safety
-- and insert/update their trip_travel_safety_acknowledgments row, not only trip_assignments.
-- Requires: private_trip_access_helpers.sql (run first). Then run after trip_travel_safety_rls.sql on existing DBs.

drop policy if exists "trip_travel_safety_select_access" on public.trip_travel_safety;
create policy "trip_travel_safety_select_access"
on public.trip_travel_safety
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff', 'leader')
  or private.user_is_assigned_or_rostered_for_trip(trip_id)
);

drop policy if exists "trip_travel_safety_ack_insert_access" on public.trip_travel_safety_acknowledgments;
create policy "trip_travel_safety_ack_insert_access"
on public.trip_travel_safety_acknowledgments
for insert
to authenticated
with check (
  private.trip_travel_safety_ack_user_id_matches_session(user_id)
  and (
    private.current_profile_role() in ('admin', 'staff', 'leader')
    or private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
);

drop policy if exists "trip_travel_safety_ack_update_access" on public.trip_travel_safety_acknowledgments;
create policy "trip_travel_safety_ack_update_access"
on public.trip_travel_safety_acknowledgments
for update
to authenticated
using (
  private.trip_travel_safety_ack_user_id_matches_session(user_id)
)
with check (
  private.trip_travel_safety_ack_user_id_matches_session(user_id)
  and (
    private.current_profile_role() in ('admin', 'staff', 'leader')
    or private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
);
