-- Supabase Database Advisor: "RLS disabled in public" (rls_disabled_in_public)
--
-- 1) See which public tables have RLS off:
select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not c.relrowsecurity
order by 1;

-- 2) If a table already has policies but RLS was never turned on, enable RLS safely:
do $fix$
declare
  r record;
  pol_count int;
begin
  for r in
    select c.oid, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
  loop
    select count(*)::int into pol_count from pg_policy where polrelid = r.oid;
    if pol_count > 0 then
      execute format('alter table public.%I enable row level security', r.relname);
      raise notice 'Enabled RLS on public.% (found % existing policies).', r.relname, pol_count;
    else
      raise warning
        'public.%: RLS is off and there are NO policies. Run the matching *_rls.sql from the repo (see comment block below) or the table will stay world-writable until then.',
        r.relname;
    end if;
  end loop;
end
$fix$;

-- 3) Table → migration file (run the full file: enables RLS + creates policies)
--    profiles                    → profiles_rls.sql
--    trips                       → trips_rls.sql  (+ trips_delete_rls.sql if you use delete rules)
--    trip_assignments            → trip_assignments_rls.sql
--    trip_team_members           → trip_team_members_rls.sql
--    trip_budgets                → trip_budgets_rls.sql
--    site_budget_notes           → site_budget_notes_rls.sql
--    trip_housing_entries        → trip_housing_entries_rls.sql
--    trip_resources              → trip_resources_rls.sql
--    trip_tasks                  → trip_tasks_rls.sql (includes user_task_progress)
--    trip_training_modules       → training_rls.sql (includes user_training_progress)
--    trip_tickets                → trip_tickets_rls.sql
--    trip_staff_tasks            → trip_staff_tasks_rls.sql
--    staff_misc_tasks            → staff_misc_tasks_rls.sql
--    travel_form_responses       → travel_form_responses_rls.sql
--    trip_reference_emails       → trip_reference_emails_rls.sql
--    trip_activity               → trip_activity_rls.sql
--    trip_meetings               → trip_meetings_rls.sql
--    trip_travel_safety          → trip_travel_safety_rls.sql
--    trip_travel_safety_acknowledgments → same file
--    trip_announcements          → trip_announcements_rls.sql
--    trip_overview_notes         → trip_overview_notes_rls.sql (+ trip_overview_notes_delete_rls.sql if used)
--    user_documents              → user_documents_rls.sql
--    fundraising_profiles        → fundraising_profiles_rls.sql
--    profile_staff_notes         → profile_staff_notes_rls.sql
--    recruiting_contacts         → recruiting_contacts_rls.sql
--    recruiting_activity_logs    → recruiting_activity_logs_rls.sql
--    recruiting_cycle_contacts   → recruiting_cycle_contacts_rls.sql
--    recruiting_cycle_activity_logs → recruiting_cycle_activity_logs_rls.sql
--    recruiting_saved_filters    → recruiting_saved_filters_rls.sql
--    user_progress leader tweaks → user_progress_leader_rls.sql (redefines policies; run after training_rls + trip_tasks_rls)
