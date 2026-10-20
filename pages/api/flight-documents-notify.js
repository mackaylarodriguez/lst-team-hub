/**
 * Email the worker labeled on a Trip Documents upload when the category is Flights.
 * CCs Leslee Altrock.
 *
 * Live sends require FLIGHT_DOCUMENTS_EMAILS_ENABLED=true.
 * Until then this endpoint records nothing and does not email anyone.
 * Use Admin Activity → Test flight email to preview the message.
 *
 * Env:
 * - RESEND_API_KEY + BUDGET_CHECK_FROM_EMAIL (or RESEND_FROM_EMAIL)
 * - FLIGHT_DOCUMENTS_EMAILS_ENABLED=true to turn live sends on
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { sendResendEmail } from "@/lib/resendMail";
import {
  FLIGHT_DOCUMENTS_CC_EMAIL,
  buildFlightDocumentsEmailHtml,
  buildFlightDocumentsEmailSubject,
  flightDocumentsEmailsEnabled,
  isFlightsDocumentCategory,
  parseTripDocumentWorkerName,
  resolveFlightDocumentRecipient,
} from "@/lib/flightDocumentsEmail";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function getBearerToken(req) {
  const raw = normalizeText(req.headers.authorization);
  const match = /^Bearer\s+(.+)$/i.exec(raw);
  return match ? match[1].trim() : "";
}

function getPublicSupabaseForAuth() {
  const supabaseUrl = normalizeText(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = normalizeText(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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

function isStaffOrAdminRole(role) {
  const normalized = normalizeText(role).toLowerCase();
  return normalized === "admin" || normalized === "staff";
}

async function authenticateStaffOrAdmin(req) {
  const jwt = getBearerToken(req);
  if (!jwt) {
    return { error: { status: 401, message: "Missing Authorization bearer token." } };
  }

  const supabaseAuth = getPublicSupabaseForAuth();
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(jwt);
  const user = userData?.user;
  if (userErr || !user?.id) {
    return { error: { status: 401, message: "Invalid or expired session." } };
  }

  const admin = getSupabaseAdminClient();
  const email = normalizeEmail(user.email);
  if (!email) {
    return { error: { status: 403, message: "Signed-in user has no email." } };
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, email, role")
    .ilike("email", email)
    .maybeSingle();

  if (profileErr) {
    console.error("[flight-documents-notify] profiles", profileErr);
    return { error: { status: 500, message: "Could not load profile." } };
  }

  if (!profile?.id || !isStaffOrAdminRole(profile.role)) {
    return { error: { status: 403, message: "Only staff or admin can send flight document emails." } };
  }

  return { profile, user };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const auth = await authenticateStaffOrAdmin(req);
  if (auth.error) {
    return res.status(auth.error.status).json({ error: auth.error.message });
  }

  const tripId = normalizeText(req.body?.tripId);
  const resourceId = normalizeText(req.body?.resourceId);
  if (!tripId) {
    return res.status(400).json({ error: "tripId is required." });
  }
  if (!resourceId) {
    return res.status(400).json({ error: "resourceId is required." });
  }

  const live = flightDocumentsEmailsEnabled();
  if (!live) {
    return res.status(200).json({
      ok: true,
      sent: false,
      skipped: true,
      live: false,
      reason: "Flight document emails are not live yet.",
    });
  }

  try {
    const admin = getSupabaseAdminClient();
    const resourceSelect =
      "id, trip_id, category, work_area, link, pdf_url, visible_to_participants";
    let { data: resource, error: resourceError } = await admin
      .from("trip_resources")
      .select(resourceSelect)
      .eq("id", resourceId)
      .maybeSingle();

    const resourceErrorMessage = String(resourceError?.message || "").toLowerCase();
    if (
      resourceError &&
      resourceErrorMessage.includes("visible_to_participants") &&
      (resourceError.code === "PGRST204" || resourceError.code === "42703")
    ) {
      ({ data: resource, error: resourceError } = await admin
        .from("trip_resources")
        .select("id, trip_id, category, work_area, link, pdf_url")
        .eq("id", resourceId)
        .maybeSingle());
    }

    if (resourceError) throw resourceError;
    if (!resource || normalizeText(resource.trip_id) !== tripId) {
      return res.status(404).json({ error: "Trip document not found." });
    }

    if (!isFlightsDocumentCategory(resource.category)) {
      return res.status(200).json({
        ok: true,
        sent: false,
        skipped: true,
        live: true,
        reason: "Document category is not Flights.",
      });
    }

    if (resource.visible_to_participants === false) {
      return res.status(200).json({
        ok: true,
        sent: false,
        skipped: true,
        live: true,
        reason: "Document is hidden from participants.",
      });
    }

    const hasContent = Boolean(normalizeText(resource.link) || normalizeText(resource.pdf_url));
    if (!hasContent) {
      return res.status(200).json({
        ok: true,
        sent: false,
        skipped: true,
        live: true,
        reason: "Flight document has no file or link yet.",
      });
    }

    const workerName = parseTripDocumentWorkerName(resource.work_area);
    if (!workerName) {
      return res.status(200).json({
        ok: true,
        sent: false,
        skipped: true,
        live: true,
        reason: "Add a worker label on the flight document so we know who to email.",
      });
    }

    const recipient = await resolveFlightDocumentRecipient(admin, tripId, workerName);
    if (!recipient?.email) {
      return res.status(200).json({
        ok: true,
        sent: false,
        skipped: true,
        live: true,
        workerName,
        reason: `No email found for worker label "${workerName}".`,
      });
    }

    const baseUrl = getBaseUrl(req);
    const tripDocumentsUrl = baseUrl
      ? `${baseUrl}/trips/${encodeURIComponent(tripId)}?tab=trip-documents`
      : "";
    const subject = buildFlightDocumentsEmailSubject();
    const html = buildFlightDocumentsEmailHtml({
      recipientName: workerName,
      tripDocumentsUrl,
    });

    const emailResult = await sendResendEmail({
      to: recipient.email,
      cc: FLIGHT_DOCUMENTS_CC_EMAIL,
      subject,
      html,
    });

    if (!emailResult.sent) {
      console.error("[flight-documents-notify] send failed", emailResult);
      return res.status(500).json({
        error: "Flight document email was not sent.",
        reason: emailResult.reason,
        detail: emailResult.detail || null,
      });
    }

    return res.status(200).json({
      ok: true,
      sent: true,
      live: true,
      sentTo: recipient.email,
      cc: FLIGHT_DOCUMENTS_CC_EMAIL,
      workerName,
      email: emailResult,
    });
  } catch (error) {
    console.error("[flight-documents-notify]", error);
    return res.status(500).json({
      error: error?.message || "Unable to send flight document email.",
    });
  }
}
