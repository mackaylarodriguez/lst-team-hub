import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const DUE_DATE_YEAR_OPTIONS = (() => {
  const end = new Date().getFullYear() + 6;
  const out = [];
  for (let y = end; y >= 2019; y--) out.push(String(y));
  return out;
})();

const DUE_DATE_MONTH_OPTIONS = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

function parseYmdParts(ymd) {
  const t = String(ymd || "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return { year: "", month: "", day: "" };
  return { year: m[1], month: String(Number(m[2])), day: String(Number(m[3])) };
}

function buildYmdFromParts(year, month, day) {
  const y = String(year);
  const mo = Number(month);
  const dd = Number(day);
  if (!y || !Number.isFinite(mo) || !Number.isFinite(dd)) return "";
  const dim = new Date(Number(y), mo, 0).getDate();
  const dClamped = Math.min(Math.max(1, dd), dim);
  return `${y}-${String(mo).padStart(2, "0")}-${String(dClamped).padStart(2, "0")}`;
}

function dayOptionsForYmd(year, month) {
  if (!year || !month) return [];
  const dim = new Date(Number(year), Number(month), 0).getDate();
  return Array.from({ length: dim }, (_, i) => String(i + 1));
}

/** No native calendar popup — avoids month arrows closing editors mid-selection. */
const AppDueDateTripleSelect = forwardRef(function AppDueDateTripleSelect(
  { value, onChange, compact = false },
  ref
) {
  const [parts, setParts] = useState(() => parseYmdParts(value));
  const partsRef = useRef(parts);
  partsRef.current = parts;

  useEffect(() => {
    setParts(parseYmdParts(value));
  }, [value]);

  useImperativeHandle(ref, () => ({
    /** `YYYY-MM-DD` when complete, `""` when all cleared, `null` when partially selected. */
    getDueYmd() {
      const p = partsRef.current;
      if (!p.year && !p.month && !p.day) return "";
      if (p.year && p.month && p.day) return buildYmdFromParts(p.year, p.month, p.day);
      return null;
    },
  }));

  const emit = (next) => {
    partsRef.current = next;
    setParts(next);
    if (next.year && next.month && next.day) {
      onChange(buildYmdFromParts(next.year, next.month, next.day));
    } else if (!next.year && !next.month && !next.day) {
      onChange("");
    }
  };

  const { year, month, day } = parts;
  const days = dayOptionsForYmd(year, month);
  const inputStyle = compact
    ? { padding: "6px 8px", fontSize: 12, minWidth: 0 }
    : { padding: "7px 10px", fontSize: 13, minWidth: 0 };

  return (
    <div className="row" style={{ flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      <select
        className="input"
        aria-label="Date year"
        style={{ ...inputStyle, width: compact ? 76 : 90 }}
        value={year}
        onChange={(e) => {
          const y = e.target.value;
          if (!y) emit({ year: "", month: "", day: "" });
          else emit({ year: y, month: "", day: "" });
        }}
      >
        <option value="">Year</option>
        {DUE_DATE_YEAR_OPTIONS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select
        className="input"
        aria-label="Date month"
        disabled={!year}
        style={{ ...inputStyle, width: compact ? 72 : 80 }}
        value={month}
        onChange={(e) => {
          const mo = e.target.value;
          if (!mo) emit({ year, month: "", day: "" });
          else emit({ year, month: mo, day: "" });
        }}
      >
        <option value="">Month</option>
        {DUE_DATE_MONTH_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        className="input"
        aria-label="Date day"
        disabled={!year || !month}
        style={{ ...inputStyle, width: compact ? 54 : 62 }}
        value={day}
        onChange={(e) => {
          const d = e.target.value;
          if (!d) emit({ year, month, day: "" });
          else if (year && month) emit({ year, month, day: d });
        }}
      >
        <option value="">Day</option>
        {days.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
});
AppDueDateTripleSelect.displayName = "AppDueDateTripleSelect";

export default AppDueDateTripleSelect;
