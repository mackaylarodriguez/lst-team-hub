import { supabase } from "@/lib/supabase";

export async function getTripOverviewNote(tripId) {
  const { data, error } = await supabase
    .from("trip_overview_notes")
    .select("id, trip_id, note, updated_at")
    .eq("trip_id", tripId)
    .maybeSingle();

  if (error) {
    console.error("Error loading trip overview note", error);
    throw error;
  }

  return {
    id: data?.id || null,
    tripId,
    note: data?.note || "",
    updatedAt: data?.updated_at || "",
  };
}

export async function saveTripOverviewNote({ tripId, note }) {
  const { data: existing, error: existingError } = await supabase
    .from("trip_overview_notes")
    .select("id")
    .eq("trip_id", tripId)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking trip overview note", existingError);
    throw existingError;
  }

  const payload = {
    trip_id: tripId,
    note: String(note || "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const query = existing
    ? supabase.from("trip_overview_notes").update(payload).eq("id", existing.id)
    : supabase.from("trip_overview_notes").insert(payload);

  const { data, error } = await query.select("id, trip_id, note, updated_at").single();

  if (error) {
    console.error("Error saving trip overview note", error);
    throw error;
  }

  return {
    id: data.id,
    tripId: data.trip_id,
    note: data.note || "",
    updatedAt: data.updated_at || "",
  };
}
