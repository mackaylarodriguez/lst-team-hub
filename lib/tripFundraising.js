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

/** Same worker rows + resolved goals as Fundraising participant tiles (participants + roster-only). */
export function buildTeamFundraisingWorkerRows(trip) {
  if (!trip) return [];

  const tripDefaultGoal = parsePositiveFundraisingGoal(trip?.fundraisingGoalAmount);
  const rosterByEmail = new Map(
    (trip.teamMembers || []).filter((member) => member?.email).map((member) => [normalizeEmail(member.email), member])
  );
  const participantEmails = new Set(
    (trip.participants || []).map((participant) => normalizeEmail(participant.email)).filter(Boolean)
  );

  const mergedParticipants = (trip.participants || []).map((participant) => {
    const rosterMember = rosterByEmail.get(normalizeEmail(participant.email));
    const participantGoal = parsePositiveFundraisingGoal(participant?.fundraisingGoalAmount);
    const rosterGoal = parsePositiveFundraisingGoal(rosterMember?.fundraisingGoalAmount);
    return {
      ...participant,
      email: participant.email || "",
      fundraisingGoalAmount: participantGoal ?? rosterGoal ?? tripDefaultGoal,
    };
  });

  const rosterOnly = (trip.teamMembers || [])
    .filter((member) => {
      const email = normalizeEmail(member.email);
      return email && !participantEmails.has(email);
    })
    .map((member) => ({
      email: member.email || "",
      fundraisingGoalAmount:
        parsePositiveFundraisingGoal(member.fundraisingGoalAmount) ?? tripDefaultGoal,
    }));

  return [...mergedParticipants, ...rosterOnly].filter((row) =>
    shouldIncludeFundraisingWorker(trip, row.email, rosterByEmail)
  );
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
