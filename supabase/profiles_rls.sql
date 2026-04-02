-- Requires: private_trip_access_helpers.sql

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_access" on public.profiles;
create policy "profiles_select_access"
on public.profiles
for select
to authenticated
using (
  lower(trim(email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  or id = auth.uid()
  or private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "profiles_insert_access" on public.profiles;
create policy "profiles_insert_access"
on public.profiles
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "profiles_update_access" on public.profiles;
create policy "profiles_update_access"
on public.profiles
for update
to authenticated
using (
  lower(trim(email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  or id = auth.uid()
  or private.current_profile_role() in ('admin', 'staff')
)
with check (
  lower(trim(email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  or id = auth.uid()
  or private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "profiles_delete_access" on public.profiles;
create policy "profiles_delete_access"
on public.profiles
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);
