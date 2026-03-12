import Shell from "@/components/Shell";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import {
  archiveTrip,
  createTripForCurrentUser,
  deleteTrip,
  listTripsForCurrentUser,
  TRIPS_UPDATED_EVENT,
  unarchiveTrip,
} from "@/lib/trips";
import { isAdminRole, isManagerRole } from "@/lib/roles";

function parseTripDates(dateLabel) {
  const sameMonthMatch = String(dateLabel).match(
    /^([A-Za-z]+)\s+(\d{1,2})[–-](\d{1,2}),\s*(\d{4})$/
  );

  if (sameMonthMatch) {
    const [, month, startDay, endDay, year] = sameMonthMatch;
    return {
      start: new Date(`${month} ${startDay}, ${year}`),
      end: new Date(`${month} ${endDay}, ${year}`),
    };
  }

  const exactDate = new Date(dateLabel);
  if (!Number.isNaN(exactDate.getTime())) {
    return { start: exactDate, end: exactDate };
  }

  return { start: null, end: null };
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseTripBounds(trip) {
  const start = trip?.startDate ? new Date(`${trip.startDate}T00:00:00`) : null;
  const end = trip?.endDate ? new Date(`${trip.endDate}T00:00:00`) : null;
  return { start, end };
}

function getCountdownLabel(start, end) {
  const today = startOfToday();

  if (!start || !end) return "Dates to be confirmed";
  if (today > end) return "Trip finished";
  if (today >= start && today <= end) return "Trip in progress";

  const diffMs = start.getTime() - today.getTime();
  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return `${daysUntil} day${daysUntil === 1 ? "" : "s"} until trip`;
}

export default function Trips() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [trips, setTrips] = useState([]);
  const [showTripForm, setShowTripForm] = useState(false);
  const [tripDraft, setTripDraft] = useState({
    name: "",
    location: "",
    startDate: "",
    endDate: "",
  });
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const session = await requireSession(router);
      if (cancelled || !session) return;
      setSession(session);
      try {
        const assignedTrips = await listTripsForCurrentUser();
        if (!cancelled) {
          setTrips(assignedTrips);
        }
      } catch (error) {
        console.error("Unable to load assigned trips", error);
      }
    }

    checkSession();

    async function syncTrips() {
      try {
        const assignedTrips = await listTripsForCurrentUser();
        if (!cancelled) {
          setTrips(assignedTrips);
        }
      } catch (error) {
        console.error("Unable to sync assigned trips", error);
      }
    }

    window.addEventListener(TRIPS_UPDATED_EVENT, syncTrips);
    window.addEventListener("storage", syncTrips);

    return () => {
      cancelled = true;
      window.removeEventListener(TRIPS_UPDATED_EVENT, syncTrips);
      window.removeEventListener("storage", syncTrips);
    };
  }, [router]);

  const { activeTrips, finishedTrips, archivedTrips } = useMemo(() => {
      const today = startOfToday();
      const grouped = trips.map((trip) => {
      const { start, end } = parseTripBounds(trip);
      return { ...trip, start, end, isArchived: trip.status === "archived" };
    });

    return {
      activeTrips: grouped
        .filter((trip) => !trip.isArchived && (!trip.end || trip.end >= today))
        .sort((a, b) => {
          if (!a.start) return 1;
          if (!b.start) return -1;
          return a.start - b.start;
        }),
      finishedTrips: grouped
        .filter((trip) => !trip.isArchived && trip.end && trip.end < today)
        .sort((a, b) => {
          if (!a.end) return 1;
          if (!b.end) return -1;
          return b.end - a.end;
        }),
      archivedTrips: grouped
        .filter((trip) => trip.isArchived)
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    };
  }, [trips]);

  const canManageTrips = isManagerRole(session?.permissionRole || session?.role);
  const isAdminUser = isAdminRole(session?.actualRole || session?.role);

  function updateTripDraft(field, value) {
    setTripDraft((current) => {
      if (field === "location") {
        return { ...current, location: value, name: value };
      }

      return { ...current, [field]: value };
    });
  }

  function handleCancelTripForm() {
    setShowTripForm(false);
    setTripDraft({ name: "", location: "", startDate: "", endDate: "" });
    setSubmitError("");
  }

  async function handleCreateTrip(event) {
    event.preventDefault();
    setSubmitError("");

    try {
      const trip = await createTripForCurrentUser(tripDraft);
      handleCancelTripForm();
      router.push(`/trips/${trip.id}`);
    } catch (error) {
      setSubmitError(error.message || "Unable to create trip.");
    }
  }

  async function handleDeleteTrip(tripId) {
    const confirmed = window.confirm("Delete this trip permanently?");
    if (!confirmed) return;

    try {
      await deleteTrip(tripId);
      setSubmitError("");
    } catch (error) {
      setSubmitError(error.message || "Unable to delete trip.");
    }
  }

  function updateLocalTripStatus(tripId, status) {
    setTrips((current) =>
      current.map((trip) =>
        String(trip.id) === String(tripId) ? { ...trip, status } : trip
      )
    );
  }

  return (
    <Shell>
      <div className="row" style={{ marginBottom: 14 }}>
        <div>
          <h1 className="h1">My Trips</h1>
          <p className="p">Everything you need for your team, in one place.</p>
        </div>
        <div className="spacer" />
        {canManageTrips && (
          <button
            className="btn btnPrimary"
            type="button"
            onClick={() => setShowTripForm((current) => !current)}
          >
            {showTripForm ? "Close" : "Add Trip"}
          </button>
        )}
        <span className="badge">Demo</span>
      </div>

      {canManageTrips && showTripForm && (
        <div className="card pad" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Create Trip</div>
          <div className="small" style={{ marginBottom: 16 }}>
            Create a trip and assign it to your account. The trip name follows the location/site.
          </div>

          <form onSubmit={handleCreateTrip} style={{ display: "grid", gap: 12 }}>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Location</div>
              <input
                className="input"
                value={tripDraft.location}
                onChange={(event) => updateTripDraft("location", event.target.value)}
                placeholder="Florianopolis, Brazil"
              />
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Trip Name</div>
              <input
                className="input"
                value={tripDraft.name}
                readOnly
                placeholder="Trip name follows the location"
              />
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Start Date</div>
              <input
                className="input"
                type="date"
                value={tripDraft.startDate}
                onChange={(event) => updateTripDraft("startDate", event.target.value)}
              />
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>End Date</div>
              <input
                className="input"
                type="date"
                value={tripDraft.endDate}
                onChange={(event) => updateTripDraft("endDate", event.target.value)}
              />
            </div>
            {submitError && (
              <div className="small" style={{ color: "var(--danger)" }}>
                {submitError}
              </div>
            )}
            <div className="row">
              <button className="btn btnPrimary" type="submit">Create Trip</button>
              <button className="btn" type="button" onClick={handleCancelTripForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: "grid", gap: 24 }}>
        <div>
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Active</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 280px))",
              gap: 14,
              justifyContent: "start",
            }}
          >
            {activeTrips.map((trip) => (
              <div key={trip.id || trip.name} className="card pad" style={{ minHeight: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{trip.name}</div>
                <div className="small" style={{ marginTop: 6 }}>{trip.location}</div>
                <div className="small">{trip.dates}</div>
                <div className="small" style={{ marginTop: 4 }}>
                  {getCountdownLabel(trip.start, trip.end)}
                </div>
                <div style={{ height: 12 }} />
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <Link className="btn btnPrimary" href={`/trips/${encodeURIComponent(trip.id)}`}>View Trip</Link>
                  {canManageTrips && (
                    <button
                      className="btn"
                      type="button"
                      onClick={async () => {
                        try {
                          await archiveTrip(trip.id);
                          updateLocalTripStatus(trip.id, "archived");
                          setSubmitError("");
                        } catch (error) {
                          setSubmitError(error.message || "Unable to archive trip.");
                        }
                      }}
                    >
                      Archive
                    </button>
                  )}
                  {isAdminUser && (
                    <button
                      className="btn"
                      type="button"
                      onClick={() => handleDeleteTrip(trip.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
            {activeTrips.length === 0 && (
              <div className="small">No active trips yet.</div>
            )}
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Past</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 280px))",
              gap: 14,
              justifyContent: "start",
            }}
          >
            {finishedTrips.length > 0 ? finishedTrips.map((trip) => (
              <div key={trip.id || trip.name} className="card pad" style={{ minHeight: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{trip.name}</div>
                <div className="small" style={{ marginTop: 6 }}>{trip.location}</div>
                <div className="small">{trip.dates}</div>
                <div className="small" style={{ marginTop: 4 }}>Trip finished</div>
                <div style={{ height: 12 }} />
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <Link className="btn btnPrimary" href={`/trips/${encodeURIComponent(trip.id)}`}>View Trip</Link>
                  {canManageTrips && (
                    <button
                      className="btn"
                      type="button"
                      onClick={async () => {
                        try {
                          await archiveTrip(trip.id);
                          updateLocalTripStatus(trip.id, "archived");
                          setSubmitError("");
                        } catch (error) {
                          setSubmitError(error.message || "Unable to archive trip.");
                        }
                      }}
                    >
                      Archive
                    </button>
                  )}
                  {isAdminUser && (
                    <button
                      className="btn"
                      type="button"
                      onClick={() => handleDeleteTrip(trip.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )) : (
              <div className="small">No finished trips yet.</div>
            )}
          </div>
        </div>

        {canManageTrips && (
          <div>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>Archived</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 280px))",
                gap: 14,
                justifyContent: "start",
              }}
            >
              {archivedTrips.length > 0 ? archivedTrips.map((trip) => (
                <div key={trip.id || trip.name} className="card pad" style={{ minHeight: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{trip.name}</div>
                  <div className="small" style={{ marginTop: 6 }}>{trip.location}</div>
                  <div className="small">{trip.dates}</div>
                  <div style={{ height: 12 }} />
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <Link className="btn btnPrimary" href={`/trips/${encodeURIComponent(trip.id)}`}>View Trip</Link>
                    <button
                      className="btn"
                      type="button"
                      onClick={async () => {
                        try {
                          await unarchiveTrip(trip.id);
                          updateLocalTripStatus(trip.id, "active");
                          setSubmitError("");
                        } catch (error) {
                          setSubmitError(error.message || "Unable to unarchive trip.");
                        }
                      }}
                    >
                      Unarchive
                    </button>
                    {isAdminUser && (
                      <button
                        className="btn"
                        type="button"
                        onClick={() => handleDeleteTrip(trip.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <div className="small">No archived trips.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
