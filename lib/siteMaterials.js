import { SITE_OPTIONS } from "@/lib/siteOptions";
import { resolveSiteLogisticsUrl } from "@/lib/siteInfoLinks";

/**
 * Find the site_budget_notes row to show/edit for a canonical site option (e.g. SITE_OPTIONS entry).
 * Matches exact site_name, then last segment after " - ", then loose substring match.
 */
export function findSiteBudgetNoteForOption(siteOption, notes) {
  const opt = String(siteOption || "").trim();
  if (!opt) return null;
  const ol = opt.toLowerCase();
  const list = notes || [];

  const exact = list.find((n) => n.siteName.trim().toLowerCase() === ol);
  if (exact) return exact;

  const lastSeg = opt.split(/\s*-\s*/).pop().trim().toLowerCase();
  const byLast = list.find((n) => n.siteName.trim().toLowerCase() === lastSeg);
  if (byLast) return byLast;

  return (
    list.find((n) => {
      const nl = n.siteName.trim().toLowerCase();
      return ol.includes(nl) || nl.includes(lastSeg);
    }) || null
  );
}

/** Resolve site notes for a trip using trip.location and the same rules as site options. */
export function resolveSiteBudgetNoteForTripLocation(tripLocation, notes) {
  const loc = String(tripLocation || "").trim();
  if (!loc) return null;

  const list = notes || [];
  const hit = list.find((n) => n.siteName.trim().toLowerCase() === loc.toLowerCase());
  if (hit) return hit;

  for (const option of SITE_OPTIONS) {
    if (option === loc) {
      return findSiteBudgetNoteForOption(option, list);
    }
  }

  return findSiteBudgetNoteForOption(loc, list);
}

/**
 * Prefer the full SITE_OPTIONS label (e.g. "Brazil - Joao Pessoa") when trip.location is a short
 * or legacy alias. Falls back to the raw location when there is no unambiguous match.
 */
export function resolveCanonicalSiteLabelForTrip(tripLocation, notes = []) {
  const loc = String(tripLocation || "").trim();
  if (!loc) return "";

  const locL = loc.toLowerCase();
  for (const o of SITE_OPTIONS) {
    if (o.toLowerCase() === locL) return o;
  }

  const note = resolveSiteBudgetNoteForTripLocation(loc, notes);
  if (note?.siteName) {
    const sn = note.siteName.trim();
    const byNoteName = SITE_OPTIONS.find((o) => o.toLowerCase() === sn.toLowerCase());
    if (byNoteName) return byNoteName;
    const list = notes || [];
    const optLinkedToNote = SITE_OPTIONS.find((opt) => {
      const n = findSiteBudgetNoteForOption(opt, list);
      return n && n.id === note.id;
    });
    if (optLinkedToNote) return optLinkedToNote;
  }

  for (const o of SITE_OPTIONS) {
    const last = o.split(/\s*-\s*/).pop().trim().toLowerCase();
    if (last === locL) return o;
  }

  return loc;
}

/**
 * Site logistics URL: saved override on site_budget_notes, else built-in map for canonical site label.
 */
export function resolveTripSiteLogisticsUrl(tripLocation, siteBudgetNotesList = []) {
  const loc = String(tripLocation || "").trim();
  if (!loc) return "";
  const note = resolveSiteBudgetNoteForTripLocation(loc, siteBudgetNotesList);
  const custom = String(note?.logisticsUrl || "").trim();
  if (custom) return custom;
  const label = resolveCanonicalSiteLabelForTrip(loc, siteBudgetNotesList);
  return resolveSiteLogisticsUrl(label || loc) || "";
}
