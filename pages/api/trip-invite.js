import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { sendWorkerInviteEmail } from "@/lib/sendWorkerInvite";

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
    const supabaseAdmin = getSupabaseAdminClient();
    const senderName = normalizeText(req.body?.senderName) || "LST staff";
    const recipientName = normalizeText(req.body?.recipientName);

    const result = await sendWorkerInviteEmail({
      admin: supabaseAdmin,
      baseUrl,
      tripId,
      recipientEmail,
      recipientName,
      senderName,
      senderEmail: normalizeEmail(req.body?.senderEmail),
    });

    if (result.skipped) {
      const message =
        result.reason === "already_has_account"
          ? "This person already has a Hub account. They can sign in or use Forgot Password if needed."
          : "Invite already sent for this email. If they need a new link, they can use Forgot Password on the login page.";

      return res.status(409).json({
        error: message,
        alreadyInvited: true,
      });
    }

    if (!result.sent) {
      console.error("[trip-invite] custom invite email not sent:", result.reason, result.detail || "");
      return res.status(500).json({
        error:
          "Could not send the invite email. Check RESEND_API_KEY and BUDGET_CHECK_FROM_EMAIL in your environment.",
        reason: result.reason,
      });
    }

    return res.status(200).json({
      ok: true,
      mode: result.mode,
      id: result.id || "",
      email: { sent: true },
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unable to send invite.",
    });
  }
}
