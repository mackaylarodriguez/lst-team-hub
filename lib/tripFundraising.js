import { supabase } from "@/lib/supabase";

export async function saveTripFundraisingSettings({
  tripId,
  teamFundraisingUrl,
  teamNeonAccountId,
}) {
  const normalizedTeamFundraisingUrl =
    String(teamFundraisingUrl || "").trim() || null;
  const normalizedTeamNeonAccountId =
    String(teamNeonAccountId || "").trim() || null;

  const { data, error } = await supabase
    .from("trips")
    .update({
      team_fundraising_url: normalizedTeamFundraisingUrl,
      team_neon_account_id: normalizedTeamNeonAccountId,
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
      team_neon_account_id: normalizedTeamNeonAccountId,
    }
  );
}
