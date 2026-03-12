create table if not exists public.user_training_progress (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  training_module_id uuid not null references public.trip_training_modules(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamp with time zone,
  notes text
);

create unique index if not exists user_training_progress_unique_idx
  on public.user_training_progress (trip_id, user_id, training_module_id);
