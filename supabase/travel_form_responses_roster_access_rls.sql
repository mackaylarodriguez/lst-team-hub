-- Workers on the roster save travel forms with trip_team_member_id set and user_id null.
-- Extend RLS so those inserts/updates/selects pass when roster email matches auth profile.
-- Leaders: trip access via assignment OR roster (same helper).
-- Requires: private_trip_access_helpers.sql (run first). Then run after travel_form_responses_rls.sql on existing DBs.

drop policy if exists "travel_form_responses_select_access" on public.travel_form_responses;
create policy "travel_form_responses_select_access"
on public.travel_form_responses
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id is not null
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id = auth.uid()
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id is null
    and trip_team_member_id is not null
    and exists (
      select 1
      from public.trip_team_members as m
      inner join public.profiles as p on p.id = auth.uid()
      where m.id = trip_team_member_id
        and m.trip_id = trip_id
        and lower(trim(coalesce(m.email, ''))) = lower(trim(coalesce(p.email, '')))
    )
  )
);

drop policy if exists "travel_form_responses_insert_access" on public.travel_form_responses;
create policy "travel_form_responses_insert_access"
on public.travel_form_responses
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id is not null
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id = auth.uid()
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id is null
    and trip_team_member_id is not null
    and exists (
      select 1
      from public.trip_team_members as m
      inner join public.profiles as p on p.id = auth.uid()
      where m.id = trip_team_member_id
        and m.trip_id = trip_id
        and lower(trim(coalesce(m.email, ''))) = lower(trim(coalesce(p.email, '')))
    )
  )
);

drop policy if exists "travel_form_responses_update_access" on public.travel_form_responses;
create policy "travel_form_responses_update_access"
on public.travel_form_responses
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id is not null
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id = auth.uid()
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id is null
    and trip_team_member_id is not null
    and exists (
      select 1
      from public.trip_team_members as m
      inner join public.profiles as p on p.id = auth.uid()
      where m.id = trip_team_member_id
        and m.trip_id = trip_id
        and lower(trim(coalesce(m.email, ''))) = lower(trim(coalesce(p.email, '')))
    )
  )
)
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id is not null
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id = auth.uid()
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id is null
    and trip_team_member_id is not null
    and exists (
      select 1
      from public.trip_team_members as m
      inner join public.profiles as p on p.id = auth.uid()
      where m.id = trip_team_member_id
        and m.trip_id = trip_id
        and lower(trim(coalesce(m.email, ''))) = lower(trim(coalesce(p.email, '')))
    )
  )
);
