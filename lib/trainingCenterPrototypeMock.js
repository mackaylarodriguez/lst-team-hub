/** Hardcoded demo data for the Training Center prototype — no backend. */

export const PROTOTYPE_LABEL = "Prototype";

/** Sample trip start used to explain future deadline rules in the prototype UI. */
export const TRAINING_PROTOTYPE_SAMPLE_TRIP_START = "2026-10-17";

export function formatPrototypeDueDate(ymd) {
  if (!ymd) return "—";
  const date = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(date.getTime())) return ymd;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export const TRAINING_PROTOTYPE_DEADLINE_RULES_PREVIEW = [
  {
    module: "Module 1 — Welcome to LST Training",
    rule: "90 days before trip start",
    sampleDueDate: "2026-07-19",
  },
  {
    module: "Module 2 — Fundraising",
    rule: "90 days before trip start",
    sampleDueDate: "2026-07-19",
  },
  {
    module: "Module 3 — Team Dynamics",
    rule: "60 days before trip start",
    sampleDueDate: "2026-08-18",
  },
  {
    module: "Module 4 — Culture",
    rule: "60 days before trip start",
    sampleDueDate: "2026-08-18",
  },
  {
    module: "Module 5 — Making LST Work Onsite",
    rule: "60 days before trip start",
    sampleDueDate: "2026-08-18",
  },
  {
    module: "Module 6 — Onsite Tools",
    rule: "30 days before trip start",
    sampleDueDate: "2026-09-17",
  },
  {
    module: "Module 7 — Debriefing and Reentry",
    rule: "30 days before trip start",
    sampleDueDate: "2026-09-17",
  },
  {
    module: "Basic Training",
    rule: "3 months before trip start",
    sampleDueDate: "2026-07-17",
  },
  {
    module: "Gateway Training",
    rule: "1 month before trip start",
    sampleDueDate: "2026-09-17",
  },
];

export const TRAINING_CENTER_PROTOTYPE_VIDEO = {
  title: "Safety Overview",
  description:
    "Sample embedded video layout. The player below is a public YouTube demo — not your real training video.",
  embedUrl: "https://www.youtube-nocookie.com/embed/ScMzIvxBSi4",
};

const TRAINING_CENTER_PROTOTYPE_MODULE_1_SECTIONS = [
  {
    id: "s1",
    title: "Section 1 — Introduction",
    dueDate: "2026-07-26",
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
    dueDate: "2026-08-04",
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
    dueDate: "2026-08-11",
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
    dueDate: "2026-08-18",
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
    dueDate: "2026-08-18",
    body: "Complete the quiz to finish this module. Answers are not graded or saved.",
    isQuiz: true,
  },
];

const TRAINING_CENTER_PROTOTYPE_MODULE_2_SECTIONS = [
  {
    id: "m2s1",
    title: "Section 1 — Packing essentials",
    dueDate: "2026-07-19",
    body:
      "Pack light, label your bags, and keep one outfit and medications in your carry-on. Leaders may share a team packing list before departure.",
    fullSessionBlocks: [
      {
        heading: "What to bring",
        body:
          "Bring comfortable clothes for work sessions, modest options for church visits, and sturdy shoes. Keep copies of important documents separate from originals.",
      },
      {
        heading: "What to leave home",
        body:
          "Avoid bringing expensive jewelry or unnecessary electronics. Focus on items that support the team and the work you will do onsite.",
      },
    ],
  },
  {
    id: "m2s2",
    title: "Section 2 — Travel documents",
    dueDate: "2026-07-26",
    body:
      "Confirm passport validity, visa requirements, and emergency contact details before your departure date.",
    fullSessionBlocks: [
      {
        heading: "Passport and visa",
        body:
          "Check expiration dates early. Some destinations require passports valid for six months beyond your return date.",
      },
      {
        heading: "Emergency contacts",
        body:
          "Save LST staff numbers, your team leader, and a home contact in your phone and on paper.",
      },
    ],
  },
  {
    id: "m2s3",
    title: "Section 3 — Health and safety basics",
    dueDate: "2026-08-04",
    body:
      "Review recommended vaccinations, travel insurance, and basic hygiene practices for international travel.",
    fullSessionBlocks: [
      {
        heading: "Before you leave",
        body:
          "Consult your doctor about recommended vaccines and medications. Confirm whether your insurance covers international travel.",
      },
      {
        heading: "While traveling",
        body:
          "Stay hydrated, wash hands often, and follow your team leader's guidance about food and water safety onsite.",
      },
    ],
  },
];

export const TRAINING_CENTER_PROTOTYPE_MODULES = [
  {
    id: "proto-module-1",
    title: "Module 1 — Team Readiness",
    subtitle: "5 sections + quiz · ~25 min",
    initialStatus: "in_progress",
    dueDate: "2026-08-18",
    dueDateRule: "60 days before trip start (sample)",
    sections: TRAINING_CENTER_PROTOTYPE_MODULE_1_SECTIONS,
  },
  {
    id: "proto-module-2",
    title: "Module 2 — Trip Preparation",
    subtitle: "3 sections · ~15 min",
    initialStatus: "not_started",
    dueDate: "2026-07-19",
    dueDateRule: "90 days before trip start (sample)",
    sections: TRAINING_CENTER_PROTOTYPE_MODULE_2_SECTIONS,
  },
];

/** @deprecated Use TRAINING_CENTER_PROTOTYPE_MODULES[0] */
export const TRAINING_CENTER_PROTOTYPE_MODULE = TRAINING_CENTER_PROTOTYPE_MODULES[0];

/** @deprecated Use module.sections from TRAINING_CENTER_PROTOTYPE_MODULES */
export const TRAINING_CENTER_PROTOTYPE_SECTIONS = TRAINING_CENTER_PROTOTYPE_MODULE_1_SECTIONS;

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

export const TRAINING_PROTOTYPE_SECTIONS_TOTAL = 7;

export const TRAINING_PROTOTYPE_MODULE_LABELS = [
  "Module 1",
  "Module 2",
  "Module 3",
  "Module 4",
  "Module 5",
  "Module 6",
  "Module 7",
];

export const TRAINING_OVERVIEW_PROTOTYPE_WORKERS = [
  {
    id: "w1",
    name: "Alex Rivera",
    tripName: "Summer Reading 2026",
    siteLocation: "San José, Costa Rica",
    role: "Worker",
    sectionsComplete: 5,
  },
  {
    id: "w2",
    name: "Jordan Lee",
    tripName: "Summer Reading 2026",
    siteLocation: "San José, Costa Rica",
    role: "Worker",
    sectionsComplete: 7,
  },
  {
    id: "w3",
    name: "Sam Patel",
    tripName: "Gateway Outreach 2026",
    siteLocation: "Kingston, Jamaica",
    role: "Team Leader",
    sectionsComplete: 4,
  },
  {
    id: "w4",
    name: "Taylor Brooks",
    tripName: "Youth Camp 2026",
    siteLocation: "Lima, Peru",
    role: "Worker",
    sectionsComplete: 0,
  },
  {
    id: "w5",
    name: "Casey Nguyen",
    tripName: "Summer Reading 2026",
    siteLocation: "San José, Costa Rica",
    role: "Worker",
    sectionsComplete: 6,
  },
  {
    id: "w6",
    name: "Riley Chen",
    tripName: "Gateway Outreach 2026",
    siteLocation: "Kingston, Jamaica",
    role: "Worker",
    sectionsComplete: 3,
  },
];

export const TRAINING_GRADEBOOK_PROTOTYPE_ROWS = [
  {
    id: "w1",
    name: "Alex Rivera",
    tripName: "Summer Reading 2026",
    siteLocation: "San José, Costa Rica",
    modulesComplete: [true, true, true, true, true, false, false],
  },
  {
    id: "w2",
    name: "Jordan Lee",
    tripName: "Summer Reading 2026",
    siteLocation: "San José, Costa Rica",
    modulesComplete: [true, true, true, true, true, true, true],
  },
  {
    id: "w3",
    name: "Sam Patel",
    tripName: "Gateway Outreach 2026",
    siteLocation: "Kingston, Jamaica",
    modulesComplete: [true, true, true, true, false, false, false],
  },
  {
    id: "w4",
    name: "Taylor Brooks",
    tripName: "Youth Camp 2026",
    siteLocation: "Lima, Peru",
    modulesComplete: [false, false, false, false, false, false, false],
  },
  {
    id: "w5",
    name: "Casey Nguyen",
    tripName: "Summer Reading 2026",
    siteLocation: "San José, Costa Rica",
    modulesComplete: [true, true, true, true, true, true, false],
  },
  {
    id: "w6",
    name: "Riley Chen",
    tripName: "Gateway Outreach 2026",
    siteLocation: "Kingston, Jamaica",
    modulesComplete: [true, true, true, false, false, false, false],
  },
];

/** @deprecated Gradebook prototype now uses pass/fail module columns only. */
export const TRAINING_GRADEBOOK_PROTOTYPE_QUIZ = {
  id: "team-readiness-quiz",
  title: "Module 1 — Team Readiness Quiz",
  questionCount: 3,
  dueDate: "2026-08-18",
  dueDateRule: "60 days before trip start (sample)",
};

/** @deprecated Gradebook prototype now uses pass/fail module columns only. */
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

export function getAllPrototypeSections() {
  return TRAINING_CENTER_PROTOTYPE_MODULES.flatMap((module) => module.sections);
}

export function getPrototypeModuleById(moduleId) {
  return TRAINING_CENTER_PROTOTYPE_MODULES.find((module) => module.id === moduleId) || null;
}

export function computePrototypeSectionProgress(completedSectionIds = {}, moduleId = null) {
  const sections = moduleId
    ? getPrototypeModuleById(moduleId)?.sections || []
    : getAllPrototypeSections();
  const total = sections.length;
  const completed = sections.filter((section) => completedSectionIds[section.id]).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percent };
}

export function getPrototypeModuleStatus(completedSectionIds = {}, module = null) {
  const sections = module?.sections || getAllPrototypeSections();
  const total = sections.length;
  const completed = sections.filter((section) => completedSectionIds[section.id]).length;
  if (completed === 0) return "not_started";
  if (completed >= total) return "completed";
  return "in_progress";
}

export function getNextPrototypeSectionId(sectionId, moduleId) {
  const module = getPrototypeModuleById(moduleId);
  if (!module) return null;
  const index = module.sections.findIndex((section) => section.id === sectionId);
  if (index < 0) return null;
  return module.sections[index + 1]?.id || null;
}

export function getPrototypeSectionById(sectionId) {
  for (const module of TRAINING_CENTER_PROTOTYPE_MODULES) {
    const section = module.sections.find((item) => item.id === sectionId);
    if (section) return { ...section, moduleId: module.id };
  }
  return null;
}

export function computePrototypeProgress(completedSectionIds = {}) {
  return computePrototypeSectionProgress(completedSectionIds);
}
