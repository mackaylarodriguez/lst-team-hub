function isBlankDisplayValue(text) {
  const normalized = String(text ?? "").trim();
  return !normalized || normalized === "—" || normalized === "-" || normalized === "–";
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

export function resolveProjectLengthForLock({ projectLengthSummary, weeks, projectDates } = {}) {
  if (!isBlankDisplayValue(projectLengthSummary)) {
    return String(projectLengthSummary).trim();
  }

  const weeksLabel = formatWeeksLabel(weeks);
  const dates = String(projectDates ?? "").trim();
  if (weeksLabel && dates) return `${weeksLabel} - ${dates}`;
  return weeksLabel || dates || "";
}
