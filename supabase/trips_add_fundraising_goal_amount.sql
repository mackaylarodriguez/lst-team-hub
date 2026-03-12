alter table public.trips
add column if not exists fundraising_goal_amount numeric default 0;
