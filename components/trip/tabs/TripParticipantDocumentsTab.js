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

export default function TripParticipantDocumentsTab() {
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
    handleAddParticipantDocumentType,
    handleDeleteParticipantDocument,
    handleUploadParticipantDocument,
    setConfirmingParticipantDocumentDeleteId,
    setCustomParticipantDocumentLabel,
  } = useTripPage();

  return (
    <div style={{ display: "grid", gap: 16 }}>
              <CollapsibleSection defaultOpen>
              <div className="card pad">
                <div
                  className="row mobileSectionHeader"
                  style={{
                    marginBottom: 8,
                    gap: 12,
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                  }}
                >
                  <div className="cardSectionPill" style={{ marginBottom: 0 }}>
                    {canViewTeamDashboard ? "Worker uploads" : "My documents"}
                  </div>
                  {canViewTeamDashboard ? (
                    <div className="row mobileSectionHeaderActions" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <input
                        className="input mobileHeaderInput"
                        value={customParticipantDocumentLabel}
                        onChange={(event) => setCustomParticipantDocumentLabel(event.target.value)}
                        placeholder="Add upload item"
                        style={{ minWidth: 220 }}
                      />
                      <button className="btn" type="button" onClick={handleAddParticipantDocumentType}>
                        Add Upload
                      </button>
                    </div>
                  ) : null}
                </div>
                {canViewTeamDashboard ? (
                  <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
                    Per-participant uploads and review.
                  </div>
                ) : null}
                {canViewTeamDashboard ? (
                  <AppStatusMessage
                    message={participantDocumentTypeStatus}
                    tone={
                      participantDocumentTypeStatus === "Saved."
                        ? "success"
                        : participantDocumentTypeStatus === "Saving..."
                          ? "info"
                          : "danger"
                    }
                    compact
                  />
                ) : null}
    
                <AppStatusMessage message={participantDocumentsError} tone="danger" />
    
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: canViewTeamDashboard
                      ? "repeat(auto-fit, minmax(280px, 1fr))"
                      : "1fr",
                    gap: 16,
                  }}
                >
                  {workerDocumentParticipants.map((participant) => {
                    const documentSlots = participantDocumentsByUserId.get(String(participant.id)) || {};
                    const participantUploadedCount = tripUserDocumentTypes.filter(
                      (documentType) => !!documentSlots[documentType.key]
                    ).length;
                    const participantMissingCount = Math.max(
                      tripUserDocumentTypes.length - participantUploadedCount,
                      0
                    );
    
                    return (
                      <div
                        key={participant.id}
                        className="card pad"
                        style={{
                          boxShadow: "none",
                          borderRadius: 18,
                          border: "1px solid rgba(15, 23, 42, 0.08)",
                          background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.92))",
                        }}
                      >
                        <div className="row" style={{ marginBottom: 14, alignItems: "flex-start", gap: 12 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 900 }}>
                              {canViewTeamDashboard && !participant.rosterOnly ? (
                                <Link href={`/profile?participantId=${encodeURIComponent(participant.id)}`}>
                                  {participant.name}
                                </Link>
                              ) : (
                                canViewTeamDashboard ? participant.name : "My Uploads"
                              )}
                            </div>
                            <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>
                              {participantUploadedCount} uploaded · {participantMissingCount} missing
                            </div>
                          </div>
                          <span className={`badge ${participantMissingCount > 0 ? "badgeWarn" : "badgeSuccess"}`}>
                            {participantMissingCount > 0 ? "Needs review" : "Complete"}
                          </span>
                        </div>
    
                        <div style={{ display: "grid", gap: 12 }}>
                          {tripUserDocumentTypes.map((documentType) => {
                            const document = documentSlots[documentType.key] || null;
                            const statusKey = `${participant.id}:${documentType.key}`;
                            const slotStatus = participantDocumentStatus[statusKey];
                            const canUploadParticipantDocument =
                              !participant.rosterOnly &&
                              (canViewTeamDashboard ||
                                (canUploadOwnParticipantDocuments &&
                                  String(participant.id) === String(currentParticipant?.id)));
    
                            return (
                              <div
                                key={`${participant.id}-${documentType.key}`}
                                style={{
                                  padding: 14,
                                  borderRadius: 14,
                                  border: "1px solid rgba(15, 23, 42, 0.08)",
                                  background: "rgba(255,255,255,.78)",
                                }}
                              >
                                <div className="row" style={{ alignItems: "flex-start" }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 900 }}>{documentType.label}</div>
                                    <div className="small" style={{ marginTop: 4 }}>
                                      {document
                                        ? `Uploaded ${formatNoteTimestamp(document.updatedAt || document.createdAt)}`
                                        : documentType.description}
                                    </div>
                                  </div>
                                  <span className={"badge " + (document ? "badgeSuccess" : "badgeWarn")}>
                                    {document ? "Uploaded" : "Missing"}
                                  </span>
                                </div>
    
                                <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
                                  {document ? (
                                    <a className="btn btnPrimary" href={document.fileUrl} target="_blank" rel="noreferrer">
                                      Open
                                    </a>
                                  ) : !canUploadParticipantDocument ? (
                                    <button
                                      className="btn"
                                      type="button"
                                      disabled
                                      style={{ opacity: 0.6, cursor: "not-allowed" }}
                                    >
                                      No file
                                    </button>
                                  ) : null}
    
                                  {canUploadParticipantDocument ? (
                                    <>
                                      <button
                                        className="btn"
                                        type="button"
                                        onClick={() => participantDocumentInputRefs.current[statusKey]?.click()}
                                      >
                                        {document ? "Replace" : canViewTeamDashboard ? "Upload for worker" : "Upload"}
                                      </button>
                                      <input
                                        ref={(element) => {
                                          participantDocumentInputRefs.current[statusKey] = element;
                                        }}
                                        type="file"
                                        hidden
                                        onChange={(event) => {
                                          const file = event.target.files?.[0];
                                          void handleUploadParticipantDocument(
                                            participant.id,
                                            documentType.key,
                                            file
                                          );
                                          event.target.value = "";
                                        }}
                                      />
                                    </>
                                  ) : null}
    
                                  {(document && (
                                    (canViewTeamDashboard) ||
                                    (canUploadOwnParticipantDocuments && String(participant.id) === String(currentParticipant?.id))
                                  )) ? (
                                    <button
                                      className="btn"
                                      type="button"
                                      onClick={() => {
                                        if (confirmingParticipantDocumentDeleteId === document.id) {
                                          void handleDeleteParticipantDocument(document);
                                          return;
                                        }
    
                                        setConfirmingParticipantDocumentDeleteId(document.id);
                                      }}
                                    >
                                      {confirmingParticipantDocumentDeleteId === document.id
                                        ? "Confirm Delete"
                                        : "Delete"}
                                    </button>
                                  ) : null}
    
                                  {slotStatus?.message ? (
                                    <AppStatusMessage
                                      message={slotStatus.message}
                                      tone={slotStatus.type === "error" ? "danger" : slotStatus.type === "success" ? "success" : "info"}
                                      compact
                                    />
                                  ) : null}
                                  {canViewTeamDashboard && participant.rosterOnly ? (
                                    <AppStatusMessage
                                      message="Waiting for worker account before upload."
                                      tone="warning"
                                      compact
                                    />
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              </CollapsibleSection>
            </div>
  );
}
