create table if not exists public.travel_form_responses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  trip_team_member_id uuid references public.trip_team_members(id) on delete set null,
  team_name text,
  first_name_passport text,
  middle_name_passport text,
  last_name_passport text,
  suffix text,
  email text,
  birthdate_month text,
  birthdate_day text,
  birthdate_year text,
  gender text,
  citizenship text,
  passport_number text,
  passport_expiration_date text,
  passport_issuing_country text,
  special_travel_preferences text,
  frequent_flyer_precheck text,
  site_project text,
  gateway_city text,
  departure_date text,
  return_date text,
  tshirt_size text,
  emergency_contact_name text,
  emergency_contact_email text,
  emergency_contact_phone text,
  is_minor text,
  passport_valid_six_months text,
  base_ticket_ack text,
  team_travel_ack text,
  end_meeting_ack text,
  travel_insurance_ack text,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  constraint travel_form_responses_owner_xor_check
    check ((user_id is not null and trip_team_member_id is null) or (user_id is null and trip_team_member_id is not null))
);

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

create index if not exists travel_form_responses_trip_id_idx
  on public.travel_form_responses (trip_id);
create index if not exists travel_form_responses_user_id_idx
  on public.travel_form_responses (user_id);
create index if not exists travel_form_responses_trip_team_member_id_idx
  on public.travel_form_responses (trip_team_member_id);
create unique index if not exists travel_form_responses_trip_user_unique_idx
  on public.travel_form_responses (trip_id, user_id)
  where user_id is not null;
create unique index if not exists travel_form_responses_trip_member_unique_idx
  on public.travel_form_responses (trip_id, trip_team_member_id)
  where trip_team_member_id is not null;
