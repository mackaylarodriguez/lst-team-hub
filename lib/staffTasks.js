import { supabase } from "@/lib/supabase";
import { STAFF_TASK_TEMPLATE } from "./staffTaskTemplate";

export const STAFF_TASKS_UPDATED_EVENT = "lst:staff-tasks-updated";

const TEMPLATE_AREA_ORDER = new Map();
const TEMPLATE_TASK_ORDER = new Map();

STAFF_TASK_TEMPLATE.forEach((task, index) => {
  const area = normalizeWorkArea(task.workArea);

  if (!TEMPLATE_AREA_ORDER.has(area)) {
    TEMPLATE_AREA_ORDER.set(area, TEMPLATE_AREA_ORDER.size);
  }

  TEMPLATE_TASK_ORDER.set(getTemplateOrderKey(task.id, area), index);
});

export async function listStaffTasksForTrip(tripId) {
  const { data, error } = await supabase
    .from("trip_staff_tasks")
    .select("*")
    .eq("trip_id", tripId)
    .order("sequence", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading staff tasks", error);
    return buildTemplateTasksForTrip(tripId);
  }

  const existingTasks = data || [];
  if (existingTasks.length > 0) {
    return sortStaffTasksByTemplate(existingTasks.map(normalizeStaffTaskRow));
  }

  const seeded = await seedStaffTasksForTrip(tripId);
  return sortStaffTasksByTemplate(seeded);
}

export async function saveStaffTasks(tripId, tasks) {
  const orderedTasks = sortStaffTasksByTemplate(tasks).map((task) => ({
    id: task.id,
    trip_id: tripId,
    work_area: task.workArea,
    sequence: task.sequence ?? 0,
    task_name: task.taskName || task.title || "",
    assigned_to: task.assignedTo || "",
    progress: normalizeProgressValue(task.progress),
    due_date: task.dueDate || null,
    notes: task.notes || null,
    updated_by_name: task.updatedByName || null,
    updated_by_email: task.updatedByEmail || null,
    updated_at: task.updatedAt || new Date().toISOString(),
  }));

  let { data, error } = await supabase
    .from("trip_staff_tasks")
    .upsert(orderedTasks, { onConflict: "id" })
    .select("*");

  if (
    error &&
    /updated_by_name|updated_by_email|updated_at/i.test(
      `${error.message || ""} ${error.details || ""} ${error.hint || ""}`
    )
  ) {
    const fallbackTasks = orderedTasks.map(
      ({ updated_by_name, updated_by_email, updated_at, ...task }) => task
    );

    ({ data, error } = await supabase
      .from("trip_staff_tasks")
      .upsert(fallbackTasks, { onConflict: "id" })
      .select("*"));
  }

  if (error) {
    console.error("Error saving staff tasks", error);
    throw error;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(STAFF_TASKS_UPDATED_EVENT, {
        detail: { tripId, tasks: data || [] },
      })
    );
  }

  return sortStaffTasksByTemplate((data || []).map(normalizeStaffTaskRow));
}

export function flattenStaffTasks(trips) {
  return (trips || []).flatMap((trip) =>
    (trip.staffTasks || []).map((task) => ({
      ...task,
      tripId: trip.id,
      tripName: trip.name,
      tripDates: trip.dates,
      tripLocation: trip.location,
    }))
  );
}

export function isTaskAssignedToUser(assignedTo, userName) {
  const normalizedAssigned = normalizeName(assignedTo);
  const normalizedUser = normalizeName(userName);

  if (!normalizedAssigned || !normalizedUser) return false;

  return (
    normalizedAssigned === normalizedUser ||
    normalizedAssigned === normalizedUser.split(" ")[0] ||
    normalizedAssigned.split(" ")[0] === normalizedUser.split(" ")[0]
  );
}

export function sortStaffTasksByTemplate(tasks = []) {
  return [...tasks].sort((a, b) => compareTasksByTemplateOrder(a, b));
}

async function seedStaffTasksForTrip(tripId) {
  const payload = STAFF_TASK_TEMPLATE.map((task) => ({
    id: `${tripId}-${task.id}`,
    trip_id: tripId,
    work_area: task.workArea,
    sequence: task.sequence,
    task_name: task.taskName,
    assigned_to: task.assignedTo,
    progress: normalizeProgressValue(task.progress),
    due_date: task.dueDate || null,
    notes: task.notes || null,
  }));

  const { data, error } = await supabase
    .from("trip_staff_tasks")
    .insert(payload)
    .select("*");

  if (error) {
    console.error("Error seeding staff tasks", error);
    return buildTemplateTasksForTrip(tripId);
  }

  return (data || []).map(normalizeStaffTaskRow);
}

function buildTemplateTasksForTrip(tripId) {
  return STAFF_TASK_TEMPLATE.map((task) => ({
    id: `${tripId}-${task.id}`,
    workArea: task.workArea,
    sequence: task.sequence,
    taskName: task.taskName,
    assignedTo: task.assignedTo,
    progress: normalizeProgressValue(task.progress),
    dueDate: task.dueDate || "",
    notes: task.notes || "",
  }));
}

function normalizeStaffTaskRow(row) {
  return {
    id: row.id,
    workArea: row.work_area || "",
    sequence: Number(row.sequence || 0),
    taskName: row.task_name || "",
    assignedTo: row.assigned_to || "",
    progress: normalizeProgressValue(row.progress),
    dueDate: row.due_date || "",
    notes: row.notes || "",
    updatedByName: row.updated_by_name || "",
    updatedByEmail: row.updated_by_email || "",
    updatedAt: row.updated_at || "",
  };
}

function normalizeProgressValue(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "complete") return "Complete";
  if (normalized === "in progress") return "In progress";
  if (normalized === "waiting") return "Waiting";
  return "Not started";
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function compareTasksByTemplateOrder(a, b) {
  const areaA = normalizeWorkArea(a?.workArea);
  const areaB = normalizeWorkArea(b?.workArea);
  const areaRankA = TEMPLATE_AREA_ORDER.get(areaA) ?? Number.MAX_SAFE_INTEGER;
  const areaRankB = TEMPLATE_AREA_ORDER.get(areaB) ?? Number.MAX_SAFE_INTEGER;

  if (areaRankA !== areaRankB) return areaRankA - areaRankB;

  const taskRankA = getTemplateTaskRank(a, areaA);
  const taskRankB = getTemplateTaskRank(b, areaB);

  if (taskRankA !== taskRankB) return taskRankA - taskRankB;

  return (a?.taskName || a?.title || "").localeCompare(b?.taskName || b?.title || "");
}

function getTemplateTaskRank(task, area) {
  const rawId = String(task?.id || "");
  const matchedTemplateId = STAFF_TASK_TEMPLATE.find(
    (templateTask) =>
      normalizeWorkArea(templateTask.workArea) === area &&
      (rawId === templateTask.id || rawId.endsWith(`-${templateTask.id}`))
  )?.id;

  if (!matchedTemplateId) return Number.MAX_SAFE_INTEGER;

  return (
    TEMPLATE_TASK_ORDER.get(getTemplateOrderKey(matchedTemplateId, area)) ??
    Number.MAX_SAFE_INTEGER
  );
}

function normalizeWorkArea(value) {
  return String(value || "").trim();
}

function getTemplateOrderKey(id, area) {
  return `${area}::${id}`;
}
