import EmptyState from "@/components/EmptyState";
import TrainingPassFailMark from "./TrainingPassFailMark";
import TrainingStaffTripCell from "./TrainingStaffTripCell";
import { STAFF_TRAINING_MODULE_SLOTS } from "@/lib/staffTrainingRoster";

export default function TrainingGradebookTable({ rows = [], loading = false, error = "" }) {
  if (loading) {
    return (
      <div className="card pad">
        <p className="small" style={{ margin: 0, color: "var(--muted)" }}>
          Loading gradebook…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card pad">
        <p className="small" style={{ margin: 0, color: "var(--danger)" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <EmptyState
        icon="training"
        title="No workers yet"
        description="Assign workers to trips to see module pass/fail here."
      />
    );
  }

  return (
    <div className="card pad trainingPrototypeOverviewCard">
      <table className="table dataTableStriped trainingPrototypeOverviewTable trainingPrototypeGradebookTable">
        <thead>
          <tr>
            <th>Worker</th>
            <th>Trip</th>
            {STAFF_TRAINING_MODULE_SLOTS.map((module) => (
              <th
                key={module.slot}
                className="trainingPrototypeGradebookModuleCol"
                title={module.title}
              >
                {module.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <div style={{ fontWeight: 700 }}>{row.name}</div>
                {row.email ? <div className="small trainingPrototypeMuted">{row.email}</div> : null}
              </td>
              <td>
                <TrainingStaffTripCell tripName={row.tripName} siteLocation={row.siteLocation} />
              </td>
              {(row.modulesCompleteFlags || []).map((complete, index) => (
                <td key={`${row.id}-${index}`} className="trainingPrototypeGradebookMarkCell">
                  <TrainingPassFailMark complete={complete} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
