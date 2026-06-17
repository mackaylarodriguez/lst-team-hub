import { escapeHtml } from "@/lib/resendMail";

const VALUE_STYLE = "color:#15803d;font-weight:700";

function val(text) {
  const normalized = String(text ?? "").trim();
  if (!normalized) return "—";
  return `<span style="${VALUE_STYLE}">${escapeHtml(normalized)}</span>`;
}

function label(text) {
  return `<strong>${escapeHtml(text)}</strong>`;
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
  return `$ ${numeric.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatYesNoMaybe(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "yes") return "yes";
  if (v === "maybe") return "maybe";
  if (v === "no") return "no";
  return v || "—";
}

function formatMemberName(member) {
  const first = String(member?.firstName || member?.first_name || "").trim();
  const last = String(member?.lastName || member?.last_name || "").trim();
  return [first, last].filter(Boolean).join(" ");
}

function formatTeamMemberList(teamMembers) {
  const names = (teamMembers || []).map(formatMemberName).filter(Boolean);
  return names.length ? names.join("; ") : "—";
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
  const blocks = [];
  const mackayla = String(payload?.mackaylaNotes || "").trim();
  const leslee = String(payload?.lesleeNotes || "").trim();

  if (mackayla) {
    blocks.push(`<div style="margin-bottom:8px">${label("Mackayla notes:")} ${val(mackayla)}</div>`);
  }
  if (leslee) {
    blocks.push(`<div style="margin-bottom:8px">${label("Leslee notes:")} ${val(leslee)}</div>`);
  }

  blocks.push(
    `<div style="margin-bottom:8px">${label("Extra travel before or after project?")} ${val(formatYesNoMaybe(payload?.extraTravelStatus))}</div>`
  );

  return blocks.join("");
}

function buildTripCta(tripUrl) {
  const link = String(tripUrl || "").trim();
  if (!link) return "";

  return `<p style="margin:24px 0 0;text-align:center">
      <a href="${escapeHtml(link)}"
         style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 22px;border-radius:6px">
        Open trip in Team Hub
      </a>
    </p>
    <p style="margin:12px 0 0;font-size:12px;word-break:break-all;color:#71717a;text-align:center">
      ${escapeHtml(link)}
    </p>`;
}

function wrapTeamLockEmailCard({ title, bodyHtml, ctaHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LST Team Hub</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;line-height:1.5">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">
          <tr>
            <td style="padding:24px 28px 8px;border-bottom:1px solid #e4e4e7;background:#fafafa">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#15803d">
                LST Team Hub
              </div>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;font-weight:700;color:#18181b">
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

export function buildTeamLockStaffEmailSubject(payload) {
  const year = lockYearFromPayload(payload);
  const teamName = String(payload?.teamName || "Team").trim();
  const site = String(payload?.site || "").trim();
  const host = String(payload?.host || "").trim();
  const hostPart = host ? ` with ${host}` : "";
  return `${year} Lock Team ${teamName} to ${site}${hostPart}`;
}

export function buildTeamLockStaffEmailHtml(payload) {
  const year = lockYearFromPayload(payload);
  const teamName = String(payload?.teamName || "").trim();
  const site = String(payload?.site || "").trim();
  const host = String(payload?.host || "").trim();
  const projectLength = String(payload?.projectLengthSummary || "").trim();
  const tripUrl = String(payload?.tripUrl || "").trim();

  const titleHost = host ? ` with ${val(host)}` : "";
  const titleLine = `${val(year)} Lock Team ${val(teamName)} to ${val(site)}${titleHost}`;

  const fundraisingLines = [
    `<div style="margin-bottom:8px">${label("Goal(s):")} ${val(formatUsd(payload?.fundraisingGoalAmount))}</div>`,
    `<div style="margin-bottom:8px">${label("Fee:")} ${val(formatUsd(payload?.tripFeeAmount))}</div>`,
    `<div style="margin-bottom:8px">${label("Materials Fee:")} ${val(formatUsd(payload?.materialsFeeAmount))}</div>`,
  ];

  if (isHannoverSite(site) && String(payload?.hannoverHousingFeeAmount || "").trim()) {
    fundraisingLines.push(
      `<div style="margin-bottom:8px">${label("Hannover Housing Fee:")} ${val(formatUsd(payload?.hannoverHousingFeeAmount))}</div>`
    );
  }

  const details = `
    <div style="margin-bottom:8px">${label("Team Developer:")} ${val(payload?.teamDeveloper)}</div>
    <div style="margin-bottom:8px">${label("Project Length:")} ${val(projectLength)}</div>
    <div style="margin-bottom:8px">${label("Depart US:")} ${val(formatUsDate(payload?.startDate))}</div>
    <div style="margin-bottom:8px">${label("Project End Date:")} ${val(formatUsDate(payload?.endDate))}</div>
    <div style="margin-bottom:8px">${label("Team Members:")} ${val(formatTeamMemberList(payload?.teamMembers))}</div>
    ${buildOtherSection(payload)}
    <div style="margin:12px 0 8px;font-size:13px;font-weight:700;color:#52525b">Fundraising</div>
    ${fundraisingLines.join("")}
  `.trim();

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:15px;line-height:1.45">${titleLine}</p>
    <p style="margin:0 0 16px;font-size:15px">${label("The following project is now locked:")}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;background:#fafafa;border:1px solid #e4e4e7;border-radius:6px">
      <tr>
        <td style="padding:14px 16px;font-size:14px">
          ${details}
        </td>
      </tr>
    </table>
  `.trim();

  return wrapTeamLockEmailCard({
    title: "Team locked",
    bodyHtml,
    ctaHtml: buildTripCta(tripUrl),
  });
}
