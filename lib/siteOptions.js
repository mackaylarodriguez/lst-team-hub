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
  ["murcia, spain", "spain - murcia alcantarilla"],
  ["philippines", "philippines - talisay city"],
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
  "Albania - Elbasan",
  "Angola - Huambo",
  "Argentina - Buenos Aires",
  "Austria - Vienna",
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
  "Philippines - Talisay City",
  "Poland - Krakow",
  "Poland - Lodz",
  "South Korea - Seoul",
  "Spain - Murcia Alcantarilla",
  "USA - Massachusetts - West Springfield",
];

/** Built-in default host when `site_budget_notes.host_name` is empty (staff can override on Sites). */
const DEFAULT_SITE_HOST_BY_LOWER = new Map([
  ["albania - elbasan", "Mondi Gjonie"],
  ["angola - huambo", "Nathan"],
  ["argentina - buenos aires", "Joel Banks"],
  ["austria - vienna", "Amada Haskew"],
  ["brazil - florianopolis", "Otavio Calegari Neto"],
  ["brazil - joao pessoa", "Raniere Menezes"],
  ["brazil - ponta grossa", "Marisa Signoretti"],
  ["brazil - rio de janeiro", "Jefferson Che"],
  ["croatia - zagreb", "Mislav Ilic"],
  ["ecuador - tabacundo", "Rusty Campbell"],
  ["germany - hannover", "LST"],
  ["italy - lecce", "Pino Neglia"],
  ["italy - padova", "Richard Allen"],
  ["italy - vicenza", "Sara Brazzale"],
  ["japan - kasama", "Jeanne Ray"],
  ["japan - machida (tokyo)", "Tim Turner"],
  ["philippines - talisay city", "Wayne Pabillion"],
  ["poland - krakow", "Jay Bowyer"],
  ["poland - lodz", "Lukasz Wysocki"],
  ["south korea - seoul", "Anne Youngran"],
  ["spain - murcia alcantarilla", "Erik Estrada"],
  ["usa - massachusetts - west springfield", "Gareth Flanary"],
]);

export function getDefaultSiteHostName(canonicalOrLocationLabel) {
  const key = String(canonicalOrLocationLabel || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!key) return "";
  return DEFAULT_SITE_HOST_BY_LOWER.get(key) || "";
}

/** True when the label is one of the built-in SITE_OPTIONS entries. */
export function isBuiltInPartnerSiteLabel(label) {
  const lower = String(label || "")
    .trim()
    .toLowerCase();
  if (!lower) return false;
  return SITE_OPTIONS.some((opt) => opt.toLowerCase() === lower);
}

/** True when the Sites availability site type is Partner Site. */
export function isPartnerSiteType(siteType) {
  const lower = String(siteType || "")
    .trim()
    .toLowerCase();
  return (
    lower === "partner site" ||
    lower === "partner" ||
    lower === "partner managed"
  );
}
