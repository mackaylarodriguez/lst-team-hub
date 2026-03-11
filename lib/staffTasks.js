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

export function staffTasksKey(tripId) {
  return `staffTasks:${tripId}`;
}

export function loadStaffTasks(trip) {
  if (!trip) return [];
  return sortStaffTasksByTemplate(trip.staffTasks || []);
}

export function saveStaffTasks(tripId, tasks) {
  const orderedTasks = sortStaffTasksByTemplate(tasks);
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(STAFF_TASKS_UPDATED_EVENT, {
      detail: { tripId, tasks: orderedTasks },
    })
  );
}

export function flattenStaffTasks(trips) {
  return (trips || []).flatMap((trip) =>
    loadStaffTasks(trip).map((task) => ({
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
