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
import { isStaffRole } from "@/lib/roles";
import { listStaffParticipantOverview } from "@/lib/staffOverview";

function createEmptyWorkerDraft() {
  return {
    firstName: "",
    lastName: "",
    email: "",
    tripId: "",
  };
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
  const [deletingWorkerId, setDeletingWorkerId] = useState("");
  const [confirmingDeleteWorkerId, setConfirmingDeleteWorkerId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const nextSession = await requireSession(router);
      if (cancelled || !nextSession) return;

      if (!isStaffRole(nextSession.role)) {
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

  const { unassignedWorkers, assignedWorkers } = useMemo(() => {
    return {
      unassignedWorkers: workers.filter((worker) => worker.assignments.length === 0),
      assignedWorkers: workers.filter((worker) => worker.assignments.length > 0),
    };
  }, [workers]);

  const normalizedSearchQuery = String(searchQuery || "").trim().toLowerCase();

  const filteredParticipantOverview = useMemo(() => {
    if (!normalizedSearchQuery) return participantOverview;

    return participantOverview.filter((participant) => {
      const tripNames = (participant.trips || [])
        .map((trip) => `${trip.tripName || ""} ${trip.tripLocation || ""}`.toLowerCase())
        .join(" ");

      return (
        String(participant.name || "").toLowerCase().includes(normalizedSearchQuery) ||
        String(participant.email || "").toLowerCase().includes(normalizedSearchQuery) ||
        tripNames.includes(normalizedSearchQuery)
      );
    });
  }, [normalizedSearchQuery, participantOverview]);

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
      const tripNames = (worker.assignments || [])
        .map((assignment) => assignment.trip?.name || "")
        .join(" ")
        .toLowerCase();

      return (
        String(worker.name || "").toLowerCase().includes(normalizedSearchQuery) ||
        String(worker.email || "").toLowerCase().includes(normalizedSearchQuery) ||
        tripNames.includes(normalizedSearchQuery)
      );
    });
  }, [assignedWorkers, normalizedSearchQuery]);

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
        throw new Error(result?.error || "Unable to send invite.");
      }

      setMessage(`Invite sent to ${email}.`);
      setError("");
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
        Review worker progress across trips, then manage assignments underneath.
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
        <div className="row appPolishToolbar" style={{ marginBottom: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <div className="appSectionBadge" style={{ marginBottom: 6 }}>Search</div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Search Workers</div>
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

      <div className="card pad" style={{ marginBottom: 16 }}>
        <div className="row appPolishToolbar" style={{ marginBottom: 10 }}>
          <div>
            <div className="appSectionBadge" style={{ marginBottom: 6 }}>Overview</div>
            <div style={{ fontWeight: 900 }}>Worker Progress</div>
            <div className="small">
              Track trip coverage, training, tasks, fundraising milestones, and who needs follow-up.
            </div>
          </div>
          <div className="spacer" />
          <span className="badge">{filteredParticipantOverview.length}</span>
        </div>

        {filteredParticipantOverview.length === 0 ? (
          <div className="small">
            {normalizedSearchQuery ? "No workers match that search." : "No assigned workers yet."}
          </div>
        ) : (
          <table className="table dataTableStriped">
            <thead>
              <tr>
                <th>Worker</th>
                <th>Trips</th>
                <th>Training</th>
                <th>Tasks</th>
                <th>Fundraising</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredParticipantOverview.map((participant) => (
                <tr key={participant.id}>
                  <td>
                    <div style={{ fontWeight: 800 }}>
                      <Link href={`/profile?participantId=${encodeURIComponent(participant.id)}`}>
                        {participant.name}
                      </Link>
                    </div>
                    <div className="small">{participant.email}</div>
                  </td>
                  <td>
                    <div style={{ display: "grid", gap: 6 }}>
                      {participant.trips.map((assignment) => (
                        <Link
                          key={`${participant.id}-${assignment.tripId}`}
                          href={`/trips/${encodeURIComponent(assignment.tripId)}?tab=Tasks&participantId=${encodeURIComponent(participant.id)}`}
                        >
                          {assignment.tripName}
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "grid", gap: 6 }}>
                      {participant.trips.map((assignment) => (
                        <span
                          key={`${participant.id}-${assignment.tripId}-training`}
                          className="badge"
                        >
                          {assignment.trainingPercent}%
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "grid", gap: 6 }}>
                      {participant.trips.map((assignment) => (
                        <span
                          key={`${participant.id}-${assignment.tripId}-tasks`}
                          className="badge"
                        >
                          {assignment.taskPercent}%
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "grid", gap: 6 }}>
                      {participant.trips.map((assignment) => (
                        <div key={`${participant.id}-${assignment.tripId}-fundraising`} className="small">
                          {assignment.fundraisingSummary}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "grid", gap: 6 }}>
                      {participant.trips.map((assignment) => (
                        <span
                          key={`${participant.id}-${assignment.tripId}-status`}
                          className={
                            "badge " +
                            (assignment.readiness === "Behind"
                              ? "badgeDanger"
                              : assignment.readiness === "Ready"
                                ? "badgeSuccess"
                                : "badgeWarn")
                          }
                        >
                          {assignment.readiness}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <WorkerSection
        title="Unassigned"
        description="These workers do not have any trips yet."
        workers={filteredUnassignedWorkers}
        trips={trips}
        selectedTripByWorker={selectedTripByWorker}
        onSelectTrip={updateSelectedTrip}
        onAssign={handleAssign}
        onInvite={handleInviteWorker}
        invitingWorkerEmail={invitingWorkerEmail}
        onDelete={handleDeleteWorker}
        deletingWorkerId={deletingWorkerId}
        confirmingDeleteWorkerId={confirmingDeleteWorkerId}
        onConfirmDeleteChange={setConfirmingDeleteWorkerId}
      />

      <WorkerSection
        title="Assigned"
        description="Workers with one or more trip assignments."
        workers={filteredAssignedWorkers}
        trips={trips}
        selectedTripByWorker={selectedTripByWorker}
        onSelectTrip={updateSelectedTrip}
        onAssign={handleAssign}
        onInvite={handleInviteWorker}
        invitingWorkerEmail={invitingWorkerEmail}
        onDelete={handleDeleteWorker}
        deletingWorkerId={deletingWorkerId}
        confirmingDeleteWorkerId={confirmingDeleteWorkerId}
        onConfirmDeleteChange={setConfirmingDeleteWorkerId}
      />
    </Shell>
  );
}

function WorkerSection({
  title,
  description,
  workers,
  trips,
  selectedTripByWorker,
  onSelectTrip,
  onAssign,
  onInvite,
  invitingWorkerEmail,
  onDelete,
  deletingWorkerId,
  confirmingDeleteWorkerId,
  onConfirmDeleteChange,
}) {
  return (
    <div className="card pad" style={{ marginBottom: 16 }}>
      <div className="row appPolishToolbar" style={{ marginBottom: 10 }}>
        <div>
          <div className="appSectionBadge" style={{ marginBottom: 6 }}>{title}</div>
          <div style={{ fontWeight: 900 }}>{title}</div>
          <div className="small">{description}</div>
        </div>
        <div className="spacer" />
        <span className="badge">{workers.length}</span>
      </div>

      {workers.length === 0 ? (
        <EmptyState
          icon="workers"
          title={`No ${title.toLowerCase()} workers yet`}
          description={description}
        />
      ) : (
        <table className="table dataTableStriped">
          <thead>
            <tr>
              <th>Worker</th>
              <th>Assigned Trips</th>
              <th>Status</th>
              <th>Invite</th>
              <th>Assign Trip</th>
              <th>Assign</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{worker.name || worker.email}</div>
                  <div className="small">{worker.email}</div>
                </td>
                <td>
                  {worker.assignments.length === 0
                    ? "None"
                    : (
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
                  <span className={`badge ${worker.hasAccount ? "badgeSuccess" : "badgeWarn"}`.trim()}>
                    {worker.hasAccount ? "Account Created" : "Pending Invite"}
                  </span>
                </td>
                <td>
                  <button
                    className="btn"
                    type="button"
                    disabled={worker.hasAccount || !worker.assignments.length || invitingWorkerEmail === worker.email}
                    title={
                      worker.hasAccount
                        ? "Account created"
                        : worker.assignments.length
                          ? "Send a new invite email"
                          : "Add this person to a trip first"
                    }
                    style={worker.hasAccount ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
                    onClick={() => onInvite(worker)}
                  >
                    {invitingWorkerEmail === worker.email
                      ? "Sending..."
                      : worker.hasAccount
                        ? "Account Created"
                        : "Resend Invite"}
                  </button>
                </td>
                <td style={{ width: 280 }}>
                  <select
                    className="input"
                    value={selectedTripByWorker[worker.id] || ""}
                    onChange={(event) => onSelectTrip(worker.id, event.target.value)}
                  >
                    <option value="">Select a trip</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="btn btnPrimary"
                    type="button"
                    disabled={!selectedTripByWorker[worker.id]}
                    onClick={() => onAssign(worker.email, worker.id)}
                  >
                    Assign
                  </button>
                </td>
                <td>
                  <button
                    className="btn"
                    type="button"
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
                      ? "Deleting..."
                      : confirmingDeleteWorkerId === worker.id
                        ? "Confirm Delete"
                        : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
