import { coerceSqlDateToYmd } from "@/lib/isoDateYmd";
import { resolveProjectLengthForLock, firstNonBlankValue } from "@/lib/teamLockProjectLength";

function normalizeText(value) {
  return String(value || "").trim();
}

function mapTeamMemberRow(row) {
  return {
    firstName: normalizeText(row?.first_name),
    lastName: normalizeText(row?.last_name),
    first_name: row?.first_name,
    last_name: row?.last_name,
    email: normalizeText(row?.email).toLowerCase(),
    teamRole: normalizeText(row?.team_role),
    team_role: row?.team_role,
    travelsWithTeam: row?.travels_with_team !== false,
    travels_with_team: row?.travels_with_team,
    fundraisingGoalAmount: row?.fundraising_goal_amount,
  };
}

export async function loadTripEmailContext(admin, tripId) {
  const { data: trip, error: tripError } = await admin
    .from("trips")
    .select(
      "id, trip_name, name, location, host, start_date, end_date, project_length_summary, fundraising_goal_amount, extra_travel_status, trip_fee_amount, materials_fee_amount, hannover_housing_fee_amount"
    )
    .eq("id", tripId)
    .maybeSingle();

  if (tripError) {
    throw tripError;
  }
  if (!trip) {
    throw new Error("Trip not found.");
  }

  const { data: teamMembers, error: membersError } = await admin
    .from("trip_team_members")
    .select("first_name, last_name, email, team_role, travels_with_team, fundraising_goal_amount")
    .eq("trip_id", tripId);

  if (membersError) {
    throw membersError;
  }

  const { data: recruitingRow } = await admin
    .from("recruiting_cycle_contacts")
    .select("assigned_to, weeks, project_dates, pending_lock_team_setup")
    .eq("converted_team_id", tripId)
    .maybeSingle();

  const pending = recruitingRow?.pending_lock_team_setup;
  const pendingProjectLength =
    pending && typeof pending === "object"
      ? normalizeText(pending.projectLengthSummary)
      : "";

  const projectLengthSummary = resolveProjectLengthForLock({
    projectLengthSummary: firstNonBlankValue(
      normalizeText(trip?.project_length_summary),
      pendingProjectLength
    ),
    weeks: normalizeText(recruitingRow?.weeks),
    projectDates: normalizeText(recruitingRow?.project_dates),
    startDate: coerceSqlDateToYmd(trip?.start_date) || "",
    endDate: coerceSqlDateToYmd(trip?.end_date) || "",
  });

  return {
    tripId,
    tripName: normalizeText(trip?.trip_name || trip?.name) || "Untitled trip",
    tripLocation: normalizeText(trip?.location),
    host: normalizeText(trip?.host),
    startDate: coerceSqlDateToYmd(trip?.start_date) || "",
    endDate: coerceSqlDateToYmd(trip?.end_date) || "",
    projectLengthSummary,
    projectDates: normalizeText(recruitingRow?.project_dates),
    weeks: normalizeText(recruitingRow?.weeks),
    fundraisingGoalAmount: trip?.fundraising_goal_amount ?? "",
    extraTravelStatus: normalizeText(trip?.extra_travel_status) || "no",
    tripFeeAmount: trip?.trip_fee_amount ?? "",
    materialsFeeAmount: trip?.materials_fee_amount ?? "",
    hannoverHousingFeeAmount: trip?.hannover_housing_fee_amount ?? "",
    teamDeveloper: normalizeText(recruitingRow?.assigned_to),
    teamMembers: (teamMembers || []).map(mapTeamMemberRow),
  };
}
