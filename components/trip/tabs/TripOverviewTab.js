import { useTripPage } from "../TripPageContext";
import { deleteTripMeeting } from "@/lib/tripMeetings";
import { toDatetimeLocalValue } from "../tripPageShared";
import {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
  AppDetailAction,
  TrainingResourceLink,
  OptionalTripWideDocumentCard,
} from "../tripPageShared";

export default function TripOverviewTab() {
    const {
    canManageTripMeetings,
    canViewTeamDashboard,
    completedCount,
    completionPct,
    editingMeetingId,
    editingOverviewNoteId,
    formatMeetingDateTime,
    formatMoney,
    formatNoteTimestamp,
    formatRecentActivityTimestamp,
    formatSingleDate,
    fundraisingGoalAmount,
    handleCancelOverviewNoteEdit,
    handleDeleteOverviewNote,
    handleJumpToOverviewItem,
    handleJumpToStaffTask,
    handleSaveOverviewNote,
    handleSaveTripMeeting,
    handleStartOverviewNote,
    isEditingOverviewNote,
    isTeamFundraisingMode,
    meetingAddFormOpen,
    meetingDraft,
    meetingStatus,
    overviewFundraisingDetail,
    overviewFundraisingLabel,
    overviewFundraisingValue,
    overviewNoteDraft,
    overviewNoteStatus,
    overviewNotes,
    overviewTaskLabel,
    overviewTaskPct,
    overviewTrainingLabel,
    overviewTrainingPct,
    overviewUpcomingTasks,
    participantDocumentsTabLabel,
    recentActivity,
    recentActivityError,
    referenceReceivedProgress,
    renderTripSetupCard,
    savedFundraisingLinksCount,
    session,
    setEditingMeetingId,
    setMeetingAddFormOpen,
    setMeetingDraft,
    setMeetingStatus,
    setOverviewNoteDraft,
    setTab,
    setTripMeetings,
    staffViewAllParticipants,
    tab,
    totalCount,
    trip,
    tripDocumentsTabLabel,
    tripMeetingsLoadError,
    workerOverviewFundraisingUrl,
  } = useTripPage();

  return (
    <div style={{ display: "grid", gap: 16 }}>
              <CollapsibleSection defaultOpen>
              <div className="cardSectionPill" style={{ marginBottom: 8 }}>
                Progress at a glance
              </div>
              <div
                className="tripOverviewStatsGrid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                <AppMetricCard
                  label={overviewTaskLabel}
                  value={`${overviewTaskPct}%`}
                  detail={
                    canViewTeamDashboard
                      ? "Combined completion across all participant task lists."
                      : "Your task completion progress for this trip."
                  }
                  tone={overviewTaskPct >= 80 ? "success" : overviewTaskPct >= 50 ? "info" : "warning"}
                />
    
                {staffViewAllParticipants && (
                  <AppMetricCard
                    label="Staff Tasks"
                    value={`${completionPct}%`}
                    detail={`${completedCount} of ${totalCount} staff tasks marked complete.`}
                    tone={completionPct >= 80 ? "success" : completionPct >= 50 ? "info" : "warning"}
                  />
                )}
    
                <AppMetricCard
                  label={overviewTrainingLabel}
                  value={`${overviewTrainingPct}%`}
                  detail={
                    canViewTeamDashboard
                      ? "Combined completion across all participant training checklists."
                      : "Your training completion progress for this trip."
                  }
                  tone={overviewTrainingPct >= 80 ? "success" : overviewTrainingPct >= 50 ? "info" : "warning"}
                />
    
                {!canViewTeamDashboard ? (
                  <div className="card pad" style={{ borderRadius: 16 }}>
                    <div className="small" style={{ marginBottom: 14 }}>{overviewFundraisingLabel}</div>
                    {fundraisingGoalAmount ? (
                      <div style={{ fontSize: 28, fontWeight: 900 }}>{formatMoney(fundraisingGoalAmount)}</div>
                    ) : (
                      <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>No Link</div>
                    )}
                    {workerOverviewFundraisingUrl ? (
                      <div style={{ marginTop: fundraisingGoalAmount ? 18 : 16 }}>
                        <a
                          className="btn btnPrimary"
                          href={workerOverviewFundraisingUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ padding: "10px 16px", fontSize: 14, alignSelf: "flex-start" }}
                        >
                          {isTeamFundraisingMode || trip?.teamFundraisingUrl
                            ? "Open shared Neon page"
                            : "Open Neon Page"}
                        </a>
                      </div>
                    ) : null}
                    <div className="small" style={{ marginTop: 12 }}>{overviewFundraisingDetail}</div>
                  </div>
                ) : (
                  <AppMetricCard
                    label={overviewFundraisingLabel}
                    value={overviewFundraisingValue}
                    detail={overviewFundraisingDetail}
                    tone={savedFundraisingLinksCount > 0 || trip?.teamFundraisingUrl ? "success" : "warning"}
                  />
                )}
    
                {(staffViewAllParticipants || !canViewTeamDashboard) &&
                referenceReceivedProgress.showOnOverview ? (
                  <AppMetricCard
                    label={referenceReceivedProgress.label}
                    value={`${referenceReceivedProgress.percent}%`}
                    detail={
                      canViewTeamDashboard
                        ? `${referenceReceivedProgress.completed} of ${referenceReceivedProgress.total} received.`
                        : "Your LST reference has been received."
                    }
                    tone={referenceReceivedProgress.percent === 100 ? "success" : "info"}
                  />
                ) : null}
              </div>
              </CollapsibleSection>
    
              <div
                className="tripOverviewMeetingsNotesTasksRow"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
                  gap: 16,
                  alignItems: "start",
                }}
              >
              <CollapsibleSection defaultOpen style={{ minWidth: 0 }}>
                <div
                  className="card pad"
                  style={{ border: "1px solid rgba(47,73,147,.12)", minWidth: 0 }}
                >
                  <div className="cardSectionPill" style={{ marginBottom: 8 }}>Meetings</div>
                  <div className="small" style={{ marginBottom: 12, color: "var(--muted)" }}>
                    {canManageTripMeetings
                      ? "Upcoming and past meetings. Use Add meeting to schedule. After-meeting notes are only visible to staff and trip leaders."
                      : "Upcoming and past meetings for your team (date and time only)."}
                  </div>
                  {tripMeetingsLoadError ? (
                    <div className="small" style={{ marginBottom: 12, color: "var(--danger)" }}>
                      {tripMeetingsLoadError} If this persists, contact your trip coordinator.
                    </div>
                  ) : null}
                  {canManageTripMeetings && !meetingAddFormOpen && !editingMeetingId ? (
                    <div style={{ marginBottom: 14 }}>
                      <button
                        type="button"
                        className="btn btnPrimary"
                        onClick={() => {
                          setMeetingAddFormOpen(true);
                          setEditingMeetingId("");
                          setMeetingDraft({ title: "", scheduledAt: "", notesAfter: "" });
                          setMeetingStatus("");
                        }}
                      >
                        Add meeting
                      </button>
                    </div>
                  ) : null}
                  {canManageTripMeetings && (meetingAddFormOpen || editingMeetingId) ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                        marginBottom: 16,
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "#fafafa",
                      }}
                    >
                      <input
                        className="input"
                        placeholder="Title (optional)"
                        value={meetingDraft.title}
                        onChange={(e) => setMeetingDraft((d) => ({ ...d, title: e.target.value }))}
                      />
                      <input
                        className="input"
                        type="datetime-local"
                        value={meetingDraft.scheduledAt}
                        onChange={(e) => setMeetingDraft((d) => ({ ...d, scheduledAt: e.target.value }))}
                      />
                      <textarea
                        className="input"
                        rows={2}
                        placeholder="Notes after the meeting"
                        value={meetingDraft.notesAfter}
                        onChange={(e) => setMeetingDraft((d) => ({ ...d, notesAfter: e.target.value }))}
                      />
                      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <button type="button" className="btn btnPrimary" onClick={() => void handleSaveTripMeeting()}>
                          {editingMeetingId ? "Update meeting" : "Save meeting"}
                        </button>
                        {editingMeetingId ? (
                          <button
                            type="button"
                            className="btn"
                            onClick={() => {
                              setEditingMeetingId("");
                              setMeetingAddFormOpen(false);
                              setMeetingDraft({ title: "", scheduledAt: "", notesAfter: "" });
                              setMeetingStatus("");
                            }}
                          >
                            Cancel edit
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn"
                            onClick={() => {
                              setMeetingAddFormOpen(false);
                              setMeetingDraft({ title: "", scheduledAt: "", notesAfter: "" });
                              setMeetingStatus("");
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                      <AppStatusMessage
                        message={meetingStatus}
                        tone={
                          meetingStatus === "Saved."
                            ? "success"
                            : meetingStatus === "Saving..."
                              ? "info"
                              : "danger"
                        }
                        compact
                      />
                    </div>
                  ) : null}
                  <div style={{ marginBottom: 12 }}>
                    <div
                      className="small"
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        lineHeight: 1.45,
                        marginBottom: 6,
                        color: "var(--foreground)",
                      }}
                    >
                      Upcoming
                    </div>
                    {upcomingMeetings.length ? (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {upcomingMeetings.map((m) => (
                          <li key={m.id} style={{ marginBottom: 10 }}>
                            <div
                              className="small"
                              style={{
                                fontWeight: 600,
                                fontSize: 13,
                                lineHeight: 1.45,
                                color: "var(--foreground)",
                              }}
                            >
                              {m.title || "Meeting"}
                            </div>
                            <div className="small" style={{ fontSize: 13, lineHeight: 1.45 }}>
                              {formatMeetingDateTime(m.scheduledAt)}
                            </div>
                            {m.isTrainingSession ? (
                              <div className="small" style={{ marginTop: 4, color: "var(--muted)", fontSize: 12, lineHeight: 1.45 }}>
                                Training session (date is set on the Training tab).
                              </div>
                            ) : null}
                            {canManageTripMeetings && !m.isTrainingSession ? (
                              <div className="row" style={{ gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="btn"
                                  onClick={() => {
                                    setMeetingAddFormOpen(true);
                                    setEditingMeetingId(m.id);
                                    setMeetingDraft({
                                      title: m.title,
                                      scheduledAt: toDatetimeLocalValue(m.scheduledAt),
                                      notesAfter: m.notesAfter || "",
                                    });
                                    setMeetingStatus("");
                                  }}
                                >
                                  Edit
                                </button>
                                {staffViewAllParticipants ? (
                                  <button
                                    type="button"
                                    className="btn"
                                    onClick={() => {
                                      if (typeof window !== "undefined" && !window.confirm("Remove this meeting?")) return;
                                      void deleteTripMeeting(m.id).then(() =>
                                        setTripMeetings((prev) => prev.filter((x) => x.id !== m.id))
                                      );
                                    }}
                                  >
                                    Delete
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <AppEmptyState
                        compact
                        title="No upcoming meetings"
                        description="Add the next team meeting so workers can see when the team meets next."
                      />
                    )}
                  </div>
                  <div>
                    <div
                      className="small"
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        lineHeight: 1.45,
                        marginBottom: 6,
                        color: "var(--foreground)",
                      }}
                    >
                      Past
                    </div>
                    {pastMeetings.length ? (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {pastMeetings.map((m) => (
                          <li key={m.id} style={{ marginBottom: 10 }}>
                            <div
                              className="small"
                              style={{
                                fontWeight: 600,
                                fontSize: 13,
                                lineHeight: 1.45,
                                color: "var(--foreground)",
                              }}
                            >
                              {m.title || "Meeting"}
                            </div>
                            <div className="small" style={{ fontSize: 13, lineHeight: 1.45 }}>
                              {formatMeetingDateTime(m.scheduledAt)}
                            </div>
                            {m.isTrainingSession ? (
                              <div className="small" style={{ marginTop: 4, color: "var(--muted)", fontSize: 12, lineHeight: 1.45 }}>
                                Training session (date is set on the Training tab).
                              </div>
                            ) : null}
                            {canManageTripMeetings && !m.isTrainingSession ? (
                              m.notesAfter ? (
                                <div
                                  className="small"
                                  style={{ marginTop: 4, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.45 }}
                                >
                                  {m.notesAfter}
                                </div>
                              ) : (
                                <div
                                  className="small"
                                  style={{ marginTop: 4, color: "var(--muted)", fontSize: 13, lineHeight: 1.45 }}
                                >
                                  No notes yet.
                                </div>
                              )
                            ) : null}
                            {canManageTripMeetings && !m.isTrainingSession ? (
                              <div className="row" style={{ gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="btn"
                                  onClick={() => {
                                    setMeetingAddFormOpen(true);
                                    setEditingMeetingId(m.id);
                                    setMeetingDraft({
                                      title: m.title,
                                      scheduledAt: toDatetimeLocalValue(m.scheduledAt),
                                      notesAfter: m.notesAfter || "",
                                    });
                                    setMeetingStatus("");
                                  }}
                                >
                                  Edit
                                </button>
                                {staffViewAllParticipants ? (
                                  <button
                                    type="button"
                                    className="btn"
                                    onClick={() => {
                                      if (typeof window !== "undefined" && !window.confirm("Remove this meeting?")) return;
                                      void deleteTripMeeting(m.id).then(() =>
                                        setTripMeetings((prev) => prev.filter((x) => x.id !== m.id))
                                      );
                                    }}
                                  >
                                    Delete
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <AppEmptyState
                        compact
                        title="No past meetings"
                        description="Past meetings and after-meeting notes will collect here once a meeting date has passed."
                      />
                    )}
                  </div>
                </div>
              </CollapsibleSection>
    
                {staffViewAllParticipants ? (
                  <CollapsibleSection defaultOpen style={{ minWidth: 0 }}>
                  <div className="card pad" style={{ minWidth: 0 }}>
                    <div className="cardSectionPill" style={{ marginBottom: 8 }}>Trip notes</div>
                    <div className="small" style={{ marginBottom: 6, opacity: 0.88 }}>
                      Internal context for staff and leaders.
                    </div>
                    <div className="small" style={{ marginBottom: 10 }}>
                      Put obvious context here, like why the trip was archived or major team changes.
                    </div>
                    {!isEditingOverviewNote ? (
                      <button className="btn" type="button" onClick={handleStartOverviewNote}>
                        Add Note
                      </button>
                    ) : null}
                    {isEditingOverviewNote ? (
                      <>
                        <textarea
                          className="input"
                          rows={4}
                          value={overviewNoteDraft}
                          onChange={(event) => setOverviewNoteDraft(event.target.value)}
                          placeholder="Example: Archived because multiple workers dropped from the team."
                        />
                        <div className="row" style={{ marginTop: 10 }}>
                          <button
                            className="btn btnPrimary"
                            type="button"
                            onClick={handleSaveOverviewNote}
                          >
                            Save Note
                          </button>
                          <button className="btn" type="button" onClick={handleCancelOverviewNoteEdit}>
                            Cancel
                          </button>
                          {editingOverviewNoteId ? (
                            <button className="btn" type="button" onClick={handleDeleteOverviewNote}>
                              Delete
                            </button>
                          ) : null}
                          <AppStatusMessage
                            message={overviewNoteStatus}
                            tone={
                              overviewNoteStatus === "Saved." || overviewNoteStatus === "Deleted."
                                ? "success"
                                : overviewNoteStatus === "Saving..." || overviewNoteStatus === "Deleting..."
                                  ? "info"
                                  : "danger"
                            }
                            compact
                          />
                        </div>
                      </>
                    ) : null}
                    <div style={{ display: "grid", gap: 12, marginTop: isEditingOverviewNote ? 14 : 12 }}>
                      {overviewNotes.map((note) => (
                        <div
                          key={note.id}
                          style={{
                            padding: "12px 14px",
                            borderRadius: 14,
                            background: "#f5f1ea",
                            border: "1px solid rgba(18, 16, 12, 0.08)",
                          }}
                        >
                          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{note.note}</div>
                          <div
                            className="small"
                            style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}
                          >
                            <span>
                              <strong>By:</strong>{" "}
                              {note.authorName || note.authorEmail || "Unknown user"}
                            </span>
                            {note.updatedAt ? (
                              <span>
                                <strong>Updated:</strong> {formatNoteTimestamp(note.updatedAt)}
                              </span>
                            ) : null}
                          </div>
                          <div className="row" style={{ marginTop: 10 }}>
                            <button
                              className="btn"
                              type="button"
                              onClick={() => handleStartOverviewNote(note)}
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ))}
                      {!overviewNotes.length && !isEditingOverviewNote ? (
                        <AppEmptyState
                          title="No notes yet"
                          description="Use trip notes for context that leaders and staff should see later."
                        />
                      ) : null}
                    </div>
                  </div>
                </CollapsibleSection>
                ) : null}
    
              <CollapsibleSection defaultOpen style={{ minWidth: 0 }}>
                <div className="card pad" style={{ minWidth: 0 }}>
                  <div className="cardSectionPill">
                    {staffViewAllParticipants ? "My upcoming staff tasks" : "My upcoming tasks"}
                  </div>
                  <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
                    Shortcuts to the next due items.
                  </div>
                  {overviewUpcomingTasks.length > 0 ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {overviewUpcomingTasks.map((task) => {
                        return (
                        <div key={task.id} className="overviewUpcomingTaskRow">
                          {canViewTeamDashboard ? (
                            <button
                              type="button"
                              onClick={() => handleJumpToStaffTask(task.id)}
                              className="overviewTaskJumpButton"
                            >
                              {task.title}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleJumpToOverviewItem(task)}
                              className="overviewTaskJumpButton"
                            >
                              {task.title}
                            </button>
                          )}
                          <div className="small">
                            {task.dueDate
                              ? `Due ${formatSingleDate(task.dueDate)}`
                              : "Due when ready"}
                          </div>
                          {task.link || task.openTripDocumentsTab ? (
                            <AppDetailAction
                              href={task.openTripDocumentsTab || task.openDocumentsTab ? undefined : task.link}
                              onClick={
                                task.openTripDocumentsTab
                                  ? () => setTab(tripDocumentsTabLabel)
                                  : task.openDocumentsTab
                                    ? () => setTab(participantDocumentsTabLabel)
                                    : undefined
                              }
                              compact
                            >
                              View details
                            </AppDetailAction>
                          ) : null}
                          {task.details && !task.link ? (
                            <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>{task.details}</div>
                          ) : null}
                        </div>
                      );
                      })}
                    </div>
                  ) : (
                    <AppEmptyState
                      title="Nothing urgent right now"
                      description={
                        canViewTeamDashboard
                          ? "No upcoming staff tasks are assigned to you right now."
                          : "No upcoming worker tasks are assigned to you right now."
                      }
                    />
                  )}
                </div>
                </CollapsibleSection>
    
              </div>
    
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {staffViewAllParticipants ? (
                  <CollapsibleSection defaultOpen style={{ gridColumn: "1 / -1" }}>
                    {renderTripSetupCard()}
                  </CollapsibleSection>
                ) : null}
    
                {canViewTeamDashboard ? (
                  <CollapsibleSection defaultOpen style={{ gridColumn: "1 / -1" }}>
                  <div className="card pad">
                    <div className="cardSectionPill">Recent activity</div>
                    <div className="small" style={{ marginBottom: 10, opacity: 0.88 }}>
                      Latest updates on this trip.
                    </div>
                    <div className="row" style={{ marginBottom: 10 }}>
                      <div className="spacer" />
                      <Link href={`/trips/${encodeURIComponent(trip.id)}/activity`} className="small">
                        See more
                      </Link>
                    </div>
                    {recentActivityError ? (
                      <div className="small" style={{ color: "var(--danger)" }}>
                        {recentActivityError}
                      </div>
                    ) : recentActivity.length > 0 ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        {recentActivity.map((entry) => (
                          <div
                            key={entry.id}
                            style={{ paddingBottom: 10, borderBottom: "1px solid var(--border)" }}
                          >
                            <div style={{ lineHeight: 1.4 }}>{entry.message}</div>
                            <div className="small" style={{ marginTop: 4 }}>
                              {formatRecentActivityTimestamp(entry.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <AppEmptyState
                        title="No recent activity yet"
                        description="Trip updates, edits, and workflow activity will start showing here once the team is active."
                      />
                    )}
                  </div>
                  </CollapsibleSection>
                ) : null}
              </div>
              </div>
  );
}
