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
import {
  getTripBudget,
  getTripBudgetFeeBreakdown,
  formatTripBudgetFeeBreakdownDetail,
  housingAmountFromBudgetRow,
  saveTripBudget,
  uploadTripHousingPdf,
} from "@/lib/tripBudget";
import {
  deleteTripTicket,
  listTripTickets,
  saveTripTicket,
  TICKET_AGENCY_OPTIONS,
} from "@/lib/tripTickets";
import { listTripTeamMembers } from "@/lib/tripTeamMembers";
import { listTripParticipants, updateTripForCurrentUser } from "@/lib/trips";
import { computeTeamFundraisingGoalTotal } from "@/lib/tripFundraising";
import { isUsMassachusettsMissionSite } from "@/lib/usMassachusettsSite";

function formatFeeDraftAmount(value) {
  if (value == null || value === "") return "";
  const parsed = parseCurrencyLike(value);
  return parsed != null ? formatUsdNumber(parsed) : String(value);
}

function buildDraftFromSources(trip, budget) {
  const tripName = trip?.name || "";
  return {
    teamName: budget?.teamName || tripName,
    projectStartDate: budget?.projectStartDate || trip?.startDate || "",
    projectEndDate: budget?.projectEndDate || trip?.endDate || "",
    siteCountry: budget?.siteCountry || trip?.location || "",
    teamAccountant: budget?.teamAccountant || "",
    // Budget field (formerly on-site expenses)
    onsiteExpensesAmount: budget?.onsiteExpensesAmount || "",
    // Do not store fundraising here — Housing budget amount is staff-entered only
    budgetAmount: String(budget?.budgetAmount ?? "").trim() || "",
    housingBudgetAmount: budget?.housingBudgetAmount || "",
    housingAmount: budget?.housingAmount || "",
    returnedAmount: budget?.returnedAmount || "",
    housingLink: budget?.housingLink || "",
    housingPdfUrl: budget?.housingPdfUrl || "",
    notes: budget?.notes || "",
    tripFeeAmount: formatFeeDraftAmount(trip?.tripFeeAmount),
    materialsFeeAmount: formatFeeDraftAmount(trip?.materialsFeeAmount),
    domesticProjectFeeAmount: formatFeeDraftAmount(trip?.domesticProjectFeeAmount),
    domesticFeeAmount: formatFeeDraftAmount(trip?.domesticFeeAmount),
    domesticMaterialsFeeAmount: formatFeeDraftAmount(trip?.domesticMaterialsFeeAmount),
  };
}

function Field({ label, children, wide = false }) {
  return (
    <label className={`budgetTeamEditorField${wide ? " budgetTeamEditorFieldWide" : ""}`}>
      <span className="budgetTeamEditorLabel">{label}</span>
      {children}
    </label>
  );
}

function EditorInput(props) {
  return <input className="input budgetTeamEditorControl" {...props} />;
}

function EditorSelect(props) {
  return <select className="input budgetTeamEditorControl" {...props} />;
}

function EditorTextarea(props) {
  return <textarea className="input budgetTeamEditorControl budgetTeamEditorTextarea" {...props} />;
}

export default function BudgetTeamEditorModal({ tripId, trip, tripName, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [ticketDeleteId, setTicketDeleteId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!tripId) return;
      setLoading(true);
      try {
        const [budget, ticketRows, roster, participantRows] = await Promise.all([
          getTripBudget(tripId),
          listTripTickets(tripId),
          listTripTeamMembers(tripId).catch(() => []),
          listTripParticipants(tripId).catch(() => []),
        ]);
        if (cancelled) return;
        setDraft(buildDraftFromSources(trip, budget));
        setTickets(ticketRows || []);
        setTeamMembers(roster || []);
        setParticipants(participantRows || []);
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

  const isDomesticProject = useMemo(
    () => isUsMassachusettsMissionSite(draft?.siteCountry || trip?.location),
    [draft?.siteCountry, trip?.location]
  );

  const fundraisingTotal = useMemo(
    () =>
      computeTeamFundraisingGoalTotal({
        ...trip,
        teamMembers,
        participants,
      }),
    [trip, teamMembers, participants]
  );

  const summary = useMemo(() => {
    const airfareTotal = (tickets || []).reduce(
      (sum, row) => sum + (parseCurrencyLike(row.totalTicketCost) ?? 0),
      0
    );
    const housingTotal = housingAmountFromBudgetRow(draft);
    const teamBudget = parseCurrencyLike(draft?.onsiteExpensesAmount);
    const feeTripLike = {
      location: draft?.siteCountry || trip?.location,
      tripFeeAmount: draft?.tripFeeAmount,
      materialsFeeAmount: draft?.materialsFeeAmount,
      domesticProjectFeeAmount: draft?.domesticProjectFeeAmount,
      domesticFeeAmount: draft?.domesticFeeAmount,
      domesticMaterialsFeeAmount: draft?.domesticMaterialsFeeAmount,
    };
    const feeBreakdown = getTripBudgetFeeBreakdown(feeTripLike, { isDomestic: isDomesticProject });
    const feeTotal = feeBreakdown.total;
    const fundraising = fundraisingTotal > 0 ? fundraisingTotal : null;
    const spent = (teamBudget ?? 0) + airfareTotal + housingTotal + feeTotal;
    const leftover = fundraising == null ? null : fundraising - spent;
    return {
      fundraisingTotal: fundraising,
      budgetTotal: teamBudget,
      airfareTotal,
      housingTotal,
      feeTotal,
      feeDetail: formatTripBudgetFeeBreakdownDetail(feeBreakdown),
      leftover,
    };
  }, [draft, tickets, fundraisingTotal, isDomesticProject, trip?.location]);

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
        housingBudgetAmount: draft.housingBudgetAmount,
        housingAmount: draft.housingAmount,
        returnedAmount: draft.returnedAmount,
        housingLink: draft.housingLink,
        housingPdfUrl: draft.housingPdfUrl,
        notes: draft.notes,
      });
      const feePatch = {
        tripFeeAmount: draft.tripFeeAmount,
        materialsFeeAmount: draft.materialsFeeAmount,
        domesticProjectFeeAmount: isDomesticProject
          ? draft.domesticProjectFeeAmount
          : trip?.domesticProjectFeeAmount || "",
        domesticFeeAmount: isDomesticProject ? draft.domesticFeeAmount : trip?.domesticFeeAmount || "",
        domesticMaterialsFeeAmount: isDomesticProject
          ? draft.domesticMaterialsFeeAmount
          : trip?.domesticMaterialsFeeAmount || "",
      };
      await updateTripForCurrentUser({
        tripId,
        name: trip?.name || draft.teamName,
        location: trip?.location || draft.siteCountry,
        host: trip?.host || "",
        siteType: trip?.siteType || "",
        teamStatus: trip?.teamStatus || "",
        trainingTimelineType: trip?.trainingTimelineType || "",
        projectType: trip?.projectType || "",
        projectLengthSummary: trip?.projectLengthSummary || "",
        extraTravelStatus: trip?.extraTravelStatus || "no",
        startDate: trip?.startDate || draft.projectStartDate,
        endDate: trip?.endDate || draft.projectEndDate,
        fundraisingGoalAmount: trip?.fundraisingGoalAmount ?? "",
        hasDeferredWorker: trip?.hasDeferredWorker ? "yes" : "no",
        hannoverHousingFeeAmount: trip?.hannoverHousingFeeAmount ?? "",
        ...feePatch,
      });
      for (const ticket of tickets) {
        await saveTripTicket({
          ...ticket,
          tripId,
          totalLstCost: computeTotalLstCost(ticket.totalTicketCost, ticket.amountWorkerPaid),
        });
      }
      showToast("Team budget saved.", "success");
      onSaved?.(feePatch);
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
      role="presentation"
      onClick={() => {
        if (!saving) onClose?.();
      }}
    >
      <div
        className="card pad budgetTeamEditorModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="budgetTeamEditorTitle"
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
                <span className="budgetTeamEditorSummaryLabel">Total fundraising</span>
                <strong>
                  {summary.fundraisingTotal != null ? formatUsdNumber(summary.fundraisingTotal) : "—"}
                </strong>
              </div>
              <div>
                <span className="budgetTeamEditorSummaryLabel">Team budget</span>
                <strong>
                  {summary.budgetTotal != null ? formatUsdNumber(summary.budgetTotal) : "—"}
                </strong>
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
                <span className="budgetTeamEditorSummaryLabel">Fee</span>
                <strong>{formatUsdNumber(summary.feeTotal)}</strong>
                {summary.feeDetail ? (
                  <div className="small" style={{ color: "var(--muted)", marginTop: 4, lineHeight: 1.35 }}>
                    {summary.feeDetail}
                  </div>
                ) : null}
              </div>
              <div>
                <span className="budgetTeamEditorSummaryLabel">Leftover</span>
                <strong
                  style={{
                    color: summary.leftover != null && summary.leftover < 0 ? "#dc2626" : "#15803d",
                  }}
                >
                  {summary.leftover != null ? formatUsdNumber(summary.leftover) : "—"}
                </strong>
              </div>
            </div>

            <div className="budgetTeamEditorTopGrid">
              <section className="budgetTeamEditorSection">
                <h3 className="budgetTeamEditorSectionTitle">Team details</h3>
                <div className="budgetTeamEditorFields">
                  <Field label="Team name">
                    <EditorInput value={draft.teamName} onChange={(e) => patchDraft({ teamName: e.target.value })} />
                  </Field>
                  <div className="budgetTeamEditorFieldPair">
                    <Field label="Project start">
                      <EditorInput
                        type="date"
                        value={draft.projectStartDate}
                        onChange={(e) => patchDraft({ projectStartDate: e.target.value })}
                      />
                    </Field>
                    <Field label="Project end">
                      <EditorInput
                        type="date"
                        value={draft.projectEndDate}
                        onChange={(e) => patchDraft({ projectEndDate: e.target.value })}
                      />
                    </Field>
                  </div>
                  <Field label="Site">
                    <EditorInput
                      value={draft.siteCountry}
                      onChange={(e) => patchDraft({ siteCountry: e.target.value })}
                    />
                  </Field>
                  <Field label="Team accountant">
                    <EditorSelect
                      value={draft.teamAccountant}
                      onChange={(e) => patchDraft({ teamAccountant: e.target.value })}
                    >
                      <option value="">— Select team member —</option>
                      {accountantNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                      {draft.teamAccountant && !accountantNames.includes(draft.teamAccountant) ? (
                        <option value={draft.teamAccountant}>{draft.teamAccountant} (not on roster)</option>
                      ) : null}
                    </EditorSelect>
                  </Field>
                </div>
              </section>

              <section className="budgetTeamEditorSection">
                <h3 className="budgetTeamEditorSectionTitle">Overview amounts</h3>
                <div className="budgetTeamEditorFields">
                  <Field label="Fundraising">
                    <EditorInput
                      value={fundraisingTotal > 0 ? formatUsdNumber(fundraisingTotal) : ""}
                      readOnly
                      disabled
                      placeholder="—"
                    />
                    <p className="budgetTeamEditorHint">
                      Combined worker fundraising goals from the roster (read-only).
                    </p>
                  </Field>
                  <Field label="Budget">
                    <EditorInput
                      value={draft.onsiteExpensesAmount}
                      onChange={(e) => patchDraft({ onsiteExpensesAmount: e.target.value })}
                      onBlur={(e) =>
                        patchDraft({ onsiteExpensesAmount: normalizeMoneyInputToUsd(e.target.value) })
                      }
                      inputMode="decimal"
                      placeholder="$0.00"
                    />
                  </Field>
                </div>
              </section>
            </div>

            <section className="budgetTeamEditorSection budgetTeamEditorSectionWide">
              <h3 className="budgetTeamEditorSectionTitle">Fees</h3>
              <div className="budgetTeamEditorFormGrid">
                <div className="budgetTeamEditorHousingAmounts">
                  <Field label="Fee">
                    <EditorInput
                      value={draft.tripFeeAmount}
                      onChange={(e) => patchDraft({ tripFeeAmount: e.target.value })}
                      onBlur={(e) => patchDraft({ tripFeeAmount: normalizeMoneyInputToUsd(e.target.value) })}
                      inputMode="decimal"
                      placeholder="$0.00"
                    />
                  </Field>
                  <Field label="Materials Fee">
                    <EditorInput
                      value={draft.materialsFeeAmount}
                      onChange={(e) => patchDraft({ materialsFeeAmount: e.target.value })}
                      onBlur={(e) =>
                        patchDraft({ materialsFeeAmount: normalizeMoneyInputToUsd(e.target.value) })
                      }
                      inputMode="decimal"
                      placeholder="$0.00"
                    />
                  </Field>
                  {isDomesticProject ? (
                    <>
                      <Field label="Domestic Project">
                        <EditorInput
                          value={draft.domesticProjectFeeAmount}
                          onChange={(e) => patchDraft({ domesticProjectFeeAmount: e.target.value })}
                          onBlur={(e) =>
                            patchDraft({
                              domesticProjectFeeAmount: normalizeMoneyInputToUsd(e.target.value),
                            })
                          }
                          inputMode="decimal"
                          placeholder="$0.00"
                        />
                      </Field>
                      <Field label="Domestic Fee">
                        <EditorInput
                          value={draft.domesticFeeAmount}
                          onChange={(e) => patchDraft({ domesticFeeAmount: e.target.value })}
                          onBlur={(e) =>
                            patchDraft({ domesticFeeAmount: normalizeMoneyInputToUsd(e.target.value) })
                          }
                          inputMode="decimal"
                          placeholder="$0.00"
                        />
                      </Field>
                      <Field label="Domestic Materials Fee">
                        <EditorInput
                          value={draft.domesticMaterialsFeeAmount}
                          onChange={(e) => patchDraft({ domesticMaterialsFeeAmount: e.target.value })}
                          onBlur={(e) =>
                            patchDraft({
                              domesticMaterialsFeeAmount: normalizeMoneyInputToUsd(e.target.value),
                            })
                          }
                          inputMode="decimal"
                          placeholder="$0.00"
                        />
                      </Field>
                    </>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="budgetTeamEditorSection budgetTeamEditorSectionWide">
              <h3 className="budgetTeamEditorSectionTitle">Housing</h3>
              <div className="budgetTeamEditorFormGrid">
                <div className="budgetTeamEditorHousingAmounts">
                  <Field label="Housing budget">
                    <EditorInput
                      value={draft.housingBudgetAmount}
                      onChange={(e) => patchDraft({ housingBudgetAmount: e.target.value })}
                      onBlur={(e) =>
                        patchDraft({ housingBudgetAmount: normalizeMoneyInputToUsd(e.target.value) })
                      }
                      inputMode="decimal"
                      placeholder="$0.00"
                    />
                  </Field>
                  <Field label="Housing amount">
                    <EditorInput
                      value={draft.housingAmount}
                      onChange={(e) => patchDraft({ housingAmount: e.target.value })}
                      onBlur={(e) => patchDraft({ housingAmount: normalizeMoneyInputToUsd(e.target.value) })}
                      inputMode="decimal"
                      placeholder="$0.00"
                    />
                  </Field>
                  <Field label="Returned amount">
                    <EditorInput
                      value={draft.returnedAmount}
                      onChange={(e) => patchDraft({ returnedAmount: e.target.value })}
                      onBlur={(e) =>
                        patchDraft({ returnedAmount: normalizeMoneyInputToUsd(e.target.value) })
                      }
                      inputMode="decimal"
                      placeholder="$0.00"
                    />
                  </Field>
                </div>
                <Field label="Housing link" wide>
                  <EditorInput
                    value={draft.housingLink}
                    onChange={(e) => patchDraft({ housingLink: e.target.value })}
                    placeholder="https://…"
                  />
                </Field>
                <Field label="Housing PDF">
                  <div className="budgetTeamEditorFileActions">
                    <label className="btn budgetTeamEditorFileBtn">
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="budgetTeamEditorFileInput"
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
                        <a
                          className="small budgetTeamEditorFileLink"
                          href={draft.housingPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open PDF
                        </a>
                        <button type="button" className="btn" onClick={() => patchDraft({ housingPdfUrl: "" })}>
                          Clear
                        </button>
                      </>
                    ) : (
                      <span className="small budgetTeamEditorFilePlaceholder">No PDF uploaded</span>
                    )}
                  </div>
                </Field>
                <Field label="Notes" wide>
                  <EditorTextarea
                    rows={2}
                    value={draft.notes}
                    onChange={(e) => patchDraft({ notes: e.target.value })}
                  />
                </Field>
              </div>
            </section>

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
                  {tickets.map((ticket, ticketIndex) => (
                    <div key={ticket.id} className="budgetTeamEditorTicketCard">
                      <div className="budgetTeamEditorTicketCardHeader">
                        <span className="budgetTeamEditorTicketCardTitle">
                          Ticket {ticketIndex + 1}
                          {ticket.workerName ? ` · ${ticket.workerName}` : ""}
                        </span>
                        {ticketDeleteId === ticket.id ? (
                          <div className="budgetTeamEditorTicketCardActions">
                            <button
                              type="button"
                              className="btn btnPrimary"
                              onClick={() => void handleDeleteTicket(ticket.id)}
                            >
                              Confirm delete
                            </button>
                            <button type="button" className="btn" onClick={() => setTicketDeleteId("")}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button type="button" className="btn" onClick={() => setTicketDeleteId(ticket.id)}>
                            Delete
                          </button>
                        )}
                      </div>
                      <div className="budgetTeamEditorFormGrid budgetTeamEditorTicketForm">
                        <Field label="Worker">
                          <EditorInput
                            value={ticket.workerName || ""}
                            onChange={(e) => updateTicket(ticket.id, "workerName", e.target.value)}
                          />
                        </Field>
                        <Field label="Departure">
                          <EditorInput
                            type="date"
                            value={ticket.departureDate || ""}
                            onChange={(e) => updateTicket(ticket.id, "departureDate", e.target.value)}
                          />
                        </Field>
                        <Field label="Agency">
                          <EditorSelect
                            value={ticket.ticketAgency || ""}
                            onChange={(e) => updateTicket(ticket.id, "ticketAgency", e.target.value)}
                          >
                            <option value="">Select agency</option>
                            {TICKET_AGENCY_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </EditorSelect>
                        </Field>
                        <Field label="Intl/Dom">
                          <EditorInput
                            value={ticket.intlDom || ""}
                            onChange={(e) => updateTicket(ticket.id, "intlDom", e.target.value)}
                          />
                        </Field>
                        <Field label="Total ticket cost">
                          <EditorInput
                            value={ticket.totalTicketCost || ""}
                            onChange={(e) => updateTicket(ticket.id, "totalTicketCost", e.target.value)}
                            onBlur={(e) =>
                              updateTicket(ticket.id, "totalTicketCost", normalizeMoneyInputToUsd(e.target.value))
                            }
                            inputMode="decimal"
                            placeholder="$0.00"
                          />
                        </Field>
                        <Field label="Worker paid">
                          <EditorInput
                            value={ticket.amountWorkerPaid || ""}
                            onChange={(e) => updateTicket(ticket.id, "amountWorkerPaid", e.target.value)}
                            onBlur={(e) =>
                              updateTicket(ticket.id, "amountWorkerPaid", normalizeMoneyInputToUsd(e.target.value))
                            }
                            inputMode="decimal"
                            placeholder="$0.00"
                          />
                        </Field>
                        <Field label="Total LST cost">
                          <EditorInput
                            value={computeTotalLstCost(ticket.totalTicketCost, ticket.amountWorkerPaid)}
                            readOnly
                            disabled
                          />
                        </Field>
                        <Field label="Notes" wide>
                          <EditorTextarea
                            rows={2}
                            value={ticket.notes || ""}
                            onChange={(e) => updateTicket(ticket.id, "notes", e.target.value)}
                          />
                        </Field>
                      </div>
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
