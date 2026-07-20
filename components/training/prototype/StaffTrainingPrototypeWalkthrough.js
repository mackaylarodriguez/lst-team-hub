import { useEffect, useMemo, useState } from "react";
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
import {
  getPrototypeSectionQuiz,
  TRAINING_OVERVIEW_PROTOTYPE_WORKERS,
} from "@/lib/trainingCenterPrototypeMock";
import { normalizeEmail } from "@/lib/resendMail";

const SAMPLE_TRIP_NAME = "Demo trip";
const SAMPLE_TRIP_LOCATION = "South Korea, Seoul";

function workerEmail(worker) {
  return `${worker.id}@prototype.lst`;
}

function buildDemoTripParticipants(session) {
  const staffEmail = normalizeEmail(session?.email) || "staff@prototype.lst";
  const staffName = String(session?.name || "").trim() || "You (Staff)";

  const staffParticipant = {
    id: "staff-session",
    name: staffName,
    email: staffEmail,
    role: "Staff",
    sectionsCompleteSeed: 0,
    isSessionStaff: true,
  };

  const teammates = TRAINING_OVERVIEW_PROTOTYPE_WORKERS.filter(
    (worker) => normalizeEmail(workerEmail(worker)) !== staffEmail
  ).map((worker) => ({
    id: worker.id,
    name: worker.name,
    email: workerEmail(worker),
    role: worker.role,
    sectionsCompleteSeed: worker.sectionsComplete || 0,
    isSessionStaff: false,
  }));

  return [staffParticipant, ...teammates];
}

function seedParticipantSectionStates(modules, participants) {
  const sectionIds = modules.flatMap((module) => (module.sections || []).map((section) => section.id));
  const states = {};

  for (const participant of participants) {
    const completed = {};
    sectionIds.slice(0, participant.sectionsCompleteSeed).forEach((sectionId) => {
      completed[sectionId] = true;
    });
    states[participant.email] = completed;
  }

  return states;
}

export default function StaffTrainingPrototypeWalkthrough({ session }) {
  const sampleParticipants = useMemo(() => buildDemoTripParticipants(session), [session]);
  const sessionStaffEmail = sampleParticipants.find((participant) => participant.isSessionStaff)?.email || "";

  const [modules, setModules] = useState(() => loadPrototypeModules());
  const [participantSectionStates, setParticipantSectionStates] = useState(() =>
    seedParticipantSectionStates(loadPrototypeModules(), buildDemoTripParticipants(session))
  );
  const [view, setView] = useState("center");
  const [activeModuleId, setActiveModuleId] = useState("");
  const [activeSectionId, setActiveSectionId] = useState("");
  const [editingModuleId, setEditingModuleId] = useState("");

  useEffect(() => {
    const nextModules = loadPrototypeModules();
    const participants = buildDemoTripParticipants(session);
    setModules(nextModules);
    setParticipantSectionStates(seedParticipantSectionStates(nextModules, participants));
  }, [session]);

  const allSections = useMemo(
    () => modules.flatMap((module) => module.sections || []),
    [modules]
  );

  const participantProgress = useMemo(() => {
    return sampleParticipants.map((participant) => {
      const sectionState = participantSectionStates[participant.email] || {};
      const total = allSections.length;
      const completed = allSections.filter((section) => sectionState[section.id]).length;
      return {
        ...participant,
        sectionState,
        completed,
        total,
        percent: total ? Math.round((completed / total) * 100) : 0,
      };
    });
  }, [sampleParticipants, participantSectionStates, allSections]);

  const teamProgressPct = useMemo(() => {
    const totalPossible = participantProgress.reduce((sum, participant) => sum + participant.total, 0);
    const completed = participantProgress.reduce((sum, participant) => sum + participant.completed, 0);
    return totalPossible ? Math.round((completed / totalPossible) * 100) : 0;
  }, [participantProgress]);

  const completedSectionIds = useMemo(
    () => participantSectionStates[sessionStaffEmail] || {},
    [participantSectionStates, sessionStaffEmail]
  );

  const sectionCompletionRosters = useMemo(() => {
    const rosters = {};
    for (const section of allSections) {
      const completed = [];
      const missing = [];
      for (const participant of participantProgress) {
        if (participant.sectionState?.[section.id]) {
          completed.push(participant);
        } else {
          missing.push(participant);
        }
      }
      rosters[section.id] = {
        completed,
        missing,
        total: participantProgress.length,
      };
    }
    return rosters;
  }, [allSections, participantProgress]);

  function markSectionComplete(sectionId) {
    if (!sectionId || !sessionStaffEmail) return;
    setParticipantSectionStates((prev) => ({
      ...prev,
      [sessionStaffEmail]: {
        ...(prev[sessionStaffEmail] || {}),
        [sectionId]: true,
      },
    }));
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
        current.map((module) => (module.id === updatedModule.id ? updatedModule : module))
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
        <div className="card pad tripSectionCard tripTaskProgressCard" style={{ marginBottom: 16 }}>
          <div className="tripTaskProgressTop">
            <div>
              <div className="cardSectionPill" style={{ marginBottom: 6 }}>
                {SAMPLE_TRIP_NAME}
              </div>
              <div className="small trainingPrototypeMuted">{SAMPLE_TRIP_LOCATION}</div>
            </div>
            <span className="badge">{teamProgressPct}% complete</span>
          </div>
          <div className="progress tripTaskProgressBar">
            <div style={{ width: `${teamProgressPct}%` }} />
          </div>
          <div className="small tripTaskProgressMeta">
            Overall completion across everyone on this demo trip.
          </div>

          <div className="tripTaskProgressParticipants">
            {participantProgress.map((participant) => (
              <div key={participant.email} className="tripTaskProgressParticipantRow">
                <span className="tripTaskProgressParticipantName">{participant.name}</span>
                <div className="progress tripTaskProgressBarSmall">
                  <div style={{ width: `${participant.percent}%` }} />
                </div>
                <span className="small tripTaskProgressParticipantStat">{participant.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="trainingPrototypeModuleList">
          {modules.map((module, index) => (
            <TrainingPrototypeModuleBlock
              key={module.id}
              module={module}
              completedSectionIds={completedSectionIds}
              defaultOpen={index === 0}
              canEdit
              canViewSectionAckRoster
              sectionCompletionRosters={sectionCompletionRosters}
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
          sectionComplete={!!completedSectionIds[activeSection.id]}
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

      {editingModule ? (
        <TrainingPrototypeModuleEditModal
          module={editingModule}
          onSave={handleSaveModule}
          onCancel={() => setEditingModuleId("")}
        />
      ) : null}
    </>
  );
}
