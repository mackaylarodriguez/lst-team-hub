import { useMemo, useState } from "react";
import TrainingPrototypeBanner from "./TrainingPrototypeBanner";
import TrainingPrototypeModuleBlock from "./TrainingPrototypeModuleBlock";
import TrainingSectionFullView from "./TrainingSectionFullView";
import TrainingQuizModuleView from "./TrainingQuizModuleView";
import {
  TRAINING_CENTER_PROTOTYPE_MODULES,
  computePrototypeSectionProgress,
  getNextPrototypeSectionId,
  getPrototypeModuleById,
  getPrototypeSectionById,
} from "@/lib/trainingCenterPrototypeMock";

export default function TripTrainingPrototypePanel() {
  const [view, setView] = useState("center");
  const [activeModuleId, setActiveModuleId] = useState("");
  const [activeSectionId, setActiveSectionId] = useState("");
  const [completedSectionIds, setCompletedSectionIds] = useState({});
  const [sectionQuizSubmitted, setSectionQuizSubmitted] = useState(false);

  const progress = useMemo(
    () => computePrototypeSectionProgress(completedSectionIds),
    [completedSectionIds]
  );

  function markSectionComplete(sectionId) {
    if (!sectionId) return;
    setCompletedSectionIds((current) => ({ ...current, [sectionId]: true }));
  }

  function openFullSession(moduleId, sectionId) {
    setActiveModuleId(moduleId);
    setActiveSectionId(sectionId);
    setView("section");
  }

  function openQuiz(moduleId) {
    setActiveModuleId(moduleId);
    setActiveSectionId("s5");
    setView("quiz");
  }

  function handleSectionContinue(sectionId, moduleId) {
    markSectionComplete(sectionId);
    const nextSectionId = getNextPrototypeSectionId(sectionId, moduleId);
    if (!nextSectionId) {
      setView("center");
      setActiveModuleId("");
      setActiveSectionId("");
      return;
    }
    if (getPrototypeSectionById(nextSectionId)?.isQuiz) {
      setActiveSectionId(nextSectionId);
      setView("quiz");
      return;
    }
    setActiveSectionId(nextSectionId);
  }

  const activeSection = getPrototypeSectionById(activeSectionId);
  const activeModule = getPrototypeModuleById(activeModuleId || activeSection?.moduleId);
  const activeModuleSections = activeModule?.sections || [];

  if (view === "section" && activeSection && !activeSection.isQuiz && activeModule) {
    const sectionIndex = activeModuleSections.findIndex((section) => section.id === activeSection.id);
    const nextSection = getPrototypeSectionById(
      getNextPrototypeSectionId(activeSection.id, activeModule.id)
    );
    const continueLabel = nextSection?.isQuiz ? "Continue to quiz" : "Continue";

    return (
      <TrainingSectionFullView
        section={activeSection}
        sectionIndex={sectionIndex}
        sectionTotal={activeModuleSections.length}
        onBack={() => {
          setView("center");
          setActiveModuleId("");
          setActiveSectionId("");
        }}
        onContinue={() => handleSectionContinue(activeSection.id, activeModule.id)}
        continueLabel={continueLabel}
      />
    );
  }

  if (view === "quiz") {
    return (
      <TrainingQuizModuleView
        onBack={() => {
          setView("center");
          setActiveModuleId("");
          setActiveSectionId("");
        }}
        onSubmitSuccess={() => {
          setSectionQuizSubmitted(true);
          markSectionComplete("s5");
          setView("center");
          setActiveModuleId("");
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
              Two modules with collapsible sections, full-session flow, embedded video, and a quiz — staff demo only.
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

      <div className="trainingPrototypeModuleList">
        {TRAINING_CENTER_PROTOTYPE_MODULES.map((module, index) => (
          <TrainingPrototypeModuleBlock
            key={module.id}
            module={module}
            completedSectionIds={completedSectionIds}
            sectionQuizSubmitted={sectionQuizSubmitted}
            defaultOpen={index === 0}
            onOpenFullSession={openFullSession}
            onOpenQuiz={openQuiz}
          />
        ))}
      </div>
    </div>
  );
}
