create table if not exists public.recruiting_cycle_activity_logs (
  id uuid primary key default gen_random_uuid(),
  recruiting_cycle_contact_id uuid not null references public.recruiting_cycle_contacts(id) on delete cascade,
  action_type text not null,
  action_date timestamp with time zone not null default now(),
  staff_member text,
  summary text,
  created_at timestamp with time zone not null default now()
);

create index if not exists recruiting_cycle_activity_logs_cycle_date_idx
  on public.recruiting_cycle_activity_logs (recruiting_cycle_contact_id, action_date desc);
