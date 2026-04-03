-- Remove site housing / workbook note rows for retired or duplicate sites.
-- Run once in Supabase SQL Editor on existing projects (seed file updated for new installs).
--
-- Hannover (Country - City): exactly one row named "Germany - Hannover".
--
-- IMPORTANT — do NOT run this if you already have "Germany - Hannover":
--   update public.site_budget_notes set site_name = 'Germany - Hannover' where site_name = 'Hannover, Germany';
-- That causes ERROR 23505 (duplicate key on site_budget_notes_site_name_key).
--
-- If BOTH "Germany - Hannover" AND a legacy spelling exist: run this whole file. Step 1 merges
-- notes / workbook text / dates from legacy rows into the canonical row; step 2 deletes legacy rows.
-- If you ONLY have "Hannover, Germany" (no canonical row yet), rename once:
--   update public.site_budget_notes set site_name = 'Germany - Hannover' where site_name = 'Hannover, Germany';
--
-- Vicenza/Padova: keep "Italy - Vicenza" and "Italy - Padova" separate; delete combined rows only.

-- ── Step 1: merge duplicate Hannover rows into "Germany - Hannover" (only when canonical + legacy both exist) ──
update public.site_budget_notes as canon
set
  effective_date = coalesce(
    canon.effective_date,
    (
      select min(l.effective_date)
      from public.site_budget_notes l
      where (
        l.site_name in ('Hannover, Germany', 'Hannover Germany', 'Hannover', 'Germany Hannover')
        or (
          lower(l.site_name) like '%hannover%'
          and lower(l.site_name) like '%germany%'
          and lower(trim(l.site_name)) <> 'germany - hannover'
        )
      )
      and l.id <> canon.id
    )
  ),
  notes = nullif(
    trim(both from concat_ws(
      e'\n\n',
      nullif(trim(canon.notes), ''),
      (
        select string_agg(nullif(trim(l.notes), ''), e'\n\n' order by l.updated_at desc nulls last)
        from public.site_budget_notes l
        where (
          l.site_name in ('Hannover, Germany', 'Hannover Germany', 'Hannover', 'Germany Hannover')
          or (
            lower(l.site_name) like '%hannover%'
            and lower(l.site_name) like '%germany%'
            and lower(trim(l.site_name)) <> 'germany - hannover'
          )
        )
        and l.id <> canon.id
      )
    )),
    ''
  ),
  workbook_notes = nullif(
    trim(both from concat_ws(
      e'\n',
      nullif(trim(canon.workbook_notes), ''),
      (
        select string_agg(
          nullif(trim(l.workbook_notes), ''),
          e'\n' order by l.workbook_notes_updated_at desc nulls last, l.updated_at desc nulls last
        )
        from public.site_budget_notes l
        where (
          l.site_name in ('Hannover, Germany', 'Hannover Germany', 'Hannover', 'Germany Hannover')
          or (
            lower(l.site_name) like '%hannover%'
            and lower(l.site_name) like '%germany%'
            and lower(trim(l.site_name)) <> 'germany - hannover'
          )
        )
        and l.id <> canon.id
      )
    )),
    ''
  ),
  workbook_notes_updated_at = greatest(
    canon.workbook_notes_updated_at,
    (
      select max(l.workbook_notes_updated_at)
      from public.site_budget_notes l
      where (
        l.site_name in ('Hannover, Germany', 'Hannover Germany', 'Hannover', 'Germany Hannover')
        or (
          lower(l.site_name) like '%hannover%'
          and lower(l.site_name) like '%germany%'
          and lower(trim(l.site_name)) <> 'germany - hannover'
        )
      )
      and l.id <> canon.id
    )
  ),
  updated_at = now()
where canon.site_name = 'Germany - Hannover'
  and exists (
    select 1
    from public.site_budget_notes l
    where (
      l.site_name in ('Hannover, Germany', 'Hannover Germany', 'Hannover', 'Germany Hannover')
      or (
        lower(l.site_name) like '%hannover%'
        and lower(l.site_name) like '%germany%'
        and lower(trim(l.site_name)) <> 'germany - hannover'
      )
    )
    and l.id <> canon.id
  );

-- If you use logistics_url (site_budget_notes_logistics_url.sql) and it was only set on the legacy
-- Hannover row, copy it in the Supabase UI or with a one-off update before/after this script.

-- Step 2: delete retired / duplicate rows (after Hannover merge above)
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
