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

alter table public.staff_misc_tasks enable row level security;

drop policy if exists "staff_misc_tasks_select_access" on public.staff_misc_tasks;
create policy "staff_misc_tasks_select_access"
on public.staff_misc_tasks
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  and lower(trim(staff_email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
);

drop policy if exists "staff_misc_tasks_insert_access" on public.staff_misc_tasks;
create policy "staff_misc_tasks_insert_access"
on public.staff_misc_tasks
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
  and lower(trim(staff_email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
);

drop policy if exists "staff_misc_tasks_update_access" on public.staff_misc_tasks;
create policy "staff_misc_tasks_update_access"
on public.staff_misc_tasks
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  and lower(trim(staff_email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
)
with check (
  private.current_profile_role() in ('admin', 'staff')
  and lower(trim(staff_email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
);

drop policy if exists "staff_misc_tasks_delete_access" on public.staff_misc_tasks;
create policy "staff_misc_tasks_delete_access"
on public.staff_misc_tasks
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  and lower(trim(staff_email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
);
