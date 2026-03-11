import { getSupabaseClient } from "@/lib/supabaseClient";
import { ROLE_WORKER } from "@/lib/roles";

async function getAuthenticatedUser() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Error loading authenticated user", error);
    return null;
  }

  console.log("Authenticated user id:", user?.id || null);
  console.log("Authenticated user email:", user?.email || null);
  return user ?? null;
}

async function getProfileForUser(user) {
  if (!user?.email) {
    console.log("Profile lookup skipped because authenticated user email is missing.");
    return null;
  }

  const normalizedEmail = String(user.email).trim().toLowerCase();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    console.error("Profile query error:", error);
    return null;
  }

  if (!data) {
    console.log(`Profile not found for authenticated user email: ${normalizedEmail}`);
    return null;
  }

  console.log("Loaded profile row:", data);
  return data;
}

async function buildSession(user) {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const profile = await getProfileForUser(user);
  const loadedRole = profile?.role
    ? String(profile.role).trim().toLowerCase()
    : null;

  console.log("Loaded role:", loadedRole);

  const resolvedRole = profile ? loadedRole : ROLE_WORKER;

  console.log("Final resolved role:", resolvedRole);

  return {
    id: user.id || profile?.id || "",
    email: user.email || "",
    name: metadata.name || metadata.full_name || user.email || "Unknown user",
    role: resolvedRole,
  };
}

export async function getSession() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session) {
    return null;
  }

  const user = await getAuthenticatedUser();
  return await buildSession(user ?? session.user ?? null);
}

export async function requireSession(router) {
  const session = await getSession();
  if (!session) {
    router.replace("/login");
    return null;
  }
  return session;
}

export async function signInWithPassword({ email, password }) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  const user = await getAuthenticatedUser();
  return await buildSession(user);
}

export async function clearSession() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
