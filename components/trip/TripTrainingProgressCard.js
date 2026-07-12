import { useTripPage } from "./TripPageContext";

export default function TripTrainingProgressCard({ variant = "modules" }) {
  const {
    canViewTeamDashboard,
    currentTrainingProgress,
    currentPrototypeTrainingProgress,
    overviewTrainingPct,
    overviewPrototypeTrainingPct,
    visibleTrainingParticipants,
    visiblePrototypeTrainingParticipants,
  } = useTripPage();

  const usePrototype = variant === "prototype";
  const progressPct = usePrototype ? overviewPrototypeTrainingPct : overviewTrainingPct;
  const currentProgress = usePrototype
    ? currentPrototypeTrainingProgress
    : currentTrainingProgress;
  const participants = usePrototype
    ? visiblePrototypeTrainingParticipants
    : visibleTrainingParticipants;
  const unitLabel = usePrototype ? "sections" : "modules";

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
          ? `Overall completion across all participant training ${unitLabel}.`
          : `${currentProgress?.completed || 0} of ${currentProgress?.total || 0} ${unitLabel} complete.`}
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
