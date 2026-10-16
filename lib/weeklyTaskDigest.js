/**
 * Server-only: builds the Monday "your tasks this week" email for Hub staff.
 * Uses the service-role client, so only call from API routes.
 */

import {
  effectiveStaffTaskDueDate,
  isMissingStaffMiscTasksTableError,
  isTaskAssignedToUser,
  staffMiscTaskFromRow,
  staffTasksFromRows,
  toCalendarDatePart,
} from "@/lib/staffTasks";
import { sendResendEmail } from "@/lib/resendMail";
import { recordWeeklyEmailSend } from "@/lib/weeklyEmailLog";
import {
  buildWeeklyTaskDigestHtml,
  buildWeeklyTaskDigestSubject,
} from "@/lib/weeklyTaskDigestEmail";
import { WEEKLY_TASK_DIGEST_STAFF } from "@/lib/weeklyTaskDigestStaff";

export { findWeeklyTaskDigestStaff, WEEKLY_TASK_DIGEST_STAFF } from "@/lib/weeklyTaskDigestStaff";

export const WEEKLY_TASK_DIGEST_TIME_ZONE = "America/Chicago";
export const WEEKLY_TASK_DIGEST_SEND_HOUR = 7;
const UPCOMING_WINDOW_DAYS = 7;
const UPCOMING_FALLBACK_COUNT = 3;
const PAGE_SIZE = 1000;

/** Weekday + hour + YYYY-MM-DD for `now` in Central time (handles CST/CDT). */
export function getCentralClock(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: WEEKLY_TASK_DIGEST_TIME_ZONE,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value])
  );
  return {
    weekday: parts.weekday,
    hour: Number(parts.hour),
    todayYmd: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

function addDaysYmd(ymd, days) {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function daysBetweenYmd(fromYmd, toYmd) {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
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

function tripFromRow(row) {
  return {
    id: row.id,
    name:
      String(row.trip_name || row.tripName || row.title || row.name || "").trim() ||
      "Untitled trip",
    location: row.location || "",
    startDate: toCalendarDatePart(row.start_date),
    endDate: toCalendarDatePart(row.end_date),
    createdAt: row.created_at || "",
  };
}

/** Loads every trip staff task plus the digest recipients' personal tasks. */
export async function loadWeeklyTaskDigestData(admin) {
  const [tripRows, staffTaskRows] = await Promise.all([
    fetchAllRows(() => admin.from("trips").select("*").order("created_at", { ascending: true })),
    fetchAllRows(() =>
      admin.from("trip_staff_tasks").select("*").order("id", { ascending: true })
    ),
  ]);

  let miscRows = [];
  try {
    miscRows = await fetchAllRows(() =>
      admin
        .from("staff_misc_tasks")
        .select("*")
        .in(
          "staff_email",
          WEEKLY_TASK_DIGEST_STAFF.map((staff) => staff.email)
        )
        .order("id", { ascending: true })
    );
  } catch (error) {
    if (!isMissingStaffMiscTasksTableError(error)) throw error;
  }

  const rowsByTrip = new Map();
  staffTaskRows.forEach((row) => {
    const tripId = row.trip_id;
    if (!rowsByTrip.has(tripId)) rowsByTrip.set(tripId, []);
    rowsByTrip.get(tripId).push(row);
  });

  const tripTasks = tripRows.flatMap((row) => {
    const trip = tripFromRow(row);
    return staffTasksFromRows(trip.id, rowsByTrip.get(trip.id) || []).map((task) => ({
      ...task,
      tripId: trip.id,
      tripName: trip.name,
      dueDate: effectiveStaffTaskDueDate(task, trip) || "",
    }));
  });

  const miscTasks = miscRows.map(staffMiscTaskFromRow);

  return { tripTasks, miscTasks };
}

function taskUrl(task, baseUrl) {
  if (!baseUrl) return "";
  if (task.isMiscTask) {
    if (String(task.workArea || "").trim().toLowerCase() === "recruiting") {
      const search = String(task.taskName || "").replace(/^contact\s+/i, "").trim();
      return `${baseUrl}/recruiting${search ? `?search=${encodeURIComponent(search)}` : ""}`;
    }
    return `${baseUrl}/admin`;
  }
  return `${baseUrl}/trips/${encodeURIComponent(task.tripId)}?tab=staff-tasks&staffTaskId=${encodeURIComponent(task.id)}`;
}

function byDueDate(a, b) {
  if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  return String(a.tripName || "").localeCompare(String(b.tripName || ""));
}

/** Splits one staff member's open tasks into overdue and the next few upcoming (Central time). */
export function buildWeeklyTaskDigestForStaff(staff, data, { todayYmd, baseUrl }) {
  const mine = [
    ...data.tripTasks.filter(
      (task) =>
        isTaskAssignedToUser(task.assignedTo, staff.name) ||
        isTaskAssignedToUser(task.assignedTo, staff.email)
    ),
    ...data.miscTasks.filter(
      (task) => String(task.staffEmail || "").trim().toLowerCase() === staff.email
    ),
  ];

  const overdue = [];
  const upcoming = [];

  mine.forEach((task) => {
    if (task.progress === "Complete") return;
    const dueDate = toCalendarDatePart(task.dueDate);
    if (!dueDate) return;

    const entry = {
      ...task,
      dueDate,
      url: taskUrl(task, baseUrl),
      daysOverdue: Math.max(0, daysBetweenYmd(dueDate, todayYmd)),
    };

    if (dueDate < todayYmd) {
      overdue.push(entry);
    } else {
      upcoming.push(entry);
    }
  });

  overdue.sort(byDueDate);
  upcoming.sort(byDueDate);

  const lastDayOfWeekYmd = addDaysYmd(todayYmd, UPCOMING_WINDOW_DAYS - 1);
  const dueThisWeek = upcoming.filter((task) => task.dueDate <= lastDayOfWeekYmd);
  const upcomingMode = dueThisWeek.length ? "week" : "next";
  const upcomingShown =
    upcomingMode === "week" ? dueThisWeek : upcoming.slice(0, UPCOMING_FALLBACK_COUNT);

  return {
    staff,
    overdue,
    upcoming: upcomingShown,
    upcomingTotal: upcomingShown.length,
    upcomingMode,
    hasTasks: overdue.length + upcoming.length > 0,
  };
}

export function buildWeeklyTaskDigestEmail(digest, { baseUrl, testNote } = {}) {
  return {
    subject: buildWeeklyTaskDigestSubject(digest),
    html: buildWeeklyTaskDigestHtml({
      firstName: digest.staff.firstName,
      overdue: digest.overdue,
      upcoming: digest.upcoming,
      upcomingTotal: digest.upcomingTotal,
      upcomingMode: digest.upcomingMode,
      myTasksUrl: baseUrl ? `${baseUrl}/admin` : "",
      testNote,
    }),
  };
}

/** Staff who will receive the next Monday task email. */
export async function previewWeeklyTaskDigestRecipients(admin, { now = new Date() } = {}) {
  const { todayYmd } = getCentralClock(now);
  const data = await loadWeeklyTaskDigestData(admin);
  const rows = [];

  for (const staff of WEEKLY_TASK_DIGEST_STAFF) {
    const digest = buildWeeklyTaskDigestForStaff(staff, data, { todayYmd, baseUrl: "" });
    if (!digest.hasTasks) continue;
    const tripNames = [
      ...new Set(
        [...digest.overdue, ...digest.upcoming].map((task) => task.tripName).filter(Boolean)
      ),
    ];
    rows.push({
      kind: "weekly_tasks",
      email: staff.email,
      name: staff.name,
      tripNames,
      detail: `${digest.overdue.length} overdue, ${digest.upcomingTotal} upcoming`,
    });
  }

  return rows;
}

/** Sends the real Monday digest to every staff member who has overdue or upcoming tasks. */
export async function sendWeeklyTaskDigests(admin, { baseUrl, now = new Date(), dryRun = false }) {
  const { todayYmd } = getCentralClock(now);
  const data = await loadWeeklyTaskDigestData(admin);
  const results = [];

  for (const staff of WEEKLY_TASK_DIGEST_STAFF) {
    const digest = buildWeeklyTaskDigestForStaff(staff, data, { todayYmd, baseUrl });
    const summary = {
      email: staff.email,
      overdue: digest.overdue.length,
      upcoming: digest.upcomingTotal,
      upcomingMode: digest.upcomingMode,
    };

    if (!digest.hasTasks) {
      results.push({ ...summary, status: "skipped_no_tasks" });
      continue;
    }
    if (dryRun) {
      results.push({ ...summary, status: "dry_run" });
      continue;
    }

    const { subject, html } = buildWeeklyTaskDigestEmail(digest, { baseUrl });
    const sendResult = await sendResendEmail({ to: staff.email, subject, html });
    const tripNames = [
      ...new Set(
        [...digest.overdue, ...digest.upcoming].map((task) => task.tripName).filter(Boolean)
      ),
    ].join(", ");
    await recordWeeklyEmailSend(admin, {
      resendId: sendResult.id,
      kind: "weekly_tasks",
      source: "cron",
      status: sendResult.sent ? "sent" : "failed",
      email: staff.email,
      name: staff.name,
      subject,
      tripNames,
      detail: sendResult.sent
        ? `${digest.overdue.length} overdue, ${digest.upcomingTotal} upcoming`
        : sendResult.reason || "failed",
    });
    results.push({
      ...summary,
      status: sendResult.sent ? "sent" : "failed",
      reason: sendResult.sent ? undefined : sendResult.reason,
    });
  }

  return { todayYmd, results };
}
