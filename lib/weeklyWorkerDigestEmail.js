import { escapeHtml } from "@/lib/resendMail";
import { buildEmailCtaBlock, EMAIL_BRAND_ACCENT } from "@/lib/emailCtaButton";
import { wrapTeamLockEmailCard } from "@/lib/teamLockStaffEmail";

const MAX_ROWS = 8;
const OVERDUE_ACCENT = "#b91c1c";
const FUNDRAISING_ACCENT = "#a16207";

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

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

function formatMeetingWhen(scheduledAt) {
  const raw = String(scheduledAt || "").trim();
  if (!raw) return "Date not set";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return formatDueDate(raw);

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
    timeZoneName: "short",
  });
}

function sectionHeading(text, color) {
  return `<div style="margin:18px 0 8px;padding-bottom:6px;border-bottom:2px solid ${color};font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${color}">
    ${escapeHtml(text)}
  </div>`;
}

function linkedName(label, url) {
  const safe = escapeHtml(label || "Untitled");
  if (!url) return `<span style="font-weight:700">${safe}</span>`;
  return `<a href="${escapeHtml(url)}" target="_blank" style="color:${EMAIL_BRAND_ACCENT};font-weight:700;text-decoration:none">${safe}</a>`;
}

function itemRow(primaryHtml, metaHtml) {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #f0f0f2">
      <div style="font-size:14px;line-height:1.4">${primaryHtml}</div>
      ${metaHtml ? `<div style="font-size:12px;color:#71717a;margin-top:2px">${metaHtml}</div>` : ""}
    </td>
  </tr>`;
}

function itemTable(rowsHtml) {
  if (!rowsHtml) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>`;
}

function moreLine(hiddenCount, noun, url) {
  if (!hiddenCount) return "";
  const label = `+ ${pluralize(hiddenCount, `more ${noun}`)}`;
  const inner = url
    ? `<a href="${escapeHtml(url)}" style="color:${EMAIL_BRAND_ACCENT}">${escapeHtml(label)}</a>`
    : escapeHtml(label);
  return `<p style="margin:8px 0 0;font-size:13px;color:#52525b">${inner}</p>`;
}

function meetingSection(trip) {
  const meetings = trip.meetings || [];
  if (!meetings.length) return "";
  const shown = meetings.slice(0, MAX_ROWS);
  const rows = shown
    .map((meeting) =>
      itemRow(
        linkedName(meeting.title || "Team meeting", trip.overviewUrl),
        escapeHtml(formatMeetingWhen(meeting.scheduledAt))
      )
    )
    .join("");
  return `${sectionHeading(`Meetings (${meetings.length})`, EMAIL_BRAND_ACCENT)}
    ${itemTable(rows)}
    ${moreLine(meetings.length - shown.length, "meeting", trip.overviewUrl)}`;
}

function trainingSection(trip) {
  const training = trip.training || { complete: 0, total: 0, incomplete: [] };
  const summary = training.total
    ? `${training.complete} of ${training.total} complete`
    : "Training is not set up on this trip yet.";
  const incomplete = training.incomplete || [];
  if (!incomplete.length) {
    return `${sectionHeading("Training", EMAIL_BRAND_ACCENT)}
      <p style="margin:0;font-size:13px;color:#52525b">${escapeHtml(
        training.total ? `All set. ${summary}.` : summary
      )}</p>`;
  }

  const shown = incomplete.slice(0, MAX_ROWS);
  const rows = shown
    .map((module) => {
      const due = module.dueDate ? `Due ${formatDueDate(module.dueDate)}` : "No due date";
      return itemRow(linkedName(module.title, trip.trainingUrl), escapeHtml(due));
    })
    .join("");

  return `${sectionHeading(`Training (${summary})`, EMAIL_BRAND_ACCENT)}
    <p style="margin:0 0 4px;font-size:13px;color:#52525b">Still to finish:</p>
    ${itemTable(rows)}
    ${moreLine(incomplete.length - shown.length, "module", trip.trainingUrl)}`;
}

function taskMeta(task, { overdue }) {
  const parts = [`Due ${escapeHtml(formatDueDate(task.dueDate))}`];
  if (overdue && task.daysOverdue > 0) {
    parts.push(
      `<span style="color:${OVERDUE_ACCENT};font-weight:700">${escapeHtml(pluralize(task.daysOverdue, "day"))} overdue</span>`
    );
  }
  return parts.join(" · ");
}

function taskRows(tasks, { overdue, url }) {
  return tasks
    .map((task) => itemRow(linkedName(task.title, url), taskMeta(task, { overdue })))
    .join("");
}

function tasksSection(trip) {
  const tasks = trip.tasks || {};
  const summary = tasks.total ? `${tasks.complete} of ${tasks.total} complete` : "No tasks on this trip yet.";
  const overdue = tasks.overdue || [];
  const upcoming = tasks.upcoming || [];
  const undated = tasks.undated || [];
  const heading = sectionHeading(`Tasks (${summary})`, overdue.length ? OVERDUE_ACCENT : EMAIL_BRAND_ACCENT);

  if (!tasks.total) {
    return `${heading}<p style="margin:0;font-size:13px;color:#52525b">${escapeHtml(summary)}</p>`;
  }

  if (!overdue.length && !upcoming.length && !undated.length) {
    return `${heading}<p style="margin:0;font-size:13px;color:#52525b">All set. ${escapeHtml(summary)}.</p>`;
  }

  const blocks = [];
  if (overdue.length) {
    const shown = overdue.slice(0, MAX_ROWS);
    blocks.push(`<p style="margin:8px 0 0;font-size:13px;font-weight:700;color:${OVERDUE_ACCENT}">Overdue (${overdue.length})</p>
      ${itemTable(taskRows(shown, { overdue: true, url: trip.tasksUrl }))}
      ${moreLine(overdue.length - shown.length, "task", trip.tasksUrl)}`);
  }

  if (upcoming.length) {
    const shown = upcoming.slice(0, MAX_ROWS);
    const label = tasks.upcomingMode === "next" ? "Coming up next" : "Due this week";
    const intro =
      tasks.upcomingMode === "next"
        ? `<p style="margin:0 0 4px;font-size:13px;color:#52525b">${
            overdue.length
              ? "Nothing else is due in the next 7 days."
              : "Nothing is due this week. Here's what's next."
          }</p>`
        : "";
    blocks.push(`<p style="margin:12px 0 0;font-size:13px;font-weight:700;color:${EMAIL_BRAND_ACCENT}">${escapeHtml(label)} (${upcoming.length})</p>
      ${intro}
      ${itemTable(taskRows(shown, { overdue: false, url: trip.tasksUrl }))}
      ${moreLine(upcoming.length - shown.length, "task", trip.tasksUrl)}`);
  }

  if (undated.length) {
    const shown = undated.slice(0, 5);
    blocks.push(`<p style="margin:12px 0 0;font-size:13px;font-weight:700;color:#52525b">Open, no due date (${undated.length})</p>
      ${itemTable(shown.map((task) => itemRow(linkedName(task.title, trip.tasksUrl), "")).join(""))}
      ${moreLine(undated.length - shown.length, "task", trip.tasksUrl)}`);
  }

  return `${heading}${blocks.join("")}`;
}

function fundraisingSection(trip) {
  const fundraising = trip.fundraising || { lines: [] };
  const lines = fundraising.lines || [];
  if (!lines.length) return "";
  const items = lines
    .map((line) => {
      if (line.href) {
        return `<div style="margin:0 0 6px;font-size:14px">• ${escapeHtml(line.label)} <a href="${escapeHtml(line.href)}" target="_blank" style="color:${EMAIL_BRAND_ACCENT}">${escapeHtml(line.value)}</a></div>`;
      }
      return `<div style="margin:0 0 6px;font-size:14px">• ${escapeHtml(line.label)} <span style="color:${EMAIL_BRAND_ACCENT};font-weight:700">${escapeHtml(line.value)}</span></div>`;
    })
    .join("");
  return `${sectionHeading("Fundraising", FUNDRAISING_ACCENT)}
    ${items}
    ${
      trip.fundraisingUrl
        ? `<p style="margin:8px 0 0;font-size:13px"><a href="${escapeHtml(trip.fundraisingUrl)}" style="color:${EMAIL_BRAND_ACCENT}">Open fundraising in the Hub</a></p>`
        : ""
    }`;
}

function tripBlock(trip, { showTripHeading }) {
  const place = [trip.location].filter(Boolean).join("");
  const heading = showTripHeading
    ? `<div style="margin:8px 0 0;font-size:16px;font-weight:700">${linkedName(trip.name || "Trip", trip.overviewUrl)}</div>
       ${place ? `<div style="font-size:13px;color:#52525b;margin-bottom:4px">${escapeHtml(place)}</div>` : ""}`
    : "";
  return `<div style="margin:0 0 8px">
    ${heading}
    ${meetingSection(trip)}
    ${trainingSection(trip)}
    ${tasksSection(trip)}
    ${fundraisingSection(trip)}
  </div>`;
}

export function buildWeeklyWorkerDigestSubject(digest) {
  const trips = digest?.trips || [];
  const meetings = trips.reduce((sum, trip) => sum + (trip.meetings?.length || 0), 0);
  const trainingLeft = trips.reduce((sum, trip) => sum + (trip.training?.incomplete?.length || 0), 0);
  const taskAttention = trips.reduce((sum, trip) => sum + (trip.tasks?.attentionCount || 0), 0);
  const fundraising = trips.some((trip) => trip.fundraising?.needsAttention);
  const parts = [];
  if (meetings) parts.push(pluralize(meetings, "meeting"));
  if (trainingLeft) parts.push(pluralize(trainingLeft, "training item"));
  if (taskAttention) parts.push(pluralize(taskAttention, "task"));
  if (fundraising) parts.push("fundraising");
  return parts.length ? `Your LST week: ${parts.join(", ")}` : "Your LST week";
}

export function buildWeeklyWorkerDigestHtml({
  firstName,
  trips,
  hubUrl,
  testNote,
  skipReason,
}) {
  const greetingName = String(firstName || "").trim();
  const testBanner = testNote
    ? `<div style="margin:0 0 16px;padding:10px 12px;background:#fef9c3;border:1px solid #fde68a;border-radius:6px;font-size:13px;color:#713f12">${escapeHtml(testNote)}</div>`
    : "";

  if (!trips?.length) {
    return wrapTeamLockEmailCard({
      title: greetingName ? `Hi ${greetingName}` : "Weekly update",
      bodyHtml: `${testBanner}<p style="margin:0;font-size:15px">${escapeHtml(
        skipReason || "No active trip to include this week."
      )}</p>`,
      ctaHtml: hubUrl ? buildEmailCtaBlock({ href: hubUrl, label: "Open Projects Hub" }) : "",
    });
  }

  const showTripHeading = trips.length > 1;
  const primaryUrl = trips.length === 1 ? trips[0].overviewUrl : hubUrl;
  const ctaLabel = trips.length === 1 ? "Open your trip" : "Open Projects Hub";
  const bodyHtml = `
    ${testBanner}
    <p style="margin:0 0 8px;font-size:15px">Here's what is coming up for you this week.</p>
    ${trips.map((trip) => tripBlock(trip, { showTripHeading })).join('<div style="height:16px"></div>')}
  `.trim();

  return wrapTeamLockEmailCard({
    title: greetingName ? `Good morning, ${greetingName}` : "Good morning",
    bodyHtml,
    ctaHtml: primaryUrl ? buildEmailCtaBlock({ href: primaryUrl, label: ctaLabel }) : "",
  });
}
