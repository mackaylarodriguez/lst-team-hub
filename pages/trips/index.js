import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import EmptyState from "@/components/EmptyState";
import Spinner from "@/components/Spinner";
import ConfirmModal from "@/components/ConfirmModal";
import { showToast } from "@/components/Toast";
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
  updateTripForCurrentUser,
} from "@/lib/trips";
import { listTripTeamMembers, saveTripTeamMembers } from "@/lib/tripTeamMembers";
import { isAdminRole, isManagerRole } from "@/lib/roles";
import { SITE_OPTIONS } from "@/lib/siteOptions";
import { resolveCanonicalSiteLabelForTrip } from "@/lib/siteMaterials";
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
    fundraisingGoalAmount: "",
    fundraisingUrl: "",
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
    tripFeeAmount: "",
    materialsFeeAmount: "",
    hasDeferredWorker: "no",
    hannoverHousingFeeAmount: "",
    domesticProjectFeeAmount: "",
    domesticFeeAmount: "",
    domesticMaterialsFeeAmount: "",
    teamMembers: [createEmptyTeamMember()],
  };
}

function formatDraftAmount(value) {
  return value === null || value === undefined || value === "" ? "" : String(value);
}

function buildTripDraftFromTrip(trip, teamMembers = []) {
  return {
    name: trip?.name || "",
    location: trip?.location || "",
    host: trip?.host || "",
    siteType: trip?.siteType || "",
    trainingTimelineType: trip?.trainingTimelineType || DEFAULT_TRAINING_TIMELINE_TYPE,
    projectType: trip?.projectType || "",
    projectLengthSummary: trip?.projectLengthSummary || "",
    extraTravelStatus: trip?.extraTravelStatus || "no",
    startDate: trip?.startDate || "",
    endDate: trip?.endDate || "",
    fundraisingGoalAmount: formatDraftAmount(trip?.fundraisingGoalAmount),
    tripFeeAmount: formatDraftAmount(trip?.tripFeeAmount),
    materialsFeeAmount: formatDraftAmount(trip?.materialsFeeAmount),
    hasDeferredWorker: trip?.hasDeferredWorker ? "yes" : "no",
    hannoverHousingFeeAmount: formatDraftAmount(trip?.hannoverHousingFeeAmount),
    domesticProjectFeeAmount: formatDraftAmount(trip?.domesticProjectFeeAmount),
    domesticFeeAmount: formatDraftAmount(trip?.domesticFeeAmount),
    domesticMaterialsFeeAmount: formatDraftAmount(trip?.domesticMaterialsFeeAmount),
    teamMembers:
      teamMembers.length > 0
        ? teamMembers.map((member) => ({
            id: member.id || "",
            firstName: member.firstName || "",
            lastName: member.lastName || "",
            email: member.email || "",
            startDate: member.startDate || "",
            endDate: member.endDate || "",
            fundraisingGoalAmount: formatDraftAmount(member.fundraisingGoalAmount),
            fundraisingUrl: String(member.fundraisingUrl || "").trim(),
          }))
        : [createEmptyTeamMember()],
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

function getTripCardTone(section) {
  if (section === "active") {
    return {
      label: "Active Team",
      chipClass: "tripCardChip tripCardChipActive",
      accentClass: "tripListCardAccent tripListCardAccentActive",
    };
  }

  if (section === "past") {
    return {
      label: "Past Team",
      chipClass: "tripCardChip tripCardChipPast",
      accentClass: "tripListCardAccent tripListCardAccentPast",
    };
  }

  return {
    label: "Archived Team",
    chipClass: "tripCardChip tripCardChipArchived",
    accentClass: "tripListCardAccent tripListCardAccentArchived",
  };
}

function renderMetricTile(label, value, toneClass) {
  return (
    <div className={`tripMetricTile ${toneClass}`}>
      <div className="tripMetricLabel">{label}</div>
      <div className="tripMetricValue">{value}</div>
    </div>
  );
}

function renderTripCard({
  trip,
  section,
  canManageTrips,
  isAdminUser,
  tripMetricsById,
  confirmingDeleteTripId,
  setConfirmingDeleteTripId,
  handleDeleteTrip,
  updateLocalTripStatus,
  setSubmitError,
  handleStartEditTrip,
}) {
  const tone = getTripCardTone(section);
  const tripMetrics = tripMetricsById[trip.id] || {};
  const countdownLabel =
    section === "past" ? "Trip finished" : section === "archived" ? "Archived" : getCountdownLabel(trip.start, trip.end);

  return (
    <div key={trip.id || trip.name} className="card pad tripListCard">
      <div className={tone.accentClass} />
      <div className="tripCardEyebrowRow">
        <span className={tone.chipClass}>{tone.label}</span>
        <div className="tripCardHeaderActions">
          <span className="tripCardMiniMeta">{trip.projectType || trip.siteType || "Trip"}</span>
          {canManageTrips ? (
            <button
              className="tripCardEditButton"
              type="button"
              onClick={() => {
                void handleStartEditTrip(trip);
              }}
              title="Open trip to edit"
              aria-label={`Edit ${trip.name}`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 20h4l9.8-9.8-4-4L4 16v4Zm12.7-14.5 1.8-1.8a1.3 1.3 0 0 1 1.8 0l.9.9a1.3 1.3 0 0 1 0 1.8l-1.8 1.8-2.7-2.7Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      <div className="tripCardTitle">{trip.name}</div>
      <div className="tripCardMetaStack">
        <div className="tripCardMetaLine">
          <span className="tripCardMetaLabel">Site</span>
          <span>
            {resolveCanonicalSiteLabelForTrip(trip.location, []) ||
              trip.location ||
              "Site coming soon"}
          </span>
        </div>
        <div className="tripCardMetaLine">
          <span className="tripCardMetaLabel">Dates</span>
          <span>{trip.dates || "Dates to be confirmed"}</span>
        </div>
      </div>
      <div className="tripCardCountdown">{countdownLabel}</div>
      {canManageTrips ? (
        <div className="tripMetricsGrid">
          {renderMetricTile("Workers", tripMetrics.workerCount || 0, "tripMetricTilePrimary")}
          {renderMetricTile("Training", `${tripMetrics.trainingPercent || 0}%`, "tripMetricTileSky")}
          {renderMetricTile("Tasks", `${tripMetrics.taskPercent || 0}%`, "tripMetricTileGold")}
        </div>
      ) : null}
      <div style={{ height: 12 }} />
      <div className="row tripCardActionRow" style={{ gap: 8, flexWrap: "wrap" }}>
        <Link
          className="btn btnPrimary tripCardActionButton"
          href={`/trips/${encodeURIComponent(trip.id)}`}
        >
          View Trip
        </Link>
        {canManageTrips && section !== "archived" && (
          <button
            className="btn tripCardActionButton"
            type="button"
            onClick={async () => {
              try {
                await archiveTrip(trip.id);
                updateLocalTripStatus(trip.id, "archived");
                setSubmitError("");
              } catch (error) {
                const msg = error.message || "Unable to archive trip.";
                setSubmitError(msg);
                showToast(msg, "error");
              }
            }}
          >
            Archive
          </button>
        )}
        {canManageTrips && section === "archived" && (
          <button
            className="btn tripCardActionButton"
            type="button"
            onClick={async () => {
              try {
                await unarchiveTrip(trip.id);
                updateLocalTripStatus(trip.id, "active");
                setSubmitError("");
              } catch (error) {
                const msg = error.message || "Unable to unarchive trip.";
                setSubmitError(msg);
                showToast(msg, "error");
              }
            }}
          >
            Unarchive
          </button>
        )}
        {isAdminUser && (
          <button
            className="btn tripCardActionButton"
            type="button"
            onClick={() => {
              if (confirmingDeleteTripId === trip.id) {
                void handleDeleteTrip(trip.id);
                return;
              }
              setConfirmingDeleteTripId(trip.id);
            }}
          >
            {confirmingDeleteTripId === trip.id ? "Confirm Delete" : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
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
  const [confirmingDeleteTripId, setConfirmingDeleteTripId] = useState("");
  const [editingTripId, setEditingTripId] = useState("");
  const [isLoadingTripForm, setIsLoadingTripForm] = useState(false);
  const [useIndividualFundraisingAmounts, setUseIndividualFundraisingAmounts] = useState(false);

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
    setEditingTripId("");
    setIsLoadingTripForm(false);
    setIsCustomSiteInput(false);
    setUseIndividualFundraisingAmounts(false);
    setTripDraft(createInitialTripDraft());
    setSubmitError("");
  }

  useEffect(() => {
    if (!showTripForm) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") handleCancelTripForm();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showTripForm]);

  async function handleSubmitTrip(event) {
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
      if (editingTripId) {
        const updatedTrip = await updateTripForCurrentUser({
          tripId: editingTripId,
          ...tripDraft,
        });
        await saveTripTeamMembers(editingTripId, tripDraft.teamMembers || []);

        setTrips((current) =>
          current.map((trip) =>
            String(trip.id) === String(editingTripId) ? { ...trip, ...updatedTrip } : trip
          )
        );
        handleCancelTripForm();
        return;
      }

      const trip = await createTripForCurrentUser(tripDraft);
      handleCancelTripForm();
      router.push(`/trips/${trip.id}`);
    } catch (error) {
      const msg = error.message || (editingTripId ? "Unable to update trip." : "Unable to create trip.");
      setSubmitError(msg);
      showToast(msg, "error");
    }
  }

  async function handleStartEditTrip(trip) {
    if (!trip?.id) return;

    try {
      setIsLoadingTripForm(true);
      setSubmitError("");
      setShowTripForm(true);
      setEditingTripId(trip.id);
      const teamMembers = await listTripTeamMembers(trip.id);
      setTripDraft(buildTripDraftFromTrip(trip, teamMembers));
      setUseIndividualFundraisingAmounts(
        (teamMembers || []).some(
          (m) => m?.fundraisingGoalAmount != null && String(m.fundraisingGoalAmount).trim() !== ""
        )
      );
      setIsCustomSiteInput(Boolean(trip?.location) && !siteOptions.includes(String(trip.location || "").trim()));
    } catch (error) {
      console.error("Unable to load trip for editing", error);
      setSubmitError(error.message || "Unable to load trip details.");
      setShowTripForm(false);
      setEditingTripId("");
    } finally {
      setIsLoadingTripForm(false);
    }
  }

  async function handleDeleteTrip(tripId) {
    try {
      await deleteTrip(tripId);
      setConfirmingDeleteTripId("");
      if (String(editingTripId) === String(tripId)) {
        handleCancelTripForm();
      }
      setTrips((current) => current.filter((trip) => String(trip.id) !== String(tripId)));
      setSubmitError("");
    } catch (error) {
      const msg = error.message || "Unable to delete trip.";
      setSubmitError(msg);
      showToast(msg, "error");
      setConfirmingDeleteTripId("");
    }
  }

  function updateLocalTripStatus(tripId, status) {
    setTrips((current) =>
      current.map((trip) =>
        String(trip.id) === String(tripId) ? { ...trip, status } : trip
      )
    );
  }

  const tripToDelete = confirmingDeleteTripId ? trips.find((t) => String(t.id) === String(confirmingDeleteTripId)) : null;

  return (
    <Shell>
      <ConfirmModal
        open={!!confirmingDeleteTripId}
        title="Delete trip?"
        message={tripToDelete ? `"${tripToDelete.name || "This trip"}" will be permanently removed. This cannot be undone.` : "This trip will be permanently removed. This cannot be undone."}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (confirmingDeleteTripId) void handleDeleteTrip(confirmingDeleteTripId);
        }}
        onCancel={() => setConfirmingDeleteTripId("")}
      />
      <div className="row" style={{ marginBottom: 14 }}>
        <div>
          <div className="appSectionBadge" style={{ marginBottom: 6 }}>Trips</div>
          <h1 className="h1" style={{ marginBottom: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <AppIcon name="spark" className="pageEyebrowIcon" />
            <span>Trip Dashboard</span>
          </h1>
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

              setEditingTripId("");
              setShowTripForm(true);
            }}
          >
            {showTripForm ? "Close" : "Add Trip"}
          </button>
        )}
      </div>

      {canManageTrips && showTripForm && (
        <div
          className="appModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label={editingTripId ? "Edit trip" : "Create trip"}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.45)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 50,
          }}
        >
          <div className="card pad appModalCard" style={{ width: "min(980px, 100%)", maxHeight: "90vh", overflow: "auto" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>{editingTripId ? "Edit Trip" : "Create Trip"}</div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={handleCancelTripForm}>
                Close
              </button>
            </div>
            <div className="small" style={{ marginBottom: 16 }}>
              {editingTripId
                ? "Update trip details, roster, and delete the trip from this form."
                : "Create a team, save the roster, and assign the trip to your account."}
            </div>

            {isLoadingTripForm ? (
            <div className="row" style={{ alignItems: "center", gap: 12 }}>
              <Spinner size={28} />
              <span className="small">Loading trip details...</span>
            </div>
          ) : (
          <form onSubmit={handleSubmitTrip} style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                border: "1px solid rgba(18, 16, 12, 0.08)",
                borderRadius: 18,
                padding: 16,
                background: "rgba(255,255,255,.78)",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Trip Basics</div>
              <div className="small" style={{ marginBottom: 12 }}>
                Start with the high-level team details everyone uses to recognize this trip.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
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
              </div>
            </div>

            <div
              style={{
                border: "1px solid rgba(18, 16, 12, 0.08)",
                borderRadius: 18,
                padding: 16,
                background: "rgba(255,255,255,.78)",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Project Setup</div>
              <div className="small" style={{ marginBottom: 12 }}>
                Dates, training timeline, and project settings that shape the rest of the workspace.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
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
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="small" style={{ marginBottom: 6 }}>Length of Projects</div>
                  <input
                    className="input"
                    value={tripDraft.projectLengthSummary}
                    onChange={(event) => updateTripDraft("projectLengthSummary", event.target.value)}
                    placeholder="6 weeks, with a 3-week subgroup"
                  />
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
              </div>
            </div>

            <div
              style={{
                border: "1px solid rgba(18, 16, 12, 0.08)",
                borderRadius: 18,
                padding: 16,
                background: "rgba(255,255,255,.78)",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Team Members</div>
              <div className="small" style={{ marginBottom: 10 }}>
                Add first name, last name, and email now. Per-person dates let shorter subteams stay under the same trip.
              </div>
              <div className="small" style={{ marginBottom: 10 }}>
                This saves the roster. It does not create Supabase login accounts by itself. You can add each
                person&apos;s Neon fundraising link now — no worker login required.
              </div>
              <label className="row" style={{ alignItems: "center", gap: 8, marginBottom: 10 }}>
                <input
                  type="checkbox"
                  checked={useIndividualFundraisingAmounts}
                  onChange={(e) => setUseIndividualFundraisingAmounts(e.target.checked)}
                />
                <span className="small">Use individual fundraising amounts (different goal per person)</span>
              </label>
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
                        {useIndividualFundraisingAmounts ? (
                          <div>
                            <div className="small" style={{ marginBottom: 6 }}>Fundraising goal</div>
                            <input
                              className="input"
                              type="number"
                              min="0"
                              step="1"
                              value={member.fundraisingGoalAmount ?? ""}
                              onChange={(event) => updateTeamMember(index, "fundraisingGoalAmount", event.target.value)}
                              placeholder="Optional"
                            />
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <div className="small" style={{ marginBottom: 6 }}>Personal Neon fundraising link</div>
                        <input
                          className="input"
                          type="url"
                          inputMode="url"
                          value={member.fundraisingUrl || ""}
                          onChange={(event) => updateTeamMember(index, "fundraisingUrl", event.target.value)}
                          placeholder="https://… (optional; works before they have an account)"
                        />
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
            <div
              style={{
                border: "1px solid rgba(18, 16, 12, 0.08)",
                borderRadius: 18,
                padding: 16,
                background: "rgba(255,255,255,.78)",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Fundraising & Fees</div>
              <div className="small" style={{ marginBottom: 12 }}>
                Optional fundraising targets and trip costs. Leave anything blank that does not apply.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
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
              </div>
            </div>
            {submitError && (
              <div className="row" style={{ alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <span className="small" style={{ color: "var(--danger)" }}>{submitError}</span>
                <button type="button" className="btn btnPrimary" onClick={() => handleSubmitTrip({ preventDefault: () => {} })}>
                  Try again
                </button>
              </div>
            )}
            <div className="row">
              <button className="btn btnPrimary" type="submit">
                {editingTripId ? "Save Trip" : "Create Trip"}
              </button>
              <button className="btn" type="button" onClick={handleCancelTripForm}>
                Cancel
              </button>
              {editingTripId && canManageTrips ? (
                <button
                  className="btn btnDanger"
                  type="button"
                  onClick={() => setConfirmingDeleteTripId(editingTripId)}
                >
                  Delete Trip
                </button>
              ) : null}
            </div>
          </form>
          )}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 24 }}>
        <div>
          <div className="sectionHeader">
            <div className="sectionHeaderMain">
              <div className="sectionTitleRow">
                <AppIcon name="active" className="sectionHeaderIcon" />
                <div className="sectionTitle">Active</div>
                <span className="badge">{activeTrips.length}</span>
              </div>
            </div>
          </div>
          <div className="tripListGrid">
            {activeTrips.map((trip) =>
              renderTripCard({
                trip,
                section: "active",
                canManageTrips,
                isAdminUser,
                tripMetricsById,
                confirmingDeleteTripId,
                setConfirmingDeleteTripId,
                handleDeleteTrip,
                updateLocalTripStatus,
                setSubmitError,
                handleStartEditTrip,
              })
            )}
            {activeTrips.length === 0 && (
              <EmptyState
                icon="active"
                title="No active trips yet"
                description="Once a team is created and active, it will show up here with its latest progress."
              />
            )}
          </div>
        </div>

        <div>
          <div className="sectionHeader">
            <div className="sectionHeaderMain">
              <div className="sectionTitleRow">
                <AppIcon name="past" className="sectionHeaderIcon" />
                <div className="sectionTitle">Past</div>
                <span className="badge">{finishedTrips.length}</span>
              </div>
            </div>
          </div>
          <div className="tripListGrid">
            {finishedTrips.length > 0 ? finishedTrips.map((trip) =>
              renderTripCard({
                trip,
                section: "past",
                canManageTrips,
                isAdminUser,
                tripMetricsById,
                confirmingDeleteTripId,
                setConfirmingDeleteTripId,
                handleDeleteTrip,
                updateLocalTripStatus,
                setSubmitError,
                handleStartEditTrip,
              })
            ) : (
              <EmptyState
                icon="past"
                title="No finished trips yet"
                description="Completed trips will land here once their dates have passed."
              />
            )}
          </div>
        </div>

        {canManageTrips && (
          <div>
            <div className="sectionHeader">
              <div className="sectionHeaderMain">
                <div className="sectionTitleRow">
                  <AppIcon name="archived" className="sectionHeaderIcon" />
                  <div className="sectionTitle">Archived</div>
                  <span className="badge">{archivedTrips.length}</span>
                </div>
              </div>
            </div>
            <div className="tripListGrid">
              {archivedTrips.length > 0 ? archivedTrips.map((trip) =>
                renderTripCard({
                  trip,
                  section: "archived",
                  canManageTrips,
                  isAdminUser,
                  tripMetricsById,
                  confirmingDeleteTripId,
                  setConfirmingDeleteTripId,
                  handleDeleteTrip,
                  updateLocalTripStatus,
                  setSubmitError,
                  handleStartEditTrip,
                })
              ) : (
                <EmptyState
                  icon="archived"
                  title="No archived trips"
                  description="Archived teams will show up here when you move them out of the active workflow."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
