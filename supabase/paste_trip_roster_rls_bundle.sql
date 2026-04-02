-- =============================================================================
-- SINGLE PASTE for Supabase SQL Editor — full trip roster / worker access stack
--
-- Includes: private helpers, profiles, trips, trip_team_members, trip_travel_safety
-- (+ acks), trip_activity, user_documents + worker-documents storage policies,
-- travel_form_responses, trip_announcements.
--
-- Safe to re-run (drops and recreates policies). Requires tables to exist.
-- Redundant with running the separate *_rls.sql files in order; do not also run
-- trip_travel_safety_roster_access_rls.sql etc. after this (same policies).
-- =============================================================================

-- --- private_trip_access_helpers ---
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

-- --- profiles_rls ---
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

-- --- trips_rls ---
alter table public.trips enable row level security;

drop policy if exists "trips_select_access" on public.trips;
create policy "trips_select_access"
on public.trips
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or id in (
    select trip_id
    from public.trip_assignments
    where user_id = auth.uid()
  )
  or private.user_is_assigned_or_rostered_for_trip(id)
);

drop policy if exists "trips_insert_access" on public.trips;
create policy "trips_insert_access"
on public.trips
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trips_update_access" on public.trips;
create policy "trips_update_access"
on public.trips
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
)
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trips_delete_access" on public.trips;
create policy "trips_delete_access"
on public.trips
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);

-- --- trip_team_members_rls ---
alter table public.trip_team_members enable row level security;

drop policy if exists "trip_team_members_select_access" on public.trip_team_members;
create policy "trip_team_members_select_access"
on public.trip_team_members
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or private.user_is_assigned_or_rostered_for_trip(trip_id)
);

drop policy if exists "trip_team_members_insert_access" on public.trip_team_members;
create policy "trip_team_members_insert_access"
on public.trip_team_members
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trip_team_members_update_access" on public.trip_team_members;
create policy "trip_team_members_update_access"
on public.trip_team_members
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    private.user_is_assigned_or_rostered_for_trip(trip_id)
    and lower(trim(coalesce(trip_team_members.email, ''))) = (
      select lower(trim(coalesce(p.email, '')))
      from public.profiles as p
      where p.id = auth.uid()
      limit 1
    )
  )
)
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    private.user_is_assigned_or_rostered_for_trip(trip_id)
    and lower(trim(coalesce(trip_team_members.email, ''))) = (
      select lower(trim(coalesce(p.email, '')))
      from public.profiles as p
      where p.id = auth.uid()
      limit 1
    )
  )
);

drop policy if exists "trip_team_members_delete_access" on public.trip_team_members;
create policy "trip_team_members_delete_access"
on public.trip_team_members
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);

-- --- trip_travel_safety_rls ---
alter table public.trip_travel_safety enable row level security;

drop policy if exists "trip_travel_safety_select_access" on public.trip_travel_safety;
create policy "trip_travel_safety_select_access"
on public.trip_travel_safety
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or private.user_is_assigned_or_rostered_for_trip(trip_id)
);

drop policy if exists "trip_travel_safety_insert_access" on public.trip_travel_safety;
create policy "trip_travel_safety_insert_access"
on public.trip_travel_safety
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trip_travel_safety_update_access" on public.trip_travel_safety;
create policy "trip_travel_safety_update_access"
on public.trip_travel_safety
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
)
with check (
  private.current_profile_role() in ('admin', 'staff')
);

drop policy if exists "trip_travel_safety_delete_access" on public.trip_travel_safety;
create policy "trip_travel_safety_delete_access"
on public.trip_travel_safety
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);

alter table public.trip_travel_safety_acknowledgments enable row level security;

drop policy if exists "trip_travel_safety_ack_select_access" on public.trip_travel_safety_acknowledgments;
create policy "trip_travel_safety_ack_select_access"
on public.trip_travel_safety_acknowledgments
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or user_id = auth.uid()
);

drop policy if exists "trip_travel_safety_ack_insert_access" on public.trip_travel_safety_acknowledgments;
create policy "trip_travel_safety_ack_insert_access"
on public.trip_travel_safety_acknowledgments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and private.user_is_assigned_or_rostered_for_trip(trip_id)
);

drop policy if exists "trip_travel_safety_ack_update_access" on public.trip_travel_safety_acknowledgments;
create policy "trip_travel_safety_ack_update_access"
on public.trip_travel_safety_acknowledgments
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
  and private.user_is_assigned_or_rostered_for_trip(trip_id)
);

drop policy if exists "trip_travel_safety_ack_delete_access" on public.trip_travel_safety_acknowledgments;
create policy "trip_travel_safety_ack_delete_access"
on public.trip_travel_safety_acknowledgments
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);

-- --- trip_activity_rls ---
alter table public.trip_activity enable row level security;

drop policy if exists "trip_activity_select_access" on public.trip_activity;
create policy "trip_activity_select_access"
on public.trip_activity
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or private.user_is_assigned_or_rostered_for_trip(trip_id)
);

drop policy if exists "trip_activity_insert_access" on public.trip_activity;
create policy "trip_activity_insert_access"
on public.trip_activity
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
  or private.user_is_assigned_or_rostered_for_trip(trip_id)
);

-- --- user_documents_rls (+ storage.worker-documents) ---
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

-- --- travel_form_responses_rls ---
alter table public.travel_form_responses enable row level security;

drop policy if exists "travel_form_responses_select_access" on public.travel_form_responses;
create policy "travel_form_responses_select_access"
on public.travel_form_responses
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id is not null
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id = auth.uid()
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id is null
    and trip_team_member_id is not null
    and exists (
      select 1
      from public.trip_team_members as m
      inner join public.profiles as p on p.id = auth.uid()
      where m.id = trip_team_member_id
        and m.trip_id = trip_id
        and lower(trim(coalesce(m.email, ''))) = lower(trim(coalesce(p.email, '')))
    )
  )
);

drop policy if exists "travel_form_responses_insert_access" on public.travel_form_responses;
create policy "travel_form_responses_insert_access"
on public.travel_form_responses
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id is not null
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id = auth.uid()
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id is null
    and trip_team_member_id is not null
    and exists (
      select 1
      from public.trip_team_members as m
      inner join public.profiles as p on p.id = auth.uid()
      where m.id = trip_team_member_id
        and m.trip_id = trip_id
        and lower(trim(coalesce(m.email, ''))) = lower(trim(coalesce(p.email, '')))
    )
  )
);

drop policy if exists "travel_form_responses_update_access" on public.travel_form_responses;
create policy "travel_form_responses_update_access"
on public.travel_form_responses
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id is not null
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id = auth.uid()
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id is null
    and trip_team_member_id is not null
    and exists (
      select 1
      from public.trip_team_members as m
      inner join public.profiles as p on p.id = auth.uid()
      where m.id = trip_team_member_id
        and m.trip_id = trip_id
        and lower(trim(coalesce(m.email, ''))) = lower(trim(coalesce(p.email, '')))
    )
  )
)
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and trip_id is not null
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id = auth.uid()
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
  or (
    user_id is null
    and trip_team_member_id is not null
    and exists (
      select 1
      from public.trip_team_members as m
      inner join public.profiles as p on p.id = auth.uid()
      where m.id = trip_team_member_id
        and m.trip_id = trip_id
        and lower(trim(coalesce(m.email, ''))) = lower(trim(coalesce(p.email, '')))
    )
  )
);

drop policy if exists "travel_form_responses_delete_access" on public.travel_form_responses;
create policy "travel_form_responses_delete_access"
on public.travel_form_responses
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);

-- --- trip_announcements_rls ---
alter table public.trip_announcements enable row level security;

drop policy if exists "trip_announcements_select_access" on public.trip_announcements;
create policy "trip_announcements_select_access"
on public.trip_announcements
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or private.user_is_assigned_or_rostered_for_trip(trip_id)
);

drop policy if exists "trip_announcements_insert_access" on public.trip_announcements;
create policy "trip_announcements_insert_access"
on public.trip_announcements
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
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
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
)
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
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
    and private.user_is_assigned_or_rostered_for_trip(trip_id)
  )
);
