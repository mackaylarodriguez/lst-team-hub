-- Lets trip participants read housing_pdf_url without granting SELECT on the full trip_budgets row.
-- Requires private_trip_access_helpers.sql (user_is_assigned_or_rostered_for_trip).

create or replace function public.get_trip_housing_pdf_url(p_trip_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(b.housing_pdf_url), '')
  from trip_budgets b
  where b.trip_id = p_trip_id
    and (
      private.current_profile_role() in ('admin', 'staff')
      or private.user_is_assigned_or_rostered_for_trip(p_trip_id)
    )
  limit 1;
$$;

revoke all on function public.get_trip_housing_pdf_url(uuid) from public;
grant execute on function public.get_trip_housing_pdf_url(uuid) to authenticated;
