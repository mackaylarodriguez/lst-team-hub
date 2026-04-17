import { findWorkerTaskTemplate } from "./workerTaskTemplate";

function normalizeWorkerTaskProgressKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * True if this worker trip task is marked complete in progress state.
 * Matches by task id (preferred), exact title, template id, or normalized title
 * (legacy rows sometimes stored title or other keys in user_task_progress.task_name).
 */
export function isWorkerTaskCompletedInState(task, state) {
  if (!task || !state) return false;
  if (state[task.id]) return true;
  const title = String(task.title || "").trim();
  if (title && state[title]) return true;
  const tpl = findWorkerTaskTemplate(task);
  if (tpl?.id && state[tpl.id]) return true;

  const titleKey = normalizeWorkerTaskProgressKey(title);
  if (!titleKey) return false;
  for (const [key, val] of Object.entries(state)) {
    if (!val) continue;
    if (normalizeWorkerTaskProgressKey(key) === titleKey) return true;
  }
  return false;
}

export function percentComplete(tasks, state) {
  const total = (tasks || []).length;
  const done = (tasks || []).filter((task) => isWorkerTaskCompletedInState(task, state)).length;
  return total === 0 ? 0 : Math.round((done / total) * 100);
}
