import { supabase } from "@/lib/supabase";

function normalizeDate(value) {
  if (value == null || value === "") return "";
  const s = String(value).slice(0, 10);
  return s;
}

function normalizeTravelSafetyRow(row) {
  if (!row) return null;
  return {
    tripId: row.trip_id || "",
    entryRequirements: String(row.entry_requirements || ""),
    entryLastVerifiedDate: normalizeDate(row.entry_last_verified_date),
    safetySecurity: String(row.safety_security || ""),
    safetyLastVerifiedDate: normalizeDate(row.safety_last_verified_date),
    referenceLinks: String(row.reference_links || ""),
    contentVersion: Number(row.content_version) || 1,
    updatedAt: row.updated_at || "",
  };
}

function normalizeAckRow(row) {
  if (!row) return null;
  return {
    id: row.id || "",
    tripId: row.trip_id || "",
    userId: row.user_id || "",
    acknowledgedVersion: Number(row.acknowledged_version) || 0,
    acknowledgedAt: row.acknowledged_at || "",
  };
}

function snapshotForVersion(fields) {
  return JSON.stringify({
    entryRequirements: String(fields.entryRequirements || "").trim(),
    entryLastVerifiedDate: normalizeDate(fields.entryLastVerifiedDate),
    safetySecurity: String(fields.safetySecurity || "").trim(),
    safetyLastVerifiedDate: normalizeDate(fields.safetyLastVerifiedDate),
    referenceLinks: String(fields.referenceLinks || "").trim(),
  });
}

/** Default shape when no DB row exists yet. */
export function emptyTripTravelSafety(tripId) {
  return {
    tripId,
    entryRequirements: "",
    entryLastVerifiedDate: "",
    safetySecurity: "",
    safetyLastVerifiedDate: "",
    referenceLinks: "",
    contentVersion: 1,
    updatedAt: "",
  };
}

export async function getTripTravelSafety(tripId) {
  if (!tripId) return emptyTripTravelSafety("");

  const { data: rpcData, error: rpcError } = await supabase.rpc("get_trip_travel_safety_for_viewer", {
    p_trip_id: tripId,
  });

  if (!rpcError) {
    if (rpcData == null) return emptyTripTravelSafety(tripId);
    let parsed = rpcData;
    if (typeof rpcData === "string") {
      try {
        parsed = JSON.parse(rpcData);
      } catch {
        parsed = null;
      }
    }
    const fromRpc = normalizeTravelSafetyRow(parsed);
    return fromRpc || emptyTripTravelSafety(tripId);
  }

  const rpcMsg = String(rpcError.message || "").toLowerCase();
  if (!rpcMsg.includes("function") || !rpcMsg.includes("does not exist")) {
    console.warn("get_trip_travel_safety_for_viewer", rpcError);
  }

  const { data, error } = await supabase
    .from("trip_travel_safety")
    .select("*")
    .eq("trip_id", tripId)
    .maybeSingle();

  if (error) {
    console.error("Error loading trip travel safety", error);
    throw error;
  }

  return normalizeTravelSafetyRow(data) || emptyTripTravelSafety(tripId);
}

/**
 * Save travel & safety content. Increments content_version when any tracked field changes.
 * Staff/admin only (RLS).
 */
export async function saveTripTravelSafety(tripId, fields) {
  if (!tripId) throw new Error("Trip is required.");

  const { data: rawExisting, error: loadError } = await supabase
    .from("trip_travel_safety")
    .select("*")
    .eq("trip_id", tripId)
    .maybeSingle();

  if (loadError) {
    console.error("Error loading trip travel safety for save", loadError);
    throw loadError;
  }

  const hadRow = !!rawExisting;
  const existing = normalizeTravelSafetyRow(rawExisting) || emptyTripTravelSafety(tripId);
  const next = {
    entryRequirements: String(fields?.entryRequirements ?? existing.entryRequirements ?? ""),
    entryLastVerifiedDate: normalizeDate(fields?.entryLastVerifiedDate ?? existing.entryLastVerifiedDate),
    safetySecurity: String(fields?.safetySecurity ?? existing.safetySecurity ?? ""),
    safetyLastVerifiedDate: normalizeDate(fields?.safetyLastVerifiedDate ?? existing.safetyLastVerifiedDate),
    referenceLinks: String(fields?.referenceLinks ?? existing.referenceLinks ?? ""),
  };

  const prevSnap = snapshotForVersion(existing);
  const nextSnap = snapshotForVersion(next);
  const contentChanged = prevSnap !== nextSnap;

  let contentVersion = existing.contentVersion || 1;
  if (hadRow && contentChanged) {
    contentVersion += 1;
  }
  if (!hadRow) {
    contentVersion = 1;
  }

  const payload = {
    trip_id: tripId,
    entry_requirements: next.entryRequirements || null,
    entry_last_verified_date: next.entryLastVerifiedDate || null,
    safety_security: next.safetySecurity || null,
    safety_last_verified_date: next.safetyLastVerifiedDate || null,
    reference_links: next.referenceLinks || null,
    content_version: contentVersion,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("trip_travel_safety")
    .upsert(payload, { onConflict: "trip_id" })
    .select("*")
    .single();

  if (error) {
    console.error("Error saving trip travel safety", error);
    throw error;
  }

  return normalizeTravelSafetyRow(data);
}

export async function listTripTravelSafetyAcknowledgments(tripId) {
  if (!tripId) return [];

  const { data, error } = await supabase
    .from("trip_travel_safety_acknowledgments")
    .select("id, trip_id, user_id, acknowledged_version, acknowledged_at")
    .eq("trip_id", tripId);

  if (error) {
    console.error("Error loading travel safety acknowledgments", error);
    throw error;
  }

  return (data || []).map(normalizeAckRow).filter(Boolean);
}

/**
 * `trip_travel_safety_acknowledgments.user_id` FK → profiles.id. After claim_worker_account_by_email,
 * that id may differ from auth.users.id; resolve the row we should use for this session.
 */
async function resolveProfileIdForTravelSafetyAck(authUser) {
  if (!authUser?.id) return null;

  const { data: byId, error: errById } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", authUser.id)
    .maybeSingle();

  if (errById) {
    console.error("profiles lookup by id", errById);
  }
  if (byId?.id) return String(byId.id);

  const email = String(authUser.email || "").trim();
  if (email) {
    const { data: byEmail, error: errEmail } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", email);

    if (errEmail) {
      console.error("profiles lookup by email", errEmail);
    }
    const rows = byEmail || [];
    const matchAuth = rows.find((r) => String(r.id) === String(authUser.id));
    if (matchAuth?.id) return String(matchAuth.id);
    if (rows.length === 1) return String(rows[0].id);
    if (rows.length > 1) {
      return String(rows[0].id);
    }
  }

  try {
    const { error: claimErr } = await supabase.rpc("claim_worker_account_by_email");
    if (claimErr && !String(claimErr.message || "").toLowerCase().includes("does not exist")) {
      console.warn("claim_worker_account_by_email", claimErr);
    }
  } catch (e) {
    console.warn("claim_worker_account_by_email", e);
  }

  const { data: afterClaim } = await supabase.from("profiles").select("id").eq("id", authUser.id).maybeSingle();
  if (afterClaim?.id) return String(afterClaim.id);

  if (email) {
    const { data: again } = await supabase.from("profiles").select("id").ilike("email", email).limit(1);
    if (again?.length === 1) return String(again[0].id);
  }

  return null;
}

/**
 * Participant acknowledges current content version. One active acknowledgment per user per trip
 * (row updated when version changes and user acknowledges again).
 * Uses profiles.id for storage (FK); RLS allows that row when it matches the session actor.
 */
export async function acknowledgeTripTravelSafety(tripId, userIdHint) {
  if (!tripId) {
    throw new Error("You must be signed in on this trip to acknowledge.");
  }

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser?.id) {
    throw new Error("You must be signed in on this trip to acknowledge.");
  }

  const profileUserId = await resolveProfileIdForTravelSafetyAck(authUser);
  if (!profileUserId) {
    throw new Error(
      "Your profile record was not found. Try signing out and back in, or contact your coordinator if this continues."
    );
  }

  if (
    userIdHint &&
    String(userIdHint) !== String(authUser.id) &&
    String(userIdHint) !== String(profileUserId)
  ) {
    throw new Error("Account mismatch. Refresh the page and try again.");
  }

  const safety = await getTripTravelSafety(tripId);
  const version = safety.contentVersion || 1;

  const { data: existing, error: existingError } = await supabase
    .from("trip_travel_safety_acknowledgments")
    .select("id, acknowledged_version")
    .eq("trip_id", tripId)
    .eq("user_id", profileUserId)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking acknowledgment", existingError);
    throw existingError;
  }

  if (existing && Number(existing.acknowledged_version) === version) {
    throw new Error("ALREADY_ACKNOWLEDGED");
  }

  const row = {
    trip_id: tripId,
    user_id: profileUserId,
    acknowledged_version: version,
    acknowledged_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("trip_travel_safety_acknowledgments")
      .update({
        acknowledged_version: version,
        acknowledged_at: row.acknowledged_at,
      })
      .eq("id", existing.id)
      .eq("user_id", profileUserId)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating acknowledgment", error);
      throw error;
    }
    return normalizeAckRow(data);
  }

  const { data, error } = await supabase.from("trip_travel_safety_acknowledgments").insert(row).select("*").single();

  if (error) {
    console.error("Error inserting acknowledgment", error);
    throw error;
  }

  return normalizeAckRow(data);
}
