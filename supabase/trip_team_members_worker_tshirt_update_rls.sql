-- Requires: private_trip_access_helpers.sql
-- Leaders/workers on a trip (assignment or roster email): update roster rows; workers only their own email row.

drop policy if exists "trip_team_members_update_access" on public.trip_team_members;

create policy "trip_team_members_update_access"
on public.trip_team_members
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    private.user_is_assigned_or_rostered_for_trip(trip_id)
    and lower(trim(coalesce(trip_team_members.email, ''))) = (
      select lower(trim(coalesce(p.email, '')))
      from public.profiles as p
      where p.id = auth.uid()
      limit 1
    )
  )
)
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    private.user_is_assigned_or_rostered_for_trip(trip_id)
    and lower(trim(coalesce(trip_team_members.email, ''))) = (
      select lower(trim(coalesce(p.email, '')))
      from public.profiles as p
      where p.id = auth.uid()
      limit 1
    )
  )
);
