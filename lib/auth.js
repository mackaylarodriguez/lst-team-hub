import { getSupabaseClient } from "@/lib/supabaseClient";
import { ROLE_ADMIN, ROLE_STAFF, ROLE_WORKER } from "@/lib/roles";
import { normalizeTshirtSizeForSelect } from "@/lib/tshirtSizes";

export const SESSION_UPDATED_EVENT = "lst:session-updated";

const IMPERSONATION_STORAGE_KEY = "lst:impersonated-profile";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeRole(role) {
  return role ? String(role).trim().toLowerCase() : null;
}

function formatProfileName(profile, fallbackEmail) {
  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  return normalizeEmail(fallbackEmail);
}

function isMissingClaimWorkerFunctionError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    error?.code === "PGRST202" ||
    message.includes("claim_worker_account_by_email")
  );
}

function isMissingProfileTshirtSizeColumnError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    message.includes("tshirt_size") &&
    (message.includes("does not exist") || message.includes("schema cache") || error?.code === "42703")
  );
}

function isMissingProfilePhoneColumnError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    message.includes("phone") &&
    (message.includes("does not exist") || message.includes("schema cache") || error?.code === "42703")
  );
}

function emitSessionUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_UPDATED_EVENT));
  }
}

function readImpersonatedProfile() {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
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
  const normalizedEmail = normalizeEmail(user?.email);

  if (!normalizedEmail) {
    console.log("Profile lookup skipped because authenticated user email is missing.");
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, first_name, last_name")
    .ilike("email", normalizedEmail);

  if (error) {
    console.error("Profile query error:", error);
    return null;
  }

  if (!data || data.length === 0) {
    console.log(`Profile not found for authenticated user email: ${normalizedEmail}`);
    return null;
  }

  const normalizedProfiles = (data || []).map((row) => ({
    ...row,
    email: normalizeEmail(row.email),
    role: normalizeRole(row.role),
  }));

  const normalizedProfile =
    normalizedProfiles.find((profile) => profile.id === user?.id) ||
    normalizedProfiles.find((profile) => profile.role === ROLE_ADMIN) ||
    normalizedProfiles.find((profile) => profile.role === ROLE_STAFF) ||
    normalizedProfiles[0];

  console.log("Loaded role:", normalizedProfile.role);
  return normalizedProfile;
}

async function ensureWorkerProfileAndAssignments(user) {
  const normalizedEmail = normalizeEmail(user?.email);
  if (!user?.id || !normalizedEmail) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("claim_worker_account_by_email");

  if (error) {
    if (isMissingClaimWorkerFunctionError(error)) {
      console.warn(
        "claim_worker_account_by_email is not available yet. Run the worker auto-link migration to enable seamless signup linking."
      );
      return;
    }

    console.error("Unable to auto-link worker account by email", error);
  }
}

async function syncSignupProfileDetailsFromMetadata(user) {
  if (!user?.id) return;

  const metadata = user.user_metadata || {};
  const firstName = String(metadata.first_name || "").trim();
  const lastName = String(metadata.last_name || "").trim();
  const tshirtSize = normalizeTshirtSizeForSelect(metadata.tshirt_size || "");
  const phone = String(metadata.phone || "").trim();

  if (!firstName && !lastName && !tshirtSize && !phone) {
    return;
  }

  const supabase = getSupabaseClient();
  let payload = {
    ...(firstName ? { first_name: firstName } : {}),
    ...(lastName ? { last_name: lastName } : {}),
    ...(tshirtSize ? { tshirt_size: tshirtSize } : {}),
    ...(phone ? { phone } : {}),
  };

  let { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if (error && isMissingProfileTshirtSizeColumnError(error)) {
    const { tshirt_size, ...withoutTshirt } = payload;
    payload = withoutTshirt;
    if (Object.keys(payload).length === 0) {
      return;
    }
    ({ error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id));
  }

  if (error && isMissingProfilePhoneColumnError(error)) {
    const { phone: _, ...withoutPhone } = payload;
    payload = withoutPhone;
    if (Object.keys(payload).length === 0) {
      return;
    }
    ({ error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id));
  }

  if (error) {
    console.warn("Unable to sync signup profile details from auth metadata", error);
  }
}

async function buildSession(user) {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  await ensureWorkerProfileAndAssignments(user);
  await syncSignupProfileDetailsFromMetadata(user);
  const profile = await getProfileForUser(user);
  const loadedRole = profile?.role || null;

  const resolvedRole = profile ? loadedRole : ROLE_WORKER;

  console.log("Final resolved role:", resolvedRole);

  const baseSession = {
    authUserId: user.id || "",
    id: user.id || "",
    profileId: profile?.id || user.id || "",
    email: profile?.email || normalizeEmail(user.email),
    name:
      metadata.name ||
      metadata.full_name ||
      formatProfileName(profile, profile?.email || user.email) ||
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
    profileId: impersonatedProfile.id || baseSession.profileId,
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

function isAuthSessionMissingError(error) {
  const message = String(error?.message || "").trim().toLowerCase();
  return message === "auth session missing!" || message.includes("auth session missing");
}

export async function getCurrentUserProfile() {
  const session = await getSession();
  if (!session) {
    return { user: null, profile: null, session: null };
  }

  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    if (!isAuthSessionMissingError(userError)) {
      console.error("Error loading authenticated user", userError);
      throw userError;
    }

    return {
      user: {
        id: session.authUserId || session.id || "",
        email: session.actualEmail || session.email || "",
      },
      session,
      profile: {
        id: session.profileId || session.id || "",
        email: session.email || "",
        role: session.permissionRole || session.role || ROLE_WORKER,
      },
    };
  }

  if (!user) {
    return { user: null, profile: null, session: null };
  }

  return {
    user,
    session,
    profile: {
      id: session.profileId || session.id || user.id || "",
      email: session.email || "",
      role: session.permissionRole || session.role || ROLE_WORKER,
    },
  };
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

export async function signUpWithPassword({ email, password, firstName, lastName, tshirtSize, phone }) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: String(firstName || "").trim() || undefined,
        last_name: String(lastName || "").trim() || undefined,
        tshirt_size: normalizeTshirtSizeForSelect(tshirtSize || "") || undefined,
        phone: String(phone || "").trim() || undefined,
      },
    },
  });

  if (error) {
    throw error;
  }

  const user = await getAuthenticatedUser();
  return await buildSession(user);
}

export async function updatePassword({ password }) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw error;
  }
}

export async function clearSession() {
  const supabase = getSupabaseClient();
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
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
    .select("id, email, role, first_name, last_name")
    .order("email", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    email: normalizeEmail(row.email),
    role: normalizeRole(row.role),
    name: formatProfileName(row, row.email),
  }));
}

/** Staff/admin: profiles with role = staff (for demos and staff pickers). */
export async function listStaffProfiles() {
  const { profile } = await getCurrentUserProfile();
  if (profile?.role !== ROLE_ADMIN && profile?.role !== ROLE_STAFF) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, first_name, last_name")
    .eq("role", ROLE_STAFF)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .order("email", { ascending: true });

  if (error) {
    console.error("Error loading staff profiles", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    email: normalizeEmail(row.email),
    role: normalizeRole(row.role),
    name: formatProfileName(row, row.email),
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

  sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(record));
  emitSessionUpdated();
}

export function clearImpersonatedProfile() {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
  emitSessionUpdated();
}
