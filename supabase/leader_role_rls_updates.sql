-- Run after profiles can use role = 'leader'.
-- Extends policies so trip leaders can manage announcements, read worker documents on their trips, etc.

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
  where p.id = auth.uid()
     or lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  order by case when p.id = auth.uid() then 0 else 1 end
  limit 1;
$$;

revoke all on function private.current_profile_role() from public;
grant execute on function private.current_profile_role() to authenticated;

-- trip_announcements: leaders on the trip can insert/update/delete
drop policy if exists "trip_announcements_insert_access" on public.trip_announcements;
create policy "trip_announcements_insert_access"
on public.trip_announcements
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id in (
      select trip_id from public.trip_assignments where user_id = auth.uid()
    )
  )
);

drop policy if exists "trip_announcements_update_access" on public.trip_announcements;
create policy "trip_announcements_update_access"
on public.trip_announcements
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id in (
      select trip_id from public.trip_assignments where user_id = auth.uid()
    )
  )
)
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id in (
      select trip_id from public.trip_assignments where user_id = auth.uid()
    )
  )
);

drop policy if exists "trip_announcements_delete_access" on public.trip_announcements;
create policy "trip_announcements_delete_access"
on public.trip_announcements
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id in (
      select trip_id from public.trip_assignments where user_id = auth.uid()
    )
  )
);

-- user_documents: leaders can read trip-scoped documents for trips they are assigned to
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
    and trip_id in (
      select trip_id from public.trip_assignments where user_id = auth.uid()
    )
  )
  or user_id = auth.uid()
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
    and trip_id in (
      select trip_id from public.trip_assignments where user_id = auth.uid()
    )
  )
  or user_id = auth.uid()
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
    and trip_id in (
      select trip_id from public.trip_assignments where user_id = auth.uid()
    )
  )
  or user_id = auth.uid()
)
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id is not null
    and trip_id in (
      select trip_id from public.trip_assignments where user_id = auth.uid()
    )
  )
  or user_id = auth.uid()
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
    and trip_id in (
      select trip_id from public.trip_assignments where user_id = auth.uid()
    )
  )
  or user_id = auth.uid()
);

-- Storage: worker-documents bucket read for leaders (same as staff scope for bucket)
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
  )
);

-- trip_reference_emails: leaders can read rows for assigned trips
drop policy if exists "trip_reference_emails_select_access" on public.trip_reference_emails;
create policy "trip_reference_emails_select_access"
on public.trip_reference_emails
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id in (
      select trip_id from public.trip_assignments where user_id = auth.uid()
    )
  )
  or user_id = auth.uid()
);

-- travel_form_responses: leaders can read responses for their trips
drop policy if exists "travel_form_responses_select_access" on public.travel_form_responses;
create policy "travel_form_responses_select_access"
on public.travel_form_responses
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id in (
      select trip_id from public.trip_assignments where user_id = auth.uid()
    )
  )
  or user_id = auth.uid()
);
