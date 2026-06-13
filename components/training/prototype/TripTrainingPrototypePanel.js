import { useMemo, useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import TrainingPrototypeBanner from "./TrainingPrototypeBanner";
import TrainingPrototypeDueDate from "./TrainingPrototypeDueDate";
import TrainingSectionFullView from "./TrainingSectionFullView";
import TrainingQuizModuleView from "./TrainingQuizModuleView";
import {
  TRAINING_CENTER_PROTOTYPE_MODULE,
  TRAINING_CENTER_PROTOTYPE_SECTIONS,
  TRAINING_CENTER_PROTOTYPE_VIDEO,
  PROTOTYPE_STATUS_META,
  computePrototypeSectionProgress,
  formatPrototypeDueDate,
  getNextPrototypeSectionId,
  getPrototypeModuleStatus,
  getPrototypeSectionById,
} from "@/lib/trainingCenterPrototypeMock";

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
  const [activeSectionId, setActiveSectionId] = useState("");
  const [completedSectionIds, setCompletedSectionIds] = useState({});
  const [sectionQuizSubmitted, setSectionQuizSubmitted] = useState(false);

  const progress = useMemo(
    () => computePrototypeSectionProgress(completedSectionIds),
    [completedSectionIds]
  );
  const moduleStatus = useMemo(
    () => getPrototypeModuleStatus(completedSectionIds),
    [completedSectionIds]
  );
  const moduleStatusMeta = PROTOTYPE_STATUS_META[moduleStatus] || PROTOTYPE_STATUS_META.not_started;

  function markSectionComplete(sectionId) {
    if (!sectionId) return;
    setCompletedSectionIds((current) => ({ ...current, [sectionId]: true }));
  }

  function openFullSession(sectionId) {
    setActiveSectionId(sectionId);
    setView("section");
  }

  function handleSectionContinue(sectionId) {
    markSectionComplete(sectionId);
    const nextSectionId = getNextPrototypeSectionId(sectionId);
    if (!nextSectionId) {
      setView("center");
      setActiveSectionId("");
      return;
    }
    if (getPrototypeSectionById(nextSectionId)?.isQuiz) {
      setView("quiz");
      setActiveSectionId(nextSectionId);
      return;
    }
    setActiveSectionId(nextSectionId);
  }

  const activeSection = getPrototypeSectionById(activeSectionId);
  const sectionTotal = TRAINING_CENTER_PROTOTYPE_SECTIONS.length;

  if (view === "section" && activeSection && !activeSection.isQuiz) {
    const sectionIndex = TRAINING_CENTER_PROTOTYPE_SECTIONS.findIndex(
      (section) => section.id === activeSection.id
    );
    const nextSection = getPrototypeSectionById(getNextPrototypeSectionId(activeSection.id));
    const continueLabel = nextSection?.isQuiz ? "Continue to quiz" : "Continue";

    return (
      <TrainingSectionFullView
        section={activeSection}
        sectionIndex={sectionIndex}
        sectionTotal={sectionTotal}
        onBack={() => {
          setView("center");
          setActiveSectionId("");
        }}
        onContinue={() => handleSectionContinue(activeSection.id)}
        continueLabel={continueLabel}
      />
    );
  }

  if (view === "quiz") {
    return (
      <TrainingQuizModuleView
        onBack={() => {
          setView("center");
          setActiveSectionId("");
        }}
        onSubmitSuccess={() => {
          setSectionQuizSubmitted(true);
          markSectionComplete("s5");
          setView("center");
          setActiveSectionId("");
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
              One module with five sections, full-session flow, embedded video, and a quiz — staff demo only.
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
              {progress.completed} of {progress.total} sections completed (local state)
            </div>
          </div>
        </div>
      </div>

      <div className="trainingPrototypeModuleShell">
        <div className="trainingPrototypeModuleHeadingRow">
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className="trainingPrototypeModuleHeading">{TRAINING_CENTER_PROTOTYPE_MODULE.title}</h2>
            <p className="small trainingPrototypeMuted" style={{ margin: "6px 0 0" }}>
              {TRAINING_CENTER_PROTOTYPE_MODULE.subtitle}
            </p>
            <div style={{ marginTop: 8 }}>
              <TrainingPrototypeDueDate
                dueDate={TRAINING_CENTER_PROTOTYPE_MODULE.dueDate}
                rule={TRAINING_CENTER_PROTOTYPE_MODULE.dueDateRule}
              />
            </div>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className={`badge ${moduleStatusMeta.badge}`}>{moduleStatusMeta.label}</span>
            <PrototypeEditButton />
          </div>
        </div>

        <div className="trainingPrototypeSectionStack">
          {TRAINING_CENTER_PROTOTYPE_SECTIONS.map((section, index) => {
            const sectionComplete = !!completedSectionIds[section.id];
            const sectionStatus = sectionComplete
              ? PROTOTYPE_STATUS_META.completed
              : index === 0 || completedSectionIds[TRAINING_CENTER_PROTOTYPE_SECTIONS[index - 1]?.id]
                ? PROTOTYPE_STATUS_META.in_progress
                : PROTOTYPE_STATUS_META.not_started;

            return (
              <CollapsibleSection
                key={section.id}
                title={section.title}
                subtitle={
                  section.isQuiz
                    ? `3 questions · Due ${formatPrototypeDueDate(section.dueDate)}`
                    : `Part ${index + 1} of ${sectionTotal}`
                }
                defaultOpen={index === 0}
                badge={<span className={`badge ${sectionStatus.badge}`}>{sectionStatus.label}</span>}
              >
                <div className="trainingPrototypeSectionInner">
                  <TrainingPrototypeDueDate
                    compact
                    dueDate={section.dueDate}
                    rule={section.dueDateRule}
                  />
                  <p>{section.body}</p>

                  {section.showVideo ? (
                    <div className="trainingPrototypeVideoWrap trainingPrototypeVideoWrapCompact">
                      <iframe
                        title="Prototype embedded video preview"
                        src={TRAINING_CENTER_PROTOTYPE_VIDEO.embedUrl}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : null}

                  {section.isQuiz ? (
                    <div className="trainingPrototypeQuizPreview">
                      {sectionQuizSubmitted ? (
                        <div className="trainingPrototypeSuccessBox" role="status">
                          Quiz submitted in demo mode.
                        </div>
                      ) : (
                        <p className="small trainingPrototypeMuted">
                          Multiple-choice questions appear on the dedicated quiz page.
                        </p>
                      )}
                      <button type="button" className="btn btnPrimary" onClick={() => setView("quiz")}>
                        Open full quiz (Prototype)
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btnPrimary"
                      onClick={() => openFullSession(section.id)}
                    >
                      Open full session
                    </button>
                  )}
                </div>
              </CollapsibleSection>
            );
          })}
        </div>
      </div>
    </div>
  );
}
