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

export const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_VIDEO_1_EMBED_URL =
  "https://www.youtube-nocookie.com/embed/Isw6h0TI0xI";

export const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_VIDEO_2_EMBED_URL =
  "https://www.youtube-nocookie.com/embed/MwmoSvkt5-Y";

export const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE_URL =
  "https://lst365.sharepoint.com/Training/Forms/AllItems.aspx?id=%2FTraining%2FLST%20International%20Projects%20Training%2FTeam%20Training%2FCurrent%20LST%20Team%20Training%20Components%2FNew%2DRevised%20Version%20of%20Team%20Training%2FFundraising%2FFundraisingGuide%5FLST%5F2022%2Epdf&parent=%2FTraining%2FLST%20International%20Projects%20Training%2FTeam%20Training%2FCurrent%20LST%20Team%20Training%20Components%2FNew%2DRevised%20Version%20of%20Team%20Training%2FFundraising&p=true&ga=1";

export const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_FINANCIAL_INFO_URL =
  "https://lst.org/projects/general-financial-information/";

export function resolvePrototypeSectionVideoEmbed(section) {
  return section?.videoEmbedUrl || TRAINING_CENTER_PROTOTYPE_VIDEO.embedUrl;
}

const TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO_OPENING = `You're starting on a wonderful adventure of faith, and we are so pleased to be sharing in and guiding you through that adventure.

LST helps connect Christians and international friends through friendship, purposeful conversation, and God's powerful word. In other words, LST creates life-changing conversations across the street and around the world!

Every year LST helps local churches in North America reach their international neighbors (LST's FriendSpeak work) and connects North American Christians and international friends online to do LST (LST Connect). In addition to these two programs, we also love sending people on LST Projects!`;

const TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO_PLATFORM = `This training platform will guide you through the training sessions you'll be participating in over the next several weeks. Every year we commit ourselves to sending only well-trained, mature teams to help the ongoing work of select mission sites. We also commit to doing everything possible to ensure that you feel prepared to share your faith once you arrive at your site. The content of this training platform has been designed specifically for the LST experience and communicates important information in a way that is both efficient and engaging. Our training materials reflect over forty years of experience by literally thousands of workers, so you can be confident of the best training possible.`;

const TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO_REMINDER = `Even though you'll do your training together as a team, we want you to have access to all the information and exercises whenever you want. When you meet as a team bring your mobile device so you can pull the training up and refer to it as your team is working through the content together.`;

const TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO_BLESSING = `May God use you, transform you, and help your team walk in the steps of Jesus as we plant seeds of faith together in every corner of the world.`;

const TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO = `${TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO_OPENING}

${TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO_PLATFORM}

**${TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO_REMINDER}**

${TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO_BLESSING}`;

const TRAINING_CENTER_PROTOTYPE_OUTLINE_INTRO = `Here's a quick overview of all the training you and your team will work through. We've designed it so that it can be accomplished in about 8 weeks.`;

const TRAINING_CENTER_PROTOTYPE_OUTLINE_MODULES = `**Fundraising**
LST's "Fundraising Guide" gets you started immediately!

**Team Dynamics**
Video content on "Team Work" and "Handling Conflict" along with practical handouts

**Culture**
Video content on "What is Culture" and "Adapting to Culture" along with practical handouts

**Making LST Work Onsite**
Video content on "LST Parties," "The Administrative Aspects of Your Project," "Starting and Ending Well," "Communication," and "Risk Management." Lots of helpful handouts too!

**Debriefing and Reentry (LST EndMeeting)**
Framing your experience and talking through next-steps.`;

const TRAINING_CENTER_PROTOTYPE_OUTLINE_WORKSHOPS = `In addition to the content in this on-demand platform, you will complete the following additional online training workshops:

- **Basic Training** - This workshop provides the core training you need to be effective in conducting LST sessions with international Friends. This 2.5 hour workshop is offered online twice a month and is led by LST staff. Register with the link in the module below ("LST Staff-Led Components"), and complete this workshop relatively early in your training progress.
- **Gateway Training** – This workshop provides a review of critical training principles, allowing LST staff to gauge the readiness of each team just prior to their departure. This is a two-hour workshop offered once a month online and is led by LST staff. Register with the link in the module below ("LST Staff-Led Components") and complete this workshop approximately one month before your departure.
- **EndMeeting** – This workshop assists LST teams in framing their onsite experience and integrating that experience into their life after the Project. This one-hour workshop is offered at least once a month and is led by LST staff. Register with the link in the module below ("LST Staff-Led Components") and complete this workshop within a month of returning home.`;

const TRAINING_CENTER_PROTOTYPE_OUTLINE = `${TRAINING_CENTER_PROTOTYPE_OUTLINE_INTRO}

${TRAINING_CENTER_PROTOTYPE_OUTLINE_MODULES}

**Three additional online workshops:**
${TRAINING_CENTER_PROTOTYPE_OUTLINE_WORKSHOPS}`;

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

const TRAINING_CENTER_PROTOTYPE_BALANCING_TEAM_TRAINING_INTRO = `We value not just training, but training TEAMS. The advantage of an online platform is that all of your training is available to you whenever you want and wherever you are. The disadvantage of an online platform is that it may actually work against the team-aspect of our training as individuals focus only on getting through the training themselves. **We want to hold up both values - highly accessible training content and the formation of excellent teams.**

So, we're making a commitment to getting you excellent content in a way that's extremely accessible, but also calling you to regular times of training with your team.

Here's how we see this working out:`;

const TRAINING_CENTER_PROTOTYPE_BALANCING_OPTION_1 = `In this approach, the team meets together to go through all of the items available in this online platform. Rather than doing work ahead of time, or viewing the video content prior to meeting, the team meeting is the primary place where the team engages the LST training.

In this model we anticipate everyone bringing the training on their mobile device so they can refer to group discussions, team activities, and/or training handouts. But they watch the videos together as the trainer puts that content up on a tv or larger monitor for all to see.`;

const TRAINING_CENTER_PROTOTYPE_BALANCING_OPTION_2 = `In this approach, team members individually go through the content of each module, but then meet together to review content and make any team decisions necessary at that point in their training. The team meeting is still important, but it's not the only point (or even the primary point) where the team is taking in the training content.

In either approach the training can be approached one session at a time, or they may choose to batch the training into fewer team meetings.`;

const TRAINING_CENTER_PROTOTYPE_BALANCING_TEAM_TRAINING = `${TRAINING_CENTER_PROTOTYPE_BALANCING_TEAM_TRAINING_INTRO}

**Option 1 - Team Meetings as Primary Training Point**
${TRAINING_CENTER_PROTOTYPE_BALANCING_OPTION_1}

**Option 2 - Team Meetings as Secondary Training Point**
${TRAINING_CENTER_PROTOTYPE_BALANCING_OPTION_2}`;

const TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_COMPONENTS_INTRO = `When teams come together for training, in addition to covering/reviewing the actual information in that session, we encourage them to also utilize the following two components:`;

const TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_CULTURAL_CLUE = `These fun clues are meant to help your team learn to be flexible and be ready for the cultural differences they will likely encounter. The exercises can be a fun way to prepare them to have relationships with people from other cultures different from their own.

Anytime you do one of these cultural clues, take time afterwards to discuss how it made people feel, why some did/did not participate, and what our reaction to the clue has to say about how we may behave in other unfamiliar or uncomfortable situations.

Some of these clues will make people feel silly or uncomfortable. When that happens, see it as an opportunity to talk about how silly we can feel doing something foreign to us. Remind people that while it may feel silly, refusing to participate in another custom may make us come across as rude. Use these to have fun, but also to help each other learn.`;

const TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_CULTURAL_EXAMPLES = `- As people come in, ask the males to stand and the females to sit. Do this at least until the devotional ends. Discuss reactions.
- When the first person enters kiss her on each cheek. Ask that person in turn to help you greet the next person with a similar greeting. Encourage everyone as they come in to greet each other in this way. Discuss reactions later.
- As people enter, greet them with a sturdy shake of the hands, but do not hug. Ask each person to greet the others in this way. Discuss reactions later.
- As the first couple of people enter, ask them to remove one shoe while leaving the other one on. See if the others notice this and follow suite. Discuss reactions later.
- Once people arrive serve them something to drink; but only serve dark, strong coffee. Do not ask if they want it, just serve it to them with a smile. Discuss reactions at the appropriate time.
- Serve some strange, unusual (smelly!) food on crackers. Don't tell people what it is, and don't force people to eat it. Discuss reactions as usual.
- Gather as many hats/caps as possible. Wear one. Line them up in a prominent place. As people arrive, give each one a special hat. Discuss reactions.
- Greet the first couple of people with a bow and ask them in turn to greet others in this manner. Discuss reactions.
- Take 10 minutes of the training session to have everyone crowd into the bathroom, a closet, or a small foyer. This is a very difficult activity! It is also very similar to many a bus or streetcar ride in many countries.
- Adjust the temperature so that the room is either uncomfortably cold or hot. Climate control is something that many of us are accustomed to, but it is a luxury that is often not available in most parts of the world.`;

const TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_REMOTE = `- Before you meet each of you adjust something in your background and see if your other team members can spot the change.
- Tell each team member to purchase something they've never eaten before, bring it (uneaten) to the next online meeting, and eat it live during the session.
- Each team member must find a symbol or icon meaningful to their host culture. Draw it out as a "badge" and wear it to the next meeting. See if team members can guess the icon and it's meaning.
- Discover the word or phrase for "Thank You" in the language of your site. At your next session each team member must use that word or phrase profusely! In that training session you are a team full of thanks for everything, but you express it in the language of your site.`;

const TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_DEVOTIONAL = `Every time you gather for team training you'll have a team devotional. This will be the foundation of every training session with LST. Keep it short but meaningful (10-15 minutes). Feel free to structure a time of worship that fits your group!`;

const TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_COMPONENTS = `**Team Training Components**
${TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_COMPONENTS_INTRO}

**Conduct a Cultural Clue**
${TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_CULTURAL_CLUE}

**Here are some examples:**
${TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_CULTURAL_EXAMPLES}

**REMOTE TEAMS**
${TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_REMOTE}

**Conduct a Team Devotional**
${TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_DEVOTIONAL}`;

const TRAINING_CENTER_PROTOTYPE_MODULE_1_SECTIONS = [
  {
    id: "s1",
    title: "Welcome to Let's Start Talking",
    dueDate: "2026-07-26",
    body: TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO,
    fullSessionBlocks: [
      {
        heading: "Welcome",
        body: `${TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO_OPENING}\n\n${TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO_PLATFORM}\n\n${TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO_BLESSING}`,
        card: true,
      },
      {
        heading: "Bring your device",
        body: TRAINING_CENTER_PROTOTYPE_WELCOME_INTRO_REMINDER,
        card: true,
        cardTone: "reminder",
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
        heading: "Overview",
        body: TRAINING_CENTER_PROTOTYPE_OUTLINE_INTRO,
        card: true,
      },
      {
        heading: "Training modules",
        body: TRAINING_CENTER_PROTOTYPE_OUTLINE_MODULES,
        card: true,
      },
      {
        heading: "Three additional online workshops",
        body: TRAINING_CENTER_PROTOTYPE_OUTLINE_WORKSHOPS,
        card: true,
        cardTone: "reminder",
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
        heading: "Accessible content + excellent teams",
        body: TRAINING_CENTER_PROTOTYPE_BALANCING_TEAM_TRAINING_INTRO,
        card: true,
      },
      {
        heading: "Option 1 — Team meetings as primary",
        body: TRAINING_CENTER_PROTOTYPE_BALANCING_OPTION_1,
        card: true,
      },
      {
        heading: "Option 2 — Team meetings as secondary",
        body: TRAINING_CENTER_PROTOTYPE_BALANCING_OPTION_2,
        card: true,
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
        body: TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_COMPONENTS_INTRO,
        card: true,
      },
      {
        heading: "Conduct a Cultural Clue",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_CULTURAL_CLUE,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Cultural Clue examples",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_CULTURAL_EXAMPLES,
        card: true,
      },
      {
        heading: "Remote teams",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_REMOTE,
        card: true,
      },
      {
        heading: "Have a Team Devotional",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_TRAINING_DEVOTIONAL,
        card: true,
        cardTone: "reminder",
      },
    ],
  },
];

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_OVERVIEW_INTRO = `Fundraising is SO MUCH MORE than just getting money from others so we can do the work. It is a deeply spiritual activity for each of us who are raising the funds. But, it is also a deeply meaningful, and important, exercise for those who are GIVING the funds.

This module contains an encouraging and practical video component as well as LST's "Fundraising Guide" which is full of practical help and will get you started immediately.

When you meet with your team to go over the content of this module, please remember to include the following two items:`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_OVERVIEW_CULTURAL = `Remember, these fun clues are meant to help your team learn to be flexible and be ready for the cultural differences they will likely encounter. The exercises can be a fun way to prepare them to have relationships with people from other cultures different from their own.

Anytime you do one of these cultural clues, take time afterwards to discuss how it made people feel, why some did/did not participate, and what our reaction to the clue has to say about how we may behave in other unfamiliar or uncomfortable situations.

Some of these clues will make people feel silly or uncomfortable. When that happens, see it as an opportunity to talk about how silly we can feel doing something foreign to us. Remind people that while it may feel silly, refusing to participate in another custom may make us come across as rude. Use these to have fun, but also to help each other learn.

Refer to the Welcome Module for ideas or create your own!`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_OVERVIEW_DEVOTIONAL = `Every time you gather for team training you'll have a team devotional. This will be the foundation of every training session with LST. Keep it short but meaningful (10-15 minutes). Feel free to structure a time of worship that fits your group!`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_OVERVIEW = `${TRAINING_CENTER_PROTOTYPE_FUNDRAISING_OVERVIEW_INTRO}

**Team Training Reminders:**

**Conduct a Cultural Clue**
${TRAINING_CENTER_PROTOTYPE_FUNDRAISING_OVERVIEW_CULTURAL}

**Have a Team Devotional**
${TRAINING_CENTER_PROTOTYPE_FUNDRAISING_OVERVIEW_DEVOTIONAL}`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_SUMMARY_THINK = `Part of the key to good fundraising is learning to THINK differently about fundraising.
- We are not begging.
- We are inviting others to participate in life-changing ministry.

_Henri Nouwen said that fundraising is a confident, joyful and hope-filled expression of ministry…and that when ministering to each other, each from the riches that he or she possesses, we work together for the full coming of God's Kingdom._`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_SUMMARY_TIPS = `- Be Committed.
- Be Bold.
- Be Positive.
- Be Confident.`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_SUMMARY_DISCUSSION = `- What's your takeaway from this video?
- Which of the attitudes above do you need the most help with? Share with your team and lift these needs up together in prayer.`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_SUMMARY = `**Video Summary/Discussion: Fundraising**

${TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_SUMMARY_THINK}

**Tips about the kind of fundraising attitude that God will bless:**
${TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_SUMMARY_TIPS}

**Discussion:**
${TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_SUMMARY_DISCUSSION}`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE_INTRO = `We've poured over 40 years of fundraising experience into a succinct Fundraising Guide (linked below). Read through it, create a plan, and get started! What we know without any doubt is the only thing that will stop you from reaching your fundraising goal is if you don't start asking!!`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE_ONLINE = `We encourage you to ask donors to donate online (at the personal fundraising page LST created for you). This is an extremely convenient and secure means of donating.`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE = `${TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE_INTRO}\n\n${TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE_ONLINE}`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_FINANCIAL_DETAILS_GENERAL = `As LST's Fundraising Guide notes, before you start raising funds please read over this summary of LST's General Financial Information. You do not need to communicate all these details to your donors. However, it's critical that you understand how LST views the funds you raise, and how LST will utilize those funds.`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_FINANCIAL_DETAILS_DONORS = `- Donors should donate to LST on your behalf via the online fundraising page created for you. This is the most secure and most convenient way to give.
- If a donor needs to send a physical check, please have them make the check to "Let's Start Talking," include a note that the funds are for your LST Project, and mail it to the following address:`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_WRAPPING_UP = `As you're wrapping up this session please do the following:
- Spend some time in prayer together.
- Schedule your next meeting together.
- Take the Quiz for this module (each person should take it individually with their own account to the training platform).`;

const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_QUIZ = [
  {
    id: "m2q1",
    prompt: "I have watched all video content.",
    options: ["Yes", "No"],
  },
  {
    id: "m2q2",
    prompt: "I have reviewed any written content.",
    options: ["Yes", "No"],
  },
  {
    id: "m2q3",
    prompt: "I have talked with my team about the content of this module.",
    options: ["Yes", "No"],
  },
];

const TRAINING_CENTER_PROTOTYPE_MODULE_2_SECTIONS = [
  {
    id: "m2s1",
    title: "Fundraising: Overview and Instructions",
    dueDate: "2026-07-19",
    body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_OVERVIEW,
    fullSessionBlocks: [
      {
        heading: "Overview",
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_OVERVIEW_INTRO,
        card: true,
      },
      {
        heading: "Conduct a Cultural Clue",
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_OVERVIEW_CULTURAL,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Have a Team Devotional",
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_OVERVIEW_DEVOTIONAL,
        card: true,
        cardTone: "reminder",
      },
    ],
  },
  {
    id: "m2s2",
    title: "Fundraising: How We Think About Fundraising",
    dueDate: "2026-07-26",
    body: "Watch this video with your team on: How We Think About Fundraising",
    showVideo: true,
    videoEmbedUrl: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_EMBED_URL,
    fullSessionBlocks: [
      {
        heading: "Watch",
        body: "Watch this video with your team on: **How We Think About Fundraising**",
        card: true,
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
        heading: "Think differently about fundraising",
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_SUMMARY_THINK,
        card: true,
      },
      {
        heading: "Fundraising attitudes God will bless",
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_SUMMARY_TIPS,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Discussion",
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_VIDEO_SUMMARY_DISCUSSION,
        card: true,
        cardTone: "discuss",
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
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE_INTRO,
        card: true,
        linkButton: {
          label: "Fundraising Guide (PDF)",
          href: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE_URL,
        },
      },
      {
        heading: "Donate online",
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE_ONLINE,
        card: true,
        cardTone: "reminder",
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
        card: true,
        linkButton: {
          label: "General Financial Information",
          href: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_FINANCIAL_INFO_URL,
        },
      },
      {
        heading: "Where/how donors donate",
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_FINANCIAL_DETAILS_DONORS,
        card: true,
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
        heading: "Wrapping Up",
        body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_WRAPPING_UP,
        card: true,
        cardTone: "reminder",
      },
    ],
  },
  {
    id: "m2quiz",
    title: "Fundraising: Quiz",
    dueDate: "2026-08-23",
    isQuiz: true,
    quizQuestions: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_QUIZ,
  },
];

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_OVERVIEW_INTRO = `The goal for this session is to help your team really understand at both a theological and practical level that how they act together, make decisions, and handle conflict are both a powerful witness and a direct reflection of Christ reigning in their hearts. Sharing faith with LST is not just about learning how to talk about your faith during reading sessions – it's also about learning how to live out your faith as a team in front of your Readers.

The video content in this session deals with two primary ways of becoming a great team: understanding your unique role on the team and applying 1A (One Another) principles. All teams display areas of both strength and weakness in the area of team dynamics, and you will need to encourage honest discussion and help create a safe atmosphere for team members to share. Try to promote discussion that goes beyond a superficial level and create a standard of dealing with team dynamics in an open and constructive manner.`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_OVERVIEW_CULTURAL = `Remember, these fun clues are meant to help your team learn to be flexible and be ready for the cultural differences they will likely encounter. The exercises can be a fun way to prepare them to have relationships with people from other cultures different from their own.

Anytime you do one of these cultural clues, take time afterwards to discuss how it made people feel, why some did/did not participate, and what our reaction to the clue has to say about how we may behave in other unfamiliar or uncomfortable situations.

Some of these clues will make people feel silly or uncomfortable. When that happens, see it as an opportunity to talk about how silly we can feel doing something foreign to us. Remind people that while it may feel silly, refusing to participate in another custom may make us come across as rude. Use these to have fun, but also to help each other learn.

Refer to the Welcome Module for ideas or create your own!`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_OVERVIEW_DEVOTIONAL = `Every time you gather for team training you'll have a team devotional. This will be the foundation of every training session with LST. Keep it short but meaningful (10-15 minutes). Feel free to structure a time of worship that fits your group!`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_OVERVIEW = `${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_OVERVIEW_INTRO}

**Team Training Reminders:**
When you meet with your team to go over the content of this module, please remember to include the following two items:

**Conduct a Cultural Clue**
${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_OVERVIEW_CULTURAL}

**Have a Team Devotional**
${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_OVERVIEW_DEVOTIONAL}`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_INTRO = `Use this handout to remember the key parts of this video and to generate purposeful conversation as a team.

Working as part of a team is a non-negotiable part of doing LST. It’s also an opportunity to be a fantastic witness to our Readers about the power of God in helping people live with one another in healthy ways.`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_ROLE = `- Know yourself.
- Spend time together.
- Be open with each other.`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_DEVOTIONALS = `- Schedule a regular devotional time together during the project.
- Encourage every team member to share in the planning and giving of devotional thoughts.
- Take some time before your departure to collect ideas, books, and/or digital resources both for your team devotionals and your personal times with God.`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_ONE_ANOTHER = `At LST we have tried several leadership styles and methods over the years. What we have found through trial and error is something, perhaps, we should have known from the beginning: the only kind of leadership that really works is the leadership that a team generates from within itself, based on each team member’s personal relationship to God. 1A Leadership stands for One Another Leadership. It is a leadership model which reflects the one another language of the New Testament.

Consider the following one-another prompts:
- **Be devoted** to one another in love. Honor one another above yourselves. (Romans 12:10)
- Live in **harmony** with one another. (Romans 12:16)
- Let no debt remain outstanding except the continuing **debt to love** one another. (Romans 13:8)
- **Accept** one another, just as Christ accepted you. (Romans 15:7)
- You, yourselves, are…competent to **instruct** one another. (Romans 15:14)
- **Agree** with one another so that there may be no divisions among you and that you may be perfectly united. (1 Corinthians 1:10)
- **Serve** one another humbly in love. (Galatians 5:13)
- Be **patient**, bearing with one another. (Ephesians 4:2)
- Be **kind and compassionate** to one another, forgiving each other. (Ephesians 4:32)
- **Speak** to one another with psalms, hymns, and spiritual songs. (Ephesians 5:19)
- **Teach** and admonish one another with all wisdom. (Colossians 3:16)
- **Submit** to one another out of reverence for Christ. (Ephesians 5:21)
- **Encourage** one another and build each other up. (1 Thessalonians 5:11)
- **Bear** one another’s burdens. (Galatians 6:2)
- **Spur** one another on toward love and good deeds. (Hebrews 10:24)
- Offer **hospitality** to one another without grumbling. (1 Peter 4:9)`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_MEANING = `- **First**, it means that there is not just one person tasked with being completely in charge of the team.
- **Second**, it means each of us may have to step out in faith, be uncomfortable, for the good of the team.`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_DISCUSSION = `- What’s your takeaway from this video?
- Discuss some activities your team can do together prior to leaving for your project (see separate handout for ideas).
- Is there an online instrument you could take together to help one another know each other better?
- Discuss how you see 1A leadership working on your team.`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1 = `**Discuss This Handout — Team Work (video discussion/summary)**
${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_INTRO}

**How do we do team work? How do we serve together?**

**First, understand your unique role on the team.**
${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_ROLE}

**Team Devotionals:**
${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_DEVOTIONALS}

**Second, implement 1A Leadership.**
${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_ONE_ANOTHER}

**What do these verses, this one-another style of leadership, mean for your team?**
${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_MEANING}

**Discussion:**
${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_DISCUSSION}`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_2_INTRO = `Use this handout to remember the key parts of this video and to generate purposeful conversation as a team.

Conflict is a normal (perhaps inevitable!) part of living and working with others in a cross-cultural setting. Here are some guidelines on how to handle conflicts when they arise on an LST project:`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_2_GUIDELINES = `- Think of your project in these terms: God (**HIS work**) first, my team (**OUR Project**) second, myself (**MY desires**) last!
- Deal with interpersonal conflict on your team quickly and directly, keeping 1-A principles in mind. Remember, any team issue that presents itself during training will be magnified ten times when you are on your project!
- Communicate with LST about any significant problems that arise.
- Don’t allow yourself or your team to get directly involved in conflicts with your host or hosting church.`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_2_DISCUSSION = `- What’s your takeaway from this video?
- What’s your natural response to conflict?
- Discuss a time when you saw conflict addressed in a healthy manner.
- Spend time praying for each other.`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_2 = `**Handout: Video Summary: Handling Conflict**
${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_2_INTRO}

${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_2_GUIDELINES}

**Discussion:**
${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_2_DISCUSSION}`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_3_INTRO = `Use the following list to brainstorm ways your team can build a great team dynamic prior to departure.`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_3_ACTIVITIES = `- Train Together
- Have a weekly devotional together
- Pick a 1A verse and apply it for a week
- Cook a meal together
- Take a hike or walk together
- Play a game together (board game, sports, online, app-based, etc.)
- Serve together
- Set up a group chat to use for reminders, sharing jokes, and keeping lines of communication open.
- Keep an online team calendar where you're keeping track of team events, team to-do's, etc.
- Have a daily/weekly prompt or question each member of the team answers: (a smell/taste/touch/sight/sound I'm thankful for is…; a recent disappointment I experienced is… ; something in Scripture that struck me recently is… ; a song that really encouraged me is… ; a new spiritual discipline I've been trying is…; a way in which I saw God work is…; etc.)
- Take an instrument like the Myers-Briggs Type Indicator or the Enneagram.
- Use the handout in this session "Team Talk" to generate authentic conversations about yourselves.
- Remote teams can do some version of the above or find even more creative ideas by Googling "remote team building" or "virtual teams", etc.`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_3_COMMITMENT = `- What will your team commit to do from this list?
- Don't end this session without a specific commitment!`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_3 = `**Handout: Team Building Activities**

${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_3_INTRO}

${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_3_ACTIVITIES}

**Your team's ideas…**
${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_3_COMMITMENT}`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_4_INTRO = `Sometimes a guided conversation helps a group share more honestly and deeply with one another. Based loosely on the Big Five Theory of Personality use the following questions to help your team share in a way that might surface areas of true agreement AND difference.

As you go through this conversation it is important to understand that **there are no right or wrong answers** (or even "better" answers).`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_4_QUESTIONS = `- If you were invited to attend a party of about 20 people, describe how you might behave. Would you prefer to keep to a small group or do you want to connect with most everyone there? Are you energized by the party or do you find you can only stay for a limited time?
- When working on a team what strength do you think you bring to the team? 1) Are you empathetic and wanting to make sure everyone is included? 2) Do you see yourself as playing the "devil's advocate" role, suggesting new perspectives, or viewpoints? 3) Can you share some of the strengths/weaknesses of your tendencies here? How have these things both worked for you and caused you challenges?
- In your daily life are you excited about trying new things, spontaneous adventures, or exploring new ideas? Or, do you like your routines, consistent schedule, and sticking to what you know? Give some examples.
- When you make decisions are you impulsive or methodical? Do you prefer structure (schedule, routines, and order) or do you like to accomplish things as they come to you? Give some specific examples.
- How do you handle stress? What primary emotions do you exhibit (anger, sadness, anxiety, etc.)? What coping mechanisms have worked for you in the past when dealing with stress?`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_4 = `**Handout: Team Talk**

${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_4_INTRO}

${TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_4_QUESTIONS}`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_WRAPPING_UP = `As you're wrapping up this session please do the following:
- Spend some time in prayer together.
- Schedule your next meeting together.
- Take the Quiz for this module (each person should take it individually with their own account to the training platform).`;

const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_QUIZ = [
  {
    id: "m3q1",
    prompt: "I have watched all video content.",
    options: ["Yes", "No"],
  },
  {
    id: "m3q2",
    prompt: "I have reviewed any written content.",
    options: ["Yes", "No"],
  },
  {
    id: "m3q3",
    prompt: "I have talked with my team about the content of this module.",
    options: ["Yes", "No"],
  },
];

const TRAINING_CENTER_PROTOTYPE_MODULE_3_SECTIONS = [
  {
    id: "m3s1",
    title: "Team Dynamics: Overview and Instructions",
    dueDate: "2026-08-18",
    body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_OVERVIEW,
    fullSessionBlocks: [
      {
        heading: "Session goal",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_OVERVIEW_INTRO,
        card: true,
      },
      {
        heading: "Conduct a Cultural Clue",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_OVERVIEW_CULTURAL,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Have a Team Devotional",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_OVERVIEW_DEVOTIONAL,
        card: true,
        cardTone: "reminder",
      },
    ],
  },
  {
    id: "m3s2",
    title: "Team Dynamics: Video (1 of 2)",
    dueDate: "2026-08-25",
    body: "Watch video 1 of 2 on: Team Work",
    showVideo: true,
    videoEmbedUrl: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_VIDEO_1_EMBED_URL,
    fullSessionBlocks: [
      {
        heading: "Watch",
        body: "Watch video 1 of 2 on: **Team Work**",
        card: true,
      },
    ],
  },
  {
    id: "m3s3",
    title: "Team Dynamics: Video (2 of 2)",
    dueDate: "2026-09-01",
    body: "Watch video 2 of 2 on: Handling Conflict",
    showVideo: true,
    videoEmbedUrl: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_VIDEO_2_EMBED_URL,
    fullSessionBlocks: [
      {
        heading: "Watch",
        body: "Watch video 2 of 2 on: **Handling Conflict**",
        card: true,
      },
    ],
  },
  {
    id: "m3s4",
    title: "Team Dynamics: Handout 1 of 4",
    dueDate: "2026-09-01",
    body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1,
    fullSessionBlocks: [
      {
        heading: "Discuss This Handout — Team Work",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_INTRO,
        card: true,
      },
      {
        heading: "First: Understand your unique role",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_ROLE,
        card: true,
      },
      {
        heading: "Team Devotionals",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_DEVOTIONALS,
        card: true,
      },
      {
        heading: "Second: Implement 1A Leadership",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_ONE_ANOTHER,
        card: true,
        cardTone: "scripture",
      },
      {
        heading: "What does this mean for your team?",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_MEANING,
        card: true,
      },
      {
        heading: "Discussion",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_1_DISCUSSION,
        card: true,
        cardTone: "discuss",
      },
    ],
  },
  {
    id: "m3s5",
    title: "Team Dynamics: Handout 2 of 4",
    dueDate: "2026-09-08",
    body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_2,
    fullSessionBlocks: [
      {
        heading: "Video Summary: Handling Conflict",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_2_INTRO,
        card: true,
      },
      {
        heading: "Guidelines for handling conflict",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_2_GUIDELINES,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Discussion",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_2_DISCUSSION,
        card: true,
        cardTone: "discuss",
      },
    ],
  },
  {
    id: "m3s6",
    title: "Team Dynamics: Handout 3 of 4",
    dueDate: "2026-09-15",
    body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_3,
    fullSessionBlocks: [
      {
        heading: "Team Building Activities",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_3_INTRO,
        card: true,
      },
      {
        heading: "Ideas to try",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_3_ACTIVITIES,
        card: true,
      },
      {
        heading: "Your team's ideas…",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_3_COMMITMENT,
        card: true,
        cardTone: "discuss",
      },
    ],
  },
  {
    id: "m3s7",
    title: "Team Dynamics: Handout 4 of 4",
    dueDate: "2026-09-22",
    body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_4,
    fullSessionBlocks: [
      {
        heading: "Team Talk",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_4_INTRO,
        card: true,
      },
      {
        heading: "Conversation prompts",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_HANDOUT_4_QUESTIONS,
        card: true,
        cardTone: "discuss",
      },
    ],
  },
  {
    id: "m3s8",
    title: "Team Dynamics: Wrapping Up",
    dueDate: "2026-09-22",
    body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_WRAPPING_UP,
    fullSessionBlocks: [
      {
        heading: "Wrapping Up",
        body: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_WRAPPING_UP,
        card: true,
        cardTone: "reminder",
      },
    ],
  },
  {
    id: "m3quiz",
    title: "Team Dynamics: Quiz",
    dueDate: "2026-09-22",
    isQuiz: true,
    quizQuestions: TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_QUIZ,
  },
];

const TRAINING_CENTER_PROTOTYPE_CULTURE_OVERVIEW_INTRO = `This module helps your team understand culture and how to adapt well on your LST project. You'll watch video content on "What is Culture" and "Adapting to Culture," plus work through practical handouts together.

When you meet with your team to go over the content of this module, please remember to include the following two items:`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_OVERVIEW_CULTURAL = `Remember, these fun clues are meant to help your team learn to be flexible and be ready for the cultural differences they will likely encounter. The exercises can be a fun way to prepare them to have relationships with people from other cultures different from their own.

Anytime you do one of these cultural clues, take time afterwards to discuss how it made people feel, why some did/did not participate, and what our reaction to the clue has to say about how we may behave in other unfamiliar or uncomfortable situations.

Some of these clues will make people feel silly or uncomfortable. When that happens, see it as an opportunity to talk about how silly we can feel doing something foreign to us. Remind people that while it may feel silly, refusing to participate in another custom may make us come across as rude. Use these to have fun, but also to help each other learn.

Refer to the Welcome Module for ideas or create your own!`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_OVERVIEW_DEVOTIONAL = `Every time you gather for team training you'll have a team devotional. This will be the foundation of every training session with LST. Keep it short but meaningful (10-15 minutes). Feel free to structure a time of worship that fits your group!`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_OVERVIEW = `${TRAINING_CENTER_PROTOTYPE_CULTURE_OVERVIEW_INTRO}

**Team Training Reminders:**

**Conduct a Cultural Clue**
${TRAINING_CENTER_PROTOTYPE_CULTURE_OVERVIEW_CULTURAL}

**Have a Team Devotional**
${TRAINING_CENTER_PROTOTYPE_CULTURE_OVERVIEW_DEVOTIONAL}`;

const TRAINING_CENTER_PROTOTYPE_MODULE_4_SECTIONS = [
  {
    id: "m4s1",
    title: "Culture: Overview and Instructions",
    dueDate: "2026-08-18",
    body: TRAINING_CENTER_PROTOTYPE_CULTURE_OVERVIEW,
    fullSessionBlocks: [
      {
        heading: "Overview",
        body: TRAINING_CENTER_PROTOTYPE_CULTURE_OVERVIEW_INTRO,
        card: true,
      },
      {
        heading: "Conduct a Cultural Clue",
        body: TRAINING_CENTER_PROTOTYPE_CULTURE_OVERVIEW_CULTURAL,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Have a Team Devotional",
        body: TRAINING_CENTER_PROTOTYPE_CULTURE_OVERVIEW_DEVOTIONAL,
        card: true,
        cardTone: "reminder",
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
  {
    id: "proto-module-3",
    title: "Module 3 - Team Dynamics",
    initialStatus: "not_started",
    dueDate: "2026-08-18",
    dueDateRule: "60 days before trip start (sample)",
    sections: TRAINING_CENTER_PROTOTYPE_MODULE_3_SECTIONS,
  },
  {
    id: "proto-module-4",
    title: "Module 4 - Culture",
    initialStatus: "not_started",
    dueDate: "2026-08-18",
    dueDateRule: "60 days before trip start (sample)",
    sections: TRAINING_CENTER_PROTOTYPE_MODULE_4_SECTIONS,
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

export function getPrototypeSectionQuiz(section) {
  if (section?.quizQuestions?.length) return section.quizQuestions;
  return TRAINING_CENTER_PROTOTYPE_QUIZ;
}

export const TRAINING_PROTOTYPE_SECTIONS_TOTAL = TRAINING_CENTER_PROTOTYPE_MODULES.reduce(
  (sum, module) => sum + (module.sections?.length || 0),
  0
);

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

export const TRAINING_PROTOTYPE_MODULE_TO_TRAINING_TITLE = {
  "proto-module-1": "Module 1 - Welcome to LST Training",
  "proto-module-2": "Module 2 - Fundraising",
  "proto-module-3": "Module 3 - Team Dynamics",
};

export function findPrototypeModuleIdForSection(sectionId) {
  for (const module of TRAINING_CENTER_PROTOTYPE_MODULES) {
    if (module.sections.some((section) => section.id === sectionId)) {
      return module.id;
    }
  }
  return null;
}

export function computePrototypeProgress(completedSectionIds = {}) {
  return computePrototypeSectionProgress(completedSectionIds);
}
