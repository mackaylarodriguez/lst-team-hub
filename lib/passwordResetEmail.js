import { buildEmailCtaBlock, buildEmailHtmlHead, EMAIL_BRAND_ACCENT } from "@/lib/emailCtaButton";

export function buildPasswordResetEmailSubject() {
  return "Reset your LST Hub password";
}

export function buildPasswordResetEmailHtml({ resetUrl }) {
  const href = String(resetUrl || "").trim();
  const cta = href
    ? buildEmailCtaBlock({ href, label: "Reset your password" })
    : "";

  return `${buildEmailHtmlHead("Reset your LST Hub password")}
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
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;font-weight:700;color:#18181b">
                Reset your password
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px">
              <p style="margin:0 0 16px;font-size:15px">
                Use the button below to choose a new password for your Hub account. This link expires after a short time and can only be used once.
              </p>
              ${cta}
              <p style="margin:16px 0 0;font-size:13px;color:#71717a">
                If you did not ask for this, you can ignore this email. Your password will stay the same.
              </p>
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
