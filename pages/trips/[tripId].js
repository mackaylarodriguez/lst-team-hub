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

  if (!router.isReady || !tripID){
    return <p>Loading...</p>
  }
  if (!trip) return <p>Trip not found.</p>;
    return (
      <div>
        <h1>{trip.name}</h1>
        {staffTasks?.length ? (
          staffTasks.map((task) => <div key={task.id}>{task.title}</div>)
        ) : (
          <p>No tasks yet.</p>
        )}
      </div>
    );

  const [state, setState] = useState({});
  const [session, setSession] = useState(null);
  const [trainingDone, setTrainingDone] = useState({});
  const [docs, setDocs] = useState([]);

  const tabs = session?.role === "staff"
    ? ["Overview", "Team", "Fundraising", "Training", "Tasks", "Documents", "Staff Tasks"]
    : ["Overview", "Team", "Fundraising", "Training", "Tasks", "Documents"];

  useEffect(() => {
    const s = requireSession(router);
    if (s) setSession(s);
  }, [router]);

  const trip = useMemo(() => (tripId ? getTrip(tripId) : null), [tripId]);
  const staffTasks = trip?.staffTasks || [];

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

  function saveDocs(nextDocs) {
    setDocs(nextDocs);
    localStorage.setItem(`docs:${trip.id}`, JSON.stringify(nextDocs));
  }

  if (!trip) {
    return (
      <Shell>
        <div className="card pad">
          <div style={{ fontWeight: 900 }}>Loading trip…</div>
          <div className="small">If this persists, the trip ID wasn’t found in the demo data.</div>
        </div>
      </Shell>
    );
  }

  const pct = session ? percentComplete(trip.tasks, state) : 0;

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

          {docs.map((d, i) => {
            const available = d.status === "Available" && d.url;

            return (
              <div key={i} className="row" style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", alignItems: "flex-start" }}>
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
            <button className="btn" type="button" disabled style={{ opacity: 0.6, cursor: "not-allowed" }}>
              Coming soon
            </button>
          )}
        </div>
      );
      {tab === "Staff Tasks" && session?.role === "staff" && (
        <div className="card pad">
          <div className="row" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 900 }}>Staff Tasks</div>
            <div className="spacer" />
            <span className="badge">{staffTasks.length} total</span>
          </div>

          {!staffTasks.length ? (
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
                </tr>
              </thead>
              <tbody>
                {staffTasks.map((t) => (
                  <tr key={t.id}>
                    <td>{t.workArea || "-"}</td>
                    <td style={{ fontWeight: 800 }}>{t.taskName || t.title || "-"}</td>
                    <td>{t.assignedTo || "-"}</td>
                    <td>{t.progress || "Not started"}</td>
                    <td>{t.dueDate || "-"}</td>
                    <td>{t.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="small" style={{ marginTop: 12 }}>
            Staff-only checklist for trip management tasks.
          </div>
        </div>
      )}
    })}
  </div>
  
    )}
    </Shell>
  );
}
