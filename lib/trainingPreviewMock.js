/** Static mock data for staff training layout previews (no backend). */

export const TRAINING_PREVIEW_PROGRESS = {
  completed: 4,
  total: 9,
  percent: 44,
};

export const TRAINING_PREVIEW_CANVAS_UNITS = [
  {
    id: "unit-1",
    title: "Unit 1 — Before You Go",
    subtitle: "3 modules · ~45 min",
    modules: [
      { id: "m1", title: "Welcome & LST Overview", duration: "12 min", status: "complete" },
      { id: "m2", title: "Reading Session Basics", duration: "18 min", status: "complete" },
      { id: "m3", title: "Team Roles & Expectations", duration: "15 min", status: "in_progress" },
    ],
  },
  {
    id: "unit-2",
    title: "Unit 2 — On Site",
    subtitle: "2 modules · ~30 min",
    modules: [
      { id: "m4", title: "Safety & Logistics", duration: "14 min", status: "not_started" },
      { id: "m5", title: "Cultural Awareness", duration: "16 min", status: "not_started" },
    ],
  },
  {
    id: "unit-3",
    title: "Unit 3 — After You Return",
    subtitle: "1 module · ~10 min",
    modules: [
      { id: "m6", title: "Debrief & EndMeeting Prep", duration: "10 min", status: "not_started" },
    ],
  },
];

export const TRAINING_PREVIEW_LIVE_SESSIONS = [
  {
    id: "basic",
    title: "Basic Training",
    description: "Required for new workers. Lead effective reading sessions.",
    due: "2026-03-15",
    status: "not_started",
    sessionLabel: "Choose a session",
  },
  {
    id: "gateway",
    title: "Gateway Training",
    description: "Whole team attends 1–2 months before departure.",
    due: "2026-04-01",
    status: "not_started",
    sessionLabel: "Choose a session",
  },
  {
    id: "endmeeting",
    title: "EndMeeting",
    description: "Team debrief within a week of return.",
    due: "2026-07-15",
    status: "not_started",
    sessionLabel: "Choose a session",
  },
];

export const TRAINING_PREVIEW_OPTIONAL = [
  { id: "advanced", title: "Advanced Training", note: "Optional workshops for experienced workers" },
  { id: "lst-connect", title: "LST Connect", note: "Practice with an online Reader before you leave" },
];

export const TRAINING_STATUS_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
];

export function trainingStatusBadgeClass(status) {
  if (status === "complete") return "badgeSuccess";
  if (status === "in_progress") return "badgeInfo";
  return "badgeDanger";
}

export function trainingStatusLabel(status) {
  if (status === "complete") return "Complete";
  if (status === "in_progress") return "In progress";
  return "Not started";
}
