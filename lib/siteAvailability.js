import { listSiteBudgetNotes, upsertSiteBudgetNote, deleteSiteBudgetNote } from "@/lib/tripBudget";
import {
  isSiteAvailabilityStorageName,
  parseSiteAvailabilityStorageName,
  siteAvailabilityStorageName,
} from "@/lib/siteAvailabilityKeys";

export {
  SITE_AVAILABILITY_STORAGE_PREFIX,
  isSiteAvailabilityStorageName,
  siteAvailabilityStorageName,
  parseSiteAvailabilityStorageName,
} from "@/lib/siteAvailabilityKeys";

function parseAvailabilityPayload(notesText) {
  try {
    const parsed = JSON.parse(String(notesText || "").trim() || "null");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Load all saved availability overrides for a season year from the Hub DB.
 * Returns a map keyed by site label.
 */
export async function listSiteAvailabilityEdits(year) {
  const y = Number(year);
  const rows = await listSiteBudgetNotes();
  const map = {};

  for (const row of rows || []) {
    const parsedName = parseSiteAvailabilityStorageName(row.siteName);
    if (!parsedName || parsedName.year !== y) continue;
    const payload = parseAvailabilityPayload(row.notes);
    if (!payload) continue;
    map[parsedName.siteLabel] = {
      id: row.id,
      siteLabel: parsedName.siteLabel,
      year: y,
      availableStart: payload.availableStart || "",
      availableEnd: payload.availableEnd || "",
      siteType: payload.siteType || "",
      teamNotes: Array.isArray(payload.teamNotes) ? payload.teamNotes : [],
      exclusions: Array.isArray(payload.exclusions) ? payload.exclusions : [],
      bookings: Array.isArray(payload.bookings) ? payload.bookings : [],
      updatedAt: row.updatedAt || "",
    };
  }

  return map;
}

/** Upsert one site/year availability record into the Hub database. */
export async function saveSiteAvailabilityEdit(siteLabel, year, values) {
  const label = String(siteLabel || "").trim();
  const y = Number(year);
  if (!label || !Number.isFinite(y)) {
    throw new Error("Site and year are required.");
  }

  const payload = {
    version: 1,
    availableStart: values.availableStart,
    availableEnd: values.availableEnd,
    siteType: values.siteType || "",
    teamNotes: Array.isArray(values.teamNotes) ? values.teamNotes : [],
    exclusions: Array.isArray(values.exclusions) ? values.exclusions : [],
    bookings: Array.isArray(values.bookings) ? values.bookings : [],
  };

  const row = await upsertSiteBudgetNote({
    siteName: siteAvailabilityStorageName(label, y),
    notes: JSON.stringify(payload),
    workbookNotes: null,
    logisticsUrl: null,
    hostName: null,
    effectiveDate: `${y}-01-01`,
  });

  return {
    id: row.id,
    siteLabel: label,
    year: y,
    ...payload,
    updatedAt: row.updatedAt || "",
  };
}

/** Remove a saved override so the site falls back to sample defaults. */
export async function deleteSiteAvailabilityEdit(siteLabel, year) {
  const label = String(siteLabel || "").trim();
  const y = Number(year);
  if (!label || !Number.isFinite(y)) return;

  const storageName = siteAvailabilityStorageName(label, y);
  const rows = await listSiteBudgetNotes();
  const match = (rows || []).find(
    (row) => String(row.siteName || "").trim() === storageName
  );
  if (match?.id) {
    await deleteSiteBudgetNote(match.id);
  }
}
