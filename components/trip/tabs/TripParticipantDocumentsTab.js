import { useState } from "react";
import Link from "next/link";
import { useTripPage } from "../TripPageContext";
import {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
} from "../tripPageShared";

export default function TripParticipantDocumentsTab() {
  const [addUploadModalOpen, setAddUploadModalOpen] = useState(false);
  const [addUploadDraft, setAddUploadDraft] = useState("");

  const {
    canUploadOwnParticipantDocuments,
    canViewTeamDashboard,
    confirmingParticipantDocumentDeleteId,
    currentParticipant,
    handleAddParticipantDocumentType,
    handleDeleteParticipantDocument,
    handleRemoveParticipantDocumentType,
    handleUploadParticipantDocument,
    participantDocumentInputRefs,
    participantDocumentStatus,
    participantDocumentTypeStatus,
    participantDocumentsByUserId,
    participantDocumentsError,
    setConfirmingParticipantDocumentDeleteId,
    setParticipantDocumentTypeStatus,
    tripUserDocumentTypes,
    workerDocumentParticipants,
    formatNoteTimestamp,
  } = useTripPage();

  function openAddUploadModal() {
    setAddUploadDraft("");
    setParticipantDocumentTypeStatus("");
    setAddUploadModalOpen(true);
  }

  function closeAddUploadModal() {
    setAddUploadModalOpen(false);
    setAddUploadDraft("");
  }

  async function submitAddUpload() {
    const saved = await handleAddParticipantDocumentType(addUploadDraft);
    if (saved) {
      closeAddUploadModal();
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <CollapsibleSection defaultOpen>
        <div className="card pad">
          <div
            className="row mobileSectionHeader"
            style={{
              marginBottom: canViewTeamDashboard && tripUserDocumentTypes.length > 0 ? 8 : 0,
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <div className="cardSectionPill" style={{ marginBottom: 0 }}>
              {canViewTeamDashboard ? "Worker uploads" : "My documents"}
            </div>
            {canViewTeamDashboard ? (
              <button className="btn btnPrimary" type="button" onClick={openAddUploadModal}>
                Add Upload
              </button>
            ) : null}
          </div>
          {canViewTeamDashboard && tripUserDocumentTypes.length > 0 ? (
            <div
              className="row"
              style={{ gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}
            >
              <span className="small" style={{ fontWeight: 700 }}>
                Upload requirements:
              </span>
              {tripUserDocumentTypes.map((uploadType) => (
                <div
                  key={uploadType.key}
                  className="row"
                  style={{
                    gap: 6,
                    alignItems: "center",
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(15, 23, 42, 0.1)",
                    background: "rgba(255,255,255,.82)",
                  }}
                >
                  <span className="small" style={{ fontWeight: 600 }}>
                    {uploadType.label}
                  </span>
                  <button
                    className="btn"
                    type="button"
                    style={{ padding: "2px 8px", fontSize: 12 }}
                    onClick={() => void handleRemoveParticipantDocumentType(uploadType.key)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {canViewTeamDashboard && tripUserDocumentTypes.length === 0 ? (
            <AppEmptyState
              title="No upload types configured"
              description="Use Add Upload to create a custom document type."
              compact
            />
          ) : null}
          {canViewTeamDashboard ? (
            <AppStatusMessage
              message={participantDocumentTypeStatus}
              tone={
                participantDocumentTypeStatus === "Saved." ||
                participantDocumentTypeStatus.startsWith("Saved.")
                  ? "success"
                  : participantDocumentTypeStatus === "Saving..."
                    ? "info"
                    : "danger"
              }
              compact
            />
          ) : null}

          <AppStatusMessage message={participantDocumentsError} tone="danger" />

          {tripUserDocumentTypes.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: canViewTeamDashboard
                  ? "repeat(auto-fit, minmax(280px, 1fr))"
                  : "1fr",
                gap: 16,
                marginTop: canViewTeamDashboard ? 8 : 0,
              }}
            >
              {workerDocumentParticipants.map((participant) => {
                const documentSlots = participantDocumentsByUserId.get(String(participant.id)) || {};
                const participantUploadedCount = tripUserDocumentTypes.filter(
                  (uploadType) => !!documentSlots[uploadType.key]
                ).length;
                const participantMissingCount = Math.max(
                  tripUserDocumentTypes.length - participantUploadedCount,
                  0
                );

                return (
                  <div
                    key={participant.id}
                    className="card pad"
                    style={{
                      boxShadow: "none",
                      borderRadius: 18,
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.92))",
                    }}
                  >
                    <div className="row" style={{ marginBottom: 14, alignItems: "flex-start", gap: 12 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 900 }}>
                          {canViewTeamDashboard && !participant.rosterOnly ? (
                            <Link href={`/profile?participantId=${encodeURIComponent(participant.id)}`}>
                              {participant.name}
                            </Link>
                          ) : canViewTeamDashboard ? (
                            participant.name
                          ) : (
                            "My Uploads"
                          )}
                        </div>
                        <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>
                          {participantUploadedCount} uploaded · {participantMissingCount} missing
                        </div>
                      </div>
                      <span className={`badge ${participantMissingCount > 0 ? "badgeWarn" : "badgeSuccess"}`}>
                        {participantMissingCount > 0 ? "Needs review" : "Complete"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                      {tripUserDocumentTypes.map((uploadType) => {
                        const document = documentSlots[uploadType.key] || null;
                        const statusKey = `${participant.id}:${uploadType.key}`;
                        const slotStatus = participantDocumentStatus[statusKey];
                        const canUploadParticipantDocument =
                          !participant.rosterOnly &&
                          (canViewTeamDashboard ||
                            (canUploadOwnParticipantDocuments &&
                              String(participant.id) === String(currentParticipant?.id)));

                        return (
                          <div
                            key={`${participant.id}-${uploadType.key}`}
                            style={{
                              padding: 14,
                              borderRadius: 14,
                              border: "1px solid rgba(15, 23, 42, 0.08)",
                              background: "rgba(255,255,255,.78)",
                            }}
                          >
                            <div className="row" style={{ alignItems: "flex-start" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 900 }}>{uploadType.label}</div>
                                <div className="small" style={{ marginTop: 4 }}>
                                  {document
                                    ? `Uploaded ${formatNoteTimestamp(document.updatedAt || document.createdAt)}`
                                    : uploadType.description}
                                </div>
                              </div>
                              <span className={"badge " + (document ? "badgeSuccess" : "badgeWarn")}>
                                {document ? "Uploaded" : "Missing"}
                              </span>
                            </div>

                            <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
                              {document ? (
                                <a className="btn btnPrimary" href={document.fileUrl} target="_blank" rel="noreferrer">
                                  Open
                                </a>
                              ) : !canUploadParticipantDocument ? (
                                <button
                                  className="btn"
                                  type="button"
                                  disabled
                                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                                >
                                  No file
                                </button>
                              ) : null}

                              {canUploadParticipantDocument ? (
                                <>
                                  <button
                                    className="btn"
                                    type="button"
                                    onClick={() => participantDocumentInputRefs.current[statusKey]?.click()}
                                  >
                                    {document ? "Replace" : canViewTeamDashboard ? "Upload for worker" : "Upload"}
                                  </button>
                                  <input
                                    ref={(element) => {
                                      participantDocumentInputRefs.current[statusKey] = element;
                                    }}
                                    type="file"
                                    hidden
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];
                                      void handleUploadParticipantDocument(
                                        participant.id,
                                        uploadType.key,
                                        file
                                      );
                                      event.target.value = "";
                                    }}
                                  />
                                </>
                              ) : null}

                              {document &&
                              (canViewTeamDashboard ||
                                (canUploadOwnParticipantDocuments &&
                                  String(participant.id) === String(currentParticipant?.id))) ? (
                                <button
                                  className="btn"
                                  type="button"
                                  onClick={() => {
                                    if (confirmingParticipantDocumentDeleteId === document.id) {
                                      void handleDeleteParticipantDocument(document);
                                      return;
                                    }

                                    setConfirmingParticipantDocumentDeleteId(document.id);
                                  }}
                                >
                                  {confirmingParticipantDocumentDeleteId === document.id
                                    ? "Confirm Delete"
                                    : "Delete"}
                                </button>
                              ) : null}

                              {slotStatus?.message ? (
                                <AppStatusMessage
                                  message={slotStatus.message}
                                  tone={
                                    slotStatus.type === "error"
                                      ? "danger"
                                      : slotStatus.type === "success"
                                        ? "success"
                                        : "info"
                                  }
                                  compact
                                />
                              ) : null}
                              {canViewTeamDashboard && participant.rosterOnly ? (
                                <AppStatusMessage
                                  message="Waiting for worker account before upload."
                                  tone="warning"
                                  compact
                                />
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </CollapsibleSection>

      {addUploadModalOpen ? (
        <div
          className="appModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Add upload"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.45)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 50,
          }}
          onClick={closeAddUploadModal}
        >
          <div
            className="card pad appModalCard"
            style={{ width: "min(420px, 100%)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="row" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 900 }}>Add upload</div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={closeAddUploadModal}>
                Close
              </button>
            </div>
            <div className="small" style={{ marginBottom: 6 }}>
              Upload item name
            </div>
            <input
              className="input"
              value={addUploadDraft}
              onChange={(event) => setAddUploadDraft(event.target.value)}
              placeholder="e.g. Background check"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submitAddUpload();
                }
              }}
            />
            {participantDocumentTypeStatus &&
            participantDocumentTypeStatus !== "Saving..." &&
            !participantDocumentTypeStatus.startsWith("Saved.") ? (
              <div style={{ marginTop: 10 }}>
                <AppStatusMessage message={participantDocumentTypeStatus} tone="danger" compact />
              </div>
            ) : null}
            <div className="row" style={{ marginTop: 14, gap: 8, justifyContent: "flex-end" }}>
              <button className="btn" type="button" onClick={closeAddUploadModal}>
                Cancel
              </button>
              <button
                className="btn btnPrimary"
                type="button"
                disabled={participantDocumentTypeStatus === "Saving..."}
                onClick={() => void submitAddUpload()}
              >
                {participantDocumentTypeStatus === "Saving..." ? "Saving..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
