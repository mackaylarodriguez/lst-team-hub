import Shell from "@/components/Shell";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import {
  listTripsForCurrentUser,
  TRIPS_UPDATED_EVENT,
} from "@/lib/trips";
import { isAdminRole, isManagerRole } from "@/lib/roles";
import {
  isTaskAssignedToUser,
  loadStaffTasks,
  saveStaffTasks,
  STAFF_TASKS_UPDATED_EVENT,
} from "@/lib/staffTasks";

const PROGRESS_OPTIONS = [
  "Not started",
  "In progress",
  "Waiting",
  "Complete",
];

export default function Admin() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [sortMode, setSortMode] = useState("dueDate");
  const [staffTasksByTrip, setStaffTasksByTrip] = useState({});
  const [editingTaskKey, setEditingTaskKey] = useState(null);
  const [taskTitleDraft, setTaskTitleDraft] = useState("");
  const [trips, setTrips] = useState([]);
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
    const syncStaffTasks = () => {
      const next = {};
      trips.forEach((trip) => {
        next[trip.id] = loadStaffTasks(trip);
      });
      setStaffTasksByTrip(next);
    };

    syncStaffTasks();

    function handleTaskUpdate() {
      syncStaffTasks();
    }

    function handleStorage(event) {
      if (!event.key || event.key.startsWith("staffTasks:")) {
        syncStaffTasks();
      }
    }

    window.addEventListener(STAFF_TASKS_UPDATED_EVENT, handleTaskUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(STAFF_TASKS_UPDATED_EVENT, handleTaskUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [trips]);

  const allTasks = useMemo(
    () =>
      trips.flatMap((trip) =>
        (staffTasksByTrip[trip.id] || trip.staffTasks || []).map((task) => ({
          ...task,
          tripId: trip.id,
          tripName: trip.name,
        }))
      ),
    [staffTasksByTrip, trips]
  );

  const myTasks = useMemo(
    () =>
      allTasks.filter((task) =>
        isTaskAssignedToUser(task.assignedTo, session?.name)
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

  function updateTask(tripId, taskId, field, value) {
    const trip = trips.find((item) => item.id === tripId);
    const baseTasks = staffTasksByTrip[tripId] || loadStaffTasks(trip) || [];
    const nextTripTasks = baseTasks.map((task) =>
      task.id === taskId ? { ...task, [field]: value } : task
    );

    setStaffTasksByTrip((prev) => ({
      ...prev,
      [tripId]: nextTripTasks,
    }));
    saveStaffTasks(tripId, nextTripTasks);
  }

  function handleEditTitle(task) {
    setEditingTaskKey(getTaskKey(task.tripId, task.id));
    setTaskTitleDraft(task.taskName || task.title || "");
  }

  function handleCancelTitleEdit() {
    setEditingTaskKey(null);
    setTaskTitleDraft("");
  }

  function handleSaveTitle(task) {
    updateTask(
      task.tripId,
      task.id,
      "taskName",
      taskTitleDraft.trim() || "Untitled task"
    );
    handleCancelTitleEdit();
  }

  return (
    <Shell>
      <h1 className="h1">My Tasks</h1>
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
            <div style={{ fontWeight: 900 }}>My Tasks</div>
            <div className="small">
              {myTasks.length} assigned task{myTasks.length === 1 ? "" : "s"}
            </div>
          </div>
          <div className="spacer" />
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
        taskTitleDraft={taskTitleDraft}
        onTitleDraftChange={setTaskTitleDraft}
        onEditTitle={handleEditTitle}
        onCancelTitleEdit={handleCancelTitleEdit}
        onSaveTitle={handleSaveTitle}
        onUpdateTask={updateTask}
      />

      <TaskSection
        title="Upcoming"
        tasks={categorizedTasks.upcoming}
        editingTaskKey={editingTaskKey}
        taskTitleDraft={taskTitleDraft}
        onTitleDraftChange={setTaskTitleDraft}
        onEditTitle={handleEditTitle}
        onCancelTitleEdit={handleCancelTitleEdit}
        onSaveTitle={handleSaveTitle}
        onUpdateTask={updateTask}
      />

      <TaskSection
        title="Completed"
        tasks={categorizedTasks.completed}
        editingTaskKey={editingTaskKey}
        taskTitleDraft={taskTitleDraft}
        onTitleDraftChange={setTaskTitleDraft}
        onEditTitle={handleEditTitle}
        onCancelTitleEdit={handleCancelTitleEdit}
        onSaveTitle={handleSaveTitle}
        onUpdateTask={updateTask}
      />
    </Shell>
  );
}

function TaskSection({
  title,
  tasks,
  editingTaskKey,
  taskTitleDraft,
  onTitleDraftChange,
  onEditTitle,
  onCancelTitleEdit,
  onSaveTitle,
  onUpdateTask,
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
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "22%" }}>Project</th>
              <th style={{ width: "26%" }}>Task</th>
              <th style={{ width: "14%" }}>Due Date</th>
              <th style={{ width: "14%" }}>Progress</th>
              <th style={{ width: "18%" }}>Notes</th>
              <th style={{ width: "6%" }} />
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const taskKey = getTaskKey(task.tripId, task.id);
              const isEditingTitle = editingTaskKey === taskKey;

              return (
                <tr key={taskKey} className="staffTaskRow">
                  <td style={{ fontWeight: 700 }}>{task.tripName}</td>
                  <td>
                    {isEditingTitle ? (
                      <input
                        className="input"
                        value={taskTitleDraft}
                        onChange={(e) => onTitleDraftChange(e.target.value)}
                      />
                    ) : (
                      <span style={{ fontWeight: 600 }}>
                        {task.taskName || task.title || "-"}
                      </span>
                    )}
                  </td>
                  <td>
                    <input
                      className="input"
                      type="date"
                      value={task.dueDate || ""}
                      onChange={(e) =>
                        onUpdateTask(task.tripId, task.id, "dueDate", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <select
                      className="input"
                      value={task.progress || "Not started"}
                      onChange={(e) =>
                        onUpdateTask(task.tripId, task.id, "progress", e.target.value)
                      }
                    >
                      {PROGRESS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="input"
                      value={task.notes || ""}
                      onChange={(e) =>
                        onUpdateTask(task.tripId, task.id, "notes", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <div className="staffTaskRowActions">
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
                            onClick={() => onSaveTitle(task)}
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn"
                          type="button"
                          onClick={() => onEditTitle(task)}
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
