-- Phase 1 roster-only support for travel_form_responses.
-- Allows rows to belong to either a connected user profile OR a roster member.

alter table public.travel_form_responses
  drop constraint if exists travel_form_responses_trip_id_user_id_key;

drop index if exists public.travel_form_responses_trip_id_user_id_key;
drop index if exists public.travel_form_responses_trip_user_unique_idx;
drop index if exists public.travel_form_responses_trip_member_unique_idx;

alter table public.travel_form_responses
  drop constraint if exists travel_form_responses_user_id_fkey;

alter table public.travel_form_responses
  alter column user_id drop not null;

alter table public.travel_form_responses
  add constraint travel_form_responses_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete cascade;

alter table public.travel_form_responses
  add column if not exists trip_team_member_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'travel_form_responses_trip_team_member_id_fkey'
  ) then
    alter table public.travel_form_responses
      add constraint travel_form_responses_trip_team_member_id_fkey
      foreign key (trip_team_member_id)
      references public.trip_team_members(id)
      on delete set null;
  end if;
end $$;

alter table public.travel_form_responses
  drop constraint if exists travel_form_responses_owner_xor_check;

alter table public.travel_form_responses
  add constraint travel_form_responses_owner_xor_check
  check (
    (user_id is not null and trip_team_member_id is null)
    or (user_id is null and trip_team_member_id is not null)
  );

create index if not exists travel_form_responses_trip_team_member_id_idx
  on public.travel_form_responses (trip_team_member_id);

create unique index if not exists travel_form_responses_trip_user_unique_idx
  on public.travel_form_responses (trip_id, user_id)
  where user_id is not null;

create unique index if not exists travel_form_responses_trip_member_unique_idx
  on public.travel_form_responses (trip_id, trip_team_member_id)
  where trip_team_member_id is not null;
