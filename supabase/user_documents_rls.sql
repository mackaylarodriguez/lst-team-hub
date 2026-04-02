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

-- Trip access for leaders/workers: assignment or roster email match (see trip_travel_safety_rls.sql).
create or replace function private.user_is_assigned_or_rostered_for_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_assignments as ta
    where ta.trip_id = p_trip_id
      and ta.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.trip_team_members as m
    inner join public.profiles as p on p.id = auth.uid()
    where m.trip_id = p_trip_id
      and lower(trim(coalesce(m.email, ''))) = lower(trim(coalesce(p.email, '')))
  );
$$;

revoke all on function private.user_is_assigned_or_rostered_for_trip(uuid) from public;
grant execute on function private.user_is_assigned_or_rostered_for_trip(uuid) to authenticated;

alter table public.user_documents enable row level security;

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
