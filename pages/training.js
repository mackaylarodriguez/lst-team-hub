import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import TrainingPrototypeBanner from "@/components/training/prototype/TrainingPrototypeBanner";
import TrainingPrototypeStaffSearchBar from "@/components/training/prototype/TrainingPrototypeStaffSearchBar";
import TrainingOverviewPrototypeTable from "@/components/training/prototype/TrainingOverviewPrototypeTable";
import TrainingGradebookPrototypeTable from "@/components/training/prototype/TrainingGradebookPrototypeTable";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { requireSession } from "@/lib/auth";
import { isManagerRole } from "@/lib/roles";

const STAFF_TRAINING_TABS = [
  { id: "overview", label: "Overview" },
  { id: "gradebook", label: "Gradebook" },
];

export default function TrainingStaffPrototypePage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [activePanel, setActivePanel] = useState("overview");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const nextSession = await requireSession(router);
      if (cancelled || !nextSession) return;

      setSession(nextSession);
      if (!isManagerRole(nextSession.permissionRole || nextSession.role)) {
        router.replace("/trips");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!session) return null;

  return (
    <Shell>
      <h1 className="h1" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AppIcon name="training" className="pageEyebrowIcon" />
        <span>Training (Prototype)</span>
      </h1>

      <TrainingPrototypeBanner />

      <p className="p" style={{ marginBottom: 16 }}>
        Staff-only demo for monitoring training completion across workers and trips. All data is hardcoded —
        nothing connects to live training records.
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

      <TrainingPrototypeStaffSearchBar />

      {activePanel === "overview" ? (
        <>
          <p className="small trainingPrototypeMuted" style={{ marginBottom: 12 }}>
            Section completion summary across mock workers and trips.
          </p>
          <TrainingOverviewPrototypeTable />
        </>
      ) : (
        <>
          <p className="small trainingPrototypeMuted" style={{ marginBottom: 12 }}>
            Pass / no-pass module completion at a glance — green check for complete, red X for incomplete.
          </p>
          <TrainingGradebookPrototypeTable />
        </>
      )}
    </Shell>
  );
}
