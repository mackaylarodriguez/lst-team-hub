/**
 * Coerce Postgres `date`, JS Date, or ISO timestamp strings to `YYYY-MM-DD` for forms and APIs.
 * Returns null when there is no parseable date prefix.
 */
export function coerceSqlDateToYmd(value) {
  if (value == null || value === "") return null;
  const t = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Value safe to send to Postgres `date` columns, or null to clear. */
export function toPgDateOrNull(value) {
  const ymd = coerceSqlDateToYmd(value);
  if (ymd) return ymd;
  const s = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}
