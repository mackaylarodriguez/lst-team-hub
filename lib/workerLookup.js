import { supabase } from "@/lib/supabase";
import { getCurrentUserProfile } from "@/lib/auth";
import { isManagerRole, ROLE_WORKER } from "@/lib/roles";

function normalizeRole(role) {
  return role ? String(role).trim().toLowerCase() : null;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeWorkerPersonNameKey(firstName, lastName) {
  return [firstName, lastName]
    .map((part) => String(part || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");
}

export function normalizeRegisteredWorkerRow(row) {
  const firstName = String(row?.first_name || "").trim();
  const lastName = String(row?.last_name || "").trim();
  const email = normalizeEmail(row?.email);
  const name =
    [firstName, lastName].filter(Boolean).join(" ").trim() || email || "Unnamed worker";
  return {
    id: row?.id || "",
    firstName,
    lastName,
    email,
    phone: String(row?.phone || "").trim(),
    name,
    nameKey: normalizeWorkerPersonNameKey(firstName, lastName),
  };
}

export async function listRegisteredWorkersForPicker() {
  const { profile } = await getCurrentUserProfile();
  if (!isManagerRole(profile?.role)) {
    throw new Error("Only admin and staff can search workers.");
  }

  let { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, first_name, last_name, phone")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("phone") && (message.includes("does not exist") || error?.code === "42703")) {
      ({ data, error } = await supabase
        .from("profiles")
        .select("id, email, role, first_name, last_name")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true }));
    }
  }

  if (error) {
    console.error("Error loading registered workers for picker", error);
    throw error;
  }

  const byEmail = new Map();
  for (const row of data || []) {
    if (normalizeRole(row?.role) !== ROLE_WORKER) continue;
    const normalized = normalizeRegisteredWorkerRow(row);
    if (!normalized.email && !normalized.nameKey) continue;
    const emailKey = normalized.email || `__no_email__:${normalized.id}`;
    if (!byEmail.has(emailKey)) {
      byEmail.set(emailKey, normalized);
    }
  }

  return [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export function searchRegisteredWorkers(workers, query, limit = 8) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return [];

  return (workers || [])
    .filter((worker) => {
      const email = String(worker?.email || "").toLowerCase();
      const name = String(worker?.name || "").toLowerCase();
      const firstName = String(worker?.firstName || "").toLowerCase();
      const lastName = String(worker?.lastName || "").toLowerCase();
      return (
        email.includes(needle) ||
        name.includes(needle) ||
        firstName.includes(needle) ||
        lastName.includes(needle)
      );
    })
    .slice(0, limit);
}

export function resolveRegisteredWorker(workers, { firstName, lastName, email, profileId } = {}) {
  const list = workers || [];
  const linkedId = String(profileId || "").trim();
  if (linkedId) {
    const byId = list.find((worker) => String(worker.id) === linkedId);
    if (byId) return byId;
  }

  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail) {
    const byEmail = list.find((worker) => normalizeEmail(worker.email) === normalizedEmail);
    if (byEmail) return byEmail;
  }

  const nameKey = normalizeWorkerPersonNameKey(firstName, lastName);
  if (!nameKey) return null;

  const matches = list.filter((worker) => worker.nameKey === nameKey);
  if (matches.length === 1) return matches[0];
  return null;
}

export function enrichTeamMembersWithRegisteredWorkers(teamMembers, workers) {
  return (teamMembers || []).map((member) => {
    const match = resolveRegisteredWorker(workers, member);
    if (!match) return member;

    return {
      ...member,
      profileId: member.profileId || match.id,
      firstName: String(member.firstName || "").trim() || match.firstName,
      lastName: String(member.lastName || "").trim() || match.lastName,
      email: normalizeEmail(member.email) || match.email,
      phone: String(member.phone || "").trim() || match.phone || member.phone,
    };
  });
}

export async function enrichTeamMembersWithExistingWorkers(teamMembers) {
  const workers = await listRegisteredWorkersForPicker();
  return enrichTeamMembersWithRegisteredWorkers(teamMembers, workers);
}
