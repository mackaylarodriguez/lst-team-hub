import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import TrainingStaffSearchBar from "@/components/training/TrainingStaffSearchBar";
import TrainingStaffTripSections from "@/components/training/TrainingStaffTripSections";
import StaffTrainingPrototypeWalkthrough from "@/components/training/prototype/StaffTrainingPrototypeWalkthrough";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import { isManagerRole } from "@/lib/roles";
import { listStaffTrainingRoster, partitionStaffTrainingRows } from "@/lib/staffTrainingRoster";

const STAFF_TRAINING_TABS = [
  { id: "prototype", label: "Prototype Training" },
  { id: "overview", label: "Overview" },
  { id: "gradebook", label: "Gradebook" },
];

function matchesTrainingSearch(row, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  const haystack = [row.name, row.email, row.tripName, row.siteLocation, row.role]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export default function TrainingStaffPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [activePanel, setActivePanel] = useState("prototype");
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const nextSession = await requireSession(router);
      if (cancelled || !nextSession) return;

      setSession(nextSession);
      if (!isManagerRole(nextSession.permissionRole || nextSession.role)) {
        router.replace("/trips");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const roster = await listStaffTrainingRoster();
        if (!cancelled) setRows(roster);
      } catch (loadError) {
        console.error("Unable to load staff training roster", loadError);
        if (!cancelled) {
          setRows([]);
          setError(loadError?.message || "Unable to load training data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesTrainingSearch(row, searchQuery)),
    [rows, searchQuery]
  );

  const { activeRows, pastRows } = useMemo(
    () => partitionStaffTrainingRows(filteredRows),
    [filteredRows]
  );

  if (!session) return null;

  const isWalkthrough = activePanel === "prototype";

  return (
    <Shell>
      <div className="trainingStaffPageHeader">
        <h1 className="h1" style={{ display: "flex", alignItems: "center", gap: 10, margin: 0 }}>
          <AppIcon name="training" className="pageEyebrowIcon" />
          <span>Training</span>
        </h1>
        {!isWalkthrough ? (
          <TrainingStaffSearchBar value={searchQuery} onChange={setSearchQuery} compact />
        ) : null}
      </div>

      <div className="trainingPrototypeStaffTabBar" style={{ marginBottom: 18 }}>
        {STAFF_TRAINING_TABS.map((panel) => (
          <button
            key={panel.id}
            type="button"
            className={
              "trainingPrototypeStaffTab" +
              (activePanel === panel.id ? " trainingPrototypeStaffTabActive" : "")
            }
            onClick={() => setActivePanel(panel.id)}
          >
            {panel.label}
          </button>
        ))}
      </div>

      {isWalkthrough ? (
        <StaffTrainingPrototypeWalkthrough session={session} />
      ) : (
        <TrainingStaffTripSections
          mode={activePanel === "gradebook" ? "gradebook" : "overview"}
          activeRows={activeRows}
          pastRows={pastRows}
          loading={loading}
          error={error}
        />
      )}
    </Shell>
  );
}
