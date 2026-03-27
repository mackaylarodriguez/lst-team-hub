import { supabase } from "@/lib/supabase";

function normalize(row) {
  if (!row) return null;
  return {
    id: row.id || "",
    tripId: row.trip_id || "",
    title: String(row.title || "").trim(),
    scheduledAt: row.scheduled_at || "",
    notesAfter: String(row.notes_after || ""),
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

export async function listTripMeetings(tripId) {
  if (!tripId) return [];

  const { data, error } = await supabase
    .from("trip_meetings")
    .select("*")
    .eq("trip_id", tripId)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("Error loading trip meetings", error);
    throw error;
  }

  return (data || []).map(normalize).filter(Boolean);
}

export async function saveTripMeeting({ id, tripId, title, scheduledAt, notesAfter }) {
  if (!tripId || !scheduledAt) {
    throw new Error("Meeting date/time is required.");
  }

  const payload = {
    trip_id: tripId,
    title: String(title || "").trim() || null,
    scheduled_at: scheduledAt,
    notes_after: String(notesAfter || "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const query = id
    ? supabase.from("trip_meetings").update(payload).eq("id", id)
    : supabase.from("trip_meetings").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    console.error("Error saving trip meeting", error);
    throw error;
  }

  return normalize(data);
}

export async function deleteTripMeeting(id) {
  const { error } = await supabase.from("trip_meetings").delete().eq("id", id);
  if (error) {
    console.error("Error deleting trip meeting", error);
    throw error;
  }
}
