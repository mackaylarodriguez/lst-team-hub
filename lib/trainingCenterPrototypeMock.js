/** Hardcoded demo data for the Training Center prototype — no backend. */

export const PROTOTYPE_LABEL = "Prototype";

export const TRAINING_CENTER_PROTOTYPE_MODULES = [
  {
    id: "proto-written",
    title: "Module 1 — Welcome & Expectations",
    subtitle: "Written content · ~8 min",
    type: "written",
    initialStatus: "completed",
  },
  {
    id: "proto-video",
    title: "Module 2 — Safety Overview (Video)",
    subtitle: "Video lesson · ~12 min",
    type: "video",
    initialStatus: "in_progress",
  },
  {
    id: "proto-multi",
    title: "Module 3 — Team Readiness",
    subtitle: "5 sections + quiz · ~25 min",
    type: "multi",
    initialStatus: "not_started",
  },
];

export const TRAINING_CENTER_PROTOTYPE_WRITTEN = {
  title: "Welcome & Expectations",
  sections: [
    {
      heading: "Why this training exists",
      body:
        "This prototype shows how written lessons could appear inside the Hub. Workers would read short sections, then continue to the next part of the course.",
    },
    {
      heading: "What to expect on your project",
      body:
        "Teams prepare together before departure. You will practice reading sessions, learn cultural basics, and confirm logistics with your leader. None of this text is saved — it is sample content only.",
    },
    {
      heading: "Your next step",
      body:
        "When you are ready, use Continue to simulate marking this lesson complete. In production, progress would sync to your trip checklist.",
    },
  ],
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
    body: "Overview of how your team will work together onsite. This section uses simple readable paragraphs inside a collapsible block.",
  },
  {
    id: "s2",
    title: "Section 2 — Roles on the team",
    body: "Every member contributes to session flow, logistics, and encouragement. Leaders coordinate; all workers participate in reading sessions.",
  },
  {
    id: "s3",
    title: "Section 3 — Quick video clip",
    body: "A short video could appear here in production. For this prototype, imagine a 3-minute clip embedded below this text.",
    showVideoPlaceholder: true,
  },
  {
    id: "s4",
    title: "Section 4 — Before you go checklist",
    body: "Passport copied · Emergency contact saved · Team meeting scheduled · Prayer partners identified",
  },
  {
    id: "s5",
    title: "Section 5 — Module quiz",
    body: "Complete the quiz below to finish this module. Answers are not graded or saved.",
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
  { id: "w1", name: "Alex Rivera", role: "Worker", modulesComplete: 2, modulesTotal: 3, percent: 67, status: "in_progress" },
  { id: "w2", name: "Jordan Lee", role: "Worker", modulesComplete: 3, modulesTotal: 3, percent: 100, status: "completed" },
  { id: "w3", name: "Sam Patel", role: "Team Leader", modulesComplete: 1, modulesTotal: 3, percent: 33, status: "in_progress" },
  { id: "w4", name: "Taylor Brooks", role: "Worker", modulesComplete: 0, modulesTotal: 3, percent: 0, status: "not_started" },
  { id: "w5", name: "Casey Nguyen", role: "Worker", modulesComplete: 2, modulesTotal: 3, percent: 67, status: "in_progress" },
];

export const PROTOTYPE_STATUS_META = {
  completed: { label: "Completed", badge: "badgeSuccess" },
  in_progress: { label: "In Progress", badge: "badgeInfo" },
  not_started: { label: "Not Started", badge: "badgeWarn" },
};

export function computePrototypeProgress(statusByModuleId) {
  const modules = TRAINING_CENTER_PROTOTYPE_MODULES;
  const total = modules.length;
  const completed = modules.filter((m) => statusByModuleId[m.id] === "completed").length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percent };
}
