-- Auto-ticket support for roster members.
-- Keeps ticket rows if roster members are removed.

alter table public.trip_tickets
  add column if not exists trip_team_member_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trip_tickets_trip_team_member_id_fkey'
  ) then
    alter table public.trip_tickets
      add constraint trip_tickets_trip_team_member_id_fkey
      foreign key (trip_team_member_id)
      references public.trip_team_members(id)
      on delete set null;
  end if;
end $$;

create index if not exists trip_tickets_trip_team_member_id_idx
  on public.trip_tickets (trip_team_member_id);

create unique index if not exists trip_tickets_trip_member_unique_idx
  on public.trip_tickets (trip_id, trip_team_member_id)
  where trip_team_member_id is not null;
