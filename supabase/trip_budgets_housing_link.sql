alter table public.trip_budgets
  add column if not exists housing_link text;

comment on column public.trip_budgets.housing_link is 'Team housing booking URL (e.g. Airbnb); shown on trip Documents when set.';
