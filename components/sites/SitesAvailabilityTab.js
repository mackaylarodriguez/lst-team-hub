import { useEffect, useMemo, useState } from "react";

const MONTHS = [
  { key: 1, label: "January", short: "Jan" },
  { key: 2, label: "February", short: "Feb" },
  { key: 3, label: "March", short: "Mar" },
  { key: 4, label: "April", short: "Apr" },
  { key: 5, label: "May", short: "May" },
  { key: 6, label: "June", short: "Jun" },
  { key: 7, label: "July", short: "Jul" },
  { key: 8, label: "August", short: "Aug" },
  { key: 9, label: "September", short: "Sep" },
  { key: 10, label: "October", short: "Oct" },
  { key: 11, label: "November", short: "Nov" },
  { key: 12, label: "December", short: "Dec" },
];

const WEEK_BLOCKS = [
  { key: 1, label: "1–7", startDay: 1, endDay: 7 },
  { key: 2, label: "8–14", startDay: 8, endDay: 14 },
  { key: 3, label: "15–21", startDay: 15, endDay: 21 },
  { key: 4, label: "22–end", startDay: 22, endDay: null },
];

/** Soft palette — readable without neon green/red. */
const CELL = {
  outside: {
    label: "Closed",
    title: "Outside available season / not hosting",
    background: "#e8eef5",
    color: "#64748b",
    border: "#cbd5e1",
  },
  open: {
    label: "Open",
    title: "Available all month",
    background: "#d8efe4",
    color: "#1f5c45",
    border: "#b5dcc9",
  },
  partial: {
    label: "Part",
    title: "Available part of the month (see weekly calendar)",
    background: "#e7f6ee",
    color: "#2d6a4f",
    border: "#c5e6d4",
  },
  booked: {
    label: "Locked",
    title: "Team locked / booked",
    background: "#f3d6d6",
    color: "#8b3a3a",
    border: "#e0b4b4",
  },
  excluded: {
    label: "Hold",
    title: "Excluded / host unavailable",
    background: "#eceff3",
    color: "#5b6573",
    border: "#d0d5dd",
  },
};

const VISIBLE_SITES_STORAGE_KEY = "lst-sites-availability-visible-v1";
const EDITS_STORAGE_KEY = "lst-sites-availability-edits-v1";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toYmd(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function parseYmd(value) {
  const raw = String(value || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const maxDay = daysInMonth(year, month);
  if (day > maxDay) return null;
  return { year, month, day, ymd: toYmd(year, month, day) };
}

function ymdTime(ymd) {
  const parsed = parseYmd(ymd);
  if (!parsed) return NaN;
  return Date.UTC(parsed.year, parsed.month - 1, parsed.day);
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const a0 = ymdTime(aStart);
  const a1 = ymdTime(aEnd);
  const b0 = ymdTime(bStart);
  const b1 = ymdTime(bEnd);
  if ([a0, a1, b0, b1].some((n) => Number.isNaN(n))) return false;
  return a0 <= b1 && b0 <= a1;
}

function clampRange(startYmd, endYmd) {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);
  if (!start || !end) return { start: startYmd, end: endYmd };
  if (ymdTime(start.ymd) <= ymdTime(end.ymd)) {
    return { start: start.ymd, end: end.ymd };
  }
  return { start: end.ymd, end: start.ymd };
}

function formatDateLabel(ymd) {
  const parsed = parseYmd(ymd);
  if (!parsed) return String(ymd || "");
  const month = MONTHS.find((m) => m.key === parsed.month)?.short || String(parsed.month);
  return `${month} ${parsed.day}`;
}

function formatDateRangeLabel(startYmd, endYmd, year) {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);
  if (!start || !end) return "Set dates";
  if (start.month === 1 && start.day === 1 && end.month === 12 && end.day === 31) {
    return "Year-round";
  }
  const sameYear = start.year === end.year;
  const left = formatDateLabel(start.ymd);
  const right = formatDateLabel(end.ymd);
  if (sameYear && start.year === year) return `${left} – ${right}`;
  if (sameYear) return `${left} – ${right}, ${start.year}`;
  return `${left}, ${start.year} – ${right}, ${end.year}`;
}

function monthBounds(year, month) {
  return {
    start: toYmd(year, month, 1),
    end: toYmd(year, month, daysInMonth(year, month)),
  };
}

function weekBounds(year, month, weekKey) {
  const block = WEEK_BLOCKS.find((w) => w.key === weekKey);
  const lastDay = daysInMonth(year, month);
  const startDay = block?.startDay || 1;
  const endDay = Math.min(block?.endDay || lastDay, lastDay);
  if (startDay > lastDay) {
    return { start: toYmd(year, month, lastDay), end: toYmd(year, month, lastDay) };
  }
  return {
    start: toYmd(year, month, startDay),
    end: toYmd(year, month, endDay),
  };
}

function editStorageKey(siteLabel, year) {
  return `${siteLabel}||${year}`;
}

function loadEditsMap() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(EDITS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveEditsMap(map) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EDITS_STORAGE_KEY, JSON.stringify(map || {}));
  } catch {
    /* ignore quota */
  }
}

function normalizeHold(row) {
  const clamped = clampRange(row?.start, row?.end);
  return {
    id: row?.id || `hold-${Math.random().toString(36).slice(2, 9)}`,
    start: clamped.start,
    end: clamped.end,
    note: String(row?.note || "").trim() || "Hold",
  };
}

function normalizeBooking(row) {
  const clamped = clampRange(row?.start, row?.end);
  return {
    id: row?.id || `book-${Math.random().toString(36).slice(2, 9)}`,
    teamName: String(row?.teamName || "").trim() || "Locked team",
    start: clamped.start,
    end: clamped.end,
  };
}

function normalizeAvailability(row) {
  const year = Number(row?.year) || new Date().getFullYear();
  const available = clampRange(
    row?.availableStart || toYmd(year, 4, 1),
    row?.availableEnd || toYmd(year, 8, 31)
  );
  const exclusions = (row?.exclusions || []).map(normalizeHold);
  const bookings = (row?.bookings || []).map(normalizeBooking);
  const teamNotes = Array.isArray(row?.teamNotes)
    ? row.teamNotes.map((n) => String(n || "").trim()).filter(Boolean)
    : String(row?.teamNotesText || "")
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);

  return {
    siteLabel: row?.siteLabel || "",
    year,
    availableStart: available.start,
    availableEnd: available.end,
    availableLabel: formatDateRangeLabel(available.start, available.end, year),
    exclusions,
    bookings,
    teamNotes,
    siteType: String(row?.siteType || "Partner site").trim() || "Partner site",
    churchName: row?.churchName || row?.siteLabel || "",
    isEdited: Boolean(row?.isEdited),
  };
}

/** Deterministic mock season / exclusions / bookings used as defaults. */
function buildMockAvailabilityForSite(siteLabel, year) {
  const lower = String(siteLabel || "").toLowerCase();
  let availableStart = toYmd(year, 4, 1);
  let availableEnd = toYmd(year, 8, 31);
  const exclusions = [];
  const bookings = [];
  const teamNotes = [];
  let siteType = "Partner site";

  if (lower.includes("usa") || lower.includes("springfield")) {
    availableStart = toYmd(year, 6, 1);
    availableEnd = toYmd(year, 8, 31);
  } else if (lower.includes("japan") || lower.includes("korea") || lower.includes("philippines")) {
    availableStart = toYmd(year, 1, 1);
    availableEnd = toYmd(year, 12, 31);
    siteType = "Centurion Site";
  } else if (lower.includes("angola") || lower.includes("ecuador")) {
    availableStart = toYmd(year, 5, 1);
    availableEnd = toYmd(year, 9, 30);
  } else if (lower.includes("brazil")) {
    availableStart = toYmd(year, 2, 1);
    availableEnd = toYmd(year, 11, 30);
  } else if (lower.includes("mut") || lower.includes("university")) {
    availableStart = toYmd(year, 4, 1);
    availableEnd = toYmd(year, 8, 31);
    siteType = "Centurion Site";
    teamNotes.push("2 – 4 team members");
    teamNotes.push("campus, church, women, older");
    teamNotes.push("REALLY want a 6 – 7 week program!");
    teamNotes.push("Best time to host is April – July (students out part of July and August).");
  }

  if (lower.includes("hannover")) {
    exclusions.push({
      id: "mock-hold-hannover",
      start: toYmd(year, 6, 12),
      end: toYmd(year, 6, 18),
      note: "Host family unavailable",
    });
    bookings.push({
      id: "mock-book-hannover",
      teamName: "Team Rivera",
      start: toYmd(year, 7, 5),
      end: toYmd(year, 7, 25),
    });
  } else if (lower.includes("vienna")) {
    bookings.push({
      id: "mock-book-vienna-1",
      teamName: "Team Cole",
      start: toYmd(year, 5, 10),
      end: toYmd(year, 5, 31),
    });
    bookings.push({
      id: "mock-book-vienna-2",
      teamName: "Team Park",
      start: toYmd(year, 9, 1),
      end: toYmd(year, 9, 20),
    });
  } else if (lower.includes("murcia")) {
    exclusions.push({
      id: "mock-hold-murcia",
      start: toYmd(year, 8, 1),
      end: toYmd(year, 8, 10),
      note: "Local festival / housing closed",
    });
  } else if (lower.includes("krakow")) {
    bookings.push({
      id: "mock-book-krakow",
      teamName: "Team Nguyen",
      start: toYmd(year, 6, 15),
      end: toYmd(year, 7, 12),
    });
  } else if (lower.includes("padova")) {
    exclusions.push({
      id: "mock-hold-padova",
      start: toYmd(year, 4, 18),
      end: toYmd(year, 4, 21),
      note: "Easter blackout",
    });
  } else if (lower.includes("west springfield")) {
    bookings.push({
      id: "mock-book-springfield",
      teamName: "Team Brooks",
      start: toYmd(year, 7, 1),
      end: toYmd(year, 7, 26),
    });
  } else if (lower.includes("zagreb")) {
    bookings.push({
      id: "mock-book-zagreb",
      teamName: "Team Ellis",
      start: toYmd(year, 8, 3),
      end: toYmd(year, 8, 24),
    });
  } else if (lower.includes("joao pessoa") || lower.includes("florianopolis")) {
    bookings.push({
      id: "mock-book-brazil",
      teamName: lower.includes("florianopolis") ? "Team Costa" : "Team Alves",
      start: toYmd(year, 3, 8),
      end: toYmd(year, 3, 29),
    });
  } else if (lower.includes("mut") || lower.includes("university")) {
    bookings.push({
      id: "mock-book-mut",
      teamName: "MUT 4",
      start: toYmd(year, 4, 15),
      end: toYmd(year, 4, 23),
    });
  }

  return normalizeAvailability({
    siteLabel,
    year,
    availableStart,
    availableEnd,
    exclusions,
    bookings,
    teamNotes,
    siteType,
    churchName: siteLabel,
    isEdited: false,
  });
}

function mergeAvailability(siteLabel, year, editsMap) {
  const base = buildMockAvailabilityForSite(siteLabel, year);
  const saved = editsMap?.[editStorageKey(siteLabel, year)];
  if (!saved) return base;
  return normalizeAvailability({
    ...base,
    ...saved,
    siteLabel,
    year,
    isEdited: true,
  });
}

function monthStatus(availability, month) {
  const year = availability.year;
  const bounds = monthBounds(year, month);
  if (
    !rangesOverlap(
      availability.availableStart,
      availability.availableEnd,
      bounds.start,
      bounds.end
    )
  ) {
    return "outside";
  }

  const openStart =
    ymdTime(availability.availableStart) > ymdTime(bounds.start)
      ? availability.availableStart
      : bounds.start;
  const openEnd =
    ymdTime(availability.availableEnd) < ymdTime(bounds.end)
      ? availability.availableEnd
      : bounds.end;

  const hasBooking = (availability.bookings || []).some((row) =>
    rangesOverlap(row.start, row.end, openStart, openEnd)
  );
  if (hasBooking) return "booked";

  const hasHold = (availability.exclusions || []).some((row) =>
    rangesOverlap(row.start, row.end, openStart, openEnd)
  );
  if (hasHold) return "excluded";

  const coversFullMonth =
    ymdTime(availability.availableStart) <= ymdTime(bounds.start) &&
    ymdTime(availability.availableEnd) >= ymdTime(bounds.end);
  return coversFullMonth ? "open" : "partial";
}

function weekStatus(availability, month, weekKey) {
  const year = availability.year;
  const bounds = weekBounds(year, month, weekKey);

  if (
    !rangesOverlap(
      availability.availableStart,
      availability.availableEnd,
      bounds.start,
      bounds.end
    )
  ) {
    return { status: "outside", label: "" };
  }

  for (const exclusion of availability.exclusions || []) {
    if (rangesOverlap(exclusion.start, exclusion.end, bounds.start, bounds.end)) {
      return { status: "excluded", label: exclusion.note || "Hold" };
    }
  }

  for (const booking of availability.bookings || []) {
    if (rangesOverlap(booking.start, booking.end, bounds.start, bounds.end)) {
      return { status: "booked", label: booking.teamName || "Locked" };
    }
  }

  return { status: "open", label: "" };
}

function AvailabilityCell({ status, compact = false }) {
  const style = CELL[status] || CELL.outside;
  return (
    <div
      title={style.title}
      className="sitesAvailabilityCell"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: compact ? 26 : 30,
        width: "100%",
        padding: compact ? "3px 4px" : "5px 6px",
        borderRadius: 8,
        fontSize: compact ? 10 : 11,
        fontWeight: 900,
        letterSpacing: "0.01em",
        background: style.background,
        color: style.color,
        border: `1px solid ${style.border}`,
        boxSizing: "border-box",
        textShadow: "none",
      }}
    >
      {style.label}
    </div>
  );
}

function LegendSwatch({ status }) {
  const style = CELL[status];
  return (
    <span className="sitesAvailabilityLegendItem">
      <span
        className="sitesAvailabilityLegendSwatch"
        style={{
          background: style.background,
          borderColor: style.border,
        }}
      />
      {style.title}
    </span>
  );
}

function loadVisibleSiteSet(siteLabels) {
  const all = (siteLabels || []).map(String);
  if (typeof window === "undefined") return new Set(all);
  try {
    const raw = window.localStorage.getItem(VISIBLE_SITES_STORAGE_KEY);
    if (!raw) return new Set(all);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set(all);
    const allowed = new Set(all);
    const next = parsed.map(String).filter((label) => allowed.has(label));
    return new Set(next.length ? next : all);
  } catch {
    return new Set(all);
  }
}

function blankEditDraft(availability) {
  return {
    availableStart: availability.availableStart,
    availableEnd: availability.availableEnd,
    siteType: availability.siteType,
    teamNotesText: (availability.teamNotes || []).join("\n"),
    exclusions: (availability.exclusions || []).map((row) => ({ ...row })),
    bookings: (availability.bookings || []).map((row) => ({ ...row })),
  };
}

/**
 * Availability overview + weekly detail + edit panel.
 * Edits persist in localStorage until a database is wired.
 */
export default function SitesAvailabilityTab({ siteLabels = [] }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedSite, setSelectedSite] = useState("");
  const [visibleSites, setVisibleSites] = useState(() => new Set());
  const [showSitePicker, setShowSitePicker] = useState(false);
  const [siteFilter, setSiteFilter] = useState("");
  const [editsMap, setEditsMap] = useState({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    setVisibleSites(loadVisibleSiteSet(siteLabels));
    setEditsMap(loadEditsMap());
  }, [siteLabels]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        VISIBLE_SITES_STORAGE_KEY,
        JSON.stringify([...visibleSites])
      );
    } catch {
      /* ignore quota */
    }
  }, [visibleSites]);

  const rows = useMemo(
    () =>
      (siteLabels || []).map((siteLabel) => mergeAvailability(siteLabel, year, editsMap)),
    [siteLabels, year, editsMap]
  );

  const visibleRows = useMemo(
    () => rows.filter((row) => visibleSites.has(row.siteLabel)),
    [rows, visibleSites]
  );

  const selected = useMemo(() => {
    const label = selectedSite || visibleRows[0]?.siteLabel || "";
    return rows.find((row) => row.siteLabel === label) || null;
  }, [rows, selectedSite, visibleRows]);

  useEffect(() => {
    if (!selectedSite) return;
    if (!visibleSites.has(selectedSite) && visibleRows[0]) {
      setSelectedSite(visibleRows[0].siteLabel);
    }
  }, [selectedSite, visibleSites, visibleRows]);

  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setSaveMessage("");
  }, [selectedSite, year]);

  const filteredPickerLabels = useMemo(() => {
    const needle = String(siteFilter || "").trim().toLowerCase();
    if (!needle) return siteLabels || [];
    return (siteLabels || []).filter((label) =>
      String(label).toLowerCase().includes(needle)
    );
  }, [siteLabels, siteFilter]);

  const visibleCount = visibleRows.length;
  const totalCount = rows.length;

  function toggleSite(label) {
    setVisibleSites((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function showAllSites() {
    setVisibleSites(new Set(siteLabels || []));
  }

  function hideAllSites() {
    setVisibleSites(new Set());
  }

  function openEditor() {
    if (!selected) return;
    setDraft(blankEditDraft(selected));
    setEditing(true);
    setSaveMessage("");
  }

  function cancelEditor() {
    setEditing(false);
    setDraft(null);
    setSaveMessage("");
  }

  function updateDraft(patch) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function updateHold(id, patch) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        exclusions: current.exclusions.map((row) =>
          row.id === id ? { ...row, ...patch } : row
        ),
      };
    });
  }

  function removeHold(id) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        exclusions: current.exclusions.filter((row) => row.id !== id),
      };
    });
  }

  function addHold() {
    if (!selected) return;
    const start = selected.availableStart;
    const end = selected.availableStart;
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        exclusions: [
          ...current.exclusions,
          normalizeHold({ start, end, note: "Host unavailable" }),
        ],
      };
    });
  }

  function updateBooking(id, patch) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        bookings: current.bookings.map((row) =>
          row.id === id ? { ...row, ...patch } : row
        ),
      };
    });
  }

  function removeBooking(id) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        bookings: current.bookings.filter((row) => row.id !== id),
      };
    });
  }

  function addBooking() {
    if (!selected) return;
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        bookings: [
          ...current.bookings,
          normalizeBooking({
            teamName: "New team",
            start: current.availableStart,
            end: current.availableEnd,
          }),
        ],
      };
    });
  }

  function saveEditor() {
    if (!selected || !draft) return;
    const available = clampRange(draft.availableStart, draft.availableEnd);
    if (!parseYmd(available.start) || !parseYmd(available.end)) {
      setSaveMessage("Enter valid Available from / to dates.");
      return;
    }

    const payload = {
      availableStart: available.start,
      availableEnd: available.end,
      siteType: String(draft.siteType || "").trim() || "Partner site",
      teamNotes: String(draft.teamNotesText || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      exclusions: (draft.exclusions || []).map(normalizeHold),
      bookings: (draft.bookings || []).map(normalizeBooking),
      churchName: selected.siteLabel,
    };

    const key = editStorageKey(selected.siteLabel, year);
    const nextMap = { ...editsMap, [key]: payload };
    setEditsMap(nextMap);
    saveEditsMap(nextMap);
    setEditing(false);
    setDraft(null);
    setSaveMessage("Saved on this browser (not in the database yet).");
  }

  function resetToSample() {
    if (!selected) return;
    const key = editStorageKey(selected.siteLabel, year);
    const nextMap = { ...editsMap };
    delete nextMap[key];
    setEditsMap(nextMap);
    saveEditsMap(nextMap);
    const base = buildMockAvailabilityForSite(selected.siteLabel, year);
    setDraft(blankEditDraft(base));
    setSaveMessage("Reset to sample defaults for this site/year.");
  }

  return (
    <div className="card pad sitesAvailabilityRoot" style={{ marginBottom: 24 }}>
      <div
        className="row"
        style={{
          marginBottom: 12,
          gap: 12,
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Sites availability overview</div>
          <p className="small" style={{ margin: 0, color: "var(--muted)", lineHeight: 1.45 }}>
            Set exact date ranges (e.g. Sep 16 – Nov 14). Months show Open / Part / Locked /
            Hold; the weekly calendar shows the precise weeks.
          </p>
        </div>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label className="small" style={{ fontWeight: 700, color: "var(--muted)" }}>
            Year
          </label>
          <select
            className="input"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: 110, padding: "6px 10px" }}
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn"
            onClick={() => setShowSitePicker((open) => !open)}
          >
            {showSitePicker ? "Hide site list" : "Choose sites"}
          </button>
        </div>
      </div>

      <div className="sitesAvailabilityBanner">
        Edits save in this browser for now. Showing {visibleCount} of {totalCount} sites.
        {saveMessage ? ` ${saveMessage}` : ""}
      </div>

      {showSitePicker ? (
        <div className="sitesAvailabilityPicker">
          <div
            className="row"
            style={{
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 10,
              justifyContent: "space-between",
            }}
          >
            <div className="small" style={{ fontWeight: 800, color: "var(--muted)" }}>
              Sites on the grid
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn" onClick={showAllSites}>
                Show all
              </button>
              <button type="button" className="btn" onClick={hideAllSites}>
                Hide all
              </button>
            </div>
          </div>
          <input
            className="input"
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            placeholder="Filter sites…"
            style={{ marginBottom: 10 }}
          />
          <div className="sitesAvailabilityPickerGrid">
            {filteredPickerLabels.map((label) => {
              const checked = visibleSites.has(label);
              return (
                <label key={label} className="sitesAvailabilityPickerItem">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSite(label)}
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        className="row"
        style={{ gap: 14, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}
      >
        <LegendSwatch status="outside" />
        <LegendSwatch status="open" />
        <LegendSwatch status="partial" />
        <LegendSwatch status="booked" />
        <LegendSwatch status="excluded" />
      </div>

      {visibleRows.length === 0 ? (
        <div className="small" style={{ color: "var(--muted)", marginBottom: 12 }}>
          No sites selected. Use <strong>Choose sites</strong> to check which sites appear on the
          grid.
        </div>
      ) : (
        <div className="sitesAvailabilityScroller">
          <table
            className="table sitesWorkbookTable dataTableStriped sitesAvailabilityTable"
            style={{
              width: "100%",
              fontSize: 12,
            }}
          >
            <colgroup>
              <col className="sitesAvailabilitySiteCol" />
              {MONTHS.map((month) => (
                <col key={month.key} className="sitesAvailabilityMonthCol" />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th
                  className="sitesWorkbookCorner sitesAvailabilitySiteHead"
                >
                  Site
                </th>
                {MONTHS.map((month) => (
                  <th
                    key={month.key}
                    className="sitesWorkbookQtyHead"
                    style={{
                      textAlign: "center",
                      background: "rgba(248, 250, 252, 0.98)",
                      color: "var(--muted)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {month.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const isSelected = selected?.siteLabel === row.siteLabel;
                return (
                  <tr
                    key={row.siteLabel}
                    onClick={() => setSelectedSite(row.siteLabel)}
                    style={{
                      cursor: "pointer",
                      outline: isSelected ? "2px solid rgba(239, 68, 68, 0.35)" : undefined,
                      outlineOffset: -2,
                    }}
                  >
                    <td
                      className="sitesWorkbookSiteCell sitesAvailabilitySiteCell"
                      style={{
                        fontWeight: 700,
                        background: isSelected ? "rgba(239, 68, 68, 0.06)" : undefined,
                      }}
                      title={row.siteLabel}
                    >
                      <div style={{ display: "grid", gap: 2 }}>
                        <span>
                          {row.siteLabel}
                          {row.isEdited ? (
                            <span
                              className="small"
                              style={{ marginLeft: 6, fontWeight: 700, color: "var(--primary)" }}
                            >
                              edited
                            </span>
                          ) : null}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>
                          {row.availableLabel}
                        </span>
                      </div>
                    </td>
                    {MONTHS.map((month) => {
                      const status = monthStatus(row, month.key);
                      return (
                        <td
                          key={month.key}
                          className="sitesWorkbookQtyCell"
                          style={{
                            verticalAlign: "middle",
                            background: isSelected ? "rgba(239, 68, 68, 0.03)" : undefined,
                          }}
                        >
                          <AvailabilityCell status={status} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <div className="sitesAvailabilityDetail">
          <div
            className="row"
            style={{
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 14,
              alignItems: "baseline",
            }}
          >
            <div>
              <div className="cardSectionPill" style={{ marginBottom: 8 }}>
                {selected.siteLabel}
              </div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{year} weekly calendar</div>
              <div className="small" style={{ color: "var(--muted)", marginTop: 4 }}>
                {selected.availableLabel} · {selected.siteType}
              </div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {!editing ? (
                <button type="button" className="btn primary" onClick={openEditor}>
                  Edit availability
                </button>
              ) : null}
              <div className="small" style={{ color: "var(--muted)" }}>
                Part = only part of that month is in season
              </div>
            </div>
          </div>

          {editing && draft ? (
            <div className="sitesAvailabilityEditPanel">
              <div className="sitesAvailabilityEditTitle">Edit availability</div>
              <p className="small" style={{ margin: "0 0 12px", color: "var(--muted)" }}>
                Use exact dates for the season. Example: Available from{" "}
                <strong>Sep 16</strong> to <strong>Nov 14</strong> — September and November show as{" "}
                <strong>Part</strong> on the overview; the weekly grid blacks out weeks outside
                that range.
              </p>

              <div className="sitesAvailabilityEditGrid">
                <label className="sitesAvailabilityEditField">
                  <span>Available from</span>
                  <input
                    className="input"
                    type="date"
                    value={draft.availableStart}
                    onChange={(e) => updateDraft({ availableStart: e.target.value })}
                  />
                </label>
                <label className="sitesAvailabilityEditField">
                  <span>Available to</span>
                  <input
                    className="input"
                    type="date"
                    value={draft.availableEnd}
                    onChange={(e) => updateDraft({ availableEnd: e.target.value })}
                  />
                </label>
                <label className="sitesAvailabilityEditField">
                  <span>Site type</span>
                  <input
                    className="input"
                    value={draft.siteType}
                    onChange={(e) => updateDraft({ siteType: e.target.value })}
                    placeholder="Partner site / Centurion Site"
                  />
                </label>
              </div>

              <label className="sitesAvailabilityEditField" style={{ marginTop: 12 }}>
                <span>Team notes (one per line)</span>
                <textarea
                  className="input"
                  rows={4}
                  value={draft.teamNotesText}
                  onChange={(e) => updateDraft({ teamNotesText: e.target.value })}
                  placeholder="Team size, preferences, best months…"
                />
              </label>

              <div className="sitesAvailabilityEditSection">
                <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <div className="sitesAvailabilityEditSectionTitle">Holds / blackouts</div>
                  <button type="button" className="btn" onClick={addHold}>
                    Add hold
                  </button>
                </div>
                {(draft.exclusions || []).length === 0 ? (
                  <div className="small" style={{ color: "var(--muted)" }}>
                    No holds.
                  </div>
                ) : (
                  <div className="sitesAvailabilityEditList">
                    {draft.exclusions.map((row) => (
                      <div key={row.id} className="sitesAvailabilityEditRow">
                        <input
                          className="input"
                          type="date"
                          value={row.start}
                          onChange={(e) => updateHold(row.id, { start: e.target.value })}
                        />
                        <input
                          className="input"
                          type="date"
                          value={row.end}
                          onChange={(e) => updateHold(row.id, { end: e.target.value })}
                        />
                        <input
                          className="input"
                          value={row.note}
                          onChange={(e) => updateHold(row.id, { note: e.target.value })}
                          placeholder="Reason"
                        />
                        <button
                          type="button"
                          className="btn"
                          onClick={() => removeHold(row.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sitesAvailabilityEditSection">
                <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <div className="sitesAvailabilityEditSectionTitle">Locked teams</div>
                  <button type="button" className="btn" onClick={addBooking}>
                    Add booking
                  </button>
                </div>
                {(draft.bookings || []).length === 0 ? (
                  <div className="small" style={{ color: "var(--muted)" }}>
                    No locked teams.
                  </div>
                ) : (
                  <div className="sitesAvailabilityEditList">
                    {draft.bookings.map((row) => (
                      <div key={row.id} className="sitesAvailabilityEditRow">
                        <input
                          className="input"
                          value={row.teamName}
                          onChange={(e) => updateBooking(row.id, { teamName: e.target.value })}
                          placeholder="Team name"
                        />
                        <input
                          className="input"
                          type="date"
                          value={row.start}
                          onChange={(e) => updateBooking(row.id, { start: e.target.value })}
                        />
                        <input
                          className="input"
                          type="date"
                          value={row.end}
                          onChange={(e) => updateBooking(row.id, { end: e.target.value })}
                        />
                        <button
                          type="button"
                          className="btn"
                          onClick={() => removeBooking(row.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <button type="button" className="btn primary" onClick={saveEditor}>
                  Save
                </button>
                <button type="button" className="btn" onClick={cancelEditor}>
                  Cancel
                </button>
                <button type="button" className="btn" onClick={resetToSample}>
                  Reset to sample
                </button>
              </div>
            </div>
          ) : null}

          <div className="sitesAvailabilityDetailLayout">
            <div className="sitesAvailabilityWeekScroller">
              <table className="table sitesAvailabilityWeekTable">
                <thead>
                  <tr>
                    <th>Month</th>
                    {WEEK_BLOCKS.map((week) => (
                      <th key={week.key}>{week.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MONTHS.map((month) => (
                    <tr key={month.key}>
                      <td className="sitesAvailabilityWeekMonth">{month.label}</td>
                      {WEEK_BLOCKS.map((week) => {
                        const cell = weekStatus(selected, month.key, week.key);
                        const style = CELL[cell.status] || CELL.outside;
                        return (
                          <td key={week.key}>
                            <div
                              className="sitesAvailabilityWeekCell"
                              title={style.title}
                              style={{
                                background: style.background,
                                color: style.color,
                                borderColor: style.border,
                              }}
                            >
                              {cell.label || (cell.status === "open" ? "" : style.label)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sitesAvailabilitySideNotes">
              <div className="sitesAvailabilitySideBlock">
                <div className="sitesAvailabilitySideTitle">Season</div>
                <div className="small">
                  <strong>{selected.availableLabel}</strong>
                </div>
                <div className="small" style={{ marginTop: 6, color: "var(--muted)" }}>
                  {selected.availableStart} → {selected.availableEnd}
                </div>
              </div>
              <div className="sitesAvailabilitySideBlock">
                <div className="sitesAvailabilitySideTitle">Team information</div>
                {(selected.teamNotes || []).length ? (
                  <ul>
                    {selected.teamNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="small" style={{ color: "var(--muted)" }}>
                    No team notes yet.
                  </div>
                )}
              </div>
              <div className="sitesAvailabilitySideBlock">
                <div className="sitesAvailabilitySideTitle">Site information</div>
                <div className="small">
                  <strong>Church / site:</strong> {selected.churchName}
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  <strong>Site type:</strong> {selected.siteType}
                </div>
              </div>
              <div className="sitesAvailabilitySideBlock">
                <div className="sitesAvailabilitySideTitle">Holds</div>
                {(selected.exclusions || []).length === 0 ? (
                  <div className="small" style={{ color: "var(--muted)" }}>
                    No holds.
                  </div>
                ) : (
                  <ul>
                    {selected.exclusions.map((item) => (
                      <li key={item.id}>
                        {formatDateRangeLabel(item.start, item.end, year)} — {item.note}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="sitesAvailabilitySideBlock">
                <div className="sitesAvailabilitySideTitle">Bookings</div>
                {(selected.bookings || []).length === 0 ? (
                  <div className="small" style={{ color: "var(--muted)" }}>
                    No locked teams.
                  </div>
                ) : (
                  <ul>
                    {selected.bookings.map((item) => (
                      <li key={item.id}>
                        <strong>{item.teamName}</strong> —{" "}
                        {formatDateRangeLabel(item.start, item.end, year)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
