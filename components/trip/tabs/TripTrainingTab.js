import { useTripPage } from "../TripPageContext";
import TripParticipantCollapsible from "../TripParticipantCollapsible";
import AppDueDateTripleSelect from "@/components/AppDueDateTripleSelect";
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
  TrainingResourceLink,
  OptionalTripWideDocumentCard,
} from "../tripPageShared";

export default function TripTrainingTab() {
    const {
    basicTrainingUrl,
    canViewTeamDashboard,
    canvasTrainingModules,
    gatewayTrainingUrl,
    currentParticipant,
    currentTrainingProgress,
    formatShortDate,
    optionalTrainingResources,
    overviewTrainingPct,
    requiredTrainingResources,
    session,
    supplementalTrainingModules,
    toDateInputValue,
    toggleTraining,
    trainingState,
    trip,
    updateTrainingDate,
    visibleTrainingParticipants,
  } = useTripPage();

  return (
    <div style={{ display: "grid", gap: 16 }}>
              <CollapsibleSection defaultOpen>
              <div className="card pad">
                <div className="cardSectionPill" style={{ marginBottom: 8 }}>Training resources</div>
    
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
              </div>
              </CollapsibleSection>
    
              <CollapsibleSection defaultOpen>
              <div className="card pad tripSectionCard tripTaskProgressCard">
                <div className="tripTaskProgressTop">
                  <div className="cardSectionPill">Training progress</div>
                  <span className="badge">{overviewTrainingPct}% complete</span>
                </div>
                <div className="progress tripTaskProgressBar">
                  <div style={{ width: `${overviewTrainingPct}%` }} />
                </div>
                <div className="small tripTaskProgressMeta">
                  {canViewTeamDashboard
                    ? "Overall completion across all participant training checklists."
                    : `${currentTrainingProgress?.completed || 0} of ${currentTrainingProgress?.total || 0} modules complete.`}
                </div>
    
                {canViewTeamDashboard ? (
                  <div className="tripTaskProgressParticipants">
                    {visibleTrainingParticipants.map((participant) => (
                      <div
                        key={`${participant.email}-training-summary`}
                        className="tripTaskProgressParticipantRow"
                      >
                        <span className="tripTaskProgressParticipantName">{participant.name}</span>
                        <div className="progress tripTaskProgressBarSmall">
                          <div style={{ width: `${participant.percent}%` }} />
                        </div>
                        <span className="small tripTaskProgressParticipantStat">
                          {participant.percent}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
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
    
                      <h3 className="tripTrainingSectionHeading">Canvas modules</h3>
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
                              className="tripTrainingTaskRow"
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
                          );
                        })}
                      </div>
                    </div>
                    </TripParticipantCollapsible>
                  );
                })}
              </div>
    
              </CollapsibleSection>
            </div>
  );
}
