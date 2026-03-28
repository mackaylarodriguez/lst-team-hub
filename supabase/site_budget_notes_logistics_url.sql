-- Optional per-site logistics document URL (overrides app default map when set).
alter table public.site_budget_notes
  add column if not exists logistics_url text;
