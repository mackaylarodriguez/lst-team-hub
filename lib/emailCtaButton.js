import { escapeHtml } from "@/lib/resendMail";

const BRAND_GREEN = "#15803d";

function estimateVmlButtonWidth(label) {
  return Math.min(340, Math.max(180, String(label || "").length * 8 + 48));
}

export function buildEmailCtaButton({ href, label }) {
  const url = String(href || "").trim();
  const text = String(label || "Open").trim();
  if (!url) return "";

  const safeUrl = escapeHtml(url);
  const safeText = escapeHtml(text);
  const vmlWidth = estimateVmlButtonWidth(text);

  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" width="100%" style="margin:24px 0 0 0">
  <tr>
    <td align="center" style="padding:0;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:40px;v-text-anchor:middle;width:${vmlWidth}px;" arcsize="14%" stroke="f" fillcolor="${BRAND_GREEN}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${safeText}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
        <tr>
          <td align="center" bgcolor="${BRAND_GREEN}" style="background-color:${BRAND_GREEN};border-radius:6px;">
            <a href="${safeUrl}" target="_blank" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:15px;color:#ffffff;text-decoration:none;display:inline-block;padding:10px 20px;font-weight:bold;border-radius:6px;mso-line-height-rule:exactly;">
              ${safeText}
            </a>
          </td>
        </tr>
      </table>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

export function buildEmailCtaBlock({ href, label }) {
  return buildEmailCtaButton({ href, label });
}

export function buildEmailHtmlHead(title) {
  const safeTitle = escapeHtml(String(title || "LST International Projects Hub").trim());
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${safeTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>`;
}
