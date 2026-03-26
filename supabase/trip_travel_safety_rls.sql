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
  where lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  limit 1;
$$;

revoke all on function private.current_profile_role() from public;
grant execute on function private.current_profile_role() to authenticated;

alter table public.trip_travel_safety enable row level security;

drop policy if exists "trip_travel_safety_select_access" on public.trip_travel_safety;
create policy "trip_travel_safety_select_access"
on public.trip_travel_safety
for select
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
  or trip_id in (
    select trip_id
    from public.trip_assignments
    where user_id = auth.uid()
  )
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
  and trip_id in (
    select trip_id
    from public.trip_assignments
    where user_id = auth.uid()
  )
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
  and trip_id in (
    select trip_id
    from public.trip_assignments
    where user_id = auth.uid()
  )
);

drop policy if exists "trip_travel_safety_ack_delete_access" on public.trip_travel_safety_acknowledgments;
create policy "trip_travel_safety_ack_delete_access"
on public.trip_travel_safety_acknowledgments
for delete
to authenticated
using (
  private.current_profile_role() in ('admin', 'staff')
);
