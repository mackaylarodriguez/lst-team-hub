-- When site workbook inventory (workbook_notes) was last saved from the Sites page.
alter table public.site_budget_notes
  add column if not exists workbook_notes_updated_at timestamp with time zone;

-- Approximate history: use row updated_at where workbook text exists.
update public.site_budget_notes
set workbook_notes_updated_at = coalesce(workbook_notes_updated_at, updated_at)
where workbook_notes is not null
  and trim(workbook_notes) <> ''
  and workbook_notes_updated_at is null;
