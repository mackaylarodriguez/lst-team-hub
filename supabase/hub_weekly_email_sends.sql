-- Log of Monday weekly emails (worker digest and staff task digest).
-- Run once in the Supabase SQL editor. Service role writes rows; admins can read them.

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

create table if not exists public.hub_weekly_email_sends (
  id uuid primary key default gen_random_uuid(),
  resend_id text,
  kind text not null,
  source text not null default 'cron',
  status text not null,
  recipient_email text not null,
  recipient_name text,
  subject text,
  trip_names text,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists hub_weekly_email_sends_created_at_idx
  on public.hub_weekly_email_sends (created_at desc);

comment on table public.hub_weekly_email_sends is
  'Monday weekly email sends for workers and staff. Archived trips are never included.';

alter table public.hub_weekly_email_sends enable row level security;

drop policy if exists "hub_weekly_email_sends_select_admin" on public.hub_weekly_email_sends;
create policy "hub_weekly_email_sends_select_admin"
on public.hub_weekly_email_sends
for select
to authenticated
using (private.current_profile_role() = 'admin');
