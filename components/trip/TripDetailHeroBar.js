import { useTripPage } from "./TripPageContext";
import { LEADER_PREVIEW_PARTICIPANT_ID } from "./tripPageShared";

/** Condensed trip name + completion bar — pinned above tabs on every trip view. */
export default function TripDetailHeroBar() {
  const {
    canManageTrips,
    countdownSummary,
    isPreviewingParticipant,
    isStaffPreviewingLeader,
    openDeleteTripConfirm,
    pct,
    previewParticipantId,
    setPreviewParticipantId,
    trip,
    workerPreviewOptions,
  } = useTripPage();

  if (!trip) return null;

  return (
    <div className="tripDetailHero card pad tripDetailHeroSlim">
      <div className="tripDetailHeroSlimInner">
        <div className="tripDetailHeroSlimTitleBlock">
          <h1 className="tripDetailHeroSlimTitle">{trip.name}</h1>
          <div className="tripDetailHeroSlimMeta">
            {trip.location} • {trip.dates}
          </div>
        </div>

        <div className="tripDetailHeroSlimProgress" aria-label={`Trip completion ${pct}%`}>
          <span className="tripDetailHeroSlimProgressLabel">Completion</span>
          <div className="progress tripDetailHeroSlimProgressBar">
            <div style={{ width: `${pct}%` }} />
          </div>
          <span className="tripDetailHeroSlimProgressPct">{pct}%</span>
        </div>

        <div className="tripDetailHeroSlimCountdown" title={countdownSummary.detail || undefined}>
          <span className="tripDetailHeroSlimCountdownValue">{countdownSummary.label}</span>
          {countdownSummary.detail ? (
            <span className="tripDetailHeroSlimCountdownDetail">{countdownSummary.detail}</span>
          ) : null}
        </div>

        {canManageTrips ? (
          <div className="tripDetailHeroSlimActions">
            <button
              className="btn btnDanger tripDetailHeroActionBtn"
              type="button"
              onClick={openDeleteTripConfirm}
            >
              Delete
            </button>
            <select
              className="input tripPagePreviewSelect tripDetailHeroPreviewSelect"
              value={previewParticipantId}
              onChange={(event) => setPreviewParticipantId(event.target.value)}
              aria-label="Preview trip as leader or worker"
            >
              <option value="">Staff view</option>
              <option value={LEADER_PREVIEW_PARTICIPANT_ID}>Leader preview</option>
              {workerPreviewOptions.length > 0 ? (
                <optgroup label="Worker preview">
                  {workerPreviewOptions.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
            {isStaffPreviewingLeader ? <span className="badge">Leader preview</span> : null}
            {isPreviewingParticipant ? <span className="badge">Worker preview</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
