export const STAFF_TASKS_UPDATED_EVENT = "lst:staff-tasks-updated";

export function staffTasksKey(tripId) {
  return `staffTasks:${tripId}`;
}

export function loadStaffTasks(trip) {
  if (!trip) return [];
  if (typeof window === "undefined") return trip.staffTasks || [];

  try {
    const saved = localStorage.getItem(staffTasksKey(trip.id));
    return saved ? JSON.parse(saved) : (trip.staffTasks || []);
  } catch {
    return trip.staffTasks || [];
  }
}

export function saveStaffTasks(tripId, tasks) {
  if (typeof window === "undefined") return;
  localStorage.setItem(staffTasksKey(tripId), JSON.stringify(tasks));
  window.dispatchEvent(
    new CustomEvent(STAFF_TASKS_UPDATED_EVENT, {
      detail: { tripId, tasks },
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

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
