import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { isManagerRole, ROLE_WORKER } from "@/lib/roles";
import { updateWorkerProfileEmail, updateWorkerProfileNames } from "@/lib/trips";
import { getUserDocumentTypeLabel } from "@/lib/userDocumentTypes";
import { deleteUserDocument, listProfileDocuments } from "@/lib/userDocuments";
import {
  getRecruitingStageLabel,
  listRecruitingCycleContactsByEmail,
} from "@/lib/recruitingCycles";
import {
  deleteProfileStaffNote,
  listProfileStaffNotes,
  saveProfileStaffNote,
} from "@/lib/profileStaffNotes";

function formatDate(value) {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleDateString();
}

function formatProfileRole(role) {
  const normalized = String(role || "").trim();
  if (!normalized) return "Worker";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatGender(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";

  const compact = normalized.toLowerCase();
  if (compact === "f" || compact === "female") return "Female";
  if (compact === "m" || compact === "male") return "Male";
  return normalized;
}

function isMissingGenderColumnError(error) {
  const message = String(error?.message || error?.details || "").toLowerCase();
  return message.includes("profiles.gender") || message.includes("column gender does not exist");
}

function extractHandoffSummary(notes) {
  const match = String(notes || "").match(
    /\[HANDOFF SUMMARY\]\s*([\s\S]*?)\s*\[\/HANDOFF SUMMARY\]/i
  );
  return match ? match[1].trim() : "";
}

function stripHandoffSummary(notes) {
  return String(notes || "")
    .replace(/\[HANDOFF SUMMARY\]\s*[\s\S]*?\s*\[\/HANDOFF SUMMARY\]/i, "")
    .trim();
}

function hasRecruitingNotes(record) {
  return Boolean(
    extractHandoffSummary(record?.mackaylaNotes) ||
    stripHandoffSummary(record?.mackaylaNotes) ||
    String(record?.lesleeNotes || "").trim()
  );
}

function normalizeProfileRole(role) {
  return role ? String(role).trim().toLowerCase() : "";
}

export default function Profile() {
  const router = useRouter();
  const { participantId } = router.query;
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [recruitingRecords, setRecruitingRecords] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState("");
  const [noteStatus, setNoteStatus] = useState("");
  const [confirmingDeleteNote, setConfirmingDeleteNote] = useState(false);
  const [confirmingDeleteDocumentId, setConfirmingDeleteDocumentId] = useState("");
  const [documentDeleteStatus, setDocumentDeleteStatus] = useState("");
  const [workerEmailDraft, setWorkerEmailDraft] = useState("");
  const [workerEmailSaveStatus, setWorkerEmailSaveStatus] = useState("");
  const [workerFirstNameDraft, setWorkerFirstNameDraft] = useState("");
  const [workerLastNameDraft, setWorkerLastNameDraft] = useState("");
  const [workerNameSaveStatus, setWorkerNameSaveStatus] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const nextSession = await requireSession(router);
      if (!cancelled && nextSession) {
        setSession(nextSession);
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfilePage() {
      if (!session) return;

      const canManageProfiles = isManagerRole(session.permissionRole || session.role);
      const canViewPrivateStaffSections = canManageProfiles && !session.isImpersonating;
      const targetProfileId =
        canManageProfiles && participantId ? String(participantId) : session.profileId || session.id;

      try {
        setLoadError("");

        let { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, role, first_name, last_name, gender")
          .eq("id", targetProfileId)
          .maybeSingle();

        if (profileError && isMissingGenderColumnError(profileError)) {
          ({ data: profileRow, error: profileError } = await supabase
            .from("profiles")
            .select("id, email, role, first_name, last_name")
            .eq("id", targetProfileId)
            .maybeSingle());
        }

        if (profileError) {
          throw profileError;
        }

        if (!profileRow) {
          throw new Error("Profile not found.");
        }

        const displayProfile = {
          id: profileRow.id,
          email: profileRow.email || "",
          role: profileRow.role || "",
          gender: formatGender(profileRow.gender),
          name:
            [profileRow.first_name, profileRow.last_name].filter(Boolean).join(" ").trim() ||
            profileRow.email ||
            "Unknown user",
        };

        const { data: assignmentRows, error: assignmentError } = await supabase
          .from("trip_assignments")
          .select("trip_id, created_at")
          .eq("user_id", targetProfileId)
          .order("created_at", { ascending: false });

        if (assignmentError) {
          throw assignmentError;
        }

        const tripIds = [...new Set((assignmentRows || []).map((row) => row.trip_id).filter(Boolean))];
        let tripMap = new Map();

        if (tripIds.length > 0) {
          const { data: tripRows, error: tripError } = await supabase
            .from("trips")
            .select("id, trip_name, location, start_date, end_date")
            .in("id", tripIds);

          if (tripError) {
            throw tripError;
          }

          tripMap = new Map(
            (tripRows || []).map((trip) => [
              trip.id,
              {
                id: trip.id,
                name: trip.trip_name || "Untitled trip",
                location: trip.location || "",
                startDate: trip.start_date || "",
                endDate: trip.end_date || "",
              },
            ])
          );
        }

        const [nextDocuments, nextNotes, nextRecruitingRecords] = await Promise.all([
          listProfileDocuments(targetProfileId),
          canViewPrivateStaffSections ? listProfileStaffNotes(targetProfileId) : Promise.resolve([]),
          canViewPrivateStaffSections && displayProfile.email
            ? listRecruitingCycleContactsByEmail(displayProfile.email)
            : Promise.resolve([]),
        ]);

        if (cancelled) return;

        setProfile(displayProfile);
        setAssignments(
          (assignmentRows || [])
            .map((row) => ({
              tripId: row.trip_id,
              createdAt: row.created_at || "",
              trip: tripMap.get(row.trip_id) || null,
            }))
            .filter((row) => row.trip)
        );
        setDocuments(nextDocuments);
        setNotes(nextNotes);
        setRecruitingRecords((nextRecruitingRecords || []).filter(hasRecruitingNotes));
        setWorkerEmailDraft(displayProfile.email || "");
        setWorkerEmailSaveStatus("");
        setWorkerFirstNameDraft(profileRow.first_name || "");
        setWorkerLastNameDraft(profileRow.last_name || "");
        setWorkerNameSaveStatus("");
      } catch (error) {
        console.error("Unable to load profile page", error);
        if (!cancelled) {
          setLoadError(error.message || "Unable to load profile.");
        }
      }
    }

    if (!router.isReady) return;
    loadProfilePage();

    return () => {
      cancelled = true;
    };
  }, [participantId, router.isReady, session]);

  const canManageProfiles = isManagerRole(session?.permissionRole || session?.role);
  const canViewPrivateStaffSections = canManageProfiles && !session?.isImpersonating;
  const canEditWorkerProfileEmail =
    canManageProfiles &&
    !!participantId &&
    !!profile &&
    (normalizeProfileRole(profile.role) === ROLE_WORKER || !String(profile.role || "").trim());
  const canDeleteDocuments =
    !!profile && (canManageProfiles || String(profile.id) === String(session?.profileId || session?.id));

  async function handleDeleteDocument(document) {
    if (!profile || !document?.id) return;
    try {
      setDocumentDeleteStatus("Deleting...");
      await deleteUserDocument(document.id);
      const next = await listProfileDocuments(profile.id);
      setDocuments(next);
      setConfirmingDeleteDocumentId("");
      setDocumentDeleteStatus("");
    } catch (error) {
      console.error("Unable to delete document", error);
      setDocumentDeleteStatus(error?.message || "Unable to delete.");
      setConfirmingDeleteDocumentId("");
    }
  }

  const groupedDocuments = useMemo(() => {
    const groups = new Map();

    (documents || []).forEach((document) => {
      const key = document.trip?.id || "no-trip";
      const label = document.trip?.name || "Not linked to a trip";
      const existing = groups.get(key) || {
        key,
        label,
        trip: document.trip || null,
        items: [],
      };

      existing.items.push(document);
      groups.set(key, existing);
    });

    return [...groups.values()];
  }, [documents]);

  function startNoteEdit(note = null) {
    setEditingNoteId(note?.id || "");
    setNoteDraft(note?.note || "");
    setNoteStatus("");
  }

  function cancelNoteEdit() {
    setEditingNoteId("");
    setNoteDraft("");
    setNoteStatus("");
    setConfirmingDeleteNote(false);
  }

  async function handleSaveNote() {
    if (!profile) return;

    const trimmedNote = String(noteDraft || "").trim();
    if (!trimmedNote) {
      setNoteStatus("Note cannot be empty.");
      return;
    }

    try {
      setNoteStatus("Saving...");
      const saved = await saveProfileStaffNote({
        id: editingNoteId || null,
        profileId: profile.id,
        note: trimmedNote,
        authorName: session?.name || session?.email || "Staff",
        authorEmail: session?.email || "",
      });

      setNotes((current) => {
        const existingIndex = current.findIndex((note) => note.id === saved.id);
        if (existingIndex === -1) {
          return [saved, ...current];
        }

        return current.map((note) => (note.id === saved.id ? saved : note));
      });
      setEditingNoteId("");
      setNoteDraft("");
      setNoteStatus("Saved.");
    } catch (error) {
      console.error("Unable to save profile staff note", error);
      setNoteStatus(error.message || "Unable to save note.");
    }
  }

  async function handleSaveWorkerNames() {
    if (!profile || !canEditWorkerProfileEmail) return;
    try {
      setWorkerNameSaveStatus("Saving...");
      const { firstName: savedFirst, lastName: savedLast } = await updateWorkerProfileNames({
        profileId: profile.id,
        firstName: workerFirstNameDraft,
        lastName: workerLastNameDraft,
      });
      const combined =
        [savedFirst, savedLast].filter(Boolean).join(" ").trim() || profile.email || "Unknown user";
      setProfile((current) =>
        current ? { ...current, name: combined } : current
      );
      setWorkerFirstNameDraft(savedFirst);
      setWorkerLastNameDraft(savedLast);
      setWorkerNameSaveStatus("Saved.");
    } catch (error) {
      console.error("Unable to save worker name", error);
      setWorkerNameSaveStatus(error.message || "Unable to save name.");
    }
  }

  async function handleSaveWorkerEmail() {
    if (!profile || !canEditWorkerProfileEmail) return;
    const trimmed = String(workerEmailDraft || "").trim();
    if (!trimmed) {
      setWorkerEmailSaveStatus("Email cannot be empty.");
      return;
    }
    try {
      setWorkerEmailSaveStatus("Saving...");
      const { email: savedEmail } = await updateWorkerProfileEmail({
        profileId: profile.id,
        email: trimmed,
      });
      setProfile((current) => (current ? { ...current, email: savedEmail } : current));
      setWorkerEmailDraft(savedEmail);
      setWorkerEmailSaveStatus("Saved.");
      if (canViewPrivateStaffSections && savedEmail) {
        try {
          const nextRecruiting = await listRecruitingCycleContactsByEmail(savedEmail);
          setRecruitingRecords((nextRecruiting || []).filter(hasRecruitingNotes));
        } catch (recErr) {
          console.warn("Unable to refresh recruiting records after email change", recErr);
        }
      }
    } catch (error) {
      console.error("Unable to save worker email", error);
      setWorkerEmailSaveStatus(error.message || "Unable to save email.");
    }
  }

  async function handleDeleteNote() {
    if (!editingNoteId) return;

    try {
      setNoteStatus("Deleting...");
      await deleteProfileStaffNote(editingNoteId);
      setNotes((current) => current.filter((note) => note.id !== editingNoteId));
      setEditingNoteId("");
      setNoteDraft("");
      setNoteStatus("Deleted.");
      setConfirmingDeleteNote(false);
    } catch (error) {
      console.error("Unable to delete profile staff note", error);
      setNoteStatus(error.message || "Unable to delete note.");
      setConfirmingDeleteNote(false);
    }
  }

  return (
    <Shell>
      <h1 className="h1" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AppIcon name="profile" className="pageEyebrowIcon" />
        <span>{canManageProfiles && participantId ? "Participant Profile" : "Profile"}</span>
      </h1>
      <div className="appSectionBadge" style={{ marginBottom: 8 }}>Profile</div>
      <p className="p">
        Documents uploaded on trips stay attached to this participant profile so staff can review them later.
      </p>

      <div style={{ height: 14 }} />

      {loadError ? (
        <div className="card pad" style={{ color: "var(--danger)" }}>
          {loadError}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          <div className="card pad">
            <div className="small">Name</div>
            {canEditWorkerProfileEmail ? (
              <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 10,
                  }}
                >
                  <div>
                    <label className="small" htmlFor="profile-worker-first" style={{ display: "block", marginBottom: 4 }}>
                      First name
                    </label>
                    <input
                      id="profile-worker-first"
                      className="input"
                      value={workerFirstNameDraft}
                      onChange={(e) => {
                        setWorkerFirstNameDraft(e.target.value);
                        if (workerNameSaveStatus && workerNameSaveStatus !== "Saving...") {
                          setWorkerNameSaveStatus("");
                        }
                      }}
                      placeholder="First"
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label className="small" htmlFor="profile-worker-last" style={{ display: "block", marginBottom: 4 }}>
                      Last name
                    </label>
                    <input
                      id="profile-worker-last"
                      className="input"
                      value={workerLastNameDraft}
                      onChange={(e) => {
                        setWorkerLastNameDraft(e.target.value);
                        if (workerNameSaveStatus && workerNameSaveStatus !== "Saving...") {
                          setWorkerNameSaveStatus("");
                        }
                      }}
                      placeholder="Last"
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="row" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <button type="button" className="btn btnPrimary" onClick={() => void handleSaveWorkerNames()}>
                    Save name
                  </button>
                  {workerNameSaveStatus ? (
                    <span
                      className="small"
                      style={{
                        color:
                          workerNameSaveStatus === "Saved."
                            ? "var(--muted)"
                            : workerNameSaveStatus === "Saving..."
                              ? "var(--muted)"
                              : "var(--danger)",
                      }}
                    >
                      {workerNameSaveStatus}
                    </span>
                  ) : null}
                </div>
                <div className="small" style={{ opacity: 0.85, lineHeight: 1.45 }}>
                  Updates this profile and trip roster rows that match this worker&apos;s email.
                </div>
              </div>
            ) : (
              <div style={{ fontWeight: 900, fontSize: 18 }}>{profile?.name || "-"}</div>
            )}
            <div style={{ height: 10 }} />
            <div className="small">Email</div>
            {canEditWorkerProfileEmail ? (
              <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                <input
                  className="input"
                  type="email"
                  value={workerEmailDraft}
                  onChange={(e) => {
                    setWorkerEmailDraft(e.target.value);
                    if (workerEmailSaveStatus && workerEmailSaveStatus !== "Saving...") {
                      setWorkerEmailSaveStatus("");
                    }
                  }}
                  placeholder="worker@email.com"
                  autoComplete="email"
                />
                <div className="row" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <button type="button" className="btn btnPrimary" onClick={() => void handleSaveWorkerEmail()}>
                    Save email
                  </button>
                  {workerEmailSaveStatus ? (
                    <span
                      className="small"
                      style={{
                        color:
                          workerEmailSaveStatus === "Saved."
                            ? "var(--muted)"
                            : workerEmailSaveStatus === "Saving..."
                              ? "var(--muted)"
                              : "var(--danger)",
                      }}
                    >
                      {workerEmailSaveStatus}
                    </span>
                  ) : null}
                </div>
                <div className="small" style={{ opacity: 0.85, lineHeight: 1.45 }}>
                  Updates this profile and roster rows that used the previous address. Supabase Auth login
                  email is separate—change it in the Auth dashboard if the worker should sign in with this
                  address.
                </div>
              </div>
            ) : (
              <div style={{ fontWeight: 800 }}>{profile?.email || "-"}</div>
            )}
            <div style={{ height: 10 }} />
            <div className="small">Role</div>
            <span className="badge">{formatProfileRole(profile?.role)}</span>
            <div style={{ height: 10 }} />
            <div className="small">Gender</div>
            <div style={{ fontWeight: 800 }}>{profile?.gender || "-"}</div>
          </div>

          <div className="card pad">
            <div className="small">Trips</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{assignments.length}</div>
            <div className="small" style={{ marginTop: 8 }}>
              Current and past trip assignments visible on this profile.
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {assignments.length > 0 ? (
                assignments.map((assignment) => (
                  <Link
                    key={`${assignment.tripId}-${assignment.createdAt}`}
                    href={`/trips/${encodeURIComponent(assignment.tripId)}`}
                    className="card pad"
                    style={{ boxShadow: "none", textDecoration: "none", color: "inherit" }}
                  >
                    <div style={{ fontWeight: 900 }}>{assignment.trip?.name}</div>
                    <div className="small">{assignment.trip?.location}</div>
                  </Link>
                ))
              ) : (
                <div className="small">No trip assignments found.</div>
              )}
            </div>
          </div>
        </div>

        <div className="card pad">
          <div className="row appPolishToolbar" style={{ marginBottom: 10 }}>
            <div>
              <div className="appSectionBadge" style={{ marginBottom: 6 }}>Documents</div>
              <div style={{ fontWeight: 900 }}>Document History</div>
              <div className="small">Uploads from this participant across current and past trips.</div>
            </div>
            <div className="spacer" />
            <span className="badge">{documents.length}</span>
          </div>

          {documentDeleteStatus ? (
            <div className="small" style={{ marginBottom: 10, color: "var(--muted)" }}>
              {documentDeleteStatus}
            </div>
          ) : null}
          {groupedDocuments.length === 0 ? (
            <div className="small">No uploaded documents yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {groupedDocuments.map((group) => (
                <div key={group.key}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>{group.label}</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {group.items.map((document) => (
                      <div
                        key={document.id}
                        className="row"
                        style={{
                          padding: "12px 0",
                          borderBottom: "1px solid var(--border)",
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800 }}>{getUserDocumentTypeLabel(document.documentType)}</div>
                          <div className="small">{document.title}</div>
                          <div className="small" style={{ marginTop: 4 }}>
                            Uploaded {formatDate(document.updatedAt || document.createdAt)}
                          </div>
                        </div>
                        <a className="btn btnPrimary" href={document.fileUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                        {canDeleteDocuments && (
                          <button
                            type="button"
                            className="btn"
                            style={{ marginLeft: 8 }}
                            onClick={() => {
                              if (confirmingDeleteDocumentId === document.id) {
                                void handleDeleteDocument(document);
                                return;
                              }
                              setConfirmingDeleteDocumentId(document.id);
                            }}
                          >
                            {confirmingDeleteDocumentId === document.id ? "Confirm Delete" : "Delete"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {canViewPrivateStaffSections && profile ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div className="card pad">
              <div className="row appPolishToolbar" style={{ marginBottom: 10 }}>
                <div>
                  <div className="appSectionBadge" style={{ marginBottom: 6 }}>Recruiting Notes</div>
                  <div style={{ fontWeight: 900 }}>Recruiting Notes</div>
                  <div className="small">
                    Mackayla and Leslee notes from recruiting stay visible here after the team is formed.
                  </div>
                </div>
                <div className="spacer" />
                <span className="badge">{recruitingRecords.length}</span>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {recruitingRecords.length > 0 ? (
                  recruitingRecords.map((record) => {
                    const handoffSummary = extractHandoffSummary(record.mackaylaNotes);
                    const mackaylaNotes = stripHandoffSummary(record.mackaylaNotes);

                    return (
                      <div
                        key={record.id}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 14,
                          background: "var(--primarySoft)",
                          border: "1px solid rgba(47, 73, 147, 0.12)",
                        }}
                      >
                        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                          <div style={{ fontWeight: 900 }}>
                            {record.teamName || record.linkedTrip?.name || record.contact?.email || "Recruiting record"}
                          </div>
                          <span className="badge">{record.recruitingYear}</span>
                          <span className="badge">
                            {record.isConvertedToTeam ? "Formed Team" : record.isPotentialTeam ? "Potential Team" : "Recruiting"}
                          </span>
                          <span className="badge">{getRecruitingStageLabel(record.stage)}</span>
                        </div>
                        {(record.projectDates || record.site || record.weeks || record.departureDate) ? (
                          <div className="small" style={{ marginBottom: 8 }}>
                            {[
                              record.projectDates ? `Project Dates: ${record.projectDates}` : "",
                              record.site ? `Site: ${record.site}` : "",
                              record.weeks ? `Weeks: ${record.weeks}` : "",
                              record.departureDate ? `Departure: ${formatDate(record.departureDate)}` : "",
                            ]
                              .filter(Boolean)
                              .join(" | ")}
                          </div>
                        ) : null}
                        {handoffSummary ? (
                          <div style={{ marginBottom: 10 }}>
                            <div className="small" style={{ fontWeight: 900, marginBottom: 4 }}>Handoff Summary</div>
                            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{handoffSummary}</div>
                          </div>
                        ) : null}
                        {mackaylaNotes ? (
                          <div style={{ marginBottom: 10 }}>
                            <div className="small" style={{ fontWeight: 900, marginBottom: 4 }}>Mackayla Notes</div>
                            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{mackaylaNotes}</div>
                          </div>
                        ) : null}
                        {record.lesleeNotes ? (
                          <div>
                            <div className="small" style={{ fontWeight: 900, marginBottom: 4 }}>Leslee Notes</div>
                            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{record.lesleeNotes}</div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="small">No recruiting notes attached to this profile yet.</div>
                )}
              </div>
            </div>

            <div className="card pad">
              <div className="row appPolishToolbar" style={{ marginBottom: 10 }}>
                <div>
                  <div className="appSectionBadge" style={{ marginBottom: 6 }}>Staff Notes</div>
                  <div style={{ fontWeight: 900 }}>Staff Notes</div>
                  <div className="small">Private participant notes visible only to staff.</div>
                </div>
                <div className="spacer" />
                {!editingNoteId && !noteDraft ? (
                  <button className="btn" type="button" onClick={() => startNoteEdit()}>
                    Add Note
                  </button>
                ) : null}
              </div>

              {editingNoteId || noteDraft ? (
                <div style={{ marginBottom: 14 }}>
                  <textarea
                    className="input"
                    rows={4}
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    placeholder="Private note about this participant."
                  />
                  <div className="row" style={{ marginTop: 10 }}>
                    <button className="btn btnPrimary" type="button" onClick={handleSaveNote}>
                      Save Note
                    </button>
                    <button className="btn" type="button" onClick={cancelNoteEdit}>
                      Cancel
                    </button>
                    {editingNoteId ? (
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          if (confirmingDeleteNote) {
                            void handleDeleteNote();
                            return;
                          }
                          setConfirmingDeleteNote(true);
                        }}
                      >
                        {confirmingDeleteNote ? "Confirm Delete" : "Delete"}
                      </button>
                    ) : null}
                    {noteStatus ? (
                      <div className="small" style={{ alignSelf: "center" }}>
                        {noteStatus}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 12 }}>
                {notes.length > 0 ? (
                  notes.map((note) => (
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
                      <div className="small" style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span>
                          <strong>By:</strong> {note.authorName || note.authorEmail || "Unknown user"}
                        </span>
                        <span>
                          <strong>Updated:</strong> {formatDate(note.updatedAt || note.createdAt)}
                        </span>
                      </div>
                      <div className="row" style={{ marginTop: 10 }}>
                        <button className="btn" type="button" onClick={() => startNoteEdit(note)}>
                          Edit
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="small">No private staff notes yet.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
