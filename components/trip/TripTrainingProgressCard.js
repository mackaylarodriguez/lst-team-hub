import { useTripPage } from "./TripPageContext";

export default function TripTrainingProgressCard() {
  const {
    canViewTeamDashboard,
    currentTrainingProgress,
    overviewTrainingPct,
    visibleTrainingParticipants,
  } = useTripPage();

  return (
    <div className="card pad tripSectionCard tripTaskProgressCard" style={{ marginBottom: 16 }}>
      <div className="tripTaskProgressTop">
        <div className="cardSectionPill">Training progress</div>
        <span className="badge">{overviewTrainingPct}% complete</span>
      </div>
      <div className="progress tripTaskProgressBar">
        <div style={{ width: `${overviewTrainingPct}%` }} />
      </div>
      <div className="small tripTaskProgressMeta">
        {canViewTeamDashboard
          ? "Overall completion across all participant training checklists."
          : `${currentTrainingProgress?.completed || 0} of ${currentTrainingProgress?.total || 0} modules complete.`}
      </div>

      {canViewTeamDashboard ? (
        <div className="tripTaskProgressParticipants">
          {visibleTrainingParticipants.map((participant) => (
            <div
              key={`${participant.email}-training-summary`}
              className="tripTaskProgressParticipantRow"
            >
              <span className="tripTaskProgressParticipantName">{participant.name}</span>
              <div className="progress tripTaskProgressBarSmall">
                <div style={{ width: `${participant.percent}%` }} />
              </div>
              <span className="small tripTaskProgressParticipantStat">{participant.percent}%</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
