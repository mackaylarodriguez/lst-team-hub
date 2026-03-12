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

alter table public.trips enable row level security;

drop policy if exists "trips_select_access" on public.trips;
create policy "trips_select_access"
on public.trips
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or id in (
    select trip_id
    from public.trip_assignments
    where user_id = auth.uid()
  )
);

drop policy if exists "trips_insert_access" on public.trips;
create policy "trips_insert_access"
on public.trips
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trips_update_access" on public.trips;
create policy "trips_update_access"
on public.trips
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
)
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trips_delete_access" on public.trips;
create policy "trips_delete_access"
on public.trips
for delete
to authenticated
using (
  private.current_profile_role() in ('admin')
);
