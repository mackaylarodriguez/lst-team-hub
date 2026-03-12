alter table public.fundraising_profiles
add column if not exists neon_user_account_id text;
