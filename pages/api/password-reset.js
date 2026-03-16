import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

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

  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({ error: "Missing email." });
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const supabasePublic = getPublicSupabaseClient();
    const baseUrl = getBaseUrl(req);
    const redirectTo = `${baseUrl}/login?mode=reset`;

    const { data: authUsers, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
    if (listUsersError) {
      console.error("Unable to load auth users for password reset", listUsersError);
      throw listUsersError;
    }

    const authUserExists = (authUsers?.users || []).some(
      (user) => normalizeEmail(user.email) === email
    );

    if (!authUserExists) {
      await ensureAuthUserExists(supabaseAdmin, email);
    }

    const { error } = await supabasePublic.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error("Unable to send password reset email", error);

      if (isAuthUserMissingError(error)) {
        await ensureAuthUserExists(supabaseAdmin, email);
        const retry = await supabasePublic.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (retry.error) {
          console.error("Unable to send password reset email after creating auth user", retry.error);
          throw retry.error;
        }
      } else {
        throw error;
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unable to send password reset email.",
    });
  }
}
