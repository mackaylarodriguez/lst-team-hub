import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import { isManagerRole } from "@/lib/roles";
import {
  getBudgetAverages,
  listAllTripBudgets,
  listSiteBudgetNotes,
  saveTripBudget,
  updateSiteBudgetNote,
} from "@/lib/tripBudget";
import {
  listAllTripTickets,
  saveTripTicket,
  deleteTripTicket,
} from "@/lib/tripTickets";
import { listTripsForCurrentUser } from "@/lib/trips";

function n(val) {
  return val === null || val === undefined ? "" : String(val).trim();
}

function mergeHousingWithTrips(trips, budgets) {
  const byTripId = new Map((budgets || []).map((b) => [b.tripId, b]));
  return (trips || []).map((trip) => {
    const b = byTripId.get(trip.id);
    return b
      ? { ...b, tripName: b.tripName || trip.name }
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
  const [siteNotes, setSiteNotes] = useState([]);
  const [editingSiteNoteId, setEditingSiteNoteId] = useState("");
  const [siteNoteDraft, setSiteNoteDraft] = useState({ siteName: "", notes: "", workbookNotes: "" });
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

  const canManage = isManagerRole(session?.permissionRole || session?.role);

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
        const [avgRes, notesRes, tripsRes, housingRes, ticketsRes] = await Promise.all([
          getBudgetAverages(),
          listSiteBudgetNotes(),
          listTripsForCurrentUser(),
          listAllTripBudgets(),
          listAllTripTickets(),
        ]);
        if (cancelled) return;
        setTrips(tripsRes || []);
        setAverages(avgRes);
        setSiteNotes(notesRes);
        setHousingRows(mergeHousingWithTrips(tripsRes, housingRes));
        setTicketRows(ticketsRes);
        if (tripsRes?.length > 0 && !newTicketTripId) setNewTicketTripId(tripsRes[0].id);
      } catch (e) {
        if (!cancelled) setStatus(e.message || "Error loading budget data.");
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
          notes: row.notes,
          numWorkers: row.numWorkers,
          tshirts: row.tshirts,
          workbooks: row.workbooks,
        });
      }
      setHousingRows(housingRowsDraft);
      setIsEditingHousing(false);
      setStatus("Saved.");
    } catch (e) {
      setStatus(e.message || "Error saving.");
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
      setStatus(e.message || "Error saving.");
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
      setStatus(e.message || "Unable to add.");
    }
  }

  if (!session || loading) {
    return (
      <Shell>
        <div className="card pad">
          <div style={{ fontWeight: 900 }}>{loading ? "Loading budget..." : "Redirecting..."}</div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="budgetPage">
        <h1 className="h1" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <AppIcon name="active" className="pageEyebrowIcon" />
          <span>Budget</span>
        </h1>
        <p className="small" style={{ marginBottom: 24 }}>
          Overview of housing and ticketing across all trips. Travel forms stay per team on each trip page.
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
        <div className="card pad" style={{ marginBottom: 24 }}>
          <div className="row" style={{ marginBottom: 8, alignItems: "baseline" }}>
            <div style={{ fontWeight: 900 }}>Site notes</div>
            <div className="spacer" />
            <div className="small" style={{ color: "var(--muted)" }}>
              Effective 1/1/2025
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {siteNotes.map((note) => {
              const isEditing = editingSiteNoteId === note.id;
              const workbook = note.workbookNotes || "";
              const isBuenosAires = note.siteName.toLowerCase().includes("buenos aires");

              return (
                <div
                  key={note.id}
                  className="card pad"
                  style={{
                    boxShadow: "none",
                    background:
                      "linear-gradient(180deg, rgba(248,250,252,1), rgba(255,255,255,1) 55%)",
                    borderColor: "rgba(148,163,184,.45)",
                    position: "relative",
                    gridColumn: isBuenosAires ? "1 / -1" : "auto",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: "0 0 auto 0",
                      height: 4,
                      width: "100%",
                      background: "linear-gradient(90deg, var(--primary), var(--primary2))",
                      borderTopLeftRadius: 12,
                      borderTopRightRadius: 12,
                    }}
                  />
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 900 }}>{note.siteName}</div>
                    {note.effectiveDate ? (
                      <div className="small" style={{ color: "var(--muted)" }}>
                        Effective {note.effectiveDate}
                      </div>
                    ) : null}
                  </div>
                  {isEditing ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <textarea
                        className="input"
                        rows={3}
                        value={siteNoteDraft.notes}
                        onChange={(e) =>
                          setSiteNoteDraft((current) => ({ ...current, notes: e.target.value }))
                        }
                        placeholder="Site notes"
                      />
                      <div>
                        <div className="small" style={{ marginBottom: 4, fontWeight: 600 }}>Workbook notes</div>
                        <textarea
                          className="input"
                          rows={2}
                          value={siteNoteDraft.workbookNotes}
                          onChange={(e) =>
                            setSiteNoteDraft((current) => ({
                              ...current,
                              workbookNotes: e.target.value,
                            }))
                          }
                          placeholder="Workbook notes for this site"
                        />
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <button
                          type="button"
                          className="btn btnPrimary"
                          onClick={async () => {
                            try {
                              setStatus("Saving site note...");
                              const updated = await updateSiteBudgetNote(note.id, {
                                siteName: note.siteName,
                                effectiveDate: note.effectiveDate,
                                notes: siteNoteDraft.notes,
                                workbookNotes: siteNoteDraft.workbookNotes,
                              });
                              setSiteNotes((current) =>
                                current.map((n) => (n.id === note.id ? updated : n))
                              );
                              setStatus("Site note saved.");
                              setEditingSiteNoteId("");
                            } catch (e) {
                              setStatus(e.message || "Unable to save site note.");
                            }
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            setEditingSiteNoteId("");
                            setSiteNoteDraft({ siteName: "", notes: "", workbookNotes: "" });
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="small" style={{ whiteSpace: "pre-wrap" }}>
                        {note.notes || "No notes yet."}
                      </div>
                      <div
                        className="small"
                        style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid var(--border)" }}
                      >
                        <strong>Workbook notes:</strong> {workbook || "No workbook notes yet."}
                      </div>
                      <div className="row" style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            setEditingSiteNoteId(note.id);
                            setSiteNoteDraft({
                              siteName: note.siteName,
                              notes: note.notes,
                              workbookNotes: note.workbookNotes,
                            });
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {tab === "Housing" && (
        <div className="card pad" style={{ marginBottom: 24 }}>
          <div className="row" style={{ marginBottom: 8, alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 900 }}>Housing budget (all trips)</div>
              <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>
                Rows are auto-generated when a trip is created.
              </div>
            </div>
            <div className="spacer" />
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
                  "Notes",
                  "# of workers",
                  "Workbooks",
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
                  r.notes || "",
                  r.numWorkers != null ? String(r.numWorkers) : "",
                  r.workbooks || "",
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
                link.download = "budget-housing.csv";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              style={{ marginLeft: 8 }}
            >
              Export CSV
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 1300, fontSize: 12 }}>
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
                  <th>Notes</th>
                  <th># of workers</th>
                  <th>Workbooks</th>
                </tr>
              </thead>
              <tbody>
                {(isEditingHousing ? housingRowsDraft : housingRows).map((r) => {
                  const isArchived = archivedTripIds.has(r.tripId);
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
                        <td><input className="input" style={{ minWidth: 100 }} value={r.teamAccountant || ""} onChange={(e) => updateHousingDraftRow(r.tripId, "teamAccountant", e.target.value)} /></td>
                        <td><input className="input" style={{ minWidth: 90 }} value={r.budgetAmount || ""} onChange={(e) => updateHousingDraftRow(r.tripId, "budgetAmount", e.target.value)} /></td>
                        <td><input className="input" style={{ minWidth: 90 }} value={r.returnedAmount || ""} onChange={(e) => updateHousingDraftRow(r.tripId, "returnedAmount", e.target.value)} /></td>
                        <td><input className="input" style={{ minWidth: 90 }} value={r.housingAmount || ""} onChange={(e) => updateHousingDraftRow(r.tripId, "housingAmount", e.target.value)} /></td>
                        <td><input className="input" style={{ minWidth: 120 }} value={r.notes || ""} onChange={(e) => updateHousingDraftRow(r.tripId, "notes", e.target.value)} /></td>
                        <td><input className="input" type="number" style={{ width: 60 }} value={r.numWorkers ?? ""} onChange={(e) => updateHousingDraftRow(r.tripId, "numWorkers", e.target.value === "" ? null : parseInt(e.target.value, 10) || null)} /></td>
                        <td><input className="input" style={{ minWidth: 70 }} value={r.workbooks || ""} onChange={(e) => updateHousingDraftRow(r.tripId, "workbooks", e.target.value)} /></td>
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
                        <td>{r.notes || ""}</td>
                        <td>{r.numWorkers != null ? r.numWorkers : ""}</td>
                        <td>{r.workbooks || ""}</td>
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
        )}

        {tab === "Ticketing" && (
        <div className="card pad">
          <div className="row" style={{ marginBottom: 12, alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Ticketing (all trips)</div>
            <div className="spacer" />
            {trips.length > 0 && (
              <>
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
                <button className="btn btnPrimary" type="button" onClick={() => void handleAddTicket()}>Add Ticket</button>
              </>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => setIsEditingTickets((current) => !current)}
              style={{ marginLeft: 8 }}
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
                link.download = "budget-airfare.csv";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              style={{ marginLeft: 8 }}
            >
              Export CSV
            </button>
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
                        <td><button className="btn" type="button" onClick={() => confirm("Delete this ticket?") && removeTicket(t.id)}>Delete</button></td>
                      </>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {ticketRows.length === 0 && <div className="small">No tickets yet. Add tickets from a trip&apos;s Ticketing tab.</div>}
        </div>
        )}
      </div>
    </Shell>
  );
}
