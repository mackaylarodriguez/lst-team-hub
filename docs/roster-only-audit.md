# Roster-only Support Audit

This audit identifies trip-scoped features still keyed only by `user_id` and therefore not fully editable for roster-only members (no Hub account yet).

## Already supported

- `trip_reference_emails` supports both:
  - `user_id` (connected account)
  - `trip_team_member_id` (roster-only)

## Gaps found (trip-scoped and user-keyed)

1. `travel_form_responses`
   - Table currently requires `user_id` and unique `(trip_id, user_id)`.
   - Impact: staff cannot prefill/edit travel-form data for roster-only members.
2. `user_training_progress`
   - Table keyed by `(trip_id, user_id, training_module_id)`.
   - Impact: training completion can only persist for connected users.
3. `user_documents`
   - Table requires `user_id`.
   - Impact: upload slots rely on connected users (expected for real uploads, but not for pre-account placeholders).
4. `trip_travel_safety_acknowledgments`
   - Requires `user_id` (intentional for legal acknowledgment identity).
   - Impact: roster-only users cannot acknowledge until account exists.

## Recommendation

Implement roster support in phases:

1. Phase 1 (highest impact) - implemented
   - `travel_form_responses`: nullable `trip_team_member_id`, XOR check (`user_id` or `trip_team_member_id`), partial unique indexes.
   - Travel form UI and data layer now key rows by `user:<id>` / `roster:<tripTeamMemberId>`.
2. Phase 2
   - `user_training_progress`: same dual-key pattern for roster-only progress.
3. Phase 3
   - Evaluate whether `user_documents` should remain account-bound, or add roster placeholders as separate metadata rows.
