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

alter table public.trip_reference_emails enable row level security;

drop policy if exists "trip_reference_emails_select_access" on public.trip_reference_emails;
create policy "trip_reference_emails_select_access"
on public.trip_reference_emails
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

drop policy if exists "trip_reference_emails_insert_access" on public.trip_reference_emails;
create policy "trip_reference_emails_insert_access"
on public.trip_reference_emails
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trip_reference_emails_update_access" on public.trip_reference_emails;
create policy "trip_reference_emails_update_access"
on public.trip_reference_emails
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
)
with check (
  private.current_profile_role() in ('admin', 'staff')
);
