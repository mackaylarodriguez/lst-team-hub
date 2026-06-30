import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function listAuthEmails() {
  const admin = getSupabaseAdminClient();
  const emails = new Set();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    for (const user of data?.users || []) {
      const email = normalizeEmail(user?.email);
      if (email) emails.add(email);
    }

    if (!data?.users?.length || data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return emails;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const emails = [...new Set((req.body?.emails || []).map(normalizeEmail).filter(Boolean))];
  if (!emails.length) {
    return res.status(200).json({ invited: [] });
  }

  try {
    const authEmails = await listAuthEmails();
    const invited = emails.filter((email) => authEmails.has(email));
    return res.status(200).json({ invited });
  } catch (error) {
    console.error("[worker-invite-status]", error);
    return res.status(500).json({
      error: error?.message || "Unable to load invite status.",
    });
  }
}
