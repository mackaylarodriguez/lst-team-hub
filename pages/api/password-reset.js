import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { sendResendEmail } from "@/lib/resendMail";
import {
  buildPasswordResetEmailHtml,
  buildPasswordResetEmailSubject,
} from "@/lib/passwordResetEmail";

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

function isAuthUserMissingError(error) {
  const message = String(error?.message || error?.details || "").toLowerCase();
  return message.includes("user not found") || message.includes("email not found");
}

function buildTemporaryPassword() {
  return `Tmp-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

async function findProfile(supabaseAdmin, email) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, role, first_name, last_name")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    console.error("Unable to load profile for password reset", error);
    throw error;
  }

  return data || null;
}

async function ensureAuthUserExists(supabaseAdmin, email, profile) {
  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: buildTemporaryPassword(),
    email_confirm: true,
    user_metadata: {
      role: String(profile?.role || "").trim().toLowerCase() || undefined,
      name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || undefined,
    },
  });

  if (createError) {
    const message = String(createError.message || "").toLowerCase();
    if (!message.includes("already") && !message.includes("exists")) {
      console.error("Unable to create auth user for password reset", createError);
      throw createError;
    }
  }
}

async function createRecoveryLink(supabaseAdmin, email, redirectTo) {
  return supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo,
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({ error: "Missing email." });
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const baseUrl = getBaseUrl(req);
    const redirectTo = `${baseUrl}/login?mode=reset`;

    let { data: linkData, error: linkError } = await createRecoveryLink(
      supabaseAdmin,
      email,
      redirectTo
    );

    if (linkError && isAuthUserMissingError(linkError)) {
      const profile = await findProfile(supabaseAdmin, email);
      if (!profile) {
        return res.status(200).json({ ok: true });
      }

      await ensureAuthUserExists(supabaseAdmin, email, profile);
      const retry = await createRecoveryLink(supabaseAdmin, email, redirectTo);
      linkData = retry.data;
      linkError = retry.error;
    }

    if (linkError) {
      console.error("Unable to create password reset link", linkError);
      throw linkError;
    }

    const tokenHash = normalizeText(linkData?.properties?.hashed_token);
    if (!tokenHash) {
      throw new Error("Password reset link was not returned.");
    }

    const resetUrl = `${baseUrl}/login?mode=reset&token_hash=${encodeURIComponent(tokenHash)}`;
    const emailResult = await sendResendEmail({
      to: email,
      subject: buildPasswordResetEmailSubject(),
      html: buildPasswordResetEmailHtml({ resetUrl }),
    });

    if (!emailResult.sent) {
      console.error("Unable to send password reset email", emailResult.reason, emailResult.detail || "");
      return res.status(500).json({
        error: "Unable to send password reset email. Check the Hub email setup and try again.",
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unable to send password reset email.",
    });
  }
}
