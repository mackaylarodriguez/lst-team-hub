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

const WORKER_PAGE_SIZE = 1000;

/** Profile ids only. Roster and recruiting rows use prefixed ids for list keys. */
export function profileIdForWorkerLink(workerOrId) {
  const id = String(typeof workerOrId === "object" ? workerOrId?.id : workerOrId || "").trim();
  if (!id || id.startsWith("roster:") || id.startsWith("contact:")) return "";
  return id;
}

async function fetchAllPages(createQuery) {
  const rows = [];
  for (let from = 0; ; from += WORKER_PAGE_SIZE) {
    const { data, error } = await createQuery().range(from, from + WORKER_PAGE_SIZE - 1);
    if (error) return { rows, error };
    rows.push(...(data || []));
    if (!data || data.length < WORKER_PAGE_SIZE) return { rows, error: null };
  }
}

function parseRecruitingTeamMemberLines(value) {
  return String(value || "")
    .split(/\r?\n|,|;/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const pipeParts = entry.split(/\s+\|\s+/);
      const phone = pipeParts.length > 1 ? String(pipeParts[1] || "").trim() : "";
      const core = (pipeParts[0] || entry).replace(/^\[minor(?::\s*\d+)?\]\s*/i, "").trim();
      const angleMatch = core.match(/^(.*?)\s*<([^>]+)>$/);
      let name = core;
      let email = "";
      if (angleMatch) {
        name = String(angleMatch[1] || "").trim();
        email = normalizeEmail(angleMatch[2]);
      } else {
        const emailMatch = core.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        if (emailMatch) {
          email = normalizeEmail(emailMatch[0]);
          name = core.replace(emailMatch[0], "").replace(/[<>()-]/g, " ").trim();
        }
      }
      const parts = name.split(/\s+/).filter(Boolean);
      return {
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" "),
        email,
        phone,
      };
    });
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

function workerEmailsConflict(left, right) {
  const leftEmail = normalizeEmail(left?.email);
  const rightEmail = normalizeEmail(right?.email);
  return !!(leftEmail && rightEmail && leftEmail !== rightEmail);
}

/** Same person stored once as a profile and again as a roster or recruiting row with no email. */
function findExistingWorkerKey(byKey, worker) {
  const emailKey = normalizeEmail(worker?.email);
  if (emailKey && byKey.has(emailKey)) return emailKey;

  const nameKey = worker?.nameKey ? `name:${worker.nameKey}` : "";
  if (!worker?.nameKey) return "";

  if (nameKey && byKey.has(nameKey) && !workerEmailsConflict(byKey.get(nameKey), worker)) {
    return nameKey;
  }

  for (const [key, existing] of byKey) {
    if (existing?.nameKey !== worker.nameKey) continue;
    if (workerEmailsConflict(existing, worker)) continue;
    return key;
  }

  return "";
}

function mergeWorkerRecords(existing, incoming) {
  const existingProfileId = profileIdForWorkerLink(existing);
  const incomingProfileId = profileIdForWorkerLink(incoming);
  const preferIncoming =
    (incoming.hasAccount && !existing.hasAccount) ||
    (!!incomingProfileId && !existingProfileId && !existing.hasAccount) ||
    (!existing.email && !!incoming.email && !existing.hasAccount);
  const primary = preferIncoming ? incoming : existing;
  const secondary = preferIncoming ? existing : incoming;
  const id = profileIdForWorkerLink(primary)
    ? primary.id
    : profileIdForWorkerLink(secondary)
      ? secondary.id
      : primary.id || secondary.id;

  return normalizeRegisteredWorkerRow({
    id,
    firstName: primary.firstName || secondary.firstName,
    lastName: primary.lastName || secondary.lastName,
    email: primary.email || secondary.email,
    phone: primary.phone || secondary.phone,
    hasAccount: !!(primary.hasAccount || secondary.hasAccount),
  });
}

function addWorkerToMap(byKey, worker) {
  if (!worker) return;
  const emailKey = normalizeEmail(worker.email);
  const nameKey = worker.nameKey;
  if (!emailKey && !nameKey) return;

  const existingKey = findExistingWorkerKey(byKey, worker);
  if (!existingKey) {
    byKey.set(emailKey || `name:${nameKey}`, worker);
    return;
  }

  const merged = mergeWorkerRecords(byKey.get(existingKey), worker);
  byKey.delete(existingKey);
  const mergedKey = normalizeEmail(merged.email) || `name:${merged.nameKey}`;
  const occupant = byKey.get(mergedKey);
  byKey.set(mergedKey, occupant ? mergeWorkerRecords(occupant, merged) : merged);
}

function addUnregisteredWorker(byKey, { id, firstName, lastName, email, phone }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedFirst = String(firstName || "").trim();
  const normalizedLast = String(lastName || "").trim();
  if (!normalizedEmail && !normalizedFirst && !normalizedLast) return;

  addWorkerToMap(
    byKey,
    normalizeRegisteredWorkerRow({
      id,
      first_name: normalizedFirst,
      last_name: normalizedLast,
      email: normalizedEmail,
      phone,
      hasAccount: false,
    })
  );
}

/**
 * Every worker staff can attach to a recruiting or potential team:
 * hub profiles, trip rosters, and recruiting contacts / roster lines.
 * Paged so the default 1,000-row cap does not hide the rest of the database.
 */
export async function listRegisteredWorkersForPicker() {
  const { profile } = await getCurrentUserProfile();
  if (!isManagerRole(profile?.role)) {
    throw new Error("Only staff can search workers.");
  }

  let profilesResult = await fetchAllPages(() =>
    supabase.from("profiles").select("id, email, role, first_name, last_name, phone").order("id", { ascending: true })
  );
  if (profilesResult.error && isMissingPhoneColumnError(profilesResult.error)) {
    profilesResult = await fetchAllPages(() =>
      supabase.from("profiles").select("id, email, role, first_name, last_name").order("id", { ascending: true })
    );
  }
  if (profilesResult.error) {
    console.error("Error loading workers for picker", profilesResult.error);
    throw profilesResult.error;
  }

  let rosterResult = await fetchAllPages(() =>
    supabase
      .from("trip_team_members")
      .select("first_name, last_name, email, cell_phone")
      .order("id", { ascending: true })
  );
  if (rosterResult.error && isMissingCellPhoneColumnError(rosterResult.error)) {
    rosterResult = await fetchAllPages(() =>
      supabase.from("trip_team_members").select("first_name, last_name, email").order("id", { ascending: true })
    );
  }
  if (rosterResult.error) {
    console.error("Error loading roster members for worker picker", rosterResult.error);
    throw rosterResult.error;
  }

  let recruitingContacts = [];
  try {
    let contactsResult = await fetchAllPages(() =>
      supabase
        .from("recruiting_contacts")
        .select("id, first_name, last_name, email, phone")
        .order("id", { ascending: true })
    );
    if (contactsResult.error && isMissingPhoneColumnError(contactsResult.error)) {
      contactsResult = await fetchAllPages(() =>
        supabase
          .from("recruiting_contacts")
          .select("id, first_name, last_name, email")
          .order("id", { ascending: true })
      );
    }
    if (contactsResult.error) throw contactsResult.error;
    recruitingContacts = contactsResult.rows;
  } catch (contactsError) {
    console.error("Error loading recruiting contacts for worker picker", contactsError);
  }

  let cycleRows = [];
  try {
    const cyclesResult = await fetchAllPages(() =>
      supabase
        .from("recruiting_cycle_contacts")
        .select("team_members, pending_lock_team_setup")
        .order("id", { ascending: true })
    );
    if (cyclesResult.error) throw cyclesResult.error;
    cycleRows = cyclesResult.rows;
  } catch (cyclesError) {
    console.error("Error loading recruiting rosters for worker picker", cyclesError);
  }

  const byKey = new Map();

  for (const row of profilesResult.rows) {
    if (!isPickerProfileRow(row)) continue;
    const normalized = normalizeRegisteredWorkerRow({
      ...row,
      hasAccount: normalizeRole(row?.role) === ROLE_WORKER || !normalizeRole(row?.role),
    });
    addWorkerToMap(byKey, normalized);
  }

  for (const row of rosterResult.rows) {
    const email = normalizeEmail(row?.email);
    const firstName = String(row?.first_name || "").trim();
    const lastName = String(row?.last_name || "").trim();
    const nameKey = normalizeWorkerPersonNameKey(firstName, lastName);
    addUnregisteredWorker(byKey, {
      id: email ? `roster:${email}` : nameKey ? `roster:name:${nameKey}` : "",
      firstName,
      lastName,
      email,
      phone: row?.cell_phone,
    });
  }

  for (const row of recruitingContacts) {
    const email = normalizeEmail(row?.email);
    const firstName = String(row?.first_name || "").trim();
    const lastName = String(row?.last_name || "").trim();
    const nameKey = normalizeWorkerPersonNameKey(firstName, lastName);
    addUnregisteredWorker(byKey, {
      id: email ? `contact:${email}` : nameKey ? `contact:name:${nameKey}` : "",
      firstName,
      lastName,
      email,
      phone: row?.phone,
    });
  }

  for (const row of cycleRows) {
    for (const person of parseRecruitingTeamMemberLines(row?.team_members)) {
      const nameKey = normalizeWorkerPersonNameKey(person.firstName, person.lastName);
      addUnregisteredWorker(byKey, {
        id: person.email ? `contact:${person.email}` : nameKey ? `contact:name:${nameKey}` : "",
        ...person,
      });
    }

    const pendingMembers = row?.pending_lock_team_setup?.teamMembers;
    if (!Array.isArray(pendingMembers)) continue;
    for (const member of pendingMembers) {
      const email = normalizeEmail(member?.email);
      const firstName = String(member?.firstName || "").trim();
      const lastName = String(member?.lastName || "").trim();
      const nameKey = normalizeWorkerPersonNameKey(firstName, lastName);
      addUnregisteredWorker(byKey, {
        id: email ? `contact:${email}` : nameKey ? `contact:name:${nameKey}` : "",
        firstName,
        lastName,
        email,
        phone: member?.phone,
      });
    }
  }

  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export function searchRegisteredWorkers(workers, query, limit = 8) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return [];

  const matches = (workers || []).filter((worker) => {
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
  });

  const unique = new Map();
  for (const worker of matches) {
    addWorkerToMap(unique, worker);
  }

  return [...unique.values()]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
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
      profileId: member.profileId || profileIdForWorkerLink(match),
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
