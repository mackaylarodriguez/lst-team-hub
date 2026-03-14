alter table public.trip_resources
add column if not exists tutorial_title text,
add column if not exists tutorial_url text,
add column if not exists tutorial_description text;
