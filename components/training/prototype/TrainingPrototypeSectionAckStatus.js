export default function TrainingPrototypeSectionAckStatus({ roster }) {
  if (!roster) return null;

  const { completed = [], missing = [], total = 0 } = roster;

  return (
    <div className="trainingPrototypeSectionAckStatus">
      <div className="trainingPrototypeSectionAckHeading">
        Section completion · {completed.length} / {total} marked complete
      </div>
      <div className="trainingPrototypeSectionAckColumns">
        <div>
          <div className="trainingPrototypeSectionAckLabel">Completed</div>
          <ul className="trainingPrototypeSectionAckList">
            {completed.length ? (
              completed.map((participant) => (
                <li key={participant.email || participant.id}>
                  {participant.name || participant.email || "Team member"}
                </li>
              ))
            ) : (
              <li className="trainingPrototypeSectionAckEmpty">None yet.</li>
            )}
          </ul>
        </div>
        <div>
          <div className="trainingPrototypeSectionAckLabel">Not yet</div>
          <ul className="trainingPrototypeSectionAckList">
            {missing.length ? (
              missing.map((participant) => (
                <li key={participant.email || participant.id}>
                  {participant.name || participant.email || "Team member"}
                </li>
              ))
            ) : (
              <li className="trainingPrototypeSectionAckEmpty">Everyone has completed this section.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
