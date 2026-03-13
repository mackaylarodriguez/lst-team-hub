import { supabase } from "@/lib/supabase";

function normalizeTripActivityRow(row) {
  return {
    id: row?.id || "",
    tripId: row?.trip_id || "",
    actorUserId: row?.actor_user_id || "",
    actorName: row?.actor_name || "",
    actorEmail: row?.actor_email || "",
    eventType: row?.event_type || "",
    message: row?.message || "",
    createdAt: row?.created_at || "",
  };
}

export async function listTripActivity(tripId, { limit } = {}) {
  let query = supabase
    .from("trip_activity")
    .select("id, trip_id, actor_user_id, actor_name, actor_email, event_type, message, created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error loading trip activity", error);
    throw error;
  }

  return (data || []).map(normalizeTripActivityRow);
}

export async function logTripActivity({
  tripId,
  actorUserId,
  actorName,
  actorEmail,
  eventType,
  message,
}) {
  if (!tripId || !eventType || !String(message || "").trim()) {
    return null;
  }

  const { data, error } = await supabase
    .from("trip_activity")
    .insert({
      trip_id: tripId,
      actor_user_id: actorUserId || null,
      actor_name: String(actorName || "").trim() || null,
      actor_email: String(actorEmail || "").trim().toLowerCase() || null,
      event_type: String(eventType || "").trim(),
      message: String(message || "").trim(),
    })
    .select("id, trip_id, actor_user_id, actor_name, actor_email, event_type, message, created_at")
    .single();

  if (error) {
    console.error("Error saving trip activity", error);
    throw error;
  }

  return normalizeTripActivityRow(data);
}
