-- Merged primary (trip_budgets) + extra rows for trip Documents / workers.
-- Same visibility as get_trip_housing_link (staff/admin or assigned to trip).

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
  ok := private.current_profile_role() in ('admin', 'staff')
     or exists (
       select 1
       from public.trip_assignments ta
       where ta.trip_id = p_trip_id
         and ta.user_id = auth.uid()
     );

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
