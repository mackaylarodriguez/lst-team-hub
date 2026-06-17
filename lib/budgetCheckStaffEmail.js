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

function formatUsd(amount) {
  const raw = String(amount ?? "").trim();
  if (!raw) return "—";
  const numeric = Number(raw.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) return raw;
  return `$${numeric.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function detailRow(fieldLabel, value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  return `<div style="margin-bottom:8px">${label(`${fieldLabel}:`)} ${val(normalized)}</div>`;
}

export function buildBudgetCheckStaffEmailSubject({ tripName, amountRequested }) {
  const trip = String(tripName || "Trip").trim();
  return `Printed check request — ${trip} — ${formatUsd(amountRequested)}`;
}

export function buildBudgetCheckStaffEmailHtml({
  requesterLabel,
  tripName,
  teamName,
  accountant,
  amountRequested,
  note,
  checksUrl,
}) {
  const requester = String(requesterLabel || "Staff").trim();
  const checksLink = String(checksUrl || "").trim();

  const details = [
    detailRow("Trip", tripName),
    detailRow("Team", teamName),
    detailRow("Accountant", accountant),
    `<div style="margin-bottom:8px">${label("Check amount:")} ${val(formatUsd(amountRequested))}</div>`,
    detailRow("Note", note),
  ]
    .filter(Boolean)
    .join("");

  const cta = checksLink
    ? `<p style="margin:24px 0 0;text-align:center">
        <a href="${escapeHtml(checksLink)}"
           style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 22px;border-radius:6px">
          Open Budget → Checks
        </a>
      </p>
      <p style="margin:12px 0 0;font-size:12px;word-break:break-all;color:#71717a;text-align:center">
        ${escapeHtml(checksLink)}
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LST International Projects Hub</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;line-height:1.5">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">
          <tr>
            <td style="padding:24px 28px 8px;border-bottom:1px solid #e4e4e7;background:#fafafa">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#15803d">
                LST International Projects Hub
              </div>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;font-weight:700;color:#18181b">
                Printed check request
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px">
              <p style="margin:0 0 16px;font-size:15px">
                ${val(requester)} requested a printed check.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px;background:#fafafa;border:1px solid #e4e4e7;border-radius:6px">
                <tr>
                  <td style="padding:14px 16px;font-size:14px">
                    ${details}
                  </td>
                </tr>
              </table>
              ${cta}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;background:#fafafa;border-top:1px solid #e4e4e7">
              <p style="margin:0;font-size:12px;color:#71717a">
                Let's Start Talking (LST)<br />
                Mark processed or delete the request from Budget → Checks.
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
