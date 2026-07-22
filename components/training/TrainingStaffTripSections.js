import AppIcon from "@/components/AppIcon";
import TrainingOverviewTable from "./TrainingOverviewTable";
import TrainingGradebookTable from "./TrainingGradebookTable";

function TrainingTripSection({ title, icon, count, children }) {
  return (
    <div className="trainingStaffTripSection">
      <div className="sectionHeader" style={{ marginBottom: 12 }}>
        <div className="sectionHeaderMain">
          <div className="sectionTitleRow">
            <AppIcon name={icon} className="sectionHeaderIcon" />
            <div className="sectionTitle">{title}</div>
            <span className="badge">{count}</span>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function TrainingStaffTripSections({
  mode = "overview",
  activeRows = [],
  pastRows = [],
  loading = false,
  error = "",
}) {
  const Table = mode === "gradebook" ? TrainingGradebookTable : TrainingOverviewTable;
  const total = activeRows.length + pastRows.length;

  if (loading || error || total === 0) {
    return <Table rows={[]} loading={loading} error={error} />;
  }

  return (
    <div className="trainingStaffTripSections">
      <TrainingTripSection title="Active trips" icon="active" count={activeRows.length}>
        <Table
          rows={activeRows}
          emptyTitle="No active trips"
          emptyDescription="Workers on active trips will show up here."
        />
      </TrainingTripSection>
      <TrainingTripSection title="Past trips" icon="past" count={pastRows.length}>
        <Table
          rows={pastRows}
          emptyTitle="No past trips"
          emptyDescription="Finished or archived trips will show up here."
        />
      </TrainingTripSection>
    </div>
  );
}
