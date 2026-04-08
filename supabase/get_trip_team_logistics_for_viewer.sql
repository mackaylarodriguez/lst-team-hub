-- Read team-visible materials fields without SELECT on trip_budgets for workers.
-- Requires: private_trip_access_helpers.sql, trip_budgets_team_logistics.sql (columns).

create or replace function public.get_trip_team_logistics_for_viewer(p_trip_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not (
      private.current_profile_role() in ('admin', 'staff', 'leader')
      or private.user_is_assigned_or_rostered_for_trip(p_trip_id)
    ) then '{}'::jsonb
    else coalesce(
      (
        select jsonb_build_object(
          'teamAccountant', coalesce(b.team_accountant, ''),
          'teamRecorder', coalesce(b.team_recorder, ''),
          'materialsShipAddress', coalesce(b.materials_ship_address, ''),
          'materialsShipAddressNote', coalesce(b.materials_ship_address_note, ''),
          'materialsTrackingNumber', coalesce(b.materials_tracking_number, ''),
          'materialsNotesForTeam', coalesce(b.materials_notes_for_team, '')
        )
        from public.trip_budgets b
        where b.trip_id = p_trip_id
        limit 1
      ),
      jsonb_build_object(
        'teamAccountant', '',
        'teamRecorder', '',
        'materialsShipAddress', '',
        'materialsShipAddressNote', '',
        'materialsTrackingNumber', '',
        'materialsNotesForTeam', ''
      )
    )
  end;
$$;

revoke all on function public.get_trip_team_logistics_for_viewer(uuid) from public;
grant execute on function public.get_trip_team_logistics_for_viewer(uuid) to authenticated;
