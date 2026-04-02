-- How fundraising is organized for this trip: per-worker Neon pages vs one shared family/team page.
alter table public.trips
  add column if not exists fundraising_mode text;

update public.trips
set fundraising_mode = 'individual'
where fundraising_mode is null;

alter table public.trips
  alter column fundraising_mode set default 'individual';

alter table public.trips
  alter column fundraising_mode set not null;

alter table public.trips
  drop constraint if exists trips_fundraising_mode_check;

alter table public.trips
  add constraint trips_fundraising_mode_check
  check (fundraising_mode in ('individual', 'team'));

comment on column public.trips.fundraising_mode is
  'individual: each worker has their own Neon link (default). team: one shared team_fundraising_url and trip-level fundraising_goal_amount for a family or single shared campaign.';
