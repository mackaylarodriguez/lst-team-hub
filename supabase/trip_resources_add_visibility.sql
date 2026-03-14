alter table public.trip_resources
add column if not exists visible_to_participants boolean not null default true;
