import { getSupabaseClient } from "@/lib/supabaseClient";
import { getUser } from "@/lib/sampleData";

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

  console.log("Authenticated user", user);
  return user ?? null;
}

async function getProfileForUser(user) {
  if (!user?.id && !user?.email) {
    return null;
  }

  const supabase = getSupabaseClient();
  let query = supabase.from("profiles").select("id, email, role, name");

  if (user.id) {
    query = query.eq("id", user.id);
  } else if (user.email) {
    query = query.eq("email", user.email);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error loading profile role", error);
    }
    return null;
  }

  console.log("Resolved profile", data);
  return data;
}

async function buildSession(user) {
  if (!user) return null;

  const fallbackUser = user.email ? getUser(user.email) : null;
  const metadata = user.user_metadata || {};
  const profile = await getProfileForUser(user);
  const isStaff = profile?.role === "staff";
  const resolvedRole = profile?.role || metadata.role || "participant";

  console.log("Resolved role", {
    email: user.email,
    role: resolvedRole,
    isStaff,
  });

  return {
    email: user.email || fallbackUser?.email || "",
    name:
      profile?.name ||
      metadata.name ||
      metadata.full_name ||
      fallbackUser?.name ||
      user.email ||
      "Unknown user",
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
