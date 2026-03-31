-- Leaders who do not travel: no auto ticketing; still on roster for coordination.
alter table public.trip_team_members
  add column if not exists travels_with_team boolean not null default true;

comment on column public.trip_team_members.travels_with_team is 'When false and team_role is Leader, skip auto ticket rows for this roster member.';
