import Link from "next/link";
import { useTripPage } from "../TripPageContext";
import AppDueDateTripleSelect from "@/components/AppDueDateTripleSelect";
import RosterTshirtSizeSelect from "@/components/RosterTshirtSizeSelect";
import { formatPhoneNumber, toPhoneHref } from "@/lib/phone";
import {
  TEAM_MEMBER_ROLE_OPTIONS,
  normalizeLegacyTeamRole,
  getWorkerConnectionStatus,
} from "../tripPageShared";
import {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
  AppDetailAction,
  TrainingResourceLink,
  OptionalTripWideDocumentCard,
} from "../tripPageShared";

export default function TripTeamTab() {
    const {
    canEditRosterTshirtInline,
    canEditTripReferenceEmails,
    canViewTeamDashboard,
    canViewTripReferenceSection,
    formatTripDateRange,
    getReferenceStatus,
    handleAddRosterMember,
    handleAddWorkerToTrip,
    handleCancelAddWorker,
    handleCancelRosterEdit,
    handleInlineRosterTshirtChange,
    handleRemoveRosterMember,
    handleSaveRoster,
    handleStartAddWorker,
    handleStartRosterEdit,
    inlineTshirtSavingKey,
    isAddingWorker,
    isEditingRoster,
    newWorkerDraft,
    referenceSaveStatusByKey,
    referenceTableRows,
    retryReferenceSave,
    rosterDraft,
    rosterStatus,
    setNewWorkerDraft,
    setRosterDraft,
    staffViewAllParticipants,
    teamTabMembers,
    toDateInputValue,
    toggleReferenceEmail,
    trip,
    updateNewWorkerDraft,
    updateReferenceField,
    updateReferenceSentDate,
    updateRosterDraftMember,
    workerAddStatus,
  } = useTripPage();

  return (
    <div style={{ display: "grid", gap: 16 }}>
              <CollapsibleSection defaultOpen>
              <div className="card pad">
                <div className="row" style={{ marginBottom: 8, alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div className="cardSectionPill" style={{ marginBottom: 0, flexShrink: 0 }}>Roster</div>
                  <div className="spacer" />
                  {workerAddStatus ? (
                    <div className="small" style={{ alignSelf: "center", marginRight: 8 }}>
                      {workerAddStatus}
                    </div>
                  ) : null}
                  {rosterStatus ? (
                    <div className="small" style={{ alignSelf: "center", marginRight: 8 }}>
                      {rosterStatus}
                    </div>
                  ) : null}
                  {staffViewAllParticipants && !isEditingRoster && !isAddingWorker ? (
                    <>
                      <button className="btn" type="button" onClick={handleStartAddWorker}>
                        Add Worker
                      </button>
                      <button className="btn" type="button" onClick={handleStartRosterEdit}>
                        Edit Roster
                      </button>
                    </>
                  ) : null}
                </div>
                {!staffViewAllParticipants ? (
                  <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
                    Everyone on the team can see this roster, including names, emails, and cell numbers when saved. Use the T-shirt column to set your own size. Contact your leader or staff for other roster changes.
                  </div>
                ) : null}
    
                {staffViewAllParticipants && isAddingWorker ? (
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      padding: 12,
                      marginBottom: 12,
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                      background: "#fff",
                    }}
                  >
                    <div className="small">
                      Add a worker to this team with name and email. You can leave them unassigned or assign them to this trip now.
                    </div>
                    <div
                      className="tripMobileFormGrid"
                      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}
                    >
                      <input
                        className="input"
                        value={newWorkerDraft.firstName}
                        onChange={(event) => updateNewWorkerDraft("firstName", event.target.value)}
                        placeholder="First name"
                      />
                      <input
                        className="input"
                        value={newWorkerDraft.lastName}
                        onChange={(event) => updateNewWorkerDraft("lastName", event.target.value)}
                        placeholder="Last name"
                      />
                      <input
                        className="input"
                        type="email"
                        value={newWorkerDraft.email}
                        onChange={(event) => updateNewWorkerDraft("email", event.target.value)}
                        placeholder="worker@email.com"
                      />
                      <input
                        className="input"
                        type="tel"
                        value={newWorkerDraft.cellPhone}
                        onChange={(event) => updateNewWorkerDraft("cellPhone", event.target.value)}
                        onBlur={(event) =>
                          updateNewWorkerDraft("cellPhone", formatPhoneNumber(event.target.value))
                        }
                        placeholder="Cell phone (optional)"
                      />
                      <select
                        className="input"
                        value={newWorkerDraft.teamRole}
                        onChange={(event) => {
                          const v = event.target.value;
                          setNewWorkerDraft((current) => ({
                            ...current,
                            teamRole: v,
                            travelsWithTeam:
                              String(v).trim().toLowerCase() === "leader"
                                ? current.travelsWithTeam !== false
                                : true,
                          }));
                        }}
                      >
                        {TEAM_MEMBER_ROLE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      {String(newWorkerDraft.teamRole || "").trim().toLowerCase() === "leader" ? (
                        <label className="row" style={{ gap: 8, alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={newWorkerDraft.travelsWithTeam !== false}
                            onChange={(event) => updateNewWorkerDraft("travelsWithTeam", event.target.checked)}
                          />
                          <span className="small">Traveling with team</span>
                        </label>
                      ) : null}
                      <select
                        className="input"
                        value={newWorkerDraft.assignmentMode}
                        onChange={(event) => updateNewWorkerDraft("assignmentMode", event.target.value)}
                      >
                        <option value="unassigned">Leave Unassigned</option>
                        <option value="assigned">Assign To This Trip</option>
                      </select>
                    </div>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <button className="btn btnPrimary" type="button" onClick={handleAddWorkerToTrip}>
                        Save Worker
                      </button>
                      <button className="btn" type="button" onClick={handleCancelAddWorker}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
    
                {staffViewAllParticipants && isEditingRoster ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    {rosterDraft.map((member, index) => (
                      <div
                        key={member.id || `draft-${index}`}
                        className="tripMobileFormGrid"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                          gap: 10,
                          padding: 12,
                          borderRadius: 14,
                          border: "1px solid var(--border)",
                          background: "#fff",
                        }}
                      >
                        <input
                          className="input"
                          value={member.firstName || ""}
                          placeholder="First name"
                          onChange={(event) => updateRosterDraftMember(index, "firstName", event.target.value)}
                        />
                        <input
                          className="input"
                          value={member.lastName || ""}
                          placeholder="Last name"
                          onChange={(event) => updateRosterDraftMember(index, "lastName", event.target.value)}
                        />
                        <input
                          className="input"
                          type="email"
                          value={member.email || ""}
                          placeholder="Email"
                          onChange={(event) => updateRosterDraftMember(index, "email", event.target.value)}
                        />
                        <input
                          className="input"
                          type="tel"
                          value={member.cellPhone || ""}
                          placeholder="Cell phone"
                          onChange={(event) => updateRosterDraftMember(index, "cellPhone", event.target.value)}
                          onBlur={(event) =>
                            updateRosterDraftMember(index, "cellPhone", formatPhoneNumber(event.target.value))
                          }
                        />
                        <select
                          className="input"
                          value={normalizeLegacyTeamRole(member.teamRole || "Worker")}
                          onChange={(event) => {
                            const v = event.target.value;
                            setRosterDraft((current) =>
                              current.map((row, memberIndex) =>
                                memberIndex === index
                                  ? {
                                      ...row,
                                      teamRole: v,
                                      travelsWithTeam:
                                        String(v).trim().toLowerCase() === "leader"
                                          ? row.travelsWithTeam !== false
                                          : true,
                                    }
                                  : row
                              )
                            );
                          }}
                        >
                          {TEAM_MEMBER_ROLE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        {String(normalizeLegacyTeamRole(member.teamRole || "")).trim().toLowerCase() ===
                        "leader" ? (
                          <label className="row" style={{ gap: 8, alignItems: "center", gridColumn: "1 / -1" }}>
                            <input
                              type="checkbox"
                              checked={member.travelsWithTeam !== false}
                              onChange={(event) =>
                                updateRosterDraftMember(index, "travelsWithTeam", event.target.checked)
                              }
                            />
                            <span className="small">Traveling with team</span>
                          </label>
                        ) : null}
                        <RosterTshirtSizeSelect
                          value={member.tshirtSize || ""}
                          onChange={(event) =>
                            updateRosterDraftMember(index, "tshirtSize", event.target.value)
                          }
                        />
                        <div className="tripRosterDatesRow">
                          <div className="tripRosterDateField">
                            <div className="small tripRosterDateLabel">Project leave date</div>
                            <AppDueDateTripleSelect
                              compact
                              value={member.startDate || ""}
                              onChange={(ymd) => updateRosterDraftMember(index, "startDate", ymd)}
                            />
                          </div>
                          <div className="tripRosterDateField">
                            <div className="small tripRosterDateLabel">Project return date</div>
                            <AppDueDateTripleSelect
                              compact
                              value={member.endDate || ""}
                              onChange={(ymd) => updateRosterDraftMember(index, "endDate", ymd)}
                            />
                          </div>
                        </div>
                        <button className="btn" type="button" onClick={() => handleRemoveRosterMember(index)}>
                          Remove
                        </button>
                      </div>
                    ))}
    
                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <button className="btn" type="button" onClick={handleAddRosterMember}>
                        Add Worker
                      </button>
                      <button className="btn btnPrimary" type="button" onClick={handleSaveRoster}>
                        Save Roster
                      </button>
                      <button className="btn" type="button" onClick={handleCancelRosterEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <table className="table dataTableStriped">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Traveling</th>
                        <th>T-shirt</th>
                        <th>Account</th>
                        <th>Email</th>
                        <th>Cell phone</th>
                        <th>Project Dates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamTabMembers.length > 0 ? (
                        teamTabMembers.map((member) => {
                          const connectionStatus = getWorkerConnectionStatus(member);
    
                          return (
                          <tr key={member.key}>
                            <td style={{ fontWeight: 800 }}>
                              {canViewTeamDashboard && member.profileId ? (
                                <Link href={`/profile?participantId=${encodeURIComponent(member.profileId)}`}>
                                  {member.name}
                                </Link>
                              ) : (
                                member.name
                              )}
                            </td>
                            <td>{normalizeLegacyTeamRole(member.teamRole || member.role || "Worker")}</td>
                            <td className="small">
                              {String(member.teamRole || member.role || "").trim().toLowerCase() === "leader"
                                ? member.travelsWithTeam === false
                                  ? "No"
                                  : "Yes"
                                : "—"}
                            </td>
                            <td style={{ minWidth: 108, maxWidth: 140, verticalAlign: "middle" }}>
                              {canEditRosterTshirtInline(member) ? (
                                <RosterTshirtSizeSelect
                                  aria-label={`T-shirt size for ${member.name || member.email || "member"}`}
                                  className="input"
                                  disabled={inlineTshirtSavingKey === member.key}
                                  value={member.tshirtSize || ""}
                                  onChange={(event) =>
                                    void handleInlineRosterTshirtChange(member, event.target.value)
                                  }
                                  style={{
                                    minHeight: 38,
                                    padding: "6px 8px",
                                    fontSize: 13,
                                    borderRadius: 10,
                                  }}
                                />
                              ) : (
                                <span className="small">{member.tshirtSize?.trim() || "—"}</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${connectionStatus.accountBadgeClass}`.trim()}>
                                {connectionStatus.accountLabel}
                              </span>
                            </td>
                            <td>
                              {String(member.email || "").trim() ? (
                                <a href={`mailto:${String(member.email).trim()}`}>{member.email}</a>
                              ) : (
                                "Not set"
                              )}
                            </td>
                            <td className="small">
                              {String(member.cellPhone || "").trim() ? (
                                <a href={`tel:${toPhoneHref(member.cellPhone)}`}>
                                  {formatPhoneNumber(member.cellPhone)}
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>{formatTripDateRange(member.startDate, member.endDate)}</td>
                          </tr>
                        )})
                      ) : (
                        <tr>
                          <td colSpan={8} className="small">
                            No workers added yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
              </CollapsibleSection>
    
              {canViewTripReferenceSection && (
                <CollapsibleSection defaultOpen>
                <div className="card pad tripSectionCard">
                  <div className="cardSectionPill" style={{ marginBottom: 10 }}>Reference emails</div>
                  {!canEditTripReferenceEmails ? (
                    <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
                      Team reference tracking (read-only). Ask staff to update rows.
                    </div>
                  ) : null}
                  <table className="table dataTableStriped">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Reference Contact</th>
                        <th>Reference Email Sent</th>
                        <th>Date Sent</th>
                        <th>Reference Email Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referenceTableRows.map((refRow) => {
                        const referenceStatus = getReferenceStatus(refRow.refKey);
                        const referenceSaveStatus = referenceSaveStatusByKey[refRow.refKey];
    
                        return (
                          <tr key={refRow.refKey}>
                            <td style={{ fontWeight: 800 }}>
                              <div>{refRow.displayName}</div>
                              {canEditTripReferenceEmails && referenceSaveStatus ? (
                                <div className="small" style={{ marginTop: 4 }}>
                                  {referenceSaveStatus.type === "error" ? (
                                    <span style={{ color: "var(--danger)" }}>
                                      {referenceSaveStatus.message}
                                    </span>
                                  ) : (
                                    <span style={{ color: "var(--muted)" }}>
                                      {referenceSaveStatus.message}
                                    </span>
                                  )}
                                  {referenceSaveStatus.type === "error" ? (
                                    <button
                                      className="btn"
                                      type="button"
                                      style={{ marginLeft: 8, padding: "2px 8px", fontSize: 12 }}
                                      onClick={() => retryReferenceSave(refRow.refKey)}
                                    >
                                      Retry
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </td>
                            <td style={{ minWidth: 260 }}>
                              {canEditTripReferenceEmails ? (
                                <div style={{ display: "grid", gap: 8 }}>
                                  <input
                                    className="input"
                                    value={referenceStatus.referenceName || ""}
                                    placeholder="Reference name"
                                    onChange={(e) =>
                                      updateReferenceField(
                                        refRow.refKey,
                                        "referenceName",
                                        e.target.value
                                      )
                                    }
                                  />
                                  <input
                                    className="input"
                                    type="email"
                                    value={referenceStatus.referenceEmail || ""}
                                    placeholder="Reference email"
                                    onChange={(e) =>
                                      updateReferenceField(
                                        refRow.refKey,
                                        "referenceEmail",
                                        e.target.value
                                      )
                                    }
                                  />
                                  <input
                                    className="input"
                                    type="tel"
                                    value={referenceStatus.referencePhone || ""}
                                    placeholder="Reference phone"
                                    onChange={(e) =>
                                      updateReferenceField(
                                        refRow.refKey,
                                        "referencePhone",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                              ) : (
                                <div className="small" style={{ display: "grid", gap: 6 }}>
                                  <div>
                                    <span style={{ color: "var(--muted)" }}>Reference name:</span>{" "}
                                    {String(referenceStatus.referenceName || "").trim() || "—"}
                                  </div>
                                  <div>
                                    <span style={{ color: "var(--muted)" }}>Email:</span>{" "}
                                    {String(referenceStatus.referenceEmail || "").trim() ? (
                                      <a
                                        href={`mailto:${String(referenceStatus.referenceEmail || "").trim()}`}
                                      >
                                        {String(referenceStatus.referenceEmail || "").trim()}
                                      </a>
                                    ) : (
                                      "—"
                                    )}
                                  </div>
                                  <div>
                                    <span style={{ color: "var(--muted)" }}>Phone:</span>{" "}
                                    {String(referenceStatus.referencePhone || "").trim() || "—"}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td>
                              {canEditTripReferenceEmails ? (
                                <label
                                  className="row"
                                  style={{ gap: 8, alignItems: "center", cursor: "pointer" }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={!!referenceStatus.sent}
                                    onChange={() => toggleReferenceEmail(refRow.refKey, "sent")}
                                  />
                                  <span className={"badge " + (referenceStatus.sent ? "badgeSuccess" : "")}>
                                    {referenceStatus.sent ? "Sent" : "Not sent"}
                                  </span>
                                </label>
                              ) : (
                                <span className={"badge " + (referenceStatus.sent ? "badgeSuccess" : "")}>
                                  {referenceStatus.sent ? "Sent" : "Not sent"}
                                </span>
                              )}
                            </td>
                            <td>
                              {canEditTripReferenceEmails ? (
                                <AppDueDateTripleSelect
                                  compact
                                  value={toDateInputValue(referenceStatus.sentDate || "")}
                                  onChange={(ymd) => updateReferenceSentDate(refRow.refKey, ymd)}
                                />
                              ) : (
                                <span className="small">{referenceStatus.sentDate?.trim() || "—"}</span>
                              )}
                            </td>
                            <td>
                              {canEditTripReferenceEmails ? (
                                <label
                                  className="row"
                                  style={{ gap: 8, alignItems: "center", cursor: "pointer" }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={!!referenceStatus.received}
                                    onChange={() =>
                                      toggleReferenceEmail(refRow.refKey, "received")
                                    }
                                  />
                                  <span
                                    className={
                                      "badge " + (referenceStatus.received ? "badgeSuccess" : "")
                                    }
                                  >
                                    {referenceStatus.received ? "Received" : "Not received"}
                                  </span>
                                </label>
                              ) : (
                                <span
                                  className={
                                    "badge " + (referenceStatus.received ? "badgeSuccess" : "")
                                  }
                                >
                                  {referenceStatus.received ? "Received" : "Not received"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </CollapsibleSection>
              )}
            </div>
  );
}
