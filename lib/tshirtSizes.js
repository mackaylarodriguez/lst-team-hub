/** Standard unisex adult sizes for roster T-shirt dropdowns. */
export const TSHIRT_SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

const LOWER_TO_CANON = new Map(TSHIRT_SIZE_OPTIONS.map((o) => [o.toLowerCase(), o]));

export const TSHIRT_SIZE_OPTION_SET = new Set(TSHIRT_SIZE_OPTIONS);

/** Map common casing (e.g. "m" → "M") so the select stays controlled; unknown strings pass through. */
export function normalizeTshirtSizeForSelect(raw) {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  return LOWER_TO_CANON.get(v.toLowerCase()) || v;
}
