-- Let any user assigned to a trip read all trip_reference_emails rows for that trip
-- (workers and leaders see the full team reference table, not only their own row).
-- Staff/admin retain full access via role check.

drop policy if exists "trip_reference_emails_select_access" on public.trip_reference_emails;

create policy "trip_reference_emails_select_access"
on public.trip_reference_emails
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or trip_id in (
    select ta.trip_id
    from public.trip_assignments as ta
    where ta.user_id = auth.uid()
  )
);
