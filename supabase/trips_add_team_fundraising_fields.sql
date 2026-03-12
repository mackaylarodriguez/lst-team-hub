alter table public.trips
add column if not exists team_fundraising_url text,
add column if not exists team_neon_account_id text;
