import { supabase } from "@/lib/supabase";

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

  return (data || []).map(normalizeTripTask);
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
