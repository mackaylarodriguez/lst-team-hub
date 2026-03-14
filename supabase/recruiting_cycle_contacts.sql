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

create table if not exists public.recruiting_cycle_contacts (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.recruiting_contacts(id) on delete cascade,
  recruiting_year integer not null,
  priority text,
  alumni_year_label text,
  stage integer not null default 0,
  is_potential_team boolean not null default false,
  interested_trip text,
  team_name text,
  team_members text,
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
  bulk_last_contacted_at timestamp with time zone,
  bulk_last_contact_method text,
  is_converted_to_team boolean not null default false,
  converted_team_id uuid references public.trips(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (contact_id, recruiting_year)
);

alter table public.recruiting_cycle_contacts
  add column if not exists is_potential_team boolean not null default false;

create index if not exists recruiting_cycle_contacts_year_idx
  on public.recruiting_cycle_contacts (recruiting_year);

create index if not exists recruiting_cycle_contacts_stage_idx
  on public.recruiting_cycle_contacts (recruiting_year, stage);

create index if not exists recruiting_cycle_contacts_potential_idx
  on public.recruiting_cycle_contacts (recruiting_year, is_potential_team);

create index if not exists recruiting_cycle_contacts_follow_up_idx
  on public.recruiting_cycle_contacts (recruiting_year, next_follow_up);

create index if not exists recruiting_cycle_contacts_converted_idx
  on public.recruiting_cycle_contacts (recruiting_year, is_converted_to_team, converted_team_id);

create index if not exists recruiting_cycle_contacts_assigned_to_idx
  on public.recruiting_cycle_contacts (recruiting_year, assigned_to);

insert into public.recruiting_cycle_contacts (
  contact_id,
  recruiting_year,
  priority,
  alumni_year_label,
  stage,
  interested_trip,
  team_name,
  project_dates,
  site,
  weeks,
  departure_date,
  assigned_to,
  last_contacted_at,
  last_contact_method,
  next_follow_up,
  mackayla_notes,
  leslee_notes,
  is_converted_to_team,
  converted_team_id,
  created_at,
  updated_at
)
select
  rc.id,
  extract(year from now())::integer,
  rc.priority,
  case when rc.alumni_2026 then '2026 Alumni' else null end,
  greatest(least(coalesce(rc.stage, 0), 3), 0),
  rc.interested_trip,
  rc.team_name,
  rc.project_dates,
  rc.site,
  rc.weeks,
  rc.departure_date,
  rc.assigned_to,
  rc.last_contacted_at,
  rc.last_contact_method,
  rc.next_follow_up,
  rc.mackayla_notes,
  rc.leslee_notes,
  rc.is_converted_to_team,
  rc.converted_team_id,
  coalesce(rc.created_at, now()),
  coalesce(rc.updated_at, now())
from public.recruiting_contacts rc
on conflict (contact_id, recruiting_year) do nothing;
