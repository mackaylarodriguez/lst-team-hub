import { supabase } from "@/lib/supabase";

function n(val) {
  return val === null || val === undefined ? "" : String(val).trim();
}

export async function getTripBudget(tripId) {
  const { data, error } = await supabase
    .from("trip_budgets")
    .select("*")
    .eq("trip_id", tripId)
    .maybeSingle();

  if (error) {
    console.error("Error loading trip budget", error);
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    tripId: data.trip_id,
    teamName: n(data.team_name),
    projectStartDate: data.project_start_date || "",
    projectEndDate: data.project_end_date || "",
    siteCountry: n(data.site_country),
    siteCity: n(data.site_city),
    teamAccountant: n(data.team_accountant),
    budgetAmount: n(data.budget_amount),
    returnedAmount: n(data.returned_amount),
    housingAmount: n(data.housing_amount),
    notes: n(data.notes),
    numWorkers: data.num_workers ?? null,
    tshirts: n(data.tshirts),
    workbooks: n(data.workbooks),
  };
}

export async function saveTripBudget(tripId, values) {
  const payload = {
    trip_id: tripId,
    team_name: values.teamName || null,
    project_start_date: values.projectStartDate || null,
    project_end_date: values.projectEndDate || null,
    site_country: values.siteCountry || null,
    site_city: values.siteCity || null,
    team_accountant: values.teamAccountant || null,
    budget_amount: values.budgetAmount || null,
    returned_amount: values.returnedAmount || null,
    housing_amount: values.housingAmount || null,
    notes: values.notes || null,
    num_workers: values.numWorkers ?? null,
    tshirts: values.tshirts || null,
    workbooks: values.workbooks || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("trip_budgets")
    .upsert(payload, { onConflict: "trip_id" })
    .select("*")
    .single();

  if (error) {
    console.error("Error saving trip budget", error);
    throw error;
  }

  return getTripBudget(tripId);
}

export async function listSiteBudgetNotes() {
  const { data, error } = await supabase
    .from("site_budget_notes")
    .select("*")
    .order("site_name", { ascending: true });

  if (error) {
    console.error("Error loading site budget notes", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    siteName: n(row.site_name),
    effectiveDate: row.effective_date || "",
    notes: n(row.notes),
    workbookNotes: n(row.workbook_notes),
  }));
}

export const AIRFARE_BUDGET_PER_PERSON = 1760;
export const HOUSING1_BUDGET_PER_TEAM = 1000;

function parseAmount(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === "" || s === "0") return null;
  const n = Number(s.replace(/[,$]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function getBudgetAverages() {
  const [ticketsRes, budgetsRes] = await Promise.all([
    supabase.from("trip_tickets").select("total_ticket_cost"),
    supabase.from("trip_budgets").select("trip_id, housing_amount"),
  ]);

  if (ticketsRes.error) throw ticketsRes.error;
  if (budgetsRes.error) throw budgetsRes.error;

  const tickets = ticketsRes.data || [];
  const budgets = budgetsRes.data || [];

  const airfareValues = tickets
    .map((r) => parseAmount(r.total_ticket_cost))
    .filter((v) => v != null && v > 0);
  const airfareAverage =
    airfareValues.length > 0
      ? Math.round(airfareValues.reduce((a, b) => a + b, 0) / airfareValues.length)
      : null;

  const housing1Values = budgets
    .map((r) => parseAmount(r.housing_amount))
    .filter((v) => v != null && v > 0);
  const housing1Average =
    housing1Values.length > 0
      ? Math.round(housing1Values.reduce((a, b) => a + b, 0) / housing1Values.length)
      : null;

  const tripIdsForH2 = new Set(budgets.map((r) => r.trip_id));
  if (tripIdsForH2.size === 0) {
    return {
      airfare: { average: airfareAverage, count: airfareValues.length, budgetPerPerson: AIRFARE_BUDGET_PER_PERSON },
      housing1: { average: housing1Average, count: housing1Values.length, budgetPerTeam: HOUSING1_BUDGET_PER_TEAM },
      housing2: { average: null, count: 0 },
    };
  }

  const { data: tripsForH2, error: tripsError } = await supabase
    .from("trips")
    .select("id, project_type")
    .in("id", Array.from(tripIdsForH2));

  if (tripsError) throw tripsError;

  const yfTripIds = new Set(
    (tripsForH2 || []).filter((t) => String(t.project_type || "").toUpperCase() === "YF").map((t) => t.id)
  );

  const housing2Values = budgets
    .filter((b) => !yfTripIds.has(b.trip_id))
    .map((r) => {
      const v = parseAmount(r.housing_amount);
      return v != null ? v : 0;
    });
  const housing2Average =
    housing2Values.length > 0
      ? Math.round(housing2Values.reduce((a, b) => a + b, 0) / housing2Values.length)
      : null;

  return {
    airfare: { average: airfareAverage, count: airfareValues.length, budgetPerPerson: AIRFARE_BUDGET_PER_PERSON },
    housing1: { average: housing1Average, count: housing1Values.length, budgetPerTeam: HOUSING1_BUDGET_PER_TEAM },
    housing2: { average: housing2Average, count: housing2Values.length },
  };
}

export async function updateSiteBudgetNote(id, values) {
  const { data, error } = await supabase
    .from("site_budget_notes")
    .update({
      site_name: values.siteName || null,
      effective_date: values.effectiveDate || null,
      notes: values.notes || null,
      workbook_notes: values.workbookNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating site budget note", error);
    throw error;
  }

  return {
    id: data.id,
    siteName: n(data.site_name),
    effectiveDate: data.effective_date || "",
    notes: n(data.notes),
    workbookNotes: n(data.workbook_notes),
  };
}
