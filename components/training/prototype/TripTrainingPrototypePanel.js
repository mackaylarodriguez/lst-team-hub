import { useState } from "react";
import TripTrainingProgressCard from "@/components/trip/TripTrainingProgressCard";
import TrainingPrototypeModuleBlock from "./TrainingPrototypeModuleBlock";
import TrainingSectionFullView from "./TrainingSectionFullView";
import TrainingQuizModuleView from "./TrainingQuizModuleView";
import {
  TRAINING_CENTER_PROTOTYPE_MODULES,
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

  function closeOverlay() {
    setView("center");
    setActiveModuleId("");
    setActiveSectionId("");
  }

  function handleSectionContinue(sectionId, moduleId) {
    markSectionComplete(sectionId);
    const nextSectionId = getNextPrototypeSectionId(sectionId, moduleId);
    if (!nextSectionId) {
      closeOverlay();
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

  const sectionOverlayOpen =
    view === "section" && activeSection && !activeSection.isQuiz && activeModule;
  const quizOverlayOpen = view === "quiz";

  return (
    <>
      <div className="trainingPrototypeCenter">
        <TripTrainingProgressCard />

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

      {sectionOverlayOpen ? (
        <TrainingSectionFullView
          section={activeSection}
          sectionIndex={activeModuleSections.findIndex((section) => section.id === activeSection.id)}
          sectionTotal={activeModuleSections.length}
          onBack={closeOverlay}
          onContinue={() => handleSectionContinue(activeSection.id, activeModule.id)}
          continueLabel={
            getPrototypeSectionById(getNextPrototypeSectionId(activeSection.id, activeModule.id))?.isQuiz
              ? "Continue to quiz"
              : "Continue"
          }
        />
      ) : null}

      {quizOverlayOpen ? (
        <TrainingQuizModuleView
          onBack={closeOverlay}
          onSubmitSuccess={() => {
            setSectionQuizSubmitted(true);
            markSectionComplete("s5");
            closeOverlay();
          }}
        />
      ) : null}
    </>
  );
}
