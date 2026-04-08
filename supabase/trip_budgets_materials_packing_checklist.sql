-- Staff-only checklist for packing the materials box (run on Supabase after trip_budgets exists).
alter table public.trip_budgets
  add column if not exists materials_packing_checklist jsonb not null default '{}'::jsonb;

comment on column public.trip_budgets.materials_packing_checklist is
  'Staff-only booleans for standard items when packing the team shipping box (Materials tab).';
