import {
  TRAINING_GRADEBOOK_PROTOTYPE_QUIZ,
  TRAINING_GRADEBOOK_PROTOTYPE_ROWS,
  TRAINING_GRADEBOOK_STATUS_META,
} from "@/lib/trainingCenterPrototypeMock";
import TrainingPrototypeDueDate from "./TrainingPrototypeDueDate";

function formatSubmittedDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TrainingGradebookPrototypeTable() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card pad">
        <div className="cardSectionPill" style={{ marginBottom: 8, width: "fit-content" }}>
          Quiz
        </div>
        <div style={{ fontWeight: 900, fontSize: 17 }}>{TRAINING_GRADEBOOK_PROTOTYPE_QUIZ.title}</div>
        <div className="small trainingPrototypeMuted" style={{ marginTop: 4 }}>
          {TRAINING_GRADEBOOK_PROTOTYPE_QUIZ.questionCount} questions · mock grades only
        </div>
        <div style={{ marginTop: 8 }}>
          <TrainingPrototypeDueDate
            dueDate={TRAINING_GRADEBOOK_PROTOTYPE_QUIZ.dueDate}
            rule={TRAINING_GRADEBOOK_PROTOTYPE_QUIZ.dueDateRule}
          />
        </div>
      </div>

      <div className="card pad trainingPrototypeOverviewCard">
        <table className="table dataTableStriped trainingPrototypeOverviewTable trainingPrototypeGradebookTable">
          <thead>
            <tr>
              <th>Worker</th>
              <th>Role</th>
              <th>Score</th>
              <th>Grade</th>
              <th>Submitted</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {TRAINING_GRADEBOOK_PROTOTYPE_ROWS.map((row) => {
              const meta =
                TRAINING_GRADEBOOK_STATUS_META[row.status] || TRAINING_GRADEBOOK_STATUS_META.not_started;
              const scoreLabel =
                row.scorePercent == null
                  ? "—"
                  : `${row.correctCount}/${row.questionCount} (${row.scorePercent}%)`;

              return (
                <tr key={row.workerId}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{row.name}</div>
                    <div className="small trainingPrototypeMuted">Mock demo row</div>
                  </td>
                  <td>{row.role}</td>
                  <td>{scoreLabel}</td>
                  <td>
                    <span className="trainingPrototypeGradeCell">{row.letterGrade}</span>
                  </td>
                  <td>{formatSubmittedDate(row.submittedAt)}</td>
                  <td>
                    <span className={`badge ${meta.badge}`}>{meta.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
