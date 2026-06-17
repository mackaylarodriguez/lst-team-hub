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
    return `${parsed} week${parsed === 1 ? "" : "s"}`;
  }
  if (/week/i.test(raw)) return raw;
  return `${raw} weeks`;
}

/** Inclusive calendar days from depart US through project end, divided by 7 and rounded up. */
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
  return Math.ceil(days / 7);
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
