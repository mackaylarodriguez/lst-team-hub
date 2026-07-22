export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function getResendFromEmail() {
  return (
    String(process.env.BUDGET_CHECK_FROM_EMAIL || "").trim() ||
    String(process.env.RESEND_FROM_EMAIL || "").trim()
  );
}

export function parseNotifyEmailList(raw) {
  return String(raw || "")
    .split(/[,;]+/)
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
}

export async function sendResendEmail({ to, subject, html, cc, bcc }) {
  const key = String(process.env.RESEND_API_KEY || "").trim();
  const from = getResendFromEmail();
  const recipients = (Array.isArray(to) ? to : [to]).map(normalizeEmail).filter(Boolean);
  const ccRecipients = (Array.isArray(cc) ? cc : cc ? [cc] : [])
    .map(normalizeEmail)
    .filter(Boolean)
    .filter((email) => !recipients.includes(email));
  const bccRecipients = (Array.isArray(bcc) ? bcc : bcc ? [bcc] : [])
    .map(normalizeEmail)
    .filter(Boolean)
    .filter((email) => !recipients.includes(email) && !ccRecipients.includes(email));

  if (!key) {
    return { sent: false, reason: "missing_resend_api_key" };
  }
  if (!from) {
    return { sent: false, reason: "missing_from_email" };
  }
  if (!recipients.length) {
    return { sent: false, reason: "missing_notify_to" };
  }

  const payload = {
    from,
    to: recipients,
    subject,
    html,
  };
  if (ccRecipients.length) {
    payload.cc = ccRecipients;
  }
  if (bccRecipients.length) {
    payload.bcc = bccRecipients;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[resendMail] Resend error", res.status, json);
    return { sent: false, reason: "resend_http_error", detail: json };
  }
  return { sent: true, id: json?.id };
}
