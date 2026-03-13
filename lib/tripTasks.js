import { supabase } from "@/lib/supabase";
import { WORKER_TASK_TEMPLATE } from "./workerTaskTemplate";

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

  const existingTasks = data || [];
  const hasDefaultWorkerTasks = existingTasks.some(
    (task) => task.category === "worker_default"
  );

  if (existingTasks.length > 0 && hasDefaultWorkerTasks) {
    return existingTasks.map(normalizeTripTask);
  }

  const trip = await getTripRow(tripId);
  const seededTasks = await seedWorkerTasksForTrip(tripId, trip?.start_date || null);
  return [...existingTasks, ...seededTasks]
    .map(normalizeTripTask)
    .sort(compareTripTasks);
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
    .select("id, start_date")
    .eq("id", tripId)
    .maybeSingle();

  if (error) {
    console.error("Error loading trip row for worker task seed", error);
    throw error;
  }

  return data || null;
}

async function seedWorkerTasksForTrip(tripId, startDate) {
  const payload = WORKER_TASK_TEMPLATE.map((task) => ({
    trip_id: tripId,
    title: task.title,
    description: null,
    category: task.category,
    status: "open",
    assigned_to_user_id: null,
    due_date: computeDueDate(startDate, task.dueDaysBeforeStart),
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

function computeDueDate(startDate, daysBeforeStart) {
  if (!startDate || typeof daysBeforeStart !== "number") {
    return null;
  }

  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setDate(date.getDate() - daysBeforeStart);
  return date.toISOString().slice(0, 10);
}
