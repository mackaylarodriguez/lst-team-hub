import { loadTripEmailContext } from "@/lib/tripEmailContext";
import { parseNotifyEmailList, sendResendEmail } from "@/lib/resendMail";
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

/** Staff copied on every worker lock-team / invite email (override via WORKER_INVITE_CC_EMAIL). */
function getWorkerInviteCcEmails() {
  return parseNotifyEmailList(
    process.env.WORKER_INVITE_CC_EMAIL ||
      "mackayla.rodriguez@lst.org,leslee.altrock@lst.org,craig.altrock@lst.org"
  );
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

function buildWorkerInviteEmailContent({
  context,
  recipientName,
  senderName,
  appBaseUrl,
  tripId,
  inviteUrl,
}) {
  const tripLoginUrl = tripId
    ? `${appBaseUrl}/login?next=${encodeURIComponent(`/trips/${tripId}`)}`
    : `${appBaseUrl}/login`;

  return {
    subject: buildWorkerInviteEmailSubject({
      tripName: context.tripName,
    }),
    html: buildWorkerInviteEmailHtml({
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
      tripLoginUrl,
    }),
  };
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

  const context = tripContext || (await loadTripEmailContext(admin, tripId));
  const appBaseUrl = normalizeText(baseUrl).replace(/\/$/, "") || "https://lst-team-hub.vercel.app";

  const hasAuthUser = await authUserExists(admin, email);
  if (hasAuthUser) {
    const hasProfile = await profileExists(admin, email);
    const { subject, html } = buildWorkerInviteEmailContent({
      context,
      recipientName,
      senderName,
      appBaseUrl,
      tripId,
      inviteUrl: null,
    });

    const emailResult = await sendResendEmail({
      to: email,
      subject,
      html,
      cc: getWorkerInviteCcEmails(),
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
      mode: hasProfile ? "notification" : "notification_pending_account",
    };
  }

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

  const { subject, html } = buildWorkerInviteEmailContent({
    context,
    recipientName,
    senderName,
    appBaseUrl,
    tripId,
    inviteUrl,
  });

  const emailResult = await sendResendEmail({
    to: email,
    subject,
    html,
    cc: getWorkerInviteCcEmails(),
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
    notified: results.filter((row) => row.sent && row.mode === "notification").length,
    invited: results.filter((row) => row.sent && row.mode === "invite").length,
    results,
  };
}
