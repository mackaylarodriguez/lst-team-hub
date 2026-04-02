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
  where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  limit 1;
$$;

revoke all on function private.current_profile_role() from public;
grant execute on function private.current_profile_role() to authenticated;

alter table public.trip_meetings enable row level security;

drop policy if exists "trip_meetings_select_access" on public.trip_meetings;
create policy "trip_meetings_select_access"
on public.trip_meetings
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or trip_id in (
    select trip_id
    from public.trip_assignments
    where user_id = auth.uid()
  )
);

drop policy if exists "trip_meetings_insert_access" on public.trip_meetings;
create policy "trip_meetings_insert_access"
on public.trip_meetings
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id in (
      select trip_id
      from public.trip_assignments
      where user_id = auth.uid()
    )
  )
);

drop policy if exists "trip_meetings_update_access" on public.trip_meetings;
create policy "trip_meetings_update_access"
on public.trip_meetings
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id in (
      select trip_id
      from public.trip_assignments
      where user_id = auth.uid()
    )
  )
)
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id in (
      select trip_id
      from public.trip_assignments
      where user_id = auth.uid()
    )
  )
);

drop policy if exists "trip_meetings_delete_access" on public.trip_meetings;
create policy "trip_meetings_delete_access"
on public.trip_meetings
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);
