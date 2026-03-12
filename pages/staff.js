import Shell from "@/components/Shell";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import {
  assignWorkerByEmailToTrip,
  listTripsForCurrentUser,
  listWorkerAssignmentSummary,
  TRIPS_UPDATED_EVENT,
} from "@/lib/trips";
import { isStaffRole } from "@/lib/roles";
import { listStaffParticipantOverview } from "@/lib/staffOverview";

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
        const [nextTrips, nextWorkers, nextOverview] = await Promise.all([
          listTripsForCurrentUser(),
          listWorkerAssignmentSummary(),
          listStaffParticipantOverview(),
        ]);

        setTrips(nextTrips);
        setWorkers(nextWorkers);
        setParticipantOverview(nextOverview);
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

  return (
    <Shell>
      <h1 className="h1">Workers</h1>
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
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Search Workers</div>
        <div className="small" style={{ marginBottom: 10 }}>
          Search by worker name, email, or trip.
        </div>
        <input
          className="input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search workers or trips"
        />
      </div>

      <div className="card pad" style={{ marginBottom: 16 }}>
        <div className="row" style={{ marginBottom: 10 }}>
          <div>
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
          <table className="table">
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
                          href={`/trips/${encodeURIComponent(assignment.tripId)}`}
                        >
                          {assignment.tripName}
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className="badge">{participant.trainingPercent}%</span>
                  </td>
                  <td>
                    <span className="badge">{participant.taskPercent}%</span>
                  </td>
                  <td>{participant.fundraisingSummary}</td>
                  <td>
                    <span
                      className={
                        "badge " +
                        (participant.readiness === "Behind"
                          ? "badgeDanger"
                          : participant.readiness === "Ready"
                            ? "badgeSuccess"
                            : "badgeWarn")
                      }
                    >
                      {participant.readiness}
                    </span>
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
      />

      <WorkerSection
        title="Assigned"
        description="Workers with one or more trip assignments."
        workers={filteredAssignedWorkers}
        trips={trips}
        selectedTripByWorker={selectedTripByWorker}
        onSelectTrip={updateSelectedTrip}
        onAssign={handleAssign}
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
}) {
  return (
    <div className="card pad" style={{ marginBottom: 16 }}>
      <div className="row" style={{ marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 900 }}>{title}</div>
          <div className="small">{description}</div>
        </div>
        <div className="spacer" />
        <span className="badge">{workers.length}</span>
      </div>

      {workers.length === 0 ? (
        <div className="small">No workers in this section.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Worker</th>
              <th>Assigned Trips</th>
              <th>Assign Trip</th>
              <th />
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
                    : worker.assignments.map((assignment) => assignment.trip.name).join(", ")}
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
