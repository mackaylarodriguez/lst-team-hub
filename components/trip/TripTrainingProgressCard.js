import { useTripPage } from "./TripPageContext";

export default function TripTrainingProgressCard() {
  const {
    canViewTeamDashboard,
    currentPrototypeTrainingProgress,
    overviewPrototypeTrainingPct,
    visiblePrototypeTrainingParticipants,
  } = useTripPage();

  const progressPct = overviewPrototypeTrainingPct;
  const currentProgress = currentPrototypeTrainingProgress;
  const participants = visiblePrototypeTrainingParticipants;

  return (
    <div className="card pad tripSectionCard tripTaskProgressCard" style={{ marginBottom: 16 }}>
      <div className="tripTaskProgressTop">
        <div className="cardSectionPill">Training progress</div>
        <span className="badge">{progressPct}% complete</span>
      </div>
      <div className="progress tripTaskProgressBar">
        <div style={{ width: `${progressPct}%` }} />
      </div>
      <div className="small tripTaskProgressMeta">
        {canViewTeamDashboard
          ? "Overall completion across all participant training sections."
          : `${currentProgress?.completed || 0} of ${currentProgress?.total || 0} sections complete.`}
      </div>

      {canViewTeamDashboard ? (
        <div className="tripTaskProgressParticipants">
          {participants.map((participant) => (
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
