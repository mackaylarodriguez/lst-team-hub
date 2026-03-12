import Shell from "@/components/Shell";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { requireSession } from "@/lib/auth";
import { getTripForCurrentUser, listTripParticipants, updateTripForCurrentUser } from "@/lib/trips";
import { isManagerRole } from "@/lib/roles";
import { listTripTeamMembers, saveTripTeamMembers } from "@/lib/tripTeamMembers";
import { SITE_OPTIONS } from "@/lib/siteOptions";
import {
  listTrainingModules,
  listTrainingProgress,
  saveTrainingProgress,
} from "@/lib/training";
import { saveFundraisingProfile } from "@/lib/fundraising";
import {
  addLinkResource,
  addPdfResource,
  deleteResource,
  listResources,
  updateResource,
} from "@/lib/resources";
import {
  DOCUMENT_CATEGORY_OPTIONS,
  REQUIRED_TRIP_DOCUMENT_SLOTS,
} from "@/lib/tripDocumentSlots";
import { percentComplete } from "@/lib/tasks";
import {
  listStaffTasksForTrip,
  isTaskAssignedToUser,
  saveStaffTasks as persistStaffTasks,
  sortStaffTasksByTemplate,
  STAFF_TASKS_UPDATED_EVENT,
} from "@/lib/staffTasks";
import {
  createTripTask,
  listTripTasks,
  listUserTaskProgress,
  saveUserTaskProgress,
} from "@/lib/tripTasks";
import { listReferenceEmails, saveReferenceEmail } from "@/lib/referenceEmails";
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
import { USER_DOCUMENT_TYPES, getUserDocumentTypeLabel } from "@/lib/userDocumentTypes";
import {
  deleteUserDocument,
  listTripUserDocuments,
  saveUserDocumentUpload,
} from "@/lib/userDocuments";

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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function formatDraftAmount(value) {
  return value === null || value === undefined || value === "" ? "" : String(value);
}

function buildTripSetupDraft(trip) {
  return {
    name: trip?.name || "",
    location: trip?.location || "",
    host: trip?.host || "",
    siteType: trip?.siteType || "",
    teamStatus: trip?.teamStatus || "",
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
    firstName: "",
    lastName: "",
    email: "",
    startDate: "",
    endDate: "",
  };
}

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
  const participantDocumentInputRefs = useRef({});
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState({
    title: "",
    link: "",
    category: "Other",
    workArea: "",
    resourceKey: "",
  });
  const [pendingPdfDraft, setPendingPdfDraft] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);
  const [docDraft, setDocDraft] = useState(null);
  const [referenceEmails, setReferenceEmails] = useState({});
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
  const [isEditingRoster, setIsEditingRoster] = useState(false);
  const [rosterDraft, setRosterDraft] = useState([]);
  const [rosterStatus, setRosterStatus] = useState("");

  const [trip, setTrip] = useState(null);
  const [tripLoadComplete, setTripLoadComplete] = useState(false);
  const [editableStaffTasks, setEditableStaffTasks] = useState([]);
  const [editingStaffTaskId, setEditingStaffTaskId] = useState(null);
  const [editingDueDateTaskId, setEditingDueDateTaskId] = useState(null);
  const [staffTaskTitleDraft, setStaffTaskTitleDraft] = useState("");
  const latestStaffTaskSaveRef = useRef(0);
  const editableStaffTasksRef = useRef([]);
  const [staffTaskRowStatus, setStaffTaskRowStatus] = useState({});
  const staffTaskRowTimeoutsRef = useRef({});
  const staffTaskNoteSaveTimeoutsRef = useRef({});

  const staffList = [
    "Mackayla",
    "Craig",
    "Leslee",
    "Donna",
    "Hannah",
    "Kelly",
    "Craig & Kelly",
  ];

  const trainingResources = [
    {
      id: "canvas",
      title: "Canvas",
      description: "Modules 1-9 and trip training content.",
      url: "https://canvas.instructure.com/courses/12611786",
      icon: "CV",
      accent: "#2f4993",
    },
    {
      id: "basic",
      title: "Basic Training",
      description: "Core pre-trip foundations and prep.",
      url: "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=134&",
      icon: "BT",
      accent: "#3caae1",
    },
    {
      id: "gateway",
      title: "Gateway Training",
      description: "Gateway Training plus the EndMeeting link and follow-through.",
      url: "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=136&",
      icon: "GT",
      accent: "#f99d2a",
    },
  ];

  const canvasTrainingModules = useMemo(
    () => trainingModules.filter((module) => module.category === "canvas"),
    [trainingModules]
  );
  const supplementalTrainingModules = useMemo(
    () => trainingModules.filter((module) => module.category !== "canvas"),
    [trainingModules]
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
      ] =
        await Promise.allSettled([
          listTripParticipants(trip.id),
          listTripTeamMembers(trip.id),
          listTrainingModules(trip.id),
          listTrainingProgress(trip.id),
          listTripTasks(trip.id),
          listUserTaskProgress(trip.id),
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
    if (!trip) return;

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
  }, [trip?.id]);

  async function handleAddDocument(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPendingPdfDraft({
      file,
      title: file.name.replace(/\.pdf$/i, ""),
      category: "Other",
      workArea: trip?.name || "",
      resourceKey: "",
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
    });
  }

  function handlePrepareRequiredLink(slot) {
    setIsAddingLink(true);
    setLinkDraft({
      title: slot.title,
      link: "",
      category: slot.category,
      workArea: trip?.name || "",
      resourceKey: slot.key,
    });
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
    setLinkDraft({
      title: "",
      link: "",
      category: "Other",
      workArea: trip?.name || "",
      resourceKey: "",
    });
  }

  function handleCancelAddLink() {
    setIsAddingLink(false);
    setLinkDraft({
      title: "",
      link: "",
      category: "Other",
      workArea: trip?.name || "",
      resourceKey: "",
    });
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
      console.error("Unable to add link resource", error);
      setDocsError(error.message || "Unable to save resources.");
    }
  }

  function handleEditDoc(doc) {
    setEditingDocId(doc.id);
    setDocDraft({ ...doc });
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
      });
      setDocs((current) =>
        current.map((doc) => (doc.id === updated.id ? updated : doc))
      );
      setDocsError("");
      handleCancelEditDoc();
    } catch (error) {
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
      });
      setDocs((current) =>
        current.map((doc) => (doc.id === updated.id ? updated : doc))
      );
      setDocsError("");
      handleCancelEditDoc();
    } catch (error) {
      console.error("Unable to replace PDF resource", error);
      setDocsError(error.message || "Unable to save resources.");
    } finally {
      event.target.value = "";
    }
  }

  useEffect(() => {
    if (!trip) return;

    let cancelled = false;

    async function loadReferenceEmails() {
      try {
        const rows = await listReferenceEmails(trip.id);
        if (cancelled) return;

        const next = {};
        rows.forEach((row) => {
          next[row.userId] = {
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

    loadReferenceEmails();

    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

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

  function getReferenceStatus(userId) {
    return referenceEmails[userId] || {
      referenceName: "",
      referenceEmail: "",
      referencePhone: "",
      sent: false,
      received: false,
      sentDate: "",
    };
  }

  async function saveReferenceStatus(userId, nextStatus) {
    if (!trip || !userId) return;

    try {
      const saved = await saveReferenceEmail({
        tripId: trip.id,
        userId,
        referenceName: nextStatus.referenceName,
        referenceEmail: nextStatus.referenceEmail,
        referencePhone: nextStatus.referencePhone,
        sent: nextStatus.sent,
        received: nextStatus.received,
        sentDate: nextStatus.sentDate,
      });

      setReferenceEmails((current) => ({
        ...current,
        [userId]: {
          referenceName: saved.referenceName,
          referenceEmail: saved.referenceEmail,
          referencePhone: saved.referencePhone,
          sent: saved.sent,
          received: saved.received,
          sentDate: saved.sentDate,
        },
      }));
    } catch (error) {
      console.error("Unable to save reference email", error);
    }
  }

  function toggleReferenceEmail(userId, field) {
    const current = getReferenceStatus(userId);
    const nextValue = !current[field];

    const nextStatus = {
      ...current,
      [field]: nextValue,
      sentDate:
        field === "sent" && !nextValue ? "" : current.sentDate || "",
    };

    setReferenceEmails((prev) => ({
      ...prev,
      [userId]: nextStatus,
    }));
    void saveReferenceStatus(userId, nextStatus);
  }

  function updateReferenceSentDate(userId, value) {
    const current = getReferenceStatus(userId);
    const nextStatus = {
      ...current,
      sent: value ? true : current.sent,
      sentDate: value,
    };

    setReferenceEmails((prev) => ({
      ...prev,
      [userId]: nextStatus,
    }));
    void saveReferenceStatus(userId, nextStatus);
  }

  function updateReferenceField(userId, field, value) {
    const current = getReferenceStatus(userId);
    const nextStatus = {
      ...current,
      [field]: value,
    };

    setReferenceEmails((prev) => ({
      ...prev,
      [userId]: nextStatus,
    }));
    void saveReferenceStatus(userId, nextStatus);
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
    }).catch((error) => {
      console.error("Unable to save user task progress", error);
    });
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
    }).catch((error) => {
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
    }).catch((error) => {
      console.error("Unable to save training date", error);
    });
  }

  async function saveStaffTasks(nextTasks) {
    const orderedTasks = sortStaffTasksByTemplate(nextTasks);
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
      return savedTasks;
    } catch (error) {
      console.error("Unable to save staff tasks", error);
      if (latestStaffTaskSaveRef.current !== requestId) return;
      setStaffTaskStatus("Could not save task changes.");
      throw error;
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
        title: `${getUserDocumentTypeLabel(documentType)} - ${trip.name}`,
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
    } catch (error) {
      console.error("Unable to upload participant document", error);
      setParticipantDocumentsError(error.message || "Unable to upload document.");
      setParticipantDocumentStatus((current) => ({
        ...current,
        [statusKey]: { type: "error", message: error.message || "Upload failed." },
      }));
    }
  }

  async function handleDeleteParticipantDocument(document) {
    if (!document?.id) return;

    const confirmed = window.confirm("Delete this uploaded document?");
    if (!confirmed) return;

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
    } catch (error) {
      console.error("Unable to delete participant document", error);
      setParticipantDocumentStatus((current) => ({
        ...current,
        [statusKey]: { type: "error", message: error.message || "Delete failed." },
      }));
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
        setStaffTaskRowFeedback(taskId, "error", "Could not save task changes.");
        setStaffTaskStatus(error.message || "Could not save task changes.");
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

  function handleDueDateChange(taskId, value) {
    updateStaffTask(taskId, "dueDate", value);
    setEditingDueDateTaskId(null);
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
      title.includes("donor")
    ) {
      return "Fundraising";
    }
    if (
      title.includes("passport") ||
      title.includes("visa") ||
      title.includes("ticket") ||
      title.includes("step")
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

    const sectionOrder = ["General", "Fundraising", "Travel", "Training"];

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
    setTripSetupDraft(buildTripSetupDraft(trip));
    setIsCustomSiteInput(false);
    setTripSetupStatus("");
    setIsEditingTripSetup(true);
  }

  function handleCancelTripSetupEdit() {
    setTripSetupDraft(buildTripSetupDraft(trip));
    setIsCustomSiteInput(false);
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
              tasks: current.tasks || [],
              quickLinks: current.quickLinks || [],
              docs: current.docs || [],
              staffTasks: current.staffTasks || [],
            }
          : current
      );
      setTripSetupDraft(buildTripSetupDraft(savedTrip));
      setIsEditingTripSetup(false);
      setIsCustomSiteInput(false);
      setTripSetupStatus("Saved.");
    } catch (error) {
      console.error("Unable to save trip details", error);
      setTripSetupStatus(error.message || "Unable to save trip details.");
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
    setRosterDraft((trip?.teamMembers || []).length > 0 ? trip.teamMembers : [createEmptyRosterMember()]);
    setRosterStatus("");
    setIsEditingRoster(true);
  }

  function handleCancelRosterEdit() {
    setRosterDraft(trip?.teamMembers || []);
    setRosterStatus("");
    setIsEditingRoster(false);
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
      const savedMembers = await saveTripTeamMembers(trip.id, rosterDraft);
      setTrip((current) => (current ? { ...current, teamMembers: savedMembers } : current));
      setRosterDraft(savedMembers);
      setIsEditingRoster(false);
      setRosterStatus("Saved.");
    } catch (error) {
      console.error("Unable to save team roster", error);
      setRosterStatus(error.message || "Unable to save team roster.");
    }
  }

  function renderTripSetupCard() {
    return (
      <div className="card pad" style={{ gridColumn: "1 / -1" }}>
        <div className="row" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 900 }}>Trip Setup</div>
          <div className="spacer" />
          {tripSetupStatus ? (
            <div className="small" style={{ alignSelf: "center" }}>
              {tripSetupStatus}
            </div>
          ) : null}
          {canViewAllParticipantData && !isEditingTripSetup ? (
            <button className="btn" type="button" onClick={handleStartTripSetupEdit}>
              Edit Details
            </button>
          ) : null}
        </div>
        <div
          className={`tripSetupColumns${canViewAllParticipantData ? "" : " tripSetupColumnsSingle"}`}
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
                    {siteOptions.map((site) => (
                      <option key={site} value={site}>
                        {site}
                      </option>
                    ))}
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
              </div>
            ) : canViewAllParticipantData ? (
              <>
                <div className="small">Team Name</div>
                <div style={{ fontWeight: 800 }}>{trip.name}</div>
                <div style={{ height: 12 }} />
                <div className="small">Site</div>
                <div style={{ fontWeight: 800 }}>{trip.location || "Not set"}</div>
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
              </>
            ) : (
              <div className="tripSetupInfoGrid">
                <div className="tripSetupInfoItem">
                  <div className="small">Site</div>
                  <div style={{ fontWeight: 800 }}>{trip.location || "Not set"}</div>
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

          {canViewAllParticipantData ? (
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

          {canViewAllParticipantData ? (
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
      </div>
    );
  }

  const groupedViewTasks = groupTasksByWorkArea(editableStaffTasks || []);

  const completedCount = (editableStaffTasks || []).filter(
    (t) => t.progress === "Complete"
  ).length;
  const totalCount = (editableStaffTasks || []).length;
  const completionPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const canManageTrips = isManagerRole(session?.permissionRole || session?.role);
  const isPreviewingParticipant = canManageTrips && !!previewParticipantId;
  const canViewAllParticipantData = canManageTrips && !isPreviewingParticipant;
  const siteOptions = useMemo(() => {
    const seen = new Set();
    return [...(SITE_OPTIONS || []), trip?.location || ""]
      .map((site) => String(site || "").trim())
      .filter(Boolean)
      .filter((site) => {
        const key = site.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => left.localeCompare(right));
  }, [trip?.location]);
  const selectedSiteValue = isCustomSiteInput ? CUSTOM_SITE_OPTION : tripSetupDraft.location || "";
  const requiredDocumentSlots = useMemo(
    () =>
      REQUIRED_TRIP_DOCUMENT_SLOTS.map((slot) => ({
        ...slot,
        resource: docs.find((doc) => doc.resourceKey === slot.key) || null,
      })),
    [docs]
  );
  const optionalDocsByCategory = useMemo(() => {
    const grouped = new Map();

    docs
      .filter((doc) => !doc.resourceKey)
      .forEach((doc) => {
        const category = doc.category || "Other";
        const existing = grouped.get(category) || [];
        existing.push(doc);
        grouped.set(category, existing);
      });

    return Array.from(grouped.entries()).sort((left, right) => left[0].localeCompare(right[0]));
  }, [docs]);

  const currentParticipant = useMemo(() => {
    if (!trip) return null;

    if (isPreviewingParticipant) {
      return (
        trip.participants.find(
          (participant) => String(participant.id) === String(previewParticipantId)
        ) || null
      );
    }

    if (!session || canViewAllParticipantData) return null;

    return (
      trip.participants.find(
        (participant) =>
          participant.email.toLowerCase() === session.email.toLowerCase()
      ) || null
    );
  }, [trip, session, canViewAllParticipantData, isPreviewingParticipant, previewParticipantId]);

  const activeParticipantEmail = currentParticipant?.email?.toLowerCase() || "";
  const canUploadOwnParticipantDocuments =
    !!currentParticipant &&
    String(currentParticipant.id || "") === String(session?.profileId || session?.id || "");
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

  const participantTaskProgress = useMemo(() => {
    if (!trip) return [];

    return (trip.participants || []).map((participant) => {
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
  }, [trip, participantTaskStates]);

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
        name: member.name || "Unnamed member",
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
        name: participant.name || existing?.name || "Unnamed member",
        role: participant.role || existing?.role || "",
        email: participant.email || existing?.email || "",
        fundraisingUrl: participant.fundraisingUrl || existing?.fundraisingUrl || "",
        startDate: existing?.startDate || trip.startDate || "",
        endDate: existing?.endDate || trip.endDate || "",
        connected: true,
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

    return (trip.participants || []).map((participant) => {
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
  }, [trip, participantTrainingStates, allTrainingModules]);

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
    return trip.participants || [];
  }, [trip]);

  const referenceReceivedProgress = useMemo(() => {
    if (!trip) {
      return {
        label: "References Received",
        percent: 0,
        completed: 0,
        total: 0,
      };
    }

    if (canViewAllParticipantData) {
      const total = trip.participants.length;
      const completed = trip.participants.filter(
        (participant) => !!getReferenceStatus(participant.id).received
      ).length;

      return {
        label: "References Received",
        percent: total ? Math.round((completed / total) * 100) : 0,
        completed,
        total,
      };
    }

    const received = currentParticipant
      ? !!getReferenceStatus(currentParticipant.id).received
      : false;

    return {
      label: "My Reference",
      percent: received ? 100 : 0,
      completed: received ? 1 : 0,
      total: 1,
    };
  }, [trip, canViewAllParticipantData, currentParticipant, referenceEmails]);

  const overviewTaskLabel = canViewAllParticipantData ? "Participant Tasks" : "My Tasks";
  const overviewTaskPct = canViewAllParticipantData
    ? participantTaskPct
    : currentParticipantProgress?.percent || 0;
  const overviewTrainingLabel = canViewAllParticipantData ? "Training" : "My Training";
  const overviewTrainingPct = canViewAllParticipantData
    ? trainingPct
    : currentTrainingProgress?.percent || 0;
  const fundraisingGoalAmount = Number(trip?.fundraisingGoalAmount || 0);
  const fundraisingWorkerCount = Math.max(
    (trip?.participants || []).filter((participant) =>
      String(participant?.role || "").toLowerCase() === "worker"
    ).length || (trip?.participants || []).length,
    1
  );
  const fundraisingFirstDeadlineAmount = Math.min(
    2000 * fundraisingWorkerCount,
    fundraisingGoalAmount || 2000 * fundraisingWorkerCount
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
    : canViewAllParticipantData
      ? "Fundraising Links"
      : "My Fundraising";
  const overviewFundraisingValue = fundraisingGoalAmount
    ? formatMoney(fundraisingGoalAmount)
    : trip?.teamFundraisingUrl
      ? "Page Ready"
      : canViewAllParticipantData
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
      : canViewAllParticipantData
        ? `${savedFundraisingLinksCount} participant links saved.`
        : currentParticipant?.fundraisingUrl
        ? "Your personal Neon page is available."
        : "No personal Neon page added yet.";
  const smartsheetBudgetDoc = docs.find((doc) => doc.resourceKey === "smartsheet-budget");
  const siteInfoDoc = docs.find((doc) => doc.resourceKey === "site-info-link");
  const quickLinks = useMemo(() => {
    const workerFundraisingUrl = trip?.teamFundraisingUrl || currentParticipant?.fundraisingUrl || "";
    const workerFundraisingLabel = trip?.teamFundraisingUrl
      ? "Team Fundraising Page"
      : "My Fundraising Page";
    const links = [
      {
        label: "Canvas",
        url: "https://canvas.instructure.com/courses/12611786",
        ready: true,
      },
    ];

    links.push(
      canViewAllParticipantData
        ? {
            label: "Fundraising",
            url: trip?.teamFundraisingUrl || "",
            ready: !!trip?.teamFundraisingUrl,
          }
        : {
            label: trip?.teamFundraisingUrl ? "Fundraising" : "My Fundraising",
            url: workerFundraisingUrl,
            ready: !!workerFundraisingUrl,
          }
    );

    links.push({
      label: "Budget",
      url: smartsheetBudgetDoc?.link || smartsheetBudgetDoc?.pdfUrl || "",
      ready: !!(smartsheetBudgetDoc?.link || smartsheetBudgetDoc?.pdfUrl),
    });

    links.push({
      label: "Site Info",
      url: siteInfoDoc?.link || siteInfoDoc?.pdfUrl || "",
      ready: !!(siteInfoDoc?.link || siteInfoDoc?.pdfUrl),
    });

    return links;
  }, [
    canViewAllParticipantData,
    currentParticipant?.fundraisingUrl,
    siteInfoDoc?.link,
    siteInfoDoc?.pdfUrl,
    smartsheetBudgetDoc?.link,
    smartsheetBudgetDoc?.pdfUrl,
    trip?.teamFundraisingUrl,
  ]);
  const visibleTaskParticipants = canViewAllParticipantData
    ? participantTaskProgress
    : currentParticipantProgress
      ? [currentParticipantProgress]
      : [];
  const groupedWorkerTasks = useMemo(
    () => groupWorkerTasks(trip?.tasks || []),
    [trip?.tasks]
  );
  const visibleTrainingParticipants = canViewAllParticipantData
    ? trainingProgress
    : currentTrainingProgress
      ? [currentTrainingProgress]
      : [];
  const overviewUpcomingTasks = useMemo(() => {
    if (!trip) return [];

    if (canViewAllParticipantData) {
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
        .map((task) => ({
          id: task.id,
          title: task.taskName,
          dueDate: task.dueDate,
          detail: task.workArea,
        }));
    }

    const taskState = currentParticipantProgress?.taskState || {};

    return (trip.tasks || [])
      .filter((task) => !taskState[task.id])
      .sort((left, right) => {
        const leftDate = parseDateSafe(left.due)?.getTime() || Number.MAX_SAFE_INTEGER;
        const rightDate = parseDateSafe(right.due)?.getTime() || Number.MAX_SAFE_INTEGER;
        return leftDate - rightDate;
      })
      .slice(0, 5)
      .map((task) => ({
        id: task.id,
        title: task.title,
        dueDate: task.due,
        detail: getWorkerTaskSection(task),
      }));
  }, [canViewAllParticipantData, currentParticipantProgress?.taskState, editableStaffTasks, session?.email, session?.name, trip]);

  const participantDocumentsTabLabel = canViewAllParticipantData ? "Participant Docs" : "My Documents";

  const tabs = 
    canManageTrips
      ? ["Overview", "Team", "Fundraising", "Training", "Tasks", "Documents", participantDocumentsTabLabel, ...(isPreviewingParticipant ? [] : ["Staff Tasks"])]
      : ["Overview", "Team", "Fundraising", "Training", "Tasks", "Documents", participantDocumentsTabLabel];

  useEffect(() => {
    if (!tabs.includes(tab)) {
      setTab("Overview");
    }
  }, [tab, tabs]);

  if (!router.isReady || !tripId) {
    return <p>Loading...</p>;
  }

  if (!trip) {
    return (
      <Shell>
        <div className="card pad">
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

  const pct = canViewAllParticipantData
    ? participantTaskPct
    : currentParticipantProgress?.percent || 0;
  const countdownSummary = getCountdownSummary(trip?.startDate);

  return (
    <Shell>
      <div className="row" style={{ marginBottom: 10 }}>
        <div>
          <h1 className="h1" style={{ marginBottom: 2 }}>{trip.name}</h1>
          <div className="small">{trip.location} • {trip.dates}</div>
        </div>
        <div className="spacer" />
        {canManageTrips && (
          <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select
              className="input"
              value={previewParticipantId}
              onChange={(event) => setPreviewParticipantId(event.target.value)}
              style={{ minWidth: 220 }}
            >
              <option value="">Staff view</option>
              {(trip.participants || []).map((participant) => (
                <option key={participant.id} value={participant.id}>
                  View as {participant.name}
                </option>
              ))}
            </select>
            {isPreviewingParticipant && (
              <span className="badge">Previewing participant view</span>
            )}
          </div>
        )}
        <div className="badge">{trip.participants.length} participants</div>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div className="small" style={{ marginBottom: 8 }}>Trip completion</div>
          <div className="progress"><div style={{ width: `${pct}%` }} /></div>
          <div className="small" style={{ marginTop: 6 }}>{pct}% complete</div>
        </div>
      </div>

      <div className="tripOverviewHighlights" style={{ marginBottom: 14 }}>
        <div
          className="card pad"
          style={{
            background: "linear-gradient(135deg, #fdf2cc 0%, #fff8e6 55%, #eef8fe 100%)",
            borderColor: "rgba(249,157,42,.3)",
          }}
        >
          <div className="small" style={{ marginBottom: 8, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", color: "#9a6700" }}>
            Countdown
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-.03em" }}>{countdownSummary.label}</div>
          <div className="small" style={{ marginTop: 6, color: "var(--text)" }}>{countdownSummary.detail}</div>
        </div>

        <div
          className="card pad"
          style={{
            background: "linear-gradient(180deg, rgba(234,242,255,.95), #ffffff 42%)",
            borderColor: "rgba(47,73,147,.22)",
            position: "relative",
            overflow: "hidden",
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
            {canViewAllParticipantData && !isEditingAnnouncement ? (
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
                  {canViewAllParticipantData ? (
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

      <div className="tabs" style={{ marginBottom: 14 }}>
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
          <div
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
                {canViewAllParticipantData
                  ? "Combined completion across all participant task lists."
                  : "Your task completion progress for this trip."}
              </div>
            </div>

            {canManageTrips && (
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
                {canViewAllParticipantData
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
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {canViewAllParticipantData && (
              <div className="card pad" style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Trip Notes</div>
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
            )}

            {canViewAllParticipantData ? renderTripSetupCard() : null}

            <div className="card pad">
              <div className="cardSectionPill">
                {canViewAllParticipantData ? "My Upcoming Staff Tasks" : "My Upcoming Tasks"}
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
                      <div style={{ fontWeight: 800 }}>{task.title}</div>
                      <div className="small">
                        {task.detail ? `${task.detail} • ` : ""}
                        Due {task.dueDate ? formatSingleDate(task.dueDate) : "when ready"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="small">
                  {canViewAllParticipantData
                    ? "No upcoming staff tasks assigned to you right now."
                    : "No upcoming worker tasks right now."}
                </div>
              )}
            </div>

            <div className="card pad">
              <div className="cardSectionPill">Quick Links</div>
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
              <div style={{ height: 10 }} />
              <div className="small">
                Canvas is fixed. Fundraising, budget, and site info links come from this trip's saved data.
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "Team" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card pad">
            <div className="row" style={{ marginBottom: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>Team Members</div>
              <div className="spacer" />
              {rosterStatus ? (
                <div className="small" style={{ alignSelf: "center", marginRight: 8 }}>
                  {rosterStatus}
                </div>
              ) : null}
              {canViewAllParticipantData && !isEditingRoster ? (
                <button className="btn" type="button" onClick={handleStartRosterEdit}>
                  Edit Roster
                </button>
              ) : null}
            </div>

            {canViewAllParticipantData && isEditingRoster ? (
              <div style={{ display: "grid", gap: 12 }}>
                {rosterDraft.map((member, index) => (
                  <div
                    key={member.id || `draft-${index}`}
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
                    Add Member
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
                    <th>Email</th>
                    <th>Project Dates</th>
                    {canViewAllParticipantData && <th>Fundraising</th>}
                  </tr>
                </thead>
                <tbody>
                  {teamTabMembers.length > 0 ? (
                    teamTabMembers.map((member) => (
                      <tr key={member.key}>
                        <td style={{ fontWeight: 800 }}>
                          {canViewAllParticipantData && member.profileId ? (
                            <Link href={`/profile?participantId=${encodeURIComponent(member.profileId)}`}>
                              {member.name}
                            </Link>
                          ) : (
                            member.name
                          )}
                        </td>
                        <td>
                          {member.role ? (
                            <span className={"badge " + (member.role === "Leader" ? "badgeWarn" : "")}>
                              {member.role}
                            </span>
                          ) : (
                            <span className="small">Team Member</span>
                          )}
                        </td>
                        <td>{member.email || "Not set"}</td>
                        <td>{formatTripDateRange(member.startDate, member.endDate)}</td>
                        {canViewAllParticipantData && (
                          <td>
                            {member.fundraisingUrl ? (
                              <a href={member.fundraisingUrl} target="_blank" rel="noreferrer">
                                Open
                              </a>
                            ) : (
                              <span className="small">Not added</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={canViewAllParticipantData ? 5 : 4} className="small">
                        No team members added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {canViewAllParticipantData && (
            <div className="card pad">
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Reference Emails</div>
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
                  {trip.participants.map((participant) => {
                    const referenceStatus = getReferenceStatus(participant.id);

                    return (
                      <tr key={`${participant.email}-reference`}>
                        <td style={{ fontWeight: 800 }}>{participant.name}</td>
                        <td style={{ minWidth: 260 }}>
                          <div style={{ display: "grid", gap: 8 }}>
                            <input
                              className="input"
                              value={referenceStatus.referenceName || ""}
                              placeholder="Reference name"
                              onChange={(e) =>
                                updateReferenceField(
                                  participant.id,
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
                                  participant.id,
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
                                  participant.id,
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
                                toggleReferenceEmail(participant.id, "sent")
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
                              updateReferenceSentDate(participant.id, e.target.value)
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
                                toggleReferenceEmail(participant.id, "received")
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
          )}
        </div>
      )}

      {tab === "Fundraising" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card pad">
            <div className="cardSectionPill" style={{ marginBottom: 14 }}>Fundraising Deadlines</div>
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

          <div className="card pad">
            <div className="cardSectionPill" style={{ marginBottom: 14 }}>
              {canViewAllParticipantData ? "Fundraising Pages" : "My Fundraising"}
            </div>
            <p className="small">
              {canViewAllParticipantData
                ? "Save a shared team page or personal Neon links for each participant."
                : trip?.teamFundraisingUrl
                  ? "Your team uses one shared Neon fundraising page, and you can also see each team member's page below."
                  : "This page shows your team's fundraising pages."}
            </p>
            <div style={{ height: 10 }} />

            {!canViewAllParticipantData && trip?.teamFundraisingUrl ? (
              <div className="card pad" style={{ boxShadow: "none" }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Shared Team Fundraising Page</div>
                <div className="small" style={{ marginBottom: 10 }}>
                  Your whole team uses this one Neon page.
                </div>
                <a className="btn btnPrimary" href={trip.teamFundraisingUrl} target="_blank" rel="noreferrer">
                  Open Team Neon Page
                </a>
              </div>
            ) : null}

            {visibleFundraisingParticipants.length === 0 ? (
              !canViewAllParticipantData && trip?.teamFundraisingUrl ? null : (
                <div className="small">No fundraising record found for this login.</div>
              )
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                {visibleFundraisingParticipants.map((participant) => {
                  const isEditingParticipantLink =
                    editingParticipantFundraisingId === participant.id;
                  return (
                    <div
                      key={participant.email}
                      className="card pad"
                      style={{
                        boxShadow: "none",
                        minHeight: 220,
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
                          <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>
                            {participant.name}
                          </div>
                          <div className="spacer" />
                          <span className={"badge " + (participant.fundraisingUrl ? "badgeSuccess" : "badgeWarn")}>
                            {participant.fundraisingUrl ? "Ready" : "Missing"}
                          </span>
                        </div>
                        <div className="small" style={{ marginBottom: 12 }}>
                          {participant.fundraisingUrl
                            ? "Personal Neon fundraising page saved."
                            : "No personal Neon link added yet."}
                        </div>
                      </div>
                      <div>
                        {participant.fundraisingUrl ? (
                          <a className="btn btnPrimary" href={participant.fundraisingUrl} target="_blank" rel="noreferrer">
                            Open Neon Page
                          </a>
                        ) : (
                          <div className="small">No Neon link added yet.</div>
                        )}
                      </div>
                      {canViewAllParticipantData && (
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {canViewAllParticipantData && (
            <div className="card pad">
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Shared Team Fundraising Page</div>
              <div className="small" style={{ marginBottom: 10 }}>
                Use this when the whole team shares one Neon fundraising page.
              </div>
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
        </div>
      )}

      {tab === "Training" && (
        <div style={{ display: "grid", gap: 16 }}>
          {canManageTrips && (
            <div className="card pad">
              <div className="row" style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 900 }}>Training Progress</div>
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
          )}

          <div className="card pad">
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Training</div>
            <p className="small">
              Central place for training links and module tracking.
            </p>

            <div style={{ height: 14 }} />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {trainingResources.map((resource) => (
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: canViewAllParticipantData
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
                        {canViewAllParticipantData ? participant.name : "My Training"}
                      </div>
                      {canViewAllParticipantData && (
                        <div className="small">{participant.email}</div>
                      )}
                    </div>
                    <div className="spacer" />
                    <span className="badge">{participant.percent}% complete</span>
                  </div>

                  <div style={{ fontWeight: 900, marginBottom: 10 }}>Canvas Modules</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {canvasTrainingModules.map((module) => (
                      <div
                        key={`${participant.email}-${module.id}`}
                        className="card pad"
                        style={{ boxShadow: "none", borderColor: "rgba(15, 23, 42, 0.08)" }}
                      >
                        <div className="row" style={{ alignItems: "flex-start" }}>
                          <input
                            type="checkbox"
                            checked={!!trainingState[module.id]}
                            onChange={() => toggleTraining(module.id, participant.email)}
                            style={{ marginTop: 3 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 900 }}>{module.title}</div>
                          </div>
                          <span className={"badge " + (!!trainingState[module.id] ? "badgeSuccess" : "badgeDanger")}>
                            {!!trainingState[module.id] ? "Complete" : "Not started"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div className="small" style={{ fontWeight: 900, marginBottom: 8 }}>
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
                                {!!trainingState[module.id] ? "Done" : "Open"}
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

          <div className="small">
            Training progress is loaded from Supabase for each assigned user.
          </div>
        </div>
      )}

      {tab === "Tasks" && (
        <div style={{ display: "grid", gap: 16 }}>
          {canManageTrips && (
            <div className="card pad">
              <div className="row">
                <div style={{ fontWeight: 900 }}>Worker Tasks</div>
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
          )}

          <div className="card pad">
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>Task Progress</div>
              <div className="spacer" />
              <span className="badge">{overviewTaskPct}% complete</span>
            </div>

            <div className="progress">
              <div style={{ width: `${overviewTaskPct}%` }} />
            </div>

            <div className="small" style={{ marginTop: 8 }}>
              {canViewAllParticipantData
                ? "Overall completion across all participant task lists."
                : "Your current task completion for this trip."}
            </div>

            <div
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
                      {canViewAllParticipantData ? participant.name : "My Tasks"}
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: canViewAllParticipantData
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
                        {canViewAllParticipantData ? participant.name : "My Tasks"}
                      </div>
                      {canViewAllParticipantData && (
                        <div className="small">{participant.email}</div>
                      )}
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

                              return (
                                <div
                                  key={`${participant.email}-${task.id}`}
                                  className="row"
                                  style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={done}
                                    onChange={() => toggleTask(task.id, participant.email)}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 900 }}>{task.title}</div>
                                    <div className="small">Due: {task.due || "Not set"}</div>
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

          <div className="small">
            Task progress is loaded from Supabase for each assigned user.
          </div>
        </div>
      )}

      {tab === "Documents" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card pad">
            <div className="row" style={{ marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 900 }}>Documents & Links</div>
                <div className="small">Required trip documents stay visible even before staff uploads them.</div>
              </div>
              <div className="spacer" />
              {canViewAllParticipantData && (
                <div className="row">
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
              )}
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

            <div style={{ fontWeight: 900, marginBottom: 10 }}>Required Documents</div>
            <div style={{ display: "grid", gap: 12 }}>
              {requiredDocumentSlots.map((slot) => {
                const doc = slot.resource;
                const available = !!(doc?.pdfUrl || doc?.link);
                const isEditing = editingDocId === doc?.id;
                const isPdf = !!doc?.pdfUrl || slot.kind === "pdf";

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
                            {doc?.createdAt ? (
                              <div className="small" style={{ marginTop: 4 }}>
                                Updated {new Date(doc.createdAt).toLocaleDateString()}
                              </div>
                            ) : (
                              <div className="small" style={{ marginTop: 4 }}>Coming soon</div>
                            )}
                          </>
                        )}
                      </div>
                      <span className={"badge " + (available ? "badgeSuccess" : "badgeWarn")}>
                        {available ? (isPdf ? "PDF Ready" : "Link Ready") : "Coming Soon"}
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
                      {canViewAllParticipantData && !isEditing && doc ? (
                        <>
                          <button className="btn" type="button" onClick={() => handleEditDoc(doc)}>
                            Edit
                          </button>
                          <button className="btn" type="button" onClick={() => handleDeleteDoc(doc.id)}>
                            Delete
                          </button>
                        </>
                      ) : null}
                      {canViewAllParticipantData && !doc ? (
                        slot.kind === "pdf" ? (
                          <button className="btn" type="button" onClick={() => handlePrepareRequiredPdf(slot)}>
                            Upload PDF
                          </button>
                        ) : (
                          <button className="btn" type="button" onClick={() => handlePrepareRequiredLink(slot)}>
                            Add Link
                          </button>
                        )
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ fontWeight: 900, marginTop: 18, marginBottom: 10 }}>Other Documents</div>
            {optionalDocsByCategory.length === 0 ? (
              <div className="small">No extra documents yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                {optionalDocsByCategory.map(([category, categoryDocs]) => (
                  <div key={category}>
                    <div className="small" style={{ fontWeight: 900, marginBottom: 8 }}>{category}</div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {categoryDocs.map((d) => {
                        const available = !!(d.pdfUrl || d.link);
                        const isEditing = editingDocId === d.id;
                        const isPdf = !!d.pdfUrl;

                        return (
                          <div
                            key={d.id}
                            className="row"
                            style={{
                              padding: "10px 0",
                              borderBottom: "1px solid var(--border)",
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
                                  <div className="small">
                                    {isPdf ? "PDF" : "Link"}
                                    {d.workArea ? ` • ${d.workArea}` : ""}
                                    {d.createdAt ? ` • ${new Date(d.createdAt).toLocaleDateString()}` : ""}
                                  </div>
                                </>
                              )}
                              {canViewAllParticipantData && !isEditing ? (
                                <div className="row" style={{ marginTop: 10 }}>
                                  <button className="btn" type="button" onClick={() => handleEditDoc(d)}>
                                    Edit
                                  </button>
                                  <button className="btn" type="button" onClick={() => handleDeleteDoc(d.id)}>
                                    Delete
                                  </button>
                                </div>
                              ) : null}
                            </div>

                            <span className={"badge " + (available ? "badgeSuccess" : "badgeWarn")}>
                              {isPdf ? "PDF" : available ? "Link ready" : "Missing URL"}
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {tab === participantDocumentsTabLabel && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card pad">
            <div className="row" style={{ marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 900 }}>
                  {canViewAllParticipantData ? "Participant Uploads" : "My Documents"}
                </div>
                <div className="small">
                  {canViewAllParticipantData
                    ? "Passport and visa uploads for each participant on this trip."
                    : "Upload your passport and visa here. Staff can review them from your profile later too."}
                </div>
              </div>
            </div>

            {participantDocumentsError ? (
              <div className="small" style={{ color: "var(--danger)", marginBottom: 12 }}>
                {participantDocumentsError}
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: canViewAllParticipantData
                  ? "repeat(auto-fit, minmax(280px, 1fr))"
                  : "1fr",
                gap: 16,
              }}
            >
              {(canViewAllParticipantData
                ? trip.participants || []
                : currentParticipant
                  ? [currentParticipant]
                  : []
              ).map((participant) => {
                const documentSlots = participantDocumentsByUserId.get(String(participant.id)) || {};

                return (
                  <div key={participant.id} className="card pad" style={{ boxShadow: "none" }}>
                    <div className="row" style={{ marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>
                          {canViewAllParticipantData ? (
                            <Link href={`/profile?participantId=${encodeURIComponent(participant.id)}`}>
                              {participant.name}
                            </Link>
                          ) : (
                            "My Uploads"
                          )}
                        </div>
                        <div className="small">{participant.email}</div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                      {USER_DOCUMENT_TYPES.map((documentType) => {
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

                              {canViewAllParticipantData && document ? (
                                <button
                                  className="btn"
                                  type="button"
                                  onClick={() => handleDeleteParticipantDocument(document)}
                                >
                                  Delete
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
        </div>
      )}
            {tab === "Staff Tasks" && canManageTrips && (
              <div className="card pad">
                <div className="row" style={{ marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>Staff Tasks</div>
                    <div className="small">
                      {completedCount} of {totalCount} complete
                    </div>
                  </div>

                  <div className="spacer" />

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
                  <div className="small" style={{ marginBottom: 12 }}>
                    {staffTaskStatus}
                  </div>
                ) : null}

                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: "36%" }}>Task</th>
                      <th style={{ width: "10%", textAlign: "center" }}>Assigned To</th>
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

                          return (
                            <tr key={t.id} className="staffTaskRow">
                              <td>
                                {isEditingTitle ? (
                                  <input
                                    className="input"
                                    value={staffTaskTitleDraft}
                                    onChange={(e) => setStaffTaskTitleDraft(e.target.value)}
                                  />
                                ) : (
                                  <span style={{ fontSize: "14px", fontWeight: 600 }}>
                                    {t.taskName || t.title || "-"}
                                  </span>
                                )}
                              </td>

                              <td style={{ textAlign: "center" }}>
                                {isEditingTitle ? (
                                  <select
                                    className="input"
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
                                  <span style={{ fontSize: "14px" }}>
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
            )}

    </Shell>
  );
}
