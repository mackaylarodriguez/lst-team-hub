import { supabase } from "@/lib/supabase";
import { STAFF_TASK_TEMPLATE, findStaffTaskTemplate } from "./staffTaskTemplate";

export const STAFF_TASKS_UPDATED_EVENT = "lst:staff-tasks-updated";
export const STAFF_MISC_TASKS_UPDATED_EVENT = "lst:staff-misc-tasks-updated";

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
    console.log("[staffTasks] listStaffTasksForTrip database error", {
      tripId,
      error,
    });
    throw error;
  }

  const existingTasks = data || [];
  if (existingTasks.length > 0) {
    console.log("[staffTasks] listStaffTasksForTrip loaded from database", {
      tripId,
      rowCount: existingTasks.length,
    });
    return sortStaffTasksByTemplate(normalizeLoadedStaffTasks(tripId, existingTasks.map(normalizeStaffTaskRow)));
  }

  const seeded = await seedStaffTasksForTrip(tripId);
  console.log("[staffTasks] listStaffTasksForTrip seeded template tasks", {
    tripId,
    rowCount: seeded.length,
  });
  return sortStaffTasksByTemplate(seeded);
}

export function isMissingStaffMiscTasksTableError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    (error?.code === "42P01" || error?.code === "PGRST205" || error?.code === "PGRST204") &&
    message.includes("staff_misc_tasks")
  );
}

export async function listStaffMiscTasksForUser(staffEmail) {
  if (!String(staffEmail || "").trim()) return [];

  const normalizedEmail = String(staffEmail || "").trim().toLowerCase();
  const { data, error } = await supabase
    .from("staff_misc_tasks")
    .select("*")
    .eq("staff_email", normalizedEmail)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingStaffMiscTasksTableError(error)) {
      return [];
    }
    console.error("Error loading staff misc tasks", error);
    throw error;
  }

  return (data || []).map(normalizeStaffMiscTaskRow);
}

export async function saveStaffMiscTask(task) {
  const payload = {
    id: task.id || undefined,
    staff_email: String(task.staffEmail || "").trim().toLowerCase(),
    staff_name: String(task.staffName || "").trim() || null,
    work_area: String(task.workArea || "Personal Task").trim() || "Personal Task",
    task_name: String(task.taskName || task.title || "").trim() || "Untitled task",
    progress: normalizeProgressValue(task.progress),
    due_date: task.dueDate || null,
    notes: task.notes || null,
    updated_at: task.updatedAt || new Date().toISOString(),
  };

  const query = payload.id
    ? supabase.from("staff_misc_tasks").upsert(payload, { onConflict: "id" })
    : supabase.from("staff_misc_tasks").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    console.error("Error saving staff misc task", error);
    throw error;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(STAFF_MISC_TASKS_UPDATED_EVENT, {
        detail: { task: data || null },
      })
    );
  }

  return normalizeStaffMiscTaskRow(data);
}

export async function deleteStaffMiscTask(taskId) {
  const { error } = await supabase.from("staff_misc_tasks").delete().eq("id", taskId);

  if (error) {
    console.error("Error deleting staff misc task", error);
    throw error;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STAFF_MISC_TASKS_UPDATED_EVENT));
  }
}

export async function saveStaffTasks(tripId, tasks) {
  const orderedTasks = dedupeStaffTasks(normalizeLoadedStaffTasks(tripId, sortStaffTasksByTemplate(tasks))).map((task) => ({
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

  console.log("[staffTasks] saveStaffTasks payload", {
    tripId,
    rowCount: orderedTasks.length,
    payload: orderedTasks,
  });

  let { data, error } = await supabase
    .from("trip_staff_tasks")
    .upsert(orderedTasks, { onConflict: "id" })
    .select("*");

  console.log("[staffTasks] saveStaffTasks first upsert result", {
    tripId,
    rowCount: data?.length || 0,
    data,
    error,
  });

  if (
    error &&
    /updated_by_name|updated_by_email|updated_at/i.test(
      `${error.message || ""} ${error.details || ""} ${error.hint || ""}`
    )
  ) {
    const fallbackTasks = orderedTasks.map(
      ({ updated_by_name, updated_by_email, updated_at, ...task }) => task
    );

    console.log("[staffTasks] saveStaffTasks retrying without updated_* fields", {
      tripId,
      rowCount: fallbackTasks.length,
      payload: fallbackTasks,
    });

    ({ data, error } = await supabase
      .from("trip_staff_tasks")
      .upsert(fallbackTasks, { onConflict: "id" })
      .select("*"));

    console.log("[staffTasks] saveStaffTasks fallback upsert result", {
      tripId,
      rowCount: data?.length || 0,
      data,
      error,
    });
  }

  if (error) {
    console.error("Error saving staff tasks", error);
    throw error;
  }

  console.log("[staffTasks] saveStaffTasks persisted to database", {
    tripId,
    rowCount: data?.length || 0,
    data,
  });

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

/** Stable ordering for grouping staff tasks by work area (UI section headers). */
export function getStaffTaskAreaSortRank(workArea) {
  const area = normalizeWorkArea(workArea);
  return TEMPLATE_AREA_ORDER.get(area) ?? Number.MAX_SAFE_INTEGER;
}

/** Canonical work areas from the staff task template, in template order (for picklists). */
export function listStaffTaskTemplateWorkAreas() {
  return [...TEMPLATE_AREA_ORDER.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([area]) => area);
}

/** YYYY-MM-DD for date inputs and APIs (handles full ISO timestamps from Supabase). */
export function toCalendarDatePart(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

export function computeStaffTaskDueDate(task, trip) {
  if (!task || !trip) return "";

  const createdAt = toCalendarDatePart(trip.createdAt);
  const startDate = toCalendarDatePart(trip.startDate);
  const endDate = toCalendarDatePart(trip.endDate);

  function addDays(dateStr, days) {
    if (!dateStr) return "";
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function subtractDays(dateStr, days) {
    if (!dateStr || typeof days !== "number") return "";
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "";
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }

  /**
   * "Lock" anchor: trip created date, or ~90 days before start if created_at is missing
   * (so sequence 1/2 tasks still get a calendar date when only project dates exist).
   */
  const anchorLockDate =
    createdAt || (startDate ? subtractDays(startDate, 90) : "");

  const template = findStaffTaskTemplate(task);
  const sequence = Number(
    task.sequence !== undefined && task.sequence !== null
      ? task.sequence
      : template?.sequence ?? 0
  );

  // Template-specific overrides (match worker-style explicit rules; avoids title substring bugs)
  if (template?.id === "training-launch-appt") {
    // "within one week of locking"
    return anchorLockDate ? addDays(anchorLockDate, 7) : "";
  }
  if (template?.id === "social-media") {
    // "week of their departure" — anchor to project start
    return startDate || "";
  }
  if (template?.id === "materials-sent") {
    // 2 weeks after trip created / lock anchor (same anchor as sequence 1–2 tasks)
    return anchorLockDate ? addDays(anchorLockDate, 14) : "";
  }

  // Default rules by template sequence (1 = week after lock, 2 = ~3 weeks after lock,
  // 3 = ~3 months before departure, 4 = during project, 5 = post project)
  switch (sequence) {
    case 1:
      return anchorLockDate ? addDays(anchorLockDate, 7) : "";
    case 2:
      return anchorLockDate ? addDays(anchorLockDate, 21) : "";
    case 3:
      return startDate ? subtractDays(startDate, 90) : "";
    case 4:
      return startDate || "";
    case 5:
      return endDate || "";
    default:
      return "";
  }
}

async function seedStaffTasksForTrip(tripId) {
  const payload = STAFF_TASK_TEMPLATE.map((task) => ({
    id: buildStaffTaskId(tripId, task),
    trip_id: tripId,
    work_area: task.workArea,
    sequence: task.sequence,
    task_name: task.taskName,
    assigned_to: task.assignedTo,
    progress: normalizeProgressValue(task.progress),
    due_date: task.dueDate || null,
    notes: task.notes || null,
  }));

  console.log("[staffTasks] seedStaffTasksForTrip payload", {
    tripId,
    rowCount: payload.length,
    payload,
  });

  const { data, error } = await supabase
    .from("trip_staff_tasks")
    .insert(payload)
    .select("*");

  console.log("[staffTasks] seedStaffTasksForTrip result", {
    tripId,
    rowCount: data?.length || 0,
    data,
    error,
  });

  if (error) {
    console.error("Error seeding staff tasks", error);
    return buildTemplateTasksForTrip(tripId);
  }

  return (data || []).map(normalizeStaffTaskRow);
}

function buildTemplateTasksForTrip(tripId) {
  return STAFF_TASK_TEMPLATE.map((task) => ({
    id: buildStaffTaskId(tripId, task),
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
    dueDate: toCalendarDatePart(row.due_date),
    notes: row.notes || "",
    updatedByName: row.updated_by_name || "",
    updatedByEmail: row.updated_by_email || "",
    updatedAt: row.updated_at || "",
  };
}

function normalizeStaffMiscTaskRow(row) {
  const rawWorkArea = String(row.work_area || "").trim();
  const normalizedWorkArea =
    !rawWorkArea || rawWorkArea.toLowerCase() === "misc"
      ? "Personal Task"
      : rawWorkArea;
  return {
    id: row.id,
    workArea: normalizedWorkArea,
    sequence: Number(row.sequence || 0),
    taskName: row.task_name || "",
    assignedTo: row.staff_name || row.staff_email || "",
    progress: normalizeProgressValue(row.progress),
    dueDate: toCalendarDatePart(row.due_date),
    notes: row.notes || "",
    tripId: "misc",
    tripName: normalizedWorkArea,
    isMiscTask: true,
    staffEmail: row.staff_email || "",
    staffName: row.staff_name || "",
    updatedAt: row.updated_at || "",
    createdAt: row.created_at || "",
  };
}

function normalizeLoadedStaffTasks(tripId, tasks) {
  return dedupeStaffTasks(
    (tasks || []).map((task, index) => {
      // Match template the same way as due-date / UI helpers: case-insensitive name + area.
      // Case-sensitive equality here previously produced fallback IDs, duplicate rows on save,
      // and "last row wins" deduping that dropped Completed progress.
      const templateMatch = findStaffTaskTemplate(task);

      const canonicalId = templateMatch
        ? buildStaffTaskId(tripId, templateMatch)
        : buildFallbackStaffTaskId(tripId, task, index);

      return {
        ...task,
        id: canonicalId,
      };
    })
  );
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
      (
        rawId === templateTask.id ||
        rawId.endsWith(`-${templateTask.id}`) ||
        rawId.endsWith(`-${slugifyWorkArea(templateTask.workArea)}-${templateTask.id}`)
      )
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

function buildStaffTaskId(tripId, task) {
  return `${tripId}-${slugifyWorkArea(task.workArea)}-${task.id}`;
}

function buildFallbackStaffTaskId(tripId, task, index) {
  return `${tripId}-${slugifyWorkArea(task?.workArea || "other")}-${slugifyWorkArea(
    task?.taskName || task?.title || `task-${index + 1}`
  )}`;
}

function slugifyWorkArea(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function staffTaskProgressRank(progress) {
  const v = normalizeProgressValue(progress);
  if (v === "Complete") return 4;
  if (v === "In progress") return 3;
  if (v === "Waiting") return 2;
  return 1;
}

function pickRicherStaffTaskRow(a, b) {
  const ra = staffTaskProgressRank(a?.progress);
  const rb = staffTaskProgressRank(b?.progress);
  if (rb !== ra) return rb > ra ? b : a;
  const ta = String(a?.updatedAt || "").trim();
  const tb = String(b?.updatedAt || "").trim();
  if (tb && (!ta || tb > ta)) return b;
  if (ta && (!tb || ta > tb)) return a;
  return b;
}

function dedupeStaffTasks(tasks) {
  const byId = new Map();

  tasks.forEach((task) => {
    const key = String(task?.id || "").trim();
    if (!key) return;
    const existing = byId.get(key);
    if (!existing) {
      byId.set(key, task);
      return;
    }
    byId.set(key, pickRicherStaffTaskRow(existing, task));
  });

  return Array.from(byId.values());
}
