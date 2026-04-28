function digitsOnly(value) {
  return String(value || "").replace(/\D+/g, "");
}

export function formatPhoneNumber(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const digits = digitsOnly(raw);
  if (digits.length === 11 && digits.startsWith("1")) {
    const local = digits.slice(1);
    return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return raw;
}

export function toPhoneHref(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const digits = digitsOnly(raw);
  if (!digits) return raw;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return digits;
}
