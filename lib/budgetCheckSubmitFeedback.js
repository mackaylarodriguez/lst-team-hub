/**
 * Maps POST /api/budget-check-request JSON (including `email`) to UI toast copy.
 * Email is optional: request still saves when Resend is not configured.
 */

function firstResendMessage(detail) {
  if (!detail || typeof detail !== "object") return "";
  const m = detail.message || detail.name;
  if (typeof m === "string" && m.trim()) return m.trim();
  if (Array.isArray(detail.errors) && detail.errors[0]?.message) {
    return String(detail.errors[0].message).trim();
  }
  return "";
}

/**
 * @param {object | undefined} apiJson — parsed body from submitBudgetCheckRequest()
 * @returns {{ type: "success" | "error", message: string }}
 */
export function budgetCheckSubmitToast(apiJson) {
  const email = apiJson?.email;
  if (email?.sent) {
    return {
      type: "success",
      message: "Budget check requested. A notification email was sent.",
    };
  }
  if (!email || typeof email !== "object") {
    return { type: "success", message: "Budget check requested." };
  }

  const reason = String(email.reason || "");
  let fix = "The request was saved. To send email, configure Resend on the server and restart Next.js.";

  if (reason === "missing_resend_api_key") {
    fix = "Add RESEND_API_KEY to .env.local (or hosting env), restart the server, then try again.";
  } else if (reason === "missing_from_email") {
    fix =
      "Add BUDGET_CHECK_FROM_EMAIL (must be a verified sender/domain in Resend), restart the server, then try again.";
  } else if (reason === "missing_notify_to") {
    fix =
      "No recipient email for the notification. Set BUDGET_CHECK_NOTIFY_EMAIL or ensure your profile has an email.";
  } else if (reason === "resend_http_error") {
    const fromApi = firstResendMessage(email.detail);
    fix = fromApi
      ? `Resend error: ${fromApi}`
      : "Resend rejected the request. Check server logs for [budget-check-request] Resend error.";
  }

  return {
    type: "error",
    message: `Budget check saved, but no notification email was sent. ${fix}`,
  };
}
