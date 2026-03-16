import { createClient } from "@supabase/supabase-js";

let adminClient = null;

function normalizeEnvValue(value) {
  return String(value || "").trim().replace(/^['"]|['"]$/g, "");
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getSupabaseAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing server auth environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  if (!isValidHttpUrl(supabaseUrl)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be a full http or https URL like https://your-project.supabase.co."
    );
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
