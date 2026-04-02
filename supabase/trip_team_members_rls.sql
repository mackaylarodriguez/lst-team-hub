-- Requires: private_trip_access_helpers.sql (private.current_profile_role + private.user_is_assigned_or_rostered_for_trip)

alter table public.trip_team_members enable row level security;

drop policy if exists "trip_team_members_select_access" on public.trip_team_members;
create policy "trip_team_members_select_access"
on public.trip_team_members
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or private.user_is_assigned_or_rostered_for_trip(trip_id)
);

drop policy if exists "trip_team_members_insert_access" on public.trip_team_members;
create policy "trip_team_members_insert_access"
on public.trip_team_members
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
);

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

drop policy if exists "trip_team_members_delete_access" on public.trip_team_members;
create policy "trip_team_members_delete_access"
on public.trip_team_members
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);
