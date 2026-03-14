create table if not exists public.recruiting_contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  phone text,
  gender text,
  priority text,
  alumni_2026 boolean not null default false,
  stage integer not null default 0,
  interested_trip text,
  team_name text,
  project_dates text,
  site text,
  weeks integer,
  departure_date date,
  assigned_to text,
  last_contacted_at timestamp with time zone,
  last_contact_method text,
  next_follow_up date,
  mackayla_notes text,
  leslee_notes text,
  is_converted_to_team boolean not null default false,
  converted_team_id uuid references public.trips(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists recruiting_contacts_stage_idx
  on public.recruiting_contacts (stage);

create index if not exists recruiting_contacts_follow_up_idx
  on public.recruiting_contacts (next_follow_up);

create index if not exists recruiting_contacts_converted_idx
  on public.recruiting_contacts (is_converted_to_team, converted_team_id);

create index if not exists recruiting_contacts_assigned_to_idx
  on public.recruiting_contacts (assigned_to);

create index if not exists recruiting_contacts_email_idx
  on public.recruiting_contacts (lower(email));
