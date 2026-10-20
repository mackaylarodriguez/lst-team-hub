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

/**
 * Tell the labeled worker their flight document is in The Hub.
 * Live sending stays off until FLIGHT_DOCUMENTS_EMAILS_ENABLED=true.
 * Callers can ignore a skipped result; a thrown error means the request failed.
 */
export async function sendFlightDocumentsNotify({ tripId, resourceId }) {
  const token = await getAccessTokenForApi();
  const res = await fetch("/api/flight-documents-notify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tripId, resourceId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Could not send flight documents email.");
  }
  return json;
}
