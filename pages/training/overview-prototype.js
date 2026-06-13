import Link from "next/link";
import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import TrainingPrototypeBanner from "@/components/training/prototype/TrainingPrototypeBanner";
import TrainingOverviewPrototypeTable from "@/components/training/prototype/TrainingOverviewPrototypeTable";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { requireSession } from "@/lib/auth";
import { isManagerRole } from "@/lib/roles";

export default function TrainingOverviewPrototypePage() {
  const router = useRouter();
  const [session, setSession] = useState(null);

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
      <div className="row" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <h1 className="h1" style={{ display: "flex", alignItems: "center", gap: 10, margin: 0 }}>
          <AppIcon name="training" className="pageEyebrowIcon" />
          <span>Training Overview (Prototype)</span>
        </h1>
        <div className="spacer" />
        <Link href="/training" className="btn">
          Back to Training previews
        </Link>
      </div>

      <TrainingPrototypeBanner />

      <p className="p" style={{ marginBottom: 16 }}>
        Staff-only mock dashboard for monitoring worker progress. All rows and percentages are hardcoded —
        nothing connects to live training data.
      </p>

      <TrainingOverviewPrototypeTable />
    </Shell>
  );
}
