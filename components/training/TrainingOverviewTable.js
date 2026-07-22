import EmptyState from "@/components/EmptyState";
import TrainingStaffTripCell from "./TrainingStaffTripCell";
import TrainingWorkerNameCell from "./TrainingWorkerNameCell";

export default function TrainingOverviewTable({
  rows = [],
  loading = false,
  error = "",
  emptyTitle = "No workers yet",
  emptyDescription = "Assign workers to trips to see module completion here.",
}) {
  if (loading) {
    return (
      <div className="card pad">
        <p className="small" style={{ margin: 0, color: "var(--muted)" }}>
          Loading training overview…
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
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="card pad trainingPrototypeOverviewCard">
      <table className="table dataTableStriped trainingPrototypeOverviewTable">
        <thead>
          <tr>
            <th>Worker</th>
            <th>Trip</th>
            <th>Role</th>
            <th>Modules</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((worker) => (
            <tr key={worker.id}>
              <td>
                <TrainingWorkerNameCell
                  userId={worker.userId}
                  name={worker.name}
                  email={worker.email}
                />
              </td>
              <td>
                <TrainingStaffTripCell
                  tripId={worker.tripId}
                  tripName={worker.tripName}
                  siteLocation={worker.siteLocation}
                />
              </td>
              <td>{worker.role}</td>
              <td>
                {worker.modulesComplete} / {worker.modulesTotal}
              </td>
              <td>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <div className="progress trainingPrototypeOverviewBar">
                    <div style={{ width: `${worker.percent}%` }} />
                  </div>
                  <span className="small">{worker.percent}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
