-- Finance: staff requests a printed check for a trip (Donna / accounting workflow).
create table if not exists public.budget_check_requests (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  trip_name_snapshot text,
  team_name_snapshot text,
  team_accountant_snapshot text,
  budget_amount_snapshot text,
  amount_requested text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'processed')),
  requested_by_user_id uuid not null references public.profiles(id) on delete restrict,
  requested_by_email text,
  requested_by_name text,
  staff_misc_task_id uuid references public.staff_misc_tasks(id) on delete set null,
  processed_at timestamptz,
  processed_by_user_id uuid references public.profiles(id) on delete set null,
  processed_by_email text,
  processed_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists budget_check_requests_trip_id_idx
  on public.budget_check_requests (trip_id);
create index if not exists budget_check_requests_status_idx
  on public.budget_check_requests (status);
create index if not exists budget_check_requests_created_at_idx
  on public.budget_check_requests (created_at desc);

comment on table public.budget_check_requests is
  'Staff/admin check print requests; notifies finance and creates a personal task for the assignee.';

alter table public.budget_check_requests enable row level security;

drop policy if exists "budget_check_requests_select_staff" on public.budget_check_requests;
create policy "budget_check_requests_select_staff"
on public.budget_check_requests
for select
to authenticated
using (private.current_profile_role() in ('admin', 'staff'));

drop policy if exists "budget_check_requests_insert_staff" on public.budget_check_requests;
create policy "budget_check_requests_insert_staff"
on public.budget_check_requests
for insert
to authenticated
with check (
  private.current_profile_role() in ('admin', 'staff')
  and requested_by_user_id = auth.uid()
);

drop policy if exists "budget_check_requests_update_staff" on public.budget_check_requests;
create policy "budget_check_requests_update_staff"
on public.budget_check_requests
for update
to authenticated
using (private.current_profile_role() in ('admin', 'staff'))
with check (private.current_profile_role() in ('admin', 'staff'));

drop policy if exists "budget_check_requests_delete_staff" on public.budget_check_requests;
create policy "budget_check_requests_delete_staff"
on public.budget_check_requests
for delete
to authenticated
using (private.current_profile_role() in ('admin', 'staff'));
