alter table public.trip_assignments
  drop constraint if exists trip_assignments_user_id_fkey,
  add constraint trip_assignments_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade,
  drop constraint if exists trip_assignments_trip_id_fkey,
  add constraint trip_assignments_trip_id_fkey
    foreign key (trip_id) references public.trips(id) on delete cascade;

alter table public.trip_resources
  drop constraint if exists trip_resources_trip_id_fkey,
  add constraint trip_resources_trip_id_fkey
    foreign key (trip_id) references public.trips(id) on delete cascade;

alter table public.trip_tasks
  drop constraint if exists trip_tasks_trip_id_fkey,
  add constraint trip_tasks_trip_id_fkey
    foreign key (trip_id) references public.trips(id) on delete cascade,
  drop constraint if exists trip_tasks_assigned_to_user_id_fkey,
  add constraint trip_tasks_assigned_to_user_id_fkey
    foreign key (assigned_to_user_id) references public.profiles(id) on delete set null;

alter table public.trip_training_modules
  drop constraint if exists trip_training_modules_trip_id_fkey,
  add constraint trip_training_modules_trip_id_fkey
    foreign key (trip_id) references public.trips(id) on delete cascade;

alter table public.user_training_progress
  drop constraint if exists user_training_progress_trip_id_fkey,
  add constraint user_training_progress_trip_id_fkey
    foreign key (trip_id) references public.trips(id) on delete cascade,
  drop constraint if exists user_training_progress_user_id_fkey,
  add constraint user_training_progress_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade,
  drop constraint if exists user_training_progress_training_module_id_fkey,
  add constraint user_training_progress_training_module_id_fkey
    foreign key (training_module_id) references public.trip_training_modules(id) on delete cascade;

alter table public.user_task_progress
  drop constraint if exists user_task_progress_trip_id_fkey,
  add constraint user_task_progress_trip_id_fkey
    foreign key (trip_id) references public.trips(id) on delete cascade,
  drop constraint if exists user_task_progress_user_id_fkey,
  add constraint user_task_progress_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.fundraising_profiles
  drop constraint if exists fundraising_profiles_trip_id_fkey,
  add constraint fundraising_profiles_trip_id_fkey
    foreign key (trip_id) references public.trips(id) on delete cascade,
  drop constraint if exists fundraising_profiles_user_id_fkey,
  add constraint fundraising_profiles_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;
