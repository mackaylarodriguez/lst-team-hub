import { escapeHtml } from "@/lib/resendMail";
import { buildEmailCtaBlock, EMAIL_BRAND_ACCENT } from "@/lib/emailCtaButton";
import { wrapTeamLockEmailCard } from "@/lib/teamLockStaffEmail";

const MAX_TASKS_PER_SECTION = 25;
const OVERDUE_ACCENT = "#b91c1c";

function formatDueDate(ymd) {
  const raw = String(ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || "No due date";
  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function sectionHeading(text, count, color) {
  return `<div style="margin:20px 0 8px;padding-bottom:6px;border-bottom:2px solid ${color};font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${color}">
    ${escapeHtml(text)} (${count})
  </div>`;
}

function taskRow(task, { overdue }) {
  const name = escapeHtml(task.taskName || "Untitled task");
  const nameHtml = task.url
    ? `<a href="${escapeHtml(task.url)}" target="_blank" style="color:${EMAIL_BRAND_ACCENT};font-weight:700;text-decoration:none">${name}</a>`
    : `<span style="font-weight:700">${name}</span>`;

  const context = [task.tripName, task.workArea && task.workArea !== task.tripName ? task.workArea : ""]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");

  const dueParts = [`Due ${escapeHtml(formatDueDate(task.dueDate))}`];
  if (overdue && task.daysOverdue > 0) {
    dueParts.push(
      `<span style="color:${OVERDUE_ACCENT};font-weight:700">${pluralize(task.daysOverdue, "day")} overdue</span>`
    );
  }
  dueParts.push(escapeHtml(task.progress || "Not started"));

  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f2">
      <div style="font-size:14px;line-height:1.4">${nameHtml}</div>
      ${context ? `<div style="font-size:12px;color:#52525b;margin-top:2px">${context}</div>` : ""}
      <div style="font-size:12px;color:#71717a;margin-top:2px">${dueParts.join(" · ")}</div>
    </td>
  </tr>`;
}

function taskSection({ title, tasks, color, overdue, emptyText, myTasksUrl }) {
  const heading = sectionHeading(title, tasks.length, color);
  if (!tasks.length) {
    return `${heading}<p style="margin:0;font-size:13px;color:#71717a">${escapeHtml(emptyText)}</p>`;
  }

  const shown = tasks.slice(0, MAX_TASKS_PER_SECTION);
  const hiddenCount = tasks.length - shown.length;
  const more = hiddenCount
    ? `<p style="margin:8px 0 0;font-size:13px;color:#52525b">+ ${pluralize(hiddenCount, "more task")} in ${
        myTasksUrl
          ? `<a href="${escapeHtml(myTasksUrl)}" style="color:${EMAIL_BRAND_ACCENT}">My Tasks</a>`
          : "My Tasks"
      }</p>`
    : "";

  return `${heading}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${shown.map((task) => taskRow(task, { overdue })).join("")}
    </table>
    ${more}`;
}

export function buildWeeklyTaskDigestSubject({ overdue, upcoming }) {
  const parts = [];
  if (overdue.length) parts.push(`${overdue.length} overdue`);
  if (upcoming.length) parts.push(`${upcoming.length} upcoming`);
  return parts.length ? `Your LST tasks this week: ${parts.join(", ")}` : "Your LST tasks this week";
}

export function buildWeeklyTaskDigestHtml({
  firstName,
  overdue,
  upcoming,
  myTasksUrl,
  testNote,
}) {
  const greetingName = String(firstName || "").trim();
  const testBanner = testNote
    ? `<div style="margin:0 0 16px;padding:10px 12px;background:#fef9c3;border:1px solid #fde68a;border-radius:6px;font-size:13px;color:#713f12">${escapeHtml(testNote)}</div>`
    : "";

  const bodyHtml = `
    ${testBanner}
    <p style="margin:0 0 4px;font-size:15px">Here's what's on your plate this week.</p>
    ${taskSection({
      title: "Overdue",
      tasks: overdue,
      color: OVERDUE_ACCENT,
      overdue: true,
      emptyText: "Nothing overdue. Nice work!",
      myTasksUrl,
    })}
    ${taskSection({
      title: "Upcoming this week",
      tasks: upcoming,
      color: EMAIL_BRAND_ACCENT,
      overdue: false,
      emptyText: "Nothing due in the next 7 days.",
      myTasksUrl,
    })}
  `.trim();

  return wrapTeamLockEmailCard({
    title: greetingName ? `Good morning, ${greetingName}` : "Good morning",
    bodyHtml,
    ctaHtml: myTasksUrl ? buildEmailCtaBlock({ href: myTasksUrl, label: "Open My Tasks" }) : "",
  });
}
