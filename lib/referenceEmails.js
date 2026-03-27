import { supabase } from "@/lib/supabase";

function normalizeReferenceRow(row) {
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id || "",
    tripTeamMemberId: row.trip_team_member_id || "",
    referenceName: row.reference_name || "",
    referenceEmail: row.reference_email || "",
    referencePhone: row.reference_phone || "",
    sent: !!row.sent,
    received: !!row.received,
    sentDate: row.sent_date || "",
    updatedAt: row.updated_at || "",
  };
}

/** Map DB row to UI state key: `user:<profileId>` or `roster:<tripTeamMemberId>`. */
export function referenceRowToStateKey(row) {
  const raw = row || {};
  const uid = raw.user_id || raw.userId || "";
  const rid = raw.trip_team_member_id || raw.tripTeamMemberId || "";
  if (uid) return `user:${uid}`;
  if (rid) return `roster:${rid}`;
  return "";
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
  tripTeamMemberId,
  referenceName,
  referenceEmail,
  referencePhone,
  sent,
  received,
  sentDate,
}) {
  const uid = userId ? String(userId).trim() : "";
  const rid = tripTeamMemberId ? String(tripTeamMemberId).trim() : "";
  if (!uid && !rid) {
    throw new Error("A worker profile or roster row is required to save references.");
  }
  if (uid && rid) {
    throw new Error("Pass only one of userId or tripTeamMemberId.");
  }

  let existingQuery = supabase.from("trip_reference_emails").select("id").eq("trip_id", tripId);
  if (uid) {
    existingQuery = existingQuery.eq("user_id", uid);
  } else {
    existingQuery = existingQuery.eq("trip_team_member_id", rid);
  }

  const { data: existing, error: existingError } = await existingQuery.limit(1).maybeSingle();

  if (existingError) {
    console.error("Error checking reference email row", existingError);
    throw existingError;
  }

  const payload = {
    trip_id: tripId,
    user_id: uid || null,
    trip_team_member_id: rid || null,
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
