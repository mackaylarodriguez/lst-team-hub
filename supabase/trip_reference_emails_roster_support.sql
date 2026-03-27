-- Allow reference tracking for roster workers who do not have a Hub profile yet.
-- Exactly one of user_id (assigned worker) or trip_team_member_id (roster row) must be set.

alter table public.trip_reference_emails
  drop constraint if exists trip_reference_emails_user_id_fkey;

drop index if exists trip_reference_emails_unique_idx;

alter table public.trip_reference_emails
  alter column user_id drop not null;

alter table public.trip_reference_emails
  add column if not exists trip_team_member_id uuid references public.trip_team_members(id) on delete cascade;

alter table public.trip_reference_emails
  drop constraint if exists trip_reference_emails_worker_xor_roster;

alter table public.trip_reference_emails
  add constraint trip_reference_emails_worker_xor_roster check (
    (user_id is not null and trip_team_member_id is null)
    or (user_id is null and trip_team_member_id is not null)
  );

alter table public.trip_reference_emails
  add constraint trip_reference_emails_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;

create unique index if not exists trip_reference_emails_trip_user_unique
  on public.trip_reference_emails (trip_id, user_id)
  where user_id is not null;

create unique index if not exists trip_reference_emails_trip_roster_unique
  on public.trip_reference_emails (trip_id, trip_team_member_id)
  where trip_team_member_id is not null;

-- Leaders can insert/update reference rows on trips they are assigned to
drop policy if exists "trip_reference_emails_insert_access" on public.trip_reference_emails;
create policy "trip_reference_emails_insert_access"
on public.trip_reference_emails
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

drop policy if exists "trip_reference_emails_update_access" on public.trip_reference_emails;
create policy "trip_reference_emails_update_access"
on public.trip_reference_emails
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
