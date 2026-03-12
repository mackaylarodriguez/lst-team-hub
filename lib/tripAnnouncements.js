import { supabase } from "@/lib/supabase";

function normalizeTripAnnouncementRow(data) {
  return {
    id: data?.id || null,
    tripId: data?.trip_id || "",
    message: data?.message || "",
    authorName: data?.author_name || "",
    authorEmail: data?.author_email || "",
    updatedAt: data?.updated_at || "",
  };
}

export async function listTripAnnouncements(tripId) {
  const { data, error } = await supabase
    .from("trip_announcements")
    .select("id, trip_id, message, author_name, author_email, updated_at")
    .eq("trip_id", tripId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error loading trip announcements", error);
    throw error;
  }

  return (data || []).map(normalizeTripAnnouncementRow);
}

export async function saveTripAnnouncement({ id, tripId, message, authorName, authorEmail }) {
  const payload = {
    trip_id: tripId,
    message: String(message || "").trim() || null,
    author_name: String(authorName || "").trim() || null,
    author_email: String(authorEmail || "").trim().toLowerCase() || null,
    updated_at: new Date().toISOString(),
  };

  const query = id
    ? supabase.from("trip_announcements").update(payload).eq("id", id)
    : supabase.from("trip_announcements").insert(payload);

  const { data, error } = await query
    .select("id, trip_id, message, author_name, author_email, updated_at")
    .single();

  if (error) {
    console.error("Error saving trip announcement", error);
    throw error;
  }

  return normalizeTripAnnouncementRow(data);
}

export async function deleteTripAnnouncement(id) {
  const { error } = await supabase.from("trip_announcements").delete().eq("id", id);

  if (error) {
    console.error("Error deleting trip announcement", error);
    throw error;
  }
}
