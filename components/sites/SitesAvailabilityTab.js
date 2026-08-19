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
  { key: 1, label: "1–7" },
  { key: 2, label: "8–14" },
  { key: 3, label: "15–21" },
  { key: 4, label: "22–end" },
];

/** Stronger palette so status reads at a glance on the overview grid. */
const CELL = {
  outside: {
    label: "Closed",
    title: "Outside available season / not hosting",
    background: "#111827",
    color: "#f9fafb",
    border: "#030712",
  },
  open: {
    label: "Open",
    title: "Available",
    background: "#22c55e",
    color: "#052e16",
    border: "#15803d",
  },
  booked: {
    label: "Locked",
    title: "Team locked / booked",
    background: "#ef4444",
    color: "#fff",
    border: "#b91c1c",
  },
  excluded: {
    label: "Hold",
    title: "Excluded / host unavailable",
    background: "#a1a1aa",
    color: "#18181b",
    border: "#71717a",
  },
};

const AV_TABLE = {
  site: 220,
  month: 78,
};

const VISIBLE_SITES_STORAGE_KEY = "lst-sites-availability-visible-v1";

/** Deterministic mock season / exclusions / bookings for visual v1 only. */
function buildMockAvailabilityForSite(siteLabel, year) {
  const lower = String(siteLabel || "").toLowerCase();
  let availableFromMonth = 4;
  let availableToMonth = 8;
  const exclusions = [];
  const bookings = [];
  const teamNotes = [];
  let siteType = "Partner site";

  if (lower.includes("usa") || lower.includes("springfield")) {
    availableFromMonth = 6;
    availableToMonth = 8;
  } else if (lower.includes("japan") || lower.includes("korea") || lower.includes("philippines")) {
    availableFromMonth = 1;
    availableToMonth = 12;
    siteType = "Centurion Site";
  } else if (lower.includes("angola") || lower.includes("ecuador")) {
    availableFromMonth = 5;
    availableToMonth = 9;
  } else if (lower.includes("brazil")) {
    availableFromMonth = 2;
    availableToMonth = 11;
  } else if (lower.includes("mut") || lower.includes("university")) {
    availableFromMonth = 4;
    availableToMonth = 8;
    siteType = "Centurion Site";
    teamNotes.push("2 – 4 team members");
    teamNotes.push("campus, church, women, older");
    teamNotes.push("REALLY want a 6 – 7 week program!");
    teamNotes.push(
      "Best time to host is April – July (students out part of July and August)."
    );
  }

  if (lower.includes("hannover")) {
    exclusions.push({
      startLabel: `Jun 12–18, ${year}`,
      note: "Host family unavailable",
      months: [6],
      weeksByMonth: { 6: [2] },
    });
    bookings.push({
      teamName: "Team Rivera",
      rangeLabel: `Jul 5 – Jul 25, ${year}`,
      months: [7],
      weeksByMonth: { 7: [1, 2, 3, 4] },
      weekLabels: { "7-1": "Team Rivera", "7-4": "return ~25" },
    });
  } else if (lower.includes("vienna")) {
    bookings.push({
      teamName: "Team Cole",
      rangeLabel: `May 10 – May 31, ${year}`,
      months: [5],
      weeksByMonth: { 5: [2, 3, 4] },
    });
    bookings.push({
      teamName: "Team Park",
      rangeLabel: `Sep 1 – Sep 20, ${year}`,
      months: [9],
      weeksByMonth: { 9: [1, 2, 3] },
    });
  } else if (lower.includes("murcia")) {
    exclusions.push({
      startLabel: `Aug 1–10, ${year}`,
      note: "Local festival / housing closed",
      months: [8],
      weeksByMonth: { 8: [1, 2] },
    });
  } else if (lower.includes("krakow")) {
    bookings.push({
      teamName: "Team Nguyen",
      rangeLabel: `Jun 15 – Jul 12, ${year}`,
      months: [6, 7],
      weeksByMonth: { 6: [3, 4], 7: [1, 2] },
    });
  } else if (lower.includes("padova")) {
    exclusions.push({
      startLabel: `Apr 18–21, ${year}`,
      note: "Easter blackout",
      months: [4],
      weeksByMonth: { 4: [3] },
    });
  } else if (lower.includes("west springfield")) {
    bookings.push({
      teamName: "Team Brooks",
      rangeLabel: `Jul 1 – Jul 26, ${year}`,
      months: [7],
      weeksByMonth: { 7: [1, 2, 3, 4] },
    });
  } else if (lower.includes("zagreb")) {
    bookings.push({
      teamName: "Team Ellis",
      rangeLabel: `Aug 3 – Aug 24, ${year}`,
      months: [8],
      weeksByMonth: { 8: [1, 2, 3, 4] },
    });
  } else if (lower.includes("joao pessoa") || lower.includes("florianopolis")) {
    bookings.push({
      teamName: lower.includes("florianopolis") ? "Team Costa" : "Team Alves",
      rangeLabel: `Mar 8 – Mar 29, ${year}`,
      months: [3],
      weeksByMonth: { 3: [2, 3, 4] },
    });
  } else if (lower.includes("mut") || lower.includes("university")) {
    bookings.push({
      teamName: "MUT 4",
      rangeLabel: `Apr 15 – Apr 23, ${year}`,
      months: [4],
      weeksByMonth: { 4: [3, 4] },
      weekLabels: {
        "4-3": "MUT 4 (depart 13)",
        "4-4": "MUT 4 (return 23)",
      },
    });
  }

  return {
    siteLabel,
    year,
    availableFromMonth,
    availableToMonth,
    availableLabel: formatMonthRange(availableFromMonth, availableToMonth),
    exclusions,
    bookings,
    teamNotes,
    siteType,
    churchName: siteLabel,
  };
}

function formatMonthRange(fromMonth, toMonth) {
  const from = MONTHS.find((m) => m.key === fromMonth)?.short || String(fromMonth);
  const to = MONTHS.find((m) => m.key === toMonth)?.short || String(toMonth);
  if (fromMonth === 1 && toMonth === 12) return "Year-round";
  return `${from} – ${to}`;
}

function monthStatus(availability, month) {
  if (month < availability.availableFromMonth || month > availability.availableToMonth) {
    return "outside";
  }
  if ((availability.exclusions || []).some((row) => (row.months || []).includes(month))) {
    return "excluded";
  }
  if ((availability.bookings || []).some((row) => (row.months || []).includes(month))) {
    return "booked";
  }
  return "open";
}

function weekStatus(availability, month, weekKey) {
  if (month < availability.availableFromMonth || month > availability.availableToMonth) {
    return { status: "outside", label: "" };
  }

  for (const exclusion of availability.exclusions || []) {
    const weeks = exclusion.weeksByMonth?.[month] || [];
    if (weeks.includes(weekKey) || ((exclusion.months || []).includes(month) && !exclusion.weeksByMonth)) {
      return { status: "excluded", label: exclusion.note || "Hold" };
    }
  }

  for (const booking of availability.bookings || []) {
    const weeks = booking.weeksByMonth?.[month] || [];
    if (weeks.includes(weekKey)) {
      const custom = booking.weekLabels?.[`${month}-${weekKey}`];
      return {
        status: "booked",
        label: custom || booking.teamName || "Locked",
      };
    }
    if (!booking.weeksByMonth && (booking.months || []).includes(month)) {
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
        textShadow: status === "outside" || status === "booked" ? "0 1px 0 rgba(0,0,0,.25)" : "none",
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
    // If storage is empty or all filtered out, fall back to showing everything.
    return new Set(next.length ? next : all);
  } catch {
    return new Set(all);
  }
}

/**
 * Visual v1 — mock seasons, exclusions, and bookings.
 * Overview = sites × months; detail = week-block calendar for one site.
 */
export default function SitesAvailabilityTab({ siteLabels = [] }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedSite, setSelectedSite] = useState("");
  const [visibleSites, setVisibleSites] = useState(() => new Set());
  const [showSitePicker, setShowSitePicker] = useState(false);
  const [siteFilter, setSiteFilter] = useState("");

  useEffect(() => {
    setVisibleSites(loadVisibleSiteSet(siteLabels));
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
    () => (siteLabels || []).map((siteLabel) => buildMockAvailabilityForSite(siteLabel, year)),
    [siteLabels, year]
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

  const filteredPickerLabels = useMemo(() => {
    const needle = String(siteFilter || "").trim().toLowerCase();
    if (!needle) return siteLabels || [];
    return (siteLabels || []).filter((label) =>
      String(label).toLowerCase().includes(needle)
    );
  }, [siteLabels, siteFilter]);

  const tableWidth = AV_TABLE.site + MONTHS.length * AV_TABLE.month;
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
            Scan which sites are open, held, or locked by month. Click a site for the weekly
            calendar. Sample data for now.
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
        Preview mockup — not saved to the database yet. Showing {visibleCount} of {totalCount}{" "}
        sites.
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
        <LegendSwatch status="booked" />
        <LegendSwatch status="excluded" />
      </div>

      {visibleRows.length === 0 ? (
        <div className="small" style={{ color: "var(--muted)", marginBottom: 12 }}>
          No sites selected. Use <strong>Choose sites</strong> to check which sites appear on the
          grid.
        </div>
      ) : (
        <div className="sitesWorkbookScroller">
          <table
            className="table sitesWorkbookTable dataTableStriped sitesAvailabilityTable"
            style={{
              width: tableWidth,
              minWidth: tableWidth,
              fontSize: 12,
            }}
          >
            <colgroup>
              <col style={{ width: AV_TABLE.site }} />
              {MONTHS.map((month) => (
                <col key={month.key} style={{ width: AV_TABLE.month }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th
                  className="sitesWorkbookCorner"
                  style={{ whiteSpace: "nowrap", maxWidth: AV_TABLE.site, boxSizing: "border-box" }}
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
                      outline: isSelected ? "2px solid rgba(239, 68, 68, 0.55)" : undefined,
                      outlineOffset: -2,
                    }}
                  >
                    <td
                      className="sitesWorkbookSiteCell"
                      style={{
                        fontWeight: 700,
                        maxWidth: AV_TABLE.site,
                        boxSizing: "border-box",
                        background: isSelected ? "rgba(239, 68, 68, 0.08)" : undefined,
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
                            background: isSelected ? "rgba(239, 68, 68, 0.04)" : undefined,
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
            <div className="small" style={{ color: "var(--muted)" }}>
              Red = team locked · Green = open · Black = closed season
            </div>
          </div>

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
                <div className="sitesAvailabilitySideTitle">Team information</div>
                {(selected.teamNotes || []).length ? (
                  <ul>
                    {selected.teamNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="small" style={{ color: "var(--muted)" }}>
                    No team notes in sample data.
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
                <div className="sitesAvailabilitySideTitle">Bookings</div>
                {(selected.bookings || []).length === 0 ? (
                  <div className="small" style={{ color: "var(--muted)" }}>
                    No locked teams in sample data.
                  </div>
                ) : (
                  <ul>
                    {selected.bookings.map((item) => (
                      <li key={`${item.teamName}-${item.rangeLabel}`}>
                        <strong>{item.teamName}</strong> — {item.rangeLabel}
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
