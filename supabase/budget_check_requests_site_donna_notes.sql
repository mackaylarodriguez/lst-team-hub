-- Budget → Checks: site snapshot + Donna's internal notes
alter table public.budget_check_requests
  add column if not exists site_snapshot text,
  add column if not exists donna_notes text;
