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
    blocks.push(`<div style="margin-top:8px">${label("Mackayla notes:")} ${val(mackayla)}</div>`);
  }
  if (leslee) {
    blocks.push(`<div style="margin-top:8px">${label("Leslee notes:")} ${val(leslee)}</div>`);
  }

  blocks.push(
    `<div style="margin-top:10px">${label("Any team members doing extra travel before or after the project?")} ${val(formatYesNoMaybe(payload?.extraTravelStatus))}</div>`
  );

  return blocks.join("");
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
    `<div>${label("Goal(s):")} ${val(formatUsd(payload?.fundraisingGoalAmount))}</div>`,
    `<div>${label("Fee:")} ${val(formatUsd(payload?.tripFeeAmount))}</div>`,
    `<div>${label("Materials Fee:")} ${val(formatUsd(payload?.materialsFeeAmount))}</div>`,
  ];

  if (isHannoverSite(site) && String(payload?.hannoverHousingFeeAmount || "").trim()) {
    fundraisingLines.push(
      `<div>${label("Hannover Housing Fee:")} ${val(formatUsd(payload?.hannoverHousingFeeAmount))}</div>`
    );
  }

  const tripLink = tripUrl
    ? `<p style="margin:16px 0 0"><a href="${escapeHtml(tripUrl)}" style="color:#15803d;font-weight:700">Open trip in Team Hub</a></p>`
    : "";

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#0f172a;max-width:640px">
      <p style="margin:0 0 14px;font-size:16px;line-height:1.45">${titleLine}</p>
      <p style="margin:0 0 16px">${label("The following project is now locked:")}</p>

      <div style="margin:0 0 14px">
        <div>${label("Team Developer:")} ${val(payload?.teamDeveloper)}</div>
      </div>

      <div style="margin:0 0 14px">
        <div style="margin-bottom:6px">${label("Project Dates:")}</div>
        <div style="padding-left:12px">
          <div>${label("Project Length:")} ${val(projectLength)}</div>
          <div>${label("Depart US:")} ${val(formatUsDate(payload?.startDate))}</div>
          <div>${label("Project End Date:")} ${val(formatUsDate(payload?.endDate))}</div>
        </div>
      </div>

      <div style="margin:0 0 14px">
        <div>${label("Team Member Names:")} ${val(formatTeamMemberList(payload?.teamMembers))}</div>
      </div>

      <div style="margin:0 0 14px">
        <div style="margin-bottom:6px">${label("Other")}</div>
        ${buildOtherSection(payload)}
      </div>

      <div style="margin:0 0 8px">
        <div style="margin-bottom:6px">${label("Fundraising information:")}</div>
        <div style="padding-left:12px">
          ${fundraisingLines.join("")}
        </div>
      </div>

      ${tripLink}
    </div>
  `.trim();
}
