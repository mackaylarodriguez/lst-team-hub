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

function shouldIncludeFundraisingWorker(trip, email, rosterByEmail) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return true;
  const rosterMember =
    rosterByEmail?.get(normalizedEmail) ||
    (trip?.teamMembers || []).find((member) => normalizeEmail(member.email) === normalizedEmail);
  if (!rosterMember) return true;
  const role = String(rosterMember.teamRole || "").trim().toLowerCase();
  if (role === "leader" && rosterMember.travelsWithTeam === false) return false;
  return true;
}

/**
 * Each roster member's goal (individual override on roster, else trip default per person).
 * Roster is the source of truth — not every worker has a trip participant row yet.
 */
export function resolveMemberFundraisingGoalForBudget({ rosterMember, tripFundraisingGoalAmount }) {
  return resolveRosterMemberFundraisingGoalAmount(rosterMember, tripFundraisingGoalAmount);
}

/** Same workers as Fundraising tiles: full roster first, then participants missing from roster. */
export function buildTeamFundraisingWorkerRows(trip) {
  if (!trip) return [];

  const rosterMembers = trip.teamMembers || [];
  const rosterByEmail = new Map(
    rosterMembers.filter((member) => member?.email).map((member) => [normalizeEmail(member.email), member])
  );
  const seen = new Set();
  const rows = [];

  for (const member of rosterMembers) {
    const email = normalizeEmail(member.email);
    if (!email || seen.has(email)) continue;
    if (!shouldIncludeFundraisingWorker(trip, email, rosterByEmail)) continue;
    seen.add(email);
    const name =
      String(member.name || "").trim() ||
      [member.firstName, member.lastName].filter(Boolean).join(" ").trim() ||
      email;
    rows.push({
      email,
      name,
      fundraisingGoalAmount: resolveMemberFundraisingGoalForBudget({
        rosterMember: member,
        tripFundraisingGoalAmount: trip?.fundraisingGoalAmount,
      }),
    });
  }

  for (const participant of trip.participants || []) {
    const email = normalizeEmail(participant.email);
    if (!email || seen.has(email)) continue;
    if (!shouldIncludeFundraisingWorker(trip, email, rosterByEmail)) continue;
    seen.add(email);
    const name =
      String(participant.name || "").trim() ||
      [participant.firstName, participant.lastName].filter(Boolean).join(" ").trim() ||
      email;
    rows.push({
      email,
      name,
      fundraisingGoalAmount: resolveWorkerFundraisingGoalAmount({
        participant,
        rosterMember: null,
        tripFundraisingGoalAmount: trip?.fundraisingGoalAmount,
      }),
    });
  }

  rows.sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" })
  );

  return rows;
}

/** Sum of each fundraising worker's resolved goal (individual amounts combined). */
export function computeTeamFundraisingGoalTotal(trip) {
  return buildTeamFundraisingWorkerRows(trip).reduce(
    (sum, row) => sum + (parsePositiveFundraisingGoal(row.fundraisingGoalAmount) ?? 0),
    0
  );
}

/** Suggested team budget when trip_budgets.budget_amount is unset (display/save only; never mutates roster goals). */
export function computeDefaultTeamBudgetFromFundraising({
  trip,
  teamMembers,
  participants,
  tripFundraisingGoalAmount,
  fundraisingMode,
} = {}) {
  const tripLike =
    trip ||
    (teamMembers || participants
      ? {
          teamMembers: teamMembers || [],
          participants: participants || [],
          fundraisingGoalAmount: tripFundraisingGoalAmount,
          fundraisingMode,
        }
      : null);

  if (tripLike) {
    return computeTeamFundraisingGoalTotal(tripLike);
  }

  return 0;
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
