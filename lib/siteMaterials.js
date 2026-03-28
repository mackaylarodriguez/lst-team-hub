import { SITE_OPTIONS } from "@/lib/siteOptions";

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
