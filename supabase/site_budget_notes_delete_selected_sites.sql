-- Remove site housing / workbook note rows for retired or duplicate sites.
-- Run once in Supabase SQL Editor on existing projects (seed file updated for new installs).

delete from public.site_budget_notes
where site_name in (
  'Albania - Elbasan',
  'Hannover, Germany',
  'Germany - Hannover',
  'Italy - Padova',
  'Italy - Vicenza',
  'South Korea - Seoul'
);
