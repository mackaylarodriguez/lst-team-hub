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

alter table public.recruiting_saved_filters enable row level security;

drop policy if exists "recruiting_saved_filters_select_access" on public.recruiting_saved_filters;
create policy "recruiting_saved_filters_select_access"
on public.recruiting_saved_filters
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "recruiting_saved_filters_insert_access" on public.recruiting_saved_filters;
create policy "recruiting_saved_filters_insert_access"
on public.recruiting_saved_filters
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "recruiting_saved_filters_update_access" on public.recruiting_saved_filters;
create policy "recruiting_saved_filters_update_access"
on public.recruiting_saved_filters
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
)
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "recruiting_saved_filters_delete_access" on public.recruiting_saved_filters;
create policy "recruiting_saved_filters_delete_access"
on public.recruiting_saved_filters
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);
