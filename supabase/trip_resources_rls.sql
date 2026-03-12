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

alter table public.trip_resources enable row level security;

drop policy if exists "trip_resources_select_access" on public.trip_resources;
create policy "trip_resources_select_access"
on public.trip_resources
for select
to authenticated
using (true);

drop policy if exists "trip_resources_insert_access" on public.trip_resources;
create policy "trip_resources_insert_access"
on public.trip_resources
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trip_resources_update_access" on public.trip_resources;
create policy "trip_resources_update_access"
on public.trip_resources
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
)
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trip_resources_delete_access" on public.trip_resources;
create policy "trip_resources_delete_access"
on public.trip_resources
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "pdfs_upload_access" on storage.objects;
create policy "pdfs_upload_access"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pdfs'
  and private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "pdfs_read_access" on storage.objects;
create policy "pdfs_read_access"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pdfs'
);

drop policy if exists "pdfs_update_access" on storage.objects;
create policy "pdfs_update_access"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'pdfs'
  and private.current_profile_role() in ('admin', 'staff')
)
with check (
  bucket_id = 'pdfs'
  and private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "pdfs_delete_access" on storage.objects;
create policy "pdfs_delete_access"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pdfs'
  and private.current_profile_role() in ('admin', 'staff')
);
