import { supabase } from "@/lib/supabase";
import { listTripsForCurrentUser } from "@/lib/trips";
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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function displayName(profile, fallbackEmail = "") {
  return (
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
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
function isRosterMemberForTraining(row) {
  const role = String(row?.team_role || "").trim().toLowerCase();
  const travels = row?.travels_with_team !== false;
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

  const [
    { data: assignments, error: assignmentsError },
    { data: teamMemberRows, error: teamMembersError },
    { data: modules, error: modulesError },
  ] = await Promise.all([
    supabase.from("trip_assignments").select("user_id, trip_id").in("trip_id", tripIds),
    supabase
      .from("trip_team_members")
      .select("trip_id, email, name, team_role, travels_with_team")
      .in("trip_id", tripIds),
    supabase
      .from("trip_training_modules")
      .select("id, trip_id, title, category, sort_order")
      .in("trip_id", tripIds),
  ]);

  if (assignmentsError) {
    console.error("[staffTrainingRoster] assignments", assignmentsError);
    throw assignmentsError;
  }
  if (modulesError) {
    console.error("[staffTrainingRoster] modules", modulesError);
    throw modulesError;
  }
  if (teamMembersError) {
    console.error("[staffTrainingRoster] team members", teamMembersError);
  }

  const rosterRows = (teamMembersError ? [] : teamMemberRows || []).filter(isRosterMemberForTraining);
  const rosterEmails = [
    ...new Set(
      rosterRows
        .map((row) => String(row.email || "").trim())
        .filter(Boolean)
        .flatMap((email) => [email, email.toLowerCase()])
    ),
  ];
  const assignmentUserIds = [
    ...new Set((assignments || []).map((row) => row.user_id).filter(Boolean)),
  ];

  const profileQueries = [];
  if (rosterEmails.length > 0) {
    profileQueries.push(
      supabase
        .from("profiles")
        .select("id, email, role, first_name, last_name")
        .in("email", rosterEmails)
    );
  } else {
    profileQueries.push(Promise.resolve({ data: [], error: null }));
  }
  if (assignmentUserIds.length > 0) {
    profileQueries.push(
      supabase
        .from("profiles")
        .select("id, email, role, first_name, last_name")
        .in("id", assignmentUserIds)
    );
  } else {
    profileQueries.push(Promise.resolve({ data: [], error: null }));
  }

  const [profilesByEmailResult, profilesByIdResult] = await Promise.all(profileQueries);

  if (profilesByEmailResult.error) {
    console.error("[staffTrainingRoster] profiles by email", profilesByEmailResult.error);
    throw profilesByEmailResult.error;
  }
  if (profilesByIdResult.error) {
    console.error("[staffTrainingRoster] profiles by id", profilesByIdResult.error);
    throw profilesByIdResult.error;
  }

  const profilesById = new Map();
  const profileIdByEmail = new Map();
  for (const profile of [...(profilesByEmailResult.data || []), ...(profilesByIdResult.data || [])]) {
    if (!profile?.id || !isTrainingParticipantProfile(profile)) continue;
    profilesById.set(profile.id, profile);
    const email = normalizeText(profile.email);
    if (email && !profileIdByEmail.has(email)) {
      profileIdByEmail.set(email, profile.id);
    }
  }

  /** tripId -> Map(email -> { email, name, teamRole, userId }) */
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
    people.set(key, {
      email: emailKey || existing.email || "",
      name: name || existing.name || "",
      teamRole: teamRole || existing.teamRole || "",
      userId: userId || existing.userId || "",
    });
  }

  for (const row of rosterRows) {
    const email = normalizeText(row.email);
    if (!email || !row.trip_id) continue;
    upsertPerson(row.trip_id, {
      email,
      name: row.name || "",
      teamRole: row.team_role || "",
      userId: profileIdByEmail.get(email) || "",
    });
  }

  for (const assignment of assignments || []) {
    const profile = profilesById.get(assignment.user_id);
    if (!profile || !assignment.trip_id) continue;
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

  let progressRows = [];
  if (allUserIds.length > 0) {
    const { data, error: progressError } = await supabase
      .from("user_training_progress")
      .select("trip_id, user_id, training_module_id, completed")
      .in("trip_id", tripIds)
      .in("user_id", allUserIds);
    if (progressError) {
      console.error("[staffTrainingRoster] progress", progressError);
      throw progressError;
    }
    progressRows = data || [];
  }

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
      // Skip hub staff/admin who somehow landed on a roster without a matching worker/leader profile.
      if (profile && !isTrainingParticipantProfile(profile)) continue;

      const moduleStatuses = buildModuleStatuses(modulesBySlot, completed, tripId, person.userId);
      const modulesTotal = STAFF_TRAINING_MODULE_SLOTS.length;
      const modulesComplete = moduleStatuses.filter(Boolean).length;
      const percent = modulesTotal ? Math.round((modulesComplete / modulesTotal) * 100) : 0;
      const email = person.email || profile?.email || "";

      rows.push({
        id: `${person.userId || email || person.name}:${tripId}`,
        userId: person.userId || "",
        name: displayName(profile, person.name || email),
        email,
        tripId: trip.id,
        tripName: trip.name || "Untitled trip",
        siteLocation: trip.location || "",
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
