import CollapsibleSection from "@/components/CollapsibleSection";
import {
  TRAINING_PREVIEW_CANVAS_UNITS,
  TRAINING_PREVIEW_LIVE_SESSIONS,
  TRAINING_PREVIEW_OPTIONAL,
  TRAINING_PREVIEW_PROGRESS,
  TRAINING_STATUS_OPTIONS,
  trainingStatusBadgeClass,
  trainingStatusLabel,
} from "@/lib/trainingPreviewMock";

function formatDue(ymd) {
  if (!ymd) return "—";
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TrainingLayoutCanvas() {
  return (
    <div className="trainingPreviewCanvas">
      <div className="card pad" style={{ marginBottom: 16 }}>
        <div className="row" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: "1 1 220px" }}>
            <div className="cardSectionPill" style={{ marginBottom: 8, width: "fit-content" }}>
              Canvas-style
            </div>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>On-Demand Training</div>
            <div className="small" style={{ opacity: 0.88 }}>
              Units collapse like an LMS. Status and session picks use dropdowns.
            </div>
          </div>
          <div style={{ minWidth: 200 }}>
            <div className="row" style={{ marginBottom: 6 }}>
              <span className="small">Course progress</span>
              <div className="spacer" />
              <span className="badge">{TRAINING_PREVIEW_PROGRESS.percent}%</span>
            </div>
            <div className="progress">
              <div style={{ width: `${TRAINING_PREVIEW_PROGRESS.percent}%` }} />
            </div>
            <div className="small" style={{ marginTop: 6, opacity: 0.8 }}>
              {TRAINING_PREVIEW_PROGRESS.completed} of {TRAINING_PREVIEW_PROGRESS.total} modules
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(200px, 240px) minmax(0, 1fr)",
          gap: 16,
          alignItems: "start",
        }}
        className="trainingPreviewCanvasGrid"
      >
        <div className="card pad trainingPreviewCanvasNav">
          <div className="small" style={{ fontWeight: 900, marginBottom: 10, color: "var(--muted)" }}>
            MODULES
          </div>
          <nav style={{ display: "grid", gap: 4 }}>
            {TRAINING_PREVIEW_CANVAS_UNITS.map((unit, index) => (
              <button
                key={unit.id}
                type="button"
                className="trainingPreviewNavItem"
                style={{
                  fontWeight: index === 0 ? 800 : 600,
                  background: index === 0 ? "var(--primarySoft)" : "transparent",
                  color: index === 0 ? "var(--primary)" : "var(--text)",
                }}
              >
                {unit.title}
              </button>
            ))}
            <div style={{ height: 8 }} />
            <div className="small" style={{ fontWeight: 900, color: "var(--muted)", padding: "4px 8px" }}>
              LIVE SESSIONS
            </div>
            {TRAINING_PREVIEW_LIVE_SESSIONS.map((session) => (
              <button key={session.id} type="button" className="trainingPreviewNavItem">
                {session.title}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
          {TRAINING_PREVIEW_CANVAS_UNITS.map((unit, unitIndex) => (
            <CollapsibleSection
              key={unit.id}
              title={unit.title}
              subtitle={unit.subtitle}
              defaultOpen={unitIndex === 0}
              badge={
                <span className="badge">
                  {unit.modules.filter((m) => m.status === "complete").length}/{unit.modules.length}
                </span>
              }
            >
              <div style={{ display: "grid", gap: 10 }}>
                {unit.modules.map((module) => (
                  <div key={module.id} className="trainingPreviewCanvasRow">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{module.title}</div>
                      <div className="small" style={{ marginTop: 2, opacity: 0.85 }}>
                        {module.duration}
                      </div>
                    </div>
                    <select className="input trainingPreviewStatusSelect" defaultValue={module.status} disabled>
                      {TRAINING_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <span className={`badge ${trainingStatusBadgeClass(module.status)}`}>
                      {trainingStatusLabel(module.status)}
                    </span>
                    <button type="button" className="btn" disabled>
                      Open
                    </button>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          ))}

          <CollapsibleSection
            title="Live team sessions"
            subtitle="Basic, Gateway, and EndMeeting — pick a date when ready"
            defaultOpen={false}
          >
            <div style={{ display: "grid", gap: 12 }}>
              {TRAINING_PREVIEW_LIVE_SESSIONS.map((session) => (
                <div key={session.id} className="trainingPreviewCanvasRow trainingPreviewCanvasRowStack">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{session.title}</div>
                    <div className="small" style={{ marginTop: 4 }}>{session.description}</div>
                    <div className="small" style={{ marginTop: 6, opacity: 0.85 }}>
                      Due {formatDue(session.due)}
                    </div>
                  </div>
                  <select className="input" defaultValue="" disabled style={{ maxWidth: 280 }}>
                    <option value="">{session.sessionLabel}</option>
                    <option>Sat Mar 8, 2026 — 10:00 AM CT</option>
                    <option>Sat Mar 15, 2026 — 2:00 PM CT</option>
                  </select>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Optional resources" subtitle="Not required for your trip" defaultOpen={false}>
            <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
              {TRAINING_PREVIEW_OPTIONAL.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong> — {item.note}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
