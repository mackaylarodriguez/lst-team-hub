alter table public.trips
add column if not exists project_type text,
add column if not exists project_length_summary text,
add column if not exists extra_travel_status text;

update public.trips
set extra_travel_status = case
  when has_extra_travel then 'yes'
  else 'no'
end
where extra_travel_status is null;
