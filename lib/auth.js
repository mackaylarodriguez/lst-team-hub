import { getSupabaseClient } from "@/lib/supabaseClient";
import { ROLE_ADMIN, ROLE_WORKER } from "@/lib/roles";

export const SESSION_UPDATED_EVENT = "lst:session-updated";

const IMPERSONATION_STORAGE_KEY = "lst:impersonated-profile";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeRole(role) {
  return role ? String(role).trim().toLowerCase() : null;
}

function emitSessionUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_UPDATED_EVENT));
  }
}

function readImpersonatedProfile() {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const email = normalizeEmail(parsed?.email);
    const role = normalizeRole(parsed?.role);
    if (!email || !role) return null;

    return {
      id: parsed?.id || "",
      email,
      role,
      name: parsed?.name || email,
    };
  } catch {
    return null;
  }
}

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

  const normalizedEmail = normalizeEmail(user.email);
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
  return {
    ...data,
    email: normalizeEmail(data.email),
    role: normalizeRole(data.role),
  };
}

async function buildSession(user) {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const profile = await getProfileForUser(user);
  const loadedRole = profile?.role || null;

  console.log("Loaded role:", loadedRole);

  const resolvedRole = profile ? loadedRole : ROLE_WORKER;

  console.log("Final resolved role:", resolvedRole);

  const baseSession = {
    authUserId: user.id || "",
    id: profile?.id || user.id || "",
    email: profile?.email || normalizeEmail(user.email),
    name:
      metadata.name ||
      metadata.full_name ||
      profile?.email ||
      user.email ||
      "Unknown user",
    role: resolvedRole,
    actualRole: resolvedRole,
    permissionRole: resolvedRole,
    actualEmail: profile?.email || normalizeEmail(user.email),
    isImpersonating: false,
  };

  if (resolvedRole !== ROLE_ADMIN) {
    return baseSession;
  }

  const impersonatedProfile = readImpersonatedProfile();
  if (!impersonatedProfile) {
    return baseSession;
  }

  console.log("Final resolved role:", impersonatedProfile.role);

  return {
    ...baseSession,
    id: impersonatedProfile.id || baseSession.id,
    email: impersonatedProfile.email,
    name: impersonatedProfile.name || impersonatedProfile.email,
    role: impersonatedProfile.role,
    permissionRole: ROLE_ADMIN,
    isImpersonating: true,
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

export async function signUpWithPassword({ email, password }) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signUp({
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
  if (typeof window !== "undefined") {
    localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    emitSessionUpdated();
  }
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function listProfilesForAdmin() {
  const user = await getAuthenticatedUser();
  const profile = await getProfileForUser(user);

  if (profile?.role !== ROLE_ADMIN) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .order("email", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    email: normalizeEmail(row.email),
    role: normalizeRole(row.role),
    name: normalizeEmail(row.email),
  }));
}

export function setImpersonatedProfile(profile) {
  if (typeof window === "undefined") return;

  const record = {
    id: profile?.id || "",
    email: normalizeEmail(profile?.email),
    role: normalizeRole(profile?.role),
    name: profile?.name || normalizeEmail(profile?.email),
  };

  localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(record));
  emitSessionUpdated();
}

export function clearImpersonatedProfile() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
  emitSessionUpdated();
}
