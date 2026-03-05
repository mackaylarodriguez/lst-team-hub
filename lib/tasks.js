export function taskKey(email, tripId) {
  return `lstHubTasks:${email}:${tripId}`;
}

export function loadTaskState(email, tripId) {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(taskKey(email, tripId)) || "{}"); }
  catch { return {}; }
}

export function saveTaskState(email, tripId, state) {
  if (typeof window === "undefined") return;
  localStorage.setItem(taskKey(email, tripId), JSON.stringify(state));
}

export function percentComplete(tasks, state) {
  const total = tasks.length;
  const done = tasks.filter(t => !!state[t.id]).length;
  return total === 0 ? 0 : Math.round((done / total) * 100);
}
