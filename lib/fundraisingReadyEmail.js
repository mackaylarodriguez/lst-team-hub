import { escapeHtml } from "@/lib/resendMail";
import {
  buildEmailCtaBlock,
  buildEmailHtmlHead,
  EMAIL_BRAND_ACCENT,
} from "@/lib/emailCtaButton";

export const FUNDRAISING_PAGE_TUTORIAL_URL = "https://youtu.be/Xx3q7GQ1dRw";

const VALUE_STYLE = `color:${EMAIL_BRAND_ACCENT};font-weight:700`;
const LINK_STYLE = `color:${EMAIL_BRAND_ACCENT};font-weight:700;text-decoration:underline`;

function val(text) {
  const normalized = String(text ?? "").trim();
  if (!normalized) return "—";
  return `<span style="${VALUE_STYLE}">${escapeHtml(normalized)}</span>`;
}

function paragraph(text) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55">${text}</p>`;
}

function formatUsd(amount) {
  if (amount === null || amount === undefined || amount === "") return "—";
  const numeric = Number(String(amount).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) return "—";
  return `$${numeric.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function firstNameFrom(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

function wrapFundraisingReadyEmailCard({ title, bodyHtml, ctaHtml }) {
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

export function buildFundraisingReadyEmailSubject({ recipientName } = {}) {
  const first = firstNameFrom(recipientName);
  return first ? `${first}, your LST fundraising page is ready` : "Your LST fundraising page is ready";
}

export function buildFundraisingReadyEmailHtml({
  recipientName,
  fundraisingUrl,
  fundraisingGoalAmount,
  projectWeeksLabel,
  tutorialUrl = FUNDRAISING_PAGE_TUTORIAL_URL,
}) {
  const greeting = firstNameFrom(recipientName) || "there";
  const pageUrl = String(fundraisingUrl || "").trim();
  const weeks = String(projectWeeksLabel || "").trim() || "—";
  const videoUrl = String(tutorialUrl || FUNDRAISING_PAGE_TUTORIAL_URL).trim();

  const detailsCard = `
    <div style="margin:16px 0;padding:16px 18px;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;font-size:14px;line-height:1.55">
      <div style="margin-bottom:8px">
        <strong>Fundraising Page:</strong>
        ${
          pageUrl
            ? `<a href="${escapeHtml(pageUrl)}" style="${LINK_STYLE}">${escapeHtml(pageUrl)}</a>`
            : "—"
        }
      </div>
      <div style="margin-bottom:8px">
        <strong>Fundraising Goal:</strong> ${val(formatUsd(fundraisingGoalAmount))}
      </div>
      <div>
        <strong>Project:</strong> ${val(weeks)}
      </div>
    </div>
  `.trim();

  const notesCard = `
    <div style="margin:16px 0;padding:16px 18px;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;font-size:14px;line-height:1.55">
      <div style="font-weight:700;margin:0 0 12px;font-size:15px;color:${EMAIL_BRAND_ACCENT}">
        A couple of important notes
      </div>
      <ul style="margin:0 0 0 18px;padding:0;font-size:14px;line-height:1.55">
        <li style="margin-bottom:10px">
          <strong>Please use your LST fundraising page for all of your online fundraising.</strong>
          Rather than creating a GoFundMe, Facebook fundraiser, or another fundraising page, simply share your LST page with everyone. This allows us to track your fundraising progress, provide tax receipts, and serve both you and your donors well.
        </li>
        <li style="margin-bottom:0">
          Your page is ready to use immediately. If you'd like to personalize it with a photo, your own story, or a custom URL, the video will show you how.
        </li>
      </ul>
    </div>
  `.trim();

  const videoCta = buildEmailCtaBlock({
    href: videoUrl,
    label: "Watch fundraising page tutorial",
  });

  const bodyHtml = `
    ${paragraph(`Hi ${escapeHtml(greeting)},`)}
    ${paragraph("Your LST fundraising page is ready!")}
    ${detailsCard}
    ${paragraph(
      "I've created a short video that shows you everything you need to know about using and customizing your fundraising page:"
    )}
    ${videoCta}
    ${notesCard}
    ${paragraph("If you have any questions, please don't hesitate to ask. We're happy to help!")}
    ${paragraph(
      `Blessings,<br>Leslee Altrock<br><a href="mailto:leslee.altrock@lst.org" style="${LINK_STYLE}">leslee.altrock@lst.org</a>`
    )}
  `.trim();

  return wrapFundraisingReadyEmailCard({
    title: "Your fundraising page is ready",
    bodyHtml,
    ctaHtml: "",
  });
}
