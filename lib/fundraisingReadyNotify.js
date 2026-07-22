import { supabase } from "@/lib/supabase";

async function getAccessTokenForApi() {
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new Error("Not signed in.");
  }
  return token;
}

export function hasFundraisingLinkAndAmount({ fundraisingUrl, fundraisingGoalAmount }) {
  const url = String(fundraisingUrl || "").trim();
  if (!url) return false;
  if (fundraisingGoalAmount === null || fundraisingGoalAmount === undefined || fundraisingGoalAmount === "") {
    return false;
  }
  const parsed = Number(String(fundraisingGoalAmount).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0;
}

/**
 * Notify a worker that their Neon fundraising page + goal are ready.
 * Fire-and-forget safe: callers may ignore failures so save still succeeds.
 */
export async function sendFundraisingReadyNotify({ tripId, memberId }) {
  const token = await getAccessTokenForApi();
  const res = await fetch("/api/fundraising-ready-notify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tripId, memberId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Could not send fundraising ready email.");
  }
  return json;
}
