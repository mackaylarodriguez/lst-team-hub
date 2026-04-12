/**
 * Budget check (printed check) workflow for staff/admin.
 *
 * Creates `staff_misc_tasks` for the finance assignee (personal task list) and
 * `trip_staff_tasks` so the request appears on the trip **Staff Tasks** tab.
 *
 * Env (optional):
 * - BUDGET_CHECK_NOTIFY_EMAIL — notification recipient (use during testing so finance isn’t flooded).
 * - BUDGET_CHECK_ASSIGNEE_EMAIL or DONNA_STAFF_EMAIL — optional override for the misc-task assignee (defaults to
 *   donna.tucker@lst.org so other “Donna” profiles are never picked by mistake).
 * - BUDGET_CHECK_ASSIGNEE_NAME — optional display name on the misc task (defaults to “Donna Tucker” for Donna’s email).
 * - BUDGET_CHECK_DUE_DAYS — days until misc-task due date (default 14 = two weeks).
 * - RESEND_API_KEY + BUDGET_CHECK_FROM_EMAIL — send notification email via Resend (both required for email).
 *
 * PATCH body: { id, action } — actions: mark_processed | update (amount, note; pending only) | delete.
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function getBearerToken(req) {
  const raw = normalizeText(req.headers.authorization);
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  return m ? m[1].trim() : "";
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

function isStaffOrAdminRole(role) {
  const r = normalizeText(role).toLowerCase();
  return r === "admin" || r === "staff";
}

function normalizeRole(role) {
  return role ? String(role).trim().toLowerCase() : "";
}

/**
 * Same resolution order as {@link lib/auth.js} getProfileForUser: some databases have a
 * profiles row keyed by email that does not share id with auth.users.id, so id-only lookup fails.
 */
function pickProfileRowForAuthUser(rows, authUserId) {
  const list = rows || [];
  if (list.length === 0) return null;

  const normalized = list.map((row) => ({
    ...row,
    email: normalizeEmail(row.email),
    role: normalizeRole(row.role),
  }));

  return (
    normalized.find((p) => p.id === authUserId) ||
    normalized.find((p) => p.role === "admin") ||
    normalized.find((p) => p.role === "staff") ||
    normalized[0]
  );
}

function getProfileDisplayName(profile) {
  if (!profile) return "";
  const fromParts = [profile.first_name, profile.last_name]
    .map((x) => normalizeText(x))
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromParts) return fromParts;
  return normalizeEmail(profile.email);
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
    return { error: { status: 403, message: "Signed-in user has no email; cannot load profile." } };
  }

  const { data: byEmailRows, error: byEmailErr } = await admin
    .from("profiles")
    .select("id, email, role, first_name, last_name")
    .ilike("email", email);

  if (byEmailErr) {
    console.error("[budget-check-request] profiles by email", byEmailErr);
    return { error: { status: 500, message: "Could not load profile." } };
  }

  let profile = pickProfileRowForAuthUser(byEmailRows, user.id);

  if (!profile) {
    const { data: byId, error: byIdErr } = await admin
      .from("profiles")
      .select("id, email, role, first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    if (byIdErr) {
      console.error("[budget-check-request] profiles by id", byIdErr);
      return { error: { status: 500, message: "Could not load profile." } };
    }
    profile = byId || null;
  }

  if (!profile?.id) {
    return {
      error: {
        status: 403,
        message:
          "No profile row for this login. In Supabase, ensure public.profiles has a row whose email matches your auth email (or id matches your user id).",
      },
    };
  }

  if (!isStaffOrAdminRole(profile.role)) {
    return { error: { status: 403, message: "Only staff or admin can use this." } };
  }

  return { admin, profile, user };
}

function addDaysIsoDate(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Printed-check tasks are always due two weeks out unless BUDGET_CHECK_DUE_DAYS overrides. */
const DEFAULT_BUDGET_CHECK_TASK_DUE_DAYS = 14;

/** Donna Tucker (accounting) — fixed default so first-name profile search never hits the wrong Donna. */
const DEFAULT_DONNA_BUDGET_CHECK_EMAIL = "donna.tucker@lst.org";
const DEFAULT_DONNA_BUDGET_CHECK_NAME = "Donna Tucker";

/**
 * Budget check requests assign a `staff_misc_tasks` row to Donna Tucker (Finance).
 * Order: BUDGET_CHECK_ASSIGNEE_EMAIL → DONNA_STAFF_EMAIL → donna.tucker@lst.org
 */
function resolveBudgetCheckTaskAssignee() {
  const defaultEmail = normalizeEmail(DEFAULT_DONNA_BUDGET_CHECK_EMAIL);
  const email =
    normalizeEmail(process.env.BUDGET_CHECK_ASSIGNEE_EMAIL) ||
    normalizeEmail(process.env.DONNA_STAFF_EMAIL) ||
    defaultEmail;

  const explicitName = normalizeText(process.env.BUDGET_CHECK_ASSIGNEE_NAME);
  if (explicitName) {
    return { email, name: explicitName };
  }

  if (email === defaultEmail) {
    return { email, name: DEFAULT_DONNA_BUDGET_CHECK_NAME };
  }

  return { email, name: "Donna" };
}

async function sendNotifyEmail({ to, subject, html }) {
  const key = normalizeText(process.env.RESEND_API_KEY);
  const from = normalizeText(process.env.BUDGET_CHECK_FROM_EMAIL);
  const toNorm = normalizeEmail(to);

  if (!key) {
    return { sent: false, reason: "missing_resend_api_key" };
  }
  if (!from) {
    return { sent: false, reason: "missing_from_email" };
  }
  if (!toNorm) {
    return { sent: false, reason: "missing_notify_to" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [toNorm],
      subject,
      html,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[budget-check-request] Resend error", res.status, json);
    return { sent: false, reason: "resend_http_error", detail: json };
  }
  return { sent: true, id: json?.id };
}

function buildBudgetCheckMiscTaskTitle(tripName, tripIdFallback, amountRequested) {
  const t = normalizeText(tripName) || "Trip";
  return `Print check — ${t} (${amountRequested})`;
}

/** Trip Staff Tasks tab reads `trip_staff_tasks`; id must stay stable per budget_check_requests row. */
function buildBudgetCheckTripStaffTaskId(tripId, budgetRequestId) {
  return `${tripId}-finance-budget-check-${budgetRequestId}`;
}

function assigneeDisplayFirstName(assigneeName) {
  const n = normalizeText(assigneeName);
  if (!n) return "Donna";
  return n.split(/\s+/)[0];
}

function buildBudgetCheckMiscTaskNotes({
  tripId,
  tripName,
  teamNameSnap,
  accountantSnap,
  budgetAmtSnap,
  amountRequested,
  note,
  requesterLine,
}) {
  const tn = normalizeText(tripName);
  return [
    `Trip: ${tn || tripId}`,
    teamNameSnap ? `Team name: ${teamNameSnap}` : null,
    accountantSnap ? `Team accountant: ${accountantSnap}` : null,
    budgetAmtSnap ? `Budget amount on file: ${budgetAmtSnap}` : null,
    `Check amount requested: ${amountRequested}`,
    note ? `Note from staff: ${note}` : null,
    requesterLine ? `Requested by: ${requesterLine}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    const auth = await authenticateStaffOrAdmin(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message });
    }

    const { admin, profile } = auth;
    const tripId = normalizeText(req.body?.tripId);
    const amountRequested = normalizeText(req.body?.amount);
    const note = normalizeText(req.body?.note);

    if (!tripId) {
      return res.status(400).json({ error: "tripId is required." });
    }
    if (!amountRequested) {
      return res.status(400).json({ error: "Amount is required." });
    }

    const { data: trip, error: tripErr } = await admin
      .from("trips")
      .select("id, trip_name")
      .eq("id", tripId)
      .maybeSingle();

    if (tripErr || !trip?.id) {
      return res.status(404).json({ error: "Trip not found." });
    }

    const { data: budget } = await admin
      .from("trip_budgets")
      .select("team_name, team_accountant, budget_amount")
      .eq("trip_id", tripId)
      .maybeSingle();

    const tripName = normalizeText(trip.trip_name);
    const teamNameSnap = normalizeText(budget?.team_name);
    const accountantSnap = normalizeText(budget?.team_accountant);
    const budgetAmtSnap =
      budget?.budget_amount === null || budget?.budget_amount === undefined
        ? ""
        : String(budget.budget_amount);

    const dueDaysRaw = process.env.BUDGET_CHECK_DUE_DAYS;
    const dueDaysParsed = dueDaysRaw === undefined || dueDaysRaw === "" ? DEFAULT_BUDGET_CHECK_TASK_DUE_DAYS : Number(dueDaysRaw);
    const safeDueDays =
      Number.isFinite(dueDaysParsed) && dueDaysParsed > 0 ? dueDaysParsed : DEFAULT_BUDGET_CHECK_TASK_DUE_DAYS;
    const dueDate = addDaysIsoDate(safeDueDays);

    const assignee = resolveBudgetCheckTaskAssignee();

    const requesterLine = getProfileDisplayName(profile) || profile.email || profile.id;
    const taskTitle = buildBudgetCheckMiscTaskTitle(tripName, tripId, amountRequested);
    const taskNotes = buildBudgetCheckMiscTaskNotes({
      tripId,
      tripName,
      teamNameSnap,
      accountantSnap,
      budgetAmtSnap,
      amountRequested,
      note,
      requesterLine,
    });

    const { data: taskRow, error: taskErr } = await admin
      .from("staff_misc_tasks")
      .insert({
        staff_email: assignee.email,
        staff_name: assignee.name || DEFAULT_DONNA_BUDGET_CHECK_NAME,
        work_area: "Finance",
        task_name: taskTitle,
        progress: "Not started",
        due_date: dueDate,
        notes: taskNotes,
      })
      .select("id")
      .single();

    if (taskErr) {
      console.error("[budget-check-request] staff_misc_tasks insert", taskErr);
      return res.status(500).json({ error: taskErr.message || "Could not create Donna’s staff task." });
    }
    const staffMiscTaskId = taskRow?.id || null;

    const insertPayload = {
      trip_id: tripId,
      trip_name_snapshot: tripName || null,
      team_name_snapshot: teamNameSnap || null,
      team_accountant_snapshot: accountantSnap || null,
      budget_amount_snapshot: budgetAmtSnap || null,
      amount_requested: amountRequested,
      note: note || null,
      status: "pending",
      requested_by_user_id: profile.id,
      requested_by_email: profile.email || null,
      requested_by_name: getProfileDisplayName(profile) || null,
      staff_misc_task_id: staffMiscTaskId,
    };

    const { data: row, error: insertErr } = await admin
      .from("budget_check_requests")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertErr) {
      if (staffMiscTaskId) {
        await admin.from("staff_misc_tasks").delete().eq("id", staffMiscTaskId);
      }
      console.error("[budget-check-requests] insert", insertErr);
      return res.status(500).json({ error: insertErr.message || "Could not save request." });
    }

    const tripStaffTaskId = buildBudgetCheckTripStaffTaskId(tripId, row.id);
    const { error: tripTaskErr } = await admin.from("trip_staff_tasks").insert({
      id: tripStaffTaskId,
      trip_id: tripId,
      work_area: "Finance",
      sequence: 1,
      task_name: taskTitle,
      assigned_to: assigneeDisplayFirstName(assignee.name),
      progress: "Not started",
      due_date: dueDate,
      notes: taskNotes,
    });

    if (tripTaskErr) {
      console.error("[budget-check-request] trip_staff_tasks insert", tripTaskErr);
      await admin.from("budget_check_requests").delete().eq("id", row.id);
      if (staffMiscTaskId) {
        await admin.from("staff_misc_tasks").delete().eq("id", staffMiscTaskId);
      }
      return res.status(500).json({
        error: tripTaskErr.message || "Could not add this request to the trip Staff Tasks list.",
      });
    }

    const notifyTo =
      normalizeEmail(process.env.BUDGET_CHECK_NOTIFY_EMAIL) ||
      assignee.email ||
      normalizeEmail(profile.email);
    const requesterLabel = getProfileDisplayName(profile) || profile.email || "Staff";
    const subject = `Budget check request — ${tripName || "Trip"} — ${amountRequested}`;
    const html = `
      <p><strong>${escapeHtml(requesterLabel)}</strong> requested a printed check.</p>
      <ul>
        <li><strong>Trip:</strong> ${escapeHtml(tripName || tripId)}</li>
        ${teamNameSnap ? `<li><strong>Team:</strong> ${escapeHtml(teamNameSnap)}</li>` : ""}
        ${accountantSnap ? `<li><strong>Accountant:</strong> ${escapeHtml(accountantSnap)}</li>` : ""}
        ${budgetAmtSnap ? `<li><strong>Budget on file:</strong> ${escapeHtml(budgetAmtSnap)}</li>` : ""}
        <li><strong>Check amount:</strong> ${escapeHtml(amountRequested)}</li>
        ${note ? `<li><strong>Note:</strong> ${escapeHtml(note)}</li>` : ""}
      </ul>
      <p>Request id: <code>${escapeHtml(row.id)}</code></p>
    `.trim();

    const emailResult = await sendNotifyEmail({ to: notifyTo, subject, html });
    if (!emailResult.sent) {
      console.warn("[budget-check-request] notification email not sent:", emailResult.reason, emailResult.detail || "");
    }

    return res.status(200).json({
      ok: true,
      request: row,
      email: emailResult,
    });
  }

  if (req.method === "PATCH") {
    const auth = await authenticateStaffOrAdmin(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message });
    }

    const { admin, profile } = auth;
    const id = normalizeText(req.body?.id);
    const action = normalizeText(req.body?.action).toLowerCase();

    if (!id) {
      return res.status(400).json({ error: "id is required." });
    }
    if (action === "update") {
      const amountRequested = normalizeText(req.body?.amount);
      const note = normalizeText(req.body?.note);

      if (!amountRequested) {
        return res.status(400).json({ error: "Amount is required." });
      }

      const { data: existing, error: loadErr } = await admin
        .from("budget_check_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (loadErr || !existing) {
        return res.status(404).json({ error: "Request not found." });
      }
      if (existing.status !== "pending") {
        return res.status(400).json({ error: "Only pending requests can be edited." });
      }

      const requesterLine =
        normalizeText(existing.requested_by_name) ||
        normalizeEmail(existing.requested_by_email) ||
        "—";

      const { data: updated, error: updErr } = await admin
        .from("budget_check_requests")
        .update({
          amount_requested: amountRequested,
          note: note || null,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (updErr) {
        console.error("[budget-check-request] patch update", updErr);
        return res.status(500).json({ error: updErr.message || "Could not update request." });
      }

      const nowIso = new Date().toISOString();
      const tripNameSnap = normalizeText(existing.trip_name_snapshot);
      const taskTitle = buildBudgetCheckMiscTaskTitle(
        tripNameSnap,
        existing.trip_id,
        amountRequested
      );
      const taskNotes = buildBudgetCheckMiscTaskNotes({
        tripId: existing.trip_id,
        tripName: tripNameSnap,
        teamNameSnap: normalizeText(existing.team_name_snapshot),
        accountantSnap: normalizeText(existing.team_accountant_snapshot),
        budgetAmtSnap: normalizeText(existing.budget_amount_snapshot),
        amountRequested,
        note,
        requesterLine,
      });

      if (existing.staff_misc_task_id) {
        const { error: taskUpdErr } = await admin
          .from("staff_misc_tasks")
          .update({
            task_name: taskTitle,
            notes: taskNotes,
            updated_at: nowIso,
          })
          .eq("id", existing.staff_misc_task_id);

        if (taskUpdErr) {
          console.error("[budget-check-request] misc task sync on update", taskUpdErr);
        }
      }

      const tripStaffTaskId = buildBudgetCheckTripStaffTaskId(existing.trip_id, existing.id);
      const { error: tripSyncErr } = await admin
        .from("trip_staff_tasks")
        .update({
          task_name: taskTitle,
          notes: taskNotes,
          updated_at: nowIso,
        })
        .eq("id", tripStaffTaskId);
      if (tripSyncErr) {
        console.error("[budget-check-request] trip staff task sync on update", tripSyncErr);
      }

      return res.status(200).json({ ok: true, request: updated });
    }

    if (action === "delete") {
      const { data: existing, error: loadErr } = await admin
        .from("budget_check_requests")
        .select("id, trip_id, staff_misc_task_id")
        .eq("id", id)
        .maybeSingle();

      if (loadErr || !existing) {
        return res.status(404).json({ error: "Request not found." });
      }

      const tripStaffTaskId = buildBudgetCheckTripStaffTaskId(existing.trip_id, existing.id);
      const { error: delTripTaskErr } = await admin.from("trip_staff_tasks").delete().eq("id", tripStaffTaskId);
      if (delTripTaskErr) {
        console.error("[budget-check-request] delete trip staff task", delTripTaskErr);
        return res.status(500).json({ error: delTripTaskErr.message || "Could not remove trip staff task." });
      }

      if (existing.staff_misc_task_id) {
        const { error: delTaskErr } = await admin
          .from("staff_misc_tasks")
          .delete()
          .eq("id", existing.staff_misc_task_id);
        if (delTaskErr) {
          console.error("[budget-check-request] delete misc task", delTaskErr);
          return res.status(500).json({ error: delTaskErr.message || "Could not remove linked task." });
        }
      }

      const { error: delErr } = await admin.from("budget_check_requests").delete().eq("id", id);

      if (delErr) {
        console.error("[budget-check-request] delete request", delErr);
        return res.status(500).json({ error: delErr.message || "Could not delete request." });
      }

      return res.status(200).json({ ok: true, deletedId: id });
    }

    if (action !== "mark_processed") {
      return res.status(400).json({ error: "Unsupported action." });
    }

    const { data: existing, error: loadErr } = await admin
      .from("budget_check_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (loadErr || !existing) {
      return res.status(404).json({ error: "Request not found." });
    }
    if (existing.status === "processed") {
      return res.status(200).json({ ok: true, request: existing, alreadyProcessed: true });
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updErr } = await admin
      .from("budget_check_requests")
      .update({
        status: "processed",
        processed_at: nowIso,
        processed_by_user_id: profile.id,
        processed_by_email: profile.email || null,
        processed_by_name: getProfileDisplayName(profile) || null,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updErr) {
      console.error("[budget-check-request] patch", updErr);
      return res.status(500).json({ error: updErr.message || "Could not update request." });
    }

    if (existing.staff_misc_task_id) {
      await admin
        .from("staff_misc_tasks")
        .update({ progress: "Complete", updated_at: nowIso })
        .eq("id", existing.staff_misc_task_id);
    }

    const tripStaffTaskIdDone = buildBudgetCheckTripStaffTaskId(existing.trip_id, existing.id);
    await admin
      .from("trip_staff_tasks")
      .update({ progress: "Complete", updated_at: nowIso })
      .eq("id", tripStaffTaskIdDone);

    return res.status(200).json({ ok: true, request: updated });
  }

  res.setHeader("Allow", "POST, PATCH");
  return res.status(405).json({ error: "Method not allowed." });
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
