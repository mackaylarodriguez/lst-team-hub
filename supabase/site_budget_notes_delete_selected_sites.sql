-- Remove site housing / workbook note rows for retired or duplicate sites.
-- Run once in Supabase SQL Editor on existing projects (seed file updated for new installs).
--
-- Hannover: keep ONE row named exactly "Germany - Hannover" (Country - City). This script removes
-- common duplicate spellings only — not the canonical row.
-- If your only Hannover row is still named "Hannover, Germany", rename it first so you do not lose data:
--   update public.site_budget_notes set site_name = 'Germany - Hannover' where site_name = 'Hannover, Germany';
-- Then run this delete to drop any second spelling.
--
-- Vicenza/Padova: keep "Italy - Vicenza" and "Italy - Padova" separate; delete combined rows only.

delete from public.site_budget_notes
where site_name in (
  'Albania - Elbasan',
  'South Korea - Seoul',
  /* Hannover duplicates (canonical "Germany - Hannover" is NOT listed here) */
  'Hannover, Germany',
  'Hannover Germany',
  'Hannover',
  'Germany Hannover',
  'Italy - Vicenza/Padova',
  'Italy - Padova/Vicenza',
  'Italy - Vicenza / Padova',
  'Italy - Padova / Vicenza',
  'Vicenza/Padova',
  'Padova/Vicenza',
  'Vicenza / Padova',
  'Padova / Vicenza',
  'Vicenza-Padova',
  'Padova-Vicenza'
)
OR (
  /* Any other one-row combo of Vicenza + Padova */
  (
    lower(site_name) like '%vicenza%padova%'
    OR lower(site_name) like '%padova%vicenza%'
  )
  AND lower(trim(site_name)) not in ('italy - vicenza', 'italy - padova')
)
OR (
  /* Hannover: same idea via pattern, but never drop the canonical row */
  (
    lower(site_name) like '%hannover%'
    AND lower(site_name) like '%germany%'
  )
  AND lower(trim(site_name)) <> 'germany - hannover'
);
