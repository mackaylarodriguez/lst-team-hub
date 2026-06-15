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
          </tr>
        </thead>
        <tbody>
          {TRAINING_OVERVIEW_PROTOTYPE_WORKERS.map((worker) => (
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
