-- Allow trip Leaders (not only admin/staff) to read and write worker training + checklist
-- progress for people on the same trip. UI already shows the team dashboard to leaders;
-- RLS previously blocked those saves.

create or replace function private.leader_can_manage_subject_progress_for_trip(
  p_trip_id uuid,
  p_subject_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    private.current_profile_role() = 'leader'
    and p_trip_id is not null
    and p_subject_user_id is not null
    and exists (
      select 1
      from public.trip_assignments ta_leader
      inner join public.profiles p_actor on p_actor.id = ta_leader.user_id
      where ta_leader.trip_id = p_trip_id
        and lower(trim(p_actor.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
    )
    and (
      exists (
        select 1
        from public.trip_assignments ta_subj
        where ta_subj.trip_id = p_trip_id
          and ta_subj.user_id = p_subject_user_id
      )
      or exists (
        select 1
        from public.trip_team_members m
        inner join public.profiles ps on lower(trim(ps.email)) = lower(trim(coalesce(m.email, '')))
        where m.trip_id = p_trip_id
          and ps.id = p_subject_user_id
      )
    );
$$;

revoke all on function private.leader_can_manage_subject_progress_for_trip(uuid, uuid) from public;
grant execute on function private.leader_can_manage_subject_progress_for_trip(uuid, uuid) to authenticated;

-- user_training_progress
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
  or private.leader_can_manage_subject_progress_for_trip(trip_id, user_id)
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
  or private.leader_can_manage_subject_progress_for_trip(trip_id, user_id)
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
  or private.leader_can_manage_subject_progress_for_trip(trip_id, user_id)
)
with check (
  private.current_profile_role() in ('admin', 'staff')
  or user_id in (
    select p.id
    from public.profiles as p
    where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
  or private.leader_can_manage_subject_progress_for_trip(trip_id, user_id)
);

-- user_task_progress
drop policy if exists "user_task_progress_select_access" on public.user_task_progress;
create policy "user_task_progress_select_access"
on public.user_task_progress
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or user_id in (
    select p.id
    from public.profiles as p
    where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
  or private.leader_can_manage_subject_progress_for_trip(trip_id, user_id)
);

drop policy if exists "user_task_progress_insert_access" on public.user_task_progress;
create policy "user_task_progress_insert_access"
on public.user_task_progress
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
  or user_id in (
    select p.id
    from public.profiles as p
    where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
  or private.leader_can_manage_subject_progress_for_trip(trip_id, user_id)
);

drop policy if exists "user_task_progress_update_access" on public.user_task_progress;
create policy "user_task_progress_update_access"
on public.user_task_progress
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or user_id in (
    select p.id
    from public.profiles as p
    where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
  or private.leader_can_manage_subject_progress_for_trip(trip_id, user_id)
)
with check (
  private.current_profile_role() in ('admin', 'staff')
  or user_id in (
    select p.id
    from public.profiles as p
    where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  )
  or private.leader_can_manage_subject_progress_for_trip(trip_id, user_id)
);
