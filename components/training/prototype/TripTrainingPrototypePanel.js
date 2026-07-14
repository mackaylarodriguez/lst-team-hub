import { useEffect, useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import { useTripPage } from "@/components/trip/TripPageContext";
import TripTrainingProgressCard from "@/components/trip/TripTrainingProgressCard";
import TripTrainingResourcesLayout from "@/components/trip/TripTrainingResourcesLayout";
import TrainingPrototypeModuleBlock from "./TrainingPrototypeModuleBlock";
import TrainingPrototypeModuleEditModal from "./TrainingPrototypeModuleEditModal";
import TrainingSectionFullView from "./TrainingSectionFullView";
import TrainingQuizModuleView from "./TrainingQuizModuleView";
import {
  findPrototypeModuleById,
  findPrototypeSectionById,
  getNextPrototypeSectionIdFromModules,
  getPreviousPrototypeSectionIdFromModules,
  loadPrototypeModules,
  savePrototypeModules,
  applyPrototypeTrainingDeadlines,
} from "@/lib/trainingPrototypeStorage";
import { getPrototypeSectionQuiz } from "@/lib/trainingCenterPrototypeMock";

export default function TripTrainingPrototypePanel() {
  const {
    activeParticipantEmail,
    canManageTrips,
    canViewTeamDashboard,
    completedPrototypeSectionIds,
    markPrototypeSectionComplete,
    optionalTrainingResources,
    prototypeSectionCompletionRosters,
    requiredTrainingResources,
    trip,
  } = useTripPage();
  const tripDeadlineContext = {
    startDate: trip?.startDate,
    endDate: trip?.endDate,
    trainingTimelineType: trip?.trainingTimelineType,
  };
  const [modules, setModules] = useState(() => loadPrototypeModules());
  const [view, setView] = useState("center");
  const [activeModuleId, setActiveModuleId] = useState("");
  const [activeSectionId, setActiveSectionId] = useState("");
  const [editingModuleId, setEditingModuleId] = useState("");

  useEffect(() => {
    setModules(loadPrototypeModules(tripDeadlineContext));
  }, [trip?.startDate, trip?.endDate, trip?.trainingTimelineType]);

  function markSectionComplete(sectionId) {
    if (!sectionId || !activeParticipantEmail) return;
    markPrototypeSectionComplete(sectionId, activeParticipantEmail);
  }

  function openFullSession(moduleId, sectionId) {
    setActiveModuleId(moduleId);
    setActiveSectionId(sectionId);
    setView("section");
  }

  function openQuiz(moduleId) {
    const module = findPrototypeModuleById(modules, moduleId);
    const quizSection = module?.sections?.find((section) => section.isQuiz);
    if (!quizSection) return;
    setActiveModuleId(moduleId);
    setActiveSectionId(quizSection.id);
    setView("quiz");
  }

  function closeOverlay() {
    setView("center");
    setActiveModuleId("");
    setActiveSectionId("");
  }

  function handleSaveModule(updatedModule) {
    setModules((current) => {
      const next = applyPrototypeTrainingDeadlines(
        current.map((module) => (module.id === updatedModule.id ? updatedModule : module)),
        tripDeadlineContext
      );
      savePrototypeModules(next);
      return next;
    });
    setEditingModuleId("");
  }

  function handleSectionContinue(sectionId, moduleId) {
    const nextSectionId = getNextPrototypeSectionIdFromModules(modules, sectionId, moduleId);
    if (!nextSectionId) {
      closeOverlay();
      return;
    }
    if (findPrototypeSectionById(modules, nextSectionId)?.isQuiz) {
      setActiveSectionId(nextSectionId);
      setView("quiz");
      return;
    }
    setActiveSectionId(nextSectionId);
  }

  function handleSectionPrevious(sectionId, moduleId) {
    const previousSectionId = getPreviousPrototypeSectionIdFromModules(modules, sectionId, moduleId);
    if (!previousSectionId) return;
    if (findPrototypeSectionById(modules, previousSectionId)?.isQuiz) {
      setActiveSectionId(previousSectionId);
      setView("quiz");
      return;
    }
    setActiveSectionId(previousSectionId);
    setView("section");
  }

  const activeSection = findPrototypeSectionById(modules, activeSectionId);
  const activeModule = findPrototypeModuleById(modules, activeModuleId || activeSection?.moduleId);
  const activeModuleSections = activeModule?.sections || [];
  const activeQuizSection = view === "quiz" ? activeSection : null;
  const editingModule = findPrototypeModuleById(modules, editingModuleId);

  const sectionOverlayOpen =
    view === "section" && activeSection && !activeSection.isQuiz && activeModule;
  const quizOverlayOpen = view === "quiz";
  const previousSectionId = activeSectionId
    ? getPreviousPrototypeSectionIdFromModules(modules, activeSectionId, activeModule?.id)
    : null;
  const hasPreviousSection = !!previousSectionId;

  return (
    <>
      <div className="trainingPrototypeCenter">
        <TripTrainingProgressCard variant="prototype" />

        <CollapsibleSection
          className="tripTrainingResourcesDropdown"
          title="Training resources"
          defaultOpen={false}
          style={{ marginBottom: 16 }}
        >
          <TripTrainingResourcesLayout
            requiredTrainingResources={requiredTrainingResources}
            optionalTrainingResources={optionalTrainingResources}
          />
        </CollapsibleSection>

        <div className="trainingPrototypeModuleList">
          {modules.map((module, index) => (
            <TrainingPrototypeModuleBlock
              key={module.id}
              module={module}
              completedSectionIds={completedPrototypeSectionIds}
              defaultOpen={index === 0}
              canEdit={canManageTrips}
              canViewSectionAckRoster={canViewTeamDashboard}
              sectionCompletionRosters={prototypeSectionCompletionRosters}
              onEditModule={setEditingModuleId}
              onOpenFullSession={openFullSession}
              onOpenQuiz={openQuiz}
              onMarkSectionRead={markSectionComplete}
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
          hasPrevious={hasPreviousSection}
          onPrevious={() => handleSectionPrevious(activeSection.id, activeModule.id)}
          onContinue={() => handleSectionContinue(activeSection.id, activeModule.id)}
          continueLabel={
            findPrototypeSectionById(
              modules,
              getNextPrototypeSectionIdFromModules(modules, activeSection.id, activeModule.id)
            )?.isQuiz
              ? "Continue to quiz"
              : "Next"
          }
          sectionComplete={!!completedPrototypeSectionIds[activeSection.id]}
          onMarkAsRead={() => markSectionComplete(activeSection.id)}
        />
      ) : null}

      {quizOverlayOpen && activeQuizSection && activeModule ? (
        <TrainingQuizModuleView
          title={activeQuizSection.title}
          subtitle={`Section ${activeModuleSections.findIndex((section) => section.id === activeQuizSection.id) + 1} of ${activeModuleSections.length}`}
          quizQuestions={getPrototypeSectionQuiz(activeQuizSection)}
          onBack={closeOverlay}
          hasPrevious={hasPreviousSection}
          onPrevious={() => handleSectionPrevious(activeQuizSection.id, activeModule.id)}
          onSubmitSuccess={() => {
            markSectionComplete(activeQuizSection.id);
            closeOverlay();
          }}
        />
      ) : null}

      {canManageTrips && editingModule ? (
        <TrainingPrototypeModuleEditModal
          module={editingModule}
          onSave={handleSaveModule}
          onCancel={() => setEditingModuleId("")}
        />
      ) : null}
    </>
  );
}
