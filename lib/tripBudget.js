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
