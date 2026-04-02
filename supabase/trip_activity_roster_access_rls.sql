-- Allow trip participants on trip_team_members (email match) to read and insert trip_activity,
-- not only trip_assignments. Fixes workers completing training / tasks without an assignment row.
-- Safe to run if trip_travel_safety_roster_access_rls.sql already created the helper (CREATE OR REPLACE).

create or replace function private.user_is_assigned_or_rostered_for_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_assignments as ta
    where ta.trip_id = p_trip_id
      and ta.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.trip_team_members as m
    inner join public.profiles as p on p.id = auth.uid()
    where m.trip_id = p_trip_id
      and lower(trim(coalesce(m.email, ''))) = lower(trim(coalesce(p.email, '')))
  );
$$;

revoke all on function private.user_is_assigned_or_rostered_for_trip(uuid) from public;
grant execute on function private.user_is_assigned_or_rostered_for_trip(uuid) to authenticated;

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
