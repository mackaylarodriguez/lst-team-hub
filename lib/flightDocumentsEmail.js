import { escapeHtml } from "@/lib/resendMail";
import { buildEmailCtaBlock, buildEmailHtmlHead, EMAIL_BRAND_ACCENT } from "@/lib/emailCtaButton";

export const FLIGHT_DOCUMENTS_CC_EMAIL = "leslee.altrock@lst.org";
export const FLIGHT_TRAVEL_RESOURCES_URL = "https://www.highpointgo.com/travel-resources";
export const FLIGHT_DOCUMENTS_LESLEE_PHONE = "817 798 1178";

const TRIP_DOC_WORKER_PREFIX = "[worker]";
const LINK_STYLE = `color:${EMAIL_BRAND_ACCENT};font-weight:700;text-decoration:underline`;

/** Live sends stay off until this env var is exactly "true". Admin tests ignore it. */
export function flightDocumentsEmailsEnabled() {
  return String(process.env.FLIGHT_DOCUMENTS_EMAILS_ENABLED || "").trim().toLowerCase() === "true";
}

export function isFlightsDocumentCategory(category) {
  const normalized = String(category || "").trim().toLowerCase();
  return normalized === "flights" || normalized === "flight";
}

export function parseTripDocumentWorkerName(workArea) {
  const first = String(workArea || "").split("\n")[0].trim();
  if (first.toLowerCase().startsWith(TRIP_DOC_WORKER_PREFIX)) {
    return first.slice(TRIP_DOC_WORKER_PREFIX.length).trim();
  }
  return "";
}

function personNameKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function fullName(firstName, lastName) {
  return [firstName, lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
}

function emailFromMatch(row, workerName) {
  const email = String(row?.email || "").trim().toLowerCase();
  if (!email) return null;
  const name = fullName(row.first_name, row.last_name) || String(workerName || "").trim();
  return { email, name };
}

/**
 * Match the Trip Documents worker label to an email on this trip.
 * Roster rows win; assigned profiles are the fallback.
 */
export async function resolveFlightDocumentRecipient(admin, tripId, workerName) {
  const label = String(workerName || "").trim();
  const labelKey = personNameKey(label);
  const labelEmail = label.includes("@") ? label.toLowerCase() : "";
  if (!labelKey) return null;

  const { data: members, error: membersError } = await admin
    .from("trip_team_members")
    .select("first_name, last_name, email")
    .eq("trip_id", tripId);

  if (membersError) throw membersError;

  const rosterMatch = (members || []).find((row) => {
    const nameKey = personNameKey(fullName(row.first_name, row.last_name));
    const email = String(row.email || "").trim().toLowerCase();
    return (labelEmail && email === labelEmail) || (nameKey && nameKey === labelKey);
  });
  const rosterRecipient = emailFromMatch(rosterMatch, label);
  if (rosterRecipient) return rosterRecipient;

  const { data: assignments, error: assignmentsError } = await admin
    .from("trip_assignments")
    .select("user_id")
    .eq("trip_id", tripId);

  if (assignmentsError) throw assignmentsError;

  const profileIds = [...new Set((assignments || []).map((row) => row.user_id).filter(Boolean))];
  if (!profileIds.length) return null;

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("first_name, last_name, email")
    .in("id", profileIds);

  if (profilesError) throw profilesError;

  const profileMatch = (profiles || []).find((row) => {
    const nameKey = personNameKey(fullName(row.first_name, row.last_name));
    const email = String(row.email || "").trim().toLowerCase();
    return (labelEmail && email === labelEmail) || (nameKey && nameKey === labelKey);
  });

  return emailFromMatch(profileMatch, label);
}

function paragraph(html) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55">${html}</p>`;
}

function wrapFlightDocumentsEmailCard({ title, bodyHtml }) {
  return `${buildEmailHtmlHead("LST International Projects Hub")}
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;line-height:1.5">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">
          <tr>
            <td align="center" style="padding:24px 28px 8px;border-bottom:1px solid #e4e4e7;background:#fafafa;text-align:center">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${EMAIL_BRAND_ACCENT}">
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

export function buildFlightDocumentsEmailSubject() {
  return "Your travel documents are now available";
}

export function buildFlightDocumentsEmailHtml({
  recipientName,
  tripDocumentsUrl,
  testNote,
} = {}) {
  const name = String(recipientName || "").trim() || "there";
  const documentsUrl = String(tripDocumentsUrl || "").trim();
  const testBanner = testNote
    ? `<div style="margin:0 0 16px;padding:10px 12px;background:#fef9c3;border:1px solid #fde68a;border-radius:6px;font-size:13px;color:#713f12">${escapeHtml(testNote)}</div>`
    : "";

  const notes = `
    <div style="margin:16px 0;padding:16px 18px;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;font-size:14px;line-height:1.55">
      <div style="font-weight:700;margin:0 0 12px;font-size:15px;color:${EMAIL_BRAND_ACCENT}">
        Helpful notes
      </div>
      <ul style="margin:0 0 0 18px;padding:0;font-size:14px;line-height:1.55">
        <li style="margin-bottom:10px">
          WhatsApp is the primary way we communicate with readers while you're on your project, so be sure you have it installed and ready to use.
        </li>
        <li style="margin-bottom:10px">
          Our travel agent has put together this resource to check information for your project.
          <a href="${escapeHtml(FLIGHT_TRAVEL_RESOURCES_URL)}" style="${LINK_STYLE}">${escapeHtml(FLIGHT_TRAVEL_RESOURCES_URL)}</a>
        </li>
        <li style="margin-bottom:10px">
          If your project requires a visa, you'll receive additional instructions when it's time to apply.
        </li>
        <li style="margin-bottom:0">
          Your fundraising must be complete 30 days before departure.
        </li>
      </ul>
    </div>
  `.trim();

  const cta = documentsUrl
    ? buildEmailCtaBlock({ href: documentsUrl, label: "Open Trip Documents" })
    : "";

  const bodyHtml = `
    ${testBanner}
    ${paragraph(`Dear ${escapeHtml(name)},`)}
    ${paragraph("It is getting real now!")}
    ${paragraph(
      "Your travel documents are now available in The Hub under the Trip Documents tab. Look for the document labeled flights with your name."
    )}
    ${cta}
    ${paragraph(
      "Please review your itinerary within the next 24 hours. Pay special attention to the spelling of your name and make sure it matches your passport exactly. If you notice any errors, contact me immediately so we can correct them before airline change fees apply."
    )}
    ${paragraph(
      "You can log in and update your information (adjust seats, add frequent flyer #, etc) by logging into your airline with your reservation code. Your reservation code is on your travel document."
    )}
    ${notes}
    ${paragraph(
      `Blessings,<br>Leslee Altrock<br><a href="tel:+18177981178" style="${LINK_STYLE}">${escapeHtml(FLIGHT_DOCUMENTS_LESLEE_PHONE)}</a>`
    )}
  `.trim();

  return wrapFlightDocumentsEmailCard({
    title: "Your travel documents are ready",
    bodyHtml,
  });
}
