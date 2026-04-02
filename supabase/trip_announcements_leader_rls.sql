-- Trip leaders can add/edit/delete announcements for trips they are assigned to or on via roster email.
-- Also fixes current_profile_role() to resolve by auth.uid() so staff/leaders are not blocked when JWT email != profiles.email.

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
