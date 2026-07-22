import { supabase } from "@/lib/supabase";
import { listTripsForCurrentUser } from "@/lib/trips";
import { isManagerRole, ROLE_WORKER } from "@/lib/roles";
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

function displayName(profile) {
  return (
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    profile?.email ||
    "Unnamed worker"
  );
}

function roleLabel(teamRole) {
  const role = String(teamRole || "").trim().toLowerCase();
  if (role === "leader" || role === "team leader") return "Team Leader";
  if (role) return role.replace(/\b\w/g, (char) => char.toUpperCase());
  return "Worker";
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

/**
 * Staff Training Overview + Gradebook rows from live trip assignments and module progress.
 * One row per worker-trip assignment. Classroom modules only (Modules 1–7).
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
      .select("trip_id, email, team_role, travels_with_team")
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

  const assignmentUserIds = [
    ...new Set((assignments || []).map((row) => row.user_id).filter(Boolean)),
  ];
  if (assignmentUserIds.length === 0) return [];

  const [{ data: profiles, error: profilesError }, { data: progressRows, error: progressError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, role, first_name, last_name")
        .in("id", assignmentUserIds),
      supabase
        .from("user_training_progress")
        .select("trip_id, user_id, training_module_id, completed")
        .in("trip_id", tripIds)
        .in("user_id", assignmentUserIds),
    ]);

  if (profilesError) {
    console.error("[staffTrainingRoster] profiles", profilesError);
    throw profilesError;
  }
  if (progressError) {
    console.error("[staffTrainingRoster] progress", progressError);
    throw progressError;
  }

  const workerProfiles = (profiles || []).filter((profile) => {
    const role = normalizeText(profile.role);
    return role === ROLE_WORKER || !role;
  });
  const workerIds = new Set(workerProfiles.map((profile) => profile.id));
  const profilesById = new Map(workerProfiles.map((profile) => [profile.id, profile]));
  const tripsById = new Map((trips || []).map((trip) => [trip.id, trip]));

  const roleByTripEmail = new Map();
  for (const row of teamMemberRows || []) {
    const tripId = row.trip_id;
    const email = normalizeText(row.email);
    if (!tripId || !email) continue;
    roleByTripEmail.set(`${tripId}:${email}`, roleLabel(row.team_role));
  }

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
  for (const row of progressRows || []) {
    if (!row.completed) continue;
    completed.add(`${row.trip_id}:${row.user_id}:${row.training_module_id}`);
  }

  const rows = [];

  for (const assignment of assignments || []) {
    if (!workerIds.has(assignment.user_id)) continue;
    const profile = profilesById.get(assignment.user_id);
    const trip = tripsById.get(assignment.trip_id);
    if (!profile || !trip) continue;

    const modulesBySlot = classroomModulesByTrip.get(trip.id) || new Map();
    const moduleStatuses = STAFF_TRAINING_MODULE_SLOTS.map(({ slot }) => {
      const module = modulesBySlot.get(slot);
      if (!module) return false;
      return completed.has(`${trip.id}:${assignment.user_id}:${module.id}`);
    });

    const modulesTotal = STAFF_TRAINING_MODULE_SLOTS.length;
    const modulesComplete = moduleStatuses.filter(Boolean).length;
    const percent = modulesTotal
      ? Math.round((modulesComplete / modulesTotal) * 100)
      : 0;

    rows.push({
      id: `${assignment.user_id}:${trip.id}`,
      userId: assignment.user_id,
      name: displayName(profile),
      email: profile.email || "",
      tripId: trip.id,
      tripName: trip.name || "Untitled trip",
      siteLocation: trip.location || "",
      role: roleByTripEmail.get(`${trip.id}:${normalizeText(profile.email)}`) || "Worker",
      modulesComplete,
      modulesTotal,
      percent,
      modulesCompleteFlags: moduleStatuses,
    });
  }

  return rows.sort(
    (left, right) =>
      left.tripName.localeCompare(right.tripName) || left.name.localeCompare(right.name)
  );
}
