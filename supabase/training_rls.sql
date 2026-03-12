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

alter table public.trip_training_modules enable row level security;

drop policy if exists "trip_training_modules_select_access" on public.trip_training_modules;
create policy "trip_training_modules_select_access"
on public.trip_training_modules
for select
to authenticated
using (true);

drop policy if exists "trip_training_modules_insert_access" on public.trip_training_modules;
create policy "trip_training_modules_insert_access"
on public.trip_training_modules
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trip_training_modules_update_access" on public.trip_training_modules;
create policy "trip_training_modules_update_access"
on public.trip_training_modules
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
)
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trip_training_modules_delete_access" on public.trip_training_modules;
create policy "trip_training_modules_delete_access"
on public.trip_training_modules
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);

alter table public.user_training_progress enable row level security;

drop policy if exists "user_training_progress_select_access" on public.user_training_progress;
create policy "user_training_progress_select_access"
on public.user_training_progress
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or user_id in (
    select p.id
    from public.profiles as p
    where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
);

drop policy if exists "user_training_progress_insert_access" on public.user_training_progress;
create policy "user_training_progress_insert_access"
on public.user_training_progress
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
  or user_id in (
    select p.id
    from public.profiles as p
    where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
);

drop policy if exists "user_training_progress_update_access" on public.user_training_progress;
create policy "user_training_progress_update_access"
on public.user_training_progress
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or user_id in (
    select p.id
    from public.profiles as p
    where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
)
with check (
  private.current_profile_role() in ('admin', 'staff')
  or user_id in (
    select p.id
    from public.profiles as p
    where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
);
