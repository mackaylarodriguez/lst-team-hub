import { supabase } from "@/lib/supabase";

function normalizeFundraisingRow(row) {
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
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

export async function saveFundraisingProfile({
  tripId,
  userId,
  fundraisingUrl,
}) {
  const { data: existing, error: existingError } = await supabase
    .from("fundraising_profiles")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking fundraising profile", existingError);
    throw existingError;
  }

  const payload = {
    trip_id: tripId,
    user_id: userId,
    fundraising_url: String(fundraisingUrl || "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const query = existing
    ? supabase.from("fundraising_profiles").update(payload).eq("id", existing.id)
    : supabase.from("fundraising_profiles").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    console.error("Error saving fundraising profile", error);
    throw error;
  }

  return normalizeFundraisingRow(data);
}
