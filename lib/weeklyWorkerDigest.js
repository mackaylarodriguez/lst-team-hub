/**
 * Server-only: Monday weekly email for workers (meetings, training, tasks, fundraising).
 * Uses the service-role client, so only call from API routes.
 */

import { sendResendEmail } from "@/lib/resendMail";
import { recordWeeklyEmailSend } from "@/lib/weeklyEmailLog";
import { isNonTravelingLeaderMember } from "@/lib/tripTeamMembers";
import { coerceSqlDateToYmd } from "@/lib/isoDateYmd";
import { toCalendarDatePart } from "@/lib/staffTasks";
import { getCentralClock, WEEKLY_TASK_DIGEST_SEND_HOUR } from "@/lib/weeklyTaskDigest";
import { isWorkerTaskCompletedInState } from "@/lib/tasks";
import {
  computeWorkerTaskDueDate,
  findWorkerTaskTemplate,
  getWorkerTaskDisplayTitle,
  normalizeTrainingTimelineType,
} from "@/lib/workerTaskTemplate";
import {
  filterActiveUniqueTrainingModules,
  getCanonicalClassroomModuleForRow,
  getTrainingModuleDeadline,
  normalizeTrainingModuleTitleKey,
  resolveClassroomModuleSlotKey,
} from "@/lib/training";
import { isUsMassachusettsMissionSite } from "@/lib/usMassachusettsSite";
import {
  parsePositiveFundraisingGoal,
  resolveRosterMemberFundraisingGoalAmount,
} from "@/lib/tripFundraising";
import {
  getTrainingSessionOptionsForModuleTitle,
  hydrateTrainingSessionDateFromDb,
} from "@/lib/trainingSessionOptions";
import {
  buildWeeklyWorkerDigestHtml,
  buildWeeklyWorkerDigestSubject,
} from "@/lib/weeklyWorkerDigestEmail";

export { getCentralClock };

const PAGE_SIZE = 1000;
const UPCOMING_WINDOW_DAYS = 7;
const UPCOMING_FALLBACK_COUNT = 3;
const FUNDRAISING_TASK_IDS = new Set([
  "worker-task-fundraising-2000",
  "worker-task-fundraising-all",
]);
const TRAINING_MEETING_TITLES = new Set(["Basic Training", "Gateway Training", "EndMeeting"]);
const DEPRECATED_TASK_TITLES = new Set(["fill out lst application"]);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isHubStaffRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "admin" || normalized === "staff";
}

function addDaysYmd(ymd, days) {
  const [year, month, day] = String(ymd || "").split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function daysBetweenYmd(fromYmd, toYmd) {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

function formatUsd(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return "";
  return `$${numeric.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/** Trip still belongs in the worker weekly email. Archived trips never do. */
export function isCurrentWorkerDigestTrip(trip, todayYmd) {
  if (String(trip?.status || "").trim().toLowerCase() === "archived") return false;
  if (trip?.endDate) return trip.endDate >= todayYmd;
  if (trip?.startDate) return trip.startDate >= addDaysYmd(todayYmd, -180);
  return false;
}

function tripFromRow(row) {
  const name =
    String(row.trip_name || row.tripName || row.title || row.name || "").trim() || "Untitled trip";
  return {
    id: row.id,
    name,
    location: row.location || "",
    startDate: coerceSqlDateToYmd(row.start_date) || "",
    endDate: coerceSqlDateToYmd(row.end_date) || "",
    status: row.status || "active",
    trainingTimelineType: normalizeTrainingTimelineType(row.training_timeline_type),
    fundraisingMode: String(row.fundraising_mode || "").toLowerCase() === "team" ? "team" : "individual",
    fundraisingGoalAmount: row.fundraising_goal_amount,
    teamFundraisingUrl: String(row.team_fundraising_url || "").trim(),
  };
}

async function fetchAllRows(buildQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

function pushMapList(map, key, value) {
  if (!key) return;
  const existing = map.get(key);
  if (existing) existing.push(value);
  else map.set(key, [value]);
}

function centralYmd(iso, todayYmd) {
  const raw = String(iso || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  if (!parts.year || !parts.month || !parts.day) return todayYmd ? "" : "";
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function tripTabUrl(baseUrl, tripId, tab) {
  if (!baseUrl || !tripId) return "";
  const query = tab ? `?tab=${encodeURIComponent(tab)}` : "";
  return `${baseUrl}/trips/${encodeURIComponent(tripId)}${query}`;
}

function displayTrainingTitle(row) {
  const canonical = getCanonicalClassroomModuleForRow(row);
  if (canonical?.title) return canonical.title;
  if (String(row?.title || "").trim() === "EndMeeting") return "End meeting";
  return String(row?.title || "").trim() || "Training module";
}

function deadlineTitle(row) {
  return getCanonicalClassroomModuleForRow(row)?.title || String(row?.title || "").trim();
}

function ensurePerson(people, email) {
  const existing = people.get(email);
  if (existing) return existing;
  const created = {
    email,
    firstName: "",
    lastName: "",
    userIds: new Set(),
    tripIds: new Set(),
    eligibleTripIds: new Set(),
    blockedTripIds: new Set(),
  };
  people.set(email, created);
  return created;
}

function rememberName(person, firstName, lastName) {
  if (!person.firstName && String(firstName || "").trim()) person.firstName = String(firstName).trim();
  if (!person.lastName && String(lastName || "").trim()) person.lastName = String(lastName).trim();
}

export async function loadWeeklyWorkerDigestData(admin) {
  const [tripRows, memberRows, assignmentRows, profileRows, taskRows, taskProgressRows, moduleRows, trainingRows, meetingRows] =
    await Promise.all([
      fetchAllRows(() => admin.from("trips").select("*").order("id", { ascending: true })),
      fetchAllRows(() => admin.from("trip_team_members").select("*").order("id", { ascending: true })),
      fetchAllRows(() =>
        admin.from("trip_assignments").select("user_id, trip_id").order("id", { ascending: true })
      ),
      fetchAllRows(() =>
        admin
          .from("profiles")
          .select("id, email, role, first_name, last_name")
          .order("id", { ascending: true })
      ),
      fetchAllRows(() =>
        admin.from("trip_tasks").select("id, trip_id, title, due_date, category").order("id", { ascending: true })
      ),
      fetchAllRows(() =>
        admin
          .from("user_task_progress")
          .select("trip_id, user_id, task_name, completed")
          .eq("completed", true)
          .order("id", { ascending: true })
      ),
      fetchAllRows(() =>
        admin
          .from("trip_training_modules")
          .select("id, trip_id, title, category, sort_order")
          .order("id", { ascending: true })
      ),
      fetchAllRows(() =>
        admin
          .from("user_training_progress")
          .select("trip_id, user_id, training_module_id, completed, completed_at")
          .order("id", { ascending: true })
      ),
      fetchAllRows(() =>
        admin.from("trip_meetings").select("id, trip_id, title, scheduled_at").order("id", { ascending: true })
      ),
    ]);

  let fundraisingRows = [];
  try {
    fundraisingRows = await fetchAllRows(() =>
      admin
        .from("fundraising_profiles")
        .select("trip_id, user_id, fundraising_url")
        .order("id", { ascending: true })
    );
  } catch (error) {
    console.error("[weekly-worker-digest] fundraising_profiles", error);
  }

  const tripsById = new Map();
  tripRows.forEach((row) => {
    if (!row?.id) return;
    tripsById.set(row.id, tripFromRow(row));
  });

  const profilesById = new Map();
  const profilesByEmail = new Map();
  profileRows.forEach((profile) => {
    if (!profile?.id) return;
    profilesById.set(profile.id, profile);
    const email = normalizeEmail(profile.email);
    if (!email) return;
    pushMapList(profilesByEmail, email, profile);
  });

  const membersByTripId = new Map();
  memberRows.forEach((member) => pushMapList(membersByTripId, member.trip_id, member));

  const tasksByTripId = new Map();
  taskRows.forEach((task) => pushMapList(tasksByTripId, task.trip_id, task));

  const completedTaskNames = new Map();
  taskProgressRows.forEach((row) => {
    if (!row?.completed || !row.task_name) return;
    pushMapList(completedTaskNames, `${row.trip_id}:${row.user_id}`, String(row.task_name));
  });

  const modulesByTripId = new Map();
  moduleRows.forEach((module) => pushMapList(modulesByTripId, module.trip_id, module));

  const trainingRowsByTripUser = new Map();
  trainingRows.forEach((row) => {
    pushMapList(trainingRowsByTripUser, `${row.trip_id}:${row.user_id}`, row);
  });

  const meetingsByTripId = new Map();
  meetingRows.forEach((meeting) => pushMapList(meetingsByTripId, meeting.trip_id, meeting));

  const fundraisingUrlByTripUser = new Map();
  fundraisingRows.forEach((row) => {
    const url = String(row.fundraising_url || "").trim();
    if (!url || !row.trip_id || !row.user_id) return;
    const key = `${row.trip_id}:${row.user_id}`;
    if (!fundraisingUrlByTripUser.has(key)) fundraisingUrlByTripUser.set(key, url);
  });

  const rosterByTripEmail = new Map();
  const people = new Map();

  memberRows.forEach((member) => {
    const trip = tripsById.get(member.trip_id);
    const email = normalizeEmail(member.email);
    if (!trip || !email) return;
    const person = ensurePerson(people, email);
    person.tripIds.add(trip.id);
    rememberName(person, member.first_name, member.last_name);
    (profilesByEmail.get(email) || []).forEach((profile) => person.userIds.add(profile.id));
    if (isNonTravelingLeaderMember(member)) person.blockedTripIds.add(trip.id);
    else person.eligibleTripIds.add(trip.id);
    const rosterKey = `${trip.id}:${email}`;
    if (!rosterByTripEmail.has(rosterKey)) {
      rosterByTripEmail.set(rosterKey, {
        firstName: member.first_name || "",
        lastName: member.last_name || "",
        fundraisingGoalAmount: member.fundraising_goal_amount,
        fundraisingUrl: String(member.fundraising_url || "").trim(),
      });
    }
  });

  assignmentRows.forEach((assignment) => {
    const trip = tripsById.get(assignment.trip_id);
    const profile = profilesById.get(assignment.user_id);
    const email = normalizeEmail(profile?.email);
    if (!trip || !email) return;
    if (isHubStaffRole(profile.role)) {
      const existing = people.get(email);
      if (!existing) return;
      existing.userIds.add(profile.id);
      (profilesByEmail.get(email) || []).forEach((row) => existing.userIds.add(row.id));
      return;
    }
    const person = ensurePerson(people, email);
    person.userIds.add(profile.id);
    (profilesByEmail.get(email) || []).forEach((row) => person.userIds.add(row.id));
    rememberName(person, profile.first_name, profile.last_name);
    if (person.blockedTripIds.has(trip.id)) return;
    person.tripIds.add(trip.id);
    person.eligibleTripIds.add(trip.id);
  });

  return {
    tripsById,
    people,
    membersByTripId,
    tasksByTripId,
    completedTaskNames,
    modulesByTripId,
    trainingRowsByTripUser,
    meetingsByTripId,
    fundraisingUrlByTripUser,
    rosterByTripEmail,
  };
}

function taskStateFor(tripId, userIds, completedTaskNames) {
  const state = {};
  userIds.forEach((userId) => {
    (completedTaskNames.get(`${tripId}:${userId}`) || []).forEach((name) => {
      state[name] = true;
    });
  });
  return state;
}

function trainingProgressFor(tripId, userIds, trainingRowsByTripUser) {
  const completedIds = new Set();
  const rows = [];
  userIds.forEach((userId) => {
    (trainingRowsByTripUser.get(`${tripId}:${userId}`) || []).forEach((row) => {
      rows.push(row);
      if (row.completed) completedIds.add(String(row.training_module_id));
    });
  });
  return { completedIds, rows };
}

function moduleMatches(presented, raw) {
  if (String(presented.id) === String(raw.id)) return true;
  const slot = resolveClassroomModuleSlotKey(presented);
  if (slot && resolveClassroomModuleSlotKey(raw) === slot) return true;
  const title = normalizeTrainingModuleTitleKey(deadlineTitle(presented));
  return title && normalizeTrainingModuleTitleKey(raw.title) === title;
}

function sessionLabel(moduleTitle, completedAt) {
  const hydrated = hydrateTrainingSessionDateFromDb(completedAt, moduleTitle);
  const match = (getTrainingSessionOptionsForModuleTitle(moduleTitle) || []).find(
    (option) => option.value === hydrated
  );
  return { scheduledAt: match?.value || hydrated || completedAt, title: moduleTitle };
}

function fundraisingHeadcount(members) {
  const emails = new Set();
  (members || []).forEach((member) => {
    const email = normalizeEmail(member.email);
    if (!email || isNonTravelingLeaderMember(member)) return;
    emails.add(email);
  });
  return Math.max(emails.size, 1);
}

function milestoneLine(label, dueDate, done) {
  const when = dueDate ? ` (${formatDueDatePlain(dueDate)})` : "";
  return {
    label: `${label}${when}:`,
    value: done ? "Complete" : "Still to do",
  };
}

function formatDueDatePlain(ymd) {
  const raw = String(ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const [year, month, day] = raw.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function buildFundraising(trip, roster, userIds, tasks, taskState, members, fundraisingUrlByTripUser) {
  const personalGoal = resolveRosterMemberFundraisingGoalAmount(
    { fundraisingGoalAmount: roster?.fundraisingGoalAmount },
    trip.fundraisingGoalAmount
  );
  const teamGoal = parsePositiveFundraisingGoal(trip.fundraisingGoalAmount) || 0;
  const isTeam = trip.fundraisingMode === "team";
  const goalAmount = isTeam ? teamGoal || personalGoal : personalGoal;
  const percentMilestones = isUsMassachusettsMissionSite(trip.location);
  const headcount = isTeam ? fundraisingHeadcount(members) : 1;
  const firstAmount = percentMilestones ? 0 : 2000 * headcount;
  const secondAmount = percentMilestones ? 0 : Math.max((goalAmount || 0) - firstAmount, 0);
  const firstDue = trip.startDate ? addDaysYmd(trip.startDate, -90) : "";
  const secondDue = trip.startDate ? addDaysYmd(trip.startDate, -30) : "";

  const findTask = (templateId) =>
    (tasks || []).find((task) => findWorkerTaskTemplate(task)?.id === templateId) || null;
  const firstTask = findTask("worker-task-fundraising-2000");
  const secondTask = findTask("worker-task-fundraising-all");
  const firstDone = firstTask ? isWorkerTaskCompletedInState(firstTask, taskState) : false;
  const secondDone = secondTask ? isWorkerTaskCompletedInState(secondTask, taskState) : false;

  let pageUrl = "";
  if (isTeam || trip.teamFundraisingUrl) pageUrl = trip.teamFundraisingUrl;
  if (!pageUrl) pageUrl = String(roster?.fundraisingUrl || "").trim();
  if (!pageUrl) {
    for (const userId of userIds) {
      const found = fundraisingUrlByTripUser.get(`${trip.id}:${userId}`);
      if (found) {
        pageUrl = found;
        break;
      }
    }
  }

  const lines = [];
  if (goalAmount > 0) {
    lines.push({
      label: isTeam ? "Team goal:" : "Your goal:",
      value: formatUsd(goalAmount),
    });
  } else {
    lines.push({ label: "Goal:", value: "Not set yet" });
  }

  const firstLabel = percentMilestones
    ? "50% due 90 days before departure"
    : `${formatUsd(firstAmount) || "$2,000"} due 90 days before departure`;
  const secondLabel = percentMilestones
    ? "50% due 30 days before departure"
    : secondAmount > 0
      ? `${formatUsd(secondAmount)} due 30 days before departure`
      : "Full goal due 30 days before departure";
  if (firstTask) lines.push(milestoneLine(firstLabel, firstDue, firstDone));
  if (secondTask) lines.push(milestoneLine(secondLabel, secondDue, secondDone));

  if (pageUrl) {
    lines.push({
      label: isTeam || trip.teamFundraisingUrl ? "Team page:" : "Your page:",
      value: "Open fundraising page",
      href: pageUrl,
    });
  } else {
    lines.push({
      label: isTeam ? "Team page:" : "Your page:",
      value: "Not added yet",
    });
  }

  const needsAttention = Boolean((firstTask || secondTask) && (!firstDone || !secondDone));

  return { lines, needsAttention, pageUrl };
}

function buildTripDigest(trip, person, data, { todayYmd, baseUrl }) {
  const userIds = [...person.userIds];
  const tasks = data.tasksByTripId.get(trip.id) || [];
  const taskState = taskStateFor(trip.id, userIds, data.completedTaskNames);
  const roster = data.rosterByTripEmail.get(`${trip.id}:${person.email}`) || null;

  const actionable = tasks.filter((task) => {
    const titleKey = String(task.title || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    if (!titleKey || DEPRECATED_TASK_TITLES.has(titleKey)) return false;
    const templateId = findWorkerTaskTemplate(task)?.id || "";
    if (FUNDRAISING_TASK_IDS.has(templateId)) return false;
    return true;
  });

  const open = actionable.filter((task) => !isWorkerTaskCompletedInState(task, taskState));
  const completeCount = actionable.length - open.length;
  const overdue = [];
  const upcoming = [];
  const undated = [];

  open.forEach((task) => {
    const dueDate =
      toCalendarDatePart(task.due_date) ||
      computeWorkerTaskDueDate(task, {
        startDate: trip.startDate,
        trainingTimelineType: trip.trainingTimelineType,
      }) ||
      "";
    const entry = {
      title: getWorkerTaskDisplayTitle(task, trip.location) || task.title || "Untitled task",
      dueDate,
    };
    if (!dueDate) {
      undated.push(entry);
      return;
    }
    if (dueDate < todayYmd) {
      overdue.push({ ...entry, daysOverdue: Math.max(0, daysBetweenYmd(dueDate, todayYmd)) });
    } else {
      upcoming.push(entry);
    }
  });

  overdue.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
  upcoming.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));

  const lastDay = addDaysYmd(todayYmd, UPCOMING_WINDOW_DAYS - 1);
  const dueThisWeek = upcoming.filter((task) => task.dueDate <= lastDay);
  const upcomingMode = dueThisWeek.length ? "week" : "next";
  const upcomingShown = upcomingMode === "week" ? dueThisWeek : upcoming.slice(0, UPCOMING_FALLBACK_COUNT);

  const rawModules = data.modulesByTripId.get(trip.id) || [];
  const presented = filterActiveUniqueTrainingModules(rawModules);
  const { completedIds, rows: trainingRows } = trainingProgressFor(
    trip.id,
    userIds,
    data.trainingRowsByTripUser
  );

  const trainingIncomplete = [];
  let trainingComplete = 0;
  presented.forEach((module) => {
    const done = rawModules.some(
      (raw) => moduleMatches(module, raw) && completedIds.has(String(raw.id))
    );
    if (done) {
      trainingComplete += 1;
      return;
    }
    trainingIncomplete.push({
      title: displayTrainingTitle(module),
      dueDate:
        getTrainingModuleDeadline(deadlineTitle(module), {
          startDate: trip.startDate,
          endDate: trip.endDate,
          trainingTimelineType: trip.trainingTimelineType,
        }) || "",
      sortOrder: Number(module.sort_order || 0),
    });
  });
  trainingIncomplete.sort((a, b) => {
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return a.sortOrder - b.sortOrder;
  });

  const meetings = [];
  (data.meetingsByTripId.get(trip.id) || []).forEach((meeting) => {
    const scheduledAt = meeting.scheduled_at || "";
    const ymd = centralYmd(scheduledAt);
    if (!ymd || ymd < todayYmd) return;
    meetings.push({
      title: String(meeting.title || "").trim() || "Team meeting",
      scheduledAt,
      sortAt: new Date(scheduledAt).getTime() || 0,
    });
  });

  presented.forEach((module) => {
    const rawTitle = String(module.title || "").trim();
    const canonical = deadlineTitle(module);
    if (!TRAINING_MEETING_TITLES.has(rawTitle) && !TRAINING_MEETING_TITLES.has(canonical)) return;
    const matchTitle = TRAINING_MEETING_TITLES.has(canonical) ? canonical : rawTitle;
    const progress = trainingRows.find(
      (row) =>
        rawModules.some(
          (raw) => String(raw.id) === String(row.training_module_id) && moduleMatches(module, raw)
        ) && String(row.completed_at || "").trim()
    );
    if (!progress?.completed_at) return;
    const session = sessionLabel(matchTitle, progress.completed_at);
    const ymd = centralYmd(session.scheduledAt);
    if (!ymd || ymd < todayYmd) return;
    const label = matchTitle === "EndMeeting" ? "End meeting" : matchTitle;
    meetings.push({
      title: label,
      scheduledAt: session.scheduledAt,
      sortAt: new Date(session.scheduledAt).getTime() || 0,
    });
  });
  meetings.sort((a, b) => a.sortAt - b.sortAt);

  const fundraising = buildFundraising(
    trip,
    roster,
    userIds,
    tasks,
    taskState,
    data.membersByTripId.get(trip.id) || [],
    data.fundraisingUrlByTripUser
  );

  return {
    id: trip.id,
    name: trip.name,
    location: trip.location,
    overviewUrl: tripTabUrl(baseUrl, trip.id, ""),
    trainingUrl: tripTabUrl(baseUrl, trip.id, "training"),
    tasksUrl: tripTabUrl(baseUrl, trip.id, "tasks"),
    fundraisingUrl: tripTabUrl(baseUrl, trip.id, "fundraising"),
    meetings,
    training: {
      complete: trainingComplete,
      total: presented.length,
      incomplete: trainingIncomplete,
    },
    tasks: {
      complete: completeCount,
      total: actionable.length,
      overdue,
      upcoming: upcomingShown,
      upcomingMode,
      undated,
      attentionCount: overdue.length + upcomingShown.length,
    },
    fundraising,
  };
}

export function buildWeeklyWorkerDigestForEmail(email, data, { todayYmd, baseUrl }) {
  const normalized = normalizeEmail(email);
  const person = data.people.get(normalized) || {
    email: normalized,
    firstName: "",
    lastName: "",
    userIds: new Set(),
    tripIds: new Set(),
    eligibleTripIds: new Set(),
  };

  const tripIds = [...person.eligibleTripIds].filter((tripId) =>
    isCurrentWorkerDigestTrip(data.tripsById.get(tripId), todayYmd)
  );

  let skipReason = "";
  if (!normalized) {
    skipReason = "No worker email to preview.";
  } else if (!person.tripIds.size && !person.eligibleTripIds.size) {
    skipReason = "No trip found for this email, so the weekly email would be skipped.";
  } else if (!person.eligibleTripIds.size) {
    skipReason =
      "This person is a leader who is not traveling with the team, so the weekly worker email is not sent.";
  } else if (!tripIds.length) {
    skipReason = "Their trips are already finished or archived, so the weekly email would be skipped.";
  }

  const trips = tripIds
    .map((tripId) => data.tripsById.get(tripId))
    .filter(Boolean)
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)) || a.name.localeCompare(b.name))
    .map((trip) => buildTripDigest(trip, person, data, { todayYmd, baseUrl }));

  return {
    worker: {
      email: normalized,
      firstName: person.firstName || "",
      name: [person.firstName, person.lastName].filter(Boolean).join(" ").trim() || normalized,
    },
    trips: skipReason ? [] : trips,
    skipReason,
    hasContent: !skipReason && trips.length > 0,
  };
}

function workerSendDetail(digest) {
  const meetings = digest.trips.reduce((sum, trip) => sum + trip.meetings.length, 0);
  const trainingLeft = digest.trips.reduce(
    (sum, trip) => sum + (trip.training?.incomplete?.length || 0),
    0
  );
  const tasks = digest.trips.reduce((sum, trip) => sum + (trip.tasks?.attentionCount || 0), 0);
  const parts = [];
  if (meetings) parts.push(`${meetings} meeting${meetings === 1 ? "" : "s"}`);
  if (trainingLeft) parts.push(`${trainingLeft} training`);
  if (tasks) parts.push(`${tasks} task${tasks === 1 ? "" : "s"}`);
  if (digest.trips.some((trip) => trip.fundraising?.needsAttention)) parts.push("fundraising");
  return parts.join(", ") || "Weekly check-in";
}

function workerTripNames(digest) {
  return digest.trips
    .map((trip) => trip.name)
    .filter(Boolean)
    .join(", ");
}

/** Next Monday 7:00 AM Central send, or later today if it is still before 7am Monday. */
export function describeNextWeeklySend(now = new Date()) {
  const clock = getCentralClock(now);
  const weekdayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const today = weekdayIndex[clock.weekday] ?? 0;
  let daysUntil = (1 - today + 7) % 7;
  if (daysUntil === 0 && clock.hour >= WEEKLY_TASK_DIGEST_SEND_HOUR) daysUntil = 7;
  const ymd = addDaysYmd(clock.todayYmd, daysUntil);
  const [year, month, day] = ymd.split("-").map(Number);
  const labelDate = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return { ymd, label: `${labelDate} at 7:00 AM Central` };
}

/** Who will receive the next Monday worker email. Archived trips are omitted. */
export async function previewWeeklyWorkerDigestRecipients(admin, { now = new Date() } = {}) {
  const { todayYmd } = getCentralClock(now);
  const data = await loadWeeklyWorkerDigestData(admin);
  const rows = [];

  for (const person of data.people.values()) {
    const digest = buildWeeklyWorkerDigestForEmail(person.email, data, { todayYmd, baseUrl: "" });
    if (!digest.hasContent) continue;
    rows.push({
      kind: "weekly_worker",
      email: digest.worker.email,
      name: digest.worker.name,
      tripNames: digest.trips.map((trip) => trip.name).filter(Boolean),
      detail: workerSendDetail(digest),
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return rows;
}

export function buildWeeklyWorkerDigestEmail(digest, { baseUrl, testNote } = {}) {
  return {
    subject: buildWeeklyWorkerDigestSubject(digest),
    html: buildWeeklyWorkerDigestHtml({
      firstName: digest.worker?.firstName,
      trips: digest.trips,
      hubUrl: baseUrl ? `${baseUrl}/trips` : "",
      testNote,
      skipReason: digest.skipReason,
    }),
  };
}

/** Sends the Monday worker email to everyone on a current trip. */
export async function sendWeeklyWorkerDigests(admin, { baseUrl, now = new Date(), dryRun = false }) {
  const { todayYmd } = getCentralClock(now);
  const data = await loadWeeklyWorkerDigestData(admin);
  const results = [];

  const recipients = [...data.people.values()].sort((a, b) => a.email.localeCompare(b.email));
  for (const person of recipients) {
    const digest = buildWeeklyWorkerDigestForEmail(person.email, data, { todayYmd, baseUrl });
    const summary = {
      email: person.email,
      trips: digest.trips.length,
      meetings: digest.trips.reduce((sum, trip) => sum + trip.meetings.length, 0),
    };

    if (!digest.hasContent) {
      results.push({ ...summary, status: "skipped", reason: digest.skipReason });
      continue;
    }
    if (dryRun) {
      results.push({ ...summary, status: "dry_run" });
      continue;
    }

    const { subject, html } = buildWeeklyWorkerDigestEmail(digest, { baseUrl });
    const sendResult = await sendResendEmail({ to: person.email, subject, html });
    await recordWeeklyEmailSend(admin, {
      resendId: sendResult.id,
      kind: "weekly_worker",
      source: "cron",
      status: sendResult.sent ? "sent" : "failed",
      email: person.email,
      name: digest.worker.name,
      subject,
      tripNames: workerTripNames(digest),
      detail: sendResult.sent ? workerSendDetail(digest) : sendResult.reason || "failed",
    });
    results.push({
      ...summary,
      status: sendResult.sent ? "sent" : "failed",
      reason: sendResult.sent ? undefined : sendResult.reason,
    });
  }

  return { todayYmd, results };
}
