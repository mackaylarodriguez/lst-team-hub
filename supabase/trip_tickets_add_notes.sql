-- Free-form notes per ticket row (Budget → Ticketing).

alter table public.trip_tickets
  add column if not exists notes text;

comment on column public.trip_tickets.notes is 'Internal notes for this airfare/ticket row.';
