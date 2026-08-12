import { supabase } from "@/lib/supabase";
import { saveUserTaskProgress } from "@/lib/tripTasks";
import { normalizeEmail } from "@/lib/resendMail";

export const STAFF_TRAINING_PROGRESS_STORAGE_KEY = "lst-staff-training-section-progress-v1";
export const STAFF_TRAINING_SECTION_TASK_PREFIX = "staff-training-section:";
/** Sentinel trip id so staff /training progress can live in user_task_progress. */
export const STAFF_TRAINING_PROGRESS_TRIP_ID = "00000000-0000-4000-a000-000000000001";

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function buildStaffTrainingSectionTaskName(sectionId) {
  return `${STAFF_TRAINING_SECTION_TASK_PREFIX}${String(sectionId || "").trim()}`;
}

function parseStaffTrainingSectionTaskName(taskName) {
  const name = String(taskName || "");
  if (!name.startsWith(STAFF_TRAINING_SECTION_TASK_PREFIX)) return null;
  const sectionId = name.slice(STAFF_TRAINING_SECTION_TASK_PREFIX.length).trim();
  return sectionId || null;
}

export function loadStaffTrainingProgressFromStorage() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STAFF_TRAINING_PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const next = {};
    for (const [email, state] of Object.entries(parsed)) {
      const emailKey = normalizeEmail(email);
      if (!emailKey || !state || typeof state !== "object") continue;
      next[emailKey] = { ...state };
    }
    return next;
  } catch {
    return {};
  }
}

export function saveStaffTrainingProgressToStorage(statesByEmail = {}) {
  if (typeof window === "undefined") return;
  const next = {};
  for (const [email, state] of Object.entries(statesByEmail || {})) {
    const emailKey = normalizeEmail(email);
    if (!emailKey) continue;
    next[emailKey] = { ...(state || {}) };
  }
  window.localStorage.setItem(STAFF_TRAINING_PROGRESS_STORAGE_KEY, JSON.stringify(next));
}

export function mergeStaffTrainingSectionStates(...maps) {
  const next = {};
  for (const map of maps) {
    for (const [email, state] of Object.entries(map || {})) {
      const emailKey = normalizeEmail(email);
      if (!emailKey) continue;
      next[emailKey] = { ...(next[emailKey] || {}), ...(state || {}) };
    }
  }
  return next;
}

export async function listStaffTrainingSectionStatesByUserId(userIds = []) {
  const ids = [
    ...new Set((userIds || []).map((id) => String(id || "").trim()).filter((id) => isUuid(id))),
  ];
  if (!ids.length) return new Map();

  const { data, error } = await supabase
    .from("user_task_progress")
    .select("user_id, task_name, completed")
    .in("user_id", ids)
    .like("task_name", `${STAFF_TRAINING_SECTION_TASK_PREFIX}%`);

  if (error) {
    console.error("Unable to load staff training progress", error);
    return new Map();
  }

  const byUserId = new Map();
  for (const row of data || []) {
    if (!row?.completed) continue;
    const sectionId = parseStaffTrainingSectionTaskName(row.task_name);
    if (!sectionId || !row.user_id) continue;
    const userKey = String(row.user_id);
    if (!byUserId.has(userKey)) byUserId.set(userKey, {});
    byUserId.get(userKey)[sectionId] = true;
  }
  return byUserId;
}

export async function saveStaffTrainingSectionProgress({ userId, sectionId, completed = true }) {
  const uid = String(userId || "").trim();
  const sid = String(sectionId || "").trim();
  if (!isUuid(uid) || !sid) {
    throw new Error("Missing user or section for staff training progress.");
  }

  const taskName = buildStaffTrainingSectionTaskName(sid);
  const attempts = [STAFF_TRAINING_PROGRESS_TRIP_ID, uid];
  let lastError = null;

  for (const tripId of attempts) {
    try {
      return await saveUserTaskProgress({
        tripId,
        userId: uid,
        taskName,
        completed: !!completed,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to save staff training progress.");
}
