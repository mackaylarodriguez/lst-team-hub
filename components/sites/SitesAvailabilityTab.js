import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteSiteAvailabilityEdit,
  listSiteAvailabilityEdits,
  loadSiteAvailabilityVisibleSites,
  migrateLegacySiteAvailabilityFromNotes,
  saveSiteAvailabilityEdit,
  saveSiteAvailabilityVisibleSites,
} from "@/lib/siteAvailability";
import { listTripsForCurrentUser } from "@/lib/trips";
import { resolveCanonicalSiteLabelForTrip } from "@/lib/siteMaterials";
import { SITE_OPTIONS } from "@/lib/siteOptions";
import { showToast } from "@/components/Toast";

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

/** Soft palette — readable status colors. */
const CELL = {
  outside: {
    label: "NA",
    title: "NA",
    background: "#e8eef5",
    color: "#64748b",
    border: "#cbd5e1",
  },
  open: {
    label: "Available",
    title: "Fully available",
    background: "#d8efe4",
    color: "#1f5c45",
    border: "#b5dcc9",
  },
  partial: {
    label: "Partial",
    title: "Partially available",
    background: "#fef3c7",
    color: "#92400e",
    border: "#f6de8a",
  },
  booked: {
    label: "Locked",
    title: "Team locked",
    background: "#ef9a9a",
    color: "#7f1d1d",
    border: "#e57373",
  },
  bookedPartial: {
    label: "Locked",
    title: "Team locked (part of month)",
    background: "#f8d7da",
    color: "#9b4449",
    border: "#f1b0b7",
  },
};

const AVAILABILITY_YEAR = 2027;

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

function normalizeAvailability(row) {
  const year = Number(row?.year) || AVAILABILITY_YEAR;
  const startRaw = String(row?.availableStart || "").trim();
  const endRaw = String(row?.availableEnd || "").trim();
  const hasSeason = Boolean(parseYmd(startRaw) && parseYmd(endRaw));
  const available = hasSeason
    ? clampRange(startRaw, endRaw)
    : { start: "", end: "" };
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
    availableLabel: hasSeason
      ? formatDateRangeLabel(available.start, available.end, year)
      : "Not set",
    hasSeason,
    exclusions: [],
    bookings: [],
    teamNotes,
    siteType: String(row?.siteType || "Partner site").trim() || "Partner site",
    churchName: row?.churchName || row?.siteLabel || "",
    isEdited: Boolean(row?.isEdited),
  };
}

/** Empty default until staff saves a season in Edit availability. */
function buildEmptyAvailabilityForSite(siteLabel, year) {
  return normalizeAvailability({
    siteLabel,
    year,
    availableStart: "",
    availableEnd: "",
    bookings: [],
    teamNotes: [],
    siteType: "Partner site",
    churchName: siteLabel,
    isEdited: false,
  });
}

function mergeAvailability(siteLabel, year, editsMap, tripBookingsBySite) {
  const base = buildEmptyAvailabilityForSite(siteLabel, year);
  const saved = editsMap?.[siteLabel];
  const merged = saved
    ? normalizeAvailability({
        ...base,
        ...saved,
        siteLabel,
        year,
        isEdited: true,
      })
    : base;
  return {
    ...merged,
    bookings: tripBookingsBySite?.[siteLabel] || [],
  };
}

function clipRange(startYmd, endYmd, clipStart, clipEnd) {
  const start = Math.max(ymdTime(startYmd), ymdTime(clipStart));
  const end = Math.min(ymdTime(endYmd), ymdTime(clipEnd));
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return null;
  return { start, end };
}

/** True when merged booking intervals fully cover [openStart, openEnd]. */
function bookingsCoverFullOpenWindow(openStart, openEnd, bookings) {
  const open0 = ymdTime(openStart);
  const open1 = ymdTime(openEnd);
  if (Number.isNaN(open0) || Number.isNaN(open1)) return false;

  const clipped = [];
  for (const row of bookings || []) {
    const piece = clipRange(row.start, row.end, openStart, openEnd);
    if (piece) clipped.push(piece);
  }
  if (!clipped.length) return false;

  clipped.sort((a, b) => a.start - b.start);
  let coverTo = clipped[0].start;
  if (coverTo > open0) return false;
  coverTo = clipped[0].end;
  for (let i = 1; i < clipped.length; i += 1) {
    const next = clipped[i];
    if (next.start > coverTo + 86400000) return false; // gap > 1 day
    coverTo = Math.max(coverTo, next.end);
  }
  return coverTo >= open1;
}

function monthStatus(availability, month) {
  if (!availability.hasSeason) return "outside";
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

  const overlappingBookings = (availability.bookings || []).filter((row) =>
    rangesOverlap(row.start, row.end, openStart, openEnd)
  );
  if (overlappingBookings.length) {
    return bookingsCoverFullOpenWindow(openStart, openEnd, overlappingBookings)
      ? "booked"
      : "bookedPartial";
  }

  const coversFullMonth =
    ymdTime(availability.availableStart) <= ymdTime(bounds.start) &&
    ymdTime(availability.availableEnd) >= ymdTime(bounds.end);
  return coversFullMonth ? "open" : "partial";
}

function weekStatus(availability, month, weekKey) {
  if (!availability.hasSeason) {
    return { status: "outside", label: "" };
  }
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

function buildTripBookingsBySite(trips, year) {
  const bySite = {};
  for (const trip of trips || []) {
    if (String(trip.status || "").toLowerCase() === "archived") continue;
    const start = String(trip.startDate || "").trim();
    const end = String(trip.endDate || "").trim() || start;
    if (!start) continue;
    const startYear = Number(String(start).slice(0, 4));
    const endYear = Number(String(end).slice(0, 4));
    if (startYear !== year && endYear !== year) continue;

    const resolved =
      resolveCanonicalSiteLabelForTrip(trip.location || "", []) ||
      String(trip.location || "").trim();
    if (!resolved) continue;
    const siteLabel =
      SITE_OPTIONS.find((opt) => opt.toLowerCase() === resolved.toLowerCase()) || resolved;

    if (!bySite[siteLabel]) bySite[siteLabel] = [];
    bySite[siteLabel].push({
      id: `trip-${trip.id}`,
      tripId: trip.id,
      teamName: String(trip.name || "").trim() || "Locked team",
      start,
      end,
    });
  }
  return bySite;
}

function blankEditDraft(availability, year) {
  const y = Number(year) || availability.year || AVAILABILITY_YEAR;
  const hasDates =
    Boolean(parseYmd(availability.availableStart)) &&
    Boolean(parseYmd(availability.availableEnd));
  return {
    availableStart: hasDates ? availability.availableStart : toYmd(y, 4, 1),
    availableEnd: hasDates ? availability.availableEnd : toYmd(y, 8, 31),
    siteType: availability.siteType || "Partner site",
    teamNotesText: (availability.teamNotes || []).join("\n"),
  };
}

/**
 * Availability overview + weekly detail + edit panel.
 * Seasons save to site_availability; locked teams come from Hub trips.
 */
export default function SitesAvailabilityTab({ siteLabels = [] }) {
  const year = AVAILABILITY_YEAR;
  const [selectedSite, setSelectedSite] = useState("");
  const [visibleSites, setVisibleSites] = useState(() => new Set(siteLabels || []));
  const [prefsReady, setPrefsReady] = useState(false);
  const [showSitePicker, setShowSitePicker] = useState(false);
  const [siteFilter, setSiteFilter] = useState("");
  const [editsMap, setEditsMap] = useState({});
  const [tripBookingsBySite, setTripBookingsBySite] = useState({});
  const [editsLoading, setEditsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingSites, setSavingSites] = useState(false);
  const skipNextPrefsSave = useRef(true);

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setEditsLoading(true);
      setPrefsReady(false);
      skipNextPrefsSave.current = true;
      try {
        let map = await listSiteAvailabilityEdits(year);
        if (!Object.keys(map).length) {
          try {
            await migrateLegacySiteAvailabilityFromNotes(year);
            map = await listSiteAvailabilityEdits(year);
          } catch {
            /* legacy migrate optional */
          }
        }
        const [trips, visible] = await Promise.all([
          listTripsForCurrentUser(),
          loadSiteAvailabilityVisibleSites(year, siteLabels),
        ]);
        if (cancelled) return;
        setEditsMap(map || {});
        setTripBookingsBySite(buildTripBookingsBySite(trips, year));
        setVisibleSites(visible);
        setPrefsReady(true);
      } catch (e) {
        if (!cancelled) {
          setEditsMap({});
          setTripBookingsBySite({});
          setVisibleSites(new Set(siteLabels || []));
          setPrefsReady(true);
          showToast(e?.message || "Unable to load availability from the Hub.");
        }
      } finally {
        if (!cancelled) setEditsLoading(false);
      }
    }
    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [year, siteLabels]);

  useEffect(() => {
    if (!prefsReady) return;
    if (skipNextPrefsSave.current) {
      skipNextPrefsSave.current = false;
      return;
    }
    const handle = setTimeout(() => {
      void (async () => {
        try {
          setSavingSites(true);
          await saveSiteAvailabilityVisibleSites(year, [...visibleSites], siteLabels);
        } catch (e) {
          showToast(e?.message || "Unable to save which sites are shown.");
        } finally {
          setSavingSites(false);
        }
      })();
    }, 450);
    return () => clearTimeout(handle);
  }, [visibleSites, prefsReady, year, siteLabels]);

  const filteredSiteLabels = useMemo(() => {
    const needle = String(siteFilter || "").trim().toLowerCase();
    const labels = siteLabels || [];
    if (!needle) return labels;
    return labels.filter((label) => String(label).toLowerCase().includes(needle));
  }, [siteLabels, siteFilter]);

  const rows = useMemo(
    () =>
      filteredSiteLabels.map((siteLabel) =>
        mergeAvailability(siteLabel, year, editsMap, tripBookingsBySite)
      ),
    [filteredSiteLabels, year, editsMap, tripBookingsBySite]
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
  }, [selectedSite, year]);

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
    setDraft(blankEditDraft(selected, year));
    setEditing(true);
  }

  function cancelEditor() {
    setEditing(false);
    setDraft(null);
  }

  function updateDraft(patch) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  async function saveEditor() {
    if (!selected || !draft || saving) return;
    const available = clampRange(draft.availableStart, draft.availableEnd);
    if (!parseYmd(available.start) || !parseYmd(available.end)) {
      showToast("Enter valid Available from / to dates.");
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
    };

    setSaving(true);
    try {
      await saveSiteAvailabilityEdit(selected.siteLabel, year, payload);
      setEditsMap((current) => ({
        ...current,
        [selected.siteLabel]: payload,
      }));
      setEditing(false);
      setDraft(null);
      showToast("Availability saved.");
    } catch (e) {
      showToast(e?.message || "Unable to save availability.");
    } finally {
      setSaving(false);
    }
  }

  async function clearAvailability() {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await deleteSiteAvailabilityEdit(selected.siteLabel, year);
      setEditsMap((current) => {
        const next = { ...current };
        delete next[selected.siteLabel];
        return next;
      });
      const base = buildEmptyAvailabilityForSite(selected.siteLabel, year);
      setDraft(blankEditDraft(base, year));
      showToast("Availability cleared.");
    } catch (e) {
      showToast(e?.message || "Unable to clear availability.");
    } finally {
      setSaving(false);
    }
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
            Set exact date ranges (e.g. Sep 16 – Nov 14). Red locked cells come from real Hub
            trips. Uncheck sites to hide them — that choice saves for everyone.
            {editsLoading ? " Loading…" : ""}
          </p>
        </div>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="small" style={{ fontWeight: 800, color: "var(--muted)" }}>
            Season {year}
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => setShowSitePicker((open) => !open)}
          >
            {showSitePicker ? "Hide site list" : "Choose sites"}
          </button>
        </div>
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
            {filteredSiteLabels.map((label) => {
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
          <div className="small" style={{ marginTop: 10, color: "var(--muted)" }}>
            Uncheck a site to hide it from the chart. Choices save automatically
            {savingSites ? " (saving…)" : ""}.
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
        <LegendSwatch status="bookedPartial" />
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
                        <span>{row.siteLabel}</span>
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
                Yellow = partially available · Light red = locked part of the month
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

              <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => void saveEditor()}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" className="btn" onClick={cancelEditor} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => void clearAvailability()}
                  disabled={saving}
                >
                  Clear
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
                <div className="sitesAvailabilitySideTitle">Locked teams</div>
                {(selected.bookings || []).length === 0 ? (
                  <div className="small" style={{ color: "var(--muted)" }}>
                    No locked Hub trips on this site for {year}.
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
