import { escapeHtml } from "@/lib/resendMail";
import { resolveProjectLengthForLock, firstNonBlankValue } from "@/lib/teamLockProjectLength";
import { buildEmailCtaBlock, buildEmailHtmlHead, EMAIL_BRAND_ACCENT } from "@/lib/emailCtaButton";

const VALUE_STYLE = `color:${EMAIL_BRAND_ACCENT}`;

function val(text) {
  const normalized = String(text ?? "").trim();
  if (!normalized) return "—";
  return `<span style="${VALUE_STYLE}">${escapeHtml(normalized)}</span>`;
}

function label(text) {
  return escapeHtml(text);
}

function sectionHeading(text) {
  return `<div style="font-weight:700;margin:16px 0 8px">${escapeHtml(text)}</div>`;
}

function spacer() {
  return `<div style="height:10px"></div>`;
}

function bulletRow(labelText, valueText) {
  const display = String(valueText ?? "").trim();
  const valueHtml = display ? val(display) : "—";
  return `<div style="margin-bottom:6px;padding-left:4px">• ${label(labelText)} ${valueHtml}</div>`;
}

function formatUsDate(ymd) {
  const raw = String(ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || "—";
  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return raw;
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function formatUsd(amount) {
  const raw = String(amount ?? "").trim();
  if (!raw) return "—";
  const numeric = Number(raw.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) return raw;
  return `$${numeric.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function parseMoneyAmount(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const numeric = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
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

function formatTeamMemberListPlain(teamMembers) {
  const names = (teamMembers || []).map(formatMemberName).filter(Boolean);
  return names.length ? names.join("; ") : "—";
}

function buildIndividualGoalLines(teamMembers, teamGoalAmount) {
  const teamGoal = parseMoneyAmount(teamGoalAmount);
  const lines = [];

  for (const member of teamMembers || []) {
    const memberGoal = parseMoneyAmount(member?.fundraisingGoalAmount);
    if (memberGoal === null) continue;
    if (teamGoal !== null && memberGoal === teamGoal) continue;

    const name = formatMemberName(member);
    if (!name) continue;

    lines.push(
      `<div style="margin:0 0 4px 20px;padding:4px 0 4px 10px;border-left:2px solid #d4d4d8;font-size:13px;color:#52525b">
        ${escapeHtml(name)}: ${val(formatUsd(String(memberGoal)))}
      </div>`
    );
  }

  return lines.join("");
}

function lockYearFromPayload(payload) {
  const start = String(payload?.startDate || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) return start.slice(0, 4);
  return String(new Date().getFullYear());
}

function isHannoverSite(location) {
  return /hannover/i.test(String(location || ""));
}

function buildOtherSection(payload) {
  return `<div style="margin-bottom:6px">${label("Any team members doing extra travel before or after the project?")} ${val(formatYesNoMaybe(payload?.extraTravelStatus))}</div>`;
}

function buildFundraisingSection(payload) {
  const site = String(payload?.site || "").trim();
  const lines = [
    sectionHeading("Fundraising information:"),
    bulletRow("Goal(s):", formatUsd(payload?.fundraisingGoalAmount)),
    buildIndividualGoalLines(payload?.teamMembers, payload?.fundraisingGoalAmount),
    bulletRow("Fee:", formatUsd(payload?.tripFeeAmount)),
    bulletRow("Materials Fee:", formatUsd(payload?.materialsFeeAmount)),
  ];

  if (isHannoverSite(site) && String(payload?.hannoverHousingFeeAmount || "").trim()) {
    lines.push(bulletRow("Hannover Housing Fee:", formatUsd(payload?.hannoverHousingFeeAmount)));
  }

  return lines.join("");
}

function buildTripCta(tripUrl) {
  return buildEmailCtaBlock({
    href: tripUrl,
    label: "Open trip in Projects Hub",
  });
}

export function wrapTeamLockEmailCard({ title, bodyHtml, ctaHtml, titleColor = "#18181b" }) {
  return `${buildEmailHtmlHead("LST International Projects Hub")}
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;line-height:1.5">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">
          <tr>
            <td style="padding:24px 28px 8px;border-bottom:1px solid #e4e4e7;background:#fafafa">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${EMAIL_BRAND_ACCENT}">
                LST International Projects Hub
              </div>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;font-weight:700;color:${titleColor}">
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
                Let's Start Talking (LST)
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

function teamIdentityText(payload) {
  const year = lockYearFromPayload(payload);
  const teamName = String(payload?.teamName || "Team").trim();
  const site = String(payload?.site || "").trim();
  const host = String(payload?.host || "").trim();
  const hostPart = host ? ` with ${host}` : "";
  const sitePart = site ? ` to ${site}` : "";
  return `${year} ${teamName}${sitePart}${hostPart}`;
}

function lockTitleText(payload) {
  const year = lockYearFromPayload(payload);
  const teamName = String(payload?.teamName || "Team").trim();
  const site = String(payload?.site || "").trim();
  const host = String(payload?.host || "").trim();
  const hostPart = host ? ` with ${host}` : "";
  return `${year} Lock Team ${teamName} to ${site}${hostPart}`;
}

const UNLOCK_REASON_COLOR = "#dc2626";

function buildTeamLockDetailsHtml(payload) {
  const projectLength =
    resolveProjectLengthForLock({
      projectLengthSummary: payload?.projectLengthSummary,
      weeks: firstNonBlankValue(payload?.weeks, payload?.recruitingWeeks),
      projectDates: firstNonBlankValue(payload?.projectDates, payload?.recruitingProjectDates),
      startDate: payload?.startDate,
      endDate: payload?.endDate,
    }) || "";
  const memberNames = formatTeamMemberListPlain(payload?.teamMembers);

  return `
    <div style="margin-bottom:6px">${label("Team Developer:")} ${val(payload?.teamDeveloper)}</div>
    ${spacer()}
    ${sectionHeading("Project Dates:")}
    ${bulletRow("Project Length:", projectLength)}
    ${bulletRow("Depart US:", formatUsDate(payload?.startDate))}
    ${bulletRow("Project End Date:", formatUsDate(payload?.endDate))}
    ${spacer()}
    <div style="margin-bottom:6px"><strong>Team Member Names:</strong> ${val(memberNames)}</div>
    ${spacer()}
    ${sectionHeading("Other:")}
    ${buildOtherSection(payload)}
    ${buildFundraisingSection(payload)}
  `.trim();
}

function lockDetailsTable(detailsHtml) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;background:#fafafa;border:1px solid #e4e4e7;border-radius:6px">
      <tr>
        <td style="padding:14px 16px;font-size:14px">
          ${detailsHtml}
        </td>
      </tr>
    </table>`;
}

function greenTitleLine(text) {
  return `<p style="margin:0 0 8px;font-size:15px;line-height:1.45;color:${EMAIL_BRAND_ACCENT};font-weight:700">${escapeHtml(text)}</p>`;
}

export function buildTeamLockStaffEmailSubject(payload) {
  return lockTitleText(payload);
}

export function buildTeamLockStaffEmailHtml(payload) {
  const tripUrl = String(payload?.tripUrl || "").trim();
  const titleLine = greenTitleLine(lockTitleText(payload));

  const bodyHtml = `
    ${titleLine}
    <p style="margin:0 0 16px;font-size:15px">The following project is now locked:</p>
    ${lockDetailsTable(buildTeamLockDetailsHtml(payload))}
  `.trim();

  return wrapTeamLockEmailCard({
    title: "Team locked",
    bodyHtml,
    ctaHtml: buildTripCta(tripUrl),
  });
}

export function buildTeamUnlockStaffEmailSubject(payload) {
  return `UNLOCK TEAM ${teamIdentityText(payload)}`;
}

export function buildTeamUnlockStaffEmailHtml(payload) {
  const reason = String(payload?.unlockReason || "").trim();
  const reasonHtml = `
    <div style="margin:0 0 16px;padding:12px 14px;border:1px solid #fecaca;background:#fef2f2;border-radius:6px">
      <div style="font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${UNLOCK_REASON_COLOR}">Reason for unlock</div>
      <div style="margin-top:6px;font-size:16px;line-height:1.45;color:${UNLOCK_REASON_COLOR};font-weight:700;white-space:pre-wrap">${escapeHtml(reason)}</div>
    </div>
  `.trim();

  const bodyHtml = `
    ${reasonHtml}
    ${greenTitleLine(teamIdentityText(payload))}
    ${lockDetailsTable(buildTeamLockDetailsHtml(payload))}
  `.trim();

  return wrapTeamLockEmailCard({
    title: "UNLOCK TEAM",
    titleColor: UNLOCK_REASON_COLOR,
    bodyHtml,
    ctaHtml: "",
  });
}
