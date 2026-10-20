/**
 * Admin view of another person's My Tasks.
 * staff_misc_tasks RLS only returns the signed-in user's rows, so impersonation
 * cannot see recruiting contact tasks assigned to someone else.
 */
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const PROGRESS_OPTIONS = new Set(["Not started", "In progress", "Waiting", "Complete"]);

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

function normalizeProgress(value) {
  const raw = normalizeText(value);
  return PROGRESS_OPTIONS.has(raw) ? raw : "Not started";
}

function normalizeDueDate(value) {
  const raw = normalizeText(value);
  if (!raw) return null;
  const ymd = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return ymd;
}

async function authenticateAdmin(req) {
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
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, email, role")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (profileErr) {
    console.error("[staff-misc-tasks] profile lookup", profileErr);
    return { error: { status: 500, message: "Could not load profile." } };
  }
  if (normalizeText(profile?.role).toLowerCase() !== "admin") {
    return { error: { status: 403, message: "Only admins can view another person's tasks." } };
  }

  return { admin };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const auth = await authenticateAdmin(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message });
    }

    const staffEmail = normalizeEmail(req.body?.staffEmail);
    if (!staffEmail) {
      return res.status(400).json({ error: "Choose whose tasks to open." });
    }

    const action = normalizeText(req.body?.action) || "list";

    if (action === "list") {
      const { data, error } = await auth.admin
        .from("staff_misc_tasks")
        .select("*")
        .ilike("staff_email", staffEmail)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[staff-misc-tasks] list", error);
        return res.status(500).json({ error: error.message || "Unable to load tasks." });
      }

      return res.status(200).json({ tasks: data || [] });
    }

    if (action === "save") {
      const task = req.body?.task || {};
      const taskId = normalizeText(task.id);
      const payload = {
        staff_email: staffEmail,
        staff_name: normalizeText(task.staffName) || staffEmail,
        work_area: normalizeText(task.workArea) || "Personal Task",
        task_name: normalizeText(task.taskName || task.title).slice(0, 240) || "Untitled task",
        progress: normalizeProgress(task.progress),
        due_date: normalizeDueDate(task.dueDate),
        notes: normalizeText(task.notes).slice(0, 4000) || null,
        updated_at: new Date().toISOString(),
      };

      if (taskId) {
        const { data: existing, error: existingError } = await auth.admin
          .from("staff_misc_tasks")
          .select("id, staff_email")
          .eq("id", taskId)
          .maybeSingle();

        if (existingError) {
          console.error("[staff-misc-tasks] save lookup", existingError);
          return res.status(500).json({ error: "Could not load that task." });
        }
        if (!existing?.id || normalizeEmail(existing.staff_email) !== staffEmail) {
          return res.status(404).json({ error: "That task is not on this person's list." });
        }

        const { data, error } = await auth.admin
          .from("staff_misc_tasks")
          .update(payload)
          .eq("id", taskId)
          .select("*")
          .single();

        if (error) {
          console.error("[staff-misc-tasks] update", error);
          return res.status(500).json({ error: error.message || "Unable to save task." });
        }
        return res.status(200).json({ task: data });
      }

      const { data, error } = await auth.admin
        .from("staff_misc_tasks")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        console.error("[staff-misc-tasks] insert", error);
        return res.status(500).json({ error: error.message || "Unable to save task." });
      }
      return res.status(200).json({ task: data });
    }

    if (action === "delete") {
      const taskId = normalizeText(req.body?.taskId);
      if (!taskId) {
        return res.status(400).json({ error: "Task is required." });
      }

      const { data: existing, error: existingError } = await auth.admin
        .from("staff_misc_tasks")
        .select("id, staff_email")
        .eq("id", taskId)
        .maybeSingle();

      if (existingError) {
        console.error("[staff-misc-tasks] delete lookup", existingError);
        return res.status(500).json({ error: "Could not load that task." });
      }
      if (!existing?.id || normalizeEmail(existing.staff_email) !== staffEmail) {
        return res.status(404).json({ error: "That task is not on this person's list." });
      }

      const { error } = await auth.admin.from("staff_misc_tasks").delete().eq("id", taskId);
      if (error) {
        console.error("[staff-misc-tasks] delete", error);
        return res.status(500).json({ error: error.message || "Unable to delete task." });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action." });
  } catch (error) {
    console.error("[staff-misc-tasks]", error);
    return res.status(500).json({ error: error.message || "Unable to load tasks." });
  }
}
