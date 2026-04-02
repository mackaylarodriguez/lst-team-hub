import { useCallback, useEffect, useMemo, useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import {
  acknowledgeTripTravelSafety,
  getTripTravelSafety,
  listTripTravelSafetyAcknowledgments,
  saveTripTravelSafety,
} from "@/lib/tripTravelSafety";
import { showToast } from "@/components/Toast";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function daysBetween(isoDate) {
  if (!isoDate) return null;
  const d = new Date(`${String(isoDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

function needsReviewBadge(isoDate) {
  const days = daysBetween(isoDate);
  return days !== null && days > 60;
}

function formatSubsectionDate(isoDate) {
  if (!isoDate) return "—";
  const s = String(isoDate).slice(0, 10);
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(isoDate);
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function trimPreview(text, max = 90) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function ReviewBadge() {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 999,
        background: "rgba(180, 83, 9, 0.12)",
        color: "#9a3412",
        border: "1px solid rgba(180, 83, 9, 0.25)",
        whiteSpace: "nowrap",
      }}
    >
      Review recommended
    </span>
  );
}

export default function TripTravelSafetySection({
  tripId,
  session,
  participants = [],
  /** Roster rows; used so assigned workers still see Acknowledge if they are on the roster but missing from trip.participants. */
  teamMembers = [],
  canEdit = false,
  isPreviewingParticipant = false,
}) {
  const [record, setRecord] = useState(null);
  const [draft, setDraft] = useState({
    entryRequirements: "",
    entryLastVerifiedDate: "",
    safetySecurity: "",
    safetyLastVerifiedDate: "",
    referenceLinks: "",
  });
  const [acks, setAcks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [ackStatus, setAckStatus] = useState("");

  const load = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setSaveStatus("");
    try {
      const [safety, ackRows] = await Promise.all([
        getTripTravelSafety(tripId),
        listTripTravelSafetyAcknowledgments(tripId),
      ]);
      setRecord(safety);
      setDraft({
        entryRequirements: safety.entryRequirements || "",
        entryLastVerifiedDate: safety.entryLastVerifiedDate || "",
        safetySecurity: safety.safetySecurity || "",
        safetyLastVerifiedDate: safety.safetyLastVerifiedDate || "",
        referenceLinks: safety.referenceLinks || "",
      });
      setAcks(ackRows);
    } catch (e) {
      console.error(e);
      setSaveStatus(e.message || "Unable to load Travel & Safety.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  const contentVersion = record?.contentVersion || 1;

  const currentUserId = session?.profileId || session?.id || "";
  const isParticipant = useMemo(
    () => participants.some((p) => String(p.id) === String(currentUserId)),
    [participants, currentUserId]
  );

  const isOnTripRosterByEmail = useMemo(() => {
    const em = normalizeEmail(session?.email);
    if (!em) return false;
    return (teamMembers || []).some((m) => normalizeEmail(m.email) === em);
  }, [teamMembers, session?.email]);

  /** Assigned participant or anyone on this trip's roster (covers workers not yet in trip_assignments). */
  const canAcknowledgeAsTripMember = isParticipant || isOnTripRosterByEmail;

  const myAck = useMemo(
    () => acks.find((a) => String(a.userId) === String(currentUserId)),
    [acks, currentUserId]
  );

  const hasAcknowledgedCurrent = !!(myAck && Number(myAck.acknowledgedVersion) === Number(contentVersion));

  const { acknowledgedParticipants, notAcknowledgedParticipants } = useMemo(() => {
    const byId = new Map(acks.map((a) => [String(a.userId), a]));
    const acked = [];
    const missing = [];
    for (const p of participants) {
      const row = byId.get(String(p.id));
      if (row && Number(row.acknowledgedVersion) === Number(contentVersion)) {
        acked.push(p);
      } else {
        missing.push(p);
      }
    }
    return { acknowledgedParticipants: acked, notAcknowledgedParticipants: missing };
  }, [participants, acks, contentVersion]);

  async function handleSave() {
    if (!tripId || !canEdit) return;
    setSaveStatus("Saving...");
    try {
      const saved = await saveTripTravelSafety(tripId, draft);
      setRecord(saved);
      const nextAcks = await listTripTravelSafetyAcknowledgments(tripId);
      setAcks(nextAcks);
      setSaveStatus("Saved.");
      showToast("Travel & Safety saved.", "success");
    } catch (e) {
      const message = e.message || "Unable to save.";
      setSaveStatus(message);
      showToast(message, "error");
    }
  }

  async function handleAcknowledge() {
    if (!tripId || !currentUserId || isPreviewingParticipant) return;
    setAckStatus("");
    try {
      await acknowledgeTripTravelSafety(tripId, currentUserId);
      setAckStatus("Thank you — your acknowledgment was recorded.");
      showToast("Acknowledgment recorded.", "success");
      await load();
    } catch (e) {
      if (String(e.message || "") === "ALREADY_ACKNOWLEDGED") {
        setAckStatus("You have already acknowledged this version.");
        return;
      }
      const message = e.message || "Unable to acknowledge.";
      setAckStatus(message);
      showToast(message, "error");
    }
  }

  const showAckButton =
    !isPreviewingParticipant && canAcknowledgeAsTripMember && !hasAcknowledgedCurrent && !canEdit;

  const showAckButtonStaffParticipant =
    !isPreviewingParticipant && canAcknowledgeAsTripMember && !hasAcknowledgedCurrent && canEdit;

  const subsection = (key, title, lastVerifiedKey, bodyKey) => {
    const lastVerified = draft[lastVerifiedKey];
    const showReview = needsReviewBadge(lastVerified);
    const body = draft[bodyKey];
    const preview = trimPreview(body);

    return (
      <CollapsibleSection
        key={key}
        defaultOpen={false}
        title={title}
        subtitle={preview ? preview : "Expand to view details"}
        badge={showReview ? <ReviewBadge /> : null}
      >
        <div className="small" style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {canEdit ? (
            <>
              <strong>Last updated:</strong>
              <input
                className="input"
                type="date"
                value={lastVerified}
                onChange={(e) => setDraft((d) => ({ ...d, [lastVerifiedKey]: e.target.value }))}
                style={{ maxWidth: 160 }}
              />
            </>
          ) : (
            <span>
              <strong>Last updated:</strong> {formatSubsectionDate(lastVerified)}
            </span>
          )}
          {showReview ? <ReviewBadge /> : null}
        </div>
        {canEdit ? (
          <>
            <textarea
              className="input"
              rows={8}
              value={body}
              onChange={(e) => setDraft((d) => ({ ...d, [bodyKey]: e.target.value }))}
              placeholder={`Enter ${title.toLowerCase()}...`}
              style={{ width: "100%", minHeight: 140, resize: "vertical" }}
            />
          </>
        ) : (
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: 14 }}>
            {body?.trim() ? body : <span className="small">No content yet.</span>}
          </div>
        )}
      </CollapsibleSection>
    );
  };

  const referenceLinksSection = (
    <CollapsibleSection
      key="ref"
      defaultOpen={false}
      title="Reference Links"
      subtitle={trimPreview(draft.referenceLinks) || "Expand to view links or notes"}
    >
      {canEdit ? (
        <textarea
          className="input"
          rows={8}
          value={draft.referenceLinks}
          onChange={(e) => setDraft((d) => ({ ...d, referenceLinks: e.target.value }))}
          placeholder="Links, one per line or free-form notes..."
          style={{ width: "100%", minHeight: 120, resize: "vertical" }}
        />
      ) : (
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: 14 }}>
          {draft.referenceLinks?.trim() ? (
            draft.referenceLinks
          ) : (
            <span className="small">No content yet.</span>
          )}
        </div>
      )}
    </CollapsibleSection>
  );

  return (
    <div
      className="card pad tripFullSpanCard"
      style={{
        gridColumn: "1 / -1",
        border: "1px solid rgba(47, 73, 147, 0.18)",
        boxShadow: "0 8px 24px rgba(47, 73, 147, 0.06)",
      }}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, marginBottom: 4 }}>Travel & Safety</div>
          {record?.updatedAt ? (
            <div className="small" style={{ opacity: 0.9 }}>
              Last updated {new Date(record.updatedAt).toLocaleString()}
            </div>
          ) : null}
        </div>
        {loading ? (
          <div className="small">Loading Travel & Safety…</div>
        ) : (
          <>

            <div style={{ display: "grid", gap: 10 }}>
              {subsection("entry", "Entry Requirements", "entryLastVerifiedDate", "entryRequirements")}
              {subsection("safety", "Safety & Security", "safetyLastVerifiedDate", "safetySecurity")}
              {referenceLinksSection}
            </div>

            {canEdit ? (
              <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button className="btn btnPrimary" type="button" onClick={() => void handleSave()}>
                  Save Travel & Safety
                </button>
                {saveStatus ? <span className="small">{saveStatus}</span> : null}
                {saveStatus && saveStatus !== "Saving..." && saveStatus !== "Saved." ? (
                  <button className="btn" type="button" onClick={() => void handleSave()}>
                    Retry
                  </button>
                ) : null}
              </div>
            ) : null}

              {!canEdit && showAckButton ? (
                <div
                  style={{
                    marginTop: 4,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "rgba(47, 73, 147, 0.06)",
                    border: "1px solid rgba(47, 73, 147, 0.12)",
                  }}
                >
                  <div className="small" style={{ marginBottom: 8 }}>
                    Read all sections above, then confirm you understand the current travel and safety information
                    (version {contentVersion}).
                  </div>
                  <button className="btn btnPrimary" type="button" onClick={() => void handleAcknowledge()}>
                    I have read and understand this
                  </button>
                  {ackStatus ? <div className="small" style={{ marginTop: 8 }}>{ackStatus}</div> : null}
                </div>
              ) : null}

              {canEdit && showAckButtonStaffParticipant ? (
                <div
                  style={{
                    marginTop: 4,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "rgba(47, 73, 147, 0.06)",
                    border: "1px solid rgba(47, 73, 147, 0.12)",
                  }}
                >
                  <div className="small" style={{ marginBottom: 8 }}>
                    You are on this trip&apos;s roster. Acknowledge version {contentVersion} after reviewing the
                    material above.
                  </div>
                  <button className="btn btnPrimary" type="button" onClick={() => void handleAcknowledge()}>
                    I have read and understand this
                  </button>
                  {ackStatus ? <div className="small" style={{ marginTop: 8 }}>{ackStatus}</div> : null}
                </div>
              ) : null}

              {!canEdit && hasAcknowledgedCurrent ? (
                <div
                  className="small"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(22, 163, 74, 0.08)",
                    border: "1px solid rgba(22, 163, 74, 0.2)",
                    color: "#166534",
                  }}
                >
                  You acknowledged version {contentVersion} on{" "}
                  {myAck?.acknowledgedAt
                    ? new Date(myAck.acknowledgedAt).toLocaleString()
                    : "—"}
                  .
                </div>
              ) : null}

              {canEdit && canAcknowledgeAsTripMember && hasAcknowledgedCurrent ? (
                <div
                  className="small"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(22, 163, 74, 0.08)",
                    border: "1px solid rgba(22, 163, 74, 0.2)",
                    color: "#166534",
                  }}
                >
                  You acknowledged version {contentVersion} as a trip participant.
                </div>
              ) : null}

              {canEdit ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Acknowledgment status</div>
                  <div className="small" style={{ marginBottom: 8 }}>
                    {acknowledgedParticipants.length} / {participants.length} team members acknowledged (version{" "}
                    {contentVersion}).
                  </div>
                  <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                    <div>
                      <div className="small" style={{ fontWeight: 700, marginBottom: 4 }}>
                        Acknowledged
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                        {acknowledgedParticipants.length ? (
                          acknowledgedParticipants.map((p) => (
                            <li key={p.id}>{p.name || p.email || p.id}</li>
                          ))
                        ) : (
                          <li className="small">None yet.</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <div className="small" style={{ fontWeight: 700, marginBottom: 4 }}>
                        Not acknowledged
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                        {notAcknowledgedParticipants.length ? (
                          notAcknowledgedParticipants.map((p) => (
                            <li key={p.id}>{p.name || p.email || p.id}</li>
                          ))
                        ) : (
                          <li className="small">Everyone has acknowledged.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}
          </>
        )}
      </div>
    </div>
  );
}
