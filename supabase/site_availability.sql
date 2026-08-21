-- Site availability seasons (staff Sites → Availability).
-- Run once in the Supabase SQL editor.

create schema if not exists private;

create or replace function private.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(trim(p.role))
  from public.profiles as p
  where p.id = auth.uid()
     or lower(trim(p.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  order by case when p.id = auth.uid() then 0 else 1 end
  limit 1;
$$;

revoke all on function private.current_profile_role() from public;
grant execute on function private.current_profile_role() to authenticated;

create table if not exists public.site_availability (
  id uuid primary key default gen_random_uuid(),
  site_name text not null,
  year integer not null,
  available_start date,
  available_end date,
  site_type text,
  church_name text,
  other_backgrounds text,
  preferred_team_size text,
  holidays text,
  team_notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_name, year)
);

alter table public.site_availability
  add column if not exists church_name text;

alter table public.site_availability
  add column if not exists other_backgrounds text;

alter table public.site_availability
  add column if not exists preferred_team_size text;

alter table public.site_availability
  add column if not exists holidays text;

alter table public.site_availability
  add column if not exists available_ranges jsonb not null default '[]'::jsonb;

-- Backfill split-season storage from legacy single start/end when ranges are empty.
update public.site_availability
set available_ranges = jsonb_build_array(
  jsonb_build_object(
    'start', available_start::text,
    'end', available_end::text
  )
)
where coalesce(jsonb_array_length(available_ranges), 0) = 0
  and available_start is not null
  and available_end is not null;

create index if not exists site_availability_year_idx
  on public.site_availability (year);

create index if not exists site_availability_site_name_idx
  on public.site_availability (site_name);

comment on table public.site_availability is
  'Per-site hosting season for a calendar year (Sites → Availability). available_ranges holds one or more windows; available_start/end are the outer summary.';

create table if not exists public.site_availability_grid_prefs (
  year integer primary key,
  visible_site_names jsonb not null default '[]'::jsonb,
  known_site_names jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.site_availability_grid_prefs is
  'Which sites are checked/shown on the Availability overview grid per year.';

alter table public.site_availability enable row level security;
alter table public.site_availability_grid_prefs enable row level security;

drop policy if exists "site_availability_select_staff" on public.site_availability;
create policy "site_availability_select_staff"
on public.site_availability
for select
to authenticated
using (private.current_profile_role() in ('admin', 'staff'));

drop policy if exists "site_availability_insert_staff" on public.site_availability;
create policy "site_availability_insert_staff"
on public.site_availability
for insert
to authenticated
with check (private.current_profile_role() in ('admin', 'staff'));

drop policy if exists "site_availability_update_staff" on public.site_availability;
create policy "site_availability_update_staff"
on public.site_availability
for update
to authenticated
using (private.current_profile_role() in ('admin', 'staff'))
with check (private.current_profile_role() in ('admin', 'staff'));

drop policy if exists "site_availability_delete_staff" on public.site_availability;
create policy "site_availability_delete_staff"
on public.site_availability
for delete
to authenticated
using (private.current_profile_role() in ('admin', 'staff'));

drop policy if exists "site_availability_grid_prefs_select_staff" on public.site_availability_grid_prefs;
create policy "site_availability_grid_prefs_select_staff"
on public.site_availability_grid_prefs
for select
to authenticated
using (private.current_profile_role() in ('admin', 'staff'));

drop policy if exists "site_availability_grid_prefs_upsert_staff" on public.site_availability_grid_prefs;
create policy "site_availability_grid_prefs_upsert_staff"
on public.site_availability_grid_prefs
for all
to authenticated
using (private.current_profile_role() in ('admin', 'staff'))
with check (private.current_profile_role() in ('admin', 'staff'));
