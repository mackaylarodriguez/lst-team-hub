import { supabase } from "@/lib/supabase";
import {
  isOnlineTrainingModuleCategory,
  resolveClassroomModuleSlotKey,
} from "@/lib/training";
import { STAFF_TRAINING_MODULE_SLOTS } from "@/lib/staffTrainingRoster";

function percent(completed, total) {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
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

/** `user_task_progress.task_name` is usually the trip_tasks row id; older rows may store the title. */
function isWorkerTaskComplete(completedTaskProgress, tripId, userId, task) {
  const tid = String(task?.id || "").trim();
  const title = String(task?.title || "").trim();
  if (tid && completedTaskProgress.has(`${tripId}:${userId}:${tid}`)) return true;
  if (title && completedTaskProgress.has(`${tripId}:${userId}:${title}`)) return true;
  return false;
}

/**
 * Training (classroom modules 1–7) and task progress for each trip a profile is assigned to.
 * @returns {Promise<Array<{
 *   tripId: string,
 *   trainingComplete: number,
 *   trainingTotal: number,
 *   trainingPercent: number,
 *   tasksComplete: number,
 *   tasksTotal: number,
 *   taskPercent: number,
 * }>>}
 */
export async function listProfileTripProgress(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return [];

  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("trip_assignments")
    .select("trip_id")
    .eq("user_id", uid);

  if (assignmentError) {
    console.error("Unable to load profile trip assignments for progress", assignmentError);
    throw assignmentError;
  }

  const tripIds = [...new Set((assignmentRows || []).map((row) => row.trip_id).filter(Boolean))];
  if (tripIds.length === 0) return [];

  const [
    { data: modules, error: modulesError },
    { data: trainingProgress, error: trainingError },
    { data: tasks, error: tasksError },
    { data: taskProgress, error: taskProgressError },
  ] = await Promise.all([
    supabase
      .from("trip_training_modules")
      .select("id, trip_id, title, category, sort_order")
      .in("trip_id", tripIds),
    supabase
      .from("user_training_progress")
      .select("trip_id, training_module_id, completed")
      .eq("user_id", uid)
      .in("trip_id", tripIds),
    supabase.from("trip_tasks").select("id, trip_id, title").in("trip_id", tripIds),
    supabase
      .from("user_task_progress")
      .select("trip_id, task_name, completed")
      .eq("user_id", uid)
      .in("trip_id", tripIds),
  ]);

  if (modulesError) throw modulesError;
  if (trainingError) throw trainingError;
  if (tasksError) throw tasksError;
  if (taskProgressError) throw taskProgressError;

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

  const completedTraining = new Set();
  for (const row of trainingProgress || []) {
    if (!row.completed) continue;
    completedTraining.add(`${row.trip_id}:${row.training_module_id}`);
  }

  const tasksByTrip = new Map();
  for (const task of tasks || []) {
    const list = tasksByTrip.get(task.trip_id) || [];
    list.push(task);
    tasksByTrip.set(task.trip_id, list);
  }

  const completedTasks = new Set();
  for (const row of taskProgress || []) {
    if (!row.completed) continue;
    completedTasks.add(`${row.trip_id}:${uid}:${row.task_name}`);
  }

  return tripIds.map((tripId) => {
    const modulesBySlot = classroomModulesByTrip.get(tripId) || new Map();
    const trainingTotal = STAFF_TRAINING_MODULE_SLOTS.length;
    const trainingComplete = STAFF_TRAINING_MODULE_SLOTS.filter(({ slot }) => {
      const module = modulesBySlot.get(slot);
      if (!module) return false;
      return completedTraining.has(`${tripId}:${module.id}`);
    }).length;

    const tripTasks = tasksByTrip.get(tripId) || [];
    const tasksTotal = tripTasks.length;
    const tasksComplete = tripTasks.filter((task) =>
      isWorkerTaskComplete(completedTasks, tripId, uid, task)
    ).length;

    return {
      tripId,
      trainingComplete,
      trainingTotal,
      trainingPercent: percent(trainingComplete, trainingTotal),
      tasksComplete,
      tasksTotal,
      taskPercent: percent(tasksComplete, tasksTotal),
    };
  });
}
