-- Prevent duplicate team names (case-insensitive)
create unique index if not exists trips_trip_name_unique_lower
  on public.trips (lower(trim(trip_name)))
  where trim(trip_name) != '';
