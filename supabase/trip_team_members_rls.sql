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

alter table public.trip_team_members enable row level security;

drop policy if exists "trip_team_members_select_access" on public.trip_team_members;
create policy "trip_team_members_select_access"
on public.trip_team_members
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

drop policy if exists "trip_team_members_insert_access" on public.trip_team_members;
create policy "trip_team_members_insert_access"
on public.trip_team_members
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trip_team_members_update_access" on public.trip_team_members;
create policy "trip_team_members_update_access"
on public.trip_team_members
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id in (
      select ta.trip_id
      from public.trip_assignments as ta
      where ta.user_id = auth.uid()
    )
  )
  or (
    trip_id in (
      select ta.trip_id
      from public.trip_assignments as ta
      where ta.user_id = auth.uid()
    )
    and lower(trim(coalesce(trip_team_members.email, ''))) = (
      select lower(trim(coalesce(p.email, '')))
      from public.profiles as p
      where p.id = auth.uid()
      limit 1
    )
  )
)
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id in (
      select ta.trip_id
      from public.trip_assignments as ta
      where ta.user_id = auth.uid()
    )
  )
  or (
    trip_id in (
      select ta.trip_id
      from public.trip_assignments as ta
      where ta.user_id = auth.uid()
    )
    and lower(trim(coalesce(trip_team_members.email, ''))) = (
      select lower(trim(coalesce(p.email, '')))
      from public.profiles as p
      where p.id = auth.uid()
      limit 1
    )
  )
);

drop policy if exists "trip_team_members_delete_access" on public.trip_team_members;
create policy "trip_team_members_delete_access"
on public.trip_team_members
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);
