import { escapeHtml } from "@/lib/resendMail";
import { buildEmailCtaBlock, buildEmailHtmlHead } from "@/lib/emailCtaButton";
import { resolveProjectLengthForLock } from "@/lib/teamLockProjectLength";
import { coerceSqlDateToYmd } from "@/lib/isoDateYmd";

const VALUE_STYLE = "color:#15803d;font-weight:700";
const LINK_STYLE = "color:#15803d;font-weight:700;text-decoration:underline";

function val(text) {
  const normalized = String(text ?? "").trim();
  if (!normalized) return "—";
  return `<span style="${VALUE_STYLE}">${escapeHtml(normalized)}</span>`;
}

function label(text) {
  return escapeHtml(text);
}

function paragraph(text) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55">${text}</p>`;
}

function sectionHeading(text) {
  return `<div style="font-weight:700;margin:0 0 10px;font-size:14px;color:#18181b">${escapeHtml(text)}</div>`;
}

function emailSectionCard(title, innerHtml) {
  const titleHtml = title
    ? `<div style="font-weight:700;margin:0 0 12px;font-size:15px;color:#15803d">${escapeHtml(title)}</div>`
    : "";
  return `
    <div style="margin:16px 0;padding:16px 18px;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;font-size:14px;line-height:1.55">
      ${titleHtml}
      ${innerHtml}
    </div>
  `.trim();
}

function bulletRow(labelText, valueText, indent = 0) {
  const display = String(valueText ?? "").trim();
  const valueHtml = display ? val(display) : "—";
  const pad = indent ? `padding-left:${indent}px` : "";
  return `<div style="margin-bottom:6px;${pad}">• ${label(labelText)} ${valueHtml}</div>`;
}

function subBulletRow(labelText, valueText) {
  return `<div style="margin:0 0 4px 20px;font-size:14px">○ ${label(labelText)} ${val(valueText)}</div>`;
}

function formatUsDate(ymd) {
  const raw = String(ymd || "").trim();
  const normalized = coerceSqlDateToYmd(raw) || raw;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized || "—";
  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return normalized;
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function formatUsd(amount) {
  const raw = String(amount ?? "").trim();
  if (!raw) return "—";
  const numeric = Number(raw.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) return raw;
  return `$${numeric.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatYesNoMaybe(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "yes") return "Yes";
  if (v === "maybe") return "Maybe";
  if (v === "no") return "No";
  return v || "—";
}

function formatMemberName(member) {
  const first = String(member?.firstName || member?.first_name || "").trim();
  const last = String(member?.lastName || member?.last_name || "").trim();
  return [first, last].filter(Boolean).join(" ");
}

function isRosterMemberForInvite(member) {
  const role = String(member?.teamRole || member?.team_role || "").trim().toLowerCase();
  const travels = member?.travelsWithTeam !== false && member?.travels_with_team !== false;
  if (role === "leader" && !travels) return false;
  return true;
}

function memberFirstName(member) {
  return String(member?.firstName || member?.first_name || "").trim();
}

function formatRosterFirstNamesList(teamMembers) {
  const names = (teamMembers || [])
    .filter(isRosterMemberForInvite)
    .map(memberFirstName)
    .filter(Boolean);
  const unique = [...new Set(names)];
  if (!unique.length) return "";
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]}`;
}

function formatTeamMemberListAnd(teamMembers) {
  const names = (teamMembers || [])
    .filter(isRosterMemberForInvite)
    .map(formatMemberName)
    .filter(Boolean);
  if (!names.length) return "—";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function firstNameFromFullName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

function lockYearFromPayload(payload) {
  const start = String(payload?.startDate || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) return start.slice(0, 4);
  return String(new Date().getFullYear());
}

function lockTitleText(payload) {
  const year = lockYearFromPayload(payload);
  const teamName = String(payload?.teamName || "Team").trim();
  const site = String(payload?.site || payload?.tripLocation || "").trim();
  const host = String(payload?.host || "").trim();
  const hostPart = host ? ` with ${host}` : "";
  return `${year} Lock Team ${teamName} to ${site}${hostPart}`;
}

function hubSignupNote(loginUrl) {
  const hubUrl = String(loginUrl || "").trim();
  if (!hubUrl) {
    return "Please sign up through the Hub.";
  }
  return `Please sign up through <a href="${escapeHtml(hubUrl)}" style="${LINK_STYLE}">the Hub</a>.`;
}

function wrapWorkerInviteEmailCard({ title, bodyHtml, ctaHtml }) {
  return `${buildEmailHtmlHead("LST International Projects Hub")}
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;line-height:1.5">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">
          <tr>
            <td align="center" style="padding:24px 28px 8px;border-bottom:1px solid #e4e4e7;background:#fafafa;text-align:center">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#15803d">
                LST International Projects Hub
              </div>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;font-weight:700;color:#18181b;text-align:center">
                ${escapeHtml(title)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px">
              ${bodyHtml}
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;background:#fafafa;border-top:1px solid #e4e4e7">
              <p style="margin:0;font-size:12px;color:#71717a">
                Let's Start Talking (LST) · This invite link can only be sent once. If it expires, use Forgot Password on the login page.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildWorkerInviteEmailSubject({ tripName }) {
  const trip = String(tripName || "your LST trip").trim();
  return `Your team is locked — ${trip}`;
}

export function buildWorkerInviteEmailHtml({
  recipientName,
  senderName,
  tripName,
  tripLocation,
  host,
  startDate,
  endDate,
  projectLengthSummary,
  projectDates,
  weeks,
  extraTravelStatus,
  fundraisingGoalAmount,
  teamMembers,
  appLoginUrl,
  inviteUrl,
}) {
  const greetingNames =
    formatRosterFirstNamesList(teamMembers) || firstNameFromFullName(recipientName) || "there";
  const sender = String(senderName || "LST staff").trim();
  const lockLine = lockTitleText({
    teamName: tripName,
    site: tripLocation,
    host,
    startDate,
  });

  const projectLength =
    resolveProjectLengthForLock({
      projectLengthSummary,
      weeks,
      projectDates,
      startDate,
      endDate,
    }) || "";

  const memberNames = formatTeamMemberListAnd(teamMembers);
  const loginUrl = String(appLoginUrl || "https://lst-team-hub.vercel.app/login").trim();

  const projectInfoCard = emailSectionCard(
    "Your project",
    `
      <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#15803d">${escapeHtml(lockLine)}</p>
      <p style="margin:0 0 12px;font-size:14px">The following project is now locked:</p>
      ${bulletRow("Team Developer:", "Leslee")}
      <div style="height:10px"></div>
      ${sectionHeading("Project dates")}
      ${subBulletRow("Project length:", projectLength)}
      ${subBulletRow("Depart US:", formatUsDate(startDate))}
      ${subBulletRow("Project end date:", formatUsDate(endDate))}
      <div style="height:10px"></div>
      <div style="margin-bottom:6px"><strong>Team member names:</strong> ${val(memberNames)}</div>
      <div style="height:10px"></div>
      ${sectionHeading("Other")}
      ${subBulletRow(
        "Any team members doing extra travel before or after the project?",
        formatYesNoMaybe(extraTravelStatus)
      )}
      <div style="height:10px"></div>
      ${sectionHeading("Fundraising")}
      ${subBulletRow("Goal(s):", formatUsd(fundraisingGoalAmount))}
    `.trim()
  );

  const gettingStartedCta = inviteUrl
    ? `<div style="margin:14px 0 4px">${buildEmailCtaBlock({ href: inviteUrl, label: "Set up your password" })}</div>`
    : "";

  const actionItemsCard = emailSectionCard(
    "Important action items",
    `
      ${sectionHeading("Getting started")}
      <p style="margin:0 0 10px;font-size:14px">
        The Hub will be your go-to for important trip information, tracking your training, and accessing trip documents.
        Here is how you will access the Hub:
      </p>
      <ul style="margin:0 0 0 18px;padding:0;font-size:14px;line-height:1.55">
        <li style="margin-bottom:6px">Go to: <a href="${escapeHtml(loginUrl)}" style="${LINK_STYLE}">${escapeHtml(loginUrl)}</a></li>
        <li style="margin-bottom:6px">Use your email (already in the system)</li>
        <li style="margin-bottom:6px">Set up your password and complete your profile</li>
      </ul>
      ${gettingStartedCta}
      <div style="height:16px"></div>
      ${sectionHeading("Training")}
      <p style="margin:0 0 10px;font-size:14px">
        <strong>Google Classroom training</strong> — Video-based training you can complete on your own schedule.
        ${hubSignupNote(loginUrl)}
        I will also mail you a Luke Workbook to help with your preparation.
      </p>
      <p style="margin:0 0 10px;font-size:14px">
        <strong>Online training</strong> — Live sessions with LST staff (not recorded). Please participate in all three:
      </p>
      <ul style="margin:0 0 0 18px;padding:0;font-size:14px;line-height:1.55">
        <li style="margin-bottom:10px">
          <strong>Basic training:</strong> Mandatory for new workers and highly recommended for everyone.
          Complete before departure — ideally as soon as you can. Covers LST Reading and fundamentals of great reading sessions.
          ${hubSignupNote(loginUrl)}
        </li>
        <li style="margin-bottom:10px">
          <strong>Gateway training:</strong> Mandatory for the whole team; we prefer you attend the same session.
          Complete in the month or two before you leave.
          ${hubSignupNote(loginUrl)}
        </li>
        <li style="margin-bottom:0">
          <strong>Endmeeting:</strong> Final session after your project ends.
          ${hubSignupNote(loginUrl)}
        </li>
      </ul>
    `.trim()
  );

  const bodyHtml = `
    ${paragraph(`Hi ${escapeHtml(greetingNames)},`)}
    ${paragraph(
      "I'm thrilled to let you know that our team is now officially locked in! This means you're fully in the system, and things will start moving forward on your behalf!"
    )}
    ${paragraph("Here is information about your project:")}
    ${projectInfoCard}
    ${actionItemsCard}
    ${paragraph("I'm so excited to be at this point with you, and I can't wait to see everything come together!")}
    ${paragraph(`Blessings,<br>${escapeHtml(sender)}`)}
  `.trim();

  return wrapWorkerInviteEmailCard({
    title: "Your team is locked",
    bodyHtml,
    ctaHtml: "",
  });
}
