import { supabase } from "@/lib/supabase";

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
