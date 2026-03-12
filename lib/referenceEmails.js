import { supabase } from "@/lib/supabase";

function normalizeReferenceRow(row) {
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
    referenceName: row.reference_name || "",
    referenceEmail: row.reference_email || "",
    referencePhone: row.reference_phone || "",
    sent: !!row.sent,
    received: !!row.received,
    sentDate: row.sent_date || "",
    updatedAt: row.updated_at || "",
  };
}

export async function listReferenceEmails(tripId) {
  const { data, error } = await supabase
    .from("trip_reference_emails")
    .select("*")
    .eq("trip_id", tripId);

  if (error) {
    console.error("Error loading reference emails", error);
    throw error;
  }

  return (data || []).map(normalizeReferenceRow);
}

export async function saveReferenceEmail({
  tripId,
  userId,
  referenceName,
  referenceEmail,
  referencePhone,
  sent,
  received,
  sentDate,
}) {
  const { data: existing, error: existingError } = await supabase
    .from("trip_reference_emails")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking reference email row", existingError);
    throw existingError;
  }

  const payload = {
    trip_id: tripId,
    user_id: userId,
    reference_name: String(referenceName || "").trim() || null,
    reference_email: String(referenceEmail || "").trim() || null,
    reference_phone: String(referencePhone || "").trim() || null,
    sent: !!sent,
    received: !!received,
    sent_date: sentDate || null,
    updated_at: new Date().toISOString(),
  };

  const query = existing
    ? supabase.from("trip_reference_emails").update(payload).eq("id", existing.id)
    : supabase.from("trip_reference_emails").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    console.error("Error saving reference email", error);
    throw error;
  }

  return normalizeReferenceRow(data);
}
