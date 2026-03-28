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
} from "@/lib/tripBudget";
import {
  listAllTripTickets,
  saveTripTicket,
  deleteTripTicket,
  syncTripTicketsFromTeamMembers,
} from "@/lib/tripTickets";
import { listTripsForCurrentUser } from "@/lib/trips";
import { resolveSiteBudgetNoteForTripLocation } from "@/lib/siteMaterials";

function n(val) {
  return val === null || val === undefined ? "" : String(val).trim();
}

function mergeHousingWithTrips(trips, budgets) {
  const byTripId = new Map((budgets || []).map((b) => [b.tripId, b]));
  return (trips || []).map((trip) => {
    const b = byTripId.get(trip.id);
    return b
      ? { ...b, tripName: b.tripName || trip.name, housingLink: n(b.housingLink) }
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
          notes: "",
          numWorkers: null,
          tshirts: "",
          workbooks: "",
        };
  });
}

function housingRowSiteLocation(row, trips) {
  const trip = (trips || []).find((t) => t.id === row.tripId);
  return n(trip?.location) || n(row.siteCountry);
}

function housingRowHasSiteStaffNote(row, trips, siteHousingNotes) {
  const loc = housingRowSiteLocation(row, trips);
  const note = resolveSiteBudgetNoteForTripLocation(loc, siteHousingNotes);
  return Boolean(note?.notes?.trim());
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

  const canManage = isManagerRole(session?.permissionRole || session?.role);

  const housingSiteEffectiveSummary = useMemo(() => {
    const dates = [...new Set(siteHousingNotes.map((n) => n.effectiveDate).filter(Boolean))];
    if (dates.length === 0) return "—";
    if (dates.length === 1) return dates[0];
    return `${dates.length} dates`;
  }, [siteHousingNotes]);

  const archivedTripIds = useMemo(
    () => new Set((trips || []).filter((t) => t.status === "archived").map((t) => t.id)),
    [trips]
  );

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
        setTicketRows(refreshedTickets.length ? refreshedTickets : ticketsRes);
        setSiteHousingNotes(siteNotesRes || []);
        if (tripsRes?.length > 0 && !newTicketTripId) setNewTicketTripId(tripsRes[0].id);
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
          notes: row.notes,
        });
      }
      setHousingRows(housingRowsDraft);
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
        intlDom: "Intl",
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
          Overview of housing and ticketing across all trips. Workbook strings and per-site materials notes
          are edited on <Link href="/sites">Sites</Link> and each trip&apos;s Materials tab—not here. Travel
          forms stay per team on each trip page.
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
          subtitle="Per-site housing text and workbook plans are edited on Sites. Expand for details and the policy effective date."
          defaultOpen={false}
          style={{ marginBottom: 24 }}
          rightSlot={
            <div
              className="card pad"
              style={{
                margin: 0,
                padding: "10px 14px",
                boxShadow: "none",
                border: "1px solid rgba(148,163,184,.4)",
                background: "rgba(255,255,255,.95)",
                minWidth: 128,
                textAlign: "right",
              }}
            >
              <div className="small" style={{ color: "var(--muted)", fontWeight: 700 }}>
                Effective
              </div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{housingSiteEffectiveSummary}</div>
            </div>
          }
        >
          <p className="small" style={{ margin: 0, color: "var(--muted)" }}>
            Open <Link href="/sites">Sites</Link> to view and save each mission site&apos;s notes and workbook
            inventory. The date above summarizes stored effective dates (one value if all sites match, otherwise a
            count).
          </p>
        </CollapsibleSection>

        <div className="card pad" style={{ marginBottom: 24 }}>
          <div
            className="row"
            style={{ marginBottom: 8, alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}
          >
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <div style={{ fontWeight: 900 }}>Housing budget (all trips)</div>
              <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>
                Rows are auto-generated when a trip is created. Site notes and workbook plans:{" "}
                <Link href="/sites">Sites</Link>. Per-team materials: trip <strong>Materials</strong> tab.
              </div>
              <div
                className="small"
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "rgba(15, 23, 42, 0.06)",
                  maxWidth: 720,
                }}
              >
                <strong>Site housing note:</strong> A &quot;!&quot; in the table means that row&apos;s site has
                staff housing text on <Link href="/sites">Sites</Link> — check the collapsible section above or
                Sites before finalizing housing numbers.
              </div>
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
            {isEditingHousing ? (
              <>
                <button type="button" className="btn btnPrimary" onClick={() => void saveHousingBudget()}>
                  Save
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setIsEditingHousing(false);
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setHousingRowsDraft(housingRows.map((r) => ({ ...r })));
                  setIsEditingHousing(true);
                }}
              >
                Edit
              </button>
            )}
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
            <table className="table" style={{ minWidth: 1280, fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Team Name</th>
                  <th>Project Start</th>
                  <th>Project End</th>
                  <th>Site</th>
                  <th title="Staff housing note exists on Sites for this site">!</th>
                  <th>Team Accountant</th>
                  <th>Budget Amount</th>
                  <th>Returned Amount</th>
                  <th>Housing Amount</th>
                  <th>Housing link</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {(isEditingHousing ? housingRowsDraft : housingRows).map((r) => {
                  const isArchived = archivedTripIds.has(r.tripId);
                  const siteNote = housingRowHasSiteStaffNote(r, trips, siteHousingNotes);
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
                        <td>
                          <span className="row" style={{ gap: 6, alignItems: "center" }}>
                            {isArchived && <span className="small" style={{ color: "var(--muted)", fontWeight: 600 }}>Archived</span>}
                            <input className="input" style={{ minWidth: 120 }} value={r.teamName || ""} onChange={(e) => updateHousingDraftRow(r.tripId, "teamName", e.target.value)} />
                          </span>
                        </td>
                        <td><input className="input" type="date" value={r.projectStartDate || ""} onChange={(e) => updateHousingDraftRow(r.tripId, "projectStartDate", e.target.value)} /></td>
                        <td><input className="input" type="date" value={r.projectEndDate || ""} onChange={(e) => updateHousingDraftRow(r.tripId, "projectEndDate", e.target.value)} /></td>
                        <td><input className="input" style={{ minWidth: 100 }} value={r.siteCountry || ""} onChange={(e) => updateHousingDraftRow(r.tripId, "siteCountry", e.target.value)} /></td>
                        <td style={{ textAlign: "center", fontWeight: 800, color: siteNote ? "var(--warn, #b45309)" : "var(--muted)" }}>
                          {siteNote ? (
                            <span title="This site has staff housing notes on Sites">!</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td><input className="input" style={{ minWidth: 100 }} value={r.teamAccountant || ""} onChange={(e) => updateHousingDraftRow(r.tripId, "teamAccountant", e.target.value)} /></td>
                        <td><input className="input" style={{ minWidth: 90 }} value={r.budgetAmount || ""} onChange={(e) => updateHousingDraftRow(r.tripId, "budgetAmount", e.target.value)} /></td>
                        <td><input className="input" style={{ minWidth: 90 }} value={r.returnedAmount || ""} onChange={(e) => updateHousingDraftRow(r.tripId, "returnedAmount", e.target.value)} /></td>
                        <td><input className="input" style={{ minWidth: 90 }} value={r.housingAmount || ""} onChange={(e) => updateHousingDraftRow(r.tripId, "housingAmount", e.target.value)} /></td>
                        <td>
                          <input
                            className="input"
                            style={{ minWidth: 160 }}
                            type="url"
                            inputMode="url"
                            placeholder="https://…"
                            value={r.housingLink || ""}
                            onChange={(e) => updateHousingDraftRow(r.tripId, "housingLink", e.target.value)}
                          />
                        </td>
                        <td><input className="input" style={{ minWidth: 120 }} value={r.notes || ""} onChange={(e) => updateHousingDraftRow(r.tripId, "notes", e.target.value)} /></td>
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
                        <td style={{ textAlign: "center", fontWeight: 800, color: siteNote ? "var(--warn, #b45309)" : "var(--muted)" }}>
                          {siteNote ? (
                            <span title="This site has staff housing notes on Sites">!</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{r.teamAccountant || ""}</td>
                        <td>{r.budgetAmount || ""}</td>
                        <td>{r.returnedAmount || ""}</td>
                        <td>{r.housingAmount || ""}</td>
                        <td className="small" style={{ maxWidth: 200, wordBreak: "break-all" }}>
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
                          ) : (
                            ""
                          )}
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
                <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <select
                    className="input"
                    value={newTicketTripId}
                    onChange={(e) => setNewTicketTripId(e.target.value)}
                    style={{ minWidth: 200 }}
                  >
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>{t.name || t.id}</option>
                    ))}
                  </select>
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
              className="btn"
              onClick={() => setIsEditingTickets((current) => !current)}
            >
              {isEditingTickets ? "Done" : "Edit"}
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
                  "HP Total Charge",
                  "Date Approved to Withdraw",
                ];
                const rows = ticketRows.map((t) => {
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
                    t.totalLstCost || "",
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
                  <th>HP Total Charge</th>
                  <th>Date Approved to Withdraw</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ticketRows.map((t) => {
                  const isArchived = archivedTripIds.has(t.tripId);
                  const siteDisplay = (t.projectCountry || t.projectCity || "").trim() || "";
                  return (
                  <tr
                    key={t.id}
                    style={
                      isArchived
                        ? { opacity: 0.7, backgroundColor: "var(--border)", borderLeft: "3px solid var(--muted)" }
                        : undefined
                    }
                    title={isArchived ? "Archived team" : undefined}
                  >
                    <td>
                      <span className="row" style={{ gap: 6, alignItems: "center" }}>
                        {isArchived && <span className="small" style={{ color: "var(--muted)", fontWeight: 600 }}>Archived</span>}
                        {t.tripName || t.tripId?.slice(0, 8) || ""}
                      </span>
                    </td>
                    {isEditingTickets ? (
                      <>
                        <td><input className="input" style={{ minWidth: 60 }} value={t.intlDom || ""} onChange={(e) => updateTicketRow(t.id, "intlDom", e.target.value)} /></td>
                        <td><input className="input" style={{ minWidth: 100 }} value={t.workerName || ""} onChange={(e) => updateTicketRow(t.id, "workerName", e.target.value)} /></td>
                        <td><input className="input" style={{ minWidth: 120 }} value={siteDisplay} onChange={(e) => updateTicketRow(t.id, "projectCountry", e.target.value)} placeholder="Site" /></td>
                        <td><input className="input" type="date" style={{ minWidth: 110 }} value={t.departureDate || ""} onChange={(e) => updateTicketRow(t.id, "departureDate", e.target.value)} /></td>
                        <td><input className="input" style={{ minWidth: 100 }} value={t.ticketAgency || ""} onChange={(e) => updateTicketRow(t.id, "ticketAgency", e.target.value)} /></td>
                        <td><input className="input" style={{ minWidth: 90 }} value={t.totalTicketCost || ""} onChange={(e) => updateTicketRow(t.id, "totalTicketCost", e.target.value)} /></td>
                        <td><input className="input" style={{ minWidth: 90 }} value={t.amountWorkerPaid || ""} onChange={(e) => updateTicketRow(t.id, "amountWorkerPaid", e.target.value)} /></td>
                        <td><input className="input" style={{ minWidth: 90 }} value={t.totalLstCost || ""} onChange={(e) => updateTicketRow(t.id, "totalLstCost", e.target.value)} /></td>
                        <td><input className="input" style={{ minWidth: 90 }} value={t.hpTotalCharge || ""} onChange={(e) => updateTicketRow(t.id, "hpTotalCharge", e.target.value)} /></td>
                        <td><input className="input" type="date" style={{ minWidth: 110 }} value={t.dateApprovedToWithdraw || ""} onChange={(e) => updateTicketRow(t.id, "dateApprovedToWithdraw", e.target.value)} /></td>
                        <td><button className="btn" type="button" onClick={() => confirm("Delete this ticket?") && removeTicket(t.id)}>Delete</button></td>
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
                        <td>{t.totalLstCost || ""}</td>
                        <td>{t.hpTotalCharge || ""}</td>
                        <td>{t.dateApprovedToWithdraw || ""}</td>
                        <td><button className="btn" type="button" onClick={() => setTicketToDeleteId(t.id)}>Delete</button></td>
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
