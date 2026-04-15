import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import AppDueDateTripleSelect from "@/components/AppDueDateTripleSelect";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { requireSession } from "@/lib/auth";
import {
  listTripsForCurrentUser,
  TRIPS_UPDATED_EVENT,
} from "@/lib/trips";
import { isAdminRole, isManagerRole } from "@/lib/roles";
import {
  computeStaffTaskDueDate,
  deleteStaffMiscTask,
  isTaskAssignedToUser,
  isMissingStaffMiscTasksTableError,
  listStaffMiscTasksForUser,
  listStaffTasksForTrip,
  saveStaffMiscTask,
  saveStaffTasks,
  STAFF_MISC_TASKS_UPDATED_EVENT,
  STAFF_TASKS_UPDATED_EVENT,
  toCalendarDatePart,
} from "@/lib/staffTasks";

const PROGRESS_OPTIONS = [
  "Not started",
  "In progress",
  "Waiting",
  "Complete",
];

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

function formatAdminDueDate(value) {
  const ymd = toCalendarDatePart(value);
  if (!ymd) return "Not set";
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Admin() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [sortMode, setSortMode] = useState("dueDate");
  const [staffTasksByTrip, setStaffTasksByTrip] = useState({});
  const [miscTasks, setMiscTasks] = useState([]);
  const [editingTaskKey, setEditingTaskKey] = useState(null);
  const [editingTaskDraft, setEditingTaskDraft] = useState(null);
  const [isAddingMiscTask, setIsAddingMiscTask] = useState(false);
  const [newMiscTaskDraft, setNewMiscTaskDraft] = useState({
    taskName: "",
    workArea: "Personal Task",
    dueDate: "",
    progress: "Not started",
    notes: "",
  });
  const [trips, setTrips] = useState([]);
  const [staffTaskStatus, setStaffTaskStatus] = useState("");
  const latestStaffTaskSaveRef = useRef(0);
  const latestMiscTaskSaveRef = useRef(0);
  const staffTasksByTripRef = useRef({});
  const miscTasksRef = useRef([]);
  const [staffTaskRowStatus, setStaffTaskRowStatus] = useState({});
  const [confirmingDeleteTaskKey, setConfirmingDeleteTaskKey] = useState("");
  const staffTaskRowTimeoutsRef = useRef({});
  const staffTaskNoteSaveTimeoutsRef = useRef({});
  const isAdminUser = isAdminRole(session?.actualRole || session?.role);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const nextSession = await requireSession(router);
      if (cancelled || !nextSession) return;

      setSession(nextSession);
      if (!isManagerRole(nextSession.permissionRole || nextSession.role)) {
        router.replace("/trips");
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    async function syncTrips() {
      try {
        setTrips(await listTripsForCurrentUser());
      } catch (error) {
        console.error("Unable to load trips", error);
      }
    }

    syncTrips();

    window.addEventListener(TRIPS_UPDATED_EVENT, syncTrips);
    window.addEventListener("storage", syncTrips);

    return () => {
      window.removeEventListener(TRIPS_UPDATED_EVENT, syncTrips);
      window.removeEventListener("storage", syncTrips);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncStaffTasks() {
      const next = {};
      await Promise.all(
        trips.map(async (trip) => {
          next[trip.id] = await listStaffTasksForTrip(trip.id);
        })
      );
      if (!cancelled) {
        setStaffTasksByTrip(next);
      }
    }

    void syncStaffTasks();

    function handleTaskUpdate() {
      void syncStaffTasks();
    }

    window.addEventListener(STAFF_TASKS_UPDATED_EVENT, handleTaskUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener(STAFF_TASKS_UPDATED_EVENT, handleTaskUpdate);
    };
  }, [trips]);

  useEffect(() => {
    let cancelled = false;

    async function syncMiscTasks() {
      if (!session?.email) {
        if (!cancelled) {
          setMiscTasks([]);
        }
        return;
      }

      try {
        const nextTasks = await listStaffMiscTasksForUser(session.email);
        if (!cancelled) {
          setMiscTasks(nextTasks);
        }
      } catch (error) {
        console.error("Unable to load misc tasks", error);
        if (!cancelled) {
          setMiscTasks([]);
        }
      }
    }

    void syncMiscTasks();

    function handleMiscTaskUpdate() {
      void syncMiscTasks();
    }

    window.addEventListener(STAFF_MISC_TASKS_UPDATED_EVENT, handleMiscTaskUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener(STAFF_MISC_TASKS_UPDATED_EVENT, handleMiscTaskUpdate);
    };
  }, [session?.email]);

  useEffect(() => {
    staffTasksByTripRef.current = staffTasksByTrip;
  }, [staffTasksByTrip]);

  useEffect(() => {
    miscTasksRef.current = miscTasks;
  }, [miscTasks]);

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

  const allTasks = useMemo(
    () => [
      ...trips.flatMap((trip) =>
        (staffTasksByTrip[trip.id] || trip.staffTasks || []).map((task) => {
          const stored = toCalendarDatePart(task.dueDate);
          const computed = toCalendarDatePart(computeStaffTaskDueDate(task, trip));
          return {
            ...task,
            tripId: trip.id,
            tripName: trip.name,
            dueDate: stored || computed || "",
          };
        })
      ),
      ...miscTasks.map((task) => ({
        ...task,
        dueDate: toCalendarDatePart(task.dueDate) || "",
      })),
    ],
    [miscTasks, staffTasksByTrip, trips]
  );

  const myTasks = useMemo(
    () =>
      allTasks.filter((task) =>
        isTaskAssignedToUser(task.assignedTo, session?.name || session?.email) ||
        isTaskAssignedToUser(task.assignedTo, session?.email)
      ),
    [allTasks, session]
  );

  const categorizedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastDue = [];
    const upcoming = [];
    const completed = [];

    myTasks.forEach((task) => {
      if (task.progress === "Complete") {
        completed.push(task);
        return;
      }

      const dueDate = parseDateSafe(task.dueDate);
      if (dueDate && dueDate < today) {
        pastDue.push(task);
        return;
      }

      upcoming.push(task);
    });

    return {
      pastDue: sortTasks(pastDue, sortMode),
      upcoming: sortTasks(upcoming, sortMode),
      completed: sortTasks(completed, sortMode),
    };
  }, [myTasks, sortMode]);

  const personalTaskCategoryOptions = useMemo(() => {
    const seen = new Set();
    const options = ["Personal Task"];

    trips.forEach((trip) => {
      const tripName = String(trip?.name || "").trim();
      if (!tripName) return;
      const key = tripName.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      options.push(tripName);
    });

    return options;
  }, [trips]);

  function setLocalMiscTaskField(taskId, field, value) {
    const nextTasks = miscTasksRef.current.map((task) =>
      task.id === taskId ? { ...task, [field]: value } : task
    );

    setMiscTasks(nextTasks);
    miscTasksRef.current = nextTasks;
    return nextTasks;
  }

  async function updateTask(tripId, taskId, field, value) {
    if (tripId === "misc") {
      const nextTasks = setLocalMiscTaskField(taskId, field, value);
      const nextTask = nextTasks.find((task) => task.id === taskId);
      const requestId = latestMiscTaskSaveRef.current + 1;
      latestMiscTaskSaveRef.current = requestId;

      setStaffTaskRowFeedback(getTaskKey(tripId, taskId), "info", "Saving...");
      try {
        setStaffTaskStatus("Saving...");
        const savedTask = await saveStaffMiscTask({
          ...nextTask,
          staffEmail: session?.email || "",
          staffName: session?.name || session?.email || "Staff",
          updatedAt: new Date().toISOString(),
        });
        if (latestMiscTaskSaveRef.current !== requestId) return;

        setMiscTasks((current) =>
          current.map((task) => (task.id === savedTask.id ? savedTask : task))
        );
        miscTasksRef.current = miscTasksRef.current.map((task) =>
          task.id === savedTask.id ? savedTask : task
        );
        setStaffTaskStatus("Saved.");
        setStaffTaskRowFeedback(getTaskKey(tripId, taskId), "success", "Saved");
      } catch (error) {
        console.error("Unable to save misc task", error);
        if (latestMiscTaskSaveRef.current !== requestId) return;
        if (isMissingStaffMiscTasksTableError(error)) {
          setStaffTaskStatus(
            "Personal tasks need the Supabase migrations `supabase/staff_misc_tasks.sql` and `supabase/staff_misc_tasks_rls.sql` run first."
          );
        } else {
          setStaffTaskStatus("Could not save task changes.");
        }
        setStaffTaskRowFeedback(getTaskKey(tripId, taskId), "error", "Could not save task changes.");
      }
      return;
    }

    const nextTripTasks = setLocalTaskField(tripId, taskId, field, value);
    console.log("[adminPage] updateTask", {
      tripId,
      taskId,
      field,
      value,
      matchedTask: nextTripTasks.find((task) => task.id === taskId) || null,
    });
    const requestId = latestStaffTaskSaveRef.current + 1;
    latestStaffTaskSaveRef.current = requestId;

    setStaffTaskRowFeedback(getTaskKey(tripId, taskId), "info", "Saving...");
    try {
      setStaffTaskStatus("Saving...");
      const tasksToPersist = nextTripTasks.map((task) => ({
        ...task,
        updatedByName: session?.name || session?.email || "Staff",
        updatedByEmail: session?.email || "",
        updatedAt: new Date().toISOString(),
      }));
      const savedTasks = await saveStaffTasks(tripId, tasksToPersist);
      if (latestStaffTaskSaveRef.current !== requestId) return;
      setStaffTasksByTrip((prev) => ({
        ...prev,
        [tripId]: savedTasks,
      }));
      staffTasksByTripRef.current = {
        ...staffTasksByTripRef.current,
        [tripId]: savedTasks,
      };
      setStaffTaskStatus("Saved.");
      setStaffTaskRowFeedback(getTaskKey(tripId, taskId), "success", "Saved");
    } catch (error) {
      console.error("Unable to save staff tasks", error);
      if (latestStaffTaskSaveRef.current !== requestId) return;
      setStaffTaskStatus("Could not save task changes.");
      setStaffTaskRowFeedback(getTaskKey(tripId, taskId), "error", "Could not save task changes.");
    }
  }

  function setLocalTaskField(tripId, taskId, field, value) {
    const baseTasks = staffTasksByTripRef.current[tripId] || [];
    const nextTripTasks = baseTasks.map((task) =>
      task.id === taskId ? { ...task, [field]: value } : task
    );

    setStaffTasksByTrip((prev) => ({
      ...prev,
      [tripId]: nextTripTasks,
    }));
    staffTasksByTripRef.current = {
      ...staffTasksByTripRef.current,
      [tripId]: nextTripTasks,
    };

    return nextTripTasks;
  }

  async function handleAddMiscTask() {
    if (!isAdminUser) {
      setStaffTaskStatus("Only admins can add personal tasks.");
      return;
    }
    if (!newMiscTaskDraft.taskName.trim()) return;

    try {
      setStaffTaskStatus("Saving...");
      const savedTask = await saveStaffMiscTask({
        ...newMiscTaskDraft,
        staffEmail: session?.email || "",
        staffName: session?.name || session?.email || "Staff",
      });
      setMiscTasks((current) => [...current, savedTask]);
      miscTasksRef.current = [...miscTasksRef.current, savedTask];
      setNewMiscTaskDraft({
        taskName: "",
        workArea: "Personal Task",
        dueDate: "",
        progress: "Not started",
        notes: "",
      });
      setIsAddingMiscTask(false);
      setStaffTaskStatus("Saved.");
    } catch (error) {
      console.error("Unable to add misc task", error);
      if (isMissingStaffMiscTasksTableError(error)) {
        setStaffTaskStatus(
          "Personal tasks need the Supabase migrations `supabase/staff_misc_tasks.sql` and `supabase/staff_misc_tasks_rls.sql` run first."
        );
      } else {
        setStaffTaskStatus("Could not save task changes.");
      }
    }
  }

  async function handleDeleteTask(task) {
    if (!task?.isMiscTask || !task?.id) return;

    try {
      await deleteStaffMiscTask(task.id);
      setMiscTasks((current) => current.filter((entry) => entry.id !== task.id));
      miscTasksRef.current = miscTasksRef.current.filter((entry) => entry.id !== task.id);
      setStaffTaskStatus("Deleted.");
      setConfirmingDeleteTaskKey("");
    } catch (error) {
      console.error("Unable to delete misc task", error);
      if (isMissingStaffMiscTasksTableError(error)) {
        setStaffTaskStatus(
          "Personal tasks need the Supabase migrations `supabase/staff_misc_tasks.sql` and `supabase/staff_misc_tasks_rls.sql` run first."
        );
      } else {
        setStaffTaskStatus("Could not delete task.");
      }
      setConfirmingDeleteTaskKey("");
    }
  }

  function clearPendingTaskNoteSave(taskKey) {
    const existingTimeout = staffTaskNoteSaveTimeoutsRef.current[taskKey];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete staffTaskNoteSaveTimeoutsRef.current[taskKey];
      return true;
    }

    return false;
  }

  function handleTaskNotesChange(tripId, taskId, value) {
    const taskKey = getTaskKey(tripId, taskId);
    if (tripId === "misc") {
      setLocalMiscTaskField(taskId, "notes", value);
    } else {
      setLocalTaskField(tripId, taskId, "notes", value);
    }
    setStaffTaskStatus("");
    clearPendingTaskNoteSave(taskKey);

    staffTaskNoteSaveTimeoutsRef.current[taskKey] = setTimeout(() => {
      delete staffTaskNoteSaveTimeoutsRef.current[taskKey];
      void updateTask(tripId, taskId, "notes", value);
    }, 700);
  }

  function flushTaskNotesSave(tripId, taskId, value) {
    const hadPendingSave = clearPendingTaskNoteSave(getTaskKey(tripId, taskId));
    if (hadPendingSave) {
      void updateTask(tripId, taskId, "notes", value);
    }
  }

  function setStaffTaskRowFeedback(taskKey, type, message) {
    if (!taskKey) return;

    const existingTimeout = staffTaskRowTimeoutsRef.current[taskKey];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete staffTaskRowTimeoutsRef.current[taskKey];
    }

    setStaffTaskRowStatus((current) => ({
      ...current,
      [taskKey]: { type, message },
    }));

    if (type === "success") {
      staffTaskRowTimeoutsRef.current[taskKey] = setTimeout(() => {
        setStaffTaskRowStatus((current) => {
          const next = { ...current };
          delete next[taskKey];
          return next;
        });
        delete staffTaskRowTimeoutsRef.current[taskKey];
      }, 1800);
    }
  }

  function handleEditTitle(task) {
    setEditingTaskKey(getTaskKey(task.tripId, task.id));
    setEditingTaskDraft({
      workArea: task.workArea || "Personal Task",
      taskName: task.taskName || task.title || "",
      dueDate: toCalendarDatePart(task.dueDate) || "",
      progress: task.progress || "Not started",
      notes: task.notes || "",
    });
  }

  function handleCancelTitleEdit() {
    setEditingTaskKey(null);
    setEditingTaskDraft(null);
  }

  async function handleSaveTitle(task) {
    const draft = editingTaskDraft;
    if (!draft) {
      handleCancelTitleEdit();
      return;
    }

    const updates = [];
    if (task.isMiscTask && String(task.workArea || "Personal Task") !== String(draft.workArea || "Personal Task")) {
      updates.push(["workArea", draft.workArea || "Personal Task"]);
    }
    if (String(task.taskName || task.title || "") !== String(draft.taskName || "")) {
      updates.push(["taskName", String(draft.taskName || "").trim() || "Untitled task"]);
    }
    if ((toCalendarDatePart(task.dueDate) || "") !== (toCalendarDatePart(draft.dueDate) || "")) {
      updates.push(["dueDate", toCalendarDatePart(draft.dueDate) || ""]);
    }
    if (String(task.progress || "Not started") !== String(draft.progress || "Not started")) {
      updates.push(["progress", draft.progress || "Not started"]);
    }
    if (String(task.notes || "") !== String(draft.notes || "")) {
      updates.push(["notes", draft.notes || ""]);
    }

    if (updates.length === 0) {
      handleCancelTitleEdit();
      return;
    }

    for (const [field, value] of updates) {
      // Save only on explicit action so rows don't reorder while editing.
      await updateTask(task.tripId, task.id, field, value);
    }
    handleCancelTitleEdit();
  }

  function handleOpenTask(task) {
    if (!task?.tripId || task.isMiscTask) return;

    void router.push({
      pathname: `/trips/${encodeURIComponent(task.tripId)}`,
      query: {
        tab: "staff-tasks",
        staffTaskId: task.id,
      },
    });
  }

  return (
    <Shell>
      <h1 className="h1" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AppIcon name="tasks" className="pageEyebrowIcon" />
        <span>My Tasks</span>
      </h1>
      <p className="p">
        Track your assigned tasks across every trip.
      </p>

      <div style={{ height: 14 }} />

      {isAdminUser && (
        <div className="card pad" style={{ marginBottom: 16 }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 900 }}>Admin Controls</div>
              <div className="small">
                Admin-only controls remain here.
              </div>
            </div>
          </div>
          <div className="small">
            Only admins can delete trips. Staff can archive trips from the trips list.
          </div>
        </div>
      )}

      <div className="card pad" style={{ marginBottom: 16 }}>
        <div className="row" style={{ marginBottom: 10 }}>
            <div>
              <div className="appSectionBadge" style={{ marginBottom: 6 }}>Tasks</div>
              <div style={{ fontWeight: 900 }}>My Tasks</div>
              <div className="small">
              {myTasks.length} total task{myTasks.length === 1 ? "" : "s"}, including your personal tasks
            </div>
          </div>
          {staffTaskStatus && staffTaskStatus !== "Saved." && staffTaskStatus !== "Saving..." ? (
            <div className="small" style={{ alignSelf: "center" }}>
              {staffTaskStatus}
            </div>
          ) : null}
          <div className="spacer" />
          {isAdminUser ? (
            <button
              className="btn"
              type="button"
              onClick={() => setIsAddingMiscTask((current) => !current)}
            >
              {isAddingMiscTask ? "Cancel" : "Add My Task"}
            </button>
          ) : null}
          <label className="small" htmlFor="admin-task-sort">
            Sort
          </label>
          <select
            id="admin-task-sort"
            className="input"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="dueDate">Due date</option>
            <option value="tripName">Project</option>
            <option value="taskName">Task</option>
            <option value="progress">Progress</option>
          </select>
        </div>

        {isAdminUser && isAddingMiscTask ? (
          <div
            className="card pad"
            style={{
              boxShadow: "none",
              background: "rgba(255,255,255,.76)",
              marginBottom: 14,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 10 }}>New Personal Task</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
                alignItems: "end",
              }}
            >
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Task</div>
                <input
                  className="input"
                  value={newMiscTaskDraft.taskName}
                  onChange={(e) =>
                    setNewMiscTaskDraft((current) => ({ ...current, taskName: e.target.value }))
                  }
                  placeholder="Something you need to remember"
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Category</div>
                <select
                  className="input"
                  value={newMiscTaskDraft.workArea}
                  onChange={(e) =>
                    setNewMiscTaskDraft((current) => ({ ...current, workArea: e.target.value }))
                  }
                >
                  {personalTaskCategoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="small" style={{ marginBottom: 6 }}>Due Date</div>
                <AppDueDateTripleSelect
                  compact
                  value={newMiscTaskDraft.dueDate}
                  onChange={(ymd) =>
                    setNewMiscTaskDraft((current) => ({ ...current, dueDate: ymd }))
                  }
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Progress</div>
                <select
                  className={`input statusSelect ${getProgressInputClass(newMiscTaskDraft.progress)}`}
                  value={newMiscTaskDraft.progress}
                  onChange={(e) =>
                    setNewMiscTaskDraft((current) => ({ ...current, progress: e.target.value }))
                  }
                >
                  {PROGRESS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Notes</div>
                <input
                  className="input"
                  value={newMiscTaskDraft.notes}
                  onChange={(e) =>
                    setNewMiscTaskDraft((current) => ({ ...current, notes: e.target.value }))
                  }
                  placeholder="Optional note"
                />
              </div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn btnPrimary" type="button" onClick={() => void handleAddMiscTask()}>
                Save My Task
              </button>
            </div>
          </div>
        ) : null}

        <div className="adminTaskSummary">
          <div className="adminTaskSummaryCard">
            <div className="small">Past Due</div>
            <div className="adminTaskSummaryValue">{categorizedTasks.pastDue.length}</div>
          </div>
          <div className="adminTaskSummaryCard">
            <div className="small">Upcoming</div>
            <div className="adminTaskSummaryValue">{categorizedTasks.upcoming.length}</div>
          </div>
          <div className="adminTaskSummaryCard">
            <div className="small">Completed</div>
            <div className="adminTaskSummaryValue">{categorizedTasks.completed.length}</div>
          </div>
        </div>
      </div>

      <TaskSection
        title="Past Due"
        tasks={categorizedTasks.pastDue}
        editingTaskKey={editingTaskKey}
        editingTaskDraft={editingTaskDraft}
        onEditingTaskDraftChange={setEditingTaskDraft}
        onEditTitle={handleEditTitle}
        onCancelTitleEdit={handleCancelTitleEdit}
        onSaveTitle={handleSaveTitle}
        onUpdateTask={updateTask}
        onDeleteTask={handleDeleteTask}
        onOpenTask={handleOpenTask}
        staffTaskRowStatus={staffTaskRowStatus}
        confirmingDeleteTaskKey={confirmingDeleteTaskKey}
        onRequestDeleteTask={setConfirmingDeleteTaskKey}
        personalTaskCategoryOptions={personalTaskCategoryOptions}
      />

      <TaskSection
        title="Upcoming"
        tasks={categorizedTasks.upcoming}
        editingTaskKey={editingTaskKey}
        editingTaskDraft={editingTaskDraft}
        onEditingTaskDraftChange={setEditingTaskDraft}
        onEditTitle={handleEditTitle}
        onCancelTitleEdit={handleCancelTitleEdit}
        onSaveTitle={handleSaveTitle}
        onUpdateTask={updateTask}
        onDeleteTask={handleDeleteTask}
        onOpenTask={handleOpenTask}
        staffTaskRowStatus={staffTaskRowStatus}
        confirmingDeleteTaskKey={confirmingDeleteTaskKey}
        onRequestDeleteTask={setConfirmingDeleteTaskKey}
        personalTaskCategoryOptions={personalTaskCategoryOptions}
      />

      <TaskSection
        title="Completed"
        tasks={categorizedTasks.completed}
        editingTaskKey={editingTaskKey}
        editingTaskDraft={editingTaskDraft}
        onEditingTaskDraftChange={setEditingTaskDraft}
        onEditTitle={handleEditTitle}
        onCancelTitleEdit={handleCancelTitleEdit}
        onSaveTitle={handleSaveTitle}
        onUpdateTask={updateTask}
        onDeleteTask={handleDeleteTask}
        onOpenTask={handleOpenTask}
        staffTaskRowStatus={staffTaskRowStatus}
        confirmingDeleteTaskKey={confirmingDeleteTaskKey}
        onRequestDeleteTask={setConfirmingDeleteTaskKey}
        personalTaskCategoryOptions={personalTaskCategoryOptions}
      />
    </Shell>
  );
}

function TaskSection({
  title,
  tasks,
  editingTaskKey,
  editingTaskDraft,
  onEditingTaskDraftChange,
  onEditTitle,
  onCancelTitleEdit,
  onSaveTitle,
  onUpdateTask,
  onDeleteTask,
  onOpenTask,
  staffTaskRowStatus,
  confirmingDeleteTaskKey,
  onRequestDeleteTask,
  personalTaskCategoryOptions,
}) {
  return (
    <div className="card pad" style={{ marginBottom: 16 }}>
      <div className="row" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 900 }}>{title}</div>
        <span className="badge">{tasks.length}</span>
      </div>

      {tasks.length === 0 ? (
        <div className="small">No tasks in this section.</div>
      ) : (
        <table className="table adminTasksTable">
          <colgroup>
            <col className="adminTaskColProject" />
            <col className="adminTaskColTask" />
            <col className="adminTaskColDue" />
            <col className="adminTaskColProgress" />
            <col className="adminTaskColNotes" />
            <col className="adminTaskColActions" />
          </colgroup>
          <thead>
            <tr>
              <th>Project</th>
              <th>Task</th>
              <th>Due Date</th>
              <th>Progress</th>
              <th>Notes</th>
              <th className="adminTaskActionsTh" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const taskKey = getTaskKey(task.tripId, task.id);
              const isEditingTitle = editingTaskKey === taskKey;
              const draft = isEditingTitle
                ? editingTaskDraft || {
                    workArea: task.workArea || "Personal Task",
                    taskName: task.taskName || task.title || "",
                    dueDate: toCalendarDatePart(task.dueDate) || "",
                    progress: task.progress || "Not started",
                    notes: task.notes || "",
                  }
                : null;
              const rowStatus = staffTaskRowStatus[taskKey];

              return (
                <tr key={taskKey} className="staffTaskRow">
                  <td className="adminTaskProjectCell" style={{ fontWeight: 700 }}>
                  {task.isMiscTask ? (
                      isEditingTitle ? (
                        <select
                          className="input"
                          value={draft?.workArea || "Personal Task"}
                          onChange={(e) =>
                            onEditingTaskDraftChange((current) => ({
                              ...(current || {}),
                              workArea: e.target.value,
                            }))
                          }
                        >
                          {personalTaskCategoryOptions.map((option) => (
                            <option key={`${taskKey}-${option}`} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ fontWeight: 700 }}>
                          {task.workArea || "Personal Task"}
                        </div>
                      )
                    ) : (
                      <div>{task.tripName}</div>
                    )}
                  </td>
                  <td className="adminTaskTaskCell">
                    {isEditingTitle ? (
                      <input
                        className="input"
                        value={draft?.taskName || ""}
                        onChange={(e) =>
                          onEditingTaskDraftChange((current) => ({
                            ...(current || {}),
                            taskName: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      task.isMiscTask ? (
                        <span className="adminTaskTitleText">
                          {task.taskName || task.title || "-"}
                        </span>
                      ) : (
                        <button
                          className="overviewTaskJumpButton adminTaskJumpButton"
                          type="button"
                          onClick={() => onOpenTask(task)}
                        >
                          {task.taskName || task.title || "-"}
                        </button>
                      )
                    )}
                  </td>
                  <td className="adminTaskDueCell">
                    {isEditingTitle ? (
                      <input
                        className="input"
                        type="date"
                        value={draft?.dueDate || ""}
                        onChange={(e) =>
                          onEditingTaskDraftChange((current) => ({
                            ...(current || {}),
                            dueDate: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      <div className="small">{formatAdminDueDate(task.dueDate)}</div>
                    )}
                  </td>
                  <td>
                    <select
                      className={`input statusSelect ${getProgressInputClass(
                        (isEditingTitle ? draft?.progress : task.progress) || "Not started"
                      )}`}
                      value={(isEditingTitle ? draft?.progress : task.progress) || "Not started"}
                      onChange={(e) => {
                        const nextProgress = e.target.value;
                        if (isEditingTitle) {
                          onEditingTaskDraftChange((current) => ({
                            ...(current || {}),
                            progress: nextProgress,
                          }));
                          return;
                        }
                        void onUpdateTask(task.tripId, task.id, "progress", nextProgress);
                      }}
                    >
                      {PROGRESS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="adminTaskNotesCell">
                    <input
                      className="input adminTaskNotesInput"
                      value={isEditingTitle ? draft?.notes || "" : task.notes || ""}
                      onChange={(e) => {
                        if (!isEditingTitle) return;
                        onEditingTaskDraftChange((current) => ({
                          ...(current || {}),
                          notes: e.target.value,
                        }));
                      }}
                      readOnly={!isEditingTitle}
                    />
                  </td>
                  <td className="adminTaskActionsCell">
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
                            onClick={onCancelTitleEdit}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btnPrimary"
                            type="button"
                            onClick={() => void onSaveTitle(task)}
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn"
                            type="button"
                            onClick={() => onEditTitle(task)}
                          >
                            Edit
                          </button>
                          {task.isMiscTask ? (
                            <button
                              className="btn"
                              type="button"
                              onClick={() => {
                                if (confirmingDeleteTaskKey === taskKey) {
                                  void onDeleteTask(task);
                                  return;
                                }
                                onRequestDeleteTask(taskKey);
                              }}
                            >
                              {confirmingDeleteTaskKey === taskKey ? "Confirm Delete" : "Delete"}
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function parseDateSafe(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sortTasks(tasks, mode) {
  const rank = {
    "Not started": 1,
    "In progress": 2,
    Waiting: 3,
    Complete: 4,
  };

  return [...tasks].sort((a, b) => {
    if (mode === "tripName") {
      return (a.tripName || "").localeCompare(b.tripName || "");
    }

    if (mode === "taskName") {
      return (a.taskName || a.title || "").localeCompare(b.taskName || b.title || "");
    }

    if (mode === "progress") {
      return (rank[a.progress] || 999) - (rank[b.progress] || 999);
    }

    const dateA = parseDateSafe(a.dueDate);
    const dateB = parseDateSafe(b.dueDate);

    if (dateA && dateB) return dateA - dateB;
    if (dateA) return -1;
    if (dateB) return 1;

    return (a.tripName || "").localeCompare(b.tripName || "");
  });
}

function getTaskKey(tripId, taskId) {
  return `${tripId}:${taskId}`;
}
