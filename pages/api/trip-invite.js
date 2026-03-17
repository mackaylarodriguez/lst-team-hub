import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

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

function getPublicSupabaseClient() {
  const supabaseUrl = normalizeText(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = normalizeText(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase public environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isExistingAuthUserError(error) {
  const message = String(error?.message || error?.details || "").toLowerCase();
  return (
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already exists")
  );
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

    const inviteResult = await supabaseAdmin.auth.admin.inviteUserByEmail(
      recipientEmail,
      {
        redirectTo,
        data: {
          tripId,
          tripName: normalizeText(req.body?.tripName),
          tripLocation: normalizeText(req.body?.tripLocation),
          tripDates: normalizeText(req.body?.tripDates),
          senderEmail: normalizeEmail(req.body?.senderEmail),
          senderName: normalizeText(req.body?.senderName),
        },
      }
    );

    if (inviteResult.error) {
      if (!isExistingAuthUserError(inviteResult.error)) {
        console.error("Unable to send Supabase invite email", inviteResult.error);
        throw inviteResult.error;
      }

      const supabasePublic = getPublicSupabaseClient();
      const resetResult = await supabasePublic.auth.resetPasswordForEmail(
        recipientEmail,
        { redirectTo }
      );

      if (resetResult.error) {
        console.error("Unable to send Supabase password reset fallback", resetResult.error);
        throw resetResult.error;
      }

      return res.status(200).json({ ok: true, mode: "reset" });
    }

    return res.status(200).json({
      ok: true,
      mode: "invite",
      id: inviteResult.data?.user?.id || "",
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unable to send invite.",
    });
  }
}
