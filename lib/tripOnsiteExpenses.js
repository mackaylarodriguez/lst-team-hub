import { supabase } from "@/lib/supabase";

function n(val) {
  return val === null || val === undefined ? "" : String(val).trim();
}

function isMissingTripOnsiteExpensesTableError(error) {
  const msg = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  if (error?.code === "42P01" && msg.includes("trip_onsite_expenses")) return true;
  if (error?.code === "PGRST205" && msg.includes("trip_onsite_expenses")) return true;
  return (
    msg.includes("trip_onsite_expenses") &&
    (msg.includes("does not exist") ||
      msg.includes("schema cache") ||
      msg.includes("not find the table"))
  );
}

function normalize(row, tripName = "") {
  if (!row) return null;
  return {
    id: row.id,
    tripId: row.trip_id,
    tripName: tripName || n(row.trips?.trip_name),
    description: n(row.description),
    amount: n(row.amount),
    notes: n(row.notes),
  };
}

export async function listAllTripOnsiteExpenses() {
  const { data, error } = await supabase
    .from("trip_onsite_expenses")
    .select("*, trips(trip_name)")
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTripOnsiteExpensesTableError(error)) {
      return { rows: [], missingTable: true };
    }
    console.error("Error loading trip onsite expenses", error);
    throw error;
  }

  return {
    rows: (data || []).map((row) => normalize(row, String(row.trips?.trip_name || "").trim())),
    missingTable: false,
  };
}

export async function saveTripOnsiteExpense(expense) {
  const payload = {
    trip_id: expense.tripId,
    description: n(expense.description) || null,
    amount: n(expense.amount) || null,
    notes: n(expense.notes) || null,
    updated_at: new Date().toISOString(),
  };

  if (expense.id) {
    const { data, error } = await supabase
      .from("trip_onsite_expenses")
      .update(payload)
      .eq("id", expense.id)
      .select("*")
      .single();
    if (error) throw error;
    return normalize(data);
  }

  const { data, error } = await supabase
    .from("trip_onsite_expenses")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function deleteTripOnsiteExpense(id) {
  const { error } = await supabase.from("trip_onsite_expenses").delete().eq("id", id);
  if (error) throw error;
}
