import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import Spinner from "@/components/Spinner";
import EmptyState from "@/components/EmptyState";
import ConfirmModal from "@/components/ConfirmModal";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { requireSession } from "@/lib/auth";
import {
  assignWorkerByEmailToTrip,
  deleteTrip,
  getTripForCurrentUser,
  listTripParticipants,
  removeTripAssignment,
  saveTripParticipantDocumentTypes,
  updateTripForCurrentUser,
} from "@/lib/trips";
import { isAdminRole, isLeaderRole, isManagerRole } from "@/lib/roles";
import { listTripTeamMembers, saveTripTeamMembers } from "@/lib/tripTeamMembers";
import { SITE_OPTIONS } from "@/lib/siteOptions";
import {
  getTrainingModuleDeadline,
  listTrainingModules,
  listTrainingProgress,
  saveTrainingProgress,
} from "@/lib/training";
import { saveFundraisingProfile } from "@/lib/fundraising";
import {
  addLinkResource,
  addPdfResource,
  deleteResource,
  isMissingResourceTutorialColumnError,
  isMissingResourceVisibilityColumnError,
  listResources,
  updateResource,
} from "@/lib/resources";
import {
  DOCUMENT_CATEGORY_OPTIONS,
  getDocumentSlotByKey,
  REQUIRED_TRIP_DOCUMENT_SLOTS,
} from "@/lib/tripDocumentSlots";
import { percentComplete } from "@/lib/tasks";
import {
  listStaffTasksForTrip,
  isTaskAssignedToUser,
  saveStaffTasks as persistStaffTasks,
  sortStaffTasksByTemplate,
  computeStaffTaskDueDate,
  STAFF_TASKS_UPDATED_EVENT,
} from "@/lib/staffTasks";
import {
  createTripTask,
  listTripTasks,
  updateTripTask,
  listUserTaskProgress,
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
} from "@/lib/workerTaskTemplate";
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
import TripTravelSafetySection from "@/components/TripTravelSafetySection";
import { deleteTripMeeting, listTripMeetings, saveTripMeeting } from "@/lib/tripMeetings";
import {
  getTripBudget,
  getTripHousingLinkForViewer,
  listSiteBudgetNotes,
  saveTripBudget,
} from "@/lib/tripBudget";
import {
  findSiteBudgetNoteForOption,
  resolveCanonicalSiteLabelForTrip,
  resolveSiteBudgetNoteForTripLocation,
  resolveTripSiteLogisticsUrl,
} from "@/lib/siteMaterials";
import {
  parseAnyWorkbookInventoryString,
  summarizeWorkbookItemsForShipping,
} from "@/lib/workbookInventory";
import { resolveSiteLogisticsUrl } from "@/lib/siteInfoLinks";

function CollapsibleSection({
  title,
  subtitle,
  badge,
  rightSlot,
  children,
  className = "",
  style,
}) {
  return (
    <div
      className={className}
      style={{
        border: "none",
        borderRadius: 0,
        background: "transparent",
        overflow: "visible",
        width: "100%",
        minWidth: 0,
        ...style,
      }}
    >
      {(title || subtitle || badge || rightSlot) ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 0 10px 0",
            background: "transparent",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {title ? <div style={{ fontWeight: 800 }}>{title}</div> : null}
            {subtitle ? (
              <div className="small" style={{ marginTop: 2, opacity: 0.85 }}>
                {subtitle}
              </div>
            ) : null}
          </div>
          {badge ? <span style={{ flexShrink: 0 }}>{badge}</span> : null}
          {rightSlot ? <div style={{ flexShrink: 0 }}>{rightSlot}</div> : null}
        </div>
      ) : null}
      <div>{children}</div>
    </div>
  );
}

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STAFF_TASK_AREA_LABELS = {
  "Team/Project Formation": "Project Formation",
  "Support During Project": "During Project",
};

const CUSTOM_SITE_OPTION = "__custom__";
const TEAM_STATUS_OPTIONS = [
  "Forming",
  "Confirmed",
  "Support Raising",
  "Ready to Go",
  "On Field",
  "Complete",
  "On Hold",
];

const TSHIRT_SIZE_OPTIONS = ["", "XS", "S", "M", "L", "XL", "XXL", "3XL"];
function getTshirtSizeOptions(currentValue) {
  const v = String(currentValue || "").trim();
  if (!v || TSHIRT_SIZE_OPTIONS.includes(v)) return TSHIRT_SIZE_OPTIONS;
  return [v, ...TSHIRT_SIZE_OPTIONS];
}

const BIRTHDATE_MONTH_OPTIONS = ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const BIRTHDATE_DAY_OPTIONS = ["", ...Array.from({ length: 31 }, (_, i) => String(i + 1))];
const BIRTHDATE_YEAR_OPTIONS = (() => {
  const end = new Date().getFullYear() + 2;
  const start = end - 100;
  return ["", ...Array.from({ length: end - start + 1 }, (_, i) => String(start + i))];
})();
const GENDER_OPTIONS = ["", "Male", "Female"];
const YES_NO_OPTIONS = ["", "Yes", "No"];

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getWorkerConnectionStatus(member) {
  if (member?.connected) {
    return {
      statusLabel: "Ready",
      statusBadgeClass: "badgeSuccess",
      accountLabel: "Joined",
      accountBadgeClass: "badgeSuccess",
      canInvite: false,
      inviteLabel: "Account Created",
      inviteTitle: "Account created",
    };
  }

  if (member?.email) {
    return {
      statusLabel: "Invitable",
      statusBadgeClass: "badgeWarn",
      accountLabel: "Not Joined",
      accountBadgeClass: "badgeWarn",
      canInvite: true,
      inviteLabel: "Resend Invite",
      inviteTitle: "Send a new invite email",
    };
  }

  return {
    statusLabel: "Missing Email",
    statusBadgeClass: "",
    accountLabel: "Cannot Invite",
    accountBadgeClass: "",
    canInvite: false,
    inviteLabel: "Resend Invite",
    inviteTitle: "Add an email before sending an invite",
  };
}

function buildWorkerInvitePayload(email, trip) {
  const loginUrl = typeof window !== "undefined"
    ? `${window.location.origin}/login?next=${encodeURIComponent(`/trips/${trip?.id || ""}`)}`
    : "/login";
  const tripName = trip?.name || "your LST team";
  const site = trip?.location ? ` for ${trip.location}` : "";
  const subject = `Join ${tripName} on the LST app`;
  const body = [
    "Hi,",
    "",
    `You have been added to ${tripName}${site} in the LST app.`,
    "",
    "Create your account here:",
    loginUrl,
    "",
    "Use this same email address so your account links to the team automatically.",
    "",
    "Thanks!",
  ].join("\n");

  return { loginUrl, subject, body };
}

/** Prefer an explicit https link (e.g. SharePoint) over pdf when both exist. */
function preferredTripResourceOpenUrl(doc) {
  if (!doc) return "";
  const link = String(doc.link || "").trim();
  const pdf = String(doc.pdfUrl || "").trim();
  if (/^https?:\/\//i.test(link)) return link;
  if (/^https?:\/\//i.test(pdf)) return pdf;
  return link || pdf;
}

function formatDraftAmount(value) {
  return value === null || value === undefined || value === "" ? "" : String(value);
}

function buildDateOffsetFromToday(daysToAdd) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Number(daysToAdd || 0));
  return date.toISOString().slice(0, 10);
}

function buildTripSetupDraft(trip) {
  return {
    name: trip?.name || "",
    location: trip?.location || "",
    host: trip?.host || "",
    siteType: trip?.siteType || "",
    teamStatus: trip?.teamStatus || "",
    trainingTimelineType:
      trip?.trainingTimelineType || DEFAULT_TRAINING_TIMELINE_TYPE,
    projectType: trip?.projectType || "",
    projectLengthSummary: trip?.projectLengthSummary || "",
    extraTravelStatus: trip?.extraTravelStatus || "no",
    startDate: trip?.startDate || "",
    endDate: trip?.endDate || "",
    fundraisingGoalAmount: formatDraftAmount(trip?.fundraisingGoalAmount),
    tripFeeAmount: formatDraftAmount(trip?.tripFeeAmount),
    materialsFeeAmount: formatDraftAmount(trip?.materialsFeeAmount),
    hasDeferredWorker: trip?.hasDeferredWorker ? "yes" : "no",
    hannoverHousingFeeAmount: formatDraftAmount(trip?.hannoverHousingFeeAmount),
    domesticProjectFeeAmount: formatDraftAmount(trip?.domesticProjectFeeAmount),
    domesticFeeAmount: formatDraftAmount(trip?.domesticFeeAmount),
    domesticMaterialsFeeAmount: formatDraftAmount(trip?.domesticMaterialsFeeAmount),
  };
}

function createEmptyRosterMember() {
  return {
    id: "",
    assignmentId: "",
    profileId: "",
    connected: false,
    firstName: "",
    lastName: "",
    email: "",
    startDate: "",
    endDate: "",
  };
}

function createEmptyWorkerDraft() {
  return {
    firstName: "",
    lastName: "",
    email: "",
    assignmentMode: "unassigned",
  };
}

function buildStaffTaskRowDomId(taskId) {
  return `staff-task-row-${String(taskId || "").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function buildWorkerTaskRowDomId(taskId) {
  return `worker-task-row-${String(taskId || "").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function buildTrainingModuleRowDomId(moduleId) {
  return `training-module-row-${String(moduleId || "").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function getDocumentCategoryBadgeClass(category) {
  if (category === "Travel") return "badgeInfo";
  if (category === "Insurance") return "badgeWarn";
  if (category === "Budget") return "badgeSuccess";
  if (category === "Site") return "badgeInfo";
  return "";
}

const siteLinkActionButtonStyle = {
  minWidth: 168,
  justifyContent: "center",
};

function buildDocumentDraft(overrides = {}) {
  return {
    title: "",
    link: "",
    category: "Other",
    workArea: "",
    resourceKey: "",
    visibleToParticipants: true,
    tutorialTitle: "",
    tutorialUrl: "",
    tutorialDescription: "",
    ...overrides,
  };
}

function getEffectiveTutorialContent(slot, doc) {
  return {
    tutorialTitle: doc?.tutorialTitle || slot?.tutorialTitle || "",
    tutorialUrl: doc?.tutorialUrl || slot?.tutorialUrl || "",
    tutorialDescription: doc?.tutorialDescription || slot?.tutorialDescription || "",
  };
}

/** Staff preview of worker UI when roster members do not have Hub accounts yet */
const WORKER_PREVIEW_PARTICIPANT_ID = "__lst_worker_preview__";
/** Staff preview of trip-leader tabs (no Materials / Staff Tasks) */
const LEADER_PREVIEW_PARTICIPANT_ID = "__lst_leader_preview__";

export default function TripPage() {
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
  const [linkDraft, setLinkDraft] = useState(buildDocumentDraft());
  const [pendingPdfDraft, setPendingPdfDraft] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);
  const [docDraft, setDocDraft] = useState(null);
  const [referenceEmails, setReferenceEmails] = useState({});
  const [referenceSaveStatusByKey, setReferenceSaveStatusByKey] = useState({});
  const addDocumentInputRef = useRef(null);
  const [docsError, setDocsError] = useState("");
  const [fundraisingDrafts, setFundraisingDrafts] = useState({});
  const [fundraisingStatus, setFundraisingStatus] = useState({});
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    dueDate: "",
    category: "",
    description: "",
  });
  const [taskStatusMessage, setTaskStatusMessage] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingWorkerTaskDateId, setEditingWorkerTaskDateId] = useState("");
  const [overviewNotes, setOverviewNotes] = useState([]);
  const [editingOverviewNoteId, setEditingOverviewNoteId] = useState("");
  const [overviewNoteDraft, setOverviewNoteDraft] = useState("");
  const [isEditingOverviewNote, setIsEditingOverviewNote] = useState(false);
  const [overviewNoteStatus, setOverviewNoteStatus] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState("");
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [announcementStatus, setAnnouncementStatus] = useState("");
  const [teamFundraisingDraft, setTeamFundraisingDraft] = useState({
    teamFundraisingUrl: "",
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
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [newWorkerDraft, setNewWorkerDraft] = useState(() => createEmptyWorkerDraft());
  const [workerAddStatus, setWorkerAddStatus] = useState("");
  const [invitingWorkerEmail, setInvitingWorkerEmail] = useState("");

  const [trip, setTrip] = useState(null);
  const [tripLoadComplete, setTripLoadComplete] = useState(false);
  const [editableStaffTasks, setEditableStaffTasks] = useState([]);
  const [editingStaffTaskId, setEditingStaffTaskId] = useState(null);
  const [editingDueDateTaskId, setEditingDueDateTaskId] = useState(null);
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
  const [travelFormModalOpen, setTravelFormModalOpen] = useState(false);
  const [travelFormTargetRefKey, setTravelFormTargetRefKey] = useState("");
  const [travelFormDraft, setTravelFormDraft] = useState(() => ({ ...TRAVEL_FORM_EMPTY }));
  const [travelFormStatus, setTravelFormStatus] = useState("");
  const [travelFormResponses, setTravelFormResponses] = useState([]);
  const [teamTabTshirtSavingUserId, setTeamTabTshirtSavingUserId] = useState("");
  const [tripMeetings, setTripMeetings] = useState([]);
  const [meetingDraft, setMeetingDraft] = useState({ title: "", scheduledAt: "", notesAfter: "" });
  const [editingMeetingId, setEditingMeetingId] = useState("");
  const [meetingStatus, setMeetingStatus] = useState("");
  const [tripBudgetRow, setTripBudgetRow] = useState(null);
  const [tripHousingLinkUrl, setTripHousingLinkUrl] = useState("");
  const [tripBudgetLoadError, setTripBudgetLoadError] = useState("");
  const [materialsDraft, setMaterialsDraft] = useState(null);
  const [materialsSaveStatus, setMaterialsSaveStatus] = useState("");
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
  const trainingAccessUrl = "https://lst365.sharepoint.com/:b:/g/IQD0aBKBPtQsQ6oh55gqMG4IAe3aFtSVxmywEXEBasP_5jY?e=SZ9m0j";
  const basicTrainingUrl = "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=134&";
  const gatewayTrainingUrl = "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=136&";
  const generalFinancialInformationUrl = "https://lst.org/projects/general-financial-information/";

  const trainingResources = [
    {
      id: "canvas",
      group: "required",
      title: "Canvas",
      description: "Instructions on accessing online LST team training.",
      url: trainingAccessUrl,
      icon: "CV",
      accent: "#2f4993",
    },
    {
      id: "basic",
      group: "required",
      title: "Basic Training",
      description: "Understanding the LST approach.",
      url: basicTrainingUrl,
      icon: "BT",
      accent: "#3caae1",
    },
    {
      id: "gateway",
      group: "required",
      title: "Gateway Training",
      description: "Pre-departure preparation.",
      url: gatewayTrainingUrl,
      icon: "GT",
      accent: "#f99d2a",
    },
    {
      id: "endmeetings",
      group: "required",
      title: "EndMeetings",
      description: "Post-project debriefing.",
      url: gatewayTrainingUrl,
      icon: "EM",
      accent: "#4c7c3d",
    },
    {
      id: "optional",
      group: "optional",
      title: "Advanced Training",
      description:
        "Optional workshops offered through the year, mainly for experienced Workers.",
      url: "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=135&",
      icon: "OT",
      accent: "#7a5af8",
    },
    {
      id: "lst-connect",
      group: "optional",
      title: "LST Connect",
      description:
        "Join LST Connect to practice with an online Reader before leaving. Register as a Worker.",
      url: "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=133&",
      icon: "LC",
      accent: "#0f766e",
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
      };
    });
    setFundraisingDrafts(nextDrafts);
    setTeamFundraisingDraft({
      teamFundraisingUrl: trip.teamFundraisingUrl || "",
    });
    setIsEditingTeamFundraising(false);
    setEditingParticipantFundraisingId("");
    setTripSetupDraft(buildTripSetupDraft(trip));
    setIsEditingTripSetup(false);
    setTripSetupStatus("");
    setIsCustomSiteInput(false);
    setRosterDraft(trip.teamMembers || []);
    setIsEditingRoster(false);
    setRosterStatus("");
    setEditingWorkerTaskDateId("");
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
        if (!cancelled) setTripMeetings(rows);
      } catch (e) {
        console.error("Unable to load meetings", e);
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

    async function loadHousingLink() {
      try {
        const url = await getTripHousingLinkForViewer(trip.id);
        if (!cancelled) setTripHousingLinkUrl(url);
      } catch {
        if (!cancelled) setTripHousingLinkUrl("");
      }
    }

    void loadHousingLink();
    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  useEffect(() => {
    if (!trip?.id || !staffViewAllParticipants) return;
    let cancelled = false;

    async function loadTripBudgetRow() {
      try {
        const row = await getTripBudget(trip.id);
        if (cancelled) return;
        setTripBudgetRow(row);
        setTripBudgetLoadError("");
        setMaterialsDraft(
          row
            ? {
                numWorkers: row.numWorkers ?? "",
                teamAccountant: row.teamAccountant || "",
                tshirts: row.tshirts || "",
                workbooks: row.workbooks || "",
                materialsShipAddress: row.materialsShipAddress || "",
                materialsTrackingNumber: row.materialsTrackingNumber || "",
                materialsNotes: row.materialsNotes || "",
              }
            : {
                numWorkers: "",
                teamAccountant: "",
                tshirts: "",
                workbooks: "",
                materialsShipAddress: "",
                materialsTrackingNumber: "",
                materialsNotes: "",
              }
        );
      } catch (e) {
        if (!cancelled) {
          setTripBudgetLoadError(e.message || "Unable to load housing budget.");
        }
      }
    }

    void loadTripBudgetRow();
    return () => {
      cancelled = true;
    };
  }, [trip?.id, staffViewAllParticipants]);

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
    if (!trip?.id || !canManageTrips) return;

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
  }, [canManageTrips, trip?.id]);

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

      const participantsById = new Map(
        participants.map((participant) => [participant.id, participant])
      );
      const nextTrainingStates = {};
      const nextTaskStates = {};

      progress.forEach((row) => {
        const participant = participantsById.get(row.userId);
        if (!participant?.email) return;

        if (!nextTrainingStates[participant.email]) {
          nextTrainingStates[participant.email] = {};
        }

        nextTrainingStates[participant.email][row.moduleId] = !!row.completed;
        if (row.completedAt) {
          nextTrainingStates[participant.email][`${row.moduleId}Date`] =
            String(row.completedAt).slice(0, 10);
        }
      });

      taskProgress.forEach((row) => {
        const participant = participantsById.get(row.userId);
        if (!participant?.email) return;

        if (!nextTaskStates[participant.email]) {
          nextTaskStates[participant.email] = {};
        }

        nextTaskStates[participant.email][row.taskName] = !!row.completed;
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
        setEditingAnnouncementId("");
        setAnnouncementDraft("");
        setIsEditingAnnouncement(false);
        setAnnouncementStatus("");
        const rows = await listTripAnnouncements(trip.id);
        if (!cancelled) {
          setAnnouncements(rows);
          setAnnouncementStatus("");
        }
      } catch (error) {
        console.error("Unable to load trip announcements", error);
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
          setDocs(savedDocs);
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
  }, [trip]);

  useEffect(() => {
    if (!trip || !staffViewAllParticipants) return;

    let cancelled = false;

    async function syncStaffTasks() {
      try {
        const tasks = await listStaffTasksForTrip(trip.id);
        if (!cancelled) {
          setEditableStaffTasks(tasks);
        }
      } catch (error) {
        console.error("Unable to load staff tasks", error);
      }
    }

    void syncStaffTasks();

    function handleTaskUpdate(event) {
      if (!event.detail?.tripId || event.detail.tripId === trip.id) {
        void syncStaffTasks();
      }
    }

    window.addEventListener(STAFF_TASKS_UPDATED_EVENT, handleTaskUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener(STAFF_TASKS_UPDATED_EVENT, handleTaskUpdate);
    };
  }, [trip?.id, staffViewAllParticipants]);

  async function handleAddDocument(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPendingPdfDraft({
      file,
      title: file.name.replace(/\.pdf$/i, ""),
      category: "Other",
      workArea: trip?.name || "",
      resourceKey: "",
      visibleToParticipants: true,
    });
    event.target.value = "";
  }

  function handlePrepareRequiredPdf(slot) {
    setPendingPdfDraft({
      file: null,
      title: slot.title,
      category: slot.category,
      workArea: trip?.name || "",
      resourceKey: slot.key,
      visibleToParticipants: true,
    });
  }

  function handlePrepareRequiredLink(slot) {
    setIsAddingLink(true);
    setLinkDraft(buildDocumentDraft({
      title: slot.resource?.title || slot.title,
      link: slot.resource?.link || slot.resource?.pdfUrl || "",
      category: slot.category,
      workArea: trip?.name || "",
      resourceKey: slot.key,
      visibleToParticipants: slot.resource?.visibleToParticipants !== false,
      ...getEffectiveTutorialContent(slot, slot.resource),
    }));
  }

  function handleCancelPendingPdf() {
    setPendingPdfDraft(null);
  }

  async function handleSavePendingPdf() {
    if (!pendingPdfDraft?.file) return;

    try {
      const created = await addPdfResource({
        title: pendingPdfDraft.title,
        file: pendingPdfDraft.file,
        category: pendingPdfDraft.category,
        workArea: pendingPdfDraft.workArea,
        resourceKey: pendingPdfDraft.resourceKey,
        visibleToParticipants: pendingPdfDraft.visibleToParticipants,
        tripId: trip?.id,
      });
      setDocs((current) => [created, ...current]);
      setDocsError("");
      setPendingPdfDraft(null);
    } catch (error) {
      console.error("Unable to add PDF resource", error);
      setDocsError(error.message || "Unable to save resources.");
    }
  }

  function handleAddLink() {
    setIsAddingLink(true);
    setLinkDraft(
      buildDocumentDraft({
        workArea: trip?.name || "",
      })
    );
  }

  function handleCancelAddLink() {
    setIsAddingLink(false);
    setLinkDraft(
      buildDocumentDraft({
        workArea: trip?.name || "",
      })
    );
  }

  async function handleSaveLink() {
    if (!linkDraft.title.trim()) return;

    try {
      const created = await addLinkResource({
        ...linkDraft,
        tripId: trip?.id,
      });
      if (!created) return;
      setDocs((current) => [created, ...current]);
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

  function handleEditDoc(doc) {
    const slot = getDocumentSlotByKey(doc?.resourceKey);
    setEditingDocId(doc.id);
    setDocDraft(
      buildDocumentDraft({
        ...doc,
        visibleToParticipants: doc.visibleToParticipants !== false,
        ...getEffectiveTutorialContent(slot, doc),
      })
    );
  }

  async function handleDeleteDoc(docId) {
    try {
      await deleteResource(docId);
      setDocs((current) => current.filter((doc) => doc.id !== docId));
      setDocsError("");
    } catch (error) {
      console.error("Unable to delete resource", error);
      setDocsError(error.message || "Unable to save resources.");
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
        workArea: docDraft.workArea,
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

  async function handleToggleDocVisibility(doc, nextVisible) {
    if (!doc?.id) return;

    try {
      const updated = await updateResource({
        id: doc.id,
        title: doc.title,
        link: doc.link,
        pdfUrl: doc.pdfUrl,
        category: doc.category,
        resourceKey: doc.resourceKey,
        workArea: doc.workArea,
        visibleToParticipants: nextVisible,
        allowVisibilityFallback: false,
      });
      setDocs((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry))
      );
      setDocsError("");
    } catch (error) {
      if (isMissingResourceVisibilityColumnError(error)) {
        setDocsError(
          "Participant visibility needs the Supabase migration `supabase/trip_resources_add_visibility.sql` run first."
        );
        return;
      }
      console.error("Unable to update document visibility", error);
      setDocsError(error.message || "Unable to save resources.");
    }
  }

  async function handleToggleRequiredSlotVisibility(slot, nextVisible) {
    const doc = slot?.resource;
    if (doc?.id && !doc?.isAutoGenerated) {
      await handleToggleDocVisibility(doc, nextVisible);
      return;
    }

    if (slot?.kind !== "link") return;

    const sourceLink = doc?.link || doc?.pdfUrl || "";
    if (!sourceLink) return;

    try {
      const created = await addLinkResource({
        title: doc?.title || slot.title,
        link: sourceLink,
        category: slot.category,
        workArea: trip?.name || "",
        resourceKey: slot.key,
        visibleToParticipants: nextVisible,
        allowVisibilityFallback: false,
        tripId: trip?.id,
      });
      setDocs((current) => [created, ...current]);
      setDocsError("");
    } catch (error) {
      if (isMissingResourceVisibilityColumnError(error)) {
        setDocsError(
          "Participant visibility needs the Supabase migration `supabase/trip_resources_add_visibility.sql` run first."
        );
        return;
      }
      console.error("Unable to save site visibility override", error);
      setDocsError(error.message || "Unable to save resources.");
    }
  }

  useEffect(() => {
    if (!trip) return;
    // Trip leaders see the team dashboard but should not load or view reference tracking (staff + workers only).
    if (canViewTeamDashboard && !staffViewAllParticipants) {
      setReferenceEmails({});
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
  }, [trip?.id, canViewTeamDashboard, staffViewAllParticipants]);

  function updateFundraisingDraft(participantId, field, value) {
    setFundraisingDrafts((current) => ({
      ...current,
      [participantId]: {
        fundraisingUrl: current[participantId]?.fundraisingUrl || "",
        [field]: value,
      },
    }));
  }

  async function handleSaveFundraising(participant) {
    if (!trip || !participant?.id) return;

    const draft = fundraisingDrafts[participant.id] || {
      fundraisingUrl: "",
    };

    try {
      setFundraisingStatus((current) => ({
        ...current,
        [participant.id]: { type: "info", message: "Saving..." },
      }));

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
        },
      }));

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
        fundraisingGoalAmount: trip.fundraisingGoalAmount,
      });

      setTrip((current) =>
        current
          ? {
              ...current,
              teamFundraisingUrl: savedTrip.team_fundraising_url || "",
              fundraisingGoalAmount: Number(savedTrip.fundraising_goal_amount || 0),
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

    const participant = (trip.participants || []).find(
      (entry) => entry.email?.toLowerCase() === ownerEmail.toLowerCase()
    );
    if (!participant?.id) return;

    const currentState = participantTaskStates[ownerEmail] || {};
    const next = { ...currentState, [taskId]: !currentState[taskId] };

    setParticipantTaskStates((prev) => ({
      ...prev,
      [ownerEmail]: next,
    }));

    const task = (trip.tasks || []).find((item) => item.id === taskId);

    void saveUserTaskProgress({
      tripId: trip.id,
      userId: participant.id,
      taskName: taskId,
      completed: next[taskId],
      dueDate: task?.due || null,
    })
      .then(async () => {
        if (!next[taskId]) return;
        const activityEntry = await logTripActivity({
          tripId: trip.id,
          actorUserId: participant.id,
          actorName: participant.name || session?.name || participant.email,
          actorEmail: participant.email || session?.email || "",
          eventType: "task_completed",
          message: `${participant.name || participant.email || "Someone"} marked task complete`,
        });
        pushRecentActivity(activityEntry);
      })
      .catch((error) => {
        console.error("Unable to save user task progress", error);
      });
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
            tshirtSize: existing.tshirtSize,
            emergencyContactName: existing.emergencyContactName,
            emergencyContactEmail: existing.emergencyContactEmail,
            emergencyContactPhone: existing.emergencyContactPhone,
            isMinor: existing.isMinor,
            passportValidSixMonths: existing.passportValidSixMonths,
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
      .catch(() => setTravelFormDraft({ ...TRAVEL_FORM_EMPTY, teamName: trip?.name || "", email: target?.email || "" }));
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
      if (participant && travelFormTask && !(participantTaskStates[participant.email] || {})[travelFormTask.id]) {
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

  async function handleSaveTeamTabTshirt(refKey, newValue) {
    const normalizedRefKey = normalizeTravelFormRefKey(refKey);
    const userId = normalizedRefKey.startsWith("user:") ? normalizedRefKey.slice(5) : "";
    const tripTeamMemberId = normalizedRefKey.startsWith("roster:") ? normalizedRefKey.slice(7) : "";
    if (!trip?.id || (!userId && !tripTeamMemberId)) return;
    const form = getTravelFormByRefKey(normalizedRefKey);
    const payload = { ...(form || TRAVEL_FORM_EMPTY), tshirtSize: String(newValue ?? "").trim() };
    try {
      setTeamTabTshirtSavingUserId(normalizedRefKey);
      const saved = await saveTravelFormForRef(trip.id, {
        userId: userId || undefined,
        tripTeamMemberId: tripTeamMemberId || undefined,
      }, payload);
      setTravelFormResponses((prev) =>
        prev.filter((f) => normalizeTravelFormRefKey(travelFormRowToRefKey(f)) !== normalizedRefKey).concat([saved])
      );
    } catch (error) {
      console.error("Unable to save T-shirt size", error);
    } finally {
      setTeamTabTshirtSavingUserId("");
    }
  }

  async function handleCreateTask() {
    if (!trip || !taskDraft.title.trim()) return;

    try {
      const createdTask = await createTripTask({
        tripId: trip.id,
        title: taskDraft.title,
        dueDate: taskDraft.dueDate,
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
      setTaskDraft({ title: "", dueDate: "", category: "", description: "" });
      setTaskStatusMessage("");
    } catch (error) {
      console.error("Unable to create trip task", error);
      setTaskStatusMessage(error.message || "Unable to create task.");
    }
  }

  function toggleTraining(id, ownerEmail = session?.email) {
    if (!trip || !ownerEmail) return;

    const participant = (trip.participants || []).find(
      (entry) => entry.email?.toLowerCase() === ownerEmail.toLowerCase()
    );
    if (!participant?.id) return;

    const currentState = participantTrainingStates[ownerEmail] || {};
    const next = { ...currentState, [id]: !currentState[id] };
    const nextValue = !currentState[id];

    if (datedTrainingModuleIds.includes(id) && !nextValue) {
      next[`${id}Date`] = "";
    }

    setParticipantTrainingStates((prev) => ({
      ...prev,
      [ownerEmail]: next,
    }));

    void saveTrainingProgress({
      tripId: trip.id,
      userId: participant.id,
      moduleId: id,
      completed: nextValue,
      completedAt: next[`${id}Date`] || null,
    })
      .then(async () => {
        if (!nextValue) return;
        const module = allTrainingModules.find((item) => item.id === id);
        const activityEntry = await logTripActivity({
          tripId: trip.id,
          actorUserId: participant.id,
          actorName: participant.name || session?.name || participant.email,
          actorEmail: participant.email || session?.email || "",
          eventType: "training_completed",
          message: `${participant.name || participant.email || "Someone"} completed ${module?.title || "training module"}`,
        });
        pushRecentActivity(activityEntry);
      })
      .catch((error) => {
        console.error("Unable to save training progress", error);
      });
  }

  function updateTrainingDate(id, value, ownerEmail = session?.email) {
    if (!trip || !ownerEmail) return;

    const participant = (trip.participants || []).find(
      (entry) => entry.email?.toLowerCase() === ownerEmail.toLowerCase()
    );
    if (!participant?.id) return;

    const currentState = participantTrainingStates[ownerEmail] || {};
    const next = {
      ...currentState,
      [`${id}Date`]: value,
      [id]: value ? true : currentState[id],
    };
    setParticipantTrainingStates((prev) => ({
      ...prev,
      [ownerEmail]: next,
    }));

    void saveTrainingProgress({
      tripId: trip.id,
      userId: participant.id,
      moduleId: id,
      completed: !!next[id],
      completedAt: value || null,
    })
      .then(async () => {
        if (!value || currentState[id]) return;
        const module = allTrainingModules.find((item) => item.id === id);
        const activityEntry = await logTripActivity({
          tripId: trip.id,
          actorUserId: participant.id,
          actorName: participant.name || session?.name || participant.email,
          actorEmail: participant.email || session?.email || "",
          eventType: "training_completed",
          message: `${participant.name || participant.email || "Someone"} completed ${module?.title || "training module"}`,
        });
        pushRecentActivity(activityEntry);
      })
      .catch((error) => {
        console.error("Unable to save training date", error);
      });
  }

  async function saveStaffTasks(nextTasks) {
    const orderedTasks = sortStaffTasksByTemplate(
      nextTasks.map((task) => ({
        ...task,
        dueDate: task.dueDate || computeStaffTaskDueDate(task, trip),
      }))
    );
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

  async function handleUpdateWorkerTaskDueDate(taskId, value) {
    if (!trip || !taskId) return;

    const existingTask = (trip.tasks || []).find((item) => item.id === taskId);
    if (!existingTask) return;

    try {
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
      setEditingWorkerTaskDateId("");
    } catch (error) {
      console.error("Unable to update worker task due date", error);
      setTaskStatusMessage(error.message || "Unable to update worker task due date.");
      setEditingWorkerTaskDateId("");
    }
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
        title: `${getUserDocumentTypeLabel(documentType, trip?.participantDocumentTypes)} - ${trip.name}`,
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
          trip?.participantDocumentTypes
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
    setEditingStaffTaskId(task.id);
    setStaffTaskTitleDraft(task.taskName || task.title || "");
  }

  function handleCancelStaffTaskEdit() {
    setEditingStaffTaskId(null);
    setStaffTaskTitleDraft("");
  }

  async function handleAddStaffTask() {
    const trimmedTaskName = String(newStaffTaskDraft.taskName || "").trim();
    if (!trimmedTaskName) {
      setStaffTaskStatus("Task name is required.");
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
      dueDate: newStaffTaskDraft.dueDate || "",
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

  function handleDueDateChange(taskId, value) {
    updateStaffTask(taskId, "dueDate", value);
    setEditingDueDateTaskId(null);
  }

  function handleJumpToStaffTask(taskId) {
    if (!taskId) return;
    setPendingStaffTaskJumpId(taskId);
    setTab("Staff Tasks");
  }

  function handleSaveStaffTaskTitle(taskId) {
    updateStaffTask(taskId, "taskName", staffTaskTitleDraft.trim() || "Untitled task");
    handleCancelStaffTaskEdit();
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
    if (participant?.fundraisingUrl) {
      return {
        label: "Worker Progress: Ready",
        badgeClass: "badgeSuccess",
        helperText: "Personal Neon fundraising page saved.",
      };
    }

    return {
      label: "Worker Progress: Missing",
      badgeClass: "badgeWarn",
      helperText: "No personal Neon link added yet.",
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

    tasks.forEach((task) => {
      const area = getStaffTaskAreaLabel(task.workArea);

      if (!groups[area]) {
        groups[area] = [];
      }

      groups[area].push(task);
    });

    return groups;
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
    if (
      title.includes("passport") ||
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

    const sectionOrder = ["General", "Fundraising", "Training", "Travel", "Uploads"];

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

  function formatRecentActivityTimestamp(value) {
    if (!value) return "";

    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
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

  function formatRelativeToTripStart(dueDate, startDate) {
    const due = parseDateSafe(dueDate);
    const start = parseDateSafe(startDate);
    if (!due || !start) return "";

    const diffMs = start.getTime() - due.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "after trip starts";
    if (diffDays >= 75) return "about 3 months out";
    if (diffDays >= 45) return "about 2 months out";
    if (diffDays >= 15) return "about 1 month out";
    return "coming up soon";
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

  function updateTripSetupDraft(field, value) {
    setTripSetupDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleStartTripSetupEdit() {
    let draft = buildTripSetupDraft(trip);
    const loc = String(draft.location || "").trim();
    if (loc) {
      const canon = resolveCanonicalSiteLabelForTrip(loc, siteBudgetNotesList);
      if (canon && SITE_OPTIONS.includes(canon) && canon !== loc) {
        draft = { ...draft, location: canon };
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
      setTripSetupStatus("Team name is required.");
      return;
    }

    if (!String(tripSetupDraft.location || "").trim()) {
      setTripSetupStatus("Site is required.");
      return;
    }

    try {
      setTripSetupStatus("Saving...");
      const savedTrip = await updateTripForCurrentUser({
        tripId: trip.id,
        ...tripSetupDraft,
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

  async function sendWorkerInvite(email) {
    const normalizedWorkerEmail = normalizeEmail(email);
    if (!normalizedWorkerEmail) {
      setWorkerAddStatus("Add an email before sending an invite.");
      return false;
    }

    try {
      setInvitingWorkerEmail(normalizedWorkerEmail);
      const response = await fetch("/api/trip-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientEmail: normalizedWorkerEmail,
          recipientName: trip?.teamMembers?.find(
            (member) => normalizeEmail(member.email) === normalizedWorkerEmail
          )?.name || "",
          senderEmail: session?.email || "",
          senderName: session?.name || session?.email || "LST staff",
          tripId: trip?.id || "",
          tripName: trip?.name || "",
          tripLocation: trip?.location || "",
          tripDates: trip?.dates || "",
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const { subject, body } = buildWorkerInvitePayload(normalizedWorkerEmail, trip);

        if (typeof window !== "undefined") {
          const mailtoUrl = `mailto:${encodeURIComponent(normalizedWorkerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          window.location.href = mailtoUrl;
        }

        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(`${subject}\n\n${body}`);
        }

        setWorkerAddStatus(
          result?.error
            ? `${result.error} Opened a draft invite instead.`
            : "Trip invite email is not configured yet. Opened a draft invite instead."
        );
        return true;
      }

      return true;
    } catch (error) {
      console.error("Unable to prepare worker invite", error);
      setWorkerAddStatus("Invite could not be sent.");
      return false;
    } finally {
      setInvitingWorkerEmail("");
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
      const savedMembers = await saveTripTeamMembers(trip.id, rosterDraft);

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
      const nextRosterMembers = await saveTripTeamMembers(trip.id, [
        ...(trip.teamMembers || []),
        {
          firstName,
          lastName,
          email,
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

  async function handleInviteWorker(member) {
    const email = normalizeEmail(member?.email);
    const inviteWasSent = await sendWorkerInvite(email);
    if (inviteWasSent) {
      setWorkerAddStatus(`Invite sent for ${email}.`);
    }
  }

  function renderTripSetupCard() {
    return (
      <div id="trip-setup" className="card pad" style={{ gridColumn: "1 / -1" }}>
        <div className="cardSectionPill" style={{ marginBottom: 8 }}>Trip setup</div>
        <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
          Site, dates, and configuration.
        </div>
        <div className="row" style={{ marginBottom: 14 }}>
          <div className="spacer" />
          {tripSetupStatus ? (
            <div className="row" style={{ alignSelf: "center", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="small" style={tripSetupStatus !== "Saving..." && tripSetupStatus !== "Saved." && tripSetupStatus !== "Deleting trip..." ? { color: "var(--danger)" } : {}}>{tripSetupStatus}</span>
              {tripSetupStatus !== "Saving..." && tripSetupStatus !== "Saved." && tripSetupStatus !== "Deleting trip..." && isEditingTripSetup ? (
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
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Project Leave Date</div>
                  <input
                    className="input"
                    type="date"
                    value={tripSetupDraft.startDate}
                    onChange={(event) => updateTripSetupDraft("startDate", event.target.value)}
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Project Return Date</div>
                  <input
                    className="input"
                    type="date"
                    value={tripSetupDraft.endDate}
                    onChange={(event) => updateTripSetupDraft("endDate", event.target.value)}
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
                  {tripSiteHasStaffHousingNote ? (
                    <span
                      title="Staff housing / logistics note on Sites — open Sites → Site notes (above workbook fields)"
                      aria-label="Staff housing note on Sites"
                      style={{
                        fontWeight: 900,
                        color: "#b45309",
                        lineHeight: 1,
                        cursor: "help",
                      }}
                    >
                      !
                    </span>
                  ) : null}
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
                    {tripSiteHasStaffHousingNote ? (
                      <span
                        title="Staff housing / logistics note on Sites — open Sites → Site notes"
                        aria-label="Staff housing note on Sites"
                        style={{
                          fontWeight: 900,
                          color: "#b45309",
                          lineHeight: 1,
                          cursor: "help",
                        }}
                      >
                        !
                      </span>
                    ) : null}
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
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.tripFeeAmount}
                      onChange={(event) => updateTripSetupDraft("tripFeeAmount", event.target.value)}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Materials Fee</div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.materialsFeeAmount}
                      onChange={(event) => updateTripSetupDraft("materialsFeeAmount", event.target.value)}
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
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.hannoverHousingFeeAmount}
                      onChange={(event) => updateTripSetupDraft("hannoverHousingFeeAmount", event.target.value)}
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
    return [...new Set((editableStaffTasks || []).map((task) => task.workArea).filter(Boolean))];
  }, [editableStaffTasks]);

  const completedCount = (editableStaffTasks || []).filter(
    (t) => t.progress === "Complete"
  ).length;
  const totalCount = (editableStaffTasks || []).length;
  const completionPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const siteOptions = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const o of SITE_OPTIONS || []) {
      const s = String(o || "").trim();
      if (!s) continue;
      const k = s.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
    }
    const loc = String(trip?.location || "").trim();
    if (loc) {
      const canon = resolveCanonicalSiteLabelForTrip(loc, siteBudgetNotesList);
      const add = canon || loc;
      const k = add.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(add);
      }
    }
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
      canViewTeamDashboard
        ? docs
        : (docs || []).filter((doc) => doc.visibleToParticipants !== false),
    [canViewTeamDashboard, docs]
  );
  const hiddenRequiredDocumentKeys = useMemo(
    () =>
      new Set(
        (docs || [])
          .filter((doc) => doc.resourceKey && doc.visibleToParticipants === false)
          .map((doc) => doc.resourceKey)
      ),
    [docs]
  );
  const requiredDocumentSlots = useMemo(
    () =>
      REQUIRED_TRIP_DOCUMENT_SLOTS.map((slot) => ({
        ...slot,
        resource: visibleDocs.find((doc) => doc.resourceKey === slot.key) || null,
      })),
    [visibleDocs]
  );
  const optionalDocs = useMemo(() => {
    return (visibleDocs || []).filter((doc) => !doc.resourceKey);
  }, [visibleDocs]);

  const currentParticipant = useMemo(() => {
    if (!trip) return null;

    if (isPreviewingParticipant) {
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

    return (
      trip.participants.find(
        (participant) =>
          participant.email.toLowerCase() === session.email.toLowerCase()
      ) || null
    );
  }, [trip, session, staffViewAllParticipants, isPreviewingParticipant, previewParticipantId]);

  const activeParticipantEmail = currentParticipant?.email?.toLowerCase() || "";
  const canUploadOwnParticipantDocuments =
    !staffViewAllParticipants && !!currentParticipant && !isPreviewingParticipant;
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
  const tripUserDocumentTypes = useMemo(
    () => getTripUserDocumentTypes(trip?.participantDocumentTypes || []),
    [trip?.participantDocumentTypes]
  );

  const participantTaskProgress = useMemo(() => {
    if (!trip) return [];

    const base = (trip.participants || []).map((participant) => {
      const taskState = participantTaskStates[participant.email] || {};
      const completed = trip.tasks.filter((task) => !!taskState[task.id]).length;

      return {
        ...participant,
        taskState,
        completed,
        total: trip.tasks.length,
        percent: percentComplete(trip.tasks, taskState),
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
        const taskState = participantTaskStates[member.email] || {};
        const completed = trip.tasks.filter((task) => !!taskState[task.id]).length;
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
          total: trip.tasks.length,
          percent: percentComplete(trip.tasks, taskState),
          rosterOnly: true,
        };
      });

    return [...base, ...extras];
  }, [trip, participantTaskStates, canViewTeamDashboard]);

  const currentParticipantProgress = useMemo(() => {
    if (!activeParticipantEmail) return null;

    return (
      participantTaskProgress.find(
        (participant) =>
          participant.email.toLowerCase() === activeParticipantEmail
      ) || null
    );
  }, [participantTaskProgress, activeParticipantEmail]);

  const teamTabMembers = useMemo(() => {
    if (!trip) return [];

    const membersByKey = new Map();

    (trip.teamMembers || []).forEach((member, index) => {
      const email = member.email || "";
      const key = normalizeEmail(email) || `roster-${member.id || member.name || index}`;

      membersByKey.set(key, {
        key,
        id: member.id || "",
        name: member.name || "Unnamed member",
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        role: "",
        email,
        fundraisingUrl: "",
        startDate: member.startDate || trip.startDate || "",
        endDate: member.endDate || trip.endDate || "",
        connected: false,
      });
    });

    (trip.participants || []).forEach((participant, index) => {
      const email = participant.email || "";
      const key = normalizeEmail(email) || `participant-${participant.id || participant.name || index}`;
      const existing = membersByKey.get(key);

      membersByKey.set(key, {
        key,
        id: existing?.id || "",
        name: participant.name || existing?.name || "Unnamed member",
        firstName: participant.firstName || existing?.firstName || "",
        lastName: participant.lastName || existing?.lastName || "",
        role: participant.role || existing?.role || "",
        email: participant.email || existing?.email || "",
        fundraisingUrl: participant.fundraisingUrl || existing?.fundraisingUrl || "",
        startDate: existing?.startDate || trip.startDate || "",
        endDate: existing?.endDate || trip.endDate || "",
        connected: true,
        assignmentId: participant.assignmentId || existing?.assignmentId || "",
        profileId: participant.id || existing?.profileId || "",
      });
    });

    return Array.from(membersByKey.values()).sort((left, right) => {
      if (left.connected !== right.connected) {
        return left.connected ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });
  }, [trip]);

  const referenceTableRows = useMemo(() => {
    if (!trip) return [];
    const participantEmails = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );
    const rows = (trip.participants || []).map((p) => ({
      refKey: `user:${p.id}`,
      displayName: p.name || p.email || "Member",
    }));
    for (const m of trip.teamMembers || []) {
      const e = normalizeEmail(m.email);
      if (e && participantEmails.has(e)) continue;
      if (!m.id) continue;
      rows.push({
        refKey: `roster:${m.id}`,
        displayName: m.name || e || "Roster member",
      });
    }
    return rows.sort((a, b) => a.displayName.localeCompare(b.displayName));
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

    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [trip]);

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
      const trainingState = participantTrainingStates[participant.email] || {};
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
        const trainingState = participantTrainingStates[member.email] || {};
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

    return [...base, ...extras];
  }, [trip, participantTrainingStates, allTrainingModules, canViewTeamDashboard]);

  const currentTrainingProgress = useMemo(() => {
    if (!activeParticipantEmail) return null;

    return (
      trainingProgress.find(
        (participant) =>
          participant.email.toLowerCase() === activeParticipantEmail
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

    if (canViewTeamDashboard) {
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
          name: member.name || member.email || "Roster member",
          email: member.email || "",
          fundraisingUrl: "",
          fundraisingGoalAmount:
            member.fundraisingGoalAmount != null ? Number(member.fundraisingGoalAmount) : undefined,
          rosterOnly: true,
        }));
      return [...(trip.participants || []), ...rosterOnly];
    }

    if (!currentParticipant) {
      return [];
    }

    return (trip.participants || []).filter(
      (participant) => String(participant.id) === String(currentParticipant.id)
    );
  }, [trip, canViewTeamDashboard, currentParticipant]);

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
    return [...(trip.participants || []), ...rosterOnly];
  }, [trip, canViewTeamDashboard, currentParticipant]);

  const referenceReceivedProgress = useMemo(() => {
    if (!trip) {
      return {
        label: "References Received",
        percent: 0,
        completed: 0,
        total: 0,
      };
    }

    if (canViewTeamDashboard) {
      const total = referenceTableRows.length;
      const completed = referenceTableRows.filter(
        (row) => !!getReferenceStatus(row.refKey).received
      ).length;

      return {
        label: "References Received",
        percent: total ? Math.round((completed / total) * 100) : 0,
        completed,
        total,
      };
    }

    const received = currentParticipant
      ? !!getReferenceStatus(`user:${currentParticipant.id}`).received
      : false;

    return {
      label: "My Reference",
      percent: received ? 100 : 0,
      completed: received ? 1 : 0,
      total: 1,
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
  const tripFundraisingGoal = Number(trip?.fundraisingGoalAmount || 0);
  const fundraisingGoalAmount =
    !canViewTeamDashboard &&
    currentParticipant?.fundraisingGoalAmount != null &&
    Number(currentParticipant.fundraisingGoalAmount) > 0
      ? Number(currentParticipant.fundraisingGoalAmount)
      : tripFundraisingGoal;
  const fundraisingWorkerCount = Math.max(
    (trip?.participants || []).filter((participant) =>
      String(participant?.role || "").toLowerCase() === "worker"
    ).length || (trip?.participants || []).length,
    1
  );
  const useIndividualGoal =
    !canViewTeamDashboard &&
    currentParticipant?.fundraisingGoalAmount != null &&
    Number(currentParticipant.fundraisingGoalAmount) > 0;
  const countForDeadlines = useIndividualGoal ? 1 : fundraisingWorkerCount;
  const fundraisingFirstDeadlineAmount = Math.min(
    2000 * countForDeadlines,
    fundraisingGoalAmount || 2000 * countForDeadlines
  );
  const fundraisingSecondDeadlineTotalAmount = Math.max(
    (fundraisingGoalAmount || 0) - fundraisingFirstDeadlineAmount,
    0
  );
  const fundraisingSecondDeadlineAmount = fundraisingSecondDeadlineTotalAmount;
  const fundraisingFirstDeadlineDate = subtractDays(trip?.startDate, 90);
  const fundraisingSecondDeadlineDate = subtractDays(trip?.startDate, 30);
  const savedFundraisingLinksCount = (trip?.participants || []).filter(
    (participant) => !!participant.fundraisingUrl
  ).length;
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
  const overviewFundraisingLabel = trip?.teamFundraisingUrl
    ? "Team Fundraising"
    : canViewTeamDashboard
      ? "Fundraising Links"
      : "My Fundraising";
  const overviewFundraisingValue = fundraisingGoalAmount
    ? formatMoney(fundraisingGoalAmount)
    : trip?.teamFundraisingUrl
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
    : trip?.teamFundraisingUrl
      ? "Shared Neon page is ready for the full team."
      : canViewTeamDashboard
        ? `${savedFundraisingLinksCount} worker links saved.`
        : currentParticipant?.fundraisingUrl
        ? "Your personal Neon page is available."
        : "No personal Neon page added yet.";
  const smartsheetBudgetDoc = visibleDocs.find((doc) => doc.resourceKey === "smartsheet-budget");
  const flightsDoc = visibleDocs.find((doc) => doc.resourceKey === "flights");
  const siteInfoDoc = docs.find((doc) => doc.resourceKey === "site-info-link");
  const visibleSiteInfoDoc = visibleDocs.find((doc) => doc.resourceKey === "site-info-link");
  const autoSiteInfoLink = useMemo(() => {
    if (!trip?.location?.trim()) return "";
    if (canManageTrips && staffViewAllParticipants) {
      return resolveTripSiteLogisticsUrl(trip.location, siteBudgetNotesList) || "";
    }
    return (
      resolveSiteLogisticsUrl(resolveCanonicalSiteLabelForTrip(trip.location, [])) || ""
    );
  }, [
    trip?.location,
    siteBudgetNotesList,
    canManageTrips,
    staffViewAllParticipants,
  ]);
  const effectiveSiteInfoDoc = visibleSiteInfoDoc || (!siteInfoDoc && autoSiteInfoLink ? (
    autoSiteInfoLink
      ? {
          id: "auto-site-info-link",
          title: "Site Logistics",
          link: autoSiteInfoLink,
          pdfUrl: "",
          createdAt: "",
          updatedAt: "",
          isAutoGenerated: true,
          visibleToParticipants: true,
        }
      : null
  ) : null);
  const effectiveHousingLinkDoc = useMemo(() => {
    const saved = (docs || []).find((d) => d.resourceKey === "housing-accommodation-link");
    if (saved && (saved.link || saved.pdfUrl)) {
      return saved;
    }
    const raw = String(tripHousingLinkUrl || "").trim();
    if (!raw) return null;
    const link = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return {
      id: "auto-housing-accommodation-link",
      title: "Team housing",
      link,
      pdfUrl: "",
      createdAt: "",
      updatedAt: "",
      isAutoGenerated: true,
      visibleToParticipants: true,
    };
  }, [docs, tripHousingLinkUrl]);
  const effectiveRequiredDocumentSlots = useMemo(
    () =>
      requiredDocumentSlots.map((slot) => {
        if (slot.key === "site-info-link") {
          return { ...slot, resource: effectiveSiteInfoDoc };
        }
        if (slot.key === "housing-accommodation-link") {
          return { ...slot, resource: effectiveHousingLinkDoc };
        }
        return slot;
      }),
    [effectiveSiteInfoDoc, effectiveHousingLinkDoc, requiredDocumentSlots]
  );
  const viewerRequiredDocumentSlots = useMemo(
    () =>
      canViewTeamDashboard
        ? effectiveRequiredDocumentSlots
        : effectiveRequiredDocumentSlots.filter((slot) => !hiddenRequiredDocumentKeys.has(slot.key)),
    [canViewTeamDashboard, effectiveRequiredDocumentSlots, hiddenRequiredDocumentKeys]
  );
  const viewerMainRequiredDocumentSlots = useMemo(
    () => viewerRequiredDocumentSlots.filter((slot) => slot.key !== "site-info-link"),
    [viewerRequiredDocumentSlots]
  );
  const quickLinks = useMemo(() => {
    const links = [
      {
        label: "Canvas",
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
      url: smartsheetBudgetDoc?.link || smartsheetBudgetDoc?.pdfUrl || "",
      ready: !!(smartsheetBudgetDoc?.link || smartsheetBudgetDoc?.pdfUrl),
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
    canViewTeamDashboard,
    currentParticipant?.fundraisingUrl,
    effectiveHousingLinkDoc?.link,
    effectiveHousingLinkDoc?.pdfUrl,
    effectiveSiteInfoDoc?.link,
    effectiveSiteInfoDoc?.pdfUrl,
    smartsheetBudgetDoc?.link,
    smartsheetBudgetDoc?.pdfUrl,
    trainingAccessUrl,
    trip?.teamFundraisingUrl,
  ]);
  const visibleTaskParticipants = canViewTeamDashboard
    ? participantTaskProgress
    : currentParticipantProgress
      ? [currentParticipantProgress]
      : [];
  const groupedWorkerTasks = useMemo(
    () => groupWorkerTasks(trip?.tasks || []),
    [trip?.tasks]
  );
  const visibleTrainingParticipants = canViewTeamDashboard
    ? trainingProgress
    : currentTrainingProgress
      ? [currentTrainingProgress]
      : [];
  const overviewUpcomingTasks = useMemo(() => {
    if (!trip) return [];

    if (staffViewAllParticipants) {
      return (editableStaffTasks || [])
        .filter(
          (task) =>
            task.progress !== "Complete" &&
            isTaskAssignedToUser(task.assignedTo, session?.name || session?.email || "")
        )
        .sort((left, right) => {
          const leftDate = parseDateSafe(left.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
          const rightDate = parseDateSafe(right.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
          return leftDate - rightDate;
        })
        .slice(0, 5)
        .map((task) => {
          const st = findStaffTaskTemplate(task);
          return {
            id: task.id,
            title: task.taskName,
            dueDate: task.dueDate,
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
    const upcomingTasks = (trip.tasks || [])
      .filter((task) => !taskState[task.id])
      .map((task) => {
        const wt = findWorkerTaskTemplate(task);
        const section = getWorkerTaskSection(task);
        const isChecklistTask = task.id === "worker-task-checklist" || task.title === "Received and has reviewed Project Management Checklist";
        const isTicketsTask = task.id === "worker-task-tickets" || task.title === "Proofread my tickets";
        const isDocumentsTask = task.id === "worker-task-upload-passport" || task.id === "worker-task-upload-visa" || task.title === "Upload passport" || task.title === "Upload visa";
        const documentsTabUrl = trip?.id
          ? `/trips/${encodeURIComponent(trip.id)}?tab=documents`
          : null;
        const link = isChecklistTask
          ? (preferredTripResourceOpenUrl(effectiveSiteInfoDoc) || wt?.link)
          : isTicketsTask
            ? (flightsDoc?.link || flightsDoc?.pdfUrl || wt?.link)
            : isDocumentsTask
              ? documentsTabUrl
              : (wt?.link || null);
        return {
          id: task.id,
          title: task.title,
          dueDate: task.due,
          detail: hideSectionLabelTitles.includes(task.title) ? "" : section,
          destinationTab: "Tasks",
          destinationId: task.id,
          link: link || null,
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
    flightsDoc,
    session?.email,
    session?.name,
    trip,
  ]);

  const { upcomingMeetings, pastMeetings } = useMemo(() => {
    const now = Date.now();
    const upcoming = [];
    const past = [];
    for (const m of tripMeetings) {
      const t = new Date(m.scheduledAt).getTime();
      if (Number.isNaN(t)) continue;
      if (t >= now) upcoming.push(m);
      else past.push(m);
    }
    upcoming.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    past.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    return { upcomingMeetings: upcoming, pastMeetings: past };
  }, [tripMeetings]);

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
  const leaderExpandedTabs = [
    "Overview",
    "Team",
    tripTabTravelSafety,
    "Fundraising",
    "Training",
    "Tasks",
    tripDocumentsTabLabel,
    participantDocumentsTabLabel,
    "Travel Form",
  ];
  const tabs = (() => {
    if (isPreviewingParticipant) return workerTabList;
    if (canManageTrips && !isStaffPreviewingLeader) return managerExpandedTabs;
    if (effectiveIsLeader) return leaderExpandedTabs;
    return workerTabList;
  })();

  const travelFormTshirtSummary = useMemo(() => {
    return (travelFormResponses || [])
      .map((r) => {
        const name = [r.firstNamePassport, r.lastNamePassport]
          .filter(Boolean)
          .join(" ")
          .trim() || r.email || "Participant";
        const sz = String(r.tshirtSize || "").trim();
        if (!sz) return null;
        return `${name}: ${sz}`;
      })
      .filter(Boolean)
      .join("\n");
  }, [travelFormResponses]);

  const rosterParticipantCount = (trip?.participants || []).length;

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

  async function handleSaveMaterialsTab() {
    if (!trip?.id || !materialsDraft) return;
    try {
      setMaterialsSaveStatus("Saving...");
      const nw = materialsDraft.numWorkers;
      const numWorkersParsed =
        nw === "" || nw === null || nw === undefined
          ? null
          : Number.parseInt(String(nw), 10);
      await saveTripBudget(trip.id, {
        numWorkers: Number.isFinite(numWorkersParsed) ? numWorkersParsed : null,
        teamAccountant: materialsDraft.teamAccountant,
        tshirts: materialsDraft.tshirts,
        workbooks: materialsDraft.workbooks,
        materialsShipAddress: materialsDraft.materialsShipAddress,
        materialsTrackingNumber: materialsDraft.materialsTrackingNumber,
        materialsNotes: materialsDraft.materialsNotes,
      });
      const next = await getTripBudget(trip.id);
      setTripBudgetRow(next);
      setMaterialsSaveStatus("Saved.");
      showToast("Materials saved.", "success");
    } catch (e) {
      const msg = e.message || "Error saving.";
      setMaterialsSaveStatus(msg);
      showToast(msg, "error");
    }
  }

  function handleExportMaterialsExcel() {
    if (!trip?.id || !materialsDraft) return;
    try {
      const headers = [
        "Trip name",
        "Trip ID",
        "# of workers",
        "Current roster count",
        "Team accountant",
        "T-shirt sizes (housing budget)",
        "T-shirt sizes (travel forms)",
        "Workbooks (inventory)",
        "Ship-to address",
        "Tracking number",
        "Materials notes",
        "Housing budget last updated",
      ];
      const row = [
        trip.name || "",
        trip.id,
        materialsDraft.numWorkers ?? "",
        rosterParticipantCount,
        materialsDraft.teamAccountant || "",
        materialsDraft.tshirts || "",
        travelFormTshirtSummary || "",
        materialsDraft.workbooks || "",
        materialsDraft.materialsShipAddress || "",
        materialsDraft.materialsTrackingNumber || "",
        materialsDraft.materialsNotes || "",
        tripBudgetRow?.updatedAt
          ? new Date(tripBudgetRow.updatedAt).toLocaleString()
          : "",
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

  if (!router.isReady || !tripId) {
    return (
      <Shell>
        <div className="card pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Spinner size={40} />
          <div style={{ fontWeight: 900 }}>Loading...</div>
        </div>
      </Shell>
    );
  }

  if (!trip) {
    return (
      <Shell>
        <div className="card pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          {!tripLoadComplete && <Spinner size={40} />}
          <div style={{ fontWeight: 900 }}>
            {tripLoadComplete ? "Trip not found" : "Loading trip..."}
          </div>
          <div className="small">
            {tripLoadComplete
              ? "This trip could not be loaded for your current account."
              : "Fetching trip details."}
          </div>
        </div>
      </Shell>
    );
  }

  const pct = canViewTeamDashboard
    ? participantTaskPct
    : currentParticipantProgress?.percent || 0;
  const countdownSummary = getCountdownSummary(trip?.startDate);

  return (
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
      <div className="tripDetailPage">
        <nav className="breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: 12 }}>
          <Link href="/trips">Trips</Link>
          <span className="small" style={{ color: "var(--muted)", margin: "0 6px" }}>/</span>
          <span className="small" style={{ color: "var(--text)" }}>{trip.name}</span>
        </nav>
        <div className="tripDetailHero card pad">
          <div className="row tripPageHeader tripDetailHeroTop">
            <div className="tripPageHeaderTitle">
              <h1 className="h1" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
                <AppIcon name="spark" className="pageEyebrowIcon" />
                <span>{trip.name}</span>
              </h1>
              <div className="small">{trip.location} • {trip.dates}</div>
            </div>
            <div className="spacer" />
            {canManageTrips && (
              <div className="row tripPageHeaderActions" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {canManageTrips ? (
                  <button
                    className="btn btnDanger"
                    type="button"
                    onClick={openDeleteTripConfirm}
                  >
                    Delete Trip
                  </button>
                ) : null}
                <select
                  className="input tripPagePreviewSelect"
                  value={previewParticipantId}
                  onChange={(event) => setPreviewParticipantId(event.target.value)}
                  style={{ minWidth: 260 }}
                >
                  <option value="">Staff view (full)</option>
                  <option value={LEADER_PREVIEW_PARTICIPANT_ID}>Leader view (preview)</option>
                  <option value={WORKER_PREVIEW_PARTICIPANT_ID}>
                    Worker view — not on Hub yet
                  </option>
                  {(trip.participants || []).length > 0 ? (
                    <optgroup label="Worker view — choose roster member">
                      {(trip.participants || []).map((participant) => (
                        <option key={participant.id} value={participant.id}>
                          {participant.name}
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

          <div className="tripDetailProgressRow">
            <div className="tripDetailProgressBlock">
              <div className="small tripDetailProgressLabel">Trip completion</div>
              <div className="progress"><div style={{ width: `${pct}%` }} /></div>
              <div className="small tripDetailProgressNote">{pct}% complete</div>
            </div>
            <div className="tripDetailMiniCard">
              <div className="small tripDetailMiniLabel">Next countdown</div>
              <div className="tripDetailMiniValue">{countdownSummary.label}</div>
              <div className="small">{countdownSummary.detail}</div>
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
            gridColumn: "1 / -1",
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
              <textarea
                className="input"
                rows={3}
                value={announcementDraft}
                onChange={(event) => setAnnouncementDraft(event.target.value)}
                placeholder="Share an update the team should see."
              />
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
                {announcementStatus ? (
                  <div className="small" style={{ alignSelf: "center" }}>
                    {announcementStatus}
                  </div>
                ) : null}
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
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{announcement.message}</div>
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
              Updates from staff about this trip will appear here.
            </div>
          )}
        </div>
      </div>

      <div className="tabs tripPageTabs" style={{ marginBottom: 14 }}>
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

        {tab === "Overview" && (
          <div style={{ display: "grid", gap: 16 }}>
          <CollapsibleSection defaultOpen>
          <div className="cardSectionPill" style={{ marginBottom: 8 }}>
            Progress at a glance
          </div>
          <div className="small" style={{ marginBottom: 14, opacity: 0.88 }}>
            {staffViewAllParticipants
              ? "Task, training, fundraising, and reference completion."
              : canViewTeamDashboard
                ? "Task, training, and fundraising completion."
                : "Task, training, fundraising, and your reference status."}
          </div>
          <div
            className="tripOverviewStatsGrid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <div className="card pad">
              <div className="small" style={{ marginBottom: 8 }}>{overviewTaskLabel}</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{overviewTaskPct}%</div>
              <div className="progress" style={{ marginTop: 10 }}>
                <div style={{ width: `${overviewTaskPct}%` }} />
              </div>
              <div className="small" style={{ marginTop: 8 }}>
                {canViewTeamDashboard
                  ? "Combined completion across all participant task lists."
                  : "Your task completion progress for this trip."}
              </div>
            </div>

            {staffViewAllParticipants && (
              <div className="card pad">
                <div className="small" style={{ marginBottom: 8 }}>Staff Tasks</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{completionPct}%</div>
                <div className="progress" style={{ marginTop: 10 }}>
                  <div style={{ width: `${completionPct}%` }} />
                </div>
                <div className="small" style={{ marginTop: 8 }}>
                  {completedCount} of {totalCount} staff tasks marked complete.
                </div>
              </div>
            )}

            <div className="card pad">
              <div className="small" style={{ marginBottom: 8 }}>{overviewTrainingLabel}</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{overviewTrainingPct}%</div>
              <div className="progress" style={{ marginTop: 10 }}>
                <div style={{ width: `${overviewTrainingPct}%` }} />
              </div>
              <div className="small" style={{ marginTop: 8 }}>
                {canViewTeamDashboard
                  ? "Combined completion across all participant training checklists."
                  : "Your training completion progress for this trip."}
              </div>
            </div>

            <div className="card pad">
              <div className="small" style={{ marginBottom: 8 }}>{overviewFundraisingLabel}</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{overviewFundraisingValue}</div>
              <div className="small" style={{ marginTop: 8 }}>
                {overviewFundraisingDetail}
              </div>
            </div>

            {staffViewAllParticipants || !canViewTeamDashboard ? (
              <div className="card pad">
                <div className="small" style={{ marginBottom: 8 }}>{referenceReceivedProgress.label}</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{referenceReceivedProgress.percent}%</div>
                <div className="progress" style={{ marginTop: 10 }}>
                  <div style={{ width: `${referenceReceivedProgress.percent}%` }} />
                </div>
                <div className="small" style={{ marginTop: 8 }}>
                  {referenceReceivedProgress.completed} of {referenceReceivedProgress.total} received.
                </div>
              </div>
            ) : null}
          </div>
          </CollapsibleSection>

          {canViewTeamDashboard ? (
            <CollapsibleSection defaultOpen>
            <div
              className="card pad tripFullSpanCard"
              style={{ gridColumn: "1 / -1", border: "1px solid rgba(47,73,147,.12)" }}
            >
              <div className="cardSectionPill" style={{ marginBottom: 8 }}>Meetings</div>
              <div className="small" style={{ marginBottom: 12, color: "var(--muted)" }}>
                Upcoming and past meetings. Staff and trip leaders can schedule meetings and add notes afterward.
              </div>
              {canManageTripMeetings ? (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    marginBottom: 16,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "#fafafa",
                  }}
                >
                  <input
                    className="input"
                    placeholder="Title (optional)"
                    value={meetingDraft.title}
                    onChange={(e) => setMeetingDraft((d) => ({ ...d, title: e.target.value }))}
                  />
                  <input
                    className="input"
                    type="datetime-local"
                    value={meetingDraft.scheduledAt}
                    onChange={(e) => setMeetingDraft((d) => ({ ...d, scheduledAt: e.target.value }))}
                  />
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Notes after the meeting"
                    value={meetingDraft.notesAfter}
                    onChange={(e) => setMeetingDraft((d) => ({ ...d, notesAfter: e.target.value }))}
                  />
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="btn btnPrimary" onClick={() => void handleSaveTripMeeting()}>
                      {editingMeetingId ? "Update meeting" : "Add meeting"}
                    </button>
                    {editingMeetingId ? (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setEditingMeetingId("");
                          setMeetingDraft({ title: "", scheduledAt: "", notesAfter: "" });
                          setMeetingStatus("");
                        }}
                      >
                        Cancel edit
                      </button>
                    ) : null}
                  </div>
                  {meetingStatus ? <div className="small">{meetingStatus}</div> : null}
                </div>
              ) : null}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Upcoming</div>
                {upcomingMeetings.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {upcomingMeetings.map((m) => (
                      <li key={m.id} style={{ marginBottom: 10 }}>
                        <div style={{ fontWeight: 600 }}>{m.title || "Meeting"}</div>
                        <div className="small">{new Date(m.scheduledAt).toLocaleString()}</div>
                        {canManageTripMeetings ? (
                          <div className="row" style={{ gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => {
                                setEditingMeetingId(m.id);
                                setMeetingDraft({
                                  title: m.title,
                                  scheduledAt: toDatetimeLocalValue(m.scheduledAt),
                                  notesAfter: m.notesAfter || "",
                                });
                                setMeetingStatus("");
                              }}
                            >
                              Edit
                            </button>
                            {staffViewAllParticipants ? (
                              <button
                                type="button"
                                className="btn"
                                onClick={() => {
                                  if (typeof window !== "undefined" && !window.confirm("Remove this meeting?")) return;
                                  void deleteTripMeeting(m.id).then(() =>
                                    setTripMeetings((prev) => prev.filter((x) => x.id !== m.id))
                                  );
                                }}
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="small">No upcoming meetings.</div>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Past</div>
                {pastMeetings.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {pastMeetings.map((m) => (
                      <li key={m.id} style={{ marginBottom: 10 }}>
                        <div style={{ fontWeight: 600 }}>{m.title || "Meeting"}</div>
                        <div className="small">{new Date(m.scheduledAt).toLocaleString()}</div>
                        {m.notesAfter ? (
                          <div className="small" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>
                            {m.notesAfter}
                          </div>
                        ) : (
                          <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>
                            No notes yet.
                          </div>
                        )}
                        {canManageTripMeetings ? (
                          <div className="row" style={{ gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => {
                                setEditingMeetingId(m.id);
                                setMeetingDraft({
                                  title: m.title,
                                  scheduledAt: toDatetimeLocalValue(m.scheduledAt),
                                  notesAfter: m.notesAfter || "",
                                });
                                setMeetingStatus("");
                              }}
                            >
                              Edit
                            </button>
                            {staffViewAllParticipants ? (
                              <button
                                type="button"
                                className="btn"
                                onClick={() => {
                                  if (typeof window !== "undefined" && !window.confirm("Remove this meeting?")) return;
                                  void deleteTripMeeting(m.id).then(() =>
                                    setTripMeetings((prev) => prev.filter((x) => x.id !== m.id))
                                  );
                                }}
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="small">No past meetings.</div>
                )}
              </div>
            </div>
            </CollapsibleSection>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {staffViewAllParticipants && (
              <CollapsibleSection
                defaultOpen
                className="tripFullSpanCard"
                style={{ gridColumn: "1 / -1" }}
              >
              <div className="card pad tripFullSpanCard">
                <div className="cardSectionPill" style={{ marginBottom: 8 }}>Trip notes</div>
                <div className="small" style={{ marginBottom: 6, opacity: 0.88 }}>
                  Internal context for staff and leaders.
                </div>
                <div className="small" style={{ marginBottom: 10 }}>
                  Put obvious context here, like why the trip was archived or major team changes.
                </div>
                {!isEditingOverviewNote ? (
                  <button className="btn" type="button" onClick={handleStartOverviewNote}>
                    Add Note
                  </button>
                ) : null}
                {isEditingOverviewNote ? (
                  <>
                    <textarea
                      className="input"
                      rows={4}
                      value={overviewNoteDraft}
                      onChange={(event) => setOverviewNoteDraft(event.target.value)}
                      placeholder="Example: Archived because multiple workers dropped from the team."
                    />
                    <div className="row" style={{ marginTop: 10 }}>
                      <button
                        className="btn btnPrimary"
                        type="button"
                        onClick={handleSaveOverviewNote}
                      >
                        Save Note
                      </button>
                      <button className="btn" type="button" onClick={handleCancelOverviewNoteEdit}>
                        Cancel
                      </button>
                      {editingOverviewNoteId ? (
                        <button className="btn" type="button" onClick={handleDeleteOverviewNote}>
                          Delete
                        </button>
                      ) : null}
                      {overviewNoteStatus ? (
                        <div className="small" style={{ alignSelf: "center" }}>
                          {overviewNoteStatus}
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}
                <div style={{ display: "grid", gap: 12, marginTop: isEditingOverviewNote ? 14 : 12 }}>
                  {overviewNotes.map((note) => (
                    <div
                      key={note.id}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: "#f5f1ea",
                        border: "1px solid rgba(18, 16, 12, 0.08)",
                      }}
                    >
                      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{note.note}</div>
                      <div
                        className="small"
                        style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}
                      >
                        <span>
                          <strong>By:</strong>{" "}
                          {note.authorName || note.authorEmail || "Unknown user"}
                        </span>
                        {note.updatedAt ? (
                          <span>
                            <strong>Updated:</strong> {formatNoteTimestamp(note.updatedAt)}
                          </span>
                        ) : null}
                      </div>
                      <div className="row" style={{ marginTop: 10 }}>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => handleStartOverviewNote(note)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                  {!overviewNotes.length && !isEditingOverviewNote ? (
                    <div className="small">No notes yet.</div>
                  ) : null}
                </div>
              </div>
            </CollapsibleSection>
            )}

            {staffViewAllParticipants ? (
              <CollapsibleSection defaultOpen style={{ gridColumn: "1 / -1" }}>
                {renderTripSetupCard()}
              </CollapsibleSection>
            ) : null}

            <CollapsibleSection defaultOpen>
            <div className="card pad">
              <div className="cardSectionPill">
                {staffViewAllParticipants ? "My upcoming staff tasks" : "My upcoming tasks"}
              </div>
              <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
                Shortcuts to the next due items.
              </div>
              {overviewUpcomingTasks.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {overviewUpcomingTasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        paddingBottom: 10,
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {canViewTeamDashboard ? (
                        <button
                          type="button"
                          onClick={() => handleJumpToStaffTask(task.id)}
                          className="overviewTaskJumpButton"
                        >
                          {task.title}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleJumpToOverviewItem(task)}
                          className="overviewTaskJumpButton"
                        >
                          {task.title}
                        </button>
                      )}
                      <div className="small">
                        {task.detail ? `${task.detail} • ` : ""}
                        {task.dueDate
                          ? `Due ${formatSingleDate(task.dueDate)} • ${formatRelativeToTripStart(
                              task.dueDate,
                              trip?.startDate
                            )}`
                          : "Due when ready"}
                      </div>
                      {task.link ? (
                        <a
                          href={task.link}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="small"
                          style={{ display: "inline-block", marginTop: 4 }}
                        >
                          View details →
                        </a>
                      ) : null}
                      {task.details && !task.link ? (
                        <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>{task.details}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="small">
                  {canViewTeamDashboard
                    ? "No upcoming staff tasks assigned to you right now."
                    : "No upcoming worker tasks right now."}
                </div>
              )}
            </div>
            </CollapsibleSection>

            <CollapsibleSection defaultOpen>
            <div className="card pad">
              <div className="cardSectionPill">Quick links</div>
              <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
                Hand-picked resources for this trip.
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {quickLinks.map((link) => (
                  <div
                    key={link.label}
                    className="row"
                    style={{ justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{link.label}</div>
                    {link.ready ? (
                      <a className="btn btnPrimary" href={link.url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    ) : (
                      <button
                        className="btn"
                        type="button"
                        disabled
                        style={{ opacity: 0.6, cursor: "not-allowed" }}
                      >
                        Coming soon
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            </CollapsibleSection>

            {canViewTeamDashboard ? (
              <CollapsibleSection defaultOpen style={{ gridColumn: "1 / -1" }}>
              <div className="card pad">
                <div className="cardSectionPill">Recent activity</div>
                <div className="small" style={{ marginBottom: 10, opacity: 0.88 }}>
                  Latest updates on this trip.
                </div>
                <div className="row" style={{ marginBottom: 10 }}>
                  <div className="spacer" />
                  <Link href={`/trips/${encodeURIComponent(trip.id)}/activity`} className="small">
                    See more
                  </Link>
                </div>
                {recentActivityError ? (
                  <div className="small" style={{ color: "var(--danger)" }}>
                    {recentActivityError}
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {recentActivity.map((entry) => (
                      <div
                        key={entry.id}
                        style={{ paddingBottom: 10, borderBottom: "1px solid var(--border)" }}
                      >
                        <div style={{ lineHeight: 1.4 }}>{entry.message}</div>
                        <div className="small" style={{ marginTop: 4 }}>
                          {formatRecentActivityTimestamp(entry.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="small">No recent activity yet.</div>
                )}
              </div>
              </CollapsibleSection>
            ) : null}
          </div>
          </div>
        )}

      {tab === "Team" && (
        <div style={{ display: "grid", gap: 16 }}>
          <CollapsibleSection defaultOpen>
          <div className="card pad">
            <div className="cardSectionPill" style={{ marginBottom: 8 }}>Roster</div>
            <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
              Members, account status, invites, and shirt sizes.
            </div>
            <div className="row" style={{ marginBottom: 10, alignItems: "center" }}>
              <div className="spacer" />
              {workerAddStatus ? (
                <div className="small" style={{ alignSelf: "center", marginRight: 8 }}>
                  {workerAddStatus}
                </div>
              ) : null}
              {rosterStatus ? (
                <div className="small" style={{ alignSelf: "center", marginRight: 8 }}>
                  {rosterStatus}
                </div>
              ) : null}
              {staffViewAllParticipants && !isEditingRoster && !isAddingWorker ? (
                <>
                  <button className="btn" type="button" onClick={handleStartAddWorker}>
                    Add Worker
                  </button>
                  <button className="btn" type="button" onClick={handleStartRosterEdit}>
                    Edit Roster
                  </button>
                </>
              ) : null}
            </div>

            {staffViewAllParticipants && isAddingWorker ? (
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  padding: 12,
                  marginBottom: 12,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "#fff",
                }}
              >
                <div className="small">
                  Add a worker to this team with name and email. You can leave them unassigned or assign them to this trip now.
                </div>
                <div className="tripMobileFormGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  <input
                    className="input"
                    value={newWorkerDraft.firstName}
                    onChange={(event) => updateNewWorkerDraft("firstName", event.target.value)}
                    placeholder="First name"
                  />
                  <input
                    className="input"
                    value={newWorkerDraft.lastName}
                    onChange={(event) => updateNewWorkerDraft("lastName", event.target.value)}
                    placeholder="Last name"
                  />
                  <input
                    className="input"
                    type="email"
                    value={newWorkerDraft.email}
                    onChange={(event) => updateNewWorkerDraft("email", event.target.value)}
                    placeholder="worker@email.com"
                  />
                  <select
                    className="input"
                    value={newWorkerDraft.assignmentMode}
                    onChange={(event) => updateNewWorkerDraft("assignmentMode", event.target.value)}
                  >
                    <option value="unassigned">Leave Unassigned</option>
                    <option value="assigned">Assign To This Trip</option>
                  </select>
                </div>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btnPrimary" type="button" onClick={handleAddWorkerToTrip}>
                    Save Worker
                  </button>
                  <button className="btn" type="button" onClick={handleCancelAddWorker}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {staffViewAllParticipants && isEditingRoster ? (
              <div style={{ display: "grid", gap: 12 }}>
                {rosterDraft.map((member, index) => (
                  <div
                    key={member.id || `draft-${index}`}
                    className="tripMobileFormGrid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: 10,
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                      background: "#fff",
                    }}
                  >
                    <input
                      className="input"
                      value={member.firstName || ""}
                      placeholder="First name"
                      onChange={(event) => updateRosterDraftMember(index, "firstName", event.target.value)}
                    />
                    <input
                      className="input"
                      value={member.lastName || ""}
                      placeholder="Last name"
                      onChange={(event) => updateRosterDraftMember(index, "lastName", event.target.value)}
                    />
                    <input
                      className="input"
                      type="email"
                      value={member.email || ""}
                      placeholder="Email"
                      onChange={(event) => updateRosterDraftMember(index, "email", event.target.value)}
                    />
                    <input
                      className="input"
                      type="date"
                      value={member.startDate || ""}
                      onChange={(event) => updateRosterDraftMember(index, "startDate", event.target.value)}
                    />
                    <input
                      className="input"
                      type="date"
                      value={member.endDate || ""}
                      onChange={(event) => updateRosterDraftMember(index, "endDate", event.target.value)}
                    />
                    <button className="btn" type="button" onClick={() => handleRemoveRosterMember(index)}>
                      Remove
                    </button>
                  </div>
                ))}

                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <button className="btn" type="button" onClick={handleAddRosterMember}>
                    Add Worker
                  </button>
                  <button className="btn btnPrimary" type="button" onClick={handleSaveRoster}>
                    Save Roster
                  </button>
                  <button className="btn" type="button" onClick={handleCancelRosterEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Account</th>
                    <th>Email</th>
                    <th>Project Dates</th>
                    <th>T-shirt</th>
                    {staffViewAllParticipants ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {teamTabMembers.length > 0 ? (
                    teamTabMembers.map((member) => {
                      const connectionStatus = getWorkerConnectionStatus(member);
                      const travelFormRefKey = member.profileId
                        ? `user:${member.profileId}`
                        : member.id
                          ? `roster:${member.id}`
                          : "";
                      const travelForm = getTravelFormByRefKey(travelFormRefKey);
                      const tshirtSize = travelForm?.tshirtSize ?? "";
                      const canEditTshirt =
                        !!travelFormRefKey &&
                        (canViewTeamDashboard || String(member.profileId) === String(currentParticipant?.id));
                      const isSavingTshirt =
                        normalizeTravelFormRefKey(teamTabTshirtSavingUserId) ===
                        normalizeTravelFormRefKey(travelFormRefKey);

                      return (
                      <tr key={member.key}>
                        <td style={{ fontWeight: 800 }}>
                          {canViewTeamDashboard && member.profileId ? (
                            <Link href={`/profile?participantId=${encodeURIComponent(member.profileId)}`}>
                              {member.name}
                            </Link>
                          ) : (
                            member.name
                          )}
                        </td>
                        <td>{member.role || "Worker"}</td>
                        <td>
                          <span className={`badge ${connectionStatus.accountBadgeClass}`.trim()}>
                            {connectionStatus.accountLabel}
                          </span>
                        </td>
                        <td>{member.email || "Not set"}</td>
                        <td>{formatTripDateRange(member.startDate, member.endDate)}</td>
                        <td>
                          {canEditTshirt ? (
                            <span className="row" style={{ gap: 6, alignItems: "center" }}>
                              <select
                                className="input"
                                style={{ minWidth: 88 }}
                                value={tshirtSize}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setTravelFormResponses((prev) => {
                                    const has = prev.some(
                                      (f) =>
                                        normalizeTravelFormRefKey(travelFormRowToRefKey(f)) ===
                                        normalizeTravelFormRefKey(travelFormRefKey)
                                    );
                                    if (has) {
                                      return prev.map((f) =>
                                        normalizeTravelFormRefKey(travelFormRowToRefKey(f)) ===
                                        normalizeTravelFormRefKey(travelFormRefKey)
                                          ? { ...f, tshirtSize: v }
                                          : f
                                      );
                                    }
                                    return prev.concat([
                                      {
                                        ...TRAVEL_FORM_EMPTY,
                                        userId: member.profileId || "",
                                        tripTeamMemberId: member.profileId ? "" : member.id || "",
                                        tshirtSize: v,
                                      },
                                    ]);
                                  });
                                  void handleSaveTeamTabTshirt(travelFormRefKey, v);
                                }}
                                disabled={!!isSavingTshirt}
                              >
                                {getTshirtSizeOptions(tshirtSize).map((opt) => (
                                  <option key={opt || "__empty__"} value={opt}>
                                    {opt || "—"}
                                  </option>
                                ))}
                              </select>
                              {isSavingTshirt ? <span className="small" style={{ color: "var(--muted)" }}>Saving...</span> : null}
                            </span>
                          ) : (
                            <span style={tshirtSize ? undefined : { color: "var(--muted)" }}>{tshirtSize || "—"}</span>
                          )}
                        </td>
                        {staffViewAllParticipants ? (
                          <td>
                            <button
                              className="btn"
                              type="button"
                              onClick={() => void handleInviteWorker(member)}
                              disabled={!connectionStatus.canInvite || invitingWorkerEmail === normalizeEmail(member.email)}
                              title={connectionStatus.inviteTitle}
                              style={!connectionStatus.canInvite ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
                            >
                              {invitingWorkerEmail === normalizeEmail(member.email)
                                ? "Sending..."
                                : connectionStatus.inviteLabel}
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    )})
                  ) : (
                    <tr>
                      <td colSpan={staffViewAllParticipants ? 7 : 6} className="small">
                        No workers added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          </CollapsibleSection>

          {staffViewAllParticipants && (
            <CollapsibleSection defaultOpen>
            <div className="card pad tripSectionCard">
              <div className="cardSectionPill" style={{ marginBottom: 10 }}>Reference emails</div>
              <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
                Track reference contacts and sent/received status.
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Reference Contact</th>
                    <th>Reference Email Sent</th>
                    <th>Date Sent</th>
                    <th>Reference Email Received</th>
                  </tr>
                </thead>
                <tbody>
                  {referenceTableRows.map((refRow) => {
                    const referenceStatus = getReferenceStatus(refRow.refKey);
                    const referenceSaveStatus = referenceSaveStatusByKey[refRow.refKey];

                    return (
                      <tr key={refRow.refKey}>
                        <td style={{ fontWeight: 800 }}>
                          <div>{refRow.displayName}</div>
                          {referenceSaveStatus ? (
                            <div className="small" style={{ marginTop: 4 }}>
                              {referenceSaveStatus.type === "error" ? (
                                <span style={{ color: "var(--danger)" }}>
                                  {referenceSaveStatus.message}
                                </span>
                              ) : (
                                <span style={{ color: "var(--muted)" }}>
                                  {referenceSaveStatus.message}
                                </span>
                              )}
                              {referenceSaveStatus.type === "error" ? (
                                <button
                                  className="btn"
                                  type="button"
                                  style={{ marginLeft: 8, padding: "2px 8px", fontSize: 12 }}
                                  onClick={() => retryReferenceSave(refRow.refKey)}
                                >
                                  Retry
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                        <td style={{ minWidth: 260 }}>
                          <div style={{ display: "grid", gap: 8 }}>
                            <input
                              className="input"
                              value={referenceStatus.referenceName || ""}
                              placeholder="Reference name"
                              onChange={(e) =>
                                updateReferenceField(
                                  refRow.refKey,
                                  "referenceName",
                                  e.target.value
                                )
                              }
                            />
                            <input
                              className="input"
                              type="email"
                              value={referenceStatus.referenceEmail || ""}
                              placeholder="Reference email"
                              onChange={(e) =>
                                updateReferenceField(
                                  refRow.refKey,
                                  "referenceEmail",
                                  e.target.value
                                )
                              }
                            />
                            <input
                              className="input"
                              type="tel"
                              value={referenceStatus.referencePhone || ""}
                              placeholder="Reference phone"
                              onChange={(e) =>
                                updateReferenceField(
                                  refRow.refKey,
                                  "referencePhone",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </td>
                        <td>
                          <label
                            className="row"
                            style={{ gap: 8, alignItems: "center", cursor: "pointer" }}
                          >
                            <input
                              type="checkbox"
                              checked={!!referenceStatus.sent}
                              onChange={() =>
                                toggleReferenceEmail(refRow.refKey, "sent")
                              }
                            />
                            <span className={"badge " + (referenceStatus.sent ? "badgeSuccess" : "")}>
                              {referenceStatus.sent ? "Sent" : "Not sent"}
                            </span>
                          </label>
                        </td>
                        <td>
                          <input
                            className="input"
                            type="date"
                            value={referenceStatus.sentDate || ""}
                            onChange={(e) =>
                              updateReferenceSentDate(refRow.refKey, e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <label
                            className="row"
                            style={{ gap: 8, alignItems: "center", cursor: "pointer" }}
                          >
                            <input
                              type="checkbox"
                              checked={!!referenceStatus.received}
                              onChange={() =>
                                toggleReferenceEmail(refRow.refKey, "received")
                              }
                            />
                            <span
                              className={
                                "badge " + (referenceStatus.received ? "badgeSuccess" : "")
                              }
                            >
                              {referenceStatus.received ? "Received" : "Not received"}
                            </span>
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </CollapsibleSection>
          )}
        </div>
      )}

      {tab === tripTabTravelSafety && (
        <div style={{ display: "grid", gap: 16 }}>
          {trip?.id ? (
            <TripTravelSafetySection
              tripId={trip.id}
              session={session}
              participants={trip.participants || []}
              canEdit={staffViewAllParticipants && !isPreviewingParticipant}
              isPreviewingParticipant={isPreviewingParticipant}
            />
          ) : null}
        </div>
      )}

      {tab === "Fundraising" && (
        <div style={{ display: "grid", gap: 16 }}>
          <CollapsibleSection defaultOpen>
          <div className="cardSectionPill" style={{ marginBottom: 8 }}>Deadlines & resources</div>
          <div className="small" style={{ marginBottom: 14, opacity: 0.88 }}>
            Timeline amounts and general financial information.
          </div>
          <div
            className="fundraisingOverviewGrid"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 4fr) minmax(220px, 1fr)",
              gap: 16,
              alignItems: "stretch",
            }}
          >
            <div className="card pad tripSectionCard">
              <div className="cardSectionPill" style={{ marginBottom: 14 }}>Fundraising deadlines</div>
              <div className="small" style={{ marginBottom: 12 }}>
                These dates are automatically based on the trip start date.
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                <div
                  className="card pad"
                  style={{
                    boxShadow: "none",
                    background: "linear-gradient(180deg, rgba(255,244,223,.95), #ffffff 72%)",
                    borderColor: "rgba(249,157,42,.22)",
                  }}
                >
                  <div className="small" style={{ marginBottom: 6 }}>90 Days Before Trip</div>
                  <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: "-.03em" }}>
                    {formatMoney(fundraisingFirstDeadlineAmount)}
                  </div>
                  <div className="small" style={{ marginTop: 8 }}>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 17,
                        fontWeight: 800,
                        color: "var(--text)",
                      }}
                    >
                      Due by {formatDeadlineDate(fundraisingFirstDeadlineDate)}
                    </span>
                  </div>
                  <div className="small" style={{ marginTop: 8 }}>
                    {formatMoney(2000)} per worker for {fundraisingWorkerCount} worker{fundraisingWorkerCount === 1 ? "" : "s"}.
                  </div>
                </div>
                <div
                  className="card pad"
                  style={{
                    boxShadow: "none",
                    background: "linear-gradient(180deg, rgba(234,242,255,.95), #ffffff 72%)",
                    borderColor: "rgba(47,73,147,.18)",
                  }}
                >
                  <div className="small" style={{ marginBottom: 6 }}>30 Days Before Trip</div>
                  <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: "-.03em" }}>
                    {formatMoney(fundraisingSecondDeadlineAmount)}
                  </div>
                  <div className="small" style={{ marginTop: 8 }}>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 17,
                        fontWeight: 800,
                        color: "var(--text)",
                      }}
                    >
                      Due by {formatDeadlineDate(fundraisingSecondDeadlineDate)}
                    </span>
                  </div>
                  <div className="small" style={{ marginTop: 8 }}>
                    Remaining total amount due after the 90-day deadline.
                  </div>
                </div>
              </div>
              {fundraisingGoalAmount > 0 ? (
                <div className="small" style={{ marginTop: 12 }}>
                  Total needed for this trip: {formatMoney(fundraisingGoalAmount)}
                </div>
              ) : (
                <div className="small" style={{ marginTop: 12 }}>
                  Staff can set the total fundraising amount above.
                </div>
              )}
            </div>

            <div
              className="card pad"
              style={{
                background: "linear-gradient(180deg, rgba(234,242,255,.8), rgba(255,255,255,1) 72%)",
                borderColor: "rgba(47,73,147,.18)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div className="cardSectionPill" style={{ marginBottom: 14 }}>Resources</div>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>General Financial Information</div>
                <div className="small" style={{ marginBottom: 14 }}>
                  Quick access to the main fundraising and financial guidance for this team.
                </div>
              </div>
              <a
                className="btn btnPrimary"
                href={generalFinancialInformationUrl}
                target="_blank"
                rel="noreferrer"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Open Resource
              </a>
            </div>
          </div>
          </CollapsibleSection>

          <CollapsibleSection defaultOpen>
          <div className="card pad">
            <div className="cardSectionPill" style={{ marginBottom: 8 }}>
              {canViewTeamDashboard ? "Fundraising pages" : "My fundraising"}
            </div>
            <div className="small" style={{ marginBottom: 14, opacity: 0.88 }}>
              Team Neon link and per-participant pages.
            </div>

            {!canViewTeamDashboard && trip?.teamFundraisingUrl ? (
              <div
                className="card pad"
                style={{
                  boxShadow: "none",
                  marginBottom: 14,
                  background: "linear-gradient(180deg, rgba(234,242,255,.85), rgba(255,255,255,1) 65%)",
                  borderColor: "rgba(47,73,147,.22)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div className="cardSectionPill" style={{ marginBottom: 4 }}>Team Page</div>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>Shared Team Fundraising Page</div>
                <a
                  className="btn btnPrimary"
                  href={trip.teamFundraisingUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ padding: "10px 16px", fontSize: 14, alignSelf: "flex-start" }}
                >
                  Open Team Neon Page
                </a>
              </div>
            ) : null}

            {canViewTeamDashboard && trip?.teamFundraisingUrl && (
              <div
                className="card pad"
                style={{
                  boxShadow: "none",
                  marginBottom: 14,
                  background: "linear-gradient(180deg, rgba(234,242,255,.85), rgba(255,255,255,1) 65%)",
                  borderColor: "rgba(47,73,147,.22)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div className="cardSectionPill" style={{ marginBottom: 4 }}>Team Page</div>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Shared Team Fundraising Page</div>
                {!isEditingTeamFundraising ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {trip.teamFundraisingUrl ? (
                      <a className="btn" href={trip.teamFundraisingUrl} target="_blank" rel="noreferrer">
                        Open Team Neon Page
                      </a>
                    ) : (
                      <div className="small">No shared team Neon link added yet.</div>
                    )}
                    <div className="row">
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setIsEditingTeamFundraising(true);
                          setTeamFundraisingStatus("");
                        }}
                      >
                        {trip.teamFundraisingUrl ? "Edit Link" : "Add Link"}
                      </button>
                      {teamFundraisingStatus ? (
                        <div className="small" style={{ alignSelf: "center" }}>
                          {teamFundraisingStatus}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    <input
                      className="input"
                      value={teamFundraisingDraft.teamFundraisingUrl}
                      onChange={(event) =>
                        setTeamFundraisingDraft((current) => ({
                          ...current,
                          teamFundraisingUrl: event.target.value,
                        }))
                      }
                      placeholder="Shared team Neon link"
                    />
                    <div className="row">
                      <button className="btn btnPrimary" type="button" onClick={handleSaveTeamFundraising}>
                        Save Link
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setIsEditingTeamFundraising(false);
                          setTeamFundraisingStatus("");
                          setTeamFundraisingDraft({
                            teamFundraisingUrl: trip.teamFundraisingUrl || "",
                          });
                        }}
                      >
                        Cancel
                      </button>
                      {teamFundraisingStatus ? (
                        <div className="small" style={{ alignSelf: "center" }}>
                          {teamFundraisingStatus}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}

            {visibleFundraisingParticipants.length === 0 ? (
              <div className="small">No fundraising record found for this login.</div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: canViewTeamDashboard
                    ? "repeat(auto-fit, minmax(220px, 1fr))"
                    : "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: canViewTeamDashboard ? 16 : 12,
                }}
              >
                {visibleFundraisingParticipants.map((participant) => {
                  const isEditingParticipantLink =
                    editingParticipantFundraisingId === participant.id;
                  const fundraisingProgressMeta = getFundraisingProgressMeta(participant);
                  const canEditParticipantFundraising =
                    canViewTeamDashboard && !participant.rosterOnly;
                  return (
                    <div
                      key={participant.id || participant.email}
                      className="card pad"
                      style={{
                        boxShadow: "none",
                        minHeight: canViewTeamDashboard ? 220 : 136,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        background: "linear-gradient(180deg, rgba(234,242,255,.65), #ffffff 40%)",
                        borderColor: "rgba(47,73,147,.14)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: "0 auto auto 0",
                          width: "100%",
                          height: 5,
                          background: "linear-gradient(90deg, var(--primary), var(--primary2))",
                        }}
                      />
                      <div>
                        <div className="row" style={{ alignItems: "flex-start", marginBottom: 10 }}>
                          <div
                            style={{
                              fontWeight: 900,
                              fontSize: canViewTeamDashboard ? 18 : 15,
                              lineHeight: 1.2,
                            }}
                          >
                            {participant.name}
                          </div>
                          <div className="spacer" />
                          <span className={"badge " + fundraisingProgressMeta.badgeClass}>
                            {fundraisingProgressMeta.label}
                          </span>
                        </div>
                        <div className="small" style={{ marginBottom: 12 }}>
                          {fundraisingProgressMeta.helperText}
                        </div>
                      </div>
                      <div>
                        {participant.fundraisingUrl ? (
                          <a className="btn btnPrimary" href={participant.fundraisingUrl} target="_blank" rel="noreferrer">
                            Open Neon Page
                          </a>
                        ) : null}
                      </div>
                      {canEditParticipantFundraising && (
                        <>
                          <div style={{ height: 12 }} />
                          {!isEditingParticipantLink ? (
                            <div className="row">
                              <button
                                className="btn"
                                type="button"
                                onClick={() => {
                                  setEditingParticipantFundraisingId(participant.id);
                                  setFundraisingStatus((current) => ({
                                    ...current,
                                    [participant.id]: undefined,
                                  }));
                                }}
                              >
                                {participant.fundraisingUrl ? "Edit Link" : "Add Link"}
                              </button>
                              {fundraisingStatus[participant.id]?.message ? (
                                <div
                                  className="small"
                                  style={{
                                    alignSelf: "center",
                                    color:
                                      fundraisingStatus[participant.id].type === "error"
                                        ? "var(--danger)"
                                        : "var(--muted)",
                                  }}
                                >
                                  {fundraisingStatus[participant.id].message}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div style={{ display: "grid", gap: 10 }}>
                              <div>
                                <div className="small" style={{ marginBottom: 6 }}>Neon Fundraising Link</div>
                                <input
                                  className="input"
                                  value={fundraisingDrafts[participant.id]?.fundraisingUrl || ""}
                                  onChange={(event) =>
                                    updateFundraisingDraft(participant.id, "fundraisingUrl", event.target.value)
                                  }
                                  placeholder="https://"
                                />
                              </div>
                              {fundraisingStatus[participant.id]?.message && (
                                <div
                                  className="small"
                                  style={{
                                    color:
                                      fundraisingStatus[participant.id].type === "error"
                                        ? "var(--danger)"
                                        : "var(--muted)",
                                  }}
                                >
                                  {fundraisingStatus[participant.id].message}
                                </div>
                              )}
                              <div className="row">
                                <button
                                  className="btn"
                                  type="button"
                                  onClick={() => handleSaveFundraising(participant)}
                                >
                                  Save Neon Link
                                </button>
                                <button
                                  className="btn"
                                  type="button"
                                  onClick={() => {
                                    setEditingParticipantFundraisingId("");
                                    setFundraisingStatus((current) => ({
                                      ...current,
                                      [participant.id]: undefined,
                                    }));
                                    setFundraisingDrafts((current) => ({
                                      ...current,
                                      [participant.id]: {
                                        fundraisingUrl: participant.fundraisingUrl || "",
                                      },
                                    }));
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {canViewTeamDashboard && participant.rosterOnly ? (
                        <div className="small" style={{ marginTop: 12, color: "var(--muted)" }}>
                          Worker has not connected an account yet. Fundraising link can be added after signup.
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </CollapsibleSection>

        </div>
      )}

      {tab === "Training" && (
        <div style={{ display: "grid", gap: 16 }}>
          {canManageTrips && (
            <CollapsibleSection defaultOpen>
            <div className="card pad">
              <div className="cardSectionPill" style={{ marginBottom: 8 }}>Team training progress</div>
              <div className="small" style={{ marginBottom: 10, opacity: 0.88 }}>
                Overall completion across participants.
              </div>
              <div className="row" style={{ marginBottom: 10 }}>
                <div className="spacer" />
                <span className="badge">{trainingPct}% complete</span>
              </div>
              <div className="progress">
                <div style={{ width: `${trainingPct}%` }} />
              </div>
              <div className="small" style={{ marginTop: 8 }}>
                Overall completion across all participant training checklists.
              </div>
            </div>
            </CollapsibleSection>
          )}

          <CollapsibleSection defaultOpen>
          <div className="card pad">
            <div className="cardSectionPill" style={{ marginBottom: 8 }}>Training resources</div>
            <div className="small" style={{ marginBottom: 10, opacity: 0.88 }}>
              Required and optional links for this trip.
            </div>
            <p className="small">
              Central place for training links and module tracking.
            </p>

            <div style={{ height: 14 }} />

            <div
              className="tripTrainingResourceGrid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              {requiredTrainingResources.map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="card pad"
                  style={{
                    display: "block",
                    color: "inherit",
                    boxShadow: "none",
                    textDecoration: "none",
                    borderColor: "rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <div className="row" style={{ alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: resource.accent,
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 900,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {resource.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, marginBottom: 4 }}>{resource.title}</div>
                      <div className="small">{resource.description}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div style={{ height: 18 }} />

            <div className="small" style={{ fontWeight: 900, marginBottom: 8 }}>
              Advanced Training
            </div>

            <div
              className="tripTrainingOptionalGrid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {optionalTrainingResources.map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="card pad"
                  style={{
                    display: "block",
                    color: "inherit",
                    boxShadow: "none",
                    textDecoration: "none",
                    borderColor: "rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <div className="row" style={{ alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: resource.accent,
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 900,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {resource.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, marginBottom: 4 }}>{resource.title}</div>
                      <div className="small">{resource.description}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
          </CollapsibleSection>

          <CollapsibleSection defaultOpen>
          <div className="cardSectionPill" style={{ marginBottom: 8 }}>Module completion</div>
          <div className="small" style={{ marginBottom: 14, opacity: 0.88 }}>
            Canvas and supplemental modules per participant.
          </div>
          <div
            className="tripTrainingParticipantGrid"
            style={{
              display: "grid",
              gridTemplateColumns: canViewTeamDashboard
                ? "repeat(auto-fit, minmax(260px, 1fr))"
                : "1fr",
              gap: 16,
            }}
          >
            {visibleTrainingParticipants.map((participant) => {
              const trainingState = participant.trainingState || {};

              return (
                <div key={participant.email} className="card pad">
                  <div className="row" style={{ marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>
                        {canViewTeamDashboard ? participant.name : "My Training"}
                      </div>
                    </div>
                    <div className="spacer" />
                    <span className="badge">{participant.percent}% complete</span>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div className="small" style={{ fontWeight: 900, fontSize: 13, marginBottom: 8 }}>
                      Canvas Modules
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        background: "rgba(255,255,255,.78)",
                      }}
                    >
                      {canvasTrainingModules.map((module) => (
                        <div
                          key={`${participant.email}-${module.id}`}
                          id={
                            !canViewTeamDashboard &&
                            String(participant.id || "") === String(currentParticipant?.id || "")
                              ? buildTrainingModuleRowDomId(module.id)
                              : undefined
                          }
                          style={{
                            display: "grid",
                            gridTemplateColumns: "18px minmax(0, 1fr)",
                            gap: 10,
                            alignItems: "start",
                            paddingBottom: 8,
                            borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!trainingState[module.id]}
                            onChange={() => toggleTraining(module.id, participant.email)}
                            style={{ marginTop: 2 }}
                          />
                          <div>
                            <div
                              className="row"
                              style={{ alignItems: "center", justifyContent: "space-between", gap: 8 }}
                            >
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  lineHeight: 1.35,
                                }}
                              >
                                {module.title}
                              </div>
                              <span
                                className={
                                  "badge " +
                                  (!!trainingState[module.id] ? "badgeSuccess" : "badgeDanger")
                                }
                              >
                                {!!trainingState[module.id] ? "Completed" : "Not started"}
                              </span>
                            </div>
                            {module.deadlineDate ? (
                              <div className="small" style={{ marginTop: 4 }}>
                                {`Due: ${formatShortDate(module.deadlineDate)}`}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div className="small" style={{ fontWeight: 900, fontSize: 13, marginBottom: 8 }}>
                      Basic / Gateway / EndMeeting
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        background: "rgba(255,255,255,.78)",
                      }}
                    >
                      {supplementalTrainingModules.map((module) => (
                        <div
                          key={`${participant.email}-${module.id}`}
                          id={
                            !canViewTeamDashboard &&
                            String(participant.id || "") === String(currentParticipant?.id || "")
                              ? buildTrainingModuleRowDomId(module.id)
                              : undefined
                          }
                          style={{
                            display: "grid",
                            gridTemplateColumns: "18px minmax(0, 1fr)",
                            gap: 10,
                            alignItems: "start",
                            paddingBottom: 8,
                            borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!trainingState[module.id]}
                            onChange={() => toggleTraining(module.id, participant.email)}
                            style={{ marginTop: 2 }}
                          />
                          <div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                lineHeight: 1.35,
                                marginBottom: 6,
                              }}
                            >
                              {module.title}
                            </div>
                            {module.deadlineDate ? (
                              <div className="small" style={{ marginBottom: 6 }}>
                                {`Due: ${formatShortDate(module.deadlineDate)}`}
                              </div>
                            ) : null}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(0, 1fr) auto",
                                gap: 8,
                                alignItems: "center",
                              }}
                            >
                              <input
                                className="input"
                                type="date"
                                value={trainingState[`${module.id}Date`] || ""}
                                onChange={(e) =>
                                  updateTrainingDate(module.id, e.target.value, participant.email)
                                }
                                style={{ padding: "8px 10px", fontSize: 13 }}
                              />
                              <span
                                className={
                                  "badge " +
                                  (!!trainingState[module.id] ? "badgeSuccess" : "badgeDanger")
                                }
                              >
                                {!!trainingState[module.id] ? "Completed" : "Not started"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="small" style={{ marginTop: 12 }}>
            Training progress is loaded from Supabase for each assigned user.
          </div>
          </CollapsibleSection>
        </div>
      )}

      {tab === "Tasks" && (
        <div style={{ display: "grid", gap: 16 }}>
          {canManageTrips && (
            <CollapsibleSection defaultOpen>
            <div className="card pad tripSectionCard">
              <div className="cardSectionPill" style={{ marginBottom: 10 }}>Manage worker tasks</div>
              <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
                Add or edit tasks for this trip.
              </div>
              <div className="row">
                <div className="spacer" />
                <button
                  className="btn btnPrimary"
                  type="button"
                  onClick={() => setIsAddingTask((current) => !current)}
                >
                  {isAddingTask ? "Close" : "Add Task"}
                </button>
              </div>

              {isAddingTask && (
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  <input
                    className="input"
                    value={taskDraft.title}
                    onChange={(event) =>
                      setTaskDraft((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Task title"
                  />
                  <input
                    className="input"
                    type="date"
                    value={taskDraft.dueDate}
                    onChange={(event) =>
                      setTaskDraft((current) => ({ ...current, dueDate: event.target.value }))
                    }
                  />
                  <input
                    className="input"
                    value={taskDraft.category}
                    onChange={(event) =>
                      setTaskDraft((current) => ({ ...current, category: event.target.value }))
                    }
                    placeholder="Category"
                  />
                  <textarea
                    className="input"
                    value={taskDraft.description}
                    onChange={(event) =>
                      setTaskDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Description"
                    rows={3}
                  />
                  {taskStatusMessage && (
                    <div className="small" style={{ color: "var(--danger)" }}>
                      {taskStatusMessage}
                    </div>
                  )}
                  <div className="row">
                    <button className="btn btnPrimary" type="button" onClick={handleCreateTask}>
                      Save Task
                    </button>
                  </div>
                </div>
              )}
            </div>
            </CollapsibleSection>
          )}

            <CollapsibleSection defaultOpen>
            <div className="card pad tripSectionCard">
            <div className="cardSectionPill" style={{ marginBottom: 8 }}>Task progress</div>
            <div className="small" style={{ marginBottom: 10, opacity: 0.88 }}>
              Completion summary by participant.
            </div>
            <div className="row" style={{ marginBottom: 10 }}>
              <div className="spacer" />
              <span className="badge">{overviewTaskPct}% complete</span>
            </div>

            <div className="progress">
              <div style={{ width: `${overviewTaskPct}%` }} />
            </div>

            <div className="small" style={{ marginTop: 8 }}>
              {canViewTeamDashboard
                ? "Overall completion across all participant task lists."
                : "Your current task completion for this trip."}
            </div>

            <div
              className="tripTaskSummaryGrid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
                marginTop: 14,
              }}
            >
              {visibleTaskParticipants.map((participant) => (
                <div
                  key={`${participant.email}-summary`}
                  className="card pad"
                  style={{ boxShadow: "none", borderColor: "rgba(15, 23, 42, 0.08)" }}
                >
                  <div className="row" style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 900 }}>
                      {canViewTeamDashboard ? participant.name : "My Tasks"}
                    </div>
                    <div className="spacer" />
                    <span className="badge badgeSuccess">{participant.percent}%</span>
                  </div>
                  <div className="progress">
                    <div style={{ width: `${participant.percent}%` }} />
                  </div>
                  <div className="small" style={{ marginTop: 8 }}>
                    {participant.completed} of {participant.total} tasks complete.
                  </div>
                </div>
              ))}
            </div>
          </div>
          </CollapsibleSection>

          <CollapsibleSection defaultOpen>
          <div className="cardSectionPill" style={{ marginBottom: 8 }}>Checklists</div>
          <div className="small" style={{ marginBottom: 14, opacity: 0.88 }}>
            Worker tasks by section.
          </div>
          <div
            className="tripTaskParticipantGrid"
            style={{
              display: "grid",
              gridTemplateColumns: canViewTeamDashboard
                ? "repeat(auto-fit, minmax(260px, 1fr))"
                : "1fr",
              gap: 16,
            }}
          >
            {visibleTaskParticipants.map((participant) => {
              const taskState = participantTaskStates[participant.email] || {};

              return (
                <div key={participant.email} className="card pad">
                  <div className="row" style={{ marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>
                        {canViewTeamDashboard ? participant.name : "My Tasks"}
                      </div>
                    </div>
                    <div className="spacer" />
                    <span className="badge">{participant.percent}% complete</span>
                  </div>

                  {trip.tasks.length > 0 ? (
                    <div style={{ display: "grid", gap: 14 }}>
                      {groupedWorkerTasks.map(([section, sectionTasks]) => (
                        <div key={`${participant.email}-${section}`}>
                          <div className="small" style={{ fontWeight: 900, marginBottom: 8 }}>
                            {section}
                          </div>
                          <div style={{ display: "grid", gap: 0 }}>
                            {sectionTasks.map((task) => {
                              const done = !!taskState[task.id];
                              const isTravelFormTask = task.title === "Fill out Travel Form";
                              const canFillTravelForm = isTravelFormTask && String(participant.id) === String(currentParticipant?.id);
                              const workerTaskTemplate = findWorkerTaskTemplate(task);
                              const isChecklistTask = task.id === "worker-task-checklist" || task.title === "Received and has reviewed Project Management Checklist";
                              const isTicketsTask = task.id === "worker-task-tickets" || task.title === "Proofread my tickets";
                              const isDocumentsTask = task.id === "worker-task-upload-passport" || task.id === "worker-task-upload-visa" || task.title === "Upload passport" || task.title === "Upload visa";
                              const documentsTabUrl = trip?.id
          ? `/trips/${encodeURIComponent(trip.id)}?tab=documents`
          : null;
                              const participantRefKey = participant.rosterOnly
                                ? (String(participant.id || "").startsWith("roster-member-")
                                    ? `roster:${String(participant.id).slice("roster-member-".length)}`
                                    : "")
                                : `user:${participant.id}`;
                              const taskLink = isChecklistTask
                                ? (preferredTripResourceOpenUrl(effectiveSiteInfoDoc) || workerTaskTemplate?.link)
                                : isTicketsTask
                                  ? (flightsDoc?.link || flightsDoc?.pdfUrl || workerTaskTemplate?.link)
                                  : isDocumentsTask
                                    ? documentsTabUrl
                                    : workerTaskTemplate?.link;
                              const taskDetails = task.description || workerTaskTemplate?.details;

                              return (
                                <div
                                  key={`${participant.email}-${task.id}`}
                                  id={
                                    !canViewTeamDashboard &&
                                    String(participant.id || "") === String(currentParticipant?.id || "")
                                      ? buildWorkerTaskRowDomId(task.id)
                                      : undefined
                                  }
                                  className="row"
                                  style={{
                                    padding: "8px 0",
                                    borderBottom: "1px solid var(--border)",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={done}
                                    onChange={() => toggleTask(task.id, participant.email)}
                                    style={{ marginTop: 2 }}
                                  />
                                  <div style={{ flex: 1 }}>
                                  <div
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 400,
                                        lineHeight: 1.35,
                                        marginBottom: 4,
                                      }}
                                    >
                                      {task.title}
                                      {taskLink ? (
                                        <a
                                          href={taskLink}
                                          target="_blank"
                                          rel="noreferrer noopener"
                                          className="btn"
                                          style={{ marginLeft: 8, padding: "4px 10px", fontSize: 12 }}
                                        >
                                          View details
                                        </a>
                                      ) : null}
                                      {canFillTravelForm ? (
                                        <button
                                          type="button"
                                          className="btn"
                                          style={{ marginLeft: 10, padding: "4px 10px", fontSize: 12 }}
                                          onClick={() => openTravelFormModal({ refKey: `user:${participant.id}`, email: participant.email || "" })}
                                        >
                                          Fill out
                                        </button>
                                      ) : isTravelFormTask && canViewTeamDashboard && participantRefKey ? (
                                        <button
                                          type="button"
                                          className="btn"
                                          style={{ marginLeft: 10, padding: "4px 10px", fontSize: 12 }}
                                          onClick={() => openTravelFormModal({ refKey: participantRefKey, email: participant.email || "" })}
                                        >
                                          View / Edit
                                        </button>
                                      ) : null}
                                    </div>
                                    {canViewTeamDashboard ? (
                                      editingWorkerTaskDateId === task.id ? (
                                        <input
                                          className="input"
                                          type="date"
                                          autoFocus
                                          value={task.due || ""}
                                          onChange={(e) =>
                                            handleUpdateWorkerTaskDueDate(task.id, e.target.value)
                                          }
                                          onBlur={() => setEditingWorkerTaskDateId("")}
                                          style={{ padding: "7px 10px", fontSize: 13, maxWidth: 170 }}
                                        />
                                      ) : (
                                        <button
                                          type="button"
                                          className="staffTaskDateButton"
                                          onClick={() => setEditingWorkerTaskDateId(task.id)}
                                        >
                                          {task.due ? `Due: ${formatShortDate(task.due)}` : "Add due date"}
                                        </button>
                                      )
                                    ) : (
                                      <div className="small">
                                        {task.due ? `Due: ${formatShortDate(task.due)}` : "Due: Not set"}
                                      </div>
                                    )}
                                    {taskDetails ? (
                                      <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>
                                        {taskDetails}
                                      </div>
                                    ) : null}
                                  </div>
                                  <span className={"badge " + (done ? "badgeSuccess" : "badgeDanger")}>
                                    {done ? "Complete" : "Not started"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="small">No tasks for this trip yet.</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="small" style={{ marginTop: 12 }}>
            Task progress is loaded from Supabase for each assigned user.
          </div>
          </CollapsibleSection>
        </div>
      )}

      {tab === "Materials" && staffViewAllParticipants && (
        <div style={{ display: "grid", gap: 16 }}>
          {tripBudgetLoadError ? (
            <div className="card pad small" style={{ color: "var(--danger)" }}>
              {tripBudgetLoadError}
            </div>
          ) : null}
          {!materialsDraft ? (
            <div className="card pad" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Spinner size={32} />
              <span className="small">Loading housing budget…</span>
            </div>
          ) : (
            <>
              {canManageTrips ? (
                <div
                  className="card pad"
                  style={{
                    background: "linear-gradient(180deg, rgba(234,242,255,.97), #fff 55%)",
                    borderColor: "rgba(47,73,147,.28)",
                  }}
                >
                  <div
                    className="row"
                    style={{ alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}
                  >
                    <div className="cardSectionPill" style={{ marginBottom: 0 }}>
                      Site workbook plan (staff only)
                    </div>
                    {staffSiteWorkbookPlan?.hasHousingNote ? (
                      <span
                        className="small"
                        title="This site has a housing / logistics note on the Sites page"
                        style={{
                          fontWeight: 800,
                          color: "#b45309",
                          border: "1px solid rgba(180,83,9,.35)",
                          borderRadius: 8,
                          padding: "2px 8px",
                          background: "rgba(255,247,237,.9)",
                        }}
                      >
                        ! See{" "}
                        <Link href="/sites" style={{ fontWeight: 800 }}>
                          Sites
                        </Link>{" "}
                        → Site notes
                      </span>
                    ) : null}
                  </div>
                  <div className="small" style={{ color: "var(--muted)", marginBottom: 10 }}>
                    Pulled from the Sites page for this trip&apos;s location (
                    <strong>{tripSiteCanonicalLabel || trip.location || "—"}</strong>). Trip leaders and
                    workers do not see this block.
                  </div>
                  {staffSiteWorkbookPlan?.noLocation ? (
                    <div className="small">
                      Set this trip&apos;s <strong>location</strong> (trip setup) to match a site on
                      the Sites page so counts appear here.
                    </div>
                  ) : staffSiteWorkbookPlan?.empty ? (
                    <div className="small">
                      No workbook plan on file for <strong>{trip.location}</strong>. Add it under{" "}
                      <strong>Sites</strong> in the shell navigation.
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>
                        {staffSiteWorkbookPlan.distinctTitles} workbook title
                        {staffSiteWorkbookPlan.distinctTitles === 1 ? "" : "s"} to send ·{" "}
                        {staffSiteWorkbookPlan.totalCopies} total cop
                        {staffSiteWorkbookPlan.totalCopies === 1 ? "y" : "ies"}
                      </div>
                      <ul
                        className="small"
                        style={{ margin: 0, paddingLeft: 18, lineHeight: 1.65 }}
                      >
                        {staffSiteWorkbookPlan.positiveLines.map((line, idx) => (
                          <li key={`${line.name}-${idx}`}>
                            {line.name}: <strong>{line.qty}</strong>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : null}
              <CollapsibleSection defaultOpen>
                <div className="card pad" style={{ display: "grid", gap: 14 }}>
                  <div className="cardSectionPill" style={{ marginBottom: 4 }}>Team Hub — materials</div>
                  <div className="small" style={{ marginBottom: 10, color: "var(--muted)" }}>
                    Workbooks, sizes, accountant, and roster counts. Saved to the same housing budget row
                    as Budget → Housing.
                  </div>
                  <div
                    className="row"
                    style={{ alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}
                  >
                    <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                      <div className="small" style={{ marginBottom: 4, fontWeight: 700 }}>
                        Trip name
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>{trip.name || "—"}</div>
                    </div>
                    <div
                      className="row"
                      style={{
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                        marginLeft: "auto",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          void navigator.clipboard?.writeText(String(trip.name || ""));
                          showToast("Trip name copied", "success");
                        }}
                      >
                        Copy name
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => handleExportMaterialsExcel()}
                      >
                        Export Excel
                      </button>
                      <button
                        type="button"
                        className="btn btnPrimary"
                        onClick={() => void handleSaveMaterialsTab()}
                      >
                        Save
                      </button>
                      {materialsSaveStatus ? (
                        <span className="small" style={{ color: "var(--muted)" }}>
                          {materialsSaveStatus}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div>
                      <div className="small" style={{ marginBottom: 4, fontWeight: 700 }}>
                        # of workers
                      </div>
                      <input
                        className="input"
                        type="number"
                        style={{ width: 100 }}
                        value={materialsDraft.numWorkers ?? ""}
                        onChange={(e) =>
                          setMaterialsDraft((d) => ({ ...d, numWorkers: e.target.value }))
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        setMaterialsDraft((d) => ({ ...d, numWorkers: rosterParticipantCount }))
                      }
                      title="Set count from current roster"
                    >
                      Sync from roster ({rosterParticipantCount})
                    </button>
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 4, fontWeight: 700 }}>
                      Team accountant
                    </div>
                    <input
                      className="input"
                      value={materialsDraft.teamAccountant}
                      onChange={(e) =>
                        setMaterialsDraft((d) => ({ ...d, teamAccountant: e.target.value }))
                      }
                      placeholder="Name"
                      style={{ maxWidth: 360 }}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 4, fontWeight: 700 }}>
                      T-shirt sizes (housing budget)
                    </div>
                    <textarea
                      className="input"
                      rows={3}
                      value={materialsDraft.tshirts}
                      onChange={(e) =>
                        setMaterialsDraft((d) => ({ ...d, tshirts: e.target.value }))
                      }
                      placeholder="Team or roster notes; same field as Budget housing grid"
                    />
                  </div>
                  {travelFormTshirtSummary ? (
                    <div>
                      <div className="small" style={{ marginBottom: 4, fontWeight: 700 }}>
                        T-shirt sizes (travel forms)
                      </div>
                      <div
                        className="small"
                        style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}
                      >
                        {travelFormTshirtSummary}
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <div className="small" style={{ marginBottom: 4, fontWeight: 700 }}>
                      Workbooks (inventory string)
                    </div>
                    <textarea
                      className="input"
                      rows={4}
                      value={materialsDraft.workbooks}
                      onChange={(e) =>
                        setMaterialsDraft((d) => ({ ...d, workbooks: e.target.value }))
                      }
                      placeholder="e.g. 8-Reflection; 8-Origins; 4 Good News; …"
                    />
                  </div>
                  {tripBudgetRow?.updatedAt ? (
                    <div className="small" style={{ color: "var(--muted)" }}>
                      Housing budget last updated:{" "}
                      {new Date(tripBudgetRow.updatedAt).toLocaleString()}
                    </div>
                  ) : null}
                </div>
              </CollapsibleSection>
              <CollapsibleSection defaultOpen>
                <div className="card pad" style={{ display: "grid", gap: 12 }}>
                  <div className="cardSectionPill" style={{ marginBottom: 4 }}>Shipping</div>
                  <div className="small" style={{ marginBottom: 8, color: "var(--muted)" }}>
                    Ship-to if different from home; tracking when the box goes out.
                  </div>
                  <div
                    className="row"
                    style={{
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <button
                      type="button"
                      className="btn btnPrimary"
                      onClick={() => void handleSaveMaterialsTab()}
                    >
                      Save shipping
                    </button>
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 4, fontWeight: 700 }}>
                      Ship-to address
                    </div>
                    <div className="small" style={{ marginBottom: 6, color: "var(--muted)" }}>
                      Use when materials should go somewhere other than each worker’s address.
                    </div>
                    <textarea
                      className="input"
                      rows={3}
                      value={materialsDraft.materialsShipAddress}
                      onChange={(e) =>
                        setMaterialsDraft((d) => ({
                          ...d,
                          materialsShipAddress: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 4, fontWeight: 700 }}>
                      Tracking number
                    </div>
                    <input
                      className="input"
                      value={materialsDraft.materialsTrackingNumber}
                      onChange={(e) =>
                        setMaterialsDraft((d) => ({
                          ...d,
                          materialsTrackingNumber: e.target.value,
                        }))
                      }
                      placeholder="Carrier tracking #"
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 4, fontWeight: 700 }}>
                      Notes
                    </div>
                    <textarea
                      className="input"
                      rows={2}
                      value={materialsDraft.materialsNotes}
                      onChange={(e) =>
                        setMaterialsDraft((d) => ({ ...d, materialsNotes: e.target.value }))
                      }
                      placeholder="Internal notes"
                    />
                  </div>
                </div>
              </CollapsibleSection>
              {(effectiveSiteInfoDoc?.link || effectiveSiteInfoDoc?.pdfUrl) && (
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <a
                    className="btn btnPrimary"
                    href={preferredTripResourceOpenUrl(effectiveSiteInfoDoc)}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Open site logistics
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === tripDocumentsTabLabel && (
        <div style={{ display: "grid", gap: 16 }}>
          <CollapsibleSection defaultOpen>
          <div className="card pad">
            <div className="cardSectionPill" style={{ marginBottom: 8 }}>Documents & links</div>
            <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
              Trip-wide resources and visibility for participants.
            </div>
            <div
              className="row"
              style={{ marginBottom: 10, alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}
            >
              <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                <div className="small">
                  Default trip documents stay visible here, and staff can switch each document on or off for participants.
                </div>
              </div>
              {canViewTeamDashboard ? (
                <div
                  className="row"
                  style={{
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                    marginLeft: "auto",
                    justifyContent: "flex-end",
                  }}
                >
                  <button className="btn" type="button" onClick={handleAddLink}>
                    Add Link
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => addDocumentInputRef.current?.click()}
                  >
                    Upload File
                  </button>
                  <input
                    ref={addDocumentInputRef}
                    type="file"
                    hidden
                    onChange={handleAddDocument}
                  />
                </div>
              ) : null}
            </div>

            {docsError && (
              <div className="small" style={{ color: "var(--danger)", marginBottom: 12 }}>
                {docsError}
              </div>
            )}

            {isAddingLink && (
              <div
                className="card pad"
                style={{ boxShadow: "none", marginBottom: 14, background: "rgba(255,255,255,.7)" }}
              >
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
                  <input
                    className="input"
                    value={linkDraft.workArea}
                    onChange={(e) =>
                      setLinkDraft((prev) => ({ ...prev, workArea: e.target.value }))
                    }
                    placeholder="Notes / work area"
                  />
                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      padding: 10,
                      borderRadius: 12,
                      background: "rgba(15, 23, 42, 0.04)",
                    }}
                  >
                    <div className="small" style={{ fontWeight: 900 }}>
                      Tutorial
                    </div>
                    <input
                      className="input"
                      value={linkDraft.tutorialTitle || ""}
                      onChange={(e) =>
                        setLinkDraft((prev) => ({ ...prev, tutorialTitle: e.target.value }))
                      }
                      placeholder="Tutorial button label"
                    />
                    <input
                      className="input"
                      value={linkDraft.tutorialUrl || ""}
                      onChange={(e) =>
                        setLinkDraft((prev) => ({ ...prev, tutorialUrl: e.target.value }))
                      }
                      placeholder="Tutorial link https://..."
                    />
                    <input
                      className="input"
                      value={linkDraft.tutorialDescription || ""}
                      onChange={(e) =>
                        setLinkDraft((prev) => ({
                          ...prev,
                          tutorialDescription: e.target.value,
                        }))
                      }
                      placeholder="Tutorial description"
                    />
                  </div>
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
                  <div className="row">
                    <button className="btn btnPrimary" type="button" onClick={handleSaveLink}>
                      Save Link
                    </button>
                    <button className="btn" type="button" onClick={handleCancelAddLink}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {pendingPdfDraft && (
              <div
                className="card pad"
                style={{ boxShadow: "none", marginBottom: 14, background: "rgba(255,255,255,.7)" }}
              >
                <div style={{ fontWeight: 900, marginBottom: 10 }}>
                  {pendingPdfDraft.resourceKey ? "Required PDF" : "New PDF"}
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  <input
                    className="input"
                    value={pendingPdfDraft.title}
                    onChange={(e) =>
                      setPendingPdfDraft((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Document title"
                  />
                  <select
                    className="input"
                    value={pendingPdfDraft.category}
                    onChange={(e) =>
                      setPendingPdfDraft((prev) => ({ ...prev, category: e.target.value }))
                    }
                  >
                    {DOCUMENT_CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    value={pendingPdfDraft.workArea}
                    onChange={(e) =>
                      setPendingPdfDraft((prev) => ({ ...prev, workArea: e.target.value }))
                    }
                    placeholder="Notes / work area"
                  />
                  <input
                    type="file"
                    onChange={(e) =>
                      setPendingPdfDraft((prev) => ({ ...prev, file: e.target.files?.[0] || null }))
                    }
                  />
                  <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={pendingPdfDraft.visibleToParticipants !== false}
                      onChange={(e) =>
                        setPendingPdfDraft((prev) => ({
                          ...prev,
                          visibleToParticipants: e.target.checked,
                        }))
                      }
                    />
                    Visible to participants
                  </label>
                  <div className="small">
                    File: {pendingPdfDraft.file?.name || "Choose a file to upload"}
                  </div>
                  <div className="row">
                    <button
                      className="btn btnPrimary"
                      type="button"
                      onClick={handleSavePendingPdf}
                      disabled={!pendingPdfDraft.file}
                    >
                      Upload PDF
                    </button>
                    <button className="btn" type="button" onClick={handleCancelPendingPdf}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gap: 12 }}>
              {canViewTeamDashboard || !hiddenRequiredDocumentKeys.has("site-info-link") ? (
                <div
                  className="card pad"
                  style={{ boxShadow: "none", borderColor: "rgba(15, 23, 42, 0.08)" }}
                >
                  <div className="row" style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900 }}>Site Logistics</div>
                      <div className="small" style={{ marginTop: 4 }}>
                        Assigned site: {trip?.location || "No site selected yet"}
                      </div>
                      <div className="small" style={{ marginTop: 4 }}>
                        {effectiveSiteInfoDoc?.link || effectiveSiteInfoDoc?.pdfUrl
                          ? "This site name is linked automatically to its document."
                          : "No matching site logistics yet. Add a custom link or update the site name."}
                      </div>
                      {canViewTeamDashboard ? (
                        <div className="small" style={{ marginTop: 4 }}>
                          {siteInfoDoc
                            ? `Participants can ${siteInfoDoc.visibleToParticipants === false ? "not " : ""}see the saved site logistics.`
                            : "Auto-linked site docs start visible to participants until staff switches them off."}
                        </div>
                      ) : null}
                    </div>
                    <span
                      className={
                        "badge " +
                        ((effectiveSiteInfoDoc?.link || effectiveSiteInfoDoc?.pdfUrl)
                          ? "badgeSuccess"
                          : "badgeWarn")
                      }
                    >
                      {(effectiveSiteInfoDoc?.link || effectiveSiteInfoDoc?.pdfUrl)
                        ? "Site Matched"
                        : "Needs Link"}
                    </span>
                  </div>
                  {(effectiveSiteInfoDoc?.link || effectiveSiteInfoDoc?.pdfUrl) ? (
                    <div className="row" style={{ marginTop: 10 }}>
                      <a
                        className="btn btnPrimary"
                        href={preferredTripResourceOpenUrl(effectiveSiteInfoDoc)}
                        target="_blank"
                        rel="noreferrer"
                        style={siteLinkActionButtonStyle}
                      >
                        Open Site Logistics
                      </a>
                      {canViewTeamDashboard ? (
                        <button
                          className="btn"
                          type="button"
                          style={siteLinkActionButtonStyle}
                          onClick={() =>
                            handleToggleRequiredSlotVisibility(
                              {
                                key: "site-info-link",
                                title: "Site Logistics",
                                category: "Site",
                                kind: "link",
                                resource: effectiveSiteInfoDoc,
                              },
                              effectiveSiteInfoDoc.visibleToParticipants === false
                            )
                          }
                        >
                          {effectiveSiteInfoDoc.visibleToParticipants === false
                            ? "Make Visible To Participants"
                            : "Hide From Participants"}
                        </button>
                      ) : null}
                      {canViewTeamDashboard && siteInfoDoc ? (
                        <>
                          <button
                            className="btn"
                            type="button"
                            style={siteLinkActionButtonStyle}
                            onClick={() => handleEditDoc(siteInfoDoc)}
                          >
                            Edit Saved Link
                          </button>
                          <button
                            className="btn"
                            type="button"
                            style={siteLinkActionButtonStyle}
                            onClick={() => handleDeleteDoc(siteInfoDoc.id)}
                          >
                            Delete Custom Link
                          </button>
                        </>
                      ) : canViewTeamDashboard ? (
                        <button
                          className="btn"
                          type="button"
                          style={siteLinkActionButtonStyle}
                          onClick={() =>
                            handlePrepareRequiredLink({
                              key: "site-info-link",
                              title: "Site Logistics",
                              category: "Site",
                              resource: effectiveSiteInfoDoc,
                            })
                          }
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                  ) : canViewTeamDashboard ? (
                    <div className="row" style={{ marginTop: 10 }}>
                      <button
                        className="btn"
                        type="button"
                        style={siteLinkActionButtonStyle}
                        onClick={() =>
                          handlePrepareRequiredLink({
                            key: "site-info-link",
                            title: "Site Logistics",
                            category: "Site",
                            resource: effectiveSiteInfoDoc,
                          })
                        }
                      >
                        Add Site Logistics
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {viewerMainRequiredDocumentSlots.map((slot) => {
                const doc = slot.resource;
                const available = !!(doc?.pdfUrl || doc?.link);
                const isEditing = editingDocId === doc?.id;
                const isPdf = !!doc?.pdfUrl || slot.kind === "pdf";
                const isAutoGenerated = !!doc?.isAutoGenerated;

                return (
                  <div
                    key={slot.key}
                    className="card pad"
                    style={{ boxShadow: "none", borderColor: "rgba(15, 23, 42, 0.08)" }}
                  >
                    <div className="row" style={{ alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        {doc && isEditing ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <input
                              className="input"
                              value={docDraft?.title || ""}
                              onChange={(e) =>
                                setDocDraft((prev) => ({ ...prev, title: e.target.value }))
                              }
                              placeholder="Title"
                            />
                            <input
                              className="input"
                              value={docDraft?.link || ""}
                              onChange={(e) =>
                                setDocDraft((prev) => ({ ...prev, link: e.target.value }))
                              }
                              placeholder="https://..."
                              disabled={!!docDraft?.pdfUrl}
                            />
                            <select
                              className="input"
                              value={docDraft?.category || "Other"}
                              onChange={(e) =>
                                setDocDraft((prev) => ({ ...prev, category: e.target.value }))
                              }
                            >
                              {DOCUMENT_CATEGORY_OPTIONS.map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                            <input
                              className="input"
                              value={docDraft?.workArea || ""}
                              onChange={(e) =>
                                setDocDraft((prev) => ({ ...prev, workArea: e.target.value }))
                              }
                              placeholder="Notes / work area"
                            />
                            <div
                              style={{
                                display: "grid",
                                gap: 8,
                                padding: 10,
                                borderRadius: 12,
                                background: "rgba(15, 23, 42, 0.04)",
                              }}
                            >
                              <div className="small" style={{ fontWeight: 900 }}>
                                Tutorial
                              </div>
                              <input
                                className="input"
                                value={docDraft?.tutorialTitle || ""}
                                onChange={(e) =>
                                  setDocDraft((prev) => ({
                                    ...prev,
                                    tutorialTitle: e.target.value,
                                  }))
                                }
                                placeholder="Tutorial button label"
                              />
                              <input
                                className="input"
                                value={docDraft?.tutorialUrl || ""}
                                onChange={(e) =>
                                  setDocDraft((prev) => ({
                                    ...prev,
                                    tutorialUrl: e.target.value,
                                  }))
                                }
                                placeholder="Tutorial link https://..."
                              />
                              <input
                                className="input"
                                value={docDraft?.tutorialDescription || ""}
                                onChange={(e) =>
                                  setDocDraft((prev) => ({
                                    ...prev,
                                    tutorialDescription: e.target.value,
                                  }))
                                }
                                placeholder="Tutorial description"
                              />
                            </div>
                            <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <input
                                type="checkbox"
                                checked={docDraft?.visibleToParticipants !== false}
                                onChange={(e) =>
                                  setDocDraft((prev) => ({
                                    ...prev,
                                    visibleToParticipants: e.target.checked,
                                  }))
                                }
                              />
                              Visible to participants
                            </label>
                            {!!docDraft?.pdfUrl && (
                              <input type="file" onChange={handleReplaceDocumentFile} />
                            )}
                            <div className="row">
                              <button className="btn btnPrimary" type="button" onClick={handleSaveDoc}>
                                Save
                              </button>
                              <button className="btn" type="button" onClick={handleCancelEditDoc}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontWeight: 900 }}>{doc?.title || slot.title}</div>
                            <div className="small" style={{ marginTop: 4 }}>
                              {slot.category} • {slot.description}
                            </div>
                            {isAutoGenerated ? (
                              <div className="small" style={{ marginTop: 4 }}>
                                {slot.key === "housing-accommodation-link"
                                  ? "Auto-added from Budget → Housing for this team."
                                  : `Auto-added from assigned site: ${trip?.location || "Site"}`}
                              </div>
                            ) : doc?.createdAt ? (
                              <div className="small" style={{ marginTop: 4 }}>
                                Updated {new Date(doc.createdAt).toLocaleDateString()}
                              </div>
                            ) : (
                              <div className="small" style={{ marginTop: 4 }}>Coming soon</div>
                            )}
                            {canViewTeamDashboard && available ? (
                              <div className="small" style={{ marginTop: 4 }}>
                                {doc?.visibleToParticipants === false
                                  ? "Hidden from participants"
                                  : "Visible to participants"}
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                      <span className={"badge " + (available ? "badgeSuccess" : "badgeWarn")}>
                        {available ? (isAutoGenerated ? "Auto Link" : (isPdf ? "PDF Ready" : "Link Ready")) : "Coming Soon"}
                      </span>
                    </div>
                    <div className="row" style={{ marginTop: 10 }}>
                      {available ? (
                        <a className="btn btnPrimary" href={doc.pdfUrl || doc.link} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        <button className="btn" type="button" disabled style={{ opacity: 0.6, cursor: "not-allowed" }}>
                          Coming soon
                        </button>
                      )}
                      {canViewTeamDashboard && !isEditing && doc && !isAutoGenerated ? (
                        <>
                          <button className="btn" type="button" onClick={() => handleEditDoc(doc)}>
                            Edit
                          </button>
                          <button className="btn" type="button" onClick={() => handleDeleteDoc(doc.id)}>
                            Delete
                          </button>
                        </>
                      ) : null}
                      {canViewTeamDashboard && (!doc || isAutoGenerated) ? (
                        slot.kind === "pdf" ? (
                          <button className="btn" type="button" onClick={() => handlePrepareRequiredPdf(slot)}>
                            Upload PDF
                          </button>
                        ) : slot.key === "housing-accommodation-link" ? (
                          <Link href="/budget" className="btn">
                            Edit in Budget
                          </Link>
                        ) : (
                          <button className="btn" type="button" onClick={() => handlePrepareRequiredLink(slot)}>
                            {isAutoGenerated ? "Edit" : "Add Link"}
                          </button>
                        )
                      ) : null}
                      {canViewTeamDashboard && available ? (
                        <button
                          className="btn"
                          type="button"
                          onClick={() =>
                            handleToggleRequiredSlotVisibility(slot, doc?.visibleToParticipants === false)
                          }
                        >
                          {doc?.visibleToParticipants === false
                            ? "Make Visible To Participants"
                            : "Hide From Participants"}
                        </button>
                      ) : null}
                    </div>
                    {(() => {
                      const tutorial = getEffectiveTutorialContent(slot, doc);
                      if (!tutorial.tutorialUrl) return null;

                      return (
                      <div
                        style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: "1px solid rgba(15, 23, 42, 0.08)",
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div className="small" style={{ fontWeight: 900 }}>
                          Tutorial
                        </div>
                        <div className="small">
                          {tutorial.tutorialDescription || "Helpful walkthrough for this resource."}
                        </div>
                        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                          <a
                            className="btn"
                            href={tutorial.tutorialUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {tutorial.tutorialTitle || "Open Tutorial"}
                          </a>
                          {canViewTeamDashboard && slot.kind === "link" ? (
                            <button
                              className="btn"
                              type="button"
                              onClick={() => (doc && !isAutoGenerated ? handleEditDoc(doc) : handlePrepareRequiredLink(slot))}
                            >
                              Edit Tutorial
                            </button>
                          ) : null}
                        </div>
                      </div>
                      );
                    })()}
                  </div>
                );
              })}
              {optionalDocs.map((d) => {
                const available = !!(d.pdfUrl || d.link);
                const isEditing = editingDocId === d.id;
                const isPdf = !!d.pdfUrl;

                return (
                  <div
                    key={d.id}
                    className="card pad row"
                    style={{
                      boxShadow: "none",
                      borderColor: "rgba(15, 23, 42, 0.08)",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {isEditing ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          <input
                            className="input"
                            value={docDraft?.title || ""}
                            onChange={(e) =>
                              setDocDraft((prev) => ({ ...prev, title: e.target.value }))
                            }
                            placeholder="Title"
                          />
                          <input
                            className="input"
                            value={docDraft?.link || ""}
                            onChange={(e) =>
                              setDocDraft((prev) => ({ ...prev, link: e.target.value }))
                            }
                            placeholder="https://..."
                            disabled={!!docDraft?.pdfUrl}
                          />
                          <select
                            className="input"
                            value={docDraft?.category || "Other"}
                            onChange={(e) =>
                              setDocDraft((prev) => ({ ...prev, category: e.target.value }))
                            }
                          >
                            {DOCUMENT_CATEGORY_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <input
                            className="input"
                            value={docDraft?.workArea || ""}
                            onChange={(e) =>
                              setDocDraft((prev) => ({ ...prev, workArea: e.target.value }))
                            }
                            placeholder="Notes / work area"
                          />
                          <div
                            style={{
                              display: "grid",
                              gap: 8,
                              padding: 10,
                              borderRadius: 12,
                              background: "rgba(15, 23, 42, 0.04)",
                            }}
                          >
                            <div className="small" style={{ fontWeight: 900 }}>
                              Tutorial
                            </div>
                            <input
                              className="input"
                              value={docDraft?.tutorialTitle || ""}
                              onChange={(e) =>
                                setDocDraft((prev) => ({
                                  ...prev,
                                  tutorialTitle: e.target.value,
                                }))
                              }
                              placeholder="Tutorial button label"
                            />
                            <input
                              className="input"
                              value={docDraft?.tutorialUrl || ""}
                              onChange={(e) =>
                                setDocDraft((prev) => ({
                                  ...prev,
                                  tutorialUrl: e.target.value,
                                }))
                              }
                              placeholder="Tutorial link https://..."
                            />
                            <input
                              className="input"
                              value={docDraft?.tutorialDescription || ""}
                              onChange={(e) =>
                                setDocDraft((prev) => ({
                                  ...prev,
                                  tutorialDescription: e.target.value,
                                }))
                              }
                              placeholder="Tutorial description"
                            />
                          </div>
                          <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={docDraft?.visibleToParticipants !== false}
                              onChange={(e) =>
                                setDocDraft((prev) => ({
                                  ...prev,
                                  visibleToParticipants: e.target.checked,
                                }))
                              }
                            />
                            Visible to participants
                          </label>
                          {!!docDraft?.pdfUrl && (
                            <input type="file" onChange={handleReplaceDocumentFile} />
                          )}
                          <div className="row">
                            <button className="btn btnPrimary" type="button" onClick={handleSaveDoc}>
                              Save
                            </button>
                            <button className="btn" type="button" onClick={handleCancelEditDoc}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontWeight: 900 }}>{d.title}</div>
                          <div className="small" style={{ marginTop: 4 }}>
                            {isPdf ? "PDF" : "Link"}
                            {d.category ? ` • ${d.category}` : ""}
                            {d.workArea ? ` • ${d.workArea}` : ""}
                            {d.createdAt ? ` • ${new Date(d.createdAt).toLocaleDateString()}` : ""}
                          </div>
                          {canViewTeamDashboard ? (
                            <div className="small" style={{ marginTop: 4 }}>
                              {d.visibleToParticipants === false
                                ? "Hidden from participants"
                                : "Visible to participants"}
                            </div>
                          ) : null}
                        </>
                      )}
                      {canViewTeamDashboard && !isEditing ? (
                        <div className="row" style={{ marginTop: 10 }}>
                          <button className="btn" type="button" onClick={() => handleEditDoc(d)}>
                            Edit
                          </button>
                          <button className="btn" type="button" onClick={() => handleDeleteDoc(d.id)}>
                            Delete
                          </button>
                          <button
                            className="btn"
                            type="button"
                            onClick={() =>
                              handleToggleDocVisibility(d, d.visibleToParticipants === false)
                            }
                          >
                            {d.visibleToParticipants === false
                              ? "Make Visible To Participants"
                              : "Hide From Participants"}
                          </button>
                        </div>
                      ) : null}
                      {d.tutorialUrl ? (
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: "1px solid rgba(15, 23, 42, 0.08)",
                            display: "grid",
                            gap: 8,
                          }}
                        >
                          <div className="small" style={{ fontWeight: 900 }}>
                            Tutorial
                          </div>
                          <div className="small">
                            {d.tutorialDescription || "Helpful walkthrough for this resource."}
                          </div>
                          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                            <a
                              className="btn"
                              href={d.tutorialUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {d.tutorialTitle || "Open Tutorial"}
                            </a>
                            {canViewTeamDashboard ? (
                              <button className="btn" type="button" onClick={() => handleEditDoc(d)}>
                                Edit Tutorial
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <span className={"badge " + (available ? "badgeSuccess" : "badgeWarn")}>
                      {available ? (isPdf ? "PDF Ready" : "Link Ready") : "Coming Soon"}
                    </span>

                    {available ? (
                      <a className="btn btnPrimary" href={d.pdfUrl || d.link} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    ) : (
                      <button className="btn" type="button" disabled style={{ opacity: 0.6, cursor: "not-allowed" }}>
                        Coming soon
                      </button>
                    )}
                  </div>
                );
              })}
              {optionalDocs.length === 0 ? (
                <div className="small">No extra documents yet.</div>
              ) : null}
            </div>
          </div>
          </CollapsibleSection>
        </div>
      )}
      {tab === participantDocumentsTabLabel && (
        <div style={{ display: "grid", gap: 16 }}>
          <CollapsibleSection defaultOpen>
          <div className="card pad">
            <div className="cardSectionPill" style={{ marginBottom: 8 }}>
              {canViewTeamDashboard ? "Worker uploads" : "My documents"}
            </div>
            <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
              {canViewTeamDashboard
                ? "Per-participant uploads and review."
                : "Your uploads for this trip."}
            </div>
            <div className="row" style={{ marginBottom: 10 }}>
              <div className="spacer" />
              {canViewTeamDashboard ? (
                <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                  <div className="row" style={{ gap: 8 }}>
                    <input
                      className="input"
                      value={customParticipantDocumentLabel}
                      onChange={(event) => setCustomParticipantDocumentLabel(event.target.value)}
                      placeholder="Add upload item"
                      style={{ minWidth: 220 }}
                    />
                    <button className="btn" type="button" onClick={handleAddParticipantDocumentType}>
                      Add Upload
                    </button>
                  </div>
                  {participantDocumentTypeStatus ? (
                    <div className="small">{participantDocumentTypeStatus}</div>
                  ) : null}
                </div>
              ) : (
                <div className="small">
                  Upload your documents here. Staff can review them from your profile later too.
                </div>
              )}
            </div>

            {participantDocumentsError ? (
              <div className="small" style={{ color: "var(--danger)", marginBottom: 12 }}>
                {participantDocumentsError}
              </div>
            ) : null}

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

                return (
                  <div key={participant.id} className="card pad" style={{ boxShadow: "none" }}>
                    <div className="row" style={{ marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>
                          {canViewTeamDashboard && !participant.rosterOnly ? (
                            <Link href={`/profile?participantId=${encodeURIComponent(participant.id)}`}>
                              {participant.name}
                            </Link>
                          ) : (
                            canViewTeamDashboard ? participant.name : "My Uploads"
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                      {tripUserDocumentTypes.map((documentType) => {
                        const document = documentSlots[documentType.key] || null;
                        const statusKey = `${participant.id}:${documentType.key}`;
                        const slotStatus = participantDocumentStatus[statusKey];

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
                              ) : (
                                <button
                                  className="btn"
                                  type="button"
                                  disabled
                                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                                >
                                  Coming soon
                                </button>
                              )}

                              {canUploadOwnParticipantDocuments && String(participant.id) === String(currentParticipant?.id) ? (
                                <>
                                  <button
                                    className="btn"
                                    type="button"
                                    onClick={() => participantDocumentInputRefs.current[statusKey]?.click()}
                                  >
                                    {document ? "Replace" : "Upload"}
                                  </button>
                                  <input
                                    ref={(element) => {
                                      participantDocumentInputRefs.current[statusKey] = element;
                                    }}
                                    type="file"
                                    hidden
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];
                                      void handleUploadParticipantDocument(participant.id, documentType.key, file);
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
                                <div
                                  className="small"
                                  style={{
                                    alignSelf: "center",
                                    color:
                                      slotStatus.type === "error"
                                        ? "var(--danger)"
                                        : "var(--muted)",
                                  }}
                                >
                                  {slotStatus.message}
                                </div>
                              ) : null}
                              {canViewTeamDashboard && participant.rosterOnly ? (
                                <div className="small" style={{ color: "var(--muted)", alignSelf: "center" }}>
                                  Waiting for worker account before upload.
                                </div>
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
      )}

      {tab === "Travel Form" && (
        <div style={{ display: "grid", gap: 16 }}>
          <CollapsibleSection defaultOpen>
          <div className="card pad" style={{ overflowX: "auto" }}>
            <div className="cardSectionPill" style={{ marginBottom: 8 }}>Travel form responses</div>
            <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
              Passport, emergency contacts, and travel preferences.
            </div>
            <div
              className="row"
              style={{
                marginBottom: 12,
                alignItems: "flex-start",
                gap: 12,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <div className="small" style={{ flex: "1 1 280px", minWidth: 0, marginRight: "auto" }}>
                {canViewTeamDashboard
                  ? "Team travel form responses. Rows auto-generate as workers fill out the form from the Tasks tab."
                  : "Your travel form response. Fill out or update from the Tasks tab (Fill out Travel Form) or edit below."}
              </div>
              {!staffViewAllParticipants && currentParticipant ? (
                <button
                  type="button"
                  className="btn btnPrimary"
                  onClick={() =>
                    openTravelFormModal({
                      refKey: `user:${currentParticipant.id}`,
                      email: currentParticipant.email || "",
                    })
                  }
                >
                  Edit my response
                </button>
              ) : null}
              {canViewTeamDashboard ? (
                <>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  if (!trip) return;
                  const header = [
                    "Team Name",
                    "First Name (as it appears on your passport)",
                    "Middle Name (as it appears on your passport)",
                    "Last Name (as it appears on your passport)",
                    "Suffix",
                    "Your Email Address",
                    "Birthdate-Month",
                    "Birthdate-Day",
                    "Birthdate-Year",
                    "Gender",
                    "Citizenship",
                    "Passport Number",
                    "Passport Expiration Date (month/day/year)",
                    "Issuing Country",
                    "Special travel preferences\nPreferences may include leaving for your project early to do personal travel, staying after your project to do personal travel, flying a specific airline, needing extra time during layovers, using miles to purchase a ticket, asking LST to purchase tickets which you will then upgrade, flying home to a different city than you left from, etc..  If your preference increases the cost of the Base Ticket LST will ask you to pay the difference at the time of ticketing.\n\nRESPOND with details or \"\"NONE\"\"",
                    "Frequent Flyer numbers or Known Pre-check number",
                    "Site of LST Project (city AND country)",
                    "GATEWAY CITY-Subject to LST approval, I want to leave from the following Gateway City as our project departure point (typically this is the city nearest to you with an international airport):",
                    "Official Project Dates: DEPARTURE DATE-Please enter the date your team will depart for your project (as approved by LST).  If you plan on traveling to your site early, you may indicate that in the \"Special Travel Preferences\" field. The date you enter here, however, should be the official departure date for the project were you not doing any extra travel.",
                    "Official Project Dates: RETURN DATE-Please enter the date you must arrive back home (as approved by LST).  If you plan on doing personal travel after your project, you may indicate that in the \"Special Travel Preferences\" field.  The date you enter here, however, should be the official return date for the project were you not doing any extra travel.",
                    "T-shirt Size",
                    "Emergency Contact Name",
                    "Emergency Contact Email",
                    "Emergency Contact Phone",
                    "Are you a minor (under 18 yrs old)?\n\nRESPOND \"\"YES\"\" or \"\"NO\"\"",
                    "Passport good for at least six months AFTER your LST trip ends?\n\nRESPOND \"\"YES\"\" or \"\"NO\"\"",
                    "Base Ticket -I understand that LST will book my travel from a Gateway City to my site, and back to that same Gateway City.  I understand I will need to get to the Gateway City at my own expense.\n\n(RESPOND \"\"YES\"\")",
                    "Team Travel-I understand that my entire team must arrive at our site on the same day, at the same airport, and at approximately the same time.\n\n(RESPOND \"\"YES\"\")",
                    "EndMeeting-I understand that all LST teams participate in a period of debriefing as their project ends and that this EndMeeting for church teams normally takes place within a week of my arrival back home.\n\n(RESPOND \"\"YES\"\")",
                    "Travel Insurance-I understand LST will purchase a basic international travel insurance plan and that you can upgrade by calling the company directly after receiving your card from LST. (www.faithventures.com/compare-plans)\n\n(RESPOND \"\"YES\"\")",
                  ];

                  const exportRows = canViewTeamDashboard
                    ? travelFormTableRows
                    : currentParticipant
                      ? [{ ...currentParticipant, refKey: `user:${currentParticipant.id}` }]
                      : [];

                  const rows = exportRows.map((p) => {
                    const form = getTravelFormByRefKey(p.refKey) || null;

                    return [
                      form?.teamName || trip?.name || "",
                      form?.firstNamePassport || "",
                      form?.middleNamePassport || "",
                      form?.lastNamePassport || "",
                      form?.suffix || "",
                      form?.email || p?.email || "",
                      form?.birthdateMonth || "",
                      form?.birthdateDay || "",
                      form?.birthdateYear || "",
                      form?.gender || "",
                      form?.citizenship || "",
                      form?.passportNumber || "",
                      form?.passportExpirationDate || "",
                      form?.passportIssuingCountry || "",
                      form?.specialTravelPreferences || "",
                      form?.frequentFlyerPrecheck || "",
                      form?.siteProject || "",
                      form?.gatewayCity || "",
                      form?.departureDate || "",
                      form?.returnDate || "",
                      form?.tshirtSize || "",
                      form?.emergencyContactName || "",
                      form?.emergencyContactEmail || "",
                      form?.emergencyContactPhone || "",
                      form?.isMinor || "",
                      form?.passportValidSixMonths || "",
                      form?.baseTicketAck || "",
                      form?.teamTravelAck || "",
                      form?.endMeetingAck || "",
                      form?.travelInsuranceAck || "",
                    ];
                  });

                  const csvContent = [header, ...rows]
                    .map((cols) =>
                      cols
                        .map((val) => {
                          const s = String(val ?? "");
                          if (/[",\n]/.test(s)) {
                            return `"${s.replace(/"/g, '""')}"`;
                          }
                          return s;
                        })
                        .join(",")
                    )
                    .join("\n");

                  const blob = new Blob([csvContent], {
                    type: "text/csv;charset=utf-8;",
                  });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  const safeTripName = String(trip.name || "trip")
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "");
                  link.download = `${safeTripName || "trip"}-travel-form-responses.csv`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  showToast(`Exported ${safeTripName || "trip"}-travel-form-responses.csv`);
                }}
              >
                Export CSV
              </button>
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  if (!trip) return;
                  try {
                    const res = await fetch(TRAVEL_FORM_TEMPLATE_PATH);
                    if (!res.ok) {
                      const msg = "Travel agency template not found. Add travel-form-export.xlsx to public/templates/.";
                      setSubmitError(msg);
                      showToast(msg, "error");
                      return;
                    }
                    const ab = await res.arrayBuffer();
                    const exportParticipants = canViewTeamDashboard
                      ? travelFormTableRows
                      : currentParticipant
                        ? [{ ...currentParticipant, refKey: `user:${currentParticipant.id}` }]
                        : [];
                    const { blob, error } = fillTravelFormExportTemplate(ab, {
                      participants: exportParticipants,
                      travelFormResponses,
                      trip,
                    });
                    if (error) {
                      const msg = String(error);
                      setSubmitError(msg);
                      showToast(msg, "error");
                      return;
                    }
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    const safeTripName = String(trip.name || "trip")
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, "");
                    const dateStr = new Date().toISOString().slice(0, 10);
                    link.download = `${safeTripName}-travel-agency-${dateStr}.xlsx`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    showToast(`Exported ${safeTripName}-travel-agency-${dateStr}.xlsx`);
                  } catch (e) {
                    const msg = e?.message || "Export failed.";
                    setSubmitError(msg);
                    showToast(msg, "error");
                  }
                }}
              >
                Export for travel agency (Excel)
              </button>
                </>
              ) : null}
            </div>
            <table className="table" style={{ minWidth: 2400, fontSize: 12 }}>
              <thead>
                <tr>
                  {canViewTeamDashboard && <th>Actions</th>}
                  <th>Team Name</th>
                  <th>First Name (passport)</th>
                  <th>Middle Name (passport)</th>
                  <th>Last Name (passport)</th>
                  <th>Suffix</th>
                  <th>Email</th>
                  <th>Birthdate (M/D/Y)</th>
                  <th>Gender</th>
                  <th>Citizenship</th>
                  <th>Passport Number</th>
                  <th>Passport Expiration</th>
                  <th>Issuing Country</th>
                  <th>Special Travel Preferences</th>
                  <th>Frequent Flyer / Pre-check</th>
                  <th>Site (city &amp; country)</th>
                  <th>Gateway City</th>
                  <th>Departure Date</th>
                  <th>Return Date</th>
                  <th>T-shirt Size</th>
                  <th>Emergency Contact Name</th>
                  <th>Emergency Contact Email</th>
                  <th>Emergency Contact Phone</th>
                  <th>Minor?</th>
                  <th>Passport 6mo valid?</th>
                  <th>Base Ticket Ack</th>
                  <th>Team Travel Ack</th>
                  <th>EndMeeting Ack</th>
                  <th>Travel Insurance Ack</th>
                </tr>
              </thead>
              <tbody>
                {(canViewTeamDashboard
                  ? travelFormTableRows
                  : currentParticipant
                    ? [{ ...currentParticipant, refKey: `user:${currentParticipant.id}` }]
                    : []
                ).map((p) => {
                  const form = getTravelFormByRefKey(p.refKey) || null;
                  return (
                    <tr key={p.refKey || p.id}>
                      {canViewTeamDashboard && (
                        <td>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: "4px 10px", fontSize: 12 }}
                            onClick={() => openTravelFormModal({ refKey: p.refKey, email: p.email || "" })}
                          >
                            View / Edit
                          </button>
                        </td>
                      )}
                      <td>{form?.teamName || trip?.name || ""}</td>
                      <td>{form?.firstNamePassport || ""}</td>
                      <td>{form?.middleNamePassport || ""}</td>
                      <td>{form?.lastNamePassport || ""}</td>
                      <td>{form?.suffix || ""}</td>
                      <td>{form?.email || p?.email || ""}</td>
                      <td>{[form?.birthdateMonth, form?.birthdateDay, form?.birthdateYear].filter(Boolean).join("/") || ""}</td>
                      <td>{form?.gender || ""}</td>
                      <td>{form?.citizenship || ""}</td>
                      <td>{form?.passportNumber || ""}</td>
                      <td>{form?.passportExpirationDate || ""}</td>
                      <td>{form?.passportIssuingCountry || ""}</td>
                      <td style={{ maxWidth: 200 }}>{form?.specialTravelPreferences || ""}</td>
                      <td>{form?.frequentFlyerPrecheck || ""}</td>
                      <td>{form?.siteProject || ""}</td>
                      <td>{form?.gatewayCity || ""}</td>
                      <td>{form?.departureDate || ""}</td>
                      <td>{form?.returnDate || ""}</td>
                      <td>{form?.tshirtSize || ""}</td>
                      <td>{form?.emergencyContactName || ""}</td>
                      <td>{form?.emergencyContactEmail || ""}</td>
                      <td>{form?.emergencyContactPhone || ""}</td>
                      <td>{form?.isMinor || ""}</td>
                      <td>{form?.passportValidSixMonths || ""}</td>
                      <td>{form?.baseTicketAck || ""}</td>
                      <td>{form?.teamTravelAck || ""}</td>
                      <td>{form?.endMeetingAck || ""}</td>
                      <td>{form?.travelInsuranceAck || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {canViewTeamDashboard && workerDocumentParticipants.length === 0 && (
              <EmptyState
                icon="empty"
                title="No participants yet"
                description="Add team members in the Team tab roster to see and export their travel form responses here."
              />
            )}
            {!canViewTeamDashboard && !currentParticipant && (
              <div className="small">You are not assigned to this trip.</div>
            )}
          </div>
          </CollapsibleSection>
        </div>
      )}

            {tab === "Staff Tasks" && canManageTrips && !isLeader && (
              <div style={{ display: "grid", gap: 16 }}>
            <CollapsibleSection defaultOpen>
            <div className="card pad">
                <div className="cardSectionPill" style={{ marginBottom: 8 }}>Staff task list</div>
                <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
                  Internal planning tasks and assignments.
                </div>
                <div className="row" style={{ marginBottom: 10 }}>
                  <div className="small">
                    {completedCount} of {totalCount} complete
                  </div>

                  <div className="spacer" />

                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setIsAddingStaffTask((current) => !current);
                      setStaffTaskStatus("");
                    }}
                  >
                    {isAddingStaffTask ? "Close" : "Add Task"}
                  </button>

                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      if (!trip) return;
                      const header = [
                        "Trip Name",
                        "Trip Location",
                        "Trip Dates",
                        "Work Area",
                        "Sequence",
                        "Task Name",
                        "Assigned To",
                        "Progress",
                        "Due Date",
                        "Notes",
                      ];
                      const rows = (editableStaffTasksRef.current || []).map((task) => [
                        trip.name || "",
                        trip.location || "",
                        trip.dates || "",
                        task.workArea || "",
                        task.sequence ?? "",
                        task.taskName || task.title || "",
                        task.assignedTo || "",
                        task.progress || "",
                        task.dueDate || "",
                        (task.notes || "").replace(/\r?\n/g, " "),
                      ]);
                      const csvContent = [header, ...rows]
                        .map((cols) =>
                          cols
                            .map((val) => {
                              const s = String(val ?? "");
                              if (/[",\n]/.test(s)) {
                                return `"${s.replace(/"/g, '""')}"`;
                              }
                              return s;
                            })
                            .join(",")
                        )
                        .join("\n");

                      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      const safeTripName = String(trip.name || "trip")
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, "");
                      link.download = `${safeTripName || "trip"}-staff-tasks.csv`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export Tasks
                  </button>

                  <span className="badge">{completionPct}% complete</span>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div className="small" style={{ marginBottom: 6 }}>
                    Trip Progress
                  </div>
                  <div className="progress">
                    <div style={{ width: `${completionPct}%` }} />
                  </div>
                </div>

                {staffTaskStatus ? (
                  <div className="row" style={{ marginBottom: 12, alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className="small" style={staffTaskStatus !== "Saving..." && staffTaskStatus !== "Saved." && staffTaskStatus !== "Staff task added." && staffTaskStatus !== "Task name is required." ? { color: "var(--danger)" } : {}}>{staffTaskStatus}</span>
                    {staffTaskStatus !== "Saving..." && staffTaskStatus !== "Saved." && staffTaskStatus !== "Staff task added." && staffTaskStatus !== "Task name is required." ? (
                      <button type="button" className="btn btnPrimary" onClick={() => saveStaffTasks(editableStaffTasksRef.current || [])}>
                        Try again
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {isAddingStaffTask ? (
                  <div
                    className="card pad"
                    style={{
                      boxShadow: "none",
                      marginBottom: 14,
                      background: "rgba(255,255,255,.78)",
                    }}
                  >
                    <div style={{ display: "grid", gap: 12 }}>
                      <input
                        className="input"
                        value={newStaffTaskDraft.taskName}
                        onChange={(event) =>
                          setNewStaffTaskDraft((current) => ({
                            ...current,
                            taskName: event.target.value,
                          }))
                        }
                        placeholder="Staff task name"
                      />
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: 10,
                        }}
                      >
                        <select
                          className="input"
                          value={newStaffTaskDraft.workArea}
                          onChange={(event) =>
                            setNewStaffTaskDraft((current) => ({
                              ...current,
                              workArea: event.target.value,
                            }))
                          }
                        >
                          {staffTaskWorkAreas.map((area) => (
                            <option key={area} value={area}>
                              {area}
                            </option>
                          ))}
                        </select>
                        <select
                          className="input"
                          value={newStaffTaskDraft.assignedTo}
                          onChange={(event) =>
                            setNewStaffTaskDraft((current) => ({
                              ...current,
                              assignedTo: event.target.value,
                            }))
                          }
                        >
                          <option value="">Assign Staff</option>
                          {staffList.map((person) => (
                            <option key={person} value={person}>
                              {person}
                            </option>
                          ))}
                        </select>
                        <input
                          className="input"
                          type="date"
                          value={newStaffTaskDraft.dueDate}
                          onChange={(event) =>
                            setNewStaffTaskDraft((current) => ({
                              ...current,
                              dueDate: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <textarea
                        className="input"
                        rows={3}
                        value={newStaffTaskDraft.notes}
                        onChange={(event) =>
                          setNewStaffTaskDraft((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="Optional notes"
                      />
                      <div className="row">
                        <button className="btn btnPrimary" type="button" onClick={handleAddStaffTask}>
                          Save Staff Task
                        </button>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => {
                            setIsAddingStaffTask(false);
                            setNewStaffTaskDraft({
                              workArea: "Project Formation",
                              taskName: "",
                              assignedTo: "",
                              dueDate: "",
                              notes: "",
                            });
                            setStaffTaskStatus("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: "39%" }}>Task</th>
                      <th style={{ width: "7%", textAlign: "center" }}>Assigned</th>
                      <th style={{ width: "14%", textAlign: "center" }}>Progress</th>
                      <th style={{ width: "10%" }}>Due Date</th>
                      <th style={{ width: "22%" }}>Notes</th>
                      <th style={{ width: "8%" }} />
                    </tr>
                  </thead>

                  {Object.entries(groupedViewTasks).map(([area, tasks]) => {
                    return (
                      <tbody key={area}>
                        <tr>
                          <td colSpan={6}>
                            <div className="staffTaskSectionHeader">
                              <span className="staffTaskSectionTitle">{area}</span>
                              <div className="staffTaskSectionRule" />
                              <span className="badge">{tasks.length}</span>
                            </div>
                          </td>
                        </tr>

                        {tasks.map((t) => {
                          const isEditingTitle = editingStaffTaskId === t.id;
                          const rowStatus = staffTaskRowStatus[t.id];
                          const staffTaskTpl = findStaffTaskTemplate(t);
                          const staffTaskLink = staffTaskTpl?.link;
                          const staffTaskDetails = staffTaskTpl?.details;

                          return (
                            <tr
                              key={t.id}
                              id={buildStaffTaskRowDomId(t.id)}
                              className="staffTaskRow"
                            >
                              <td>
                                {isEditingTitle ? (
                                  <input
                                    className="input"
                                    value={staffTaskTitleDraft}
                                    onChange={(e) => setStaffTaskTitleDraft(e.target.value)}
                                  />
                                ) : (
                                  <>
                                    <span style={{ fontSize: "14px", fontWeight: 600 }}>
                                      {t.taskName || t.title || "-"}
                                    </span>
                                    {staffTaskLink ? (
                                      <a
                                        href={staffTaskLink}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="btn"
                                        style={{ marginLeft: 8, padding: "2px 8px", fontSize: 12 }}
                                      >
                                        View details
                                      </a>
                                    ) : null}
                                    {staffTaskDetails ? (
                                      <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>
                                        {staffTaskDetails}
                                      </div>
                                    ) : null}
                                  </>
                                )}
                              </td>

                              <td className="staffTaskAssignedCell">
                                {isEditingTitle ? (
                                  <select
                                    className="input staffTaskAssignedSelect"
                                    value={t.assignedTo || ""}
                                    onChange={(e) =>
                                      updateStaffTask(t.id, "assignedTo", e.target.value)
                                    }
                                  >
                                    <option value="">Assign Staff</option>
                                    {staffList.map((person) => (
                                      <option key={person} value={person}>
                                        {person}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span
                                    className={"badge " + (t.assignedTo ? "badgeInfo staffTaskAssignedBadge" : "")}
                                    title={t.assignedTo || "Not assigned"}
                                  >
                                    {t.assignedTo || "-"}
                                  </span>
                                )}
                              </td>

                              <td style={{ textAlign: "center" }}>
                                <select
                                  className={`input statusSelect ${getProgressInputClass(
                                    t.progress || "Not started"
                                  )}`}
                                  value={t.progress || "Not started"}
                                  onChange={(e) =>
                                    updateStaffTask(t.id, "progress", e.target.value)
                                  }
                                >
                                  <option value="Not started">Not started</option>
                                  <option value="In progress">In progress</option>
                                  <option value="Complete">Complete</option>
                                  <option value="Waiting">Waiting</option>
                                </select>
                              </td>

                              <td>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  {editingDueDateTaskId === t.id ? (
                                    <input
                                      className="input"
                                      type="date"
                                      autoFocus
                                      value={t.dueDate || ""}
                                      onChange={(e) =>
                                        handleDueDateChange(t.id, e.target.value)
                                      }
                                      onBlur={() => setEditingDueDateTaskId(null)}
                                    />
                                  ) : (
                                    <button
                                      className="staffTaskDateButton"
                                      type="button"
                                      onClick={() => setEditingDueDateTaskId(t.id)}
                                    >
                                      {t.dueDate ? formatShortDate(t.dueDate) : "Add date"}
                                    </button>
                                  )}
                                  {t.dueDate &&
                                    t.dueDate === computeStaffTaskDueDate(t, trip) && (
                                      <span className="small" style={{ color: "var(--muted)" }}>
                                        Auto
                                      </span>
                                    )}
                                </div>
                              </td>

                              <td>
                                <div className="staffTaskNotesCell">
                                  <textarea
                                    className="staffTaskNotesInput"
                                    rows={2}
                                    value={t.notes || ""}
                                    onChange={(e) =>
                                      handleStaffTaskNotesChange(t.id, e.target.value)
                                    }
                                    onBlur={(e) => flushStaffTaskNotesSave(t.id, e.target.value)}
                                  />
                                  {t.notes ? (
                                    <div className="staffTaskNotesTooltip" role="note">
                                      {t.notes}
                                    </div>
                                  ) : null}
                                </div>
                              </td>

                              <td>
                                <div
                                  className="staffTaskRowActions"
                                  style={rowStatus ? { opacity: 1, pointerEvents: "auto" } : undefined}
                                >
                                  {rowStatus ? (
                                    <span
                                      className={`staffTaskSaveStatus staffTaskSaveStatus${rowStatus.type === "error" ? "Error" : rowStatus.type === "success" ? "Success" : "Saving"}`}
                                    >
                                      {rowStatus.message}
                                    </span>
                                  ) : null}
                                  {isEditingTitle ? (
                                    <>
                                      <button
                                        className="btn"
                                        type="button"
                                        onClick={handleCancelStaffTaskEdit}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        className="btn btnPrimary"
                                        type="button"
                                        onClick={() => handleSaveStaffTaskTitle(t.id)}
                                      >
                                        Save
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      className="btn"
                                      type="button"
                                      onClick={() => handleEditStaffTask(t)}
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    );
                  })}
                </table>

                <div className="small" style={{ marginTop: 12 }}>
                  Staff-only checklist for trip management tasks.
                </div>
              </div>
            </CollapsibleSection>
          </div>
      )}

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
                <span className="small" style={travelFormStatus !== "Saving..." && travelFormStatus !== "Saved." ? { color: "var(--danger)" } : {}}>{travelFormStatus}</span>
                {travelFormStatus !== "Saving..." && travelFormStatus !== "Saved." ? (
                  <button type="button" className="btn btnPrimary" onClick={() => handleSaveTravelForm()}>
                    Try again
                  </button>
                ) : null}
              </div>
            ) : null}
            <div style={{ display: "grid", gap: 12 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <div><div className="small" style={{ marginBottom: 4 }}>Passport Number</div><input className="input" value={travelFormDraft.passportNumber} onChange={(e) => setTravelFormDraft((d) => ({ ...d, passportNumber: e.target.value }))} /></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Passport Expiration (M/D/Y)</div><input className="input" value={travelFormDraft.passportExpirationDate} onChange={(e) => setTravelFormDraft((d) => ({ ...d, passportExpirationDate: e.target.value }))} placeholder="MM/DD/YYYY" /></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Issuing Country</div><input className="input" value={travelFormDraft.passportIssuingCountry} onChange={(e) => setTravelFormDraft((d) => ({ ...d, passportIssuingCountry: e.target.value }))} /></div>
              </div>
              <div><div className="small" style={{ marginBottom: 4 }}>Special travel preferences (extra travel, airline, layovers, miles, upgrades, etc. or NONE)</div><textarea className="input" rows={3} value={travelFormDraft.specialTravelPreferences} onChange={(e) => setTravelFormDraft((d) => ({ ...d, specialTravelPreferences: e.target.value }))} /></div>
              <div><div className="small" style={{ marginBottom: 4 }}>Frequent Flyer / Known Traveler (Pre-check) number</div><input className="input" value={travelFormDraft.frequentFlyerPrecheck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, frequentFlyerPrecheck: e.target.value }))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                <div><div className="small" style={{ marginBottom: 4 }}>Site of LST Project (city AND country)</div><input className="input" value={travelFormDraft.siteProject} onChange={(e) => setTravelFormDraft((d) => ({ ...d, siteProject: e.target.value }))} /></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Gateway City (departure point)</div><input className="input" value={travelFormDraft.gatewayCity} onChange={(e) => setTravelFormDraft((d) => ({ ...d, gatewayCity: e.target.value }))} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                <div><div className="small" style={{ marginBottom: 4 }}>Official Departure Date</div><input className="input" type="date" value={travelFormDraft.departureDate} onChange={(e) => setTravelFormDraft((d) => ({ ...d, departureDate: e.target.value }))} /></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Official Return Date</div><input className="input" type="date" value={travelFormDraft.returnDate} onChange={(e) => setTravelFormDraft((d) => ({ ...d, returnDate: e.target.value }))} /></div>
                <div>
                  <div className="small" style={{ marginBottom: 4 }}>T-shirt Size</div>
                  <select
                    className="input"
                    value={travelFormDraft.tshirtSize}
                    onChange={(e) => setTravelFormDraft((d) => ({ ...d, tshirtSize: e.target.value }))}
                  >
                    {getTshirtSizeOptions(travelFormDraft.tshirtSize).map((opt) => (
                      <option key={opt || "__empty__"} value={opt}>
                        {opt || "—"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <div><div className="small" style={{ marginBottom: 4 }}>Emergency Contact Name</div><input className="input" value={travelFormDraft.emergencyContactName} onChange={(e) => setTravelFormDraft((d) => ({ ...d, emergencyContactName: e.target.value }))} /></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Emergency Contact Email</div><input className="input" type="email" value={travelFormDraft.emergencyContactEmail} onChange={(e) => setTravelFormDraft((d) => ({ ...d, emergencyContactEmail: e.target.value }))} /></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Emergency Contact Phone</div><input className="input" value={travelFormDraft.emergencyContactPhone} onChange={(e) => setTravelFormDraft((d) => ({ ...d, emergencyContactPhone: e.target.value }))} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                <div><div className="small" style={{ marginBottom: 4 }}>Minor (under 18)</div><select className="input" value={travelFormDraft.isMinor} onChange={(e) => setTravelFormDraft((d) => ({ ...d, isMinor: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Passport valid 6+ months after trip</div><select className="input" value={travelFormDraft.passportValidSixMonths} onChange={(e) => setTravelFormDraft((d) => ({ ...d, passportValidSixMonths: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <div><div className="small" style={{ marginBottom: 4 }}>Base Ticket: I understand LST will book my travel from Gateway City to site and back.</div><select className="input" value={travelFormDraft.baseTicketAck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, baseTicketAck: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Team Travel: I understand my team must arrive same day, same airport, same time.</div><select className="input" value={travelFormDraft.teamTravelAck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, teamTravelAck: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                <div><div className="small" style={{ marginBottom: 4 }}>End Meeting: I understand debriefing takes place within a week of return.</div><select className="input" value={travelFormDraft.endMeetingAck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, endMeetingAck: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Travel Insurance: I understand LST purchases basic plan; I can upgrade.</div><select className="input" value={travelFormDraft.travelInsuranceAck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, travelInsuranceAck: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn btnPrimary" type="button" onClick={() => void handleSaveTravelForm()}>Save Travel Form</button>
            </div>
          </div>
        </div>
      )}

      </div>
    </Shell>
  );
}
