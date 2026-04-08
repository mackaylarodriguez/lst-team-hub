-- Workers / leaders / rostered members update team logistics fields (not tracking or staff-only notes).
-- Requires: private_trip_access_helpers.sql, trip_budgets_team_logistics.sql.

create or replace function public.save_trip_team_logistics_by_team(
  p_trip_id uuid,
  p_team_accountant text,
  p_team_recorder text,
  p_materials_ship_address text,
  p_materials_ship_address_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ok boolean;
begin
  ok := private.current_profile_role() in ('admin', 'staff', 'leader')
     or private.user_is_assigned_or_rostered_for_trip(p_trip_id);

  if not ok then
    raise exception 'Not authorized to update team logistics for this trip';
  end if;

  insert into public.trip_budgets (
    trip_id,
    team_accountant,
    team_recorder,
    materials_ship_address,
    materials_ship_address_note,
    updated_at
  )
  values (
    p_trip_id,
    nullif(trim(p_team_accountant), ''),
    nullif(trim(p_team_recorder), ''),
    nullif(trim(p_materials_ship_address), ''),
    nullif(trim(p_materials_ship_address_note), ''),
    now()
  )
  on conflict (trip_id) do update set
    team_accountant = excluded.team_accountant,
    team_recorder = excluded.team_recorder,
    materials_ship_address = excluded.materials_ship_address,
    materials_ship_address_note = excluded.materials_ship_address_note,
    updated_at = now();
end;
$$;

revoke all on function public.save_trip_team_logistics_by_team(uuid, text, text, text, text) from public;
grant execute on function public.save_trip_team_logistics_by_team(uuid, text, text, text, text) to authenticated;
