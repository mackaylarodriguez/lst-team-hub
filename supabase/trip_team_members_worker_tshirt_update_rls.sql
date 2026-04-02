-- Allow trip leaders and assigned workers to update roster rows on their trips:
--   - Leaders: any row for trips they are assigned to (inline T-shirt + roster edits).
--   - Workers: only the row whose email matches their profile email (own T-shirt size).
-- Staff/admin keep full update access.

drop policy if exists "trip_team_members_update_access" on public.trip_team_members;

create policy "trip_team_members_update_access"
on public.trip_team_members
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id in (
      select ta.trip_id
      from public.trip_assignments as ta
      where ta.user_id = auth.uid()
    )
  )
  or (
    trip_id in (
      select ta.trip_id
      from public.trip_assignments as ta
      where ta.user_id = auth.uid()
    )
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
    and trip_id in (
      select ta.trip_id
      from public.trip_assignments as ta
      where ta.user_id = auth.uid()
    )
  )
  or (
    trip_id in (
      select ta.trip_id
      from public.trip_assignments as ta
      where ta.user_id = auth.uid()
    )
    and lower(trim(coalesce(trip_team_members.email, ''))) = (
      select lower(trim(coalesce(p.email, '')))
      from public.profiles as p
      where p.id = auth.uid()
      limit 1
    )
  )
);
