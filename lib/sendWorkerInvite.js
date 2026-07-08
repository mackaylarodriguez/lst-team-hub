import { loadTripEmailContext } from "@/lib/tripEmailContext";
import { sendResendEmail } from "@/lib/resendMail";
import {
  buildWorkerInviteEmailHtml,
  buildWorkerInviteEmailSubject,
} from "@/lib/workerInviteEmail";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function isRosterMemberForInvite(member) {
  const role = String(member?.teamRole || member?.team_role || "").trim().toLowerCase();
  const travels = member?.travelsWithTeam !== false && member?.travels_with_team !== false;
  if (role === "leader" && !travels) return false;
  return true;
}

function formatMemberName(member) {
  const first = String(member?.firstName || member?.first_name || "").trim();
  const last = String(member?.lastName || member?.last_name || "").trim();
  return [first, last].filter(Boolean).join(" ");
}

export function listWorkerInviteRecipients(teamMembers) {
  const seen = new Set();
  const recipients = [];

  for (const member of teamMembers || []) {
    if (!isRosterMemberForInvite(member)) continue;
    const email = normalizeEmail(member?.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    recipients.push({
      email,
      name: formatMemberName(member) || email,
    });
  }

  return recipients;
}

async function authUserExists(admin, email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const match = (data?.users || []).find((user) => normalizeEmail(user?.email) === email);
    if (match) {
      return true;
    }

    if (!data?.users?.length || data.users.length < perPage) {
      return false;
    }
    page += 1;
  }
}

async function profileExists(admin, email) {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!data?.id;
}

export async function sendWorkerInviteEmail({
  admin,
  baseUrl,
  tripId,
  recipientEmail,
  recipientName = "",
  senderName = "LST staff",
  senderEmail = "",
  tripContext = null,
}) {
  const email = normalizeEmail(recipientEmail);
  if (!email) {
    return { sent: false, skipped: true, reason: "missing_email", email: "" };
  }

  const hasAuthUser = await authUserExists(admin, email);
  if (hasAuthUser) {
    const hasProfile = await profileExists(admin, email);
    return {
      sent: false,
      skipped: true,
      reason: hasProfile ? "already_has_account" : "invite_already_sent",
      email,
    };
  }

  const context = tripContext || (await loadTripEmailContext(admin, tripId));
  const appBaseUrl = normalizeText(baseUrl).replace(/\/$/, "") || "https://lst-team-hub.vercel.app";
  const redirectTo = `${appBaseUrl}/login?next=${encodeURIComponent(`/trips/${tripId}`)}`;

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo,
      data: {
        tripId,
        tripName: context.tripName,
        tripLocation: context.tripLocation,
        tripDates: context.projectDates,
        senderEmail: normalizeEmail(senderEmail),
        senderName,
      },
    },
  });

  if (linkError) {
    throw linkError;
  }

  const inviteUrl = String(linkData?.properties?.action_link || "").trim();
  if (!inviteUrl) {
    throw new Error("Invite link was not returned from Supabase.");
  }

  const subject = buildWorkerInviteEmailSubject({
    tripName: context.tripName,
  });
  const html = buildWorkerInviteEmailHtml({
    recipientName,
    senderName,
    tripName: context.tripName,
    tripLocation: context.tripLocation,
    host: context.host,
    startDate: context.startDate,
    endDate: context.endDate,
    projectLengthSummary: context.projectLengthSummary,
    projectDates: context.projectDates,
    weeks: context.weeks,
    extraTravelStatus: context.extraTravelStatus,
    fundraisingGoalAmount: context.fundraisingGoalAmount,
    teamMembers: context.teamMembers,
    appLoginUrl: `${appBaseUrl}/login`,
    inviteUrl,
  });

  const emailResult = await sendResendEmail({
    to: email,
    subject,
    html,
  });

  if (!emailResult.sent) {
    return {
      sent: false,
      skipped: false,
      reason: emailResult.reason || "email_not_sent",
      email,
      detail: emailResult.detail || "",
    };
  }

  return {
    sent: true,
    skipped: false,
    email,
    mode: "invite",
    id: linkData?.user?.id || "",
  };
}

export async function sendWorkerInvitesForTrip({
  admin,
  baseUrl,
  tripId,
  teamMembers,
  senderName = "LST staff",
  senderEmail = "",
}) {
  const tripContext = await loadTripEmailContext(admin, tripId);
  const roster =
    Array.isArray(teamMembers) && teamMembers.length ? teamMembers : tripContext.teamMembers;
  const recipients = listWorkerInviteRecipients(roster);
  const results = [];

  for (const recipient of recipients) {
    try {
      const result = await sendWorkerInviteEmail({
        admin,
        baseUrl,
        tripId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        senderName,
        senderEmail,
        tripContext,
      });
      results.push(result);
    } catch (error) {
      console.error("[sendWorkerInvite] unable to invite", recipient.email, error);
      results.push({
        sent: false,
        skipped: false,
        reason: "error",
        email: recipient.email,
        error: error?.message || "Unable to send invite.",
      });
    }
  }

  return {
    attempted: recipients.length,
    sent: results.filter((row) => row.sent).length,
    skipped: results.filter((row) => row.skipped).length,
    failed: results.filter((row) => !row.sent && !row.skipped).length,
    results,
  };
}
