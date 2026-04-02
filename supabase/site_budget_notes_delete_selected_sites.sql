-- Remove site housing / workbook note rows for retired or duplicate sites.
-- Run once in Supabase SQL Editor on existing projects (seed file updated for new installs).
--
-- Italy - Padova and Italy - Vicenza are kept as separate sites; delete only legacy combined rows.

delete from public.site_budget_notes
where site_name in (
  'Albania - Elbasan',
  'Hannover, Germany',
  'Germany - Hannover',
  'South Korea - Seoul',
  'Italy - Vicenza/Padova',
  'Italy - Padova/Vicenza',
  'Vicenza/Padova',
  'Padova/Vicenza'
);
