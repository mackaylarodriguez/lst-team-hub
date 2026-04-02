-- Fix: Supabase/PostgREST upsert uses ON CONFLICT (trip_id, user_id) / (trip_id, trip_team_member_id)
-- without a partial-index WHERE clause. Partial unique indexes do not satisfy that inference.
-- Non-partial unique indexes work: PostgreSQL treats NULLs as distinct, so roster rows
-- (user_id null, member set) and user rows (member null, user set) still fit the XOR check.

drop index if exists public.travel_form_responses_trip_user_unique_idx;
drop index if exists public.travel_form_responses_trip_member_unique_idx;

create unique index if not exists travel_form_responses_trip_user_upsert_uniq
  on public.travel_form_responses (trip_id, user_id);

create unique index if not exists travel_form_responses_trip_roster_upsert_uniq
  on public.travel_form_responses (trip_id, trip_team_member_id);
