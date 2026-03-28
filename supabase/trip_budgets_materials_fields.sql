-- Ship-to address, tracking, and notes for materials shipping (Team Hub).
-- Run on Supabase if these columns are missing.

alter table public.trip_budgets
  add column if not exists materials_ship_address text,
  add column if not exists materials_tracking_number text,
  add column if not exists materials_notes text;

comment on column public.trip_budgets.materials_ship_address is 'Where to ship materials if different from worker home.';
comment on column public.trip_budgets.materials_tracking_number is 'Carrier tracking number when package ships.';
comment on column public.trip_budgets.materials_notes is 'Internal notes for materials shipping (e.g. Julie’s reminders).';
