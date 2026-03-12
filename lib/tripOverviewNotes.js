import { supabase } from "@/lib/supabase";

function normalizeOverviewNoteRow(data) {
  return {
    id: data?.id || null,
    tripId: data?.trip_id || "",
    note: data?.note || "",
    authorName: data?.author_name || "",
    authorEmail: data?.author_email || "",
    updatedAt: data?.updated_at || "",
  };
}

export async function listTripOverviewNotes(tripId) {
  const { data, error } = await supabase
    .from("trip_overview_notes")
    .select("id, trip_id, note, author_name, author_email, updated_at")
    .eq("trip_id", tripId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error loading trip overview notes", error);
    throw error;
  }

  return (data || []).map(normalizeOverviewNoteRow);
}

export async function saveTripOverviewNote({ id, tripId, note, authorName, authorEmail }) {
  const payload = {
    trip_id: tripId,
    note: String(note || "").trim() || null,
    author_name: String(authorName || "").trim() || null,
    author_email: String(authorEmail || "").trim().toLowerCase() || null,
    updated_at: new Date().toISOString(),
  };

  const query = id
    ? supabase.from("trip_overview_notes").update(payload).eq("id", id)
    : supabase.from("trip_overview_notes").insert(payload);

  const { data, error } = await query
    .select("id, trip_id, note, author_name, author_email, updated_at")
    .single();

  if (error) {
    console.error("Error saving trip overview note", error);
    throw error;
  }

  return normalizeOverviewNoteRow(data);
}

export async function deleteTripOverviewNote(id) {
  const { error } = await supabase.from("trip_overview_notes").delete().eq("id", id);

  if (error) {
    console.error("Error deleting trip overview note", error);
    throw error;
  }
}
