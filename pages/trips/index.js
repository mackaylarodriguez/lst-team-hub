import Shell from "@/components/Shell";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { requireSession } from "@/lib/auth";
import { SAMPLE } from "@/lib/sampleData";

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
  const session = useMemo(() => null, []);
  useEffect(() => { requireSession(router); }, [router]);

  const { activeTrips, finishedTrips } = useMemo(() => {
    const today = startOfToday();
    const grouped = SAMPLE.trips.map((trip) => {
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
  }, []);

  return (
    <Shell>
      <div className="row" style={{ marginBottom: 14 }}>
        <div>
          <h1 className="h1">My Trips</h1>
          <p className="p">Everything you need for your team, in one place.</p>
        </div>
        <div className="spacer" />
        <span className="badge">Demo</span>
      </div>

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
