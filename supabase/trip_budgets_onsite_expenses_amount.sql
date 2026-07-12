-- On-site expense totals for Budget → Overview and On-site expenses tabs.
-- Run once in the Supabase SQL editor.
alter table public.trip_budgets
  add column if not exists onsite_expenses_amount text;
