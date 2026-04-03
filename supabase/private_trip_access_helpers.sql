-- Run FIRST before policies that reference these functions, or use paste_trip_roster_rls_bundle.sql
-- for a single SQL Editor script (see supabase/deployment-order.txt).
-- Single definition for role resolution (JWT email can differ from profiles.email) and
-- "on this trip" via trip_assignments OR trip_team_members email match (profile email
-- and/or JWT email vs roster email).

create schema if not exists private;

create or replace function private.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(trim(p.role))
  from public.profiles as p
  where p.id = auth.uid()
     or lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  order by case when p.id = auth.uid() then 0 else 1 end
  limit 1;
$$;

revoke all on function private.current_profile_role() from public;
grant execute on function private.current_profile_role() to authenticated;

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
  )
  or exists (
    select 1
    from public.trip_team_members as m
    where m.trip_id = p_trip_id
      and nullif(trim(coalesce(auth.jwt()->>'email', '')), '') is not null
      and lower(trim(coalesce(m.email, ''))) =
          lower(trim(coalesce(auth.jwt()->>'email', '')))
  );
$$;

revoke all on function private.user_is_assigned_or_rostered_for_trip(uuid) from public;
grant execute on function private.user_is_assigned_or_rostered_for_trip(uuid) to authenticated;

-- True when p_user_id is the profiles.id row for the signed-in user (auth id or same email as JWT).
-- Needed when claim_worker_account_by_email linked a pre-existing profile id ≠ auth.uid().
create or replace function private.trip_travel_safety_ack_user_id_matches_session(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id is not null
    and exists (
      select 1
      from public.profiles as p
      where p.id = p_user_id
        and (
          p.id = auth.uid()
          or (
            nullif(trim(coalesce(auth.jwt()->>'email', '')), '') is not null
            and nullif(trim(coalesce(p.email, '')), '') is not null
            and lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
          )
        )
    );
$$;

revoke all on function private.trip_travel_safety_ack_user_id_matches_session(uuid) from public;
grant execute on function private.trip_travel_safety_ack_user_id_matches_session(uuid) to authenticated;
