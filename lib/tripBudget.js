import { supabase } from "@/lib/supabase";
import { parseCurrencyLike, formatUsdNumber } from "@/lib/budgetMoney";
import { resolveSiteLogisticsUrl } from "@/lib/siteInfoLinks";
import { aggregateWorkbooksForSiteTeams } from "@/lib/workbookInventory";
import { resolveCanonicalSiteLabelForTrip } from "@/lib/siteMaterials";
import { SITE_OPTIONS } from "@/lib/siteOptions";
import { isUsMassachusettsMissionSite } from "@/lib/usMassachusettsSite";

function n(val) {
  return val === null || val === undefined ? "" : String(val).trim();
}

/** PostgREST may return jsonb as a parsed array, a JSON string, or a single object. */
function parseHousingDocumentsRpcPayload(data) {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return [parsed];
    } catch {
      return [];
    }
    return [];
  }
  if (typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length && keys.every((k) => /^\d+$/.test(k))) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => data[k])
        .filter(Boolean);
    }
    if ("kind" in data || "link" in data || "pdf_url" in data || "pdfUrl" in data) {
      return [data];
    }
  }
  return [];
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
      msg.includes("materials_notes") ||
      msg.includes("team_recorder") ||
      msg.includes("materials_ship_address_note") ||
      msg.includes("materials_notes_for_team") ||
      msg.includes("materials_packing_checklist")) &&
    (msg.includes("does not exist") || msg.includes("schema cache") || error?.code === "42703")
  );
}

function parseMaterialsPackingChecklistFromDb(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return p && typeof p === "object" && !Array.isArray(p) ? p : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) return { ...raw };
  return {};
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

function isMissingOnsiteExpensesAmountColumnError(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return (
    msg.includes("onsite_expenses_amount") &&
    (msg.includes("does not exist") || msg.includes("schema cache") || error?.code === "42703")
  );
}

function isMissingHousingBudgetAmountColumnError(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return (
    msg.includes("housing_budget_amount") &&
    (msg.includes("does not exist") || msg.includes("schema cache") || error?.code === "42703")
  );
}

function isMissingSiteBudgetHostNameColumnError(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return (
    msg.includes("host_name") &&
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
    teamRecorder: n(data.team_recorder),
    budgetAmount: n(data.budget_amount),
    housingBudgetAmount: n(data.housing_budget_amount) || n(data.budget_amount),
    returnedAmount: n(data.returned_amount),
    housingAmount: n(data.housing_amount),
    onsiteExpensesAmount: n(data.onsite_expenses_amount),
    housingLink: n(data.housing_link),
    housingPdfUrl: n(data.housing_pdf_url),
    notes: n(data.notes),
    numWorkers,
    tshirts: n(data.tshirts),
    workbooks: n(data.workbooks),
    materialsShipAddress: n(data.materials_ship_address),
    materialsShipAddressNote: n(data.materials_ship_address_note),
    materialsTrackingNumber: n(data.materials_tracking_number),
    materialsNotes: n(data.materials_notes),
    materialsNotesForTeam: n(data.materials_notes_for_team),
    materialsPackingChecklist: parseMaterialsPackingChecklistFromDb(data.materials_packing_checklist),
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
    team_recorder: merged.teamRecorder || null,
    budget_amount: merged.budgetAmount || null,
    housing_budget_amount: merged.housingBudgetAmount || null,
    returned_amount: merged.returnedAmount || null,
    housing_amount: merged.housingAmount || null,
    onsite_expenses_amount: merged.onsiteExpensesAmount || null,
    housing_link: merged.housingLink || null,
    housing_pdf_url: merged.housingPdfUrl || null,
    notes: merged.notes || null,
    num_workers: merged.numWorkers ?? null,
    tshirts: merged.tshirts || null,
    workbooks: merged.workbooks || null,
    materials_ship_address: merged.materialsShipAddress ?? null,
    materials_ship_address_note: merged.materialsShipAddressNote ?? null,
    materials_tracking_number: merged.materialsTrackingNumber ?? null,
    materials_notes: merged.materialsNotes ?? null,
    materials_notes_for_team: merged.materialsNotesForTeam ?? null,
    materials_packing_checklist:
      merged.materialsPackingChecklist &&
      typeof merged.materialsPackingChecklist === "object" &&
      !Array.isArray(merged.materialsPackingChecklist)
        ? merged.materialsPackingChecklist
        : {},
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
      materials_ship_address_note,
      materials_tracking_number,
      materials_notes,
      materials_notes_for_team,
      materials_packing_checklist,
      team_recorder,
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
  if (error && isMissingOnsiteExpensesAmountColumnError(error)) {
    const { onsite_expenses_amount, ...rest } = attemptPayload;
    attemptPayload = rest;
    ({ data, error } = await upsert(attemptPayload));
  }
  if (error && isMissingHousingBudgetAmountColumnError(error)) {
    const { housing_budget_amount, ...rest } = attemptPayload;
    attemptPayload = rest;
    ({ data, error } = await upsert(attemptPayload));
  }
  if (error) {
    console.error("Error saving trip budget", error);
    throw error;
  }

  return getTripBudget(tripId);
}

/** Removes the trip_budgets row for this trip (housing, budget amounts, materials fields on that row). */
export async function deleteTripBudget(tripId) {
  if (!tripId) throw new Error("Trip required");
  const { error } = await supabase.from("trip_budgets").delete().eq("trip_id", tripId);
  if (error) {
    console.error("Error deleting trip budget", error);
    throw error;
  }
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
    teamRecorder: n(row.team_recorder),
    budgetAmount: n(row.budget_amount),
    housingBudgetAmount: n(row.housing_budget_amount) || n(row.budget_amount),
    returnedAmount: n(row.returned_amount),
    housingAmount: n(row.housing_amount),
    onsiteExpensesAmount: n(row.onsite_expenses_amount),
    housingLink: n(row.housing_link),
    housingPdfUrl: n(row.housing_pdf_url),
    notes: n(row.notes),
    numWorkers: parseNumWorkersFromDb(row.num_workers),
    tshirts: n(row.tshirts),
    workbooks: n(row.workbooks),
    materialsShipAddress: n(row.materials_ship_address),
    materialsShipAddressNote: n(row.materials_ship_address_note),
    materialsTrackingNumber: n(row.materials_tracking_number),
    materialsNotes: n(row.materials_notes),
    materialsNotesForTeam: n(row.materials_notes_for_team),
    materialsPackingChecklist: parseMaterialsPackingChecklistFromDb(row.materials_packing_checklist),
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
    hostName: n(row.host_name),
    updatedAt: row.updated_at || "",
    workbookNotesUpdatedAt: row.workbook_notes_updated_at || "",
  }));
}

export async function deleteSiteBudgetNote(id) {
  if (!id) return;
  const { error } = await supabase.from("site_budget_notes").delete().eq("id", id);
  if (error) {
    console.error("Error deleting site budget note", error);
    throw error;
  }
}

/**
 * Merge duplicate site_budget_notes rows (same canonical site) and remove redundant **built-in**
 * rows that have no housing note, workbook notes, or logistics URL (built-in sites still appear
 * from SITE_OPTIONS without a DB row). Custom sites added on the Sites tab are kept even when
 * those fields are empty so the site name remains in pickers.
 */
export async function cleanupSiteBudgetNotesRows() {
  let rows = await listSiteBudgetNotes();
  let deletedCount = 0;

  const canonicalKeyFor = (note) => {
    const raw = String(note?.siteName || "").trim();
    const canon = resolveCanonicalSiteLabelForTrip(raw, rows).trim().toLowerCase();
    return canon || raw.toLowerCase();
  };

  const groups = new Map();
  for (const note of rows) {
    const k = canonicalKeyFor(note);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(note);
  }

  for (const [, group] of groups) {
    if (group.length <= 1) continue;
    group.sort((a, b) => {
      const al = String(a.notes || "").trim().length;
      const bl = String(b.notes || "").trim().length;
      if (al > 0 && bl === 0) return -1;
      if (bl > 0 && al === 0) return 1;
      const ta = Date.parse(a.updatedAt || 0) || 0;
      const tb = Date.parse(b.updatedAt || 0) || 0;
      return tb - ta;
    });
    const keeper = group[0];
    const losers = group.slice(1);

    const firstNonEmpty = (field) => {
      const v = String(keeper[field] || "").trim();
      if (v) return keeper[field];
      for (const l of losers) {
        const t = String(l[field] || "").trim();
        if (t) return l[field];
      }
      return keeper[field];
    };

    const nextNotes = firstNonEmpty("notes");
    const nextWb = firstNonEmpty("workbookNotes");
    const nextLog = firstNonEmpty("logisticsUrl");
    const nextHost = firstNonEmpty("hostName");

    const changed =
      String(keeper.notes || "").trim() !== String(nextNotes || "").trim() ||
      String(keeper.workbookNotes || "").trim() !== String(nextWb || "").trim() ||
      String(keeper.logisticsUrl || "").trim() !== String(nextLog || "").trim() ||
      String(keeper.hostName || "").trim() !== String(nextHost || "").trim();

    if (changed) {
      await updateSiteBudgetNote(keeper.id, {
        siteName: keeper.siteName,
        effectiveDate: keeper.effectiveDate || null,
        notes: nextNotes != null ? nextNotes : "",
        workbookNotes: nextWb != null ? nextWb : "",
        logisticsUrl: nextLog != null ? nextLog : "",
        hostName: nextHost != null ? nextHost : "",
      });
    }

    for (const l of losers) {
      await deleteSiteBudgetNote(l.id);
      deletedCount += 1;
    }
  }

  rows = await listSiteBudgetNotes();

  const siteNameMatchesBuiltinOption = (siteName) => {
    const s = String(siteName || "").trim().toLowerCase();
    if (!s) return false;
    return SITE_OPTIONS.some((o) => String(o || "").trim().toLowerCase() === s);
  };

  for (const note of rows) {
    const emptyHousing = !String(note.notes || "").trim();
    const emptyWb = !String(note.workbookNotes || "").trim();
    const emptyLog = !String(note.logisticsUrl || "").trim();
    const emptyHost = !String(note.hostName || "").trim();
    if (emptyHousing && emptyWb && emptyLog && emptyHost) {
      // Custom sites (Sites → Add site) often have only `site_name` so they appear in pickers.
      // Built-in mission sites still show from SITE_OPTIONS without a `site_budget_notes` row.
      if (!siteNameMatchesBuiltinOption(note.siteName)) {
        continue;
      }
      await deleteSiteBudgetNote(note.id);
      deletedCount += 1;
    }
  }

  const finalList = await listSiteBudgetNotes();
  return { notes: finalList, deletedCount };
}

/**
 * Save housing text for a canonical site: updates matching row or upserts a new site_name row
 * without wiping existing workbook/logistics when a row already exists.
 */
export async function saveSiteHousingNoteForSiteLabel(siteLabel, notesText) {
  const label = n(siteLabel);
  if (!label) throw new Error("Site is required");
  const all = await listSiteBudgetNotes();
  const key = resolveCanonicalSiteLabelForTrip(label, all).trim().toLowerCase();
  const match = all.find((row) => {
    const rk = resolveCanonicalSiteLabelForTrip(row.siteName || "", all).trim().toLowerCase();
    return rk === key;
  });
  if (match) {
    return updateSiteBudgetNote(match.id, {
      siteName: match.siteName,
      effectiveDate: match.effectiveDate || null,
      notes: notesText,
      workbookNotes: match.workbookNotes,
      logisticsUrl: match.logisticsUrl,
      hostName: match.hostName ?? "",
    });
  }
  return upsertSiteBudgetNote({
    siteName: label,
    effectiveDate: null,
    notes: notesText,
    workbookNotes: null,
    logisticsUrl: undefined,
    hostName: undefined,
  });
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

/**
 * Primary (trip_budgets) + extra housing rows; same access as housing link RPC.
 * Each item: { kind, label, link, pdfUrl }.
 */
export async function getTripHousingDocumentsForViewer(tripId) {
  if (!tripId) return [];
  const { data, error } = await supabase.rpc("get_trip_housing_documents", {
    p_trip_id: tripId,
  });
  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("function") && msg.includes("does not exist")) {
      const [link, pdf] = await Promise.all([
        getTripHousingLinkForViewer(tripId),
        getTripHousingPdfUrlForViewer(tripId),
      ]);
      if (!n(link) && !n(pdf)) return [];
      return [{ kind: "primary", label: "", link: n(link), pdfUrl: n(pdf) }];
    }
    console.warn("get_trip_housing_documents", error);
    return [];
  }
  let arr = parseHousingDocumentsRpcPayload(data);
  if (arr.length === 0) {
    const [link, pdf] = await Promise.all([
      getTripHousingLinkForViewer(tripId),
      getTripHousingPdfUrlForViewer(tripId),
    ]);
    if (n(link) || n(pdf)) {
      return [{ kind: "primary", label: "", link: n(link), pdfUrl: n(pdf) }];
    }
    return [];
  }
  return arr.map((row) => ({
    kind: row?.kind || "extra",
    label: n(row?.label),
    link: n(row?.link),
    pdfUrl: n(row?.pdf_url != null ? row.pdf_url : row?.pdfUrl),
  }));
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
  const n = Number(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function getBudgetAverages() {
  const [ticketsRes, budgetsRes] = await Promise.all([
    supabase.from("trip_tickets").select("total_ticket_cost"),
    supabase.from("trip_budgets").select("housing_amount"),
  ]);

  if (ticketsRes.error) throw ticketsRes.error;
  if (budgetsRes.error) throw budgetsRes.error;

  const airfareValues = (ticketsRes.data || [])
    .map((r) => parseAmount(r.total_ticket_cost))
    .filter((v) => v != null && v > 0);
  const airfareAverage =
    airfareValues.length > 0
      ? Math.round(airfareValues.reduce((a, b) => a + b, 0) / airfareValues.length)
      : null;

  const housingValues = (budgetsRes.data || [])
    .map((r) => parseAmount(r.housing_amount))
    .filter((v) => v != null && v > 0);
  const housingAverage =
    housingValues.length > 0
      ? Math.round(housingValues.reduce((a, b) => a + b, 0) / housingValues.length)
      : null;

  return {
    airfare: {
      average: airfareAverage,
      count: airfareValues.length,
    },
    housing: {
      average: housingAverage,
      count: housingValues.length,
    },
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
  const nowIso = new Date().toISOString();
  const patch = {
    site_name: values.siteName || null,
    effective_date: values.effectiveDate || null,
    notes: values.notes !== undefined ? values.notes : undefined,
    workbook_notes: values.workbookNotes !== undefined ? values.workbookNotes : undefined,
    logistics_url:
      values.logisticsUrl !== undefined ? values.logisticsUrl || null : undefined,
    updated_at: nowIso,
    ...(values.setWorkbookNotesUpdatedAt
      ? { workbook_notes_updated_at: nowIso }
      : {}),
    ...(values.hostName !== undefined ? { host_name: values.hostName || null } : {}),
  };
  let payload = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));

  async function runUpdate(body) {
    return supabase.from("site_budget_notes").update(body).eq("id", id).select("*").single();
  }

  let { data, error } = await runUpdate(payload);
  if (error && isMissingSiteBudgetHostNameColumnError(error) && Object.prototype.hasOwnProperty.call(payload, "host_name")) {
    const { host_name, ...rest } = payload;
    ({ data, error } = await runUpdate(rest));
  }

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
    hostName: n(data.host_name),
    updatedAt: data.updated_at || "",
    workbookNotesUpdatedAt: data.workbook_notes_updated_at || "",
  };
}

function parseBudgetAmountOrNull(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return parseCurrencyLike(raw);
}

function sumTicketAirfareForTrip(ticketRows, tripId) {
  return (ticketRows || [])
    .filter((row) => String(row.tripId) === String(tripId))
    .reduce((sum, row) => sum + (parseCurrencyLike(row?.totalTicketCost) ?? 0), 0);
}

/** One team's Housing Amount column value (trip_budgets.housing_amount only). */
export function housingAmountFromBudgetRow(row) {
  return parseCurrencyLike(row?.housingAmount) ?? 0;
}

/** Sum of the Housing Amount column across budget/housing rows. Ignores housing budget amount, returned amount, etc. */
export function sumHousingAmountColumn(rows) {
  return (rows || []).reduce((sum, row) => sum + housingAmountFromBudgetRow(row), 0);
}

/** Overview-style rollups for one trip (team budget, airfare, housing, on-site, leftover). */
export function computeTripBudgetOverviewSummary({ budgetRow, ticketRows, tripId }) {
  const budgetTotal = parseBudgetAmountOrNull(budgetRow?.budgetAmount);
  const airfareTotal = sumTicketAirfareForTrip(ticketRows, tripId);
  const housingTotal = housingAmountFromBudgetRow(budgetRow);
  const onsiteTotal = parseBudgetAmountOrNull(budgetRow?.onsiteExpensesAmount);
  const spentTotal = airfareTotal + housingTotal + (onsiteTotal ?? 0);
  const leftover = budgetTotal == null ? null : budgetTotal - spentTotal;

  return {
    budgetTotal,
    airfareTotal,
    housingTotal,
    onsiteTotal,
    leftover,
  };
}

/**
 * Fee breakdown for staff budget cards / leftover.
 * Fee = same trip-setup Fee field; Materials Fee = trip-setup Materials Fee.
 * If domestic (Massachusetts), also includes Domestic Project, Domestic Fee, Domestic Materials Fee.
 */
export function getTripBudgetFeeBreakdown(trip, { isDomestic = null } = {}) {
  const domestic =
    isDomestic == null ? isUsMassachusettsMissionSite(trip?.location) : Boolean(isDomestic);
  const fee = parseBudgetAmountOrNull(trip?.tripFeeAmount) ?? 0;
  const materialsFee = parseBudgetAmountOrNull(trip?.materialsFeeAmount) ?? 0;
  const domesticProject = domestic
    ? parseBudgetAmountOrNull(trip?.domesticProjectFeeAmount) ?? 0
    : 0;
  const domesticFee = domestic ? parseBudgetAmountOrNull(trip?.domesticFeeAmount) ?? 0 : 0;
  const domesticMaterialsFee = domestic
    ? parseBudgetAmountOrNull(trip?.domesticMaterialsFeeAmount) ?? 0
    : 0;
  const total = fee + materialsFee + domesticProject + domesticFee + domesticMaterialsFee;
  return {
    fee,
    materialsFee,
    domesticProject,
    domesticFee,
    domesticMaterialsFee,
    isDomestic: domestic,
    total,
  };
}

/** Fee total for staff budget cards / leftover. */
export function sumTripBudgetFeeAmount(trip, { isDomestic = null } = {}) {
  return getTripBudgetFeeBreakdown(trip, { isDomestic }).total;
}

export function formatTripBudgetFeeBreakdownDetail(breakdown) {
  if (!breakdown) return "";
  const parts = [];
  if (breakdown.fee > 0) parts.push(`Fee ${formatUsdNumber(breakdown.fee)}`);
  if (breakdown.materialsFee > 0) parts.push(`Materials fee ${formatUsdNumber(breakdown.materialsFee)}`);
  if (breakdown.isDomestic) {
    if (breakdown.domesticProject > 0) {
      parts.push(`Domestic Project ${formatUsdNumber(breakdown.domesticProject)}`);
    }
    if (breakdown.domesticFee > 0) {
      parts.push(`Domestic Fee ${formatUsdNumber(breakdown.domesticFee)}`);
    }
    if (breakdown.domesticMaterialsFee > 0) {
      parts.push(`Domestic Materials Fee ${formatUsdNumber(breakdown.domesticMaterialsFee)}`);
    }
  }
  return parts.join(" · ");
}

/**
 * Staff Fundraising → Team budget & expenses cards.
 * Total fundraising = worker goals combined; Team budget = Budget field (onsite_expenses_amount);
 * Fee = trip Fee + Materials Fee (+ domestic fees when applicable); leftover = fundraising − airfare − housing − fee.
 */
export function computeStaffTeamBudgetExpenseSummary({
  budgetRow,
  ticketRows,
  tripId,
  trip,
  fundraisingTotal,
  isDomestic = null,
}) {
  const base = computeTripBudgetOverviewSummary({ budgetRow, ticketRows, tripId });
  const fundraising =
    fundraisingTotal != null && Number.isFinite(fundraisingTotal) && fundraisingTotal > 0
      ? fundraisingTotal
      : null;
  const teamBudget = parseBudgetAmountOrNull(budgetRow?.onsiteExpensesAmount);
  const feeBreakdown = getTripBudgetFeeBreakdown(trip, { isDomestic });
  const feeTotal = feeBreakdown.total;
  const spentTotal = base.airfareTotal + base.housingTotal + feeTotal;
  const leftover = fundraising == null ? null : fundraising - spentTotal;

  return {
    fundraisingTotal: fundraising,
    budgetTotal: teamBudget,
    airfareTotal: base.airfareTotal,
    housingTotal: base.housingTotal,
    feeTotal,
    feeBreakdown,
    feeDetail: formatTripBudgetFeeBreakdownDetail(feeBreakdown),
    leftover,
    onsiteTotal: teamBudget,
  };
}

export function formatTripBudgetSummaryUsd(value) {
  if (value == null || !Number.isFinite(value)) return "—";
  return formatUsdNumber(value);
}

export async function upsertSiteBudgetNote(values) {
  const nowIso = new Date().toISOString();
  const row = {
    site_name: n(values.siteName),
    effective_date: values.effectiveDate || null,
    notes: values.notes != null ? values.notes : null,
    workbook_notes: values.workbookNotes != null ? values.workbookNotes : null,
    updated_at: nowIso,
    ...(values.setWorkbookNotesUpdatedAt
      ? { workbook_notes_updated_at: nowIso }
      : {}),
  };
  if (values.logisticsUrl !== undefined) {
    row.logistics_url = values.logisticsUrl || null;
  }
  if (values.hostName !== undefined) {
    row.host_name = values.hostName || null;
  }
  if (!row.site_name) {
    throw new Error("siteName is required");
  }

  async function runUpsert(body) {
    return supabase.from("site_budget_notes").upsert(body, { onConflict: "site_name" }).select("*").single();
  }

  let { data, error } = await runUpsert(row);
  if (error && isMissingSiteBudgetHostNameColumnError(error) && Object.prototype.hasOwnProperty.call(row, "host_name")) {
    const { host_name, ...rest } = row;
    ({ data, error } = await runUpsert(rest));
  }

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
    hostName: n(data.host_name),
    updatedAt: data.updated_at || "",
    workbookNotesUpdatedAt: data.workbook_notes_updated_at || "",
  };
}
