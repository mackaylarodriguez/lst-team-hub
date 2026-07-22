import { useMemo, useState } from "react";

const MONTHS = [
  { key: 1, label: "Jan", short: "J" },
  { key: 2, label: "Feb", short: "F" },
  { key: 3, label: "Mar", short: "M" },
  { key: 4, label: "Apr", short: "A" },
  { key: 5, label: "May", short: "M" },
  { key: 6, label: "Jun", short: "J" },
  { key: 7, label: "Jul", short: "J" },
  { key: 8, label: "Aug", short: "A" },
  { key: 9, label: "Sep", short: "S" },
  { key: 10, label: "Oct", short: "O" },
  { key: 11, label: "Nov", short: "N" },
  { key: 12, label: "Dec", short: "D" },
];

const CELL = {
  outside: {
    label: "—",
    title: "Outside available season",
    background: "rgba(244, 244, 245, 0.9)",
    color: "#a1a1aa",
  },
  open: {
    label: "Open",
    title: "Available",
    background: "rgba(50, 84, 163, 0.12)",
    color: "#3254a3",
  },
  booked: {
    label: "Booked",
    title: "Team booked",
    background: "rgba(180, 83, 9, 0.14)",
    color: "#9a3412",
  },
  excluded: {
    label: "Hold",
    title: "Excluded / host unavailable",
    background: "rgba(113, 113, 122, 0.16)",
    color: "#52525b",
  },
};

const AV_TABLE = {
  site: 200,
  month: 72,
};

/** Deterministic mock season / exclusions / bookings for visual v1 only. */
function buildMockAvailabilityForSite(siteLabel, year) {
  const lower = String(siteLabel || "").toLowerCase();
  let availableFromMonth = 3;
  let availableToMonth = 10;
  const exclusions = [];
  const bookings = [];

  if (lower.includes("usa") || lower.includes("springfield")) {
    availableFromMonth = 6;
    availableToMonth = 8;
  } else if (lower.includes("japan") || lower.includes("korea") || lower.includes("philippines")) {
    availableFromMonth = 1;
    availableToMonth = 12;
  } else if (lower.includes("angola") || lower.includes("ecuador")) {
    availableFromMonth = 5;
    availableToMonth = 9;
  } else if (lower.includes("brazil")) {
    availableFromMonth = 2;
    availableToMonth = 11;
  }

  if (lower.includes("hannover")) {
    exclusions.push({
      startLabel: `Jun 12–18, ${year}`,
      note: "Host family unavailable",
      months: [6],
    });
    bookings.push({
      teamName: "Team Rivera",
      rangeLabel: `Jul 5 – Jul 25, ${year}`,
      months: [7],
    });
  } else if (lower.includes("vienna")) {
    bookings.push({
      teamName: "Team Cole",
      rangeLabel: `May 10 – May 31, ${year}`,
      months: [5],
    });
    bookings.push({
      teamName: "Team Park",
      rangeLabel: `Sep 1 – Sep 20, ${year}`,
      months: [9],
    });
  } else if (lower.includes("murcia")) {
    exclusions.push({
      startLabel: `Aug 1–10, ${year}`,
      note: "Local festival / housing closed",
      months: [8],
    });
  } else if (lower.includes("krakow")) {
    bookings.push({
      teamName: "Team Nguyen",
      rangeLabel: `Jun 15 – Jul 12, ${year}`,
      months: [6, 7],
    });
  } else if (lower.includes("padova")) {
    exclusions.push({
      startLabel: `Apr 18–21, ${year}`,
      note: "Easter blackout",
      months: [4],
    });
  } else if (lower.includes("west springfield")) {
    bookings.push({
      teamName: "Team Brooks",
      rangeLabel: `Jul 1 – Jul 26, ${year}`,
      months: [7],
    });
  } else if (lower.includes("zagreb")) {
    bookings.push({
      teamName: "Team Ellis",
      rangeLabel: `Aug 3 – Aug 24, ${year}`,
      months: [8],
    });
  } else if (lower.includes("joao pessoa") || lower.includes("florianopolis")) {
    bookings.push({
      teamName: lower.includes("florianopolis") ? "Team Costa" : "Team Alves",
      rangeLabel: `Mar 8 – Mar 29, ${year}`,
      months: [3],
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
  };
}

function formatMonthRange(fromMonth, toMonth) {
  const from = MONTHS.find((m) => m.key === fromMonth)?.label || String(fromMonth);
  const to = MONTHS.find((m) => m.key === toMonth)?.label || String(toMonth);
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

function AvailabilityCell({ status }) {
  const style = CELL[status] || CELL.outside;
  return (
    <div
      title={style.title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 28,
        width: "100%",
        padding: "4px 6px",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.01em",
        background: style.background,
        color: style.color,
        boxSizing: "border-box",
      }}
    >
      {style.label}
    </div>
  );
}

function LegendSwatch({ status }) {
  const style = CELL[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: "var(--muted)",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 4,
          background: style.background,
          border: `1px solid ${style.color}`,
          flex: "0 0 auto",
        }}
      />
      {style.title}
    </span>
  );
}

/**
 * Visual v1 only — mock seasons, exclusions, and bookings.
 * Not persisted; for product shape review on Sites.
 */
export default function SitesAvailabilityTab({ siteLabels = [] }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedSite, setSelectedSite] = useState("");

  const rows = useMemo(
    () => (siteLabels || []).map((siteLabel) => buildMockAvailabilityForSite(siteLabel, year)),
    [siteLabels, year]
  );

  const selected = useMemo(() => {
    const label = selectedSite || rows[0]?.siteLabel || "";
    return rows.find((row) => row.siteLabel === label) || null;
  }, [rows, selectedSite]);

  const tableWidth = AV_TABLE.site + MONTHS.length * AV_TABLE.month;

  return (
    <div className="card pad" style={{ marginBottom: 24 }}>
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
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Site availability</div>
          <p className="small" style={{ margin: 0, color: "var(--muted)", lineHeight: 1.45 }}>
            Season windows by site, with exclusions and booked teams overlaid. Visual preview —
            sample data only.
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
        </div>
      </div>

      <div
        style={{
          marginBottom: 14,
          padding: "10px 12px",
          borderRadius: 10,
          background: "rgba(50, 84, 163, 0.06)",
          border: "1px solid rgba(50, 84, 163, 0.16)",
          fontSize: 13,
          color: "#3254a3",
          fontWeight: 700,
        }}
      >
        Preview mockup — not saved yet. Click a site row to inspect season, holds, and bookings.
      </div>

      <div
        className="row"
        style={{ gap: 14, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}
      >
        <LegendSwatch status="outside" />
        <LegendSwatch status="open" />
        <LegendSwatch status="booked" />
        <LegendSwatch status="excluded" />
      </div>

      <div className="sitesWorkbookScroller">
        <table
          className="table sitesWorkbookTable dataTableStriped"
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
                  {month.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = selected?.siteLabel === row.siteLabel;
              return (
                <tr
                  key={row.siteLabel}
                  onClick={() => setSelectedSite(row.siteLabel)}
                  style={{
                    cursor: "pointer",
                    outline: isSelected ? "2px solid rgba(50, 84, 163, 0.35)" : undefined,
                    outlineOffset: -2,
                  }}
                >
                  <td
                    className="sitesWorkbookSiteCell"
                    style={{
                      fontWeight: 700,
                      maxWidth: AV_TABLE.site,
                      boxSizing: "border-box",
                      background: isSelected ? "rgba(50, 84, 163, 0.08)" : undefined,
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
                          background: isSelected ? "rgba(50, 84, 163, 0.04)" : undefined,
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

      {selected ? (
        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "linear-gradient(180deg, rgba(234,242,255,.55), #ffffff 42%)",
          }}
        >
          <div
            className="row"
            style={{
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 12,
              alignItems: "baseline",
            }}
          >
            <div>
              <div className="cardSectionPill" style={{ marginBottom: 8 }}>
                {selected.siteLabel}
              </div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                {year} availability detail
              </div>
            </div>
            <div className="small" style={{ color: "var(--muted)" }}>
              Sample detail panel — edit controls come later
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 6 }}>
                Available window
              </div>
              <div style={{ fontWeight: 800, color: "#3254a3" }}>{selected.availableLabel}</div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 6 }}>
                Exclusions / holds
              </div>
              {(selected.exclusions || []).length === 0 ? (
                <div className="small" style={{ color: "var(--muted)" }}>
                  None listed
                </div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
                  {selected.exclusions.map((item) => (
                    <li key={`${item.startLabel}-${item.note}`}>
                      <strong>{item.startLabel}</strong>
                      {item.note ? ` — ${item.note}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 6 }}>
                Booked teams
              </div>
              {(selected.bookings || []).length === 0 ? (
                <div className="small" style={{ color: "var(--muted)" }}>
                  No teams booked in sample data
                </div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
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
      ) : null}
    </div>
  );
}
