import { isUsMassachusettsMissionSite } from "@/lib/usMassachusettsSite";
import { getUserDocumentTypeLabel } from "@/lib/userDocumentTypes";

export const TRAINING_TIMELINE_STANDARD = "standard";
export const TRAINING_TIMELINE_COLLEGE = "college";
export const DEFAULT_TRAINING_TIMELINE_TYPE = TRAINING_TIMELINE_STANDARD;

export const TRAINING_TIMELINE_OPTIONS = [
  {
    value: TRAINING_TIMELINE_STANDARD,
    label: "Standard (3 months)",
  },
  {
    value: TRAINING_TIMELINE_COLLEGE,
    label: "College Team (6+ months)",
  },
];

export const WORKER_TASK_TEMPLATE = [
  {
    id: "worker-task-training-platform",
    title: "Has access to training platform and has started training",
    category: "worker_default",
    dueRule: "training-start",
  },
  {
    id: "worker-task-passport",
    title: "Has passport good for 3-6 months after end of LST Project",
    category: "worker_default",
    dueRule: "passport",
  },
  {
    id: "worker-task-visa",
    title: "Has visa or other entry requirements",
    category: "worker_default",
    dueRule: "visa",
  },
  {
    id: "worker-task-upload-passport",
    title: "Upload passport",
    category: "worker_default",
    dueRule: "passport-upload",
  },
  {
    id: "worker-task-upload-visa",
    title: "Upload visa",
    category: "worker_default",
    dueRule: "visa-upload",
  },
  {
    id: "worker-task-fundraising-2000",
    title: "$2,000 raised 90 days before departure",
    category: "worker_default",
    dueRule: "fundraising-90",
  },
  {
    id: "worker-task-fundraising-all",
    title: "All fundraising funds raised 30 days prior to departure",
    category: "worker_default",
    dueRule: "fundraising-30",
  },
  {
    id: "worker-task-thank-donors",
    title: "Thank you to donors sent",
    category: "worker_default",
    dueRule: "fundraising-30",
  },
  {
    id: "worker-task-checklist",
    title: "Received and has reviewed Project Management Checklist",
    category: "worker_default",
    dueRule: "pre-departure",
  },
  {
    id: "worker-task-host-intro",
    title: "Our team has introduced ourselves to our Host (via Zoom, WhatsApp, email, etc.)",
    category: "worker_default",
    dueRule: "pre-departure",
  },
  {
    id: "worker-task-travel-form",
    title: "Fill out Travel Form",
    category: "worker_default",
    /** ~3 months before project start (`startDate` on the trip). */
    dueRule: "travel-form",
  },
  {
    id: "worker-task-materials-page",
    title: "Fill out the Materials page",
    details:
      "On the Materials tab, enter your team accountant, materials recorder, and shipping address for the team box.",
    category: "worker_default",
    dueRule: "pre-departure",
  },
  {
    id: "worker-task-tickets",
    title: "Proofread my tickets",
    category: "worker_default",
    dueRule: "pre-departure",
  },
  {
    id: "worker-task-waiver",
    title: "Signed LST Waiver",
    category: "worker_default",
    dueRule: "pre-departure",
  },
  {
    id: "worker-task-step",
    title: "Signed up to STEP (U.S. Dept. of State)",
    category: "worker_default",
    dueRule: "pre-departure",
    link: "https://step.state.gov/",
    details: "Smart Traveler Enrollment Program (STEP) – register for country updates and to help the U.S. Embassy contact you in an emergency.",
  },
  {
    id: "worker-task-training-complete",
    title: "Completed all LST Training",
    category: "worker_default",
    dueRule: "training-complete",
  },
];

const WORKER_TASK_TEMPLATES_BY_ID = new Map(
  WORKER_TASK_TEMPLATE.map((task) => [String(task.id || "").trim(), task])
);

const WORKER_TASK_TEMPLATES_BY_TITLE = new Map(
  WORKER_TASK_TEMPLATE.map((task) => [normalizeTaskTitle(task.title), task])
);

// Legacy titles (from DB rows created before template renames) -> template id, so due-date sync still finds the template
const LEGACY_TITLE_TO_TEMPLATE_ID = new Map([
  ["$2,000 raised 90 days before trip", "worker-task-fundraising-2000"],
  ["all raised 30 days before trip", "worker-task-fundraising-all"],
  ["all fundraising goal met", "worker-task-fundraising-all"],
]);

/** Seeded/display titles for MA domestic trips that differ from the default template title. */
const ALTERNATE_WORKER_TASK_TITLE_TO_TEMPLATE_ID = new Map([
  ["upload government id", "worker-task-upload-passport"],
  [
    "has government-issued photo id valid through end of lst project",
    "worker-task-passport",
  ],
  ["50% of fundraising due 90 days before departure", "worker-task-fundraising-2000"],
  ["50% of fundraising due 30 days prior to departure", "worker-task-fundraising-all"],
]);

export function normalizeTrainingTimelineType(value) {
  return String(value || "").trim().toLowerCase() === TRAINING_TIMELINE_COLLEGE
    ? TRAINING_TIMELINE_COLLEGE
    : TRAINING_TIMELINE_STANDARD;
}

export function findWorkerTaskTemplate(task) {
  const taskId = String(task?.id || "").trim();
  if (taskId && WORKER_TASK_TEMPLATES_BY_ID.has(taskId)) {
    return WORKER_TASK_TEMPLATES_BY_ID.get(taskId) || null;
  }

  const normalizedTitle = normalizeTaskTitle(task?.title);
  const byTitle = WORKER_TASK_TEMPLATES_BY_TITLE.get(normalizedTitle);
  if (byTitle) return byTitle;

  const legacyId = LEGACY_TITLE_TO_TEMPLATE_ID.get(normalizedTitle);
  if (legacyId && WORKER_TASK_TEMPLATES_BY_ID.has(legacyId)) {
    return WORKER_TASK_TEMPLATES_BY_ID.get(legacyId) || null;
  }

  const altId = ALTERNATE_WORKER_TASK_TITLE_TO_TEMPLATE_ID.get(normalizedTitle);
  if (altId && WORKER_TASK_TEMPLATES_BY_ID.has(altId)) {
    return WORKER_TASK_TEMPLATES_BY_ID.get(altId) || null;
  }
  return null;
}

/** Passport / ID upload task (template id), including MA alternate titles. */
export function isWorkerPassportUploadTask(task) {
  return findWorkerTaskTemplate(task)?.id === "worker-task-upload-passport";
}

export function isWorkerVisaUploadTask(task) {
  return findWorkerTaskTemplate(task)?.id === "worker-task-upload-visa";
}

export function isWorkerPassportOrVisaUploadTask(task) {
  return isWorkerPassportUploadTask(task) || isWorkerVisaUploadTask(task);
}

/** Worker Docs upload slot → matching trip task (template or custom "Upload …"). */
export function findWorkerDocumentUploadTask(documentTypeKey, tasks, options = {}) {
  const key = String(documentTypeKey || "").trim().toLowerCase();
  const list = tasks || [];

  if (key === "passport") {
    return list.find((task) => findWorkerTaskTemplate(task)?.id === "worker-task-upload-passport") || null;
  }
  if (key === "visa") {
    return list.find((task) => findWorkerTaskTemplate(task)?.id === "worker-task-upload-visa") || null;
  }

  const label = getUserDocumentTypeLabel(key, options.participantDocumentTypes, options);
  const targetTitle = normalizeTaskTitle(`Upload ${label}`);
  return list.find((task) => normalizeTaskTitle(task.title) === targetTitle) || null;
}

/** Title shown in UI (MA domestic uses ID wording + percent fundraising milestones). */
export function getWorkerTaskDisplayTitle(task, location) {
  const raw = String(task?.title || "").trim();
  const tpl = findWorkerTaskTemplate(task);
  if (!tpl || !isUsMassachusettsMissionSite(location)) return raw;
  if (tpl.id === "worker-task-passport") {
    return "Has government-issued photo ID valid through end of LST project";
  }
  if (tpl.id === "worker-task-upload-passport") {
    return "Upload government ID";
  }
  if (tpl.id === "worker-task-fundraising-2000") {
    return "50% of fundraising due 90 days before departure";
  }
  if (tpl.id === "worker-task-fundraising-all") {
    return "50% of fundraising due 30 days prior to departure";
  }
  return raw;
}

export function computeWorkerTaskDueDate(task, { startDate, trainingTimelineType } = {}) {
  const template = findWorkerTaskTemplate(task);
  if (!template?.dueRule) return null;

  const normalizedTimeline = normalizeTrainingTimelineType(trainingTimelineType);

  switch (template.dueRule) {
    case "application":
      return subtractDays(startDate, 162);
    case "passport":
      return subtractDays(startDate, 33);
    case "passport-upload":
      return subtractDays(startDate, 90);
    case "visa":
      return subtractDays(startDate, 23);
    case "visa-upload":
      return subtractDays(startDate, 30);
    case "pre-departure":
      return subtractDays(startDate, 21);
    case "travel-form":
      return subtractDays(startDate, 90);
    case "60-days-before":
      return subtractDays(startDate, 60);
    case "fundraising-60":
      return subtractDays(startDate, 60);
    case "fundraising-90":
      return subtractDays(startDate, 90);
    case "fundraising-30":
      return subtractDays(startDate, 30);
    case "training-start":
      return normalizedTimeline === TRAINING_TIMELINE_COLLEGE
        ? buildCollegeTimelineDate(startDate, "kickoff")
        : subtractDays(startDate, 90);
    case "training-complete":
      return normalizedTimeline === TRAINING_TIMELINE_COLLEGE
        ? buildCollegeTimelineDate(startDate, "completion")
        : subtractDays(startDate, 30);
    default:
      return null;
  }
}

function normalizeTaskTitle(value) {
  return String(value || "").trim().toLowerCase();
}

function subtractDays(startDate, daysBeforeStart) {
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

function buildCollegeTimelineDate(startDate, milestone) {
  if (!startDate) return null;

  const parsedStartDate = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(parsedStartDate.getTime())) {
    return null;
  }

  const departureYear = parsedStartDate.getUTCFullYear();

  if (milestone === "kickoff") {
    return `${departureYear - 1}-11-01`;
  }

  if (milestone === "completion") {
    return `${departureYear}-04-01`;
  }

  return null;
}
