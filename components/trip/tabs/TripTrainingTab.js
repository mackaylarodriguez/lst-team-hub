import { useState } from "react";
import { useTripPage } from "../TripPageContext";
import TripParticipantCollapsible from "../TripParticipantCollapsible";
import AppDueDateTripleSelect from "@/components/AppDueDateTripleSelect";
import TripTrainingPrototypePanel from "@/components/training/prototype/TripTrainingPrototypePanel";
import TripTrainingProgressCard from "../TripTrainingProgressCard";
import TripTrainingResourcesLayout from "../TripTrainingResourcesLayout";
import { buildTrainingModuleRowDomId } from "../tripPageShared";
import {
  getTrainingSessionOptionsForModuleTitle,
  resolveTrainingSessionSelectValue,
} from "@/lib/trainingSessionOptions";
import {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
  AppDetailAction,
  OptionalTripWideDocumentCard,
} from "../tripPageShared";

export default function TripTrainingTab() {
    const {
    basicTrainingUrl,
    canManageTrips,
    canViewTeamDashboard,
    canvasTrainingModules,
    gatewayTrainingUrl,
    currentParticipant,
    formatShortDate,
    optionalTrainingResources,
    requiredTrainingResources,
    supplementalTrainingModules,
    toDateInputValue,
    toggleTraining,
    trainingState,
    trip,
    updateTrainingDate,
    visibleTrainingParticipants,
  } = useTripPage();

  const [trainingPanelMode, setTrainingPanelMode] = useState("current");

  const currentTrainingContent = (
    <>
              <CollapsibleSection className="tripTrainingResourcesDropdown" defaultOpen>
              <div className="card pad">
                <div className="cardSectionPill" style={{ marginBottom: 8 }}>Training resources</div>

                <TripTrainingResourcesLayout
                  requiredTrainingResources={requiredTrainingResources}
                  optionalTrainingResources={optionalTrainingResources}
                />
              </div>
              </CollapsibleSection>
    
              <CollapsibleSection defaultOpen>
              <TripTrainingProgressCard />
              </CollapsibleSection>
    
              <CollapsibleSection defaultOpen>
              <div
                className={
                  canViewTeamDashboard && visibleTrainingParticipants.length > 1
                    ? "tripTrainingPanel tripTrainingPanelStaffCollapsible"
                    : "tripTrainingPanel"
                }
              >
                {visibleTrainingParticipants.map((participant, participantIndex) => {
                  const trainingState = participant.trainingState || {};
                  const staffMultiParticipant =
                    canViewTeamDashboard && visibleTrainingParticipants.length > 1;

                  return (
                    <TripParticipantCollapsible
                      key={participant.email}
                      enabled={staffMultiParticipant}
                      participant={participant}
                      tripId={trip?.id}
                      kind="training"
                      defaultOpen={participantIndex === 0}
                    >
                    <div className="tripTrainingParticipantBlock">
                      {!staffMultiParticipant &&
                      canViewTeamDashboard &&
                      visibleTrainingParticipants.length > 1 ? (
                        <h3 className="tripTrainingSectionHeading">{participant.name}</h3>
                      ) : null}
    
                      <h3 className="tripTrainingSectionHeading">Classroom modules</h3>
                      <div className="tripTrainingTaskList">
                        {canvasTrainingModules.map((module) => {
                          const isComplete = !!trainingState[module.id];
                          const checkboxId = `training-${participant.email}-${module.id}`;
                          return (
                            <div
                              key={`${participant.email}-${module.id}`}
                              id={
                                !canViewTeamDashboard &&
                                String(participant.id || "") === String(currentParticipant?.id || "")
                                  ? buildTrainingModuleRowDomId(module.id)
                                  : undefined
                              }
                              className="tripTrainingTaskRow"
                            >
                              <div className="tripTrainingTaskRowInner">
                                <input
                                  id={checkboxId}
                                  type="checkbox"
                                  className="tripTrainingTaskCheckbox"
                                  checked={isComplete}
                                  onChange={() => toggleTraining(module.id, participant.email)}
                                />
                                <div className="tripTrainingTaskRowContent">
                                  <div className="tripTrainingTaskRowHeader">
                                    <label className="tripTrainingTaskTitle" htmlFor={checkboxId}>
                                      {module.title}
                                    </label>
                                    <span
                                      className={
                                        "tripTrainingTaskStatus" + (isComplete ? " isComplete" : "")
                                      }
                                    >
                                      {isComplete ? "Completed" : "Not started"}
                                    </span>
                                  </div>
                                  {module.deadlineDate ? (
                                    <div className="small tripTrainingTaskMeta">
                                      {`Due: ${formatShortDate(module.deadlineDate)}`}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
    
                      <h3 className="tripTrainingSectionHeading">Basic / Gateway / EndMeeting</h3>
                      <p className="small tripTrainingSectionSubtitle">
                        Please confirm the training dates you signed up for. Checking these off or
                        choosing a date here does not register you for a session — use the
                        registration link in each row (or in Training resources above).
                      </p>
                      <div className="tripTrainingTaskList">
                        {supplementalTrainingModules.map((module) => {
                          const modKey = String(module.id);
                          const sessionOptions = getTrainingSessionOptionsForModuleTitle(module.title);
                          const dateKey = `${modKey}Date`;
                          const rawStored = trainingState[dateKey] || "";
                          const formattedTrainingDate = toDateInputValue(rawStored);
                          const selectValue = sessionOptions
                            ? resolveTrainingSessionSelectValue(rawStored, sessionOptions)
                            : rawStored;
                          const isComplete = !!trainingState[modKey];
                          const checkboxId = `training-${participant.email}-${modKey}`;
                          const moduleTitle = String(module.title || "").trim();
                          const registrationUrl =
                            moduleTitle === "Basic Training"
                              ? basicTrainingUrl
                              : moduleTitle === "Gateway Training" || moduleTitle === "EndMeeting"
                                ? gatewayTrainingUrl
                                : null;
                          const registrationLabel =
                            moduleTitle === "Basic Training"
                              ? "Register for Basic Training →"
                              : moduleTitle === "Gateway Training" || moduleTitle === "EndMeeting"
                                ? "Register for Gateway & EndMeetings →"
                                : "Register here →";
                          return (
                            <div
                              key={`${participant.email}-${modKey}`}
                              id={
                                !canViewTeamDashboard &&
                                String(participant.id || "") === String(currentParticipant?.id || "")
                                  ? buildTrainingModuleRowDomId(modKey)
                                  : undefined
                              }
                              className="tripTrainingTaskRow tripTrainingTaskRowCompact"
                            >
                              <div className="tripTrainingTaskRowInner">
                                <input
                                  id={checkboxId}
                                  type="checkbox"
                                  className="tripTrainingTaskCheckbox"
                                  checked={isComplete}
                                  onChange={() => toggleTraining(modKey, participant.email)}
                                />
                                <div className="tripTrainingTaskRowContent">
                                  <div className="tripTrainingTaskRowHeader">
                                    <label className="tripTrainingTaskTitle" htmlFor={checkboxId}>
                                      {module.title}
                                    </label>
                                    {module.deadlineDate ? (
                                      <span className="small tripTrainingTaskMeta tripTrainingTaskMetaInline">
                                        {`Due: ${formatShortDate(module.deadlineDate)}`}
                                      </span>
                                    ) : null}
                                    <span
                                      className={
                                        "tripTrainingTaskStatus" + (isComplete ? " isComplete" : "")
                                      }
                                    >
                                      {isComplete ? "Completed" : "Not started"}
                                    </span>
                                  </div>
                                  <div className="tripTrainingTaskRowFooter">
                                    {sessionOptions ? (
                                      <div className="tripTrainingTaskField">
                                        <select
                                          className="input"
                                          value={selectValue}
                                          onChange={(e) =>
                                            updateTrainingDate(modKey, e.target.value, participant.email)
                                          }
                                        >
                                          <option value="">Select session…</option>
                                          {sessionOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    ) : (
                                      <div className="tripTrainingTaskField">
                                        <AppDueDateTripleSelect
                                          compact
                                          nativeDatePickerOnly
                                          value={formattedTrainingDate}
                                          onChange={(value) =>
                                            updateTrainingDate(modKey, value, participant.email)
                                          }
                                        />
                                      </div>
                                    )}
                                    {registrationUrl ? (
                                      <div className="tripChecklistTaskActions">
                                        <a
                                          href={registrationUrl}
                                          target="_blank"
                                          rel="noreferrer noopener"
                                          className="tripChecklistTaskLink"
                                        >
                                          {registrationLabel}
                                        </a>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    </TripParticipantCollapsible>
                  );
                })}
              </div>
    
              </CollapsibleSection>
    </>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {canManageTrips ? (
        <div className="trainingPrototypeTripTabBar">
          <button
            type="button"
            className={
              "trainingPrototypeTripTab" +
              (trainingPanelMode === "current" ? " trainingPrototypeTripTabActive" : "")
            }
            onClick={() => setTrainingPanelMode("current")}
          >
            Current Training
          </button>
          <button
            type="button"
            className={
              "trainingPrototypeTripTab" +
              (trainingPanelMode === "prototype" ? " trainingPrototypeTripTabActive" : "")
            }
            onClick={() => setTrainingPanelMode("prototype")}
          >
            Prototype Training
          </button>
        </div>
      ) : null}

      {canManageTrips && trainingPanelMode === "prototype" ? (
        <TripTrainingPrototypePanel />
      ) : (
        currentTrainingContent
      )}
            </div>
  );
}
