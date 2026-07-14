import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import {
  createWorkerProfile,
  assignWorkerByEmailToTrip,
  deleteWorkerRecord,
  listTripsForCurrentUser,
  listWorkerAssignmentSummary,
  TRIPS_UPDATED_EVENT,
} from "@/lib/trips";
import { isManagerRole } from "@/lib/roles";
import { listStaffParticipantOverview } from "@/lib/staffOverview";

function createEmptyWorkerDraft() {
  return {
    firstName: "",
    lastName: "",
    email: "",
    tripId: "",
  };
}

function normalizeWorkerEmailKey(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeWorkerNameKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** One row per email: duplicate summaries would otherwise show the same person in Unassigned and Assigned. */
function dedupeWorkersByEmailKey(workers) {
  const rows = [];
  const rowIndexByProfileId = new Map();
  const rowIndexByEmail = new Map();
  const rowIndexByName = new Map();

  const resolveRowIndex = (worker) => {
    if (worker?.profileId && rowIndexByProfileId.has(worker.profileId)) {
      return rowIndexByProfileId.get(worker.profileId);
    }

    const emailKey = normalizeWorkerEmailKey(worker?.email);
    if (emailKey && rowIndexByEmail.has(emailKey)) {
      return rowIndexByEmail.get(emailKey);
    }

    // Fallback for stale worker rows: if one row is profile-linked and names match, treat as same person.
    const nameKey = normalizeWorkerNameKey(worker?.name);
    if (nameKey && rowIndexByName.has(nameKey)) {
      const candidateIndex = rowIndexByName.get(nameKey);
      const candidate = rows[candidateIndex];
      if (candidate?.profileId || worker?.profileId) {
        return candidateIndex;
      }
    }

    return null;
  };

  const indexRow = (row, index) => {
    if (row?.profileId) rowIndexByProfileId.set(row.profileId, index);
    const emailKey = normalizeWorkerEmailKey(row?.email);
    if (emailKey) rowIndexByEmail.set(emailKey, index);
    const nameKey = normalizeWorkerNameKey(row?.name);
    if (nameKey) rowIndexByName.set(nameKey, index);
  };

  for (const w of workers || []) {
    const existingIndex = resolveRowIndex(w);
    if (existingIndex === null || existingIndex === undefined) {
      rows.push(w);
      indexRow(w, rows.length - 1);
      continue;
    }

    const prev = rows[existingIndex];
    if (!prev) {
      rows[existingIndex] = w;
      indexRow(w, existingIndex);
      continue;
    }

    const tripIds = new Set();
    const mergedAssignments = [];
    for (const a of [...(prev.assignments || []), ...(w.assignments || [])]) {
      if (!a?.tripId || tripIds.has(a.tripId)) continue;
      tripIds.add(a.tripId);
      mergedAssignments.push(a);
    }
    mergedAssignments.sort((a, b) =>
      String(a.trip?.name || "").localeCompare(String(b.trip?.name || ""), undefined, { sensitivity: "base" })
    );
    const base = prev.profileId ? prev : w.profileId ? w : prev;
    const merged = {
      ...base,
      profileId: base.profileId || w.profileId || prev.profileId,
      hasAccount: !!(prev.hasAccount || w.hasAccount),
      assignments: mergedAssignments,
    };
    rows[existingIndex] = merged;
    indexRow(merged, existingIndex);
  }
  return rows;
}

export default function StaffAssignments() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [trips, setTrips] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [participantOverview, setParticipantOverview] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTripByWorker, setSelectedTripByWorker] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [newWorkerDraft, setNewWorkerDraft] = useState(() => createEmptyWorkerDraft());
  const [invitingWorkerEmail, setInvitingWorkerEmail] = useState("");
  const [invitedEmails, setInvitedEmails] = useState(() => new Set());
  const [deletingWorkerId, setDeletingWorkerId] = useState("");
  const [confirmingDeleteWorkerId, setConfirmingDeleteWorkerId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const nextSession = await requireSession(router);
      if (cancelled || !nextSession) return;

      if (!isManagerRole(nextSession.permissionRole || nextSession.role)) {
        router.replace("/trips");
        return;
      }

      setSession(nextSession);
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadInviteStatus() {
      const emails = workers
        .filter((worker) => !worker.hasAccount && normalizeWorkerEmailKey(worker.email))
        .map((worker) => normalizeWorkerEmailKey(worker.email));

      if (!emails.length) {
        if (!cancelled) setInvitedEmails(new Set());
        return;
      }

      try {
        const response = await fetch("/api/worker-invite-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emails }),
        });
        const result = await response.json().catch(() => null);
        if (!cancelled && response.ok) {
          setInvitedEmails(new Set(result?.invited || []));
        }
      } catch (statusError) {
        console.error("Unable to load worker invite status", statusError);
      }
    }

    loadInviteStatus();

    return () => {
      cancelled = true;
    };
  }, [workers]);

  useEffect(() => {
    async function loadData() {
      try {
        const [tripsResult, workersResult, overviewResult] = await Promise.allSettled([
          listTripsForCurrentUser(),
          listWorkerAssignmentSummary(),
          listStaffParticipantOverview(),
        ]);

        if (tripsResult.status === "fulfilled") {
          setTrips(tripsResult.value);
        }

        if (workersResult.status === "fulfilled") {
          setWorkers(workersResult.value);
        }

        if (overviewResult.status === "fulfilled") {
          setParticipantOverview(overviewResult.value);
        }

        const firstError = [tripsResult, workersResult, overviewResult].find(
          (result) => result.status === "rejected"
        );

        if (firstError?.reason) {
          throw firstError.reason;
        }

        setError("");
      } catch (loadError) {
        console.error("Unable to load staff assignments", loadError);
        setError(loadError.message || "Unable to load worker assignments.");
      }
    }

    if (!session) return;
    loadData();

    window.addEventListener(TRIPS_UPDATED_EVENT, loadData);
    window.addEventListener("storage", loadData);

    return () => {
      window.removeEventListener(TRIPS_UPDATED_EVENT, loadData);
      window.removeEventListener("storage", loadData);
    };
  }, [session]);

  const dedupedWorkers = useMemo(() => dedupeWorkersByEmailKey(workers), [workers]);

  const { unassignedWorkers, assignedWorkers } = useMemo(() => {
    return {
      unassignedWorkers: dedupedWorkers.filter((worker) => worker.assignments.length === 0),
      assignedWorkers: dedupedWorkers.filter((worker) => worker.assignments.length > 0),
    };
  }, [dedupedWorkers]);

  const normalizedSearchQuery = String(searchQuery || "").trim().toLowerCase();

  const participantByProfileId = useMemo(() => {
    const m = new Map();
    for (const p of participantOverview || []) {
      if (p?.id) m.set(p.id, p);
    }
    return m;
  }, [participantOverview]);

  const participantByEmail = useMemo(() => {
    const m = new Map();
    for (const p of participantOverview || []) {
      const e = normalizeWorkerEmailKey(p.email);
      if (e) m.set(e, p);
    }
    return m;
  }, [participantOverview]);

  const filteredUnassignedWorkers = useMemo(() => {
    if (!normalizedSearchQuery) return unassignedWorkers;

    return unassignedWorkers.filter((worker) => {
      return (
        String(worker.name || "").toLowerCase().includes(normalizedSearchQuery) ||
        String(worker.email || "").toLowerCase().includes(normalizedSearchQuery)
      );
    });
  }, [normalizedSearchQuery, unassignedWorkers]);

  const filteredAssignedWorkers = useMemo(() => {
    if (!normalizedSearchQuery) return assignedWorkers;

    return assignedWorkers.filter((worker) => {
      const p =
        (worker.profileId && participantByProfileId.get(worker.profileId)) ||
        participantByEmail.get(normalizeWorkerEmailKey(worker.email)) ||
        null;
      const tripNames = (worker.assignments || [])
        .map((assignment) => assignment.trip?.name || "")
        .join(" ")
        .toLowerCase();
      const extra = [p?.readiness, p?.fundraisingSummary].filter(Boolean).join(" ").toLowerCase();

      return (
        String(worker.name || "").toLowerCase().includes(normalizedSearchQuery) ||
        String(worker.email || "").toLowerCase().includes(normalizedSearchQuery) ||
        tripNames.includes(normalizedSearchQuery) ||
        extra.includes(normalizedSearchQuery)
      );
    });
  }, [assignedWorkers, normalizedSearchQuery, participantByProfileId, participantByEmail]);

  function updateSelectedTrip(workerId, tripId) {
    setSelectedTripByWorker((prev) => ({
      ...prev,
      [workerId]: tripId,
    }));
  }

  async function handleAssign(workerEmail, workerId) {
    try {
      const result = await assignWorkerByEmailToTrip({
        workerEmail,
        tripId: selectedTripByWorker[workerId],
      });

      if (result.status !== "assigned") {
        setError(result.message);
        setMessage("");
        return;
      }

      setMessage(result.message);
      setError("");
      setSelectedTripByWorker((prev) => ({
        ...prev,
        [workerId]: "",
      }));

      const [nextWorkers, nextOverview] = await Promise.all([
        listWorkerAssignmentSummary(),
        listStaffParticipantOverview(),
      ]);
      setWorkers(nextWorkers);
      setParticipantOverview(nextOverview);
    } catch (assignError) {
      console.error("Unable to assign worker", assignError);
      setError(assignError.message || "Unable to assign worker.");
      setMessage("");
    }
  }

  async function handleAddWorker() {
    try {
      const createResult = await createWorkerProfile(newWorkerDraft);

      if (createResult.status === "invalid_role") {
        setError(createResult.message);
        setMessage("");
        return;
      }

      let nextMessage = createResult.message;

      if (newWorkerDraft.tripId) {
        const assignResult = await assignWorkerByEmailToTrip({
          workerEmail: newWorkerDraft.email,
          tripId: newWorkerDraft.tripId,
        });

        if (assignResult.status === "assigned" || assignResult.status === "duplicate") {
          nextMessage =
            createResult.status === "duplicate"
              ? "Worker already existed and is assigned to that trip. They can now create an account with this same email."
              : "Worker created and assigned to trip. They can now create an account with this same email.";
        } else {
          setError(assignResult.message);
          setMessage("");
          return;
        }
      } else if (createResult.status === "duplicate") {
        nextMessage = "That worker already exists. They should create an account with this same email if they have not yet.";
      } else {
        nextMessage = "Worker created. They can now create an account with this same email.";
      }

      const [nextWorkers, nextOverview] = await Promise.all([
        listWorkerAssignmentSummary(),
        listStaffParticipantOverview(),
      ]);
      setWorkers(nextWorkers);
      setParticipantOverview(nextOverview);
      setNewWorkerDraft(createEmptyWorkerDraft());
      setIsAddingWorker(false);
      setMessage(nextMessage);
      setError("");
    } catch (addError) {
      console.error("Unable to add worker", addError);
      setError(addError.message || "Unable to add worker.");
      setMessage("");
    }
  }

  async function handleInviteWorker(worker) {
    const email = String(worker?.email || "").trim().toLowerCase();
    const tripAssignment = (worker?.assignments || [])[0] || null;

    if (!email || !tripAssignment?.tripId || !tripAssignment?.trip) {
      setError("Add this person to a trip before sending an invite.");
      setMessage("");
      return;
    }

    try {
      setInvitingWorkerEmail(email);
      const response = await fetch("/api/trip-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientEmail: email,
          recipientName: worker?.name || "",
          senderEmail: session?.email || "",
          senderName: session?.name || session?.email || "LST staff",
          tripId: tripAssignment.tripId,
          tripName: tripAssignment.trip?.name || "",
          tripLocation: tripAssignment.trip?.location || "",
          tripDates: tripAssignment.trip?.dates || "",
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 409 && result?.alreadyInvited) {
          setInvitedEmails((current) => new Set([...current, email]));
        }
        throw new Error(result?.error || "Unable to send invite.");
      }

      setMessage(`Invite sent to ${email}.`);
      setError("");
      setInvitedEmails((current) => new Set([...current, email]));
    } catch (inviteError) {
      console.error("Unable to send worker invite from staff page", inviteError);
      setError(inviteError.message || "Unable to send invite.");
      setMessage("");
    } finally {
      setInvitingWorkerEmail("");
    }
  }

  async function handleDeleteWorker(worker) {
    try {
      setDeletingWorkerId(worker.id);
      await deleteWorkerRecord({
        workerId: worker.profileId || "",
        email: worker.email,
        hasAccount: worker.hasAccount,
        pendingAssignmentIds: (worker.assignments || [])
          .filter((assignment) => assignment.source === "team_member" && assignment.id)
          .map((assignment) => assignment.id),
      });

      const [nextWorkers, nextOverview] = await Promise.all([
        listWorkerAssignmentSummary(),
        listStaffParticipantOverview(),
      ]);
      setWorkers(nextWorkers);
      setParticipantOverview(nextOverview);
      setMessage(`${worker?.name || worker?.email || "Worker"} deleted.`);
      setError("");
    } catch (deleteError) {
      console.error("Unable to delete worker", deleteError);
      setError(deleteError.message || "Unable to delete worker.");
      setMessage("");
    } finally {
      setDeletingWorkerId("");
      setConfirmingDeleteWorkerId("");
    }
  }

  return (
    <Shell>
      <h1 className="h1" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AppIcon name="workers" className="pageEyebrowIcon" />
        <span>Workers</span>
      </h1>
      <p className="p">
        Workers on trips show training, tasks, fundraising, and trip readiness. People without a trip yet appear below
        so you can assign them.
      </p>

      <div style={{ height: 14 }} />

      {message && (
        <div className="card pad" style={{ marginBottom: 16, color: "var(--success)" }}>
          {message}
        </div>
      )}

      {error && (
        <div className="card pad" style={{ marginBottom: 16, color: "var(--danger)" }}>
          {error}
        </div>
      )}

      <div className="card pad" style={{ marginBottom: 16 }}>
        <div className="row" style={{ marginBottom: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <div className="appSectionBadge" style={{ marginBottom: 6 }}>Search</div>
            <div className="small">
              Search by worker name, email, or trip.
            </div>
          </div>
          <div className="spacer" />
          <button
            className="btn"
            type="button"
            onClick={() => {
              setIsAddingWorker((current) => !current);
              setMessage("");
              setError("");
              setNewWorkerDraft(createEmptyWorkerDraft());
            }}
          >
            {isAddingWorker ? "Cancel" : "Add Worker"}
          </button>
        </div>
        <input
          className="input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search workers or trips"
        />
        {isAddingWorker ? (
          <div
            style={{
              display: "grid",
              gap: 10,
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "#fff",
            }}
          >
            <div className="small">
              Create a worker profile here, then optionally assign them to a trip right away.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <input
                className="input"
                value={newWorkerDraft.firstName}
                onChange={(event) =>
                  setNewWorkerDraft((current) => ({ ...current, firstName: event.target.value }))
                }
                placeholder="First name"
              />
              <input
                className="input"
                value={newWorkerDraft.lastName}
                onChange={(event) =>
                  setNewWorkerDraft((current) => ({ ...current, lastName: event.target.value }))
                }
                placeholder="Last name"
              />
              <input
                className="input"
                type="email"
                value={newWorkerDraft.email}
                onChange={(event) =>
                  setNewWorkerDraft((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="worker@email.com"
              />
              <select
                className="input"
                value={newWorkerDraft.tripId}
                onChange={(event) =>
                  setNewWorkerDraft((current) => ({ ...current, tripId: event.target.value }))
                }
              >
                <option value="">No trip yet</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button className="btn btnPrimary" type="button" onClick={() => void handleAddWorker()}>
                Save Worker
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setIsAddingWorker(false);
                  setNewWorkerDraft(createEmptyWorkerDraft());
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <WorkerDirectorySection
        title="On trips"
        description="Workers with at least one trip. Metrics combine all of their assigned trips."
        workers={filteredAssignedWorkers}
        participantByProfileId={participantByProfileId}
        participantByEmail={participantByEmail}
        trips={trips}
        selectedTripByWorker={selectedTripByWorker}
        onSelectTrip={updateSelectedTrip}
        onAssign={handleAssign}
        onInvite={handleInviteWorker}
        invitingWorkerEmail={invitingWorkerEmail}
        invitedEmails={invitedEmails}
        onDelete={handleDeleteWorker}
        deletingWorkerId={deletingWorkerId}
        confirmingDeleteWorkerId={confirmingDeleteWorkerId}
        onConfirmDeleteChange={setConfirmingDeleteWorkerId}
      />

      <WorkerDirectorySection
        title="Not on a trip yet"
        description="Create a Hub worker profile or add them to a roster, then assign a trip here."
        workers={filteredUnassignedWorkers}
        participantByProfileId={participantByProfileId}
        participantByEmail={participantByEmail}
        trips={trips}
        selectedTripByWorker={selectedTripByWorker}
        onSelectTrip={updateSelectedTrip}
        onAssign={handleAssign}
        onInvite={handleInviteWorker}
        invitingWorkerEmail={invitingWorkerEmail}
        invitedEmails={invitedEmails}
        onDelete={handleDeleteWorker}
        deletingWorkerId={deletingWorkerId}
        confirmingDeleteWorkerId={confirmingDeleteWorkerId}
        onConfirmDeleteChange={setConfirmingDeleteWorkerId}
      />
    </Shell>
  );
}

const READINESS_TOOLTIP =
  "Ready: tasks and training are 100% (if none are configured for their trips yet, that counts as complete), " +
  "and the “fully raised” fundraising milestone is either not set up (—) or complete (100%). " +
  "Behind: configured tasks or training under 50%; or the nearest trip is within 45 days and the $2k milestone is not complete; " +
  "or the nearest trip is within 21 days and configured tasks or training are under 80%. " +
  "On track: everything else.";

function participantForWorker(worker, participantByProfileId, participantByEmail) {
  if (worker?.profileId && participantByProfileId.has(worker.profileId)) {
    return participantByProfileId.get(worker.profileId);
  }
  const e = normalizeWorkerEmailKey(worker.email);
  if (e && participantByEmail.has(e)) return participantByEmail.get(e);
  return null;
}

function MetricBar({ label, value }) {
  if (value === null || value === undefined) {
    return (
      <div style={{ minWidth: 88 }}>
        {label ? (
          <div className="small" style={{ color: "var(--muted)", marginBottom: 2 }}>
            {label}
          </div>
        ) : null}
        <span className="small" style={{ color: "var(--muted)" }}>
          —
        </span>
      </div>
    );
  }
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const fill = v >= 100 ? "rgba(34,197,94,.85)" : "rgba(50,84,163,.65)";
  return (
    <div style={{ minWidth: 88 }}>
      {label ? (
        <div className="small" style={{ color: "var(--muted)", marginBottom: 2 }}>
          {label} <strong style={{ color: "var(--text)" }}>{v}%</strong>
        </div>
      ) : (
        <div className="small" style={{ marginBottom: 2, fontWeight: 700 }}>
          {v}%
        </div>
      )}
      <div
        style={{
          height: 7,
          borderRadius: 999,
          background: "rgba(15,23,42,.08)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${v}%`, height: "100%", background: fill }} />
      </div>
    </div>
  );
}

function TripReadinessBadge({ readiness }) {
  if (!readiness) {
    return <span className="small" style={{ color: "var(--muted)" }}>—</span>;
  }
  const cls =
    readiness === "Behind" ? "badgeDanger" : readiness === "Ready" ? "badgeSuccess" : "badgeWarn";
  return (
    <span className={`badge ${cls}`.trim()} title={READINESS_TOOLTIP}>
      {readiness}
    </span>
  );
}

function collectWorkerTripRows(worker, participant) {
  const assignmentByTripId = new Map(
    (worker.assignments || []).map((assignment) => [assignment.tripId, assignment])
  );
  const participantTripsById = new Map((participant?.trips || []).map((trip) => [trip.tripId, trip]));

  const tripIds = [];
  assignmentByTripId.forEach((_, tripId) => tripIds.push(tripId));
  participantTripsById.forEach((_, tripId) => {
    if (!assignmentByTripId.has(tripId)) tripIds.push(tripId);
  });

  return tripIds.map((tripId) => {
    const assignment = assignmentByTripId.get(tripId);
    const tripMetrics = participantTripsById.get(tripId);
    return {
      tripId,
      tripName: assignment?.trip?.name || tripMetrics?.tripName || "Trip",
      trainingPercent: tripMetrics?.trainingPercent ?? null,
      taskPercent: tripMetrics?.taskPercent ?? null,
      fundraising2000Complete: tripMetrics?.fundraising2000Complete,
      fundraisingAllComplete: tripMetrics?.fundraisingAllComplete,
      readiness: tripMetrics?.readiness || null,
    };
  });
}

function PerTripMetricCell({ tripRows, metricKey }) {
  if (!tripRows.length) {
    return <span className="small" style={{ color: "var(--muted)" }}>—</span>;
  }
  return (
    <div style={{ display: "grid", gap: 8, minWidth: 120 }}>
      {tripRows.map((tripRow) => (
        <div key={`metric-${metricKey}-${tripRow.tripId}`}>
          <div className="small" style={{ color: "var(--muted)", marginBottom: 3 }}>
            {tripRow.tripName}
          </div>
          <MetricBar label="" value={tripRow[metricKey]} />
        </div>
      ))}
    </div>
  );
}

function PerTripFundraisingCell({ tripRows }) {
  if (!tripRows.length) {
    return <span className="small" style={{ color: "var(--muted)" }}>—</span>;
  }
  return (
    <div style={{ display: "grid", gap: 8, minWidth: 130 }}>
      {tripRows.map((tripRow) => {
        const has2000 = typeof tripRow.fundraising2000Complete === "boolean";
        const hasAll = typeof tripRow.fundraisingAllComplete === "boolean";
        const milestoneCount = (has2000 ? 1 : 0) + (hasAll ? 1 : 0);
        const completedMilestoneCount =
          (tripRow.fundraising2000Complete ? 1 : 0) +
          (tripRow.fundraisingAllComplete ? 1 : 0);
        const fundraisingPercent =
          milestoneCount > 0
            ? Math.round((completedMilestoneCount / milestoneCount) * 100)
            : null;
        return (
          <div key={`fundraising-${tripRow.tripId}`}>
            <div className="small" style={{ color: "var(--muted)", marginBottom: 3 }}>
              {tripRow.tripName}
            </div>
            {fundraisingPercent === null ? (
              <span className="small" style={{ color: "var(--muted)" }}>No milestones</span>
            ) : (
              <MetricBar label="Fundraising" value={fundraisingPercent} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PerTripReadinessCell({ tripRows }) {
  if (!tripRows.length) {
    return <span className="small" style={{ color: "var(--muted)" }}>—</span>;
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {tripRows.map((tripRow) => (
        <div key={`readiness-${tripRow.tripId}`}>
          <div className="small" style={{ color: "var(--muted)", marginBottom: 3 }}>
            {tripRow.tripName}
          </div>
          <TripReadinessBadge readiness={tripRow.readiness} />
        </div>
      ))}
    </div>
  );
}

function WorkerDirectorySection({
  title,
  description,
  workers,
  participantByProfileId,
  participantByEmail,
  trips,
  selectedTripByWorker,
  onSelectTrip,
  onAssign,
  onInvite,
  invitingWorkerEmail,
  invitedEmails,
  onDelete,
  deletingWorkerId,
  confirmingDeleteWorkerId,
  onConfirmDeleteChange,
}) {
  return (
    <div className="card pad" style={{ marginBottom: 16 }}>
      <div className="row" style={{ marginBottom: 10 }}>
        <div>
          <div className="appSectionBadge" style={{ marginBottom: 6 }}>{title}</div>
          <div className="small">{description}</div>
        </div>
        <div className="spacer" />
        <span className="badge">{workers.length}</span>
      </div>

      {workers.length === 0 ? (
        <EmptyState
          icon="workers"
          title={`No ${title.toLowerCase()} workers`}
          description={description}
        />
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table className="table dataTableStriped" style={{ minWidth: 920, fontSize: 13 }}>
            <thead>
              <tr>
                <th>Worker</th>
                <th>Account</th>
                <th>Trips</th>
                <th>Training</th>
                <th>Tasks</th>
                <th>Fundraising</th>
                <th title={READINESS_TOOLTIP}>Trip readiness</th>
                <th style={{ width: 1 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((worker) => {
                const participant = participantForWorker(worker, participantByProfileId, participantByEmail);
                const tripRows = collectWorkerTripRows(worker, participant);
                const workerEmailKey = normalizeWorkerEmailKey(worker.email);
                const inviteAlreadySent = invitedEmails?.has?.(workerEmailKey);
                return (
                  <tr key={worker.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 700 }}>
                        {worker.profileId ? (
                          <Link href={`/profile?participantId=${encodeURIComponent(worker.profileId)}`}>
                            {worker.name || worker.email}
                          </Link>
                        ) : (
                          <span title="Profile opens after this person has a Hub account (worker profile).">
                            {worker.name || worker.email}
                          </span>
                        )}
                      </div>
                      <div className="small" style={{ color: "var(--muted)" }}>
                        {worker.email}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${worker.hasAccount ? "badgeSuccess" : inviteAlreadySent ? "badgeInfo" : "badgeWarn"}`.trim()}>
                        {worker.hasAccount ? "Account created" : inviteAlreadySent ? "Invite sent" : "Pending invite"}
                      </span>
                    </td>
                    <td>
                      {worker.assignments.length === 0 ? (
                        <span className="small" style={{ color: "var(--muted)" }}>
                          None
                        </span>
                      ) : (
                        <div style={{ display: "grid", gap: 6 }}>
                          {worker.assignments.map((assignment) => (
                            <Link
                              key={`${worker.id}-${assignment.id || assignment.tripId}`}
                              href={`/trips/${encodeURIComponent(assignment.tripId)}`}
                            >
                              {assignment.trip.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <PerTripMetricCell tripRows={tripRows} metricKey="trainingPercent" />
                    </td>
                    <td>
                      <PerTripMetricCell tripRows={tripRows} metricKey="taskPercent" />
                    </td>
                    <td>
                      <PerTripFundraisingCell tripRows={tripRows} />
                    </td>
                    <td>
                      <PerTripReadinessCell tripRows={tripRows} />
                    </td>
                    <td style={{ verticalAlign: "top", paddingTop: 10 }}>
                      <details className="staffWorkerActionsDetails">
                        <summary
                          className="sitesBtnGhost"
                          style={{
                            listStyle: "none",
                            cursor: "pointer",
                            fontWeight: 700,
                            userSelect: "none",
                          }}
                        >
                          Actions
                        </summary>
                        <div
                          style={{
                            marginTop: 10,
                            padding: 10,
                            borderRadius: 12,
                            border: "1px solid var(--border)",
                            background: "var(--card)",
                            display: "grid",
                            gap: 10,
                            minWidth: 220,
                            boxShadow: "0 8px 24px rgba(15,23,42,.12)",
                          }}
                        >
                          <div>
                            <div className="small" style={{ fontWeight: 700, marginBottom: 4 }}>
                              Assign to trip
                            </div>
                            <select
                              className="input"
                              value={selectedTripByWorker[worker.id] || ""}
                              onChange={(event) => onSelectTrip(worker.id, event.target.value)}
                            >
                              <option value="">Select trip…</option>
                              {trips.map((trip) => (
                                <option key={trip.id} value={trip.id}>
                                  {trip.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn btnPrimary"
                              style={{ marginTop: 8, width: "100%" }}
                              disabled={!selectedTripByWorker[worker.id]}
                              onClick={() => onAssign(worker.email, worker.id)}
                            >
                              Assign
                            </button>
                          </div>
                          <button
                            type="button"
                            className="btn"
                            style={{ width: "100%" }}
                            disabled={
                              worker.hasAccount ||
                              !worker.assignments.length ||
                              invitingWorkerEmail === worker.email ||
                              inviteAlreadySent
                            }
                            onClick={() => onInvite(worker)}
                          >
                            {invitingWorkerEmail === worker.email
                              ? "Sending invite…"
                              : worker.hasAccount
                                ? "Invite (account exists)"
                                : inviteAlreadySent
                                  ? "Invite sent"
                                  : "Send invite"}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ width: "100%", borderColor: "rgba(239,68,68,.35)", color: "var(--danger)" }}
                            onClick={() => {
                              if (confirmingDeleteWorkerId === worker.id) {
                                onDelete(worker);
                                return;
                              }
                              onConfirmDeleteChange(worker.id);
                            }}
                            disabled={deletingWorkerId === worker.id}
                          >
                            {deletingWorkerId === worker.id
                              ? "Deleting…"
                              : confirmingDeleteWorkerId === worker.id
                                ? "Confirm delete"
                                : "Delete worker"}
                          </button>
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
