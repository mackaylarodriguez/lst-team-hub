import { supabase } from "@/lib/supabase";
import { listTripsForCurrentUser } from "@/lib/trips";
import { isManagerRole, ROLE_WORKER } from "@/lib/roles";
import { getSession } from "@/lib/auth";

function percent(completed, total) {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function parseDate(dateValue) {
  if (!dateValue) return null;
  const parsed = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function findFundraisingMilestone(tasks, progressByTaskId, predicate) {
  const match = (tasks || []).find((task) => predicate(normalizeText(task.title)));
  if (!match) {
    return { exists: false, complete: false };
  }

  return {
    exists: true,
    complete: !!progressByTaskId.get(match.id),
  };
}

function countByTripId(rows, tripIdKey = "trip_id") {
  const map = new Map();
  for (const row of rows || []) {
    const id = row?.[tripIdKey];
    if (!id) continue;
    map.set(id, (map.get(id) || 0) + 1);
  }
  return map;
}

/** Roster rows that count toward traveling worker headcount (excludes leaders not traveling with the team). */
function countRosterWorkersByTripId(rows, tripIdKey = "trip_id") {
  const map = new Map();
  for (const row of rows || []) {
    const id = row?.[tripIdKey];
    if (!id) continue;
    const role = String(row?.team_role || "").trim().toLowerCase();
    const travels = row?.travels_with_team !== false;
    if (role === "leader" && !travels) continue;
    map.set(id, (map.get(id) || 0) + 1);
  }
  return map;
}

function determineReadiness({
  taskPercent,
  trainingPercent,
  fundraising2000Percent,
  fundraisingAllPercent,
  nearestTripStartDate,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysUntilNearestTrip = nearestTripStartDate
    ? Math.ceil((nearestTripStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const allFundraisingReady =
    fundraisingAllPercent === null ||
    fundraisingAllPercent === 100;

  if (taskPercent === 100 && trainingPercent === 100 && allFundraisingReady) {
    return "Ready";
  }

  if (
    taskPercent < 50 ||
    trainingPercent < 50 ||
    (fundraising2000Percent !== null && fundraising2000Percent < 100 && daysUntilNearestTrip !== null && daysUntilNearestTrip <= 45) ||
    (daysUntilNearestTrip !== null && daysUntilNearestTrip <= 21 && (taskPercent < 80 || trainingPercent < 80))
  ) {
    return "Behind";
  }

  return "On track";
}

async function loadStaffOverviewBase() {
  const session = await getSession();

  if (!isManagerRole(session?.permissionRole || session?.role)) {
    throw new Error("Only staff can view participant overview.");
  }

  const trips = await listTripsForCurrentUser();
  const tripIds = trips.map((trip) => trip.id).filter(Boolean);

  if (tripIds.length === 0) {
    return {
      trips,
      participants: [],
      tripMetricsById: {},
    };
  }

  const [
    { data: assignments, error: assignmentsError },
    { data: teamMemberRows, error: teamMembersError },
  ] = await Promise.all([
    supabase
      .from("trip_assignments")
      .select("user_id, trip_id, created_at")
      .in("trip_id", tripIds),
    supabase
      .from("trip_team_members")
      .select("trip_id, team_role, travels_with_team")
      .in("trip_id", tripIds),
  ]);

  if (assignmentsError) {
    console.error("Error loading trip assignments for staff overview", assignmentsError);
    throw assignmentsError;
  }
  if (teamMembersError) {
    console.error("Error loading trip_team_members for staff overview", teamMembersError);
  }

  const rosterCountByTripId = teamMembersError
    ? new Map()
    : countRosterWorkersByTripId(teamMemberRows);
  const assignmentCountByTripId = countByTripId(assignments);

  const userIds = [...new Set((assignments || []).map((item) => item.user_id).filter(Boolean))];

  if (userIds.length === 0) {
    return {
      trips,
      participants: [],
      tripMetricsById: Object.fromEntries(
        trips.map((trip) => [
          trip.id,
          {
            workerCount: rosterCountByTripId.get(trip.id) || 0,
            trainingPercent: 0,
            taskPercent: 0,
          },
        ])
      ),
    };
  }

  const [
    profilesResult,
    tripTasksResult,
    taskProgressResult,
    modulesResult,
    trainingProgressResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, role, first_name, last_name")
      .in("id", userIds),
    supabase
      .from("trip_tasks")
      .select("id, trip_id, title, due_date")
      .in("trip_id", tripIds),
    supabase
      .from("user_task_progress")
      .select("trip_id, user_id, task_name, completed")
      .in("trip_id", tripIds)
      .in("user_id", userIds),
    supabase
      .from("trip_training_modules")
      .select("id, trip_id, title")
      .in("trip_id", tripIds),
    supabase
      .from("user_training_progress")
      .select("trip_id, user_id, training_module_id, completed")
      .in("trip_id", tripIds)
      .in("user_id", userIds),
  ]);

  if (profilesResult.error) {
    console.error("Error loading profiles for staff overview", profilesResult.error);
    throw profilesResult.error;
  }

  if (tripTasksResult.error) {
    console.error("Error loading trip tasks for staff overview", tripTasksResult.error);
    throw tripTasksResult.error;
  }

  if (taskProgressResult.error) {
    console.error("Error loading user task progress for staff overview", taskProgressResult.error);
    throw taskProgressResult.error;
  }

  if (modulesResult.error) {
    console.error("Error loading training modules for staff overview", modulesResult.error);
    throw modulesResult.error;
  }

  if (trainingProgressResult.error) {
    console.error("Error loading training progress for staff overview", trainingProgressResult.error);
    throw trainingProgressResult.error;
  }

  const workerProfiles = (profilesResult.data || []).filter((profile) => {
    const role = normalizeText(profile.role);
    return role === ROLE_WORKER || !role;
  });
  const workerIds = new Set(workerProfiles.map((profile) => profile.id));

  const visibleAssignments = (assignments || []).filter((assignment) =>
    workerIds.has(assignment.user_id)
  );

  const tripsById = new Map((trips || []).map((trip) => [trip.id, trip]));
  const profilesById = new Map(
    workerProfiles.map((profile) => [
      profile.id,
      {
        id: profile.id,
        email: profile.email || "",
        name:
          [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
          profile.email ||
          "Unnamed worker",
      },
    ])
  );
  const tripTasksByTripId = new Map();
  const modulesByTripId = new Map();
  const completedTaskProgress = new Map();
  const completedTrainingProgress = new Map();

  (tripTasksResult.data || []).forEach((task) => {
    const existing = tripTasksByTripId.get(task.trip_id) || [];
    existing.push(task);
    tripTasksByTripId.set(task.trip_id, existing);
  });

  (modulesResult.data || []).forEach((module) => {
    const existing = modulesByTripId.get(module.trip_id) || [];
    existing.push(module);
    modulesByTripId.set(module.trip_id, existing);
  });

  (taskProgressResult.data || []).forEach((row) => {
    if (!row.completed) return;
    completedTaskProgress.set(`${row.trip_id}:${row.user_id}:${row.task_name}`, true);
  });

  (trainingProgressResult.data || []).forEach((row) => {
    if (!row.completed) return;
    completedTrainingProgress.set(`${row.trip_id}:${row.user_id}:${row.training_module_id}`, true);
  });

  const assignmentsByUserId = new Map();

  visibleAssignments.forEach((assignment) => {
    const existing = assignmentsByUserId.get(assignment.user_id) || [];
    existing.push(assignment);
    assignmentsByUserId.set(assignment.user_id, existing);
  });

  const participants = [...assignmentsByUserId.entries()]
    .map(([userId, userAssignments]) => {
      const profile = profilesById.get(userId);
      if (!profile) return null;

      let completedTasks = 0;
      let totalTasks = 0;
      let completedTraining = 0;
      let totalTraining = 0;
      let fundraising2000Done = 0;
      let fundraising2000Total = 0;
      let fundraisingAllDone = 0;
      let fundraisingAllTotal = 0;
      let nearestTripStartDate = null;

      const assignmentDetails = userAssignments
        .map((assignment) => {
          const trip = tripsById.get(assignment.trip_id);
          if (!trip) return null;

          const tripTasks = tripTasksByTripId.get(trip.id) || [];
          const tripModules = modulesByTripId.get(trip.id) || [];
          const taskProgressByTaskId = new Map(
            tripTasks.map((task) => [
              task.id,
              completedTaskProgress.get(`${trip.id}:${userId}:${task.id}`) || false,
            ])
          );

          const taskCompletedForTrip = tripTasks.filter(
            (task) => completedTaskProgress.get(`${trip.id}:${userId}:${task.id}`)
          ).length;
          const trainingCompletedForTrip = tripModules.filter(
            (module) => completedTrainingProgress.get(`${trip.id}:${userId}:${module.id}`)
          ).length;

          completedTasks += taskCompletedForTrip;
          totalTasks += tripTasks.length;
          completedTraining += trainingCompletedForTrip;
          totalTraining += tripModules.length;

          const fundraising2000 = findFundraisingMilestone(
            tripTasks,
            taskProgressByTaskId,
            (title) => title.includes("$2,000 raised")
          );
          const fundraisingAll = findFundraisingMilestone(
            tripTasks,
            taskProgressByTaskId,
            (title) => title.includes("all raised")
          );

          if (fundraising2000.exists) {
            fundraising2000Total += 1;
            if (fundraising2000.complete) fundraising2000Done += 1;
          }

          if (fundraisingAll.exists) {
            fundraisingAllTotal += 1;
            if (fundraisingAll.complete) fundraisingAllDone += 1;
          }

          const tripStartDate = parseDate(trip.startDate);
          if (
            tripStartDate &&
            (!nearestTripStartDate || tripStartDate.getTime() < nearestTripStartDate.getTime())
          ) {
            nearestTripStartDate = tripStartDate;
          }

          const tripTaskPercent = percent(taskCompletedForTrip, tripTasks.length);
          const tripTrainingPercent = percent(trainingCompletedForTrip, tripModules.length);
          const tripFundraising2000Percent = fundraising2000.exists
            ? percent(fundraising2000.complete ? 1 : 0, 1)
            : null;
          const tripFundraisingAllPercent = fundraisingAll.exists
            ? percent(fundraisingAll.complete ? 1 : 0, 1)
            : null;

          return {
            tripId: trip.id,
            tripName: trip.name,
            tripLocation: trip.location,
            taskPercent: tripTaskPercent,
            trainingPercent: tripTrainingPercent,
            fundraising2000Complete: fundraising2000.complete,
            fundraisingAllComplete: fundraisingAll.complete,
            fundraisingSummary:
              fundraising2000.exists || fundraisingAll.exists
                ? `${fundraising2000.complete ? 1 : 0}/${fundraising2000.exists ? 1 : 0} hit $2,000 • ${fundraisingAll.complete ? 1 : 0}/${fundraisingAll.exists ? 1 : 0} fully raised`
                : "No fundraising milestones yet",
            readiness: determineReadiness({
              taskPercent: tripTaskPercent,
              trainingPercent: tripTrainingPercent,
              fundraising2000Percent: tripFundraising2000Percent,
              fundraisingAllPercent: tripFundraisingAllPercent,
              nearestTripStartDate: tripStartDate,
            }),
          };
        })
        .filter(Boolean);

      const taskPercent = percent(completedTasks, totalTasks);
      const trainingPercent = percent(completedTraining, totalTraining);
      const fundraising2000Percent =
        fundraising2000Total > 0 ? percent(fundraising2000Done, fundraising2000Total) : null;
      const fundraisingAllPercent =
        fundraisingAllTotal > 0 ? percent(fundraisingAllDone, fundraisingAllTotal) : null;

      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        trips: assignmentDetails,
        taskPercent,
        trainingPercent,
        fundraising2000Percent,
        fundraisingAllPercent,
        fundraisingSummary:
          fundraising2000Total > 0 || fundraisingAllTotal > 0
            ? `${fundraising2000Done}/${fundraising2000Total || 0} hit $2,000 • ${fundraisingAllDone}/${fundraisingAllTotal || 0} fully raised`
            : "No fundraising milestones yet",
        readiness: determineReadiness({
          taskPercent,
          trainingPercent,
          fundraising2000Percent,
          fundraisingAllPercent,
          nearestTripStartDate,
        }),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const readinessOrder = {
        Behind: 0,
        "On track": 1,
        Ready: 2,
      };

      return (
        (readinessOrder[left.readiness] ?? 99) - (readinessOrder[right.readiness] ?? 99) ||
        left.name.localeCompare(right.name)
      );
    });

  const tripMetricsById = Object.fromEntries(
    trips.map((trip) => {
      const tripAssignments = visibleAssignments.filter((assignment) => assignment.trip_id === trip.id);
      const assignedAnyoneCount = assignmentCountByTripId.get(trip.id) || 0;
      const rosterCount = rosterCountByTripId.get(trip.id) || 0;
      const workerCount = Math.max(assignedAnyoneCount, rosterCount);
      const tripTasks = tripTasksByTripId.get(trip.id) || [];
      const tripModules = modulesByTripId.get(trip.id) || [];
      const completedTasks = tripAssignments.reduce((sum, assignment) => {
        return (
          sum +
          tripTasks.filter((task) =>
            completedTaskProgress.get(`${trip.id}:${assignment.user_id}:${task.id}`)
          ).length
        );
      }, 0);
      const completedTraining = tripAssignments.reduce((sum, assignment) => {
        return (
          sum +
          tripModules.filter((module) =>
            completedTrainingProgress.get(`${trip.id}:${assignment.user_id}:${module.id}`)
          ).length
        );
      }, 0);

      return [
        trip.id,
        {
          workerCount,
          taskPercent: percent(completedTasks, tripTasks.length * Math.max(workerCount, 1)),
          trainingPercent: percent(
            completedTraining,
            tripModules.length * Math.max(workerCount, 1)
          ),
        },
      ];
    })
  );

  return {
    trips,
    participants,
    tripMetricsById,
  };
}

export async function listStaffParticipantOverview() {
  const data = await loadStaffOverviewBase();
  return data.participants;
}

export async function listStaffTripMetrics() {
  const data = await loadStaffOverviewBase();
  return data.tripMetricsById;
}
