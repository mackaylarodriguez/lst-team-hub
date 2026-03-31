import { supabase } from "@/lib/supabase";
import { resolveSiteLogisticsUrl } from "@/lib/siteInfoLinks";
import { aggregateWorkbooksForSiteTeams } from "@/lib/workbookInventory";

function n(val) {
  return val === null || val === undefined ? "" : String(val).trim();
}

function parseNumWorkersFromDb(raw) {
  if (raw == null || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Avoid spreading `undefined` onto merged budget rows (would clobber prior fields on save). */
function omitUndefined(obj) {
  if (!obj || typeof obj !== "object") return {};
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function isMissingMaterialsColumnError(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return (
    (msg.includes("materials_ship_address") ||
      msg.includes("materials_tracking_number") ||
      msg.includes("materials_notes")) &&
    (msg.includes("does not exist") || msg.includes("schema cache") || error?.code === "42703")
  );
}

function isMissingHousingLinkColumnError(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return (
    msg.includes("housing_link") &&
    (msg.includes("does not exist") || msg.includes("schema cache") || error?.code === "42703")
  );
}

function isMissingHousingPdfUrlColumnError(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return (
    msg.includes("housing_pdf_url") &&
    (msg.includes("does not exist") || msg.includes("schema cache") || error?.code === "42703")
  );
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

  const numWorkers = parseNumWorkersFromDb(data.num_workers);

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
    housingLink: n(data.housing_link),
    housingPdfUrl: n(data.housing_pdf_url),
    notes: n(data.notes),
    numWorkers,
    tshirts: n(data.tshirts),
    workbooks: n(data.workbooks),
    materialsShipAddress: n(data.materials_ship_address),
    materialsTrackingNumber: n(data.materials_tracking_number),
    materialsNotes: n(data.materials_notes),
    updatedAt: data.updated_at || "",
  };
}

export async function saveTripBudget(tripId, values) {
  const prior = await getTripBudget(tripId);
  const merged = { ...(prior || {}), ...omitUndefined(values), tripId };

  const payload = {
    trip_id: tripId,
    team_name: merged.teamName || null,
    project_start_date: merged.projectStartDate || null,
    project_end_date: merged.projectEndDate || null,
    site_country: merged.siteCountry || null,
    site_city: merged.siteCity || null,
    team_accountant: merged.teamAccountant || null,
    budget_amount: merged.budgetAmount || null,
    returned_amount: merged.returnedAmount || null,
    housing_amount: merged.housingAmount || null,
    housing_link: merged.housingLink || null,
    housing_pdf_url: merged.housingPdfUrl || null,
    notes: merged.notes || null,
    num_workers: merged.numWorkers ?? null,
    tshirts: merged.tshirts || null,
    workbooks: merged.workbooks || null,
    materials_ship_address: merged.materialsShipAddress ?? null,
    materials_tracking_number: merged.materialsTrackingNumber ?? null,
    materials_notes: merged.materialsNotes ?? null,
    updated_at: new Date().toISOString(),
  };

  async function upsert(current) {
    return supabase
      .from("trip_budgets")
      .upsert(current, { onConflict: "trip_id" })
      .select("*")
      .single();
  }

  let attemptPayload = { ...payload };
  let { data, error } = await upsert(attemptPayload);
  if (error && isMissingMaterialsColumnError(error)) {
    const {
      materials_ship_address,
      materials_tracking_number,
      materials_notes,
      ...rest
    } = attemptPayload;
    attemptPayload = rest;
    ({ data, error } = await upsert(attemptPayload));
  }
  if (error && isMissingHousingLinkColumnError(error)) {
    const { housing_link, ...rest } = attemptPayload;
    attemptPayload = rest;
    ({ data, error } = await upsert(attemptPayload));
  }
  if (error && isMissingHousingPdfUrlColumnError(error)) {
    const { housing_pdf_url, ...rest } = attemptPayload;
    attemptPayload = rest;
    ({ data, error } = await upsert(attemptPayload));
  }
  if (error) {
    console.error("Error saving trip budget", error);
    throw error;
  }

  return getTripBudget(tripId);
}

export async function listAllTripBudgets() {
  const { data, error } = await supabase
    .from("trip_budgets")
    .select("*, trips(trip_name)")
    .order("project_start_date", { ascending: true, nullsFirst: true });

  if (error) {
    console.error("Error loading all trip budgets", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    tripId: row.trip_id,
    tripName: n(row.trips?.trip_name) || "",
    teamName: n(row.team_name),
    projectStartDate: row.project_start_date || "",
    projectEndDate: row.project_end_date || "",
    siteCountry: n(row.site_country),
    siteCity: n(row.site_city),
    teamAccountant: n(row.team_accountant),
    budgetAmount: n(row.budget_amount),
    returnedAmount: n(row.returned_amount),
    housingAmount: n(row.housing_amount),
    housingLink: n(row.housing_link),
    housingPdfUrl: n(row.housing_pdf_url),
    notes: n(row.notes),
    numWorkers: parseNumWorkersFromDb(row.num_workers),
    tshirts: n(row.tshirts),
    workbooks: n(row.workbooks),
    materialsShipAddress: n(row.materials_ship_address),
    materialsTrackingNumber: n(row.materials_tracking_number),
    materialsNotes: n(row.materials_notes),
    updatedAt: row.updated_at || "",
  }));
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
    logisticsUrl: n(row.logistics_url),
    updatedAt: row.updated_at || "",
  }));
}

/** Housing URL for trip Documents; works for assigned workers (RPC) without SELECT on full trip_budgets. */
export async function getTripHousingLinkForViewer(tripId) {
  if (!tripId) return "";
  const { data, error } = await supabase.rpc("get_trip_housing_link", {
    p_trip_id: tripId,
  });
  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("function") && msg.includes("does not exist")) {
      return "";
    }
    console.warn("get_trip_housing_link", error);
    return "";
  }
  return n(data);
}

/** Housing PDF public URL for trip Documents (same access rules as get_trip_housing_link). */
export async function getTripHousingPdfUrlForViewer(tripId) {
  if (!tripId) return "";
  const { data, error } = await supabase.rpc("get_trip_housing_pdf_url", {
    p_trip_id: tripId,
  });
  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("function") && msg.includes("does not exist")) {
      return "";
    }
    console.warn("get_trip_housing_pdf_url", error);
    return "";
  }
  return n(data);
}

/** Upload a housing PDF to the shared `pdfs` bucket; returns public URL for trip_budgets.housing_pdf_url. */
export async function uploadTripHousingPdf(tripId, file) {
  if (!tripId) throw new Error("Trip required");
  if (!file) throw new Error("File required");
  const safeFileName = `housing-${Date.now()}-${String(file?.name || "housing.pdf").replace(
    /[^a-zA-Z0-9._-]/g,
    "-"
  )}`;
  const storagePath = `${tripId}/housing/${safeFileName}`;
  const { error: uploadError } = await supabase.storage.from("pdfs").upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) {
    console.error("uploadTripHousingPdf", uploadError);
    throw uploadError;
  }
  const {
    data: { publicUrl },
  } = supabase.storage.from("pdfs").getPublicUrl(storagePath);
  return publicUrl;
}

/** Site logistics URL from site_budget_notes for trip Documents (assigned workers + staff). */
export async function getTripSiteLogisticsUrlForViewer(tripId) {
  if (!tripId) return "";
  const { data, error } = await supabase.rpc("get_trip_site_logistics_url", {
    p_trip_id: tripId,
  });
  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("function") && msg.includes("does not exist")) {
      return "";
    }
    console.warn("get_trip_site_logistics_url", error);
    return "";
  }
  return n(data);
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

/**
 * Group every trip by site label (budget site country/city when present, else trip location).
 * Trips without a trip_budgets row still appear so workbooks can be edited from the Sites page.
 */
export function groupTripsBySiteForMaterials(trips, budgetRows) {
  const budgetByTripId = new Map((budgetRows || []).map((b) => [b.tripId, b]));
  const groups = new Map();

  for (const trip of trips || []) {
    const row = budgetByTripId.get(trip.id);
    const siteParts = row ? [n(row.siteCountry), n(row.siteCity)].filter(Boolean) : [];
    const label =
      siteParts.length > 0 ? siteParts.join(", ") : n(trip.location) || "Unassigned site";
    const key = label.toLowerCase();

    if (!groups.has(key)) {
      groups.set(key, { siteLabel: label, teams: [] });
    }

    groups.get(key).teams.push({
      tripId: trip.id,
      tripName: row?.tripName || trip.name || "",
      workbooks: row?.workbooks || "",
      numWorkers: row?.numWorkers ?? null,
      status: trip.status || "",
      updatedAt: row?.updatedAt || "",
    });
  }

  for (const g of groups.values()) {
    g.teams.sort((a, b) =>
      String(a.tripName).localeCompare(String(b.tripName), undefined, { sensitivity: "base" })
    );
  }

  return [...groups.values()].sort((a, b) =>
    String(a.siteLabel).localeCompare(String(b.siteLabel), undefined, { sensitivity: "base" })
  );
}

/**
 * Flat rows for Sites page: one row per site × workbook title with summed qty and last updated.
 */
export function buildSiteWorkbookInventoryRows(siteGroups) {
  const rows = [];

  for (const group of siteGroups || []) {
    const agg = aggregateWorkbooksForSiteTeams(group.teams);
    const logisticsUrl = resolveSiteLogisticsUrl(group.siteLabel);

    for (const [, v] of agg) {
      rows.push({
        siteLabel: group.siteLabel,
        workbookName: v.displayName,
        totalQty: v.totalQty,
        lastUpdatedMs: v.lastUpdatedMs,
        logisticsUrl,
      });
    }
  }

  rows.sort((a, b) => {
    const bySite = a.siteLabel.localeCompare(b.siteLabel, undefined, { sensitivity: "base" });
    if (bySite !== 0) return bySite;
    return a.workbookName.localeCompare(b.workbookName, undefined, { sensitivity: "base" });
  });

  return rows;
}

/** Count how many teams report each distinct workbooks string under a site. */
export function summarizeWorkbookEntries(teams) {
  const counts = new Map();
  for (const t of teams || []) {
    const w = String(t.workbooks || "").trim();
    if (!w) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: "base" }))
    .map(([text, teamCount]) => ({ text, teamCount }));
}

export async function updateSiteBudgetNote(id, values) {
  const patch = {
    site_name: values.siteName || null,
    effective_date: values.effectiveDate || null,
    notes: values.notes !== undefined ? values.notes : undefined,
    workbook_notes: values.workbookNotes !== undefined ? values.workbookNotes : undefined,
    logistics_url:
      values.logisticsUrl !== undefined ? values.logisticsUrl || null : undefined,
    updated_at: new Date().toISOString(),
  };
  const payload = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  );

  const { data, error } = await supabase
    .from("site_budget_notes")
    .update(payload)
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
    logisticsUrl: n(data.logistics_url),
    updatedAt: data.updated_at || "",
  };
}

export async function upsertSiteBudgetNote(values) {
  const row = {
    site_name: n(values.siteName),
    effective_date: values.effectiveDate || null,
    notes: values.notes != null ? values.notes : null,
    workbook_notes: values.workbookNotes != null ? values.workbookNotes : null,
    updated_at: new Date().toISOString(),
  };
  if (values.logisticsUrl !== undefined) {
    row.logistics_url = values.logisticsUrl || null;
  }
  if (!row.site_name) {
    throw new Error("siteName is required");
  }

  const { data, error } = await supabase
    .from("site_budget_notes")
    .upsert(row, { onConflict: "site_name" })
    .select("*")
    .single();

  if (error) {
    console.error("Error upserting site budget note", error);
    throw error;
  }

  return {
    id: data.id,
    siteName: n(data.site_name),
    effectiveDate: data.effective_date || "",
    notes: n(data.notes),
    workbookNotes: n(data.workbook_notes),
    logisticsUrl: n(data.logistics_url),
    updatedAt: data.updated_at || "",
  };
}
