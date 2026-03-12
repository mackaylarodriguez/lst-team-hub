drop policy if exists "trip_overview_notes_delete_access" on public.trip_overview_notes;
create policy "trip_overview_notes_delete_access"
on public.trip_overview_notes
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);
