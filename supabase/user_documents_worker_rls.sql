-- Fix worker document uploads when JWT email != profiles.email, and align with roster-aware trip access.
-- 1) user_documents: allow rows for user_id = auth.uid(); leaders see trip docs via roster or assignment.
-- 2) storage worker-documents: allow paths whose first folder is auth.uid(); include leader role.
-- Requires: private_trip_access_helpers.sql (run first). Then run after user_documents_rls.sql on existing DBs.

drop policy if exists "user_documents_select_access" on public.user_documents;
create policy "user_documents_select_access"
on public.user_documents
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id is not null
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or user_id = auth.uid()
  or user_id in (
    select p.id
    from public.profiles as p
    where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
);

drop policy if exists "user_documents_insert_access" on public.user_documents;
create policy "user_documents_insert_access"
on public.user_documents
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id is not null
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or user_id = auth.uid()
  or user_id in (
    select p.id
    from public.profiles as p
    where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
);

drop policy if exists "user_documents_update_access" on public.user_documents;
create policy "user_documents_update_access"
on public.user_documents
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id is not null
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or user_id = auth.uid()
  or user_id in (
    select p.id
    from public.profiles as p
    where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
)
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id is not null
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or user_id = auth.uid()
  or user_id in (
    select p.id
    from public.profiles as p
    where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
);

drop policy if exists "user_documents_delete_access" on public.user_documents;
create policy "user_documents_delete_access"
on public.user_documents
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id is not null
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or user_id = auth.uid()
  or user_id in (
    select p.id
    from public.profiles as p
    where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
);

drop policy if exists "worker_documents_upload_access" on storage.objects;
create policy "worker_documents_upload_access"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'worker-documents'
  and (
    private.current_profile_role() in ('admin', 'staff', 'leader')
    or auth.uid()::text = (storage.foldername(name))[1]
    or exists (
      select 1
      from public.profiles as p
      where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
        and p.id::text = (storage.foldername(name))[1]
    )
  )
);

drop policy if exists "worker_documents_read_access" on storage.objects;
create policy "worker_documents_read_access"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'worker-documents'
  and (
    private.current_profile_role() in ('admin', 'staff', 'leader')
    or auth.uid()::text = (storage.foldername(name))[1]
    or exists (
      select 1
      from public.profiles as p
      where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
        and p.id::text = (storage.foldername(name))[1]
    )
  )
);

drop policy if exists "worker_documents_update_access" on storage.objects;
create policy "worker_documents_update_access"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'worker-documents'
  and (
    private.current_profile_role() in ('admin', 'staff', 'leader')
    or auth.uid()::text = (storage.foldername(name))[1]
    or exists (
      select 1
      from public.profiles as p
      where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
        and p.id::text = (storage.foldername(name))[1]
    )
  )
)
with check (
  bucket_id = 'worker-documents'
  and (
    private.current_profile_role() in ('admin', 'staff', 'leader')
    or auth.uid()::text = (storage.foldername(name))[1]
    or exists (
      select 1
      from public.profiles as p
      where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
        and p.id::text = (storage.foldername(name))[1]
    )
  )
);

drop policy if exists "worker_documents_delete_access" on storage.objects;
create policy "worker_documents_delete_access"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'worker-documents'
  and (
    private.current_profile_role() in ('admin', 'staff', 'leader')
    or auth.uid()::text = (storage.foldername(name))[1]
    or exists (
      select 1
      from public.profiles as p
      where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
        and p.id::text = (storage.foldername(name))[1]
    )
  )
);
