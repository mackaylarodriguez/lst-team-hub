import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import AppDueDateTripleSelect from "@/components/AppDueDateTripleSelect";
import Spinner from "@/components/Spinner";
import ConfirmModal from "@/components/ConfirmModal";
import Link from "next/link";
import { useRouter } from "next/router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { requireSession } from "@/lib/auth";
import {
  assignWorkerByEmailToTrip,
  deleteTrip,
  getTripForCurrentUser,
  listTripParticipants,
  removeTripAssignment,
  saveTripGroupLeaderTravelContact,
  saveTripParticipantDocumentTypes,
  updateTripForCurrentUser,
} from "@/lib/trips";
import { isAdminRole, isLeaderRole, isManagerRole } from "@/lib/roles";
import {
  listTripTeamMembers,
  saveTripTeamMemberFundraisingUrl,
  saveTripTeamMembers,
  updateTripTeamMemberTshirtSize,
} from "@/lib/tripTeamMembers";
import { pruneTripTicketsForNonTravelingLeaders } from "@/lib/tripTickets";
import {
  getTrainingModuleDeadline,
  listTrainingModules,
  listTrainingProgress,
  resolveProfileIdByEmailForTraining,
  saveTrainingProgress,
} from "@/lib/training";
import {
  getTrainingSessionOptionsForModuleTitle,
  hydrateTrainingSessionDateFromDb,
  resolveTrainingSessionSelectValue,
} from "@/lib/trainingSessionOptions";
import { saveFundraisingProfile } from "@/lib/fundraising";
import {
  addLinkResource,
  addPdfResource,
  deleteResource,
  insertResourceFromSnapshot,
  isMissingResourceTutorialColumnError,
  listResources,
  updateResource,
} from "@/lib/resources";
import {
  DOCUMENT_CATEGORY_OPTIONS,
  getDocumentSlotByKey,
  getSmartsheetBudgetTutorialCards,
  REQUIRED_TRIP_DOCUMENT_SLOTS,
} from "@/lib/tripDocumentSlots";
import { isWorkerTaskCompletedInState, percentComplete } from "@/lib/tasks";
import {
  listStaffTasksForTrip,
  isTaskAssignedToUser,
  saveStaffTasks as persistStaffTasks,
  sortStaffTasksByTemplate,
  computeStaffTaskDueDate,
  getStaffTaskAreaSortRank,
  listStaffTaskTemplateWorkAreas,
  STAFF_TASKS_UPDATED_EVENT,
} from "@/lib/staffTasks";
import {
  createTripTask,
  listTripTasks,
  updateTripTask,
  listUserTaskProgress,
  loadProfileEmailsByUserIds,
  saveUserTaskProgress,
} from "@/lib/tripTasks";
import {
  listReferenceEmails,
  referenceRowToStateKey,
  saveReferenceEmail,
} from "@/lib/referenceEmails";
import {
  deleteTripOverviewNote,
  listTripOverviewNotes,
  saveTripOverviewNote,
} from "@/lib/tripOverviewNotes";
import {
  deleteTripAnnouncement,
  listTripAnnouncements,
  saveTripAnnouncement,
} from "@/lib/tripAnnouncements";
import { saveTripFundraisingSettings } from "@/lib/tripFundraising";
import { listTripActivity, logTripActivity } from "@/lib/tripActivity";
import {
  getTripUserDocumentTypes,
  getUserDocumentTypeLabel,
  normalizeCustomUserDocumentTypes,
} from "@/lib/userDocumentTypes";
import {
  deleteUserDocument,
  listTripUserDocuments,
  saveUserDocumentUpload,
} from "@/lib/userDocuments";
import {
  DEFAULT_TRAINING_TIMELINE_TYPE,
  TRAINING_TIMELINE_OPTIONS,
  findWorkerTaskTemplate,
  getWorkerTaskDisplayTitle,
  isWorkerPassportOrVisaUploadTask,
} from "@/lib/workerTaskTemplate";
import { isUsMassachusettsMissionSite } from "@/lib/usMassachusettsSite";
import { findStaffTaskTemplate } from "@/lib/staffTaskTemplate";
import {
  EMPTY_RECORD as TRAVEL_FORM_EMPTY,
  getTravelFormForRef,
  saveTravelFormForRef,
  listTravelFormResponsesForTrip,
  travelFormRowToRefKey,
} from "@/lib/travelForm";
import {
  fillTravelFormExportTemplate,
  TRAVEL_FORM_TEMPLATE_PATH,
} from "@/lib/travelFormExport";
import * as XLSX from "xlsx";
import { showToast } from "@/components/Toast";
import { formatPhoneNumber, toPhoneHref } from "@/lib/phone";
import ExpandableCollapsibleSection from "@/components/CollapsibleSection";
import TripTravelSafetySection from "@/components/TripTravelSafetySection";
import RosterTshirtSizeSelect from "@/components/RosterTshirtSizeSelect";
import { deleteTripMeeting, listTripMeetings, saveTripMeeting } from "@/lib/tripMeetings";
import {
  getTripBudget,
  getTripHousingDocumentsForViewer,
  getTripSiteLogisticsUrlForViewer,
  listSiteBudgetNotes,
  saveTripBudget,
  uploadTripHousingPdf,
} from "@/lib/tripBudget";
import {
  deleteBudgetCheckRequest,
  listBudgetCheckRequestsForTrip,
  submitBudgetCheckRequest,
  updateBudgetCheckRequest,
} from "@/lib/budgetCheckRequests";
import { budgetCheckSubmitToast } from "@/lib/budgetCheckSubmitFeedback";
import { getTripTeamLogisticsForViewer, saveTripTeamLogisticsByTeam } from "@/lib/tripTeamLogistics";
import {
  buildSiteLabelsOrdered,
  findSiteBudgetNoteForOption,
  resolveCanonicalSiteLabelForTrip,
  resolveEffectiveSiteHostName,
  resolveSiteBudgetNoteForTripLocation,
  resolveTripSiteLogisticsUrl,
} from "@/lib/siteMaterials";
import {
  parseAnyWorkbookInventoryString,
  summarizeWorkbookItemsForShipping,
} from "@/lib/workbookInventory";
import { resolveSiteLogisticsUrl } from "@/lib/siteInfoLinks";
import { TripPageProvider } from "@/components/trip/TripPageProvider";
import TripTabPanels from "@/components/trip/TripTabPanels";
import { useTripPageModel } from "@/hooks/useTripPageModel";
import * as TripPageShared from "@/components/trip/tripPageShared";

const {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
  LEADER_PREVIEW_PARTICIPANT_ID,
  TRAVEL_FORM_MODAL_SECTION_STYLE,
  BIRTHDATE_MONTH_OPTIONS,
  BIRTHDATE_DAY_OPTIONS,
  BIRTHDATE_YEAR_OPTIONS,
  GENDER_OPTIONS,
  YES_NO_OPTIONS,
} = TripPageShared;

export default function TripPage() {
  const tripPage = useTripPageModel();
  const { pagePhase } = tripPage;

  if (pagePhase === "router-loading") {
    return (
      <Shell>
        <div className="card pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Spinner size={40} />
          <div style={{ fontWeight: 900 }}>Loading...</div>
        </div>
      </Shell>
    );
  }

  if (pagePhase === "trip-loading" || pagePhase === "trip-not-found") {
    return (
      <Shell>
        <div className="card pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          {pagePhase === "trip-loading" ? <Spinner size={40} /> : null}
          <div style={{ fontWeight: 900 }}>
            {pagePhase === "trip-not-found" ? "Trip not found" : "Loading trip..."}
          </div>
          <div className="small">
            {pagePhase === "trip-not-found"
              ? "This trip could not be loaded for your current account."
              : "Fetching trip details."}
          </div>
        </div>
      </Shell>
    );
  }

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
    countdownSummary,
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
    handleConfirmDeleteTrip,
    handleConfirmTripBudgetCheckDelete,
    handleDeleteAnnouncement,
    handleSaveAnnouncement,
    handleSaveTravelForm,
    handleSubmitBudgetCheckFromTripMaterials,
    setAnnouncementDraft,
    setBudgetCheckAmount,
    setBudgetCheckEditingId,
    setBudgetCheckModalOpen,
    setBudgetCheckNote,
    setIsConfirmingTripDelete,
    setPreviewParticipantId,
    setTab,
    setTravelFormDraft,
    setTravelFormModalOpen,
    setTripBudgetCheckDeleteId,
    setTripSetupStatus,
  } = tripPage;

  return (
    <TripPageProvider value={tripPage}>
    <Shell>
      <ConfirmModal
        open={isConfirmingTripDelete}
        title="Delete trip?"
        message={trip?.name ? `"${trip.name}" will be permanently removed. This cannot be undone.` : "This trip will be permanently removed. This cannot be undone."}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => handleConfirmDeleteTrip()}
        onCancel={() => {
          setIsConfirmingTripDelete(false);
          setTripSetupStatus("");
        }}
      />
      <ConfirmModal
        open={!!tripBudgetCheckDeleteId}
        title="Delete check request?"
        message="This removes the request and deletes the linked personal accounting task if one exists. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => void handleConfirmTripBudgetCheckDelete()}
        onCancel={() => setTripBudgetCheckDeleteId("")}
      />
      <div className="tripDetailPage">
        <nav className="breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: 6 }}>
          <Link href="/trips">Trips</Link>
          <span className="small" style={{ color: "var(--muted)", margin: "0 6px" }}>/</span>
          <span className="small" style={{ color: "var(--text)" }}>{trip.name}</span>
        </nav>
        <div className="tripDetailHero card pad tripDetailHeroCompact">
          <div className="row tripPageHeader tripDetailHeroTop">
            <div className="tripPageHeaderTitle">
              <div className="tripDetailHeroHeading">
                <h1 className="tripDetailHeroTitle">{trip.name}</h1>
                <span className="tripDetailHeroMeta">
                  {trip.location} • {trip.dates}
                </span>
              </div>
            </div>
            <div className="spacer" />
            {canManageTrips && (
              <div className="row tripPageHeaderActions" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {canManageTrips ? (
                  <button
                    className="btn btnDanger tripDetailHeroActionBtn"
                    type="button"
                    onClick={openDeleteTripConfirm}
                  >
                    Delete Trip
                  </button>
                ) : null}
                <select
                  className="input tripPagePreviewSelect tripDetailHeroPreviewSelect"
                  value={previewParticipantId}
                  onChange={(event) => setPreviewParticipantId(event.target.value)}
                >
                  <option value="">Staff view (full)</option>
                  <option value={LEADER_PREVIEW_PARTICIPANT_ID}>Leader view (preview)</option>
                  {workerPreviewOptions.length > 0 ? (
                    <optgroup label="Worker view — choose roster member">
                      {workerPreviewOptions.map((participant) => (
                        <option key={participant.id} value={participant.id}>
                          {participant.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
                {isStaffPreviewingLeader ? (
                  <span className="badge">Previewing leader view</span>
                ) : null}
                {isPreviewingParticipant ? (
                  <span className="badge">Previewing worker view</span>
                ) : null}
              </div>
            )}
          </div>

          <div className="tripDetailProgressRow tripDetailProgressRowCompact">
            <div className="tripDetailProgressBlock tripDetailProgressBlockCompact">
              <div className="tripDetailProgressInline">
                <span className="tripDetailProgressLabel">Trip completion</span>
                <span className="tripDetailProgressPct">{pct}%</span>
              </div>
              <div className="progress tripDetailProgressBar">
                <div style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="tripDetailMiniCard tripDetailMiniCardCompact">
              <div className="tripDetailMiniValue">{countdownSummary.label}</div>
              {countdownSummary.detail ? (
                <div className="small tripDetailMiniDetail">{countdownSummary.detail}</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="tripOverviewHighlights" style={{ marginBottom: 14 }}>
        <div
          className="card pad"
          style={{
            background: "linear-gradient(180deg, rgba(234,242,255,.95), #ffffff 42%)",
            borderColor: "rgba(47,73,147,.22)",
            position: "relative",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "0 auto 0 0",
              width: 6,
              background: "linear-gradient(180deg, var(--primary), var(--primary2))",
            }}
          />
          <div className="row" style={{ marginBottom: 10, paddingLeft: 6 }}>
            <div>
              <div style={{ fontWeight: 900 }}>Announcements</div>
              <div className="small">Staff updates for this trip.</div>
            </div>
            <div className="spacer" />
            {canViewTeamDashboard && !isEditingAnnouncement ? (
              <button className="btn" type="button" onClick={handleStartAnnouncement}>
                Add Announcement
              </button>
            ) : null}
          </div>
          {isEditingAnnouncement ? (
            <div style={{ paddingLeft: 6 }}>
              <div className="row" style={{ gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <button className="btn" type="button" onClick={handleAnnouncementFormatBold}>
                  Bold
                </button>
                <button className="btn" type="button" onClick={handleAnnouncementFormatHighlight}>
                  Highlight
                </button>
                <button className="btn" type="button" onClick={handleAnnouncementFormatBullet}>
                  Bullet list
                </button>
                <button className="btn" type="button" onClick={handleAnnouncementFormatNumbered}>
                  Numbered list
                </button>
                <button className="btn" type="button" onClick={handleAnnouncementIndent}>
                  Indent
                </button>
                <button className="btn" type="button" onClick={handleAnnouncementOutdent}>
                  Outdent
                </button>
              </div>
              <textarea
                ref={announcementTextareaRef}
                className="input"
                rows={3}
                value={announcementDraft}
                onChange={(event) => setAnnouncementDraft(event.target.value)}
                onKeyDown={handleAnnouncementKeyDown}
                placeholder="Share an update the team should see."
                style={{ tabSize: 4 }}
              />
              <div className="small" style={{ marginTop: 6, opacity: 0.8 }}>
                Tip: press Tab to indent and Shift+Tab to outdent selected lines.
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn btnPrimary" type="button" onClick={handleSaveAnnouncement}>
                  Save Announcement
                </button>
                <button className="btn" type="button" onClick={handleCancelAnnouncementEdit}>
                  Cancel
                </button>
                {editingAnnouncementId ? (
                  <button className="btn" type="button" onClick={handleDeleteAnnouncement}>
                    Delete
                  </button>
                ) : null}
                <AppStatusMessage
                  message={announcementStatus}
                  tone={
                    announcementStatus === "Saved."
                      ? "success"
                      : announcementStatus === "Saving..."
                        ? "info"
                        : "danger"
                  }
                  compact
                />
              </div>
            </div>
          ) : announcements.length > 0 ? (
            <div style={{ display: "grid", gap: 12, paddingLeft: 6 }}>
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "#ffffff",
                    border: "1px solid rgba(47,73,147,.12)",
                    boxShadow: "0 10px 20px rgba(47,73,147,.06)",
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {renderAnnouncementMessage(announcement.message)}
                  </div>
                  <div className="small" style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>
                      <strong>By:</strong> {announcement.authorName || announcement.authorEmail || "Unknown user"}
                    </span>
                    {announcement.updatedAt ? (
                      <span>
                        <strong>Updated:</strong> {formatNoteTimestamp(announcement.updatedAt)}
                      </span>
                    ) : null}
                  </div>
                  {canViewTeamDashboard ? (
                    <div className="row" style={{ marginTop: 10 }}>
                      <button className="btn" type="button" onClick={() => handleStartAnnouncement(announcement)}>
                        Edit
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="small" style={{ paddingLeft: 6 }}>
              {announcementsLoadError
                ? `Unable to load announcements: ${announcementsLoadError}`
                : "Updates from staff about this trip will appear here."}
            </div>
          )}
        </div>

      </div>

      <div className="tabs tripPageTabs appPolishToolbar" style={{ marginBottom: 14 }}>
        {tabs.map(t => (
          <button
            key={t}
            className={"tab " + (tab === t ? "tabActive" : "")}
            onClick={() => setTab(t)}
            type="button"
          >
            {t}
          </button>
        ))}
        </div>
        <TripTabPanels />
{travelFormModalOpen && (
        <div
          className="appModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Travel form"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.45)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 50,
          }}
        >
          <div className="card pad appModalCard" style={{ width: "min(900px, 100%)", maxHeight: "90vh", overflow: "auto" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>Travel Form</div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={() => setTravelFormModalOpen(false)}>Close</button>
            </div>
            <div className="small" style={{ marginBottom: 14 }}>
              Complete all fields. LST uses this for ticketing and travel logistics.
            </div>
            {travelFormStatus ? (
              <div className="row" style={{ marginBottom: 10, alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <AppStatusMessage
                  message={travelFormStatus}
                  tone={travelFormStatus === "Saved." ? "success" : travelFormStatus === "Saving..." ? "info" : "danger"}
                />
                {travelFormStatus !== "Saving..." && travelFormStatus !== "Saved." ? (
                  <button type="button" className="btn btnPrimary" onClick={() => handleSaveTravelForm()}>
                    Try again
                  </button>
                ) : null}
              </div>
            ) : null}
            <div style={{ display: "grid", gap: 12 }}>
              {tripIsMassachusettsDomestic ? (
                <>
                  <div style={TRAVEL_FORM_MODAL_SECTION_STYLE}>
                    <div className="cardSectionPill" style={{ marginBottom: 2, width: "fit-content" }}>
                      Identity
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                      <div><div className="small" style={{ marginBottom: 4 }}>Team Name</div>{canViewTeamDashboard ? <input className="input" value={travelFormDraft.teamName} onChange={(e) => setTravelFormDraft((d) => ({ ...d, teamName: e.target.value }))} placeholder="2026 Massachusetts Team" /> : <input className="input" readOnly disabled value={travelFormDraft.teamName} style={{ opacity: 0.9, cursor: "not-allowed" }} />}</div>
                      <div><div className="small" style={{ marginBottom: 4 }}>First Name (as on ID)</div><input className="input" value={travelFormDraft.firstNamePassport} onChange={(e) => setTravelFormDraft((d) => ({ ...d, firstNamePassport: e.target.value }))} /></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Middle Name (as on ID)</div><input className="input" value={travelFormDraft.middleNamePassport} onChange={(e) => setTravelFormDraft((d) => ({ ...d, middleNamePassport: e.target.value }))} /></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Last Name (as on ID)</div><input className="input" value={travelFormDraft.lastNamePassport} onChange={(e) => setTravelFormDraft((d) => ({ ...d, lastNamePassport: e.target.value }))} /></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Suffix</div><input className="input" value={travelFormDraft.suffix} onChange={(e) => setTravelFormDraft((d) => ({ ...d, suffix: e.target.value }))} placeholder="Jr., Sr." /></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Email</div><input className="input" type="email" value={travelFormDraft.email} onChange={(e) => setTravelFormDraft((d) => ({ ...d, email: e.target.value }))} /></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                      <div><div className="small" style={{ marginBottom: 4 }}>Birthdate Month</div><select className="input" value={travelFormDraft.birthdateMonth} onChange={(e) => setTravelFormDraft((d) => ({ ...d, birthdateMonth: e.target.value }))}><option value="">—</option>{BIRTHDATE_MONTH_OPTIONS.filter(Boolean).map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Birthdate Day</div><select className="input" value={travelFormDraft.birthdateDay} onChange={(e) => setTravelFormDraft((d) => ({ ...d, birthdateDay: e.target.value }))}><option value="">—</option>{BIRTHDATE_DAY_OPTIONS.filter(Boolean).map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Birthdate Year</div><select className="input" value={travelFormDraft.birthdateYear} onChange={(e) => setTravelFormDraft((d) => ({ ...d, birthdateYear: e.target.value }))}><option value="">—</option>{BIRTHDATE_YEAR_OPTIONS.filter(Boolean).map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Gender</div><select className="input" value={travelFormDraft.gender} onChange={(e) => setTravelFormDraft((d) => ({ ...d, gender: e.target.value }))}>{GENDER_OPTIONS.map((g) => <option key={g || "__blank__"} value={g}>{g || "—"}</option>)}</select></div>
                    </div>
                  </div>
                  <div style={TRAVEL_FORM_MODAL_SECTION_STYLE}>
                    <div className="cardSectionPill" style={{ marginBottom: 2, width: "fit-content" }}>
                      Project & preferences
                    </div>
                    <div><div className="small" style={{ marginBottom: 4 }}>Special travel preferences (extra travel, airline, layovers, miles, upgrades, etc. or NONE)</div><textarea className="input" rows={3} value={travelFormDraft.specialTravelPreferences} onChange={(e) => setTravelFormDraft((d) => ({ ...d, specialTravelPreferences: e.target.value }))} /></div>
                    <div><div className="small" style={{ marginBottom: 4 }}>Frequent Flyer / Known Traveler (Pre-check) number</div><input className="input" value={travelFormDraft.frequentFlyerPrecheck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, frequentFlyerPrecheck: e.target.value }))} /></div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                      <div><div className="small" style={{ marginBottom: 4 }}>Site of LST Project (city AND country)</div><input className="input" value={travelFormDraft.siteProject} onChange={(e) => setTravelFormDraft((d) => ({ ...d, siteProject: e.target.value }))} /></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Gateway City (departure point)</div><input className="input" value={travelFormDraft.gatewayCity} onChange={(e) => setTravelFormDraft((d) => ({ ...d, gatewayCity: e.target.value }))} /></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                      <div>
                        <div className="small" style={{ marginBottom: 4 }}>Official Departure Date</div>
                        <AppDueDateTripleSelect
                          compact
                          value={travelFormDraft.departureDate}
                          onChange={(ymd) =>
                            setTravelFormDraft((d) => ({ ...d, departureDate: ymd }))
                          }
                        />
                      </div>
                      <div>
                        <div className="small" style={{ marginBottom: 4 }}>Official Return Date</div>
                        <AppDueDateTripleSelect
                          compact
                          value={travelFormDraft.returnDate}
                          onChange={(ymd) =>
                            setTravelFormDraft((d) => ({ ...d, returnDate: ymd }))
                          }
                        />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                      <div><div className="small" style={{ marginBottom: 4 }}>Minor (under 18)</div><select className="input" value={travelFormDraft.isMinor} onChange={(e) => setTravelFormDraft((d) => ({ ...d, isMinor: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Do you have a REAL ID?</div><select className="input" value={travelFormDraft.hasRealId} onChange={(e) => setTravelFormDraft((d) => ({ ...d, hasRealId: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={TRAVEL_FORM_MODAL_SECTION_STYLE}>
                    <div className="cardSectionPill" style={{ marginBottom: 2, width: "fit-content" }}>
                      Identity
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                      <div><div className="small" style={{ marginBottom: 4 }}>Team Name</div>{canViewTeamDashboard ? <input className="input" value={travelFormDraft.teamName} onChange={(e) => setTravelFormDraft((d) => ({ ...d, teamName: e.target.value }))} placeholder="2026 Brazil Team" /> : <input className="input" readOnly disabled value={travelFormDraft.teamName} style={{ opacity: 0.9, cursor: "not-allowed" }} />}</div>
                      <div><div className="small" style={{ marginBottom: 4 }}>First Name (passport)</div><input className="input" value={travelFormDraft.firstNamePassport} onChange={(e) => setTravelFormDraft((d) => ({ ...d, firstNamePassport: e.target.value }))} /></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Middle Name (passport)</div><input className="input" value={travelFormDraft.middleNamePassport} onChange={(e) => setTravelFormDraft((d) => ({ ...d, middleNamePassport: e.target.value }))} /></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Last Name (passport)</div><input className="input" value={travelFormDraft.lastNamePassport} onChange={(e) => setTravelFormDraft((d) => ({ ...d, lastNamePassport: e.target.value }))} /></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Suffix</div><input className="input" value={travelFormDraft.suffix} onChange={(e) => setTravelFormDraft((d) => ({ ...d, suffix: e.target.value }))} placeholder="Jr., Sr." /></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Email</div><input className="input" type="email" value={travelFormDraft.email} onChange={(e) => setTravelFormDraft((d) => ({ ...d, email: e.target.value }))} /></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                      <div><div className="small" style={{ marginBottom: 4 }}>Birthdate Month</div><select className="input" value={travelFormDraft.birthdateMonth} onChange={(e) => setTravelFormDraft((d) => ({ ...d, birthdateMonth: e.target.value }))}><option value="">—</option>{BIRTHDATE_MONTH_OPTIONS.filter(Boolean).map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Birthdate Day</div><select className="input" value={travelFormDraft.birthdateDay} onChange={(e) => setTravelFormDraft((d) => ({ ...d, birthdateDay: e.target.value }))}><option value="">—</option>{BIRTHDATE_DAY_OPTIONS.filter(Boolean).map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Birthdate Year</div><select className="input" value={travelFormDraft.birthdateYear} onChange={(e) => setTravelFormDraft((d) => ({ ...d, birthdateYear: e.target.value }))}><option value="">—</option>{BIRTHDATE_YEAR_OPTIONS.filter(Boolean).map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Gender</div><select className="input" value={travelFormDraft.gender} onChange={(e) => setTravelFormDraft((d) => ({ ...d, gender: e.target.value }))}>{GENDER_OPTIONS.map((g) => <option key={g || "__blank__"} value={g}>{g || "—"}</option>)}</select></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Citizenship</div><input className="input" value={travelFormDraft.citizenship} onChange={(e) => setTravelFormDraft((d) => ({ ...d, citizenship: e.target.value }))} /></div>
                    </div>
                  </div>
                  <div style={TRAVEL_FORM_MODAL_SECTION_STYLE}>
                    <div className="cardSectionPill" style={{ marginBottom: 2, width: "fit-content" }}>
                      Passport & travel
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                      <div><div className="small" style={{ marginBottom: 4 }}>Passport Number</div><input className="input" value={travelFormDraft.passportNumber} onChange={(e) => setTravelFormDraft((d) => ({ ...d, passportNumber: e.target.value }))} /></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Passport Expiration (M/D/Y)</div><input className="input" value={travelFormDraft.passportExpirationDate} onChange={(e) => setTravelFormDraft((d) => ({ ...d, passportExpirationDate: e.target.value }))} placeholder="MM/DD/YYYY" /></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Issuing Country</div><input className="input" value={travelFormDraft.passportIssuingCountry} onChange={(e) => setTravelFormDraft((d) => ({ ...d, passportIssuingCountry: e.target.value }))} /></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                      <div><div className="small" style={{ marginBottom: 4 }}>Gateway City (departure point)</div><input className="input" value={travelFormDraft.gatewayCity} onChange={(e) => setTravelFormDraft((d) => ({ ...d, gatewayCity: e.target.value }))} /></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                      <div>
                        <div className="small" style={{ marginBottom: 4 }}>Official Departure Date</div>
                        <AppDueDateTripleSelect
                          compact
                          value={travelFormDraft.departureDate}
                          onChange={(ymd) =>
                            setTravelFormDraft((d) => ({ ...d, departureDate: ymd }))
                          }
                        />
                      </div>
                      <div>
                        <div className="small" style={{ marginBottom: 4 }}>Official Return Date</div>
                        <AppDueDateTripleSelect
                          compact
                          value={travelFormDraft.returnDate}
                          onChange={(ymd) =>
                            setTravelFormDraft((d) => ({ ...d, returnDate: ymd }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div style={TRAVEL_FORM_MODAL_SECTION_STYLE}>
                    <div className="cardSectionPill" style={{ marginBottom: 2, width: "fit-content" }}>
                      Project & preferences
                    </div>
                    <div><div className="small" style={{ marginBottom: 4 }}>Special travel preferences (extra travel, airline, layovers, miles, upgrades, etc. or NONE)</div><textarea className="input" rows={3} value={travelFormDraft.specialTravelPreferences} onChange={(e) => setTravelFormDraft((d) => ({ ...d, specialTravelPreferences: e.target.value }))} /></div>
                    <div><div className="small" style={{ marginBottom: 4 }}>Frequent Flyer / Known Traveler (Pre-check) number</div><input className="input" value={travelFormDraft.frequentFlyerPrecheck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, frequentFlyerPrecheck: e.target.value }))} /></div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                      <div><div className="small" style={{ marginBottom: 4 }}>Site of LST Project (city AND country)</div><input className="input" value={travelFormDraft.siteProject} onChange={(e) => setTravelFormDraft((d) => ({ ...d, siteProject: e.target.value }))} /></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                      <div><div className="small" style={{ marginBottom: 4 }}>Minor (under 18)</div><select className="input" value={travelFormDraft.isMinor} onChange={(e) => setTravelFormDraft((d) => ({ ...d, isMinor: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                      <div><div className="small" style={{ marginBottom: 4 }}>Passport valid 6+ months after trip</div><select className="input" value={travelFormDraft.passportValidSixMonths} onChange={(e) => setTravelFormDraft((d) => ({ ...d, passportValidSixMonths: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                    </div>
                  </div>
                </>
              )}
              <div style={TRAVEL_FORM_MODAL_SECTION_STYLE}>
                <div className="cardSectionPill" style={{ marginBottom: 2, width: "fit-content" }}>
                  Acknowledgments
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div><div className="small" style={{ marginBottom: 4 }}>Base Ticket: I understand LST will book my travel from Gateway City to site and back.</div><select className="input" value={travelFormDraft.baseTicketAck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, baseTicketAck: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                  <div><div className="small" style={{ marginBottom: 4 }}>Team Travel: I understand my team must arrive same day, same airport, same time.</div><select className="input" value={travelFormDraft.teamTravelAck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, teamTravelAck: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                  <div><div className="small" style={{ marginBottom: 4 }}>End Meeting: I understand debriefing takes place within a week of return.</div><select className="input" value={travelFormDraft.endMeetingAck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, endMeetingAck: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                  <div><div className="small" style={{ marginBottom: 4 }}>Travel Insurance: I understand LST purchases basic plan; I can upgrade.</div><select className="input" value={travelFormDraft.travelInsuranceAck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, travelInsuranceAck: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                </div>
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn btnPrimary" type="button" onClick={() => void handleSaveTravelForm()}>Save Travel Form</button>
            </div>
          </div>
        </div>
      )}

      {budgetCheckModalOpen && (
        <div
          className="appModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label={budgetCheckEditingId ? "Edit budget check request" : "Request budget check"}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.45)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 50,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !budgetCheckSubmitting) {
              setBudgetCheckModalOpen(false);
              setBudgetCheckEditingId("");
            }
          }}
        >
          <div className="card pad appModalCard" style={{ width: "min(480px, 100%)", maxHeight: "90vh", overflow: "auto" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>
                {budgetCheckEditingId ? "Edit check request" : "Request budget check"}
              </div>
              <div className="spacer" />
              <button
                className="btn"
                type="button"
                disabled={budgetCheckSubmitting}
                onClick={() => {
                  setBudgetCheckModalOpen(false);
                  setBudgetCheckEditingId("");
                }}
              >
                Close
              </button>
            </div>
            <p className="small" style={{ marginBottom: 14, lineHeight: 1.45, color: "var(--muted)" }}>
              {budgetCheckEditingId ? (
                <>
                  Only <strong>pending</strong> requests can be edited. The assignee&apos;s task stays in sync.
                  Mark processed on{" "}
                  <Link href="/budget?tab=checks">Budget → Checks</Link>.
                </>
              ) : (
                <>
                  This is not the same as the team&apos;s saved budget total — enter the amount for the check you
                  need printed. Any staff or admin can mark the request processed later on{" "}
                  <Link href="/budget?tab=checks">Budget → Checks</Link>.
                </>
              )}
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="small" style={{ marginBottom: 4 }}>
                  Check amount
                </div>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="$0.00"
                  value={budgetCheckAmount}
                  onChange={(e) => setBudgetCheckAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 4 }}>
                  Note (optional)
                </div>
                <textarea
                  className="input"
                  rows={3}
                  value={budgetCheckNote}
                  onChange={(e) => setBudgetCheckNote(e.target.value)}
                  placeholder="Payee, memo, or other context for accounting."
                />
              </div>
            </div>
            <div className="row" style={{ marginTop: 14, gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btnPrimary"
                type="button"
                disabled={budgetCheckSubmitting}
                onClick={() => void handleSubmitBudgetCheckFromTripMaterials()}
              >
                {budgetCheckSubmitting
                  ? "Saving…"
                  : budgetCheckEditingId
                    ? "Save changes"
                    : "Submit request"}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </Shell>
    </TripPageProvider>
  );
}
