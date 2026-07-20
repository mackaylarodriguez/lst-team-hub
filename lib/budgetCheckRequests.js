import { supabase } from "@/lib/supabase";

const SELECT_FIELDS = [
  "id",
  "trip_id",
  "trip_name_snapshot",
  "team_name_snapshot",
  "site_snapshot",
  "team_accountant_snapshot",
  "budget_amount_snapshot",
  "amount_requested",
  "note",
  "donna_notes",
  "status",
  "requested_by_email",
  "requested_by_name",
  "created_at",
  "processed_at",
  "processed_by_email",
  "processed_by_name",
  "staff_misc_task_id",
].join(", ");

const SELECT_FIELDS_LEGACY = [
  "id",
  "trip_id",
  "trip_name_snapshot",
  "team_name_snapshot",
  "team_accountant_snapshot",
  "budget_amount_snapshot",
  "amount_requested",
  "note",
  "status",
  "requested_by_email",
  "requested_by_name",
  "created_at",
  "processed_at",
  "processed_by_email",
  "processed_by_name",
  "staff_misc_task_id",
].join(", ");

function isMissingBudgetCheckColumnError(error, columnName) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  const column = String(columnName || "").toLowerCase();
  return (
    message.includes(column) &&
    (message.includes("does not exist") || message.includes("schema cache") || error?.code === "42703")
  );
}

function isMissingBudgetCheckTableError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    (error?.code === "42P01" || error?.code === "PGRST205" || error?.code === "PGRST204") &&
    message.includes("budget_check_requests")
  );
}

export function normalizeBudgetCheckRequestRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tripId: row.trip_id,
    tripNameSnapshot: row.trip_name_snapshot ?? "",
    teamNameSnapshot: row.team_name_snapshot ?? "",
    siteSnapshot: row.site_snapshot ?? "",
    teamAccountantSnapshot: row.team_accountant_snapshot ?? "",
    budgetAmountSnapshot: row.budget_amount_snapshot ?? "",
    amountRequested: row.amount_requested ?? "",
    note: row.note ?? "",
    donnaNotes: row.donna_notes ?? "",
    status: row.status ?? "pending",
    requestedByEmail: row.requested_by_email ?? "",
    requestedByName: row.requested_by_name ?? "",
    createdAt: row.created_at ?? "",
    processedAt: row.processed_at ?? "",
    processedByEmail: row.processed_by_email ?? "",
    processedByName: row.processed_by_name ?? "",
    staffMiscTaskId: row.staff_misc_task_id ?? null,
  };
}

export async function listBudgetCheckRequests() {
  let { data, error } = await supabase
    .from("budget_check_requests")
    .select(SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (error && (isMissingBudgetCheckColumnError(error, "site_snapshot") || isMissingBudgetCheckColumnError(error, "donna_notes"))) {
    ({ data, error } = await supabase
      .from("budget_check_requests")
      .select(SELECT_FIELDS_LEGACY)
      .order("created_at", { ascending: false }));
  }

  if (error) {
    if (isMissingBudgetCheckTableError(error)) {
      return [];
    }
    throw error;
  }

  return (data || []).map(normalizeBudgetCheckRequestRow);
}

/** Requests for one trip (Materials tab status); staff/admin RLS applies. */
export async function listBudgetCheckRequestsForTrip(tripId) {
  if (!String(tripId || "").trim()) return [];

  const { data, error } = await supabase
    .from("budget_check_requests")
    .select(SELECT_FIELDS)
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error && (isMissingBudgetCheckColumnError(error, "site_snapshot") || isMissingBudgetCheckColumnError(error, "donna_notes"))) {
    const legacy = await supabase
      .from("budget_check_requests")
      .select(SELECT_FIELDS_LEGACY)
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });
    if (legacy.error) {
      if (isMissingBudgetCheckTableError(legacy.error)) {
        return [];
      }
      throw legacy.error;
    }
    return (legacy.data || []).map(normalizeBudgetCheckRequestRow);
  }

  if (error) {
    if (isMissingBudgetCheckTableError(error)) {
      return [];
    }
    throw error;
  }

  return (data || []).map(normalizeBudgetCheckRequestRow);
}

async function getAccessTokenForApi() {
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new Error("Not signed in.");
  }
  return token;
}

export async function submitBudgetCheckRequest({ tripId, amount, note }) {
  const token = await getAccessTokenForApi();
  const res = await fetch("/api/budget-check-request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      tripId,
      amount: String(amount || "").trim(),
      note: String(note || "").trim(),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Could not submit budget check request.");
  }
  return json;
}

export async function markBudgetCheckRequestProcessed(id) {
  const token = await getAccessTokenForApi();
  const res = await fetch("/api/budget-check-request", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id, action: "mark_processed" }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Could not mark request processed.");
  }
  return json;
}

export async function markBudgetCheckRequestPending(id) {
  const token = await getAccessTokenForApi();
  const res = await fetch("/api/budget-check-request", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id, action: "mark_pending" }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Could not move request back to pending.");
  }
  return json;
}

export async function updateBudgetCheckRequest({ id, amount, note }) {
  const token = await getAccessTokenForApi();
  const res = await fetch("/api/budget-check-request", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id,
      action: "update",
      amount: String(amount || "").trim(),
      note: String(note || "").trim(),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Could not update request.");
  }
  return json;
}

export async function updateBudgetCheckDonnaNotes({ id, donnaNotes }) {
  const token = await getAccessTokenForApi();
  const res = await fetch("/api/budget-check-request", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id,
      action: "update_donna_notes",
      donnaNotes: String(donnaNotes ?? "").trim(),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Could not save Donna notes.");
  }
  return json;
}

export async function deleteBudgetCheckRequest(id) {
  const token = await getAccessTokenForApi();
  const res = await fetch("/api/budget-check-request", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id, action: "delete" }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Could not delete request.");
  }
  return json;
}
