import { useTripPage } from "../TripPageContext";
import AppDueDateTripleSelect from "@/components/AppDueDateTripleSelect";
import { buildStaffTaskRowDomId } from "../tripPageShared";
import { findStaffTaskTemplate } from "@/lib/staffTaskTemplate";
import { computeStaffTaskDueDate } from "@/lib/staffTasks";
import {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
  AppDetailAction,
  TrainingResourceLink,
  OptionalTripWideDocumentCard,
} from "../tripPageShared";

export default function TripStaffTasksTab() {
    const {
    completedCount,
    completionPct,
    editableStaffTasksRef,
    editingStaffTaskId,
    flushStaffTaskNotesSave,
    formatShortDate,
    getProgressInputClass,
    groupedViewTasks,
    handleAddStaffTask,
    handleCancelStaffTaskEdit,
    handleEditStaffTask,
    handleSaveStaffTaskRow,
    handleStaffTaskNotesChange,
    isAddingStaffTask,
    newStaffTaskDraft,
    newStaffTaskTripleRef,
    saveStaffTasks,
    setIsAddingStaffTask,
    setNewStaffTaskDraft,
    setStaffTaskDueDateDraft,
    setStaffTaskStatus,
    setStaffTaskTitleDraft,
    staffDueTripleRef,
    staffList,
    staffTaskDueDateDraft,
    staffTaskRowStatus,
    staffTaskStatus,
    staffTaskTitleDraft,
    staffTaskWorkAreas,
    totalCount,
    trip,
    updateStaffTask,
  } = useTripPage();

  return (
    <div style={{ display: "grid", gap: 16 }}>
                <CollapsibleSection defaultOpen>
                <div className="card pad staffTasksTripPanel">
                    <div className="cardSectionPill" style={{ marginBottom: 12 }}>Staff task list</div>
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
                            <div style={{ gridColumn: "1 / -1" }}>
                              <div className="small" style={{ marginBottom: 6 }}>
                                Due date
                              </div>
                              <AppDueDateTripleSelect
                                ref={newStaffTaskTripleRef}
                                compact
                                nativeDatePickerOnly
                                value={newStaffTaskDraft.dueDate}
                                onChange={(ymd) =>
                                  setNewStaffTaskDraft((current) => ({ ...current, dueDate: ymd }))
                                }
                              />
                            </div>
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
    
                    <table className="table dataTableStriped staffTasksTripTable">
                      <colgroup>
                        <col style={{ width: "26%" }} />
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "11%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "37%" }} />
                        <col style={{ width: "8%" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th style={{ textAlign: "center" }}>Assigned</th>
                          <th style={{ textAlign: "center" }}>Progress</th>
                          <th className="staffTaskDueDateCell">Due Date</th>
                          <th>Notes</th>
                          <th aria-label="Actions" />
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
                              const effectiveStaffDueDate =
                                t.dueDate || computeStaffTaskDueDate(t, trip) || "";
    
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
                                        <span>{t.taskName || t.title || "-"}</span>
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
    
                                  <td className="staffTaskDueDateCell">
                                    {isEditingTitle ? (
                                      <AppDueDateTripleSelect
                                        ref={staffDueTripleRef}
                                        compact
                                        nativeDatePickerOnly
                                        value={staffTaskDueDateDraft}
                                        onChange={(ymd) => setStaffTaskDueDateDraft(ymd)}
                                      />
                                    ) : (
                                      <>
                                        {effectiveStaffDueDate
                                          ? formatShortDate(effectiveStaffDueDate)
                                          : "—"}
                                      </>
                                    )}
                                  </td>
    
                                  <td className="staffTaskNotesTd">
                                    <div className="staffTaskNotesCell">
                                      <textarea
                                        className="input staffTaskNotesInput"
                                        rows={3}
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
    
                                  <td className="staffTaskActionsTd">
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
                                            onClick={() => handleSaveStaffTaskRow(t.id)}
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
                  </div>
                </CollapsibleSection>
              </div>
  );
}
