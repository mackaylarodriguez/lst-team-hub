create table if not exists public.trip_staff_tasks (
  id text primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  work_area text not null,
  sequence integer not null default 0,
  task_name text not null,
  assigned_to text,
  progress text not null default 'Not started',
  due_date date,
  notes text,
  created_at timestamp with time zone default now()
);

create index if not exists trip_staff_tasks_trip_id_idx
  on public.trip_staff_tasks (trip_id);
