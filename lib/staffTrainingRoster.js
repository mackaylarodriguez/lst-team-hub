import { supabase } from "@/lib/supabase";
import { listTripsForCurrentUser } from "@/lib/trips";
import { listAllTripTeamMembers } from "@/lib/tripTeamMembers";
import { isManagerRole, ROLE_ADMIN, ROLE_STAFF } from "@/lib/roles";
import { getSession } from "@/lib/auth";
import {
  CLASSROOM_MODULES,
  isOnlineTrainingModuleCategory,
  resolveClassroomModuleSlotKey,
} from "@/lib/training";

export const STAFF_TRAINING_MODULE_SLOTS = CLASSROOM_MODULES.map((module) => ({
  slot: String(module.sort_order),
  label: `Module ${module.sort_order}`,
  title: module.title,
}));

const QUERY_CHUNK_SIZE = 150;
const PAGE_SIZE = 1000;

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function displayName(profile, fallbackName = "", fallbackEmail = "") {
  return (
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    fallbackName ||
    profile?.email ||
    fallbackEmail ||
    "Unnamed worker"
  );
}

function roleLabel(teamRole) {
  const role = String(teamRole || "").trim().toLowerCase();
  if (role === "leader" || role === "team leader") return "Team Leader";
  if (role) return role.replace(/\b\w/g, (char) => char.toUpperCase());
  return "Worker";
}

/** Same headcount rules as trip Workers tile — exclude leaders not traveling. */
function isRosterMemberForTraining(member) {
  const role = String(member?.teamRole || member?.team_role || "").trim().toLowerCase();
  const travels =
    member?.travelsWithTeam !== undefined
      ? member.travelsWithTeam !== false
      : member?.travels_with_team !== false;
  if (role === "leader" && !travels) return false;
  return true;
}

/** Profiles that can appear on training (workers + leaders). Staff/admin hub accounts excluded. */
function isTrainingParticipantProfile(profile) {
  const role = normalizeText(profile?.role);
  if (!role) return true;
  if (role === ROLE_ADMIN || role === ROLE_STAFF) return false;
  return true;
}

function isClassroomModuleRow(row) {
  if (!isOnlineTrainingModuleCategory(row?.category)) return false;
  return Boolean(resolveClassroomModuleSlotKey(row));
}

function pickPreferredModuleForSlot(existing, next) {
  if (!existing) return next;
  const existingCanonical = /module\s+\d+/i.test(String(existing.title || ""));
  const nextCanonical = /module\s+\d+/i.test(String(next.title || ""));
  if (nextCanonical && !existingCanonical) return next;
  return existing;
}

function buildModuleStatuses(modulesBySlot, completed, tripId, userId) {
  return STAFF_TRAINING_MODULE_SLOTS.map(({ slot }) => {
    const module = modulesBySlot.get(slot);
    if (!module || !userId) return false;
    return completed.has(`${tripId}:${userId}:${module.id}`);
  });
}

async function fetchPagedByTripIds(table, select, tripIds) {
  if (!tripIds.length) return [];
  const all = [];

  for (let i = 0; i < tripIds.length; i += QUERY_CHUNK_SIZE) {
    const tripChunk = tripIds.slice(i, i + QUERY_CHUNK_SIZE);
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .in("trip_id", tripChunk)
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const batch = data || [];
      all.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }

  return all;
}

async function fetchProfilesByIds(userIds) {
  if (!userIds.length) return [];
  const all = [];
  for (let i = 0; i < userIds.length; i += QUERY_CHUNK_SIZE) {
    const chunk = userIds.slice(i, i + QUERY_CHUNK_SIZE);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, first_name, last_name")
      .in("id", chunk);
    if (error) throw error;
    all.push(...(data || []));
  }
  return all;
}

async function fetchProfilesByEmails(emails) {
  if (!emails.length) return [];
  const all = [];
  const unique = [...new Set(emails.map((email) => String(email || "").trim()).filter(Boolean))];

  for (let i = 0; i < unique.length; i += QUERY_CHUNK_SIZE) {
    const chunk = unique.slice(i, i + QUERY_CHUNK_SIZE);
    const variants = [...new Set(chunk.flatMap((email) => [email, email.toLowerCase()]))];
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, first_name, last_name")
      .in("email", variants);
    if (error) throw error;
    all.push(...(data || []));
  }
  return all;
}

async function fetchTrainingProgress(tripIds, userIds) {
  if (!tripIds.length || !userIds.length) return [];
  const all = [];

  for (let t = 0; t < tripIds.length; t += QUERY_CHUNK_SIZE) {
    const tripChunk = tripIds.slice(t, t + QUERY_CHUNK_SIZE);
    for (let u = 0; u < userIds.length; u += QUERY_CHUNK_SIZE) {
      const userChunk = userIds.slice(u, u + QUERY_CHUNK_SIZE);
      let from = 0;
      for (;;) {
        const { data, error } = await supabase
          .from("user_training_progress")
          .select("trip_id, user_id, training_module_id, completed")
          .in("trip_id", tripChunk)
          .in("user_id", userChunk)
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const batch = data || [];
        all.push(...batch);
        if (batch.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
    }
  }

  return all;
}

/**
 * Staff Training Overview + Gradebook rows.
 * One row per person on each trip roster (and assignment fallback). Classroom modules 1–7.
 */
export async function listStaffTrainingRoster() {
  const session = await getSession();
  if (!isManagerRole(session?.permissionRole || session?.role)) {
    throw new Error("Only staff can view the training roster.");
  }

  const trips = await listTripsForCurrentUser();
  const tripIds = trips.map((trip) => trip.id).filter(Boolean);
  if (tripIds.length === 0) return [];
  const tripIdSet = new Set(tripIds);

  const [assignments, allTeamMembers, modules] = await Promise.all([
    fetchPagedByTripIds("trip_assignments", "user_id, trip_id", tripIds),
    listAllTripTeamMembers().catch((error) => {
      console.error("[staffTrainingRoster] team members", error);
      return [];
    }),
    fetchPagedByTripIds(
      "trip_training_modules",
      "id, trip_id, title, category, sort_order",
      tripIds
    ),
  ]);

  const rosterMembers = (allTeamMembers || []).filter(
    (member) => tripIdSet.has(member.tripId) && isRosterMemberForTraining(member)
  );

  const rosterEmails = [
    ...new Set(rosterMembers.map((member) => String(member.email || "").trim()).filter(Boolean)),
  ];
  const assignmentUserIds = [
    ...new Set((assignments || []).map((row) => row.user_id).filter(Boolean)),
  ];

  const [profilesByEmail, profilesByIdRows] = await Promise.all([
    fetchProfilesByEmails(rosterEmails),
    fetchProfilesByIds(assignmentUserIds),
  ]);

  const profilesById = new Map();
  const profileIdByEmail = new Map();
  for (const profile of [...profilesByEmail, ...profilesByIdRows]) {
    if (!profile?.id) continue;
    profilesById.set(profile.id, profile);
    const email = normalizeText(profile.email);
    if (email && !profileIdByEmail.has(email) && isTrainingParticipantProfile(profile)) {
      profileIdByEmail.set(email, profile.id);
    }
  }

  /** tripId -> Map(personKey -> person) */
  const peopleByTrip = new Map();

  function ensureTripPeople(tripId) {
    if (!peopleByTrip.has(tripId)) peopleByTrip.set(tripId, new Map());
    return peopleByTrip.get(tripId);
  }

  function upsertPerson(tripId, { email, name, teamRole, userId }) {
    const emailKey = normalizeText(email);
    const people = ensureTripPeople(tripId);
    const key = emailKey || (userId ? `id:${userId}` : "");
    if (!key) return;

    const existing = people.get(key) || {};
    const nextUserId = userId || existing.userId || "";
    people.set(key, {
      email: emailKey || existing.email || "",
      name: name || existing.name || "",
      teamRole: teamRole || existing.teamRole || "",
      userId: nextUserId,
      fromRoster: existing.fromRoster || false,
    });
  }

  for (const member of rosterMembers) {
    const email = normalizeText(member.email);
    if (!email || !member.tripId) continue;
    const matchedUserId = profileIdByEmail.get(email) || "";
    upsertPerson(member.tripId, {
      email,
      name: member.name || "",
      teamRole: member.teamRole || "",
      userId: matchedUserId,
    });
    const people = ensureTripPeople(member.tripId);
    const person = people.get(email);
    if (person) person.fromRoster = true;
  }

  for (const assignment of assignments || []) {
    const profile = profilesById.get(assignment.user_id);
    if (!profile || !assignment.trip_id) continue;
    // Assignment-only hub staff/admin should not clutter the worker gradebook.
    if (!isTrainingParticipantProfile(profile)) continue;
    upsertPerson(assignment.trip_id, {
      email: profile.email || "",
      name: displayName(profile),
      teamRole: "",
      userId: assignment.user_id,
    });
  }

  const allUserIds = [
    ...new Set(
      [...peopleByTrip.values()]
        .flatMap((people) => [...people.values()].map((person) => person.userId))
        .filter(Boolean)
    ),
  ];

  const progressRows = await fetchTrainingProgress(tripIds, allUserIds);
  const tripsById = new Map((trips || []).map((trip) => [trip.id, trip]));

  /** tripId -> Map(slot -> moduleRow) */
  const classroomModulesByTrip = new Map();
  for (const row of modules || []) {
    if (!isClassroomModuleRow(row)) continue;
    const slot = resolveClassroomModuleSlotKey(row);
    if (!slot) continue;
    if (!classroomModulesByTrip.has(row.trip_id)) {
      classroomModulesByTrip.set(row.trip_id, new Map());
    }
    const bySlot = classroomModulesByTrip.get(row.trip_id);
    bySlot.set(slot, pickPreferredModuleForSlot(bySlot.get(slot), row));
  }

  const completed = new Set();
  for (const row of progressRows) {
    if (!row.completed) continue;
    completed.add(`${row.trip_id}:${row.user_id}:${row.training_module_id}`);
  }

  const rows = [];

  for (const [tripId, people] of peopleByTrip.entries()) {
    const trip = tripsById.get(tripId);
    if (!trip) continue;
    const modulesBySlot = classroomModulesByTrip.get(tripId) || new Map();

    for (const person of people.values()) {
      const profile = person.userId ? profilesById.get(person.userId) : null;
      if (profile && !person.fromRoster && !isTrainingParticipantProfile(profile)) continue;

      const moduleStatuses = buildModuleStatuses(modulesBySlot, completed, tripId, person.userId);
      const modulesTotal = STAFF_TRAINING_MODULE_SLOTS.length;
      const modulesComplete = moduleStatuses.filter(Boolean).length;
      const percent = modulesTotal ? Math.round((modulesComplete / modulesTotal) * 100) : 0;
      const email = person.email || profile?.email || "";

      rows.push({
        id: `${person.userId || email || person.name}:${tripId}`,
        userId: person.userId || "",
        name: displayName(profile, person.name, email),
        email,
        tripId: trip.id,
        tripName: trip.name || "Untitled trip",
        siteLocation: trip.location || "",
        tripStartDate: trip.startDate || "",
        tripEndDate: trip.endDate || "",
        tripStatus: trip.status || "active",
        role: roleLabel(person.teamRole) || "Worker",
        modulesComplete,
        modulesTotal,
        percent,
        modulesCompleteFlags: moduleStatuses,
      });
    }
  }

  return rows.sort(
    (left, right) =>
      left.tripName.localeCompare(right.tripName) || left.name.localeCompare(right.name)
  );
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** Match My Trips: archived or end date before today → past. */
export function isStaffTrainingRowPast(row) {
  if (String(row?.tripStatus || "").toLowerCase() === "archived") return true;
  const endRaw = row?.tripEndDate;
  if (!endRaw) return false;
  const end = new Date(`${endRaw}T00:00:00`);
  if (Number.isNaN(end.getTime())) return false;
  return end < startOfToday();
}

export function partitionStaffTrainingRows(rows = []) {
  const activeRows = [];
  const pastRows = [];
  for (const row of rows || []) {
    if (isStaffTrainingRowPast(row)) pastRows.push(row);
    else activeRows.push(row);
  }
  return { activeRows, pastRows };
}
