-- Mirrors Lock Team form fields before a row is converted to a trip.
alter table public.recruiting_cycle_contacts
  add column if not exists pending_lock_team_setup jsonb not null default '{}'::jsonb;

comment on column public.recruiting_cycle_contacts.pending_lock_team_setup is
  'JSON draft of Lock Team form fields (fees, host, member rows with dates, etc.) until conversion.';
