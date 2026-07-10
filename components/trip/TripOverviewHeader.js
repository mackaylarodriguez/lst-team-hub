import { useTripPage } from "./TripPageContext";
import { AppStatusMessage } from "./tripPageShared";

/** Announcements block — Overview tab only (hero lives in TripDetailHeroBar). */
export default function TripOverviewHeader() {
  const {
    announcementDraft,
    announcementStatus,
    announcementTextareaRef,
    announcements,
    announcementsLoadError,
    canViewTeamDashboard,
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
    renderAnnouncementMessage,
    setAnnouncementDraft,
  } = useTripPage();

  return (
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
              <button className="btn" type="button" onClick={handleAnnouncementFormatBullet}>
                Bullet list
              </button>
              <button className="btn" type="button" onClick={handleAnnouncementFormatNumbered}>
                Numbered list
              </button>
              <button className="btn" type="button" onClick={handleAnnouncementFormatHighlight}>
                Highlight
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
  );
}
