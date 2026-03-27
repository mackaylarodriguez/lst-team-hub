# LST Team Hub (Next.js sample)

## Local Development

- Install deps: `npm install`
- Start app: `npm run dev`
- Build check: `npm run build`
- E2E smoke: `npm run test:e2e`

## Supabase Migration Checklist

Run SQL files in **Supabase SQL Editor** in this order.

### Fresh environment (new project)

1. Core profiles and base access
   - `supabase/profiles_rls.sql`
   - `supabase/trips_rls.sql`
2. Core trip tables and RLS
   - `supabase/trip_assignments_rls.sql`
   - `supabase/trip_team_members.sql`
   - `supabase/trip_team_members_rls.sql`
3. References
   - `supabase/trip_reference_emails.sql`
   - `supabase/trip_reference_emails_rls.sql`
   - `supabase/trip_reference_emails_roster_support.sql`
4. Travel and safety
   - `supabase/trip_travel_safety.sql`
   - `supabase/trip_travel_safety_acknowledgments.sql`
   - `supabase/trip_travel_safety_rls.sql`
5. Travel form, tickets, and meetings
   - `supabase/travel_form_responses.sql`
   - `supabase/travel_form_responses_rls.sql`
   - `supabase/trip_tickets.sql`
   - `supabase/trip_tickets_roster_autocreate.sql`
   - `supabase/trip_tickets_rls.sql`
   - `supabase/trip_meetings.sql`
   - `supabase/trip_meetings_rls.sql`
6. Documents and training/task progress
   - `supabase/user_documents.sql`
   - `supabase/user_documents_rls.sql`
   - `supabase/user_training_progress.sql`
   - `supabase/training_rls.sql`
   - `supabase/trip_tasks_rls.sql`
7. Leader access extensions
   - `supabase/leader_role_rls_updates.sql`
8. Delete policy hardening
   - `supabase/trips_delete_rls.sql`

### Existing environment (already running)

Run only what is missing, in this order:

1. `supabase/trips_rls.sql` (ensures `private.current_profile_role()` exists)
2. `supabase/leader_role_rls_updates.sql` (leader + UID-based access updates)
3. `supabase/trip_reference_emails_roster_support.sql` (roster-only reference rows)
4. `supabase/trip_travel_safety.sql`
5. `supabase/trip_travel_safety_acknowledgments.sql`
6. `supabase/trip_travel_safety_rls.sql`
7. `supabase/trip_meetings.sql`
8. `supabase/trip_meetings_rls.sql`
9. `supabase/trip_tickets_roster_autocreate.sql`
10. `supabase/trips_delete_rls.sql`

## E2E Smoke Test Environment Variables

Set these before running Playwright smoke tests:

- `E2E_EMAIL`
- `E2E_PASSWORD`
- `E2E_TRIP_ID`

Optional:

- `PLAYWRIGHT_BASE_URL` (defaults to `http://127.0.0.1:3000`)
