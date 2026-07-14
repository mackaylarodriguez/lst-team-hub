import {
  TRAINING_PROTOTYPE_DEADLINE_RULES_PREVIEW,
  formatPrototypeDueDate,
} from "@/lib/trainingCenterPrototypeMock";

export default function TrainingPrototypeDeadlineRulesCard() {
  return (
    <div className="card pad" style={{ marginBottom: 16 }}>
      <div className="cardSectionPill" style={{ marginBottom: 8, width: "fit-content" }}>
        Sample due dates (Prototype)
      </div>
      <p className="small trainingPrototypeMuted" style={{ marginTop: 0, marginBottom: 12 }}>
        These dates follow the Hub training deadline rules from this trip’s start date
        (90 / 60 / 30 days before departure, or the college-timeline anchors).
      </p>
      <div className="trainingPrototypeDeadlineRulesList">
        {TRAINING_PROTOTYPE_DEADLINE_RULES_PREVIEW.map((row) => (
          <div key={row.module} className="trainingPrototypeDeadlineRulesRow">
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{row.module}</div>
              <div className="small trainingPrototypeMuted">{row.rule}</div>
            </div>
            <div className="trainingPrototypeDueDateCompact">
              <span className="trainingPrototypeDueDateLabel">
                Due {formatPrototypeDueDate(row.sampleDueDate)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
