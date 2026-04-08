-- Optional cell phone for each roster row (displayed on Team tab after email).
alter table public.trip_team_members
  add column if not exists cell_phone text;
