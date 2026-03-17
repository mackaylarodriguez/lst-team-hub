import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { requireSession } from "@/lib/auth";
import { getTripForCurrentUser } from "@/lib/trips";
import { isManagerRole } from "@/lib/roles";
import { listTripActivity } from "@/lib/tripActivity";

function formatActivityTimestamp(value) {
  if (!value) return "";

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TripActivityPage() {
  const router = useRouter();
  const { tripId } = router.query;
  const [session, setSession] = useState(null);
  const [trip, setTrip] = useState(null);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!router.isReady) return;

    let cancelled = false;

    async function loadPage() {
      try {
        const nextSession = await requireSession(router);
        if (!nextSession || cancelled) return;

        if (!isManagerRole(nextSession.permissionRole || nextSession.role)) {
          router.replace(`/trips/${encodeURIComponent(tripId)}`);
          return;
        }

        setSession(nextSession);

        const nextTrip = await getTripForCurrentUser(tripId);
        if (cancelled) return;
        setTrip(nextTrip);

        const nextActivity = await listTripActivity(tripId);
        if (cancelled) return;
        setActivity(nextActivity);
        setError("");
      } catch (loadError) {
        console.error("Unable to load trip activity page", loadError);
        if (!cancelled) {
          setError(loadError.message || "Unable to load trip activity.");
        }
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [router, router.isReady, tripId]);

  if (!router.isReady) {
    return <p>Loading...</p>;
  }

  return (
    <Shell>
      <div className="row" style={{ marginBottom: 12 }}>
        <div>
          <h1 className="h1" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <AppIcon name="active" className="pageEyebrowIcon" />
            <span>Recent Activity</span>
          </h1>
          <div className="small">{trip?.name || "Trip activity history"}</div>
        </div>
        <div className="spacer" />
        <Link className="btn" href={`/trips/${encodeURIComponent(tripId)}`}>
          Back to Trip
        </Link>
      </div>

      {error ? (
        <div className="card pad" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      ) : (
        <div className="card pad">
          <div className="row" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 900 }}>Full History</div>
            <div className="spacer" />
            {session ? <span className="badge">Staff only</span> : null}
          </div>

          {activity.length === 0 ? (
            <div className="small">No activity recorded yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {activity.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    paddingBottom: 12,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ lineHeight: 1.45 }}>{entry.message}</div>
                  <div className="small" style={{ marginTop: 4 }}>
                    {formatActivityTimestamp(entry.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
