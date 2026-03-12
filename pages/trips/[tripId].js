import Shell from "@/components/Shell";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { requireSession } from "@/lib/auth";
import { getTripForCurrentUser, listTripParticipants } from "@/lib/trips";
import { isManagerRole } from "@/lib/roles";
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
import { percentComplete } from "@/lib/tasks";
import {
  loadStaffTasks,
  saveStaffTasks as persistStaffTasks,
  sortStaffTasksByTemplate,
  staffTasksKey,
  STAFF_TASKS_UPDATED_EVENT,
} from "@/lib/staffTasks";
import {
  createTripTask,
  listTripTasks,
  listUserTaskProgress,
  saveUserTaskProgress,
} from "@/lib/tripTasks";

const STAFF_TASK_AREA_LABELS = {
  "Team/Project Formation": "Project Formation",
  "Support During Project": "During Project",
};

export default function TripPage() {
  const router = useRouter();
  const { tripId } = router.query;

  const [tab, setTab] = useState("Overview");
  const [participantTaskStates, setParticipantTaskStates] = useState({});
  const [participantTrainingStates, setParticipantTrainingStates] = useState({});
  const [session, setSession] = useState(null);
  const [trainingModules, setTrainingModules] = useState([]);
  const [docs, setDocs] = useState([]);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState({ title: "", link: "", workArea: "" });
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

  const [trip, setTrip] = useState(null);
  const [tripLoadComplete, setTripLoadComplete] = useState(false);
  const [editableStaffTasks, setEditableStaffTasks] = useState([]);
  const [editingStaffTaskId, setEditingStaffTaskId] = useState(null);
  const [editingDueDateTaskId, setEditingDueDateTaskId] = useState(null);
  const [staffTaskTitleDraft, setStaffTaskTitleDraft] = useState("");

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
      url: "https://canvas.example.com/course/123",
      icon: "CV",
      accent: "#2f4993",
    },
    {
      id: "basic",
      title: "Basic Training",
      description: "Core pre-trip foundations and prep.",
      url: "https://example.com/basic-training",
      icon: "BT",
      accent: "#3caae1",
    },
    {
      id: "gateway",
      title: "Gateway Training",
      description: "Gateway content and EndMeeting follow-through.",
      url: "https://example.com/gateway-training",
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
  }, [trip]);

  useEffect(() => {
    if (!trip) return;

    let cancelled = false;

    async function loadTripData() {
      const [participantsResult, modulesResult, progressResult, tasksResult, taskProgressResult] =
        await Promise.allSettled([
          listTripParticipants(trip.id),
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
      const modules = getSettledValue(modulesResult, [], "training modules");
      const progress = getSettledValue(progressResult, [], "training progress");
      const tasks = getSettledValue(tasksResult, [], "trip tasks");
      const taskProgress = getSettledValue(
        taskProgressResult,
        [],
        "task progress"
      );

      setTrip((current) => (current ? { ...current, participants, tasks } : current));
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
    const key = `referenceEmails:${trip.id}`;
    const saved = localStorage.getItem(key);
    setReferenceEmails(saved ? JSON.parse(saved) : {});
  }, [trip]);

  useEffect(() => {
    if (!trip) return;
    const syncStaffTasks = () => {
      setEditableStaffTasks(loadStaffTasks(trip));
    };

    syncStaffTasks();

    function handleTaskUpdate(event) {
      if (!event.detail?.tripId || event.detail.tripId === trip.id) {
        syncStaffTasks();
      }
    }

    function handleStorage(event) {
      if (!event.key || event.key === staffTasksKey(trip.id)) {
        syncStaffTasks();
      }
    }

    window.addEventListener(STAFF_TASKS_UPDATED_EVENT, handleTaskUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(STAFF_TASKS_UPDATED_EVENT, handleTaskUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [trip]);

  async function handleAddDocument(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const created = await addPdfResource({
        title: file.name,
        file,
        workArea: trip?.name || "",
        tripId: trip?.id,
      });
      setDocs((current) => [created, ...current]);
      setDocsError("");
    } catch (error) {
      console.error("Unable to add PDF resource", error);
      setDocsError(error.message || "Unable to save resources.");
    } finally {
      event.target.value = "";
    }
  }

  function handleAddLink() {
    setIsAddingLink(true);
    setLinkDraft({ title: "", link: "", workArea: trip?.name || "" });
  }

  function handleCancelAddLink() {
    setIsAddingLink(false);
    setLinkDraft({ title: "", link: "", workArea: trip?.name || "" });
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
        workArea: docDraft.workArea,
        tripId: trip?.id,
      });
      const updated = await updateResource({
        id: docDraft.id,
        title: created.title,
        link: null,
        pdfUrl: created.pdfUrl,
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

  function saveReferenceEmails(nextReferenceEmails) {
    setReferenceEmails(nextReferenceEmails);
    if (!trip) return;
    localStorage.setItem(
      `referenceEmails:${trip.id}`,
      JSON.stringify(nextReferenceEmails)
    );
  }

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
        goalAmount: participant.fundraisingGoal || 0,
        raisedAmount: participant.fundraisingRaised || 0,
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
                  fundraisingGoal: savedProfile.goalAmount,
                  fundraisingRaised: savedProfile.raisedAmount,
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

  function getReferenceStatus(email) {
    return referenceEmails[email] || {
      referenceName: "",
      referenceEmail: "",
      referencePhone: "",
      sent: false,
      received: false,
      sentDate: "",
    };
  }

  function toggleReferenceEmail(email, field) {
    const current = getReferenceStatus(email);
    const nextValue = !current[field];

    saveReferenceEmails({
      ...referenceEmails,
      [email]: {
        ...current,
        [field]: nextValue,
        sentDate:
          field === "sent" && !nextValue ? "" : current.sentDate || "",
      },
    });
  }

  function updateReferenceSentDate(email, value) {
    const current = getReferenceStatus(email);
    saveReferenceEmails({
      ...referenceEmails,
      [email]: {
        ...current,
        sent: value ? true : current.sent,
        sentDate: value,
      },
    });
  }

  function updateReferenceField(email, field, value) {
    const current = getReferenceStatus(email);
    saveReferenceEmails({
      ...referenceEmails,
      [email]: {
        ...current,
        [field]: value,
      },
    });
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

  function saveStaffTasks(nextTasks) {
    const orderedTasks = sortStaffTasksByTemplate(nextTasks);
    setEditableStaffTasks(orderedTasks);
    if (!trip) return;
    persistStaffTasks(trip.id, orderedTasks);
  }

  function updateStaffTask(taskId, field, value) {
    saveStaffTasks(
      editableStaffTasks.map((task) =>
        task.id === taskId ? { ...task, [field]: value } : task
      )
    );
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
        return "badge";
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

  function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  function getFundraisingTotals(participants = []) {
    const totals = participants.reduce(
      (sum, participant) => ({
        raised: sum.raised + Number(participant.fundraisingRaised || 0),
        goal: sum.goal + Number(participant.fundraisingGoal || 0),
      }),
      { raised: 0, goal: 0 }
    );

    return {
      ...totals,
      percent: totals.goal ? Math.round((totals.raised / totals.goal) * 100) : 0,
    };
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

  function getSettledValue(result, fallback, label) {
    if (result.status === "fulfilled") {
      return result.value;
    }

    console.error(`Unable to load ${label}`, result.reason);
    return fallback;
  }

  const groupedViewTasks = groupTasksByWorkArea(editableStaffTasks || []);

  const completedCount = (editableStaffTasks || []).filter(
    (t) => t.progress === "Complete"
  ).length;
  const totalCount = (editableStaffTasks || []).length;
  const completionPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const canManageTrips = isManagerRole(session?.permissionRole || session?.role);
  const canViewAllParticipantData = canManageTrips;

  const currentParticipant = useMemo(() => {
    if (!trip || !session || canViewAllParticipantData) return null;

    return (
      trip.participants.find(
        (participant) =>
          participant.email.toLowerCase() === session.email.toLowerCase()
      ) || null
    );
  }, [trip, session, canViewAllParticipantData]);

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
    if (!session) return null;

    return (
      participantTaskProgress.find(
        (participant) =>
          participant.email.toLowerCase() === session.email.toLowerCase()
      ) || null
    );
  }, [participantTaskProgress, session]);

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
    if (!session) return null;

    return (
      trainingProgress.find(
        (participant) =>
          participant.email.toLowerCase() === session.email.toLowerCase()
      ) || null
    );
  }, [trainingProgress, session]);

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

  const teamFundraisingTotals = useMemo(() => {
    if (!trip) return { raised: 0, goal: 0, percent: 0 };
    return getFundraisingTotals(trip.participants || []);
  }, [trip]);

  const visibleFundraisingParticipants = useMemo(() => {
    if (!trip) return [];
    if (canViewAllParticipantData) return trip.participants || [];
    return currentParticipant ? [currentParticipant] : [];
  }, [trip, canViewAllParticipantData, currentParticipant]);

  const visibleFundraisingTotals = useMemo(() => {
    return getFundraisingTotals(visibleFundraisingParticipants);
  }, [visibleFundraisingParticipants]);

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
        (participant) => !!getReferenceStatus(participant.email).received
      ).length;

      return {
        label: "References Received",
        percent: total ? Math.round((completed / total) * 100) : 0,
        completed,
        total,
      };
    }

    const received = currentParticipant
      ? !!getReferenceStatus(currentParticipant.email).received
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
  const overviewFundraisingLabel = canViewAllParticipantData ? "Team Fundraising" : "My Fundraising";
  const overviewFundraisingTotals = canViewAllParticipantData
    ? teamFundraisingTotals
    : visibleFundraisingTotals;
  const visibleTaskParticipants = canViewAllParticipantData
    ? participantTaskProgress
    : currentParticipantProgress
      ? [currentParticipantProgress]
      : [];
  const visibleTrainingParticipants = canViewAllParticipantData
    ? trainingProgress
    : currentTrainingProgress
      ? [currentTrainingProgress]
      : [];

  const tabs = 
    canManageTrips
      ? ["Overview", "Team", "Fundraising", "Training", "Tasks", "Documents", "Staff Tasks"]
      : ["Overview", "Team", "Fundraising", "Training", "Tasks", "Documents"];

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

  return (
    <Shell>
      <div className="row" style={{ marginBottom: 10 }}>
        <div>
          <h1 className="h1" style={{ marginBottom: 2 }}>{trip.name}</h1>
          <div className="small">{trip.location} • {trip.dates}</div>
        </div>
        <div className="spacer" />
        <div className="badge">{trip.participants.length} participants</div>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div className="small" style={{ marginBottom: 8 }}>Trip completion</div>
          <div className="progress"><div style={{ width: `${pct}%` }} /></div>
          <div className="small" style={{ marginTop: 6 }}>{pct}% complete</div>
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
              <div style={{ fontSize: 28, fontWeight: 900 }}>{overviewFundraisingTotals.percent}%</div>
              <div className="progress" style={{ marginTop: 10 }}>
                <div style={{ width: `${Math.min(overviewFundraisingTotals.percent, 100)}%` }} />
              </div>
              <div className="small" style={{ marginTop: 8 }}>
                {formatMoney(overviewFundraisingTotals.raised)} of {formatMoney(overviewFundraisingTotals.goal)} raised.
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
            <div className="card pad">
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Trip Details</div>
              <div className="small">Staff lead</div>
              <div style={{ fontWeight: 800 }}>{trip.staffLead}</div>
              <div className="small">{trip.staffEmail}</div>
              <div style={{ height: 12 }} />
              <div className="small">Location</div>
              <div style={{ fontWeight: 800 }}>{trip.location}</div>
              <div style={{ height: 12 }} />
              <div className="small">Dates</div>
              <div style={{ fontWeight: 800 }}>{trip.dates}</div>
            </div>

            <div className="card pad">
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Quick Links</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {trip.quickLinks.map(l => (
                  <li key={l.label} style={{ marginBottom: 8 }}>
                    <a href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
                  </li>
                ))}
              </ul>
              <div style={{ height: 10 }} />
              <div className="small">
                Later, this is where Neon + Canvas links can be automatically pulled per trip.
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "Team" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card pad">
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Team Roster</div>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th><th>Role</th><th>Email</th>{canViewAllParticipantData && <th>Fundraising</th>}
                </tr>
              </thead>
              <tbody>
                {trip.participants.map(p => (
                  <tr key={p.email}>
                    <td style={{ fontWeight: 800 }}>{p.name}</td>
                    <td><span className={"badge " + (p.role === "Leader" ? "badgeWarn" : "")}>{p.role}</span></td>
                    <td>{p.email}</td>
                    {canViewAllParticipantData && (
                      <td><a href={p.fundraisingUrl} target="_blank" rel="noreferrer">Open</a></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canManageTrips && (
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
                    const referenceStatus = getReferenceStatus(participant.email);

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
                                  participant.email,
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
                                  participant.email,
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
                                  participant.email,
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
                                toggleReferenceEmail(participant.email, "sent")
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
                              updateReferenceSentDate(participant.email, e.target.value)
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
                                toggleReferenceEmail(participant.email, "received")
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

              <div className="small" style={{ marginTop: 12 }}>
                Reference email tracking is saved locally for this demo trip.
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "Fundraising" && (
        <div style={{ display: "grid", gap: 16 }}>
          {canViewAllParticipantData && (
            <div className="card pad">
              <div className="row" style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 900 }}>Team Fundraising Overview</div>
                <div className="spacer" />
                <span className="badge badgeSuccess">{teamFundraisingTotals.percent}%</span>
              </div>
              <div className="progress">
                <div style={{ width: `${Math.min(teamFundraisingTotals.percent, 100)}%` }} />
              </div>
              <div className="small" style={{ marginTop: 8 }}>
                {formatMoney(teamFundraisingTotals.raised)} raised of {formatMoney(teamFundraisingTotals.goal)} total goal.
              </div>
            </div>
          )}

          <div className="card pad">
            <div style={{ fontWeight: 900, marginBottom: 8 }}>
              {canViewAllParticipantData ? "Fundraising Pages" : "My Fundraising"}
            </div>
            <p className="small">
              {canViewAllParticipantData
                ? "Admin and staff can view every participant's fundraising progress."
                : "This page only shows your own fundraising progress."}
            </p>
            <div style={{ height: 10 }} />

            {visibleFundraisingParticipants.length === 0 ? (
              <div className="small">No fundraising record found for this login.</div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                {visibleFundraisingParticipants.map((participant) => {
                  const individualPct = participant.fundraisingGoal
                    ? Math.round(
                        (Number(participant.fundraisingRaised || 0) /
                          Number(participant.fundraisingGoal)) *
                          100
                      )
                    : 0;

                    return (
                    <div key={participant.email} className="card pad" style={{ boxShadow: "none" }}>
                      <div className="row" style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 900 }}>{participant.name}</div>
                        <div className="spacer" />
                        <span className="badge badgeSuccess">{individualPct}%</span>
                      </div>
                      <div className="progress">
                        <div style={{ width: `${Math.min(individualPct, 100)}%` }} />
                      </div>
                      <div className="small" style={{ marginTop: 8 }}>
                      {formatMoney(participant.fundraisingRaised || 0)} of {formatMoney(participant.fundraisingGoal || 0)} raised.
                      </div>
                      <div style={{ height: 10 }} />
                      {participant.fundraisingUrl ? (
                        <a className="btn btnPrimary" href={participant.fundraisingUrl} target="_blank" rel="noreferrer">
                          Open Neon Page
                        </a>
                      ) : (
                        <div className="small">No Neon link added yet.</div>
                      )}
                      {canViewAllParticipantData && (
                        <>
                          <div style={{ height: 12 }} />
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
                          <button
                            className="btn"
                            type="button"
                            onClick={() => handleSaveFundraising(participant)}
                          >
                            Save Neon Link
                          </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                    <div style={{ display: "grid", gap: 10 }}>
                      {supplementalTrainingModules.map((module) => (
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
                              <div style={{ marginTop: 8 }}>
                                <div className="small" style={{ marginBottom: 6 }}>Date Attended</div>
                                <input
                                  className="input"
                                  type="date"
                                  value={trainingState[`${module.id}Date`] || ""}
                                  onChange={(e) =>
                                    updateTrainingDate(module.id, e.target.value, participant.email)
                                  }
                                />
                              </div>
                            </div>
                            <span className={"badge " + (!!trainingState[module.id] ? "badgeSuccess" : "badgeDanger")}>
                              {!!trainingState[module.id] ? "Complete" : "Not started"}
                            </span>
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
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Add Task</div>
              <div style={{ display: "grid", gap: 10 }}>
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
                    trip.tasks.map((task) => {
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
                            <div className="small">Due: {task.due}</div>
                          </div>
                          <span className={"badge " + (done ? "badgeSuccess" : "badgeDanger")}>
                            {done ? "Complete" : "Not started"}
                          </span>
                        </div>
                      );
                    })
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
              <div className="card pad">
                <div className="row" style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 900 }}>Documents & Links</div>
                  <div className="spacer" />
                  {canManageTrips && (
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
                    <div style={{ fontWeight: 900, marginBottom: 10 }}>New Link</div>
                    <div style={{ display: "grid", gap: 10 }}>
                      <input
                        className="input"
                        value={linkDraft.title}
                        onChange={(e) =>
                          setLinkDraft((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Training folder"
                      />
                      <input
                        className="input"
                        value={linkDraft.link}
                        onChange={(e) =>
                          setLinkDraft((prev) => ({ ...prev, link: e.target.value }))
                        }
                        placeholder="https://..."
                      />
                      <input
                        className="input"
                        value={linkDraft.workArea}
                        onChange={(e) =>
                          setLinkDraft((prev) => ({ ...prev, workArea: e.target.value }))
                        }
                        placeholder="Work area"
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

                {docs.length === 0 ? (
                  <div className="small">No documents yet.</div>
                ) : (
                  docs.map((d) => {
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
                              <input
                                className="input"
                                value={docDraft?.workArea || ""}
                                onChange={(e) =>
                                  setDocDraft((prev) => ({ ...prev, workArea: e.target.value }))
                                }
                                placeholder="Work area"
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

                          {canManageTrips && (
                            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                              {!isEditing && (
                                <div className="row">
                                  <button className="btn" type="button" onClick={() => handleEditDoc(d)}>
                                    Edit
                                  </button>
                                  <button
                                    className="btn"
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await deleteResource(d.id);
                                        setDocs((current) =>
                                          current.filter((doc) => doc.id !== d.id)
                                        );
                                        setDocsError("");
                                      } catch (error) {
                                        console.error("Unable to delete resource", error);
                                        setDocsError(
                                          error.message || "Unable to save resources."
                                        );
                                      }
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <span className={"badge " + (available ? "badgeSuccess" : "badgeWarn")}>
                          {isPdf ? "PDF" : available ? "Link ready" : "Missing URL"}
                        </span>

                        {available ? (
                          <a
                            className="btn btnPrimary"
                            href={d.pdfUrl || d.link}
                            target="_blank"
                            rel="noreferrer"
                          >
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
                    );
                  })
                )}
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
                                  className="input"
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
                                      updateStaffTask(t.id, "notes", e.target.value)
                                    }
                                  />
                                  {t.notes ? (
                                    <div className="staffTaskNotesTooltip" role="note">
                                      {t.notes}
                                    </div>
                                  ) : null}
                                </div>
                              </td>

                              <td>
                                <div className="staffTaskRowActions">
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
