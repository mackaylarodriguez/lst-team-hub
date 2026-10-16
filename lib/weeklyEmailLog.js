/**
 * Server-only log of weekly worker and staff emails.
 */

const WEEKLY_SUBJECT_PREFIXES = ["Your LST week", "Your LST tasks this week"];

export function isMissingHubWeeklyEmailSendsTable(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    (error?.code === "42P01" || error?.code === "PGRST205") &&
    message.includes("hub_weekly_email_sends")
  );
}

function isWeeklyEmailSubject(subject) {
  const bare = String(subject || "")
    .replace(/^\[TEST\]\s*/i, "")
    .trim();
  return WEEKLY_SUBJECT_PREFIXES.some((prefix) => bare.startsWith(prefix));
}

function kindFromSubject(subject) {
  const bare = String(subject || "")
    .replace(/^\[TEST\]\s*/i, "")
    .trim();
  return bare.startsWith("Your LST tasks") ? "weekly_tasks" : "weekly_worker";
}

function normalizeStoredRow(row) {
  return {
    id: row.id,
    resendId: row.resend_id || "",
    kind: row.kind || "weekly_worker",
    source: row.source || "cron",
    status: row.status || "sent",
    email: row.recipient_email || "",
    name: row.recipient_name || "",
    subject: row.subject || "",
    tripNames: row.trip_names || "",
    detail: row.detail || "",
    sentAt: row.created_at || "",
  };
}

export async function recordWeeklyEmailSend(admin, entry) {
  if (!admin) return { stored: false };
  const payload = {
    resend_id: entry.resendId || null,
    kind: entry.kind,
    source: entry.source || "cron",
    status: entry.status || "sent",
    recipient_email: String(entry.email || "").trim().toLowerCase(),
    recipient_name: entry.name || null,
    subject: entry.subject || null,
    trip_names: entry.tripNames || null,
    detail: entry.detail || null,
  };
  if (!payload.recipient_email || !payload.kind) return { stored: false };

  try {
    const { error } = await admin.from("hub_weekly_email_sends").insert(payload);
    if (!error) return { stored: true };
    if (!isMissingHubWeeklyEmailSendsTable(error)) {
      console.error("[weekly-email-log]", error);
    }
    return { stored: false, missingTable: isMissingHubWeeklyEmailSendsTable(error) };
  } catch (error) {
    console.error("[weekly-email-log]", error);
    return { stored: false };
  }
}

async function listResendWeeklyEmails() {
  const key = String(process.env.RESEND_API_KEY || "").trim();
  if (!key) return [];

  try {
    const response = await fetch("https://api.resend.com/emails?limit=100", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[weekly-email-log] resend list", response.status, json);
      return [];
    }
    return (json?.data || [])
      .filter((row) => isWeeklyEmailSubject(row?.subject))
      .map((row) => {
        const subject = String(row.subject || "");
        const to = Array.isArray(row.to) ? row.to[0] : row.to;
        return {
          id: `resend:${row.id}`,
          resendId: row.id || "",
          kind: kindFromSubject(subject),
          source: /^\[TEST\]/i.test(subject) ? "test" : "cron",
          status: row.last_event || "sent",
          email: String(to || "").trim().toLowerCase(),
          name: "",
          subject,
          tripNames: "",
          detail: "",
          sentAt: row.created_at || "",
        };
      });
  } catch (error) {
    console.error("[weekly-email-log] resend list", error);
    return [];
  }
}

/** Recent weekly sends, Hub log first, then any Resend copies not already stored. */
export async function listSentWeeklyEmails(admin) {
  let stored = [];
  let missingTable = false;

  const { data, error } = await admin
    .from("hub_weekly_email_sends")
    .select(
      "id, resend_id, kind, source, status, recipient_email, recipient_name, subject, trip_names, detail, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    if (!isMissingHubWeeklyEmailSendsTable(error)) throw error;
    missingTable = true;
  } else {
    stored = (data || []).map(normalizeStoredRow);
  }

  const knownResendIds = new Set(stored.map((row) => row.resendId).filter(Boolean));
  const fromResend = (await listResendWeeklyEmails()).filter(
    (row) => !row.resendId || !knownResendIds.has(row.resendId)
  );

  const rows = [...stored, ...fromResend]
    .sort((a, b) => String(b.sentAt).localeCompare(String(a.sentAt)))
    .slice(0, 80);

  return { rows, missingTable };
}
