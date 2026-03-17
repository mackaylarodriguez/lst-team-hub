create table if not exists public.trip_tickets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  intl_dom text,
  worker_name text,
  project_country text,
  project_city text,
  departure_date date,
  ticket_agency text,
  total_ticket_cost text,
  amount_worker_paid text,
  total_lst_cost text,
  hp_total_charge text,
  date_approved_to_withdraw date,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create index if not exists trip_tickets_trip_id_idx on public.trip_tickets (trip_id);
