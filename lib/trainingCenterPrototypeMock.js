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

export const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_EDIT_PAGE_VIDEO_EMBED_URL =
  "https://www.youtube-nocookie.com/embed/Xx3q7GQ1dRw";

export const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_VIDEO_1_EMBED_URL =
  "https://www.youtube-nocookie.com/embed/Isw6h0TI0xI";

export const TRAINING_CENTER_PROTOTYPE_TEAM_DYNAMICS_VIDEO_2_EMBED_URL =
  "https://www.youtube-nocookie.com/embed/MwmoSvkt5-Y";

export const TRAINING_CENTER_PROTOTYPE_CULTURE_VIDEO_1_EMBED_URL =
  "https://www.youtube-nocookie.com/embed/0h1ddFqQwPA";

export const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_VIDEO_1_EMBED_URL =
  "https://www.youtube-nocookie.com/embed/WS87wQ1wOvE";

export const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_PACKET_URL =
  "https://lst365.sharepoint.com/:b:/g/IQANlU4AdQfjS7ziKsdL3HAPAWGApERyaL3aiXSVcSH5cJg?e=mP2wRx";

export const TRAINING_CENTER_PROTOTYPE_ONSITE_VIDEO_1_EMBED_URL =
  "https://www.youtube-nocookie.com/embed/30hSic9U2AI";

export const TRAINING_CENTER_PROTOTYPE_ONSITE_VIDEO_2_EMBED_URL =
  "https://www.youtube-nocookie.com/embed/41lRpx1Toy4";

export const TRAINING_CENTER_PROTOTYPE_ONSITE_VIDEO_3_EMBED_URL =
  "https://www.youtube-nocookie.com/embed/Hyl_ghxSiIY";

export const TRAINING_CENTER_PROTOTYPE_ONSITE_VIDEO_4_EMBED_URL =
  "https://www.youtube-nocookie.com/embed/xPlhAhn_NVc";

export const TRAINING_CENTER_PROTOTYPE_ONSITE_VIDEO_5_EMBED_URL =
  "https://www.youtube-nocookie.com/embed/Vy7UphJanF8";

export const TRAINING_CENTER_PROTOTYPE_ONSITE_RIP_EXAMPLE_URL =
  "https://lst365.sharepoint.com/:b:/g/IQCOn4WQBP9OQbLsZi_fXE2pAd416WLYr_1CJcul8gawM5o?e=EKgEpM";

export const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_EXPECTATIONS_URL =
  "https://lst365.sharepoint.com/Project/Forms/AllItems.aspx?id=%2FProject%2FProject%20%2D1D%2FRecruiting%20and%20Development%2FExpectations%20and%20Guidelines%20for%20LST%20Workers%2Epdf&parent=%2FProject%2FProject%20%2D1D%2FRecruiting%20and%20Development&p=true&ga=1";

export const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_PARTIES_URL =
  "https://lst365.sharepoint.com/Training/Forms/AllItems.aspx?id=%2FTraining%2FLST%20International%20Projects%20Training%2FTeam%20Training%2FCurrent%20LST%20Team%20Training%20Components%2FNew%2DRevised%20Version%20of%20Team%20Training%2FMaking%20LST%20Work%20Onsite%2FLST%20Parties%2Epdf&parent=%2FTraining%2FLST%20International%20Projects%20Training%2FTeam%20Training%2FCurrent%20LST%20Team%20Training%20Components%2FNew%2DRevised%20Version%20of%20Team%20Training%2FMaking%20LST%20Work%20Onsite&p=true&ga=1";

export const TRAINING_CENTER_PROTOTYPE_CULTURE_VIDEO_2_EMBED_URL =
  "https://www.youtube-nocookie.com/embed/0FcWRM2_5TA";

export const TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE_URL =
  "/training/FundraisingGuide_LST_2022.pdf";

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
    id: "m2s-edit-page",
    title: "Fundraising: How to Edit Your Fundraising Page",
    dueDate: "2026-07-22",
    body: "Watch this video on: How to edit your fundraising page",
    showVideo: true,
    videoEmbedUrl: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_EDIT_PAGE_VIDEO_EMBED_URL,
    fullSessionBlocks: [
      {
        heading: "Watch",
        body: "Watch this video on: **How to edit your fundraising page**",
        card: true,
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
    title: "Fundraising: Fundraising Guide",
    dueDate: "2026-08-09",
    body: TRAINING_CENTER_PROTOTYPE_FUNDRAISING_GUIDE,
    fullSessionBlocks: [
      {
        heading: "Fundraising: Fundraising Guide",
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
- When working on a team what strength do you think you bring to the team?
  - Are you empathetic and wanting to make sure everyone is included?
  - Do you see yourself as playing the "devil's advocate" role, suggesting new perspectives, or viewpoints?
  - Can you share some of the strengths/weaknesses of your tendencies here? How have these things both worked for you and caused you challenges?
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

const TRAINING_CENTER_PROTOTYPE_CULTURE_OVERVIEW_INTRO = `The purpose of this session is to help LST teams become culturally sensitive so that they can effectively (and humbly) work and live within another culture. God is the creator of the whole world, is active in every culture, and his word even describes heaven as a multi-cultural banquet! What a joy (and challenge) to move into a new culture during our LST Project.

In the video content we'll explore what culture is and how to adapt to living and working in another culture. We don't have to become cultural know-it-alls! But great LST teams understand the general concept of culture, have a grasp on issues related to crossing cultures to live and work, can demonstrate an awareness of the specific culture of their site, and can exhibit flexibility, humility, and a learning posture. You'll have time to discuss these areas, then we'll prompt you to set aside time outside this session to do some additional work on culture.

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

const TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_DEFINITIONS = `**Definition:**
“Culture is the more or less integrated systems of ideas, feelings, and values and their associated patterns of behavior and products shared by a group of people who organize and regulate what they think, feel, and do.”

Or

“Culture is the set of behaviors, values, and beliefs a group of people use to make sense of life and manage their days.”`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_VISIBLE = `Culture has a **visible aspect** and an **invisible aspect**.`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_ASPECTS = `- It impacts everything.
- It is learned.
- Cultures are neither inherently good nor bad. They're just different!`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_COLLISIONS = `When we move from one culture to another the differences we encounter may become small points of irritation. We call these Cultural Collisions.

**Areas where cultural collisions can occur:**
- Task or people?
- On-time or late?
- Individual or group?
- Other areas…
- Church onsite!`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_SHOCK = `Culture shock is the disorientation we feel when all the cultural maps and guidelines we've learned from our home culture no longer work in our host culture. Stripped of our normal ways of coping with life, we may become confused, afraid, or angry.

**We can understand culture shock by viewing our project in stages:**
- Eager Expectation
- Everything is Beautiful
- Everything is Awful (Culture Shock)
- Everything is OK`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_DISCUSSION = `- What's your takeaway from this video?
- What are some things you already know about the culture of your site? About the religious culture of your site? About proper social norms and etiquette?
- What about your host site culture do you find most exciting? Are you most nervous about?
- Decide on a time and place when you'll come together with your team to share information you learn from doing a bit of cultural research on your site.
- What would others around the world identify as uniquely North American culture?
- Can you share a cultural collision that occurred because you tried applying your own culture in a cross-cultural context?
- Did any of the cultural collisions in the video push anyone's comfort zone? Which ones?`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1 = `**Discuss This Handout — What is Culture (video summary/discussion)**

${TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_DEFINITIONS}

${TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_VISIBLE}

**Three aspects of Culture:**
${TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_ASPECTS}

**Cultural Collisions:**
${TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_COLLISIONS}

**Culture Shock (or Culture Stress)**
${TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_SHOCK}

**Discussion:**
${TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_DISCUSSION}`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_2_INTRO = `How can you adapt to a new culture so that you continue to work effectively, to be an encouragement to your team and the hosting church, and to learn to love God and people more deeply?
- Be a learner.
- Deny yourself.
- Keep your eyes on your example.
- Love your neighbor.
- Be humble.
- Be cultural brave and step out in faith.
- Be open to others. Remember the Fish Bowl!
- Respect age and tradition.
- Expect a rebellious spirit.`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_2_SHOCK = `- Continue following the tips above
- Recognize and admit your anxiety.
- Engage your host culture.
- Get enough sleep.
- Demonstrate genuine interest in your Readers.
- Learn to laugh. Don't take yourself too seriously!
- Treat yourself.`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_2_DISCUSSION = `- What's your takeaway from this video?
- What have you done successfully in the past to adapt to a new culture?`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_2 = `**Handout: Video Summary/Discussion: Adapting to New Culture**

${TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_2_INTRO}

**Fighting Culture Shock/Stress**
${TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_2_SHOCK}

**Discussion:**
${TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_2_DISCUSSION}`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_3_INTRO = `Outside this session, pick one or more of the following exercises to continue learning about culture and how to serve effectively in cross-cultural settings:`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_3_EXERCISES = `- **REQUIRED:** Research your site culture. Conduct individual research and then come together to share your findings. Don't focus just on statistics. Consider social norms, etiquette, and the religious culture of your site too.
- Watch a movie that depicts a cultural collision. Google "Movies about culture" (or something similar), pick a movie in which culture seems to create a conflict, watch it, then have a conversation about the role of culture.
- Watch a movie made in the country/culture to which you're going (pick one with English subtitles if possible!).
- Visit a restaurant serving food from your site culture. Visit a restaurant serving food from a culture you've never experienced.
- Start learning the language of your site.
- Listen to music representing the culture of your site.
- Visit a museum that has collections from non-Western cultures.
- Your team's ideas….`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_3 = `**Handout: Culture Exercises**

${TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_3_INTRO}

${TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_3_EXERCISES}`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_WRAPPING_UP = `As you're wrapping up this session please do the following:
- Spend some time in prayer together.
- Schedule your next meeting together.
- Take the Quiz for this module (each person should take it individually with their own account to the training platform).`;

const TRAINING_CENTER_PROTOTYPE_CULTURE_QUIZ = [
  {
    id: "m4q1",
    prompt: "I have watched all video content.",
    options: ["Yes", "No"],
  },
  {
    id: "m4q2",
    prompt: "I have reviewed any written content.",
    options: ["Yes", "No"],
  },
  {
    id: "m4q3",
    prompt: "I have talked with my team about the content of this module.",
    options: ["Yes", "No"],
  },
];

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
  {
    id: "m4s2",
    title: "Culture: Video (1 of 2)",
    dueDate: "2026-08-25",
    body: "Watch video 1 of 2 on: What is Culture?",
    showVideo: true,
    videoEmbedUrl: TRAINING_CENTER_PROTOTYPE_CULTURE_VIDEO_1_EMBED_URL,
    fullSessionBlocks: [
      {
        heading: "Watch",
        body: "Watch video 1 of 2 on: **What is Culture?**",
        card: true,
      },
    ],
  },
  {
    id: "m4s3",
    title: "Culture: Video (2 of 2)",
    dueDate: "2026-09-01",
    body: "Watch video 2 of 2 on: Adapting to New Culture",
    showVideo: true,
    videoEmbedUrl: TRAINING_CENTER_PROTOTYPE_CULTURE_VIDEO_2_EMBED_URL,
    fullSessionBlocks: [
      {
        heading: "Watch",
        body: "Watch video 2 of 2 on: **Adapting to New Culture**",
        card: true,
      },
    ],
  },
  {
    id: "m4s4",
    title: "Culture: Handout 1 of 3",
    dueDate: "2026-09-01",
    body: TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1,
    fullSessionBlocks: [
      {
        heading: "Discuss This Handout — What is Culture",
        body: TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_DEFINITIONS,
        card: true,
      },
      {
        heading: "Visible and invisible culture",
        body: TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_VISIBLE,
        card: true,
      },
      {
        heading: "Three aspects of Culture",
        body: TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_ASPECTS,
        card: true,
      },
      {
        heading: "Cultural Collisions",
        body: TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_COLLISIONS,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Culture Shock (or Culture Stress)",
        body: TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_SHOCK,
        card: true,
      },
      {
        heading: "Discussion",
        body: TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_1_DISCUSSION,
        card: true,
        cardTone: "discuss",
      },
    ],
  },
  {
    id: "m4s5",
    title: "Culture: Handout 2 of 3",
    dueDate: "2026-09-08",
    body: TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_2,
    fullSessionBlocks: [
      {
        heading: "How can you adapt to a new culture?",
        body: TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_2_INTRO,
        card: true,
      },
      {
        heading: "Fighting Culture Shock/Stress",
        body: TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_2_SHOCK,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Discussion",
        body: TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_2_DISCUSSION,
        card: true,
        cardTone: "discuss",
      },
    ],
  },
  {
    id: "m4s6",
    title: "Culture: Handout 3 of 3",
    dueDate: "2026-09-15",
    body: TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_3,
    fullSessionBlocks: [
      {
        heading: "Culture Exercises",
        body: TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_3_INTRO,
        card: true,
      },
      {
        heading: "Exercises to try",
        body: TRAINING_CENTER_PROTOTYPE_CULTURE_HANDOUT_3_EXERCISES,
        card: true,
        cardTone: "reminder",
      },
    ],
  },
  {
    id: "m4s7",
    title: "Culture: Wrapping Up",
    dueDate: "2026-09-15",
    body: TRAINING_CENTER_PROTOTYPE_CULTURE_WRAPPING_UP,
    fullSessionBlocks: [
      {
        heading: "Wrapping Up",
        body: TRAINING_CENTER_PROTOTYPE_CULTURE_WRAPPING_UP,
        card: true,
        cardTone: "reminder",
      },
    ],
  },
  {
    id: "m4quiz",
    title: "Culture: Quiz",
    dueDate: "2026-09-15",
    isQuiz: true,
    quizQuestions: TRAINING_CENTER_PROTOTYPE_CULTURE_QUIZ,
  },
];

const TRAINING_CENTER_PROTOTYPE_ONSITE_OVERVIEW_INTRO = `In this session, we will shift our focus away from the actual reading sessions and onto some of the other important aspects of your LST project. This session is all about making LST work onsite. The goal of this training piece is to help LST team members manage the day-to-day aspect of their work and life onsite in ways that lengthen the impact of their work. The video content will deal with LST parties, the administrative aspects of a project (tracking expenses and tracking Reader activity and engagement), communication during the project, how to start and end well, and even risk management.

There are a TON of details here! In fact, you may need a couple of sessions to work through everything. But it's all important!

Our experience has been that the difference between good and really great LST projects often depends on how committed each team member is to handling team roles and responsibilities with consistent excellence. When tasks like accounting and record-keeping are done poorly or without preparation, it can add a surprising amount of stress to the entire team's LST experience. However, when there is clarity about team roles, everyone knows who is responsible for what, and everyone feels competent and equipped to handle these roles, then the work of faith-sharing can really flourish!

When you meet with your team to go over the content of this module, please remember to include the following two items:`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_OVERVIEW_CULTURAL = `Remember, these fun clues are meant to help your team learn to be flexible and be ready for the cultural differences they will likely encounter. The exercises can be a fun way to prepare them to have relationships with people from other cultures different from their own.

Anytime you do one of these cultural clues, take time afterwards to discuss how it made people feel, why some did/did not participate, and what our reaction to the clue has to say about how we may behave in other unfamiliar or uncomfortable situations.

Some of these clues will make people feel silly or uncomfortable. When that happens, see it as an opportunity to talk about how silly we can feel doing something foreign to us. Remind people that while it may feel silly, refusing to participate in another custom may make us come across as rude. Use these to have fun, but also to help each other learn.

Refer to the Welcome Module for ideas or create your own!`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_OVERVIEW_DEVOTIONAL = `Every time you gather for team training you'll have a team devotional. This will be the foundation of every training session with LST. Keep it short but meaningful (10-15 minutes). Feel free to structure a time of worship that fits your group!`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_OVERVIEW = `${TRAINING_CENTER_PROTOTYPE_ONSITE_OVERVIEW_INTRO}

**Team Training Reminders:**

**Conduct a Cultural Clue**
${TRAINING_CENTER_PROTOTYPE_ONSITE_OVERVIEW_CULTURAL}

**Have a Team Devotional**
${TRAINING_CENTER_PROTOTYPE_ONSITE_OVERVIEW_DEVOTIONAL}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_1_CONNECT = `- New Readers to the Project
- Readers to Readers
- Readers to the hosting church
- Church members to a greater understanding of LST
- Everyone to the reality of joy in Christ!`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_1_FACTORS = `- The cultural context of your site
- Prior experience your site has with LST
- What's appropriate for your group of Readers
- Activities that lead to meaningful relationships`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_1_TIPS = `- Use things unique to your home country.
- Use a social event to recruit new Readers.
- Always advertise.
- Keep refreshments simple.
- Create an environment that's joyful and comfortable.
- Keep decorations minimal.
- End well`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_1_DISCUSSION = `- What's your takeaway from this video?
- What's your plan for parties or social events during your project?`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_1 = `**Discuss This Handout — LST Parties (video summary/discussion)**

**LST parties, or social events, CONNECT!**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_1_CONNECT}

**The type of social event that you organize will depend on several factors.**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_1_FACTORS}

**Additional Tips:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_1_TIPS}

**Discussion:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_1_DISCUSSION}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2_WHY = `- It reminds us of our role as stewards.
- We share the responsibility of ensuring that every aspect of the projects goes as well as possible.
- Details really do matter!`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2_FUNDS = `- Daily tracking of team expenses
- Responsibility of team accountant AND the rest of the team
- Spend according to the team budget
- Receipts, receipts, receipts
- Helps LST plan for future projects`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2_JOURNAL = `- Daily tracking of reading sessions and Readers
- Responsibility of team record keeper AND the rest of the team
- Helps your team maximize your time
- Great for reporting after the project
- Helps LST plan for future projects`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2_RIPS = `- Daily tracking of every reading session
- Responsibility of every team member
- With repeat Readers use prior RIPs when possible
- Reader contact and demographic info
- Summary and insight from every session with every Reader
- Important life events, windows into their personal life, or even steps of faith
- Helps you keep up with Readers during your project
- Helps every Worker who will follow up with the Reader in the future`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2_DISCUSSION = `- What's your takeaway from this video?
- Talk together about who will fill these roles during your project. Let LST know as well!`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2 = `**Discuss This Handout — The Administrative Aspects of Your Project (video summary/discussion)**

**Administration is important because:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2_WHY}

**Funds Tracking (tracking team funds in a team budget)**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2_FUNDS}

**Record Journal (tracking your TEAM'S work with Readers)**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2_JOURNAL}

**Reader Information Pages (tracking your INDIVIDUAL work with Readers)**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2_RIPS}

**Discussion:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2_DISCUSSION}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_3_TRAVEL = `- Check all travel requirements and documents well ahead of time.
- Pack with a knowledge of any weight limits, any regulations for carry-on pieces, and with a plan for what you will do if your checked luggage is lost or delayed.
- Pack light.
- Always arrive early.
- Ask lots of questions.
- Eat and sleep on international flights according to the time at your destination.
- If your flight is delayed, cancelled, or otherwise affected talk to airline representatives kindly but firmly.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_3_STARTING = `- Have an introductory meeting with your LST host (consider meeting online before departure to jump start this important meeting!). See the "Checklist" in Project Tools.
- As part of this orientation with your host get oriented to your neighborhood and city.
- Get started reading right away.
- Keep filling your schedule with Readers. Constantly recruit and regularly ask current Readers to come more often.
- Plan and promote your first party.
- Eat and sleep according to the local clock.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_3_ENDING = `- Plan to say goodbye.
- Talk with your host about follow up for your Readers (and leave a copy of your RIPs).
- Celebrate and debrief with your team prior to departure.
- Gather any information or items that will help you report on your project when you get home.
- Hold a final LST party or social event.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_3_DISCUSSION = `- What's your takeaway from this video?
- What can you be doing now to help ensure your project gets started off well?`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_3 = `**Discuss This Handout — Starting and Ending Well (video summary/discussion)**

**Travel General principles (we have lots of tips and more detailed suggestions on a separate handout):**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_3_TRAVEL}

**Starting Well**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_3_STARTING}

**Ending Well**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_3_ENDING}

**Discussion:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_3_DISCUSSION}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_4_GROUPS = `- LST: Stay in touch with LST weekly.
- Your support network: Be intentional about the kind of communication you provide them.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_4_ADVICE = `- Don't share the negative.
- Share stories/pictures/quotes that paint a picture of your WORK.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_4_TIPS = `- Personally thank every donor before you leave.
- Send your donors one update each week of your project.
- Don't let social media or other digital platforms distract you from being fully present on your project.
- Think about the best way to report to your support network.
- Be careful when using pictures of Readers.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_4_DISCUSSION = `- What's your takeaway from this video?
- What are you doing to thank all your donors?
- What is your plan for communicating with your support network while you are gone?
- Who on your team will communicate with LST on behalf of your team each week?
- Do you have the names and contact information for all your donors?`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_4 = `**Discuss This Handout — Communication (video summary/discussion)**

**Two groups to focus on:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_4_GROUPS}

**Two pieces of advice:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_4_ADVICE}

**Additional tips:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_4_TIPS}

**Discussion:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_4_DISCUSSION}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_VERSE =
  `*"The prudent see danger and take refuge, but the simple keep going and suffer for it."* — Proverbs 27:12`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_EXTREMES = `- I'll only go if safety is a guarantee.
- Nothing bad is going to happen.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_PROFILE = `- Watch how loud you are.
- Watch your dress.
- Watch where you go.
- Don't go places you know aren't safe.
- Watch out for public demonstrations!
- Be vigilant when around tourist areas or western-oriented parts of your site.
- Watch the clock.
- Don't go alone.
- Take care in handling your money.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_AWARENESS = `- Observe
- Listen to your gut.
- Identify safe places around you.
- Have a sense of what's "normal" for your working and living zones in your host city.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_EMERGENCIES = `- Before you go register with the US State Department. (STEP)
- Always carry with you important contact information.
- Think ahead about medical emergencies: 1) Talk with your host ahead of time about appropriate places to receive medical care onsite. 2) Watch what you eat and drink. Water, produce, fruit, and street food. 3) Use insect repellent.
- Be familiar with health coverage provided by insurance.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_HARASSMENT = `- No one on your team should be alone with a child (that is not their own) during the project.
- No one on your team should be alone with any person of the opposite gender (except their spouse or their own child) during the project.
- All volunteers should be told to report any inappropriate remarks or behavior immediately to the project leader or to someone they trust.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_DISCUSSION = `- What's your takeaway from this video?
- What do you know about any safety issues at your site?`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5 = `**Discuss This Handout — Risk Management (video summary/discussion)**

${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_VERSE}

**Avoid two extremes:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_EXTREMES}

**Keep a low profile.**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_PROFILE}

**Practice situational awareness.**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_AWARENESS}

**Prepare for emergencies.**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_EMERGENCIES}

**Sexual Harassment and Abuse**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_HARASSMENT}

**Discussion:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_DISCUSSION}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_6_INTRO = `Schedule time to work on your social events. Use this template, along with the party resources found in the "Project Tools" section, to assist you in your planning. Be sure to communicate with your host site about the best days and potential themes/activities for your social events. Remember, the goal of each party is to help connect your Readers with the local Christians and to provide an environment where your Readers can witness the joy and fun we can have together in Christ.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_6_TEMPLATE = `- **Party Theme**
- **Party Date**
- **Introduction:** How will the party start and who will start it?
- **Activities** / **Leader** / **Materials Needed**
- **Closing:** How will the party end and who will end it?
- **Party Maintenance:** How will the party be organized (divide into groups, how long for each activity, etc.)?
- **Things to Bring With You**
- **Things To Buy There**
- **Evaluation:** What worked well? What needs to be done differently? Did we achieve our goal?`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_6_TIPS = `- Allow enough time for the Readers and the local church members to talk to each other.
- Mingle and mix the Readers with the local church members.
- Be sensitive to the culture you are in.
- Be sensitive to non-verbal messages you may be receiving.
- Ask yourself if everyone is included in some way. If you have a variety of ages it's ok to plan a variety of activities, understanding not everyone will participate in every activity.
- Don't be afraid to be serious. Don't be afraid to be silly.
- Keep refreshments and decorations minimal.
- If your host says serving a meal is expected for cultural reasons remind her that this isn't a Brazilian/Polish/Korean party; it's an LST party.
- Host a pot-luck as a closing party.
- Be ready to change plans as attendance dictates. With larger numbers break into small groups. With a smaller crowd keep everyone together.
- Communicate clearly during the event so everyone knows what is happening. Designate an MC for each event.
- Use a translator if needed (your host, local church member, or even a Reader).
- Clarify your plan and make assignments to your team before each party.
- Have alternate activities planned if something isn't working well.
- Many games do not have a definite conclusion. Stop the game sooner, rather than later.
- A simple prize/drawing can add a fun element to the event.
- Use name tags.
- Ask people to sign-in when they arrive.
- Ask your host if the local church would like to host/plan one of the parties.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_6_EVALUATION = `Evaluate each social event with the following questions:
- Did all the Readers know about the event? All the church members?
- Did we have good attendance? Record the number of Readers? Church members?
- Did we sign-up new Readers?
- Were Readers and local church members interacting and building friendships?
- Was the food kept simple and inexpensive?
- Were the activities appropriate for the people who came? Were they fun? Well-explained? Translated, if needed?
- Did we ask the local church or host for input and ideas in planning?
- Did we provide name tags?
- Did we take pictures?
- Did everyone have fun and participate? If not, why not?
- What activities/aspects of the party needed improvement?
- Could they tell we are Christians?
- Did everyone in the team pull his/her weight in making the event a success?
- Did we close the event on time?
- Did we ask for feedback from the LST Host?`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_6 = `**Handout: Planning Parties**

${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_6_INTRO}

**Party Planning Template**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_6_TEMPLATE}

**Tips for Having Great LST Parties:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_6_TIPS}

${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_6_EVALUATION}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_7_INTRO = `Though we make regular updates to these important record-keeping tools, see below for an example of an LST Reader Information Page.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_7 = `**Handout: Example — Reader Information Page**

${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_7_INTRO}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_BEFORE = `- When you receive your final itineraries check them all carefully to ensure dates and times are correct, and also that the name and spelling of your name matches what's printed on your passport exactly.
- Contact the airlines (usually online) to ensure good seating assignments and to register for any frequent flyer program connected to them. Every airline has their own policies about seating, and some may not allow selection until 24 hours before the flight.
- Check the airline's policy on luggage weight restrictions since each airline has different international policies. Pack light, only what you can carry yourself with no help.
- Know all entry requirements for your site – visa, vaccination, and/or testing. LST will help remind you, but you are responsible for ensuring you have everything necessary to actually depart for your site.
- Register with the US Department of State (STEP)
- Arrange for any home/family care necessary – managing your mail, care of a pet, lawn/garden nurturing, etc.
- Confirm with LST and/or your host concerning transportation to/from the airport upon arrival.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_CHECKED = `- Check on the condition of your luggage.
- Weigh your packed bags before you leave for the airport.
- When it comes to packing, rolling clothes, deboxing items, and utilizing packing cubes can help.
- Take no more than clothes for a week; clothes you can easily layer and mix.
- Good shoes are a must!`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_CARRYON = `- Any printed tools or materials from LST.
- Contact information: Contact information for your host (phone, name, physical address, email, WhatsApp, etc.), and for LST.
- A copy of your passport and vaccination record.
- Medicine
- Mobile device(s), charger(s), plug adapter(s), extra charging battery, earphones, etc.
- One change of clothes and basic toiletries (in case your checked bag gets lost).
- Don't forget a good book, some snacks, and the other creature comforts you need to enjoy the long flight.
- Remember to check the TSA website regarding the 311 policy, and what you can and can't bring in your carry-on.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_PERSON = `- For items you'll keep on your person during travel (and possibly onsite) consider a neck wallet or money belt.
- Keep on your person: your passport, vaccination record, itinerary, debit card and/or some cash.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_DAY = `- Check in online if possible.
- Arrive at least 2-3 hours early at the airport.
- See the notes above about your carry on and items you'll want to keep on your person.
- Dress comfortably but nicely. If you dress down for the flight bring something nicer to change into prior to landing.
- Meet your team members at the departure gate, beyond check-in and security.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_DURING = `- During the flight eat and sleep when prompted. Start adjusting to the time zone of your destination.
- Keep your mobile device charged during the flight.
- Always check the floor and seatback pockets for personal items prior to deboarding. Always know where your passport and other important items are during the flight.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_TRANSFER = `If you are transferring at an international destination prior to arrival consider the following:
- Follow the prompts for connecting, transfer, or transit passengers. Do not follow signs to exit the airport or to luggage unless told specifically to do so.
- Confirm the departure time and gate for your next flight as quickly as possible on airport information boards.
- Move to the gate or waiting area as quickly as possible. Then you can rest, shop, etc.
- Ask questions if unsure. You can often find instructions for transferring at a specific airport on their website or on travel websites.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_DISRUPTIONS = `- Should you have a change in flight times, or have a flight canceled, or delayed, just remember that the airline representatives can do anything to help you that they want to. Therefore, be firm, but respectful about your expectations of them to assist you in getting to where you need to go.
- Please call LST to notify them of any travel changes.
- Notify your LST host of any changes in your travel plans.
- When you land, notify your host and LST.
- Prepare now to be flexible!`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8 = `**Handout: LST Travel Checklist**

**Before Departure:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_BEFORE}

**Checked luggage:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_CHECKED}

**Carry-on:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_CARRYON}

**Neck wallet or money belt**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_PERSON}

**Day of Departure:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_DAY}

**During Travel**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_DURING}

**Transfer/Transit:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_TRANSFER}

**Travel Disruptions:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_DISRUPTIONS}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_9_INTRO = `Though each project has its own unique aspects, here is a general example of what an LST project might look like.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_9_WEEKLY = `- **Day 1 (Saturday)** — Leave Home
- **Day 2** — Arrival at Host Site; Information Meeting
- **Day 3 (Monday)** — Conversation Sessions begin
- **Days 4–14** — Regular schedule:
  - Conversation Sessions Monday–Friday
  - Weekly Social Event = Friday
  - Free day = Saturday
- **Day 14** — Final sessions, final party, saying good-bye
- **Day 15 (Saturday)** — Leave site for home; Arrive home`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_9_DAILY = `- **7:30 a.m.** Your alarm sounds! Sleepy from the wonderful meal you shared at your Reader's home last night, you wake up and stumble into the shower. Oops! You forgot that today was the day the hot water was turned off in your building. Rinse quickly!!
- **8:30** Out the door to your bus stop. Now that you've been on-site for a few days you begin to recognize certain landmarks on this route.
- **9:00** You gather with the rest of your team for morning devotional and team-time. After devotional, your team meets to make final preparations for your party tomorrow evening.
- **9:45** Before your team meeting ends, Readers show up early!
- **10:00 a.m. – 12:00 p.m.** Both of your scheduled Readers show up.
- **12:00–14:00** Team lunch. Lunch is your largest meal of the day, so you meet up to cook some pasta.
- **14:00–19:00** You have three Readers scheduled and they all come. You spend an hour calling Readers who participated in the last LST project to see if they want to sign up. You spend another hour updating your Reader Information Pages.
- **19:00** You're doing great with your food budget, so your team goes to the local Ramen shop for dinner. A couple of Readers join you!
- **21:00** You're back home. You check your schedule for the next day, reviewing your Reader Information Pages. You hop online to check and respond to email and social media.
- **23:00** Off to bed!`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_9 = `**Handout: Sample LST Project Schedules**

${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_9_INTRO}

**Sample Weekly Schedule (Two Week Project):**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_9_WEEKLY}

**Sample Daily Schedule:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_9_DAILY}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_10_INTRO = `Use this sample to craft your own final report to send to your contributors and friends when you return.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_10_LETTER = `Dear Friends,

Backed by your prayers and support, my Let's Start Talking team and I spent three weeks in Buenos Aires, Argentina this summer reading the gospel of Luke with 25 different people. Most of our Readers came 2-3 times a week for one hour sessions. Together we held over 200 hours of Bible-based English conversation sessions with people of all ages. Many of these were searching for meaning in their lives.

It was difficult to walk away from our new friends at the end of our trip. Yet we wholeheartedly trust that God loves each and every one of our Readers, and we believe that he has a wonderful plan for their lives. We give thanks to God for allowing us to see and be a part of His work. He is so good. Thank you for supporting this work financially. Like you, we believe there is absolutely nothing more important in life than investing in people. If you could have been there with us you would have seen the joy that Christ's message brings. Many of our Readers long for the friendship, peace, and forgiveness that Christ so generously gives.

We have included some pictures that we hope will help tell the story of our work. We want you to know too that our work was just one of many LST projects taking place this year. These projects, along with other LST Workers sharing Jesus online (LST Connect) and in their neighborhoods (LST FriendSpeak) mean that throughout this entire year hundreds and hundreds of Readers will have the chance to read the story of Jesus, often for the very first time. You can find out more about the work done this year around the world at the LST website: www.LST.org

This powerful work could not have been done without your generous contribution. Thank you for your commitment to sharing the good news of Jesus with people around the world. We love you and wish you the very best!

With love and appreciation,
Your Signature`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_10 = `**Handout: Sample Final Report**

${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_10_INTRO}

${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_10_LETTER}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_WRAPPING_UP = `As you're wrapping up this session please do the following:
- Spend some time in prayer together.
- Schedule your next meeting together.
- Take the Quiz for this module (each person should take it individually with their own account to the training platform).`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_QUIZ = [
  {
    id: "m5q1",
    prompt: "I have watched all video content.",
    options: ["Yes", "No"],
  },
  {
    id: "m5q2",
    prompt: "I have reviewed any written content.",
    options: ["Yes", "No"],
  },
  {
    id: "m5q3",
    prompt: "I have talked with my team about the content of this module.",
    options: ["Yes", "No"],
  },
];

const TRAINING_CENTER_PROTOTYPE_MODULE_5_SECTIONS = [
  {
    id: "m5s1",
    title: "Making LST Work Onsite: Overview and Instructions",
    dueDate: "2026-08-18",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_OVERVIEW,
    fullSessionBlocks: [
      {
        heading: "Overview",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_OVERVIEW_INTRO,
        card: true,
      },
      {
        heading: "Conduct a Cultural Clue",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_OVERVIEW_CULTURAL,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Have a Team Devotional",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_OVERVIEW_DEVOTIONAL,
        card: true,
        cardTone: "reminder",
      },
    ],
  },
  {
    id: "m5s2",
    title: "Making LST Work Onsite: Video (1 of 5)",
    dueDate: "2026-08-25",
    body: "Watch video 1 of 5 on: LST Parties.",
    showVideo: true,
    videoEmbedUrl: TRAINING_CENTER_PROTOTYPE_ONSITE_VIDEO_1_EMBED_URL,
    fullSessionBlocks: [
      {
        heading: "Watch",
        body: "Watch video 1 of 5 on: **LST Parties.**",
        card: true,
      },
    ],
  },
  {
    id: "m5s3",
    title: "Making LST Work Onsite: Video (2 of 5)",
    dueDate: "2026-09-01",
    body: "Watch video 2 of 5 on: The Administrative Aspects of Your LST Project",
    showVideo: true,
    videoEmbedUrl: TRAINING_CENTER_PROTOTYPE_ONSITE_VIDEO_2_EMBED_URL,
    fullSessionBlocks: [
      {
        heading: "Watch",
        body: "Watch video 2 of 5 on: **The Administrative Aspects of Your LST Project**",
        card: true,
      },
    ],
  },
  {
    id: "m5s4",
    title: "Making LST Work Onsite: Video (3 of 5)",
    dueDate: "2026-09-08",
    body: "Watch video 3 of 5 on: Starting and Ending Well.",
    showVideo: true,
    videoEmbedUrl: TRAINING_CENTER_PROTOTYPE_ONSITE_VIDEO_3_EMBED_URL,
    fullSessionBlocks: [
      {
        heading: "Watch",
        body: "Watch video 3 of 5 on: **Starting and Ending Well.**",
        card: true,
      },
    ],
  },
  {
    id: "m5s5",
    title: "Making LST Work Onsite: Video (4 of 5)",
    dueDate: "2026-09-15",
    body: "Watch video 4 of 5 on: Communication.",
    showVideo: true,
    videoEmbedUrl: TRAINING_CENTER_PROTOTYPE_ONSITE_VIDEO_4_EMBED_URL,
    fullSessionBlocks: [
      {
        heading: "Watch",
        body: "Watch video 4 of 5 on: **Communication.**",
        card: true,
      },
    ],
  },
  {
    id: "m5s6",
    title: "Making LST Work Onsite: Video (5 of 5)",
    dueDate: "2026-09-22",
    body: "Watch video 5 of 5 on: Risk Management.",
    showVideo: true,
    videoEmbedUrl: TRAINING_CENTER_PROTOTYPE_ONSITE_VIDEO_5_EMBED_URL,
    fullSessionBlocks: [
      {
        heading: "Watch",
        body: "Watch video 5 of 5 on: **Risk Management.**",
        card: true,
      },
    ],
  },
  {
    id: "m5s7",
    title: "Making LST Work Onsite: Handout 1 of 10",
    dueDate: "2026-09-22",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_1,
    fullSessionBlocks: [
      {
        heading: "Discuss This Handout — LST Parties",
        body: `**LST parties, or social events, CONNECT!**

${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_1_CONNECT}`,
        card: true,
      },
      {
        heading: "The type of social event depends on several factors",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_1_FACTORS,
        card: true,
      },
      {
        heading: "Additional Tips",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_1_TIPS,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Discussion",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_1_DISCUSSION,
        card: true,
        cardTone: "discuss",
      },
    ],
  },
  {
    id: "m5s8",
    title: "Making LST Work Onsite: Handout 2 of 10",
    dueDate: "2026-09-22",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2,
    fullSessionBlocks: [
      {
        heading: "Discuss This Handout — The Administrative Aspects of Your Project",
        body: `**Administration is important because:**

${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2_WHY}`,
        card: true,
      },
      {
        heading: "Funds Tracking (tracking team funds in a team budget)",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2_FUNDS,
        card: true,
      },
      {
        heading: "Record Journal (tracking your TEAM'S work with Readers)",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2_JOURNAL,
        card: true,
      },
      {
        heading: "Reader Information Pages (tracking your INDIVIDUAL work with Readers)",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2_RIPS,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Discussion",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_2_DISCUSSION,
        card: true,
        cardTone: "discuss",
      },
    ],
  },
  {
    id: "m5s9",
    title: "Making LST Work Onsite: Handout 3 of 10",
    dueDate: "2026-09-22",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_3,
    fullSessionBlocks: [
      {
        heading: "Discuss This Handout — Starting and Ending Well",
        body: `**Travel General principles (we have lots of tips and more detailed suggestions on a separate handout):**

${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_3_TRAVEL}`,
        card: true,
      },
      {
        heading: "Starting Well",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_3_STARTING,
        card: true,
      },
      {
        heading: "Ending Well",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_3_ENDING,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Discussion",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_3_DISCUSSION,
        card: true,
        cardTone: "discuss",
      },
    ],
  },
  {
    id: "m5s10",
    title: "Making LST Work Onsite: Handout 4 of 10",
    dueDate: "2026-09-22",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_4,
    fullSessionBlocks: [
      {
        heading: "Discuss This Handout — Communication",
        body: `**Two groups to focus on:**

${TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_4_GROUPS}`,
        card: true,
      },
      {
        heading: "Two pieces of advice",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_4_ADVICE,
        card: true,
      },
      {
        heading: "Additional tips",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_4_TIPS,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Discussion",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_4_DISCUSSION,
        card: true,
        cardTone: "discuss",
      },
    ],
  },
  {
    id: "m5s11",
    title: "Making LST Work Onsite: Handout 5 of 10",
    dueDate: "2026-09-22",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5,
    fullSessionBlocks: [
      {
        heading: "Discuss This Handout — Risk Management",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_VERSE,
        card: true,
      },
      {
        heading: "Avoid two extremes",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_EXTREMES,
        card: true,
      },
      {
        heading: "Keep a low profile",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_PROFILE,
        card: true,
      },
      {
        heading: "Practice situational awareness",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_AWARENESS,
        card: true,
      },
      {
        heading: "Prepare for emergencies",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_EMERGENCIES,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Sexual Harassment and Abuse",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_HARASSMENT,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Discussion",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_5_DISCUSSION,
        card: true,
        cardTone: "discuss",
      },
    ],
  },
  {
    id: "m5s12",
    title: "Making LST Work Onsite: Handout 6 of 10",
    dueDate: "2026-09-22",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_6,
    fullSessionBlocks: [
      {
        heading: "Planning Parties",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_6_INTRO,
        card: true,
      },
      {
        heading: "Party Planning Template",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_6_TEMPLATE,
        card: true,
      },
      {
        heading: "Tips for Having Great LST Parties",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_6_TIPS,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Evaluation questions",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_6_EVALUATION,
        card: true,
        cardTone: "discuss",
      },
    ],
  },
  {
    id: "m5s13",
    title: "Making LST Work Onsite: Handout 7 of 10",
    dueDate: "2026-09-22",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_7,
    fullSessionBlocks: [
      {
        heading: "Example — Reader Information Page",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_7_INTRO,
        card: true,
        linkButton: {
          label: "Reader Information Page Example (PDF)",
          href: TRAINING_CENTER_PROTOTYPE_ONSITE_RIP_EXAMPLE_URL,
        },
      },
    ],
  },
  {
    id: "m5s14",
    title: "Making LST Work Onsite: Handout 8 of 10",
    dueDate: "2026-09-22",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8,
    fullSessionBlocks: [
      {
        heading: "LST Travel Checklist — Before Departure",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_BEFORE,
        card: true,
      },
      {
        heading: "Checked luggage",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_CHECKED,
        card: true,
      },
      {
        heading: "Carry-on",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_CARRYON,
        card: true,
      },
      {
        heading: "Neck wallet or money belt",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_PERSON,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Day of Departure",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_DAY,
        card: true,
      },
      {
        heading: "During Travel",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_DURING,
        card: true,
      },
      {
        heading: "Transfer/Transit",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_TRANSFER,
        card: true,
      },
      {
        heading: "Travel Disruptions",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_8_DISRUPTIONS,
        card: true,
        cardTone: "reminder",
      },
    ],
  },
  {
    id: "m5s15",
    title: "Making LST Work Onsite: Handout 9 of 10",
    dueDate: "2026-09-22",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_9,
    fullSessionBlocks: [
      {
        heading: "Sample LST Project Schedules",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_9_INTRO,
        card: true,
      },
      {
        heading: "Sample Weekly Schedule (Two Week Project)",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_9_WEEKLY,
        card: true,
      },
      {
        heading: "Sample Daily Schedule",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_9_DAILY,
        card: true,
        cardTone: "reminder",
      },
    ],
  },
  {
    id: "m5s16",
    title: "Making LST Work Onsite: Handout 10 of 10",
    dueDate: "2026-09-22",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_10,
    fullSessionBlocks: [
      {
        heading: "Sample Final Report",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_10_INTRO,
        card: true,
      },
      {
        heading: "Sample letter",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_HANDOUT_10_LETTER,
        card: true,
        cardTone: "reminder",
      },
    ],
  },
  {
    id: "m5s17",
    title: "Making LST Work Onsite: Wrapping Up",
    dueDate: "2026-09-22",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_WRAPPING_UP,
    fullSessionBlocks: [
      {
        heading: "Wrapping Up",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_WRAPPING_UP,
        card: true,
        cardTone: "reminder",
      },
    ],
  },
  {
    id: "m5quiz",
    title: "Making LST Work Onsite: Quiz",
    dueDate: "2026-09-22",
    isQuiz: true,
    quizQuestions: TRAINING_CENTER_PROTOTYPE_ONSITE_QUIZ,
  },
];

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_OVERVIEW = `This module is a resource section for your days onsite. It contains checklists, examples, reminders, and other resources you may find helpful. If you find a resource that's not listed here let us know so we can include it!

Because of the nature of the content in this module, it may not lend itself to an actual team training session. Regardless, each team member should review the entire module, so they know the tools available to them.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_CHECKLISTS_INTRO = `Review this information prior to departure then utilize it as needed while onsite.

**Project Management Checklists**
The project management checklists below will help you begin your project after arrival, maintain it during the middle phase of your work, and end it well prior to coming home.

Your project will run well if you take time out each week to review the work your team is doing and anticipate some of the things that still need to happen either that week or during the project phase you're in (beginning, maintaining, ending). Excellent teams will pause their work each week for this important time of reflection.

The following four project management checklists are below:
- Project Beginning Checklist
- Project Maintenance Checklist
- Project Ending Checklist
- Team Report Checklist`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_INTRO = `In most cases this checklist will cover your first week on site. On longer projects the items here may be spread out over an entire week. On shorter projects this beginning phase may be compressed into a few days. Either way, the items below outline the most important action items for your team as it gets started on site.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_HOST = `The team should meet with the local host as soon as possible after arrival; typically, the day of arrival, though in some cases it may need to occur the next day.
- Check on any rules which you may need to know about concerning the general culture, the work site, your housing, etc.
- Review your team's work schedule and free-time schedule. Is everyone clear on what days are workdays? What times during the day Readers will come? What times will the team break for meals? What days are free days?
- Arrange with the host to introduce yourselves to the local congregation at the first available service.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_INFO = `- Arrive early (at least an hour before the published start-time).
- Set the room to be comfortable and welcoming.
- Go over the script ahead of time and pray together.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_SETTLED = `- Get to know the neighborhood, shop, exchange money, etc.
- Begin cooking, cleaning, and daily devotional schedule.
- Sleep and eat by the clock!`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_READING = `- Remember to pray and prepare for each conversation!
- At the conclusion of each Reading session remind the Reader of their next appointment.
- Fill out your Reader Information Pages after each session.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_PARTIES = `- Have the dates for your LST parties been set? Do you have invitations to hand out?
- Arrange for repeated party announcements (type, time, etc.) for both Readers and at church.
- If your Reader numbers are low, consider hosting a party during this first week even if it wasn't part of your original plan.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_GUEST = `- Make sure you know any house rules and follow them. Ask!
- Don't get too casual. Even when LST rents housing for a team, it's still not really "home."`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_CHORES = `In addition to your daily devotional, most likely there will be weekly chores to be done while you are on site. These may include cooking, cleaning the kitchen, straightening up the work site, scrubbing the shower, etc.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_MAINTENANCE_INTRO = `This checklist will help you manage your work during the middle phase of your project. This phase covers the period of time that consumes most of your work on site. In some cases, this phase may last several weeks (for example, weeks 2-5 on a six-week project). In other cases, this maintenance phase may last about a week (for example, the later part of week 1 and the early part of week 2 on a two-week project).`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_MAINTENANCE_BODY = `**Develop Relationships**
- Focus on knowing your Readers individually. Keep detailed notes on Reader Information Pages.
- Take advantage of invitations to interact with Readers outside of reading sessions – remember to always go in pairs!
- Encourage close Readers to join you for a church service or Bible class.
- Be friendly and available to church members. Take advantage of opportunities to include them and inform them.

**Recruit more Readers**
If your reading schedules are not full, get out and recruit more Readers! Put up flyers, talk to people around the neighborhood, ask current Readers to invite a friend or family member.

**Retain Current Readers**
- Make every Reading session important and treat every Reader as important.
- Ensure you're doing an excellent job of helping your Reader improve with English conversation skills.
- Be on time for every Reader.

**Culture Shock**
Watch out for the beginning signs of culture shock as the newness of things wears off! Stay busy, positive, and aware.

**Connect with Supporters**
- Blog, Facebook, or email those back home who are your partners in this work. Remember to share only those things which encourage and build up the Lord's work!
- Have a Reader write a short thank you message on your blog or Facebook page – be creative!

**Party!**
- Plan, plan, plan!! (see PARTIES)
- Have a plan B.
- Take the time to evaluate what worked and what didn't.

**Evangelistic Free Time (EFT)**
Use free time to prepare for parties, blog, or hang out with church members or Readers.

**Guard the Health of Your Team**
- Watch your schedule to ensure everyone's getting enough rest at night.
- Be vigorous about daily devotional times with your team.

**Maintain Project Records**
- Tracking team expenses
- Recording work statistics
- Reader Information Pages

**Adjust Project Schedule as Needed**
- Need to add an extra hour in the evening to handle more Readers? Start earlier in the day?
- Need more time for lunch? Less for dinner?
- Free days need to be adjusted?

**Team Dynamics**
- Is the team practicing 1-A LEADERSHIP?
- Are interpersonal conflicts being handled in a Christ-like manner, with openness, directness, and forgiveness?
- Are there any issues that you need to make LST aware of before they escalate?

**Plan Now to End Well Later**
- The time between now and your departure will quickly fly, so start planning to end well now!
- Schedule a time now for a hand-off meeting with the LST Host/host. The entire team should plan on participating in this meeting.
- Start thinking about what you can collect now that will help you report about the work when you return home – take lots of pictures of reading sessions, Readers, parties, and church.
- Shop now for any gifts of appreciation/hostess gifts that you will need to give before you leave. Begin planning and advertising your special farewell party, give Readers invitations to share with their families, etc.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_ENDING_INTRO = `This checklist will help you end your work well. It may be hard to believe, but ending a project well takes as much work as it did to start the project! For teams who are on site longer this checklist might cover the last full week of work. Teams who are on site for shorter periods of time may accomplish these tasks in a shorter period of time.

Regardless of the length of time on site, successful LST teams will look over this project BEFORE their last week begins to ensure they know the primary tasks of ending well.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_ENDING_BODY = `**Continue Connecting Relationships**
Continue the process of shifting the focus off of your individual relationship with your Reader and connecting them with local Christians at parties or during free time get-togethers.

**Planning Follow-up**
Begin discussing various follow-up options for your Readers with the LST host. Different levels of follow-up will be appropriate for different Readers.

Suggestions for follow-up activities include:
- Continue conversational LST sessions both in groups and one-with-one.
- Arrange for personal Bible studies with interested Readers.
- Continue parties on a regular and frequent basis with local members as hosts.
- Arrange for other group activities with Readers.

**Ready to Report**
Useful items to gather before you leave for reporting include:
- Videos/photos of reading sessions, the congregation, the missionaries, a party, your host family, your favorite Reader.
- List of Readers' names and addresses.
- Quotes from Readers or notes from info pages.
- Host(s) names (including children) and addresses.
- A copy of your team's final stats on the number of Readers.

**Making the Hand-off**
- Go over the completed Reader Info Pages (RIPs) one by one with host at a final meeting. This is often done on one of the last days of the project. Take the initiative in planning this meeting early in the project.
- Communicate to your Readers the different options for follow-up that are available to them.

**Saying Goodbye**
Spend your last weekend on-site with new friends saying goodbye in a meaningful way. Give special gifts to host families, LST hosts, or other church members who worked closely with you. Remember not to make promises about writing or visiting that you will not keep. Finally, let go…and trust God.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TEAM_REPORT = `Utilize this checklist when communicating with your LST Team Developer. Please set up a regular time of communication with them; at least once a week. Your Team Rep. may take care of this reporting, though the entire team is welcome to participate.

**Topics to cover each week with your LST Team Developer:**
- Personal well-being of each team member (physical, emotional, spiritual, social)
- Spiritual well-being of the team (devotionals)
- Team dynamics
- Reading Sessions (attendance, no shows, quantity, quality)
- Parties, outside activities
- Relationship to LST host and LST hosting church
- Finances (team finances, team budget, cash on hand, etc.)
- News, personal items, prayer requests`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_CHECKLISTS = `**Project Tools 1: Checklists (Beginning, Maintaining, and Ending Your Project)**

${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_CHECKLISTS_INTRO}

**Project Beginning Checklist**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_INTRO}

**Initial Meeting with Site Host**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_HOST}

**Host your Information Meeting (note: some sites will not have an Information Meeting)**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_INFO}

**Get Settled and On Schedule**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_SETTLED}

**Begin Reading Sessions**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_READING}

**Parties**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_PARTIES}

**Be a Thoughtful House Guest**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_GUEST}

**Weekly Team Chores**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_CHORES}

**Project Maintenance Checklist**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_MAINTENANCE_INTRO}

${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_MAINTENANCE_BODY}

**Project Ending Checklist**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_ENDING_INTRO}

${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_ENDING_BODY}

**Team Report Checklist**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TEAM_REPORT}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BUDGET_INTRO = `Watching the budget and handling the funds appropriately is the responsibility of the entire team; however, we have divided the tasks up for practical reasons. Typically one person on the team handles the accounting spreadsheet and the funds. Money decisions are often simple, but usually affect the entire team. For that reason, we've included these guidelines and explanations to help you. In addition to these guidelines we trust you to exercise your own good judgment. LST will be checking in with you weekly to answer any budget questions and help you stay on track.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BUDGET_GUIDELINES = `- LST is committed to providing each team with all the funds that it needs to successfully accomplish the work that we have committed to do in that city.
- The basis for the budget you have received is previous experience at that site as well as the general experience of all LST teams. You will generally have more than enough funds to cover the expenses that your team will incur.
- In most cases teams will cash the check LST sends them and utilize cash onsite. Contact LST before assuming it's ok to leave the funds in a stateside account and access them onsite through ATM machines.
- All of the funds which you receive are LST funds. Because we're all spending LST funds on site the following applies: 1) Any funds remaining at the end of the Project are to be returned to LST. 2) The funds are for LST expenses, not for Workers' personal expenses. In an emergency (hospitalization, stolen wallets, etc.), LST may authorize you to loan a team member funds from the emergency fund, but we ask that the Worker call home to cover the loan as soon as possible. 3) No one is reimbursed for budgeted expenses that they personally do not incur. (Example: Worker does not do laundry and wishes to receive his/her laundry allowance to use for travel.)
- You should not move funds from one budget item to another without approval from LST.
- Receipts are required for reimbursement and kept for the team accountant. We understand that it is sometimes difficult, if not impossible, to get receipts in foreign countries, but you can and should make your own cash receipts to substitute if real receipts are not possible.
- Reimburse only those expenses outlined by the guidelines or which you feel are a real part of the project.
- Record every expense. If you're uncertain about the category just ask LST.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BUDGET_EXPLAIN = `The following explanation is given in order to help you understand each category of your budget.

**Food**
LST provides a set amount per person per day with the intention that the money will be pooled among team members, at least for staples and some meals. If your food budget seems inadequate, talk to LST. Remember that the food budget assumes at most sites that you'll be buying groceries and cooking for yourselves, not eating out.

**Parties**
The party budget should not be exceeded. The allotted amount is usually more than adequate unless a team begins to purchase large quantities of food for their parties.

**Local Travel**
Local travel money is the budget for tram, bus, subway travel that is your regular day-to-day travel. Be sure to investigate monthly or weekly passes, since these are usually much less expensive.

**Tel/Comm**
This budget is for work-related communication. Typical examples of this are the communication you'll do with Readers, your host, or local church members. You'll also be in touch with LST weekly. As you communicate there are a couple of important things to remember.

First, communicate the cheapest way possible, but not at the expense of the local church or LST Host. Many of you will communicate with Readers via a local mobile phone. Be aware of the costs for using this phone. Your communication with LST will likely take place via the internet. Teams often use Zoom, WhatsApp, or some other video-conferencing application. Be sure to ask about the cost of using any available wifi networks.

Second, don't confuse personal communication with LST communication. If you need to communicate with people back home, please do that at your own expense. Your budget doesn't cover personal communication.

**Emergency/Other**
These are funds for unexpected costs such as:
- Pictures needed for work-related public transportation passes
- Unexpected guests at meals
- Ads for more Readers
- Pots/pans/blankets

You should not hesitate to do what you feel is necessary for the benefit of the project. Emergencies happen during the last days as often as during the first days. On the other hand most teams will return from their project having spent none of these funds.

**EndMeeting**
Funds in this category are primarily for triggering a debriefing/celebration meal as a team and onsite prior to departure.

**Transportation to/from Site**
Occasionally you may be called upon to take a bus or taxi to or from the airport. We will usually make these arrangements and will provide you an appropriate amount to cover the expense.

**Laundry**
Laundry possibilities vary widely. Your budgeted amount is our best guess based on the information given us. We have not budgeted for dry cleaning, so avoid bringing clothes that require it.

**Housing**
LST works with your site Host to determine housing for your team. While we normally ask the hosting group to pay for housing, if there are funds in this category it means LST has agreed to cover some portion of the housing cost. LST will let you know specifically what these funds are for if they are included in your budget. Otherwise you do not need to offer to cover housing expenses while onsite.

**Hotel to/from Site**
Rarely needed. If you are forced to spend the night en route, we usually will make those arrangements and prepay, but sometimes cannot prepay and will send the money with the team.

**Income**
Occasionally, you will actually receive money rather than spending it. This happens sometimes when you receive a contribution from the local church or an individual member, or when you collect a fee for the workbooks from Readers. Include this income under OTHER, and be sure and report it to LST so that your cash balances.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BUDGET = `**Project Tools 2: Team Budget**

**Budget Matters**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BUDGET_INTRO}

**Guidelines**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BUDGET_GUIDELINES}

**Budget Explanation**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BUDGET_EXPLAIN}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_EXPECTATIONS_INTRO = `When you applied, you agreed to follow this set of guidelines for living and working onsite. We provide a copy here as a reminder of this pledge.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_EXPECTATIONS = `**Project Tools 3: LST Expectations and Commitments**

${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_EXPECTATIONS_INTRO}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_PARTIES_INTRO = `Use this party resource while planning and hosting social events onsite.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_PARTIES = `**Onsite Tools: LST Parties**

${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_PARTIES_INTRO}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_INTRO = `So much is available online concerning travel and culture! Below is a short list of web sites you might want to check out as you prepare to go, or even while you're on site. This is not an exhaustive list by any means, but it might get you pointed in the right direction.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_ENTRY = `- [Sherpa](https://apply.joinsherpa.com/travel-restrictions) — Entry requirements for countries (travel and health restrictions)
- [US Department of State Travel Advisories](https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html/)`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_SAFETY = `- [US State Department](https://travel.state.gov/content/travel/en/international-travel.html)
- [Canadian Department of Foreign Affairs and International Trade](https://travel.gc.ca/travelling/advisories)
- [US Embassy or Consulate locations around the world](https://www.usembassy.gov/)
- [Travel checklist](https://travel.state.gov/content/travel/en/international-travel/before-you-go/travelers-checklist.html)`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_REGS = `- [TSA](http://www.tsa.gov/) — Travel regulations and policies (US)
- [CATSA](http://www.catsa.gc.ca/) — Travel regulations and policies (Canada)`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_ELECTRIC = `- [World Standards — Electricity](http://users.telenet.be/worldstandards/electricity.htm)
- [Wikipedia — AC power plugs and sockets](https://en.wikipedia.org/wiki/AC_power_plugs_and_sockets#Types_in_present_use)`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_FLIGHTS = `- [SeatGuru](https://www.seatguru.com/) — Seating diagrams for over 100 airlines around the globe, with the best and worst seats color-coded in each section
- [iFly](https://www.ifly.com/) — Exhaustive guide to hundreds of world-wide airports (and what to do on a long layover!)
- [Airline Meals](http://www.airlinemeals.net/) — Information and pictures about airline meals`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_CULTURE = `- [Lonely Planet Destinations](http://www.lonelyplanet.com/destinations) — General cultural information about sites around the world
- [CIA World Factbook](https://www.cia.gov/the-world-factbook/) — U.S. government profiles of countries and territories around the world
- [U.S. State Department Travel](http://www.state.gov/travel/) — Detailed information about countries, travel, safety, etc.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_STEP = `- [US Citizens — STEP](https://step.state.gov/step)
- [Canadian Citizens — Registration](https://www.travel.gc.ca/register)`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_LANGUAGE = `- [Duolingo](https://www.duolingo.com/) — Popular language-learning site and app
- [Rosetta Stone](http://www.rosettastone.com/) — One of the mainstays of language-learning for travelers
- [Google Translate](https://translate.google.com/) — Translate a menu, a sign, or a travel website within seconds`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_VACCINES = `- [CDC](http://www.cdc.gov/) — Center for Disease Control — Choose Travelers help`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_CURRENCY = `- [XE Currency](http://www.xe.com/) — 180 currencies from 250 places, updated every minute`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_COMM = `Many Hosts and Readers use mobile apps for communicating with LST teams on site. Check with your host about the use of apps like WhatsApp, WeChat, Kakao, Facebook Messenger, etc.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_COOKING = `- [Genius Kitchen — 5-ingredient dinners](http://www.geniuskitchen.com/ideas/5-ingredient-dinners-6023?c=3806)
- [Better Homes & Gardens Recipes](https://www.bhg.com/recipes/)
- [Allrecipes](https://www.allrecipes.com/)`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_OTHER = `- [Prepare My Mission](https://www.preparemymission.com/) — Information and Equipment for short-term mission projects
- [TripIt](https://www.tripit.com/) — Manage itineraries, car rentals, hotel reservations, meetings, etc.
- [TripCase](https://www.tripcase.com/login) — Very similar to TripIt
- [TripAdvisor](https://www.tripadvisor.com/) — For hotels and loads of sightseeing advice
- [Airbnb](https://www.airbnb.com/) — Rent a private room or apartment in countries around the world. See also HomeAway, VRBO, HostelWorld, etc.
- Maps — Google Maps
- Search the web for "Best Travel Apps" for other lists of helpful tools`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL = `**Project Tools 6: Travel Resources**

${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_INTRO}

**Entry Requirements for Countries (travel and health restrictions)**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_ENTRY}

**Safety and Security**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_SAFETY}

**Official Travel Regulations and Policies**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_REGS}

**Voltage, Plug Adapters, and Other Electrical Matters**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_ELECTRIC}

**Flights and Airports**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_FLIGHTS}

**Culture and General Site Information**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_CULTURE}

**To Register with State Department**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_STEP}

**Language and Translation**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_LANGUAGE}

**Vaccination Requirements and Recommendations**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_VACCINES}

**Currency Conversions**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_CURRENCY}

**Communication**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_COMM}

**Cooking**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_COOKING}

**Other**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_OTHER}`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_DEVOTIONAL_INTRO = `Your team will grow through daily devotional time together as well as a deeper (or fun!) "Question of the day." We offer the following as suggestions for both. The scripture suggestions expose your team each week to something from Jesus (Gospel), an example from the early church (Acts), a teaching from one of the New Testament letters, and an encouragement from Psalms. The question of the day is meant to create purposeful conversation at any point during the day, and it is not necessarily related to the daily scripture. Whether you utilize little, a lot, or none of the suggestions below please pursue these kinds of daily interactions together.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_DEVOTIONAL_REFLECT = `**Reading God’s Word – What is God revealing to me today through his WORD?**
- What does a particular Scripture reveal to us about God? Scripture is first and foremost about God, so when we read let’s look for what we’re learning about God.
- What does a particular scripture reveal to us about ourselves? Scripture serves as a mirror so when we read let’s consider what we’re learning about ourselves.
- How can we apply a particular scripture today? Scripture doesn’t just inform us. Transformation comes as we apply scripture to our daily lives for the sake of others.

**Reading God’s Work – What is God revealing to me today through his WORK?**
- What’s one way you saw God at work today? Whether you had a lot of Readers or almost none, God was working among you. Identify one way He was working.
- What’s one thing you did today that was good? Once we identify how God was at work let’s single out one way we participated in God’s good work!
- What’s one thing you can do to make tomorrow even better? Having noticed God at work, and one way we contributed to that work, what can we do in order to make tomorrow excellent?

Your team may find it helpful to reflect on God’s WORD in the morning before you begin work while addressing God’s WORK in the evening at the end of your work day.`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_DEVOTIONAL_PROMPTS = `**Prompt 1**
- Scripture — John 15:1-8 (the vine and the branches)
- God’s Word/Work questions
- Question of the Day — What does the word "home" mean to you?

**Prompt 2**
- Scripture — Acts 2:42-47 (devoted to each other)
- God’s Word/Work questions
- Question of the Day — What were you like in middle school?

**Prompt 3**
- Scripture — 2 Corinthians 5:16-21 (ministry of reconciliation)
- God’s Word/Work questions
- Question of the Day — What is a sight, sound, taste, touch, or smell you’re thankful for?

**Prompt 4**
- Scripture — Psalm 1
- God’s Word/Work questions
- Question of the Day — How would you describe your perfect weekend?

**Prompt 5**
- Scripture — Mark 4:26-29 (parable of the growing seed)
- God’s Word/Work questions
- Question of the Day — What’s an object that represents your current view of God?

**Prompt 6**
- Scripture — Acts 4:23-31 (Peter released and the believers pray)
- God’s Word/Work questions
- Question of the Day — What are your feelings about church or religion?

**Prompt 7**
- Scripture — Psalm 15
- God’s Word/Work questions
- Question of the Day — How have you changed in this current season of your life?

**Prompt 8**
- Scripture — Luke 6:27-36 (love for enemies)
- God’s Word/Work questions
- Question of the Day — What is a favorite memory from your childhood?

**Prompt 9**
- Scripture — Acts 8:26-40 (Philip and the Ethiopian)
- God’s Word/Work questions
- Question of the Day — What is one thing that causes you stress?

**Prompt 10**
- Scripture — Romans 12:1-8 (living sacrifices)
- God’s Word/Work questions
- Question of the Day — What is something that made you laugh recently?

**Prompt 11**
- Scripture — Psalm 16
- God’s Word/Work questions
- Question of the Day — What is a verse or piece of Scripture that’s meaningful to you these days?

**Prompt 12**
- Scripture — Luke 8 (parable of the sower)
- God’s Word/Work questions
- Question of the Day — What movie is in your top 10? Why?

**Prompt 13**
- Scripture — Acts 17:22-31 (Paul in Athens)
- God’s Word/Work questions
- Question of the Day — If you could go anywhere on vacation where would it be?

**Prompt 14**
- Scripture — Philippians 4:4-9 (right thinking)
- God’s Word/Work questions
- Question of the Day — What is your favorite holiday?

**Prompt 15**
- Scripture — Luke 15:11-32 (parable of the lost son)
- God’s Word/Work questions
- Question of the Day — What’s a gift you received that you really appreciated?

**Prompt 16**
- Scripture — Acts 14:15-17 (turn from worthless things)
- God’s Word/Work questions
- Question of the Day — What’s a belief about yourself that you no longer hold to?

**Prompt 17**
- Scripture — 1 Corinthians 9:19-23 (become all things to all people)
- God’s Word/Work questions
- Question of the Day — What’s your dream job?

**Prompt 18**
- Scripture — Psalm 19:1-6
- God’s Word/Work questions
- Question of the Day — What do you think makes someone a good friend?

**Prompt 19**
- Scripture — Luke 18:1-8 (parable of the persistent widow)
- God’s Word/Work questions
- Question of the Day — Would you rather have the power to time travel or the power to see the future?

**Prompt 20**
- Scripture — Acts 16:11-15 (Lydia’s conversion)
- God’s Word/Work questions
- Question of the Day — What’s a great piece of advice you’ve received?

**Prompt 21**
- Scripture — Psalm 19:7-11
- God’s Word/Work questions
- Question of the Day — What has this LST project reminded you about life?`;

const TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_DEVOTIONAL = `**Project Tools 7: Daily Devotional and Question of the Day**

${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_DEVOTIONAL_INTRO}

**General reflection questions on God’s word and work:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_DEVOTIONAL_REFLECT}

**Sample daily devotionals and questions of the day:**
${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_DEVOTIONAL_PROMPTS}`;

const TRAINING_CENTER_PROTOTYPE_MODULE_6_SECTIONS = [
  {
    id: "m6s1",
    title: "Onsite Tools: Overview and Instructions",
    dueDate: "2026-09-17",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_OVERVIEW,
    fullSessionBlocks: [
      {
        heading: "Overview",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_OVERVIEW,
        card: true,
      },
    ],
  },
  {
    id: "m6s2",
    title: "Onsite Tools: Checklists",
    dueDate: "2026-09-17",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_CHECKLISTS,
    fullSessionBlocks: [
      {
        heading: "Project Tools 1: Checklists",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_CHECKLISTS_INTRO,
        card: true,
      },
      {
        heading: "Project Beginning Checklist",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_INTRO,
        card: true,
      },
      {
        heading: "Initial Meeting with Site Host",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_HOST,
        card: true,
      },
      {
        heading: "Host your Information Meeting",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_INFO,
        card: true,
      },
      {
        heading: "Get Settled and On Schedule",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_SETTLED,
        card: true,
      },
      {
        heading: "Begin Reading Sessions",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_READING,
        card: true,
      },
      {
        heading: "Parties",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_PARTIES,
        card: true,
      },
      {
        heading: "Be a Thoughtful House Guest",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_GUEST,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Weekly Team Chores",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BEGINNING_CHORES,
        card: true,
      },
      {
        heading: "Project Maintenance Checklist",
        body: `${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_MAINTENANCE_INTRO}

${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_MAINTENANCE_BODY}`,
        card: true,
      },
      {
        heading: "Project Ending Checklist",
        body: `${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_ENDING_INTRO}

${TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_ENDING_BODY}`,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Team Report Checklist",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TEAM_REPORT,
        card: true,
        cardTone: "discuss",
      },
    ],
  },
  {
    id: "m6s3",
    title: "Onsite Tools: Team Budget",
    dueDate: "2026-09-17",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BUDGET,
    fullSessionBlocks: [
      {
        heading: "Project Tools 2: Team Budget — Budget Matters",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BUDGET_INTRO,
        card: true,
      },
      {
        heading: "Guidelines",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BUDGET_GUIDELINES,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Budget Explanation",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_BUDGET_EXPLAIN,
        card: true,
      },
    ],
  },
  {
    id: "m6s4",
    title: "Onsite Tools: LST Expectations and Commitments",
    dueDate: "2026-09-17",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_EXPECTATIONS,
    fullSessionBlocks: [
      {
        heading: "Project Tools 3: LST Expectations and Commitments",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_EXPECTATIONS_INTRO,
        card: true,
        linkButton: {
          label: "Expectations and Guidelines for LST Workers (PDF)",
          href: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_EXPECTATIONS_URL,
        },
      },
    ],
  },
  {
    id: "m6s5",
    title: "Onsite Tools: LST Parties",
    dueDate: "2026-09-17",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_PARTIES,
    fullSessionBlocks: [
      {
        heading: "LST Parties",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_PARTIES_INTRO,
        card: true,
        linkButton: {
          label: "LST Parties (PDF)",
          href: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_PARTIES_URL,
        },
      },
    ],
  },
  {
    id: "m6s6",
    title: "Onsite Tools: Travel Resources",
    dueDate: "2026-09-17",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL,
    fullSessionBlocks: [
      {
        heading: "Project Tools 6: Travel Resources",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_INTRO,
        card: true,
      },
      {
        heading: "Entry Requirements for Countries",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_ENTRY,
        card: true,
      },
      {
        heading: "Safety and Security",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_SAFETY,
        card: true,
      },
      {
        heading: "Official Travel Regulations and Policies",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_REGS,
        card: true,
      },
      {
        heading: "Voltage, Plug Adapters, and Other Electrical Matters",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_ELECTRIC,
        card: true,
      },
      {
        heading: "Flights and Airports",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_FLIGHTS,
        card: true,
      },
      {
        heading: "Culture and General Site Information",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_CULTURE,
        card: true,
      },
      {
        heading: "To Register with State Department",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_STEP,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Language and Translation",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_LANGUAGE,
        card: true,
      },
      {
        heading: "Vaccination Requirements and Recommendations",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_VACCINES,
        card: true,
      },
      {
        heading: "Currency Conversions",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_CURRENCY,
        card: true,
      },
      {
        heading: "Communication",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_COMM,
        card: true,
      },
      {
        heading: "Cooking",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_COOKING,
        card: true,
      },
      {
        heading: "Other",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_TRAVEL_OTHER,
        card: true,
      },
    ],
  },
  {
    id: "m6s7",
    title: "Onsite Tools: Daily Devotional and Questions of the Day",
    dueDate: "2026-09-17",
    body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_DEVOTIONAL,
    fullSessionBlocks: [
      {
        heading: "Project Tools 7: Daily Devotional and Question of the Day",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_DEVOTIONAL_INTRO,
        card: true,
      },
      {
        heading: "General reflection questions on God’s word and work",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_DEVOTIONAL_REFLECT,
        card: true,
        cardTone: "discuss",
      },
      {
        heading: "Sample daily devotionals and questions of the day",
        body: TRAINING_CENTER_PROTOTYPE_ONSITE_TOOLS_DEVOTIONAL_PROMPTS,
        card: true,
        cardTone: "reminder",
      },
    ],
  },
];

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_OVERVIEW_INTRO = `Sharing life-changing conversations cross-culturally is such a rich experience! No doubt you've experienced new friendships, rich fellowship, thoughtful moments, new adventures, "interesting" smells, and much more on your project. Because of the richness of this experience, because it's occurring cross-culturally, and because God often does something IN us as he's doing something THROUGH us, we want to take time for debriefing.

Debriefing has a practical and personal aspect. Practically, as we debrief each other we learn what's working, what's not, and what can be improved. Personally, we turn our hearts and eyes to sensitively feel the contours of what God might be doing inside of us as a result of our service.

Good debriefing isn't just a once-and-done event. We encourage you to debrief each phase of your LST experience: pre-field, on-field, and post-field. While most of the emphasis in this module is on post-field debriefing – what we'll do together at the end of your project – we encourage you to debrief all along the way. Thoughtfully reflect on your training and preparation, and pause regularly even on site to talk and pray about what you're learning – learning about God, his work, his people, and what he's doing in you.

BEFORE YOU GO ON YOUR PROJECT please read the three short sections on:
- Pre-field debriefing
- On-field debriefing
- Post-field debriefing and Follow Through

Everything noted as "ENDMEETING" we'll touch on when we actually meet for your EndMeeting after your project. :)

When you meet with your team to go over the content of this module, please remember to include the following two items:`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_OVERVIEW_CULTURAL = `Remember, these fun clues are meant to help your team learn to be flexible and be ready for the cultural differences they will likely encounter. The exercises can be a fun way to prepare them to have relationships with people from other cultures different from their own.

Anytime you do one of these cultural clues, take time afterwards to discuss how it made people feel, why some did/did not participate, and what our reaction to the clue has to say about how we may behave in other unfamiliar or uncomfortable situations.

Some of these clues will make people feel silly or uncomfortable. When that happens, see it as an opportunity to talk about how silly we can feel doing something foreign to us. Remind people that while it may feel silly, refusing to participate in another custom may make us come across as rude. Use these to have fun, but also to help each other learn.

Refer to the Welcome Module for ideas or create your own!`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_OVERVIEW_DEVOTIONAL = `Every time you gather for team training you'll have a team devotional. This will be the foundation of every training session with LST. Keep it short but meaningful (10-15 minutes). Feel free to structure a time of worship that fits your group!`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_OVERVIEW = `${TRAINING_CENTER_PROTOTYPE_DEBRIEFING_OVERVIEW_INTRO}

**Team Training Reminders:**

**Conduct a Cultural Clue**
${TRAINING_CENTER_PROTOTYPE_DEBRIEFING_OVERVIEW_CULTURAL}

**Have a Team Devotional**
${TRAINING_CENTER_PROTOTYPE_DEBRIEFING_OVERVIEW_DEVOTIONAL}`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_INTRO = `In over 40 years of watching short-term teams come home we've learned that team members benefit from focusing on the following:`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_FRAMING = `A frame around a picture influences what we see and what we focus on.
- What kind of "frame" will you put around your project (especially if something negative happened!)
- When we include the negative in our frame: 1) That's what others will focus on! 2) We become the hero rather than God!`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_PHILIPPIANS = `*4 Rejoice in the Lord always. I will say it again: Rejoice! 5 Let your gentleness be evident to all. The Lord is near. 6 Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. 7 And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.*

*8 Finally, brothers and sisters, whatever is true, whatever is noble, whatever is right, whatever is pure, whatever is lovely, whatever is admirable—if anything is excellent or praiseworthy—think about such things.*`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_SITE = `- You're not the hero of the story but God used you!
- Different projects in different places look different.
- Change occurred in unseen ways too.`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_SUCCESS = `- Did you express love and care to your Readers?
- Did you share God's word with them?
- Did you share your life with them?
- Did you engage the local church in humility?
- Did you work together as a team?
- Can you trust God to continue the work?`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_LUKE = `*17 When the seventy-two disciples returned, they joyfully reported to him, "Lord, even the demons obey us when we use your name!" 18 "Yes," he told them, "I saw Satan fall from heaven like lightning! 19 Look, I have given you authority over all the power of the enemy, and you can walk among snakes and scorpions and crush them. Nothing will injure you. 20 But don't rejoice because evil spirits obey you; rejoice because your names are registered in heaven."*`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_HOME = `**Reentry Stress**
- Literal changes at home
- People aren't interested in your experience.
- YOU'VE changed!
- Your home church
- See SEPARATE HANDOUT for insight and advice.`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_REPORTING = `- "How was your trip?"
- Points people to God
- Helps donors see the good they empowered
- Where will you report? 1) Support team; 2) Local church; 3) Local community
- See SEPARATE HANDOUT for insight and advice.`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_YOU = `- What shape is God bending you toward?
- What is God calling you to be or do as a result of your experience?
- Next steps:
  - Go again?
  - LST Connect or FriendSpeak?
  - Monthly LST donor?
  - What's God calling you toward next?`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1 = `**Handout: Debriefing and Reentry (video summary/discussion)**

${TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_INTRO}

**Framing**
${TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_FRAMING}

**Philippians 4:4-8**
${TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_PHILIPPIANS}

**Your SITE Has Changed!**
${TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_SITE}

**“Success”**
${TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_SUCCESS}

**Luke 10:17-20**
${TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_LUKE}

**HOME Has Changed!**
${TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_HOME}

**Reporting**
${TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_REPORTING}

**YOU Have Changed!**
${TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_YOU}`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_PACKET_INTRO = `Read through this packet to explore the fruit that comes from debriefing before you go (pre-field), while you're onsite (on-field), and after you come home (post-field). This packet also includes handouts referenced in your LST EndMeeting (a separate online workshop led by LST staff upon your return home).`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_PACKET = `**Debriefing and Reentry Packet**

${TRAINING_CENTER_PROTOTYPE_DEBRIEFING_PACKET_INTRO}`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_WRAPPING_UP = `As you're wrapping up this session please do the following:
- Spend some time in prayer together.
- Schedule your next meeting together.
- Take the Quiz for this module (each person should take it individually with their own account to the training platform).`;

const TRAINING_CENTER_PROTOTYPE_DEBRIEFING_QUIZ = [
  {
    id: "m7q1",
    prompt: "I have watched all video content.",
    options: ["Yes", "No"],
  },
  {
    id: "m7q2",
    prompt: "I have reviewed any written content.",
    options: ["Yes", "No"],
  },
  {
    id: "m7q3",
    prompt: "I have talked with my team about the content of this module.",
    options: ["Yes", "No"],
  },
];

const TRAINING_CENTER_PROTOTYPE_MODULE_7_SECTIONS = [
  {
    id: "m7s1",
    title: "Debriefing and Reentry: Overview and Instructions",
    dueDate: "2026-09-17",
    body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_OVERVIEW,
    fullSessionBlocks: [
      {
        heading: "Overview",
        body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_OVERVIEW_INTRO,
        card: true,
      },
      {
        heading: "Conduct a Cultural Clue",
        body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_OVERVIEW_CULTURAL,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Have a Team Devotional",
        body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_OVERVIEW_DEVOTIONAL,
        card: true,
        cardTone: "reminder",
      },
    ],
  },
  {
    id: "m7s2",
    title: "Debriefing and Reentry: Video (1 of 1)",
    dueDate: "2026-09-17",
    body: "Watch video 1 of 1 on: Debriefing and Reentry.\n\nWatch the video below on issues you'll negotiate as you settle in back home after your project. Watch this in preparation for your LST EndMeeting too.",
    showVideo: true,
    videoEmbedUrl: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_VIDEO_1_EMBED_URL,
    fullSessionBlocks: [
      {
        heading: "Watch",
        body: `Watch video 1 of 1 on: **Debriefing and Reentry**

Watch the video below on issues you'll negotiate as you settle in back home after your project. Watch this in preparation for your LST EndMeeting too.`,
        card: true,
      },
    ],
  },
  {
    id: "m7s3",
    title: "Debriefing and Reentry: Handout 1 of 1",
    dueDate: "2026-09-17",
    body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1,
    fullSessionBlocks: [
      {
        heading: "Discuss This Handout — Debriefing and Reentry",
        body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_INTRO,
        card: true,
      },
      {
        heading: "Framing",
        body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_FRAMING,
        card: true,
      },
      {
        heading: "Philippians 4:4-8",
        body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_PHILIPPIANS,
        card: true,
        cardTone: "scripture",
      },
      {
        heading: "Your SITE Has Changed!",
        body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_SITE,
        card: true,
      },
      {
        heading: "“Success”",
        body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_SUCCESS,
        card: true,
        cardTone: "discuss",
      },
      {
        heading: "Luke 10:17-20",
        body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_LUKE,
        card: true,
        cardTone: "scripture",
      },
      {
        heading: "HOME Has Changed!",
        body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_HOME,
        card: true,
        cardTone: "reminder",
      },
      {
        heading: "Reporting",
        body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_REPORTING,
        card: true,
      },
      {
        heading: "YOU Have Changed!",
        body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_HANDOUT_1_YOU,
        card: true,
        cardTone: "discuss",
      },
    ],
  },
  {
    id: "m7s4",
    title: "Debriefing and Reentry Packet",
    dueDate: "2026-09-17",
    body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_PACKET,
    fullSessionBlocks: [
      {
        heading: "Debriefing and Reentry Packet",
        body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_PACKET_INTRO,
        card: true,
        linkButton: {
          label: "LST Debriefing and Reentry Packet (PDF)",
          href: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_PACKET_URL,
        },
      },
    ],
  },
  {
    id: "m7s5",
    title: "Debriefing and Reentry: Wrapping Up",
    dueDate: "2026-09-17",
    body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_WRAPPING_UP,
    fullSessionBlocks: [
      {
        heading: "Wrapping Up",
        body: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_WRAPPING_UP,
        card: true,
        cardTone: "reminder",
      },
    ],
  },
  {
    id: "m7quiz",
    title: "Debriefing and Reentry: Quiz",
    dueDate: "2026-09-17",
    isQuiz: true,
    quizQuestions: TRAINING_CENTER_PROTOTYPE_DEBRIEFING_QUIZ,
  },
];

export const TRAINING_CENTER_PROTOTYPE_MODULES = [
  {
    id: "proto-module-1",
    title: "Module 1 - Welcome",
    initialStatus: "in_progress",
    dueDate: "2026-07-19",
    dueDateRule: "90 days before trip start",
    sections: TRAINING_CENTER_PROTOTYPE_MODULE_1_SECTIONS,
  },
  {
    id: "proto-module-2",
    title: "Module 2 - Fundraising",
    initialStatus: "not_started",
    dueDate: "2026-07-19",
    dueDateRule: "90 days before trip start",
    sections: TRAINING_CENTER_PROTOTYPE_MODULE_2_SECTIONS,
  },
  {
    id: "proto-module-3",
    title: "Module 3 - Team Dynamics",
    initialStatus: "not_started",
    dueDate: "2026-08-18",
    dueDateRule: "60 days before trip start",
    sections: TRAINING_CENTER_PROTOTYPE_MODULE_3_SECTIONS,
  },
  {
    id: "proto-module-4",
    title: "Module 4 - Culture",
    initialStatus: "not_started",
    dueDate: "2026-08-18",
    dueDateRule: "60 days before trip start",
    sections: TRAINING_CENTER_PROTOTYPE_MODULE_4_SECTIONS,
  },
  {
    id: "proto-module-5",
    title: "Module 5 - Making LST Work Onsite",
    initialStatus: "not_started",
    dueDate: "2026-08-18",
    dueDateRule: "60 days before trip start",
    sections: TRAINING_CENTER_PROTOTYPE_MODULE_5_SECTIONS,
  },
  {
    id: "proto-module-6",
    title: "Module 6 - Onsite Tools",
    initialStatus: "not_started",
    dueDate: "2026-09-17",
    dueDateRule: "30 days before trip start",
    sections: TRAINING_CENTER_PROTOTYPE_MODULE_6_SECTIONS,
  },
  {
    id: "proto-module-7",
    title: "Module 7 - Debriefing and Reentry",
    initialStatus: "not_started",
    dueDate: "2026-09-17",
    dueDateRule: "30 days before trip start",
    sections: TRAINING_CENTER_PROTOTYPE_MODULE_7_SECTIONS,
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
  "proto-module-4": "Module 4 - Culture",
  "proto-module-5": "Module 5 - Making LST Work Onsite",
  "proto-module-6": "Module 6 - Onsite Tools",
  "proto-module-7": "Module 7 - Debriefing and Reentry",
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
