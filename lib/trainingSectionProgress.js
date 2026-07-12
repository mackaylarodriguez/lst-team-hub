import { saveUserTaskProgress } from "@/lib/tripTasks";

export const TRAINING_SECTION_PROGRESS_TASK_PREFIX = "prototype-section:";

export function buildTrainingSectionTaskName(sectionId) {
  return `${TRAINING_SECTION_PROGRESS_TASK_PREFIX}${String(sectionId || "").trim()}`;
}

export function parseTrainingSectionTaskName(taskName) {
  const name = String(taskName || "");
  if (!name.startsWith(TRAINING_SECTION_PROGRESS_TASK_PREFIX)) return null;
  const sectionId = name.slice(TRAINING_SECTION_PROGRESS_TASK_PREFIX.length).trim();
  return sectionId || null;
}

export function isTrainingSectionProgressTask(taskName) {
  return parseTrainingSectionTaskName(taskName) != null;
}

export function buildParticipantSectionStatesFromTaskProgress(taskProgressRows = []) {
  const byUserId = new Map();

  for (const row of taskProgressRows || []) {
    const sectionId = parseTrainingSectionTaskName(row.taskName);
    if (!sectionId || !row.userId) continue;

    const userKey = String(row.userId);
    if (!byUserId.has(userKey)) byUserId.set(userKey, {});
    if (row.completed) {
      byUserId.get(userKey)[sectionId] = true;
    }
  }

  return byUserId;
}

export async function saveTrainingSectionProgress({
  tripId,
  userId,
  sectionId,
  completed = true,
}) {
  const tid = String(tripId || "").trim();
  const uid = String(userId || "").trim();
  const sid = String(sectionId || "").trim();
  if (!tid || !uid || !sid) {
    throw new Error("Missing trip, user, or section for training section progress.");
  }

  return saveUserTaskProgress({
    tripId: tid,
    userId: uid,
    taskName: buildTrainingSectionTaskName(sid),
    completed: !!completed,
  });
}
