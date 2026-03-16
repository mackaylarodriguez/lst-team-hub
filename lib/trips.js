import { supabase } from "@/lib/supabase";
import { getSession } from "./auth";
import { isAdminRole, isManagerRole, isStaffRole, ROLE_WORKER } from "./roles";
import { listFundraisingProfiles } from "./fundraising";
import { listTripTasks, syncDefaultTripTaskDueDates } from "./tripTasks";
import { listTrainingModules } from "./training";
import { listStaffTasksForTrip } from "./staffTasks";
import {
  DEFAULT_TRAINING_TIMELINE_TYPE,
  normalizeTrainingTimelineType,
} from "./workerTaskTemplate";

export const TRIPS_UPDATED_EVENT = "lst:trips-updated";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeRole(role) {
  return role ? String(role).trim().toLowerCase() : null;
}

function normalizeExtraTravelStatus(value, fallback = false) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "yes" || normalized === "no" || normalized === "maybe") {
    return normalized;
  }

  return fallback ? "yes" : "no";
}

function parseOptionalAmount(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeOptionalAmount(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildTripTeamMemberRows(teamMembers) {
  return (teamMembers || [])
    .map((member) => {
      const firstName = String(member?.firstName || "").trim();
      const lastName = String(member?.lastName || "").trim();
      const email = normalizeEmail(member?.email);
      const startDate = String(member?.startDate || "").trim();
      const endDate = String(member?.endDate || "").trim();

      if (!firstName && !lastName && !email && !startDate && !endDate) {
        return null;
      }

      return {
        first_name: firstName || null,
        last_name: lastName || null,
        email: email || null,
        start_date: startDate || null,
        end_date: endDate || null,
      };
    })
    .filter(Boolean);
}

export async function getCurrentUserProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Error loading authenticated user", userError);
    throw userError;
  }

  if (!user) {
    return { user: null, profile: null, session: null };
  }

  const session = await getSession();
  if (session) {
    return {
      user,
      session,
      profile: {
        id: session.authUserId || session.id || user.id || "",
        email: session.email || "",
        role: session.permissionRole || session.role || ROLE_WORKER,
      },
    };
  }

  return { user, profile: null, session: null };
}

export async function listTripsForCurrentUser() {
  const { user, profile } = await getCurrentUserProfile();
  if (!user) return [];

  if (isManagerRole(profile?.role)) {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .order("start_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading all trips", error);
      throw error;
    }

    return (data || []).map((trip) => normalizeTrip(trip)).filter(Boolean);
  }

  return await listAssignedTripsForUser(profile?.id || user.id);
}

export async function getTripForCurrentUser(tripId) {
  const normalizedTripId = normalizeTripId(tripId);
  const { user, profile } = await getCurrentUserProfile();
  if (!user) return null;

  console.log("Loading trip for current user:", {
    requestedTripId: tripId,
    normalizedTripId,
    authUserId: user.id,
    profileId: profile?.id || null,
    role: profile?.role || null,
  });

  if (isManagerRole(profile?.role)) {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("id", normalizedTripId)
      .maybeSingle();

    if (error) {
      console.error("Error loading trip", error);
      throw error;
    }

    const normalizedTrip = normalizeTrip(data || null);
    if (normalizedTrip) {
      console.log("Loaded trip directly for manager:", normalizedTrip);
      return normalizedTrip;
    }

    const visibleTrips = await listTripsForCurrentUser();
    console.log(
      "Manager trip fallback candidates:",
      visibleTrips.map((trip) => ({ id: trip.id, name: trip.name }))
    );
    return (
      visibleTrips.find((trip) => tripIdsMatch(trip.id, normalizedTripId)) || null
    );
  }

  const assignedTrip = await getAssignedTripForUser(profile?.id || user.id, normalizedTripId);
  if (assignedTrip) {
    console.log("Loaded assigned trip for worker:", assignedTrip);
    return assignedTrip;
  }

  const visibleTrips = await listTripsForCurrentUser();
  console.log(
    "Worker trip fallback candidates:",
    visibleTrips.map((trip) => ({ id: trip.id, name: trip.name }))
  );
  return visibleTrips.find((trip) => tripIdsMatch(trip.id, normalizedTripId)) || null;
}

async function listAssignedTripsForUser(userId) {
  const { data, error } = await supabase
    .from("trip_assignments")
    .select("trip_id, trips(*)")
    .eq("user_id", userId);

  if (error) {
    console.error("Error loading assigned trips", error);
    throw error;
  }

  return (data || [])
    .map((row) => normalizeTrip(row.trips))
    .filter(Boolean);
}

async function getAssignedTripForUser(userId, tripId) {
  const { data, error } = await supabase
    .from("trip_assignments")
    .select("trip_id, trips(*)")
    .eq("user_id", userId)
    .eq("trip_id", tripId)
    .maybeSingle();

  if (error) {
    console.error("Error loading assigned trip", error);
    throw error;
  }

  return normalizeTrip(data?.trips || null);
}

export async function createTripForCurrentUser({
  name,
  location,
  host,
  siteType,
  teamStatus,
  trainingTimelineType,
  projectType,
  projectLengthSummary,
  extraTravelStatus,
  startDate,
  endDate,
  fundraisingGoalAmount,
  tripFeeAmount,
  materialsFeeAmount,
  hasDeferredWorker,
  hannoverHousingFeeAmount,
  domesticProjectFeeAmount,
  domesticFeeAmount,
  domesticMaterialsFeeAmount,
  teamMembers,
}) {
  const { user, profile } = await getCurrentUserProfile();
  if (!user) {
    throw new Error("No authenticated user found.");
  }

  if (!isManagerRole(profile?.role)) {
    throw new Error("Only admin and staff can create trips.");
  }

  const normalizedExtraTravelStatus = normalizeExtraTravelStatus(extraTravelStatus);
  const normalizedTrainingTimelineType = normalizeTrainingTimelineType(trainingTimelineType);

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({
      trip_name: String(name || "").trim(),
      location: String(location || "").trim(),
      host: String(host || "").trim() || null,
      site_type: String(siteType || "").trim().toLowerCase() || null,
      team_status: String(teamStatus || "").trim() || null,
      training_timeline_type: normalizedTrainingTimelineType,
      project_type: String(projectType || "").trim().toUpperCase() || null,
      project_length_summary: String(projectLengthSummary || "").trim() || null,
      has_extra_travel: normalizedExtraTravelStatus === "yes",
      extra_travel_status: normalizedExtraTravelStatus,
      start_date: startDate,
      end_date: endDate,
      status: "active",
      fundraising_goal_amount: parseOptionalAmount(fundraisingGoalAmount),
      trip_fee_amount: parseOptionalAmount(tripFeeAmount),
      materials_fee_amount: parseOptionalAmount(materialsFeeAmount),
      has_deferred_worker: hasDeferredWorker === "yes",
      hannover_housing_fee_amount: parseOptionalAmount(hannoverHousingFeeAmount),
      domestic_project_fee_amount: parseOptionalAmount(domesticProjectFeeAmount),
      domestic_fee_amount: parseOptionalAmount(domesticFeeAmount),
      domestic_materials_fee_amount: parseOptionalAmount(domesticMaterialsFeeAmount),
    })
    .select("*")
    .single();

  if (tripError) {
    console.error("Error creating trip", tripError);
    throw tripError;
  }

  const { error: assignmentError } = await supabase
    .from("trip_assignments")
    .insert({
      user_id: user.id,
      trip_id: trip.id,
    });

  if (assignmentError) {
    console.error("Error assigning trip to current user", assignmentError);
    throw assignmentError;
  }

  const tripTeamMemberRows = buildTripTeamMemberRows(teamMembers).map((member) => ({
    ...member,
    trip_id: trip.id,
  }));

  if (tripTeamMemberRows.length > 0) {
    const { error: teamMembersError } = await supabase
      .from("trip_team_members")
      .insert(tripTeamMemberRows);

    if (teamMembersError) {
      console.error("Error creating trip team members", teamMembersError);
      throw teamMembersError;
    }
  }

  const seedResults = await Promise.allSettled([
    listTripTasks(trip.id),
    listTrainingModules(trip.id),
    listStaffTasksForTrip(trip.id),
  ]);

  seedResults.forEach((result, index) => {
    if (result.status === "fulfilled") return;

    const labels = ["worker tasks", "training modules", "staff tasks"];
    console.error(`Error seeding ${labels[index]} during trip creation`, result.reason);
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRIPS_UPDATED_EVENT, { detail: { trip } }));
  }

  return normalizeTrip(trip);
}

export async function updateTripForCurrentUser({
  tripId,
  name,
  location,
  host,
  siteType,
  teamStatus,
  trainingTimelineType,
  projectType,
  projectLengthSummary,
  extraTravelStatus,
  startDate,
  endDate,
  fundraisingGoalAmount,
  tripFeeAmount,
  materialsFeeAmount,
  hasDeferredWorker,
  hannoverHousingFeeAmount,
  domesticProjectFeeAmount,
  domesticFeeAmount,
  domesticMaterialsFeeAmount,
  participantDocumentTypes,
}) {
  const { user, profile } = await getCurrentUserProfile();
  if (!user) {
    throw new Error("No authenticated user found.");
  }

  if (!isManagerRole(profile?.role)) {
    throw new Error("Only admin and staff can update trips.");
  }

  const trimmedName = String(name || "").trim();
  const trimmedLocation = String(location || "").trim();
  if (!trimmedName) {
    throw new Error("Team name is required.");
  }

  if (!trimmedLocation) {
    throw new Error("Site is required.");
  }

  const normalizedExtraTravelStatus = normalizeExtraTravelStatus(extraTravelStatus);
  const normalizedTrainingTimelineType = normalizeTrainingTimelineType(trainingTimelineType);

  const { data, error } = await supabase
    .from("trips")
    .update({
      trip_name: trimmedName,
      location: trimmedLocation,
      host: String(host || "").trim() || null,
      site_type: String(siteType || "").trim().toLowerCase() || null,
      team_status: String(teamStatus || "").trim() || null,
      training_timeline_type: normalizedTrainingTimelineType,
      project_type: String(projectType || "").trim().toUpperCase() || null,
      project_length_summary: String(projectLengthSummary || "").trim() || null,
      has_extra_travel: normalizedExtraTravelStatus === "yes",
      extra_travel_status: normalizedExtraTravelStatus,
      start_date: String(startDate || "").trim() || null,
      end_date: String(endDate || "").trim() || null,
      fundraising_goal_amount: parseOptionalAmount(fundraisingGoalAmount),
      trip_fee_amount: parseOptionalAmount(tripFeeAmount),
      materials_fee_amount: parseOptionalAmount(materialsFeeAmount),
      has_deferred_worker: hasDeferredWorker === "yes",
      hannover_housing_fee_amount: parseOptionalAmount(hannoverHousingFeeAmount),
      domestic_project_fee_amount: parseOptionalAmount(domesticProjectFeeAmount),
      domestic_fee_amount: parseOptionalAmount(domesticFeeAmount),
      domestic_materials_fee_amount: parseOptionalAmount(domesticMaterialsFeeAmount),
      ...(participantDocumentTypes !== undefined
        ? { participant_document_types: participantDocumentTypes }
        : {}),
    })
    .eq("id", tripId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating trip", error);
    throw error;
  }

  const syncedTasks = await syncDefaultTripTaskDueDates({
    tripId,
    startDate: data.start_date || null,
    trainingTimelineType: data.training_timeline_type || normalizedTrainingTimelineType,
  });

  return {
    ...normalizeTrip(data),
    tasks: syncedTasks,
  };
}

export async function saveTripParticipantDocumentTypes(tripId, participantDocumentTypes) {
  const { user, profile } = await getCurrentUserProfile();
  if (!user) {
    throw new Error("No authenticated user found.");
  }

  if (!isManagerRole(profile?.role)) {
    throw new Error("Only admin and staff can update upload requirements.");
  }

  const { data, error } = await supabase
    .from("trips")
    .update({
      participant_document_types: participantDocumentTypes,
    })
    .eq("id", tripId)
    .select("*")
    .single();

  if (error) {
    console.error("Error saving participant document types", error);
    throw error;
  }

  return normalizeTrip(data);
}

export async function listWorkers() {
  const { profile } = await getCurrentUserProfile();

  if (!isManagerRole(profile?.role)) {
    throw new Error("Only admin and staff can manage trip assignments.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("role", ROLE_WORKER)
    .order("email", { ascending: true });

  if (error) {
    console.error("Error loading workers", error);
    throw error;
  }

  return data || [];
}

export async function listTripAssignments(tripId) {
  const { profile } = await getCurrentUserProfile();

  if (!isManagerRole(profile?.role)) {
    throw new Error("Only admin and staff can manage trip assignments.");
  }

  const { data, error } = await supabase
    .from("trip_assignments")
    .select("id, user_id, trip_id, created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading trip assignments", error);
    throw error;
  }

  const assignments = data || [];
  if (assignments.length === 0) return [];

  const userIds = [...new Set(assignments.map((assignment) => assignment.user_id).filter(Boolean))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, role, first_name, last_name")
    .in("id", userIds);

  if (profilesError) {
    console.error("Error loading assignment profiles", profilesError);
    throw profilesError;
  }

  const profilesById = new Map((profiles || []).map((item) => [item.id, item]));

  return assignments.map((assignment) => ({
    ...assignment,
    user: profilesById.get(assignment.user_id) || null,
  }));
}

export async function assignWorkerToTrip({ userId, tripId }) {
  const { profile } = await getCurrentUserProfile();

  if (!isManagerRole(profile?.role)) {
    throw new Error("Only admin and staff can manage trip assignments.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("trip_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("trip_id", tripId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking existing trip assignment", existingError);
    throw existingError;
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("trip_assignments")
    .insert({
      user_id: userId,
      trip_id: tripId,
    })
    .select("id, user_id, trip_id, created_at")
    .single();

  if (error) {
    console.error("Error assigning worker to trip", error);
    throw error;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRIPS_UPDATED_EVENT, { detail: { tripId } }));
  }

  return data;
}

export async function assignWorkerByEmailToTrip({ workerEmail, tripId }) {
  const { profile } = await getCurrentUserProfile();

  if (!isManagerRole(profile?.role)) {
    throw new Error("Only admin and staff can manage trip assignments.");
  }

  const normalizedEmail = normalizeEmail(workerEmail);
  if (!normalizedEmail) {
    throw new Error("Enter a worker email.");
  }

  if (!tripId) {
    throw new Error("Select a trip.");
  }

  const { data: workerProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, role")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (profileError) {
    console.error("Error loading worker profile", profileError);
    throw profileError;
  }

  if (!workerProfile) {
    return {
      status: "not_found",
      message: "No profile found for that email.",
    };
  }

  const workerRole = normalizeRole(workerProfile.role);
  if (workerRole !== ROLE_WORKER) {
    return {
      status: "invalid_role",
      message: "That user is not a worker.",
    };
  }

  const { data: existing, error: existingError } = await supabase
    .from("trip_assignments")
    .select("id")
    .eq("user_id", workerProfile.id)
    .eq("trip_id", tripId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking existing assignment", existingError);
    throw existingError;
  }

  if (existing) {
    return {
      status: "duplicate",
      message: "That worker is already assigned to this trip.",
      workerProfile: {
        ...workerProfile,
        email: normalizeEmail(workerProfile.email),
        role: workerRole,
      },
    };
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("trip_assignments")
    .insert({
      user_id: workerProfile.id,
      trip_id: tripId,
    })
    .select("id, user_id, trip_id, created_at")
    .single();

  if (assignmentError) {
    console.error("Error creating assignment", assignmentError);
    throw assignmentError;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRIPS_UPDATED_EVENT, { detail: { tripId } }));
  }

  return {
    status: "assigned",
    message: "Worker assigned to trip.",
    assignment,
    workerProfile: {
      ...workerProfile,
      email: normalizeEmail(workerProfile.email),
      role: workerRole,
    },
  };
}

export async function createWorkerProfile({ firstName, lastName, email }) {
  const { profile } = await getCurrentUserProfile();

  if (!isManagerRole(profile?.role)) {
    throw new Error("Only admin and staff can create workers.");
  }

  const normalizedFirstName = String(firstName || "").trim();
  const normalizedLastName = String(lastName || "").trim();
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedFirstName || !normalizedLastName || !normalizedEmail) {
    throw new Error("Enter first name, last name, and email.");
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id, email, role, first_name, last_name")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (existingProfileError) {
    console.error("Error checking existing worker profile", existingProfileError);
    throw existingProfileError;
  }

  if (existingProfile) {
    const existingRole = normalizeRole(existingProfile.role);
    if (existingRole === ROLE_WORKER) {
      return {
        status: "duplicate",
        message: "That worker already exists.",
        workerProfile: {
          ...existingProfile,
          email: normalizeEmail(existingProfile.email),
          role: existingRole,
        },
      };
    }

    return {
      status: "invalid_role",
      message: "That email already belongs to a non-worker profile.",
      workerProfile: {
        ...existingProfile,
        email: normalizeEmail(existingProfile.email),
        role: existingRole,
      },
    };
  }

  const { data: workerProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      first_name: normalizedFirstName,
      last_name: normalizedLastName,
      email: normalizedEmail,
      role: ROLE_WORKER,
    })
    .select("id, email, role, first_name, last_name")
    .single();

  if (insertError) {
    console.error("Error creating worker profile", insertError);
    throw insertError;
  }

  return {
    status: "created",
    message: "Worker created.",
    workerProfile: {
      ...workerProfile,
      email: normalizeEmail(workerProfile.email),
      role: normalizeRole(workerProfile.role),
    },
  };
}

export async function listWorkerAssignmentSummary() {
  const { profile } = await getCurrentUserProfile();

  if (!isStaffRole(profile?.role)) {
    throw new Error("Only staff can view worker assignments.");
  }

  const { data: workers, error: workersError } = await supabase
    .from("profiles")
    .select("id, email, role, first_name, last_name")
    .eq("role", ROLE_WORKER)
    .order("email", { ascending: true });

  if (workersError) {
    console.error("Error loading workers", workersError);
    throw workersError;
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("trip_assignments")
    .select("id, user_id, trip_id, created_at")
    .order("created_at", { ascending: true });

  if (assignmentsError) {
    console.error("Error loading worker assignments", assignmentsError);
    throw assignmentsError;
  }

  const { data: trips, error: tripsError } = await supabase
    .from("trips")
    .select("*")
    .order("start_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (tripsError) {
    console.error("Error loading trips", tripsError);
    throw tripsError;
  }

  const { data: teamMembers, error: teamMembersError } = await supabase
    .from("trip_team_members")
    .select("id, trip_id, first_name, last_name, email, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (teamMembersError) {
    console.error("Error loading trip team members for worker assignments", teamMembersError);
    throw teamMembersError;
  }

  const tripsById = new Map((trips || []).map((trip) => [trip.id, normalizeTrip(trip)]));
  const assignmentsByUserId = new Map();
  const summaryByEmail = new Map();

  (assignments || []).forEach((assignment) => {
    const existing = assignmentsByUserId.get(assignment.user_id) || [];
    const trip = tripsById.get(assignment.trip_id);
    if (!trip) return;

    existing.push({
      id: assignment.id,
      tripId: assignment.trip_id,
      trip,
      createdAt: assignment.created_at || "",
    });
    assignmentsByUserId.set(assignment.user_id, existing);
  });

  (workers || []).forEach((worker) => {
    const email = normalizeEmail(worker.email);
    if (!email) return;

    summaryByEmail.set(email, {
      id: worker.id,
      profileId: worker.id,
      name:
        [worker.first_name, worker.last_name].filter(Boolean).join(" ").trim() ||
        email,
      email,
      role: normalizeRole(worker.role),
      hasAccount: true,
      invitePending: false,
      assignments: [...(assignmentsByUserId.get(worker.id) || [])],
    });
  });

  (teamMembers || []).forEach((member) => {
    const email = normalizeEmail(member.email);
    const trip = tripsById.get(member.trip_id);
    if (!email || !trip) return;

    const existing = summaryByEmail.get(email);
    const assignmentRecord = {
      id: member.id,
      tripId: member.trip_id,
      trip,
      createdAt: member.created_at || member.updated_at || "",
      source: "team_member",
    };

    if (existing) {
      if (!existing.assignments.some((assignment) => assignment.tripId === member.trip_id)) {
        existing.assignments.push(assignmentRecord);
      }
      return;
    }

    summaryByEmail.set(email, {
      id: `pending:${email}`,
      profileId: "",
      name:
        [member.first_name, member.last_name].filter(Boolean).join(" ").trim() ||
        email,
      email,
      role: "pending",
      hasAccount: false,
      invitePending: true,
      assignments: [assignmentRecord],
    });
  });

  return [...summaryByEmail.values()]
    .map((worker) => ({
      ...worker,
      assignments: [...worker.assignments].sort((left, right) =>
        String(left.trip?.name || "").localeCompare(String(right.trip?.name || ""))
      ),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function listTripParticipants(tripId) {
  const { data: assignments, error: assignmentsError } = await supabase
    .from("trip_assignments")
    .select("id, user_id, trip_id, created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });

  if (assignmentsError) {
    console.error("Error loading trip assignments", assignmentsError);
    throw assignmentsError;
  }

  const userIds = [...new Set((assignments || []).map((item) => item.user_id).filter(Boolean))];
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, role, first_name, last_name")
    .in("id", userIds);

  if (profilesError) {
    console.error("Error loading trip participant profiles", profilesError);
    throw profilesError;
  }

  let fundraisingProfiles = [];
  try {
    fundraisingProfiles = await listFundraisingProfiles(tripId);
  } catch (error) {
    console.error("Unable to load fundraising profiles for participants", error);
  }

  const fundraisingByUserId = new Map(
    fundraisingProfiles.map((row) => [row.userId, row])
  );
  const profilesById = new Map(
    (profiles || []).map((profile) => [profile.id, profile])
  );

  return userIds.map((userId) => {
    const profile = profilesById.get(userId);
    const fundraising = fundraisingByUserId.get(userId);
    const email = profile?.email || "";

    return {
      id: userId,
      name:
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
        (email ? email.split("@")[0] : "Unknown user"),
      email,
      role: formatRoleLabel(profile?.role),
      fundraisingUrl: fundraising?.fundraisingUrl || "",
    };
  });
}

export async function removeTripAssignment(assignmentId) {
  const { profile } = await getCurrentUserProfile();

  if (!isManagerRole(profile?.role)) {
    throw new Error("Only admin and staff can manage trip assignments.");
  }

  const { error } = await supabase
    .from("trip_assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    console.error("Error removing trip assignment", error);
    throw error;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRIPS_UPDATED_EVENT, { detail: { assignmentId } }));
  }
}

export async function deleteTrip(tripId) {
  const { profile } = await getCurrentUserProfile();

  if (!isAdminRole(profile?.role)) {
    throw new Error("Only admin can delete trips.");
  }

  const { error: resourcesError } = await supabase
    .from("trip_resources")
    .delete()
    .eq("trip_id", tripId);

  if (resourcesError) {
    console.error("Error deleting trip resources", resourcesError);
    throw resourcesError;
  }

  const { error: assignmentsError } = await supabase
    .from("trip_assignments")
    .delete()
    .eq("trip_id", tripId);

  if (assignmentsError) {
    console.error("Error deleting trip assignments", assignmentsError);
    throw assignmentsError;
  }

  const { error: trainingProgressError } = await supabase
    .from("user_training_progress")
    .delete()
    .eq("trip_id", tripId);

  if (trainingProgressError) {
    console.error("Error deleting training progress", trainingProgressError);
    throw trainingProgressError;
  }

  const { error: trainingModulesError } = await supabase
    .from("trip_training_modules")
    .delete()
    .eq("trip_id", tripId);

  if (trainingModulesError) {
    console.error("Error deleting training modules", trainingModulesError);
    throw trainingModulesError;
  }

  const { error: fundraisingError } = await supabase
    .from("fundraising_profiles")
    .delete()
    .eq("trip_id", tripId);

  if (fundraisingError) {
    console.error("Error deleting fundraising profiles", fundraisingError);
    throw fundraisingError;
  }

  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripId);

  if (error) {
    console.error("Error deleting trip", error);
    throw error;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRIPS_UPDATED_EVENT, { detail: { tripId } }));
  }
}

export function isTripArchived(tripId) {
  return false;
}

export async function archiveTrip(tripId) {
  const { profile } = await getCurrentUserProfile();

  if (!isManagerRole(profile?.role)) {
    throw new Error("Only admin and staff can archive trips.");
  }

  await updateTripStatus(tripId, "archived");

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRIPS_UPDATED_EVENT, { detail: { tripId, archived: true } }));
  }
}

export async function unarchiveTrip(tripId) {
  const { profile } = await getCurrentUserProfile();

  if (!isManagerRole(profile?.role)) {
    throw new Error("Only admin and staff can unarchive trips.");
  }

  await updateTripStatus(tripId, "active");

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRIPS_UPDATED_EVENT, { detail: { tripId, archived: false } }));
  }
}

async function updateTripStatus(tripId, status) {
  const { data, error } = await supabase
    .from("trips")
    .update({ status })
    .eq("id", tripId)
    .select("id, status")
    .maybeSingle();

  if (error) {
    console.error(`Error updating trip status to ${status}`, error);
    throw error;
  }

  return data || { id: tripId, status };
}

function normalizeTrip(trip) {
  if (!trip) return null;

  const row = Array.isArray(trip) ? trip[0] : trip;
  if (!row) return null;

  const startDate = row.start_date || null;
  const endDate = row.end_date || null;
  const tripName =
    String(
      row.trip_name ||
      row.tripName ||
      row.title ||
      row.name ||
      ""
    ).trim() || "Untitled trip";

  return applyStaffTemplateIfMissing({
    id: row.id || row.trip_id || row.tripId || row.trip_name || row.name,
    name: tripName,
    location: row.location || "",
    host: row.host || "",
    siteType: row.site_type || "",
    teamStatus: row.team_status || "",
    trainingTimelineType:
      normalizeTrainingTimelineType(row.training_timeline_type) ||
      DEFAULT_TRAINING_TIMELINE_TYPE,
    projectType: row.project_type || "",
    projectLengthSummary: row.project_length_summary || "",
    hasExtraTravel: !!row.has_extra_travel,
    extraTravelStatus: normalizeExtraTravelStatus(
      row.extra_travel_status,
      !!row.has_extra_travel
    ),
    startDate,
    endDate,
    status: row.status || "active",
    teamFundraisingUrl: row.team_fundraising_url || "",
    fundraisingGoalAmount: normalizeOptionalAmount(row.fundraising_goal_amount),
    tripFeeAmount: normalizeOptionalAmount(row.trip_fee_amount),
    materialsFeeAmount: normalizeOptionalAmount(row.materials_fee_amount),
    hasDeferredWorker: !!row.has_deferred_worker,
    hannoverHousingFeeAmount: normalizeOptionalAmount(row.hannover_housing_fee_amount),
    domesticProjectFeeAmount: normalizeOptionalAmount(row.domestic_project_fee_amount),
    domesticFeeAmount: normalizeOptionalAmount(row.domestic_fee_amount),
    domesticMaterialsFeeAmount: normalizeOptionalAmount(row.domestic_materials_fee_amount),
    participantDocumentTypes: Array.isArray(row.participant_document_types)
      ? row.participant_document_types
      : [],
    dates: formatDateRange(startDate, endDate),
    createdAt: row.created_at || "",
    participants: [],
    teamMembers: [],
    quickLinks: [],
    tasks: [],
    docs: [],
  });
}

function normalizeTripId(tripId) {
  if (Array.isArray(tripId)) {
    return tripId[0] || "";
  }

  return tripId || "";
}

function tripIdsMatch(left, right) {
  return String(left || "").trim() === String(right || "").trim();
}

function formatRoleLabel(role) {
  const normalized = normalizeRole(role);
  if (!normalized) return "Worker";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function applyStaffTemplateIfMissing(trip) {
  if (Array.isArray(trip.staffTasks) && trip.staffTasks.length > 0) return trip;
  return { ...trip, staffTasks: [] };
}

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return "Dates to be confirmed";
  if (startDate && endDate) {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const sameMonth = start.toLocaleString("en-US", { month: "long" }) === end.toLocaleString("en-US", { month: "long" })
      && start.getFullYear() === end.getFullYear();

    if (sameMonth) {
      return `${start.toLocaleString("en-US", { month: "long" })} ${start.getDate()}-${end.getDate()}, ${end.getFullYear()}`;
    }

    return `${start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  }

  const single = new Date(`${(startDate || endDate)}T00:00:00`);
  return single.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
