import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import TrainingStaffSearchBar from "@/components/training/TrainingStaffSearchBar";
import TrainingOverviewTable from "@/components/training/TrainingOverviewTable";
import TrainingGradebookTable from "@/components/training/TrainingGradebookTable";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import { isManagerRole } from "@/lib/roles";
import { listStaffTrainingRoster } from "@/lib/staffTrainingRoster";

const STAFF_TRAINING_TABS = [
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
  const [activePanel, setActivePanel] = useState("overview");
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

  if (!session) return null;

  return (
    <Shell>
      <h1 className="h1" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AppIcon name="training" className="pageEyebrowIcon" />
        <span>Training</span>
      </h1>

      <p className="p" style={{ marginBottom: 16 }}>
        Track classroom module completion across workers and trips. Progress updates as modules are
        marked complete on each trip.
      </p>

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

      <TrainingStaffSearchBar value={searchQuery} onChange={setSearchQuery} />

      {activePanel === "overview" ? (
        <>
          <p className="small trainingPrototypeMuted" style={{ marginBottom: 12 }}>
            Module completion across workers and trips.
          </p>
          <TrainingOverviewTable rows={filteredRows} loading={loading} error={error} />
        </>
      ) : (
        <>
          <p className="small trainingPrototypeMuted" style={{ marginBottom: 12 }}>
            Pass / no-pass by classroom module — green check for complete, red X for incomplete.
          </p>
          <TrainingGradebookTable rows={filteredRows} loading={loading} error={error} />
        </>
      )}
    </Shell>
  );
}
