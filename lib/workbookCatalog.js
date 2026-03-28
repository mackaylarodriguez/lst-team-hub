/**
 * Workbook / book series for site materials (Sites page grid).
 * Order: Core → Discover → Advanced. Keys are stable for parsing saved inventory strings.
 */
import { normalizeWorkbookNameKey } from "@/lib/workbookInventory";

/** Header styling per series (Sites workbook table <th>). */
export const WORKBOOK_SERIES_HEADER_STYLE = {
  core: {
    background: "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)",
    color: "#9a3412",
    borderBottom: "2px solid #fb923c",
  },
  discover: {
    background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
    color: "#1d4ed8",
    borderBottom: "2px solid #60a5fa",
  },
  advanced: {
    background: "linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)",
    color: "#6d28d9",
    borderBottom: "2px solid #a78bfa",
  },
};

/**
 * Canonical columns in display order. `key` is the normalized id used in the grid and when merging notes.
 * `series` groups columns for header colors.
 */
export const WORKBOOK_REFERENCE_COLUMNS = [
  { key: "luke 1", label: "LUKE 1", series: "core" },
  { key: "luke 2", label: "LUKE 2", series: "core" },
  { key: "acts 1", label: "ACTS 1", series: "core" },
  { key: "acts 2", label: "ACTS 2", series: "core" },
  { key: "john", label: "JOHN", series: "discover" },
  { key: "questions", label: "QUESTIONS", series: "discover" },
  { key: "james", label: "JAMES", series: "discover" },
  { key: "good news", label: "GOOD NEWS", series: "discover" },
  { key: "heroes", label: "HEROES", series: "advanced" },
  { key: "esther", label: "ESTHER", series: "advanced" },
  { key: "reflections", label: "REFLECTIONS", series: "advanced" },
  { key: "origins", label: "ORIGINS", series: "advanced" },
];

const CANONICAL_KEYS = new Set(WORKBOOK_REFERENCE_COLUMNS.map((c) => c.key));

/** Map legacy / alternate spellings (normalized) → canonical column key. */
const ALIAS_TO_CANONICAL = new Map([
  ["beginner 1", "luke 1"],
  ["beginner 2", "luke 2"],
  ["luke", "luke 1"],
  ["reflection", "reflections"],
]);

/**
 * Resolve a line title from saved workbook text to a canonical column key.
 * Unknown titles pass through normalized so extra columns still work.
 */
export function workbookNameToCanonicalKey(name) {
  const n = normalizeWorkbookNameKey(name);
  if (!n) return "";
  if (ALIAS_TO_CANONICAL.has(n)) return ALIAS_TO_CANONICAL.get(n);
  if (CANONICAL_KEYS.has(n)) return n;
  return n;
}

/** @deprecated Prefer WORKBOOK_REFERENCE_COLUMNS — kept for any external string checks. */
export const WORKBOOK_REFERENCE_TITLES = WORKBOOK_REFERENCE_COLUMNS.map((c) => c.label);
