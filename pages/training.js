import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import Link from "next/link";
import TrainingLayoutCanvas from "@/components/training/TrainingLayoutCanvas";
import TrainingLayoutSimple from "@/components/training/TrainingLayoutSimple";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { requireSession } from "@/lib/auth";
import { isManagerRole } from "@/lib/roles";

const LAYOUT_OPTIONS = [
  { id: "canvas", label: "Canvas-style" },
  { id: "simple", label: "Simple & friendly" },
];

export default function TrainingPreviewPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [layout, setLayout] = useState("canvas");

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
        <AppIcon name="tasks" className="pageEyebrowIcon" />
        <span>Training</span>
      </h1>
      <p className="p" style={{ marginBottom: 8 }}>
        Staff-only layout preview. Compare two module designs — no live data or saves yet.
      </p>
      <div
        className="small"
        style={{
          marginBottom: 16,
          padding: "10px 12px",
          borderRadius: 12,
          background: "rgba(249, 157, 42, 0.12)",
          border: "1px solid rgba(249, 157, 42, 0.25)",
          maxWidth: 640,
        }}
      >
        Mockup for review: pick a layout to show your team. Workers do not see this page yet.
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        <Link href="/training/overview-prototype" className="btn">
          Training Overview (Prototype)
        </Link>
      </div>

      <div className="tabs" style={{ marginBottom: 18 }}>
        {LAYOUT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={"tab " + (layout === option.id ? "tabActive" : "")}
            onClick={() => setLayout(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {layout === "canvas" ? <TrainingLayoutCanvas /> : <TrainingLayoutSimple />}
    </Shell>
  );
}
