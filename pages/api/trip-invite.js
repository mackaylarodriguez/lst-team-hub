import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { sendResendEmail } from "@/lib/resendMail";
import { loadTripEmailContext } from "@/lib/tripEmailContext";
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

function getBaseUrl(req) {
  const configuredUrl = normalizeText(process.env.NEXT_PUBLIC_APP_URL);
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const host = normalizeText(req.headers.host);
  const protocol = host.includes("localhost") ? "http" : "https";
  return host ? `${protocol}://${host}` : "";
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const recipientEmail = normalizeEmail(req.body?.recipientEmail);
  const tripId = normalizeText(req.body?.tripId);

  if (!recipientEmail || !tripId) {
    return res.status(400).json({ error: "Missing recipient email or trip." });
  }

  try {
    const baseUrl = getBaseUrl(req);
    const redirectTo = `${baseUrl}/login?next=${encodeURIComponent(`/trips/${tripId}`)}`;
    const supabaseAdmin = getSupabaseAdminClient();

    const hasAuthUser = await authUserExists(supabaseAdmin, recipientEmail);
    if (hasAuthUser) {
      const hasProfile = await profileExists(supabaseAdmin, recipientEmail);
      if (hasProfile) {
        return res.status(409).json({
          error: "This person already has a Hub account. They can sign in or use Forgot Password if needed.",
          alreadyInvited: true,
        });
      }

      return res.status(409).json({
        error:
          "Invite already sent for this email. If they need a new link, they can use Forgot Password on the login page.",
        alreadyInvited: true,
      });
    }

    const tripName = normalizeText(req.body?.tripName);
    const tripLocation = normalizeText(req.body?.tripLocation);
    const tripDates = normalizeText(req.body?.tripDates);
    const senderName = normalizeText(req.body?.senderName) || "LST staff";
    const recipientName = normalizeText(req.body?.recipientName);

    const tripContext = await loadTripEmailContext(supabaseAdmin, tripId);

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: recipientEmail,
      options: {
        redirectTo,
        data: {
          tripId,
          tripName,
          tripLocation,
          tripDates,
          senderEmail: normalizeEmail(req.body?.senderEmail),
          senderName,
        },
      },
    });

    if (linkError) {
      console.error("Unable to generate worker invite link", linkError);
      throw linkError;
    }

    const inviteUrl = String(linkData?.properties?.action_link || "").trim();
    if (!inviteUrl) {
      throw new Error("Invite link was not returned from Supabase.");
    }

    const subject = buildWorkerInviteEmailSubject({
      tripName: tripContext.tripName || tripName,
    });
    const html = buildWorkerInviteEmailHtml({
      recipientName,
      senderName,
      tripName: tripContext.tripName || tripName,
      tripLocation: tripContext.tripLocation || tripLocation,
      host: tripContext.host,
      teamDeveloper: tripContext.teamDeveloper,
      startDate: tripContext.startDate,
      endDate: tripContext.endDate,
      projectLengthSummary: tripContext.projectLengthSummary,
      projectDates: tripDates,
      extraTravelStatus: tripContext.extraTravelStatus,
      fundraisingGoalAmount: tripContext.fundraisingGoalAmount,
      teamMembers: tripContext.teamMembers,
      appLoginUrl: `${baseUrl}/login`,
      inviteUrl,
    });

    const emailResult = await sendResendEmail({
      to: recipientEmail,
      subject,
      html,
    });

    if (!emailResult.sent) {
      console.error("[trip-invite] custom invite email not sent:", emailResult.reason, emailResult.detail || "");
      return res.status(500).json({
        error:
          "Could not send the invite email. Check RESEND_API_KEY and BUDGET_CHECK_FROM_EMAIL in your environment.",
        reason: emailResult.reason,
      });
    }

    return res.status(200).json({
      ok: true,
      mode: "invite",
      id: linkData?.user?.id || "",
      email: emailResult,
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unable to send invite.",
    });
  }
}
