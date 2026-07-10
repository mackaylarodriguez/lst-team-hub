import { useTripPage } from "./TripPageContext";
import { AppStatusMessage, LEADER_PREVIEW_PARTICIPANT_ID } from "./tripPageShared";

export default function TripOverviewHeader() {
  const {
    announcementDraft,
    announcementStatus,
    announcementTextareaRef,
    announcements,
    announcementsLoadError,
    canManageTrips,
    canViewTeamDashboard,
    countdownSummary,
    editingAnnouncementId,
    formatNoteTimestamp,
    handleAnnouncementFormatBold,
    handleAnnouncementFormatBullet,
    handleAnnouncementFormatHighlight,
    handleAnnouncementFormatNumbered,
    handleAnnouncementIndent,
    handleAnnouncementKeyDown,
    handleAnnouncementOutdent,
    handleCancelAnnouncementEdit,
    handleDeleteAnnouncement,
    handleSaveAnnouncement,
    handleStartAnnouncement,
    isEditingAnnouncement,
    isPreviewingParticipant,
    isStaffPreviewingLeader,
    openDeleteTripConfirm,
    pct,
    previewParticipantId,
    renderAnnouncementMessage,
    setAnnouncementDraft,
    setPreviewParticipantId,
    trip,
    workerPreviewOptions,
  } = useTripPage();

  if (!trip) return null;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="tripDetailHero card pad tripDetailHeroCompact">
        <div className="row tripPageHeader tripDetailHeroTop">
          <div className="tripPageHeaderTitle">
            <div className="tripDetailHeroHeading">
              <h1 className="tripDetailHeroTitle">{trip.name}</h1>
              <span className="tripDetailHeroMeta">
                {trip.location} • {trip.dates}
              </span>
            </div>
          </div>
          <div className="spacer" />
          {canManageTrips ? (
            <div className="row tripPageHeaderActions" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                className="btn btnDanger tripDetailHeroActionBtn"
                type="button"
                onClick={openDeleteTripConfirm}
              >
                Delete Trip
              </button>
              <select
                className="input tripPagePreviewSelect tripDetailHeroPreviewSelect"
                value={previewParticipantId}
                onChange={(event) => setPreviewParticipantId(event.target.value)}
              >
                <option value="">Staff view (full)</option>
                <option value={LEADER_PREVIEW_PARTICIPANT_ID}>Leader view (preview)</option>
                {workerPreviewOptions.length > 0 ? (
                  <optgroup label="Worker view — choose roster member">
                    {workerPreviewOptions.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
              {isStaffPreviewingLeader ? <span className="badge">Previewing leader view</span> : null}
              {isPreviewingParticipant ? <span className="badge">Previewing worker view</span> : null}
            </div>
          ) : null}
        </div>

        <div className="tripDetailProgressRow tripDetailProgressRowCompact">
          <div className="tripDetailProgressBlock tripDetailProgressBlockCompact">
            <div className="tripDetailProgressInline">
              <span className="tripDetailProgressLabel">Trip completion</span>
              <span className="tripDetailProgressPct">{pct}%</span>
            </div>
            <div className="progress tripDetailProgressBar">
              <div style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="tripDetailMiniCard tripDetailMiniCardCompact">
            <div className="tripDetailMiniValue">{countdownSummary.label}</div>
            {countdownSummary.detail ? (
              <div className="small tripDetailMiniDetail">{countdownSummary.detail}</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="tripOverviewHighlights">
        <div
          className="card pad"
          style={{
            background: "linear-gradient(180deg, rgba(234,242,255,.95), #ffffff 42%)",
            borderColor: "rgba(47,73,147,.22)",
            position: "relative",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "0 auto 0 0",
              width: 6,
              background: "linear-gradient(180deg, var(--primary), var(--primary2))",
            }}
          />
          <div className="row" style={{ marginBottom: 10, paddingLeft: 6 }}>
            <div>
              <div style={{ fontWeight: 900 }}>Announcements</div>
              <div className="small">Staff updates for this trip.</div>
            </div>
            <div className="spacer" />
            {canViewTeamDashboard && !isEditingAnnouncement ? (
              <button className="btn" type="button" onClick={() => handleStartAnnouncement()}>
                Add Announcement
              </button>
            ) : null}
          </div>
          {isEditingAnnouncement ? (
            <div style={{ paddingLeft: 6 }}>
              <div className="row" style={{ gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <button className="btn" type="button" onClick={handleAnnouncementFormatBold}>
                  Bold
                </button>
                <button className="btn" type="button" onClick={handleAnnouncementFormatHighlight}>
                  Highlight
                </button>
                <button className="btn" type="button" onClick={handleAnnouncementFormatBullet}>
                  Bullet list
                </button>
                <button className="btn" type="button" onClick={handleAnnouncementFormatNumbered}>
                  Numbered list
                </button>
                <button className="btn" type="button" onClick={handleAnnouncementIndent}>
                  Indent
                </button>
                <button className="btn" type="button" onClick={handleAnnouncementOutdent}>
                  Outdent
                </button>
              </div>
              <textarea
                ref={announcementTextareaRef}
                className="input"
                rows={3}
                value={announcementDraft}
                onChange={(event) => setAnnouncementDraft(event.target.value)}
                onKeyDown={handleAnnouncementKeyDown}
                placeholder="Share an update the team should see."
                style={{ tabSize: 4 }}
              />
              <div className="small" style={{ marginTop: 6, opacity: 0.8 }}>
                Tip: press Tab to indent and Shift+Tab to outdent selected lines.
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn btnPrimary" type="button" onClick={handleSaveAnnouncement}>
                  Save Announcement
                </button>
                <button className="btn" type="button" onClick={handleCancelAnnouncementEdit}>
                  Cancel
                </button>
                {editingAnnouncementId ? (
                  <button className="btn" type="button" onClick={handleDeleteAnnouncement}>
                    Delete
                  </button>
                ) : null}
                <AppStatusMessage
                  message={announcementStatus}
                  tone={
                    announcementStatus === "Saved."
                      ? "success"
                      : announcementStatus === "Saving..."
                        ? "info"
                        : "danger"
                  }
                  compact
                />
              </div>
            </div>
          ) : announcements.length > 0 ? (
            <div style={{ display: "grid", gap: 12, paddingLeft: 6 }}>
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "#ffffff",
                    border: "1px solid rgba(47,73,147,.12)",
                    boxShadow: "0 10px 20px rgba(47,73,147,.06)",
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {renderAnnouncementMessage(announcement.message)}
                  </div>
                  <div className="small" style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>
                      <strong>By:</strong> {announcement.authorName || announcement.authorEmail || "Unknown user"}
                    </span>
                    {announcement.updatedAt ? (
                      <span>
                        <strong>Updated:</strong> {formatNoteTimestamp(announcement.updatedAt)}
                      </span>
                    ) : null}
                  </div>
                  {canViewTeamDashboard ? (
                    <div className="row" style={{ marginTop: 10 }}>
                      <button className="btn" type="button" onClick={() => handleStartAnnouncement(announcement)}>
                        Edit
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="small" style={{ paddingLeft: 6 }}>
              {announcementsLoadError
                ? `Unable to load announcements: ${announcementsLoadError}`
                : "Updates from staff about this trip will appear here."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
