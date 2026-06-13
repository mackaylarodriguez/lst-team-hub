import {
  PROTOTYPE_STATUS_META,
  TRAINING_OVERVIEW_PROTOTYPE_WORKERS,
  formatPrototypeDueDate,
} from "@/lib/trainingCenterPrototypeMock";

export default function TrainingOverviewPrototypeTable() {
  return (
    <div className="card pad trainingPrototypeOverviewCard">
      <table className="table dataTableStriped trainingPrototypeOverviewTable">
        <thead>
          <tr>
            <th>Worker</th>
            <th>Role</th>
            <th>Sections</th>
            <th>Completion</th>
            <th>Next due</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {TRAINING_OVERVIEW_PROTOTYPE_WORKERS.map((worker) => {
            const meta = PROTOTYPE_STATUS_META[worker.status] || PROTOTYPE_STATUS_META.not_started;
            return (
              <tr key={worker.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{worker.name}</div>
                  <div className="small trainingPrototypeMuted">Mock demo row</div>
                </td>
                <td>{worker.role}</td>
                <td>
                  {worker.modulesComplete} / {worker.modulesTotal} sections
                </td>
                <td>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <div className="progress trainingPrototypeOverviewBar">
                      <div style={{ width: `${worker.percent}%` }} />
                    </div>
                    <span className="small">{worker.percent}%</span>
                  </div>
                </td>
                <td>
                  {worker.nextDueDate ? (
                    <>
                      <div style={{ fontWeight: 700 }}>{formatPrototypeDueDate(worker.nextDueDate)}</div>
                      <div className="small trainingPrototypeMuted">{worker.nextDueLabel}</div>
                    </>
                  ) : (
                    <span className="small trainingPrototypeMuted">{worker.nextDueLabel || "—"}</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${meta.badge}`}>{meta.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
