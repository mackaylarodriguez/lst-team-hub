/**
 * Staff notification when a recruiting team is locked (trip created).
 *
 * Env:
 * - RESEND_API_KEY + BUDGET_CHECK_FROM_EMAIL (or RESEND_FROM_EMAIL)
 * - TEAM_LOCK_NOTIFY_EMAIL — comma-separated staff recipients
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { parseNotifyEmailList, sendResendEmail } from "@/lib/resendMail";
import { resolveProjectLengthForLock, firstNonBlankValue } from "@/lib/teamLockProjectLength";
import {
  buildTeamLockStaffEmailHtml,
  buildTeamLockStaffEmailSubject,
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
    console.error("[team-lock-notify] profiles", profileErr);
    return { error: { status: 500, message: "Could not load profile." } };
  }

  if (!profile?.id || !isStaffOrAdminRole(profile.role)) {
    return { error: { status: 403, message: "Only staff or admin can send team lock notifications." } };
  }

  return { profile, user };
}

function getTripUrl(req, tripId) {
  const configured = normalizeText(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) {
    return `${configured.replace(/\/$/, "")}/trips/${tripId}`;
  }
  const host = normalizeText(req.headers.host);
  if (!host) return "";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}/trips/${tripId}`;
}

async function loadProjectLengthSources(admin, tripId) {
  const sources = {
    tripProjectLength: "",
    recruitingWeeks: "",
    recruitingProjectDates: "",
    pendingProjectLength: "",
  };

  if (!tripId) return sources;

  const { data: tripRow, error: tripErr } = await admin
    .from("trips")
    .select("project_length_summary")
    .eq("id", tripId)
    .maybeSingle();

  if (tripErr) {
    console.warn("[team-lock-notify] trips project_length_summary", tripErr);
  } else {
    sources.tripProjectLength = normalizeText(tripRow?.project_length_summary);
  }

  const { data: recruitingRow, error: recruitingErr } = await admin
    .from("recruiting_cycle_contacts")
    .select("weeks, project_dates, pending_lock_team_setup")
    .eq("converted_team_id", tripId)
    .maybeSingle();

  if (recruitingErr) {
    console.warn("[team-lock-notify] recruiting_cycle_contacts", recruitingErr);
    return sources;
  }

  if (!recruitingRow) return sources;

  if (recruitingRow.weeks !== null && recruitingRow.weeks !== undefined) {
    sources.recruitingWeeks = String(recruitingRow.weeks).trim();
  }
  sources.recruitingProjectDates = normalizeText(recruitingRow.project_dates);

  const pending = recruitingRow.pending_lock_team_setup;
  if (pending && typeof pending === "object") {
    sources.pendingProjectLength = normalizeText(pending.projectLengthSummary);
  }

  return sources;
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

  const body = req.body || {};
  const tripId = normalizeText(body.tripId);
  const teamName = normalizeText(body.teamName);

  if (!tripId || !teamName) {
    return res.status(400).json({ error: "tripId and teamName are required." });
  }

  const notifyTo = parseNotifyEmailList(process.env.TEAM_LOCK_NOTIFY_EMAIL);
  if (!notifyTo.length) {
    return res.status(200).json({
      ok: true,
      email: { sent: false, reason: "missing_team_lock_notify_email" },
    });
  }

  let tripProjectLength = "";
  let recruitingWeeks = "";
  let recruitingProjectDates = "";
  let pendingProjectLength = "";

  try {
    const admin = getSupabaseAdminClient();
    const sources = await loadProjectLengthSources(admin, tripId);
    tripProjectLength = sources.tripProjectLength;
    recruitingWeeks = sources.recruitingWeeks;
    recruitingProjectDates = sources.recruitingProjectDates;
    pendingProjectLength = sources.pendingProjectLength;
  } catch (loadError) {
    console.warn("[team-lock-notify] could not load project length sources", loadError);
  }

  const projectLengthSummary = resolveProjectLengthForLock({
    projectLengthSummary: firstNonBlankValue(
      body.projectLengthSummary,
      pendingProjectLength,
      tripProjectLength
    ),
    weeks: firstNonBlankValue(body.weeks, body.recruitingWeeks, recruitingWeeks),
    projectDates: firstNonBlankValue(
      body.projectDates,
      body.recruitingProjectDates,
      recruitingProjectDates
    ),
  });

  const payload = {
    teamName,
    site: normalizeText(body.site),
    host: normalizeText(body.host),
    teamDeveloper: normalizeText(body.teamDeveloper),
    projectLengthSummary,
    weeks: firstNonBlankValue(body.weeks, body.recruitingWeeks, recruitingWeeks),
    projectDates: firstNonBlankValue(
      body.projectDates,
      body.recruitingProjectDates,
      recruitingProjectDates
    ),
    startDate: normalizeText(body.startDate),
    endDate: normalizeText(body.endDate),
    teamMembers: Array.isArray(body.teamMembers) ? body.teamMembers : [],
    extraTravelStatus: normalizeText(body.extraTravelStatus) || "no",
    fundraisingGoalAmount: body.fundraisingGoalAmount,
    tripFeeAmount: body.tripFeeAmount,
    materialsFeeAmount: body.materialsFeeAmount,
    hannoverHousingFeeAmount: body.hannoverHousingFeeAmount,
    mackaylaNotes: normalizeText(body.mackaylaNotes),
    lesleeNotes: normalizeText(body.lesleeNotes),
    tripUrl: getTripUrl(req, tripId),
  };

  const subject = buildTeamLockStaffEmailSubject(payload);
  const html = buildTeamLockStaffEmailHtml(payload);
  const emailResult = await sendResendEmail({ to: notifyTo, subject, html });

  if (!emailResult.sent) {
    console.warn("[team-lock-notify] notification email not sent:", emailResult.reason, emailResult.detail || "");
  }

  return res.status(200).json({ ok: true, email: emailResult });
}
