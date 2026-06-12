import { useTripPage } from "../TripPageContext";
import {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
  AppDetailAction,
  TrainingResourceLink,
  OptionalTripWideDocumentCard,
} from "../tripPageShared";

export default function TripFundraisingTab() {
    const {
    canManageTripFundraising,
    canViewFundraisingTeamDashboard,
    canViewTeamDashboard,
    countForDeadlines,
    editingParticipantFundraisingId,
    formatDeadlineDate,
    formatMoney,
    fundraisingDrafts,
    fundraisingFirstDeadlineAmount,
    fundraisingFirstDeadlineDate,
    fundraisingGoalAmount,
    fundraisingSecondDeadlineAmount,
    fundraisingSecondDeadlineDate,
    fundraisingStatus,
    getFundraisingProgressMeta,
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
    tab,
    teamFundraisingDraft,
    teamFundraisingStatus,
    trip,
    updateFundraisingDraft,
    visibleFundraisingParticipants,
  } = useTripPage();

  return (
    <div style={{ display: "grid", gap: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: canViewFundraisingTeamDashboard
                    ? "repeat(auto-fit, minmax(260px, 1fr))"
                    : "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
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
                    gap: 8,
                    minHeight: 176,
                  }}
                >
                  <div className="cardSectionPill" style={{ marginBottom: 2 }}>
                    90 days before departure
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" }}>
                    {formatMoney(fundraisingFirstDeadlineAmount)}
                  </div>
                  <div className="small" style={{ opacity: 0.9 }}>
                    Target raised by{" "}
                    <strong>{formatDeadlineDate(fundraisingFirstDeadlineDate)}</strong>
                    {!trip?.startDate ? (
                      <span style={{ color: "var(--muted)" }}>
                        {" "}
                        — add a trip start date on the trip to calculate this deadline.
                      </span>
                    ) : null}
                  </div>
                  <div className="small" style={{ opacity: 0.78, marginTop: "auto", lineHeight: 1.45 }}>
                    {canViewTeamDashboard
                      ? `First milestone for the team (${countForDeadlines} worker${
                          countForDeadlines === 1 ? "" : "s"
                        }): typically $2,000 per person toward the trip goal, not more than the total goal.`
                      : "First slice of your trip goal is usually due by this date (often $2,000 toward your full amount)."}
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
                    gap: 8,
                    minHeight: 176,
                  }}
                >
                  <div className="cardSectionPill" style={{ marginBottom: 2 }}>
                    30 days before departure
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" }}>
                    {formatMoney(fundraisingSecondDeadlineAmount)}
                  </div>
                  <div className="small" style={{ opacity: 0.9 }}>
                    Remaining goal due by{" "}
                    <strong>{formatDeadlineDate(fundraisingSecondDeadlineDate)}</strong>
                    {!trip?.startDate ? (
                      <span style={{ color: "var(--muted)" }}>
                        {" "}
                        — add a trip start date on the trip to calculate this deadline.
                      </span>
                    ) : null}
                  </div>
                  <div className="small" style={{ opacity: 0.78, marginTop: "auto", lineHeight: 1.45 }}>
                    {fundraisingSecondDeadlineAmount > 0
                      ? "The rest of the fundraising goal should be covered before this date."
                      : "If your total goal matches the first milestone, there is no separate 30-day balance."}
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
                    gap: 12,
                    justifyContent: "space-between",
                    minHeight: 176,
                  }}
                >
                  <div>
                    <div className="cardSectionPill" style={{ marginBottom: 6 }}>Resources</div>
                    <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 6 }}>
                      Fundraising guides and tools
                    </div>
                    <div className="small" style={{ opacity: 0.88, lineHeight: 1.45 }}>
                      LST handouts, Neon tips, and training references for workers and leaders.
                    </div>
                  </div>
                  <div className="row" style={{ flexWrap: "wrap", gap: 10, marginTop: 4 }}>
                    <a
                      className="btn btnPrimary"
                      href="https://lst.org/projects/general-financial-information/"
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{ alignSelf: "flex-start" }}
                    >
                      General financial information
                    </a>
                    <a
                      className="btn"
                      href="https://lst365.sharepoint.com/:w:/g/IQCaOfL_uQbER5SG_ngJVA7cAWAnrOS1UjRyzsWdMzn_USw"
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{ alignSelf: "flex-start" }}
                    >
                      How to edit your fundraising page
                    </a>
                  </div>
                </div>
              </div>
    
              <CollapsibleSection defaultOpen>
              <div className="card pad">
                <div className="cardSectionPill" style={{ marginBottom: 8 }}>
                  {canViewFundraisingTeamDashboard ? "Fundraising pages" : "My fundraising"}
                </div>
                {canViewFundraisingTeamDashboard && !canManageTripFundraising ? (
                  <div className="small" style={{ marginBottom: 14, opacity: 0.88 }}>
                    {"View everyone's Neon pages and progress. Staff configure trip fundraising setup and edit links."}
                  </div>
                ) : null}
                {!canViewFundraisingTeamDashboard ? (
                  <div className="small" style={{ marginBottom: 14, opacity: 0.88 }}>
                    {isTeamFundraisingMode
                      ? "Shared fundraising for your family or team."
                      : "Your Neon fundraising page and team updates."}
                  </div>
                ) : null}
    
                {canManageTripFundraising && (
                  <div
                    className="card pad"
                    style={{
                      boxShadow: "none",
                      marginBottom: 14,
                      background: "linear-gradient(180deg, rgba(234,242,255,.85), rgba(255,255,255,1) 65%)",
                      borderColor: "rgba(47,73,147,.22)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div className="cardSectionPill" style={{ marginBottom: 4 }}>Fundraising setup</div>
                    <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>
                      Individual vs family / team fundraising
                    </div>
                    <div className="small" style={{ opacity: 0.9, lineHeight: 1.45 }}>
                      Most teams use individual Neon pages. Choose team/family when everyone shares one campaign and one
                      trip goal.
                    </div>
                    {!isEditingTeamFundraising ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div className="small">
                          <strong>Current:</strong>{" "}
                          {trip.fundraisingMode === "team"
                            ? "Team / family — one shared Neon link and trip fundraising goal."
                            : "Individual — each worker has their own Neon page (default)."}
                        </div>
                        <div className="small">
                          <strong>Trip goal:</strong> {formatMoney(Number(trip.fundraisingGoalAmount || 0))}
                        </div>
                        {trip.teamFundraisingUrl ? (
                          <a className="btn" href={trip.teamFundraisingUrl} target="_blank" rel="noreferrer">
                            Open shared Neon page
                          </a>
                        ) : trip.fundraisingMode === "team" ? (
                          <div className="small" style={{ color: "var(--danger)" }}>
                            Team mode is on — add a shared Neon link in Edit setup.
                          </div>
                        ) : null}
                        <div className="row">
                          <button
                            className="btn"
                            type="button"
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
                          >
                            Edit setup
                          </button>
                          {teamFundraisingStatus ? (
                            <div className="small" style={{ alignSelf: "center" }}>
                              {teamFundraisingStatus}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 12 }}>
                        <div>
                          <div className="small" style={{ marginBottom: 8, fontWeight: 700 }}>
                            How is this trip fundraising?
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
                            <span className="small">
                              Individual — each worker has their own Neon link (most common)
                            </span>
                          </label>
                          <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <input
                              type="radio"
                              name="fundraisingMode"
                              checked={teamFundraisingDraft.fundraisingMode === "team"}
                              onChange={() =>
                                setTeamFundraisingDraft((c) => ({ ...c, fundraisingMode: "team" }))
                              }
                            />
                            <span className="small">
                              Team / family — one shared Neon link and one trip goal for everyone (e.g. one family
                              campaign)
                            </span>
                          </label>
                        </div>
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>
                            {teamFundraisingDraft.fundraisingMode === "team"
                              ? "Shared Neon link (required for team mode)"
                              : "Optional shared Neon link"}
                          </div>
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
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Trip fundraising goal (dollars)</div>
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
                        <div className="row">
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
                            <div className="small" style={{ alignSelf: "center" }}>
                              {teamFundraisingStatus}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                )}
    
                {canViewFundraisingTeamDashboard && isTeamFundraisingMode ? (
                  <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
                    Team/family mode: workers only see the shared Neon link above. Per-person links below are optional
                    (e.g. exceptions).
                  </div>
                ) : null}
                {!canViewFundraisingTeamDashboard && isTeamFundraisingMode ? (
                  <div className="small" style={{ marginTop: 4 }}>
                    This trip uses one shared fundraising page for the whole family or team — personal Neon tiles are
                    hidden. Use the shared link above.
                  </div>
                ) : visibleFundraisingParticipants.length === 0 ? (
                  <div className="small">
                    {canViewFundraisingTeamDashboard
                      ? "No per-person fundraising tiles to show yet. Leaders not traveling with the team are omitted."
                      : "No fundraising record found for this login."}
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: canViewFundraisingTeamDashboard
                        ? "repeat(auto-fit, minmax(220px, 1fr))"
                        : "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: canViewFundraisingTeamDashboard ? 16 : 12,
                    }}
                  >
                    {visibleFundraisingParticipants.map((participant) => {
                      const isEditingParticipantLink =
                        editingParticipantFundraisingId === participant.id;
                      const fundraisingProgressMeta = getFundraisingProgressMeta(participant);
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
                            minHeight: canViewFundraisingTeamDashboard ? 220 : 136,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            background: "linear-gradient(180deg, rgba(234,242,255,.65), #ffffff 40%)",
                            borderColor: "rgba(47,73,147,.14)",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              inset: "0 auto auto 0",
                              width: "100%",
                              height: 5,
                              background: "linear-gradient(90deg, var(--primary), var(--primary2))",
                            }}
                          />
                          <div>
                            <div className="row" style={{ alignItems: "flex-start", marginBottom: 10 }}>
                              <div
                                style={{
                                  fontWeight: 900,
                                  fontSize: canViewFundraisingTeamDashboard ? 18 : 15,
                                  lineHeight: 1.2,
                                }}
                              >
                                {participant.name}
                              </div>
                              <div className="spacer" />
                              <span className={"badge " + fundraisingProgressMeta.badgeClass}>
                                {fundraisingProgressMeta.label}
                              </span>
                            </div>
                            <div className="small" style={{ marginBottom: 8 }}>
                              {fundraisingProgressMeta.helperText}
                            </div>
                            <div className="small" style={{ marginBottom: 12, color: "var(--muted)" }}>
                              {fundraisingProgressMeta.goalLine}
                            </div>
                          </div>
                          <div>
                            {participant.fundraisingUrl ? (
                              <a className="btn btnPrimary" href={participant.fundraisingUrl} target="_blank" rel="noreferrer">
                                Open Neon Page
                              </a>
                            ) : null}
                          </div>
                          {canEditParticipantFundraising && (
                            <>
                              <div style={{ height: 12 }} />
                              {!isEditingParticipantLink ? (
                                <div className="row">
                                  <button
                                    className="btn"
                                    type="button"
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
                                  >
                                    {participant.fundraisingUrl ? "Edit link & goal" : "Add link & goal"}
                                  </button>
                                  {fundraisingStatus[participant.id]?.message ? (
                                    <div
                                      className="small"
                                      style={{
                                        alignSelf: "center",
                                        color:
                                          fundraisingStatus[participant.id].type === "error"
                                            ? "var(--danger)"
                                            : "var(--muted)",
                                      }}
                                    >
                                      {fundraisingStatus[participant.id].message}
                                    </div>
                                  ) : null}
                                </div>
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
                                    <div className="small" style={{ marginBottom: 6 }}>
                                      Individual goal (USD, optional)
                                    </div>
                                    <input
                                      className="input"
                                      type="text"
                                      inputMode="decimal"
                                      disabled={!participant.tripTeamMemberId}
                                      title={
                                        !participant.tripTeamMemberId
                                          ? "Add this worker to the trip roster (Team tab) to store a per-person goal."
                                          : undefined
                                      }
                                      value={fundraisingDrafts[participant.id]?.fundraisingGoalAmount || ""}
                                      onChange={(event) =>
                                        updateFundraisingDraft(
                                          participant.id,
                                          "fundraisingGoalAmount",
                                          event.target.value
                                        )
                                      }
                                      placeholder={
                                        trip?.fundraisingGoalAmount != null &&
                                        trip.fundraisingGoalAmount !== "" &&
                                        Number(trip.fundraisingGoalAmount) > 0
                                          ? `Trip default: ${trip.fundraisingGoalAmount}`
                                          : "e.g. 2000"
                                      }
                                    />
                                    {!participant.tripTeamMemberId ? (
                                      <div className="small" style={{ marginTop: 6, color: "var(--muted)" }}>
                                        Per-person goals are saved on the roster. Add them on the Team tab first.
                                      </div>
                                    ) : null}
                                  </div>
                                  {fundraisingStatus[participant.id]?.message && (
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
                                  )}
                                  <div className="row">
                                    <button
                                      className="btn"
                                      type="button"
                                      onClick={() => handleSaveFundraising(participant)}
                                    >
                                      {participant.tripTeamMemberId ? "Save link & goal" : "Save Neon link"}
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
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          {canViewTeamDashboard && participant.rosterOnly && participant.tripTeamMemberId ? (
                            <div className="small" style={{ marginTop: 12, color: "var(--muted)" }}>
                              No login yet — link is stored on the roster. When they join with this email, it
                              shows on their profile unless you save a different link under their account.
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              </CollapsibleSection>
    
            </div>
  );
}
