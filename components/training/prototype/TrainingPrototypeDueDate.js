import { formatPrototypeDueDate } from "@/lib/trainingCenterPrototypeMock";

export default function TrainingPrototypeDueDate({ dueDate, rule, compact = false }) {
  if (!dueDate) return null;

  return (
    <div className={"trainingPrototypeDueDate" + (compact ? " trainingPrototypeDueDateCompact" : "")}>
      <span className="trainingPrototypeDueDateLabel">Due {formatPrototypeDueDate(dueDate)}</span>
      {rule ? <span className="trainingPrototypeDueRule">{rule}</span> : null}
    </div>
  );
}
