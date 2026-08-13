import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { ROLE_WORKER } from "@/lib/roles";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRole(role) {
  return role ? String(role).trim().toLowerCase() : null;
}

/** Auth user has finished signup / accepted invite (not merely invite-created). */
function isAuthAccountRegistered(user) {
  if (!user) return false;
  if (user.last_sign_in_at) return true;

  const confirmedAt = user.email_confirmed_at;
  if (!confirmedAt) return false;

  // Self-signup (never invited)
  if (!user.invited_at) return true;

  // Invite accepted: confirmation happens at or after invite
  const confirmedMs = new Date(confirmedAt).getTime();
  const invitedMs = new Date(user.invited_at).getTime();
  if (Number.isNaN(confirmedMs) || Number.isNaN(invitedMs)) return true;
  return confirmedMs >= invitedMs;
}

async function listAuthUsersByEmail() {
  const admin = getSupabaseAdminClient();
  const byEmail = new Map();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    for (const user of data?.users || []) {
      const email = normalizeEmail(user?.email);
      if (email) byEmail.set(email, user);
    }

    if (!data?.users?.length || data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return byEmail;
}

async function listProfileEmailsWithAccount(emails) {
  const admin = getSupabaseAdminClient();
  const registered = new Set();
  if (!emails.length) return registered;

  // Query in chunks — PostgREST `or` filters get long with many emails.
  const chunkSize = 40;
  for (let i = 0; i < emails.length; i += chunkSize) {
    const chunk = emails.slice(i, i + chunkSize);
    const orFilter = chunk.map((email) => `email.ilike.${email}`).join(",");
    const { data, error } = await admin.from("profiles").select("email, role").or(orFilter);

    if (error) {
      throw error;
    }

    for (const row of data || []) {
      const email = normalizeEmail(row?.email);
      const role = normalizeRole(row?.role);
      if (role === ROLE_WORKER || !role) {
        registered.add(email);
      }
    }
  }

  return registered;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const emails = [...new Set((req.body?.emails || []).map(normalizeEmail).filter(Boolean))];
  if (!emails.length) {
    return res.status(200).json({ invited: [], registered: [] });
  }

  try {
    const [authByEmail, profileRegistered] = await Promise.all([
      listAuthUsersByEmail(),
      listProfileEmailsWithAccount(emails),
    ]);

    const invited = [];
    const registered = [];

    for (const email of emails) {
      if (profileRegistered.has(email)) {
        registered.push(email);
        continue;
      }

      const authUser = authByEmail.get(email);
      if (!authUser) continue;

      if (isAuthAccountRegistered(authUser)) {
        registered.push(email);
      } else {
        invited.push(email);
      }
    }

    return res.status(200).json({ invited, registered });
  } catch (error) {
    console.error("[worker-invite-status]", error);
    return res.status(500).json({
      error: error?.message || "Unable to load invite status.",
    });
  }
}
