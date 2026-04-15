import { supabase } from "@/lib/supabase";
import {
  WORKER_TASK_TEMPLATE,
  computeWorkerTaskDueDate,
  findWorkerTaskTemplate,
  normalizeTrainingTimelineType,
} from "./workerTaskTemplate";
import { isUsMassachusettsMissionSite } from "./usMassachusettsSite";

const DEPRECATED_WORKER_TASK_TITLES = new Set([
  "fill out lst application",
]);

function normalizeTripTask(row) {
  return {
    id: row.id,
    title: row.title || "Untitled task",
    description: row.description || "",
    category: row.category || "",
    status: row.status || "open",
    assignedToUserId: row.assigned_to_user_id || null,
    due: row.due_date || "",
    createdAt: row.created_at || "",
  };
}

function normalizeTaskProgress(row) {
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
    taskName: row.task_name || "",
    completed: !!row.completed,
    dueDate: row.due_date || "",
    notes: row.notes || "",
  };
}

export async function listTripTasks(tripId) {
  const { data, error } = await supabase
    .from("trip_tasks")
    .select("*")
    .eq("trip_id", tripId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading trip tasks", error);
    throw error;
  }

  const existingTasks = await purgeDeprecatedWorkerTasks(data || []);
  const hasDefaultWorkerTasks = existingTasks.some(
    (task) => task.category === "worker_default"
  );

  if (existingTasks.length > 0 && hasDefaultWorkerTasks) {
    return existingTasks.map(normalizeTripTask);
  }

  const trip = await getTripRow(tripId);
  const seededTasks = await seedWorkerTasksForTrip(
    tripId,
    trip?.start_date || null,
    trip?.training_timeline_type || null,
    trip?.location || ""
  );
  return [...existingTasks, ...seededTasks]
    .map(normalizeTripTask)
    .sort(compareTripTasks);
}

async function purgeDeprecatedWorkerTasks(rows) {
  const list = rows || [];
  const deprecatedIds = list
    .filter((row) => isDeprecatedWorkerTaskRow(row))
    .map((row) => row.id)
    .filter(Boolean);

  if (deprecatedIds.length === 0) return list;

  const { error } = await supabase.from("trip_tasks").delete().in("id", deprecatedIds);
  if (error) {
    console.error("Error deleting deprecated worker tasks", error);
    throw error;
  }

  return list.filter((row) => !deprecatedIds.includes(row.id));
}

function isDeprecatedWorkerTaskRow(row) {
  if (String(row?.category || "").trim() !== "worker_default") return false;
  const titleKey = normalizeTaskTitleKey(row?.title);
  if (!titleKey) return false;
  return DEPRECATED_WORKER_TASK_TITLES.has(titleKey);
}

function normalizeTaskTitleKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function createTripTask({
  tripId,
  title,
  description,
  category,
  status,
  assignedToUserId,
  dueDate,
}) {
  const { data, error } = await supabase
    .from("trip_tasks")
    .insert({
      trip_id: tripId,
      title: String(title || "").trim(),
      description: String(description || "").trim() || null,
      category: String(category || "").trim() || null,
      status: status || "open",
      assigned_to_user_id: assignedToUserId || null,
      due_date: dueDate || null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating trip task", error);
    throw error;
  }

  return normalizeTripTask(data);
}

export async function updateTripTask({
  id,
  title,
  description,
  category,
  status,
  assignedToUserId,
  dueDate,
}) {
  const payload = {
    title: title !== undefined ? String(title || "").trim() : undefined,
    description:
      description !== undefined ? String(description || "").trim() || null : undefined,
    category: category !== undefined ? String(category || "").trim() || null : undefined,
    status: status !== undefined ? status || "open" : undefined,
    assigned_to_user_id:
      assignedToUserId !== undefined ? assignedToUserId || null : undefined,
    due_date: dueDate !== undefined ? dueDate || null : undefined,
  };

  const sanitizedPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  const { data, error } = await supabase
    .from("trip_tasks")
    .update(sanitizedPayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating trip task", error);
    throw error;
  }

  return normalizeTripTask(data);
}

export async function syncDefaultTripTaskDueDates({
  tripId,
  startDate,
  trainingTimelineType,
}) {
  const normalizedTimelineType = normalizeTrainingTimelineType(trainingTimelineType);
  const { data, error } = await supabase
    .from("trip_tasks")
    .select("*")
    .eq("trip_id", tripId)
    .eq("category", "worker_default");

  if (error) {
    console.error("Error loading default worker tasks for due date sync", error);
    throw error;
  }

  const existingRows = data || [];
  const updates = existingRows
    .map((row) => {
      const template = findWorkerTaskTemplate({ title: row.title });
      if (!template) return null;

      const nextDueDate = computeWorkerTaskDueDate(template, {
        startDate,
        trainingTimelineType: normalizedTimelineType,
      });

      return String(row.due_date || "") === String(nextDueDate || "")
        ? null
        : {
            id: row.id,
            due_date: nextDueDate || null,
          };
    })
    .filter(Boolean);

  if (updates.length === 0) {
    return existingRows.map(normalizeTripTask).sort(compareTripTasks);
  }

  const savedRows = [];
  for (const update of updates) {
    const { data: savedRow, error: updateError } = await supabase
      .from("trip_tasks")
      .update({ due_date: update.due_date })
      .eq("id", update.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Error syncing default worker task due date", updateError);
      throw updateError;
    }

    savedRows.push(savedRow);
  }

  const savedRowsById = new Map(savedRows.map((row) => [row.id, row]));
  return existingRows
    .map((row) => normalizeTripTask(savedRowsById.get(row.id) || row))
    .sort(compareTripTasks);
}

export async function listUserTaskProgress(tripId) {
  const { data, error } = await supabase
    .from("user_task_progress")
    .select("*")
    .eq("trip_id", tripId);

  if (error) {
    console.error("Error loading user task progress", error);
    throw error;
  }

  return (data || []).map(normalizeTaskProgress);
}

/**
 * Resolve profile emails for user_task_progress rows whose user_id is not in trip.participants
 * (e.g. roster-only workers who have a profile but no trip_assignment yet).
 */
export async function loadProfileEmailsByUserIds(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean).map((id) => String(id)))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", ids);

  if (error) {
    console.error("Error loading profile emails for task progress", error);
    return new Map();
  }

  const map = new Map();
  (data || []).forEach((row) => {
    const em = String(row?.email || "")
      .trim()
      .toLowerCase();
    if (row?.id && em) map.set(String(row.id), em);
  });
  return map;
}

export async function saveUserTaskProgress({
  tripId,
  userId,
  taskName,
  completed,
  dueDate,
  notes,
}) {
  const { data: existing, error: existingError } = await supabase
    .from("user_task_progress")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .eq("task_name", taskName)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking user task progress", existingError);
    throw existingError;
  }

  const payload = {
    trip_id: tripId,
    user_id: userId,
    task_name: taskName,
    completed: !!completed,
    due_date: dueDate || null,
    notes: notes || null,
  };

  const query = existing
    ? supabase.from("user_task_progress").update(payload).eq("id", existing.id)
    : supabase.from("user_task_progress").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    console.error("Error saving user task progress", error);
    throw error;
  }

  return normalizeTaskProgress(data);
}

async function getTripRow(tripId) {
  const { data, error } = await supabase
    .from("trips")
    .select("id, start_date, training_timeline_type, location")
    .eq("id", tripId)
    .maybeSingle();

  if (error) {
    console.error("Error loading trip row for worker task seed", error);
    throw error;
  }

  return data || null;
}

function seededWorkerTaskTitle(task, location) {
  if (!isUsMassachusettsMissionSite(location)) return task.title;
  if (task.id === "worker-task-passport") {
    return "Has government-issued photo ID valid through end of LST project";
  }
  if (task.id === "worker-task-upload-passport") {
    return "Upload government ID";
  }
  return task.title;
}

async function seedWorkerTasksForTrip(tripId, startDate, trainingTimelineType, location = "") {
  const payload = WORKER_TASK_TEMPLATE.map((task) => ({
    trip_id: tripId,
    title: seededWorkerTaskTitle(task, location),
    description: null,
    category: task.category,
    status: "open",
    assigned_to_user_id: null,
    due_date: computeWorkerTaskDueDate(task, {
      startDate,
      trainingTimelineType,
    }),
  }));

  const { data, error } = await supabase
    .from("trip_tasks")
    .insert(payload)
    .select("*");

  if (error) {
    console.error("Error seeding worker tasks", error);
    throw error;
  }

  return data || [];
}

function compareTripTasks(a, b) {
  const left = String(a?.due || "").trim();
  const right = String(b?.due || "").trim();

  if (!left && !right) {
    return String(a?.title || "").localeCompare(String(b?.title || ""));
  }

  if (!left) return 1;
  if (!right) return -1;

  return left.localeCompare(right) || String(a?.title || "").localeCompare(String(b?.title || ""));
}
