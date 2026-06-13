import { useMemo, useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import TrainingPrototypeBanner from "./TrainingPrototypeBanner";
import TrainingWrittenModuleView from "./TrainingWrittenModuleView";
import TrainingVideoModuleView from "./TrainingVideoModuleView";
import TrainingQuizModuleView from "./TrainingQuizModuleView";
import {
  TRAINING_CENTER_PROTOTYPE_MODULES,
  TRAINING_CENTER_PROTOTYPE_SECTIONS,
  TRAINING_CENTER_PROTOTYPE_VIDEO,
  TRAINING_CENTER_PROTOTYPE_WRITTEN,
  PROTOTYPE_STATUS_META,
  computePrototypeProgress,
} from "@/lib/trainingCenterPrototypeMock";

function buildInitialStatuses() {
  return Object.fromEntries(
    TRAINING_CENTER_PROTOTYPE_MODULES.map((module) => [module.id, module.initialStatus])
  );
}

function PrototypeEditButton() {
  return (
    <button
      type="button"
      className="btn trainingPrototypeEditBtn"
      title="Prototype only — editing is not wired yet"
      onClick={() => {
        // UI placeholder for future staff authoring
      }}
    >
      Edit
    </button>
  );
}

export default function TripTrainingPrototypePanel() {
  const [view, setView] = useState("center");
  const [statusByModuleId, setStatusByModuleId] = useState(buildInitialStatuses);
  const [sectionQuizSubmitted, setSectionQuizSubmitted] = useState(false);

  const progress = useMemo(() => computePrototypeProgress(statusByModuleId), [statusByModuleId]);

  function setModuleStatus(moduleId, status) {
    setStatusByModuleId((current) => ({ ...current, [moduleId]: status }));
  }

  function renderStatusBadge(moduleId) {
    const status = statusByModuleId[moduleId] || "not_started";
    const meta = PROTOTYPE_STATUS_META[status] || PROTOTYPE_STATUS_META.not_started;
    return <span className={`badge ${meta.badge}`}>{meta.label}</span>;
  }

  if (view === "written") {
    return (
      <TrainingWrittenModuleView
        onBack={() => setView("center")}
        onContinue={() => {
          setModuleStatus("proto-written", "completed");
          setView("center");
        }}
      />
    );
  }

  if (view === "video") {
    return (
      <TrainingVideoModuleView
        onBack={() => setView("center")}
        onMarkComplete={() => setModuleStatus("proto-video", "completed")}
      />
    );
  }

  if (view === "quiz") {
    return (
      <TrainingQuizModuleView
        onBack={() => setView("center")}
        onSubmitSuccess={() => {
          setSectionQuizSubmitted(true);
          setModuleStatus("proto-multi", "completed");
        }}
      />
    );
  }

  return (
    <div className="trainingPrototypeCenter">
      <TrainingPrototypeBanner />

      <div className="card pad" style={{ marginBottom: 16 }}>
        <div className="row" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: "1 1 240px" }}>
            <div className="cardSectionPill" style={{ marginBottom: 8, width: "fit-content" }}>
              Training Center (Prototype)
            </div>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>Canvas-style course preview</div>
            <div className="small trainingPrototypeMuted">
              Three collapsible modules with written content, video, and a multi-section quiz flow — staff demo only.
            </div>
          </div>
          <div style={{ minWidth: 200 }}>
            <div className="row" style={{ marginBottom: 6 }}>
              <span className="small">Mock progress</span>
              <div className="spacer" />
              <span className="badge">{progress.percent}%</span>
            </div>
            <div className="progress">
              <div style={{ width: `${progress.percent}%` }} />
            </div>
            <div className="small trainingPrototypeMuted" style={{ marginTop: 6 }}>
              {progress.completed} of {progress.total} modules completed (local state)
            </div>
          </div>
        </div>
      </div>

      <div className="trainingPreviewCanvasGrid trainingPrototypeCanvasGrid">
        <div className="card pad trainingPreviewCanvasNav">
          <div className="small" style={{ fontWeight: 900, marginBottom: 10, color: "var(--muted)" }}>
            MODULES
          </div>
          <nav className="trainingPrototypeModuleNav">
            {TRAINING_CENTER_PROTOTYPE_MODULES.map((module, index) => (
              <div
                key={module.id}
                className={`trainingPrototypeModuleNavItem${index === 0 ? " isActive" : ""}`}
              >
                <span>{module.title}</span>
                {renderStatusBadge(module.id)}
              </div>
            ))}
          </nav>
        </div>

        <div className="trainingPrototypeModuleStack">
          <CollapsibleSection
            title={TRAINING_CENTER_PROTOTYPE_MODULES[0].title}
            subtitle={TRAINING_CENTER_PROTOTYPE_MODULES[0].subtitle}
            defaultOpen
            badge={renderStatusBadge("proto-written")}
            rightSlot={<PrototypeEditButton />}
          >
            <div className="trainingPrototypeModuleBody">
              <p className="trainingPrototypeMuted small" style={{ marginTop: 0 }}>
                Sample written lesson — staff can imagine editing this block later.
              </p>
              <div className="trainingPrototypeWrittenPreview">
                <h3>{TRAINING_CENTER_PROTOTYPE_WRITTEN.sections[0].heading}</h3>
                <p>{TRAINING_CENTER_PROTOTYPE_WRITTEN.sections[0].body}</p>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn btnPrimary" onClick={() => setView("written")}>
                  Open full lesson
                </button>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title={TRAINING_CENTER_PROTOTYPE_MODULES[1].title}
            subtitle={TRAINING_CENTER_PROTOTYPE_MODULES[1].subtitle}
            defaultOpen={false}
            badge={renderStatusBadge("proto-video")}
            rightSlot={<PrototypeEditButton />}
          >
            <div className="trainingPrototypeModuleBody">
              <p className="small trainingPrototypeMuted">{TRAINING_CENTER_PROTOTYPE_VIDEO.description}</p>
              <div className="trainingPrototypeVideoWrap trainingPrototypeVideoWrapCompact">
                <iframe
                  title="Prototype embedded video preview"
                  src={TRAINING_CENTER_PROTOTYPE_VIDEO.embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button type="button" className="btn btnPrimary" onClick={() => setView("video")}>
                  Open video page
                </button>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title={TRAINING_CENTER_PROTOTYPE_MODULES[2].title}
            subtitle={TRAINING_CENTER_PROTOTYPE_MODULES[2].subtitle}
            defaultOpen={false}
            badge={renderStatusBadge("proto-multi")}
            rightSlot={<PrototypeEditButton />}
          >
            <div className="trainingPrototypeModuleBody">
              <p className="small trainingPrototypeMuted" style={{ marginTop: 0 }}>
                Five collapsible sections — the last section includes a quiz preview.
              </p>
              <div className="trainingPrototypeSectionStack">
                {TRAINING_CENTER_PROTOTYPE_SECTIONS.map((section, index) => (
                  <CollapsibleSection
                    key={section.id}
                    title={section.title}
                    subtitle={section.isQuiz ? "3 questions · demo only" : `Part ${index + 1} of 5`}
                    defaultOpen={index === 0}
                  >
                    <div className="trainingPrototypeSectionInner">
                      <p>{section.body}</p>
                      {section.showVideoPlaceholder ? (
                        <div className="trainingPrototypeVideoPlaceholder">
                          Video placeholder — embed would appear here
                        </div>
                      ) : null}
                      {section.isQuiz ? (
                        <div className="trainingPrototypeQuizPreview">
                          {sectionQuizSubmitted ? (
                            <div className="trainingPrototypeSuccessBox" role="status">
                              Quiz submitted in demo mode. Open the full quiz page for the complete flow.
                            </div>
                          ) : (
                            <p className="small trainingPrototypeMuted">
                              Multiple-choice questions appear on the dedicated quiz page.
                            </p>
                          )}
                          <button type="button" className="btn btnPrimary" onClick={() => setView("quiz")}>
                            Open quiz (Prototype)
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </CollapsibleSection>
                ))}
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
