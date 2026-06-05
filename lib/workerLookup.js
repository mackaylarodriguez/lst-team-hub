import { supabase } from "@/lib/supabase";
import { getCurrentUserProfile } from "@/lib/auth";
import { isManagerRole, ROLE_ADMIN, ROLE_STAFF, ROLE_WORKER } from "@/lib/roles";

function normalizeRole(role) {
  return role ? String(role).trim().toLowerCase() : null;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isMissingPhoneColumnError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("phone") && (message.includes("does not exist") || error?.code === "42703");
}

function isMissingCellPhoneColumnError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("cell_phone") && (message.includes("does not exist") || error?.code === "42703");
}

function isPickerProfileRow(row) {
  const role = normalizeRole(row?.role);
  if (role === ROLE_ADMIN || role === ROLE_STAFF) return false;
  return true;
}

export function normalizeWorkerPersonNameKey(firstName, lastName) {
  return [firstName, lastName]
    .map((part) => String(part || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");
}

export function normalizeRegisteredWorkerRow(row) {
  const firstName = String(row?.first_name || row?.firstName || "").trim();
  const lastName = String(row?.last_name || row?.lastName || "").trim();
  const email = normalizeEmail(row?.email);
  const name =
    [firstName, lastName].filter(Boolean).join(" ").trim() || email || "Unnamed worker";
  return {
    id: row?.id || "",
    firstName,
    lastName,
    email,
    phone: String(row?.phone || row?.cell_phone || row?.cellPhone || "").trim(),
    name,
    nameKey: normalizeWorkerPersonNameKey(firstName, lastName),
    hasAccount: !!row?.hasAccount,
  };
}

function addWorkerToMap(byKey, worker) {
  if (!worker) return;
  const emailKey = worker.email;
  const nameKey = worker.nameKey;
  if (!emailKey && !nameKey) return;

  const mapKey = emailKey || `name:${nameKey}`;
  if (!byKey.has(mapKey)) {
    byKey.set(mapKey, worker);
    return;
  }

  const existing = byKey.get(mapKey);
  if (!existing?.id && worker.id) {
    byKey.set(mapKey, worker);
  }
}

export async function listRegisteredWorkersForPicker() {
  const { profile } = await getCurrentUserProfile();
  if (!isManagerRole(profile?.role)) {
    throw new Error("Only staff can search workers.");
  }

  let { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, role, first_name, last_name, phone")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (profilesError && isMissingPhoneColumnError(profilesError)) {
    ({ data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, role, first_name, last_name")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true }));
  }

  if (profilesError) {
    console.error("Error loading registered workers for picker", profilesError);
    throw profilesError;
  }

  let { data: rosterMembers, error: rosterError } = await supabase
    .from("trip_team_members")
    .select("first_name, last_name, email, cell_phone")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (rosterError && isMissingCellPhoneColumnError(rosterError)) {
    ({ data: rosterMembers, error: rosterError } = await supabase
      .from("trip_team_members")
      .select("first_name, last_name, email")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true }));
  }

  if (rosterError) {
    console.error("Error loading roster members for worker picker", rosterError);
    throw rosterError;
  }

  const byKey = new Map();

  for (const row of profiles || []) {
    if (!isPickerProfileRow(row)) continue;
    const normalized = normalizeRegisteredWorkerRow({
      ...row,
      hasAccount: normalizeRole(row?.role) === ROLE_WORKER || !normalizeRole(row?.role),
    });
    addWorkerToMap(byKey, normalized);
  }

  for (const row of rosterMembers || []) {
    const email = normalizeEmail(row?.email);
    const firstName = String(row?.first_name || "").trim();
    const lastName = String(row?.last_name || "").trim();
    if (!email && !firstName && !lastName) continue;

    addWorkerToMap(
      byKey,
      normalizeRegisteredWorkerRow({
        id: email ? `roster:${email}` : "",
        first_name: firstName,
        last_name: lastName,
        email,
        cell_phone: row?.cell_phone,
        hasAccount: false,
      })
    );
  }

  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
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
        lastName.includes(needle) ||
        `${firstName} ${lastName}`.trim().includes(needle)
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
      profileId: member.profileId || (String(match.id || "").startsWith("roster:") ? "" : match.id),
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
