-- Requires: private_trip_access_helpers.sql

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
