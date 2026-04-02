import {
  normalizeTshirtSizeForSelect,
  TSHIRT_SIZE_OPTION_SET,
  TSHIRT_SIZE_OPTIONS,
} from "@/lib/tshirtSizes";

export default function RosterTshirtSizeSelect({
  value,
  onChange,
  className = "input",
  id,
  "aria-label": ariaLabel,
}) {
  const v = normalizeTshirtSizeForSelect(value);
  const legacy = v !== "" && !TSHIRT_SIZE_OPTION_SET.has(v);

  return (
    <select
      className={className}
      id={id}
      aria-label={ariaLabel}
      value={v}
      onChange={onChange}
    >
      <option value="">T-shirt size</option>
      {TSHIRT_SIZE_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
      {legacy ? (
        <option value={v}>{v} (saved)</option>
      ) : null}
    </select>
  );
}
