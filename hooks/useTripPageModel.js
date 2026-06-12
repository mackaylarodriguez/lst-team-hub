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
  loadWorkerProfilesByEmails,
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
import * as TripPageShared from "@/components/trip/tripPageShared";

const {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
  AppDetailAction,
  TrainingResourceLink,
  OptionalTripWideDocumentCard,
  toDatetimeLocalValue,
  normalizeEmail,
  normalizeLegacyTeamRole,
  shouldIncludeInTripWorkerPipeline,
  numWorkersDraftFromBudgetValue,
  getWorkerConnectionStatus,
  preferredTripResourceOpenUrl,
  formatDraftAmount,
  draftFeeAmountUnlessDefault,
  buildDateOffsetFromToday,
  buildTripSetupDraft,
  createEmptyRosterMember,
  createEmptyWorkerDraft,
  buildStaffTaskRowDomId,
  buildWorkerTaskRowDomId,
  buildTrainingModuleRowDomId,
  buildTrainingSessionMeetingsFromState,
  getDocumentCategoryBadgeClass,
  buildDocumentDraft,
  getEffectiveTutorialContent,
  listEffectiveTutorials,
  tripDocumentTileRootClassName,
  isTripDocumentFlightsCategory,
  categoryForTripResourceDoc,
  parseTripDocumentWorkAreaMeta,
  buildTripDocumentWorkAreaMeta,
  getTripDocumentWorkerLabel,
  snapshotTripResourceForInsert,
  isPersistedTripResourceDismissedEmpty,
  findDismissedPersistedTripResource,
  docHasAnyContent,
  docUpdatedMs,
  pickPreferredDocByRequiredKey,
  dedupeRequiredSlotResources,
  pickMainHousingDocFromViewerList,
  defaultMaterialsPackingChecklist,
  parseMaterialsPackingChecklist,
  WORKER_PREVIEW_PARTICIPANT_ID,
  LEADER_PREVIEW_PARTICIPANT_ID,
  ROSTER_PREVIEW_PREFIX,
  MATERIALS_PACKING_CHECKLIST_ITEMS,
  WORKER_TRIP_TASK_SECTION_OPTIONS,
  STAFF_TASK_AREA_LABELS,
  CUSTOM_SITE_OPTION,
  TEAM_STATUS_OPTIONS,
  TEAM_MEMBER_ROLE_OPTIONS,
  TRAVEL_FORM_MODAL_SECTION_STYLE,
  BIRTHDATE_MONTH_OPTIONS,
  BIRTHDATE_DAY_OPTIONS,
  BIRTHDATE_YEAR_OPTIONS,
  GENDER_OPTIONS,
  YES_NO_OPTIONS,
} = TripPageShared;

export function useTripPageModel() {
  const router = useRouter();
  const { tripId } = router.query;

  const [tab, setTab] = useState("Overview");
  const [participantTaskStates, setParticipantTaskStates] = useState({});
  const [participantTrainingStates, setParticipantTrainingStates] = useState({});
  const [session, setSession] = useState(null);
  const [trainingModules, setTrainingModules] = useState([]);
  const [docs, setDocs] = useState([]);
  const [participantDocuments, setParticipantDocuments] = useState([]);
  const [participantDocumentsError, setParticipantDocumentsError] = useState("");
  const [participantDocumentStatus, setParticipantDocumentStatus] = useState({});
  const [confirmingParticipantDocumentDeleteId, setConfirmingParticipantDocumentDeleteId] = useState("");
  const [customParticipantDocumentLabel, setCustomParticipantDocumentLabel] = useState("");
  const [participantDocumentTypeStatus, setParticipantDocumentTypeStatus] = useState("");
  const participantDocumentInputRefs = useRef({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentActivityError, setRecentActivityError] = useState("");
  const [isAddingLink, setIsAddingLink] = useState(false);
  /** When set, the add/required link form is shown inside that default document card instead of at the top. */
  const [addingLinkForSlotKey, setAddingLinkForSlotKey] = useState(null);
  const [linkDraft, setLinkDraft] = useState(buildDocumentDraft());
  const [pendingPdfDraft, setPendingPdfDraft] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);
  const [docDraft, setDocDraft] = useState(null);
  const [referenceEmails, setReferenceEmails] = useState({});
  const [referenceSaveStatusByKey, setReferenceSaveStatusByKey] = useState({});
  const [docsError, setDocsError] = useState("");
  const [tripDocsUndoBanner, setTripDocsUndoBanner] = useState(null);
  const tripDocsUndoRunRef = useRef(null);
  const tripDocsUndoTimerRef = useRef(null);
  const [fundraisingDrafts, setFundraisingDrafts] = useState({});
  const [fundraisingStatus, setFundraisingStatus] = useState({});
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    dueDate: "",
    category: "General",
    description: "",
  });
  const taskDraftTripleRef = useRef(null);
  const [taskStatusMessage, setTaskStatusMessage] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isEditingWorkerDueDates, setIsEditingWorkerDueDates] = useState(false);

  const [overviewNotes, setOverviewNotes] = useState([]);
  const [editingOverviewNoteId, setEditingOverviewNoteId] = useState("");
  const [overviewNoteDraft, setOverviewNoteDraft] = useState("");
  const [isEditingOverviewNote, setIsEditingOverviewNote] = useState(false);
  const [overviewNoteStatus, setOverviewNoteStatus] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoadError, setAnnouncementsLoadError] = useState("");
  const [editingAnnouncementId, setEditingAnnouncementId] = useState("");
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [announcementStatus, setAnnouncementStatus] = useState("");
  const announcementTextareaRef = useRef(null);
  const [teamFundraisingDraft, setTeamFundraisingDraft] = useState({
    teamFundraisingUrl: "",
    fundraisingMode: "individual",
    fundraisingGoalAmount: "",
  });
  const [teamFundraisingStatus, setTeamFundraisingStatus] = useState("");
  const [isEditingTeamFundraising, setIsEditingTeamFundraising] = useState(false);
  const [editingParticipantFundraisingId, setEditingParticipantFundraisingId] = useState("");
  const [staffTaskStatus, setStaffTaskStatus] = useState("");
  const [previewParticipantId, setPreviewParticipantId] = useState("");
  const [isEditingTripSetup, setIsEditingTripSetup] = useState(false);
  const [tripSetupDraft, setTripSetupDraft] = useState(() => buildTripSetupDraft(null));
  const [tripSetupStatus, setTripSetupStatus] = useState("");
  const [isCustomSiteInput, setIsCustomSiteInput] = useState(false);
  const [isConfirmingTripDelete, setIsConfirmingTripDelete] = useState(false);
  const [isEditingRoster, setIsEditingRoster] = useState(false);
  const [rosterDraft, setRosterDraft] = useState([]);
  const [rosterStatus, setRosterStatus] = useState("");
  const [inlineTshirtSavingKey, setInlineTshirtSavingKey] = useState("");
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [newWorkerDraft, setNewWorkerDraft] = useState(() => createEmptyWorkerDraft());
  const [workerAddStatus, setWorkerAddStatus] = useState("");

  const [trip, setTrip] = useState(null);
  const [tripLoadComplete, setTripLoadComplete] = useState(false);
  const [hubProfilesByEmail, setHubProfilesByEmail] = useState(() => new Map());
  const [editableStaffTasks, setEditableStaffTasks] = useState([]);
  const [editingStaffTaskId, setEditingStaffTaskId] = useState(null);
  /** Keeps staff-task list refetch from stealing focus from the date picker while a row is open for edit. */
  const editingStaffTaskIdRef = useRef(null);
  const [staffTaskDueDateDraft, setStaffTaskDueDateDraft] = useState("");
  const staffDueTripleRef = useRef(null);
  const [staffTaskTitleDraft, setStaffTaskTitleDraft] = useState("");
  const [isAddingStaffTask, setIsAddingStaffTask] = useState(false);
  const [pendingStaffTaskJumpId, setPendingStaffTaskJumpId] = useState("");
  const [pendingWorkerTaskJumpId, setPendingWorkerTaskJumpId] = useState("");
  const [pendingTrainingModuleJumpId, setPendingTrainingModuleJumpId] = useState("");
  const [newStaffTaskDraft, setNewStaffTaskDraft] = useState({
    workArea: "Project Formation",
    taskName: "",
    assignedTo: "",
    dueDate: "",
    notes: "",
  });
  const newStaffTaskTripleRef = useRef(null);
  const [travelFormModalOpen, setTravelFormModalOpen] = useState(false);
  const [travelFormTargetRefKey, setTravelFormTargetRefKey] = useState("");
  const [travelFormDraft, setTravelFormDraft] = useState(() => ({ ...TRAVEL_FORM_EMPTY }));
  const [groupLeaderTravelDraft, setGroupLeaderTravelDraft] = useState({
    name: "",
    cellPhone: "",
    email: "",
  });
  const [groupLeaderContactSaveStatus, setGroupLeaderContactSaveStatus] = useState("");
  const [travelFormStatus, setTravelFormStatus] = useState("");
  const [travelFormResponses, setTravelFormResponses] = useState([]);
  const [tripMeetings, setTripMeetings] = useState([]);
  const [tripMeetingsLoadError, setTripMeetingsLoadError] = useState("");
  const [meetingDraft, setMeetingDraft] = useState({ title: "", scheduledAt: "", notesAfter: "" });
  const [editingMeetingId, setEditingMeetingId] = useState("");
  const [meetingStatus, setMeetingStatus] = useState("");
  /** Staff/leaders: scheduling form hidden until Add meeting (or when editing an existing row). */
  const [meetingAddFormOpen, setMeetingAddFormOpen] = useState(false);
  const [tripBudgetRow, setTripBudgetRow] = useState(null);
  const [tripHousingLinkUrl, setTripHousingLinkUrl] = useState("");
  const [tripHousingPdfUrl, setTripHousingPdfUrl] = useState("");
  const [tripHousingDocuments, setTripHousingDocuments] = useState([]);
  const [housingTripDocsDraft, setHousingTripDocsDraft] = useState(null);
  const [housingTripDocsSaveStatus, setHousingTripDocsSaveStatus] = useState("");
  const [tripSiteLogisticsRpcUrl, setTripSiteLogisticsRpcUrl] = useState("");
  const [tripBudgetLoadError, setTripBudgetLoadError] = useState("");
  const [materialsDraft, setMaterialsDraft] = useState(null);
  const [teamLogisticsDraft, setTeamLogisticsDraft] = useState(null);
  const [teamLogisticsLoadError, setTeamLogisticsLoadError] = useState("");
  const [teamLogisticsSaveStatus, setTeamLogisticsSaveStatus] = useState("");
  const [teamLogisticsLoading, setTeamLogisticsLoading] = useState(false);
  const [materialsSaveStatus, setMaterialsSaveStatus] = useState("");
  const [budgetCheckModalOpen, setBudgetCheckModalOpen] = useState(false);
  const [budgetCheckEditingId, setBudgetCheckEditingId] = useState("");
  const [budgetCheckAmount, setBudgetCheckAmount] = useState("");
  const [budgetCheckNote, setBudgetCheckNote] = useState("");
  const [budgetCheckSubmitting, setBudgetCheckSubmitting] = useState(false);
  const [tripBudgetCheckRequests, setTripBudgetCheckRequests] = useState([]);
  const [tripBudgetCheckDeleteId, setTripBudgetCheckDeleteId] = useState("");
  const [isEditingMaterialsGlance, setIsEditingMaterialsGlance] = useState(false);
  /** Bumps when materials save completes so stale in-flight getTripBudget loads cannot overwrite the draft. */
  const materialsBudgetLoadGenRef = useRef(0);
  const [siteBudgetNotesList, setSiteBudgetNotesList] = useState([]);
  const latestStaffTaskSaveRef = useRef(0);
  const editableStaffTasksRef = useRef([]);
  const [staffTaskRowStatus, setStaffTaskRowStatus] = useState({});
  const staffTaskRowTimeoutsRef = useRef({});
  const staffTaskNoteSaveTimeoutsRef = useRef({});
  const canManageTrips = isManagerRole(session?.permissionRole || session?.role);
  const isAdminUser = isAdminRole(session?.actualRole || session?.role);
  const isLeader = isLeaderRole(session?.permissionRole || session?.role);
  const isStaffPreviewingLeader =
    canManageTrips && String(previewParticipantId) === LEADER_PREVIEW_PARTICIPANT_ID;
  const isStaffPreviewingWorker =
    canManageTrips &&
    !!previewParticipantId &&
    String(previewParticipantId) !== LEADER_PREVIEW_PARTICIPANT_ID;
  const isPreviewingParticipant = isStaffPreviewingWorker;
  const staffViewAllParticipants = canManageTrips && !previewParticipantId;
  const effectiveIsLeader = isLeader || isStaffPreviewingLeader;
  const canViewTeamDashboard =
    staffViewAllParticipants || (effectiveIsLeader && !isPreviewingParticipant);
  /** Edit team fundraising setup and per-person links: staff only (trip leaders see read-only). */
  const canManageTripFundraising =
    staffViewAllParticipants || (canManageTrips && isStaffPreviewingLeader);
  /** Fundraising team-wide view: staff-only (workers should only see their own card). */
  const canViewFundraisingTeamDashboard = canManageTripFundraising;

  const sessionTripRosterRow = useMemo(() => {
    if (!trip?.teamMembers?.length || !session?.email) return null;
    const e = normalizeEmail(session.email);
    return (trip.teamMembers || []).find((m) => normalizeEmail(m.email) === e) || null;
  }, [trip?.teamMembers, session?.email]);

  /** Profile is leader and roster marks them as not traveling — team management only (no personal worker pipeline). */
  const isLeaderOnTripNotTraveling = useMemo(() => {
    if (!isLeader || isStaffPreviewingLeader || !sessionTripRosterRow) return false;
    const role = String(sessionTripRosterRow.teamRole || "").trim().toLowerCase();
    if (role !== "leader") return false;
    return sessionTripRosterRow.travelsWithTeam === false;
  }, [isLeader, isStaffPreviewingLeader, sessionTripRosterRow]);

  const currentParticipant = useMemo(() => {
    if (!trip) return null;

    if (isPreviewingParticipant) {
      if (String(previewParticipantId).startsWith(ROSTER_PREVIEW_PREFIX)) {
        const rosterId = String(previewParticipantId).slice(ROSTER_PREVIEW_PREFIX.length);
        const rosterMember = (trip.teamMembers || []).find((m) => String(m.id) === String(rosterId));
        if (rosterMember) {
          return {
            id: `${ROSTER_PREVIEW_PREFIX}${rosterMember.id}`,
            tripTeamMemberId: rosterMember.id,
            name: rosterMember.name || rosterMember.email || "Roster member",
            email: rosterMember.email || "",
            firstName: rosterMember.firstName || "",
            lastName: rosterMember.lastName || "",
            rosterOnly: true,
            assignmentId: "",
          };
        }
      }
      if (String(previewParticipantId) === WORKER_PREVIEW_PARTICIPANT_ID) {
        return {
          id: WORKER_PREVIEW_PARTICIPANT_ID,
          name: "Worker preview",
          email: "",
          firstName: "",
          rosterOnly: false,
          assignmentId: "",
        };
      }
      return (
        trip.participants.find(
          (participant) => String(participant.id) === String(previewParticipantId)
        ) || null
      );
    }

    if (!session) return null;
    if (staffViewAllParticipants) return null;

    const sessionUserId = String(session.profileId || session.id || session.authUserId || "").trim();
    const sessionEmail = normalizeEmail(session.email);

    return (
      trip.participants.find((participant) => {
        if (sessionUserId && String(participant.id) === sessionUserId) return true;
        const pe = normalizeEmail(participant.email);
        return Boolean(pe && sessionEmail && pe === sessionEmail);
      }) || null
    );
  }, [trip, session, staffViewAllParticipants, isPreviewingParticipant, previewParticipantId]);

  const canManageTripDocuments =
    staffViewAllParticipants || (effectiveIsLeader && !isPreviewingParticipant);

  const canManageTripMeetings =
    staffViewAllParticipants || (effectiveIsLeader && !isPreviewingParticipant);

  const staffList = [
    "Mackayla",
    "Craig",
    "Leslee",
    "Donna",
    "Hannah",
  ];

  useEffect(() => {
    if (!router.isReady) return;

    const requestedTab = Array.isArray(router.query.tab) ? router.query.tab[0] : router.query.tab;
    const requestedStaffTaskId = Array.isArray(router.query.staffTaskId)
      ? router.query.staffTaskId[0]
      : router.query.staffTaskId;
    const requestedAddWorker = Array.isArray(router.query.addWorker)
      ? router.query.addWorker[0]
      : router.query.addWorker;
    const tabKey = String(requestedTab || "").toLowerCase();

    if (tabKey === "staff-tasks") {
      setTab("Staff Tasks");
    }
    if (tabKey === "team") {
      setTab("Team");
    }
    if (tabKey === "travel-safety") {
      setTab("Travel & Safety");
    }
    if (tabKey === "trip-documents" || tabKey === "trip-documents-link") {
      setTab("Trip Documents");
    }
    if (tabKey === "documents" || tabKey === "my-documents") {
      setTab(canViewTeamDashboard ? "Worker Docs" : "My Documents");
    }
    if (tabKey === "materials") {
      setTab("Materials");
    }

    if (requestedStaffTaskId) {
      setPendingStaffTaskJumpId(String(requestedStaffTaskId));
    }
    if (String(requestedAddWorker || "").toLowerCase() === "1") {
      setIsAddingWorker(true);
      setIsEditingRoster(false);
      setWorkerAddStatus("");
    }
  }, [canViewTeamDashboard, router.isReady, router.query.addWorker, router.query.staffTaskId, router.query.tab]);

  useEffect(() => {
    const requestedParticipantId = Array.isArray(router.query.participantId)
      ? router.query.participantId[0]
      : router.query.participantId;

    if (!requestedParticipantId || !canManageTrips || previewParticipantId) return;
    if (!trip || !(trip.participants || []).some((p) => String(p.id) === String(requestedParticipantId))) {
      return;
    }

    setPreviewParticipantId(String(requestedParticipantId));
  }, [canManageTrips, previewParticipantId, router.query.participantId, trip]);

  useEffect(() => {
    const requestedEdit = Array.isArray(router.query.edit) ? router.query.edit[0] : router.query.edit;
    if (String(requestedEdit || "").toLowerCase() !== "setup") return;
    if (!trip?.id || !staffViewAllParticipants || isEditingTripSetup) return;

    setTab("Overview");
    handleStartTripSetupEdit();

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const element = document.getElementById("trip-setup");
        element?.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("edit");
      window.history.replaceState({}, "", nextUrl.toString());
    }
  }, [router.query.edit, trip?.id, staffViewAllParticipants, isEditingTripSetup]);

  useEffect(() => {
    if (tripSetupStatus !== "Saved.") return;
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      document.getElementById("trip-setup")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [tripSetupStatus]);

  const trainingAccessUrl =
    "https://lst365.sharepoint.com/:w:/g/IQAgtqt1ku4YT7cr5lj-_hO-ATU5X5ep2OOZAJFUnQDhtpE?e=z8Slfm";
  const basicTrainingUrl = "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=134&";
  const gatewayTrainingUrl = "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=136&";

  const trainingResources = [
    {
      id: "canvas",
      group: "required",
      title: "On-Demand Training",
      description:
        "Video-based training you can complete on your own schedule via Google Classroom.",
      url: trainingAccessUrl,
      icon: "OD",
      accent: "#2563eb",
    },
    {
      id: "basic",
      group: "required",
      title: "Basic Training",
      descriptionBullets: [
        "Required for new workers",
        "Everyone is encouraged to do it",
        "Teaches you how to lead good reading sessions",
        "You can do this anytime before your trip",
      ],
      url: basicTrainingUrl,
      icon: "BT",
      accent: "#16a34a",
    },
    {
      id: "gateway-endmeetings",
      group: "required",
      title: "Gateway Training & EndMeetings",
      descriptionBullets: [
        "Required for the whole team",
        "Try to attend as a team",
        "Gateway: do this 1-2 months before your trip",
        "EndMeeting: do this the month after you return",
      ],
      url: gatewayTrainingUrl,
      icon: "GT",
      accent: "#ea580c",
    },
    {
      id: "optional",
      group: "optional",
      title: "Advanced Training",
      description:
        "Optional workshops offered through the year, mainly for experienced Workers.",
      url: "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=135&",
      icon: "AT",
      accent: "#9333ea",
    },
    {
      id: "lst-connect",
      group: "optional",
      title: "LST Connect",
      description:
        "Join LST Connect to practice with an online Reader before leaving. Register as a Worker.",
      url: "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=133&",
      icon: "LC",
      accent: "#ca8a04",
    },
  ];
  const requiredTrainingResources = trainingResources.filter(
    (resource) => resource.group === "required"
  );
  const optionalTrainingResources = trainingResources.filter(
    (resource) => resource.group === "optional"
  );

  const canvasTrainingModules = useMemo(
    () =>
      trainingModules
        .filter((module) => module.category === "canvas")
        .map((module) => ({
          ...module,
          deadlineDate: getTrainingModuleDeadline(module.title, {
            startDate: trip?.startDate,
            endDate: trip?.endDate,
            trainingTimelineType: trip?.trainingTimelineType,
          }),
        })),
    [trainingModules, trip?.endDate, trip?.startDate, trip?.trainingTimelineType]
  );
  const supplementalTrainingModules = useMemo(
    () =>
      trainingModules
        .filter((module) => module.category !== "canvas")
        .map((module) => ({
          ...module,
          deadlineDate: getTrainingModuleDeadline(module.title, {
            startDate: trip?.startDate,
            endDate: trip?.endDate,
            trainingTimelineType: trip?.trainingTimelineType,
          }),
        })),
    [trainingModules, trip?.endDate, trip?.startDate, trip?.trainingTimelineType]
  );
  const datedTrainingModuleIds = useMemo(
    () =>
      trainingModules
        .filter((module) => module.requiresDate)
        .map((module) => module.id),
    [trainingModules]
  );
  const allTrainingModules = trainingModules;

  useEffect(() => {
    if (!router.isReady) return;

    let cancelled = false;

    async function loadSession() {
      const activeSession = await requireSession(router);
      if (!cancelled && activeSession) {
        setSession(activeSession);
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [router, router.isReady]);

  useEffect(() => {
    if (!travelFormModalOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") setTravelFormModalOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [travelFormModalOpen]);

  useEffect(() => {
    return () => {
      if (tripDocsUndoTimerRef.current) clearTimeout(tripDocsUndoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!tripId) return;

    let cancelled = false;

    async function loadTrip() {
      try {
        setTripLoadComplete(false);
        const assignedTrip = await getTripForCurrentUser(tripId);
        if (!cancelled) {
          setTrip(assignedTrip);
          setTripLoadComplete(true);
        }
      } catch (error) {
        console.error("Unable to load assigned trip", error);
        if (!cancelled) {
          setTrip(null);
          setTripLoadComplete(true);
        }
      }
    }

    loadTrip();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  useEffect(() => {
    if (!trip) return;

    const nextDrafts = {};
    (trip.participants || []).forEach((participant) => {
      nextDrafts[participant.id] = {
        fundraisingUrl: participant.fundraisingUrl || "",
        fundraisingGoalAmount:
          participant.fundraisingGoalAmount != null && participant.fundraisingGoalAmount !== ""
            ? String(participant.fundraisingGoalAmount)
            : "",
      };
    });
    const participantEmailsForFundraising = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );
    (trip.teamMembers || []).forEach((member) => {
      if (!member.id) return;
      const em = normalizeEmail(member.email);
      if (em && participantEmailsForFundraising.has(em)) return;
      nextDrafts[`roster-member-${member.id}`] = {
        fundraisingUrl: member.fundraisingUrl || "",
        fundraisingGoalAmount:
          member.fundraisingGoalAmount != null && member.fundraisingGoalAmount !== ""
            ? String(member.fundraisingGoalAmount)
            : "",
      };
    });
    setFundraisingDrafts(nextDrafts);
    setTeamFundraisingDraft({
      teamFundraisingUrl: trip.teamFundraisingUrl || "",
      fundraisingMode: trip.fundraisingMode === "team" ? "team" : "individual",
      fundraisingGoalAmount:
        trip.fundraisingGoalAmount != null && trip.fundraisingGoalAmount !== ""
          ? String(trip.fundraisingGoalAmount)
          : "",
    });
    setIsEditingTeamFundraising(false);
    setEditingParticipantFundraisingId("");
    setIsAddingStaffTask(false);
    setNewStaffTaskDraft({
      workArea: "Project Formation",
      taskName: "",
      assignedTo: "",
      dueDate: "",
      notes: "",
    });
  }, [trip]);

  useEffect(() => {
    if (!trip?.id) return;
    setIsEditingTripSetup(false);
    setIsEditingRoster(false);
  }, [trip?.id]);

  useEffect(() => {
    if (!trip) return;
    if (isEditingTripSetup) return;
    setTripSetupDraft(buildTripSetupDraft(trip));
    setTripSetupStatus("");
    setIsCustomSiteInput(false);
  }, [trip, isEditingTripSetup]);

  useEffect(() => {
    if (!trip) return;
    if (isEditingRoster) return;
    setRosterDraft(trip.teamMembers || []);
    setRosterStatus("");
  }, [trip, isEditingRoster]);

  useEffect(() => {
    if (!trip?.id) return;
    setIsEditingWorkerDueDates(false);
    editingStaffTaskIdRef.current = null;
    setEditingStaffTaskId(null);
    setStaffTaskTitleDraft("");
    setStaffTaskDueDateDraft("");
  }, [trip?.id]);

  useEffect(() => {
    if (!trip?.id) return;

    let cancelled = false;

    async function loadParticipantDocuments() {
      try {
        const rows = await listTripUserDocuments(trip.id);
        if (!cancelled) {
          setParticipantDocuments(rows);
          setParticipantDocumentsError("");
        }
      } catch (error) {
        console.error("Unable to load participant documents", error);
        if (!cancelled) {
          setParticipantDocuments([]);
          setParticipantDocumentsError(error.message || "Unable to load participant documents.");
        }
      }
    }

    void loadParticipantDocuments();

    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  useEffect(() => {
    if (!trip?.id) return;
    let cancelled = false;
    async function loadMeetings() {
      try {
        const rows = await listTripMeetings(trip.id);
        if (!cancelled) {
          setTripMeetings(rows);
          setTripMeetingsLoadError("");
        }
      } catch (e) {
        console.error("Unable to load meetings", e);
        if (!cancelled) {
          setTripMeetings([]);
          setTripMeetingsLoadError(e?.message || "Unable to load meetings.");
        }
      }
    }
    void loadMeetings();
    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  useEffect(() => {
    if (!trip?.id) return;
    let cancelled = false;

    async function loadHousingFromBudget() {
      const next = await fetchTripHousingState(trip.id);
      if (!cancelled) {
        setTripHousingDocuments(next.tripHousingDocuments);
        setTripHousingLinkUrl(next.tripHousingLinkUrl);
        setTripHousingPdfUrl(next.tripHousingPdfUrl);
      }
    }

    void loadHousingFromBudget();
    function onVisibilityChange() {
      if (document.visibilityState === "visible") void loadHousingFromBudget();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [trip?.id]);

  useEffect(() => {
    if (!trip?.id || tab !== "Trip Documents") return;
    let cancelled = false;
    (async () => {
      try {
        const next = await fetchTripHousingState(trip.id);
        if (!cancelled) {
          setTripHousingDocuments(next.tripHousingDocuments);
          setTripHousingLinkUrl(next.tripHousingLinkUrl);
          setTripHousingPdfUrl(next.tripHousingPdfUrl);
        }
      } catch (e) {
        console.warn("[trip] refetch housing for Trip Documents", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trip?.id, tab]);

  useEffect(() => {
    setHousingTripDocsDraft(null);
    setHousingTripDocsSaveStatus("");
  }, [trip?.id]);

  useEffect(() => {
    if (!trip?.id) return;
    let cancelled = false;

    async function loadSiteLogisticsUrl() {
      try {
        const url = await getTripSiteLogisticsUrlForViewer(trip.id);
        if (!cancelled) setTripSiteLogisticsRpcUrl(url);
      } catch {
        if (!cancelled) setTripSiteLogisticsRpcUrl("");
      }
    }

    void loadSiteLogisticsUrl();
    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  useEffect(() => {
    if (!trip?.id || !staffViewAllParticipants) return;
    let cancelled = false;

    async function loadTripBudgetRow() {
      const loadGenAtStart = materialsBudgetLoadGenRef.current;
      try {
        const row = await getTripBudget(trip.id);
        if (cancelled || loadGenAtStart !== materialsBudgetLoadGenRef.current) return;
        setTripBudgetRow(row);
        setTripBudgetLoadError("");
        setMaterialsDraft(
          row
            ? {
                numWorkers: numWorkersDraftFromBudgetValue(row.numWorkers),
                teamAccountant: row.teamAccountant || "",
                teamRecorder: row.teamRecorder || "",
                tshirts: row.tshirts ?? "",
                workbooks: row.workbooks ?? "",
                materialsShipAddress: row.materialsShipAddress ?? "",
                materialsShipAddressNote: row.materialsShipAddressNote ?? "",
                materialsTrackingNumber: row.materialsTrackingNumber ?? "",
                materialsNotes: row.materialsNotes ?? "",
                materialsNotesForTeam: row.materialsNotesForTeam ?? "",
                materialsPackingChecklist: parseMaterialsPackingChecklist(row.materialsPackingChecklist),
              }
            : {
                numWorkers: "",
                teamAccountant: "",
                teamRecorder: "",
                tshirts: "",
                workbooks: "",
                materialsShipAddress: "",
                materialsShipAddressNote: "",
                materialsTrackingNumber: "",
                materialsNotes: "",
                materialsNotesForTeam: "",
                materialsPackingChecklist: defaultMaterialsPackingChecklist(),
              }
        );
      } catch (e) {
        if (cancelled || loadGenAtStart !== materialsBudgetLoadGenRef.current) return;
        setTripBudgetLoadError(e.message || "Unable to load housing budget.");
      }
    }

    void loadTripBudgetRow();
    return () => {
      cancelled = true;
    };
  }, [trip?.id, staffViewAllParticipants]);

  useEffect(() => {
    if (!trip?.id || tab !== "Materials") return;
    if (staffViewAllParticipants) return;
    if (isPreviewingParticipant) return;
    if (!effectiveIsLeader && !currentParticipant) return;
    let cancelled = false;
    (async () => {
      setTeamLogisticsLoading(true);
      setTeamLogisticsLoadError("");
      try {
        const row = await getTripTeamLogisticsForViewer(trip.id);
        if (cancelled) return;
        setTeamLogisticsDraft(row);
      } catch (e) {
        if (!cancelled) {
          setTeamLogisticsLoadError(e.message || "Unable to load team logistics.");
          setTeamLogisticsDraft(null);
        }
      } finally {
        if (!cancelled) setTeamLogisticsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    trip?.id,
    tab,
    staffViewAllParticipants,
    isPreviewingParticipant,
    effectiveIsLeader,
    currentParticipant?.id,
  ]);

  useEffect(() => {
    if (!trip) return;
    setGroupLeaderTravelDraft({
      name: trip.groupLeaderName || "",
      cellPhone: trip.groupLeaderCellPhone || "",
      email: trip.groupLeaderEmail || "",
    });
  }, [trip?.id, trip?.groupLeaderName, trip?.groupLeaderCellPhone, trip?.groupLeaderEmail]);

  useEffect(() => {
    if (!canManageTrips || !staffViewAllParticipants) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listSiteBudgetNotes();
        if (!cancelled) setSiteBudgetNotesList(rows || []);
      } catch (e) {
        console.error("Unable to load site workbook plans", e);
        if (!cancelled) setSiteBudgetNotesList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManageTrips, staffViewAllParticipants]);

  useEffect(() => {
    if (!trip?.id || !canViewTeamDashboard) return;

    let cancelled = false;

    async function loadRecentActivity() {
      try {
        const rows = await listTripActivity(trip.id, { limit: 8 });
        if (!cancelled) {
          setRecentActivity(rows);
          setRecentActivityError("");
        }
      } catch (error) {
        console.error("Unable to load trip activity", error);
        if (!cancelled) {
          setRecentActivity([]);
          setRecentActivityError(error.message || "Unable to load recent activity.");
        }
      }
    }

    void loadRecentActivity();

    return () => {
      cancelled = true;
    };
  }, [canViewTeamDashboard, trip?.id]);

  function pushRecentActivity(entry) {
    if (!entry) return;

    setRecentActivity((current) =>
      [entry, ...current]
        .sort((left, right) =>
          String(right.createdAt || "").localeCompare(String(left.createdAt || ""))
        )
        .slice(0, 8)
    );
  }

  useEffect(() => {
    if (!trip) return;

    let cancelled = false;

    async function loadTripData() {
      const [
        participantsResult,
        teamMembersResult,
        modulesResult,
        progressResult,
        tasksResult,
        taskProgressResult,
        travelFormResult,
      ] =
        await Promise.allSettled([
          listTripParticipants(trip.id),
          listTripTeamMembers(trip.id),
          listTrainingModules(trip.id),
          listTrainingProgress(trip.id),
          listTripTasks(trip.id),
          listUserTaskProgress(trip.id),
          listTravelFormResponsesForTrip(trip.id),
        ]);

      if (cancelled) return;

      const participants = getSettledValue(
        participantsResult,
        [],
        "trip participants"
      );
      const teamMembers = getSettledValue(
        teamMembersResult,
        [],
        "trip team members"
      );
      const modules = getSettledValue(modulesResult, [], "training modules");
      const progress = getSettledValue(progressResult, [], "training progress");
      const tasks = getSettledValue(tasksResult, [], "trip tasks");
      const taskProgress = getSettledValue(
        taskProgressResult,
        [],
        "task progress"
      );

      setTrip((current) => (current ? { ...current, participants, teamMembers, tasks } : current));
      setTrainingModules(modules);

      const rosterEmails = [
        ...(participants || []).map((p) => p?.email),
        ...(teamMembers || []).map((m) => m?.email),
      ];
      try {
        const profileMap = await loadWorkerProfilesByEmails(rosterEmails);
        if (!cancelled) setHubProfilesByEmail(profileMap);
      } catch (profileError) {
        console.error("Unable to load worker profiles for trip roster", profileError);
        if (!cancelled) setHubProfilesByEmail(new Map());
      }

      const participantsById = new Map();
      participants.forEach((participant) => {
        if (participant?.id == null || participant.id === "") return;
        participantsById.set(String(participant.id), participant);
      });
      const moduleTitleById = new Map(
        modules.map((m) => [String(m.id), String(m.title || "").trim()])
      );
      const nextTrainingStates = {};
      const nextTaskStates = {};

      const orphanProgressUserIds = [
        ...new Set(
          [...progress, ...taskProgress]
            .map((row) => row.userId)
            .filter((id) => id != null && id !== "" && !participantsById.has(String(id)))
        ),
      ];
      const profileEmailByUserId = await loadProfileEmailsByUserIds(orphanProgressUserIds);

      function resolveEmailForProgressUserId(userId) {
        if (userId == null || userId === "") return "";
        const key = String(userId);
        const participant = participantsById.get(key);
        if (participant?.email) return participant.email;
        return profileEmailByUserId.get(key) || "";
      }

      progress.forEach((row) => {
        const email = resolveEmailForProgressUserId(row.userId);
        if (!email) return;

        const trainingEmailKey = normalizeEmail(email);
        if (!trainingEmailKey) return;
        if (!nextTrainingStates[trainingEmailKey]) {
          nextTrainingStates[trainingEmailKey] = {};
        }

        const modId = String(row.moduleId);
        nextTrainingStates[trainingEmailKey][modId] = !!row.completed;
        if (row.completedAt) {
          const title = moduleTitleById.get(modId) || "";
          nextTrainingStates[trainingEmailKey][`${modId}Date`] = hydrateTrainingSessionDateFromDb(
            row.completedAt,
            title
          );
        }
      });

      taskProgress.forEach((row) => {
        const email = resolveEmailForProgressUserId(row.userId);
        if (!email) return;

        const taskEmailKey = normalizeEmail(email);
        if (!taskEmailKey) return;
        if (!nextTaskStates[taskEmailKey]) {
          nextTaskStates[taskEmailKey] = {};
        }

        nextTaskStates[taskEmailKey][row.taskName] = !!row.completed;
      });

      setParticipantTrainingStates(nextTrainingStates);
      setParticipantTaskStates(nextTaskStates);

      const travelForms = getSettledValue(travelFormResult, [], "travel form responses");
      setTravelFormResponses(travelForms);
    }

    loadTripData();

    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  useEffect(() => {
    editableStaffTasksRef.current = editableStaffTasks;
  }, [editableStaffTasks]);

  useEffect(() => {
    if (tab !== "Staff Tasks" || !pendingStaffTaskJumpId) return undefined;

    let retryTimeout = null;
    const scrollToTask = () => {
      const element = document.getElementById(
        buildStaffTaskRowDomId(pendingStaffTaskJumpId)
      );

      if (!element) return false;

      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingStaffTaskJumpId("");
      return true;
    };

    const initialTimeout = window.setTimeout(() => {
      if (!scrollToTask()) {
        retryTimeout = window.setTimeout(() => {
          scrollToTask();
        }, 250);
      }
    }, 60);

    return () => {
      window.clearTimeout(initialTimeout);
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
    };
  }, [pendingStaffTaskJumpId, tab]);

  useEffect(() => {
    if (tab !== "Tasks" || !pendingWorkerTaskJumpId) return undefined;

    let retryTimeout = null;
    const scrollToTask = () => {
      const element = document.getElementById(
        buildWorkerTaskRowDomId(pendingWorkerTaskJumpId)
      );

      if (!element) return false;

      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingWorkerTaskJumpId("");
      return true;
    };

    const initialTimeout = window.setTimeout(() => {
      if (!scrollToTask()) {
        retryTimeout = window.setTimeout(() => {
          scrollToTask();
        }, 250);
      }
    }, 60);

    return () => {
      window.clearTimeout(initialTimeout);
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
    };
  }, [pendingWorkerTaskJumpId, tab]);

  useEffect(() => {
    if (tab !== "Training" || !pendingTrainingModuleJumpId) return undefined;

    let retryTimeout = null;
    const scrollToModule = () => {
      const element = document.getElementById(
        buildTrainingModuleRowDomId(pendingTrainingModuleJumpId)
      );

      if (!element) return false;

      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingTrainingModuleJumpId("");
      return true;
    };

    const initialTimeout = window.setTimeout(() => {
      if (!scrollToModule()) {
        retryTimeout = window.setTimeout(() => {
          scrollToModule();
        }, 250);
      }
    }, 60);

    return () => {
      window.clearTimeout(initialTimeout);
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
    };
  }, [pendingTrainingModuleJumpId, tab]);

  useEffect(() => {
    return () => {
      Object.values(staffTaskRowTimeoutsRef.current || {}).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      Object.values(staffTaskNoteSaveTimeoutsRef.current || {}).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
    };
  }, []);

  useEffect(() => {
    if (!trip?.id) return;

    let cancelled = false;

    async function loadOverviewNote() {
      try {
        setOverviewNotes([]);
        setEditingOverviewNoteId("");
        setOverviewNoteDraft("");
        setIsEditingOverviewNote(false);
        setOverviewNoteStatus("");
        const rows = await listTripOverviewNotes(trip.id);
        if (!cancelled) {
          setOverviewNotes(rows);
          setOverviewNoteStatus("");
        }
      } catch (error) {
        console.error("Unable to load trip overview notes", error);
      }
    }

    void loadOverviewNote();

    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  useEffect(() => {
    if (!trip?.id) return;

    let cancelled = false;

    async function loadAnnouncements() {
      try {
        setAnnouncements([]);
        setAnnouncementsLoadError("");
        setEditingAnnouncementId("");
        setAnnouncementDraft("");
        setIsEditingAnnouncement(false);
        setAnnouncementStatus("");
        const rows = await listTripAnnouncements(trip.id);
        if (!cancelled) {
          setAnnouncements(rows);
          setAnnouncementsLoadError("");
          setAnnouncementStatus("");
        }
      } catch (error) {
        console.error("Unable to load trip announcements", error);
        if (!cancelled) {
          setAnnouncementsLoadError(error.message || "Unable to load announcements.");
        }
      }
    }

    void loadAnnouncements();

    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  useEffect(() => {
    if (!trip) return;

    let cancelled = false;

    async function loadDocs() {
      try {
        const savedDocs = await listResources(trip.id);
        if (!cancelled) {
          // Prevent duplicates per required document slot key (e.g. flights).
          // Those duplicates cause "Delete slot" to remove more than intended.
          setDocs(dedupeRequiredSlotResources(savedDocs));
          setDocsError("");
        }
      } catch (error) {
        console.error("Unable to load resources", error);
        if (!cancelled) {
          setDocs([]);
          setDocsError(error.message || "Unable to load resources.");
        }
      }
    }

    loadDocs();

    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  useEffect(() => {
    setIsAddingLink(false);
    setAddingLinkForSlotKey(null);
  }, [trip?.id]);

  useEffect(() => {
    if (!trip || !staffViewAllParticipants) return;

    let cancelled = false;

    async function syncStaffTasks() {
      try {
        const tasks = await listStaffTasksForTrip(trip.id);
        if (!cancelled) {
          setEditableStaffTasks(
            sortStaffTasksByTemplate(
              (tasks || []).map((task) => ({
                ...task,
                dueDate: task.dueDate || computeStaffTaskDueDate(task, trip),
              }))
            )
          );
        }
      } catch (error) {
        console.error("Unable to load staff tasks", error);
      }
    }

    void syncStaffTasks();

    function handleTaskUpdate(event) {
      if (!event.detail?.tripId || event.detail.tripId === trip.id) {
        if (editingStaffTaskIdRef.current) return;
        void syncStaffTasks();
      }
    }

    window.addEventListener(STAFF_TASKS_UPDATED_EVENT, handleTaskUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener(STAFF_TASKS_UPDATED_EVENT, handleTaskUpdate);
    };
  }, [trip?.id, staffViewAllParticipants]);

  useEffect(() => {
    let cancelled = false;
    if (!trip?.id || !staffViewAllParticipants) {
      setTripBudgetCheckRequests([]);
      return undefined;
    }
    void (async () => {
      try {
        const rows = await listBudgetCheckRequestsForTrip(trip.id);
        if (!cancelled) setTripBudgetCheckRequests(rows);
      } catch (e) {
        console.warn("[trip] budget check requests", e);
        if (!cancelled) setTripBudgetCheckRequests([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trip?.id, staffViewAllParticipants]);

  function handlePrepareNewPdf() {
    setIsAddingLink(false);
    setAddingLinkForSlotKey(null);
    setPendingPdfDraft({
      file: null,
      title: "",
      category: "Other",
      workerName: "",
      workArea: "",
      resourceKey: "",
      visibleToParticipants: true,
    });
  }

  function handlePrepareRequiredPdf(slot) {
    setIsAddingLink(false);
    setAddingLinkForSlotKey(null);
    setPendingPdfDraft({
      file: null,
      title: slot.title,
      category: slot.category,
      workerName: "",
      workArea: "",
      resourceKey: slot.key,
      visibleToParticipants: true,
    });
  }

  function handlePrepareRequiredLink(slot) {
    setIsAddingLink(true);
    setAddingLinkForSlotKey(String(slot?.key || ""));
    setLinkDraft(buildDocumentDraft({
      title: slot.resource?.title || slot.title,
      link: slot.resource?.link || slot.resource?.pdfUrl || "",
      category: slot.category,
      workerName: getTripDocumentWorkerLabel(slot.resource),
      workArea: parseTripDocumentWorkAreaMeta(slot.resource?.workArea).notes,
      resourceKey: slot.key,
      visibleToParticipants: slot.resource?.visibleToParticipants !== false,
      ...getEffectiveTutorialContent(slot, slot.resource),
    }));
  }

  function handleCancelPendingPdf() {
    setPendingPdfDraft(null);
  }

  function prependDocWithoutDuplicates(current, created) {
    const next = [created, ...(current || [])];
    const seen = new Set();
    return next.filter((doc) => {
      const id = String(doc?.id || "").trim();
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  async function handleSavePendingPdf() {
    if (!pendingPdfDraft?.file) return;

    try {
      const created = await addPdfResource({
        title: pendingPdfDraft.title,
        file: pendingPdfDraft.file,
        category: pendingPdfDraft.category,
        workArea: buildTripDocumentWorkAreaMeta({
          workerName: pendingPdfDraft.workerName,
          notes: pendingPdfDraft.workArea,
        }),
        resourceKey: pendingPdfDraft.resourceKey,
        visibleToParticipants: pendingPdfDraft.visibleToParticipants,
        tripId: trip?.id,
      });
      setDocs((current) =>
        dedupeRequiredSlotResources(prependDocWithoutDuplicates(current, created))
      );
      setDocsError("");
      setPendingPdfDraft(null);
    } catch (error) {
      console.error("Unable to add PDF resource", error);
      setDocsError(error.message || "Unable to save resources.");
    }
  }

  function handleAddLink() {
    setIsAddingLink(true);
    setAddingLinkForSlotKey(null);
    setLinkDraft(
      buildDocumentDraft({
        workerName: "",
        workArea: "",
      })
    );
  }

  function handleCancelAddLink() {
    setIsAddingLink(false);
    setAddingLinkForSlotKey(null);
    setLinkDraft(
      buildDocumentDraft({
        workerName: "",
        workArea: "",
      })
    );
  }

  async function handleSaveLink() {
    if (!linkDraft.title.trim()) {
      setDocsError("Add a document title before saving.");
      return;
    }

    try {
      const key = String(linkDraft.resourceKey || "").trim();
      let existing = null;
      if (key === "smartsheet-budget") {
        existing =
          (docs || []).find((d) => d?.id && !d.isAutoGenerated && d.resourceKey === "smartsheet-budget") ||
          (docs || []).find((d) => d?.id && !d.isAutoGenerated && d.resourceKey === "project-record-journal");
      } else if (key) {
        existing = (docs || []).find(
          (d) => d?.id && !d.isAutoGenerated && String(d.resourceKey) === key
        );
      }

      const linkTrim = String(linkDraft.link || "").trim();
      // If we’re creating a brand-new link resource, we need a non-empty URL.
      // Otherwise the resource can be saved but won’t qualify as "ready",
      // which makes it look like it "disappeared" from the document slots.
      if (!existing && !linkTrim) {
        setDocsError("Add a link URL before saving.");
        return;
      }

      if (existing) {
        const isBudgetLinkForm = key === "smartsheet-budget";
        const linkDraftHasTutorial =
          String(linkDraft.tutorialTitle || "").trim() ||
          String(linkDraft.tutorialUrl || "").trim() ||
          String(linkDraft.tutorialDescription || "").trim();
        const updated = await updateResource({
          id: existing.id,
          title: linkDraft.title,
          link: linkDraft.link,
          pdfUrl: existing.pdfUrl || "",
          category: linkDraft.category,
          resourceKey: key === "smartsheet-budget" ? "smartsheet-budget" : key,
          workArea: buildTripDocumentWorkAreaMeta({
            workerName: linkDraft.workerName,
            notes: linkDraft.workArea,
          }),
          tutorialTitle: isBudgetLinkForm
            ? existing.tutorialTitle ?? ""
            : linkDraftHasTutorial
              ? linkDraft.tutorialTitle
              : existing.tutorialTitle ?? "",
          tutorialUrl: isBudgetLinkForm
            ? existing.tutorialUrl ?? ""
            : linkDraftHasTutorial
              ? linkDraft.tutorialUrl
              : existing.tutorialUrl ?? "",
          tutorialDescription: isBudgetLinkForm
            ? existing.tutorialDescription ?? ""
            : linkDraftHasTutorial
              ? linkDraft.tutorialDescription
              : existing.tutorialDescription ?? "",
          visibleToParticipants: linkDraft.visibleToParticipants,
        });
        setDocs((current) => {
          const replaced = (current || []).map((doc) =>
            doc.id === updated.id ? updated : doc
          );
          return dedupeRequiredSlotResources(replaced);
        });
        setDocsError("");
        handleCancelAddLink();
        return;
      }

      const created = await addLinkResource({
        ...linkDraft,
        workArea: buildTripDocumentWorkAreaMeta({
          workerName: linkDraft.workerName,
          notes: linkDraft.workArea,
        }),
        tripId: trip?.id,
        ...(key === "smartsheet-budget"
          ? { tutorialTitle: "", tutorialUrl: "", tutorialDescription: "" }
          : {}),
      });
      if (!created) return;
      setDocs((current) =>
        dedupeRequiredSlotResources(prependDocWithoutDuplicates(current, created))
      );
      setDocsError("");
      handleCancelAddLink();
    } catch (error) {
      if (isMissingResourceTutorialColumnError(error)) {
        setDocsError(
          "Tutorial link editing needs the Supabase migration `supabase/trip_resources_add_tutorial_fields.sql` run first."
        );
        return;
      }
      console.error("Unable to add link resource", error);
      setDocsError(error.message || "Unable to save resources.");
    }
  }

  function renderTripDocumentsLinkDraftForm({ embedded }) {
    const formBody = (
      <>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>
          {linkDraft.resourceKey ? "Required Link" : "New Link"}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            className="input"
            value={linkDraft.title}
            onChange={(e) =>
              setLinkDraft((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Document title"
          />
          <input
            className="input"
            value={linkDraft.link}
            onChange={(e) =>
              setLinkDraft((prev) => ({ ...prev, link: e.target.value }))
            }
            placeholder="https://..."
          />
          <select
            className="input"
            value={linkDraft.category}
            onChange={(e) =>
              setLinkDraft((prev) => ({ ...prev, category: e.target.value }))
            }
          >
            {DOCUMENT_CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={linkDraft.workerName || ""}
            onChange={(e) =>
              setLinkDraft((prev) => ({ ...prev, workerName: e.target.value }))
            }
          >
            <option value="">No worker label</option>
            {tripDocumentWorkerOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <input
            className="input"
            value={linkDraft.workArea}
            onChange={(e) =>
              setLinkDraft((prev) => ({ ...prev, workArea: e.target.value }))
            }
            placeholder="Notes / context"
          />
          <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={linkDraft.visibleToParticipants !== false}
              onChange={(e) =>
                setLinkDraft((prev) => ({
                  ...prev,
                  visibleToParticipants: e.target.checked,
                }))
              }
            />
            Visible to participants
          </label>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn btnPrimary" type="button" onClick={() => void handleSaveLink()}>
            Save Link
          </button>
          <button className="btn" type="button" onClick={handleCancelAddLink}>
            Cancel
          </button>
        </div>
      </>
    );

    if (embedded) {
      return (
        <div
          style={{
            marginTop: 4,
            marginBottom: 8,
            padding: 12,
            borderRadius: 12,
            background: "rgba(15, 23, 42, 0.05)",
            border: "1px solid rgba(15, 23, 42, 0.08)",
          }}
        >
          {formBody}
        </div>
      );
    }

    return (
      <div
        className="card pad"
        style={{ boxShadow: "none", marginBottom: 14, background: "rgba(255,255,255,.7)" }}
      >
        {formBody}
      </div>
    );
  }

  function handleEditDoc(doc) {
    const slot = getDocumentSlotByKey(doc?.resourceKey);
    const workAreaMeta = parseTripDocumentWorkAreaMeta(doc?.workArea);
    setIsAddingLink(false);
    setAddingLinkForSlotKey(null);
    setEditingDocId(doc.id);
    setDocDraft(
      buildDocumentDraft({
        ...doc,
        workerName: workAreaMeta.workerName,
        workArea: workAreaMeta.notes,
        visibleToParticipants: doc.visibleToParticipants !== false,
        ...getEffectiveTutorialContent(slot, doc),
      })
    );
  }

  function clearTripDocsUndoCompletely() {
    if (tripDocsUndoTimerRef.current) {
      clearTimeout(tripDocsUndoTimerRef.current);
      tripDocsUndoTimerRef.current = null;
    }
    tripDocsUndoRunRef.current = null;
    setTripDocsUndoBanner(null);
  }

  function scheduleTripDocsUndo(message, runUndo) {
    clearTripDocsUndoCompletely();
    tripDocsUndoRunRef.current = runUndo;
    setTripDocsUndoBanner({ message });
    tripDocsUndoTimerRef.current = setTimeout(() => {
      clearTripDocsUndoCompletely();
    }, 15000);
  }

  async function runTripDocsUndoAction() {
    const fn = tripDocsUndoRunRef.current;
    if (tripDocsUndoTimerRef.current) {
      clearTimeout(tripDocsUndoTimerRef.current);
      tripDocsUndoTimerRef.current = null;
    }
    tripDocsUndoRunRef.current = null;
    setTripDocsUndoBanner(null);
    if (typeof fn !== "function") return;
    try {
      await fn();
    } catch (error) {
      console.error("Trip docs undo failed", error);
      showToast(error.message || "Undo failed.", "error");
    }
  }

  async function undoDismissRequiredTripDocumentSlotClient(undo) {
    if (!trip?.id || !undo?.placeholderId) return;
    await deleteResource(undo.placeholderId);
    for (const snap of undo.removedSnapshots || []) {
      await insertResourceFromSnapshot({
        tripId: trip.id,
        ...snap,
      });
    }
    for (const rev of undo.demotedRevert || []) {
      await updateResource({
        id: rev.id,
        title: rev.title,
        link: rev.link,
        pdfUrl: rev.pdfUrl,
        category: rev.category,
        resourceKey: rev.resourceKey,
        workArea: rev.workArea,
        tutorialTitle: rev.tutorialTitle,
        tutorialUrl: rev.tutorialUrl,
        tutorialDescription: rev.tutorialDescription,
        visibleToParticipants: rev.visibleToParticipants,
      });
    }
    const fresh = await listResources(trip.id);
    setDocs(dedupeRequiredSlotResources(fresh));
    showToast("Required card restored.", "success");
  }

  async function handleRequestDeleteTripDocument(doc) {
    if (!canManageTripDocuments || !doc?.id) return;
    const title = String(doc.title || "this document").trim() || "this document";
    const bits = [];
    if (String(doc.pdfUrl || "").trim()) bits.push("PDF");
    if (String(doc.link || "").trim()) bits.push("link");
    const typeLine = bits.length ? bits.join(" + ") : "no file or link yet";
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Remove "${title}" from this trip?\n\nContent: ${typeLine}.\nThe document will be removed from this list. You can undo for 15 seconds after confirming.`
      )
    ) {
      return;
    }
    const snap = snapshotTripResourceForInsert(doc);
    if (!snap) return;
    try {
      await deleteResource(doc.id);
      setDocs((current) => current.filter((x) => x.id !== doc.id));
      setDocsError("");
      scheduleTripDocsUndo(`Removed "${title}".`, async () => {
        const restored = await insertResourceFromSnapshot({
          tripId: trip.id,
          ...snap,
        });
        setDocs((current) => dedupeRequiredSlotResources([restored, ...current]));
        showToast("Document restored.", "success");
      });
      showToast("Document removed.", "success");
    } catch (error) {
      console.error("Unable to delete resource", error);
      setDocsError(error.message || "Unable to save resources.");
      showToast(error.message || "Unable to remove document.", "error");
    }
  }

  /**
   * Remove a default required document slot for this trip: delete empty rows for that key,
   * demote non-empty rows to optional (clear resource_key, keep PDF/link), then insert a hidden
   * placeholder so the slot stays dismissed until restored. Budget/journal rows still delete in full.
   * @returns {Promise<{ placeholderId: string, removedSnapshots: object[], demotedRevert: object[] } | null>}
   */
  async function dismissRequiredTripDocumentSlot(slot) {
    if (!trip?.id || !slot?.key) return null;
    const key = slot.key;
    // Use full server list — client `docs` may omit duplicate resource_key rows due to dedupe history.
    const sourceDocs = await listResources(trip.id);
    const idsToDelete = [];
    const docsToDemote = [];
    for (const d of sourceDocs || []) {
      if (!d.id || d.isAutoGenerated) continue;
      if (key === "smartsheet-budget") {
        if (d.resourceKey === "smartsheet-budget" || d.resourceKey === "project-record-journal") {
          idsToDelete.push(d.id);
        }
      } else if (String(d.resourceKey || "").trim() === key) {
        // PDF required slots: never delete rows when dismissing — only clear resource_key so uploads stay
        // linked to the trip. Empty rows become optional cards; avoids losing Flights-category docs when
        // content fields are missing or not yet synced.
        if (key === "flights" || key === "trip-insurance") {
          docsToDemote.push(d);
        } else {
          const hasContent = !!(String(d.link || "").trim() || String(d.pdfUrl || "").trim());
          if (hasContent) {
            docsToDemote.push(d);
          } else {
            idsToDelete.push(d.id);
          }
        }
      }
    }
    const removedSnapshots = idsToDelete
      .map((id) => sourceDocs.find((e) => e.id === id))
      .map((d) => snapshotTripResourceForInsert(d))
      .filter(Boolean);
    const demotedRevert = docsToDemote.map((d) => ({
      id: d.id,
      resourceKey: key,
      title: d.title,
      link: d.link || "",
      pdfUrl: d.pdfUrl || "",
      category: d.category || slot.category,
      workArea: d.workArea || "",
      tutorialTitle: d.tutorialTitle,
      tutorialUrl: d.tutorialUrl,
      tutorialDescription: d.tutorialDescription,
      visibleToParticipants: d.visibleToParticipants,
    }));
    for (const id of idsToDelete) {
      await deleteResource(id);
    }
    for (const d of docsToDemote) {
      await updateResource({
        id: d.id,
        title: d.title,
        link: d.link || "",
        pdfUrl: d.pdfUrl || "",
        category: d.category || slot.category,
        resourceKey: "",
        workArea: d.workArea || "",
        tutorialTitle: d.tutorialTitle,
        tutorialUrl: d.tutorialUrl,
        tutorialDescription: d.tutorialDescription,
        visibleToParticipants: d.visibleToParticipants,
      });
    }
    const created = await addLinkResource({
      title: slot.title,
      link: "",
      category: slot.category,
      resourceKey: key,
      tripId: trip.id,
      workArea: [DISMISS_SLOT_WORKAREA_MARKER, trip?.name || ""].filter(Boolean).join("\n"),
      visibleToParticipants: false,
      // Omit column on DBs without trip_resources_add_visibility.sql; dismiss is still detected via workArea marker.
      allowVisibilityFallback: true,
    });
    const fresh = await listResources(trip.id);
    setDocs(dedupeRequiredSlotResources(fresh));
    setDocsError("");
    return {
      placeholderId: created.id,
      removedSnapshots,
      demotedRevert,
    };
  }

  async function handleDeleteRequiredSlotResource(slot) {
    if (!slot?.key || !trip?.id) return;
    const isBudget = slot.key === "smartsheet-budget";
    const msg1 = isBudget
      ? `FIRST CONFIRMATION — Remove "${slot.title}"?\n\nThis removes all saved Smartsheet budget / project journal links for this trip from the document list (not from Smartsheet itself).\n\nYou will have 15 seconds to undo.`
      : `FIRST CONFIRMATION — Remove "${slot.title}" as a required card?\n\nEmpty rows for this slot are deleted. Uploads with a file or link stay on the trip as extra documents (not removed from storage).\n\nYou will have 15 seconds to undo.`;
    if (typeof window !== "undefined" && !window.confirm(msg1)) return;
    const msg2 = `FINAL CONFIRMATION\n\nRemove "${slot.title}" now?`;
    if (typeof window !== "undefined" && !window.confirm(msg2)) return;
    try {
      const undo = await dismissRequiredTripDocumentSlot(slot);
      if (canManageTripDocuments && undo?.placeholderId) {
        scheduleTripDocsUndo(`Removed required "${slot.title}".`, async () => {
          await undoDismissRequiredTripDocumentSlotClient(undo);
        });
      }
      showToast("Required card removed.", "success");
    } catch (error) {
      console.error("Unable to remove required document slot", error);
      setDocsError(error.message || "Unable to remove document.");
      showToast(error.message || "Unable to remove document.", "error");
    }
  }

  async function restoreDismissedDefaultTripDocuments() {
    if (!trip?.id) return;
    const keys = new Set(REQUIRED_TRIP_DOCUMENT_SLOTS.map((s) => s.key));
    const toRemove = (docs || []).filter(
      (d) => keys.has(String(d.resourceKey || "")) && isPersistedTripResourceDismissedEmpty(d)
    );
    if (toRemove.length === 0) return;
    try {
      for (const d of toRemove) {
        if (d.id) await deleteResource(d.id);
      }
      setDocs((current) => (current || []).filter((e) => !toRemove.some((r) => r.id === e.id)));
      setDocsError("");
      showToast("Default document cards restored.");
    } catch (error) {
      console.error("Unable to restore default documents", error);
      showToast(error.message || "Unable to restore.", "error");
    }
  }

  async function handleSaveHousingTripDocs() {
    if (!trip?.id || !housingTripDocsDraft || !staffViewAllParticipants) return;
    setHousingTripDocsSaveStatus("Saving...");
    try {
      let housingPdfUrl = String(housingTripDocsDraft.pdfUrlKeep || "").trim();
      if (housingTripDocsDraft.clearPdf) housingPdfUrl = "";
      if (housingTripDocsDraft.file) {
        housingPdfUrl = await uploadTripHousingPdf(trip.id, housingTripDocsDraft.file);
      }
      await saveTripBudget(trip.id, {
        housingLink: String(housingTripDocsDraft.housingLink || "").trim() || null,
        housingPdfUrl: housingPdfUrl || null,
      });
      const next = await fetchTripHousingState(trip.id);
      setTripHousingDocuments(next.tripHousingDocuments);
      setTripHousingLinkUrl(next.tripHousingLinkUrl);
      setTripHousingPdfUrl(next.tripHousingPdfUrl);
      setHousingTripDocsDraft(null);
      setHousingTripDocsSaveStatus("");
      showToast("Team housing saved.", "success");
    } catch (e) {
      const msg = e.message || "Unable to save housing.";
      setHousingTripDocsSaveStatus(msg);
      showToast(msg, "error");
    }
  }

  function handleCancelEditDoc() {
    setEditingDocId(null);
    setDocDraft(null);
  }

  async function handleSaveDoc() {
    if (!docDraft) return;

    try {
        const updated = await updateResource({
          id: docDraft.id,
          title: docDraft.title,
          link: docDraft.link,
          pdfUrl: docDraft.pdfUrl,
          category: docDraft.category,
          resourceKey: docDraft.resourceKey,
          workArea: buildTripDocumentWorkAreaMeta({
            workerName: docDraft.workerName,
            notes: docDraft.workArea,
          }),
          tutorialTitle: docDraft.tutorialTitle,
          tutorialUrl: docDraft.tutorialUrl,
          tutorialDescription: docDraft.tutorialDescription,
        visibleToParticipants: docDraft.visibleToParticipants,
      });
      setDocs((current) =>
        current.map((doc) => (doc.id === updated.id ? updated : doc))
      );
      setDocsError("");
      handleCancelEditDoc();
    } catch (error) {
      if (isMissingResourceTutorialColumnError(error)) {
        setDocsError(
          "Tutorial link editing needs the Supabase migration `supabase/trip_resources_add_tutorial_fields.sql` run first."
        );
        return;
      }
      console.error("Unable to update resource", error);
      setDocsError(error.message || "Unable to save resources.");
    }
  }

  async function handleReplaceDocumentFile(event) {
    const file = event.target.files?.[0];
    if (!file || !docDraft) return;

    try {
      const created = await addPdfResource({
        title: docDraft.title || file.name,
        file,
        category: docDraft.category,
        workArea: docDraft.workArea,
        resourceKey: docDraft.resourceKey,
        tutorialTitle: docDraft.tutorialTitle,
        tutorialUrl: docDraft.tutorialUrl,
        tutorialDescription: docDraft.tutorialDescription,
        visibleToParticipants: docDraft.visibleToParticipants,
        tripId: trip?.id,
      });
      const updated = await updateResource({
        id: docDraft.id,
        title: created.title,
        link: null,
        pdfUrl: created.pdfUrl,
        category: created.category,
        resourceKey: created.resourceKey,
        workArea: created.workArea,
        tutorialTitle: docDraft.tutorialTitle,
        tutorialUrl: docDraft.tutorialUrl,
        tutorialDescription: docDraft.tutorialDescription,
        visibleToParticipants: docDraft.visibleToParticipants,
      });
      setDocs((current) =>
        current.map((doc) => (doc.id === updated.id ? updated : doc))
      );
      setDocsError("");
      handleCancelEditDoc();
    } catch (error) {
      if (isMissingResourceTutorialColumnError(error)) {
        setDocsError(
          "Tutorial link editing needs the Supabase migration `supabase/trip_resources_add_tutorial_fields.sql` run first."
        );
        return;
      }
      console.error("Unable to replace PDF resource", error);
      setDocsError(error.message || "Unable to save resources.");
    } finally {
      event.target.value = "";
    }
  }

  useEffect(() => {
    if (!trip?.id || isPreviewingParticipant) {
      if (isPreviewingParticipant || !trip?.id) setReferenceEmails({});
      return;
    }

    let cancelled = false;

    async function loadReferenceEmails() {
      try {
        const rows = await listReferenceEmails(trip.id);
        if (cancelled) return;

        const next = {};
        rows.forEach((row) => {
          const key = referenceRowToStateKey(row);
          if (!key) return;
          next[key] = {
            referenceName: row.referenceName,
            referenceEmail: row.referenceEmail,
            referencePhone: row.referencePhone,
            sent: row.sent,
            received: row.received,
            sentDate: row.sentDate,
          };
        });
        setReferenceEmails(next);
      } catch (error) {
        console.error("Unable to load reference emails", error);
        if (!cancelled) {
          setReferenceEmails({});
        }
      }
    }

    void loadReferenceEmails();

    return () => {
      cancelled = true;
    };
  }, [trip?.id, isPreviewingParticipant]);

  function updateFundraisingDraft(participantId, field, value) {
    setFundraisingDrafts((current) => {
      const prev = current[participantId] || {};
      return {
        ...current,
        [participantId]: {
          fundraisingUrl: prev.fundraisingUrl ?? "",
          fundraisingGoalAmount: prev.fundraisingGoalAmount ?? "",
          [field]: value,
        },
      };
    });
  }

  async function handleSaveFundraising(participant) {
    if (!trip || !participant?.id) return;

    const draft = fundraisingDrafts[participant.id] || {
      fundraisingUrl: "",
      fundraisingGoalAmount: "",
    };

    try {
      setFundraisingStatus((current) => ({
        ...current,
        [participant.id]: { type: "info", message: "Saving..." },
      }));

      if (participant.tripTeamMemberId) {
        const savedMember = await saveTripTeamMemberFundraisingUrl({
          tripId: trip.id,
          memberId: participant.tripTeamMemberId,
          fundraisingUrl: draft.fundraisingUrl,
          fundraisingGoalAmount: draft.fundraisingGoalAmount,
        });

        const nextGoal =
          savedMember.fundraisingGoalAmount != null && savedMember.fundraisingGoalAmount !== ""
            ? Number(savedMember.fundraisingGoalAmount)
            : undefined;

        setTrip((current) => {
          if (!current) return current;
          return {
            ...current,
            teamMembers: (current.teamMembers || []).map((m) =>
              m.id === participant.tripTeamMemberId
                ? {
                    ...m,
                    fundraisingUrl: savedMember.fundraisingUrl,
                    fundraisingGoalAmount: nextGoal,
                  }
                : m
            ),
            participants: (current.participants || []).map((item) =>
              item.id === participant.id
                ? {
                    ...item,
                    fundraisingUrl: savedMember.fundraisingUrl,
                    fundraisingGoalAmount: nextGoal,
                  }
                : item
            ),
          };
        });

        setFundraisingDrafts((current) => ({
          ...current,
          [participant.id]: {
            fundraisingUrl: savedMember.fundraisingUrl || "",
            fundraisingGoalAmount:
              savedMember.fundraisingGoalAmount != null && savedMember.fundraisingGoalAmount !== ""
                ? String(savedMember.fundraisingGoalAmount)
                : "",
          },
        }));
      } else {
        if (
          String(draft.fundraisingGoalAmount || "").trim() !== "" &&
          canViewTeamDashboard
        ) {
          throw new Error(
            "Individual goals are stored on the trip roster. Add this worker to the team roster (Team tab) or ensure their roster row exists, then try again."
          );
        }

        const savedProfile = await saveFundraisingProfile({
          tripId: trip.id,
          userId: participant.id,
          fundraisingUrl: draft.fundraisingUrl,
        });

        setTrip((current) => {
          if (!current) return current;

          return {
            ...current,
            participants: (current.participants || []).map((item) =>
              item.id === participant.id
                ? {
                    ...item,
                    fundraisingUrl: savedProfile.fundraisingUrl,
                  }
                : item
            ),
          };
        });

        setFundraisingDrafts((current) => ({
          ...current,
          [participant.id]: {
            fundraisingUrl: savedProfile.fundraisingUrl || "",
            fundraisingGoalAmount: "",
          },
        }));
      }

      setFundraisingStatus((current) => ({
        ...current,
        [participant.id]: { type: "success", message: "Saved." },
      }));
      setEditingParticipantFundraisingId("");
    } catch (error) {
      console.error("Unable to save fundraising profile", error);
      setFundraisingStatus((current) => ({
        ...current,
        [participant.id]: {
          type: "error",
          message: error.message || "Unable to save fundraising.",
        },
      }));
    }
  }

  async function handleSaveTeamFundraising() {
    if (!trip?.id) return;

    try {
      setTeamFundraisingStatus("Saving...");
      const savedTrip = await saveTripFundraisingSettings({
        tripId: trip.id,
        teamFundraisingUrl: teamFundraisingDraft.teamFundraisingUrl,
        fundraisingGoalAmount: (() => {
          const raw = teamFundraisingDraft.fundraisingGoalAmount;
          if (raw === "" || raw == null) return null;
          const n = Number.parseFloat(String(raw), 10);
          return Number.isFinite(n) ? n : null;
        })(),
        fundraisingMode: teamFundraisingDraft.fundraisingMode,
      });

      setTrip((current) =>
        current
          ? {
              ...current,
              teamFundraisingUrl: savedTrip.team_fundraising_url || "",
              fundraisingGoalAmount: Number(savedTrip.fundraising_goal_amount || 0),
              fundraisingMode:
                String(savedTrip.fundraising_mode || "").toLowerCase() === "team"
                  ? "team"
                  : "individual",
            }
          : current
      );
      setIsEditingTeamFundraising(false);
      setTeamFundraisingStatus("Saved.");
    } catch (error) {
      console.error("Unable to save team fundraising settings", error);
      setTeamFundraisingStatus(error.message || "Unable to save team fundraising.");
    }
  }

  function normalizeReferenceRefKey(refKey) {
    if (!refKey) return "";
    return refKey.startsWith("user:") || refKey.startsWith("roster:")
      ? refKey
      : `user:${refKey}`;
  }

  function normalizeTravelFormRefKey(refKey) {
    if (!refKey) return "";
    return refKey.startsWith("user:") || refKey.startsWith("roster:")
      ? refKey
      : `user:${refKey}`;
  }

  function getTravelFormByRefKey(refKey) {
    const key = normalizeTravelFormRefKey(refKey);
    return (
      travelFormResponses.find(
        (row) => normalizeTravelFormRefKey(travelFormRowToRefKey(row)) === key
      ) || null
    );
  }

  function getReferenceStatus(refKey) {
    const key = normalizeReferenceRefKey(refKey);
    return (
      referenceEmails[key] || {
        referenceName: "",
        referenceEmail: "",
        referencePhone: "",
        sent: false,
        received: false,
        sentDate: "",
      }
    );
  }

  async function saveReferenceStatus(refKey, nextStatus) {
    if (!trip || !refKey) return;
    const rawKey = normalizeReferenceRefKey(refKey);
    const userId = rawKey.startsWith("user:") ? rawKey.slice(5) : "";
    const tripTeamMemberId = rawKey.startsWith("roster:") ? rawKey.slice(7) : "";
    if (!userId && !tripTeamMemberId) return;

    try {
      setReferenceSaveStatusByKey((current) => ({
        ...current,
        [rawKey]: { type: "saving", message: "Saving..." },
      }));
      const saved = await saveReferenceEmail({
        tripId: trip.id,
        userId: userId || undefined,
        tripTeamMemberId: tripTeamMemberId || undefined,
        referenceName: nextStatus.referenceName,
        referenceEmail: nextStatus.referenceEmail,
        referencePhone: nextStatus.referencePhone,
        sent: nextStatus.sent,
        received: nextStatus.received,
        sentDate: nextStatus.sentDate,
      });

      const stateKey = referenceRowToStateKey(saved);
      if (!stateKey) return;

      setReferenceEmails((current) => ({
        ...current,
        [stateKey]: {
          referenceName: saved.referenceName,
          referenceEmail: saved.referenceEmail,
          referencePhone: saved.referencePhone,
          sent: saved.sent,
          received: saved.received,
          sentDate: saved.sentDate,
        },
      }));
      setReferenceSaveStatusByKey((current) => ({
        ...current,
        [stateKey]: { type: "success", message: "Saved." },
      }));
    } catch (error) {
      console.error("Unable to save reference email", error);
      setReferenceSaveStatusByKey((current) => ({
        ...current,
        [rawKey]: { type: "error", message: error.message || "Save failed." },
      }));
      showToast(error.message || "Unable to save reference email.", "error");
    }
  }

  function retryReferenceSave(refKey) {
    const current = getReferenceStatus(refKey);
    void saveReferenceStatus(refKey, current);
  }

  function toggleReferenceEmail(refKey, field) {
    const key = normalizeReferenceRefKey(refKey);
    const current = getReferenceStatus(refKey);
    const nextValue = !current[field];

    const nextStatus = {
      ...current,
      [field]: nextValue,
      sentDate:
        field === "sent" && !nextValue ? "" : current.sentDate || "",
    };

    setReferenceEmails((prev) => ({
      ...prev,
      [key]: nextStatus,
    }));
    void saveReferenceStatus(refKey, nextStatus);
  }

  function updateReferenceSentDate(refKey, value) {
    const key = normalizeReferenceRefKey(refKey);
    const current = getReferenceStatus(refKey);
    const nextStatus = {
      ...current,
      sent: value ? true : current.sent,
      sentDate: value,
    };

    setReferenceEmails((prev) => ({
      ...prev,
      [key]: nextStatus,
    }));
    void saveReferenceStatus(refKey, nextStatus);
  }

  function updateReferenceField(refKey, field, value) {
    const key = normalizeReferenceRefKey(refKey);
    const current = getReferenceStatus(refKey);
    const nextStatus = {
      ...current,
      [field]: value,
    };

    setReferenceEmails((prev) => ({
      ...prev,
      [key]: nextStatus,
    }));
    void saveReferenceStatus(refKey, nextStatus);
  }

  function toggleTask(taskId, ownerEmail = session?.email) {
    if (!trip || !ownerEmail) return;
    const emailKey = normalizeEmail(ownerEmail);
    if (!emailKey) return;

    void (async () => {
      const userId = await resolveTrainingSubjectUserId(ownerEmail);
      if (!userId) {
        showToast(
          "No profile found for this email. The worker needs an account (or matching roster email) before tasks can be saved.",
          "error"
        );
        return;
      }

      const currentState = participantTaskStates[emailKey] || {};
      const next = { ...currentState, [taskId]: !currentState[taskId] };

      setParticipantTaskStates((prev) => ({
        ...prev,
        [emailKey]: next,
      }));

      const task = (trip.tasks || []).find((item) => item.id === taskId);
      const subject = participantDisplayForTrainingEmail(ownerEmail);

      try {
        await saveUserTaskProgress({
          tripId: trip.id,
          userId,
          taskName: taskId,
          completed: next[taskId],
          dueDate: task?.due || null,
        });
        if (!next[taskId]) return;
        const activityEntry = await logTripActivity({
          tripId: trip.id,
          actorUserId: userId,
          actorName: subject.name || session?.name || subject.email || ownerEmail,
          actorEmail: subject.email || session?.email || "",
          eventType: "task_completed",
          message: `${subject.name || subject.email || "Someone"} marked task complete`,
        });
        pushRecentActivity(activityEntry);
      } catch (error) {
        console.error("Unable to save user task progress", error);
        showToast(error.message || "Unable to save task progress.", "error");
      }
    })();
  }

  function openTravelFormModal(target) {
    if (!target?.refKey || !trip?.id) return;
    const refKey = normalizeTravelFormRefKey(target.refKey);
    const userId = refKey.startsWith("user:") ? refKey.slice(5) : "";
    const tripTeamMemberId = refKey.startsWith("roster:") ? refKey.slice(7) : "";
    if (!userId && !tripTeamMemberId) return;

    setTravelFormTargetRefKey(refKey);
    setTravelFormStatus("");
    setTravelFormModalOpen(true);
    getTravelFormForRef(trip.id, {
      userId: userId || undefined,
      tripTeamMemberId: tripTeamMemberId || undefined,
    })
      .then((existing) => {
        if (existing) {
          setTravelFormDraft({
            teamName: existing.teamName,
            firstNamePassport: existing.firstNamePassport,
            middleNamePassport: existing.middleNamePassport,
            lastNamePassport: existing.lastNamePassport,
            suffix: existing.suffix,
            email: existing.email,
            birthdateMonth: existing.birthdateMonth,
            birthdateDay: existing.birthdateDay,
            birthdateYear: existing.birthdateYear,
            gender: existing.gender,
            citizenship: existing.citizenship,
            passportNumber: existing.passportNumber,
            passportExpirationDate: existing.passportExpirationDate,
            passportIssuingCountry: existing.passportIssuingCountry,
            specialTravelPreferences: existing.specialTravelPreferences,
            frequentFlyerPrecheck: existing.frequentFlyerPrecheck,
            siteProject: existing.siteProject,
            gatewayCity: existing.gatewayCity,
            departureDate: existing.departureDate,
            returnDate: existing.returnDate,
            isMinor: existing.isMinor,
            passportValidSixMonths: existing.passportValidSixMonths,
            hasRealId: existing.hasRealId,
            baseTicketAck: existing.baseTicketAck,
            teamTravelAck: existing.teamTravelAck,
            endMeetingAck: existing.endMeetingAck,
            travelInsuranceAck: existing.travelInsuranceAck,
          });
        } else {
          setTravelFormDraft({
            ...TRAVEL_FORM_EMPTY,
            teamName: trip.name || "",
            email: target.email || "",
          });
        }
      })
      .catch((error) => {
        console.error("Unable to load travel form", error);
        showToast(error?.message || "Unable to load travel form.", "error");
        setTravelFormDraft({ ...TRAVEL_FORM_EMPTY, teamName: trip?.name || "", email: target?.email || "" });
      });
  }

  async function handleSaveGroupLeaderTravelContactOnly() {
    if (!trip?.id || !canManageTrips) return;
    try {
      setGroupLeaderContactSaveStatus("Saving...");
      const leaderPatch = await saveTripGroupLeaderTravelContact({
        tripId: trip.id,
        groupLeaderName: groupLeaderTravelDraft.name,
        groupLeaderCellPhone: groupLeaderTravelDraft.cellPhone,
        groupLeaderEmail: groupLeaderTravelDraft.email,
      });
      setTrip((current) =>
        current
          ? {
              ...current,
              groupLeaderName: leaderPatch.groupLeaderName,
              groupLeaderCellPhone: leaderPatch.groupLeaderCellPhone,
              groupLeaderEmail: leaderPatch.groupLeaderEmail,
            }
          : current
      );
      setGroupLeaderContactSaveStatus("Saved.");
      showToast("Group leader contact saved.");
    } catch (error) {
      const msg = error?.message || "Unable to save group leader contact.";
      setGroupLeaderContactSaveStatus(msg);
      showToast(msg, "error");
    }
  }

  async function handleSaveTravelForm() {
    const refKey = normalizeTravelFormRefKey(travelFormTargetRefKey);
    const userId = refKey.startsWith("user:") ? refKey.slice(5) : "";
    const tripTeamMemberId = refKey.startsWith("roster:") ? refKey.slice(7) : "";
    const participant = userId
      ? (trip?.participants || []).find((p) => String(p.id) === String(userId))
      : null;
    if (!trip?.id || (!userId && !tripTeamMemberId)) return;
    try {
      setTravelFormStatus("Saving...");
      await saveTravelFormForRef(trip.id, {
        userId: userId || undefined,
        tripTeamMemberId: tripTeamMemberId || undefined,
      }, {
        ...travelFormDraft,
        teamName: travelFormDraft.teamName || trip.name,
      });
      const updated = await listTravelFormResponsesForTrip(trip.id);
      setTravelFormResponses(updated);
      setTravelFormStatus("Saved.");
      showToast("Travel form saved.");
      const travelFormTask = (trip.tasks || []).find((t) => t.title === "Fill out Travel Form");
      const tfState = participantTaskStates[normalizeEmail(participant.email)] || {};
      if (
        participant &&
        travelFormTask &&
        !isWorkerTaskCompletedInState(travelFormTask, tfState)
      ) {
        toggleTask(travelFormTask.id, participant.email);
      }
      setTravelFormModalOpen(false);
      setTravelFormTargetRefKey("");
      setTravelFormStatus("");
    } catch (error) {
      const errMsg = error.message || "Unable to save.";
      setTravelFormStatus(errMsg);
      showToast(errMsg, "error");
    }
  }

  async function handleCreateTask() {
    if (!trip || !taskDraft.title.trim() || !canManageTrips || !staffViewAllParticipants) return;

    const dueSnap = taskDraftTripleRef.current?.getDueYmd?.();
    if (dueSnap === null) {
      showToast(
        "Finish choosing the due date (year, month, and day), or clear all date fields to add without one.",
        "error"
      );
      return;
    }

    try {
      const createdTask = await createTripTask({
        tripId: trip.id,
        title: taskDraft.title,
        dueDate: dueSnap,
        category: taskDraft.category,
        description: taskDraft.description,
      });

      setTrip((current) =>
        current
          ? {
              ...current,
              tasks: [...(current.tasks || []), createdTask],
            }
          : current
      );
      setTaskDraft({ title: "", dueDate: "", category: "General", description: "" });
      setTaskStatusMessage("");
      setIsAddingTask(false);
    } catch (error) {
      console.error("Unable to create trip task", error);
      setTaskStatusMessage(error.message || "Unable to create task.");
    }
  }

  async function resolveTrainingSubjectUserId(ownerEmail) {
    const key = normalizeEmail(ownerEmail);
    if (!key || !trip) return null;
    const fromAssignment = (trip.participants || []).find(
      (entry) => normalizeEmail(entry.email) === key
    );
    if (fromAssignment?.id) return fromAssignment.id;
    return resolveProfileIdByEmailForTraining(ownerEmail);
  }

  function participantDisplayForTrainingEmail(ownerEmail) {
    const key = normalizeEmail(ownerEmail);
    const fromParticipants = (trip?.participants || []).find(
      (entry) => normalizeEmail(entry.email) === key
    );
    if (fromParticipants) return fromParticipants;
    const fromRoster = (trip?.teamMembers || []).find(
      (entry) => normalizeEmail(entry.email) === key
    );
    if (fromRoster) {
      return {
        id: fromRoster.id,
        name: fromRoster.name || fromRoster.email || ownerEmail,
        email: fromRoster.email || ownerEmail,
      };
    }
    return {
      id: null,
      name: ownerEmail,
      email: ownerEmail,
    };
  }

  function toggleTraining(id, ownerEmail = session?.email) {
    if (!trip || !ownerEmail) return;

    const emailKey = normalizeEmail(ownerEmail);
    if (!emailKey) return;

    void (async () => {
      const userId = await resolveTrainingSubjectUserId(ownerEmail);
      if (!userId) {
        showToast(
          "No profile found for this email. The worker needs an account (or matching roster email) before training can be saved.",
          "error"
        );
        return;
      }

      const currentState = participantTrainingStates[emailKey] || {};
      const next = { ...currentState, [id]: !currentState[id] };
      const nextValue = !currentState[id];

      if (datedTrainingModuleIds.includes(id) && !nextValue) {
        next[`${id}Date`] = "";
      }

      setParticipantTrainingStates((prev) => ({
        ...prev,
        [emailKey]: next,
      }));

      const participant = participantDisplayForTrainingEmail(ownerEmail);

      try {
        await saveTrainingProgress({
          tripId: trip.id,
          userId,
          moduleId: id,
          completed: nextValue,
          completedAt: next[`${id}Date`] || null,
        });
        if (!nextValue) return;
        const module = allTrainingModules.find((item) => item.id === id);
        const activityEntry = await logTripActivity({
          tripId: trip.id,
          actorUserId: userId,
          actorName: participant.name || session?.name || participant.email,
          actorEmail: participant.email || session?.email || "",
          eventType: "training_completed",
          message: `${participant.name || participant.email || "Someone"} completed ${module?.title || "training module"}`,
        });
        pushRecentActivity(activityEntry);
      } catch (error) {
        console.error("Unable to save training progress", error);
        showToast(error.message || "Unable to save training progress.", "error");
      }
    })();
  }

  function updateTrainingDate(id, value, ownerEmail = session?.email) {
    if (!trip || !ownerEmail) return;

    const emailKey = normalizeEmail(ownerEmail);
    if (!emailKey) return;

    void (async () => {
      const userId = await resolveTrainingSubjectUserId(ownerEmail);
      if (!userId) {
        showToast(
          "No profile found for this email. The worker needs an account before training dates can be saved.",
          "error"
        );
        return;
      }

      const currentState = participantTrainingStates[emailKey] || {};
      const next = {
        ...currentState,
        [`${id}Date`]: value,
        [id]: value ? true : currentState[id],
      };

      setParticipantTrainingStates((prev) => ({
        ...prev,
        [emailKey]: next,
      }));

      const participant = participantDisplayForTrainingEmail(ownerEmail);

      try {
        const saved = await saveTrainingProgress({
          tripId: trip.id,
          userId,
          moduleId: id,
          completed: !!next[id],
          completedAt: value || null,
        });
        const moduleMeta = allTrainingModules.find((item) => String(item.id) === String(id));
        const rawFromServer = String(saved.completedAt || "").trim() || String(value || "").trim();
        const dateForUi = rawFromServer
          ? moduleMeta
            ? hydrateTrainingSessionDateFromDb(rawFromServer, moduleMeta.title)
            : rawFromServer
          : "";
        setParticipantTrainingStates((prev) => ({
          ...prev,
          [emailKey]: {
            ...(prev[emailKey] || {}),
            [`${id}Date`]: dateForUi,
            [id]: !!saved.completed,
          },
        }));
        if (!value || currentState[id]) return;
        const module = moduleMeta;
        const activityEntry = await logTripActivity({
          tripId: trip.id,
          actorUserId: userId,
          actorName: participant.name || session?.name || participant.email,
          actorEmail: participant.email || session?.email || "",
          eventType: "training_completed",
          message: `${participant.name || participant.email || "Someone"} completed ${module?.title || "training module"}`,
        });
        pushRecentActivity(activityEntry);
      } catch (error) {
        console.error("Unable to save training date", error);
        showToast(error.message || "Unable to save training progress.", "error");
      }
    })();
  }

  function withComputedStaffDueDates(tasks) {
    return sortStaffTasksByTemplate(
      (tasks || []).map((task) => ({
        ...task,
        dueDate: task.dueDate || computeStaffTaskDueDate(task, trip),
      }))
    );
  }

  async function saveStaffTasks(nextTasks) {
    const orderedTasks = withComputedStaffDueDates(nextTasks);
    setEditableStaffTasks(orderedTasks);
    editableStaffTasksRef.current = orderedTasks;
    if (!trip) return;
    const requestId = latestStaffTaskSaveRef.current + 1;
    latestStaffTaskSaveRef.current = requestId;
    try {
      setStaffTaskStatus("Saving...");
      const tasksToPersist = orderedTasks.map((task) => ({
        ...task,
        updatedByName: session?.name || session?.email || "Staff",
        updatedByEmail: session?.email || "",
        updatedAt: new Date().toISOString(),
      }));
      const savedTasks = await persistStaffTasks(trip.id, tasksToPersist);
      if (latestStaffTaskSaveRef.current !== requestId) return;
      setEditableStaffTasks(savedTasks);
      editableStaffTasksRef.current = savedTasks;
      setStaffTaskStatus("Saved.");
      showToast("Staff tasks saved.");
      return savedTasks;
    } catch (error) {
      console.error("Unable to save staff tasks", error);
      if (latestStaffTaskSaveRef.current !== requestId) return;
      const errMsg = "Could not save task changes.";
      setStaffTaskStatus(errMsg);
      showToast(errMsg, "error");
      throw error;
    }
  }

  async function persistWorkerTaskDueDate(taskId, value) {
    if (!trip || !taskId) return;

    const existingTask = (trip.tasks || []).find((item) => item.id === taskId);
    if (!existingTask) return;

    const savedTask = await updateTripTask({
      id: taskId,
      title: existingTask.title,
      description: existingTask.description,
      category: existingTask.category,
      status: existingTask.status,
      assignedToUserId: existingTask.assignedToUserId,
      dueDate: value || null,
    });

    setTrip((current) =>
      current
        ? {
            ...current,
            tasks: (current.tasks || [])
              .map((task) => (task.id === taskId ? savedTask : task))
              .sort((left, right) => {
                const leftDue = String(left?.due || "").trim();
                const rightDue = String(right?.due || "").trim();

                if (!leftDue && !rightDue) {
                  return String(left?.title || "").localeCompare(String(right?.title || ""));
                }

                if (!leftDue) return 1;
                if (!rightDue) return -1;

                return (
                  leftDue.localeCompare(rightDue) ||
                  String(left?.title || "").localeCompare(String(right?.title || ""))
                );
              }),
          }
        : current
    );
  }

  async function handleUploadParticipantDocument(userId, documentType, file) {
    if (!trip?.id || !userId || !file) return;

    const statusKey = `${userId}:${documentType}`;

    try {
      setParticipantDocumentStatus((current) => ({
        ...current,
        [statusKey]: { type: "info", message: "Uploading..." },
      }));

      const saved = await saveUserDocumentUpload({
        userId,
        tripId: trip.id,
        documentType,
        title: `${getUserDocumentTypeLabel(documentType, trip?.participantDocumentTypes, {
          domesticMassachusetts: isUsMassachusettsMissionSite(trip?.location),
        })} - ${trip.name}`,
        file,
        uploadedByUserId: session?.profileId || session?.id || userId,
      });

      setParticipantDocuments((current) => {
        const next = current.filter(
          (document) =>
            !(
              String(document.userId) === String(userId) &&
              String(document.tripId) === String(trip.id) &&
              String(document.documentType) === String(documentType)
            )
        );

        return [
          {
            ...saved,
            user:
              trip.participants.find((participant) => String(participant.id) === String(userId)) || null,
            trip: {
              id: trip.id,
              name: trip.name,
              location: trip.location,
            },
          },
          ...next,
        ];
      });

      setParticipantDocumentsError("");
      setParticipantDocumentStatus((current) => ({
        ...current,
        [statusKey]: { type: "success", message: "Uploaded." },
      }));
      const participantName =
        trip.participants.find((participant) => String(participant.id) === String(userId))?.name ||
        session?.name ||
        session?.email ||
        "Someone";
      const activityEntry = await logTripActivity({
        tripId: trip.id,
        actorUserId: session?.profileId || session?.id || userId,
        actorName: session?.name || participantName,
        actorEmail: session?.email || "",
        eventType: "participant_document_uploaded",
        message: `${participantName} uploaded ${getUserDocumentTypeLabel(
          documentType,
          trip?.participantDocumentTypes,
          { domesticMassachusetts: isUsMassachusettsMissionSite(trip?.location) }
        ).toLowerCase()}`,
      });
      pushRecentActivity(activityEntry);
    } catch (error) {
      console.error("Unable to upload participant document", error);
      setParticipantDocumentsError(error.message || "Unable to upload document.");
      setParticipantDocumentStatus((current) => ({
        ...current,
        [statusKey]: { type: "error", message: error.message || "Upload failed." },
      }));
    }
  }

  async function handleAddParticipantDocumentType() {
    if (!trip?.id) return;

    const nextTypes = normalizeCustomUserDocumentTypes([
      ...(trip.participantDocumentTypes || []),
      {
        label: customParticipantDocumentLabel,
      },
    ]);

    if ((trip.participantDocumentTypes || []).length === nextTypes.length) {
      setParticipantDocumentTypeStatus("Enter a new upload item name.");
      return;
    }

    try {
      setParticipantDocumentTypeStatus("Saving...");
      const updatedTrip = await saveTripParticipantDocumentTypes(trip.id, nextTypes);
      const addedType = nextTypes[nextTypes.length - 1] || null;
      let createdTask = null;

      if (addedType?.label) {
        createdTask = await createTripTask({
          tripId: trip.id,
          title: `Upload ${addedType.label}`,
          dueDate: buildDateOffsetFromToday(14),
          category: "Uploads",
          description: `Upload ${addedType.label} in My Documents.`,
        });
      }

      setTrip((current) =>
        current
          ? {
              ...current,
              participantDocumentTypes: updatedTrip.participantDocumentTypes || [],
              tasks: createdTask ? [...(current.tasks || []), createdTask] : current.tasks,
            }
          : current
      );
      setCustomParticipantDocumentLabel("");
      setParticipantDocumentTypeStatus(
        createdTask
          ? `Saved. Task created with due date ${formatShortDate(createdTask.due)}.`
          : "Saved."
      );
    } catch (error) {
      console.error("Unable to save participant document types", error);
      setParticipantDocumentTypeStatus(error.message || "Unable to save upload item.");
    }
  }

  async function handleDeleteParticipantDocument(document) {
    if (!document?.id) return;

    const statusKey = `${document.userId}:${document.documentType}`;

    try {
      setParticipantDocumentStatus((current) => ({
        ...current,
        [statusKey]: { type: "info", message: "Deleting..." },
      }));
      await deleteUserDocument(document.id);
      setParticipantDocuments((current) => current.filter((item) => item.id !== document.id));
      setParticipantDocumentStatus((current) => ({
        ...current,
        [statusKey]: { type: "success", message: "Deleted." },
      }));
      setConfirmingParticipantDocumentDeleteId("");
    } catch (error) {
      console.error("Unable to delete participant document", error);
      setParticipantDocumentStatus((current) => ({
        ...current,
        [statusKey]: { type: "error", message: error.message || "Delete failed." },
      }));
      setConfirmingParticipantDocumentDeleteId("");
    }
  }

  function handleJumpToOverviewItem(item) {
    if (!item?.destinationTab || !item?.destinationId) return;

    if (item.destinationTab === "Staff Tasks") {
      handleJumpToStaffTask(item.destinationId);
      return;
    }

    if (item.destinationTab === "Tasks") {
      setPendingWorkerTaskJumpId(item.destinationId);
      setTab("Tasks");
      return;
    }

    if (item.destinationTab === "Trip Documents") {
      setTab("Trip Documents");
      return;
    }

    if (item.destinationTab === "Materials") {
      setTab("Materials");
      return;
    }

    if (item.destinationTab === "Training") {
      setPendingTrainingModuleJumpId(item.destinationId);
      setTab("Training");
    }
  }

  function setStaffTaskRowFeedback(taskId, type, message) {
    if (!taskId) return;

    const existingTimeout = staffTaskRowTimeoutsRef.current[taskId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete staffTaskRowTimeoutsRef.current[taskId];
    }

    setStaffTaskRowStatus((current) => ({
      ...current,
      [taskId]: { type, message },
    }));

    if (type === "success") {
      staffTaskRowTimeoutsRef.current[taskId] = setTimeout(() => {
        setStaffTaskRowStatus((current) => {
          const next = { ...current };
          delete next[taskId];
          return next;
        });
        delete staffTaskRowTimeoutsRef.current[taskId];
      }, 1800);
    }
  }

  function updateStaffTask(taskId, field, value) {
    const nextTasks = setLocalStaffTaskField(taskId, field, value);
    console.log("[tripPage] updateStaffTask", {
      tripId: trip?.id,
      taskId,
      field,
      value,
      matchedTask: nextTasks.find((task) => task.id === taskId) || null,
    });
    setStaffTaskRowFeedback(taskId, "info", "Saving...");
    void saveStaffTasks(nextTasks)
      .then(() => {
        setStaffTaskRowFeedback(taskId, "success", "Saved");
        setStaffTaskStatus("");
      })
      .catch((error) => {
        const errMsg = error.message || "Could not save task changes.";
        setStaffTaskRowFeedback(taskId, "error", "Could not save task changes.");
        setStaffTaskStatus(errMsg);
        showToast(errMsg, "error");
      });
  }

  function setLocalStaffTaskField(taskId, field, value) {
    const baseTasks = editableStaffTasksRef.current || [];
    const nextTasks = baseTasks.map((task) =>
      task.id === taskId ? { ...task, [field]: value } : task
    );

    setEditableStaffTasks(nextTasks);
    editableStaffTasksRef.current = nextTasks;
    return nextTasks;
  }

  function clearPendingStaffTaskNoteSave(taskId) {
    const existingTimeout = staffTaskNoteSaveTimeoutsRef.current[taskId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete staffTaskNoteSaveTimeoutsRef.current[taskId];
      return true;
    }

    return false;
  }

  function handleStaffTaskNotesChange(taskId, value) {
    setLocalStaffTaskField(taskId, "notes", value);
    setStaffTaskStatus("");
    clearPendingStaffTaskNoteSave(taskId);

    staffTaskNoteSaveTimeoutsRef.current[taskId] = setTimeout(() => {
      delete staffTaskNoteSaveTimeoutsRef.current[taskId];
      updateStaffTask(taskId, "notes", value);
    }, 700);
  }

  function flushStaffTaskNotesSave(taskId, value) {
    const hadPendingSave = clearPendingStaffTaskNoteSave(taskId);
    if (hadPendingSave) {
      updateStaffTask(taskId, "notes", value);
    }
  }

  function handleEditStaffTask(task) {
    editingStaffTaskIdRef.current = task.id;
    setEditingStaffTaskId(task.id);
    setStaffTaskTitleDraft(task.taskName || task.title || "");
    setStaffTaskDueDateDraft(
      toDateInputValue(task.dueDate || computeStaffTaskDueDate(task, trip) || "")
    );
  }

  function handleCancelStaffTaskEdit() {
    editingStaffTaskIdRef.current = null;
    setEditingStaffTaskId(null);
    setStaffTaskTitleDraft("");
    setStaffTaskDueDateDraft("");
  }

  async function handleAddStaffTask() {
    const trimmedTaskName = String(newStaffTaskDraft.taskName || "").trim();
    if (!trimmedTaskName) {
      setStaffTaskStatus("Task name is required.");
      return;
    }

    const dueSnap = newStaffTaskTripleRef.current?.getDueYmd?.();
    if (dueSnap === null) {
      const msg =
        "Finish choosing the due date (year, month, and day), or clear all date fields to add without one.";
      setStaffTaskStatus(msg);
      showToast(msg, "error");
      return;
    }

    const nextTask = {
      id: `${trip?.id || "trip"}-custom-${Date.now()}`,
      workArea: newStaffTaskDraft.workArea || "Project Formation",
      sequence:
        Math.max(
          0,
          ...(editableStaffTasksRef.current || [])
            .filter((task) => task.workArea === (newStaffTaskDraft.workArea || "Project Formation"))
            .map((task) => Number(task.sequence || 0))
        ) + 1,
      taskName: trimmedTaskName,
      assignedTo: newStaffTaskDraft.assignedTo || "",
      progress: "Not started",
      dueDate: dueSnap || "",
      notes: newStaffTaskDraft.notes || "",
    };

    try {
      setStaffTaskStatus("");
      await saveStaffTasks([...(editableStaffTasksRef.current || []), nextTask]);
      setIsAddingStaffTask(false);
      setNewStaffTaskDraft({
        workArea: newStaffTaskDraft.workArea || "Project Formation",
        taskName: "",
        assignedTo: "",
        dueDate: "",
        notes: "",
      });
      setStaffTaskStatus("Staff task added.");
    } catch (error) {
      console.error("Unable to add staff task", error);
      const errMsg = error.message || "Unable to add staff task.";
      setStaffTaskStatus(errMsg);
      showToast(errMsg, "error");
    }
  }

  function handleJumpToStaffTask(taskId) {
    if (!taskId) return;
    setPendingStaffTaskJumpId(taskId);
    setTab("Staff Tasks");
  }

  async function handleSaveStaffTaskRow(taskId) {
    const baseTasks = editableStaffTasksRef.current || [];
    const title = staffTaskTitleDraft.trim() || "Untitled task";
    const snap = staffDueTripleRef.current?.getDueYmd?.();
    if (snap === null) {
      showToast(
        "Finish choosing the due date (year, month, and day), or clear all date fields to remove it.",
        "error"
      );
      return;
    }
    const due = snap;
    const nextTasks = baseTasks.map((task) =>
      task.id === taskId ? { ...task, taskName: title, dueDate: due } : task
    );
    try {
      await saveStaffTasks(nextTasks);
      handleCancelStaffTaskEdit();
    } catch {
      /* saveStaffTasks already surfaced error; keep edit mode */
    }
  }

  function getStaffTaskAreaLabel(area) {
    return STAFF_TASK_AREA_LABELS[area] || area || "Other";
  }

  function getProgressClass(progress) {
    switch (progress) {
      case "Complete":
        return "badgeSuccess";
      case "In progress":
        return "badgeWarn";
      case "Waiting":
        return "badgeInfo";
      default:
        return "badgeDanger";
    }
  }

  function getProgressInputClass(progress) {
    switch (progress) {
      case "Complete":
        return "statusComplete";
      case "In progress":
        return "statusInProgress";
      case "Waiting":
        return "statusWaiting";
      default:
        return "statusNotStarted";
    }
  }

  function getFundraisingProgressMeta(participant) {
    const hasUrl = !!participant?.fundraisingUrl;
    const personalGoalRaw = participant?.fundraisingGoalAmount;
    const personalGoal =
      personalGoalRaw != null &&
      personalGoalRaw !== "" &&
      Number.isFinite(Number(personalGoalRaw)) &&
      Number(personalGoalRaw) > 0
        ? Number(personalGoalRaw)
        : null;
    const tripDefaultRaw = trip?.fundraisingGoalAmount;
    const tripDefault =
      tripDefaultRaw != null &&
      tripDefaultRaw !== "" &&
      Number.isFinite(Number(tripDefaultRaw)) &&
      Number(tripDefaultRaw) > 0
        ? Number(tripDefaultRaw)
        : null;

    const goalLine =
      personalGoal != null
        ? `Individual goal: ${formatMoney(personalGoal)}`
        : tripDefault != null
          ? `No per-person override — trip default ${formatMoney(tripDefault)}`
          : "No individual or trip goal amount on file";

    if (hasUrl) {
      return {
        label: "Worker Progress: Ready",
        badgeClass: "badgeSuccess",
        helperText: "Personal Neon fundraising page saved.",
        goalLine,
      };
    }

    return {
      label: "Worker Progress: Missing",
      badgeClass: "badgeWarn",
      helperText: "No personal Neon link added yet.",
      goalLine,
    };
  }

function parseDateSafe(dateStr) {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  function toDateInputValue(dateStr) {
    if (!dateStr) return "";
    const s = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const date = parseDateSafe(s);
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatShortDate(dateStr) {
    const date = parseDateSafe(dateStr);
    if (!date) return "-";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  }

  function groupTasksByWorkArea(tasks) {
    const groups = {};

    (tasks || []).forEach((task) => {
      const area = getStaffTaskAreaLabel(task.workArea);

      if (!groups[area]) {
        groups[area] = [];
      }

      groups[area].push(task);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const ra = getStaffTaskAreaSortRank(groups[a][0]?.workArea);
      const rb = getStaffTaskAreaSortRank(groups[b][0]?.workArea);
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b);
    });

    const ordered = {};
    sortedKeys.forEach((k) => {
      ordered[k] = sortStaffTasksByTemplate(groups[k]);
    });
    return ordered;
  }

  function getWorkerTaskSection(task) {
    const category = String(task?.category || "").trim();
    if (category && category !== "worker_default") {
      return category;
    }

    const title = String(task?.title || "").toLowerCase();

    if (
      title.includes("$2,000 raised") ||
      title.includes("all raised") ||
      title.includes("fundraising goal") ||
      title.includes("fundraising funds") ||
      title.includes("donor")
    ) {
      return "Fundraising";
    }
    if (title.includes("material")) return "Materials";
    if (
      title.includes("passport") ||
      title.includes("government id") ||
      title.includes("government-issued photo id") ||
      title.includes("visa") ||
      title.includes("ticket") ||
      title.includes("step") ||
      title.includes("travel form") ||
      title.includes("waiver")
    ) {
      return "Travel";
    }
    if (title.includes("training")) return "Training";

    return "General";
  }

  function groupWorkerTasks(tasks) {
    const groups = new Map();

    (tasks || []).forEach((task) => {
      const section = getWorkerTaskSection(task);
      const existing = groups.get(section) || [];
      existing.push(task);
      groups.set(section, existing);
    });

    const sectionOrder = ["General", "Materials", "Fundraising", "Training", "Travel", "Uploads"];

    return Array.from(groups.entries()).sort((left, right) => {
      const leftIndex = sectionOrder.indexOf(left[0]);
      const rightIndex = sectionOrder.indexOf(right[0]);

      return (
        (leftIndex === -1 ? sectionOrder.length : leftIndex) -
        (rightIndex === -1 ? sectionOrder.length : rightIndex)
      );
    });
  }

  function getSettledValue(result, fallback, label) {
    if (result.status === "fulfilled") {
      return result.value;
    }

    console.error(`Unable to load ${label}`, result.reason);
    return fallback;
  }

  function formatNoteTimestamp(value) {
    if (!value) return "";

    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function renderAnnouncementInlineFormatting(text, keyPrefix = "ann") {
    const input = String(text || "");
    const out = [];
    const tokenPattern = /(\*\*[^*]+\*\*|==[^=]+==)/g;
    let lastIndex = 0;
    let match = tokenPattern.exec(input);
    let tokenIndex = 0;

    while (match) {
      if (match.index > lastIndex) {
        out.push(input.slice(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        out.push(
          <strong key={`${keyPrefix}-b-${tokenIndex}`}>
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith("==") && token.endsWith("==")) {
        out.push(
          <mark
            key={`${keyPrefix}-h-${tokenIndex}`}
            style={{ background: "rgba(250, 204, 21, 0.35)", padding: "0 2px", borderRadius: 3 }}
          >
            {token.slice(2, -2)}
          </mark>
        );
      } else {
        out.push(token);
      }
      lastIndex = match.index + token.length;
      tokenIndex += 1;
      match = tokenPattern.exec(input);
    }

    if (lastIndex < input.length) {
      out.push(input.slice(lastIndex));
    }

    return out;
  }

  function renderAnnouncementMessage(message) {
    const lines = String(message || "").split("\n");
    return (
      <>
        {lines.map((line, index) => (
          <span key={`announcement-line-${index}`}>
            {renderAnnouncementInlineFormatting(line, `announcement-line-${index}`)}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </>
    );
  }

  function formatRecentActivityTimestamp(value) {
    if (!value) return "";

    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatMeetingDateTime(value) {
    if (!value) return "Date and time unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date and time unavailable";
    return date.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }

  function formatSingleDate(value) {
    if (!value) return "Not set";

    return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTripDateRange(startDate, endDate) {
    if (!startDate && !endDate) return "Dates to be confirmed";

    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T00:00:00`);
      const sameMonth =
        start.toLocaleString("en-US", { month: "long" }) ===
          end.toLocaleString("en-US", { month: "long" }) &&
        start.getFullYear() === end.getFullYear();

      if (sameMonth) {
        return `${start.toLocaleString("en-US", { month: "long" })} ${start.getDate()}-${end.getDate()}, ${end.getFullYear()}`;
      }

      return `${start.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })} - ${end.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`;
    }

    return formatSingleDate(startDate || endDate);
  }

  function getCountdownSummary(startDate) {
    if (!startDate) {
      return {
        label: "Dates to be confirmed",
        detail: "Trip start date has not been set yet.",
      };
    }

    const tripStart = new Date(`${startDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      return {
        label: `${diffDays} days until takeoff`,
        detail: `Trip starts ${formatSingleDate(startDate)}.`,
      };
    }

    if (diffDays === 1) {
      return {
        label: "1 day until takeoff",
        detail: `Trip starts ${formatSingleDate(startDate)}.`,
      };
    }

    if (diffDays === 0) {
      return {
        label: "Trip starts today",
        detail: `Today is ${formatSingleDate(startDate)}.`,
      };
    }

    return {
      label: "Trip is underway or complete",
      detail: `Trip started ${formatSingleDate(startDate)}.`,
    };
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  function formatOptionalMoney(value) {
    return value === null || value === undefined || value === "" ? "Not set" : formatMoney(value);
  }

  function subtractDays(dateValue, days) {
    if (!dateValue) return null;
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    date.setDate(date.getDate() - days);
    return date;
  }

  function formatDeadlineDate(date) {
    if (!date) return "Date unavailable";
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getWeeksInCountry(startDate, endDate) {
    if (!startDate || !endDate) return "";

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

    const days = Math.max(
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      1
    );
    const weeks = days / 7;

    if (weeks >= 1) {
      const roundedWeeks = Math.round(weeks);
      return `${roundedWeeks} week${roundedWeeks === 1 ? "" : "s"}`;
    }

    return `${days} day${days === 1 ? "" : "s"}`;
  }

  function formatTaskUpdatedAt(value) {
    if (!value) return "";

    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  async function handleSaveOverviewNote() {
    if (!trip?.id) return;
    const trimmedNote = String(overviewNoteDraft || "").trim();

    if (!trimmedNote) {
      setOverviewNoteStatus("Note cannot be empty.");
      return;
    }

    try {
      setOverviewNoteStatus("Saving...");
      const saved = await saveTripOverviewNote({
        id: editingOverviewNoteId || null,
        tripId: trip.id,
        note: trimmedNote,
        authorName:
          session?.name ||
          String(session?.email || "")
            .split("@")[0]
            .trim() ||
          "Unknown user",
        authorEmail: session?.email || "",
      });
      setOverviewNotes((current) => {
        const existingIndex = current.findIndex((note) => note.id === saved.id);
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = saved;
          return next.sort((left, right) =>
            String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""))
          );
        }

        return [saved, ...current].sort((left, right) =>
          String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""))
        );
      });
      setOverviewNoteDraft(saved.note || "");
      setEditingOverviewNoteId("");
      setIsEditingOverviewNote(false);
      setOverviewNoteStatus("Saved.");
    } catch (error) {
      console.error("Unable to save trip overview note", error);
      setOverviewNoteStatus(error.message || "Unable to save note.");
    }
  }

  async function handleDeleteOverviewNote() {
    if (!editingOverviewNoteId) return;

    const existingNote = overviewNotes.find((note) => note.id === editingOverviewNoteId);
    const notePreview = String(existingNote?.note || "")
      .trim()
      .slice(0, 120);
    const confirmMessage = notePreview
      ? `Delete this note?\n\n"${notePreview}${notePreview.length >= 120 ? "..." : ""}"`
      : "Delete this note?";

    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) {
      return;
    }

    try {
      setOverviewNoteStatus("Deleting...");
      await deleteTripOverviewNote(editingOverviewNoteId);
      setOverviewNotes((current) => current.filter((note) => note.id !== editingOverviewNoteId));
      setEditingOverviewNoteId("");
      setOverviewNoteDraft("");
      setIsEditingOverviewNote(false);
      setOverviewNoteStatus("Deleted.");
    } catch (error) {
      console.error("Unable to delete trip overview note", error);
      setOverviewNoteStatus(error.message || "Unable to delete note.");
    }
  }

  function handleStartOverviewNote(note = null) {
    setEditingOverviewNoteId(note?.id || "");
    setOverviewNoteDraft(note?.note || "");
    setIsEditingOverviewNote(true);
    setOverviewNoteStatus("");
  }

  function handleCancelOverviewNoteEdit() {
    setEditingOverviewNoteId("");
    setOverviewNoteDraft("");
    setIsEditingOverviewNote(false);
    setOverviewNoteStatus("");
  }

  async function handleSaveTripMeeting() {
    if (!trip?.id || !meetingDraft.scheduledAt) {
      setMeetingStatus("Pick a date and time for the meeting.");
      return;
    }
    try {
      setMeetingStatus("Saving...");
      const saved = await saveTripMeeting({
        id: editingMeetingId || undefined,
        tripId: trip.id,
        title: meetingDraft.title,
        scheduledAt: new Date(meetingDraft.scheduledAt).toISOString(),
        notesAfter: meetingDraft.notesAfter,
      });
      setTripMeetings((prev) => {
        const without = prev.filter((m) => m.id !== saved.id);
        return [...without, saved].sort(
          (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        );
      });
      setMeetingDraft({ title: "", scheduledAt: "", notesAfter: "" });
      setEditingMeetingId("");
      setMeetingAddFormOpen(false);
      setMeetingStatus("Saved.");
    } catch (error) {
      console.error("Unable to save meeting", error);
      setMeetingStatus(error.message || "Unable to save meeting.");
    }
  }

  async function handleSaveAnnouncement() {
    if (!trip?.id) return;

    const trimmedMessage = String(announcementDraft || "").trim();
    if (!trimmedMessage) {
      setAnnouncementStatus("Announcement cannot be empty.");
      return;
    }

    try {
      setAnnouncementStatus("Saving...");
      const saved = await saveTripAnnouncement({
        id: editingAnnouncementId || null,
        tripId: trip.id,
        message: trimmedMessage,
        authorName: session?.name || session?.email || "Staff",
        authorEmail: session?.email || "",
      });

      setAnnouncements((current) => {
        const existingIndex = current.findIndex((item) => item.id === saved.id);
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = saved;
          return next.sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")));
        }

        return [saved, ...current].sort((left, right) =>
          String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""))
        );
      });
      setAnnouncementDraft(saved.message || "");
      setEditingAnnouncementId("");
      setIsEditingAnnouncement(false);
      setAnnouncementStatus("Saved.");
      const activityEntry = await logTripActivity({
        tripId: trip.id,
        actorUserId: session?.profileId || session?.id || "",
        actorName: session?.name || session?.email || "Staff",
        actorEmail: session?.email || "",
        eventType: editingAnnouncementId ? "announcement_updated" : "announcement_created",
        message: editingAnnouncementId
          ? "Staff updated announcement"
          : "Staff posted new announcement",
      });
      pushRecentActivity(activityEntry);
    } catch (error) {
      console.error("Unable to save trip announcement", error);
      setAnnouncementStatus(error.message || "Unable to save announcement.");
    }
  }

  async function handleDeleteAnnouncement() {
    if (!editingAnnouncementId) return;

    if (typeof window !== "undefined" && !window.confirm("Delete this announcement?")) {
      return;
    }

    try {
      setAnnouncementStatus("Deleting...");
      await deleteTripAnnouncement(editingAnnouncementId);
      setAnnouncements((current) => current.filter((item) => item.id !== editingAnnouncementId));
      setEditingAnnouncementId("");
      setAnnouncementDraft("");
      setIsEditingAnnouncement(false);
      setAnnouncementStatus("Deleted.");
    } catch (error) {
      console.error("Unable to delete trip announcement", error);
      setAnnouncementStatus(error.message || "Unable to delete announcement.");
    }
  }

  function handleStartAnnouncement(announcement = null) {
    setEditingAnnouncementId(announcement?.id || "");
    setAnnouncementDraft(announcement?.message || "");
    setIsEditingAnnouncement(true);
    setAnnouncementStatus("");
  }

  function handleCancelAnnouncementEdit() {
    setEditingAnnouncementId("");
    setAnnouncementDraft("");
    setIsEditingAnnouncement(false);
    setAnnouncementStatus("");
  }

  function applyAnnouncementSelectionTransform(transform) {
    const textarea = announcementTextareaRef.current;
    if (!textarea) return;
    const value = String(announcementDraft || "");
    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    const result = transform({
      value,
      selectionStart,
      selectionEnd,
    });
    if (!result || typeof result.text !== "string") return;
    setAnnouncementDraft(result.text);
    window.requestAnimationFrame(() => {
      if (!announcementTextareaRef.current) return;
      announcementTextareaRef.current.focus();
      announcementTextareaRef.current.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  function transformAnnouncementSelectedLines(value, selectionStart, selectionEnd, mapLine) {
    const start = Math.max(0, selectionStart);
    const end = Math.max(start, selectionEnd);
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEndCandidate = value.indexOf("\n", end);
    const lineEnd = lineEndCandidate === -1 ? value.length : lineEndCandidate;
    const block = value.slice(lineStart, lineEnd);
    const lines = block.split("\n");
    const nextLines = lines.map((line, index) => mapLine(line, index, lines.length));
    const nextBlock = nextLines.join("\n");
    const nextText = `${value.slice(0, lineStart)}${nextBlock}${value.slice(lineEnd)}`;
    return {
      text: nextText,
      selectionStart: lineStart,
      selectionEnd: lineStart + nextBlock.length,
    };
  }

  function handleAnnouncementFormatBullet() {
    applyAnnouncementSelectionTransform(({ value, selectionStart, selectionEnd }) =>
      transformAnnouncementSelectedLines(value, selectionStart, selectionEnd, (line) => {
        if (!String(line || "").trim()) return line;
        return line.startsWith("- ") ? line : `- ${line}`;
      })
    );
  }

  function handleAnnouncementFormatNumbered() {
    applyAnnouncementSelectionTransform(({ value, selectionStart, selectionEnd }) => {
      let nextNumber = 1;
      return transformAnnouncementSelectedLines(value, selectionStart, selectionEnd, (line) => {
        if (!String(line || "").trim()) return line;
        const stripped = line.replace(/^\d+\.\s+/, "");
        const out = `${nextNumber}. ${stripped}`;
        nextNumber += 1;
        return out;
      });
    });
  }

  function handleAnnouncementIndent() {
    applyAnnouncementSelectionTransform(({ value, selectionStart, selectionEnd }) =>
      transformAnnouncementSelectedLines(value, selectionStart, selectionEnd, (line) =>
        String(line || "").length ? `\t${line}` : line
      )
    );
  }

  function handleAnnouncementOutdent() {
    applyAnnouncementSelectionTransform(({ value, selectionStart, selectionEnd }) =>
      transformAnnouncementSelectedLines(value, selectionStart, selectionEnd, (line) =>
        String(line || "").replace(/^\t|^ {1,4}/, "")
      )
    );
  }

  function handleAnnouncementKeyDown(event) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    if (event.shiftKey) {
      handleAnnouncementOutdent();
      return;
    }
    handleAnnouncementIndent();
  }

  function wrapAnnouncementSelection(markerStart, markerEnd, placeholderText) {
    applyAnnouncementSelectionTransform(({ value, selectionStart, selectionEnd }) => {
      const start = Math.max(0, selectionStart);
      const end = Math.max(start, selectionEnd);
      const selected = value.slice(start, end);
      const inner = selected || placeholderText;
      const replacement = `${markerStart}${inner}${markerEnd}`;
      const text = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
      const innerStart = start + markerStart.length;
      const innerEnd = innerStart + inner.length;
      return {
        text,
        selectionStart: innerStart,
        selectionEnd: innerEnd,
      };
    });
  }

  function handleAnnouncementFormatBold() {
    wrapAnnouncementSelection("**", "**", "bold text");
  }

  function handleAnnouncementFormatHighlight() {
    wrapAnnouncementSelection("==", "==", "highlighted text");
  }

  function updateTripSetupDraft(field, value) {
    setTripSetupDraft((current) => {
      const next = { ...current, [field]: value };
      if (field === "location") {
        next.host = resolveEffectiveSiteHostName(value, siteBudgetNotesList);
      }
      return next;
    });
  }

  function handleStartTripSetupEdit() {
    let draft = buildTripSetupDraft(trip);
    const loc = String(draft.location || "").trim();
    if (loc) {
      const canon = resolveCanonicalSiteLabelForTrip(loc, siteBudgetNotesList);
      const ordered = buildSiteLabelsOrdered(siteBudgetNotesList);
      const exact = ordered.find(
        (o) => o.toLowerCase() === String(canon || "").trim().toLowerCase()
      );
      if (exact && exact !== loc) {
        draft = { ...draft, location: exact };
      }
    }
    setTripSetupDraft(draft);
    setIsCustomSiteInput(false);
    setIsConfirmingTripDelete(false);
    setTripSetupStatus("");
    setIsEditingTripSetup(true);
  }

  function handleCancelTripSetupEdit() {
    setTripSetupDraft(buildTripSetupDraft(trip));
    setIsCustomSiteInput(false);
    setIsConfirmingTripDelete(false);
    setTripSetupStatus("");
    setIsEditingTripSetup(false);
  }

  async function handleSaveTripSetup() {
    if (!trip?.id) return;

    if (!String(tripSetupDraft.name || "").trim()) {
      const msg = "Team name is required.";
      setTripSetupStatus(msg);
      showToast(msg, "error");
      window.requestAnimationFrame(() => {
        document.getElementById("trip-setup")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    if (!String(tripSetupDraft.location || "").trim()) {
      const msg = "Site is required.";
      setTripSetupStatus(msg);
      showToast(msg, "error");
      window.requestAnimationFrame(() => {
        document.getElementById("trip-setup")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    try {
      setTripSetupStatus("Saving...");
      const trimmedTripFee = String(tripSetupDraft.tripFeeAmount ?? "").trim();
      const trimmedMaterials = String(tripSetupDraft.materialsFeeAmount ?? "").trim();
      const trimmedHannover = String(tripSetupDraft.hannoverHousingFeeAmount ?? "").trim();
      const savedTrip = await updateTripForCurrentUser({
        tripId: trip.id,
        ...tripSetupDraft,
        tripFeeAmount: trimmedTripFee || String(DEFAULT_TRIP_FEE_AMOUNT),
        materialsFeeAmount: trimmedMaterials || String(DEFAULT_MATERIALS_FEE_AMOUNT),
        hannoverHousingFeeAmount: trimmedHannover || String(DEFAULT_HANNOVER_HOUSING_FEE_AMOUNT),
      });

      setTrip((current) =>
        current
          ? {
              ...current,
              ...savedTrip,
              participants: current.participants || [],
              teamMembers: current.teamMembers || [],
              tasks: savedTrip.tasks || current.tasks || [],
              quickLinks: current.quickLinks || [],
              docs: current.docs || [],
              staffTasks: current.staffTasks || [],
            }
          : current
      );
      setTripSetupDraft(buildTripSetupDraft(savedTrip));
      setIsEditingTripSetup(false);
      setIsCustomSiteInput(false);
      setIsConfirmingTripDelete(false);
      setTripSetupStatus("Saved.");
      showToast("Trip details saved.", "success");
    } catch (error) {
      console.error("Unable to save trip details", error);
      const errMsg = error.message || "Unable to save trip details.";
      setTripSetupStatus(errMsg);
      showToast(errMsg, "error");
    }
  }

  function openDeleteTripConfirm() {
    if (!trip?.id || !canManageTrips) return;
    setIsConfirmingTripDelete(true);
  }

  async function handleConfirmDeleteTrip() {
    if (!trip?.id || !canManageTrips) return;
    try {
      setTripSetupStatus("Deleting trip...");
      await deleteTrip(trip.id);
      setIsConfirmingTripDelete(false);
      setTripSetupStatus("");
      await router.push("/trips");
    } catch (error) {
      console.error("Unable to delete trip", error);
      const msg = error.message || "Unable to delete trip.";
      setTripSetupStatus(msg);
      showToast(msg, "error");
    }
  }

  function updateRosterDraftMember(index, field, value) {
    setRosterDraft((current) =>
      current.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member
      )
    );
  }

  function handleStartRosterEdit() {
    setRosterDraft(
      teamTabMembers.length > 0
        ? teamTabMembers.map((member) => ({
            id: member.id || "",
            assignmentId: member.assignmentId || "",
            profileId: member.profileId || "",
            connected: !!member.connected,
            firstName: member.firstName || "",
            lastName: member.lastName || "",
            email: member.email || "",
            cellPhone: member.cellPhone || "",
            teamRole: normalizeLegacyTeamRole(member.teamRole || member.role || "Worker"),
            travelsWithTeam: member.travelsWithTeam !== false,
            tshirtSize: member.tshirtSize || "",
            startDate: member.startDate || "",
            endDate: member.endDate || "",
          }))
        : [createEmptyRosterMember()]
    );
    setRosterStatus("");
    setWorkerAddStatus("");
    setIsAddingWorker(false);
    setIsEditingRoster(true);
  }

  function handleCancelRosterEdit() {
    setRosterDraft(trip?.teamMembers || []);
    setRosterStatus("");
    setIsEditingRoster(false);
  }

  function handleStartAddWorker() {
    setIsEditingRoster(false);
    setRosterStatus("");
    setNewWorkerDraft(createEmptyWorkerDraft());
    setWorkerAddStatus("");
    setIsAddingWorker(true);
  }

  function handleCancelAddWorker() {
    setNewWorkerDraft(createEmptyWorkerDraft());
    setWorkerAddStatus("");
    setIsAddingWorker(false);
  }

  function updateNewWorkerDraft(field, value) {
    setNewWorkerDraft((current) => ({ ...current, [field]: value }));
  }

  function resolveRosterMemberIdForTshirt(member) {
    if (!member) return "";
    if (member.id) return String(member.id);
    const rowEmail = normalizeEmail(member.email);
    if (!rowEmail) return "";
    const rosterRow = (trip?.teamMembers || []).find(
      (m) => m?.id && normalizeEmail(m.email) === rowEmail
    );
    return rosterRow?.id ? String(rosterRow.id) : "";
  }

  function canEditRosterTshirtInline(member) {
    if (staffViewAllParticipants) return true;
    if (canViewTeamDashboard && effectiveIsLeader) return true;
    const rowEmail = normalizeEmail(member.email);
    const sessionEmail = normalizeEmail(session?.email || "");
    if (!rowEmail || !sessionEmail || rowEmail !== sessionEmail) return false;
    return Boolean(resolveRosterMemberIdForTshirt(member));
  }

  async function handleInlineRosterTshirtChange(member, nextSize) {
    const memberId = resolveRosterMemberIdForTshirt(member);
    if (!trip?.id || !memberId || !canEditRosterTshirtInline(member)) return;

    setInlineTshirtSavingKey(member.key);
    setRosterStatus("");
    try {
      const updated = await updateTripTeamMemberTshirtSize({
        tripId: trip.id,
        memberId,
        tshirtSize: nextSize,
      });
      setTrip((current) => {
        if (!current) return current;
        const nextTeam = (current.teamMembers || []).map((m) =>
          String(m.id) === String(memberId) ? { ...m, tshirtSize: updated.tshirtSize } : m
        );
        return { ...current, teamMembers: nextTeam };
      });
      if (isEditingRoster) {
        setRosterDraft((draft) =>
          draft.map((row) =>
            String(row.id) === String(memberId) ? { ...row, tshirtSize: updated.tshirtSize } : row
          )
        );
      }
      showToast("T-shirt size saved.");
    } catch (error) {
      console.error("Unable to save T-shirt size", error);
      const msg = error?.message || "Could not save T-shirt size.";
      setRosterStatus(msg);
      showToast(msg, "error");
    } finally {
      setInlineTshirtSavingKey("");
    }
  }

  function handleAddRosterMember() {
    setRosterDraft((current) => [...current, createEmptyRosterMember()]);
  }

  function handleRemoveRosterMember(index) {
    setRosterDraft((current) => current.filter((_, memberIndex) => memberIndex !== index));
  }

  async function handleSaveRoster() {
    if (!trip?.id) return;

    try {
      setRosterStatus("Saving...");
      const removedAssignmentIds = teamTabMembers
        .filter(
          (member) =>
            member.assignmentId &&
            !rosterDraft.some(
              (draftMember) =>
                String(draftMember.assignmentId || "") === String(member.assignmentId || "")
            )
        )
        .map((member) => member.assignmentId);
      const normalizedDraft = rosterDraft.map((m) => ({
        ...m,
        teamRole: normalizeLegacyTeamRole(m.teamRole),
      }));
      const savedMembers = await saveTripTeamMembers(trip.id, normalizedDraft);

      try {
        await pruneTripTicketsForNonTravelingLeaders();
      } catch (pruneErr) {
        console.warn("pruneTripTicketsForNonTravelingLeaders", pruneErr);
      }

      if (removedAssignmentIds.length > 0) {
        await Promise.all(removedAssignmentIds.map((assignmentId) => removeTripAssignment(assignmentId)));
      }

      setTrip((current) =>
        current
          ? {
              ...current,
              teamMembers: savedMembers,
              participants: (current.participants || []).filter(
                (participant) => !removedAssignmentIds.includes(participant.assignmentId)
              ),
            }
          : current
      );
      setRosterDraft(savedMembers);
      setIsEditingRoster(false);
      setRosterStatus("Saved.");
    } catch (error) {
      console.error("Unable to save team roster", error);
      setRosterStatus(error.message || "Unable to save team roster.");
    }
  }

  async function handleAddWorkerToTrip() {
    if (!trip?.id) return;

    const firstName = String(newWorkerDraft.firstName || "").trim();
    const lastName = String(newWorkerDraft.lastName || "").trim();
    const email = normalizeEmail(newWorkerDraft.email);

    if (!firstName || !lastName || !email) {
      setWorkerAddStatus("Enter first name, last name, and email.");
      return;
    }

    const existingRosterMember = (trip.teamMembers || []).find(
      (member) => normalizeEmail(member.email) === email
    );
    const existingAssignedWorker = (trip.participants || []).find(
      (participant) => normalizeEmail(participant.email) === email
    );

    if (existingRosterMember || existingAssignedWorker) {
      setWorkerAddStatus("That worker is already on this trip.");
      return;
    }

    try {
      setWorkerAddStatus("Adding...");
      const role = normalizeLegacyTeamRole(newWorkerDraft.teamRole || "Worker");
      const travelsWithTeam =
        String(role).trim().toLowerCase() === "leader"
          ? newWorkerDraft.travelsWithTeam !== false
          : true;
      const nextRosterMembers = await saveTripTeamMembers(trip.id, [
        ...(trip.teamMembers || []),
        {
          firstName,
          lastName,
          email,
          cellPhone: String(newWorkerDraft.cellPhone || "").trim(),
          teamRole: role,
          travelsWithTeam,
          tshirtSize: "",
          startDate: "",
          endDate: "",
        },
      ]);

      let nextParticipants = trip.participants || [];
      let statusMessage = "Worker added as unassigned.";

      if (newWorkerDraft.assignmentMode === "assigned") {
        const result = await assignWorkerByEmailToTrip({
          workerEmail: email,
          tripId: trip.id,
        });

        if (result.status === "assigned" || result.status === "duplicate") {
          nextParticipants = await listTripParticipants(trip.id);
          statusMessage = "Worker added and assigned to this trip.";
        } else {
          statusMessage = result.message || "Worker saved as unassigned.";
        }
      }

      setTrip((current) => (current
        ? {
            ...current,
            teamMembers: nextRosterMembers,
            participants: nextParticipants,
          }
        : current));
      setWorkerAddStatus(statusMessage);
      setNewWorkerDraft(createEmptyWorkerDraft());
      setIsAddingWorker(false);
    } catch (error) {
      console.error("Unable to add worker to trip", error);
      setWorkerAddStatus(error.message || "Unable to add worker.");
    }
  }

  function renderTripSetupCard() {
    return (
      <div
        id="trip-setup"
        className="card pad"
        style={{ gridColumn: "1 / -1", paddingTop: 14 }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            columnGap: 16,
            rowGap: 8,
            marginBottom: 10,
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 200px" }}>
            <div className="cardSectionPill" style={{ marginBottom: 4 }}>Trip setup</div>
            <div className="small" style={{ opacity: 0.88, lineHeight: 1.35 }}>
              Site, dates, and configuration.
            </div>
          </div>
          <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", flexShrink: 0, marginTop: 2 }}>
            {tripSetupStatus ? (
              <div className="row" style={{ alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <AppStatusMessage
                  message={tripSetupStatus}
                  tone={
                    tripSetupStatus === "Saved."
                      ? "success"
                      : tripSetupStatus === "Saving..." || tripSetupStatus === "Deleting trip..."
                        ? "info"
                        : "danger"
                  }
                  compact
                />
                {tripSetupStatus !== "Saving..." &&
                tripSetupStatus !== "Saved." &&
                tripSetupStatus !== "Deleting trip..." &&
                isEditingTripSetup ? (
                  <button type="button" className="btn btnPrimary" onClick={() => handleSaveTripSetup()}>
                    Try again
                  </button>
                ) : null}
              </div>
            ) : null}
            {staffViewAllParticipants && !isEditingTripSetup ? (
              <button className="btn" type="button" onClick={handleStartTripSetupEdit}>
                Edit Details
              </button>
            ) : null}
          </div>
        </div>
        <div
          className={`tripSetupColumns${staffViewAllParticipants ? "" : " tripSetupColumnsSingle"}`}
        >
          <div className="tripSetupSection tripSetupSectionTrip">
            <div className="tripSetupSectionHeader">Trip Details</div>
            {isEditingTripSetup ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Team Name</div>
                  <input
                    className="input"
                    value={tripSetupDraft.name}
                    onChange={(event) => updateTripSetupDraft("name", event.target.value)}
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Site</div>
                  <select
                    className="input"
                    value={selectedSiteValue}
                    onChange={(event) => {
                      if (event.target.value === CUSTOM_SITE_OPTION) {
                        setIsCustomSiteInput(true);
                        updateTripSetupDraft(
                          "location",
                          siteOptions.includes(tripSetupDraft.location) ? "" : tripSetupDraft.location
                        );
                        return;
                      }

                      setIsCustomSiteInput(false);
                      updateTripSetupDraft("location", event.target.value);
                    }}
                  >
                    <option value="">Select site</option>
                    {siteOptions.map((site) => {
                      const row = findSiteBudgetNoteForOption(site, siteBudgetNotesList);
                      const mark =
                        canManageTrips && staffViewAllParticipants && row?.notes?.trim()
                          ? " !"
                          : "";
                      return (
                        <option key={site} value={site}>
                          {site}
                          {mark}
                        </option>
                      );
                    })}
                    <option value={CUSTOM_SITE_OPTION}>Other site</option>
                  </select>
                  {selectedSiteValue === CUSTOM_SITE_OPTION ? (
                    <input
                      className="input"
                      style={{ marginTop: 10 }}
                      value={tripSetupDraft.location}
                      onChange={(event) => updateTripSetupDraft("location", event.target.value)}
                      placeholder="Enter site"
                    />
                  ) : null}
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="small" style={{ marginBottom: 6 }}>Project Leave Date</div>
                  <AppDueDateTripleSelect
                    value={tripSetupDraft.startDate}
                    onChange={(ymd) => updateTripSetupDraft("startDate", ymd)}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="small" style={{ marginBottom: 6 }}>Project Return Date</div>
                  <AppDueDateTripleSelect
                    value={tripSetupDraft.endDate}
                    onChange={(ymd) => updateTripSetupDraft("endDate", ymd)}
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Length of Projects</div>
                  <input
                    className="input"
                    value={tripSetupDraft.projectLengthSummary}
                    onChange={(event) => updateTripSetupDraft("projectLengthSummary", event.target.value)}
                    placeholder="6 weeks, with a 3-week subgroup"
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Team Status</div>
                  <select
                    className="input"
                    value={tripSetupDraft.teamStatus}
                    onChange={(event) => updateTripSetupDraft("teamStatus", event.target.value)}
                  >
                    <option value="">Select team status</option>
                    {TEAM_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Training Timeline</div>
                  <select
                    className="input"
                    value={tripSetupDraft.trainingTimelineType}
                    onChange={(event) =>
                      updateTripSetupDraft("trainingTimelineType", event.target.value)
                    }
                  >
                    {TRAINING_TIMELINE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : staffViewAllParticipants ? (
              <>
                <div className="small">Team Name</div>
                <div style={{ fontWeight: 800 }}>{trip.name}</div>
                <div style={{ height: 12 }} />
                <div className="small">Site</div>
                <div
                  className="row"
                  style={{ fontWeight: 800, alignItems: "center", gap: 6, flexWrap: "wrap" }}
                >
                  <span>{tripSiteCanonicalLabel || "Not set"}</span>
                </div>
                <div style={{ height: 12 }} />
                <div className="small">Project Leave Date</div>
                <div style={{ fontWeight: 800 }}>{formatSingleDate(trip.startDate)}</div>
                <div style={{ height: 12 }} />
                <div className="small">Project Return Date</div>
                <div style={{ fontWeight: 800 }}>{formatSingleDate(trip.endDate)}</div>
                <div style={{ height: 12 }} />
                <div className="small">Length of Projects</div>
                <div style={{ fontWeight: 800 }}>
                  {trip.projectLengthSummary ||
                    getWeeksInCountry(trip.startDate, trip.endDate) ||
                    "Dates to be confirmed"}
                </div>
                <div style={{ height: 12 }} />
                <div className="small">Team Status</div>
                <div style={{ fontWeight: 800 }}>{trip.teamStatus || "Not set"}</div>
                <div style={{ height: 12 }} />
                <div className="small">Training Timeline</div>
                <div style={{ fontWeight: 800 }}>
                  {trip.trainingTimelineType === "college"
                    ? "College Team (6+ months)"
                    : "Standard (3 months)"}
                </div>
              </>
            ) : (
              <div className="tripSetupInfoGrid">
                <div className="tripSetupInfoItem">
                  <div className="small">Site</div>
                  <div
                    className="row"
                    style={{ fontWeight: 800, alignItems: "center", gap: 6, flexWrap: "wrap" }}
                  >
                    <span>{tripSiteCanonicalLabel || "Not set"}</span>
                  </div>
                </div>
                <div className="tripSetupInfoItem">
                  <div className="small">Project Leave Date</div>
                  <div style={{ fontWeight: 800 }}>{formatSingleDate(trip.startDate)}</div>
                </div>
                <div className="tripSetupInfoItem">
                  <div className="small">Project Return Date</div>
                  <div style={{ fontWeight: 800 }}>{formatSingleDate(trip.endDate)}</div>
                </div>
                <div className="tripSetupInfoItem">
                  <div className="small">Length of Projects</div>
                  <div style={{ fontWeight: 800 }}>
                    {trip.projectLengthSummary ||
                      getWeeksInCountry(trip.startDate, trip.endDate) ||
                      "Dates to be confirmed"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {staffViewAllParticipants ? (
            <div className="tripSetupSection tripSetupSectionSite">
              <div className="tripSetupSectionHeader">Site Setup</div>
              {isEditingTripSetup ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Host Name</div>
                    <input
                      className="input"
                      value={tripSetupDraft.host}
                      onChange={(event) => updateTripSetupDraft("host", event.target.value)}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Site Type</div>
                    <select
                      className="input"
                      value={tripSetupDraft.siteType}
                      onChange={(event) => updateTripSetupDraft("siteType", event.target.value)}
                    >
                      <option value="">Select site type</option>
                      <option value="partner">Partner</option>
                      <option value="managed">Managed</option>
                      <option value="seasonal">Seasonal</option>
                    </select>
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Type of Project</div>
                    <select
                      className="input"
                      value={tripSetupDraft.projectType}
                      onChange={(event) => updateTripSetupDraft("projectType", event.target.value)}
                    >
                      <option value="">Select project type</option>
                      <option value="LST">LST</option>
                      <option value="YF">YF</option>
                      <option value="TP">TP</option>
                    </select>
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Extra Travel</div>
                    <select
                      className="input"
                      value={tripSetupDraft.extraTravelStatus}
                      onChange={(event) => updateTripSetupDraft("extraTravelStatus", event.target.value)}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                      <option value="maybe">Maybe</option>
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="small">Host Name</div>
                  <div style={{ fontWeight: 800 }}>{trip.host || "Not set"}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Site Type</div>
                  <div style={{ fontWeight: 800 }}>
                    {trip.siteType
                      ? trip.siteType.charAt(0).toUpperCase() + trip.siteType.slice(1)
                      : "Not set"}
                  </div>
                  <div style={{ height: 12 }} />
                  <div className="small">Type of Project</div>
                  <div style={{ fontWeight: 800 }}>{trip.projectType || "Not set"}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Extra Travel</div>
                  <div style={{ fontWeight: 800 }}>
                    {trip.extraTravelStatus
                      ? trip.extraTravelStatus.charAt(0).toUpperCase() + trip.extraTravelStatus.slice(1)
                      : "No"}
                  </div>
                </>
              )}
            </div>
          ) : null}

          {staffViewAllParticipants ? (
            <div className="tripSetupSection tripSetupSectionFees">
              <div className="tripSetupSectionHeader">Fees</div>
              {isEditingTripSetup ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Fundraising Goal</div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.fundraisingGoalAmount}
                      onChange={(event) => updateTripSetupDraft("fundraisingGoalAmount", event.target.value)}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Fee</div>
                    <input
                      className="input recruitingFundingInput"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.tripFeeAmount}
                      onChange={(event) => updateTripSetupDraft("tripFeeAmount", event.target.value)}
                      placeholder={String(DEFAULT_TRIP_FEE_AMOUNT)}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Materials Fee</div>
                    <input
                      className="input recruitingFundingInput"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.materialsFeeAmount}
                      onChange={(event) => updateTripSetupDraft("materialsFeeAmount", event.target.value)}
                      placeholder={String(DEFAULT_MATERIALS_FEE_AMOUNT)}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Deferred Worker</div>
                    <select
                      className="input"
                      value={tripSetupDraft.hasDeferredWorker}
                      onChange={(event) => updateTripSetupDraft("hasDeferredWorker", event.target.value)}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Hannover Housing Fee</div>
                    <input
                      className="input recruitingFundingInput"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.hannoverHousingFeeAmount}
                      onChange={(event) => updateTripSetupDraft("hannoverHousingFeeAmount", event.target.value)}
                      placeholder={String(DEFAULT_HANNOVER_HOUSING_FEE_AMOUNT)}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Domestic Project</div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.domesticProjectFeeAmount}
                      onChange={(event) => updateTripSetupDraft("domesticProjectFeeAmount", event.target.value)}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Domestic Fee</div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.domesticFeeAmount}
                      onChange={(event) => updateTripSetupDraft("domesticFeeAmount", event.target.value)}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Domestic Materials Fee</div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.domesticMaterialsFeeAmount}
                      onChange={(event) => updateTripSetupDraft("domesticMaterialsFeeAmount", event.target.value)}
                    />
                  </div>
                  <div className="row" style={{ marginTop: 4 }}>
                    <button className="btn btnPrimary" type="button" onClick={handleSaveTripSetup}>
                      Save Details
                    </button>
                    <button className="btn" type="button" onClick={handleCancelTripSetupEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="small">Fundraising Goal</div>
                  <div style={{ fontWeight: 800 }}>{formatOptionalMoney(trip.fundraisingGoalAmount)}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Fee</div>
                  <div style={{ fontWeight: 800 }}>{formatOptionalMoney(trip.tripFeeAmount)}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Materials Fee</div>
                  <div style={{ fontWeight: 800 }}>{formatOptionalMoney(trip.materialsFeeAmount)}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Deferred Worker</div>
                  <div style={{ fontWeight: 800 }}>{trip.hasDeferredWorker ? "Yes" : "No"}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Hannover Housing Fee</div>
                  <div style={{ fontWeight: 800 }}>{formatOptionalMoney(trip.hannoverHousingFeeAmount)}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Domestic Project</div>
                  <div style={{ fontWeight: 800 }}>{formatOptionalMoney(trip.domesticProjectFeeAmount)}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Domestic Fee</div>
                  <div style={{ fontWeight: 800 }}>{formatOptionalMoney(trip.domesticFeeAmount)}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Domestic Materials Fee</div>
                  <div style={{ fontWeight: 800 }}>{formatOptionalMoney(trip.domesticMaterialsFeeAmount)}</div>
                </>
              )}
            </div>
          ) : null}
        </div>
        {isEditingTripSetup && canManageTrips ? (
          <div
            style={{
              marginTop: 18,
              paddingTop: 18,
              borderTop: "1px solid rgba(239,68,68,.18)",
              display: "grid",
              gap: 10,
            }}
          >
            <div className="small" style={{ color: "var(--danger)" }}>
              Delete this trip if it should be removed entirely from the dashboard.
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btnDanger"
                type="button"
                onClick={openDeleteTripConfirm}
              >
                Delete Trip
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const groupedViewTasks = groupTasksByWorkArea(editableStaffTasks || []);
  const staffTaskWorkAreas = useMemo(() => {
    const templateOrder = listStaffTaskTemplateWorkAreas();
    const seen = new Set(templateOrder.map((a) => String(a).toLowerCase()));
    const extras = [
      ...new Set((editableStaffTasks || []).map((task) => task.workArea).filter(Boolean)),
    ].filter((a) => !seen.has(String(a).toLowerCase()));
    extras.sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: "base" }));
    return [...templateOrder, ...extras];
  }, [editableStaffTasks]);

  const workerTripTaskCategoryOptions = useMemo(() => {
    const canon = [...WORKER_TRIP_TASK_SECTION_OPTIONS];
    const seen = new Set(canon.map((c) => c.toLowerCase()));
    const extras = [];
    for (const task of trip?.tasks || []) {
      const cat = String(task?.category || "").trim();
      if (!cat || cat.toLowerCase() === "worker_default") continue;
      const k = cat.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        extras.push(cat);
      }
    }
    extras.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return [...canon, ...extras];
  }, [trip?.tasks]);

  const completedCount = (editableStaffTasks || []).filter(
    (t) => t.progress === "Complete"
  ).length;
  const totalCount = (editableStaffTasks || []).length;
  const completionPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const siteOptions = useMemo(() => {
    const seen = new Set();
    const out = [];
    const push = (label) => {
      const s = String(label || "").trim();
      if (!s) return;
      const k = s.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push(s);
    };
    for (const o of buildSiteLabelsOrdered(siteBudgetNotesList)) push(o);
    const loc = String(trip?.location || "").trim();
    if (loc) {
      const canon = resolveCanonicalSiteLabelForTrip(loc, siteBudgetNotesList);
      push(canon || loc);
    }
    out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return out;
  }, [trip?.location, siteBudgetNotesList]);

  const tripSiteCanonicalLabel = useMemo(
    () => resolveCanonicalSiteLabelForTrip(trip?.location || "", siteBudgetNotesList),
    [trip?.location, siteBudgetNotesList]
  );

  const tripSiteHasStaffHousingNote = useMemo(() => {
    if (!canManageTrips || !staffViewAllParticipants) return false;
    const note = resolveSiteBudgetNoteForTripLocation(trip?.location || "", siteBudgetNotesList);
    return Boolean(note?.notes?.trim());
  }, [trip?.location, siteBudgetNotesList, canManageTrips, staffViewAllParticipants]);
  const selectedSiteValue = isCustomSiteInput ? CUSTOM_SITE_OPTION : tripSetupDraft.location || "";
  const visibleDocs = useMemo(
    () =>
      canManageTripDocuments
        ? docs
        : (docs || []).filter((doc) => doc.visibleToParticipants !== false),
    [canManageTripDocuments, docs]
  );
  const requiredDocumentSlots = useMemo(() => {
    const budgetDoc = visibleDocs.find((d) => d.resourceKey === "smartsheet-budget");
    const journalDoc = visibleDocs.find((d) => d.resourceKey === "project-record-journal");
    const mergedBudgetResource =
      budgetDoc || journalDoc
        ? (() => {
            const base = budgetDoc || journalDoc;
            const linkPick = String(budgetDoc?.link || journalDoc?.link || "").trim();
            const pdfPick = String(budgetDoc?.pdfUrl || journalDoc?.pdfUrl || "").trim();
            const vis =
              budgetDoc && journalDoc
                ? budgetDoc.visibleToParticipants !== false &&
                  journalDoc.visibleToParticipants !== false
                : base.visibleToParticipants !== false;
            return {
              ...base,
              link: linkPick || base.link || "",
              pdfUrl: pdfPick || base.pdfUrl || "",
              visibleToParticipants: vis,
            };
          })()
        : null;

    return REQUIRED_TRIP_DOCUMENT_SLOTS.map((slot) => {
      if (slot.key === "smartsheet-budget") {
        return { ...slot, resource: mergedBudgetResource };
      }
      return {
        ...slot,
        resource: visibleDocs.find((doc) => doc.resourceKey === slot.key) || null,
      };
    });
  }, [visibleDocs]);

  const optionalTripWideCardProps = {
    editingDocId,
    docDraft,
    setDocDraft,
    canManageTripDocuments,
    handleEditDoc,
    requestDeleteTripDoc: handleRequestDeleteTripDocument,
    handleSaveDoc,
    handleCancelEditDoc,
    handleReplaceDocumentFile,
    compactTile: true,
  };

  const workerPreviewOptions = useMemo(() => {
    if (!trip) return [];
    const participantEmails = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );
    const options = (trip.participants || []).map((participant) => ({
      id: String(participant.id || ""),
      label: participant.name || participant.email || "Worker",
    }));
    for (const member of trip.teamMembers || []) {
      if (!member?.id) continue;
      const email = normalizeEmail(member.email);
      if (email && participantEmails.has(email)) continue;
      options.push({
        id: `${ROSTER_PREVIEW_PREFIX}${member.id}`,
        label: member.name || member.email || "Roster member",
      });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [trip]);

  const activeParticipantEmail =
    normalizeEmail(currentParticipant?.email) || normalizeEmail(session?.email) || "";
  const canUploadOwnParticipantDocuments =
    !staffViewAllParticipants &&
    !!currentParticipant &&
    !isPreviewingParticipant &&
    !isLeaderOnTripNotTraveling;
  const canEditTripReferenceEmails = staffViewAllParticipants;
  const canViewTripReferenceSection =
    !isPreviewingParticipant && (staffViewAllParticipants || effectiveIsLeader);
  const participantDocumentsByUserId = useMemo(() => {
    const grouped = new Map();

    (participantDocuments || []).forEach((document) => {
      const key = String(document.userId || "");
      if (!key) return;

      const existing = grouped.get(key) || {};
      existing[document.documentType] = document;
      grouped.set(key, existing);
    });

    return grouped;
  }, [participantDocuments]);
  const tripIsMassachusettsDomestic = useMemo(
    () => isUsMassachusettsMissionSite(trip?.location),
    [trip?.location]
  );
  const tripUserDocumentTypes = useMemo(
    () =>
      getTripUserDocumentTypes(trip?.participantDocumentTypes || [], {
        domesticMassachusetts: tripIsMassachusettsDomestic,
      }),
    [trip?.participantDocumentTypes, tripIsMassachusettsDomestic]
  );
  const tripTasks = useMemo(() => (Array.isArray(trip?.tasks) ? trip.tasks : []), [trip?.tasks]);

  const participantTaskProgress = useMemo(() => {
    if (!trip) return [];

    const base = (trip.participants || []).map((participant) => {
      const taskState = participantTaskStates[normalizeEmail(participant.email)] || {};
      const completed = tripTasks.filter((task) =>
        isWorkerTaskCompletedInState(task, taskState)
      ).length;

      return {
        ...participant,
        taskState,
        completed,
        total: tripTasks.length,
        percent: percentComplete(tripTasks, taskState),
      };
    });

    if (!canViewTeamDashboard) {
      return base;
    }

    const participantEmails = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );
    const extras = (trip.teamMembers || [])
      .filter((m) => {
        const e = normalizeEmail(m.email);
        return e && !participantEmails.has(e);
      })
      .map((member) => {
        const taskState = participantTaskStates[normalizeEmail(member.email)] || {};
        const completed = tripTasks.filter((task) =>
          isWorkerTaskCompletedInState(task, taskState)
        ).length;
        return {
          id: member.id ? `roster-member-${member.id}` : `roster-${normalizeEmail(member.email)}`,
          assignmentId: "",
          name: member.name || member.email || "Roster member",
          email: member.email || "",
          firstName: member.firstName || "",
          lastName: member.lastName || "",
          role: "",
          gender: "",
          fundraisingUrl: "",
          taskState,
          completed,
          total: tripTasks.length,
          percent: percentComplete(tripTasks, taskState),
          rosterOnly: true,
        };
      });

    const merged = [...base, ...extras];
    return merged.filter((p) => shouldIncludeInTripWorkerPipeline(trip, p.email));
  }, [trip, tripTasks, participantTaskStates, canViewTeamDashboard]);

  const currentParticipantProgress = useMemo(() => {
    if (!activeParticipantEmail) return null;

    return (
      participantTaskProgress.find(
        (participant) => normalizeEmail(participant.email) === activeParticipantEmail
      ) || null
    );
  }, [participantTaskProgress, activeParticipantEmail]);

  const teamTabMembers = useMemo(() => {
    if (!trip) return [];

    const membersByKey = new Map();

    (trip.teamMembers || []).forEach((member, index) => {
      const email = member.email || "";
      const key = normalizeEmail(email) || `roster-${member.id || member.name || index}`;
      const hubProfile = hubProfilesByEmail.get(key);

      membersByKey.set(key, {
        key,
        id: member.id || "",
        name: member.name || "Unnamed member",
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        role: member.teamRole || member.role || "",
        teamRole: member.teamRole || member.role || "Worker",
        travelsWithTeam: member.travelsWithTeam !== false,
        tshirtSize: String(member.tshirtSize || "").trim(),
        email,
        cellPhone: String(member.cellPhone || "").trim(),
        fundraisingUrl: "",
        startDate: member.startDate || trip.startDate || "",
        endDate: member.endDate || trip.endDate || "",
        connected: !!hubProfile?.id,
        profileId: hubProfile?.id || "",
      });
    });

    (trip.participants || []).forEach((participant, index) => {
      const email = participant.email || "";
      const key = normalizeEmail(email) || `participant-${participant.id || participant.name || index}`;
      const existing = membersByKey.get(key);
      const rosterMatch = (trip.teamMembers || []).find(
        (m) => normalizeEmail(m.email) === key
      );
      const hubProfile = hubProfilesByEmail.get(key);
      const profileId = participant.id || existing?.profileId || hubProfile?.id || "";

      membersByKey.set(key, {
        key,
        id: rosterMatch?.id || existing?.id || "",
        name: participant.name || existing?.name || "Unnamed member",
        firstName: participant.firstName || existing?.firstName || "",
        lastName: participant.lastName || existing?.lastName || "",
        role: rosterMatch?.teamRole || existing?.role || participant.role || "",
        teamRole: rosterMatch?.teamRole || existing?.teamRole || participant.role || "Worker",
        travelsWithTeam: rosterMatch
          ? rosterMatch.travelsWithTeam !== false
          : existing
            ? existing.travelsWithTeam !== false
            : true,
        tshirtSize: String(rosterMatch?.tshirtSize || existing?.tshirtSize || "").trim(),
        email: participant.email || existing?.email || "",
        cellPhone: String(rosterMatch?.cellPhone || existing?.cellPhone || "").trim(),
        fundraisingUrl: participant.fundraisingUrl || existing?.fundraisingUrl || "",
        startDate: existing?.startDate || trip.startDate || "",
        endDate: existing?.endDate || trip.endDate || "",
        connected: !!profileId,
        assignmentId: participant.assignmentId || existing?.assignmentId || "",
        profileId,
      });
    });

    return Array.from(membersByKey.values()).sort((left, right) => {
      if (left.connected !== right.connected) {
        return left.connected ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });
  }, [trip, hubProfilesByEmail]);

  /** Materials tab: one line per roster row — first name and saved T-shirt size. */
  const materialsRosterTshirtLines = useMemo(() => {
    return teamTabMembers
      .filter((m) => shouldIncludeInTripWorkerPipeline(trip, m.email))
      .map((m) => {
      const firstRaw = String(m.firstName || "").trim();
      const first =
        firstRaw ||
        (String(m.name || "")
          .trim()
          .split(/\s+/)
          .filter(Boolean)[0] ||
          "Member");
      const sz = String(m.tshirtSize || "").trim();
      return `${first} - ${sz || "—"}`;
    });
  }, [teamTabMembers, trip]);

  const referenceTableRows = useMemo(() => {
    if (!trip) return [];
    const participantEmails = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );
    const rows = (trip.participants || []).map((p) => ({
      refKey: `user:${p.id}`,
      displayName: p.name || p.email || "Member",
      email: p.email || "",
    }));
    for (const m of trip.teamMembers || []) {
      const e = normalizeEmail(m.email);
      if (e && participantEmails.has(e)) continue;
      if (!m.id) continue;
      rows.push({
        refKey: `roster:${m.id}`,
        displayName: m.name || e || "Roster member",
        email: m.email || "",
      });
    }
    return rows
      .filter((row) => shouldIncludeInTripWorkerPipeline(trip, row.email))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [trip]);

  const travelFormTableRows = useMemo(() => {
    if (!trip) return [];
    const participantEmails = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );

    const rows = (trip.participants || []).map((p) => ({
      refKey: `user:${p.id}`,
      id: p.id,
      name: p.name || p.email || "Member",
      email: p.email || "",
      rosterOnly: false,
    }));

    for (const member of trip.teamMembers || []) {
      if (!member?.id) continue;
      const email = normalizeEmail(member.email);
      if (email && participantEmails.has(email)) continue;
      rows.push({
        refKey: `roster:${member.id}`,
        id: member.id,
        name: member.name || member.email || "Roster member",
        email: member.email || "",
        rosterOnly: true,
      });
    }

    return rows
      .filter((row) => shouldIncludeInTripWorkerPipeline(trip, row.email))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [trip]);

  const participantDocumentsSummary = useMemo(() => {
    if (!trip) {
      return {
        totalParticipants: 0,
        totalDocTypes: tripUserDocumentTypes.length,
        totalExpected: 0,
        uploadedCount: 0,
        missingCount: 0,
        participantsMissingAny: 0,
      };
    }
    const summaryParticipants = !canViewTeamDashboard
      ? currentParticipant
        ? [currentParticipant]
        : []
      : (() => {
          const participantEmails = new Set(
            (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
          );
          const rosterOnly = (trip.teamMembers || [])
            .filter((member) => {
              const email = normalizeEmail(member.email);
              return email && !participantEmails.has(email);
            })
            .map((member) => ({
              id: member.id ? `roster-member-${member.id}` : `roster-${normalizeEmail(member.email)}`,
              email: member.email || "",
            }));
          const merged = [...(trip.participants || []), ...rosterOnly];
          return merged.filter((p) => shouldIncludeInTripWorkerPipeline(trip, p.email));
        })();
    const totalParticipants = summaryParticipants.length;
    const totalDocTypes = tripUserDocumentTypes.length;
    let uploadedCount = 0;
    let missingCount = 0;
    let participantsMissingAny = 0;

    for (const participant of summaryParticipants) {
      const slots = participantDocumentsByUserId.get(String(participant.id)) || {};
      let participantMissing = false;
      for (const docType of tripUserDocumentTypes) {
        if (slots[docType.key]) {
          uploadedCount += 1;
        } else {
          missingCount += 1;
          participantMissing = true;
        }
      }
      if (participantMissing) participantsMissingAny += 1;
    }

    return {
      totalParticipants,
      totalDocTypes,
      totalExpected: totalParticipants * totalDocTypes,
      uploadedCount,
      missingCount,
      participantsMissingAny,
    };
  }, [trip, canViewTeamDashboard, currentParticipant, participantDocumentsByUserId, tripUserDocumentTypes]);

  const travelFormsSummary = useMemo(() => {
    const totalParticipants = travelFormTableRows.length;
    let completedCount = 0;
    let missingCount = 0;
    let passportGaps = 0;

    for (const row of travelFormTableRows) {
      const form =
        travelFormResponses.find(
          (entry) => String(travelFormRowToRefKey(entry) || "") === String(row.refKey || "")
        ) || null;
      const ma = tripIsMassachusettsDomestic;
      const hasSubmission = !!(
        form &&
        (ma
          ? [
              form.firstNamePassport,
              form.lastNamePassport,
              form.email,
              form.departureDate,
              form.returnDate,
              form.hasRealId,
            ]
          : [
              form.firstNamePassport,
              form.lastNamePassport,
              form.passportNumber,
              form.email,
              form.departureDate,
              form.returnDate,
            ]
        ).some((value) => String(value || "").trim())
      );
      if (hasSubmission) {
        completedCount += 1;
      } else {
        missingCount += 1;
      }
      if (ma) {
        if (
          hasSubmission &&
          (!String(form?.firstNamePassport || "").trim() ||
            !String(form?.lastNamePassport || "").trim() ||
            !String(form?.hasRealId || "").trim())
        ) {
          passportGaps += 1;
        }
      } else if (
        hasSubmission &&
        (!String(form?.passportNumber || "").trim() ||
          !String(form?.passportExpirationDate || "").trim())
      ) {
        passportGaps += 1;
      }
    }

    return {
      totalParticipants,
      completedCount,
      missingCount,
      passportGaps,
    };
  }, [travelFormResponses, travelFormTableRows, tripIsMassachusettsDomestic]);

  const visibleTravelFormParticipants = useMemo(() => {
    if (canViewTeamDashboard) return travelFormTableRows;
    if (!currentParticipant) return [];
    return [{ ...currentParticipant, refKey: `user:${currentParticipant.id}` }];
  }, [canViewTeamDashboard, currentParticipant, travelFormTableRows]);

  const participantTaskPct = useMemo(() => {
    const totalPossible = participantTaskProgress.reduce(
      (sum, participant) => sum + participant.total,
      0
    );
    const completed = participantTaskProgress.reduce(
      (sum, participant) => sum + participant.completed,
      0
    );

    return totalPossible ? Math.round((completed / totalPossible) * 100) : 0;
  }, [participantTaskProgress]);

  const trainingProgress = useMemo(() => {
    if (!trip) return [];

    const base = (trip.participants || []).map((participant) => {
      const trainingState =
        participantTrainingStates[normalizeEmail(participant.email)] || {};
      const completed = allTrainingModules.filter(
        (module) => !!trainingState[module.id]
      ).length;
      const total = allTrainingModules.length;

      return {
        ...participant,
        trainingState,
        completed,
        total,
        percent: total ? Math.round((completed / total) * 100) : 0,
      };
    });

    if (!canViewTeamDashboard) {
      return base;
    }

    const participantEmails = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );
    const extras = (trip.teamMembers || [])
      .filter((m) => {
        const e = normalizeEmail(m.email);
        return e && !participantEmails.has(e);
      })
      .map((member) => {
        const trainingState =
          participantTrainingStates[normalizeEmail(member.email)] || {};
        const completed = allTrainingModules.filter(
          (module) => !!trainingState[module.id]
        ).length;
        const total = allTrainingModules.length;
        return {
          id: member.id ? `roster-member-${member.id}` : `roster-${normalizeEmail(member.email)}`,
          assignmentId: "",
          name: member.name || member.email || "Roster member",
          email: member.email || "",
          firstName: member.firstName || "",
          lastName: member.lastName || "",
          role: "",
          gender: "",
          fundraisingUrl: "",
          trainingState,
          completed,
          total,
          percent: total ? Math.round((completed / total) * 100) : 0,
          rosterOnly: true,
        };
      });

    const merged = [...base, ...extras];
    return merged.filter((p) => shouldIncludeInTripWorkerPipeline(trip, p.email));
  }, [trip, participantTrainingStates, allTrainingModules, canViewTeamDashboard]);

  const currentTrainingProgress = useMemo(() => {
    if (!activeParticipantEmail) return null;

    return (
      trainingProgress.find(
        (participant) =>
normalizeEmail(participant.email) === activeParticipantEmail
      ) || null
    );
  }, [trainingProgress, activeParticipantEmail]);

  const trainingPct = useMemo(() => {
    const totalPossible = trainingProgress.reduce(
      (sum, participant) => sum + participant.total,
      0
    );
    const completed = trainingProgress.reduce(
      (sum, participant) => sum + participant.completed,
      0
    );

    return totalPossible ? Math.round((completed / totalPossible) * 100) : 0;
  }, [trainingProgress]);

  const visibleFundraisingParticipants = useMemo(() => {
    if (!trip) return [];

    if (canViewFundraisingTeamDashboard) {
      const participantEmails = new Set(
        (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
      );
      const rosterByEmail = new Map(
        (trip.teamMembers || []).filter((m) => m?.email).map((m) => [normalizeEmail(m.email), m])
      );
      const mergedParticipants = (trip.participants || []).map((p) => {
        const m = rosterByEmail.get(normalizeEmail(p.email));
        const goalFromRoster =
          m?.fundraisingGoalAmount != null && m.fundraisingGoalAmount !== ""
            ? Number(m.fundraisingGoalAmount)
            : undefined;
        return {
          ...p,
          tripTeamMemberId: p.tripTeamMemberId || m?.id || "",
          fundraisingGoalAmount:
            p.fundraisingGoalAmount != null &&
            p.fundraisingGoalAmount !== "" &&
            Number.isFinite(Number(p.fundraisingGoalAmount))
              ? Number(p.fundraisingGoalAmount)
              : goalFromRoster,
        };
      });
      const rosterOnly = (trip.teamMembers || [])
        .filter((member) => {
          const email = normalizeEmail(member.email);
          return email && !participantEmails.has(email);
        })
        .map((member) => ({
          id: member.id ? `roster-member-${member.id}` : `roster-${normalizeEmail(member.email)}`,
          tripTeamMemberId: member.id || "",
          name: member.name || member.email || "Roster member",
          email: member.email || "",
          fundraisingUrl: member.fundraisingUrl || "",
          fundraisingGoalAmount:
            member.fundraisingGoalAmount != null ? Number(member.fundraisingGoalAmount) : undefined,
          rosterOnly: true,
        }));
      const merged = [...mergedParticipants, ...rosterOnly];
      /** No fundraising tile for roster rows marked Leader + not traveling with team. */
      return merged.filter((p) => shouldIncludeInTripWorkerPipeline(trip, p.email));
    }

    if (!currentParticipant) {
      return [];
    }

    const rosterGoalByEmail = new Map(
      (trip.teamMembers || [])
        .filter((m) => m?.email)
        .map((m) => [normalizeEmail(m.email), m.fundraisingGoalAmount])
    );

    return (trip.participants || [])
      .filter((participant) => String(participant.id) === String(currentParticipant?.id || ""))
      .map((participant) => {
        const rosterGoalRaw = rosterGoalByEmail.get(normalizeEmail(participant.email));
        const participantGoal =
          participant.fundraisingGoalAmount != null &&
          participant.fundraisingGoalAmount !== "" &&
          Number.isFinite(Number(participant.fundraisingGoalAmount))
            ? Number(participant.fundraisingGoalAmount)
            : null;
        const rosterGoal =
          rosterGoalRaw != null &&
          rosterGoalRaw !== "" &&
          Number.isFinite(Number(rosterGoalRaw))
            ? Number(rosterGoalRaw)
            : null;
        return {
          ...participant,
          fundraisingGoalAmount: participantGoal != null ? participantGoal : rosterGoal,
        };
      })
      .filter((p) => shouldIncludeInTripWorkerPipeline(trip, p.email));
  }, [trip, canViewFundraisingTeamDashboard, currentParticipant]);

  const workerDocumentParticipants = useMemo(() => {
    if (!trip) return [];
    if (!canViewTeamDashboard) {
      return currentParticipant ? [currentParticipant] : [];
    }
    const participantEmails = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );
    const rosterOnly = (trip.teamMembers || [])
      .filter((member) => {
        const email = normalizeEmail(member.email);
        return email && !participantEmails.has(email);
      })
      .map((member) => ({
        id: member.id ? `roster-member-${member.id}` : `roster-${normalizeEmail(member.email)}`,
        profileId: "",
        name: member.name || member.email || "Roster member",
        email: member.email || "",
        rosterOnly: true,
      }));
    const merged = [...(trip.participants || []), ...rosterOnly];
    return merged.filter((p) => shouldIncludeInTripWorkerPipeline(trip, p.email));
  }, [trip, canViewTeamDashboard, currentParticipant]);

  const tripDocumentWorkerOptions = useMemo(
    () =>
      workerDocumentParticipants
        .map((participant) => String(participant?.name || participant?.email || "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    [workerDocumentParticipants]
  );

  const canViewMaterialsTab =
    !isPreviewingParticipant &&
    (staffViewAllParticipants || effectiveIsLeader || !!currentParticipant);

  const referenceReceivedProgress = useMemo(() => {
    if (!trip) {
      return {
        label: "References Received",
        percent: 0,
        completed: 0,
        total: 0,
        showOnOverview: false,
      };
    }

    const total = referenceTableRows.length;
    const completed = referenceTableRows.filter(
      (row) => !!getReferenceStatus(row.refKey).received
    ).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    if (canViewTeamDashboard) {
      return {
        label: "References Received",
        percent,
        completed,
        total,
        showOnOverview: true,
      };
    }

    const refKeyForCurrent = (() => {
      if (!currentParticipant?.id) return "";
      const id = String(currentParticipant.id);
      if (id.startsWith("roster-member-")) return `roster:${id.slice("roster-member-".length)}`;
      return `user:${id}`;
    })();

    const mineReceived =
      refKeyForCurrent && !!getReferenceStatus(refKeyForCurrent).received;

    return {
      label: "My reference",
      percent: mineReceived ? 100 : 0,
      completed: mineReceived ? 1 : 0,
      total: 1,
      showOnOverview: mineReceived,
    };
  }, [trip, canViewTeamDashboard, currentParticipant, referenceEmails, referenceTableRows]);

  const overviewTaskLabel = canViewTeamDashboard ? "Worker Tasks" : "My Tasks";
  const overviewTaskPct = canViewTeamDashboard
    ? participantTaskPct
    : currentParticipantProgress?.percent || 0;
  const overviewTrainingLabel = canViewTeamDashboard ? "Training" : "My Training";
  const overviewTrainingPct = canViewTeamDashboard
    ? trainingPct
    : currentTrainingProgress?.percent || 0;
  const currentParticipantFundraisingGoalAmount =
    (() => {
      const participantGoalRaw = currentParticipant?.fundraisingGoalAmount;
      if (participantGoalRaw != null && Number.isFinite(Number(participantGoalRaw))) {
        return Number(participantGoalRaw);
      }
      const rosterGoalRaw = sessionTripRosterRow?.fundraisingGoalAmount;
      if (rosterGoalRaw != null && Number.isFinite(Number(rosterGoalRaw))) {
        return Number(rosterGoalRaw);
      }
      const workerCardGoalRaw = visibleFundraisingParticipants?.[0]?.fundraisingGoalAmount;
      if (workerCardGoalRaw != null && Number.isFinite(Number(workerCardGoalRaw))) {
        return Number(workerCardGoalRaw);
      }
      return 0;
    })();
  const isTeamFundraisingMode = trip?.fundraisingMode === "team";
  const tripFundraisingGoal = Number(trip?.fundraisingGoalAmount || 0);
  const summedParticipantFundraisingGoal = useMemo(
    () =>
      (visibleFundraisingParticipants || []).reduce((sum, participant) => {
        const goal = Number(participant?.fundraisingGoalAmount);
        if (!Number.isFinite(goal) || goal <= 0) return sum;
        return sum + goal;
      }, 0),
    [visibleFundraisingParticipants]
  );
  const workerSpecificFundraisingGoalAmount =
    currentParticipantFundraisingGoalAmount > 0
      ? currentParticipantFundraisingGoalAmount
      : tripFundraisingGoal;
  const staffTeamFundraisingGoalAmount =
    isTeamFundraisingMode
      ? tripFundraisingGoal
      : summedParticipantFundraisingGoal > 0
        ? summedParticipantFundraisingGoal
        : tripFundraisingGoal;
  const fundraisingGoalAmount =
    !canViewTeamDashboard ? workerSpecificFundraisingGoalAmount : staffTeamFundraisingGoalAmount;
  const fundraisingWorkerCount = useMemo(() => {
    if (!trip) return 1;
    const roster = trip.teamMembers || [];
    const byEmail = new Map(roster.map((m) => [normalizeEmail(m.email), m]));
    const seen = new Set();
    let count = 0;
    for (const p of trip.participants || []) {
      const e = normalizeEmail(p.email);
      if (!e || seen.has(e)) continue;
      seen.add(e);
      const tm = byEmail.get(e);
      if (
        tm &&
        String(tm.teamRole || "").trim().toLowerCase() === "leader" &&
        tm.travelsWithTeam === false
      ) {
        continue;
      }
      count += 1;
    }
    for (const m of roster) {
      const e = normalizeEmail(m.email);
      if (!e || seen.has(e)) continue;
      seen.add(e);
      if (
        String(m.teamRole || "").trim().toLowerCase() === "leader" &&
        m.travelsWithTeam === false
      ) {
        continue;
      }
      count += 1;
    }
    return Math.max(count, 1);
  }, [trip]);
  const countForDeadlines = !canViewTeamDashboard
    ? 1
    : isTeamFundraisingMode
      ? 1
      : fundraisingWorkerCount;
  // Business rule: 90-day milestone is always $2,000 per applicable person.
  const fundraisingFirstDeadlineAmount = 2000 * countForDeadlines;
  const fundraisingSecondDeadlineTotalAmount = Math.max(
    (fundraisingGoalAmount || 0) - fundraisingFirstDeadlineAmount,
    0
  );
  const fundraisingSecondDeadlineAmount = fundraisingSecondDeadlineTotalAmount;
  const fundraisingFirstDeadlineDate = subtractDays(trip?.startDate, 90);
  const fundraisingSecondDeadlineDate = subtractDays(trip?.startDate, 30);
  const savedFundraisingLinksCount = useMemo(() => {
    if (!trip) return 0;
    const participantEmails = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );
    const participantWithUrl = (trip.participants || []).filter((p) => !!p.fundraisingUrl).length;
    const rosterWithUrl = (trip.teamMembers || []).filter((m) => {
      const e = normalizeEmail(m.email);
      return e && !participantEmails.has(e) && String(m.fundraisingUrl || "").trim();
    }).length;
    return participantWithUrl + rosterWithUrl;
  }, [trip]);
  const nextFundraisingDeadline = fundraisingFirstDeadlineDate
    ? {
        amount: fundraisingFirstDeadlineAmount,
        date: fundraisingFirstDeadlineDate,
        label: "90-day deadline",
      }
    : fundraisingSecondDeadlineDate
      ? {
          amount: fundraisingSecondDeadlineAmount,
          date: fundraisingSecondDeadlineDate,
          label: "30-day deadline",
        }
      : null;
  const overviewFundraisingLabel =
    isTeamFundraisingMode || trip?.teamFundraisingUrl
      ? "Team Fundraising"
      : canViewTeamDashboard
        ? "Fundraising Links"
        : "My Fundraising";
  const overviewFundraisingValue = fundraisingGoalAmount
    ? formatMoney(fundraisingGoalAmount)
    : isTeamFundraisingMode || trip?.teamFundraisingUrl
      ? "Page Ready"
      : canViewTeamDashboard
        ? `${savedFundraisingLinksCount} Links`
        : currentParticipant?.fundraisingUrl
          ? "Page Ready"
          : "No Link";
  const overviewFundraisingDetail = fundraisingGoalAmount && nextFundraisingDeadline
    ? `${nextFundraisingDeadline.label}: ${formatMoney(
        nextFundraisingDeadline.amount
      )} by ${formatDeadlineDate(nextFundraisingDeadline.date)}.`
    : isTeamFundraisingMode || trip?.teamFundraisingUrl
      ? trip?.teamFundraisingUrl
        ? "Shared Neon page is ready for the full team."
        : "Team mode — add the shared Neon link on the Fundraising tab."
      : canViewTeamDashboard
        ? `${savedFundraisingLinksCount} worker links saved.`
        : currentParticipant?.fundraisingUrl
        ? "Your personal Neon page is available."
        : "No personal Neon page added yet.";
  const workerOverviewFundraisingUrl = !canViewTeamDashboard
    ? String(
        (isTeamFundraisingMode || trip?.teamFundraisingUrl
          ? trip?.teamFundraisingUrl
          : currentParticipant?.fundraisingUrl) || ""
      ).trim()
    : "";
  const smartsheetBudgetOpenUrl = useMemo(() => {
    const b = visibleDocs.find((d) => d.resourceKey === "smartsheet-budget");
    const j = visibleDocs.find((d) => d.resourceKey === "project-record-journal");
    const link = String(b?.link || j?.link || "").trim();
    const pdf = String(b?.pdfUrl || j?.pdfUrl || "").trim();
    return link || pdf || "";
  }, [visibleDocs]);
  const flightsOpenUrl = useMemo(() => {
    for (const d of visibleDocs || []) {
      if (String(d.resourceKey || "") === "flights" && docHasAnyContent(d)) {
        const u = preferredTripResourceOpenUrl(d);
        if (u) return u;
      }
    }
    const opt = (visibleDocs || []).find(
      (d) =>
        !String(d.resourceKey || "").trim() &&
        isTripDocumentFlightsCategory(d) &&
        docHasAnyContent(d)
    );
    return opt ? preferredTripResourceOpenUrl(opt) : "";
  }, [visibleDocs]);
  const siteInfoDoc = docs.find((doc) => doc.resourceKey === "site-info-link");
  const visibleSiteInfoDoc = visibleDocs.find((doc) => doc.resourceKey === "site-info-link");
  const autoSiteInfoLink = useMemo(() => {
    if (!trip?.location?.trim()) return "";
    let primary = "";
    if (canManageTrips && staffViewAllParticipants) {
      primary = resolveTripSiteLogisticsUrl(trip.location, siteBudgetNotesList) || "";
    } else {
      primary =
        resolveSiteLogisticsUrl(resolveCanonicalSiteLabelForTrip(trip.location, [])) || "";
    }
    if (primary) return primary;
    return String(tripSiteLogisticsRpcUrl || "").trim() || "";
  }, [
    trip?.location,
    siteBudgetNotesList,
    canManageTrips,
    staffViewAllParticipants,
    tripSiteLogisticsRpcUrl,
  ]);
  const effectiveSiteInfoDoc = useMemo(() => {
    const rawSaved = (docs || []).find((d) => String(d.resourceKey) === "site-info-link");
    if (rawSaved && !rawSaved.isAutoGenerated && isPersistedTripResourceDismissedEmpty(rawSaved)) {
      return null;
    }
    const saved = visibleSiteInfoDoc;
    const savedHasUrl = !!(
      saved &&
      (String(saved.link || "").trim() || String(saved.pdfUrl || "").trim())
    );
    if (savedHasUrl) return saved;
    if (autoSiteInfoLink) {
      return {
        id: "auto-site-info-link",
        title: "Site Logistics",
        link: autoSiteInfoLink,
        pdfUrl: "",
        createdAt: "",
        updatedAt: "",
        isAutoGenerated: true,
        visibleToParticipants: true,
      };
    }
    return saved || null;
  }, [docs, visibleSiteInfoDoc, autoSiteInfoLink]);
  const effectiveHousingLinkDoc = useMemo(() => {
    const saved = (docs || []).find((d) => d.resourceKey === "housing-accommodation-link");
    const budgetRowLink = String(tripBudgetRow?.housingLink || "").trim();
    const budgetRowPdf = String(tripBudgetRow?.housingPdfUrl || "").trim();
    const rawLink = String(tripHousingLinkUrl || "").trim() || budgetRowLink;
    const rawPdf = String(tripHousingPdfUrl || "").trim() || budgetRowPdf;

    // If housing was previously dismissed as an empty default card, we only want to hide it
    // when the budget has no housing link/PDF. When a user saves housing from Trip Documents,
    // we write into trip_budgets; we must not let a stale trip_resources dismissal keep the card hidden.
    const isSavedDismissedEmpty =
      saved && !saved.isAutoGenerated && isPersistedTripResourceDismissedEmpty(saved);
    if (isSavedDismissedEmpty && !rawLink && !rawPdf) return null;

    const budgetLink = rawLink
      ? /^https?:\/\//i.test(rawLink)
        ? rawLink
        : `https://${rawLink}`
      : "";
    const budgetPdf = rawPdf;

    const savedLinkRaw = saved ? String(saved.link || "").trim() : "";
    const savedPdfRaw = saved ? String(saved.pdfUrl || "").trim() : "";
    const savedLinkNorm = savedLinkRaw
      ? /^https?:\/\//i.test(savedLinkRaw)
        ? savedLinkRaw
        : `https://${savedLinkRaw}`
      : "";

    // Trip Documents housing "Edit" writes trip_budgets; a legacy trip_resources row must not
    // hide those URLs. Prefer RPC (viewer) then direct budget row, then saved trip_resources.
    const link = rawLink ? budgetLink : savedLinkNorm;
    const pdfUrl = rawPdf ? budgetPdf : savedPdfRaw;

    if (!link && !pdfUrl) return null;

    if (saved && !saved.isAutoGenerated) {
      return {
        ...saved,
        link,
        pdfUrl,
      };
    }

    return {
      id: "auto-housing-accommodation-link",
      title: "Team housing",
      link,
      pdfUrl,
      createdAt: "",
      updatedAt: "",
      isAutoGenerated: true,
      visibleToParticipants: true,
    };
  }, [docs, tripHousingLinkUrl, tripHousingPdfUrl, tripBudgetRow?.housingLink, tripBudgetRow?.housingPdfUrl]);
  const tripDocumentCategorySections = useMemo(() => {
    const buckets = Object.fromEntries(DOCUMENT_CATEGORY_OPTIONS.map((c) => [c, []]));

    const pushEntry = (category, entry) => {
      const key = DOCUMENT_CATEGORY_OPTIONS.includes(category) ? category : "Other";
      buckets[key].push(entry);
    };

    const byTimeDesc = (a, b) => {
      const ta = Date.parse(a.doc?.updatedAt || a.doc?.createdAt || 0) || 0;
      const tb = Date.parse(b.doc?.updatedAt || b.doc?.createdAt || 0) || 0;
      return tb - ta;
    };
    const compareTripResourceDocs = (left, right) => {
      const leftWorker = getTripDocumentWorkerLabel(left.doc);
      const rightWorker = getTripDocumentWorkerLabel(right.doc);
      const leftHasWorker = !!leftWorker;
      const rightHasWorker = !!rightWorker;

      if (leftHasWorker !== rightHasWorker) return leftHasWorker ? -1 : 1;

      if (leftHasWorker && rightHasWorker) {
        const byWorker = leftWorker.localeCompare(rightWorker, undefined, { sensitivity: "base" });
        if (byWorker !== 0) return byWorker;
      }

      const byTitle = String(left.doc?.title || "").localeCompare(String(right.doc?.title || ""), undefined, {
        sensitivity: "base",
      });
      if (byTitle !== 0) return byTitle;

      return byTimeDesc(left, right);
    };

    const budgetSlot = requiredDocumentSlots.find((s) => s.key === "smartsheet-budget");
    const budgetDoc = budgetSlot?.resource;
    if (budgetSlot && budgetDoc && docHasAnyContent(budgetDoc)) {
      pushEntry("Budget", { kind: "slot", slot: budgetSlot, doc: budgetDoc });
    }

    if (
      effectiveSiteInfoDoc &&
      (String(effectiveSiteInfoDoc.link || "").trim() ||
        String(effectiveSiteInfoDoc.pdfUrl || "").trim())
    ) {
      pushEntry("Site", { kind: "site", doc: effectiveSiteInfoDoc });
    }

    const housingSlotDef = requiredDocumentSlots.find((s) => s.key === "housing-accommodation-link");
    if (
      housingSlotDef &&
      effectiveHousingLinkDoc &&
      docHasAnyContent(effectiveHousingLinkDoc)
    ) {
      pushEntry("Team", {
        kind: "slot",
        slot: { ...housingSlotDef, resource: effectiveHousingLinkDoc },
        doc: effectiveHousingLinkDoc,
      });
    }

    for (const d of visibleDocs) {
      const rk = String(d.resourceKey || "").trim();
      if (!docHasAnyContent(d)) continue;
      if (rk === "project-record-journal") continue;
      if (rk === "smartsheet-budget") continue;
      if (rk === "site-info-link") continue;
      if (rk === "housing-accommodation-link") continue;
      pushEntry(categoryForTripResourceDoc(d), { kind: "doc", doc: d });
    }

    for (const c of DOCUMENT_CATEGORY_OPTIONS) {
      buckets[c].sort((a, b) => {
        const pa = a.kind === "doc" ? 1 : 0;
        const pb = b.kind === "doc" ? 1 : 0;
        if (pa !== pb) return pa - pb;
        if (a.kind === "doc" && b.kind === "doc") return compareTripResourceDocs(a, b);
        return 0;
      });
    }

    return DOCUMENT_CATEGORY_OPTIONS.map((category) => ({
      category,
      entries: buckets[category],
    })).filter((section) => section.entries.length > 0);
  }, [requiredDocumentSlots, effectiveSiteInfoDoc, effectiveHousingLinkDoc, visibleDocs]);

  const hasDismissedDefaultTripDocumentSlots = useMemo(() => {
    const keys = new Set(REQUIRED_TRIP_DOCUMENT_SLOTS.map((s) => s.key));
    return (docs || []).some(
      (d) => keys.has(String(d.resourceKey || "")) && isPersistedTripResourceDismissedEmpty(d)
    );
  }, [docs]);
  const quickLinks = useMemo(() => {
    const links = [
      {
        label: "On-Demand Training",
        url: trainingAccessUrl,
        ready: true,
      },
    ];

    if (trip?.teamFundraisingUrl) {
      links.push({
        label: "Team Fundraising",
        url: trip.teamFundraisingUrl,
        ready: true,
      });
    }

    links.push({
      label: "Budget",
      url: smartsheetBudgetOpenUrl,
      ready: !!smartsheetBudgetOpenUrl,
    });

    links.push({
      label: "Flights",
      url: flightsOpenUrl,
      ready: !!flightsOpenUrl,
    });

    links.push({
      label: "Site Logistics",
      url: preferredTripResourceOpenUrl(effectiveSiteInfoDoc),
      ready: !!preferredTripResourceOpenUrl(effectiveSiteInfoDoc),
    });

    links.push({
      label: "Team housing",
      url: preferredTripResourceOpenUrl(effectiveHousingLinkDoc),
      ready: !!preferredTripResourceOpenUrl(effectiveHousingLinkDoc),
    });

    return links;
  }, [
    currentParticipant?.fundraisingUrl,
    effectiveHousingLinkDoc?.link,
    effectiveHousingLinkDoc?.pdfUrl,
    effectiveSiteInfoDoc?.link,
    effectiveSiteInfoDoc?.pdfUrl,
    flightsOpenUrl,
    smartsheetBudgetOpenUrl,
    trainingAccessUrl,
    trip?.fundraisingMode,
    trip?.teamFundraisingUrl,
  ]);
  const visibleTaskParticipants = canViewTeamDashboard
    ? participantTaskProgress
    : currentParticipantProgress
      ? [currentParticipantProgress]
      : [];
  const groupedWorkerTasks = useMemo(
    () => groupWorkerTasks(tripTasks),
    [tripTasks]
  );
  const visibleTrainingParticipants = canViewTeamDashboard
    ? trainingProgress
    : currentTrainingProgress
      ? [currentTrainingProgress]
      : [];
  const overviewUpcomingTasks = useMemo(() => {
    if (!trip) return [];

    if (staffViewAllParticipants) {
      const effectiveStaffDue = (task) => task.dueDate || computeStaffTaskDueDate(task, trip);
      return (editableStaffTasks || [])
        .filter(
          (task) =>
            task.progress !== "Complete" &&
            isTaskAssignedToUser(task.assignedTo, session?.name || session?.email || "")
        )
        .sort((left, right) => {
          const leftDate =
            parseDateSafe(effectiveStaffDue(left))?.getTime() || Number.MAX_SAFE_INTEGER;
          const rightDate =
            parseDateSafe(effectiveStaffDue(right))?.getTime() || Number.MAX_SAFE_INTEGER;
          return leftDate - rightDate;
        })
        .slice(0, 5)
        .map((task) => {
          const st = findStaffTaskTemplate(task);
          return {
            id: task.id,
            title: task.taskName,
            dueDate: effectiveStaffDue(task) || "",
            detail: task.workArea,
            destinationTab: "Staff Tasks",
            destinationId: task.id,
            link: st?.link || null,
            details: task.notes || st?.details || null,
          };
        });
    }

    const taskState = currentParticipantProgress?.taskState || {};
    const hideSectionLabelTitles = [
      "Proofread my tickets",
    ];
    const upcomingTasks = tripTasks
      .filter((task) => !isWorkerTaskCompletedInState(task, taskState))
      .map((task) => {
        const wt = findWorkerTaskTemplate(task);
        const section = getWorkerTaskSection(task);
        const isChecklistTask = task.id === "worker-task-checklist" || task.title === "Received and has reviewed Project Management Checklist";
        const isTicketsTask = task.id === "worker-task-tickets" || task.title === "Proofread my tickets";
        const isMaterialsPageTask = wt?.id === "worker-task-materials-page";
        const isDocumentsTask = isWorkerPassportOrVisaUploadTask(task);
        const documentsTabUrl = trip?.id
          ? `/trips/${encodeURIComponent(trip.id)}?tab=documents`
          : null;
        const openTripDocumentsTab = isTicketsTask;
        const link = isChecklistTask
          ? (preferredTripResourceOpenUrl(effectiveSiteInfoDoc) || wt?.link)
          : isTicketsTask
            ? null
            : isDocumentsTask
              ? documentsTabUrl
              : (wt?.link || null);
        return {
          id: task.id,
          title: getWorkerTaskDisplayTitle(task, trip?.location),
          dueDate: task.due,
          detail: hideSectionLabelTitles.includes(task.title) ? "" : section,
          destinationTab: isMaterialsPageTask
            ? "Materials"
            : openTripDocumentsTab
              ? "Trip Documents"
              : "Tasks",
          destinationId: task.id,
          link: link || null,
          openTripDocumentsTab,
          /** Same trip My Documents / Worker Docs tab — open in-app instead of new window */
          openDocumentsTab: !!(isDocumentsTask && link && documentsTabUrl && link === documentsTabUrl),
          details: task.description || wt?.details || null,
        };
      });
    const currentTrainingState = currentTrainingProgress?.trainingState || {};
    const upcomingTraining = allTrainingModules
      .filter((module) => !currentTrainingState[module.id])
      .map((module) => ({
        id: `training-${module.id}`,
        title: module.title,
        dueDate: getTrainingModuleDeadline(module.title, {
          startDate: trip?.startDate,
          endDate: trip?.endDate,
          trainingTimelineType: trip?.trainingTimelineType,
        }),
        detail: "Training",
        destinationTab: "Training",
        destinationId: module.id,
      }));

    return [...upcomingTasks, ...upcomingTraining]
      .sort((left, right) => {
        const leftDate = parseDateSafe(left.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
        const rightDate = parseDateSafe(right.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
        return leftDate - rightDate;
      })
      .slice(0, 5);
  }, [
    allTrainingModules,
    staffViewAllParticipants,
    currentParticipantProgress?.taskState,
    currentTrainingProgress?.trainingState,
    editableStaffTasks,
    effectiveSiteInfoDoc,
    flightsOpenUrl,
    session?.email,
    session?.name,
    trip,
    tripTasks,
  ]);

  const { upcomingMeetings, pastMeetings } = useMemo(() => {
    const now = Date.now();
    const upcoming = [];
    const past = [];
    const trainingMeetings = buildTrainingSessionMeetingsFromState(
      currentTrainingProgress?.trainingState,
      allTrainingModules
    );
    const combined = [...tripMeetings, ...trainingMeetings];
    for (const m of combined) {
      const t = new Date(m.scheduledAt).getTime();
      if (Number.isNaN(t)) continue;
      if (t >= now) upcoming.push(m);
      else past.push(m);
    }
    upcoming.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    past.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    return { upcomingMeetings: upcoming, pastMeetings: past };
  }, [tripMeetings, currentTrainingProgress?.trainingState, allTrainingModules]);

  const participantDocumentsTabLabel = canViewTeamDashboard ? "Worker Docs" : "My Documents";
  const tripDocumentsTabLabel = "Trip Documents";
  const tripTabTravelSafety = "Travel & Safety";

  const workerTabList = [
    "Overview",
    "Team",
    tripTabTravelSafety,
    "Fundraising",
    "Training",
    "Tasks",
    "Materials",
    "Travel Form",
    tripDocumentsTabLabel,
    participantDocumentsTabLabel,
  ];
  const managerExpandedTabs = [
    "Overview",
    "Team",
    tripTabTravelSafety,
    "Fundraising",
    "Training",
    "Tasks",
    "Materials",
    tripDocumentsTabLabel,
    participantDocumentsTabLabel,
    "Travel Form",
    "Staff Tasks",
  ];
  const leaderExpandedTabs = useMemo(
    () => [
      "Overview",
      "Team",
      tripTabTravelSafety,
      "Fundraising",
      "Training",
      "Tasks",
      "Materials",
      tripDocumentsTabLabel,
      participantDocumentsTabLabel,
      "Travel Form",
    ],
    [tripTabTravelSafety, tripDocumentsTabLabel, participantDocumentsTabLabel]
  );
  const tabs = (() => {
    if (isPreviewingParticipant) return workerTabList;
    if (canManageTrips && !isStaffPreviewingLeader) return managerExpandedTabs;
    if (effectiveIsLeader) return leaderExpandedTabs;
    return workerTabList;
  })();

  /** Participants plus roster-only team members (same headcount as worker docs / fundraising list). */
  const materialsRosterHeadcount = workerDocumentParticipants.length;

  /** Parsed integer from materials draft, or null if not set (empty / invalid). */
  const materialsBudgetWorkerCount = useMemo(() => {
    if (!materialsDraft) return null;
    const nw = materialsDraft.numWorkers;
    if (nw === "" || nw === null || nw === undefined) return null;
    const num = typeof nw === "number" ? nw : Number.parseInt(String(nw), 10);
    return Number.isFinite(num) ? num : null;
  }, [materialsDraft]);

  /** Show merged roster when budget row has no # of workers saved yet. */
  const materialsWorkersDisplayCount =
    materialsBudgetWorkerCount !== null ? materialsBudgetWorkerCount : materialsRosterHeadcount;

  const materialsWorkerCountDelta =
    materialsBudgetWorkerCount !== null ? materialsBudgetWorkerCount - materialsRosterHeadcount : null;

  const materialsGlanceRow = {
    display: "grid",
    gridTemplateColumns: "minmax(124px, 140px) 1fr",
    gap: "6px 16px",
    alignItems: "start",
    padding: "10px 0",
    borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
  };
  const materialsGlanceLabel = {
    fontWeight: 600,
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: "0.045em",
    fontSize: 11,
    lineHeight: 1.35,
  };
  const materialsGlanceValue = {
    fontSize: 13,
    lineHeight: 1.55,
    color: "var(--text)",
    fontWeight: 500,
  };
  const materialsGlanceMuted = {
    fontSize: 12,
    lineHeight: 1.5,
    color: "var(--muted)",
    fontWeight: 400,
  };
  const materialsGlanceRowSending = {
    ...materialsGlanceRow,
    display: "grid",
    gridTemplateColumns: "minmax(124px, 140px) 1fr",
    gap: "6px 16px",
    alignItems: "start",
    padding: "16px 14px 14px",
    marginTop: 6,
    marginLeft: -2,
    marginRight: -2,
    borderRadius: 12,
    borderTop: "none",
    borderBottom: "none",
    background:
      "linear-gradient(135deg, rgba(124, 58, 237, 0.06), rgba(37, 99, 235, 0.04), rgba(248, 250, 252, 0.9))",
    border: "1px solid rgba(124, 58, 237, 0.14)",
    boxShadow: "0 1px 0 rgba(255, 255, 255, 0.85) inset",
  };
  const materialsMetricCard = {
    minHeight: 104,
    borderRadius: 14,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    background: "rgba(255, 255, 255, 0.8)",
    padding: "14px 16px",
    boxShadow: "0 8px 26px rgba(15, 23, 42, 0.05)",
    display: "grid",
    alignContent: "start",
    gap: 8,
  };
  const materialsMetricLabel = {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--muted)",
  };
  const materialsMetricValue = {
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 900,
    color: "var(--text)",
  };
  const materialsPanelBase = {
    borderRadius: 14,
    padding: "4px 14px 2px",
    boxShadow: "0 1px 0 rgba(255, 255, 255, 0.75) inset",
    minWidth: 0,
    height: "100%",
  };

  const staffSiteWorkbookPlan = useMemo(() => {
    if (!trip?.location?.trim()) {
      return { noLocation: true };
    }
    const note = resolveSiteBudgetNoteForTripLocation(trip.location, siteBudgetNotesList);
    const hasHousingNote = Boolean(note?.notes?.trim());
    if (!note?.workbookNotes?.trim()) {
      return { noLocation: false, empty: true, note, hasHousingNote };
    }
    const items = parseAnyWorkbookInventoryString(note.workbookNotes);
    const summary = summarizeWorkbookItemsForShipping(items);
    return { noLocation: false, empty: false, note, hasHousingNote, ...summary };
  }, [trip?.location, siteBudgetNotesList]);

  const materialsTeamWorkbookGlance = useMemo(() => {
    if (!materialsDraft) return null;
    const raw = String(materialsDraft.workbooks || "").trim();
    if (!raw) {
      return { kind: "empty" };
    }
    const items = parseAnyWorkbookInventoryString(raw);
    const summary = summarizeWorkbookItemsForShipping(items);
    if (summary.positiveLines.length > 0) {
      return { kind: "parsed", raw, ...summary };
    }
    return { kind: "raw", raw };
  }, [materialsDraft]);

  const materialsWorkbookTargetCopies = staffSiteWorkbookPlan?.empty || staffSiteWorkbookPlan?.noLocation
    ? 0
    : staffSiteWorkbookPlan?.totalCopies || 0;

  const materialsWorkbookSentCopies =
    materialsTeamWorkbookGlance?.kind === "parsed" ? materialsTeamWorkbookGlance.totalCopies || 0 : null;

  const materialsWorkbookRemainingCopies =
    materialsWorkbookSentCopies !== null
      ? Math.max(materialsWorkbookTargetCopies - materialsWorkbookSentCopies, 0)
      : null;

  const materialsTeamVisibleSource = staffViewAllParticipants ? materialsDraft : teamLogisticsDraft;
  const materialsShippingState = (() => {
    const src = materialsTeamVisibleSource;
    const hasAddress = !!String(src?.materialsShipAddress || "").trim();
    const hasTracking = !!String(src?.materialsTrackingNumber || "").trim();
    if (hasTracking) return "Shipped";
    if (hasAddress) return "Address ready";
    return "Needs setup";
  })();

  async function handleSaveStaffTeamVisibleMaterials() {
    if (!trip?.id || !materialsDraft) return false;
    try {
      setTeamLogisticsSaveStatus("Saving...");
      await saveTripBudget(trip.id, {
        teamAccountant: materialsDraft.teamAccountant ?? "",
        teamRecorder: materialsDraft.teamRecorder ?? "",
        materialsShipAddress: materialsDraft.materialsShipAddress ?? "",
        materialsShipAddressNote: materialsDraft.materialsShipAddressNote ?? "",
        materialsTrackingNumber: materialsDraft.materialsTrackingNumber ?? "",
        materialsNotesForTeam: materialsDraft.materialsNotesForTeam ?? "",
      });
      materialsBudgetLoadGenRef.current += 1;
      const next = await getTripBudget(trip.id);
      setTripBudgetRow(next);
      if (next) {
        setMaterialsDraft((d) =>
          d
            ? {
                ...d,
                teamAccountant: next.teamAccountant || "",
                teamRecorder: next.teamRecorder || "",
                materialsShipAddress: next.materialsShipAddress ?? "",
                materialsShipAddressNote: next.materialsShipAddressNote ?? "",
                materialsTrackingNumber: next.materialsTrackingNumber ?? "",
                materialsNotesForTeam: next.materialsNotesForTeam ?? "",
                materialsPackingChecklist: parseMaterialsPackingChecklist(next.materialsPackingChecklist),
              }
            : d
        );
      }
      setTeamLogisticsSaveStatus("Saved.");
      showToast("Team logistics saved.", "success");
      return true;
    } catch (e) {
      const msg = e.message || "Error saving.";
      setTeamLogisticsSaveStatus(msg);
      showToast(msg, "error");
      return false;
    }
  }

  async function handleSaveTeamLogisticsForTeamMember() {
    if (!trip?.id || !teamLogisticsDraft) return;
    try {
      setTeamLogisticsSaveStatus("Saving...");
      await saveTripTeamLogisticsByTeam(trip.id, teamLogisticsDraft);
      const row = await getTripTeamLogisticsForViewer(trip.id);
      setTeamLogisticsDraft(row);
      setTeamLogisticsSaveStatus("Saved.");
      showToast("Team logistics saved.", "success");
    } catch (e) {
      const msg = e.message || "Save failed.";
      setTeamLogisticsSaveStatus(msg);
      showToast(msg, "error");
    }
  }

  async function handleSaveMaterialsTab() {
    if (!trip?.id || !materialsDraft) return false;
    try {
      setMaterialsSaveStatus("Saving...");
      const nw = materialsDraft.numWorkers;
      const numWorkersParsed =
        nw === "" || nw === null || nw === undefined
          ? null
          : Number.parseInt(String(nw), 10);
      await saveTripBudget(trip.id, {
        numWorkers: Number.isFinite(numWorkersParsed) ? numWorkersParsed : null,
        teamAccountant: materialsDraft.teamAccountant ?? "",
        teamRecorder: materialsDraft.teamRecorder ?? "",
        tshirts: materialsDraft.tshirts ?? "",
        workbooks: materialsDraft.workbooks ?? "",
        materialsShipAddress: materialsDraft.materialsShipAddress ?? "",
        materialsShipAddressNote: materialsDraft.materialsShipAddressNote ?? "",
        materialsTrackingNumber: materialsDraft.materialsTrackingNumber ?? "",
        materialsNotes: materialsDraft.materialsNotes ?? "",
        materialsNotesForTeam: materialsDraft.materialsNotesForTeam ?? "",
        materialsPackingChecklist:
          materialsDraft.materialsPackingChecklist || defaultMaterialsPackingChecklist(),
      });
      materialsBudgetLoadGenRef.current += 1;
      const next = await getTripBudget(trip.id);
      setTripBudgetRow(next);
      if (next) {
        setMaterialsDraft({
          numWorkers: numWorkersDraftFromBudgetValue(next.numWorkers),
          teamAccountant: next.teamAccountant || "",
          teamRecorder: next.teamRecorder || "",
          tshirts: next.tshirts ?? "",
          workbooks: next.workbooks ?? "",
          materialsShipAddress: next.materialsShipAddress ?? "",
          materialsShipAddressNote: next.materialsShipAddressNote ?? "",
          materialsTrackingNumber: next.materialsTrackingNumber ?? "",
          materialsNotes: next.materialsNotes ?? "",
          materialsNotesForTeam: next.materialsNotesForTeam ?? "",
          materialsPackingChecklist: parseMaterialsPackingChecklist(next.materialsPackingChecklist),
        });
      }
      setMaterialsSaveStatus("Saved.");
      showToast("Materials saved.", "success");
      return true;
    } catch (e) {
      const msg = e.message || "Error saving.";
      setMaterialsSaveStatus(msg);
      showToast(msg, "error");
      return false;
    }
  }

  async function handleToggleMaterialsPackingItem(key) {
    if (!trip?.id || !materialsDraft || !staffViewAllParticipants) return;
    const prev = parseMaterialsPackingChecklist(materialsDraft.materialsPackingChecklist);
    const nextChecklist = { ...prev, [key]: !prev[key] };
    setMaterialsDraft((d) => (d ? { ...d, materialsPackingChecklist: nextChecklist } : d));
    try {
      materialsBudgetLoadGenRef.current += 1;
      await saveTripBudget(trip.id, { materialsPackingChecklist: nextChecklist });
      const next = await getTripBudget(trip.id);
      setTripBudgetRow(next);
      if (next) {
        setMaterialsDraft((d) =>
          d
            ? {
                ...d,
                materialsPackingChecklist: parseMaterialsPackingChecklist(next.materialsPackingChecklist),
              }
            : d
        );
      }
    } catch (e) {
      setMaterialsDraft((d) => (d ? { ...d, materialsPackingChecklist: prev } : d));
      showToast(e.message || "Could not save packing checklist.", "error");
    }
  }

  async function handleSubmitBudgetCheckFromTripMaterials() {
    if (!trip?.id) return;
    const amt = String(budgetCheckAmount || "").trim();
    if (!amt) {
      showToast("Enter the check amount.", "error");
      return;
    }
    try {
      setBudgetCheckSubmitting(true);
      if (budgetCheckEditingId) {
        await updateBudgetCheckRequest({
          id: budgetCheckEditingId,
          amount: amt,
          note: budgetCheckNote,
        });
        showToast("Check request updated.", "success");
      } else {
        const submitResult = await submitBudgetCheckRequest({
          tripId: trip.id,
          amount: amt,
          note: budgetCheckNote,
        });
        const { type, message } = budgetCheckSubmitToast(submitResult);
        if (type === "success") {
          showToast(`${message.replace(/\.\s*$/, "")}. Track it on Budget → Checks.`, "success");
        } else {
          showToast(message, "error");
        }
      }
      try {
        setTripBudgetCheckRequests(await listBudgetCheckRequestsForTrip(trip.id));
      } catch {
        /* list refresh is best-effort */
      }
      if (typeof window !== "undefined" && trip.id) {
        window.dispatchEvent(
          new CustomEvent(STAFF_TASKS_UPDATED_EVENT, { detail: { tripId: trip.id } })
        );
      }
      setBudgetCheckModalOpen(false);
      setBudgetCheckEditingId("");
      setBudgetCheckAmount("");
      setBudgetCheckNote("");
    } catch (e) {
      showToast(e.message || "Request failed.", "error");
    } finally {
      setBudgetCheckSubmitting(false);
    }
  }

  async function handleConfirmTripBudgetCheckDelete() {
    if (!tripBudgetCheckDeleteId || !trip?.id) return;
    try {
      await deleteBudgetCheckRequest(tripBudgetCheckDeleteId);
      setTripBudgetCheckDeleteId("");
      try {
        setTripBudgetCheckRequests(await listBudgetCheckRequestsForTrip(trip.id));
      } catch {
        /* ignore */
      }
      if (typeof window !== "undefined" && trip.id) {
        window.dispatchEvent(
          new CustomEvent(STAFF_TASKS_UPDATED_EVENT, { detail: { tripId: trip.id } })
        );
      }
      showToast("Request deleted.", "success");
    } catch (e) {
      showToast(e.message || "Could not delete.", "error");
    }
  }

  function revertMaterialsDraftFromBudgetRow() {
    const row = tripBudgetRow;
    setMaterialsDraft(
      row
        ? {
            numWorkers: numWorkersDraftFromBudgetValue(row.numWorkers),
            teamAccountant: row.teamAccountant || "",
            teamRecorder: row.teamRecorder || "",
            tshirts: row.tshirts ?? "",
            workbooks: row.workbooks ?? "",
            materialsShipAddress: row.materialsShipAddress ?? "",
            materialsShipAddressNote: row.materialsShipAddressNote ?? "",
            materialsTrackingNumber: row.materialsTrackingNumber ?? "",
            materialsNotes: row.materialsNotes ?? "",
            materialsNotesForTeam: row.materialsNotesForTeam ?? "",
            materialsPackingChecklist: parseMaterialsPackingChecklist(row.materialsPackingChecklist),
          }
        : {
            numWorkers: "",
            teamAccountant: "",
            teamRecorder: "",
            tshirts: "",
            workbooks: "",
            materialsShipAddress: "",
            materialsShipAddressNote: "",
            materialsTrackingNumber: "",
            materialsNotes: "",
            materialsNotesForTeam: "",
            materialsPackingChecklist: defaultMaterialsPackingChecklist(),
          }
    );
    setIsEditingMaterialsGlance(false);
    setMaterialsSaveStatus("");
  }

  async function handleMaterialsGlanceSave() {
    const ok = await handleSaveMaterialsTab();
    if (ok) setIsEditingMaterialsGlance(false);
  }

  function handleExportMaterialsExcel() {
    if (!trip?.id || !materialsDraft) return;
    try {
      const headers = [
        "Trip name",
        "# of workers",
        "Current roster count",
        "Team accountant",
        "Team recorder",
        "T-shirt sizes (housing budget)",
        "Ship-to address",
        "Ship-to note (vs application)",
        "Tracking number",
        "Notes for team (visible)",
        "Workbooks sending notes",
      ];
      const row = [
        trip.name || "",
        materialsWorkersDisplayCount,
        materialsRosterHeadcount,
        materialsDraft.teamAccountant || "",
        materialsDraft.teamRecorder || "",
        materialsDraft.tshirts || "",
        materialsDraft.materialsShipAddress || "",
        materialsDraft.materialsShipAddressNote || "",
        materialsDraft.materialsTrackingNumber || "",
        materialsDraft.materialsNotesForTeam || "",
        materialsDraft.materialsNotes || "",
      ];
      const ws = XLSX.utils.aoa_to_sheet([headers, row]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Materials");
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeTripName = String(trip.name || "trip")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `${safeTripName || "trip"}-materials-${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Exported ${link.download}`, "success");
    } catch (e) {
      const msg = e?.message || "Export failed.";
      showToast(msg, "error");
    }
  }

  useEffect(() => {
    if (tabs.includes(tab)) return;
    if (tab === "My Documents" && tabs.includes("Worker Docs")) {
      setTab("Worker Docs");
      return;
    }
    setTab("Overview");
  }, [tab, tabs]);

  let pagePhase = "ready";
  if (!router.isReady || !tripId) {
    pagePhase = "router-loading";
  } else if (!trip) {
    pagePhase = tripLoadComplete ? "trip-not-found" : "trip-loading";
  }

  const pct =
    pagePhase === "ready"
      ? canViewTeamDashboard
        ? participantTaskPct
        : currentParticipantProgress?.percent || 0
      : 0;
  const countdownSummary =
    pagePhase === "ready" ? getCountdownSummary(trip?.startDate) : { label: "—", detail: "" };

  return {
    pagePhase,
    countdownSummary,
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
  };
}
