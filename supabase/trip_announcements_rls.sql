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

alter table public.trip_announcements enable row level security;

drop policy if exists "trip_announcements_select_access" on public.trip_announcements;
create policy "trip_announcements_select_access"
on public.trip_announcements
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

drop policy if exists "trip_announcements_insert_access" on public.trip_announcements;
create policy "trip_announcements_insert_access"
on public.trip_announcements
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trip_announcements_update_access" on public.trip_announcements;
create policy "trip_announcements_update_access"
on public.trip_announcements
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
)
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trip_announcements_delete_access" on public.trip_announcements;
create policy "trip_announcements_delete_access"
on public.trip_announcements
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);
