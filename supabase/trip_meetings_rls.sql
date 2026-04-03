create schema if not exists private;

-- Prefer matching the signed-in user by id (works when JWT has no email claim).
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

-- Trip access: mirrors private.user_is_assigned_or_rostered_for_trip — assignment, roster↔profile email,
-- and roster↔JWT email (workers often match roster by auth email while profiles.email differs).
create or replace function private.trip_meetings_actor_on_trip(p_trip_id uuid)
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
  )
  or exists (
    select 1
    from public.trip_team_members as m
    where m.trip_id = p_trip_id
      and nullif(trim(coalesce(auth.jwt()->>'email', '')), '') is not null
      and lower(trim(coalesce(m.email, ''))) =
          lower(trim(coalesce(auth.jwt()->>'email', '')))
  );
$$;

revoke all on function private.trip_meetings_actor_on_trip(uuid) from public;
grant execute on function private.trip_meetings_actor_on_trip(uuid) to authenticated;

alter table public.trip_meetings enable row level security;

drop policy if exists "trip_meetings_select_access" on public.trip_meetings;
create policy "trip_meetings_select_access"
on public.trip_meetings
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or private.trip_meetings_actor_on_trip(trip_id)
);

drop policy if exists "trip_meetings_insert_access" on public.trip_meetings;
create policy "trip_meetings_insert_access"
on public.trip_meetings
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and private.trip_meetings_actor_on_trip(trip_id)
  )
);

drop policy if exists "trip_meetings_update_access" on public.trip_meetings;
create policy "trip_meetings_update_access"
on public.trip_meetings
for update
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and private.trip_meetings_actor_on_trip(trip_id)
  )
)
with check (
  private.current_profile_role() in ('admin', 'staff')
  or (
    private.current_profile_role() = 'leader'
    and private.trip_meetings_actor_on_trip(trip_id)
  )
);

drop policy if exists "trip_meetings_delete_access" on public.trip_meetings;
create policy "trip_meetings_delete_access"
on public.trip_meetings
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);
