import { useTripPage } from "../TripPageContext";
import {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
  AppDetailAction,
  TrainingResourceLink,
  OptionalTripWideDocumentCard,
} from "../tripPageShared";

export default function TripTasksTab() {
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
                <div className="card pad tripSectionCard tripTaskProgressCard">
                  <div className="tripTaskProgressTop">
                    <div className="cardSectionPill">Task progress</div>
                    <span className="badge">{overviewTaskPct}% complete</span>
                  </div>
                  <div className="progress tripTaskProgressBar">
                    <div style={{ width: `${overviewTaskPct}%` }} />
                  </div>
                  <div className="small tripTaskProgressMeta">
                    {canViewTeamDashboard
                      ? "Overall completion across all participant task lists."
                      : `${currentParticipantProgress?.completed || 0} of ${currentParticipantProgress?.total || 0} tasks complete.`}
                  </div>
    
                  {canViewTeamDashboard ? (
                    <div className="tripTaskProgressParticipants">
                      {visibleTaskParticipants.map((participant) => (
                        <div
                          key={`${participant.email}-summary`}
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
              {canManageTrips && staffViewAllParticipants ? (
                <div
                  className="row"
                  style={{
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                    marginBottom: 8,
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    style={{ flexShrink: 0 }}
                    onClick={() => setIsEditingWorkerDueDates((current) => !current)}
                  >
                    {isEditingWorkerDueDates ? "Done editing due dates" : "Edit due dates"}
                  </button>
                  <button
                    type="button"
                    className="btn btnPrimary"
                    style={{ flexShrink: 0 }}
                    onClick={() => {
                      setIsAddingTask((current) => {
                        if (current) setTaskStatusMessage("");
                        return !current;
                      });
                    }}
                  >
                    {isAddingTask ? "Cancel" : "Add task"}
                  </button>
                </div>
              ) : null}
    
              {isAddingTask && canManageTrips && staffViewAllParticipants ? (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    marginBottom: 16,
                    marginTop: -4,
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,.92)",
                  }}
                >
                  <input
                    className="input"
                    value={taskDraft.title}
                    onChange={(event) =>
                      setTaskDraft((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Task title"
                  />
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>
                      Due date
                    </div>
                    <AppDueDateTripleSelect
                      ref={taskDraftTripleRef}
                      value={taskDraft.dueDate}
                      onChange={(ymd) =>
                        setTaskDraft((current) => ({ ...current, dueDate: ymd }))
                      }
                    />
                  </div>
                  <select
                    className="input"
                    value={
                      workerTripTaskCategoryOptions.includes(taskDraft.category)
                        ? taskDraft.category
                        : "General"
                    }
                    onChange={(event) =>
                      setTaskDraft((current) => ({ ...current, category: event.target.value }))
                    }
                  >
                    {workerTripTaskCategoryOptions.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="input"
                    value={taskDraft.description}
                    onChange={(event) =>
                      setTaskDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Description"
                    rows={3}
                  />
                  <AppStatusMessage message={taskStatusMessage} tone="danger" />
                  <div className="row">
                    <button className="btn btnPrimary" type="button" onClick={handleCreateTask}>
                      Save task
                    </button>
                  </div>
                </div>
              ) : null}
    
              <div className="tripTrainingPanel">
                {visibleTaskParticipants.map((participant, participantIndex) => {
                  const taskState = participantTaskStates[normalizeEmail(participant.email)] || {};
    
                  return (
                    <div key={participant.email} className="tripTrainingParticipantBlock">
                      {canViewTeamDashboard && visibleTaskParticipants.length > 1 ? (
                        <h3 className="tripTrainingSectionHeading">{participant.name}</h3>
                      ) : null}
                      {tripTasks.length > 0 ? (
                        groupedWorkerTasks.map(([section, sectionTasks]) => (
                          <div key={`${participant.email}-${section}`}>
                            <h3 className="tripTrainingSectionHeading">{section}</h3>
                            <div className="tripTrainingTaskList">
                              {sectionTasks.map((task) => {
                                const done = isWorkerTaskCompletedInState(task, taskState);
                                const canEditTaskDueInThisColumn =
                                  canViewTeamDashboard && participantIndex === 0;
                                const isTravelFormTask = task.title === "Fill out Travel Form";
                                const canFillTravelForm =
                                  isTravelFormTask &&
                                  String(participant.id) === String(currentParticipant?.id);
                                const workerTaskTemplate = findWorkerTaskTemplate(task);
                                const isChecklistTask =
                                  task.id === "worker-task-checklist" ||
                                  task.title === "Received and has reviewed Project Management Checklist";
                                const isTicketsTask =
                                  task.id === "worker-task-tickets" ||
                                  task.title === "Proofread my tickets";
                                const isMaterialsPageTask =
                                  workerTaskTemplate?.id === "worker-task-materials-page";
                                const isDocumentsTask = isWorkerPassportOrVisaUploadTask(task);
                                const documentsTabUrl = trip?.id
                                  ? `/trips/${encodeURIComponent(trip.id)}?tab=documents`
                                  : null;
                                const participantRefKey = participant.rosterOnly
                                  ? String(participant.id || "").startsWith("roster-member-")
                                    ? `roster:${String(participant.id).slice("roster-member-".length)}`
                                    : ""
                                  : `user:${participant.id}`;
                                const taskLink = isChecklistTask
                                  ? preferredTripResourceOpenUrl(effectiveSiteInfoDoc) ||
                                    workerTaskTemplate?.link
                                  : isTicketsTask
                                    ? null
                                    : isDocumentsTask
                                      ? documentsTabUrl
                                      : workerTaskTemplate?.link;
                                const taskDetails = task.description || workerTaskTemplate?.details;
                                const checkboxId = `task-${participant.email}-${task.id}`.replace(
                                  /[^a-zA-Z0-9_-]/g,
                                  "-"
                                );
    
                                return (
                                  <div
                                    key={`${participant.email}-${task.id}`}
                                    id={
                                      !canViewTeamDashboard &&
                                      String(participant.id || "") ===
                                        String(currentParticipant?.id || "")
                                        ? buildWorkerTaskRowDomId(task.id)
                                        : undefined
                                    }
                                    className="tripTrainingTaskRow"
                                  >
                                    <div className="tripTrainingTaskRowInner">
                                      <input
                                        id={checkboxId}
                                        type="checkbox"
                                        className="tripTrainingTaskCheckbox"
                                        checked={done}
                                        onChange={() => toggleTask(task.id, participant.email)}
                                      />
                                      <div className="tripTrainingTaskRowContent">
                                        <div className="tripTrainingTaskRowHeader">
                                          <label className="tripTrainingTaskTitle" htmlFor={checkboxId}>
                                            {getWorkerTaskDisplayTitle(task, trip?.location)}
                                          </label>
                                          <span
                                            className={
                                              "tripTrainingTaskStatus" + (done ? " isComplete" : "")
                                            }
                                          >
                                            {done ? "Complete" : "Not started"}
                                          </span>
                                        </div>
                                        {canViewTeamDashboard ? (
                                          isEditingWorkerDueDates ? (
                                            canEditTaskDueInThisColumn ? (
                                              <div className="tripTrainingTaskField">
                                                <div
                                                  className="row"
                                                  style={{
                                                    alignItems: "center",
                                                    gap: 8,
                                                    flexWrap: "wrap",
                                                  }}
                                                >
                                                  <input
                                                    className="input"
                                                    type="date"
                                                    style={{ width: 170 }}
                                                    value={toDateInputValue(task.due)}
                                                    onChange={(e) =>
                                                      void persistWorkerTaskDueDate(
                                                        task.id,
                                                        e.target.value
                                                      )
                                                    }
                                                  />
                                                  <button
                                                    type="button"
                                                    className="btn"
                                                    style={{ padding: "2px 10px", fontSize: 12 }}
                                                    onClick={() =>
                                                      void persistWorkerTaskDueDate(task.id, "")
                                                    }
                                                  >
                                                    Clear
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="small tripTrainingTaskMeta">
                                                {task.due
                                                  ? `Due: ${formatShortDate(task.due)}`
                                                  : "Due: Not set"}
                                              </div>
                                            )
                                          ) : (
                                            <div className="small tripTrainingTaskMeta">
                                              {task.due
                                                ? `Due: ${formatShortDate(task.due)}`
                                                : "Due: Not set"}
                                            </div>
                                          )
                                        ) : task.due ? (
                                          <div className="small tripTrainingTaskMeta">
                                            {`Due: ${formatShortDate(task.due)}`}
                                          </div>
                                        ) : null}
                                        {taskDetails ? (
                                          <div className="small tripTrainingTaskMeta">{taskDetails}</div>
                                        ) : null}
                                        {taskLink ||
                                        isTicketsTask ||
                                        isMaterialsPageTask ||
                                        canFillTravelForm ||
                                        (isTravelFormTask &&
                                          canViewTeamDashboard &&
                                          participantRefKey) ? (
                                          <div className="tripChecklistTaskActions">
                                            {taskLink || isTicketsTask || isMaterialsPageTask ? (
                                              isTicketsTask || isDocumentsTask || isMaterialsPageTask ? (
                                                <button
                                                  type="button"
                                                  className="tripChecklistTaskLink"
                                                  onClick={
                                                    isTicketsTask
                                                      ? () => setTab(tripDocumentsTabLabel)
                                                      : isMaterialsPageTask
                                                        ? () => setTab("Materials")
                                                        : () => setTab(participantDocumentsTabLabel)
                                                  }
                                                >
                                                  View details →
                                                </button>
                                              ) : (
                                                <a
                                                  href={taskLink}
                                                  target="_blank"
                                                  rel="noreferrer noopener"
                                                  className="tripChecklistTaskLink"
                                                >
                                                  View details →
                                                </a>
                                              )
                                            ) : null}
                                            {canFillTravelForm ? (
                                              <button
                                                type="button"
                                                className="tripChecklistTaskLink"
                                                onClick={() =>
                                                  openTravelFormModal({
                                                    refKey: `user:${participant.id}`,
                                                    email: participant.email || "",
                                                  })
                                                }
                                              >
                                                Fill out travel form →
                                              </button>
                                            ) : isTravelFormTask &&
                                              canViewTeamDashboard &&
                                              participantRefKey ? (
                                              <button
                                                type="button"
                                                className="tripChecklistTaskLink"
                                                onClick={() =>
                                                  openTravelFormModal({
                                                    refKey: participantRefKey,
                                                    email: participant.email || "",
                                                  })
                                                }
                                              >
                                                View / edit travel form →
                                              </button>
                                            ) : null}
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      ) : (
                        <AppEmptyState
                          compact
                          title="No tasks yet"
                          description="Tasks for this trip will appear here once they are added."
                        />
                      )}
                    </div>
                  );
                })}
              </div>
    
              </CollapsibleSection>
            </div>
  );
}
