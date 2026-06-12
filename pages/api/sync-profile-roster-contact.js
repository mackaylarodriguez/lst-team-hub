import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { normalizeTshirtSizeForSelect } from "@/lib/tshirtSizes";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeRole(role) {
  return role ? String(role).trim().toLowerCase() : "";
}

function getBearerToken(req) {
  const raw = normalizeText(req.headers.authorization);
  const match = /^Bearer\s+(.+)$/i.exec(raw);
  return match ? match[1].trim() : "";
}

function getPublicSupabaseForAuth() {
  const supabaseUrl = normalizeText(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = normalizeText(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function pickProfileRowForAuthUser(rows, authUserId) {
  const list = rows || [];
  if (list.length === 0) return null;

  const normalized = list.map((row) => ({
    ...row,
    email: normalizeEmail(row.email),
    role: normalizeRole(row.role),
  }));

  return (
    normalized.find((p) => p.id === authUserId) ||
    normalized.find((p) => p.role === "admin") ||
    normalized.find((p) => p.role === "staff") ||
    normalized[0]
  );
}

function isManagerRole(role) {
  const r = normalizeRole(role);
  return r === "admin" || r === "staff";
}

function isMissingCellPhoneColumnError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    message.includes("cell_phone") &&
    (message.includes("does not exist") || message.includes("schema cache") || error?.code === "42703")
  );
}

function isMissingTshirtSizeColumnError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    message.includes("tshirt_size") &&
    (message.includes("does not exist") || message.includes("schema cache") || error?.code === "42703")
  );
}

async function authorizeProfileContactSync(req, targetProfileId) {
  const jwt = getBearerToken(req);
  if (!jwt) {
    return { error: { status: 401, message: "Missing Authorization bearer token." } };
  }

  const supabaseAuth = getPublicSupabaseForAuth();
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(jwt);
  const user = userData?.user;
  if (userErr || !user?.id) {
    return { error: { status: 401, message: "Invalid or expired session." } };
  }

  const admin = getSupabaseAdminClient();
  const email = normalizeEmail(user.email);
  if (!email) {
    return { error: { status: 403, message: "Signed-in user has no email; cannot load profile." } };
  }

  const { data: byEmailRows, error: byEmailErr } = await admin
    .from("profiles")
    .select("id, email, role")
    .ilike("email", email);

  if (byEmailErr) {
    console.error("[sync-profile-roster-contact] profiles by email", byEmailErr);
    return { error: { status: 500, message: "Could not load profile." } };
  }

  let actor = pickProfileRowForAuthUser(byEmailRows, user.id);

  if (!actor) {
    const { data: byId, error: byIdErr } = await admin
      .from("profiles")
      .select("id, email, role")
      .eq("id", user.id)
      .maybeSingle();

    if (byIdErr) {
      console.error("[sync-profile-roster-contact] profiles by id", byIdErr);
      return { error: { status: 500, message: "Could not load profile." } };
    }
    actor = byId || null;
  }

  if (!actor?.id) {
    return { error: { status: 403, message: "No profile row for this login." } };
  }

  const canSelfEdit = String(actor.id) === String(targetProfileId);
  const canStaffEdit = isManagerRole(actor.role);

  if (!canSelfEdit && !canStaffEdit) {
    return { error: { status: 403, message: "You do not have permission to update this profile." } };
  }

  return { admin, actor, user };
}

async function updateRosterContactRows(admin, workerEmail, phone, tshirtSize) {
  const patch = {
    cell_phone: phone,
    tshirt_size: tshirtSize,
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await admin
    .from("trip_team_members")
    .update(patch)
    .ilike("email", workerEmail)
    .select("id");

  if (error && isMissingCellPhoneColumnError(error)) {
    const { cell_phone, ...withoutPhone } = patch;
    ({ data, error } = await admin
      .from("trip_team_members")
      .update(withoutPhone)
      .ilike("email", workerEmail)
      .select("id"));
  }

  if (error && isMissingTshirtSizeColumnError(error)) {
    const { tshirt_size, ...withoutTshirt } = patch;
    ({ data, error } = await admin
      .from("trip_team_members")
      .update(withoutTshirt)
      .ilike("email", workerEmail)
      .select("id"));
  }

  if (error) {
    throw error;
  }

  return (data || []).length;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const profileId = normalizeText(req.body?.profileId);
  const phone = String(req.body?.phone ?? "").trim() || null;
  const tshirtSize = normalizeTshirtSizeForSelect(req.body?.tshirtSize || "") || null;

  if (!profileId) {
    return res.status(400).json({ error: "profileId is required." });
  }

  try {
    const auth = await authorizeProfileContactSync(req, profileId);
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message });
    }

    const { admin } = auth;
    const { data: target, error: loadErr } = await admin
      .from("profiles")
      .select("id, email")
      .eq("id", profileId)
      .maybeSingle();

    if (loadErr) {
      console.error("[sync-profile-roster-contact] load target profile", loadErr);
      return res.status(500).json({ error: "Could not load profile." });
    }
    if (!target) {
      return res.status(404).json({ error: "Profile not found." });
    }

    const workerEmail = normalizeEmail(target.email);
    if (!workerEmail) {
      return res.status(200).json({ ok: true, updated: 0, reason: "no_email" });
    }

    const updated = await updateRosterContactRows(admin, workerEmail, phone, tshirtSize);
    return res.status(200).json({ ok: true, updated });
  } catch (error) {
    console.error("[sync-profile-roster-contact]", error);
    return res.status(500).json({
      error: error?.message || "Could not sync profile contact to trip rosters.",
    });
  }
}
