import { coerceSqlDateToYmd } from "@/lib/isoDateYmd";

function isBlankDisplayValue(text) {
  const normalized = String(text ?? "").trim();
  return !normalized || normalized === "—" || normalized === "-" || normalized === "–";
}

export function firstNonBlankValue(...candidates) {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    const normalized = String(candidate).trim();
    if (!isBlankDisplayValue(normalized)) return normalized;
  }
  return "";
}

export function formatWeeksLabel(weeks) {
  const raw = String(weeks ?? "").trim();
  if (!raw) return "";
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) {
    const display = Number.isInteger(parsed) ? String(parsed) : String(parsed);
    return `${display} week${parsed === 1 ? "" : "s"}`;
  }
  if (/week/i.test(raw)) return raw;
  return `${raw} weeks`;
}

/**
 * Inclusive calendar days from depart US through project end.
 * Partial weeks: 1–4 extra days → half week (e.g. 5.5); 5–6 extra days → round up.
 */
export function computeWeeksBetweenDepartAndEnd(startDate, endDate) {
  const startYmd = coerceSqlDateToYmd(startDate);
  const endYmd = coerceSqlDateToYmd(endDate);
  if (!startYmd || !endYmd) return null;

  const start = new Date(`${startYmd}T00:00:00`);
  const end = new Date(`${endYmd}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end < start) return null;

  const days = Math.max(
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    1
  );

  const fullWeeks = Math.floor(days / 7);
  const remainderDays = days % 7;

  if (remainderDays === 0) return fullWeeks;
  if (remainderDays >= 5) return fullWeeks + 1;
  return fullWeeks + 0.5;
}

function resolveEffectiveWeeksValue(weeks, startDate, endDate) {
  const explicit = String(weeks ?? "").trim();
  if (explicit) return explicit;

  const computed = computeWeeksBetweenDepartAndEnd(startDate, endDate);
  return computed == null ? "" : String(computed);
}

export function resolveProjectLengthForLock({
  projectLengthSummary,
  weeks,
  projectDates,
  startDate,
  endDate,
} = {}) {
  const weeksLabel = formatWeeksLabel(resolveEffectiveWeeksValue(weeks, startDate, endDate));
  const dates = String(projectDates ?? "").trim();
  const summary = isBlankDisplayValue(projectLengthSummary)
    ? ""
    : String(projectLengthSummary).trim();

  if (weeksLabel) {
    if (!summary) {
      return dates ? `${weeksLabel} - ${dates}` : weeksLabel;
    }
    if (/\bweek/i.test(summary)) return summary;
    if (dates && summary === dates) {
      return `${weeksLabel} - ${dates}`;
    }
    return `${weeksLabel} - ${summary}`;
  }

  if (summary) return summary;
  return dates || "";
}
