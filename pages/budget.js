import Shell from "@/components/Shell";
import Link from "next/link";
import AppIcon from "@/components/AppIcon";
import CollapsibleSection from "@/components/CollapsibleSection";
import Spinner from "@/components/Spinner";
import ConfirmModal from "@/components/ConfirmModal";
import { hideBusy, showBusy, showBusyDone } from "@/components/BusyOverlay";
import BudgetTeamEditorModal from "@/components/budget/BudgetTeamEditorModal";
import EmptyState from "@/components/EmptyState";
import { showToast } from "@/components/Toast";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { requireSession } from "@/lib/auth";
import { isManagerRole } from "@/lib/roles";
import {
  getBudgetAverages,
  groupTripsBySiteForMaterials,
  HOUSING1_BUDGET_PER_TEAM,
  listAllTripBudgets,
  listSiteBudgetNotes,
  saveTripBudget,
  deleteTripBudget,
  updateSiteBudgetNote,
  cleanupSiteBudgetNotesRows,
  saveSiteHousingNoteForSiteLabel,
  deleteSiteBudgetNote,
  uploadTripHousingPdf,
  housingAmountFromBudgetRow,
  sumHousingAmountColumn,
  sumTripBudgetFeeAmount,
} from "@/lib/tripBudget";
import {
  listAllTripTickets,
  saveTripTicket,
  deleteTripTicket,
  syncTripTicketsFromTeamMembers,
  TICKET_AGENCY_OPTIONS,
} from "@/lib/tripTickets";
import {
  listAllTripHousingEntries,
  syncTripHousingExtras,
  uploadTripHousingExtraPdf,
} from "@/lib/tripHousingEntries";
import { listAllTripTeamMembers } from "@/lib/tripTeamMembers";
import { listTripsForCurrentUser } from "@/lib/trips";
import { computeTeamFundraisingGoalTotal, buildTeamFundraisingWorkerRows } from "@/lib/tripFundraising";
import FundraisingWorkerGoalList from "@/components/budget/FundraisingWorkerGoalList";
import {
  deleteBudgetCheckRequest,
  listBudgetCheckRequests,
  markBudgetCheckRequestProcessed,
  submitBudgetCheckRequest,
  updateBudgetCheckDonnaNotes,
  updateBudgetCheckRequest,
} from "@/lib/budgetCheckRequests";
import { budgetCheckSubmitToast } from "@/lib/budgetCheckSubmitFeedback";
import { STAFF_TASKS_UPDATED_EVENT } from "@/lib/staffTasks";
import { buildSiteLabelsOrdered, resolveCanonicalSiteLabelForTrip } from "@/lib/siteMaterials";

function n(val) {
  return val === null || val === undefined ? "" : String(val).trim();
}

function parseTripStartDateMs(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  const parsed = Date.parse(s.length <= 10 ? `${s}T12:00:00` : s);
  return Number.isFinite(parsed) ? parsed : null;
}

const USD_CURRENCY_FORMAT = {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

function parseCurrencyLike(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Format a numeric amount as $1,234.56 (for display or after blur). */
function formatUsdNumber(n) {
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("en-US", USD_CURRENCY_FORMAT).format(n);
}

/**
 * Format stored money text for display (parses $, commas, etc.).
 * Unparseable non-empty strings are returned as-is.
 */
function formatUsdDisplay(value) {
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

/** On blur: normalize user input to $X,XXX.XX or empty. */
function normalizeMoneyInputToUsd(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const n = parseCurrencyLike(trimmed);
  if (n === null) return trimmed;
  return formatUsdNumber(n);
}

function formatBudgetCheckTimestamp(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function resolveBudgetCheckSite(row, tripSiteById) {
  const saved = String(row?.siteSnapshot || "").trim();
  if (saved) return saved;
  const fromTrip = String(tripSiteById?.[String(row?.tripId)] || "").trim();
  return fromTrip || "—";
}

function budgetCheckTableHead(showActions = true) {
  return (
    <tr>
      <th>Requested</th>
      <th>Requested by</th>
      <th>Trip</th>
      <th>Site</th>
      <th>Payee</th>
      <th>Check amount</th>
      <th>Notes</th>
      <th>Completed on</th>
      <th style={{ minWidth: 180 }}>Donna notes</th>
      {showActions ? <th style={{ minWidth: 140 }}>Actions</th> : null}
    </tr>
  );
}

function computeTotalLstCost(totalTicketCost, amountWorkerPaid) {
  if (!String(totalTicketCost ?? "").trim() && !String(amountWorkerPaid ?? "").trim()) return "";
  const total = parseCurrencyLike(totalTicketCost) ?? 0;
  const paid = parseCurrencyLike(amountWorkerPaid) ?? 0;
  return formatUsdNumber(total - paid);
}

/** Green at/under per-team housing cap; amber when the line amount is over (grid Housing amount column). */
function housingLineAmountVsBudgetColor(amountText, budgetCap) {
  const n = parseCurrencyLike(amountText);
  const cap = Number(budgetCap);
  if (n == null || !Number.isFinite(cap)) return undefined;
  return n <= cap ? "#15803d" : "#ca8a04";
}

/** Sort trips for Budget housing/ticketing: soonest start first; missing dates last; then name. */
function compareTripsForBudgetSort(a, b) {
  const ma = parseTripStartDateMs(a?.startDate);
  const mb = parseTripStartDateMs(b?.startDate);
  const fa = ma ?? Number.MAX_SAFE_INTEGER;
  const fb = mb ?? Number.MAX_SAFE_INTEGER;
  if (fa !== fb) return fa - fb;
  return String(a?.name || a?.id || "").localeCompare(String(b?.name || b?.id || ""), undefined, {
    sensitivity: "base",
  });
}

/** Background + left accent so consecutive trip groups are easy to scan on Budget → Ticketing. */
const TICKET_TRIP_BAND_STYLES = [
  { bg: "rgba(239, 246, 255, 0.82)", border: "#3b82f6" },
  { bg: "rgba(240, 253, 244, 0.82)", border: "#16a34a" },
  { bg: "rgba(250, 245, 255, 0.82)", border: "#9333ea" },
  { bg: "rgba(255, 247, 237, 0.88)", border: "#ea580c" },
  { bg: "rgba(253, 242, 248, 0.82)", border: "#db2777" },
  { bg: "rgba(240, 249, 255, 0.85)", border: "#0284c7" },
  { bg: "rgba(245, 243, 255, 0.85)", border: "#6366f1" },
  { bg: "rgba(241, 245, 249, 0.9)", border: "#64748b" },
];

/** Read-only computed airfare cell (Total LST Cost). */
const ticketComputedFieldStyle = {
  cursor: "not-allowed",
};

const budgetSectionCardStyle = {
  borderRadius: 16,
  border: "1px solid rgba(15, 23, 42, 0.08)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.92))",
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)",
};

const budgetSectionHeaderStyle = {
  display: "grid",
  gap: 14,
  marginBottom: 16,
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid rgba(15, 23, 42, 0.06)",
  background: "rgba(255,255,255,0.76)",
};

function createDraftHousingExtraId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `draft-${crypto.randomUUID()}`;
  }
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function groupHousingExtrasByTripId(rows) {
  const map = {};
  for (const row of rows || []) {
    const tid = row.tripId;
    if (!tid) continue;
    if (!map[tid]) map[tid] = [];
    map[tid].push({
      id: row.id,
      label: row.label || "",
      housingLink: row.housingLink || "",
      housingPdfUrl: row.housingPdfUrl || "",
    });
  }
  return map;
}

function cloneHousingExtrasMap(map) {
  return Object.fromEntries(
    Object.entries(map || {}).map(([tripId, list]) => [
      tripId,
      (list || []).map((x) => ({ ...x })),
    ])
  );
}

function formatHousingExtrasForCsv(tripId, extrasDraft, extrasSaved, isEditing) {
  const extras = (isEditing ? extrasDraft[tripId] : extrasSaved[tripId]) || [];
  return extras
    .map((e) =>
      [e.label, e.housingLink, e.housingPdfUrl]
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .join(" — ")
    )
    .filter(Boolean)
    .join(" | ");
}

function defaultIntlDomForLocation(location) {
  const text = String(location || "").toLowerCase();
  return text.includes("massachusetts") ? "Dom" : "Intl";
}

function countTripRosterMembers(teamMembersByTripId, tripId) {
  return (teamMembersByTripId[String(tripId || "")] || []).length;
}

function mergeHousingWithTrips(trips, budgets) {
  const byTripId = new Map((budgets || []).map((b) => [b.tripId, b]));
  const orderedTrips = [...(trips || [])].sort(compareTripsForBudgetSort);
  return orderedTrips.map((trip) => {
    const b = byTripId.get(trip.id);
    const tripName = trip.name || "";
    if (!b) {
      return {
        id: null,
        tripId: trip.id,
        tripName,
        teamName: tripName,
        projectStartDate: trip.startDate || "",
        projectEndDate: trip.endDate || "",
        siteCountry: trip.location || "",
        siteCity: "",
        teamAccountant: "",
        budgetAmount: "",
        housingBudgetAmount: "",
        returnedAmount: "",
        housingAmount: "",
        onsiteExpensesAmount: "",
        housingLink: "",
        housingPdfUrl: "",
        notes: "",
        numWorkers: null,
        tshirts: "",
        workbooks: "",
      };
    }

    return {
      ...b,
      tripName: b.tripName || b.teamName || tripName,
      teamName: b.teamName || tripName,
      projectStartDate: b.projectStartDate || trip.startDate || "",
      projectEndDate: b.projectEndDate || trip.endDate || "",
      siteCountry: b.siteCountry || trip.location || "",
      siteCity: b.siteCity || "",
      housingLink: n(b.housingLink),
      housingPdfUrl: n(b.housingPdfUrl),
    };
  });
}

function sumCurrencyRows(rows, amountField) {
  return (rows || []).reduce((sum, row) => sum + (parseCurrencyLike(row?.[amountField]) ?? 0), 0);
}

function sumTicketAirfareForTrip(ticketRows, tripId) {
  return sumCurrencyRows(
    (ticketRows || []).filter((row) => String(row.tripId) === String(tripId)),
    "totalTicketCost"
  );
}

function parseBudgetAmountOrNull(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return parseCurrencyLike(raw);
}

function formatUsdNumberOrDash(value) {
  if (value == null || !Number.isFinite(value)) return "—";
  return formatUsdNumber(value);
}

function buildBudgetOverviewRows(housingRows, ticketRows, teamMembersByTripId, tripsById) {
  return (housingRows || []).map((row) => {
    const tripMeta = tripsById?.get(String(row.tripId)) || {};
    const teamMembers = teamMembersByTripId[String(row.tripId)] || [];
    const tripLike = {
      ...tripMeta,
      id: row.tripId,
      teamMembers,
      participants: [],
    };
    const fundraisingWorkers = buildTeamFundraisingWorkerRows(tripLike);
    const fundraisingComputed = computeTeamFundraisingGoalTotal(tripLike);
    const fundraisingTotal = fundraisingComputed > 0 ? fundraisingComputed : null;
    const airfareTotal = sumTicketAirfareForTrip(ticketRows, row.tripId);
    const housingTotal = housingAmountFromBudgetRow(row);
    const teamBudgetTotal = parseBudgetAmountOrNull(row.onsiteExpensesAmount);
    const feeTotal = sumTripBudgetFeeAmount(tripMeta);
    const spentTotal =
      (teamBudgetTotal ?? 0) + airfareTotal + housingTotal + feeTotal;
    const leftover = fundraisingTotal == null ? null : fundraisingTotal - spentTotal;
    const returnedTotal = parseBudgetAmountOrNull(row.returnedAmount);

    return {
      tripId: row.tripId,
      teamName: row.teamName || row.tripName || "",
      projectStartDate: row.projectStartDate || "",
      projectEndDate: row.projectEndDate || "",
      site: row.siteCountry || "",
      workers: countTripRosterMembers(teamMembersByTripId, row.tripId),
      teamAccountant: row.teamAccountant || "",
      budgetAmount: row.budgetAmount || "",
      onsiteExpensesAmount: row.onsiteExpensesAmount || "",
      returnedAmount: row.returnedAmount || "",
      notes: row.notes == null ? "" : String(row.notes),
      fundraisingTotal,
      fundraisingWorkers,
      teamBudgetTotal,
      airfareTotal,
      housingTotal,
      feeTotal,
      leftover,
      returnedTotal,
      spentTotal,
      // Aliases used by older totals/chart helpers
      budgetTotal: fundraisingTotal,
      onsiteTotal: teamBudgetTotal,
    };
  });
}

function BudgetCheckSectionPill({ label, count, tone = "primary", style }) {
  const toneClass =
    tone === "pending"
      ? "budgetCheckSectionPillPending"
      : tone === "processed"
        ? "budgetCheckSectionPillProcessed"
        : "budgetCheckSectionPillPrimary";

  return (
    <div className={`budgetCheckSectionPill ${toneClass}`} style={style}>
      <span className="budgetCheckSectionPillLabel">{label}</span>
      {count != null ? <span className="budgetCheckSectionPillCount">{count}</span> : null}
    </div>
  );
}

function BudgetOverviewStackedBar({
  fundraisingTotal,
  teamBudgetTotal,
  airfareTotal,
  housingTotal,
  feeTotal,
  leftover,
}) {
  const spentTotal =
    (teamBudgetTotal ?? 0) + airfareTotal + housingTotal + (feeTotal ?? 0);
  if (fundraisingTotal == null && spentTotal <= 0) {
    return <div className="small" style={{ color: "var(--muted)" }}>No budget data yet</div>;
  }

  const total = Math.max(fundraisingTotal ?? spentTotal, spentTotal, 1);
  const segments = [
    { key: "teamBudget", value: teamBudgetTotal ?? 0, color: "#7c3aed", label: "Team Budget" },
    { key: "airfare", value: airfareTotal, color: "#2563eb", label: "Airfare" },
    { key: "housing", value: housingTotal, color: "#16a34a", label: "Housing" },
    { key: "fee", value: feeTotal, color: "#ea580c", label: "Fee" },
  ].filter((segment) => segment.value > 0);

  if (leftover != null && leftover > 0) {
    segments.push({ key: "leftover", value: leftover, color: "#94a3b8", label: "Leftover" });
  } else if (leftover != null && leftover < 0) {
    segments.push({
      key: "over",
      value: Math.abs(leftover),
      color: "#dc2626",
      label: "Over budget",
    });
  }

  if (!segments.length) {
    return <div className="small" style={{ color: "var(--muted)" }}>No budget data yet</div>;
  }

  return (
    <div style={{ display: "grid", gap: 6, minWidth: 180 }}>
      <div
        style={{
          display: "flex",
          height: 12,
          borderRadius: 999,
          overflow: "hidden",
          border: "1px solid rgba(15, 23, 42, 0.08)",
          background: "rgba(248, 250, 252, 0.9)",
        }}
        title={segments.map((segment) => `${segment.label}: ${formatUsdNumber(segment.value)}`).join(" · ")}
      >
        {segments.map((segment) => (
          <div
            key={segment.key}
            style={{
              width: `${(segment.value / total) * 100}%`,
              background: segment.color,
              minWidth: segment.value > 0 ? 2 : 0,
            }}
          />
        ))}
      </div>
      <div className="small" style={{ display: "flex", flexWrap: "wrap", gap: 8, color: "var(--muted)" }}>
        {segments.map((segment) => (
          <span key={segment.key} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: segment.color,
                display: "inline-block",
              }}
            />
            {segment.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function sumBudgetOverviewTotals(rows) {
  return (rows || []).reduce(
    (acc, row) => {
      if (row.fundraisingTotal != null) {
        acc.fundraisingTotal += row.fundraisingTotal;
        acc.teamsWithFundraising += 1;
      }
      if (row.teamBudgetTotal != null) acc.teamBudgetTotal += row.teamBudgetTotal;
      acc.airfareTotal += row.airfareTotal;
      acc.housingTotal += row.housingTotal;
      acc.feeTotal += row.feeTotal || 0;
      if (row.leftover != null) acc.leftover += row.leftover;
      if (row.returnedTotal != null) {
        acc.returnedTotal += row.returnedTotal;
        acc.teamsWithReturned += 1;
      }
      // Legacy aliases for helpers still reading these
      acc.budgetTotal = acc.fundraisingTotal;
      acc.onsiteTotal = acc.teamBudgetTotal;
      acc.teamsWithBudget = acc.teamsWithFundraising;
      return acc;
    },
    {
      fundraisingTotal: 0,
      teamBudgetTotal: 0,
      airfareTotal: 0,
      housingTotal: 0,
      feeTotal: 0,
      leftover: 0,
      returnedTotal: 0,
      teamsWithFundraising: 0,
      teamsWithReturned: 0,
      budgetTotal: 0,
      onsiteTotal: 0,
      teamsWithBudget: 0,
    }
  );
}

function budgetOverviewTotalsWithHousingColumn(baseTotals, housingRows, includeTripId) {
  const housingTotal = sumHousingAmountColumn(
    (housingRows || []).filter((row) => includeTripId(row.tripId))
  );
  const housingDelta = housingTotal - baseTotals.housingTotal;
  if (!housingDelta) {
    return { ...baseTotals, housingTotal };
  }
  return {
    ...baseTotals,
    housingTotal,
    leftover:
      baseTotals.teamsWithBudget > 0 ? baseTotals.leftover - housingDelta : baseTotals.leftover,
  };
}

function BudgetOverviewTable({
  rows,
  totals,
  isEditingOverview,
  archivedTripIds,
  pastTripIds,
  onSelectTrip,
  onUpdateDraft,
  getAccountantNames,
  showFooter = true,
}) {
  if (!rows.length) return null;

  return (
    <div className="budgetTableScroller">
      <table className="table dataTableStriped budgetStickyTable budgetOverviewTable" style={{ minWidth: 1960, fontSize: 12 }}>
        <thead>
          <tr>
            <th>Team Name</th>
            <th>Project Start</th>
            <th>Project End</th>
            <th>Site</th>
            <th>Workers</th>
            <th>Team Accountant</th>
            <th>Team fundraising</th>
            <th>Team Budget</th>
            <th>Airfare</th>
            <th>Housing</th>
            <th>Fee</th>
            <th>Leftover</th>
            <th>Returned amount</th>
            <th style={{ minWidth: 220 }}>Budget chart</th>
            <th style={{ minWidth: 240 }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isArchived = Boolean(archivedTripIds?.has?.(row.tripId));
            const isPast = Boolean(pastTripIds?.has?.(row.tripId));
            const accountantNames =
              typeof getAccountantNames === "function" ? getAccountantNames(row.tripId) || [] : [];
            return (
              <tr
                key={row.tripId}
                className={
                  isEditingOverview
                    ? undefined
                    : `budgetOverviewRowClickable${
                        isPast || isArchived ? " budgetOverviewRowArchived" : ""
                      }`
                }
                onClick={isEditingOverview ? undefined : () => onSelectTrip(row.tripId)}
                title={
                  isEditingOverview
                    ? undefined
                    : "Click to edit this team's budget, housing, and tickets"
                }
              >
                <td style={{ fontWeight: 700 }}>{row.teamName || "—"}</td>
                <td>{row.projectStartDate || "—"}</td>
                <td>{row.projectEndDate || "—"}</td>
                <td>{row.site || "—"}</td>
                <td style={{ textAlign: "center", fontWeight: 700 }}>{row.workers}</td>
                <td style={{ minWidth: 160, maxWidth: 240 }}>
                  {isEditingOverview ? (
                    <select
                      className="input"
                      value={row.teamAccountant || ""}
                      onChange={(e) => onUpdateDraft(row.tripId, { teamAccountant: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">— Select team member —</option>
                      {accountantNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                      {row.teamAccountant && !accountantNames.includes(row.teamAccountant) ? (
                        <option value={row.teamAccountant}>
                          {row.teamAccountant} (not on roster)
                        </option>
                      ) : null}
                    </select>
                  ) : (
                    row.teamAccountant || "—"
                  )}
                </td>
                <td className="budgetOverviewFundraisingCell">
                  <div className="budgetOverviewFundraisingTotal">
                    {formatUsdNumberOrDash(row.fundraisingTotal)}
                  </div>
                  {(row.fundraisingWorkers || []).length > 0 ? (
                    <FundraisingWorkerGoalList workers={row.fundraisingWorkers} />
                  ) : null}
                </td>
                <td style={{ minWidth: 112 }}>
                  {isEditingOverview ? (
                    <input
                      className="input"
                      value={row.onsiteExpensesAmount || ""}
                      onChange={(e) =>
                        onUpdateDraft(row.tripId, { onsiteExpensesAmount: e.target.value })
                      }
                      onBlur={(e) => {
                        const next = normalizeMoneyInputToUsd(e.target.value);
                        if (next !== (row.onsiteExpensesAmount || "")) {
                          onUpdateDraft(row.tripId, { onsiteExpensesAmount: next });
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      inputMode="decimal"
                      placeholder="$0.00"
                    />
                  ) : (
                    formatUsdNumberOrDash(row.teamBudgetTotal)
                  )}
                </td>
                <td>{formatUsdNumberOrDash(row.airfareTotal)}</td>
                <td>{formatUsdNumberOrDash(row.housingTotal)}</td>
                <td>{formatUsdNumberOrDash(row.feeTotal > 0 ? row.feeTotal : null)}</td>
                <td
                  style={{
                    color:
                      row.leftover == null ? undefined : row.leftover < 0 ? "#dc2626" : "#15803d",
                    fontWeight: 700,
                  }}
                >
                  {formatUsdNumberOrDash(row.leftover)}
                </td>
                <td style={{ minWidth: 112 }}>
                  {isEditingOverview ? (
                    <input
                      className="input"
                      value={row.returnedAmount || ""}
                      onChange={(e) => onUpdateDraft(row.tripId, { returnedAmount: e.target.value })}
                      onBlur={(e) => {
                        const next = normalizeMoneyInputToUsd(e.target.value);
                        if (next !== (row.returnedAmount || "")) {
                          onUpdateDraft(row.tripId, { returnedAmount: next });
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      inputMode="decimal"
                      placeholder="$0.00"
                    />
                  ) : (
                    formatUsdNumberOrDash(row.returnedTotal)
                  )}
                </td>
                <td>
                  <BudgetOverviewStackedBar
                    fundraisingTotal={row.fundraisingTotal}
                    teamBudgetTotal={row.teamBudgetTotal}
                    airfareTotal={row.airfareTotal}
                    housingTotal={row.housingTotal}
                    feeTotal={row.feeTotal}
                    leftover={row.leftover}
                  />
                </td>
                <td style={{ minWidth: 240, maxWidth: 360 }}>
                  {isEditingOverview ? (
                    <textarea
                      className="input"
                      rows={3}
                      value={row.notes || ""}
                      onChange={(e) => onUpdateDraft(row.tripId, { notes: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Notes"
                      style={{
                        width: "100%",
                        minHeight: 64,
                        resize: "vertical",
                        lineHeight: 1.4,
                      }}
                    />
                  ) : (
                    <div
                      className="small"
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        lineHeight: 1.4,
                      }}
                    >
                      {String(row.notes || "").trim() || "—"}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        {showFooter && totals ? (
          <tfoot>
            <tr style={{ fontWeight: 800, background: "rgba(248, 250, 252, 0.95)" }}>
              <td colSpan={6}>Totals</td>
              <td>
                {formatUsdNumberOrDash(
                  totals.teamsWithFundraising > 0 ? totals.fundraisingTotal : null
                )}
              </td>
              <td>
                {formatUsdNumberOrDash(
                  totals.teamBudgetTotal > 0 ? totals.teamBudgetTotal : null
                )}
              </td>
              <td>{formatUsdNumberOrDash(totals.airfareTotal)}</td>
              <td>{formatUsdNumberOrDash(totals.housingTotal)}</td>
              <td>
                {formatUsdNumberOrDash(totals.feeTotal > 0 ? totals.feeTotal : null)}
              </td>
              <td
                style={{
                  color:
                    totals.teamsWithFundraising > 0 && totals.leftover < 0 ? "#dc2626" : "#15803d",
                }}
              >
                {formatUsdNumberOrDash(totals.teamsWithFundraising > 0 ? totals.leftover : null)}
              </td>
              <td>
                {formatUsdNumberOrDash(
                  totals?.teamsWithReturned > 0 ? totals.returnedTotal : null
                )}
              </td>
              <td />
              <td />
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

export default function BudgetPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [averages, setAverages] = useState(null);
  const [trips, setTrips] = useState([]);
  const [housingRows, setHousingRows] = useState([]);
  const [ticketRows, setTicketRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const showBusyOverlay = useCallback((message = "Saving…") => {
    showBusy(message);
  }, []);

  const showBusyOverlayDone = useCallback((message = "Saved") => {
    showBusyDone(message);
  }, []);

  const showBusyOverlayError = useCallback((message) => {
    hideBusy();
    if (message) showToast(message, "error");
  }, []);

  const [newTicketTripId, setNewTicketTripId] = useState("");
  const [tab, setTab] = useState("Overview");
  const [isEditingHousing, setIsEditingHousing] = useState(false);
  const [housingRowsDraft, setHousingRowsDraft] = useState([]);
  const [isEditingTickets, setIsEditingTickets] = useState(false);
  const [ticketRowsBaseline, setTicketRowsBaseline] = useState(null);
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [overviewBudgetDraft, setOverviewBudgetDraft] = useState([]);
  const [teamEditorTripId, setTeamEditorTripId] = useState("");
  const [ticketToDeleteId, setTicketToDeleteId] = useState(null);
  const [budgetRowDeleteTripId, setBudgetRowDeleteTripId] = useState(null);
  const [teamMembersByTripId, setTeamMembersByTripId] = useState({});
  const [siteHousingNotes, setSiteHousingNotes] = useState([]);
  const [housingPdfUploadingTripId, setHousingPdfUploadingTripId] = useState(null);
  const [housingExtrasByTripId, setHousingExtrasByTripId] = useState({});
  const [housingExtrasDraft, setHousingExtrasDraft] = useState({});
  const [newHousingSlotTripId, setNewHousingSlotTripId] = useState("");
  const [housingExtraPdfUploadKey, setHousingExtraPdfUploadKey] = useState(null);
  const [editingSiteNoteId, setEditingSiteNoteId] = useState("");
  const [editingSiteNoteDraft, setEditingSiteNoteDraft] = useState("");
  const [siteNoteDeleteId, setSiteNoteDeleteId] = useState("");
  const [newSiteHousingSelect, setNewSiteHousingSelect] = useState("");
  const [isAddingSiteNote, setIsAddingSiteNote] = useState(false);
  const [newSiteHousingDraft, setNewSiteHousingDraft] = useState("");
  const [budgetCheckRows, setBudgetCheckRows] = useState([]);
  const [newBudgetCheckTripId, setNewBudgetCheckTripId] = useState("");
  const [newBudgetCheckAmount, setNewBudgetCheckAmount] = useState("");
  const [newBudgetCheckNote, setNewBudgetCheckNote] = useState("");
  const [budgetCheckSubmitting, setBudgetCheckSubmitting] = useState(false);
  const [budgetCheckProcessingId, setBudgetCheckProcessingId] = useState("");
  const [budgetCheckEditId, setBudgetCheckEditId] = useState("");
  const [budgetCheckEditAmount, setBudgetCheckEditAmount] = useState("");
  const [budgetCheckEditNote, setBudgetCheckEditNote] = useState("");
  const [budgetCheckEditSaving, setBudgetCheckEditSaving] = useState(false);
  const [budgetCheckDeleteId, setBudgetCheckDeleteId] = useState("");
  const [budgetCheckDonnaNotesDraft, setBudgetCheckDonnaNotesDraft] = useState({});
  const [budgetCheckDonnaNotesSavingId, setBudgetCheckDonnaNotesSavingId] = useState("");
  const [budgetCheckPayeeSaving, setBudgetCheckPayeeSaving] = useState(false);

  const canManage = isManagerRole(session?.permissionRole || session?.role);

  const archivedTripIds = useMemo(
    () => new Set((trips || []).filter((t) => t.status === "archived").map((t) => t.id)),
    [trips]
  );

  const pastTripIds = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const ids = new Set();
    for (const trip of trips || []) {
      if (trip.status === "archived") {
        ids.add(trip.id);
        continue;
      }
      const endMs = parseTripStartDateMs(trip.endDate);
      if (endMs != null && endMs < todayMs) ids.add(trip.id);
    }
    return ids;
  }, [trips]);

  const tripsSortedForBudget = useMemo(
    () => [...(trips || [])].sort(compareTripsForBudgetSort),
    [trips]
  );

  const sortedAccountantNamesForTrip = useCallback(
    (tripId) => {
      const key = String(tripId || "");
      const list = teamMembersByTripId[key] || [];
      const names = [...new Set(list.map((m) => m.name).filter(Boolean))];
      names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
      return names;
    },
    [teamMembersByTripId]
  );

  const ticketsSortedWithBands = useMemo(() => {
    const startByTripId = new Map();
    for (const t of trips || []) {
      const ms = parseTripStartDateMs(t.startDate);
      startByTripId.set(t.id, ms ?? Number.MAX_SAFE_INTEGER);
    }
    const sorted = [...ticketRows].sort((a, b) => {
      const sa = startByTripId.get(a.tripId) ?? Number.MAX_SAFE_INTEGER;
      const sb = startByTripId.get(b.tripId) ?? Number.MAX_SAFE_INTEGER;
      if (sa !== sb) return sa - sb;
      const byTeam = String(a.tripName || a.tripId || "").localeCompare(
        String(b.tripName || b.tripId || ""),
        undefined,
        { sensitivity: "base" }
      );
      if (byTeam !== 0) return byTeam;
      return String(a.workerName || "").localeCompare(String(b.workerName || ""), undefined, {
        sensitivity: "base",
      });
    });
    const bands = [];
    let band = 0;
    let lastTripId;
    for (let i = 0; i < sorted.length; i++) {
      const tid = sorted[i].tripId;
      if (i > 0 && tid !== lastTripId) band += 1;
      bands.push(band);
      lastTripId = tid;
    }
    return { sorted, bands };
  }, [ticketRows, trips]);

  const visibleHousingRows = isEditingHousing ? housingRowsDraft : housingRows;
  const visibleHousingExtras = isEditingHousing ? housingExtrasDraft : housingExtrasByTripId;

  const overviewHousingRows = useMemo(() => {
    const baseRows = isEditingHousing ? housingRowsDraft : housingRows;
    if (!isEditingOverview) return baseRows;
    const draftByTripId = new Map(
      (overviewBudgetDraft || []).map((row) => [String(row.tripId), row])
    );
    return (baseRows || []).map((row) => {
      const draft = draftByTripId.get(String(row.tripId));
      if (!draft) return row;
      return {
        ...row,
        onsiteExpensesAmount: draft.onsiteExpensesAmount ?? row.onsiteExpensesAmount,
        teamAccountant: draft.teamAccountant ?? row.teamAccountant,
        returnedAmount: draft.returnedAmount ?? row.returnedAmount,
        notes: draft.notes ?? row.notes,
      };
    });
  }, [
    housingRows,
    housingRowsDraft,
    isEditingHousing,
    isEditingOverview,
    overviewBudgetDraft,
  ]);

  const tripsById = useMemo(() => {
    const map = new Map();
    for (const trip of trips || []) {
      if (trip?.id) map.set(String(trip.id), trip);
    }
    return map;
  }, [trips]);

  const budgetOverviewRows = useMemo(
    () => buildBudgetOverviewRows(overviewHousingRows, ticketRows, teamMembersByTripId, tripsById),
    [overviewHousingRows, ticketRows, teamMembersByTripId, tripsById]
  );

  const currentBudgetOverviewRows = useMemo(
    () => budgetOverviewRows.filter((row) => !pastTripIds.has(row.tripId)),
    [budgetOverviewRows, pastTripIds]
  );

  const pastBudgetOverviewRows = useMemo(() => {
    const past = budgetOverviewRows.filter((row) => pastTripIds.has(row.tripId));
    return [...past].sort((a, b) => {
      const endA = parseTripStartDateMs(tripsById.get(String(a.tripId))?.endDate);
      const endB = parseTripStartDateMs(tripsById.get(String(b.tripId))?.endDate);
      const fa = endA ?? 0;
      const fb = endB ?? 0;
      if (fa !== fb) return fb - fa;
      return String(a.teamName || "").localeCompare(String(b.teamName || ""), undefined, {
        sensitivity: "base",
      });
    });
  }, [budgetOverviewRows, pastTripIds, tripsById]);

  const budgetOverviewTotals = useMemo(
    () =>
      budgetOverviewTotalsWithHousingColumn(
        sumBudgetOverviewTotals(currentBudgetOverviewRows),
        overviewHousingRows,
        (tripId) => !pastTripIds.has(tripId)
      ),
    [currentBudgetOverviewRows, overviewHousingRows, pastTripIds]
  );

  const pastBudgetOverviewTotals = useMemo(
    () =>
      budgetOverviewTotalsWithHousingColumn(
        sumBudgetOverviewTotals(pastBudgetOverviewRows),
        overviewHousingRows,
        (tripId) => pastTripIds.has(tripId)
      ),
    [pastBudgetOverviewRows, overviewHousingRows, pastTripIds]
  );

  const siteHousingNotesForDisplay = useMemo(() => {
    const byCanonicalSite = new Map();
    for (const note of siteHousingNotes || []) {
      const canonical = resolveCanonicalSiteLabelForTrip(note?.siteName || "", siteHousingNotes);
      const key = String(canonical || note?.siteName || "").trim().toLowerCase();
      if (!key) continue;
      const existing = byCanonicalSite.get(key);
      if (!existing) {
        byCanonicalSite.set(key, { ...note, siteName: canonical || note?.siteName || "" });
        continue;
      }
      const existingTime = Date.parse(existing.updatedAt || existing.createdAt || 0) || 0;
      const candidateTime = Date.parse(note?.updatedAt || note?.createdAt || 0) || 0;
      if (candidateTime >= existingTime) {
        byCanonicalSite.set(key, { ...note, siteName: canonical || note?.siteName || "" });
      }
    }
    const merged = [...byCanonicalSite.values()].sort((a, b) =>
      String(a.siteName || "").localeCompare(String(b.siteName || ""), undefined, {
        sensitivity: "base",
      })
    );
    return merged.filter((n) => String(n.notes || "").trim() !== "");
  }, [siteHousingNotes]);

  const siteLabelsForNewHousingNote = useMemo(() => {
    const notes = siteHousingNotes || [];
    const tripGroups = groupTripsBySiteForMaterials(trips, housingRows);
    const fromTrips = tripGroups.map((g) => g.siteLabel).filter(Boolean);
    const seenCanon = new Set();
    const out = [];
    const pushLabel = (lbl) => {
      const raw = String(lbl || "").trim();
      if (!raw) return;
      const canon = resolveCanonicalSiteLabelForTrip(raw, notes).toLowerCase();
      if (!canon || seenCanon.has(canon)) return;
      seenCanon.add(canon);
      out.push(raw);
    };
    for (const o of buildSiteLabelsOrdered(notes)) pushLabel(o);
    for (const t of fromTrips) pushLabel(t);
    out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return out.filter((lbl) => {
      const key = resolveCanonicalSiteLabelForTrip(lbl, notes).toLowerCase();
      const row = notes.find(
        (n) =>
          resolveCanonicalSiteLabelForTrip(n.siteName || "", notes).toLowerCase() === key
      );
      return !row || !String(row.notes || "").trim();
    });
  }, [siteHousingNotes, trips, housingRows]);

  useEffect(() => {
    const t = String(router.query.tab || "").toLowerCase();
    if (t === "overview") setTab("Overview");
    else if (t === "housing") setTab("Housing");
    else if (t === "ticketing") setTab("Ticketing");
    else if (t === "onsite" || t === "on-site" || t === "onsite-expenses") setTab("Overview");
    else if (t === "checks") setTab("Checks");
  }, [router.query.tab]);

  const budgetCheckPendingRows = useMemo(
    () => (budgetCheckRows || []).filter((r) => r.status === "pending"),
    [budgetCheckRows]
  );
  const budgetCheckProcessedRows = useMemo(
    () => (budgetCheckRows || []).filter((r) => r.status === "processed"),
    [budgetCheckRows]
  );
  const budgetCheckTripSiteById = useMemo(() => {
    const map = {};
    for (const trip of trips || []) {
      map[String(trip.id)] = String(trip.location || "").trim();
    }
    return map;
  }, [trips]);
  const newBudgetCheckPayee = useMemo(() => {
    const tripId = newBudgetCheckTripId || tripsSortedForBudget[0]?.id;
    if (!tripId) return "";
    const row = (housingRows || []).find((r) => String(r.tripId) === String(tripId));
    return String(row?.teamAccountant || "").trim();
  }, [newBudgetCheckTripId, tripsSortedForBudget, housingRows]);
  const newBudgetCheckTripIdResolved = newBudgetCheckTripId || tripsSortedForBudget[0]?.id || "";

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const nextSession = await requireSession(router);
      if (cancelled || !nextSession) return;
      setSession(nextSession);
      if (!isManagerRole(nextSession.permissionRole || nextSession.role)) {
        router.replace("/trips");
        return;
      }

      try {
        setLoading(true);
        const [avgRes, tripsRes, housingRes, ticketsRes, rosterMembers, checkRequests] =
          await Promise.all([
            getBudgetAverages(),
            listTripsForCurrentUser(),
            listAllTripBudgets(),
            listAllTripTickets(),
            listAllTripTeamMembers().catch((err) => {
              console.warn("Could not load roster for accountant dropdown", err);
              return [];
            }),
            listBudgetCheckRequests().catch((err) => {
              console.warn("Budget check requests not loaded", err);
              return [];
            }),
          ]);
        if (cancelled) return;
        const rosterByTrip = {};
        for (const mem of rosterMembers || []) {
          const tid = String(mem.tripId || "");
          if (!tid) continue;
          if (!rosterByTrip[tid]) rosterByTrip[tid] = [];
          rosterByTrip[tid].push(mem);
        }
        if (!cancelled) setTeamMembersByTripId(rosterByTrip);
        if (!cancelled) setBudgetCheckRows(checkRequests || []);
        await syncTripTicketsFromTeamMembers(tripsRes || []);
        const refreshedTickets = await listAllTripTickets();
        if (cancelled) return;
        setTrips(tripsRes || []);
        setAverages(avgRes);
        setHousingRows(mergeHousingWithTrips(tripsRes, housingRes));
        let extrasGrouped = {};
        try {
          const extraRows = await listAllTripHousingEntries();
          extrasGrouped = groupHousingExtrasByTripId(extraRows);
        } catch (extrasErr) {
          console.warn("Housing extras not loaded", extrasErr);
        }
        setHousingExtrasByTripId(extrasGrouped);
        setTicketRows(refreshedTickets.length ? refreshedTickets : ticketsRes);
        let siteNotesFinal = [];
        try {
          const { notes: cleaned, deletedCount } = await cleanupSiteBudgetNotesRows();
          siteNotesFinal = cleaned;
          if (deletedCount > 0) {
            showToast(`Removed ${deletedCount} empty or duplicate site row(s).`, "success");
          }
        } catch (cleanupErr) {
          console.warn("[budget] site notes cleanup", cleanupErr);
          try {
            siteNotesFinal = await listSiteBudgetNotes();
          } catch (e) {
            console.warn("[budget] site notes fallback load", e);
          }
        }
        setSiteHousingNotes(siteNotesFinal);
        if (tripsRes?.length > 0 && !newTicketTripId) {
          const sorted = [...tripsRes].sort(compareTripsForBudgetSort);
          setNewTicketTripId(sorted[0].id);
        }
        if (tripsRes?.length > 0 && !newHousingSlotTripId) {
          const sorted = [...tripsRes].sort(compareTripsForBudgetSort);
          setNewHousingSlotTripId(sorted[0].id);
        }
        if (tripsRes?.length > 0 && !newBudgetCheckTripId) {
          const sorted = [...tripsRes].sort(compareTripsForBudgetSort);
          setNewBudgetCheckTripId(sorted[0].id);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e.message || "Error loading budget data.";
          showBusyOverlayError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSession();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (tab !== "Housing" || !trips.length || isEditingHousing) return;

    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      void (async () => {
        try {
          const housingRes = await listAllTripBudgets();
          setHousingRows(mergeHousingWithTrips(trips, housingRes));
        } catch (e) {
          console.warn("[budget] refresh housing on tab visibility", e);
        }
        try {
          const extraRows = await listAllTripHousingEntries();
          setHousingExtrasByTripId(groupHousingExtrasByTripId(extraRows));
        } catch (extrasErr) {
          console.warn("Housing extras not loaded", extrasErr);
        }
      })();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [tab, trips, isEditingHousing]);

  function updateHousingDraftRow(tripId, field, value) {
    setHousingRowsDraft((prev) => {
      const row = prev.find((r) => r.tripId === tripId) || {};
      const updated = { ...row, [field]: value };
      return prev.map((r) => (r.tripId === tripId ? updated : r));
    });
  }

  async function handleHousingPdfFile(tripId, file) {
    if (!file) return;
    try {
      setHousingPdfUploadingTripId(tripId);
      const url = await uploadTripHousingPdf(tripId, file);
      updateHousingDraftRow(tripId, "housingPdfUrl", url);
    } catch (e) {
      showToast(e.message || "Upload failed", "error");
    } finally {
      setHousingPdfUploadingTripId(null);
    }
  }

  function updateHousingExtraDraft(tripId, index, field, value) {
    setHousingExtrasDraft((prev) => {
      const list = [...(prev[tripId] || [])];
      if (!list[index]) return prev;
      list[index] = { ...list[index], [field]: value };
      return { ...prev, [tripId]: list };
    });
  }

  function removeHousingExtraDraft(tripId, index) {
    setHousingExtrasDraft((prev) => {
      const list = [...(prev[tripId] || [])];
      list.splice(index, 1);
      return { ...prev, [tripId]: list };
    });
  }

  function addHousingExtraDraftForTrip(tripId) {
    if (!tripId) return;
    setHousingExtrasDraft((prev) => ({
      ...prev,
      [tripId]: [
        ...(prev[tripId] || []),
        {
          id: createDraftHousingExtraId(),
          label: "",
          housingLink: "",
          housingPdfUrl: "",
        },
      ],
    }));
  }

  async function handleHousingExtraPdfFile(tripId, index, file) {
    if (!file) return;
    const key = `${tripId}:${index}`;
    try {
      setHousingExtraPdfUploadKey(key);
      const url = await uploadTripHousingExtraPdf(tripId, file);
      updateHousingExtraDraft(tripId, index, "housingPdfUrl", url);
    } catch (e) {
      showToast(e.message || "Upload failed", "error");
    } finally {
      setHousingExtraPdfUploadKey(null);
    }
  }

  function beginHousingEdit() {
    setHousingRowsDraft(housingRows.map((r) => ({ ...r })));
    setHousingExtrasDraft(cloneHousingExtrasMap(housingExtrasByTripId));
    setIsEditingHousing(true);
  }

  function handleToolbarAddHousingSlot() {
    const tripId = newHousingSlotTripId || tripsSortedForBudget[0]?.id;
    if (!tripId) {
      showToast("Create a trip first.", "error");
      return;
    }
    if (!isEditingHousing) beginHousingEdit();
    addHousingExtraDraftForTrip(tripId);
  }

  async function saveHousingBudget() {
    try {
      showBusyOverlay("Saving…");
      for (const row of housingRowsDraft) {
        const trip = trips.find((t) => t.id === row.tripId);
        await saveTripBudget(row.tripId, {
          teamName: trip?.name || "",
          projectStartDate: trip?.startDate || "",
          projectEndDate: trip?.endDate || "",
          siteCountry: trip?.location || "",
          siteCity: row.siteCity || "",
          teamAccountant: row.teamAccountant,
          housingBudgetAmount: row.housingBudgetAmount,
          returnedAmount: row.returnedAmount,
          housingAmount: row.housingAmount,
          housingLink: row.housingLink,
          housingPdfUrl: row.housingPdfUrl,
          notes: row.notes,
        });
      }
      const tripIdsToSync = new Set([
        ...housingRowsDraft.map((r) => r.tripId),
        ...Object.keys(housingExtrasDraft || {}),
        ...Object.keys(housingExtrasByTripId || {}),
      ]);
      let extrasSkippedMissingTable = false;
      for (const tripId of tripIdsToSync) {
        const syncResult = await syncTripHousingExtras(tripId, housingExtrasDraft[tripId] || []);
        if (syncResult?.skippedDueToMissingTable) extrasSkippedMissingTable = true;
      }
      const hadAnyExtraLines = Object.values(housingExtrasDraft || {}).some(
        (list) => (list || []).length > 0
      );
      const housingRes = await listAllTripBudgets();
      setHousingRows(mergeHousingWithTrips(trips, housingRes));
      const extraRows = await listAllTripHousingEntries();
      setHousingExtrasByTripId(groupHousingExtrasByTripId(extraRows));
      setIsEditingHousing(false);
      showBusyOverlayDone("Saved");
      if (extrasSkippedMissingTable && hadAnyExtraLines) {
        showToast(
          "Main housing saved, but extra housing lines need the Supabase table: run supabase/trip_housing_entries_install.sql (or trip_housing_entries.sql + trip_housing_entries_rls.sql).",
          "warning"
        );
      }
    } catch (e) {
      const msg = e.message || "Error saving.";
      showBusyOverlayError(msg);
    }
  }

  function beginTicketsEdit() {
    setTicketRowsBaseline((ticketRows || []).map((row) => ({ ...row })));
    setIsEditingTickets(true);
  }

  function cancelTicketsEdit() {
    if (ticketRowsBaseline) {
      setTicketRows(ticketRowsBaseline.map((row) => ({ ...row })));
    }
    setTicketRowsBaseline(null);
    setIsEditingTickets(false);
  }

  function updateTicketRow(ticketId, field, value) {
    setTicketRows((prev) =>
      prev.map((row) => {
        if (row.id !== ticketId) return row;
        const updated = { ...row, [field]: value };
        updated.totalLstCost = computeTotalLstCost(updated.totalTicketCost, updated.amountWorkerPaid);
        return updated;
      })
    );
  }

  async function saveTicketsEdit() {
    try {
      showBusyOverlay("Saving…");
      const rows = ticketRows || [];
      for (const row of rows) {
        await saveTripTicket({
          ...row,
          totalLstCost: computeTotalLstCost(row.totalTicketCost, row.amountWorkerPaid),
        });
      }
      const refreshedTickets = await listAllTripTickets();
      setTicketRows(refreshedTickets);
      setTicketRowsBaseline(null);
      setIsEditingTickets(false);
      setAverages(await getBudgetAverages());
      showBusyOverlayDone("Saved");
      showToast("Ticketing saved.", "success");
    } catch (e) {
      const msg = e.message || "Error saving.";
      showBusyOverlayError(msg);
    }
  }

  async function removeTicket(id) {
    try {
      await deleteTripTicket(id);
      setTicketRows((prev) => prev.filter((r) => r.id !== id));
      showBusyOverlayDone("Deleted");
    } catch (e) {
      showBusyOverlayError(e.message || "Error deleting.");
    }
  }

  async function removeBudgetRowForTrip(tripId) {
    if (!tripId) return;
    try {
      showBusyOverlay("Deleting…");
      await deleteTripBudget(tripId);
      try {
        await syncTripHousingExtras(tripId, []);
      } catch (e) {
        console.warn("Could not clear housing extras for trip", tripId, e);
      }
      const housingRes = await listAllTripBudgets();
      const nextRows = mergeHousingWithTrips(trips, housingRes);
      setHousingRows(nextRows);
      if (isEditingHousing) {
        setHousingRowsDraft(nextRows.map((r) => ({ ...r })));
        setHousingExtrasDraft((prev) => {
          const next = { ...prev };
          delete next[tripId];
          return next;
        });
      }
      const extraRows = await listAllTripHousingEntries();
      setHousingExtrasByTripId(groupHousingExtrasByTripId(extraRows));
      showBusyOverlayDone("Deleted");
      showToast("Budget row removed. Trip still exists; you can add a new row by saving from Edit.", "success");
    } catch (e) {
      const msg = e.message || "Error deleting budget row.";
      showBusyOverlayError(msg);
    }
  }

  function beginEditSiteHousingNote(note) {
    setEditingSiteNoteId(String(note?.id || ""));
    setEditingSiteNoteDraft(String(note?.notes || ""));
  }

  function cancelEditSiteHousingNote() {
    setEditingSiteNoteId("");
    setEditingSiteNoteDraft("");
  }

  async function saveSiteHousingNote(note) {
    if (!note?.id) return;
    try {
      showBusyOverlay("Saving…");
      const saved = await updateSiteBudgetNote(note.id, {
        siteName: note.siteName || "",
        effectiveDate: note.effectiveDate || null,
        notes: editingSiteNoteDraft,
        workbookNotes: note.workbookNotes ?? "",
        logisticsUrl: note.logisticsUrl ?? "",
        hostName: note.hostName ?? "",
      });
      setSiteHousingNotes((prev) => prev.map((row) => (row.id === saved.id ? saved : row)));
      cancelEditSiteHousingNote();
      showBusyOverlayDone("Saved");
      showToast(`Saved note for ${note.siteName || "site"}`, "success");
    } catch (e) {
      const msg = e.message || "Unable to save site note.";
      showBusyOverlayError(msg);
    }
  }

  async function handleDeleteSiteHousingNote() {
    const id = String(siteNoteDeleteId || "").trim();
    if (!id) return;
    const note = (siteHousingNotes || []).find((row) => String(row.id) === id);
    try {
      showBusyOverlay("Deleting…");
      await deleteSiteBudgetNote(id);
      setSiteHousingNotes((prev) => prev.filter((row) => String(row.id) !== id));
      if (String(editingSiteNoteId) === id) cancelEditSiteHousingNote();
      setSiteNoteDeleteId("");
      showBusyOverlayDone("Deleted");
      showToast(`Deleted note for ${note?.siteName || "site"}`, "success");
    } catch (e) {
      const msg = e.message || "Unable to delete site note.";
      showBusyOverlayError(msg);
    }
  }

  function beginAddSiteHousingNote() {
    if (!siteLabelsForNewHousingNote.length) {
      showToast("All sites already have a budget note.", "error");
      return;
    }
    setNewSiteHousingSelect("");
    setNewSiteHousingDraft("");
    setIsAddingSiteNote(true);
  }

  function cancelAddSiteHousingNote() {
    setIsAddingSiteNote(false);
    setNewSiteHousingSelect("");
    setNewSiteHousingDraft("");
  }

  async function saveNewSiteHousingNote() {
    const label = String(newSiteHousingSelect || "").trim();
    if (!label) {
      showToast("Choose a site first.", "error");
      return;
    }
    if (!String(newSiteHousingDraft || "").trim()) {
      showToast("Add note text before saving.", "error");
      return;
    }
    try {
      showBusyOverlay("Saving…");
      const saved = await saveSiteHousingNoteForSiteLabel(label, newSiteHousingDraft);
      const fresh = await listSiteBudgetNotes();
      setSiteHousingNotes(fresh);
      cancelAddSiteHousingNote();
      showBusyOverlayDone("Saved");
      showToast(`Saved housing note for ${saved.siteName || label}`, "success");
    } catch (e) {
      const msg = e.message || "Unable to save site note.";
      showBusyOverlayError(msg);
    }
  }

  async function handleBudgetCheckPayeeChange(teamAccountant) {
    const tripId = newBudgetCheckTripIdResolved;
    if (!tripId) return;
    const prior =
      String(
        (housingRows || []).find((r) => String(r.tripId) === String(tripId))?.teamAccountant || ""
      ).trim();
    const next = String(teamAccountant || "").trim();
    if (next === prior) return;

    setBudgetCheckPayeeSaving(true);
    setHousingRows((rows) =>
      rows.map((r) => (String(r.tripId) === String(tripId) ? { ...r, teamAccountant: next } : r))
    );
    if (isEditingHousing) {
      setHousingRowsDraft((rows) =>
        rows.map((r) => (String(r.tripId) === String(tripId) ? { ...r, teamAccountant: next } : r))
      );
    }
    try {
      await saveTripBudget(tripId, { teamAccountant: next });
      showToast("Team accountant saved.", "success");
    } catch (e) {
      setHousingRows((rows) =>
        rows.map((r) =>
          String(r.tripId) === String(tripId) ? { ...r, teamAccountant: prior } : r
        )
      );
      if (isEditingHousing) {
        setHousingRowsDraft((rows) =>
          rows.map((r) =>
            String(r.tripId) === String(tripId) ? { ...r, teamAccountant: prior } : r
          )
        );
      }
      showToast(e.message || "Could not save team accountant.", "error");
    } finally {
      setBudgetCheckPayeeSaving(false);
    }
  }

  async function handleSubmitBudgetCheckFromBudgetPage() {
    const tripId = newBudgetCheckTripId || trips[0]?.id;
    if (!tripId) {
      showToast("Choose a trip first.", "error");
      return;
    }
    if (!String(newBudgetCheckAmount || "").trim()) {
      showToast("Enter the check amount.", "error");
      return;
    }
    try {
      setBudgetCheckSubmitting(true);
      const submitResult = await submitBudgetCheckRequest({
        tripId,
        amount: newBudgetCheckAmount,
        note: newBudgetCheckNote,
      });
      const next = await listBudgetCheckRequests();
      setBudgetCheckRows(next);
      setNewBudgetCheckAmount("");
      setNewBudgetCheckNote("");
      const { type, message } = budgetCheckSubmitToast(submitResult);
      showToast(message, type);
      if (typeof window !== "undefined" && tripId) {
        window.dispatchEvent(
          new CustomEvent(STAFF_TASKS_UPDATED_EVENT, { detail: { tripId } })
        );
      }
    } catch (e) {
      showToast(e.message || "Request failed.", "error");
    } finally {
      setBudgetCheckSubmitting(false);
    }
  }

  async function handleMarkBudgetCheckProcessed(id) {
    try {
      setBudgetCheckProcessingId(id);
      const rowForTrip = budgetCheckRows.find((r) => r.id === id);
      await markBudgetCheckRequestProcessed(id);
      const next = await listBudgetCheckRequests();
      setBudgetCheckRows(next);
      showToast("Marked processed.", "success");
      if (typeof window !== "undefined" && rowForTrip?.tripId) {
        window.dispatchEvent(
          new CustomEvent(STAFF_TASKS_UPDATED_EVENT, { detail: { tripId: rowForTrip.tripId } })
        );
      }
    } catch (e) {
      showToast(e.message || "Could not update.", "error");
    } finally {
      setBudgetCheckProcessingId("");
    }
  }

  function openBudgetCheckEdit(row) {
    setBudgetCheckEditId(row.id);
    setBudgetCheckEditAmount(String(row.amountRequested || "").trim());
    setBudgetCheckEditNote(String(row.note || "").trim());
  }

  function closeBudgetCheckEdit() {
    setBudgetCheckEditId("");
    setBudgetCheckEditAmount("");
    setBudgetCheckEditNote("");
    setBudgetCheckEditSaving(false);
  }

  function budgetCheckDonnaNotesValue(row) {
    if (Object.prototype.hasOwnProperty.call(budgetCheckDonnaNotesDraft, row.id)) {
      return budgetCheckDonnaNotesDraft[row.id];
    }
    return row.donnaNotes || "";
  }

  function updateBudgetCheckDonnaNotesDraft(id, value) {
    setBudgetCheckDonnaNotesDraft((current) => ({ ...current, [id]: value }));
  }

  async function handleSaveBudgetCheckDonnaNotes(row) {
    const nextValue = String(budgetCheckDonnaNotesValue(row) || "").trim();
    const savedValue = String(row.donnaNotes || "").trim();
    if (nextValue === savedValue) return;

    try {
      setBudgetCheckDonnaNotesSavingId(row.id);
      await updateBudgetCheckDonnaNotes({ id: row.id, donnaNotes: nextValue });
      const refreshed = await listBudgetCheckRequests();
      setBudgetCheckRows(refreshed);
      setBudgetCheckDonnaNotesDraft((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      showToast("Donna notes saved.", "success");
    } catch (e) {
      showToast(e.message || "Could not save Donna notes.", "error");
    } finally {
      setBudgetCheckDonnaNotesSavingId("");
    }
  }

  async function handleSaveBudgetCheckEdit() {
    if (!budgetCheckEditId) return;
    if (!String(budgetCheckEditAmount || "").trim()) {
      showToast("Enter the check amount.", "error");
      return;
    }
    try {
      setBudgetCheckEditSaving(true);
      await updateBudgetCheckRequest({
        id: budgetCheckEditId,
        amount: budgetCheckEditAmount,
        note: budgetCheckEditNote,
      });
      const next = await listBudgetCheckRequests();
      setBudgetCheckRows(next);
      closeBudgetCheckEdit();
      showToast("Request updated.", "success");
      const edited = next.find((r) => r.id === budgetCheckEditId);
      if (typeof window !== "undefined" && edited?.tripId) {
        window.dispatchEvent(
          new CustomEvent(STAFF_TASKS_UPDATED_EVENT, { detail: { tripId: edited.tripId } })
        );
      }
    } catch (e) {
      showToast(e.message || "Could not save.", "error");
    } finally {
      setBudgetCheckEditSaving(false);
    }
  }

  async function handleConfirmDeleteBudgetCheck() {
    if (!budgetCheckDeleteId) return;
    const rowForTrip = budgetCheckRows.find((r) => r.id === budgetCheckDeleteId);
    try {
      await deleteBudgetCheckRequest(budgetCheckDeleteId);
      const next = await listBudgetCheckRequests();
      setBudgetCheckRows(next);
      setBudgetCheckDeleteId("");
      showToast("Request deleted.", "success");
      if (typeof window !== "undefined" && rowForTrip?.tripId) {
        window.dispatchEvent(
          new CustomEvent(STAFF_TASKS_UPDATED_EVENT, { detail: { tripId: rowForTrip.tripId } })
        );
      }
    } catch (e) {
      showToast(e.message || "Could not delete.", "error");
    }
  }

  async function handleAddTicket() {
    const tripId = newTicketTripId || trips[0]?.id;
    if (!tripId) {
            return;
    }
    const trip = trips.find((t) => t.id === tripId);
    try {
      showBusyOverlay("Adding…");
      const saved = await saveTripTicket({
        tripId,
        intlDom: defaultIntlDomForLocation(trip?.location),
        workerName: "",
        projectCountry: trip?.location || "",
        projectCity: "",
        departureDate: trip?.startDate || "",
        ticketAgency: "",
        totalTicketCost: "",
        amountWorkerPaid: "",
        totalLstCost: "",
        hpTotalCharge: "",
        dateApprovedToWithdraw: "",
        notes: "",
      });
      setTicketRows((prev) => [...prev, { ...saved, tripName: trip?.name || "" }]);
      showBusyOverlayDone("Added");
    } catch (e) {
      const msg = e.message || "Unable to add.";
      showBusyOverlayError(msg);
    }
  }

  async function refreshBudgetTeamData() {
    const housingRes = await listAllTripBudgets();
    setHousingRows(mergeHousingWithTrips(trips, housingRes));
    const refreshedTickets = await listAllTripTickets();
    setTicketRows(refreshedTickets);
    setAverages(await getBudgetAverages());
  }

  function beginOverviewEdit() {
    setOverviewBudgetDraft(
      housingRows.map((row) => ({
        tripId: row.tripId,
        onsiteExpensesAmount: row.onsiteExpensesAmount || "",
        teamAccountant: row.teamAccountant || "",
        returnedAmount: row.returnedAmount || "",
        notes: row.notes || "",
      }))
    );
    setIsEditingOverview(true);
  }

  function cancelOverviewEdit() {
    setOverviewBudgetDraft([]);
    setIsEditingOverview(false);
  }

  function updateOverviewBudgetDraft(tripId, patch) {
    setOverviewBudgetDraft((prev) =>
      prev.map((row) => (row.tripId === tripId ? { ...row, ...patch } : row))
    );
  }

  async function saveOverviewBudget() {
    try {
      showBusyOverlay("Saving…");
      for (const row of overviewBudgetDraft) {
        await saveTripBudget(row.tripId, {
          onsiteExpensesAmount: row.onsiteExpensesAmount ?? "",
          teamAccountant: row.teamAccountant ?? "",
          returnedAmount: row.returnedAmount ?? "",
          notes: row.notes ?? "",
        });
      }
      const housingRes = await listAllTripBudgets();
      setHousingRows(mergeHousingWithTrips(trips, housingRes));
      if (isEditingHousing) {
        setHousingRowsDraft((prev) =>
          (prev || []).map((row) => {
            const draft = overviewBudgetDraft.find((d) => String(d.tripId) === String(row.tripId));
            if (!draft) return row;
            return {
              ...row,
              onsiteExpensesAmount: draft.onsiteExpensesAmount ?? row.onsiteExpensesAmount,
              teamAccountant: draft.teamAccountant ?? row.teamAccountant,
              returnedAmount: draft.returnedAmount ?? row.returnedAmount,
              notes: draft.notes ?? row.notes,
            };
          })
        );
      }
      setIsEditingOverview(false);
      setOverviewBudgetDraft([]);
      showBusyOverlayDone("Saved");
      showToast("Overview amounts saved.", "success");
    } catch (e) {
      const msg = e.message || "Error saving.";
      showBusyOverlayError(msg);
    }
  }

  if (!session || loading) {
    return (
      <Shell>
        <div className="card pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Spinner size={40} />
          <div style={{ fontWeight: 900 }}>{loading ? "Loading budget..." : "Redirecting..."}</div>
        </div>
      </Shell>
    );
  }

  const teamEditorTrip = (trips || []).find((trip) => trip.id === teamEditorTripId) || null;

  return (
    <Shell>
      <ConfirmModal
        open={!!ticketToDeleteId}
        title="Delete ticket?"
        message="This ticket row will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (ticketToDeleteId) removeTicket(ticketToDeleteId);
          setTicketToDeleteId(null);
        }}
        onCancel={() => setTicketToDeleteId(null)}
      />
      <ConfirmModal
        open={!!budgetRowDeleteTripId}
        title="Delete budget row?"
        message="This removes the saved budget record for this trip (housing, amounts, and materials fields on that row). The trip itself is not deleted. Extra housing lines for this trip are cleared too."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (budgetRowDeleteTripId) void removeBudgetRowForTrip(budgetRowDeleteTripId);
          setBudgetRowDeleteTripId(null);
        }}
        onCancel={() => setBudgetRowDeleteTripId(null)}
      />
      <ConfirmModal
        open={!!siteNoteDeleteId}
        title="Delete team budget note?"
        message="This permanently removes the note for this site. Workbook and logistics data on Sites are not changed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => void handleDeleteSiteHousingNote()}
        onCancel={() => setSiteNoteDeleteId("")}
      />
      <ConfirmModal
        open={!!budgetCheckDeleteId}
        title="Delete check request?"
        message="This removes the request and deletes the linked personal accounting task if one exists. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => void handleConfirmDeleteBudgetCheck()}
        onCancel={() => setBudgetCheckDeleteId("")}
      />
      {budgetCheckEditId ? (
        <div
          className="appModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Edit budget check request"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.45)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !budgetCheckEditSaving) closeBudgetCheckEdit();
          }}
        >
          <div className="card pad" style={{ width: "min(400px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>Edit check request</div>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <label className="small" htmlFor="budget-check-edit-payee" style={{ display: "block", marginBottom: 4 }}>
                  Payee
                </label>
                <input
                  id="budget-check-edit-payee"
                  className="input"
                  readOnly
                  value={
                    String(
                      budgetCheckRows.find((r) => r.id === budgetCheckEditId)?.teamAccountantSnapshot || ""
                    ).trim()
                  }
                  style={ticketComputedFieldStyle}
                  aria-readonly="true"
                />
              </div>
              <div>
                <label className="small" htmlFor="budget-check-edit-amount" style={{ display: "block", marginBottom: 4 }}>
                  Amount
                </label>
                <input
                  id="budget-check-edit-amount"
                  className="input"
                  inputMode="decimal"
                  value={budgetCheckEditAmount}
                  onChange={(e) => setBudgetCheckEditAmount(e.target.value)}
                  onBlur={() => setBudgetCheckEditAmount((v) => normalizeMoneyInputToUsd(v))}
                />
              </div>
              <div>
                <label className="small" htmlFor="budget-check-edit-note" style={{ display: "block", marginBottom: 4 }}>
                  Note
                </label>
                <input
                  id="budget-check-edit-note"
                  className="input"
                  value={budgetCheckEditNote}
                  onChange={(e) => setBudgetCheckEditNote(e.target.value)}
                  placeholder="Memo (optional)"
                />
              </div>
            </div>
            <div className="row" style={{ marginTop: 14, justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn" disabled={budgetCheckEditSaving} onClick={closeBudgetCheckEdit}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btnPrimary"
                disabled={budgetCheckEditSaving}
                onClick={() => void handleSaveBudgetCheckEdit()}
              >
                {budgetCheckEditSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="budgetPage">
        <div className="budgetPageHeader">
          <div className="budgetPageHeaderMain">
            <h1 className="h1" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <AppIcon name="active" className="pageEyebrowIcon" />
              <span>Budget</span>
            </h1>

            <div className="tabs" style={{ marginBottom: 0 }}>
              <button
                type="button"
                className={"tab " + (tab === "Overview" ? "tabActive" : "")}
                onClick={() => setTab("Overview")}
              >
                Overview
              </button>
              <button
                type="button"
                className={"tab " + (tab === "Housing" ? "tabActive" : "")}
                onClick={() => setTab("Housing")}
              >
                Housing budget
              </button>
              <button
                type="button"
                className={"tab " + (tab === "Ticketing" ? "tabActive" : "")}
                onClick={() => setTab("Ticketing")}
              >
                Ticketing
              </button>
              <button
                type="button"
                className={"tab " + (tab === "Checks" ? "tabActive" : "")}
                onClick={() => setTab("Checks")}
              >
                Checks
              </button>
            </div>
          </div>

          {averages && tab !== "Checks" ? (
            <div className="budgetAveragesHeader" aria-label="Budget averages">
              <div className="budgetAveragesHeaderTitle">Budget averages</div>
              <div className="budgetAveragesHeaderCards">
                <div className="budgetAveragesHeaderCard budgetAveragesHeaderCardAirfare">
                  <div className="budgetAveragesHeaderCardLabel">Airfare</div>
                  <div className="budgetAveragesHeaderCardValue">
                    {averages.airfare?.average != null
                      ? formatUsdNumber(Number(averages.airfare.average))
                      : "—"}
                  </div>
                  {averages.airfare?.count > 0 ? (
                    <div className="budgetAveragesHeaderCardMeta">
                      {averages.airfare.count} ticket{averages.airfare.count === 1 ? "" : "s"}
                    </div>
                  ) : null}
                </div>
                <div className="budgetAveragesHeaderCard budgetAveragesHeaderCardHousing">
                  <div className="budgetAveragesHeaderCardLabel">Housing</div>
                  <div className="budgetAveragesHeaderCardValue">
                    {averages.housing?.average != null
                      ? formatUsdNumber(Number(averages.housing?.average))
                      : "—"}
                  </div>
                  {averages.housing?.count > 0 ? (
                    <div className="budgetAveragesHeaderCardMeta">
                      {averages.housing?.count} team{averages.housing?.count === 1 ? "" : "s"}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {tab !== "Checks" ? (
        <CollapsibleSection
          title="Team budget notes"
          defaultOpen={false}
          forceOpen={isAddingSiteNote}
          style={{ marginBottom: 24 }}
          rightSlot={
            <button
              className="btn btnPrimary"
              type="button"
              disabled={!siteLabelsForNewHousingNote.length || isAddingSiteNote}
              onClick={(e) => {
                e.stopPropagation();
                beginAddSiteHousingNote();
              }}
            >
              Add site note
            </button>
          }
        >
          <p className="small" style={{ margin: "0 0 12px", color: "var(--muted)" }}>
            Per-site logistics and workbook data stay on{" "}
            <Link href="/sites">Sites</Link>. Here you only see sites with budget note text. Empty and duplicate
            rows are cleaned when this page loads.
          </p>
          {isAddingSiteNote ? (
            <div
              style={{
                border: "1px solid rgba(14, 116, 144, 0.35)",
                borderRadius: 10,
                padding: "12px 14px 14px",
                marginBottom: 16,
                background: "rgba(240, 249, 255, 0.6)",
              }}
            >
              <div style={{ marginBottom: 10 }}>
                <label
                  className="small"
                  htmlFor="budget-add-site-housing-note"
                  style={{ display: "block", marginBottom: 4, color: "var(--muted)" }}
                >
                  Site
                </label>
                <select
                  id="budget-add-site-housing-note"
                  className="input"
                  value={newSiteHousingSelect}
                  onChange={(e) => setNewSiteHousingSelect(e.target.value)}
                >
                  <option value="">Choose site…</option>
                  {siteLabelsForNewHousingNote.map((lbl) => (
                    <option key={lbl} value={lbl}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                className="input"
                rows={5}
                value={newSiteHousingDraft}
                onChange={(e) => setNewSiteHousingDraft(e.target.value)}
                placeholder="Enter budget note for this site"
              />
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <button className="btn btnPrimary" type="button" onClick={() => void saveNewSiteHousingNote()}>
                  Save
                </button>
                <button className="btn" type="button" onClick={cancelAddSiteHousingNote}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          {siteHousingNotesForDisplay.length === 0 && !isAddingSiteNote ? (
            <p className="small" style={{ margin: 0, color: "var(--muted)" }}>
              No budget notes yet. Use <strong>Add site note</strong>, or edit workbook counts on{" "}
              <Link href="/sites">Sites</Link>.
            </p>
          ) : siteHousingNotesForDisplay.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                gap: 12,
              }}
            >
              {siteHousingNotesForDisplay.map((n) => {
                  const noteText = String(n.notes || "").trim();
                  const isEditingThisNote = String(editingSiteNoteId) === String(n.id || "");
                  return (
                    <div
                      key={n.id}
                      style={{
                        border: "1px solid rgba(15, 23, 42, 0.1)",
                        borderRadius: 10,
                        padding: "12px 14px 14px",
                        minHeight: 0,
                        background: "rgba(248, 250, 252, 0.9)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 12,
                          marginBottom: 8,
                          lineHeight: 1.35,
                          wordBreak: "break-word",
                        }}
                      >
                        {n.siteName || "—"}
                      </div>
                      {isEditingThisNote ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          <textarea
                            className="input"
                            rows={5}
                            value={editingSiteNoteDraft}
                            onChange={(e) => setEditingSiteNoteDraft(e.target.value)}
                            placeholder="Enter site housing note"
                          />
                          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                            <button className="btn btnPrimary" type="button" onClick={() => void saveSiteHousingNote(n)}>
                              Save
                            </button>
                            <button className="btn" type="button" onClick={cancelEditSiteHousingNote}>
                              Cancel
                            </button>
                            <button
                              className="btn"
                              type="button"
                              style={{ color: "var(--danger)" }}
                              onClick={() => setSiteNoteDeleteId(String(n.id))}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className="small"
                            style={{
                              lineHeight: 1.5,
                              fontSize: 12,
                              wordBreak: "break-word",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {noteText}
                          </div>
                          <div className="row" style={{ marginTop: 8 }}>
                            <button className="btn" type="button" onClick={() => beginEditSiteHousingNote(n)}>
                              Edit note
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : null}
        </CollapsibleSection>
        ) : null}

        {tab === "Overview" && (
          <>
          <div className="card pad" style={budgetSectionCardStyle}>
            <div style={{ marginBottom: 8 }}>
              <div
                className="row mobileSectionHeader"
                style={{ gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}
              >
                <div style={{ fontWeight: 900 }}>Team budget overview</div>
                <div
                  className="row mobileSectionHeaderActions"
                  style={{
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    marginLeft: "auto",
                  }}
                >
                  {isEditingOverview ? (
                    <>
                      <button type="button" className="btn" onClick={cancelOverviewEdit}>
                        Cancel
                      </button>
                      <button type="button" className="btn btnPrimary" onClick={() => void saveOverviewBudget()}>
                        Save
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btnPrimary" onClick={beginOverviewEdit}>
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>

            <BudgetOverviewTable
              rows={currentBudgetOverviewRows}
              totals={budgetOverviewTotals}
              isEditingOverview={isEditingOverview}
              archivedTripIds={archivedTripIds}
              pastTripIds={pastTripIds}
              onSelectTrip={setTeamEditorTripId}
              onUpdateDraft={updateOverviewBudgetDraft}
              getAccountantNames={sortedAccountantNamesForTrip}
            />

            {currentBudgetOverviewRows.length === 0 && pastBudgetOverviewRows.length === 0 ? (
              <EmptyState
                icon="empty"
                title="No teams yet"
                description="Trips appear here once they are created and visible on the Housing budget tab."
              />
            ) : currentBudgetOverviewRows.length === 0 ? (
              <EmptyState
                icon="empty"
                title="No current teams"
                description="All budget teams are in the past trips section below."
              />
            ) : null}
          </div>

          {pastBudgetOverviewRows.length > 0 ? (
            <div
              className="card pad"
              style={{
                ...budgetSectionCardStyle,
                marginTop: 24,
                background:
                  "linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.92))",
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <div
                  className="row"
                  style={{ alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}
                >
                  <div style={{ fontWeight: 900 }}>Past trips</div>
                  <span className="badge">{pastBudgetOverviewRows.length}</span>
                </div>
              </div>

              <BudgetOverviewTable
                rows={pastBudgetOverviewRows}
                totals={pastBudgetOverviewTotals}
                isEditingOverview={isEditingOverview}
                archivedTripIds={archivedTripIds}
                pastTripIds={pastTripIds}
                onSelectTrip={setTeamEditorTripId}
                onUpdateDraft={updateOverviewBudgetDraft}
                getAccountantNames={sortedAccountantNamesForTrip}
              />
            </div>
          ) : null}
          </>
        )}

        {tab === "Housing" && (
        <>
        <div className="card pad" style={budgetSectionCardStyle}>
          <div
            className="row appPolishToolbar mobileSectionHeader"
            style={{ ...budgetSectionHeaderStyle, alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}
          >
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <div
                className="row mobileSectionHeader"
                style={{ gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}
              >
                <div className="appSectionBadge" style={{ marginBottom: 0 }}>Housing</div>
                <div
                  className="row mobileSectionHeaderActions"
                  style={{
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    marginLeft: "auto",
                  }}
                >
                  <button
                    type="button"
                    className={isEditingHousing ? "btn btnPrimary" : "btn"}
                    onClick={() => {
                      if (isEditingHousing) void saveHousingBudget();
                      else beginHousingEdit();
                    }}
                  >
                    {isEditingHousing ? "Save" : "Edit"}
                  </button>
                  {isEditingHousing ? (
                    <button type="button" className="btn" onClick={() => setIsEditingHousing(false)}>
                      Cancel
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const header = [
                        "Team Name",
                        "Project Start",
                        "Project End",
                        "Site",
                        "Workers (roster)",
                        "Team Accountant",
                        "Housing Amount",
                        "Housing Link",
                        "Housing PDF URL",
                        "Additional housing (extra slots)",
                        "Notes",
                      ];
                      const rows = (isEditingHousing ? housingRowsDraft : housingRows).map((r) => [
                        r.teamName || "",
                        r.projectStartDate || "",
                        r.projectEndDate || "",
                        r.siteCountry || "",
                        String(countTripRosterMembers(teamMembersByTripId, r.tripId)),
                        r.teamAccountant || "",
                        formatUsdDisplay(r.housingAmount),
                        r.housingLink || "",
                        r.housingPdfUrl || "",
                        formatHousingExtrasForCsv(
                          r.tripId,
                          housingExtrasDraft,
                          housingExtrasByTripId,
                          isEditingHousing
                        ),
                        r.notes || "",
                      ]);
                      const csvContent = [header, ...rows]
                        .map((cols) =>
                          cols
                            .map((val) => {
                              const s = String(val ?? "");
                              if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
                              return s;
                            })
                            .join(",")
                        )
                        .join("\n");
                      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      const dateStr = new Date().toISOString().slice(0, 10);
                      const housingFilename = `budget-housing-${dateStr}.csv`;
                      link.download = housingFilename;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      showToast(`Exported ${housingFilename}`);
                    }}
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              {tripsSortedForBudget.length > 0 ? (
                <div
                  className="row"
                  style={{ marginTop: 10, gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}
                >
                  <div style={{ flex: "0 1 260px", minWidth: 0 }}>
                    <label
                      className="small"
                      htmlFor="budget-add-housing-trip"
                      style={{ display: "block", marginBottom: 4, color: "var(--muted)" }}
                    >
                      Trip
                    </label>
                    <select
                      id="budget-add-housing-trip"
                      className="input"
                      value={newHousingSlotTripId}
                      onChange={(e) => setNewHousingSlotTripId(e.target.value)}
                    >
                      {tripsSortedForBudget.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name || t.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btnPrimary" type="button" onClick={handleToolbarAddHousingSlot}>
                    Add Housing
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <div className="budgetTableScroller">
            <table className="table dataTableStriped budgetStickyTable" style={{ minWidth: 1500, fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Team Name</th>
                  <th>Project Start</th>
                  <th>Project End</th>
                  <th>Site</th>
                  <th style={{ width: 72, textAlign: "center" }}>Workers</th>
                  <th>Team Accountant</th>
                  <th>Housing Amount</th>
                  <th>Housing link / PDF</th>
                  <th style={{ minWidth: 280 }}>Notes</th>
                  <th style={{ width: 88 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(isEditingHousing ? housingRowsDraft : housingRows).map((r, rowIndex) => {
                  const isArchived = archivedTripIds.has(r.tripId);
                  const housingExtrasList =
                    (isEditingHousing ? housingExtrasDraft[r.tripId] : housingExtrasByTripId[r.tripId]) ||
                    [];
                  const baseRowStyle = rowIndex % 2 === 0 ? undefined : { backgroundColor: "rgba(15, 23, 42, 0.02)" };
                  return (
                  <tr
                    key={r.id || r.tripId}
                    style={
                      isArchived
                        ? { opacity: 0.7, backgroundColor: "var(--border)", borderLeft: "3px solid var(--muted)" }
                        : baseRowStyle
                    }
                    title={isArchived ? "Archived team" : undefined}
                  >
                    {isEditingHousing ? (
                      <>
                        <td>
                          <span className="row" style={{ gap: 6, alignItems: "center" }}>
                            {isArchived && (
                              <span className="small" style={{ color: "var(--muted)", fontWeight: 600 }}>
                                Archived
                              </span>
                            )}
                            {r.teamName || "—"}
                          </span>
                        </td>
                        <td>{r.projectStartDate || "—"}</td>
                        <td>{r.projectEndDate || "—"}</td>
                        <td>{r.siteCountry || "—"}</td>
                        <td
                          style={{
                            minWidth: 72,
                            textAlign: "center",
                            verticalAlign: "middle",
                            fontWeight: 700,
                          }}
                          title="Count of people on this trip’s roster (Trip → Team)"
                        >
                          {countTripRosterMembers(teamMembersByTripId, r.tripId)}
                        </td>
                        <td style={{ minWidth: 160, maxWidth: 240 }}>
                          <select
                            className="input"
                            value={r.teamAccountant || ""}
                            onChange={(e) =>
                              updateHousingDraftRow(r.tripId, "teamAccountant", e.target.value)
                            }
                          >
                            <option value="">— Select team member —</option>
                            {sortedAccountantNamesForTrip(r.tripId).map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                            {r.teamAccountant &&
                            !sortedAccountantNamesForTrip(r.tripId).includes(r.teamAccountant) ? (
                              <option value={r.teamAccountant}>
                                {r.teamAccountant} (not on roster)
                              </option>
                            ) : null}
                          </select>
                          {sortedAccountantNamesForTrip(r.tripId).length === 0 ? (
                            <div className="small" style={{ marginTop: 6, color: "var(--muted)" }}>
                              No roster members yet for this trip.
                            </div>
                          ) : null}
                        </td>
                        <td style={{ minWidth: 112 }}>
                          <input
                            className="input"
                            value={r.housingAmount || ""}
                            onChange={(e) => updateHousingDraftRow(r.tripId, "housingAmount", e.target.value)}
                            onBlur={(e) => {
                              const next = normalizeMoneyInputToUsd(e.target.value);
                              if (next !== (r.housingAmount || "")) {
                                updateHousingDraftRow(r.tripId, "housingAmount", next);
                              }
                            }}
                            inputMode="decimal"
                            placeholder="$0.00"
                            style={{
                              color: housingLineAmountVsBudgetColor(r.housingAmount, HOUSING1_BUDGET_PER_TEAM),
                            }}
                          />
                        </td>
                        <td style={{ minWidth: 220, maxWidth: 360 }}>
                          <div className="budgetSheetCellStack">
                            <input
                              className="input"
                              inputMode="url"
                              placeholder="https://… (optional if PDF)"
                              value={r.housingLink || ""}
                              onChange={(e) => updateHousingDraftRow(r.tripId, "housingLink", e.target.value)}
                            />
                            <div className="budgetSheetFileRow">
                              <label className="small budgetSheetFileBtn" style={{ cursor: "pointer", fontWeight: 600, margin: 0 }}>
                                <input
                                  type="file"
                                  accept="application/pdf,.pdf"
                                  style={{ display: "none" }}
                                  disabled={housingPdfUploadingTripId === r.tripId}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = "";
                                    void handleHousingPdfFile(r.tripId, f);
                                  }}
                                />
                                {housingPdfUploadingTripId === r.tripId ? "Uploading…" : "Choose PDF"}
                              </label>
                              {r.housingPdfUrl ? (
                                <>
                                  <a
                                    className="small"
                                    href={r.housingPdfUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Open PDF
                                  </a>
                                  <button
                                    type="button"
                                    className="btn"
                                    style={{ padding: "2px 8px", fontSize: 11 }}
                                    onClick={() => updateHousingDraftRow(r.tripId, "housingPdfUrl", "")}
                                  >
                                    Clear PDF
                                  </button>
                                </>
                              ) : (
                                <span className="small" style={{ color: "var(--muted)" }}>
                                  No PDF
                                </span>
                              )}
                            </div>
                          {housingExtrasList.map((ex, idx) => (
                            <div key={ex.id || `extra-${r.tripId}-${idx}`} className="budgetSheetExtraBlock">
                              <div
                                className="row"
                                style={{
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: 6,
                                  gap: 8,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span className="small" style={{ fontWeight: 700 }}>
                                  Additional {idx + 1}
                                </span>
                                <button
                                  type="button"
                                  className="btn"
                                  style={{ padding: "2px 8px", fontSize: 11, color: "var(--danger)" }}
                                  onClick={() => removeHousingExtraDraft(r.tripId, idx)}
                                >
                                  Delete line
                                </button>
                              </div>
                              <input
                                className="input"
                                style={{ marginBottom: 6 }}
                                placeholder="Label (optional)"
                                value={ex.label || ""}
                                onChange={(e) =>
                                  updateHousingExtraDraft(r.tripId, idx, "label", e.target.value)
                                }
                              />
                              <input
                                className="input"
                                inputMode="url"
                                placeholder="https://…"
                                value={ex.housingLink || ""}
                                onChange={(e) =>
                                  updateHousingExtraDraft(r.tripId, idx, "housingLink", e.target.value)
                                }
                              />
                              <div className="budgetSheetFileRow" style={{ marginTop: 6 }}>
                                <label className="small" style={{ cursor: "pointer", fontWeight: 600, margin: 0 }}>
                                  <input
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    style={{ display: "none" }}
                                    disabled={housingExtraPdfUploadKey === `${r.tripId}:${idx}`}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      e.target.value = "";
                                      void handleHousingExtraPdfFile(r.tripId, idx, f);
                                    }}
                                  />
                                  {housingExtraPdfUploadKey === `${r.tripId}:${idx}`
                                    ? "Uploading…"
                                    : "Choose PDF"}
                                </label>
                                {ex.housingPdfUrl ? (
                                  <>
                                    <a className="small" href={ex.housingPdfUrl} target="_blank" rel="noreferrer">
                                      Open PDF
                                    </a>
                                    <button
                                      type="button"
                                      className="btn"
                                      style={{ padding: "2px 8px", fontSize: 11 }}
                                      onClick={() =>
                                        updateHousingExtraDraft(r.tripId, idx, "housingPdfUrl", "")
                                      }
                                    >
                                      Clear PDF
                                    </button>
                                  </>
                                ) : (
                                  <span className="small" style={{ color: "var(--muted)" }}>
                                    No PDF
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          </div>
                        </td>
                        <td style={{ minWidth: 280, width: 320 }}>
                          <textarea
                            className="input"
                            rows={4}
                            value={r.notes || ""}
                            onChange={(e) => updateHousingDraftRow(r.tripId, "notes", e.target.value)}
                            placeholder="Notes"
                            style={{
                              width: "100%",
                              minHeight: 88,
                              resize: "vertical",
                              lineHeight: 1.4,
                            }}
                          />
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {r.id ? (
                            <button
                              type="button"
                              className="btn"
                              onClick={() => setBudgetRowDeleteTripId(r.tripId)}
                            >
                              Delete
                            </button>
                          ) : (
                            <span className="small" style={{ color: "var(--muted)" }}>
                              —
                            </span>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <span className="row" style={{ gap: 6, alignItems: "center" }}>
                            {isArchived && <span className="small" style={{ color: "var(--muted)", fontWeight: 600 }}>Archived</span>}
                            {r.teamName || ""}
                          </span>
                        </td>
                        <td>{r.projectStartDate || ""}</td>
                        <td>{r.projectEndDate || ""}</td>
                        <td>{r.siteCountry || ""}</td>
                        <td
                          style={{ textAlign: "center", fontWeight: 700 }}
                          title="Count of people on this trip’s roster (Trip → Team)"
                        >
                          {countTripRosterMembers(teamMembersByTripId, r.tripId)}
                        </td>
                        <td>{r.teamAccountant || ""}</td>
                        <td
                          style={{
                            color: housingLineAmountVsBudgetColor(r.housingAmount, HOUSING1_BUDGET_PER_TEAM),
                          }}
                        >
                          {formatUsdDisplay(r.housingAmount)}
                        </td>
                        <td className="small" style={{ maxWidth: 280, wordBreak: "break-word", verticalAlign: "top" }}>
                          <div style={{ marginBottom: housingExtrasList.length ? 8 : 0 }}>
                            {r.housingLink || r.housingPdfUrl ? (
                              <>
                                <div style={{ marginTop: 0 }}>
                                  {r.housingLink ? (
                                    <a
                                      href={
                                        /^https?:\/\//i.test(String(r.housingLink).trim())
                                          ? String(r.housingLink).trim()
                                          : `https://${String(r.housingLink).trim()}`
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {r.housingLink}
                                    </a>
                                  ) : null}
                                  {r.housingLink && r.housingPdfUrl ? <br /> : null}
                                  {r.housingPdfUrl ? (
                                    <a href={r.housingPdfUrl} target="_blank" rel="noreferrer">
                                      Housing PDF
                                    </a>
                                  ) : null}
                                </div>
                              </>
                            ) : housingExtrasList.length ? null : (
                              "—"
                            )}
                          </div>
                          {housingExtrasList.length ? (
                            <div style={{ display: "grid", gap: 8 }}>
                              {housingExtrasList.map((ex, idx) => (
                                <div
                                  key={ex.id}
                                  style={{
                                    paddingTop: 8,
                                    borderTop: "1px dashed var(--border)",
                                  }}
                                >
                                  <div className="small" style={{ color: "var(--muted)", fontWeight: 600 }}>
                                    {ex.label ? ex.label : `Additional ${idx + 1}`}
                                  </div>
                                  <div style={{ marginTop: 4 }}>
                                    {ex.housingLink ? (
                                      <a
                                        href={
                                          /^https?:\/\//i.test(String(ex.housingLink).trim())
                                            ? String(ex.housingLink).trim()
                                            : `https://${String(ex.housingLink).trim()}`
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {ex.housingLink}
                                      </a>
                                    ) : null}
                                    {ex.housingLink && ex.housingPdfUrl ? <br /> : null}
                                    {ex.housingPdfUrl ? (
                                      <a href={ex.housingPdfUrl} target="_blank" rel="noreferrer">
                                        PDF
                                      </a>
                                    ) : null}
                                    {!ex.housingLink && !ex.housingPdfUrl ? "—" : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </td>
                        <td>{r.notes || ""}</td>
                        <td style={{ verticalAlign: "top", whiteSpace: "nowrap" }}>
                          {r.id ? (
                            <button
                              type="button"
                              className="btn"
                              onClick={() => setBudgetRowDeleteTripId(r.tripId)}
                            >
                              Delete
                            </button>
                          ) : (
                            <span className="small" style={{ color: "var(--muted)" }}>
                              —
                            </span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {housingRows.length === 0 && !isEditingHousing && (
            <EmptyState
              icon="empty"
              title="No housing rows yet"
              description="Use Add Housing above to create an extra housing line for a trip."
            />
          )}
        </div>
        </>
        )}

        {tab === "Ticketing" && (
        <div className="card pad" style={budgetSectionCardStyle}>
          <div
            className="row appPolishToolbar mobileSectionHeader"
            style={{ ...budgetSectionHeaderStyle, alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}
          >
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <div
                className="row mobileSectionHeader"
                style={{ gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}
              >
                <div className="appSectionBadge" style={{ marginBottom: 0 }}>Ticketing</div>
                <div
                  className="row mobileSectionHeaderActions"
                  style={{
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    marginLeft: "auto",
                  }}
                >
                  <button
                    type="button"
                    className={isEditingTickets ? "btn btnPrimary" : "btn"}
                    onClick={() => {
                      if (isEditingTickets) void saveTicketsEdit();
                      else beginTicketsEdit();
                    }}
                  >
                    {isEditingTickets ? "Save" : "Edit"}
                  </button>
                  {isEditingTickets ? (
                    <button type="button" className="btn" onClick={cancelTicketsEdit}>
                      Cancel
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const header = [
                        "Team",
                        "Intl/Dom",
                        "Worker Name",
                        "Site",
                        "Departure Date",
                        "Ticket Agency",
                        "Total Ticket Cost",
                        "Amount Worker Paid",
                        "Total LST Cost",
                        "Total Charge",
                        "Date Approved to Withdraw",
                        "Notes",
                      ];
                      const rows = ticketsSortedWithBands.sorted.map((t) => {
                        const siteDisplay = (t.projectCountry || t.projectCity || "").trim() || "";
                        return [
                          t.tripName || t.tripId?.slice(0, 8) || "",
                          t.intlDom || "",
                          t.workerName || "",
                          siteDisplay,
                          t.departureDate || "",
                          t.ticketAgency || "",
                          formatUsdDisplay(t.totalTicketCost),
                          formatUsdDisplay(t.amountWorkerPaid),
                          computeTotalLstCost(t.totalTicketCost, t.amountWorkerPaid),
                          formatUsdDisplay(t.hpTotalCharge),
                          t.dateApprovedToWithdraw || "",
                          t.notes || "",
                        ];
                      });
                      const csvContent = [header, ...rows]
                        .map((cols) =>
                          cols
                            .map((val) => {
                              const s = String(val ?? "");
                              if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
                              return s;
                            })
                            .join(",")
                        )
                        .join("\n");
                      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      const dateStr = new Date().toISOString().slice(0, 10);
                      const airfareFilename = `budget-airfare-${dateStr}.csv`;
                      link.download = airfareFilename;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      showToast(`Exported ${airfareFilename}`);
                    }}
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="small" style={{ color: "var(--muted)" }}>
                Airfare rows, worker-paid offsets, and calculated LST cost.
              </div>
              {trips.length > 0 ? (
                <div
                  className="row"
                  style={{ marginTop: 10, gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}
                >
                  <div style={{ flex: "0 1 260px", minWidth: 0 }}>
                    <label className="small" htmlFor="budget-new-ticket-trip" style={{ display: "block", marginBottom: 4, color: "var(--muted)" }}>
                      Trip
                    </label>
                    <select
                      id="budget-new-ticket-trip"
                      className="input"
                      value={newTicketTripId}
                      onChange={(e) => setNewTicketTripId(e.target.value)}
                    >
                      {tripsSortedForBudget.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name || t.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btnPrimary" type="button" onClick={() => void handleAddTicket()}>
                    Add Ticket
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <div className="budgetTableScroller">
            <table className="table dataTableStriped budgetStickyTable" style={{ minWidth: 1580, fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Intl/Dom</th>
                  <th>Worker Name</th>
                  <th>Site</th>
                  <th>Departure Date</th>
                  <th>Ticket Agency</th>
                  <th>Total Ticket Cost</th>
                  <th>Amount Worker Paid</th>
                  <th title="Total Ticket Cost − Amount Worker Paid (calculated)">Total LST Cost</th>
                  <th title="Optional; not auto-filled">Total Charge</th>
                  <th>Date Approved to Withdraw</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ticketsSortedWithBands.sorted.map((t, rowIndex) => {
                  const isArchived = archivedTripIds.has(t.tripId);
                  const siteDisplay = (t.projectCountry || t.projectCity || "").trim() || "";
                  const computedTotalLstCost = computeTotalLstCost(
                    t.totalTicketCost,
                    t.amountWorkerPaid
                  );
                  const band = ticketsSortedWithBands.bands[rowIndex] ?? 0;
                  const palette = TICKET_TRIP_BAND_STYLES[band % TICKET_TRIP_BAND_STYLES.length];
                  const rowSurface = isArchived
                    ? {
                        opacity: 0.75,
                        backgroundColor: "rgba(226, 232, 240, 0.5)",
                        borderLeft: "4px solid var(--muted)",
                      }
                    : {
                        backgroundColor: palette.bg,
                        borderLeft: `4px solid ${palette.border}`,
                      };
                  const newTeamBlock =
                    rowIndex > 0 &&
                    ticketsSortedWithBands.bands[rowIndex] !== ticketsSortedWithBands.bands[rowIndex - 1];
                  return (
                  <tr
                    key={t.id}
                    style={{
                      ...rowSurface,
                      ...(newTeamBlock ? { borderTop: "2px solid rgba(15, 23, 42, 0.1)" } : {}),
                    }}
                    title={isArchived ? "Archived team" : undefined}
                  >
                    <td style={{ fontWeight: 700 }}>
                      <span className="row" style={{ gap: 6, alignItems: "center" }}>
                        {isArchived && <span className="small" style={{ color: "var(--muted)", fontWeight: 600 }}>Archived</span>}
                        {t.tripName || t.tripId?.slice(0, 8) || ""}
                      </span>
                    </td>
                    {isEditingTickets ? (
                      <>
                        <td>{t.intlDom || "—"}</td>
                        <td>{t.workerName || "—"}</td>
                        <td>{siteDisplay || "—"}</td>
                        <td style={{ minWidth: 118 }}>
                          <input
                            className="input"
                            type="date"
                            value={t.departureDate || ""}
                            onChange={(e) => updateTicketRow(t.id, "departureDate", e.target.value)}
                          />
                        </td>
                        <td style={{ minWidth: 140, maxWidth: 300 }}>
                          <select
                            className="input"
                            value={t.ticketAgency || ""}
                            onChange={(e) => updateTicketRow(t.id, "ticketAgency", e.target.value)}
                            aria-label="Ticket agency"
                          >
                            <option value="">Select agency</option>
                            {TICKET_AGENCY_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                            {t.ticketAgency &&
                            !TICKET_AGENCY_OPTIONS.includes(t.ticketAgency) ? (
                              <option value={t.ticketAgency}>{t.ticketAgency}</option>
                            ) : null}
                          </select>
                        </td>
                        <td style={{ minWidth: 112 }}>
                          <input
                            className="input"
                            value={t.totalTicketCost || ""}
                            onChange={(e) => updateTicketRow(t.id, "totalTicketCost", e.target.value)}
                            onBlur={(e) => {
                              const next = normalizeMoneyInputToUsd(e.target.value);
                              if (next !== (t.totalTicketCost || "")) {
                                updateTicketRow(t.id, "totalTicketCost", next);
                              }
                            }}
                            inputMode="decimal"
                            placeholder="$0.00"
                          />
                        </td>
                        <td style={{ minWidth: 112 }}>
                          <input
                            className="input"
                            value={t.amountWorkerPaid || ""}
                            onChange={(e) => updateTicketRow(t.id, "amountWorkerPaid", e.target.value)}
                            onBlur={(e) => {
                              const next = normalizeMoneyInputToUsd(e.target.value);
                              if (next !== (t.amountWorkerPaid || "")) {
                                updateTicketRow(t.id, "amountWorkerPaid", next);
                              }
                            }}
                            inputMode="decimal"
                            placeholder="$0.00"
                          />
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <input
                            className="input budgetSheetReadonly"
                            value={computedTotalLstCost}
                            readOnly
                            tabIndex={-1}
                            title="Calculated: Total Ticket Cost − Amount Worker Paid (not editable)"
                            style={ticketComputedFieldStyle}
                          />
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <input
                            className="input"
                            value={t.hpTotalCharge || ""}
                            onChange={(e) => updateTicketRow(t.id, "hpTotalCharge", e.target.value)}
                            inputMode="decimal"
                            placeholder=""
                            title="Optional total charge (leave blank if unused)"
                          />
                        </td>
                        <td style={{ minWidth: 118 }}>
                          <input
                            className="input"
                            type="date"
                            value={t.dateApprovedToWithdraw || ""}
                            onChange={(e) => updateTicketRow(t.id, "dateApprovedToWithdraw", e.target.value)}
                          />
                        </td>
                        <td style={{ minWidth: 180, maxWidth: 320 }}>
                          <input
                            className="input"
                            value={t.notes || ""}
                            onChange={(e) => updateTicketRow(t.id, "notes", e.target.value)}
                            placeholder="Notes"
                            aria-label="Ticket notes"
                          />
                        </td>
                        <td>
                          <button className="btn" type="button" onClick={() => confirm("Delete this ticket?") && removeTicket(t.id)}>
                            Delete
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{t.intlDom || ""}</td>
                        <td>{t.workerName || ""}</td>
                        <td>{siteDisplay}</td>
                        <td>{t.departureDate || ""}</td>
                        <td>{t.ticketAgency || ""}</td>
                        <td>{formatUsdDisplay(t.totalTicketCost)}</td>
                        <td>{formatUsdDisplay(t.amountWorkerPaid)}</td>
                        <td
                          title="Calculated: Total Ticket Cost − Amount Worker Paid"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {computedTotalLstCost || "—"}
                        </td>
                        <td>{formatUsdDisplay(t.hpTotalCharge)}</td>
                        <td>{t.dateApprovedToWithdraw || ""}</td>
                        <td
                          className="small"
                          style={{
                            maxWidth: 280,
                            verticalAlign: "top",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {t.notes || "—"}
                        </td>
                        <td>
                          <button className="btn" type="button" onClick={() => setTicketToDeleteId(t.id)}>
                            Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {ticketRows.length === 0 && (
            <EmptyState
              icon="empty"
              title="No tickets yet"
              description="Add tickets using the dropdown above, or from a trip's Ticketing tab."
            />
          )}
        </div>
        )}

        {tab === "Checks" && (
          <div className="card pad" style={budgetSectionCardStyle}>
            <BudgetCheckSectionPill label="Printed checks" style={{ marginBottom: 16 }} />

            <div
              className="row"
              style={{
                gap: 8,
                flexWrap: "wrap",
                alignItems: "flex-end",
                marginBottom: 20,
              }}
            >
              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                <label className="small" htmlFor="budget-check-trip" style={{ display: "block", marginBottom: 4 }}>
                  Trip
                </label>
                <select
                  id="budget-check-trip"
                  className="input"
                  value={newBudgetCheckTripId}
                  onChange={(e) => setNewBudgetCheckTripId(e.target.value)}
                  disabled={!tripsSortedForBudget.length}
                >
                  {tripsSortedForBudget.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || t.id}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                <label className="small" htmlFor="budget-check-payee" style={{ display: "block", marginBottom: 4 }}>
                  Payee
                </label>
                <select
                  id="budget-check-payee"
                  className="input"
                  value={newBudgetCheckPayee}
                  onChange={(e) => void handleBudgetCheckPayeeChange(e.target.value)}
                  disabled={!newBudgetCheckTripIdResolved || budgetCheckPayeeSaving}
                >
                  <option value="">— Select team member —</option>
                  {sortedAccountantNamesForTrip(newBudgetCheckTripIdResolved).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                  {newBudgetCheckPayee &&
                  !sortedAccountantNamesForTrip(newBudgetCheckTripIdResolved).includes(
                    newBudgetCheckPayee
                  ) ? (
                    <option value={newBudgetCheckPayee}>{newBudgetCheckPayee} (not on roster)</option>
                  ) : null}
                </select>
                {sortedAccountantNamesForTrip(newBudgetCheckTripIdResolved).length === 0 ? (
                  <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>
                    Add workers on the trip roster first.
                  </div>
                ) : null}
              </div>
              <div style={{ flex: "0 1 130px", minWidth: 0 }}>
                <label className="small" htmlFor="budget-check-amount" style={{ display: "block", marginBottom: 4 }}>
                  Amount
                </label>
                <input
                  id="budget-check-amount"
                  className="input"
                  inputMode="decimal"
                  placeholder="$0.00"
                  value={newBudgetCheckAmount}
                  onChange={(e) => setNewBudgetCheckAmount(e.target.value)}
                  onBlur={() => setNewBudgetCheckAmount((v) => normalizeMoneyInputToUsd(v))}
                />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <label className="small" htmlFor="budget-check-note" style={{ display: "block", marginBottom: 4 }}>
                  Note
                </label>
                <input
                  id="budget-check-note"
                  className="input"
                  value={newBudgetCheckNote}
                  onChange={(e) => setNewBudgetCheckNote(e.target.value)}
                  placeholder="Memo (optional)"
                />
              </div>
              <button
                type="button"
                className="btn btnPrimary"
                disabled={budgetCheckSubmitting || !tripsSortedForBudget.length}
                onClick={() => void handleSubmitBudgetCheckFromBudgetPage()}
              >
                {budgetCheckSubmitting ? "Submitting…" : "Submit"}
              </button>
            </div>

            <BudgetCheckSectionPill
              label="Pending"
              count={budgetCheckPendingRows.length}
              tone="pending"
              style={{ marginBottom: 10 }}
            />
            {budgetCheckPendingRows.length === 0 ? (
              <p className="small" style={{ color: "var(--muted)", marginBottom: 24 }}>
                No open requests.
              </p>
            ) : (
              <div className="budgetTableScroller" style={{ marginBottom: 28 }}>
                <table className="table dataTableStriped" style={{ minWidth: 1180, fontSize: 12 }}>
                  <thead>{budgetCheckTableHead(true)}</thead>
                  <tbody>
                    {budgetCheckPendingRows.map((r) => (
                      <tr key={r.id}>
                        <td>{formatBudgetCheckTimestamp(r.createdAt)}</td>
                        <td className="small">{r.requestedByName || r.requestedByEmail || "—"}</td>
                        <td>
                          <Link href={`/trips/${r.tripId}`}>{r.tripNameSnapshot || r.tripId}</Link>
                        </td>
                        <td>{resolveBudgetCheckSite(r, budgetCheckTripSiteById)}</td>
                        <td>{r.teamAccountantSnapshot || "—"}</td>
                        <td style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                          {formatUsdDisplay(r.amountRequested)}
                        </td>
                        <td className="small" style={{ maxWidth: 220, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {r.note || "—"}
                        </td>
                        <td>—</td>
                        <td style={{ verticalAlign: "top", minWidth: 180 }}>
                          <textarea
                            className="input"
                            rows={2}
                            value={budgetCheckDonnaNotesValue(r)}
                            onChange={(event) => updateBudgetCheckDonnaNotesDraft(r.id, event.target.value)}
                            onBlur={() => void handleSaveBudgetCheckDonnaNotes(r)}
                            placeholder="Donna notes"
                            disabled={budgetCheckDonnaNotesSavingId === r.id}
                            style={{ fontSize: 12, width: "100%", resize: "vertical" }}
                          />
                        </td>
                        <td style={{ verticalAlign: "top" }}>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                              alignItems: "stretch",
                              maxWidth: 132,
                            }}
                          >
                            <button
                              type="button"
                              className="btn btnPrimary"
                              disabled={budgetCheckProcessingId === r.id}
                              onClick={() => void handleMarkBudgetCheckProcessed(r.id)}
                            >
                              {budgetCheckProcessingId === r.id ? "…" : "Mark processed"}
                            </button>
                            <button type="button" className="btn" onClick={() => openBudgetCheckEdit(r)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn"
                              style={{ color: "var(--danger)" }}
                              onClick={() => setBudgetCheckDeleteId(r.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <BudgetCheckSectionPill
              label="Processed"
              count={budgetCheckProcessedRows.length}
              tone="processed"
              style={{ marginBottom: 10 }}
            />
            {budgetCheckProcessedRows.length === 0 ? (
              <p className="small" style={{ color: "var(--muted)" }}>
                No completed requests yet.
              </p>
            ) : (
              <div className="budgetTableScroller">
                <table className="table dataTableStriped" style={{ minWidth: 1180, fontSize: 12 }}>
                  <thead>{budgetCheckTableHead(true)}</thead>
                  <tbody>
                    {budgetCheckProcessedRows.map((r) => (
                      <tr key={r.id}>
                        <td>{formatBudgetCheckTimestamp(r.createdAt)}</td>
                        <td className="small">{r.requestedByName || r.requestedByEmail || "—"}</td>
                        <td>
                          <Link href={`/trips/${r.tripId}`}>{r.tripNameSnapshot || r.tripId}</Link>
                        </td>
                        <td>{resolveBudgetCheckSite(r, budgetCheckTripSiteById)}</td>
                        <td>{r.teamAccountantSnapshot || "—"}</td>
                        <td style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                          {formatUsdDisplay(r.amountRequested)}
                        </td>
                        <td className="small" style={{ maxWidth: 220, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {r.note || "—"}
                        </td>
                        <td>{formatBudgetCheckTimestamp(r.processedAt)}</td>
                        <td style={{ verticalAlign: "top", minWidth: 180 }}>
                          <textarea
                            className="input"
                            rows={2}
                            value={budgetCheckDonnaNotesValue(r)}
                            onChange={(event) => updateBudgetCheckDonnaNotesDraft(r.id, event.target.value)}
                            onBlur={() => void handleSaveBudgetCheckDonnaNotes(r)}
                            placeholder="Donna notes"
                            disabled={budgetCheckDonnaNotesSavingId === r.id}
                            style={{ fontSize: 12, width: "100%", resize: "vertical" }}
                          />
                        </td>
                        <td style={{ verticalAlign: "top" }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ color: "var(--danger)" }}
                            onClick={() => setBudgetCheckDeleteId(r.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      {teamEditorTripId ? (
        <BudgetTeamEditorModal
          tripId={teamEditorTripId}
          trip={teamEditorTrip}
          tripName={teamEditorTrip?.name || ""}
          onClose={() => setTeamEditorTripId("")}
          onSaved={() => void refreshBudgetTeamData()}
        />
      ) : null}
    </Shell>
  );
}
