-- Read-only travel & safety row for trip participants (workers/leaders) without relying on
-- PostgREST + table RLS edge cases. Same access gate as get_trip_housing_link.
-- Requires: private_trip_access_helpers.sql

create or replace function public.get_trip_travel_safety_for_viewer(p_trip_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ok boolean;
  result jsonb;
begin
  if p_trip_id is null or auth.uid() is null then
    return null;
  end if;

  ok := private.current_profile_role() in ('admin', 'staff', 'leader')
     or private.user_is_assigned_or_rostered_for_trip(p_trip_id);

  if not ok then
    return null;
  end if;

  select to_jsonb(t) into result
  from public.trip_travel_safety t
  where t.trip_id = p_trip_id
  limit 1;

  return result;
end;
$$;

revoke all on function public.get_trip_travel_safety_for_viewer(uuid) from public;
grant execute on function public.get_trip_travel_safety_for_viewer(uuid) to authenticated;
