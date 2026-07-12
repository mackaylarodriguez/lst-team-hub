import { supabase } from "@/lib/supabase";

export function parsePositiveFundraisingGoal(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Personal override, then roster row, then trip-level default. */
export function resolveWorkerFundraisingGoalAmount({
  participant,
  rosterMember,
  tripFundraisingGoalAmount,
}) {
  return (
    parsePositiveFundraisingGoal(participant?.fundraisingGoalAmount) ??
    parsePositiveFundraisingGoal(rosterMember?.fundraisingGoalAmount) ??
    parsePositiveFundraisingGoal(tripFundraisingGoalAmount) ??
    0
  );
}

export function resolveRosterMemberFundraisingGoalAmount(rosterMember, tripFundraisingGoalAmount) {
  return (
    parsePositiveFundraisingGoal(rosterMember?.fundraisingGoalAmount) ??
    parsePositiveFundraisingGoal(tripFundraisingGoalAmount) ??
    0
  );
}

function isWorkerRosterMember(member) {
  const role = String(member?.teamRole || "Worker").trim().toLowerCase();
  if (role === "leader") return false;
  return member?.travelsWithTeam !== false;
}

/** Suggested team budget when trip_budgets.budget_amount is unset (display/save only; never mutates roster goals). */
export function computeDefaultTeamBudgetFromRoster({
  teamMembers,
  tripFundraisingGoalAmount,
  fundraisingMode,
} = {}) {
  if (normalizeFundraisingMode(fundraisingMode) === "team") {
    return parsePositiveFundraisingGoal(tripFundraisingGoalAmount) ?? 0;
  }

  return (teamMembers || [])
    .filter(isWorkerRosterMember)
    .reduce(
      (sum, member) => sum + resolveRosterMemberFundraisingGoalAmount(member, tripFundraisingGoalAmount),
      0
    );
}

export function normalizeFundraisingMode(value) {
  return String(value || "").toLowerCase().trim() === "team" ? "team" : "individual";
}

export async function saveTripFundraisingSettings({
  tripId,
  teamFundraisingUrl,
  fundraisingGoalAmount,
  fundraisingMode,
}) {
  const normalizedTeamFundraisingUrl =
    String(teamFundraisingUrl || "").trim() || null;
  const normalizedFundraisingGoalAmount =
    fundraisingGoalAmount === null ||
    fundraisingGoalAmount === undefined ||
    fundraisingGoalAmount === ""
      ? null
      : Number(fundraisingGoalAmount);
  const normalizedMode = normalizeFundraisingMode(fundraisingMode);

  const { data, error } = await supabase
    .from("trips")
    .update({
      team_fundraising_url: normalizedTeamFundraisingUrl,
      fundraising_goal_amount: normalizedFundraisingGoalAmount,
      fundraising_mode: normalizedMode,
    })
    .eq("id", tripId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Error saving trip fundraising settings", error);
    throw error;
  }

  return (
    data || {
      id: tripId,
      team_fundraising_url: normalizedTeamFundraisingUrl,
      fundraising_goal_amount: normalizedFundraisingGoalAmount,
      fundraising_mode: normalizedMode,
    }
  );
}
