/**
 * Admin-only: send test copies of Hub notification emails without locking teams or creating invites.
 *
 * POST body:
 * - template: "worker_invite" | "team_lock" | "fundraising_ready"
 * - tripId: uuid
 * - testEmail: recipient (defaults to admin profile email)
 * - recipientName: optional, for worker invite / fundraising ready greeting
 * - memberId: optional roster member id for fundraising_ready (otherwise first member with email)
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { sendResendEmail } from "@/lib/resendMail";
import { loadTripEmailContext } from "@/lib/tripEmailContext";
import {
  buildWorkerInviteEmailHtml,
  buildWorkerInviteEmailSubject,
} from "@/lib/workerInviteEmail";
import {
  buildTeamLockStaffEmailHtml,
  buildTeamLockStaffEmailSubject,
} from "@/lib/teamLockStaffEmail";
import {
  buildFundraisingReadyEmailHtml,
  buildFundraisingReadyEmailSubject,
  FUNDRAISING_PAGE_TUTORIAL_URL,
} from "@/lib/fundraisingReadyEmail";
import {
  computeWeeksBetweenDepartAndEnd,
  formatWeeksLabel,
  firstNonBlankValue,
} from "@/lib/teamLockProjectLength";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
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

function getBaseUrl(req) {
  const configuredUrl = normalizeText(process.env.NEXT_PUBLIC_APP_URL);
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }
  const host = normalizeText(req.headers.host);
  const protocol = host.includes("localhost") ? "http" : "https";
  return host ? `${protocol}://${host}` : "";
}

function getTripUrl(req, tripId) {
  const base = getBaseUrl(req);
  return base ? `${base}/trips/${tripId}` : "";
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
  const email = normalizeEmail(user.email);
  if (!email) {
    return { error: { status: 403, message: "Signed-in user has no email." } };
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, email, role, first_name, last_name")
    .ilike("email", email)
    .maybeSingle();

  if (profileErr) {
    console.error("[admin-email-test] profiles", profileErr);
    return { error: { status: 500, message: "Could not load profile." } };
  }

  if (normalizeText(profile?.role).toLowerCase() !== "admin") {
    return { error: { status: 403, message: "Only admin can send test emails." } };
  }

  const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  return {
    profile,
    user,
    profileName: profileName || email,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const auth = await authenticateAdmin(req);
  if (auth.error) {
    return res.status(auth.error.status).json({ error: auth.error.message });
  }

  const template = normalizeText(req.body?.template).toLowerCase();
  const tripId = normalizeText(req.body?.tripId);
  const testEmail = normalizeEmail(req.body?.testEmail) || normalizeEmail(auth.profile?.email);

  if (!tripId) {
    return res.status(400).json({ error: "tripId is required." });
  }
  if (!testEmail) {
    return res.status(400).json({ error: "testEmail is required." });
  }
  if (
    template !== "worker_invite" &&
    template !== "team_lock" &&
    template !== "fundraising_ready"
  ) {
    return res.status(400).json({
      error: 'template must be "worker_invite", "team_lock", or "fundraising_ready".',
    });
  }

  try {
    const admin = getSupabaseAdminClient();
    const context = await loadTripEmailContext(admin, tripId);
    const baseUrl = getBaseUrl(req);
    const senderName = normalizeText(req.body?.senderName) || auth.profileName || "LST staff";
    const recipientName = normalizeText(req.body?.recipientName);

    let subject = "";
    let html = "";

    if (template === "worker_invite") {
      subject = `[TEST] ${buildWorkerInviteEmailSubject({ tripName: context.tripName })}`;
      html = buildWorkerInviteEmailHtml({
        recipientName,
        senderName,
        tripName: context.tripName,
        tripLocation: context.tripLocation,
        host: context.host,
        teamDeveloper: context.teamDeveloper,
        startDate: context.startDate,
        endDate: context.endDate,
        projectLengthSummary: context.projectLengthSummary,
        projectDates: context.projectDates,
        weeks: context.weeks,
        extraTravelStatus: context.extraTravelStatus,
        fundraisingGoalAmount: context.fundraisingGoalAmount,
        teamMembers: context.teamMembers,
        appLoginUrl: `${baseUrl}/login`,
        inviteUrl: `${baseUrl}/login?test=worker-invite-preview`,
      });
    } else if (template === "fundraising_ready") {
      const memberId = normalizeText(req.body?.memberId);
      let member =
        (context.teamMembers || []).find((row) => normalizeText(row?.id) === memberId) || null;

      if (!member && memberId) {
        const { data: memberRow } = await admin
          .from("trip_team_members")
          .select("id, first_name, last_name, email, fundraising_url, fundraising_goal_amount")
          .eq("id", memberId)
          .eq("trip_id", tripId)
          .maybeSingle();
        if (memberRow) {
          member = {
            firstName: memberRow.first_name,
            lastName: memberRow.last_name,
            email: memberRow.email,
            fundraisingUrl: memberRow.fundraising_url,
            fundraisingGoalAmount: memberRow.fundraising_goal_amount,
          };
        }
      }

      if (!member) {
        const { data: firstMember } = await admin
          .from("trip_team_members")
          .select("id, first_name, last_name, email, fundraising_url, fundraising_goal_amount")
          .eq("trip_id", tripId)
          .limit(1)
          .maybeSingle();
        if (firstMember) {
          member = {
            firstName: firstMember.first_name,
            lastName: firstMember.last_name,
            email: firstMember.email,
            fundraisingUrl: firstMember.fundraising_url,
            fundraisingGoalAmount: firstMember.fundraising_goal_amount,
          };
        }
      }

      const memberName =
        recipientName ||
        [member?.firstName || member?.first_name, member?.lastName || member?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        "Worker";
      const explicitWeeks = firstNonBlankValue(context.weeks);
      const computedWeeks = computeWeeksBetweenDepartAndEnd(context.startDate, context.endDate);
      const projectWeeksLabel = formatWeeksLabel(
        explicitWeeks || (computedWeeks == null ? "" : String(computedWeeks))
      );

      subject = `[TEST] ${buildFundraisingReadyEmailSubject({ recipientName: memberName })}`;
      html = buildFundraisingReadyEmailHtml({
        recipientName: memberName,
        teamName: context.tripName,
        site: context.tripLocation,
        fundraisingUrl:
          member?.fundraisingUrl ||
          member?.fundraising_url ||
          "https://example.neonone.com/fundraising",
        fundraisingGoalAmount:
          member?.fundraisingGoalAmount ?? member?.fundraising_goal_amount ?? 2500,
        projectWeeksLabel: projectWeeksLabel || "3 weeks",
        tutorialUrl: FUNDRAISING_PAGE_TUTORIAL_URL,
      });
    } else {
      const lockPayload = {
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
        tripUrl: getTripUrl(req, tripId),
      };
      subject = `[TEST] ${buildTeamLockStaffEmailSubject(lockPayload)}`;
      html = buildTeamLockStaffEmailHtml(lockPayload);
    }

    const emailResult = await sendResendEmail({
      to: testEmail,
      subject,
      html,
    });

    if (!emailResult.sent) {
      return res.status(500).json({
        error: "Test email was not sent. Check RESEND_API_KEY and BUDGET_CHECK_FROM_EMAIL.",
        reason: emailResult.reason,
        detail: emailResult.detail || null,
      });
    }

    return res.status(200).json({
      ok: true,
      template,
      sentTo: testEmail,
      tripName: context.tripName,
      email: emailResult,
    });
  } catch (error) {
    console.error("[admin-email-test]", error);
    return res.status(500).json({
      error: error?.message || "Unable to send test email.",
    });
  }
}
