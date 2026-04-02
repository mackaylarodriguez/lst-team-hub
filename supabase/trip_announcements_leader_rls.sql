-- Requires: private_trip_access_helpers.sql
-- Legacy patch: leader announcement write policies. Prefer trip_announcements_rls.sql for full table policies.
-- Safe to re-run; matches canonical trip_announcements_rls insert/update/delete.

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
