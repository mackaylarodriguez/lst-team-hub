-- Staff-managed group leader contact for travel logistics (shown on travel form modal).
alter table public.trips
  add column if not exists group_leader_name text;

alter table public.trips
  add column if not exists group_leader_cell_phone text;

alter table public.trips
  add column if not exists group_leader_email text;
