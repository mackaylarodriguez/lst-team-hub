import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function buildResetEmailHtml({ email, resetUrl }) {
  const safeEmail = escapeHtml(email || "");
  const safeResetUrl = escapeHtml(resetUrl || "");

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #1f2937; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 28px; margin: 0 0 16px; color: #0f172a;">Reset your password</h1>
      <p style="margin: 0 0 12px;">A password reset was requested for <strong>${safeEmail}</strong>.</p>
      <p style="margin: 0 0 12px;">Click the button below to choose a new password.</p>
      <p style="margin: 24px 0;">
        <a href="${safeResetUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #0f766e; color: #ffffff; text-decoration: none; font-weight: 700;">Reset Password</a>
      </p>
      <p style="margin: 0 0 12px;">If you did not request this, you can ignore this email.</p>
    </div>
  `;
}

function isAuthUserMissingError(error) {
  const message = String(error?.message || error?.details || "").toLowerCase();
  return message.includes("user not found") || message.includes("email not found");
}

function buildTemporaryPassword() {
  return `Tmp-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

async function ensureAuthUserExists(supabaseAdmin, email) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, role, first_name, last_name")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    console.error("Unable to load profile for password reset", error);
    throw error;
  }

  const profile = data || null;

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const resendApiKey = normalizeText(process.env.RESEND_API_KEY);
  const fromEmail = normalizeText(process.env.RESEND_FROM_EMAIL);

  if (!resendApiKey || !fromEmail) {
    return res.status(500).json({
      error: "Password reset email is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL.",
    });
  }

  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({ error: "Missing email." });
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const baseUrl = getBaseUrl(req);
    const redirectTo = `${baseUrl}/login?mode=reset`;
    let { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo,
      },
    });

    if (error && isAuthUserMissingError(error)) {
      await ensureAuthUserExists(supabaseAdmin, email);
      ({ data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo,
        },
      }));
    }

    if (error) {
      console.error("Unable to generate password reset link", error);
      throw error;
    }

    const resetUrl = data?.properties?.action_link;
    if (!resetUrl) {
      return res.status(500).json({ error: "Unable to create password reset link." });
    }

    const payload = {
      from: fromEmail,
      to: [email],
      subject: "Reset your password",
      html: buildResetEmailHtml({ email, resetUrl }),
      text: [
        `A password reset was requested for ${email}.`,
        "",
        `Reset your password here: ${resetUrl}`,
        "",
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("Unable to send password reset email", responseData || response.statusText);
      return res.status(502).json({
        error: responseData?.message || "Unable to send password reset email.",
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unable to send password reset email.",
    });
  }
}
