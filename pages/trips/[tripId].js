import Shell from "@/components/Shell";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import { getTrip } from "@/lib/sampleData";
import { loadTaskState, saveTaskState, percentComplete } from "@/lib/tasks";

export default function TripPage() {
  const router = useRouter();
  const { tripId } = router.query;

  const [tab, setTab] = useState("Overview");
  const [state, setState] = useState({});
  const [session, setSession] = useState(null);
  const [trainingDone, setTrainingDone] = useState({});
  const [docs, setDocs] = useState([]);

  const trip = useMemo(() => {
    return tripId ? getTrip(tripId) : null;
  }, [tripId]);
  const staffTasks = trip?.staffTasks || [];

  const defaultStaffTasks = trip?.staffTasks || [];
  const [editableStaffTasks, setEditableStaffTasks] = useState([]);

  const [isEditingStaffTasks, setIsEditingStaffTasks] = useState(false);
  const [draftStaffTasks, setDraftStaffTasks] = useState([]);

  const workAreas = [
    "Team/Project Formation",
    "Team Prep-Training",
    "Team Prep-Travel",
    "Site Prep",
    "Team Prep-Materials",
    "Support During Project",
    "Post Project",
  ];

  const staffList = [
    "Mackayla",
    "Craig",
    "Leslee",
    "Donna",
    "Hannah",
    "Kelly",
    "Craig & Kelly",
  ];

  const [staffTaskSort, setStaffTaskSort] = useState("sequence");

  useEffect(() => {
    setSession({ role: "staff", email: "test@example.com" });
  }, []);

  useEffect(() => {
    if (!session || !trip) return;
    setState(loadTaskState(session.email, trip.id));
  }, [session, trip]);

  useEffect(() => {
    if (!session || !trip) return;
    const key = `training:${session.email}:${trip.id}`;
    setTrainingDone(JSON.parse(localStorage.getItem(key) || "{}"));
  }, [session, trip]);

  useEffect(() => {
    if (!trip) return;
    const key = `docs:${trip.id}`;
    const saved = localStorage.getItem(key);
    setDocs(saved ? JSON.parse(saved) : (trip.docs || []));
  }, [trip]);

  useEffect(() => {
    if (!trip) return;
    const key = `staffTasks:${trip.id}`;
    const saved = localStorage.getItem(key);
    setEditableStaffTasks(saved ? JSON.parse(saved) : defaultStaffTasks);
  }, [trip, defaultStaffTasks]);

  useEffect(() => {
    setDraftStaffTasks(staffTasks);
  }, [tripId, trip]);

  useEffect(() => {
    setDraftStaffTasks(editableStaffTasks || []);
  }, [editableStaffTasks]);

  function saveDocs(nextDocs) {
    setDocs(nextDocs);
    if (!trip) return;
    localStorage.setItem(`docs:${trip.id}`, JSON.stringify(nextDocs));
  }

  function toggleTask(taskId) {
    const next = { ...state, [taskId]: !state[taskId] };
    setState(next);
    saveTaskState(session.email, trip.id, next);
  }

  function toggleTraining(id) {
    const next = { ...trainingDone, [id]: !trainingDone[id] };
    setTrainingDone(next);
    const key = `training:${session.email}:${trip.id}`;
    localStorage.setItem(key, JSON.stringify(next));
  }

  function saveStaffTasks(nextTasks) {
    setEditableStaffTasks(nextTasks);
    if (!trip) return;
    localStorage.setItem(`staffTasks:${trip.id}`, JSON.stringify(nextTasks));
  }

  function handleEditStaffTasks() {
    setDraftStaffTasks(staffTasks);
    setIsEditingStaffTasks(true);
  }

  function handleCancelStaffTasks() {
    setDraftStaffTasks(staffTasks);
    setIsEditingStaffTasks(false);
  }

  function handleSaveStaffTasks() {
    // For now this just updates the current trip object in-memory for the session.
    // Later we can wire this to localStorage or a DB.
    if (!trip) return;

    trip.staffTasks = draftStaffTasks;
    setIsEditingStaffTasks(false);
  }

  function updateDraftStaffTask(index, field, value) {
    setDraftStaffTasks((prev) =>
      prev.map((task, i) => (i === index ? { ...task, [field]: value } : task))
    );
  }

  function handleEditStaffTasks() {
    setDraftStaffTasks(editableStaffTasks || []);
    setIsEditingStaffTasks(true);
  }

  function handleCancelStaffTasks() {
    setDraftStaffTasks(editableStaffTasks || []);
    setIsEditingStaffTasks(false);
  }

  function handleSaveStaffTasks() {
    saveStaffTasks(draftStaffTasks);
    setIsEditingStaffTasks(false);
  }

  function updateDraftTask(index, field, value) {
    const next = [...draftStaffTasks];
    next[index] = { ...next[index], [field]: value };
    setDraftStaffTasks(next);
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
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  function sortStaffTasks(tasks, mode = "sequence") {
    const list = [...tasks];

    if (mode === "dueDate") {
      return list.sort((a, b) => {
        const dateA = parseDateSafe(a.dueDate);
        const dateB = parseDateSafe(b.dueDate);

        if (dateA && dateB) return dateA - dateB;
        if (dateA) return -1;
        if (dateB) return 1;

        return (a.taskName || a.title || "").localeCompare(b.taskName || b.title || "");
      });
    }

    if (mode === "assignedTo") {
      return list.sort((a, b) =>
        (a.assignedTo || "").localeCompare(b.assignedTo || "")
      );
    }

    if (mode === "progress") {
      const rank = {
        "Not started": 1,
        "In progress": 2,
        "Waiting": 3,
        "Complete": 4,
      };

      return list.sort((a, b) => {
        const rankA = rank[a.progress] || 999;
        const rankB = rank[b.progress] || 999;
        return rankA - rankB;
      });
    }

    return list.sort((a, b) => {
      const seqA = Number(a.sequence) || 999;
      const seqB = Number(b.sequence) || 999;
      if (seqA !== seqB) return seqA - seqB;

      const dateA = parseDateSafe(a.dueDate);
      const dateB = parseDateSafe(b.dueDate);

      if (dateA && dateB) return dateA - dateB;
      if (dateA) return -1;
      if (dateB) return 1;

      return (a.taskName || a.title || "").localeCompare(b.taskName || b.title || "");
    });
  }

  const sortedViewTasks = sortStaffTasks(editableStaffTasks || [], staffTaskSort);
  const sortedDraftTasks = sortStaffTasks(draftStaffTasks || [], staffTaskSort);

  const completedCount = (editableStaffTasks || []).filter(
    (t) => t.progress === "Complete"
  ).length;
  const totalCount = (editableStaffTasks || []).length;
  const completionPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  const tabs = 
    session?.role === "staff"
      ? ["Overview", "Team", "Fundraising", "Training", "Tasks", "Documents", "Staff Tasks"]
      : ["Overview", "Team", "Fundraising", "Training", "Tasks", "Documents"];

  if (!router.isReady || !tripId) {
    return <p>Loading...</p>;
  }

  if (!trip) {
    return (
      <Shell>
        <div className="card pad">
          <div style={{ fontWeight: 900 }}>Loading trip…</div>
          <div className="small">
            If this persists, the trip ID wasn’t found in the demo data.
          </div>
        </div>
      </Shell>
    );
  }

  const pct = session ? percentComplete(trip.tasks, state) : 0;

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
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 16 }}>
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
      )}

      {tab === "Team" && (
        <div className="card pad">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Team Roster</div>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th><th>Role</th><th>Email</th><th>Fundraising</th>
              </tr>
            </thead>
            <tbody>
              {trip.participants.map(p => (
                <tr key={p.email}>
                  <td style={{ fontWeight: 800 }}>{p.name}</td>
                  <td><span className={"badge " + (p.role === "Leader" ? "badgeWarn" : "")}>{p.role}</span></td>
                  <td>{p.email}</td>
                  <td><a href={p.fundraisingUrl} target="_blank" rel="noreferrer">Open</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Fundraising" && (
        <div className="card pad">
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Fundraising Pages</div>
          <p className="small">In the real version, these could be pulled from Neon and show progress bars.</p>
          <div style={{ height: 10 }} />
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {trip.participants.map(p => (
              <li key={p.email} style={{ marginBottom: 8 }}>
                <b>{p.name}:</b> <a href={p.fundraisingUrl} target="_blank" rel="noreferrer">{p.fundraisingUrl}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "Training" && (
        <div className="card pad">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Training</div>
        <p className="small">
          Central place for training links + checklist. (Demo content for now.)
        </p>

        <div style={{ height: 12 }} />

        <div style={{ fontWeight: 900, marginBottom: 6 }}>Links</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li style={{ marginBottom: 8 }}>
            <a href="https://canvas.example.com/course/123" target="_blank" rel="noreferrer">
              Canvas Login / Course
            </a>
          </li>
          <li style={{ marginBottom: 8 }}>
            <a href="https://example.com/basic-training" target="_blank" rel="noreferrer">
              Basic Training
            </a>
          </li>
          <li style={{ marginBottom: 8 }}>
            <a href="https://example.com/gateway-training" target="_blank" rel="noreferrer">
              Gateway Training + EndMeeting
            </a>
          </li>
        </ul>

        <div style={{ height: 14 }} />
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Training Checklist</div>

        {[
          { id: "m1", title: "Canvas Mod 1" },
          { id: "m2", title: "Canvas Mod 2" },
          { id: "m3", title: "Canvas Mod 3" },
          { id: "m4", title: "Canvas Mod 4" },
          { id: "m5", title: "Canvas Mod 5" },
          { id: "m6", title: "Canvas Mod 6" },
          { id: "m7", title: "Canvas Mod 7" },
          { id: "m8", title: "Canvas Mod 8" },
          { id: "m9", title: "Canvas Mod 9" },
          { id: "bt", title: "Basic Training" },
          { id: "gt", title: "Gateway Training" },
          { id: "em", title: "EndMeeting" },
        ].map((m) => (
          <div key={m.id} className="row" style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <input
              type="checkbox"
              checked={!!trainingDone[m.id]}
              onChange={() => toggleTraining(m.id)}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900 }}>{m.title}</div>
            </div>
            <span className={"badge " + (!!trainingDone[m.id] ? "badgeSuccess" : "badgeDanger")}>
              {!!trainingDone[m.id] ? "Complete" : "Not started"}
            </span>
          </div>
        ))}

        <div className="small" style={{ marginTop: 12 }}>
          Next step: connect these checkboxes to localStorage like Tasks does.
        </div>
      </div>
    )}

      {tab === "Tasks" && (
        <div className="card pad">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Tasks</div>
          {trip.tasks.map(t => {
            const done = !!state[t.id];
            return (
              <div key={t.id} className="row" style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <input type="checkbox" checked={done} onChange={() => toggleTask(t.id)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900 }}>{t.title}</div>
                  <div className="small">Due: {t.due}</div>
                </div>
                <span className={"badge " + (done ? "badgeSuccess" : "badgeDanger")}>
                  {done ? "Complete" : "Not started"}
                </span>
              </div>
            );
          })}
          <div className="small" style={{ marginTop: 12 }}>
            Saved locally for demo. Later: store per-user completion in a database.
          </div>
        </div>
      )}

            {tab === "Documents" && (
        <div className="card pad">
          <div className="row" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 900 }}>Documents & Links</div>
            <div className="spacer" />
            {session?.role === "staff" && (
              <button
                className="btn"
                type="button"
                onClick={() => {
                  const next = [
                    ...docs,
                    { name: "New Document", date: "—", status: "Coming soon", url: "" },
                  ];
                  saveDocs(next);
                }}
              >
                Add Link
              </button>
            )}
          </div>

          {docs.length === 0 ? (
            <div className="small">No documents yet.</div>
          ) : (
            docs.map((d, i) => {
              const available = d.status === "Available" && d.url;

              return (
                <div
                  key={i}
                  className="row"
                  style={{
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border)",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900 }}>{d.name}</div>
                    <div className="small">{d.date}</div>

                    {session?.role === "staff" && (
                      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                        <div className="small">Status</div>
                        <select
                          className="input"
                          value={d.status}
                          onChange={(e) => {
                            const next = [...docs];
                            next[i] = { ...next[i], status: e.target.value };
                            saveDocs(next);
                          }}
                        >
                          <option value="Coming soon">Coming soon</option>
                          <option value="Available">Available</option>
                        </select>

                        <div className="small">SharePoint Link</div>
                        <input
                          className="input"
                          value={d.url || ""}
                          placeholder="Paste SharePoint link…"
                          onChange={(e) => {
                            const next = [...docs];
                            next[i] = { ...next[i], url: e.target.value };
                            saveDocs(next);
                          }}
                        />

                        <button
                          className="btn"
                          type="button"
                          onClick={() => {
                            const next = docs.filter((_, idx) => idx !== i);
                            saveDocs(next);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <span className={"badge " + (available ? "badgeSuccess" : "badgeWarn")}>
                    {available ? "Available" : "Coming soon"}
                  </span>

                  {available ? (
                    <a className="btn btnPrimary" href={d.url} target="_blank" rel="noreferrer">
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

      {tab === "Staff Tasks" && session?.role === "staff" && (
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

            <select
              className="input"
              style={{ width: 160 }}
              value={staffTaskSort}
              onChange={(e) => setStaffTaskSort(e.target.value)}
            >
              <option value="sequence">Sort by: Sequence</option>
              <option value="dueDate">Sort by: Due Date</option>
              <option value="assignedTo">Sort by: Assigned To</option>
              <option value="progress">Sort by: Progress</option>
            </select>

            {!isEditingStaffTasks ? (
              <button
                className="btn"
                type="button"
                onClick={handleEditStaffTasks}
              >
                Edit
              </button>
            ) : (
              <div className="row" style={{ gap: 8 }}>
                <button
                  className="btn"
                  type="button"
                  onClick={handleCancelStaffTasks}
                >
                  Cancel
                </button>
                <button
                  className="btn btnPrimary"
                  type="button"
                  onClick={handleSaveStaffTasks}
                >
                  Save
                </button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="small" style={{ marginBottom: 6 }}>
              Trip Progress
            </div>
            <div className="progress">
              <div style={{ width: `${completionPct}%` }} />
            </div>
          </div>

          {!(isEditingStaffTasks ? sortedDraftTasks : sortedViewTasks).length ? (
            <div className="small">No staff tasks found for this trip yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Work Area</th>
                  <th>Task</th>
                  <th>Assigned To</th>
                  <th>Progress</th>
                  <th>Due Date</th>
                  <th>Notes</th>
                  {isEditingStaffTasks && <th>Delete</th>}
                </tr>
              </thead>
              <tbody>
                {(isEditingStaffTasks ? sortedDraftTasks : sortedViewTasks).map((t) => {
                  const i = draftStaffTasks.findIndex((x) => x.id === t.id);

                  return (
                    <tr key={t.id}>
                      <td>
                        {isEditingStaffTasks ? (
                          <select
                            className="input"
                            value={t.workArea || ""}
                            onChange={(e) => updateDraftTask(i, "workArea", e.target.value)}
                          >
                            <option value="">Select Area</option>
                            {workAreas.map((area) => (
                              <option key={area} value={area}>
                                {area}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="small">{t.workArea || "-"}</span>
                        )}
                      </td>

                      <td>
                        {isEditingStaffTasks ? (
                          <input
                            className="input"
                            value={t.taskName || t.title || ""}
                            onChange={(e) => updateDraftTask(i, "taskName", e.target.value)}
                          />
                        ) : (
                          <span>{t.taskName || t.title || "-"}</span>
                        )}
                      </td>

                      <td>
                        {isEditingStaffTasks ? (
                          <select
                            className="input"
                            value={t.assignedTo || ""}
                            onChange={(e) => updateDraftTask(i, "assignedTo", e.target.value)}
                          >
                            <option value="">Assign Staff</option>
                            {staffList.map((person) => (
                              <option key={person} value={person}>
                                {person}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="small">{t.assignedTo || "-"}</span>
                        )}
                      </td>

                      <td>
                        {isEditingStaffTasks ? (
                          <select
                            className="input"
                            value={t.progress || "Not started"}
                            onChange={(e) => updateDraftTask(i, "progress", e.target.value)}
                          >
                            <option value="Not started">Not started</option>
                            <option value="In progress">In progress</option>
                            <option value="Complete">Complete</option>
                            <option value="Waiting">Waiting</option>
                          </select>
                        ) : (
                          <span className={`badge ${getProgressClass(t.progress)}`}>
                            {t.progress || "Not started"}
                          </span>
                        )}
                      </td>

                      <td>
                        {isEditingStaffTasks ? (
                          <input
                            className="input"
                            type="date"
                            value={t.dueDate || ""}
                            onChange={(e) => updateDraftTask(i, "dueDate", e.target.value)}
                          />
                        ) : (
                          <span className="small">{t.dueDate || "-"}</span>
                        )}
                      </td>

                      <td>
                        {isEditingStaffTasks ? (
                          <input
                            className="input"
                            value={t.notes || ""}
                            onChange={(e) => updateDraftTask(i, "notes", e.target.value)}
                          />
                        ) : (
                          <span className="small">{t.notes || "-"}</span>
                        )}
                      </td>

                      {isEditingStaffTasks && (
                        <td>
                          <button
                            className="btn"
                            type="button"
                            onClick={() => {
                              const next = draftStaffTasks.filter((x) => x.id !== t.id);
                              setDraftStaffTasks(next);
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {isEditingStaffTasks && (
            <div style={{ marginTop: 12 }}>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  const next = [
                    ...draftStaffTasks,
                    {
                      id: Date.now().toString(),
                      workArea: "",
                      taskName: "",
                      assignedTo: "",
                      progress: "Not started",
                      dueDate: "",
                      notes: "",
                    },
                  ];
                  setDraftStaffTasks(next);
                }}
              >
                Add Task
              </button>
            </div>
          )}

          <div className="small" style={{ marginTop: 12 }}>
            Staff-only checklist for trip management tasks.
          </div>
        </div>
      )}

    </Shell>
  );
}