/** Trim and collapse internal whitespace (site names are stored as plain text). */
export function normalizeSiteOptionLabel(raw) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Mission sites use a spaced hyphen between parts, e.g. "Brazil - Joao Pessoa" or
 * "USA - Massachusetts - West Springfield".
 */
export function isValidSiteOptionLabelFormat(label) {
  const s = normalizeSiteOptionLabel(label);
  if (!s) return false;
  const parts = s.split(/\s-\s/).map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 && parts.every((p) => p.length > 0);
}

export const SITE_OPTIONS = [
  "Angola - Huambo",
  "Argentina - Buenos Aires",
  "Brazil - Florianopolis",
  "Brazil - Joao Pessoa",
  "Brazil - Ponta Grossa",
  "Brazil - Rio de Janeiro",
  "Croatia - Zagreb",
  "Ecuador - Tabacundo",
  "Italy - Lecce",
  "Italy - Padova",
  "Italy - Vicenza",
  "Japan - Kasama",
  "Japan - Machida (Tokyo)",
  "Philippines",
  "Poland - Krakow",
  "Poland - Lodz",
  "Spain - Murcia Alcantarilla",
  "USA - Massachusetts - West Springfield",
];
