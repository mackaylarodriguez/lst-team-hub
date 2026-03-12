alter table public.trip_resources
add column if not exists category text,
add column if not exists resource_key text;

create index if not exists trip_resources_trip_id_resource_key_idx
  on public.trip_resources (trip_id, resource_key);
