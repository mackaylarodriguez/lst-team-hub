-- Optional per-member fundraising goal (for teams where individuals have different targets)
alter table public.trip_team_members
  add column if not exists fundraising_goal_amount numeric;

comment on column public.trip_team_members.fundraising_goal_amount is 'Optional individual fundraising goal for this team member; when set, overrides trip-level goal for their view.';
