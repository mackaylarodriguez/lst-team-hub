import { supabase } from "@/lib/supabase";

export async function saveTripFundraisingSettings({
  tripId,
  teamFundraisingUrl,
  teamNeonAccountId,
}) {
  const { data, error } = await supabase
    .from("trips")
    .update({
      team_fundraising_url: String(teamFundraisingUrl || "").trim() || null,
      team_neon_account_id: String(teamNeonAccountId || "").trim() || null,
    })
    .eq("id", tripId)
    .select("*")
    .single();

  if (error) {
    console.error("Error saving trip fundraising settings", error);
    throw error;
  }

  return data;
}
