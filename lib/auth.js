import { getSupabaseClient } from "@/lib/supabaseClient";
import { getUser } from "@/lib/sampleData";

async function getProfileForUser(user) {
  if (!user?.email) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("email", user.email)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error loading profile role", error);
    }
    return null;
  }

  return data;
}

async function buildSession(user) {
  if (!user) return null;

  const fallbackUser = user.email ? getUser(user.email) : null;
  const metadata = user.user_metadata || {};
  const profile = await getProfileForUser(user);

  return {
    email: user.email || fallbackUser?.email || "",
    name:
      profile?.name ||
      metadata.name ||
      metadata.full_name ||
      fallbackUser?.name ||
      user.email ||
      "Unknown user",
    role: profile?.role || metadata.role || fallbackUser?.role || "participant",
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

  return await buildSession(session?.user ?? null);
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return await buildSession(data.user ?? null);
}

export async function clearSession() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
