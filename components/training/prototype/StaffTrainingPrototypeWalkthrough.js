import { useEffect, useMemo, useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
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
import {
  getOptionalTrainingResources,
  getRequiredTrainingResources,
} from "@/lib/trainingResources";
import { listStaffProfiles } from "@/lib/auth";
import { normalizeEmail } from "@/lib/resendMail";

const SAMPLE_TRIP_NAME = "Demo trip";
const SAMPLE_TRIP_LOCATION = "South Korea, Seoul";

const requiredTrainingResources = getRequiredTrainingResources();
const optionalTrainingResources = getOptionalTrainingResources();

function buildDemoTripParticipants(staffProfiles, session) {
  const sessionEmail = normalizeEmail(session?.email);
  const byEmail = new Map();

  for (const profile of staffProfiles || []) {
    const email = normalizeEmail(profile.email);
    if (!email) continue;
    byEmail.set(email, {
      id: profile.id || email,
      name: profile.name || email,
      email,
      role: "Staff",
      isSessionStaff: email === sessionEmail,
    });
  }

  // Keep the signed-in user on the roster even if they are admin (not role=staff).
  if (sessionEmail && !byEmail.has(sessionEmail)) {
    byEmail.set(sessionEmail, {
      id: session?.id || "staff-session",
      name: String(session?.name || "").trim() || sessionEmail,
      email: sessionEmail,
      role: "Staff",
      isSessionStaff: true,
    });
  }

  return [...byEmail.values()].sort((left, right) =>
    String(left.name || left.email).localeCompare(String(right.name || right.email), undefined, {
      sensitivity: "base",
    })
  );
}

function emptyParticipantSectionStates(participants) {
  const states = {};
  for (const participant of participants) {
    states[participant.email] = {};
  }
  return states;
}

export default function StaffTrainingPrototypeWalkthrough({ session }) {
  const sessionStaffEmail = normalizeEmail(session?.email);
  const [staffProfiles, setStaffProfiles] = useState([]);
  const [staffLoadError, setStaffLoadError] = useState("");
  const [staffLoading, setStaffLoading] = useState(true);

  const sampleParticipants = useMemo(
    () => buildDemoTripParticipants(staffProfiles, session),
    [staffProfiles, session]
  );

  const [modules, setModules] = useState(() => loadPrototypeModules());
  const [participantSectionStates, setParticipantSectionStates] = useState({});
  const [view, setView] = useState("center");
  const [activeModuleId, setActiveModuleId] = useState("");
  const [activeSectionId, setActiveSectionId] = useState("");
  const [editingModuleId, setEditingModuleId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStaff() {
      setStaffLoading(true);
      setStaffLoadError("");
      try {
        const profiles = await listStaffProfiles();
        if (cancelled) return;
        setStaffProfiles(profiles);
        const participants = buildDemoTripParticipants(profiles, session);
        setModules(loadPrototypeModules());
        setParticipantSectionStates(emptyParticipantSectionStates(participants));
      } catch (error) {
        if (cancelled) return;
        console.error("Unable to load staff for demo trip", error);
        setStaffLoadError(error?.message || "Unable to load staff profiles.");
        const participants = buildDemoTripParticipants([], session);
        setStaffProfiles([]);
        setParticipantSectionStates(emptyParticipantSectionStates(participants));
      } finally {
        if (!cancelled) setStaffLoading(false);
      }
    }

    void loadStaff();
    return () => {
      cancelled = true;
    };
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
    // Next / Continue only navigates. Completion requires Mark section as read / Mark video as watched.
    if (!sectionId || !completedSectionIds[sectionId]) return;

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
            Staff on this demo trip ({participantProgress.length}). Your checkoffs update your row
            and the section lists below.
          </div>

          {staffLoading ? (
            <p className="small trainingPrototypeMuted" style={{ marginTop: 12, marginBottom: 0 }}>
              Loading staff…
            </p>
          ) : null}

          {staffLoadError ? (
            <p className="small" style={{ marginTop: 12, marginBottom: 0, color: "var(--danger, #b42318)" }}>
              {staffLoadError}
            </p>
          ) : null}

          {!staffLoading ? (
            <div className="tripTaskProgressParticipants">
              {participantProgress.length ? (
                participantProgress.map((participant) => (
                  <div key={participant.email} className="tripTaskProgressParticipantRow">
                    <span className="tripTaskProgressParticipantName">{participant.name}</span>
                    <div className="progress tripTaskProgressBarSmall">
                      <div style={{ width: `${participant.percent}%` }} />
                    </div>
                    <span className="small tripTaskProgressParticipantStat">{participant.percent}%</span>
                  </div>
                ))
              ) : (
                <p className="small trainingPrototypeMuted" style={{ marginTop: 12, marginBottom: 0 }}>
                  No staff profiles found (role = staff).
                </p>
              )}
            </div>
          ) : null}
        </div>

        <CollapsibleSection
          className="tripTrainingResourcesDropdown"
          title="Staff Led Components"
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
