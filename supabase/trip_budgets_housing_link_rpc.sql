-- Lets trip participants read housing_link without granting SELECT on the full trip_budgets row.
-- Requires private.current_profile_role() and private.user_is_assigned_or_rostered_for_trip()
-- (private_trip_access_helpers.sql).

create or replace function public.get_trip_housing_link(p_trip_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(b.housing_link), '')
  from trip_budgets b
  where b.trip_id = p_trip_id
    and (
      private.current_profile_role() in ('admin', 'staff')
      or private.user_is_assigned_or_rostered_for_trip(p_trip_id)
    )
  limit 1;
$$;

revoke all on function public.get_trip_housing_link(uuid) from public;
grant execute on function public.get_trip_housing_link(uuid) to authenticated;
