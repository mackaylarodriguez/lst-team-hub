-- Trip delete from the app (lib/trips.js deleteTrip) requires this policy.
-- Run in Supabase SQL Editor if delete returns "blocked by the live database".
--
-- Depends on: private.current_profile_role() from supabase/trips_rls.sql
-- (or supabase/leader_role_rls_updates.sql, which replaces that function).

drop policy if exists "trips_delete_access" on public.trips;

create policy "trips_delete_access"
on public.trips
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);
