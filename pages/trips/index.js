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
import { SITE_OPTIONS } from "@/lib/siteOptions";
import { listStaffTripMetrics } from "@/lib/staffOverview";
import {
  DEFAULT_TRAINING_TIMELINE_TYPE,
  TRAINING_TIMELINE_OPTIONS,
} from "@/lib/workerTaskTemplate";

const CUSTOM_SITE_OPTION = "__custom__";
function createEmptyTeamMember() {
  return {
    firstName: "",
    lastName: "",
    email: "",
    startDate: "",
    endDate: "",
  };
}

function createInitialTripDraft() {
  return {
    name: "",
    location: "",
    host: "",
    siteType: "",
    trainingTimelineType: DEFAULT_TRAINING_TIMELINE_TYPE,
    projectType: "",
    projectLengthSummary: "",
    extraTravelStatus: "no",
    startDate: "",
    endDate: "",
    fundraisingGoalAmount: "",
    tripFeeAmount: "600",
    materialsFeeAmount: "250",
    hasDeferredWorker: "no",
    hannoverHousingFeeAmount: "600",
    domesticProjectFeeAmount: "",
    domesticFeeAmount: "",
    domesticMaterialsFeeAmount: "",
    teamMembers: [createEmptyTeamMember()],
  };
}

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
  const [isCustomSiteInput, setIsCustomSiteInput] = useState(false);
  const [tripDraft, setTripDraft] = useState(createInitialTripDraft);
  const [submitError, setSubmitError] = useState("");
  const [tripMetricsById, setTripMetricsById] = useState({});

  useEffect(() => {
    let cancelled = false;
    let activeSession = null;

    async function checkSession() {
      const session = await requireSession(router);
      if (cancelled || !session) return;
      activeSession = session;
      setSession(session);
      try {
        const assignedTrips = await listTripsForCurrentUser();
        if (!cancelled) {
          setTrips(assignedTrips);
          if (isManagerRole(session.permissionRole || session.role)) {
            setTripMetricsById(await listStaffTripMetrics());
          } else {
            setTripMetricsById({});
          }
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
          if (isManagerRole(activeSession?.permissionRole || activeSession?.role)) {
            setTripMetricsById(await listStaffTripMetrics());
          } else {
            setTripMetricsById({});
          }
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
  const siteOptions = useMemo(() => {
    const seen = new Set();
    const configured = (SITE_OPTIONS || [])
      .map((site) => String(site || "").trim())
      .filter(Boolean);
    const fromTrips = (trips || [])
      .map((trip) => String(trip.location || "").trim())
      .filter(Boolean);

    return [...configured, ...fromTrips]
      .filter((site) => {
        const key = site.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => left.localeCompare(right));
  }, [trips]);
  const selectedSiteValue = isCustomSiteInput ? CUSTOM_SITE_OPTION : tripDraft.location || "";

  function updateTripDraft(field, value) {
    setTripDraft((current) => ({ ...current, [field]: value }));
  }

  function updateTeamMember(index, field, value) {
    setTripDraft((current) => ({
      ...current,
      teamMembers: current.teamMembers.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member
      ),
    }));
  }

  function addTeamMemberRow() {
    setTripDraft((current) => ({
      ...current,
      teamMembers: [...current.teamMembers, createEmptyTeamMember()],
    }));
  }

  function removeTeamMemberRow(index) {
    setTripDraft((current) => ({
      ...current,
      teamMembers:
        current.teamMembers.length === 1
          ? [createEmptyTeamMember()]
          : current.teamMembers.filter((_, memberIndex) => memberIndex !== index),
    }));
  }

  function handleCancelTripForm() {
    setShowTripForm(false);
    setIsCustomSiteInput(false);
    setTripDraft(createInitialTripDraft());
    setSubmitError("");
  }

  async function handleCreateTrip(event) {
    event.preventDefault();
    setSubmitError("");

    if (!String(tripDraft.name || "").trim()) {
      setSubmitError("Team name is required.");
      return;
    }

    if (!String(tripDraft.location || "").trim()) {
      setSubmitError("Site is required.");
      return;
    }

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
            onClick={() => {
              if (showTripForm) {
                handleCancelTripForm();
                return;
              }

              setShowTripForm(true);
            }}
          >
            {showTripForm ? "Close" : "Add Trip"}
          </button>
        )}
      </div>

      {canManageTrips && showTripForm && (
        <div className="card pad" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Create Trip</div>
          <div className="small" style={{ marginBottom: 16 }}>
            Create a team, save the roster, and assign the trip to your account.
          </div>

          <form onSubmit={handleCreateTrip} style={{ display: "grid", gap: 12 }}>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Team Name</div>
              <input
                className="input"
                value={tripDraft.name}
                onChange={(event) => updateTripDraft("name", event.target.value)}
                placeholder="2026 Brazil Team"
              />
            </div>
            <div>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Team Members</div>
              <div className="small" style={{ marginBottom: 10 }}>
                Add first name, last name, and email now. Per-person dates let shorter subteams stay under the same trip.
              </div>
              <div className="small" style={{ marginBottom: 10 }}>
                This saves the roster. It does not create Supabase login accounts by itself.
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {tripDraft.teamMembers.map((member, index) => (
                  <div
                    key={`team-member-${index}`}
                    style={{
                      border: "1px solid rgba(18, 16, 12, 0.08)",
                      borderRadius: 14,
                      padding: 12,
                      background: "rgba(255,255,255,.72)",
                    }}
                  >
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                        <input
                          className="input"
                          value={member.firstName}
                          onChange={(event) => updateTeamMember(index, "firstName", event.target.value)}
                          placeholder="First name"
                        />
                        <input
                          className="input"
                          value={member.lastName}
                          onChange={(event) => updateTeamMember(index, "lastName", event.target.value)}
                          placeholder="Last name"
                        />
                        <input
                          className="input"
                          type="email"
                          value={member.email}
                          onChange={(event) => updateTeamMember(index, "email", event.target.value)}
                          placeholder="Email"
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Leave Date</div>
                          <input
                            className="input"
                            type="date"
                            value={member.startDate}
                            onChange={(event) => updateTeamMember(index, "startDate", event.target.value)}
                          />
                        </div>
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Return Date</div>
                          <input
                            className="input"
                            type="date"
                            value={member.endDate}
                            onChange={(event) => updateTeamMember(index, "endDate", event.target.value)}
                          />
                        </div>
                      </div>
                      <div className="row">
                        <div className="small" style={{ alignSelf: "center" }}>
                          Leave member dates blank to use the main project dates.
                        </div>
                        <div className="spacer" />
                        <button className="btn" type="button" onClick={() => removeTeamMemberRow(index)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn" type="button" onClick={addTeamMemberRow}>
                  Add Team Member
                </button>
              </div>
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Project Leave Date</div>
              <input
                className="input"
                type="date"
                value={tripDraft.startDate}
                onChange={(event) => updateTripDraft("startDate", event.target.value)}
              />
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Project Return Date</div>
              <input
                className="input"
                type="date"
                value={tripDraft.endDate}
                onChange={(event) => updateTripDraft("endDate", event.target.value)}
              />
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Site</div>
              <select
                className="input"
                value={selectedSiteValue}
                onChange={(event) => {
                  if (event.target.value === CUSTOM_SITE_OPTION) {
                    setIsCustomSiteInput(true);
                    updateTripDraft(
                      "location",
                      siteOptions.includes(tripDraft.location) ? "" : tripDraft.location
                    );
                    return;
                  }

                  setIsCustomSiteInput(false);
                  updateTripDraft("location", event.target.value);
                }}
              >
                <option value="">Select site</option>
                {siteOptions.map((site) => (
                  <option key={site} value={site}>
                    {site}
                  </option>
                ))}
                <option value={CUSTOM_SITE_OPTION}>Other site</option>
              </select>
              {selectedSiteValue === CUSTOM_SITE_OPTION ? (
                <input
                  className="input"
                  style={{ marginTop: 10 }}
                  value={tripDraft.location}
                  onChange={(event) => updateTripDraft("location", event.target.value)}
                  placeholder="Enter site"
                />
              ) : null}
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Host Name</div>
              <input
                className="input"
                value={tripDraft.host}
                onChange={(event) => updateTripDraft("host", event.target.value)}
                placeholder="Host name"
              />
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Site Type</div>
              <select
                className="input"
                value={tripDraft.siteType}
                onChange={(event) => updateTripDraft("siteType", event.target.value)}
              >
                <option value="">Select site type</option>
                <option value="partner">Partner</option>
                <option value="managed">Managed</option>
                <option value="seasonal">Seasonal</option>
              </select>
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Training Timeline</div>
              <select
                className="input"
                value={tripDraft.trainingTimelineType}
                onChange={(event) => updateTripDraft("trainingTimelineType", event.target.value)}
              >
                {TRAINING_TIMELINE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Length of Projects</div>
              <input
                className="input"
                value={tripDraft.projectLengthSummary}
                onChange={(event) => updateTripDraft("projectLengthSummary", event.target.value)}
                placeholder="6 weeks, with a 3-week subgroup"
              />
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Type of Project</div>
              <select
                className="input"
                value={tripDraft.projectType}
                onChange={(event) => updateTripDraft("projectType", event.target.value)}
              >
                <option value="">Select project type</option>
                <option value="LST">LST</option>
                <option value="YF">YF</option>
                <option value="TP">TP</option>
              </select>
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Extra Travel</div>
              <select
                className="input"
                value={tripDraft.extraTravelStatus}
                onChange={(event) => updateTripDraft("extraTravelStatus", event.target.value)}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
                <option value="maybe">Maybe</option>
              </select>
            </div>
            <div style={{ fontWeight: 900, marginTop: 4 }}>Funding & Fees</div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Fundraising Goal</div>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={tripDraft.fundraisingGoalAmount}
                onChange={(event) => updateTripDraft("fundraisingGoalAmount", event.target.value)}
                placeholder="Leave blank if not needed"
              />
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Fee</div>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={tripDraft.tripFeeAmount}
                onChange={(event) => updateTripDraft("tripFeeAmount", event.target.value)}
                placeholder="600"
              />
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Materials Fee</div>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={tripDraft.materialsFeeAmount}
                onChange={(event) => updateTripDraft("materialsFeeAmount", event.target.value)}
                placeholder="250"
              />
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Deferred Worker</div>
              <select
                className="input"
                value={tripDraft.hasDeferredWorker}
                onChange={(event) => updateTripDraft("hasDeferredWorker", event.target.value)}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Hannover Housing Fee</div>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={tripDraft.hannoverHousingFeeAmount}
                onChange={(event) => updateTripDraft("hannoverHousingFeeAmount", event.target.value)}
                placeholder="600"
              />
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Domestic Project</div>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={tripDraft.domesticProjectFeeAmount}
                onChange={(event) => updateTripDraft("domesticProjectFeeAmount", event.target.value)}
                placeholder="575"
              />
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Domestic Fee</div>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={tripDraft.domesticFeeAmount}
                onChange={(event) => updateTripDraft("domesticFeeAmount", event.target.value)}
                placeholder="300"
              />
            </div>
            <div>
              <div className="small" style={{ marginBottom: 6 }}>Domestic Materials Fee</div>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={tripDraft.domesticMaterialsFeeAmount}
                onChange={(event) => updateTripDraft("domesticMaterialsFeeAmount", event.target.value)}
                placeholder="225"
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
                {canManageTrips ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    <div style={{ padding: 8, borderRadius: 12, background: "rgba(47,73,147,.08)" }}>
                      <div className="small">Workers</div>
                      <div style={{ fontWeight: 900 }}>{tripMetricsById[trip.id]?.workerCount || 0}</div>
                    </div>
                    <div style={{ padding: 8, borderRadius: 12, background: "rgba(60,170,225,.10)" }}>
                      <div className="small">Training</div>
                      <div style={{ fontWeight: 900 }}>{tripMetricsById[trip.id]?.trainingPercent || 0}%</div>
                    </div>
                    <div style={{ padding: 8, borderRadius: 12, background: "rgba(249,157,42,.10)" }}>
                      <div className="small">Tasks</div>
                      <div style={{ fontWeight: 900 }}>{tripMetricsById[trip.id]?.taskPercent || 0}%</div>
                    </div>
                  </div>
                ) : null}
                <div style={{ height: 12 }} />
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <Link
                    className="btn btnPrimary"
                    href={`/trips/${encodeURIComponent(trip.id)}`}
                  >
                    View Trip
                  </Link>
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
                {canManageTrips ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    <div style={{ padding: 8, borderRadius: 12, background: "rgba(47,73,147,.08)" }}>
                      <div className="small">Workers</div>
                      <div style={{ fontWeight: 900 }}>{tripMetricsById[trip.id]?.workerCount || 0}</div>
                    </div>
                    <div style={{ padding: 8, borderRadius: 12, background: "rgba(60,170,225,.10)" }}>
                      <div className="small">Training</div>
                      <div style={{ fontWeight: 900 }}>{tripMetricsById[trip.id]?.trainingPercent || 0}%</div>
                    </div>
                    <div style={{ padding: 8, borderRadius: 12, background: "rgba(249,157,42,.10)" }}>
                      <div className="small">Tasks</div>
                      <div style={{ fontWeight: 900 }}>{tripMetricsById[trip.id]?.taskPercent || 0}%</div>
                    </div>
                  </div>
                ) : null}
                <div style={{ height: 12 }} />
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <Link
                    className="btn btnPrimary"
                    href={`/trips/${encodeURIComponent(trip.id)}`}
                  >
                    View Trip
                  </Link>
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
                  {canManageTrips ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      <div style={{ padding: 8, borderRadius: 12, background: "rgba(47,73,147,.08)" }}>
                        <div className="small">Workers</div>
                        <div style={{ fontWeight: 900 }}>{tripMetricsById[trip.id]?.workerCount || 0}</div>
                      </div>
                      <div style={{ padding: 8, borderRadius: 12, background: "rgba(60,170,225,.10)" }}>
                        <div className="small">Training</div>
                        <div style={{ fontWeight: 900 }}>{tripMetricsById[trip.id]?.trainingPercent || 0}%</div>
                      </div>
                      <div style={{ padding: 8, borderRadius: 12, background: "rgba(249,157,42,.10)" }}>
                        <div className="small">Tasks</div>
                        <div style={{ fontWeight: 900 }}>{tripMetricsById[trip.id]?.taskPercent || 0}%</div>
                      </div>
                    </div>
                  ) : null}
                  <div style={{ height: 12 }} />
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <Link
                      className="btn btnPrimary"
                      href={`/trips/${encodeURIComponent(trip.id)}`}
                    >
                      View Trip
                    </Link>
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
