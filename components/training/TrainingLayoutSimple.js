import {
  TRAINING_PREVIEW_CANVAS_UNITS,
  TRAINING_PREVIEW_LIVE_SESSIONS,
  TRAINING_PREVIEW_OPTIONAL,
  TRAINING_PREVIEW_PROGRESS,
  trainingStatusBadgeClass,
  trainingStatusLabel,
} from "@/lib/trainingPreviewMock";

function formatDue(ymd) {
  if (!ymd) return "—";
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const ALL_VIDEO_MODULES = TRAINING_PREVIEW_CANVAS_UNITS.flatMap((unit) =>
  unit.modules.map((m) => ({ ...m, unitTitle: unit.title }))
);

export default function TrainingLayoutSimple() {
  return (
    <div className="trainingPreviewSimple">
      <div
        className="card pad"
        style={{
          marginBottom: 16,
          background:
            "linear-gradient(135deg, rgba(234,242,255,.95), rgba(255,255,255,1))",
          borderColor: "rgba(47,73,147,.14)",
        }}
      >
        <div className="cardSectionPill" style={{ marginBottom: 8, width: "fit-content" }}>
          Simple layout
        </div>
        <div className="row" style={{ flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <div style={{ flex: "1 1 200px" }}>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>Your training</div>
            <div className="small" style={{ opacity: 0.88 }}>
              One scrollable checklist — video modules, live sessions, and optional links.
            </div>
          </div>
          <div style={{ textAlign: "center", minWidth: 100 }}>
            <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, color: "var(--primary)" }}>
              {TRAINING_PREVIEW_PROGRESS.percent}%
            </div>
            <div className="small" style={{ marginTop: 4 }}>
              {TRAINING_PREVIEW_PROGRESS.completed}/{TRAINING_PREVIEW_PROGRESS.total} done
            </div>
          </div>
        </div>
        <div className="progress" style={{ marginTop: 14 }}>
          <div style={{ width: `${TRAINING_PREVIEW_PROGRESS.percent}%` }} />
        </div>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <div className="card pad">
          <div className="row" style={{ marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 900 }}>Video modules</div>
              <div className="small" style={{ opacity: 0.85 }}>Watch on your own schedule</div>
            </div>
            <span className="badge badgeInfo">On-demand</span>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {ALL_VIDEO_MODULES.map((module) => (
              <label
                key={module.id}
                className="trainingPreviewSimpleRow"
                style={{ cursor: "default" }}
              >
                <input type="checkbox" checked={module.status === "complete"} readOnly disabled />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{module.title}</div>
                  <div className="small" style={{ opacity: 0.8 }}>
                    {module.unitTitle} · {module.duration}
                  </div>
                </div>
                <span className={`badge ${trainingStatusBadgeClass(module.status)}`}>
                  {trainingStatusLabel(module.status)}
                </span>
              </label>
            ))}
          </div>
          <button type="button" className="btn btnPrimary" style={{ marginTop: 14 }} disabled>
            Continue to Unit 2
          </button>
        </div>

        <div className="card pad">
          <div className="row" style={{ marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 900 }}>Live sessions</div>
              <div className="small" style={{ opacity: 0.85 }}>Register for a team training date</div>
            </div>
            <span className="badge">Required</span>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {TRAINING_PREVIEW_LIVE_SESSIONS.map((session) => (
              <div
                key={session.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(15,23,42,.08)",
                  background: "rgba(255,255,255,.7)",
                }}
              >
                <div className="row" style={{ alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 180px" }}>
                    <div style={{ fontWeight: 800 }}>{session.title}</div>
                    <div className="small" style={{ marginTop: 4 }}>{session.description}</div>
                    <div className="small" style={{ marginTop: 6, fontWeight: 700 }}>
                      Due {formatDue(session.due)}
                    </div>
                  </div>
                  <input
                    className="input"
                    type="date"
                    defaultValue={session.due}
                    disabled
                    style={{ width: 160, flexShrink: 0 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card pad">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Optional</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 10,
            }}
          >
            {TRAINING_PREVIEW_OPTIONAL.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(15,23,42,.08)",
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 4 }}>{item.title}</div>
                <div className="small">{item.note}</div>
                <button type="button" className="btn" style={{ marginTop: 10 }} disabled>
                  Learn more
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
