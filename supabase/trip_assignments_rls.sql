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

alter table public.trip_assignments enable row level security;

drop policy if exists "trip_assignments_select_access" on public.trip_assignments;
create policy "trip_assignments_select_access"
on public.trip_assignments
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trip_assignments_insert_access" on public.trip_assignments;
create policy "trip_assignments_insert_access"
on public.trip_assignments
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
  or user_id = auth.uid()
);

drop policy if exists "trip_assignments_delete_access" on public.trip_assignments;
create policy "trip_assignments_delete_access"
on public.trip_assignments
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);
