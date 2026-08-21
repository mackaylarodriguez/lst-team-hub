import { supabase } from "@/lib/supabase";
import { resolveCanonicalSiteLabelForTrip } from "@/lib/siteMaterials";
import { SITE_OPTIONS } from "@/lib/siteOptions";
import {
  isSiteAvailabilityStorageName,
  parseSiteAvailabilityStorageName,
  siteAvailabilityStorageName,
} from "@/lib/siteAvailabilityKeys";
import {
  listSiteBudgetNotes,
  deleteSiteBudgetNote,
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
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toYmd(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonthUtc(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Keep month/day, force the season calendar year (Availability is year-scoped). */
function coerceYmdToSeasonYear(ymd, seasonYear) {
  const y = Number(seasonYear);
  if (!Number.isFinite(y)) return n(ymd).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(n(ymd));
  if (!match) return "";
  const month = Number(match[2]);
  let day = Number(match[3]);
  if (month < 1 || month > 12) return "";
  day = Math.min(Math.max(1, day), daysInMonthUtc(y, month));
  return toYmd(y, month, day);
}

function clampYmdPair(startYmd, endYmd, seasonYear) {
  let start = n(startYmd);
  let end = n(endYmd);
  if (!start || !end) return null;
  if (Number.isFinite(Number(seasonYear))) {
    start = coerceYmdToSeasonYear(start, seasonYear);
    end = coerceYmdToSeasonYear(end, seasonYear);
  } else {
    start = start.slice(0, 10);
    end = end.slice(0, 10);
  }
  const a = ymdTime(start);
  const b = ymdTime(end);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  if (a <= b) return { start, end };
  return { start: end, end: start };
}

function asRangeList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Normalize one or many season windows into sorted unique {start,end} ranges. */
export function normalizeAvailableRanges(values = {}, seasonYear) {
  const fromList = asRangeList(values.availableRanges);
  const ranges = [];
  for (const row of fromList) {
    const clamped = clampYmdPair(
      row?.start || row?.availableStart,
      row?.end || row?.availableEnd,
      seasonYear
    );
    if (clamped) ranges.push(clamped);
  }
  if (!ranges.length) {
    const single = clampYmdPair(values.availableStart, values.availableEnd, seasonYear);
    if (single) ranges.push(single);
  }
  ranges.sort((a, b) => ymdTime(a.start) - ymdTime(b.start) || ymdTime(a.end) - ymdTime(b.end));
  const unique = [];
  for (const range of ranges) {
    const prev = unique[unique.length - 1];
    if (prev && prev.start === range.start && prev.end === range.end) continue;
    unique.push(range);
  }
  return unique;
}

export function summarizeAvailableRanges(ranges) {
  const list = Array.isArray(ranges) ? ranges : [];
  if (!list.length) {
    return { availableStart: "", availableEnd: "", hasSeason: false };
  }
  return {
    availableStart: list[0].start,
    availableEnd: list[list.length - 1].end,
    hasSeason: true,
  };
}

function rangesFromDbRow(row) {
  return normalizeAvailableRanges(
    {
      availableRanges: row?.available_ranges,
      availableStart: row?.available_start,
      availableEnd: row?.available_end,
    },
    row?.year
  );
}

function isMissingSiteAvailabilityTableError(error) {
  const msg = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  // PGRST204 = missing column in schema cache — not a missing table.
  if (error?.code === "PGRST204") return false;
  return (
    (error?.code === "42P01" || error?.code === "PGRST205") &&
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
  const availableRanges = rangesFromDbRow(row);
  const summary = summarizeAvailableRanges(availableRanges);
  return {
    id: row.id,
    siteLabel: n(row.site_name),
    year: Number(row.year),
    availableStart: summary.availableStart,
    availableEnd: summary.availableEnd,
    availableRanges,
    siteType: n(row.site_type) || "Partner managed",
    churchName: n(row.church_name) || n(row.site_name),
    otherBackgrounds: n(row.other_backgrounds),
    preferredTeamSize: n(row.preferred_team_size),
    holidays: n(row.holidays),
    teamNotes: normalizeTeamNotes(row.team_notes),
    exclusions: [],
    bookings: [],
    updatedAt: row.updated_at || "",
  };
}

async function listLegacyAvailabilityEdits(year) {
  const y = Number(year);
  const notes = await listSiteBudgetNotes({ includeAvailabilityStorage: true });
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
    const availableRanges = normalizeAvailableRanges(payload, y);
    const summary = summarizeAvailableRanges(availableRanges);
    map[parsed.siteLabel] = {
      id: row.id,
      siteLabel: parsed.siteLabel,
      year: y,
      availableStart: summary.availableStart,
      availableEnd: summary.availableEnd,
      availableRanges,
      siteType: payload.siteType || "Partner managed",
      churchName: n(payload.churchName) || parsed.siteLabel,
      otherBackgrounds: n(payload.otherBackgrounds),
      preferredTeamSize: n(payload.preferredTeamSize),
      holidays: n(payload.holidays),
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

  // Dedicated table exists — do not mix leftover budget-notes storage into Availability.
  return map;
}

/** Upsert one site/year availability record. */
export async function saveSiteAvailabilityEdit(siteLabel, year, values) {
  const label = n(siteLabel);
  const y = Number(year);
  if (!label || !Number.isFinite(y)) {
    throw new Error("Site and year are required.");
  }

  const availableRanges = normalizeAvailableRanges(values, y);
  const summary = summarizeAvailableRanges(availableRanges);
  const start = summary.availableStart || null;
  const end = summary.availableEnd || null;
  const teamNotes = normalizeTeamNotes(values.teamNotes);
  const siteType = n(values.siteType) || "Partner managed";
  const churchName = n(values.churchName) || label;
  const otherBackgrounds = n(values.otherBackgrounds);
  const preferredTeamSize = n(values.preferredTeamSize);
  const holidays = n(values.holidays);

  const payload = {
    site_name: label,
    year: y,
    available_start: start,
    available_end: end,
    available_ranges: availableRanges,
    site_type: siteType,
    church_name: churchName,
    other_backgrounds: otherBackgrounds || null,
    preferred_team_size: preferredTeamSize || null,
    holidays: holidays || null,
    team_notes: teamNotes,
    updated_at: new Date().toISOString(),
  };

  async function upsertPayload(body) {
    return supabase
      .from("site_availability")
      .upsert(body, { onConflict: "site_name,year" })
      .select("*")
      .single();
  }

  let { data, error } = await upsertPayload(payload);

  if (error) {
    if (isMissingSiteAvailabilityTableError(error)) {
      throw new Error(
        "Availability needs the Hub table site_availability. Run supabase/site_availability.sql in Supabase, then try again. Availability is not stored in Budget Notes."
      );
    }
    // Older DBs may be missing newer columns — retry without them.
    const msg = String(error?.message || error?.details || "").toLowerCase();
    let nextBody = { ...payload };
    let patched = false;
    for (const col of [
      "available_ranges",
      "holidays",
      "preferred_team_size",
      "other_backgrounds",
      "church_name",
    ]) {
      if (msg.includes(col) && col in nextBody) {
        delete nextBody[col];
        patched = true;
      }
    }
    if (patched) {
      if (availableRanges.length > 1 && !("available_ranges" in nextBody)) {
        throw new Error(
          "Split season windows need the available_ranges column. Run supabase/site_availability.sql in Supabase, then try again."
        );
      }
      ({ data, error } = await upsertPayload(nextBody));
    }
    if (error) {
      console.error("Error saving site availability", error);
      throw error;
    }
    const normalized = normalizeAvailabilityRow(data);
    return {
      ...normalized,
      availableRanges,
      availableStart: summary.availableStart,
      availableEnd: summary.availableEnd,
      churchName: churchName || normalized.churchName,
      otherBackgrounds: otherBackgrounds || normalized.otherBackgrounds,
      preferredTeamSize: preferredTeamSize || normalized.preferredTeamSize,
      holidays: holidays || normalized.holidays,
    };
  }

  return normalizeAvailabilityRow(data);
}

/** Rename a site's availability row for a year (no-op if none exists). */
export async function renameSiteAvailabilityEdit(oldSiteLabel, newSiteLabel, year) {
  const from = n(oldSiteLabel);
  const to = n(newSiteLabel);
  const y = Number(year);
  if (!from || !to || from === to || !Number.isFinite(y)) return;

  const { error } = await supabase
    .from("site_availability")
    .update({ site_name: to, updated_at: new Date().toISOString() })
    .eq("site_name", from)
    .eq("year", y);

  if (error) {
    if (isMissingSiteAvailabilityTableError(error)) return;
    console.error("Error renaming site availability", error);
    throw error;
  }
}

/** Rename a site inside the availability grid visibility prefs. */
export async function renameSiteInAvailabilityGridPrefs(year, oldSiteLabel, newSiteLabel) {
  const from = n(oldSiteLabel);
  const to = n(newSiteLabel);
  const y = Number(year);
  if (!from || !to || from === to || !Number.isFinite(y)) return;

  const all = [];
  const visible = await loadSiteAvailabilityVisibleSites(y, [from, to]);
  const nextVisible = [...visible].map((label) => (label === from ? to : label));
  const known = new Set([to, ...nextVisible]);
  known.delete(from);
  await saveSiteAvailabilityVisibleSites(y, nextVisible, [...known, ...all]);
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
    const rows = await listSiteBudgetNotes({ includeAvailabilityStorage: true });
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

  const ranges = normalizeAvailableRanges(row, y);
  if (!ranges.length) return { ok: true };

  const tripStart = ymdTime(start);
  const tripEnd = ymdTime(end);
  if (Number.isNaN(tripStart) || Number.isNaN(tripEnd)) return { ok: true };

  const fits = ranges.some((range) => {
    const seasonStart = ymdTime(range.start);
    const seasonEnd = ymdTime(range.end);
    if (Number.isNaN(seasonStart) || Number.isNaN(seasonEnd)) return false;
    return tripStart >= seasonStart && tripEnd <= seasonEnd;
  });

  const labelText = ranges.map((r) => `${r.start} → ${r.end}`).join(" · ");
  if (fits) {
    return {
      ok: true,
      availableStart: ranges[0].start,
      availableEnd: ranges[ranges.length - 1].end,
      availableRanges: ranges,
    };
  }

  return {
    ok: false,
    availableStart: ranges[0].start,
    availableEnd: ranges[ranges.length - 1].end,
    availableRanges: ranges,
    message: `${canonical} is available ${labelText}. This team's dates (${start}${
      end && end !== start ? ` → ${end}` : ""
    }) fall outside those windows.`,
  };
}

/** One-time: copy legacy hidden site_budget_notes availability rows into site_availability, then delete them. */
export async function migrateLegacySiteAvailabilityFromNotes(year = 2027) {
  const probe = await supabase.from("site_availability").select("id").limit(1);
  if (probe.error && isMissingSiteAvailabilityTableError(probe.error)) {
    return { migrated: 0, deleted: 0, skipped: true };
  }

  const notes = await listSiteBudgetNotes({ includeAvailabilityStorage: true });
  let migrated = 0;
  let deleted = 0;

  for (const note of notes || []) {
    const parsed = parseSiteAvailabilityStorageName(note.siteName);
    if (!parsed) continue;

    let payload = null;
    try {
      payload = JSON.parse(String(note.notes || "").trim() || "null");
    } catch {
      payload = null;
    }

    if (payload && typeof payload === "object") {
      await saveSiteAvailabilityEdit(parsed.siteLabel, parsed.year, {
        availableStart: payload.availableStart || "",
        availableEnd: payload.availableEnd || "",
        availableRanges: payload.availableRanges || [],
        siteType: payload.siteType || "Partner managed",
        churchName: payload.churchName || parsed.siteLabel,
        otherBackgrounds: payload.otherBackgrounds || "",
        preferredTeamSize: payload.preferredTeamSize || "",
        holidays: payload.holidays || "",
        teamNotes: payload.teamNotes || [],
      });
      migrated += 1;
    }

    if (note.id) {
      await deleteSiteBudgetNote(note.id);
      deleted += 1;
    }
  }

  return { migrated, deleted };
}

/** Delete any leftover availability rows that were incorrectly stored in site_budget_notes. */
export async function purgeLegacyAvailabilityBudgetNotes() {
  const notes = await listSiteBudgetNotes({ includeAvailabilityStorage: true });
  let deleted = 0;
  for (const note of notes || []) {
    if (!isSiteAvailabilityStorageName(note.siteName) || !note.id) continue;
    await deleteSiteBudgetNote(note.id);
    deleted += 1;
  }
  return { deleted };
}
