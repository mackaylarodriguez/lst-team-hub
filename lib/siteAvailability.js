import { supabase } from "@/lib/supabase";
import { resolveCanonicalSiteLabelForTrip } from "@/lib/siteMaterials";
import { SITE_OPTIONS } from "@/lib/siteOptions";
import {
  parseSiteAvailabilityStorageName,
  siteAvailabilityStorageName,
} from "@/lib/siteAvailabilityKeys";
import {
  listSiteBudgetNotes,
  deleteSiteBudgetNote,
  upsertSiteBudgetNote,
} from "@/lib/tripBudget";

export {
  SITE_AVAILABILITY_STORAGE_PREFIX,
  isSiteAvailabilityStorageName,
  siteAvailabilityStorageName,
  parseSiteAvailabilityStorageName,
} from "@/lib/siteAvailabilityKeys";

const VISIBLE_SITES_FALLBACK_KEY = "lst-sites-availability-visible-db-fallback-v1";

function n(val) {
  return val === null || val === undefined ? "" : String(val).trim();
}

function ymdTime(ymd) {
  const raw = n(ymd);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function isMissingSiteAvailabilityTableError(error) {
  const msg = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    (error?.code === "42P01" || error?.code === "PGRST205" || error?.code === "PGRST204") &&
    (msg.includes("site_availability") || msg.includes("site_availability_grid_prefs"))
  );
}

function normalizeTeamNotes(value) {
  if (Array.isArray(value)) {
    return value.map((item) => n(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeAvailabilityRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    siteLabel: n(row.site_name),
    year: Number(row.year),
    availableStart: row.available_start || "",
    availableEnd: row.available_end || "",
    siteType: n(row.site_type) || "Partner site",
    teamNotes: normalizeTeamNotes(row.team_notes),
    exclusions: [],
    bookings: [],
    updatedAt: row.updated_at || "",
  };
}

async function listLegacyAvailabilityEdits(year) {
  const y = Number(year);
  const notes = await listSiteBudgetNotes();
  const map = {};
  for (const row of notes || []) {
    const parsed = parseSiteAvailabilityStorageName(row.siteName);
    if (!parsed || parsed.year !== y) continue;
    let payload = null;
    try {
      payload = JSON.parse(String(row.notes || "").trim() || "null");
    } catch {
      payload = null;
    }
    if (!payload || typeof payload !== "object") continue;
    map[parsed.siteLabel] = {
      id: row.id,
      siteLabel: parsed.siteLabel,
      year: y,
      availableStart: payload.availableStart || "",
      availableEnd: payload.availableEnd || "",
      siteType: payload.siteType || "Partner site",
      teamNotes: normalizeTeamNotes(payload.teamNotes),
      exclusions: [],
      bookings: [],
      updatedAt: row.updatedAt || "",
    };
  }
  return map;
}

/**
 * Load all saved availability rows for a season year.
 * Returns a map keyed by site label.
 */
export async function listSiteAvailabilityEdits(year) {
  const y = Number(year);
  const { data, error } = await supabase
    .from("site_availability")
    .select("*")
    .eq("year", y);

  if (error) {
    if (isMissingSiteAvailabilityTableError(error)) {
      return listLegacyAvailabilityEdits(y);
    }
    console.error("Error loading site availability", error);
    throw error;
  }

  const map = {};
  for (const row of data || []) {
    const normalized = normalizeAvailabilityRow(row);
    if (!normalized?.siteLabel) continue;
    map[normalized.siteLabel] = normalized;
  }

  if (!Object.keys(map).length) {
    const legacy = await listLegacyAvailabilityEdits(y);
    if (Object.keys(legacy).length) return legacy;
  }
  return map;
}

/** Upsert one site/year availability record. */
export async function saveSiteAvailabilityEdit(siteLabel, year, values) {
  const label = n(siteLabel);
  const y = Number(year);
  if (!label || !Number.isFinite(y)) {
    throw new Error("Site and year are required.");
  }

  const start = n(values.availableStart) || null;
  const end = n(values.availableEnd) || null;
  const teamNotes = normalizeTeamNotes(values.teamNotes);
  const siteType = n(values.siteType) || "Partner site";

  const payload = {
    site_name: label,
    year: y,
    available_start: start,
    available_end: end,
    site_type: siteType,
    team_notes: teamNotes,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("site_availability")
    .upsert(payload, { onConflict: "site_name,year" })
    .select("*")
    .single();

  if (error) {
    if (isMissingSiteAvailabilityTableError(error)) {
      const row = await upsertSiteBudgetNote({
        siteName: siteAvailabilityStorageName(label, y),
        notes: JSON.stringify({
          version: 1,
          availableStart: start || "",
          availableEnd: end || "",
          siteType,
          teamNotes,
          exclusions: [],
          bookings: [],
        }),
        workbookNotes: null,
        logisticsUrl: null,
        hostName: null,
        effectiveDate: `${y}-01-01`,
      });
      return {
        id: row.id,
        siteLabel: label,
        year: y,
        availableStart: start || "",
        availableEnd: end || "",
        siteType,
        teamNotes,
        exclusions: [],
        bookings: [],
        updatedAt: row.updatedAt || "",
      };
    }
    console.error("Error saving site availability", error);
    throw error;
  }

  return normalizeAvailabilityRow(data);
}

/** Remove a saved season so the site shows as Not set. */
export async function deleteSiteAvailabilityEdit(siteLabel, year) {
  const label = n(siteLabel);
  const y = Number(year);
  if (!label || !Number.isFinite(y)) return;

  const { error } = await supabase
    .from("site_availability")
    .delete()
    .eq("site_name", label)
    .eq("year", y);

  if (error && !isMissingSiteAvailabilityTableError(error)) {
    console.error("Error deleting site availability", error);
    throw error;
  }

  try {
    const storageName = siteAvailabilityStorageName(label, y);
    const rows = await listSiteBudgetNotes();
    const match = (rows || []).find((row) => n(row.siteName) === storageName);
    if (match?.id) await deleteSiteBudgetNote(match.id);
  } catch {
    /* ignore */
  }
}

function loadVisibleSitesFallback(year, allSiteLabels) {
  const all = (allSiteLabels || []).map(String);
  if (typeof window === "undefined") return new Set(all);
  try {
    const raw = window.localStorage.getItem(`${VISIBLE_SITES_FALLBACK_KEY}:${year}`);
    if (!raw) return new Set(all);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return new Set(all);
    const allowed = new Set(all);
    const savedVisible = Array.isArray(parsed.visible) ? parsed.visible.map(String) : [];
    const known = Array.isArray(parsed.known) ? parsed.known.map(String) : savedVisible;
    const next = new Set(savedVisible.filter((label) => allowed.has(label)));
    for (const label of all) {
      if (!known.includes(label)) next.add(label);
    }
    return next;
  } catch {
    return new Set(all);
  }
}

function saveVisibleSitesFallback(year, visibleSiteLabels, allSiteLabels) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${VISIBLE_SITES_FALLBACK_KEY}:${year}`,
      JSON.stringify({
        visible: [...(visibleSiteLabels || [])].map(String),
        known: [...(allSiteLabels || [])].map(String),
      })
    );
  } catch {
    /* ignore */
  }
}

/** Load which sites are checked on the Availability grid for a year. */
export async function loadSiteAvailabilityVisibleSites(year, allSiteLabels = []) {
  const y = Number(year);
  const all = (allSiteLabels || []).map(String);
  const { data, error } = await supabase
    .from("site_availability_grid_prefs")
    .select("visible_site_names, known_site_names")
    .eq("year", y)
    .maybeSingle();

  if (error) {
    if (isMissingSiteAvailabilityTableError(error)) {
      return loadVisibleSitesFallback(y, all);
    }
    if (String(error.message || "").toLowerCase().includes("known_site_names")) {
      const fallback = await supabase
        .from("site_availability_grid_prefs")
        .select("visible_site_names")
        .eq("year", y)
        .maybeSingle();
      if (fallback.error) {
        if (isMissingSiteAvailabilityTableError(fallback.error)) {
          return loadVisibleSitesFallback(y, all);
        }
        throw fallback.error;
      }
      if (!fallback.data) return new Set(all);
      const allowed = new Set(all);
      return new Set(
        (fallback.data.visible_site_names || [])
          .map(String)
          .filter((label) => allowed.has(label))
      );
    }
    console.error("Error loading availability grid prefs", error);
    throw error;
  }

  if (!data) return new Set(all);

  const allowed = new Set(all);
  const savedVisible = Array.isArray(data.visible_site_names)
    ? data.visible_site_names.map(String)
    : [];
  const known = Array.isArray(data.known_site_names)
    ? data.known_site_names.map(String)
    : savedVisible;

  const next = new Set(savedVisible.filter((label) => allowed.has(label)));
  for (const label of all) {
    if (!known.includes(label)) next.add(label);
  }
  return next;
}

/** Persist which sites are checked on the Availability grid. */
export async function saveSiteAvailabilityVisibleSites(year, visibleSiteLabels, allSiteLabels = []) {
  const y = Number(year);
  if (!Number.isFinite(y)) throw new Error("Year is required.");

  const names = [...(visibleSiteLabels || [])].map(String).filter(Boolean);
  const known = [...(allSiteLabels || [])].map(String).filter(Boolean);
  const payload = {
    year: y,
    visible_site_names: names,
    known_site_names: known,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabase
    .from("site_availability_grid_prefs")
    .upsert(payload, { onConflict: "year" });

  if (error && String(error.message || "").toLowerCase().includes("known_site_names")) {
    ({ error } = await supabase.from("site_availability_grid_prefs").upsert(
      {
        year: y,
        visible_site_names: names,
        updated_at: payload.updated_at,
      },
      { onConflict: "year" }
    ));
  }

  if (error) {
    if (isMissingSiteAvailabilityTableError(error)) {
      saveVisibleSitesFallback(y, names, known);
      return;
    }
    console.error("Error saving availability grid prefs", error);
    throw error;
  }
}

/**
 * Guardrail: trip dates must fall inside the site's available season when one is set.
 * Returns { ok: true } or { ok: false, message, availableStart, availableEnd }.
 */
export async function assertTripDatesWithinSiteAvailability({
  siteLabel,
  startDate,
  endDate,
  year,
}) {
  const label = n(siteLabel);
  const start = n(startDate);
  const end = n(endDate) || start;
  if (!label || !start) return { ok: true };

  const canonical =
    SITE_OPTIONS.find((opt) => opt.toLowerCase() === label.toLowerCase()) ||
    resolveCanonicalSiteLabelForTrip(label, []) ||
    label;

  const y = Number(year) || Number(String(start).slice(0, 4)) || new Date().getFullYear();
  const map = await listSiteAvailabilityEdits(y);
  const row = map[canonical];
  if (!row) return { ok: true };

  const availableStart = n(row.availableStart);
  const availableEnd = n(row.availableEnd);
  if (!availableStart || !availableEnd) return { ok: true };

  const tripStart = ymdTime(start);
  const tripEnd = ymdTime(end);
  const seasonStart = ymdTime(availableStart);
  const seasonEnd = ymdTime(availableEnd);
  if ([tripStart, tripEnd, seasonStart, seasonEnd].some((x) => Number.isNaN(x))) {
    return { ok: true };
  }

  if (tripStart >= seasonStart && tripEnd <= seasonEnd) {
    return { ok: true, availableStart, availableEnd };
  }

  return {
    ok: false,
    availableStart,
    availableEnd,
    message: `${canonical} is available ${availableStart} → ${availableEnd}. This team's dates (${start}${
      end && end !== start ? ` → ${end}` : ""
    }) fall outside that range.`,
  };
}

/** One-time: copy legacy hidden site_budget_notes availability rows into site_availability. */
export async function migrateLegacySiteAvailabilityFromNotes(year = 2027) {
  const y = Number(year);
  const probe = await supabase.from("site_availability").select("id").limit(1);
  if (probe.error && isMissingSiteAvailabilityTableError(probe.error)) {
    return { migrated: 0, deleted: 0, skipped: true };
  }

  const notes = await listSiteBudgetNotes();
  let migrated = 0;
  let deleted = 0;

  for (const note of notes || []) {
    const parsed = parseSiteAvailabilityStorageName(note.siteName);
    if (!parsed || parsed.year !== y) continue;

    let payload = null;
    try {
      payload = JSON.parse(String(note.notes || "").trim() || "null");
    } catch {
      payload = null;
    }
    if (!payload || typeof payload !== "object") continue;

    await saveSiteAvailabilityEdit(parsed.siteLabel, y, {
      availableStart: payload.availableStart || "",
      availableEnd: payload.availableEnd || "",
      siteType: payload.siteType || "Partner site",
      teamNotes: payload.teamNotes || [],
    });
    migrated += 1;

    if (note.id) {
      await deleteSiteBudgetNote(note.id);
      deleted += 1;
    }
  }

  return { migrated, deleted };
}
