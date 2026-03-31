alter table public.trip_team_members
  add column if not exists team_role text;

comment on column public.trip_team_members.team_role is 'Trip-specific team role label (e.g. Worker, Trainer).';
