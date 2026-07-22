import { useState } from "react";
import AppIcon from "@/components/AppIcon";
import BudgetTeamEditorModal from "@/components/budget/BudgetTeamEditorModal";
import { formatTripBudgetSummaryUsd } from "@/lib/tripBudget";
import { useTripPage } from "../TripPageContext";
import {
  CollapsibleSection,
} from "../tripPageShared";

const tripStaffBudgetCardGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 10,
};

const tripStaffBudgetCardStyle = {
  borderRadius: 12,
  border: "1px solid rgba(15, 23, 42, 0.08)",
  background: "rgba(248, 250, 252, 0.88)",
  padding: "12px 14px",
  display: "grid",
  gap: 6,
  minWidth: 0,
  textAlign: "center",
  justifyItems: "center",
  alignContent: "center",
};

const tripStaffBudgetCardLabelStyle = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "var(--muted)",
};

const tripStaffBudgetCardValueStyle = {
  fontSize: 22,
  lineHeight: 1,
  fontWeight: 900,
  fontVariantNumeric: "tabular-nums",
};

export default function TripFundraisingTab() {
    const {
    canManageTripFundraising,
    canViewFundraisingTeamDashboard,
    editingParticipantFundraisingId,
    formatDeadlineDate,
    formatMoney,
    fundraisingDrafts,
    fundraisingUsesPercentMilestones,
    fundraisingFirstDeadlineAmount,
    fundraisingFirstDeadlineLabel,
    fundraisingFirstDeadlineDate,
    fundraisingGoalAmount,
    fundraisingSecondDeadlineAmount,
    fundraisingSecondDeadlineLabel,
    fundraisingSecondDeadlineDate,
    fundraisingStatus,
    handleSaveFundraising,
    handleSaveTeamFundraising,
    isEditingTeamFundraising,
    isTeamFundraisingMode,
    setEditingParticipantFundraisingId,
    setFundraisingDrafts,
    setFundraisingStatus,
    setIsEditingTeamFundraising,
    setTeamFundraisingDraft,
    setTeamFundraisingStatus,
    staffViewAllParticipants,
    teamFundraisingDraft,
    teamFundraisingStatus,
    trip,
    tripStaffBudgetSummary,
    refreshTripStaffBudgetData,
    mergeTripFields,
    updateFundraisingDraft,
    visibleFundraisingParticipants,
  } = useTripPage();
  const [teamBudgetEditorOpen, setTeamBudgetEditorOpen] = useState(false);

  const staffBudgetCards = [
    { label: "Total fundraising", value: tripStaffBudgetSummary?.fundraisingTotal },
    { label: "Team budget", value: tripStaffBudgetSummary?.budgetTotal },
    { label: "Airfare", value: tripStaffBudgetSummary?.airfareTotal },
    { label: "Housing", value: tripStaffBudgetSummary?.housingTotal },
    {
      label: "Fee",
      value: tripStaffBudgetSummary?.feeTotal,
      detail: tripStaffBudgetSummary?.feeDetail || "",
    },
    {
      label: "Leftover",
      value: tripStaffBudgetSummary?.leftover,
      color:
        tripStaffBudgetSummary?.leftover != null && tripStaffBudgetSummary.leftover < 0
          ? "#dc2626"
          : tripStaffBudgetSummary?.leftover != null
            ? "#15803d"
            : undefined,
    },
  ];

  return (
    <>
    <div style={{ display: "grid", gap: 16 }}>
              {staffViewAllParticipants ? (
                <div
                  className="card pad"
                  style={{
                    boxShadow: "none",
                    background:
                      "linear-gradient(180deg, rgba(241, 245, 249, 0.95), rgba(255,255,255,1) 55%)",
                    borderColor: "rgba(15, 23, 42, 0.1)",
                    display: "grid",
                    gap: 14,
                  }}
                >
                  <div
                    className="row"
                    style={{
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div className="cardSectionPill" style={{ marginBottom: 6 }}>
                        Staff: Team budget & expenses
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btnPrimary"
                      disabled={!trip?.id}
                      onClick={() => setTeamBudgetEditorOpen(true)}
                    >
                      Edit
                    </button>
                  </div>
                  <div style={tripStaffBudgetCardGridStyle}>
                    {staffBudgetCards.map((card) => (
                      <div key={card.label} style={tripStaffBudgetCardStyle}>
                        <div style={tripStaffBudgetCardLabelStyle}>{card.label}</div>
                        <div style={{ ...tripStaffBudgetCardValueStyle, color: card.color }}>
                          {formatTripBudgetSummaryUsd(card.value)}
                        </div>
                        {card.detail ? (
                          <div
                            className="small"
                            style={{
                              color: "var(--muted)",
                              lineHeight: 1.35,
                              marginTop: 2,
                              textAlign: "center",
                            }}
                          >
                            {card.detail}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: canViewFundraisingTeamDashboard
                    ? "repeat(auto-fit, minmax(220px, 1fr))"
                    : "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                <div
                  className="card pad"
                  style={{
                    boxShadow: "none",
                    background: "linear-gradient(180deg, rgba(250,245,220,.78), #fff 55%)",
                    borderColor: "rgba(180,140,40,.22)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: 6,
                  }}
                >
                  <div className="cardSectionPill" style={{ marginBottom: 2, alignSelf: "center" }}>
                    90 days before departure
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" }}>
                    {fundraisingUsesPercentMilestones
                      ? fundraisingFirstDeadlineLabel || "50%"
                      : formatMoney(fundraisingFirstDeadlineAmount)}
                  </div>
                  <div className="small" style={{ opacity: 0.9 }}>
                    {fundraisingUsesPercentMilestones ? "50% of fundraising due by " : "Due by "}
                    <strong>{formatDeadlineDate(fundraisingFirstDeadlineDate)}</strong>
                    {!trip?.startDate ? (
                      <span style={{ color: "var(--muted)" }}>
                        {" "}
                        — add a trip start date to calculate this deadline.
                      </span>
                    ) : null}
                  </div>
                </div>
                <div
                  className="card pad"
                  style={{
                    boxShadow: "none",
                    background: "linear-gradient(180deg, rgba(232,245,232,.78), #fff 55%)",
                    borderColor: "rgba(50,120,70,.18)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: 6,
                  }}
                >
                  <div className="cardSectionPill" style={{ marginBottom: 2, alignSelf: "center" }}>
                    30 days before departure
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" }}>
                    {fundraisingUsesPercentMilestones
                      ? fundraisingSecondDeadlineLabel || "50%"
                      : formatMoney(fundraisingSecondDeadlineAmount)}
                  </div>
                  <div className="small" style={{ opacity: 0.9 }}>
                    {fundraisingUsesPercentMilestones ? "50% of fundraising due by " : "Remaining due by "}
                    <strong>{formatDeadlineDate(fundraisingSecondDeadlineDate)}</strong>
                    {!trip?.startDate ? (
                      <span style={{ color: "var(--muted)" }}>
                        {" "}
                        — add a trip start date to calculate this deadline.
                      </span>
                    ) : null}
                  </div>
                </div>
                <div
                  className="card pad"
                  style={{
                    boxShadow: "none",
                    background: "linear-gradient(180deg, rgba(234,242,255,.88), #fff 55%)",
                    borderColor: "rgba(47,73,147,.2)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: 10,
                    justifyContent: "center",
                  }}
                >
                  <div className="cardSectionPill" style={{ marginBottom: 0, alignSelf: "center" }}>
                    Resources
                  </div>
                  <div
                    className="row"
                    style={{ flexWrap: "wrap", gap: 8, justifyContent: "center" }}
                  >
                    <a
                      className="btn btnPrimary"
                      href="https://lst.org/projects/general-financial-information/"
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Financial info
                    </a>
                    <a
                      className="btn"
                      href="https://youtu.be/Xx3q7GQ1dRw"
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Edit fundraising page
                    </a>
                  </div>
                </div>
              </div>
    
              <CollapsibleSection defaultOpen>
              <div className="card pad">
                <div className="row" style={{ marginBottom: 12, alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div className="cardSectionPill" style={{ marginBottom: 0 }}>
                    {canViewFundraisingTeamDashboard ? "Fundraising pages" : "My fundraising"}
                  </div>
                  <div className="spacer" />
                  {canManageTripFundraising ? (
                    <button
                      className="btn"
                      type="button"
                      aria-label="Edit fundraising setup"
                      onClick={() => {
                        setIsEditingTeamFundraising(true);
                        setTeamFundraisingStatus("");
                        setTeamFundraisingDraft({
                          teamFundraisingUrl: trip.teamFundraisingUrl || "",
                          fundraisingMode: trip.fundraisingMode === "team" ? "team" : "individual",
                          fundraisingGoalAmount:
                            trip.fundraisingGoalAmount != null && trip.fundraisingGoalAmount !== ""
                              ? String(trip.fundraisingGoalAmount)
                              : "",
                        });
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                    >
                      <span style={{ display: "inline-flex", width: 16, height: 16 }}>
                        <AppIcon name="pencil" />
                      </span>
                      Edit setup
                    </button>
                  ) : null}
                  {teamFundraisingStatus && !isEditingTeamFundraising ? (
                    <div className="small" style={{ color: "var(--muted)" }}>
                      {teamFundraisingStatus}
                    </div>
                  ) : null}
                </div>

                {canManageTripFundraising && isEditingTeamFundraising ? (
                  <div
                    className="card pad"
                    style={{
                      boxShadow: "none",
                      marginBottom: 14,
                      borderColor: "rgba(47,73,147,.22)",
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>Fundraising setup</div>
                    <div>
                      <div className="small" style={{ marginBottom: 8, fontWeight: 700 }}>
                        Fundraising type
                      </div>
                      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <input
                          type="radio"
                          name="fundraisingMode"
                          checked={teamFundraisingDraft.fundraisingMode !== "team"}
                          onChange={() =>
                            setTeamFundraisingDraft((c) => ({ ...c, fundraisingMode: "individual" }))
                          }
                        />
                        <span className="small">Individual fundraising</span>
                      </label>
                      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="radio"
                          name="fundraisingMode"
                          checked={teamFundraisingDraft.fundraisingMode === "team"}
                          onChange={() =>
                            setTeamFundraisingDraft((c) => ({ ...c, fundraisingMode: "team" }))
                          }
                        />
                        <span className="small">Group fundraising</span>
                      </label>
                    </div>
                    {teamFundraisingDraft.fundraisingMode === "team" ? (
                      <>
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Group fundraising amount</div>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            step="1"
                            value={teamFundraisingDraft.fundraisingGoalAmount}
                            onChange={(event) =>
                              setTeamFundraisingDraft((current) => ({
                                ...current,
                                fundraisingGoalAmount: event.target.value,
                              }))
                            }
                            placeholder="e.g. 5000"
                          />
                        </div>
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Shared Neon link</div>
                          <input
                            className="input"
                            value={teamFundraisingDraft.teamFundraisingUrl}
                            onChange={(event) =>
                              setTeamFundraisingDraft((current) => ({
                                ...current,
                                teamFundraisingUrl: event.target.value,
                              }))
                            }
                            placeholder="https://..."
                          />
                        </div>
                      </>
                    ) : null}
                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <button className="btn btnPrimary" type="button" onClick={handleSaveTeamFundraising}>
                        Save setup
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setIsEditingTeamFundraising(false);
                          setTeamFundraisingStatus("");
                          setTeamFundraisingDraft({
                            teamFundraisingUrl: trip.teamFundraisingUrl || "",
                            fundraisingMode: trip.fundraisingMode === "team" ? "team" : "individual",
                            fundraisingGoalAmount:
                              trip.fundraisingGoalAmount != null && trip.fundraisingGoalAmount !== ""
                                ? String(trip.fundraisingGoalAmount)
                                : "",
                          });
                        }}
                      >
                        Cancel
                      </button>
                      {teamFundraisingStatus ? (
                        <div className="small" style={{ alignSelf: "center", color: "var(--muted)" }}>
                          {teamFundraisingStatus}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {isTeamFundraisingMode ? (
                  <div
                    className="card pad"
                    style={{
                      boxShadow: "none",
                      display: "grid",
                      gap: 10,
                      background: "linear-gradient(180deg, rgba(234,242,255,.65), #ffffff 40%)",
                      borderColor: "rgba(47,73,147,.14)",
                      maxWidth: 220,
                    }}
                  >
                    <div className="row" style={{ alignItems: "center", gap: 8 }}>
                      <div style={{ fontWeight: 900, fontSize: 17 }}>Group Fundraising</div>
                      <div className="spacer" />
                      {canManageTripFundraising ? (
                        <button
                          className="btn"
                          type="button"
                          aria-label="Edit group fundraising"
                          onClick={() => {
                            setIsEditingTeamFundraising(true);
                            setTeamFundraisingStatus("");
                            setTeamFundraisingDraft({
                              teamFundraisingUrl: trip.teamFundraisingUrl || "",
                              fundraisingMode: "team",
                              fundraisingGoalAmount:
                                trip.fundraisingGoalAmount != null && trip.fundraisingGoalAmount !== ""
                                  ? String(trip.fundraisingGoalAmount)
                                  : "",
                            });
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 8,
                            minWidth: 36,
                          }}
                        >
                          <span style={{ display: "inline-flex", width: 16, height: 16 }}>
                            <AppIcon name="pencil" />
                          </span>
                        </button>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>
                      {formatMoney(Number(trip.fundraisingGoalAmount || 0))}
                    </div>
                    {trip.teamFundraisingUrl ? (
                      <a
                        className="btn btnPrimary"
                        href={trip.teamFundraisingUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ justifySelf: "start" }}
                      >
                        Open Neon Page
                      </a>
                    ) : canManageTripFundraising ? (
                      <div className="small" style={{ color: "var(--danger)" }}>
                        Add the shared Neon link in Edit setup.
                      </div>
                    ) : (
                      <div className="small" style={{ color: "var(--muted)" }}>
                        Shared Neon page not added yet.
                      </div>
                    )}
                  </div>
                ) : visibleFundraisingParticipants.length === 0 ? (
                  <div className="small">
                    {canViewFundraisingTeamDashboard
                      ? "No fundraising cards to show yet. Leaders not traveling with the team are omitted."
                      : "No fundraising record found for this login."}
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(150px, 180px))",
                      gap: 10,
                      justifyContent: "start",
                    }}
                  >
                    {visibleFundraisingParticipants.map((participant) => {
                      const isEditingParticipantLink =
                        editingParticipantFundraisingId === participant.id;
                      const participantGoal = Number(participant.fundraisingGoalAmount);
                      const goalAmount =
                        participant.fundraisingGoalAmount != null &&
                        participant.fundraisingGoalAmount !== "" &&
                        Number.isFinite(participantGoal) &&
                        participantGoal >= 0
                          ? participantGoal
                          : Number(trip?.fundraisingGoalAmount || 0) > 0
                            ? Number(trip.fundraisingGoalAmount)
                            : 0;
                      const canEditParticipantFundraising =
                        canManageTripFundraising &&
                        canViewFundraisingTeamDashboard &&
                        (!participant.rosterOnly || !!participant.tripTeamMemberId);
                      return (
                        <div
                          key={participant.id || participant.email}
                          className="card pad"
                          style={{
                            boxShadow: "none",
                            display: "grid",
                            gap: 8,
                            padding: "12px",
                            background: "linear-gradient(180deg, rgba(234,242,255,.65), #ffffff 40%)",
                            borderColor: "rgba(47,73,147,.14)",
                            width: "100%",
                            maxWidth: 180,
                          }}
                        >
                          <div className="row" style={{ alignItems: "center", gap: 8 }}>
                            <div
                              className="cardSectionPill"
                              style={{
                                marginBottom: 0,
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {canViewFundraisingTeamDashboard ? participant.name : "My fundraising"}
                            </div>
                            <div className="spacer" />
                            {canEditParticipantFundraising && !isEditingParticipantLink ? (
                              <button
                                className="btn"
                                type="button"
                                aria-label={`Edit fundraising for ${participant.name}`}
                                onClick={() => {
                                  setEditingParticipantFundraisingId(participant.id);
                                  setFundraisingStatus((current) => ({
                                    ...current,
                                    [participant.id]: undefined,
                                  }));
                                  setFundraisingDrafts((current) => ({
                                    ...current,
                                    [participant.id]: {
                                      fundraisingUrl: participant.fundraisingUrl || "",
                                      fundraisingGoalAmount:
                                        participant.fundraisingGoalAmount != null &&
                                        participant.fundraisingGoalAmount !== ""
                                          ? String(participant.fundraisingGoalAmount)
                                          : "",
                                    },
                                  }));
                                }}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: 8,
                                  minWidth: 36,
                                }}
                              >
                                <span style={{ display: "inline-flex", width: 16, height: 16 }}>
                                  <AppIcon name="pencil" />
                                </span>
                              </button>
                            ) : null}
                          </div>

                          {!isEditingParticipantLink ? (
                            <>
                              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em" }}>
                                {formatMoney(goalAmount)}
                              </div>
                              {participant.fundraisingUrl ? (
                                <a
                                  className="btn btnPrimary"
                                  href={participant.fundraisingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ justifySelf: "start", padding: "6px 10px", fontSize: 12 }}
                                >
                                  Open Neon Page
                                </a>
                              ) : (
                                <div className="small" style={{ color: "var(--muted)" }}>
                                  Neon page not added yet.
                                </div>
                              )}
                              {fundraisingStatus[participant.id]?.message ? (
                                <div
                                  className="small"
                                  style={{
                                    color:
                                      fundraisingStatus[participant.id].type === "error"
                                        ? "var(--danger)"
                                        : "var(--muted)",
                                  }}
                                >
                                  {fundraisingStatus[participant.id].message}
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <div style={{ display: "grid", gap: 10 }}>
                              <div>
                                <div className="small" style={{ marginBottom: 6 }}>Neon Fundraising Link</div>
                                <input
                                  className="input"
                                  value={fundraisingDrafts[participant.id]?.fundraisingUrl || ""}
                                  onChange={(event) =>
                                    updateFundraisingDraft(participant.id, "fundraisingUrl", event.target.value)
                                  }
                                  placeholder="https://"
                                />
                              </div>
                              <div>
                                <div className="small" style={{ marginBottom: 6 }}>Fundraising amount</div>
                                <input
                                  className="input"
                                  type="text"
                                  inputMode="decimal"
                                  disabled={!participant.tripTeamMemberId}
                                  value={fundraisingDrafts[participant.id]?.fundraisingGoalAmount || ""}
                                  onChange={(event) =>
                                    updateFundraisingDraft(
                                      participant.id,
                                      "fundraisingGoalAmount",
                                      event.target.value
                                    )
                                  }
                                  placeholder="e.g. 2000"
                                />
                              </div>
                              {fundraisingStatus[participant.id]?.message ? (
                                <div
                                  className="small"
                                  style={{
                                    color:
                                      fundraisingStatus[participant.id].type === "error"
                                        ? "var(--danger)"
                                        : "var(--muted)",
                                  }}
                                >
                                  {fundraisingStatus[participant.id].message}
                                </div>
                              ) : null}
                              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                                <button
                                  className="btn btnPrimary"
                                  type="button"
                                  onClick={() => handleSaveFundraising(participant)}
                                >
                                  Save
                                </button>
                                <button
                                  className="btn"
                                  type="button"
                                  onClick={() => {
                                    setEditingParticipantFundraisingId("");
                                    setFundraisingStatus((current) => ({
                                      ...current,
                                      [participant.id]: undefined,
                                    }));
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              </CollapsibleSection>

            </div>
      {staffViewAllParticipants && teamBudgetEditorOpen && trip?.id ? (
        <BudgetTeamEditorModal
          tripId={trip.id}
          trip={trip}
          tripName={trip.name || ""}
          onClose={() => setTeamBudgetEditorOpen(false)}
          onSaved={(feePatch) => {
            if (feePatch) mergeTripFields(feePatch);
            void refreshTripStaffBudgetData();
          }}
        />
      ) : null}
    </>
  );
}
