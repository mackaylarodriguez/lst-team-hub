import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  listSiteAvailabilityEdits,
  loadSiteAvailabilityVisibleSites,
  migrateLegacySiteAvailabilityFromNotes,
  normalizeAvailableRanges,
  saveSiteAvailabilityEdit,
  saveSiteAvailabilityVisibleSites,
} from "@/lib/siteAvailability";
import { listTripsForCurrentUser, TRIPS_UPDATED_EVENT } from "@/lib/trips";
import { resolveCanonicalSiteLabelForTrip } from "@/lib/siteMaterials";
import { SITE_OPTIONS } from "@/lib/siteOptions";
import { showToast } from "@/components/Toast";
import SiteNameLabel from "@/components/sites/SiteNameLabel";

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
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
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

function formatSeasonRangesLabel(ranges, year) {
  const list = Array.isArray(ranges) ? ranges : [];
  if (!list.length) return "Not set";
  if (list.length === 1) return formatDateRangeLabel(list[0].start, list[0].end, year);
  return list.map((r) => formatDateRangeLabel(r.start, r.end, year)).join(" · ");
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
  const availableRanges = normalizeAvailableRanges(
    {
      availableRanges: row?.availableRanges,
      availableStart: row?.availableStart,
      availableEnd: row?.availableEnd,
    },
    year
  );
  const hasSeason = availableRanges.length > 0;
  const availableStart = hasSeason ? availableRanges[0].start : "";
  const availableEnd = hasSeason ? availableRanges[availableRanges.length - 1].end : "";
  const teamNotes = Array.isArray(row?.teamNotes)
    ? row.teamNotes.map((n) => String(n || "").trim()).filter(Boolean)
    : String(row?.teamNotesText || "")
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);

  return {
    siteLabel: row?.siteLabel || "",
    year,
    availableStart,
    availableEnd,
    availableRanges,
    availableLabel: formatSeasonRangesLabel(availableRanges, year),
    hasSeason,
    exclusions: [],
    bookings: [],
    teamNotes,
    otherBackgrounds: String(row?.otherBackgrounds || "").trim(),
    preferredTeamSize: String(row?.preferredTeamSize || "").trim(),
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
    otherBackgrounds: "",
    preferredTeamSize: "",
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

/** Open season windows that intersect a calendar month (supports split seasons). */
function monthOpenWindows(availability, month) {
  if (!availability.hasSeason) return [];
  const year = availability.year;
  const bounds = monthBounds(year, month);
  const pieces = [];
  for (const range of availability.availableRanges || []) {
    if (!rangesOverlap(range.start, range.end, bounds.start, bounds.end)) continue;
    const openStart =
      ymdTime(range.start) > ymdTime(bounds.start) ? range.start : bounds.start;
    const openEnd =
      ymdTime(range.end) < ymdTime(bounds.end) ? range.end : bounds.end;
    pieces.push({ openStart, openEnd });
  }
  pieces.sort((a, b) => ymdTime(a.openStart) - ymdTime(b.openStart));
  const merged = [];
  for (const piece of pieces) {
    const prev = merged[merged.length - 1];
    if (prev && ymdTime(piece.openStart) <= ymdTime(prev.openEnd) + 86400000) {
      if (ymdTime(piece.openEnd) > ymdTime(prev.openEnd)) {
        prev.openEnd = piece.openEnd;
      }
    } else {
      merged.push({ ...piece });
    }
  }
  return merged.map((w) => ({ ...w, bounds }));
}

function rangesCoverSpan(ranges, spanStart, spanEnd) {
  const open0 = ymdTime(spanStart);
  const open1 = ymdTime(spanEnd);
  if (Number.isNaN(open0) || Number.isNaN(open1)) return false;

  const clipped = [];
  for (const range of ranges || []) {
    const piece = clipRange(range.start, range.end, spanStart, spanEnd);
    if (piece) clipped.push(piece);
  }
  if (!clipped.length) return false;

  clipped.sort((a, b) => a.start - b.start);
  let coverTo = clipped[0].start;
  if (coverTo > open0) return false;
  coverTo = clipped[0].end;
  for (let i = 1; i < clipped.length; i += 1) {
    const next = clipped[i];
    if (next.start > coverTo + 86400000) return false;
    coverTo = Math.max(coverTo, next.end);
  }
  return coverTo >= open1;
}

function monthStatus(availability, month) {
  const windows = monthOpenWindows(availability, month);
  if (!windows.length) return "outside";

  const { bounds } = windows[0];
  const overlappingBookings = (availability.bookings || []).filter((row) =>
    windows.some((w) => rangesOverlap(row.start, row.end, w.openStart, w.openEnd))
  );
  if (overlappingBookings.length) {
    const fullyBooked = windows.every((w) =>
      bookingsCoverFullOpenWindow(w.openStart, w.openEnd, overlappingBookings)
    );
    return fullyBooked ? "booked" : "bookedPartial";
  }

  return rangesCoverSpan(availability.availableRanges, bounds.start, bounds.end)
    ? "open"
    : "partial";
}

function monthCellTooltip(availability, month) {
  const monthMeta = MONTHS.find((m) => m.key === month);
  const monthName = monthMeta?.label || `Month ${month}`;
  const year = availability.year;
  const status = monthStatus(availability, month);
  const windows = monthOpenWindows(availability, month);

  if (status === "outside" || !windows.length) {
    return `${monthName} ${year}: NA`;
  }

  const seasonLabel = windows
    .map((w) => formatDateRangeLabel(w.openStart, w.openEnd, year))
    .join(" · ");
  const overlappingBookings = (availability.bookings || []).filter((row) =>
    windows.some((w) => rangesOverlap(row.start, row.end, w.openStart, w.openEnd))
  );

  if (overlappingBookings.length) {
    const tripLines = overlappingBookings.map((booking) => {
      const range = formatDateRangeLabel(booking.start, booking.end, year);
      return `${booking.teamName || "Locked team"} (${range})`;
    });
    const lockKind =
      status === "bookedPartial" ? "Team locked (part of month)" : "Team locked";
    return [`${monthName} ${year}: ${lockKind}`, `Season in month: ${seasonLabel}`, ...tripLines].join(
      "\n"
    );
  }

  if (status === "partial") {
    return `${monthName} ${year}: Partially available\n${seasonLabel}`;
  }
  return `${monthName} ${year}: Fully available\n${seasonLabel}`;
}

function weekStatus(availability, month, weekKey) {
  if (!availability.hasSeason) {
    return { status: "outside", label: "" };
  }
  const year = availability.year;
  const bounds = weekBounds(year, month, weekKey);
  const inSeason = (availability.availableRanges || []).some((range) =>
    rangesOverlap(range.start, range.end, bounds.start, bounds.end)
  );
  if (!inSeason) {
    return { status: "outside", label: "" };
  }

  for (const booking of availability.bookings || []) {
    if (rangesOverlap(booking.start, booking.end, bounds.start, bounds.end)) {
      return { status: "booked", label: booking.teamName || "Locked" };
    }
  }

  return { status: "open", label: "" };
}

function AvailabilityCell({ status, compact = false, title }) {
  const style = CELL[status] || CELL.outside;
  return (
    <div
      title={title || style.title}
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

const LEGEND_ITEMS = [
  { status: "outside", label: "NA" },
  { status: "open", label: "Available" },
  { status: "partial", label: "Partial" },
  { status: "booked", label: "Locked" },
];

function LegendSwatch({ status, label }) {
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
      {label || style.label}
    </span>
  );
}

function resolveAvailabilitySiteLabel(location) {
  const raw = String(location || "").trim();
  if (!raw) return "";
  const resolved =
    resolveCanonicalSiteLabelForTrip(raw, []) || raw;
  const lower = resolved.toLowerCase();
  const exact = SITE_OPTIONS.find((opt) => opt.toLowerCase() === lower);
  if (exact) return exact;
  const partial = SITE_OPTIONS.find((opt) => {
    const optLower = opt.toLowerCase();
    return lower.includes(optLower) || optLower.includes(lower);
  });
  return partial || resolved;
}

function tripOverlapsYear(start, end, year) {
  const startYear = Number(String(start || "").slice(0, 4));
  const endYear = Number(String(end || start || "").slice(0, 4));
  if (!Number.isFinite(startYear) && !Number.isFinite(endYear)) return false;
  const y0 = Number.isFinite(startYear) ? startYear : endYear;
  const y1 = Number.isFinite(endYear) ? endYear : startYear;
  return y0 <= year && year <= y1;
}

function buildTripBookingsBySite(trips, year) {
  const bySite = {};
  for (const trip of trips || []) {
    if (String(trip.status || "").toLowerCase() === "archived") continue;
    const start = String(trip.startDate || "").trim();
    const end = String(trip.endDate || "").trim() || start;
    if (!start) continue;
    if (!tripOverlapsYear(start, end, year)) continue;

    const siteLabel = resolveAvailabilitySiteLabel(trip.location || "");
    if (!siteLabel) continue;

    if (!bySite[siteLabel]) bySite[siteLabel] = [];
    bySite[siteLabel].push({
      id: `trip-${trip.id}`,
      tripId: trip.id,
      teamName: String(trip.name || "").trim() || "Locked team",
      start,
      end,
      teamStatus: String(trip.teamStatus || "").trim(),
    });
  }

  for (const siteLabel of Object.keys(bySite)) {
    bySite[siteLabel].sort((a, b) => String(a.start).localeCompare(String(b.start)));
  }
  return bySite;
}

function blankEditDraft(availability, year) {
  const ranges = normalizeAvailableRanges(
    {
      availableRanges: availability.availableRanges,
      availableStart: availability.availableStart,
      availableEnd: availability.availableEnd,
    },
    year
  );
  return {
    availableRanges: ranges.length ? ranges.map((r) => ({ ...r })) : [{ start: "", end: "" }],
    preferredTeamSize: String(availability.preferredTeamSize || "").trim(),
    otherBackgrounds: String(availability.otherBackgrounds || "").trim(),
    teamNotesText: (availability.teamNotes || []).join("\n"),
  };
}

/**
 * Availability overview + weekly detail + edit panel.
 * Seasons save to site_availability; locked teams come from Hub trips.
 */
export default function SitesAvailabilityTab({ siteLabels = [], onEditSite }) {
  const year = AVAILABILITY_YEAR;
  const [selectedSite, setSelectedSite] = useState("");
  const [visibleSites, setVisibleSites] = useState(() => new Set(siteLabels || []));
  const [draftVisibleSites, setDraftVisibleSites] = useState(() => new Set(siteLabels || []));
  const [showSitePicker, setShowSitePicker] = useState(false);
  const [siteFilter, setSiteFilter] = useState("");
  const [editsMap, setEditsMap] = useState({});
  const [tripBookingsBySite, setTripBookingsBySite] = useState({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingSites, setSavingSites] = useState(false);
  const [detailHighlight, setDetailHighlight] = useState(false);
  const detailRef = useRef(null);
  const detailHighlightTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (detailHighlightTimer.current) clearTimeout(detailHighlightTimer.current);
    };
  }, []);

  function selectSiteRow(label) {
    setSelectedSite(label);
    if (detailHighlightTimer.current) clearTimeout(detailHighlightTimer.current);
    setDetailHighlight(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        setDetailHighlight(true);
        detailHighlightTimer.current = setTimeout(() => setDetailHighlight(false), 900);
      });
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      try {
        let map = await listSiteAvailabilityEdits(year);
        try {
          await migrateLegacySiteAvailabilityFromNotes(year);
          map = await listSiteAvailabilityEdits(year);
        } catch {
          /* legacy migrate optional */
        }
        const [trips, visible] = await Promise.all([
          listTripsForCurrentUser(),
          loadSiteAvailabilityVisibleSites(year, siteLabels),
        ]);
        if (cancelled) return;
        setEditsMap(map || {});
        setTripBookingsBySite(buildTripBookingsBySite(trips, year));
        setVisibleSites(visible);
        setDraftVisibleSites(new Set(visible));
      } catch (e) {
        if (!cancelled) {
          setEditsMap({});
          setTripBookingsBySite({});
          const fallback = new Set(siteLabels || []);
          setVisibleSites(fallback);
          setDraftVisibleSites(new Set(fallback));
          showToast(e?.message || "Unable to load availability from the Hub.");
        }
      }
    }
    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [year, siteLabels]);

  useEffect(() => {
    let cancelled = false;
    async function refreshLockedTeams() {
      try {
        const trips = await listTripsForCurrentUser();
        if (cancelled) return;
        setTripBookingsBySite(buildTripBookingsBySite(trips, year));
      } catch {
        /* keep last known bookings */
      }
    }

    function onTripsUpdated() {
      void refreshLockedTeams();
    }

    function onVisibility() {
      if (document.visibilityState === "visible") void refreshLockedTeams();
    }

    window.addEventListener(TRIPS_UPDATED_EVENT, onTripsUpdated);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener(TRIPS_UPDATED_EVENT, onTripsUpdated);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [year]);

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

  function openSitePicker() {
    setDraftVisibleSites(new Set(visibleSites));
    setShowSitePicker(true);
  }

  function cancelSitePicker() {
    setDraftVisibleSites(new Set(visibleSites));
    setShowSitePicker(false);
    setSiteFilter("");
  }

  function toggleSite(label) {
    setDraftVisibleSites((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function showAllSites() {
    setDraftVisibleSites(new Set(siteLabels || []));
  }

  function hideAllSites() {
    setDraftVisibleSites(new Set());
  }

  async function saveSitePicker() {
    if (savingSites) return;
    const next = new Set(draftVisibleSites);
    try {
      setSavingSites(true);
      await saveSiteAvailabilityVisibleSites(year, [...next], siteLabels);
      setVisibleSites(next);
      setShowSitePicker(false);
      setSiteFilter("");
      showToast("Saved which sites appear on the grid.");
    } catch (e) {
      showToast(e?.message || "Unable to save which sites are shown.");
    } finally {
      setSavingSites(false);
    }
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

  function updateDraftRange(index, patch) {
    setDraft((current) => {
      if (!current) return current;
      const next = (current.availableRanges || []).map((row, i) =>
        i === index ? { ...row, ...patch } : row
      );
      return { ...current, availableRanges: next };
    });
  }

  function addDraftRange() {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        availableRanges: [...(current.availableRanges || []), { start: "", end: "" }],
      };
    });
  }

  function removeDraftRange(index) {
    setDraft((current) => {
      if (!current) return current;
      const list = current.availableRanges || [];
      if (list.length <= 1) {
        return { ...current, availableRanges: [{ start: "", end: "" }] };
      }
      return {
        ...current,
        availableRanges: list.filter((_, i) => i !== index),
      };
    });
  }

  async function saveEditor() {
    if (!selected || !draft || saving) return;
    const draftRows = Array.isArray(draft.availableRanges) ? draft.availableRanges : [];
    for (const row of draftRows) {
      const hasStart = Boolean(String(row?.start || "").trim());
      const hasEnd = Boolean(String(row?.end || "").trim());
      if (hasStart !== hasEnd) {
        showToast("Each season window needs both Available from and Available to, or leave both empty.");
        return;
      }
    }
    const availableRanges = normalizeAvailableRanges({ availableRanges: draftRows }, year);

    const payload = {
      availableRanges,
      availableStart: availableRanges[0]?.start || "",
      availableEnd: availableRanges[availableRanges.length - 1]?.end || "",
      siteType: String(selected.siteType || "").trim() || "Partner site",
      churchName: String(selected.churchName || selected.siteLabel || "").trim() || selected.siteLabel,
      preferredTeamSize: String(draft.preferredTeamSize || "").trim(),
      otherBackgrounds: String(draft.otherBackgrounds || "").trim(),
      teamNotes: String(draft.teamNotesText || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };

    setSaving(true);
    try {
      const saved = await saveSiteAvailabilityEdit(selected.siteLabel, year, payload);
      setEditsMap((current) => ({
        ...current,
        [selected.siteLabel]: {
          ...(saved || {}),
          ...payload,
          availableRanges,
          siteLabel: selected.siteLabel,
          year,
          isEdited: true,
        },
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
          <div className="sitesAvailabilityLegend" aria-label="Availability legend">
            {LEGEND_ITEMS.map((item) => (
              <LegendSwatch key={item.status} status={item.status} label={item.label} />
            ))}
          </div>
        </div>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="small" style={{ fontWeight: 800, color: "var(--muted)" }}>
            Season {year}
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => (showSitePicker ? cancelSitePicker() : openSitePicker())}
          >
            {showSitePicker ? "Cancel" : "Choose sites"}
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
              const checked = draftVisibleSites.has(label);
              return (
                <label key={label} className="sitesAvailabilityPickerItem">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSite(label)}
                  />
                  <span>
                    <SiteNameLabel siteLabel={label} />
                  </span>
                </label>
              );
            })}
          </div>
          <div
            className="row"
            style={{
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              marginTop: 12,
              justifyContent: "space-between",
            }}
          >
            <div className="small" style={{ color: "var(--muted)" }}>
              Check the sites you want, then Save. Unchecked sites stay hidden until you check
              them and save again.
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn" onClick={cancelSitePicker} disabled={savingSites}>
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => void saveSitePicker()}
                disabled={savingSites}
              >
                {savingSites ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                    className={isSelected ? "sitesAvailabilityRowSelected" : undefined}
                    onClick={() => selectSiteRow(row.siteLabel)}
                    style={{ cursor: "pointer" }}
                  >
                    <td
                      className="sitesWorkbookSiteCell sitesAvailabilitySiteCell"
                      style={{ fontWeight: 700 }}
                      title={row.siteLabel}
                    >
                      <div style={{ display: "grid", gap: 2 }}>
                        <button
                          type="button"
                          className="sitesSiteNameButton"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof onEditSite === "function") onEditSite(row.siteLabel);
                            else selectSiteRow(row.siteLabel);
                          }}
                          title={`${row.siteLabel} — click to edit site`}
                        >
                          <SiteNameLabel siteLabel={row.siteLabel} />
                        </button>
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
                          style={{ verticalAlign: "middle" }}
                        >
                          <AvailabilityCell
                            status={status}
                            title={monthCellTooltip(row, month.key)}
                          />
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
        <div
          ref={detailRef}
          className={
            "sitesAvailabilityDetail" +
            (detailHighlight ? " sitesAvailabilityDetailHighlight" : "")
          }
        >
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                textAlign: "center",
                fontWeight: 900,
                fontSize: 16,
                marginBottom: 12,
              }}
            >
              {year} weekly calendar
            </div>
            <div
              className="row"
              style={{
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "flex-start",
              }}
            >
              <div>
                <button
                  type="button"
                  className="cardSectionPill sitesSiteNamePillButton"
                  style={{ marginBottom: 6 }}
                  onClick={() => {
                    if (typeof onEditSite === "function") onEditSite(selected.siteLabel);
                  }}
                  title="Edit all site details"
                >
                  <SiteNameLabel siteLabel={selected.siteLabel} />
                </button>
                <div className="small" style={{ color: "var(--muted)", fontWeight: 700 }}>
                  {selected.siteType}
                </div>
              </div>
              {!editing ? (
                <button type="button" className="btn primary" onClick={openEditor}>
                  Edit availability
                </button>
              ) : null}
            </div>
          </div>

          {editing && draft ? (
            <div className="sitesAvailabilityEditPanel">
              <div className="sitesAvailabilityEditTitle">Edit availability</div>
              <p className="small" style={{ margin: "0 0 12px", color: "var(--muted)" }}>
                Update season windows (optional — e.g. May–June and Sep–Oct), preferred team size,
                other church backgrounds, and notes. Locked teams stay live from Hub trips for {year}.
              </p>

              <div className="sitesAvailabilityEditSectionTitle">Season windows · {year}</div>
              <div className="sitesAvailabilityEditList">
                {(draft.availableRanges || []).map((range, index) => (
                  <div key={`range-${index}`} className="sitesAvailabilityEditRow">
                    <label className="sitesAvailabilityEditField">
                      <span>Available from</span>
                      <input
                        className="input"
                        type="date"
                        min={`${year}-01-01`}
                        max={`${year}-12-31`}
                        value={range.start || ""}
                        onChange={(e) => updateDraftRange(index, { start: e.target.value })}
                      />
                    </label>
                    <label className="sitesAvailabilityEditField">
                      <span>Available to</span>
                      <input
                        className="input"
                        type="date"
                        min={`${year}-01-01`}
                        max={`${year}-12-31`}
                        value={range.end || ""}
                        onChange={(e) => updateDraftRange(index, { end: e.target.value })}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => removeDraftRange(index)}
                      disabled={(draft.availableRanges || []).length <= 1}
                      title="Remove window"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button type="button" className="btn" onClick={addDraftRange}>
                  Add another window
                </button>
              </div>

              <div className="sitesAvailabilityEditSection">
                <label className="sitesAvailabilityEditField">
                  <span>Preferred team size</span>
                  <input
                    className="input"
                    value={draft.preferredTeamSize}
                    onChange={(e) => updateDraft({ preferredTeamSize: e.target.value })}
                    placeholder="e.g. 2–4"
                  />
                </label>
                <label className="sitesAvailabilityEditField" style={{ marginTop: 12 }}>
                  <span>Will take teams from other church backgrounds</span>
                  <textarea
                    className="input"
                    rows={2}
                    value={draft.otherBackgrounds}
                    onChange={(e) => updateDraft({ otherBackgrounds: e.target.value })}
                    placeholder="Yes / No / notes…"
                  />
                </label>
                <label className="sitesAvailabilityEditField" style={{ marginTop: 12 }}>
                  <span>Notes (one per line)</span>
                  <textarea
                    className="input"
                    rows={5}
                    value={draft.teamNotesText}
                    onChange={(e) => updateDraft({ teamNotesText: e.target.value })}
                    placeholder="Hosting notes…"
                  />
                </label>
              </div>

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
                {(selected.availableRanges || []).length ? (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {selected.availableRanges.map((range) => (
                      <li key={`${range.start}-${range.end}`} className="small" style={{ color: "var(--muted)" }}>
                        {range.start} → {range.end}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="small" style={{ marginTop: 6, color: "var(--muted)" }}>
                    Not set
                  </div>
                )}
              </div>
              <div className="sitesAvailabilitySideBlock">
                <div className="sitesAvailabilitySideTitle">Locked teams · {year}</div>
                {(selected.bookings || []).length === 0 ? (
                  <div className="small" style={{ color: "var(--muted)" }}>
                    No locked Hub trips on this site for {year}.
                  </div>
                ) : (
                  <ul>
                    {selected.bookings.map((item) => (
                      <li key={item.id}>
                        {item.tripId ? (
                          <Link href={`/trips/${item.tripId}`}>
                            <strong>{item.teamName}</strong>
                          </Link>
                        ) : (
                          <strong>{item.teamName}</strong>
                        )}{" "}
                        — {formatDateRangeLabel(item.start, item.end, year)}
                        {item.teamStatus ? (
                          <span style={{ color: "var(--muted)" }}> · {item.teamStatus}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="sitesAvailabilitySideBlock">
                <div className="sitesAvailabilitySideTitle">Preferred team size</div>
                <div className="small">
                  {selected.preferredTeamSize ? (
                    selected.preferredTeamSize
                  ) : (
                    <span style={{ color: "var(--muted)" }}>Not set</span>
                  )}
                </div>
              </div>
              <div className="sitesAvailabilitySideBlock">
                <div className="sitesAvailabilitySideTitle">
                  Will take teams from other church backgrounds
                </div>
                <div className="small">
                  {selected.otherBackgrounds ? (
                    selected.otherBackgrounds
                  ) : (
                    <span style={{ color: "var(--muted)" }}>Not set</span>
                  )}
                </div>
              </div>
              <div className="sitesAvailabilitySideBlock">
                <div className="sitesAvailabilitySideTitle">Notes</div>
                {(selected.teamNotes || []).length ? (
                  <ul>
                    {selected.teamNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="small" style={{ color: "var(--muted)" }}>
                    No notes yet. Use Edit availability to add them.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
