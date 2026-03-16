function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getBaseUrl(req) {
  const configuredUrl = normalizeText(process.env.NEXT_PUBLIC_APP_URL);
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const host = normalizeText(req.headers.host);
  const protocol = host.includes("localhost") ? "http" : "https";
  return host ? `${protocol}://${host}` : "";
}

function buildInviteEmailHtml({
  recipientName,
  senderName,
  tripName,
  tripLocation,
  tripDates,
  loginUrl,
}) {
  const safeRecipientName = escapeHtml(recipientName || "there");
  const safeSenderName = escapeHtml(senderName || "the LST team");
  const safeTripName = escapeHtml(tripName || "your LST team");
  const safeTripLocation = escapeHtml(tripLocation || "");
  const safeTripDates = escapeHtml(tripDates || "");
  const safeLoginUrl = escapeHtml(loginUrl || "");

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #1f2937; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 28px; margin: 0 0 16px; color: #0f172a;">You're invited to join ${safeTripName}</h1>
      <p style="margin: 0 0 12px;">Hi ${safeRecipientName},</p>
      <p style="margin: 0 0 12px;">${safeSenderName} invited you to join <strong>${safeTripName}</strong> in the LST Team Hub.</p>
      <div style="margin: 20px 0; padding: 16px 18px; border: 1px solid #dbe4f0; border-radius: 14px; background: #f8fafc;">
        <div style="font-weight: 700; margin-bottom: 8px;">Team details</div>
        <div><strong>Team:</strong> ${safeTripName}</div>
        ${safeTripLocation ? `<div><strong>Location:</strong> ${safeTripLocation}</div>` : ""}
        ${safeTripDates ? `<div><strong>Dates:</strong> ${safeTripDates}</div>` : ""}
      </div>
      <p style="margin: 0 0 12px;">Use the same email address this invite was sent to when you create your account or sign in.</p>
      <p style="margin: 24px 0;">
        <a href="${safeLoginUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #0f766e; color: #ffffff; text-decoration: none; font-weight: 700;">Open Team Hub</a>
      </p>
      <p style="margin: 0 0 12px;">Once you're in, you'll be able to view your team details and resources there.</p>
      <p style="margin: 20px 0 0;">Thanks,<br />${safeSenderName}</p>
    </div>
  `;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const resendApiKey = normalizeText(process.env.RESEND_API_KEY);
  const fromEmail = normalizeText(process.env.RESEND_FROM_EMAIL);

  if (!resendApiKey || !fromEmail) {
    return res.status(500).json({
      error: "Trip invite email is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL.",
    });
  }

  const recipientEmail = normalizeEmail(req.body?.recipientEmail);
  const recipientName = normalizeText(req.body?.recipientName);
  const senderEmail = normalizeEmail(req.body?.senderEmail);
  const senderName = normalizeText(req.body?.senderName) || senderEmail || "LST staff";
  const tripId = normalizeText(req.body?.tripId);
  const tripName = normalizeText(req.body?.tripName) || "your LST team";
  const tripLocation = normalizeText(req.body?.tripLocation);
  const tripDates = normalizeText(req.body?.tripDates);

  if (!recipientEmail || !tripId) {
    return res.status(400).json({ error: "Missing recipient email or trip." });
  }

  const baseUrl = getBaseUrl(req);
  const loginUrl = `${baseUrl}/login?next=${encodeURIComponent(`/trips/${tripId}`)}`;
  const subject = `You're invited to join ${tripName}`;

  const payload = {
    from: fromEmail,
    to: [recipientEmail],
    subject,
    html: buildInviteEmailHtml({
      recipientName,
      senderName,
      tripName,
      tripLocation,
      tripDates,
      loginUrl,
    }),
    text: [
      `Hi ${recipientName || "there"},`,
      "",
      `${senderName} invited you to join ${tripName} in the LST Team Hub.`,
      tripLocation ? `Location: ${tripLocation}` : "",
      tripDates ? `Dates: ${tripDates}` : "",
      "",
      "Use the same email address this invite was sent to when you create your account or sign in.",
      "",
      `Open Team Hub: ${loginUrl}`,
      "",
      "Once you're in, you'll be able to view your team details and resources there.",
      "",
      `Thanks,`,
      senderName,
    ].filter(Boolean).join("\n"),
    ...(senderEmail ? { reply_to: senderEmail } : {}),
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Unable to send trip invite email", data || response.statusText);
    return res.status(502).json({
      error: data?.message || "Unable to send trip invite email.",
    });
  }

  return res.status(200).json({ ok: true, id: data?.id || "" });
}
