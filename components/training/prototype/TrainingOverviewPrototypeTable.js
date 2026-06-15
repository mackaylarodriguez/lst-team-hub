import {
  TRAINING_OVERVIEW_PROTOTYPE_WORKERS,
  TRAINING_PROTOTYPE_SECTIONS_TOTAL,
} from "@/lib/trainingCenterPrototypeMock";

export default function TrainingOverviewPrototypeTable() {
  return (
    <div className="card pad trainingPrototypeOverviewCard">
      <table className="table dataTableStriped trainingPrototypeOverviewTable">
        <thead>
          <tr>
            <th>Worker</th>
            <th>Trip</th>
            <th>Role</th>
            <th>Sections</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          {TRAINING_OVERVIEW_PROTOTYPE_WORKERS.map((worker) => {
            const percent = Math.round(
              (worker.sectionsComplete / TRAINING_PROTOTYPE_SECTIONS_TOTAL) * 100
            );

            return (
              <tr key={worker.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{worker.name}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 700 }}>{worker.tripName}</div>
                  <div className="small trainingPrototypeMuted">{worker.siteLocation}</div>
                </td>
                <td>{worker.role}</td>
                <td>
                  {worker.sectionsComplete} / {TRAINING_PROTOTYPE_SECTIONS_TOTAL}
                </td>
                <td>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <div className="progress trainingPrototypeOverviewBar">
                      <div style={{ width: `${percent}%` }} />
                    </div>
                    <span className="small">{percent}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
