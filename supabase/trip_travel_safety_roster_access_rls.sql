-- Allow workers on trip_team_members (email match to profile) to read trip_travel_safety
-- and insert/update their trip_travel_safety_acknowledgments row, not only trip_assignments.
-- Run after trip_travel_safety_rls.sql on existing databases.

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

drop policy if exists "trip_travel_safety_select_access" on public.trip_travel_safety;
create policy "trip_travel_safety_select_access"
on public.trip_travel_safety
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or private.user_is_assigned_or_rostered_for_trip(trip_id)
);

drop policy if exists "trip_travel_safety_ack_insert_access" on public.trip_travel_safety_acknowledgments;
create policy "trip_travel_safety_ack_insert_access"
on public.trip_travel_safety_acknowledgments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and private.user_is_assigned_or_rostered_for_trip(trip_id)
);

drop policy if exists "trip_travel_safety_ack_update_access" on public.trip_travel_safety_acknowledgments;
create policy "trip_travel_safety_ack_update_access"
on public.trip_travel_safety_acknowledgments
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
  and private.user_is_assigned_or_rostered_for_trip(trip_id)
);
