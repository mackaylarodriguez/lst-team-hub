import Shell from "@/components/Shell";
import Link from "next/link";
import AppIcon from "@/components/AppIcon";
import CollapsibleSection from "@/components/CollapsibleSection";
import Spinner from "@/components/Spinner";
import ConfirmModal from "@/components/ConfirmModal";
import EmptyState from "@/components/EmptyState";
import { showToast } from "@/components/Toast";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import { isManagerRole } from "@/lib/roles";
import {
  getBudgetAverages,
  listAllTripBudgets,
  listSiteBudgetNotes,
  saveTripBudget,
  uploadTripHousingPdf,
} from "@/lib/tripBudget";
import {
  listAllTripTickets,
  saveTripTicket,
  deleteTripTicket,
  syncTripTicketsFromTeamMembers,
} from "@/lib/tripTickets";
import {
  listAllTripHousingEntries,
  syncTripHousingExtras,
  uploadTripHousingExtraPdf,
} from "@/lib/tripHousingEntries";
import { listTripsForCurrentUser } from "@/lib/trips";

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

function parseCurrencyLike(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoneyLike(value) {
  if (!Number.isFinite(value)) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function computeTotalLstCost(totalTicketCost, amountWorkerPaid) {
  const total = parseCurrencyLike(totalTicketCost) ?? 0;
  const paid = parseCurrencyLike(amountWorkerPaid) ?? 0;
  if (!String(totalTicketCost || "").trim() && !String(amountWorkerPaid || "").trim()) return "";
  return formatMoneyLike(total - paid);
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

function mergeHousingWithTrips(trips, budgets) {
  const byTripId = new Map((budgets || []).map((b) => [b.tripId, b]));
  const orderedTrips = [...(trips || [])].sort(compareTripsForBudgetSort);
  return orderedTrips.map((trip) => {
    const b = byTripId.get(trip.id);
    return b
      ? {
          ...b,
          tripName: b.tripName || trip.name,
          housingLink: n(b.housingLink),
          housingPdfUrl: n(b.housingPdfUrl),
        }
      : {
          id: null,
          tripId: trip.id,
          tripName: trip.name || "",
          teamName: trip.name || "",
          projectStartDate: trip.startDate || "",
          projectEndDate: trip.endDate || "",
          siteCountry: trip.location || "",
          siteCity: "",
          teamAccountant: "",
          budgetAmount: "",
          returnedAmount: "",
          housingAmount: "",
          housingLink: "",
          housingPdfUrl: "",
          notes: "",
          numWorkers: null,
          tshirts: "",
          workbooks: "",
        };
  });
}

export default function BudgetPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [averages, setAverages] = useState(null);
  const [trips, setTrips] = useState([]);
  const [housingRows, setHousingRows] = useState([]);
  const [ticketRows, setTicketRows] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [newTicketTripId, setNewTicketTripId] = useState("");
  const [tab, setTab] = useState("Housing");
  const [isEditingHousing, setIsEditingHousing] = useState(false);
  const [housingRowsDraft, setHousingRowsDraft] = useState([]);
  const [isEditingTickets, setIsEditingTickets] = useState(false);
  const [ticketToDeleteId, setTicketToDeleteId] = useState(null);
  const [siteHousingNotes, setSiteHousingNotes] = useState([]);
  const [housingPdfUploadingTripId, setHousingPdfUploadingTripId] = useState(null);
  const [housingExtrasByTripId, setHousingExtrasByTripId] = useState({});
  const [housingExtrasDraft, setHousingExtrasDraft] = useState({});
  const [newHousingSlotTripId, setNewHousingSlotTripId] = useState("");
  const [housingExtraPdfUploadKey, setHousingExtraPdfUploadKey] = useState(null);

  const canManage = isManagerRole(session?.permissionRole || session?.role);

  const archivedTripIds = useMemo(
    () => new Set((trips || []).filter((t) => t.status === "archived").map((t) => t.id)),
    [trips]
  );

  const tripsSortedForBudget = useMemo(
    () => [...(trips || [])].sort(compareTripsForBudgetSort),
    [trips]
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
        const [avgRes, tripsRes, housingRes, ticketsRes, siteNotesRes] = await Promise.all([
          getBudgetAverages(),
          listTripsForCurrentUser(),
          listAllTripBudgets(),
          listAllTripTickets(),
          listSiteBudgetNotes(),
        ]);
        if (cancelled) return;
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
        setSiteHousingNotes(siteNotesRes || []);
        if (tripsRes?.length > 0 && !newTicketTripId) {
          const sorted = [...tripsRes].sort(compareTripsForBudgetSort);
          setNewTicketTripId(sorted[0].id);
        }
        if (tripsRes?.length > 0 && !newHousingSlotTripId) {
          const sorted = [...tripsRes].sort(compareTripsForBudgetSort);
          setNewHousingSlotTripId(sorted[0].id);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e.message || "Error loading budget data.";
          setStatus(msg);
          showToast(msg, "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSession();
    return () => { cancelled = true; };
  }, [router]);

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
      setStatus("No trip to attach housing to.");
      showToast("Create a trip first.", "error");
      return;
    }
    if (!isEditingHousing) beginHousingEdit();
    addHousingExtraDraftForTrip(tripId);
  }

  async function saveHousingBudget() {
    try {
      setStatus("Saving...");
      for (const row of housingRowsDraft) {
        await saveTripBudget(row.tripId, {
          teamName: row.teamName,
          projectStartDate: row.projectStartDate,
          projectEndDate: row.projectEndDate,
          siteCountry: row.siteCountry,
          siteCity: row.siteCity,
          teamAccountant: row.teamAccountant,
          budgetAmount: row.budgetAmount,
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
      for (const tripId of tripIdsToSync) {
        await syncTripHousingExtras(tripId, housingExtrasDraft[tripId] || []);
      }
      const housingRes = await listAllTripBudgets();
      setHousingRows(mergeHousingWithTrips(trips, housingRes));
      const extraRows = await listAllTripHousingEntries();
      setHousingExtrasByTripId(groupHousingExtrasByTripId(extraRows));
      setIsEditingHousing(false);
      setStatus("Saved.");
    } catch (e) {
      const msg = e.message || "Error saving.";
      setStatus(msg);
      showToast(msg, "error");
    }
  }

  async function updateTicketRow(ticketId, field, value) {
    const row = ticketRows.find((r) => r.id === ticketId);
    if (!row) return;
    const updated = { ...row, [field]: value };
    if (field === "totalTicketCost" || field === "amountWorkerPaid") {
      updated.totalLstCost = computeTotalLstCost(updated.totalTicketCost, updated.amountWorkerPaid);
    }
    setTicketRows((prev) =>
      prev.map((r) => (r.id === ticketId ? updated : r))
    );
    try {
      setStatus("Saving...");
      await saveTripTicket(updated);
      setStatus("Saved.");
    } catch (e) {
      const msg = e.message || "Error saving.";
      setStatus(msg);
      showToast(msg, "error");
    }
  }

  async function removeTicket(id) {
    try {
      await deleteTripTicket(id);
      setTicketRows((prev) => prev.filter((r) => r.id !== id));
      setStatus("Ticket removed.");
    } catch (e) {
      setStatus(e.message || "Error deleting.");
    }
  }

  async function handleAddTicket() {
    const tripId = newTicketTripId || trips[0]?.id;
    if (!tripId) {
      setStatus("No trip selected. Create a trip first.");
      return;
    }
    const trip = trips.find((t) => t.id === tripId);
    try {
      setStatus("Adding...");
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
      });
      setTicketRows((prev) => [...prev, { ...saved, tripName: trip?.name || "" }]);
      setStatus("Ticket added.");
    } catch (e) {
      const msg = e.message || "Unable to add.";
      setStatus(msg);
      showToast(msg, "error");
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
      <div className="budgetPage">
        <h1 className="h1" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <AppIcon name="active" className="pageEyebrowIcon" />
          <span>Budget</span>
        </h1>
        <p className="small" style={{ marginBottom: 24 }}>
          Overview of housing and ticketing across all trips. Per-site materials notes are edited on{" "}
          <Link href="/sites">Sites</Link> and each trip&apos;s Materials tab—not here. Travel forms stay per
          team on each trip page.
        </p>

        {status ? <div className="small" style={{ marginBottom: 12 }}>{status}</div> : null}

        <div className="tabs" style={{ marginBottom: 16 }}>
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
        </div>

        {averages && (
          <div className="card pad" style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>Budget averages</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <div
                className="card pad"
                style={{
                  boxShadow: "none",
                  background:
                    "linear-gradient(180deg, rgba(239,246,255,1), rgba(255,255,255,1) 55%)",
                  borderColor: "rgba(37,99,235,.25)",
                }}
              >
                <div className="small" style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 4, color: "#1d4ed8" }}>
                  Airfare
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>
                  {averages.airfare.average != null
                    ? `$${averages.airfare.average.toLocaleString()}`
                    : "—"}
                </div>
                <div className="small" style={{ color: "var(--muted)" }}>
                  Averaging airfare cells, skipping blanks and entries that are "0".
                </div>
              </div>

              <div
                className="card pad"
                style={{
                  boxShadow: "none",
                  background:
                    "linear-gradient(180deg, rgba(240,249,255,1), rgba(255,255,255,1) 55%)",
                  borderColor: "rgba(14,116,144,.25)",
                }}
              >
                <div className="small" style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 4, color: "#0f766e" }}>
                  Housing 1
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>
                  {averages.housing1.average != null
                    ? `$${averages.housing1.average.toLocaleString()}`
                    : "—"}
                </div>
                <div className="small" style={{ color: "var(--muted)" }}>
                  Budget is $1,000/team. Averaging sites where LST pays housing (non‑blank, above 0).
                </div>
              </div>

              <div
                className="card pad"
                style={{
                  boxShadow: "none",
                  background:
                    "linear-gradient(180deg, rgba(255,247,237,1), rgba(255,255,255,1) 55%)",
                  borderColor: "rgba(234,88,12,.25)",
                }}
              >
                <div className="small" style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 4, color: "#c2410c" }}>
                  Housing 2
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>
                  {averages.housing2.average != null
                    ? `$${averages.housing2.average.toLocaleString()}`
                    : "—"}
                </div>
                <div className="small" style={{ color: "var(--muted)" }}>
                  Averaging all sites that had a team. Skipping YF teams.
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "Housing" && (
        <>
        <CollapsibleSection
          title="Site housing notes"
          defaultOpen={false}
          style={{ marginBottom: 24 }}
        >
          {siteHousingNotes.length === 0 ? (
            <p className="small" style={{ margin: 0, color: "var(--muted)" }}>
              No site notes loaded. Open <Link href="/sites">Sites</Link> to add or update mission site records.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                gap: 12,
              }}
            >
              {[...siteHousingNotes]
                .sort((a, b) =>
                  String(a.siteName || "").localeCompare(String(b.siteName || ""), undefined, {
                    sensitivity: "base",
                  })
                )
                .map((n) => {
                  const noteText = String(n.notes || "").trim();
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
                      <div
                        className="small"
                        style={{
                          lineHeight: 1.5,
                          fontSize: 12,
                          color: noteText ? "inherit" : "var(--muted)",
                          fontStyle: noteText ? "normal" : "italic",
                          wordBreak: "break-word",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {noteText || "No note"}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CollapsibleSection>

        <div className="card pad">
          <div
            className="row"
            style={{ marginBottom: 12, alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}
          >
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <div style={{ fontWeight: 900 }}>Housing budget (all trips)</div>
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
            <div
              className="row"
              style={{
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
                marginLeft: "auto",
                justifyContent: "flex-end",
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
                  "Team Accountant",
                  "Budget Amount",
                  "Returned Amount",
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
                  r.teamAccountant || "",
                  r.budgetAmount || "",
                  r.returnedAmount || "",
                  r.housingAmount || "",
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
                setStatus(`Exported ${housingFilename}`);
                setTimeout(() => setStatus(""), 4000);
                showToast(`Exported ${housingFilename}`);
              }}
            >
              Export CSV
            </button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 1320, fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Team Name</th>
                  <th>Project Start</th>
                  <th>Project End</th>
                  <th>Site</th>
                  <th>Team Accountant</th>
                  <th>Budget Amount</th>
                  <th>Returned Amount</th>
                  <th>Housing Amount</th>
                  <th>Housing link / PDF</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {(isEditingHousing ? housingRowsDraft : housingRows).map((r) => {
                  const isArchived = archivedTripIds.has(r.tripId);
                  const housingExtrasList =
                    (isEditingHousing ? housingExtrasDraft[r.tripId] : housingExtrasByTripId[r.tripId]) ||
                    [];
                  return (
                  <tr
                    key={r.id || r.tripId}
                    style={
                      isArchived
                        ? { opacity: 0.7, backgroundColor: "var(--border)", borderLeft: "3px solid var(--muted)" }
                        : undefined
                    }
                    title={isArchived ? "Archived team" : undefined}
                  >
                    {isEditingHousing ? (
                      <>
                        <td style={{ minWidth: 140, maxWidth: 260 }}>
                          <span className="row" style={{ gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}>
                            {isArchived && <span className="small" style={{ color: "var(--muted)", fontWeight: 600 }}>Archived</span>}
                            <textarea
                              className="input"
                              rows={3}
                              value={r.teamName || ""}
                              onChange={(e) => updateHousingDraftRow(r.tripId, "teamName", e.target.value)}
                              placeholder="Team name"
                            />
                          </span>
                        </td>
                        <td style={{ minWidth: 118 }}>
                          <input
                            className="input"
                            type="date"
                            value={r.projectStartDate || ""}
                            onChange={(e) => updateHousingDraftRow(r.tripId, "projectStartDate", e.target.value)}
                          />
                        </td>
                        <td style={{ minWidth: 118 }}>
                          <input
                            className="input"
                            type="date"
                            value={r.projectEndDate || ""}
                            onChange={(e) => updateHousingDraftRow(r.tripId, "projectEndDate", e.target.value)}
                          />
                        </td>
                        <td style={{ minWidth: 120, maxWidth: 220 }}>
                          <textarea
                            className="input"
                            rows={3}
                            value={r.siteCountry || ""}
                            onChange={(e) => updateHousingDraftRow(r.tripId, "siteCountry", e.target.value)}
                            placeholder="Site"
                          />
                        </td>
                        <td style={{ minWidth: 120, maxWidth: 220 }}>
                          <textarea
                            className="input"
                            rows={3}
                            value={r.teamAccountant || ""}
                            onChange={(e) => updateHousingDraftRow(r.tripId, "teamAccountant", e.target.value)}
                            placeholder="Accountant"
                          />
                        </td>
                        <td style={{ minWidth: 96 }}>
                          <input
                            className="input"
                            value={r.budgetAmount || ""}
                            onChange={(e) => updateHousingDraftRow(r.tripId, "budgetAmount", e.target.value)}
                          />
                        </td>
                        <td style={{ minWidth: 96 }}>
                          <input
                            className="input"
                            value={r.returnedAmount || ""}
                            onChange={(e) => updateHousingDraftRow(r.tripId, "returnedAmount", e.target.value)}
                          />
                        </td>
                        <td style={{ minWidth: 96 }}>
                          <input
                            className="input"
                            value={r.housingAmount || ""}
                            onChange={(e) => updateHousingDraftRow(r.tripId, "housingAmount", e.target.value)}
                          />
                        </td>
                        <td style={{ minWidth: 220, verticalAlign: "top", maxWidth: 360 }}>
                          <div className="small" style={{ color: "var(--muted)", marginBottom: 4 }}>
                            Main (budget row)
                          </div>
                          <textarea
                            className="input"
                            rows={3}
                            inputMode="url"
                            placeholder="https://… (optional if PDF)"
                            value={r.housingLink || ""}
                            onChange={(e) => updateHousingDraftRow(r.tripId, "housingLink", e.target.value)}
                          />
                          <div
                            className="row"
                            style={{ marginTop: 6, gap: 8, flexWrap: "wrap", alignItems: "center" }}
                          >
                            <label className="small" style={{ cursor: "pointer", fontWeight: 600 }}>
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
                            ) : null}
                          </div>
                          {housingExtrasList.map((ex, idx) => (
                            <div
                              key={ex.id || `extra-${r.tripId}-${idx}`}
                              style={{
                                marginTop: 12,
                                paddingTop: 12,
                                borderTop: "1px dashed var(--border)",
                              }}
                            >
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
                              <textarea
                                className="input"
                                rows={2}
                                style={{ marginBottom: 6, width: "100%" }}
                                placeholder="Label (optional)"
                                value={ex.label || ""}
                                onChange={(e) =>
                                  updateHousingExtraDraft(r.tripId, idx, "label", e.target.value)
                                }
                              />
                              <textarea
                                className="input"
                                rows={3}
                                inputMode="url"
                                placeholder="https://…"
                                value={ex.housingLink || ""}
                                onChange={(e) =>
                                  updateHousingExtraDraft(r.tripId, idx, "housingLink", e.target.value)
                                }
                              />
                              <div
                                className="row"
                                style={{ marginTop: 6, gap: 8, flexWrap: "wrap", alignItems: "center" }}
                              >
                                <label className="small" style={{ cursor: "pointer", fontWeight: 600 }}>
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
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </td>
                        <td style={{ minWidth: 160, maxWidth: 280 }}>
                          <textarea
                            className="input"
                            rows={3}
                            value={r.notes || ""}
                            onChange={(e) => updateHousingDraftRow(r.tripId, "notes", e.target.value)}
                            placeholder="Notes"
                          />
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
                        <td>{r.teamAccountant || ""}</td>
                        <td>{r.budgetAmount || ""}</td>
                        <td>{r.returnedAmount || ""}</td>
                        <td>{r.housingAmount || ""}</td>
                        <td className="small" style={{ maxWidth: 280, wordBreak: "break-word", verticalAlign: "top" }}>
                          <div style={{ marginBottom: housingExtrasList.length ? 8 : 0 }}>
                            {r.housingLink || r.housingPdfUrl ? (
                              <>
                                <span className="small" style={{ color: "var(--muted)", fontWeight: 600 }}>
                                  Main
                                </span>
                                <div style={{ marginTop: 4 }}>
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
                      </>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {housingRows.length === 0 && !isEditingHousing && <div className="small">No housing budget rows yet. Add a trip to see a row per trip, or create a trip first.</div>}
        </div>
        </>
        )}

        {tab === "Ticketing" && (
        <div className="card pad">
          <div
            className="row"
            style={{ marginBottom: 12, alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}
          >
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <div style={{ fontWeight: 900 }}>Ticketing (all trips)</div>
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
            <div
              className="row"
              style={{
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
                marginLeft: "auto",
                justifyContent: "flex-end",
              }}
            >
            <button
              type="button"
              className={isEditingTickets ? "btn btnPrimary" : "btn"}
              onClick={() => setIsEditingTickets((current) => !current)}
            >
              {isEditingTickets ? "Save" : "Edit"}
            </button>
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
                    t.totalTicketCost || "",
                    t.amountWorkerPaid || "",
                    computeTotalLstCost(t.totalTicketCost, t.amountWorkerPaid),
                    t.hpTotalCharge || "",
                    t.dateApprovedToWithdraw || "",
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
                setStatus(`Exported ${airfareFilename}`);
                setTimeout(() => setStatus(""), 4000);
                showToast(`Exported ${airfareFilename}`);
              }}
            >
              Export CSV
            </button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 1400, fontSize: 12 }}>
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
                  <th>Total LST Cost</th>
                  <th>Total Charge</th>
                  <th>Date Approved to Withdraw</th>
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
                        <td style={{ minWidth: 72, maxWidth: 100 }}>
                          <input
                            className="input"
                            value={t.intlDom || ""}
                            onChange={(e) => updateTicketRow(t.id, "intlDom", e.target.value)}
                            aria-label="Intl or domestic"
                          />
                        </td>
                        <td style={{ minWidth: 140, maxWidth: 280 }}>
                          <textarea
                            className="input"
                            rows={3}
                            value={t.workerName || ""}
                            onChange={(e) => updateTicketRow(t.id, "workerName", e.target.value)}
                            placeholder="Worker name"
                          />
                        </td>
                        <td style={{ minWidth: 140, maxWidth: 280 }}>
                          <textarea
                            className="input"
                            rows={3}
                            value={siteDisplay}
                            onChange={(e) => updateTicketRow(t.id, "projectCountry", e.target.value)}
                            placeholder="Site / country"
                          />
                        </td>
                        <td style={{ minWidth: 118 }}>
                          <input
                            className="input"
                            type="date"
                            value={t.departureDate || ""}
                            onChange={(e) => updateTicketRow(t.id, "departureDate", e.target.value)}
                          />
                        </td>
                        <td style={{ minWidth: 140, maxWidth: 300 }}>
                          <textarea
                            className="input"
                            rows={3}
                            value={t.ticketAgency || ""}
                            onChange={(e) => updateTicketRow(t.id, "ticketAgency", e.target.value)}
                            placeholder="Agency"
                          />
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <input
                            className="input"
                            value={t.totalTicketCost || ""}
                            onChange={(e) => updateTicketRow(t.id, "totalTicketCost", e.target.value)}
                            inputMode="decimal"
                          />
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <input
                            className="input"
                            value={t.amountWorkerPaid || ""}
                            onChange={(e) => updateTicketRow(t.id, "amountWorkerPaid", e.target.value)}
                            inputMode="decimal"
                          />
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <input
                            className="input"
                            value={computedTotalLstCost}
                            readOnly
                            title="Total Ticket Cost − Amount Worker Paid"
                          />
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <input
                            className="input"
                            value={t.hpTotalCharge || ""}
                            onChange={(e) => updateTicketRow(t.id, "hpTotalCharge", e.target.value)}
                            inputMode="decimal"
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
                        <td>{t.totalTicketCost || ""}</td>
                        <td>{t.amountWorkerPaid || ""}</td>
                        <td>{computedTotalLstCost}</td>
                        <td>{t.hpTotalCharge || ""}</td>
                        <td>{t.dateApprovedToWithdraw || ""}</td>
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
      </div>
    </Shell>
  );
}
