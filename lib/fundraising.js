import { supabase } from "@/lib/supabase";

function normalizeFundraisingRow(row) {
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
    goalAmount: Number(row.goal_amount || 0),
    raisedAmount: Number(row.raised_amount || 0),
    fundraisingUrl: row.fundraising_url || "",
    updatedAt: row.updated_at || "",
  };
}

export async function listFundraisingProfiles(tripId) {
  const { data, error } = await supabase
    .from("fundraising_profiles")
    .select("*")
    .eq("trip_id", tripId);

  if (error) {
    console.error("Error loading fundraising profiles", error);
    throw error;
  }

  return (data || []).map(normalizeFundraisingRow);
}
