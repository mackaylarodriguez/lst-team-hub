import { supabase } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/resendMail";

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

function isNonTravelingLeader(member) {
  return (
    String(member?.teamRole || "").trim().toLowerCase() === "leader" &&
    member?.travelsWithTeam === false
  );
}

/** People who count toward individual fundraising / team budget rollups (participants + roster, de-duped by email). */
export function listFundraisingWorkerEntries({ teamMembers, participants } = {}) {
  const rosterByEmail = new Map(
    (teamMembers || []).filter((member) => member?.email).map((member) => [normalizeEmail(member.email), member])
  );
  const seen = new Set();
  const entries = [];

  for (const participant of participants || []) {
    const email = normalizeEmail(participant?.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    const rosterMember = rosterByEmail.get(email);
    if (rosterMember && isNonTravelingLeader(rosterMember)) continue;
    entries.push({ participant, rosterMember: rosterMember || null });
  }

  for (const member of teamMembers || []) {
    const email = normalizeEmail(member?.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    if (isNonTravelingLeader(member)) continue;
    entries.push({ participant: null, rosterMember: member });
  }

  return entries;
}

/** Suggested team budget when trip_budgets.budget_amount is unset (display/save only; never mutates roster goals). */
export function computeDefaultTeamBudgetFromFundraising({
  teamMembers,
  participants,
  tripFundraisingGoalAmount,
  fundraisingMode,
} = {}) {
  if (normalizeFundraisingMode(fundraisingMode) === "team") {
    return parsePositiveFundraisingGoal(tripFundraisingGoalAmount) ?? 0;
  }

  return listFundraisingWorkerEntries({ teamMembers, participants }).reduce((sum, entry) => {
    return (
      sum +
      resolveWorkerFundraisingGoalAmount({
        participant: entry.participant,
        rosterMember: entry.rosterMember,
        tripFundraisingGoalAmount,
      })
    );
  }, 0);
}

/** @deprecated Use computeDefaultTeamBudgetFromFundraising */
export function computeDefaultTeamBudgetFromRoster(args) {
  return computeDefaultTeamBudgetFromFundraising(args);
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
