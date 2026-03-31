-- Public URL for a team housing PDF uploaded to storage (Budget → Housing).
alter table public.trip_budgets
  add column if not exists housing_pdf_url text;

comment on column public.trip_budgets.housing_pdf_url is 'Public URL for uploaded housing PDF; shown on trip Documents with housing link when set.';
