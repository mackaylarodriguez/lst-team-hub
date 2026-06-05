import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import EmptyState from "@/components/EmptyState";
import Spinner from "@/components/Spinner";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import { ROLE_ADMIN } from "@/lib/roles";
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

function formatWindowLabel(days) {
  return `Last ${days} day${days === 1 ? "" : "s"}`;
}

export default function AdminActivityPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [days, setDays] = useState(5);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [router]);

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
        <p className="p">
          Raw audit feed for the last few days — staff task work, recruiting moves, teams created, and teams locked.
          Only visible to your admin account.
        </p>

        <div className="adminActivityControls card pad">
          <div className="adminActivityControlGroup">
            <div className="small" style={{ fontWeight: 700, marginBottom: 8 }}>
              Time window
            </div>
            <div className="adminActivityPillRow">
              {ADMIN_ACTIVITY_DAYS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`btn ${days === option ? "btnPrimary" : ""}`}
                  onClick={() => setDays(option)}
                >
                  {formatWindowLabel(option)}
                </button>
              ))}
            </div>
          </div>

          <div className="adminActivityControlGroup">
            <div className="small" style={{ fontWeight: 700, marginBottom: 8 }}>
              Filter feed
            </div>
            <select
              className="input"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button className="btn" type="button" onClick={loadDashboard} disabled={isLoading}>
            Refresh
          </button>
        </div>

        {loadError ? (
          <div className="card pad adminActivityError">
            {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="adminActivityLoading">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="adminActivitySummaryGrid">
              <div className="card pad adminActivitySummaryCard">
                <div className="adminActivitySummaryValue">{summary.totalEvents}</div>
                <div className="small">Total events</div>
              </div>
              <div className="card pad adminActivitySummaryCard">
                <div className="adminActivitySummaryValue">{summary.staffTaskCompletions}</div>
                <div className="small">Staff tasks completed</div>
              </div>
              <div className="card pad adminActivitySummaryCard">
                <div className="adminActivitySummaryValue">{summary.recruitingActions}</div>
                <div className="small">Recruiting actions</div>
              </div>
              <div className="card pad adminActivitySummaryCard">
                <div className="adminActivitySummaryValue">{summary.teamsLocked}</div>
                <div className="small">Teams locked</div>
              </div>
              <div className="card pad adminActivitySummaryCard">
                <div className="adminActivitySummaryValue">{summary.teamsCreated}</div>
                <div className="small">Teams created</div>
              </div>
              <div className="card pad adminActivitySummaryCard">
                <div className="adminActivitySummaryValue">{summary.tripEvents}</div>
                <div className="small">Trip activity logs</div>
              </div>
            </div>

            <div className="card pad adminActivitySection">
              <div className="sectionTitleRow">
                <h2 className="sectionTitle">What staff are doing most</h2>
                <span className="small">{formatWindowLabel(days)}</span>
              </div>

              {(dashboard?.staffBreakdown || []).length ? (
                <div className="tableWrap">
                  <table className="table adminActivityStaffTable">
                    <thead>
                      <tr>
                        <th>Staff</th>
                        <th>Total</th>
                        <th>Recruiting</th>
                        <th>Staff tasks</th>
                        <th>Misc tasks</th>
                        <th>Completions</th>
                        <th>Teams locked</th>
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
                <EmptyState
                  title="No staff activity yet"
                  description={`Nothing logged in the last ${days} days.`}
                />
              )}
            </div>

            <div className="card pad adminActivitySection">
              <div className="sectionTitleRow">
                <h2 className="sectionTitle">Full activity feed</h2>
                <span className="small">
                  {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"}
                </span>
              </div>

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
                <EmptyState
                  title="No events in this filter"
                  description="Try another category or widen the time window."
                />
              )}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
