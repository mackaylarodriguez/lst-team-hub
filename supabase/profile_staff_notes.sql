create table if not exists public.profile_staff_notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  author_name text,
  author_email text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists profile_staff_notes_profile_id_idx
  on public.profile_staff_notes (profile_id);
