/** Hardcoded demo data for the Training Center prototype — no backend. */

export const PROTOTYPE_LABEL = "Prototype";

export const TRAINING_CENTER_PROTOTYPE_MODULE = {
  id: "proto-team-readiness",
  title: "Module 3 — Team Readiness",
  subtitle: "5 sections + quiz · ~25 min",
  initialStatus: "in_progress",
};

export const TRAINING_CENTER_PROTOTYPE_VIDEO = {
  title: "Safety Overview",
  description:
    "Sample embedded video layout. The player below is a public YouTube demo — not your real training video.",
  embedUrl: "https://www.youtube-nocookie.com/embed/ScMzIvxBSi4",
};

export const TRAINING_CENTER_PROTOTYPE_SECTIONS = [
  {
    id: "s1",
    title: "Section 1 — Introduction",
    body:
      "Overview of how your team will work together onsite. This section uses simple readable paragraphs so workers can scan the lesson quickly before opening the full session view.",
    fullSessionBlocks: [
      {
        heading: "Welcome to Team Readiness",
        body:
          "Before you travel, your team aligns on roles, communication, and daily rhythms. This prototype shows how that content could appear as readable text inside the Hub.",
      },
      {
        heading: "What you will cover",
        body:
          "You will review team roles, watch a short safety clip, walk through a pre-departure checklist, and finish with a brief knowledge check. Nothing here is saved to the database.",
      },
    ],
  },
  {
    id: "s2",
    title: "Section 2 — Roles on the team",
    body:
      "Every member contributes to session flow, logistics, and encouragement. Leaders coordinate schedules; all workers participate in reading sessions.",
    fullSessionBlocks: [
      {
        heading: "Leader responsibilities",
        body:
          "Team leaders coordinate logistics, communicate with LST staff, and help the group stay on schedule during the project.",
      },
      {
        heading: "Worker responsibilities",
        body:
          "Workers prepare for sessions, support teammates, and complete assigned Hub tasks before departure. In production, completion would sync to the trip checklist.",
      },
    ],
  },
  {
    id: "s3",
    title: "Section 3 — Safety overview (video)",
    body:
      "Watch a short sample clip below. In production, this would be your real training video embedded in the lesson.",
    showVideo: true,
    fullSessionBlocks: [
      {
        heading: "Before you watch",
        body:
          "Use the embedded player to preview how video lessons could appear inside a module section. Mark as watched is demo-only.",
      },
    ],
  },
  {
    id: "s4",
    title: "Section 4 — Before you go checklist",
    body:
      "Passport copied · Emergency contact saved · Team meeting scheduled · Prayer partners identified",
    fullSessionBlocks: [
      {
        heading: "Pre-departure checklist",
        body:
          "Confirm travel documents, emergency contacts, team meetings, and prayer support before you leave. Check items off in production; here they are sample text only.",
      },
      {
        heading: "Share with your leader",
        body:
          "Leaders may ask for confirmation that each item is complete. This section shows how checklist-style content could be formatted in the Training Center.",
      },
    ],
  },
  {
    id: "s5",
    title: "Section 5 — Module quiz",
    body: "Complete the quiz to finish this module. Answers are not graded or saved.",
    isQuiz: true,
  },
];

export const TRAINING_CENTER_PROTOTYPE_QUIZ = [
  {
    id: "q1",
    prompt: "Who is responsible for coordinating daily team logistics onsite?",
    options: ["Only the youngest worker", "The team leader", "The travel agency", "No one — it happens automatically"],
    correctIndex: 1,
  },
  {
    id: "q2",
    prompt: "When should workers complete required Hub training?",
    options: ["After returning home", "Before departure", "Only if asked", "Never"],
    correctIndex: 1,
  },
  {
    id: "q3",
    prompt: "What does this prototype demonstrate?",
    options: [
      "Live production training data",
      "A demo UI with mock progress only",
      "Automatic quiz grading in the database",
      "Worker-facing edits to real modules",
    ],
    correctIndex: 1,
  },
];

export const TRAINING_OVERVIEW_PROTOTYPE_WORKERS = [
  { id: "w1", name: "Alex Rivera", role: "Worker", modulesComplete: 3, modulesTotal: 5, percent: 60, status: "in_progress" },
  { id: "w2", name: "Jordan Lee", role: "Worker", modulesComplete: 5, modulesTotal: 5, percent: 100, status: "completed" },
  { id: "w3", name: "Sam Patel", role: "Team Leader", modulesComplete: 2, modulesTotal: 5, percent: 40, status: "in_progress" },
  { id: "w4", name: "Taylor Brooks", role: "Worker", modulesComplete: 0, modulesTotal: 5, percent: 0, status: "not_started" },
  { id: "w5", name: "Casey Nguyen", role: "Worker", modulesComplete: 4, modulesTotal: 5, percent: 80, status: "in_progress" },
];

export const TRAINING_GRADEBOOK_PROTOTYPE_QUIZ = {
  id: "team-readiness-quiz",
  title: "Module 3 — Team Readiness Quiz",
  questionCount: 3,
};

export const TRAINING_GRADEBOOK_PROTOTYPE_ROWS = [
  {
    workerId: "w1",
    name: "Alex Rivera",
    role: "Worker",
    submittedAt: "2026-06-10",
    scorePercent: 67,
    correctCount: 2,
    questionCount: 3,
    letterGrade: "D+",
    status: "graded",
  },
  {
    workerId: "w2",
    name: "Jordan Lee",
    role: "Worker",
    submittedAt: "2026-06-08",
    scorePercent: 100,
    correctCount: 3,
    questionCount: 3,
    letterGrade: "A",
    status: "graded",
  },
  {
    workerId: "w3",
    name: "Sam Patel",
    role: "Team Leader",
    submittedAt: "2026-06-11",
    scorePercent: 33,
    correctCount: 1,
    questionCount: 3,
    letterGrade: "F",
    status: "graded",
  },
  {
    workerId: "w4",
    name: "Taylor Brooks",
    role: "Worker",
    submittedAt: "",
    scorePercent: null,
    correctCount: null,
    questionCount: 3,
    letterGrade: "—",
    status: "not_started",
  },
  {
    workerId: "w5",
    name: "Casey Nguyen",
    role: "Worker",
    submittedAt: "2026-06-12",
    scorePercent: 83,
    correctCount: 2,
    questionCount: 3,
    letterGrade: "B",
    status: "graded",
  },
];

export const TRAINING_GRADEBOOK_STATUS_META = {
  graded: { label: "Graded", badge: "badgeSuccess" },
  not_started: { label: "Not submitted", badge: "badgeWarn" },
  in_progress: { label: "In progress", badge: "badgeInfo" },
};

export const PROTOTYPE_STATUS_META = {
  completed: { label: "Completed", badge: "badgeSuccess" },
  in_progress: { label: "In Progress", badge: "badgeInfo" },
  not_started: { label: "Not Started", badge: "badgeWarn" },
};

export function computePrototypeSectionProgress(completedSectionIds = {}) {
  const sections = TRAINING_CENTER_PROTOTYPE_SECTIONS;
  const total = sections.length;
  const completed = sections.filter((section) => completedSectionIds[section.id]).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percent };
}

export function getPrototypeModuleStatus(completedSectionIds = {}) {
  const { completed, total } = computePrototypeSectionProgress(completedSectionIds);
  if (completed === 0) return "not_started";
  if (completed >= total) return "completed";
  return "in_progress";
}

export function getNextPrototypeSectionId(sectionId) {
  const index = TRAINING_CENTER_PROTOTYPE_SECTIONS.findIndex((section) => section.id === sectionId);
  if (index < 0) return null;
  return TRAINING_CENTER_PROTOTYPE_SECTIONS[index + 1]?.id || null;
}

export function getPrototypeSectionById(sectionId) {
  return TRAINING_CENTER_PROTOTYPE_SECTIONS.find((section) => section.id === sectionId) || null;
}

/** @deprecated Use section-based progress in the trip prototype panel. */
export const TRAINING_CENTER_PROTOTYPE_MODULES = [TRAINING_CENTER_PROTOTYPE_MODULE];

export function computePrototypeProgress(completedSectionIds = {}) {
  return computePrototypeSectionProgress(completedSectionIds);
}
