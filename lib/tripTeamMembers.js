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

export async function saveTripTeamMembers(tripId, members) {
  const normalizedMembers = (members || [])
    .map((member) => {
      const firstName = String(member?.firstName || "").trim();
      const lastName = String(member?.lastName || "").trim();
      const email = String(member?.email || "").trim().toLowerCase();
      const startDate = String(member?.startDate || "").trim();
      const endDate = String(member?.endDate || "").trim();

      if (!firstName && !lastName && !email && !startDate && !endDate) {
        return null;
      }

      const payload = {
        trip_id: tripId,
        first_name: firstName || null,
        last_name: lastName || null,
        email: email || null,
        start_date: startDate || null,
        end_date: endDate || null,
        updated_at: new Date().toISOString(),
      };

      if (member?.id) {
        payload.id = member.id;
      }

      return payload;
    })
    .filter(Boolean);

  const { data: existingRows, error: existingError } = await supabase
    .from("trip_team_members")
    .select("id")
    .eq("trip_id", tripId);

  if (existingError) {
    console.error("Error loading existing trip team members", existingError);
    throw existingError;
  }

  const existingIds = new Set((existingRows || []).map((row) => row.id));
  const keptIds = new Set(normalizedMembers.map((member) => member.id).filter(Boolean));
  const idsToDelete = Array.from(existingIds).filter((id) => !keptIds.has(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("trip_team_members")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.error("Error deleting trip team members", deleteError);
      throw deleteError;
    }
  }

  if (normalizedMembers.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("trip_team_members")
    .upsert(normalizedMembers, { onConflict: "id" })
    .select("id, trip_id, first_name, last_name, email, start_date, end_date, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error saving trip team members", error);
    throw error;
  }

  return (data || []).map(normalizeTripTeamMember);
}

export async function listTripTeamMembersForDuplicateCheck() {
  const { data, error } = await supabase
    .from("trip_team_members")
    .select("id, trip_id, first_name, last_name, email, start_date, end_date, created_at, updated_at");

  if (error) {
    console.error("Error loading trip team members for duplicate check", error);
    throw error;
  }

  const rows = data || [];
  const tripIds = [...new Set(rows.map((row) => row.trip_id).filter(Boolean))];
  let tripById = new Map();

  if (tripIds.length > 0) {
    const { data: trips, error: tripsError } = await supabase
      .from("trips")
      .select("id, trip_name, team_status, status")
      .in("id", tripIds);

    if (tripsError) {
      console.error("Error loading trips for trip-team duplicate check", tripsError);
      throw tripsError;
    }

    tripById = new Map(
      (trips || []).map((trip) => [
        trip.id,
        {
          id: trip.id || "",
          tripName: String(trip?.trip_name || "").trim(),
          teamStatus: String(trip?.team_status || "").trim(),
          status: String(trip?.status || "").trim().toLowerCase(),
        },
      ])
    );
  }

  return rows.map((row) => {
    const normalized = normalizeTripTeamMember(row);
    const linkedTrip = tripById.get(normalized.tripId) || {};

    return {
      ...normalized,
      tripName: linkedTrip.tripName || "",
      teamStatus: linkedTrip.teamStatus || "",
      tripStatus: linkedTrip.status || "",
    };
  });
}
