-- Optional travel form field for USA Massachusetts (domestic) trips.
alter table public.travel_form_responses
  add column if not exists has_real_id text;
