create table if not exists public.travel_form_responses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
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
  unique(trip_id, user_id)
);

create index if not exists travel_form_responses_trip_id_idx
  on public.travel_form_responses (trip_id);
create index if not exists travel_form_responses_user_id_idx
  on public.travel_form_responses (user_id);
