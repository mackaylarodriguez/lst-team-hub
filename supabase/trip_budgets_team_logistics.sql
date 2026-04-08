-- Team logistics: recorder, ship-to note vs application, staff notes visible to team.
-- Run on Supabase after trip_budgets exists.

alter table public.trip_budgets
  add column if not exists team_recorder text,
  add column if not exists materials_ship_address_note text,
  add column if not exists materials_notes_for_team text;

comment on column public.trip_budgets.team_recorder is 'Team recorder (name), chosen from trip roster on Materials tab.';
comment on column public.trip_budgets.materials_ship_address_note is 'e.g. if ship-to address differs from address on application.';
comment on column public.trip_budgets.materials_notes_for_team is 'Staff notes visible to workers/leaders on Materials tab.';
