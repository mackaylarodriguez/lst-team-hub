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
    module: "Module 2 - Fundraising",
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

export const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_EMBED_URL =
  "https://www.youtube-nocookie.com/embed/wo6tugc2rQI";

export const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE_URL =
  "https://lst365.sharepoint.com/Training/Forms/AllItems.aspx?id=%2FTraining%2FLST%20International%20Projects%20Training%2FTeam%20Training%2FCurrent%20LST%20Team%20Training%20Components%2FNew%2DRevised%20Version%20of%20Team%20Training%2FFundraising%2FFundraisingGuide%5FLST%5F2022%2Epdf&parent=%2FTraining%2FLST%20International%20Projects%20Training%2FTeam%20Training%2FCurrent%20LST%20Team%20Training%20Components%2FNew%2DRevised%20Version%20of%20Team%20Training%2FFundraising&p=true&ga=1";

export const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_FINANCIAL_INFO_URL =
  "https://lst.org/projects/general-financial-information/";

export function resolvePrototypeSectionVideoEmbed(section) {
  return section?.videoEmbedUrl || TRAINING_CENTER_PROTOTYPE_VIDEO.embedUrl;
}

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

const TRAINING_CENTER_PROTOTYPE_BALANCING_TEAM_TRAINING = `We value not just training, but training TEAMS. The advantage of an online platform is that all of your training is available to you whenever you want and wherever you are. The disadvantage of an online platform is that it may actually work against the team-aspect of our training as individuals focus only on getting through the training themselves. **We want to hold up both values - highly accessible training content and the formation of excellent teams.**

So, we're making a commitment to getting you excellent content in a way that's extremely accessible, but also calling you to regular times of training with your team.

Here's how we see this working out:

**Option 1 - Team Meetings as Primary Training Point**
In this approach, the team meets together to go through all of the items available in this online platform. Rather than doing work ahead of time, or viewing the video content prior to meeting, the team meeting is the primary place where the team engages the LST training.

In this model we anticipate everyone bringing the training on their mobile device so they can refer to group discussions, team activities, and/or training handouts. But they watch the videos together as the trainer puts that content up on a tv or larger monitor for all to see.

**Option 2 - Team Meetings as Secondary Training Point**
In this approach, team members individually go through the content of each module, but then meet together to review content and make any team decisions necessary at that point in their training. The team meeting is still important, but it's not the only point (or even the primary point) where the team is taking in the training content.

In either approach the training can be approached one session at a time, or they may choose to batch the training into fewer team meetings.`;

const TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_COMPONENTS = `**Team Training Components**
When teams come together for training, in addition to covering/reviewing the actual information in that session, we encourage them to also utilize the following two components:

**Conduct a Cultural Clue**
These fun clues are meant to help your team learn to be flexible and be ready for the cultural differences they will likely encounter. The exercises can be a fun way to prepare them to have relationships with people from other cultures different from their own.

Anytime you do one of these cultural clues, take time afterwards to discuss how it made people feel, why some did/did not participate, and what our reaction to the clue has to say about how we may behave in other unfamiliar or uncomfortable situations.

Some of these clues will make people feel silly or uncomfortable. When that happens, see it as an opportunity to talk about how silly we can feel doing something foreign to us. Remind people that while it may feel silly, refusing to participate in another custom may make us come across as rude. Use these to have fun, but also to help each other learn.

**Here are some examples:**
- As people come in, ask the males to stand and the females to sit. Do this at least until the devotional ends. Discuss reactions.
- When the first person enters kiss her on each cheek. Ask that person in turn to help you greet the next person with a similar greeting. Encourage everyone as they come in to greet each other in this way. Discuss reactions later.
- As people enter, greet them with a sturdy shake of the hands, but do not hug. Ask each person to greet the others in this way. Discuss reactions later.
- As the first couple of people enter, ask them to remove one shoe while leaving the other one on. See if the others notice this and follow suite. Discuss reactions later.
- Once people arrive serve them something to drink; but only serve dark, strong coffee. Do not ask if they want it, just serve it to them with a smile. Discuss reactions at the appropriate time.
- Serve some strange, unusual (smelly!) food on crackers. Don't tell people what it is, and don't force people to eat it. Discuss reactions as usual.
- Gather as many hats/caps as possible. Wear one. Line them up in a prominent place. As people arrive, give each one a special hat. Discuss reactions.
- Greet the first couple of people with a bow and ask them in turn to greet others in this manner. Discuss reactions.
- Take 10 minutes of the training session to have everyone crowd into the bathroom, a closet, or a small foyer. This is a very difficult activity! It is also very similar to many a bus or streetcar ride in many countries.
- Adjust the temperature so that the room is either uncomfortably cold or hot. Climate control is something that many of us are accustomed to, but it is a luxury that is often not available in most parts of the world.

**REMOTE TEAMS**
- Before you meet each of you adjust something in your background and see if your other team members can spot the change.
- Tell each team member to purchase something they've never eaten before, bring it (uneaten) to the next online meeting, and eat it live during the session.
- Each team member must find a symbol or icon meaningful to their host culture. Draw it out as a "badge" and wear it to the next meeting. See if team members can guess the icon and it's meaning.
- Discover the word or phrase for "Thank You" in the language of your site. At your next session each team member must use that word or phrase profusely! In that training session you are a team full of thanks for everything, but you express it in the language of your site.

**Conduct a Team Devotional**
Every time you gather for team training you'll have a team devotional. This will be the foundation of every training session with LST. Keep it short but meaningful (10-15 minutes). Feel free to structure a time of worship that fits your group!`;

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
    body: TRAINING_CENTER_PROTOTYPE_BALANCING_TEAM_TRAINING,
    fullSessionBlocks: [
      {
        heading: "Balancing team training and online content",
        body: TRAINING_CENTER_PROTOTYPE_BALANCING_TEAM_TRAINING,
      },
    ],
  },
  {
    id: "s5",
    title: "Welcome: Team Training Components",
    dueDate: "2026-08-18",
    body: TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_COMPONENTS,
    fullSessionBlocks: [
      {
        heading: "Team training components",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_COMPONENTS,
      },
    ],
  },
];

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_OVERVIEW = `Fundraising is SO MUCH MORE than just getting money from others so we can do the work. It is a deeply spiritual activity for each of us who are raising the funds. But, it is also a deeply meaningful, and important, exercise for those who are GIVING the funds.

This module contains an encouraging and practical video component as well as LST's "Fundraising Guide" which is full of practical help and will get you started immediately.

**Team Training Reminders:**
When you meet with your team to go over the content of this module, please remember to include the following two items:

**Conduct a Cultural Clue**
Remember, these fun clues are meant to help your team learn to be flexible and be ready for the cultural differences they will likely encounter. The exercises can be a fun way to prepare them to have relationships with people from other cultures different from their own.

Anytime you do one of these cultural clues, take time afterwards to discuss how it made people feel, why some did/did not participate, and what our reaction to the clue has to say about how we may behave in other unfamiliar or uncomfortable situations.

Some of these clues will make people feel silly or uncomfortable. When that happens, see it as an opportunity to talk about how silly we can feel doing something foreign to us. Remind people that while it may feel silly, refusing to participate in another custom may make us come across as rude. Use these to have fun, but also to help each other learn.

Refer to the Welcome Module for ideas or create your own!

**Have a Team Devotional**
Every time you gather for team training you'll have a team devotional. This will be the foundation of every training session with LST. Keep it short but meaningful (10-15 minutes). Feel free to structure a time of worship that fits your group!`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_SUMMARY = `**Video Summary/Discussion: Fundraising**

Part of the key to good fundraising is learning to THINK differently about fundraising.
- We are not begging.
- We are inviting others to participate in life-changing ministry.

_Henri Nouwen said that fundraising is a confident, joyful and hope-filled expression of ministry…and that when ministering to each other, each from the riches that he or she possesses, we work together for the full coming of God's Kingdom._

**Tips about the kind of fundraising attitude that God will bless:**
- Be Committed.
- Be Bold.
- Be Positive.
- Be Confident.

**Discussion:**
- What's your takeaway from this video?
- Which of the attitudes above do you need the most help with? Share with your team and lift these needs up together in prayer.`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE = `We've poured over 40 years of fundraising experience into a succinct Fundraising Guide (linked below). Read through it, create a plan, and get started! What we know without any doubt is the only thing that will stop you from reaching your fundraising goal is if you don't start asking!!

[Fundraising Guide (PDF)](${TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE_URL})

We encourage you to ask donors to donate online (at the personal fundraising page LST created for you). This is an extremely convenient and secure means of donating.`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_FINANCIAL_DETAILS_GENERAL = `As LST's Fundraising Guide notes, before you start raising funds please read over this summary of LST's General Financial Information. You do not need to communicate all these details to your donors. However, it's critical that you understand how LST views the funds you raise, and how LST will utilize those funds.`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_FINANCIAL_DETAILS_DONORS = `Donors should donate to LST on your behalf via the online fundraising page created for you. This is the most secure and most convenient way to give.

If a donor needs to send a physical check, please have them make the check to "Let's Start Talking," include a note that the funds are for your LST Project, and mail it to the following address:`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_WRAPPING_UP = `As you're wrapping up this session please do the following:
- Spend some time in prayer together.
- Schedule your next meeting together.
- Take the Quiz for this module (each person should take it individually with their own account to the training platform).`;

const TRAINING_CENTER_PROTOTYPE_MODULE_2_SECTIONS = [
  {
    id: "m2s1",
    title: "Fundraising: Overview and Instructions",
    dueDate: "2026-07-19",
    body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_OVERVIEW,
    fullSessionBlocks: [
      {
        heading: "Fundraising: Overview and Instructions",
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_OVERVIEW,
      },
    ],
  },
  {
    id: "m2s2",
    title: "Fundraising: How We Think About Fundraising",
    dueDate: "2026-07-26",
    body:
      "Watch this video with your team to explore how LST thinks about fundraising as a spiritual practice for both those who give and those who receive.",
    showVideo: true,
    videoEmbedUrl: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_EMBED_URL,
    fullSessionBlocks: [
      {
        heading: "Fundraising: How We Think About Fundraising",
        body:
          "Watch this video with your team to explore how LST thinks about fundraising as a spiritual practice for both those who give and those who receive.",
      },
    ],
  },
  {
    id: "m2s3",
    title: "Fundraising: Video Summary/Discussion Handout",
    dueDate: "2026-08-02",
    body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_SUMMARY,
    fullSessionBlocks: [
      {
        hideHeading: true,
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_SUMMARY,
      },
    ],
  },
  {
    id: "m2s4",
    title: "Fundraising Guide",
    dueDate: "2026-08-09",
    body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE,
    fullSessionBlocks: [
      {
        heading: "Fundraising Guide",
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE,
      },
    ],
  },
  {
    id: "m2s5",
    title: "Fundraising: Financial Details",
    dueDate: "2026-08-16",
    body: `${TRAINING_CENTER_PROTOTYPE_FUNDRAISING_FINANCIAL_DETAILS_GENERAL}\n\n${TRAINING_CENTER_PROTOTYPE_FUNDRAISING_FINANCIAL_DETAILS_DONORS}`,
    fullSessionBlocks: [
      {
        heading: "General Details",
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_FINANCIAL_DETAILS_GENERAL,
        linkButton: {
          label: "General Financial Information",
          href: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_FINANCIAL_INFO_URL,
        },
      },
      {
        heading: "Where/how donors donate",
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_FINANCIAL_DETAILS_DONORS,
        addressCard: {
          lines: ["Let's Start Talking", "PO Box 55398", "Hurst, TX 76054"],
        },
      },
    ],
  },
  {
    id: "m2s6",
    title: "Fundraising: Wrapping Up",
    dueDate: "2026-08-23",
    body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_WRAPPING_UP,
    fullSessionBlocks: [
      {
        heading: "Fundraising: Wrapping Up",
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_WRAPPING_UP,
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
    title: "Module 2 - Fundraising",
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
