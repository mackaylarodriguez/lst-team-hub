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
    activeParticipantEmail,
    addingLinkForSlotKey,
    allTrainingModules,
    announcementDraft,
    announcementStatus,
    announcementTextareaRef,
    announcements,
    announcementsLoadError,
    applyAnnouncementSelectionTransform,
    autoSiteInfoLink,
    basicTrainingUrl,
    budgetCheckAmount,
    budgetCheckEditingId,
    budgetCheckModalOpen,
    budgetCheckNote,
    budgetCheckSubmitting,
    canEditRosterTshirtInline,
    canEditTripReferenceEmails,
    canManageTripDocuments,
    canManageTripFundraising,
    canManageTripMeetings,
    canManageTrips,
    canUploadOwnParticipantDocuments,
    canViewFundraisingTeamDashboard,
    canViewMaterialsTab,
    canViewTeamDashboard,
    canViewTripReferenceSection,
    canvasTrainingModules,
    clearPendingStaffTaskNoteSave,
    clearTripDocsUndoCompletely,
    completedCount,
    completionPct,
    confirmingParticipantDocumentDeleteId,
    countForDeadlines,
    currentParticipant,
    currentParticipantFundraisingGoalAmount,
    currentParticipantProgress,
    currentTrainingProgress,
    customParticipantDocumentLabel,
    datedTrainingModuleIds,
    docDraft,
    docs,
    docsError,
    editableStaffTasks,
    editableStaffTasksRef,
    editingAnnouncementId,
    editingDocId,
    editingMeetingId,
    editingOverviewNoteId,
    editingParticipantFundraisingId,
    editingStaffTaskId,
    editingStaffTaskIdRef,
    effectiveHousingLinkDoc,
    effectiveIsLeader,
    effectiveSiteInfoDoc,
    flightsOpenUrl,
    flushStaffTaskNotesSave,
    formatDeadlineDate,
    formatMeetingDateTime,
    formatMoney,
    formatNoteTimestamp,
    formatOptionalMoney,
    formatRecentActivityTimestamp,
    formatShortDate,
    formatSingleDate,
    formatTaskUpdatedAt,
    formatTripDateRange,
    fundraisingDrafts,
    fundraisingFirstDeadlineAmount,
    fundraisingFirstDeadlineDate,
    fundraisingGoalAmount,
    fundraisingSecondDeadlineAmount,
    fundraisingSecondDeadlineDate,
    fundraisingSecondDeadlineTotalAmount,
    fundraisingStatus,
    fundraisingWorkerCount,
    gatewayTrainingUrl,
    getCountdownSummary,
    getFundraisingProgressMeta,
    getProgressClass,
    getProgressInputClass,
    getReferenceStatus,
    getSettledValue,
    getStaffTaskAreaLabel,
    getTravelFormByRefKey,
    getWeeksInCountry,
    getWorkerTaskSection,
    groupLeaderContactSaveStatus,
    groupLeaderTravelDraft,
    groupTasksByWorkArea,
    groupWorkerTasks,
    groupedViewTasks,
    groupedWorkerTasks,
    handleAddLink,
    handleAddRosterMember,
    handleAnnouncementFormatBold,
    handleAnnouncementFormatBullet,
    handleAnnouncementFormatHighlight,
    handleAnnouncementFormatNumbered,
    handleAnnouncementIndent,
    handleAnnouncementKeyDown,
    handleAnnouncementOutdent,
    handleCancelAddLink,
    handleCancelAddWorker,
    handleCancelAnnouncementEdit,
    handleCancelEditDoc,
    handleCancelOverviewNoteEdit,
    handleCancelPendingPdf,
    handleCancelRosterEdit,
    handleCancelStaffTaskEdit,
    handleCancelTripSetupEdit,
    handleEditDoc,
    handleEditStaffTask,
    handleExportMaterialsExcel,
    handleJumpToOverviewItem,
    handleJumpToStaffTask,
    handlePrepareNewPdf,
    handlePrepareRequiredLink,
    handlePrepareRequiredPdf,
    handleRemoveRosterMember,
    handleStaffTaskNotesChange,
    handleStartAddWorker,
    handleStartAnnouncement,
    handleStartOverviewNote,
    handleStartRosterEdit,
    handleStartTripSetupEdit,
    hasDismissedDefaultTripDocumentSlots,
    housingTripDocsDraft,
    housingTripDocsSaveStatus,
    inlineTshirtSavingKey,
    isAddingLink,
    isAddingStaffTask,
    isAddingTask,
    isAddingWorker,
    isAdminUser,
    isConfirmingTripDelete,
    isCustomSiteInput,
    isEditingAnnouncement,
    isEditingMaterialsGlance,
    isEditingOverviewNote,
    isEditingRoster,
    isEditingTeamFundraising,
    isEditingTripSetup,
    isEditingWorkerDueDates,
    isLeader,
    isLeaderOnTripNotTraveling,
    isPreviewingParticipant,
    isStaffPreviewingLeader,
    isStaffPreviewingWorker,
    isTeamFundraisingMode,
    latestStaffTaskSaveRef,
    leaderExpandedTabs,
    linkDraft,
    managerExpandedTabs,
    materialsBudgetLoadGenRef,
    materialsBudgetWorkerCount,
    materialsDraft,
    materialsGlanceLabel,
    materialsGlanceMuted,
    materialsGlanceRow,
    materialsGlanceRowSending,
    materialsGlanceValue,
    materialsMetricCard,
    materialsMetricLabel,
    materialsMetricValue,
    materialsPanelBase,
    materialsRosterHeadcount,
    materialsRosterTshirtLines,
    materialsSaveStatus,
    materialsShippingState,
    materialsTeamVisibleSource,
    materialsTeamWorkbookGlance,
    materialsWorkbookRemainingCopies,
    materialsWorkbookSentCopies,
    materialsWorkbookTargetCopies,
    materialsWorkerCountDelta,
    materialsWorkersDisplayCount,
    meetingAddFormOpen,
    meetingDraft,
    meetingStatus,
    newStaffTaskDraft,
    newStaffTaskTripleRef,
    newWorkerDraft,
    nextFundraisingDeadline,
    normalizeReferenceRefKey,
    normalizeTravelFormRefKey,
    openDeleteTripConfirm,
    openTravelFormModal,
    optionalTrainingResources,
    optionalTripWideCardProps,
    overviewFundraisingDetail,
    overviewFundraisingLabel,
    overviewFundraisingValue,
    overviewNoteDraft,
    overviewNoteStatus,
    overviewNotes,
    overviewTaskLabel,
    overviewTaskPct,
    overviewTrainingLabel,
    overviewTrainingPct,
    overviewUpcomingTasks,
    participantDisplayForTrainingEmail,
    participantDocumentInputRefs,
    participantDocumentStatus,
    participantDocumentTypeStatus,
    participantDocuments,
    participantDocumentsByUserId,
    participantDocumentsError,
    participantDocumentsSummary,
    participantDocumentsTabLabel,
    participantTaskPct,
    participantTaskProgress,
    participantTaskStates,
    participantTrainingStates,
    pct,
    pendingPdfDraft,
    pendingStaffTaskJumpId,
    pendingTrainingModuleJumpId,
    pendingWorkerTaskJumpId,
    prependDocWithoutDuplicates,
    previewParticipantId,
    pushRecentActivity,
    quickLinks,
    recentActivity,
    recentActivityError,
    referenceEmails,
    referenceReceivedProgress,
    referenceSaveStatusByKey,
    referenceTableRows,
    renderAnnouncementInlineFormatting,
    renderAnnouncementMessage,
    renderTripDocumentsLinkDraftForm,
    renderTripSetupCard,
    requiredDocumentSlots,
    requiredTrainingResources,
    resolveRosterMemberIdForTshirt,
    retryReferenceSave,
    revertMaterialsDraftFromBudgetRow,
    rosterDraft,
    rosterStatus,
    router,
    savedFundraisingLinksCount,
    scheduleTripDocsUndo,
    selectedSiteValue,
    session,
    sessionTripRosterRow,
    setLocalStaffTaskField,
    setStaffTaskRowFeedback,
    siteBudgetNotesList,
    siteInfoDoc,
    siteOptions,
    smartsheetBudgetOpenUrl,
    staffDueTripleRef,
    staffList,
    staffSiteWorkbookPlan,
    staffTaskDueDateDraft,
    staffTaskNoteSaveTimeoutsRef,
    staffTaskRowStatus,
    staffTaskRowTimeoutsRef,
    staffTaskStatus,
    staffTaskTitleDraft,
    staffTaskWorkAreas,
    staffTeamFundraisingGoalAmount,
    staffViewAllParticipants,
    subtractDays,
    summedParticipantFundraisingGoal,
    supplementalTrainingModules,
    tab,
    tabs,
    taskDraft,
    taskDraftTripleRef,
    taskStatusMessage,
    teamFundraisingDraft,
    teamFundraisingStatus,
    teamLogisticsDraft,
    teamLogisticsLoadError,
    teamLogisticsLoading,
    teamLogisticsSaveStatus,
    teamTabMembers,
    toDateInputValue,
    toggleReferenceEmail,
    toggleTask,
    toggleTraining,
    totalCount,
    trainingAccessUrl,
    trainingModules,
    trainingPct,
    trainingProgress,
    trainingResources,
    transformAnnouncementSelectedLines,
    travelFormDraft,
    travelFormModalOpen,
    travelFormResponses,
    travelFormStatus,
    travelFormTableRows,
    travelFormTargetRefKey,
    travelFormsSummary,
    trip,
    tripBudgetCheckDeleteId,
    tripBudgetCheckRequests,
    tripBudgetLoadError,
    tripBudgetRow,
    tripDocsUndoBanner,
    tripDocsUndoRunRef,
    tripDocsUndoTimerRef,
    tripDocumentCategorySections,
    tripDocumentWorkerOptions,
    tripDocumentsTabLabel,
    tripFundraisingGoal,
    tripHousingDocuments,
    tripHousingLinkUrl,
    tripHousingPdfUrl,
    tripIsMassachusettsDomestic,
    tripLoadComplete,
    tripMeetings,
    tripMeetingsLoadError,
    tripSetupDraft,
    tripSetupStatus,
    tripSiteCanonicalLabel,
    tripSiteHasStaffHousingNote,
    tripSiteLogisticsRpcUrl,
    tripTabTravelSafety,
    tripTasks,
    tripUserDocumentTypes,
    updateFundraisingDraft,
    updateNewWorkerDraft,
    updateReferenceField,
    updateReferenceSentDate,
    updateRosterDraftMember,
    updateStaffTask,
    updateTrainingDate,
    updateTripSetupDraft,
    visibleDocs,
    visibleFundraisingParticipants,
    visibleSiteInfoDoc,
    visibleTaskParticipants,
    visibleTrainingParticipants,
    visibleTravelFormParticipants,
    withComputedStaffDueDates,
    workerAddStatus,
    workerDocumentParticipants,
    workerOverviewFundraisingUrl,
    workerPreviewOptions,
    workerSpecificFundraisingGoalAmount,
    workerTabList,
    workerTripTaskCategoryOptions,
    wrapAnnouncementSelection,
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
