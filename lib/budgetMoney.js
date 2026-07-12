export const USD_CURRENCY_FORMAT = {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

export function parseCurrencyLike(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatUsdNumber(n) {
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("en-US", USD_CURRENCY_FORMAT).format(n);
}

export function formatUsdDisplay(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatUsdNumber(value);
  }
  const raw = String(value).trim();
  if (!raw) return "";
  const n = parseCurrencyLike(raw);
  if (n === null) return raw;
  return formatUsdNumber(n);
}

export function normalizeMoneyInputToUsd(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const n = parseCurrencyLike(trimmed);
  if (n === null) return trimmed;
  return formatUsdNumber(n);
}

export function computeTotalLstCost(totalTicketCost, amountWorkerPaid) {
  if (!String(totalTicketCost ?? "").trim() && !String(amountWorkerPaid ?? "").trim()) return "";
  const total = parseCurrencyLike(totalTicketCost) ?? 0;
  const paid = parseCurrencyLike(amountWorkerPaid) ?? 0;
  return formatUsdNumber(total - paid);
}

export function defaultIntlDomForLocation(location) {
  const text = String(location || "").toLowerCase();
  return text.includes("massachusetts") ? "Dom" : "Intl";
}
