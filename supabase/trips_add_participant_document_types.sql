alter table public.trips
add column if not exists participant_document_types jsonb not null default '[]'::jsonb;
