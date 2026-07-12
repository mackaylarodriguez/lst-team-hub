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
    module: "Module 1 - Welcome",
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

const TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO = `**Welcome to Let's Start Talking!** You're starting on a wonderful adventure of faith, and we are so pleased to be sharing in and guiding you through that adventure.

LST helps connect Christians and international friends through friendship, purposeful conversation, and God's powerful word. In other words, LST creates life-changing conversations across the street and around the world!

Every year LST helps local churches in North America reach their international neighbors (LST's FriendSpeak work) and connects North American Christians and international friends online to do LST (LST Connect). In addition to these two programs, we also love sending people on LST Projects!

This training platform will guide you through the training sessions you'll be participating in over the next several weeks. Every year we commit ourselves to sending only well-trained, mature teams to help the ongoing work of select mission sites. We also commit to doing everything possible to ensure that you feel prepared to share your faith once you arrive at your site. The content of this training platform has been designed specifically for the LST experience and communicates important information in a way that is both efficient and engaging. Our training materials reflect over forty years of experience by literally thousands of workers, so you can be confident of the best training possible.

**Even though you'll do your training together as a team, we want you to have access to all the information and exercises whenever you want. When you meet as a team bring your mobile device so you can pull the training up and refer to it as your team is working through the content together.**

May God use you, transform you, and help your team walk in the steps of Jesus as we plant seeds of faith together in every corner of the world.`;

const TRAINING_CENTER_PROTOTYPE_OUTLINE = `Here's a quick overview of all the training you and your team will work through. We've designed it so that it can be accomplished in about 8 weeks.

**Fundraising**
LST's "Fundraising Guide" gets you started immediately!

**Team Dynamics**
Video content on "Team Work" and "Handling Conflict" along with practical handouts

**Culture**
Video content on "What is Culture" and "Adapting to Culture" along with practical handouts

**Making LST Work Onsite**
Video content on "LST Parties," "The Administrative Aspects of Your Project," "Starting and Ending Well," "Communication," and "Risk Management." Lots of helpful handouts too!

**Debriefing and Reentry (LST EndMeeting)**
Framing your experience and talking through next-steps.

**Three additional online workshops:**
In addition to the content in this on-demand platform, you will complete the following additional online training workshops:

- **Basic Training** - This workshop provides the core training you need to be effective in conducting LST sessions with international Friends. This 2.5 hour workshop is offered online twice a month and is led by LST staff. Register with the link in the module below ("LST Staff-Led Components"), and complete this workshop relatively early in your training progress.
- **Gateway Training** – This workshop provides a review of critical training principles, allowing LST staff to gauge the readiness of each team just prior to their departure. This is a two-hour workshop offered once a month online and is led by LST staff. Register with the link in the module below ("LST Staff-Led Components") and complete this workshop approximately one month before your departure.
- **EndMeeting** – This workshop assists LST teams in framing their onsite experience and integrating that experience into their life after the Project. This one-hour workshop is offered at least once a month and is led by LST staff. Register with the link in the module below ("LST Staff-Led Components") and complete this workshop within a month of returning home.`;

const TRAINING_CENTER_PROTOTYPE_TIMELINE_STANDARD = `**Three months from departure**
- Schedule and register for Basic Training, Gateway Training, and EndMeeting
- Module: Welcome to LST Training
- Module: Fundraising
- Workshop: Basic Training; Attend separate Basic Training online workshop.

**Two months from departure**
- Reminder: 60 days from departure $2,000 is due
- Module: Team Dynamics
- Module: Culture
- Module: Making LST Work Onsite

**One month from departure**
- Reminder: 30 days from departure all remaining funds are due
- Module: Making LST Work Onsite: Tools
- Workshop: Gateway Training; Attend separate Gateway Training online workshop
- Module: Debriefing and Reentry

**Departure-->Project-->EndMeeting**`;

const TRAINING_CENTER_PROTOTYPE_TIMELINE_COLLEGE = `**October/November**
- Schedule and register for Basic Training, Gateway Training, and EndMeeting
- Module: Welcome to LST Training
- Module: Fundraising

**January**
- Regather and review after the holiday break
- Workshop: Basic Training; Attend separate Basic Training online workshop.

**February**
- Module: Team Dynamics
- Module: Culture

**March**
- Reminder: 60 days from departure $2,000 is due
- Module: Making LST Work Onsite
- Module: Making LST Work Onsite: Tools

**April**
- Reminder: 30 days from departure all remaining funds are due
- Workshop: Gateway Training; Attend separate Gateway Training online workshop
- Module: Debriefing and Reentry

**May**
**Departure-->Project-->EndMeeting**`;

const TRAINING_CENTER_PROTOTYPE_MODULE_1_SECTIONS = [
  {
    id: "s1",
    title: "Welcome to Let's Start Talking",
    dueDate: "2026-07-26",
    body: TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO,
    fullSessionBlocks: [
      {
        heading: "Welcome to Let's Start Talking",
        body: TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO,
      },
    ],
  },
  {
    id: "s2",
    title: "Welcome: Outline of Training Content",
    dueDate: "2026-08-04",
    body: TRAINING_CENTER_PROTOTYPE_OUTLINE,
    fullSessionBlocks: [
      {
        heading: "Outline of training content",
        body: TRAINING_CENTER_PROTOTYPE_OUTLINE,
      },
    ],
  },
  {
    id: "s3",
    title: "Welcome: Training Timeline",
    dueDate: "2026-08-11",
    body: TRAINING_CENTER_PROTOTYPE_TIMELINE_STANDARD,
    fullSessionBlocks: [
      {
        heading: "Training Timeline: 2-3 months",
        card: true,
        body: TRAINING_CENTER_PROTOTYPE_TIMELINE_STANDARD,
      },
      {
        heading: "Training Timeline: 6+ months (college-student teams)",
        card: true,
        body: TRAINING_CENTER_PROTOTYPE_TIMELINE_COLLEGE,
      },
    ],
  },
  {
    id: "s4",
    title: "Welcome: Balancing Team Training and Online Content",
    dueDate: "2026-08-18",
    body:
      "Team meetings and online modules work together — neither replaces the other.",
    fullSessionBlocks: [
      {
        heading: "Live team training",
        body:
          "Your team leader schedules Basic Training, Gateway, and end-of-trip meetings. Confirm the dates you signed up for on the trip Training tab.",
      },
      {
        heading: "Online content",
        body:
          "Classroom modules and resources in the Hub supplement live sessions. Complete both before departure when your trip checklist requires it.",
      },
    ],
  },
  {
    id: "s5",
    title: "Welcome: Team Training Components",
    dueDate: "2026-08-18",
    body:
      "Team training includes live sessions, Hub modules, registration links, and trip-specific tasks — all tracked in one place.",
    fullSessionBlocks: [
      {
        heading: "Team training components",
        body:
          "Basic Training, Gateway, classroom modules, and worker tasks form the full training path for your trip. Leaders and staff can see completion at a glance.",
      },
      {
        heading: "Share with your leader",
        body:
          "Leaders may ask for confirmation that each component is complete. This section shows how that overview could appear in the Training Center.",
      },
    ],
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
    title: "Module 1 - Welcome",
    initialStatus: "in_progress",
    dueDate: "2026-08-18",
    dueDateRule: "60 days before trip start (sample)",
    sections: TRAINING_CENTER_PROTOTYPE_MODULE_1_SECTIONS,
  },
  {
    id: "proto-module-2",
    title: "Module 2 — Trip Preparation",
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
    tripName: "UT Austin 1",
    siteLocation: "South Korea, Seoul",
    role: "Worker",
    sectionsComplete: 5,
  },
  {
    id: "w2",
    name: "Jordan Lee",
    tripName: "UT Austin 1",
    siteLocation: "South Korea, Seoul",
    role: "Worker",
    sectionsComplete: 7,
  },
  {
    id: "w3",
    name: "Sam Patel",
    tripName: "UT Austin 2",
    siteLocation: "South Korea, Seoul",
    role: "Team Leader",
    sectionsComplete: 4,
  },
  {
    id: "w4",
    name: "Taylor Brooks",
    tripName: "UT Austin 3",
    siteLocation: "South Korea, Seoul",
    role: "Worker",
    sectionsComplete: 0,
  },
  {
    id: "w5",
    name: "Casey Nguyen",
    tripName: "UT Austin 2",
    siteLocation: "South Korea, Seoul",
    role: "Worker",
    sectionsComplete: 6,
  },
  {
    id: "w6",
    name: "Riley Chen",
    tripName: "UT Austin 3",
    siteLocation: "South Korea, Seoul",
    role: "Worker",
    sectionsComplete: 3,
  },
];

export const TRAINING_GRADEBOOK_PROTOTYPE_ROWS = [
  {
    id: "w1",
    name: "Alex Rivera",
    tripName: "UT Austin 1",
    siteLocation: "South Korea, Seoul",
    modulesComplete: [true, true, true, true, true, false, false],
  },
  {
    id: "w2",
    name: "Jordan Lee",
    tripName: "UT Austin 1",
    siteLocation: "South Korea, Seoul",
    modulesComplete: [true, true, true, true, true, true, true],
  },
  {
    id: "w3",
    name: "Sam Patel",
    tripName: "UT Austin 2",
    siteLocation: "South Korea, Seoul",
    modulesComplete: [true, true, true, true, false, false, false],
  },
  {
    id: "w4",
    name: "Taylor Brooks",
    tripName: "UT Austin 3",
    siteLocation: "South Korea, Seoul",
    modulesComplete: [false, false, false, false, false, false, false],
  },
  {
    id: "w5",
    name: "Casey Nguyen",
    tripName: "UT Austin 2",
    siteLocation: "South Korea, Seoul",
    modulesComplete: [true, true, true, true, true, true, false],
  },
  {
    id: "w6",
    name: "Riley Chen",
    tripName: "UT Austin 3",
    siteLocation: "South Korea, Seoul",
    modulesComplete: [true, true, true, false, false, false, false],
  },
];

/** @deprecated Gradebook prototype now uses pass/fail module columns only. */
export const TRAINING_GRADEBOOK_PROTOTYPE_QUIZ = {
  id: "team-readiness-quiz",
  title: "Welcome — Quiz",
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

export function getPreviousPrototypeSectionId(sectionId, moduleId) {
  const module = getPrototypeModuleById(moduleId);
  if (!module) return null;
  const index = module.sections.findIndex((section) => section.id === sectionId);
  if (index <= 0) return null;
  return module.sections[index - 1]?.id || null;
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
