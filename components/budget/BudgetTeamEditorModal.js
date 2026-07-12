import { useEffect, useMemo, useState } from "react";
import Spinner from "@/components/Spinner";
import { showToast } from "@/components/Toast";
import {
  computeTotalLstCost,
  defaultIntlDomForLocation,
  formatUsdNumber,
  normalizeMoneyInputToUsd,
  parseCurrencyLike,
} from "@/lib/budgetMoney";
import { getTripBudget, saveTripBudget, uploadTripHousingPdf } from "@/lib/tripBudget";
import {
  deleteTripTicket,
  listTripTickets,
  saveTripTicket,
  TICKET_AGENCY_OPTIONS,
} from "@/lib/tripTickets";
import { listTripTeamMembers } from "@/lib/tripTeamMembers";

function buildDraftFromSources(trip, budget) {
  const tripName = trip?.name || "";
  return {
    teamName: budget?.teamName || tripName,
    projectStartDate: budget?.projectStartDate || trip?.startDate || "",
    projectEndDate: budget?.projectEndDate || trip?.endDate || "",
    siteCountry: budget?.siteCountry || trip?.location || "",
    teamAccountant: budget?.teamAccountant || "",
    budgetAmount: budget?.budgetAmount || "",
    onsiteExpensesAmount: budget?.onsiteExpensesAmount || "",
    housingAmount: budget?.housingAmount || "",
    returnedAmount: budget?.returnedAmount || "",
    housingLink: budget?.housingLink || "",
    housingPdfUrl: budget?.housingPdfUrl || "",
    notes: budget?.notes || "",
  };
}

function Field({ label, children }) {
  return (
    <label className="budgetTeamEditorField">
      <span className="budgetTeamEditorLabel">{label}</span>
      {children}
    </label>
  );
}

export default function BudgetTeamEditorModal({ tripId, trip, tripName, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [ticketDeleteId, setTicketDeleteId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!tripId) return;
      setLoading(true);
      try {
        const [budget, ticketRows, roster] = await Promise.all([
          getTripBudget(tripId),
          listTripTickets(tripId),
          listTripTeamMembers(tripId).catch(() => []),
        ]);
        if (cancelled) return;
        setDraft(buildDraftFromSources(trip, budget));
        setTickets(ticketRows || []);
        setTeamMembers(roster || []);
      } catch (e) {
        if (!cancelled) {
          showToast(e.message || "Could not load team budget.", "error");
          onClose?.();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tripId, trip, onClose]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !saving) onClose?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  const accountantNames = useMemo(() => {
    const names = [...new Set((teamMembers || []).map((m) => m.name).filter(Boolean))];
    names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return names;
  }, [teamMembers]);

  const summary = useMemo(() => {
    const budgetTotal = parseCurrencyLike(draft?.budgetAmount);
    const airfareTotal = (tickets || []).reduce(
      (sum, row) => sum + (parseCurrencyLike(row.totalTicketCost) ?? 0),
      0
    );
    const housingTotal = parseCurrencyLike(draft?.housingAmount) ?? 0;
    const onsiteTotal = parseCurrencyLike(draft?.onsiteExpensesAmount);
    const spent = airfareTotal + housingTotal + (onsiteTotal ?? 0);
    const leftover = budgetTotal == null ? null : budgetTotal - spent;
    return { budgetTotal, airfareTotal, housingTotal, onsiteTotal, leftover };
  }, [draft, tickets]);

  function patchDraft(patch) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function handlePdfUpload(file) {
    if (!file || !tripId) return;
    try {
      setPdfUploading(true);
      const url = await uploadTripHousingPdf(tripId, file);
      patchDraft({ housingPdfUrl: url });
    } catch (e) {
      showToast(e.message || "Upload failed", "error");
    } finally {
      setPdfUploading(false);
    }
  }

  function updateTicket(ticketId, field, value) {
    setTickets((prev) =>
      prev.map((row) => {
        if (row.id !== ticketId) return row;
        const updated = { ...row, [field]: value };
        updated.totalLstCost = computeTotalLstCost(updated.totalTicketCost, updated.amountWorkerPaid);
        return updated;
      })
    );
  }

  async function handleAddTicket() {
    try {
      const saved = await saveTripTicket({
        tripId,
        intlDom: defaultIntlDomForLocation(trip?.location || draft?.siteCountry),
        workerName: "",
        projectCountry: trip?.location || draft?.siteCountry || "",
        projectCity: "",
        departureDate: trip?.startDate || draft?.projectStartDate || "",
        ticketAgency: "",
        totalTicketCost: "",
        amountWorkerPaid: "",
        totalLstCost: "",
        hpTotalCharge: "",
        dateApprovedToWithdraw: "",
        notes: "",
      });
      setTickets((prev) => [...prev, saved]);
    } catch (e) {
      showToast(e.message || "Could not add ticket.", "error");
    }
  }

  async function handleDeleteTicket(id) {
    try {
      await deleteTripTicket(id);
      setTickets((prev) => prev.filter((row) => row.id !== id));
      setTicketDeleteId("");
    } catch (e) {
      showToast(e.message || "Could not delete ticket.", "error");
    }
  }

  async function handleSave() {
    if (!tripId || !draft) return;
    try {
      setSaving(true);
      await saveTripBudget(tripId, {
        teamName: draft.teamName,
        projectStartDate: draft.projectStartDate,
        projectEndDate: draft.projectEndDate,
        siteCountry: draft.siteCountry,
        teamAccountant: draft.teamAccountant,
        budgetAmount: draft.budgetAmount,
        onsiteExpensesAmount: draft.onsiteExpensesAmount,
        housingAmount: draft.housingAmount,
        returnedAmount: draft.returnedAmount,
        housingLink: draft.housingLink,
        housingPdfUrl: draft.housingPdfUrl,
        notes: draft.notes,
      });
      for (const ticket of tickets) {
        await saveTripTicket({
          ...ticket,
          tripId,
          totalLstCost: computeTotalLstCost(ticket.totalTicketCost, ticket.amountWorkerPaid),
        });
      }
      showToast("Team budget saved.", "success");
      onSaved?.();
      onClose?.();
    } catch (e) {
      showToast(e.message || "Error saving.", "error");
    } finally {
      setSaving(false);
    }
  }

  const title = draft?.teamName || tripName || trip?.name || "Team";

  return (
    <div
      className="appModalOverlay budgetTeamEditorOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budgetTeamEditorTitle"
      onClick={() => {
        if (!saving) onClose?.();
      }}
    >
      <div
        className="card pad budgetTeamEditorModal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="budgetTeamEditorHeader">
          <div>
            <h2 id="budgetTeamEditorTitle" className="budgetTeamEditorTitle">
              {title}
            </h2>
            <p className="small budgetTeamEditorSubtitle">
              Edit budget, housing, and tickets for this team in one place.
            </p>
          </div>
          <button type="button" className="btn" disabled={saving} onClick={onClose}>
            Close
          </button>
        </div>

        {loading || !draft ? (
          <div className="budgetTeamEditorLoading">
            <Spinner size={32} />
            <span>Loading team budget…</span>
          </div>
        ) : (
          <>
            <div className="budgetTeamEditorSummary">
              <div>
                <span className="budgetTeamEditorSummaryLabel">Team budget</span>
                <strong>{summary.budgetTotal != null ? formatUsdNumber(summary.budgetTotal) : "—"}</strong>
              </div>
              <div>
                <span className="budgetTeamEditorSummaryLabel">Airfare</span>
                <strong>{formatUsdNumber(summary.airfareTotal)}</strong>
              </div>
              <div>
                <span className="budgetTeamEditorSummaryLabel">Housing</span>
                <strong>{formatUsdNumber(summary.housingTotal)}</strong>
              </div>
              <div>
                <span className="budgetTeamEditorSummaryLabel">On-site</span>
                <strong>
                  {summary.onsiteTotal != null ? formatUsdNumber(summary.onsiteTotal) : "—"}
                </strong>
              </div>
              <div>
                <span className="budgetTeamEditorSummaryLabel">Leftover</span>
                <strong style={{ color: summary.leftover != null && summary.leftover < 0 ? "#dc2626" : "#15803d" }}>
                  {summary.leftover != null ? formatUsdNumber(summary.leftover) : "—"}
                </strong>
              </div>
            </div>

            <div className="budgetTeamEditorGrid">
              <section className="budgetTeamEditorSection">
                <h3 className="budgetTeamEditorSectionTitle">Team details</h3>
                <div className="budgetTeamEditorFields">
                  <Field label="Team name">
                    <input className="input" value={draft.teamName} onChange={(e) => patchDraft({ teamName: e.target.value })} />
                  </Field>
                  <Field label="Project start">
                    <input className="input" type="date" value={draft.projectStartDate} onChange={(e) => patchDraft({ projectStartDate: e.target.value })} />
                  </Field>
                  <Field label="Project end">
                    <input className="input" type="date" value={draft.projectEndDate} onChange={(e) => patchDraft({ projectEndDate: e.target.value })} />
                  </Field>
                  <Field label="Site">
                    <input className="input" value={draft.siteCountry} onChange={(e) => patchDraft({ siteCountry: e.target.value })} />
                  </Field>
                  <Field label="Team accountant">
                    <select className="input" value={draft.teamAccountant} onChange={(e) => patchDraft({ teamAccountant: e.target.value })}>
                      <option value="">— Select team member —</option>
                      {accountantNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                      {draft.teamAccountant && !accountantNames.includes(draft.teamAccountant) ? (
                        <option value={draft.teamAccountant}>{draft.teamAccountant} (not on roster)</option>
                      ) : null}
                    </select>
                  </Field>
                </div>
              </section>

              <section className="budgetTeamEditorSection">
                <h3 className="budgetTeamEditorSectionTitle">Overview amounts</h3>
                <div className="budgetTeamEditorFields">
                  <Field label="On-site expenses">
                    <input
                      className="input"
                      value={draft.onsiteExpensesAmount}
                      onChange={(e) => patchDraft({ onsiteExpensesAmount: e.target.value })}
                      onBlur={(e) => patchDraft({ onsiteExpensesAmount: normalizeMoneyInputToUsd(e.target.value) })}
                      inputMode="decimal"
                      placeholder="$0.00"
                    />
                  </Field>
                </div>
              </section>

              <section className="budgetTeamEditorSection">
                <h3 className="budgetTeamEditorSectionTitle">Housing</h3>
                <div className="budgetTeamEditorFields">
                  <Field label="Housing budget amount">
                    <input
                      className="input"
                      value={draft.budgetAmount}
                      onChange={(e) => patchDraft({ budgetAmount: e.target.value })}
                      onBlur={(e) => patchDraft({ budgetAmount: normalizeMoneyInputToUsd(e.target.value) })}
                      inputMode="decimal"
                      placeholder="$0.00"
                    />
                  </Field>
                  <Field label="Housing amount">
                    <input
                      className="input"
                      value={draft.housingAmount}
                      onChange={(e) => patchDraft({ housingAmount: e.target.value })}
                      onBlur={(e) => patchDraft({ housingAmount: normalizeMoneyInputToUsd(e.target.value) })}
                      inputMode="decimal"
                      placeholder="$0.00"
                    />
                  </Field>
                  <Field label="Returned amount">
                    <input
                      className="input"
                      value={draft.returnedAmount}
                      onChange={(e) => patchDraft({ returnedAmount: e.target.value })}
                      onBlur={(e) => patchDraft({ returnedAmount: normalizeMoneyInputToUsd(e.target.value) })}
                      inputMode="decimal"
                      placeholder="$0.00"
                    />
                  </Field>
                  <Field label="Housing link">
                    <input
                      className="input"
                      value={draft.housingLink}
                      onChange={(e) => patchDraft({ housingLink: e.target.value })}
                      placeholder="https://…"
                    />
                  </Field>
                  <Field label="Housing PDF">
                    <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <label className="btn" style={{ cursor: "pointer" }}>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          style={{ display: "none" }}
                          disabled={pdfUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            void handlePdfUpload(file);
                          }}
                        />
                        {pdfUploading ? "Uploading…" : "Choose PDF"}
                      </label>
                      {draft.housingPdfUrl ? (
                        <>
                          <a className="small" href={draft.housingPdfUrl} target="_blank" rel="noreferrer">
                            Open PDF
                          </a>
                          <button type="button" className="btn" onClick={() => patchDraft({ housingPdfUrl: "" })}>
                            Clear
                          </button>
                        </>
                      ) : null}
                    </div>
                  </Field>
                  <Field label="Notes">
                    <textarea className="input" rows={3} value={draft.notes} onChange={(e) => patchDraft({ notes: e.target.value })} />
                  </Field>
                </div>
              </section>
            </div>

            <section className="budgetTeamEditorSection budgetTeamEditorTickets">
              <div className="budgetTeamEditorSectionHeader">
                <h3 className="budgetTeamEditorSectionTitle">Tickets</h3>
                <button type="button" className="btn" onClick={() => void handleAddTicket()}>
                  Add ticket
                </button>
              </div>
              {tickets.length === 0 ? (
                <p className="small" style={{ color: "var(--muted)", margin: 0 }}>
                  No tickets yet for this team.
                </p>
              ) : (
                <div className="budgetTeamEditorTicketList">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="budgetTeamEditorTicketCard">
                      <div className="budgetTeamEditorTicketGrid">
                        <Field label="Worker">
                          <input className="input" value={ticket.workerName || ""} onChange={(e) => updateTicket(ticket.id, "workerName", e.target.value)} />
                        </Field>
                        <Field label="Intl/Dom">
                          <input className="input" value={ticket.intlDom || ""} onChange={(e) => updateTicket(ticket.id, "intlDom", e.target.value)} />
                        </Field>
                        <Field label="Departure">
                          <input className="input" type="date" value={ticket.departureDate || ""} onChange={(e) => updateTicket(ticket.id, "departureDate", e.target.value)} />
                        </Field>
                        <Field label="Agency">
                          <select className="input" value={ticket.ticketAgency || ""} onChange={(e) => updateTicket(ticket.id, "ticketAgency", e.target.value)}>
                            <option value="">Select agency</option>
                            {TICKET_AGENCY_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Total ticket cost">
                          <input
                            className="input"
                            value={ticket.totalTicketCost || ""}
                            onChange={(e) => updateTicket(ticket.id, "totalTicketCost", e.target.value)}
                            onBlur={(e) => updateTicket(ticket.id, "totalTicketCost", normalizeMoneyInputToUsd(e.target.value))}
                            inputMode="decimal"
                          />
                        </Field>
                        <Field label="Worker paid">
                          <input
                            className="input"
                            value={ticket.amountWorkerPaid || ""}
                            onChange={(e) => updateTicket(ticket.id, "amountWorkerPaid", e.target.value)}
                            onBlur={(e) => updateTicket(ticket.id, "amountWorkerPaid", normalizeMoneyInputToUsd(e.target.value))}
                            inputMode="decimal"
                          />
                        </Field>
                        <Field label="Total LST cost">
                          <input className="input" value={computeTotalLstCost(ticket.totalTicketCost, ticket.amountWorkerPaid)} readOnly disabled />
                        </Field>
                        <Field label="Notes">
                          <input className="input" value={ticket.notes || ""} onChange={(e) => updateTicket(ticket.id, "notes", e.target.value)} />
                        </Field>
                      </div>
                      {ticketDeleteId === ticket.id ? (
                        <div className="row" style={{ gap: 8, marginTop: 10 }}>
                          <button type="button" className="btn btnPrimary" onClick={() => void handleDeleteTicket(ticket.id)}>
                            Confirm delete
                          </button>
                          <button type="button" className="btn" onClick={() => setTicketDeleteId("")}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button type="button" className="btn" style={{ marginTop: 10 }} onClick={() => setTicketDeleteId(ticket.id)}>
                          Delete ticket
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="budgetTeamEditorFooter">
              <button type="button" className="btn" disabled={saving} onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btnPrimary" disabled={saving} onClick={() => void handleSave()}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
