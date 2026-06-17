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

export function resolveProjectLengthForLock({ projectLengthSummary, weeks, projectDates } = {}) {
  const weeksLabel = formatWeeksLabel(weeks);
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
