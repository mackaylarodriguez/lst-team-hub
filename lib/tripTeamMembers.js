import { supabase } from "@/lib/supabase";

function normalizeTripTeamMember(row) {
  const firstName = String(row?.first_name || "").trim();
  const lastName = String(row?.last_name || "").trim();
  const email = String(row?.email || "").trim().toLowerCase();

  return {
    id: row?.id || "",
    tripId: row?.trip_id || "",
    firstName,
    lastName,
    email,
    startDate: row?.start_date || "",
    endDate: row?.end_date || "",
    createdAt: row?.created_at || "",
    updatedAt: row?.updated_at || "",
    name: [firstName, lastName].filter(Boolean).join(" ").trim() || email || "Unnamed member",
  };
}

export async function listTripTeamMembers(tripId) {
  const { data, error } = await supabase
    .from("trip_team_members")
    .select("id, trip_id, first_name, last_name, email, start_date, end_date, created_at, updated_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading trip team members", error);
    throw error;
  }

  return (data || []).map(normalizeTripTeamMember);
}
