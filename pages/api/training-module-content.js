/**
 * Shared training module text.
 * The browser client cannot read or write training_module_content under row-level security,
 * so signed-in users load through this route and staff/admin save through it.
 *
 * GET  -> { modules: [{ module_id, module }] }
 * POST -> { module }
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { isManagerRole } from "@/lib/roles";

const TRAINING_MODULE_CONTENT_TABLE = "training_module_content";

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

async function authorizeTrainingContent(req) {
  const jwt = getBearerToken(req);
  if (!jwt) {
    return { error: { status: 401, message: "Sign in to open training." } };
  }

  const supabaseAuth = getPublicSupabaseForAuth();
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(jwt);
  const user = userData?.user;
  if (userErr || !user?.id) {
    return { error: { status: 401, message: "Invalid or expired session." } };
  }

  const admin = getSupabaseAdminClient();
  const email = normalizeEmail(user.email);
  let profile = null;

  if (email) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, role")
      .ilike("email", email);
    if (error) {
      console.error("[training-module-content] profiles by email", error);
      return { error: { status: 500, message: "Could not load your profile." } };
    }
    profile =
      (data || []).find((row) => row.id === user.id) ||
      (data || []).find((row) => isManagerRole(normalizeRole(row.role))) ||
      (data || [])[0] ||
      null;
  }

  if (!profile) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, role")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[training-module-content] profiles by id", error);
      return { error: { status: 500, message: "Could not load your profile." } };
    }
    profile = data;
  }

  if (!profile) {
    return { error: { status: 403, message: "No Hub profile is linked to this sign-in." } };
  }

  return {
    admin,
    profile: { ...profile, role: normalizeRole(profile.role), email: normalizeEmail(profile.email) },
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const auth = await authorizeTrainingContent(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message });
    }

    if (req.method === "GET") {
      const { data, error } = await auth.admin
        .from(TRAINING_MODULE_CONTENT_TABLE)
        .select("module_id, module");
      if (error) {
        console.error("[training-module-content] load", error);
        return res.status(500).json({ error: "Unable to load training." });
      }
      return res.status(200).json({ modules: data || [] });
    }

    if (!isManagerRole(auth.profile.role)) {
      return res.status(403).json({ error: "Only staff can edit training." });
    }

    const module = req.body?.module;
    const moduleId = normalizeText(module?.id);
    if (!moduleId || !Array.isArray(module?.sections)) {
      return res.status(400).json({ error: "Training module is missing its sections." });
    }

    const { error } = await auth.admin.from(TRAINING_MODULE_CONTENT_TABLE).upsert(
      {
        module_id: moduleId,
        module,
        updated_by_email: auth.profile.email || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "module_id" }
    );

    if (error) {
      console.error("[training-module-content] save", error);
      return res.status(500).json({ error: "Unable to save training changes." });
    }

    return res.status(200).json({ ok: true, moduleId });
  } catch (error) {
    console.error("[training-module-content]", error);
    return res.status(500).json({ error: error?.message || "Unable to save training changes." });
  }
}
