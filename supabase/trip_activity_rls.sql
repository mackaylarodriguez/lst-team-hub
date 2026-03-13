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

alter table public.trip_activity enable row level security;

drop policy if exists "trip_activity_select_access" on public.trip_activity;
create policy "trip_activity_select_access"
on public.trip_activity
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trip_activity_insert_access" on public.trip_activity;
create policy "trip_activity_insert_access"
on public.trip_activity
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
  or trip_id in (
    select trip_id
    from public.trip_assignments
    where user_id = auth.uid()
  )
);
