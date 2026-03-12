alter table public.trip_overview_notes
drop constraint if exists trip_overview_notes_trip_id_key;

create index if not exists trip_overview_notes_trip_id_idx
  on public.trip_overview_notes (trip_id);
