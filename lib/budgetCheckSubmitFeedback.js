/**
 * Maps POST /api/budget-check-request JSON (including `email`) to UI toast copy.
 * Notification email is optional: missing Resend/from/recipient is treated as success (request saved).
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
const EMAIL_SKIPPED_SUCCESS_REASONS = new Set([
  "missing_resend_api_key",
  "missing_from_email",
  "missing_notify_to",
]);

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
  if (EMAIL_SKIPPED_SUCCESS_REASONS.has(reason)) {
    return { type: "success", message: "Budget check requested." };
  }

  if (reason === "resend_http_error") {
    const fromApi = firstResendMessage(email.detail);
    const fix = fromApi
      ? `Resend error: ${fromApi}`
      : "Resend rejected the request. Check server logs for [budget-check-request] Resend error.";
    return {
      type: "error",
      message: `Budget check saved, but the notification email failed. ${fix}`,
    };
  }

  return { type: "success", message: "Budget check requested." };
}
