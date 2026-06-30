import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import EmptyState from "@/components/EmptyState";
import Spinner from "@/components/Spinner";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import { ROLE_ADMIN } from "@/lib/roles";
import { listTripsForCurrentUser } from "@/lib/trips";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  ADMIN_ACTIVITY_DAYS_OPTIONS,
  listAdminActivityDashboard,
} from "@/lib/adminActivity";

const CATEGORY_OPTIONS = [
  { id: "all", label: "Everything" },
  { id: "staff_task", label: "Staff tasks" },
  { id: "misc_task", label: "Misc tasks" },
  { id: "recruiting", label: "Recruiting" },
  { id: "team_locked", label: "Teams locked" },
  { id: "team_created", label: "Teams created" },
  { id: "trip_event", label: "Trip activity" },
];

const CATEGORY_LABELS = {
  staff_task: "Staff task",
  misc_task: "Misc task",
  recruiting: "Recruiting",
  team_locked: "Team locked",
  team_created: "Team created",
  trip_event: "Trip event",
};

function formatTimestamp(value) {
  if (!value) return "Unknown time";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminActivityPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [days, setDays] = useState(5);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [trips, setTrips] = useState([]);
  const [emailTestTripId, setEmailTestTripId] = useState("");
  const [emailTestTo, setEmailTestTo] = useState("");
  const [emailTestStatus, setEmailTestStatus] = useState("");
  const [emailTestSending, setEmailTestSending] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const nextSession = await requireSession(router);
      if (!nextSession || cancelled) return;

      if (nextSession.actualRole !== ROLE_ADMIN) {
        router.replace("/trips");
        return;
      }

      setSession(nextSession);
      setEmailTestTo(String(nextSession.email || "").trim());
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    async function loadTrips() {
      try {
        const nextTrips = await listTripsForCurrentUser();
        if (cancelled) return;
        setTrips(nextTrips || []);
        setEmailTestTripId((current) => current || nextTrips?.[0]?.id || "");
      } catch (error) {
        console.error("Unable to load trips for email test", error);
      }
    }

    loadTrips();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const sendTestEmail = useCallback(
    async (template) => {
      if (!emailTestTripId || !emailTestTo) {
        setEmailTestStatus("Pick a trip and enter a test email address.");
        return;
      }

      setEmailTestSending(template);
      setEmailTestStatus("");

      try {
        const supabase = getSupabaseClient();
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const token = sessionData?.session?.access_token;
        if (!token) {
          throw new Error("Not signed in.");
        }

        const response = await fetch("/api/admin-email-test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            template,
            tripId: emailTestTripId,
            testEmail: emailTestTo,
            senderName: session?.name || session?.email || "LST staff",
          }),
        });

        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(result?.error || "Unable to send test email.");
        }

        const label = template === "worker_invite" ? "Worker invite" : "Team lock";
        setEmailTestStatus(`${label} test sent to ${result?.sentTo || emailTestTo}.`);
      } catch (error) {
        console.error("Unable to send admin test email", error);
        setEmailTestStatus(error?.message || "Unable to send test email.");
      } finally {
        setEmailTestSending("");
      }
    },
    [emailTestTo, emailTestTripId, session]
  );

  const loadDashboard = useCallback(async () => {
    if (!session) return;

    setIsLoading(true);
    setLoadError("");

    try {
      const nextDashboard = await listAdminActivityDashboard({ days });
      setDashboard(nextDashboard);
    } catch (error) {
      console.error("Unable to load admin activity dashboard", error);
      setDashboard(null);
      setLoadError(error?.message || "Unable to load activity feed.");
    } finally {
      setIsLoading(false);
    }
  }, [days, session]);

  useEffect(() => {
    if (!session) return;
    loadDashboard();
  }, [loadDashboard, session]);

  const filteredEvents = useMemo(() => {
    const events = dashboard?.events || [];
    if (categoryFilter === "all") return events;
    return events.filter((event) => event.category === categoryFilter);
  }, [categoryFilter, dashboard?.events]);

  const summary = dashboard?.summary || {
    totalEvents: 0,
    recruitingActions: 0,
    staffTaskCompletions: 0,
    staffTaskUpdates: 0,
    miscTaskUpdates: 0,
    tripEvents: 0,
    teamsCreated: 0,
    teamsLocked: 0,
  };

  if (!session) {
    return (
      <Shell>
        <div className="adminActivityLoading">
          <Spinner />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="adminActivityPage">
        <h1 className="h1" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AppIcon name="spark" className="pageEyebrowIcon" />
          <span>Admin Activity</span>
        </h1>

        <div className="card pad adminActivityToolbar">
          <div className="adminEmailTestGrid">
            <select
              className="input"
              value={emailTestTripId}
              onChange={(event) => setEmailTestTripId(event.target.value)}
              aria-label="Trip for email test"
            >
              <option value="">Trip for email test…</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name}
                  {trip.location ? ` — ${trip.location}` : ""}
                </option>
              ))}
            </select>
            <input
              className="input"
              type="email"
              value={emailTestTo}
              onChange={(event) => setEmailTestTo(event.target.value)}
              placeholder="Test email"
              aria-label="Test email recipient"
            />
            <button
              type="button"
              className="btn btnPrimary"
              disabled={!emailTestTripId || !emailTestTo || !!emailTestSending}
              onClick={() => void sendTestEmail("worker_invite")}
            >
              {emailTestSending === "worker_invite" ? "Sending…" : "Test invite"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!emailTestTripId || !emailTestTo || !!emailTestSending}
              onClick={() => void sendTestEmail("team_lock")}
            >
              {emailTestSending === "team_lock" ? "Sending…" : "Test lock email"}
            </button>
          </div>
          {emailTestStatus ? <div className="small adminActivityToolbarStatus">{emailTestStatus}</div> : null}

          <div className="adminActivityToolbarRow">
            <div className="adminActivityPillRow">
              {ADMIN_ACTIVITY_DAYS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`btn ${days === option ? "btnPrimary" : ""}`}
                  onClick={() => setDays(option)}
                >
                  {option}d
                </button>
              ))}
            </div>
            <select
              className="input adminActivityFilterSelect"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filter activity feed"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="btn" type="button" onClick={loadDashboard} disabled={isLoading}>
              Refresh
            </button>
          </div>
        </div>

        {loadError ? <div className="card pad adminActivityError">{loadError}</div> : null}

        {isLoading ? (
          <div className="adminActivityLoading">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="adminActivitySummaryGrid">
              <div className="card pad adminActivitySummaryCard">
                <div className="adminActivitySummaryValue">{summary.totalEvents}</div>
                <div className="small">Events</div>
              </div>
              <div className="card pad adminActivitySummaryCard">
                <div className="adminActivitySummaryValue">{summary.staffTaskCompletions}</div>
                <div className="small">Tasks done</div>
              </div>
              <div className="card pad adminActivitySummaryCard">
                <div className="adminActivitySummaryValue">{summary.recruitingActions}</div>
                <div className="small">Recruiting</div>
              </div>
              <div className="card pad adminActivitySummaryCard">
                <div className="adminActivitySummaryValue">{summary.teamsLocked}</div>
                <div className="small">Locked</div>
              </div>
              <div className="card pad adminActivitySummaryCard">
                <div className="adminActivitySummaryValue">{summary.teamsCreated}</div>
                <div className="small">Created</div>
              </div>
              <div className="card pad adminActivitySummaryCard">
                <div className="adminActivitySummaryValue">{summary.tripEvents}</div>
                <div className="small">Trip logs</div>
              </div>
            </div>

            <div className="card pad adminActivitySection">
              <h2 className="sectionTitle adminActivitySectionTitle">Staff activity</h2>

              {(dashboard?.staffBreakdown || []).length ? (
                <div className="tableWrap">
                  <table className="table adminActivityStaffTable">
                    <thead>
                      <tr>
                        <th>Staff</th>
                        <th>Total</th>
                        <th>Recruiting</th>
                        <th>Staff tasks</th>
                        <th>Misc</th>
                        <th>Done</th>
                        <th>Locked</th>
                        <th>Trip logs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.staffBreakdown.map((row) => (
                        <tr key={row.email || row.name}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{row.name}</div>
                            {row.email ? <div className="small">{row.email}</div> : null}
                          </td>
                          <td>{row.total}</td>
                          <td>{row.recruiting}</td>
                          <td>{row.staffTasks}</td>
                          <td>{row.miscTasks}</td>
                          <td>{row.taskCompletions}</td>
                          <td>{row.teamsLocked}</td>
                          <td>{row.tripEvents}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No staff activity" />
              )}
            </div>

            <div className="card pad adminActivitySection">
              <h2 className="sectionTitle adminActivitySectionTitle">
                Activity feed ({filteredEvents.length})
              </h2>

              {filteredEvents.length ? (
                <div className="adminActivityFeed">
                  {filteredEvents.map((event) => (
                    <div key={event.id} className="adminActivityFeedRow">
                      <div className="adminActivityFeedMeta">
                        <span className={`adminActivityBadge adminActivityBadge-${event.category}`}>
                          {CATEGORY_LABELS[event.category] || event.category}
                        </span>
                        <span className="adminActivityTimestamp">{formatTimestamp(event.timestamp)}</span>
                      </div>
                      <div className="adminActivityFeedTitle">{event.title}</div>
                      <div className="adminActivityFeedActor">
                        {event.actorName}
                        {event.actorEmail ? ` · ${event.actorEmail}` : ""}
                      </div>
                      {event.detail ? <div className="adminActivityFeedDetail">{event.detail}</div> : null}
                      {event.tripId ? (
                        <div className="adminActivityFeedLinks">
                          <Link href={`/trips/${encodeURIComponent(event.tripId)}`}>
                            Open trip{event.tripName ? `: ${event.tripName}` : ""}
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No events" />
              )}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
