-- Site logistics URL for trip Documents (workers/leaders cannot SELECT site_budget_notes).
-- Requires private.current_profile_role() and private.user_is_assigned_or_rostered_for_trip()
-- (private_trip_access_helpers.sql).

create or replace function public.get_trip_site_logistics_url(p_trip_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  loc text;
  loc_lower text;
  url text;
begin
  if p_trip_id is null or auth.uid() is null then
    return null;
  end if;

  if not (
    private.current_profile_role() in ('admin', 'staff')
    or private.user_is_assigned_or_rostered_for_trip(p_trip_id)
  ) then
    return null;
  end if;

  select nullif(trim(t.location), '') into loc
  from public.trips t
  where t.id = p_trip_id;

  if loc is null then
    return null;
  end if;

  loc_lower := lower(loc);

  select nullif(trim(sbn.logistics_url), '') into url
  from public.site_budget_notes sbn
  where nullif(trim(sbn.logistics_url), '') is not null
    and lower(trim(sbn.site_name)) = loc_lower
  limit 1;

  if url is not null and url <> '' then
    return url;
  end if;

  select nullif(trim(sbn.logistics_url), '') into url
  from public.site_budget_notes sbn
  where nullif(trim(sbn.logistics_url), '') is not null
    and nullif(trim(split_part(sbn.site_name, ' - ', 2)), '') <> ''
    and lower(trim(split_part(sbn.site_name, ' - ', 2))) = loc_lower
  limit 1;

  if url is not null and url <> '' then
    return url;
  end if;

  select nullif(trim(sbn.logistics_url), '') into url
  from public.site_budget_notes sbn
  where nullif(trim(sbn.logistics_url), '') is not null
    and (
      lower(trim(sbn.site_name)) like '%' || loc_lower || '%'
      or loc_lower like '%' || lower(trim(sbn.site_name)) || '%'
    )
  order by length(trim(sbn.site_name)) desc
  limit 1;

  if url is not null and url <> '' then
    return url;
  end if;

  return null;
end;
$$;

revoke all on function public.get_trip_site_logistics_url(uuid) from public;
grant execute on function public.get_trip_site_logistics_url(uuid) to authenticated;
