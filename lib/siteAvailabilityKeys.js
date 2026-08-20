/** Hidden rows that used to store availability inside site_budget_notes (legacy only). */
export const SITE_AVAILABILITY_STORAGE_PREFIX = "__lst_availability__:";

export function isSiteAvailabilityStorageName(siteName) {
  return String(siteName || "").startsWith(SITE_AVAILABILITY_STORAGE_PREFIX);
}

export function siteAvailabilityStorageName(siteLabel, year) {
  return `${SITE_AVAILABILITY_STORAGE_PREFIX}${Number(year)}:${String(siteLabel || "").trim()}`;
}

export function parseSiteAvailabilityStorageName(siteName) {
  const raw = String(siteName || "");
  if (!isSiteAvailabilityStorageName(raw)) return null;
  const rest = raw.slice(SITE_AVAILABILITY_STORAGE_PREFIX.length);
  const colon = rest.indexOf(":");
  if (colon <= 0) return null;
  const year = Number(rest.slice(0, colon));
  const siteLabel = rest.slice(colon + 1).trim();
  if (!Number.isFinite(year) || !siteLabel) return null;
  return { year, siteLabel };
}
