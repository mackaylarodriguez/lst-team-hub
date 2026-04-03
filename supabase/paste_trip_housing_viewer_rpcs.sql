-- =============================================================================
-- ONE PASTE: housing + logistics viewer RPCs for trip Documents (roster access)
-- Run AFTER private_trip_access_helpers.sql (needs user_is_assigned_or_rostered_for_trip).
-- Fixes workers on trip_team_members (no trip_assignments row) seeing empty housing links.
-- =============================================================================

-- --- trip_budgets_housing_link_rpc.sql ---
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
      private.current_profile_role() in ('admin', 'staff', 'leader')
      or private.user_is_assigned_or_rostered_for_trip(p_trip_id)
    )
  limit 1;
$$;

revoke all on function public.get_trip_housing_link(uuid) from public;
grant execute on function public.get_trip_housing_link(uuid) to authenticated;

-- --- trip_budgets_housing_pdf_url_rpc.sql ---
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
      private.current_profile_role() in ('admin', 'staff', 'leader')
      or private.user_is_assigned_or_rostered_for_trip(p_trip_id)
    )
  limit 1;
$$;

revoke all on function public.get_trip_housing_pdf_url(uuid) from public;
grant execute on function public.get_trip_housing_pdf_url(uuid) to authenticated;

-- --- get_trip_housing_documents.sql ---
create or replace function public.get_trip_housing_documents(p_trip_id uuid)
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
  ok := private.current_profile_role() in ('admin', 'staff', 'leader')
     or private.user_is_assigned_or_rostered_for_trip(p_trip_id);

  if not ok then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(q.doc order by q.ord), '[]'::jsonb)
  into result
  from (
    select
      0 as ord,
      jsonb_build_object(
        'kind', 'primary',
        'label', null::text,
        'link', nullif(trim(b.housing_link), ''),
        'pdf_url', nullif(trim(b.housing_pdf_url), '')
      ) as doc
    from public.trip_budgets b
    where b.trip_id = p_trip_id
      and (
        nullif(trim(b.housing_link), '') is not null
        or nullif(trim(b.housing_pdf_url), '') is not null
      )
    union all
    select
      e.sort_order + 1 as ord,
      jsonb_build_object(
        'kind', 'extra',
        'label', nullif(trim(e.label), ''),
        'link', nullif(trim(e.housing_link), ''),
        'pdf_url', nullif(trim(e.housing_pdf_url), '')
      ) as doc
    from public.trip_housing_entries e
    where e.trip_id = p_trip_id
      and (
        nullif(trim(e.housing_link), '') is not null
        or nullif(trim(e.housing_pdf_url), '') is not null
      )
  ) q;

  return coalesce(result, '[]'::jsonb);
end;
$$;

revoke all on function public.get_trip_housing_documents(uuid) from public;
grant execute on function public.get_trip_housing_documents(uuid) to authenticated;

-- --- get_trip_site_logistics_url.sql ---
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
    private.current_profile_role() in ('admin', 'staff', 'leader')
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

-- --- get_trip_travel_safety_for_viewer.sql ---
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
