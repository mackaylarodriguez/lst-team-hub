/**
 * Create a recruiting "Contact …" personal task for a staff member.
 * staff_misc_tasks RLS only allows inserting your own row, so assignment uses the server key
 * after confirming the caller and the assignee are staff or admin.
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
  const match = /^Bearer\s+(.+)$/i.exec(raw);
  return match ? match[1].trim() : "";
}

function isStaffOrAdminRole(role) {
  const normalized = normalizeText(role).toLowerCase();
  return normalized === "admin" || normalized === "staff";
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

function profileDisplayName(profile, fallbackEmail) {
  const fromParts = [profile?.first_name, profile?.last_name]
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .join(" ")
    .trim();
  return fromParts || normalizeEmail(fallbackEmail);
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
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, email, role, first_name, last_name")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (profileErr) {
    console.error("[recruiting-contact-task] profile lookup", profileErr);
    return { error: { status: 500, message: "Could not load profile." } };
  }
  if (!profile?.id || !isStaffOrAdminRole(profile.role)) {
    return { error: { status: 403, message: "Only staff can assign a contact task." } };
  }

  return { admin, profile };
}

function normalizeDueDate(value) {
  const raw = normalizeText(value);
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const auth = await authenticateStaffOrAdmin(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message });
    }

    const assigneeEmail = normalizeEmail(req.body?.assigneeEmail);
    const taskName = normalizeText(req.body?.taskName).slice(0, 240);
    const notes = normalizeText(req.body?.notes).slice(0, 4000);
    const dueDate = normalizeDueDate(req.body?.dueDate);
    if (!assigneeEmail) {
      return res.status(400).json({ error: "Choose who should get this contact task." });
    }
    if (!taskName) {
      return res.status(400).json({ error: "Task name is required." });
    }

    const { data: assignee, error: assigneeErr } = await auth.admin
      .from("profiles")
      .select("id, email, role, first_name, last_name")
      .ilike("email", assigneeEmail)
      .limit(1)
      .maybeSingle();

    if (assigneeErr) {
      console.error("[recruiting-contact-task] assignee lookup", assigneeErr);
      return res.status(500).json({ error: "Could not look up that staff member." });
    }
    if (!assignee?.id || !isStaffOrAdminRole(assignee.role)) {
      return res.status(400).json({ error: "That person is not a staff member." });
    }

    const staffName =
      profileDisplayName(assignee, assignee.email) ||
      normalizeText(req.body?.assigneeName) ||
      assigneeEmail;

    const { data, error } = await auth.admin
      .from("staff_misc_tasks")
      .insert({
        staff_email: normalizeEmail(assignee.email),
        staff_name: staffName,
        work_area: "Recruiting",
        task_name: taskName,
        progress: "Not started",
        due_date: dueDate,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[recruiting-contact-task] insert", error);
      return res.status(500).json({ error: error.message || "Unable to assign contact task." });
    }

    return res.status(200).json({ ok: true, id: data?.id || "" });
  } catch (error) {
    console.error("[recruiting-contact-task]", error);
    return res.status(500).json({ error: error.message || "Unable to assign contact task." });
  }
}
