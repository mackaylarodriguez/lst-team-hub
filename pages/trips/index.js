import Shell from "@/components/Shell";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import { addTrip, getTrips, TRIPS_UPDATED_EVENT } from "@/lib/sampleData";

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
    dates: "",
  });
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const session = await requireSession(router);
      if (cancelled || !session) return;
      setSession(session);
      setTrips(getTrips());
    }

    checkSession();

    function syncTrips() {
      if (!cancelled) {
        setTrips(getTrips());
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

  const { activeTrips, finishedTrips } = useMemo(() => {
    const today = startOfToday();
    const grouped = trips.map((trip) => {
      const { start, end } = parseTripDates(trip.dates);
      return { ...trip, start, end };
    });

    return {
      activeTrips: grouped
        .filter((trip) => !trip.end || trip.end >= today)
        .sort((a, b) => {
          if (!a.start) return 1;
          if (!b.start) return -1;
          return a.start - b.start;
        }),
      finishedTrips: grouped
        .filter((trip) => trip.end && trip.end < today)
        .sort((a, b) => {
          if (!a.end) return 1;
          if (!b.end) return -1;
          return b.end - a.end;
        }),
    };
  }, [trips]);

  const isStaff = session?.role === "staff";

  function updateTripDraft(field, value) {
    setTripDraft((current) => ({ ...current, [field]: value }));
  }

  function handleCancelTripForm() {
    setShowTripForm(false);
    setTripDraft({ name: "", location: "", dates: "" });
    setSubmitError("");
  }

  function handleCreateTrip(event) {
    event.preventDefault();
    setSubmitError("");

    try {
      const trip = addTrip({
        ...tripDraft,
        staffLead: session?.name || "",
        staffEmail: session?.email || "",
      });
      handleCancelTripForm();
      router.push(`/trips/${trip.id}`);
    } catch (error) {
      setSubmitError(error.message || "Unable to create trip.");
    }
  }

  return (
    <Shell>
      <div className="row" style={{ marginBottom: 14 }}>
        <div>
          <h1 className="h1">My Trips</h1>
          <p className="p">Everything you need for your team, in one place.</p>
        </div>
        <div className="spacer" />
        {isStaff && (
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

      {isStaff && showTripForm && (
        <div className="card pad" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Create Trip</div>
          <div className="small" style={{ marginBottom: 16 }}>
            This currently saves in the browser for the prototype. The next step is moving trips into Supabase so the whole team sees them.
          </div>

          <form onSubmit={handleCreateTrip} style={{ display: "grid", gap: 12 }}>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Trip Name</div>
              <input
                className="input"
                value={tripDraft.name}
                onChange={(event) => updateTripDraft("name", event.target.value)}
                placeholder="UT Austin - Brazil"
              />
            </div>
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
              <div className="small" style={{ marginBottom: 6 }}>Dates</div>
              <input
                className="input"
                value={tripDraft.dates}
                onChange={(event) => updateTripDraft("dates", event.target.value)}
                placeholder="June 12-27, 2026"
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
              <div key={trip.id} className="card pad" style={{ minHeight: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{trip.name}</div>
                <div className="small" style={{ marginTop: 6 }}>{trip.location}</div>
                <div className="small">{trip.dates}</div>
                <div className="small" style={{ marginTop: 4 }}>
                  {getCountdownLabel(trip.start, trip.end)}
                </div>
                <div style={{ height: 12 }} />
                <Link className="btn btnPrimary" href={`/trips/${trip.id}`}>View Trip</Link>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Finished</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 280px))",
              gap: 14,
              justifyContent: "start",
            }}
          >
            {finishedTrips.length > 0 ? finishedTrips.map((trip) => (
              <div key={trip.id} className="card pad" style={{ minHeight: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{trip.name}</div>
                <div className="small" style={{ marginTop: 6 }}>{trip.location}</div>
                <div className="small">{trip.dates}</div>
                <div className="small" style={{ marginTop: 4 }}>Trip finished</div>
                <div style={{ height: 12 }} />
                <Link className="btn btnPrimary" href={`/trips/${trip.id}`}>View Trip</Link>
              </div>
            )) : (
              <div className="small">No finished trips yet.</div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
