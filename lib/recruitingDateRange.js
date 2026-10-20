const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const MONTH_TOKEN =
  "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec";

const RANGE_SEPARATOR = "(?:\\s*(?:-|–|—|to|through|thru)\\s*)";

const MONTH_DAY = `\\b(${MONTH_TOKEN})\\b\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?`;

const TWO_MONTH_RANGE = new RegExp(`${MONTH_DAY}${RANGE_SEPARATOR}${MONTH_DAY}`, "gi");

const SAME_MONTH_RANGE = new RegExp(
  `\\b(${MONTH_TOKEN})\\b\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?${RANGE_SEPARATOR}(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?(?!\\s*[/\\d])`,
  "gi"
);

const NUMERIC_RANGE = new RegExp(
  `\\b(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?${RANGE_SEPARATOR}(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?\\b`,
  "g"
);

const ISO_RANGE = new RegExp(
  `\\b(\\d{4}-\\d{2}-\\d{2})${RANGE_SEPARATOR}(\\d{4}-\\d{2}-\\d{2})\\b`,
  "g"
);

function monthIndex(token) {
  const normalized = String(token || "").trim().toLowerCase().replace(/\./g, "");
  if (!normalized) return -1;
  const exact = MONTH_NAMES.indexOf(normalized);
  if (exact >= 0) return exact;
  return MONTH_NAMES.findIndex((name) => name.startsWith(normalized));
}

function normalizeYear(value, fallbackYear) {
  const raw = String(value || "").trim();
  if (!raw) return Number(fallbackYear) || 0;
  const year = Number(raw.length === 2 ? `20${raw}` : raw);
  return Number.isFinite(year) ? year : Number(fallbackYear) || 0;
}

function ymdFromParts(year, monthIndexValue, day) {
  const y = Number(year);
  const m = Number(monthIndexValue);
  const d = Number(day);
  if (!Number.isFinite(y) || y < 2000 || m < 0 || m > 11 || d < 1 || d > 31) return "";
  const date = new Date(y, m, d);
  if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return "";
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function rangeFromParts(startYear, startMonth, startDay, endYear, endMonth, endDay, fallbackYear) {
  let resolvedEndYear = endYear || startYear || fallbackYear;
  const resolvedStartYear = startYear || fallbackYear;
  if (!endYear && !startYear && endMonth < startMonth) {
    resolvedEndYear = Number(fallbackYear) + 1;
  } else if (!endYear && startYear && (endMonth < startMonth || (endMonth === startMonth && endDay < startDay))) {
    resolvedEndYear = Number(startYear) + 1;
  }

  const start = ymdFromParts(resolvedStartYear, startMonth, startDay);
  const end = ymdFromParts(resolvedEndYear, endMonth, endDay);
  if (!start || !end || end < start) return null;
  return { start, end };
}

function firstMatch(pattern, text, mapMatch) {
  pattern.lastIndex = 0;
  let match = pattern.exec(text);
  while (match) {
    const parsed = mapMatch(match);
    if (parsed?.start && parsed?.end) return parsed;
    match = pattern.exec(text);
  }
  return null;
}

/**
 * Pull a departure–arrival range out of free text such as "May 25 - June 6".
 * Missing years use `year` (the recruiting tab). A range that crosses New Year
 * lands the return date in the following year.
 */
export function parseRecruitingLooseDateRange(text, year) {
  const source = String(text || "");
  const fallbackYear = Number(year);
  if (!source.trim() || !Number.isFinite(fallbackYear)) return null;

  const iso = firstMatch(ISO_RANGE, source, (match) => {
    const start = match[1];
    const end = match[2];
    if (!ymdFromParts(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1, Number(start.slice(8, 10)))) {
      return null;
    }
    if (!ymdFromParts(Number(end.slice(0, 4)), Number(end.slice(5, 7)) - 1, Number(end.slice(8, 10)))) {
      return null;
    }
    if (end < start) return null;
    return { start, end };
  });
  if (iso) return iso;

  const twoMonths = firstMatch(TWO_MONTH_RANGE, source, (match) =>
    rangeFromParts(
      normalizeYear(match[3], 0) || 0,
      monthIndex(match[1]),
      Number(match[2]),
      normalizeYear(match[6], 0) || 0,
      monthIndex(match[4]),
      Number(match[5]),
      fallbackYear
    )
  );
  if (twoMonths) return twoMonths;

  const sameMonth = firstMatch(SAME_MONTH_RANGE, source, (match) => {
    const month = monthIndex(match[1]);
    return rangeFromParts(
      normalizeYear(match[3], 0) || 0,
      month,
      Number(match[2]),
      normalizeYear(match[5], 0) || 0,
      month,
      Number(match[4]),
      fallbackYear
    );
  });
  if (sameMonth) return sameMonth;

  return firstMatch(NUMERIC_RANGE, source, (match) =>
    rangeFromParts(
      normalizeYear(match[3], 0) || 0,
      Number(match[1]) - 1,
      Number(match[2]),
      normalizeYear(match[6], 0) || 0,
      Number(match[4]) - 1,
      Number(match[5]),
      fallbackYear
    )
  );
}

export function firstRecruitingDateRange(texts, year) {
  for (const text of texts || []) {
    const parsed = parseRecruitingLooseDateRange(text, year);
    if (parsed) return parsed;
  }
  return null;
}
