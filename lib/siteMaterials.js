import {
  SITE_OPTIONS,
  getDefaultSiteHostName,
  isLegacyCombinedVicenzaPadovaSiteName,
  siteBudgetNoteCanonicalKey,
} from "@/lib/siteOptions";
import { resolveSiteLogisticsUrl } from "@/lib/siteInfoLinks";
import { isSiteAvailabilityStorageName } from "@/lib/siteAvailabilityKeys";

/**
 * Find the site_budget_notes row to show/edit for a canonical site option (e.g. SITE_OPTIONS entry).
 * Matches exact site_name, then last segment after " - ", then loose substring match.
 */
export function findSiteBudgetNoteForOption(siteOption, notes) {
  const opt = String(siteOption || "").trim();
  if (!opt) return null;
  const ol = opt.toLowerCase();
  const list = (notes || []).filter((n) => !isSiteAvailabilityStorageName(n?.siteName));

  const exact = list.find((n) => n.siteName.trim().toLowerCase() === ol);
  if (exact) return exact;

  const optKey = siteBudgetNoteCanonicalKey(opt);
  if (optKey) {
    const byCanon = list.find((n) => siteBudgetNoteCanonicalKey(n.siteName) === optKey);
    if (byCanon) return byCanon;
  }

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

/**
 * Site picker list: all built-in SITE_OPTIONS plus every non-empty `site_budget_notes.site_name`
 * (e.g. from Sites → Add site). Duplicates are merged case-insensitively; legacy combined Vicenza/Padova
 * names are omitted. Sorted **A–Z** by display label.
 *
 * We intentionally do not exclude notes that fuzzy-match a canonical option elsewhere: that matching
 * is for linking rows to options, not for deciding whether a housing-added site_name appears in pickers.
 */
export function buildSiteLabelsOrdered(siteNotes) {
  const seenLower = new Set();
  const labels = [];
  const pushUnique = (raw) => {
    const s = String(raw || "").trim();
    if (!s) return;
    const k = s.toLowerCase();
    if (seenLower.has(k)) return;
    seenLower.add(k);
    labels.push(s);
  };
  for (const o of SITE_OPTIONS) pushUnique(o);
  for (const note of siteNotes || []) {
    const sn = String(note?.siteName || "").trim();
    if (!sn) continue;
    if (isSiteAvailabilityStorageName(sn)) continue;
    if (isLegacyCombinedVicenzaPadovaSiteName(sn)) continue;
    pushUnique(sn);
  }

  // Prefer correct "Niteroi" spelling over legacy "Niterio" typo.
  const hasNiteroi = labels.some((l) => l.toLowerCase() === "brazil - niteroi");
  const cleaned = hasNiteroi
    ? labels.filter((l) => l.toLowerCase() !== "brazil - niterio")
    : labels;

  cleaned.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return cleaned;
}

/** Resolve site notes for a trip using trip.location and the same rules as site options. */
export function resolveSiteBudgetNoteForTripLocation(tripLocation, notes) {
  const loc = String(tripLocation || "").trim();
  if (!loc) return null;

  const list = notes || [];
  const locKey = siteBudgetNoteCanonicalKey(loc);
  if (locKey) {
    const byCanon = list.find((n) => siteBudgetNoteCanonicalKey(n.siteName) === locKey);
    if (byCanon) return byCanon;
  }
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

  // Country-only legacy labels (e.g. "Philippines" → "Philippines - Talisay City").
  const countryMatches = SITE_OPTIONS.filter((o) =>
    o.toLowerCase().startsWith(`${locL} - `)
  );
  if (countryMatches.length === 1) return countryMatches[0];

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
    // Housing-added site (row in site_budget_notes, not in SITE_OPTIONS): use stored site_name.
    if (sn.toLowerCase() === locL) return sn;
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

/**
 * Host for recruiting/trips: staff override on `site_budget_notes`, else built-in default for the
 * canonical mission site, else empty.
 */
export function resolveEffectiveSiteHostName(rawLocation, siteBudgetNotesList = []) {
  const loc = String(rawLocation || "").trim();
  if (!loc) return "";
  const note = resolveSiteBudgetNoteForTripLocation(loc, siteBudgetNotesList);
  const override = String(note?.hostName || "").trim();
  if (override) return override;
  const canon = resolveCanonicalSiteLabelForTrip(loc, siteBudgetNotesList);
  return getDefaultSiteHostName(canon || loc) || "";
}
