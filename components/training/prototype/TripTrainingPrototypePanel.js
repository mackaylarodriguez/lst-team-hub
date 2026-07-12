import { useEffect, useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import { useTripPage } from "@/components/trip/TripPageContext";
import { TrainingResourceLink } from "@/components/trip/tripPageShared";
import TripTrainingProgressCard from "@/components/trip/TripTrainingProgressCard";
import TrainingPrototypeModuleBlock from "./TrainingPrototypeModuleBlock";
import TrainingPrototypeModuleEditModal from "./TrainingPrototypeModuleEditModal";
import TrainingSectionFullView from "./TrainingSectionFullView";
import TrainingQuizModuleView from "./TrainingQuizModuleView";
import {
  clonePrototypeModules,
  findPrototypeModuleById,
  findPrototypeSectionById,
  getNextPrototypeSectionIdFromModules,
  getPreviousPrototypeSectionIdFromModules,
  loadPrototypeModules,
  savePrototypeModules,
} from "@/lib/trainingPrototypeStorage";

export default function TripTrainingPrototypePanel() {
  const { canManageTrips, optionalTrainingResources, requiredTrainingResources } = useTripPage();
  const [modules, setModules] = useState(() => clonePrototypeModules());
  const [view, setView] = useState("center");
  const [activeModuleId, setActiveModuleId] = useState("");
  const [activeSectionId, setActiveSectionId] = useState("");
  const [editingModuleId, setEditingModuleId] = useState("");
  const [completedSectionIds, setCompletedSectionIds] = useState({});
  const [sectionQuizSubmitted, setSectionQuizSubmitted] = useState(false);

  useEffect(() => {
    setModules(loadPrototypeModules());
  }, []);

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

  function handleSaveModule(updatedModule) {
    setModules((current) => {
      const next = current.map((module) => (module.id === updatedModule.id ? updatedModule : module));
      savePrototypeModules(next);
      return next;
    });
    setEditingModuleId("");
  }

  function handleSectionContinue(sectionId, moduleId) {
    markSectionComplete(sectionId);
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
  const editingModule = findPrototypeModuleById(modules, editingModuleId);

  const sectionOverlayOpen =
    view === "section" && activeSection && !activeSection.isQuiz && activeModule;
  const quizOverlayOpen = view === "quiz";
  const previousSectionId = activeSection
    ? getPreviousPrototypeSectionIdFromModules(modules, activeSection.id, activeModule?.id)
    : activeModuleId && activeSectionId
      ? getPreviousPrototypeSectionIdFromModules(modules, activeSectionId, activeModuleId)
      : null;
  const hasPreviousSection = !!previousSectionId;

  return (
    <>
      <div className="trainingPrototypeCenter">
        <TripTrainingProgressCard />

        <CollapsibleSection
          title="Training resources"
          subtitle="Required and optional training links"
          defaultOpen={false}
          style={{ marginBottom: 16 }}
        >
          <div className="small" style={{ fontWeight: 900, marginBottom: 8 }}>
            Required training
          </div>
          <div className="tripTrainingResourceGrid">
            {requiredTrainingResources.map((resource) => (
              <TrainingResourceLink key={resource.id} resource={resource} />
            ))}
          </div>

          <div style={{ height: 18 }} />

          <div className="small" style={{ fontWeight: 900, marginBottom: 8 }}>
            Optional
          </div>
          <div className="tripTrainingOptionalGrid">
            {optionalTrainingResources.map((resource) => (
              <TrainingResourceLink key={resource.id} resource={resource} />
            ))}
          </div>
        </CollapsibleSection>

        <div className="trainingPrototypeModuleList">
          {modules.map((module, index) => (
            <TrainingPrototypeModuleBlock
              key={module.id}
              module={module}
              completedSectionIds={completedSectionIds}
              sectionQuizSubmitted={sectionQuizSubmitted}
              defaultOpen={index === 0}
              canEdit={canManageTrips}
              onEditModule={setEditingModuleId}
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
          sectionComplete={!!completedSectionIds[activeSection.id]}
          onMarkAsRead={() => markSectionComplete(activeSection.id)}
        />
      ) : null}

      {quizOverlayOpen ? (
        <TrainingQuizModuleView
          onBack={closeOverlay}
          hasPrevious={hasPreviousSection}
          onPrevious={() => handleSectionPrevious(activeSectionId, activeModuleId)}
          onSubmitSuccess={() => {
            setSectionQuizSubmitted(true);
            markSectionComplete("s5");
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
