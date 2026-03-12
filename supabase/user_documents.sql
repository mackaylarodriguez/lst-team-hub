create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  document_type text not null,
  title text not null,
  storage_bucket text not null default 'worker-documents',
  storage_path text not null,
  file_url text not null,
  uploaded_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists user_documents_user_id_idx
  on public.user_documents (user_id);

create index if not exists user_documents_trip_id_idx
  on public.user_documents (trip_id);

create unique index if not exists user_documents_user_trip_type_idx
  on public.user_documents (user_id, trip_id, document_type)
  where trip_id is not null;

insert into storage.buckets (id, name, public)
values ('worker-documents', 'worker-documents', true)
on conflict (id) do nothing;
