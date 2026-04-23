-- Optional staff override for default mission host (see Sites → Logistics → Host).
alter table public.site_budget_notes
  add column if not exists host_name text;
