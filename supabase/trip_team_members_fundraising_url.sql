alter table public.trip_team_members
  add column if not exists fundraising_url text;

comment on column public.trip_team_members.fundraising_url is 'Personal Neon fundraising URL before the worker has a login; staff can edit from Trip → Fundraising or Trips roster.';
