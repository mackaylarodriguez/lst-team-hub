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

/** Lowercase single-spaced key for matching site_budget_notes.site_name to SITE_OPTIONS (legacy spellings). */
export function siteBudgetNoteCanonicalKey(raw) {
  const n = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!n) return "";
  const legacy = LEGACY_SITE_BUDGET_NOTE_KEYS.get(n);
  return legacy || n;
}

const LEGACY_SITE_BUDGET_NOTE_KEYS = new Map([
  ["hannover, germany", "germany - hannover"],
  ["hannover germany", "germany - hannover"],
  ["germany hannover", "germany - hannover"],
  ["hannover", "germany - hannover"],
]);

/** Hide legacy single-row Vicenza+Padova entries from Sites (use Italy - Padova / Italy - Vicenza rows). */
export function isLegacyCombinedVicenzaPadovaSiteName(siteName) {
  const s = String(siteName || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!s.includes("vicenza") || !s.includes("padova")) return false;
  return s !== "italy - vicenza" && s !== "italy - padova";
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
  "Germany - Hannover",
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
