-- Housing budget cap/allocation per team (Budget → Housing and team budget editor).
-- Run once in the Supabase SQL editor.
alter table public.trip_budgets
  add column if not exists housing_budget_amount text;

-- Backfill from legacy budget_amount values (before team budget lived separately in Overview).
update public.trip_budgets
set housing_budget_amount = budget_amount
where (housing_budget_amount is null or trim(housing_budget_amount) = '')
  and budget_amount is not null
  and trim(budget_amount) <> '';
