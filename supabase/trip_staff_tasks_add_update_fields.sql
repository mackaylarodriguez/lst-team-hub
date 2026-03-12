alter table public.trip_staff_tasks
add column if not exists updated_by_name text,
add column if not exists updated_by_email text,
add column if not exists updated_at timestamp with time zone default now();
