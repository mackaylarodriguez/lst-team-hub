/**
 * Admin-only: next Monday weekly email queue, plus emails already sent.
 * Archived trips are omitted from the queue.
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { previewWeeklyTaskDigestRecipients } from "@/lib/weeklyTaskDigest";
import { describeNextWeeklySend, previewWeeklyWorkerDigestRecipients } from "@/lib/weeklyWorkerDigest";
import { listSentWeeklyEmails } from "@/lib/weeklyEmailLog";

function normalizeText(value) {
  return String(value || "").trim();
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

async function authenticateAdmin(req) {
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
  const email = normalizeText(user.email).toLowerCase();
  if (!email) {
    return { error: { status: 403, message: "Signed-in user has no email." } };
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, email, role")
    .ilike("email", email)
    .maybeSingle();

  if (profileErr) {
    console.error("[admin-weekly-emails] profiles", profileErr);
    return { error: { status: 500, message: "Could not load profile." } };
  }

  if (normalizeText(profile?.role).toLowerCase() !== "admin") {
    return { error: { status: 403, message: "Only admin can view weekly emails." } };
  }

  return { admin };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const auth = await authenticateAdmin(req);
  if (auth.error) {
    return res.status(auth.error.status).json({ error: auth.error.message });
  }

  try {
    const [workers, staff, sent] = await Promise.all([
      previewWeeklyWorkerDigestRecipients(auth.admin),
      previewWeeklyTaskDigestRecipients(auth.admin),
      listSentWeeklyEmails(auth.admin),
    ]);

    return res.status(200).json({
      ok: true,
      nextSend: describeNextWeeklySend(),
      scheduled: [...workers, ...staff],
      sent: sent.rows,
      missingTable: sent.missingTable,
    });
  } catch (error) {
    console.error("[admin-weekly-emails]", error);
    return res.status(500).json({
      error: error?.message || "Unable to load weekly emails.",
    });
  }
}
