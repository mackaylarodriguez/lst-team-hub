/**
 * Vercel Cron: Monday 7am Central weekly emails.
 * Staff get their task digest. Workers get meetings, training, tasks, and fundraising.
 *
 * Vercel crons run in UTC, so vercel.json schedules this at both 12:00 and 13:00 UTC on Mondays
 * and only the run that lands in the 7am Central hour sends (CDT = UTC-5, CST = UTC-6).
 *
 * Auth: Vercel sends `Authorization: Bearer ${CRON_SECRET}`.
 * Query: `force=1` skips the Monday/7am check, `dryRun=1` reports without sending.
 */

import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  getCentralClock,
  sendWeeklyTaskDigests,
  WEEKLY_TASK_DIGEST_SEND_HOUR,
} from "@/lib/weeklyTaskDigest";
import { sendWeeklyWorkerDigests } from "@/lib/weeklyWorkerDigest";

function normalizeText(value) {
  return String(value || "").trim();
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

function isFlagSet(value) {
  return ["1", "true", "yes"].includes(normalizeText(value).toLowerCase());
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const secret = normalizeText(process.env.CRON_SECRET);
  if (!secret) {
    return res.status(500).json({ error: "CRON_SECRET is not configured." });
  }
  if (normalizeText(req.headers.authorization) !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const force = isFlagSet(req.query.force);
  const dryRun = isFlagSet(req.query.dryRun);
  const clock = getCentralClock();

  if (!force && (clock.weekday !== "Mon" || clock.hour !== WEEKLY_TASK_DIGEST_SEND_HOUR)) {
    return res.status(200).json({
      ok: true,
      skipped: "not_monday_7am_central",
      central: clock,
    });
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (error) {
    console.error("[weekly-task-digest]", error);
    return res.status(500).json({ error: error?.message || "Weekly digest failed." });
  }
  const baseUrl = getBaseUrl(req);
  let staffOutcome = null;
  let staffError = null;
  let workerOutcome = null;
  let workerError = null;

  try {
    staffOutcome = await sendWeeklyTaskDigests(admin, { baseUrl, dryRun });
    console.log("[weekly-task-digest]", JSON.stringify(staffOutcome));
  } catch (error) {
    staffError = error?.message || "Weekly task digest failed.";
    console.error("[weekly-task-digest]", error);
  }

  try {
    workerOutcome = await sendWeeklyWorkerDigests(admin, { baseUrl, dryRun });
    console.log("[weekly-worker-digest]", JSON.stringify(workerOutcome));
  } catch (error) {
    workerError = error?.message || "Weekly worker digest failed.";
    console.error("[weekly-worker-digest]", error);
  }

  const ok = !staffError && !workerError;
  return res.status(ok ? 200 : 500).json({
    ok,
    dryRun,
    ...(staffOutcome || {}),
    staffError,
    workers: workerOutcome,
    workerError,
  });
}
