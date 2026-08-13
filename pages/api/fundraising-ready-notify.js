/**
 * Worker notification when roster fundraising URL + goal amount are both set.
 *
 * Env:
 * - RESEND_API_KEY + BUDGET_CHECK_FROM_EMAIL (or RESEND_FROM_EMAIL)
 * - FUNDRAISING_READY_CC_EMAIL — optional CC (none by default)
 * - FUNDRAISING_READY_BCC_EMAIL — optional BCC (defaults to Mackayla)
 *
 * Temporarily disabled: set FUNDRAISING_READY_EMAILS_ENABLED to true to resume sending.
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { parseNotifyEmailList, sendResendEmail } from "@/lib/resendMail";
import { loadTripEmailContext } from "@/lib/tripEmailContext";
import {
  computeWeeksBetweenDepartAndEnd,
  formatWeeksLabel,
  firstNonBlankValue,
} from "@/lib/teamLockProjectLength";
import {
  buildFundraisingReadyEmailHtml,
  buildFundraisingReadyEmailSubject,
} from "@/lib/fundraisingReadyEmail";

const FUNDRAISING_READY_EMAILS_ENABLED = false;

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
  const email = normalizeEmail(user.email);
  if (!email) {
    return { error: { status: 403, message: "Signed-in user has no email; cannot load profile." } };
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, email, role, first_name, last_name")
    .ilike("email", email)
    .maybeSingle();

  if (profileErr) {
    console.error("[fundraising-ready-notify] profiles", profileErr);
    return { error: { status: 500, message: "Could not load profile." } };
  }

  if (!profile?.id || !isStaffOrAdminRole(profile.role)) {
    return { error: { status: 403, message: "Only staff or admin can send fundraising ready emails." } };
  }

  return { profile, user };
}

function getFundraisingReadyCcEmails() {
  return parseNotifyEmailList(process.env.FUNDRAISING_READY_CC_EMAIL || "");
}

function getFundraisingReadyBccEmails() {
  return parseNotifyEmailList(
    process.env.FUNDRAISING_READY_BCC_EMAIL || "mackayla.rodriguez@lst.org"
  );
}

function hasLinkAndAmount(url, goalAmount) {
  const pageUrl = normalizeText(url);
  if (!pageUrl) return false;
  if (goalAmount === null || goalAmount === undefined || goalAmount === "") return false;
  const parsed = Number(String(goalAmount).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0;
}

function resolveProjectWeeksLabel(context) {
  const explicitWeeks = firstNonBlankValue(context?.weeks);
  if (explicitWeeks) {
    return formatWeeksLabel(explicitWeeks);
  }
  const computed = computeWeeksBetweenDepartAndEnd(context?.startDate, context?.endDate);
  if (computed == null) return "";
  return formatWeeksLabel(String(computed));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!FUNDRAISING_READY_EMAILS_ENABLED) {
    return res.status(200).json({
      ok: true,
      skipped: true,
      reason: "Fundraising ready emails are temporarily disabled.",
    });
  }

  const auth = await authenticateStaffOrAdmin(req);
  if (auth.error) {
    return res.status(auth.error.status).json({ error: auth.error.message });
  }

  const tripId = normalizeText(req.body?.tripId);
  const memberId = normalizeText(req.body?.memberId);

  if (!tripId) {
    return res.status(400).json({ error: "tripId is required." });
  }
  if (!memberId) {
    return res.status(400).json({ error: "memberId is required." });
  }

  try {
    const admin = getSupabaseAdminClient();
    const { data: member, error: memberErr } = await admin
      .from("trip_team_members")
      .select(
        "id, trip_id, first_name, last_name, email, fundraising_url, fundraising_goal_amount"
      )
      .eq("id", memberId)
      .eq("trip_id", tripId)
      .maybeSingle();

    if (memberErr) {
      console.error("[fundraising-ready-notify] member", memberErr);
      return res.status(500).json({ error: "Could not load roster member." });
    }
    if (!member?.id) {
      return res.status(404).json({ error: "Roster member not found for this trip." });
    }

    const toEmail = normalizeEmail(member.email);
    if (!toEmail) {
      return res.status(400).json({ error: "Roster member has no email address." });
    }

    if (!hasLinkAndAmount(member.fundraising_url, member.fundraising_goal_amount)) {
      return res.status(400).json({
        error: "Fundraising URL and goal amount must both be set before sending.",
      });
    }

    const context = await loadTripEmailContext(admin, tripId);
    const recipientName = [member.first_name, member.last_name].filter(Boolean).join(" ").trim();
    const projectWeeksLabel = resolveProjectWeeksLabel(context);

    const subject = buildFundraisingReadyEmailSubject({ recipientName });
    const html = buildFundraisingReadyEmailHtml({
      recipientName,
      teamName: context.tripName,
      site: context.tripLocation,
      fundraisingUrl: member.fundraising_url,
      fundraisingGoalAmount: member.fundraising_goal_amount,
      projectWeeksLabel,
    });

    const emailResult = await sendResendEmail({
      to: toEmail,
      cc: getFundraisingReadyCcEmails(),
      bcc: getFundraisingReadyBccEmails(),
      subject,
      html,
    });

    if (!emailResult.sent) {
      return res.status(500).json({
        error: "Fundraising ready email was not sent. Check RESEND_API_KEY and from-email env.",
        reason: emailResult.reason,
        detail: emailResult.detail || null,
      });
    }

    return res.status(200).json({
      ok: true,
      sentTo: toEmail,
      tripName: context.tripName,
      email: emailResult,
    });
  } catch (error) {
    console.error("[fundraising-ready-notify]", error);
    return res.status(500).json({
      error: error?.message || "Unable to send fundraising ready email.",
    });
  }
}
