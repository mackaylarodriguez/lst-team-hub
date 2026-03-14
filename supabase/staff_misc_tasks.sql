create extension if not exists pgcrypto;

create table if not exists public.staff_misc_tasks (
  id uuid primary key default gen_random_uuid(),
  staff_email text not null,
  staff_name text,
  work_area text not null default 'Misc',
  task_name text not null,
  progress text not null default 'Not started',
  due_date date,
  notes text,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create index if not exists staff_misc_tasks_staff_email_idx
  on public.staff_misc_tasks (staff_email);
