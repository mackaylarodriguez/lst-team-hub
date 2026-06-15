import {
  TRAINING_GRADEBOOK_PROTOTYPE_ROWS,
  TRAINING_PROTOTYPE_MODULE_LABELS,
} from "@/lib/trainingCenterPrototypeMock";
import TrainingPrototypePassFailMark from "./TrainingPrototypePassFailMark";
import TrainingPrototypeStaffTripCell from "./TrainingPrototypeStaffTripCell";

export default function TrainingGradebookPrototypeTable() {
  return (
    <div className="card pad trainingPrototypeOverviewCard">
      <table className="table dataTableStriped trainingPrototypeOverviewTable trainingPrototypeGradebookTable">
        <thead>
          <tr>
            <th>Worker</th>
            <th>Trip</th>
            {TRAINING_PROTOTYPE_MODULE_LABELS.map((label) => (
              <th key={label} className="trainingPrototypeGradebookModuleCol">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TRAINING_GRADEBOOK_PROTOTYPE_ROWS.map((row) => (
            <tr key={row.id}>
              <td>
                <div style={{ fontWeight: 700 }}>{row.name}</div>
              </td>
              <td>
                <TrainingPrototypeStaffTripCell
                  tripName={row.tripName}
                  siteLocation={row.siteLocation}
                />
              </td>
              {row.modulesComplete.map((complete, index) => (
                <td key={`${row.id}-${index}`} className="trainingPrototypeGradebookMarkCell">
                  <TrainingPrototypePassFailMark complete={complete} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
