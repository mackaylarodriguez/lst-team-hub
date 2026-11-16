/**
 * Staff notification when a locked team is unlocked.
 * Recipients match the lock email (TEAM_LOCK_NOTIFY_EMAIL).
 *
 * The trip is still in the database when this runs, so the body can reuse
 * the same team details as the lock email.
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { parseNotifyEmailList, sendResendEmail } from "@/lib/resendMail";
import { loadTripEmailContext } from "@/lib/tripEmailContext";
import {
  buildTeamUnlockStaffEmailHtml,
  buildTeamUnlockStaffEmailSubject,
} from "@/lib/teamLockStaffEmail";

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

function isStaffOrAdminRole(role) {
  const r = normalizeText(role).toLowerCase();
  return r === "admin" || r === "staff";
}

async function authenticateStaffOrAdmin(req) {
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
  const email = String(user.email || "").trim().toLowerCase();
  if (!email) {
    return { error: { status: 403, message: "Signed-in user has no email; cannot load profile." } };
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, email, role")
    .ilike("email", email)
    .maybeSingle();

  if (profileErr) {
    console.error("[team-unlock-notify] profiles", profileErr);
    return { error: { status: 500, message: "Could not load profile." } };
  }

  if (!profile?.id || !isStaffOrAdminRole(profile.role)) {
    return { error: { status: 403, message: "Only staff or admin can send team unlock notifications." } };
  }

  return { profile, user };
}

function buildUnlockEmailPayload(context, unlockReason) {
  return {
    teamName: context.tripName,
    site: context.tripLocation,
    host: context.host,
    teamDeveloper: context.teamDeveloper,
    projectLengthSummary: context.projectLengthSummary,
    weeks: context.weeks,
    projectDates: context.projectDates,
    startDate: context.startDate,
    endDate: context.endDate,
    teamMembers: context.teamMembers,
    extraTravelStatus: context.extraTravelStatus,
    fundraisingGoalAmount: context.fundraisingGoalAmount,
    tripFeeAmount: context.tripFeeAmount,
    materialsFeeAmount: context.materialsFeeAmount,
    hannoverHousingFeeAmount: context.hannoverHousingFeeAmount,
    unlockReason,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const auth = await authenticateStaffOrAdmin(req);
  if (auth.error) {
    return res.status(auth.error.status).json({ error: auth.error.message });
  }

  const tripId = normalizeText(req.body?.tripId);
  const unlockReason = normalizeText(req.body?.reason);
  if (!tripId) {
    return res.status(400).json({ error: "tripId is required." });
  }
  if (!unlockReason) {
    return res.status(400).json({ error: "A reason for unlock is required." });
  }

  try {
    const admin = getSupabaseAdminClient();
    const context = await loadTripEmailContext(admin, tripId);
    const payload = buildUnlockEmailPayload(context, unlockReason);
    const notifyTo = parseNotifyEmailList(process.env.TEAM_LOCK_NOTIFY_EMAIL);

    let emailResult = { sent: false, reason: "missing_team_lock_notify_email" };
    if (notifyTo.length) {
      emailResult = await sendResendEmail({
        to: notifyTo,
        subject: buildTeamUnlockStaffEmailSubject(payload),
        html: buildTeamUnlockStaffEmailHtml(payload),
      });

      if (!emailResult.sent) {
        console.warn(
          "[team-unlock-notify] notification email not sent:",
          emailResult.reason,
          emailResult.detail || ""
        );
      }
    }

    return res.status(200).json({ ok: true, email: emailResult });
  } catch (error) {
    console.error("[team-unlock-notify]", error);
    return res.status(500).json({
      error: error?.message || "Unable to send team unlock notification.",
    });
  }
}
