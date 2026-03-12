alter table public.trip_overview_notes
add column if not exists author_name text,
add column if not exists author_email text;
