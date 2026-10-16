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
import { isNonTravelingLeaderMember, listTripTeamMembers } from "@/lib/tripTeamMembers";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  ADMIN_ACTIVITY_DAYS_OPTIONS,
  listAdminActivityDashboard,
} from "@/lib/adminActivity";
import { WEEKLY_TASK_DIGEST_STAFF } from "@/lib/weeklyTaskDigestStaff";

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

function emailKindLabel(kind) {
  return kind === "weekly_tasks" ? "Staff tasks" : "Worker weekly";
}

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
  const [weeklyTasksStaffKey, setWeeklyTasksStaffKey] = useState(WEEKLY_TASK_DIGEST_STAFF[0].key);
  const [weeklyWorkerEmail, setWeeklyWorkerEmail] = useState("");
  const [weeklyWorkerOptions, setWeeklyWorkerOptions] = useState([]);
  const [emailSchedule, setEmailSchedule] = useState(null);
  const [emailScheduleError, setEmailScheduleError] = useState("");
  const [emailScheduleLoading, setEmailScheduleLoading] = useState(false);
  const [emailScheduleTick, setEmailScheduleTick] = useState(0);

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
      const ownDigestEntry = WEEKLY_TASK_DIGEST_STAFF.find(
        (staff) => staff.email === String(nextSession.email || "").trim().toLowerCase()
      );
      if (ownDigestEntry) setWeeklyTasksStaffKey(ownDigestEntry.key);
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

  useEffect(() => {
    const selectedTrip = trips.find((trip) => trip.id === emailTestTripId);
    const selectedTripArchived = String(selectedTrip?.status || "").toLowerCase() === "archived";
    if (!session || !emailTestTripId || selectedTripArchived) {
      setWeeklyWorkerOptions([]);
      setWeeklyWorkerEmail("");
      return;
    }

    let cancelled = false;

    async function loadWorkers() {
      try {
        const members = await listTripTeamMembers(emailTestTripId);
        if (cancelled) return;
        const seen = new Set();
        const options = (members || [])
          .filter((member) => member?.email && !isNonTravelingLeaderMember(member))
          .map((member) => ({
            email: String(member.email).trim().toLowerCase(),
            label: member.name || member.email,
          }))
          .filter((option) => {
            if (!option.email || seen.has(option.email)) return false;
            seen.add(option.email);
            return true;
          })
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
        setWeeklyWorkerOptions(options);
        setWeeklyWorkerEmail((current) =>
          options.some((option) => option.email === current) ? current : options[0]?.email || ""
        );
      } catch (error) {
        console.error("Unable to load workers for weekly email test", error);
        if (!cancelled) {
          setWeeklyWorkerOptions([]);
          setWeeklyWorkerEmail("");
        }
      }
    }

    loadWorkers();

    return () => {
      cancelled = true;
    };
  }, [emailTestTripId, session, trips]);

  const sendTestEmail = useCallback(
    async (template) => {
      const isWeeklyTasks = template === "weekly_tasks";
      const isWeeklyWorker = template === "weekly_worker";
      if (!emailTestTo) {
        setEmailTestStatus("Enter a test email address.");
        return;
      }
      if (isWeeklyWorker && !weeklyWorkerEmail) {
        setEmailTestStatus("Pick a trip and a worker to preview.");
        return;
      }
      if (!isWeeklyTasks && !isWeeklyWorker && !emailTestTripId) {
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
            staffKey: weeklyTasksStaffKey,
            workerEmail: weeklyWorkerEmail,
          }),
        });

        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(result?.error || "Unable to send test email.");
        }

        const sentTo = result?.sentTo || emailTestTo;
        if (isWeeklyTasks) {
          const counts = `${result?.overdue ?? 0} overdue, ${result?.upcoming ?? 0} upcoming`;
          setEmailTestStatus(
            result?.wouldSkip
              ? `Weekly tasks test for ${result?.staffName} sent to ${sentTo}. They have no overdue or upcoming tasks, so the real email would be skipped.`
              : `Weekly tasks test for ${result?.staffName} (${counts}) sent to ${sentTo}.`
          );
          setEmailScheduleTick((tick) => tick + 1);
          return;
        }

        if (isWeeklyWorker) {
          setEmailTestStatus(
            result?.wouldSkip
              ? `Weekly worker test for ${result?.workerName} sent to ${sentTo}. ${result?.skipReason || "The real email would be skipped."}`
              : `Weekly worker test for ${result?.workerName} sent to ${sentTo} (${result?.tripCount ?? 0} trips, ${result?.meetingCount ?? 0} meetings, ${result?.trainingLeft ?? 0} training items left, ${result?.openTasks ?? 0} open tasks).`
          );
          setEmailScheduleTick((tick) => tick + 1);
          return;
        }

        const label =
          template === "worker_invite"
            ? "Worker invite"
            : template === "fundraising_ready"
              ? "Fundraising ready"
              : "Team lock";
        setEmailTestStatus(`${label} test sent to ${sentTo}.`);
      } catch (error) {
        console.error("Unable to send admin test email", error);
        setEmailTestStatus(error?.message || "Unable to send test email.");
      } finally {
        setEmailTestSending("");
      }
    },
    [emailTestTo, emailTestTripId, session, weeklyTasksStaffKey, weeklyWorkerEmail]
  );

  const loadEmailSchedule = useCallback(async () => {
    if (!session) return;

    setEmailScheduleLoading(true);
    setEmailScheduleError("");

    try {
      const supabase = getSupabaseClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not signed in.");

      const response = await fetch("/api/admin-weekly-emails", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Unable to load weekly emails.");
      }
      setEmailSchedule(result);
    } catch (error) {
      console.error("Unable to load weekly email schedule", error);
      setEmailSchedule(null);
      setEmailScheduleError(error?.message || "Unable to load weekly emails.");
    } finally {
      setEmailScheduleLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    loadEmailSchedule();
  }, [emailScheduleTick, loadEmailSchedule, session]);

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
                  {String(trip.status || "").toLowerCase() === "archived" ? " (archived)" : ""}
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
          <div className="adminEmailTestGrid adminEmailTestGridWeekly">
            <select
              className="input"
              value={weeklyTasksStaffKey}
              onChange={(event) => setWeeklyTasksStaffKey(event.target.value)}
              aria-label="Whose tasks to preview in the weekly email"
            >
              {WEEKLY_TASK_DIGEST_STAFF.map((staff) => (
                <option key={staff.key} value={staff.key}>
                  Weekly tasks email: {staff.firstName}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn"
              disabled={!emailTestTo || !!emailTestSending}
              onClick={() => void sendTestEmail("weekly_tasks")}
            >
              {emailTestSending === "weekly_tasks" ? "Sending…" : "Test weekly tasks"}
            </button>
          </div>
          <div className="adminEmailTestGrid adminEmailTestGridWeekly">
            <select
              className="input"
              value={weeklyWorkerEmail}
              onChange={(event) => setWeeklyWorkerEmail(event.target.value)}
              aria-label="Whose weekly worker email to preview"
              disabled={!weeklyWorkerOptions.length}
            >
              {weeklyWorkerOptions.length ? (
                weeklyWorkerOptions.map((worker) => (
                  <option key={worker.email} value={worker.email}>
                    Weekly worker email: {worker.label}
                  </option>
                ))
              ) : (
                <option value="">
                  {String(trips.find((trip) => trip.id === emailTestTripId)?.status || "").toLowerCase() ===
                  "archived"
                    ? "Archived trips do not get the weekly email"
                    : emailTestTripId
                      ? "No workers on this trip"
                      : "Pick a trip to choose a worker"}
                </option>
              )}
            </select>
            <button
              type="button"
              className="btn"
              disabled={!emailTestTo || !weeklyWorkerEmail || !!emailTestSending}
              onClick={() => void sendTestEmail("weekly_worker")}
            >
              {emailTestSending === "weekly_worker" ? "Sending…" : "Test weekly worker email"}
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
            <button
              className="btn"
              type="button"
              onClick={() => {
                loadDashboard();
                loadEmailSchedule();
              }}
              disabled={isLoading || emailScheduleLoading}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="card pad adminActivitySection">
          <h2 className="sectionTitle adminActivitySectionTitle">Weekly emails</h2>
          <p className="small" style={{ marginTop: 0 }}>
            Next send: {emailSchedule?.nextSend?.label || "Monday at 7:00 AM Central"}. Archived trips
            are left out.
          </p>
          {emailScheduleError ? <div className="adminActivityError">{emailScheduleError}</div> : null}
          {emailScheduleLoading && !emailSchedule ? (
            <div className="adminActivityLoading">
              <Spinner />
            </div>
          ) : (
            <>
              <h3 className="adminActivitySubsectionTitle">Scheduled</h3>
              {(emailSchedule?.scheduled || []).length ? (
                <div className="tableWrap">
                  <table className="table adminActivityStaffTable">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Who</th>
                        <th>Trips</th>
                        <th>Included</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailSchedule.scheduled.map((row) => (
                        <tr key={`${row.kind}:${row.email}`}>
                          <td>{emailKindLabel(row.kind)}</td>
                          <td>
                            {row.name || row.email}
                            {row.email ? <div className="small">{row.email}</div> : null}
                          </td>
                          <td>{(row.tripNames || []).join(", ") || "—"}</td>
                          <td>{row.detail || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="Nothing scheduled"
                  description="No worker or staff weekly email is queued. Archived trips are excluded."
                />
              )}

              <h3 className="adminActivitySubsectionTitle">Sent</h3>
              {(emailSchedule?.sent || []).length ? (
                <div className="tableWrap">
                  <table className="table adminActivityStaffTable">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Email</th>
                        <th>To</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailSchedule.sent.map((row) => (
                        <tr key={row.id || `${row.sentAt}:${row.email}:${row.subject}`}>
                          <td>{formatTimestamp(row.sentAt)}</td>
                          <td>
                            {emailKindLabel(row.kind)}
                            {row.source === "test" ? " · test" : ""}
                          </td>
                          <td>
                            {row.name || row.email}
                            {row.email ? <div className="small">{row.email}</div> : null}
                            {row.tripNames ? <div className="small">{row.tripNames}</div> : null}
                          </td>
                          <td>{row.status || "sent"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No weekly emails sent yet" />
              )}
              {emailSchedule?.missingTable ? (
                <p className="small">
                  Recent sends are read from the mail provider. Run supabase/hub_weekly_email_sends.sql
                  once so the Hub keeps its own history.
                </p>
              ) : null}
            </>
          )}
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
