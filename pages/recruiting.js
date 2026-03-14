import Shell from "@/components/Shell";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { requireSession } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";
import {
  RECRUITING_STAGES,
  RECRUITING_UPDATED_EVENT,
  bulkUpdateRecruitingCycleContacts,
  deleteRecruitingSavedFilter,
  getRecruitingStageLabel,
  importRecruitingContacts,
  listRecruitingActivityLogs,
  listRecruitingCycleContacts,
  listRecruitingSavedFilters,
  listRecruitingYears,
  saveRecruitingCycleContact,
  saveRecruitingSavedFilter,
} from "@/lib/recruitingCycles";

function formatContactName(record) {
  const fullName = [record?.contact?.firstName, record?.contact?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || record?.contact?.email || "Unnamed contact";
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isOlderThanDays(value, days) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const threshold = new Date();
  threshold.setHours(0, 0, 0, 0);
  threshold.setDate(threshold.getDate() - days);
  return date < threshold;
}

function isDueTodayOrOverdue(value) {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date <= today;
}

function recordNeedsAttention(record) {
  if (record.stage === 0 && isOlderThanDays(record.createdAt, 3)) {
    return true;
  }

  if (isDueTodayOrOverdue(record.nextFollowUp)) {
    return true;
  }

  if (!record.isConvertedToTeam && (!record.lastContactedAt || isOlderThanDays(record.lastContactedAt, 14))) {
    return true;
  }

  return false;
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseImportRows(file) {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    return rows.map((row) => {
      const normalizedEntries = Object.entries(row).map(([key, value]) => [
        normalizeHeader(key),
        value,
      ]);
      const values = Object.fromEntries(normalizedEntries);

      return {
        firstName: String(
          values.firstname ||
          values.first ||
          ""
        ).trim(),
        lastName: String(
          values.lastname ||
          values.last ||
          ""
        ).trim(),
        email: String(values.email || "").trim().toLowerCase(),
      };
    });
  });
}

const DEFAULT_FILTER_CONFIG = {
  searchQuery: "",
  stage: "",
  assignedTo: "",
  activeView: "all",
};

const BULK_ACTION_OPTIONS = [
  { value: "bulk email", label: "Mark Bulk Email Sent" },
  { value: "bulk text", label: "Mark Bulk Text Sent" },
  { value: "bulk note", label: "Add Bulk Note" },
  { value: "follow up", label: "Set Next Follow-Up Date" },
  { value: "assign", label: "Assign To Staff Member" },
  { value: "stage", label: "Change Stage" },
];

export default function RecruitingPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [records, setRecords] = useState([]);
  const [savedFilters, setSavedFilters] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [filterConfig, setFilterConfig] = useState(DEFAULT_FILTER_CONFIG);
  const [activeFilterId, setActiveFilterId] = useState("all");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState([]);
  const [importSummary, setImportSummary] = useState("");
  const [importDuplicates, setImportDuplicates] = useState([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState("bulk email");
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().slice(0, 16));
  const [bulkSummary, setBulkSummary] = useState("");
  const [bulkStage, setBulkStage] = useState("");
  const [bulkNextFollowUp, setBulkNextFollowUp] = useState("");
  const [bulkAssignedTo, setBulkAssignedTo] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const nextSession = await requireSession(router);
      if (cancelled || !nextSession) return;

      if (!isStaffRole(nextSession.permissionRole || nextSession.role)) {
        router.replace("/trips");
        return;
      }

      setSession(nextSession);
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!session) return;

    async function loadYears() {
      try {
        const nextYears = await listRecruitingYears();
        setYears(nextYears);
        if (!nextYears.includes(selectedYear)) {
          setSelectedYear(nextYears[0] || new Date().getFullYear());
        }
      } catch (loadError) {
        console.error("Unable to load recruiting years", loadError);
        setError(loadError.message || "Unable to load recruiting years.");
      }
    }

    void loadYears();
  }, [selectedYear, session]);

  useEffect(() => {
    if (!session || !selectedYear) return;

    async function loadRecruitingData() {
      try {
        const [nextRecords, nextFilters] = await Promise.all([
          listRecruitingCycleContacts(selectedYear),
          listRecruitingSavedFilters(selectedYear),
        ]);
        setRecords(nextRecords);
        setSavedFilters(nextFilters);
        setError("");
      } catch (loadError) {
        console.error("Unable to load recruiting records", loadError);
        setError(loadError.message || "Unable to load recruiting records.");
      }
    }

    void loadRecruitingData();

    function handleRecruitingUpdate() {
      void loadRecruitingData();
    }

    window.addEventListener(RECRUITING_UPDATED_EVENT, handleRecruitingUpdate);
    return () => {
      window.removeEventListener(RECRUITING_UPDATED_EVENT, handleRecruitingUpdate);
    };
  }, [selectedYear, session]);

  useEffect(() => {
    if (!selectedRecordId) {
      setHistory([]);
      return;
    }

    let cancelled = false;

    async function loadHistory() {
      try {
        const rows = await listRecruitingActivityLogs(selectedRecordId);
        if (!cancelled) {
          setHistory(rows);
        }
      } catch (loadError) {
        console.error("Unable to load recruiting history", loadError);
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedRecordId]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (activeFilterId === "needs_attention" && !recordNeedsAttention(record)) {
        return false;
      }

      if (filterConfig.activeView === "outreach" && (record.isConvertedToTeam || record.stage > 1)) {
        return false;
      }

      if (filterConfig.activeView === "pipeline" && (record.isConvertedToTeam || record.stage < 2)) {
        return false;
      }

      if (filterConfig.activeView === "converted" && !record.isConvertedToTeam) {
        return false;
      }

      if (filterConfig.stage !== "" && Number(filterConfig.stage) !== record.stage) {
        return false;
      }

      if (filterConfig.assignedTo && !String(record.assignedTo || "").toLowerCase().includes(filterConfig.assignedTo.toLowerCase())) {
        return false;
      }

      if (filterConfig.searchQuery) {
        const haystack = [
          record.contact?.firstName,
          record.contact?.lastName,
          record.contact?.email,
          record.assignedTo,
          record.teamName,
          record.site,
          record.mackaylaNotes,
          record.lesleeNotes,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(filterConfig.searchQuery.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [activeFilterId, filterConfig, records]);

  const outreachQueue = useMemo(
    () => filteredRecords.filter((record) => !record.isConvertedToTeam && record.stage <= 1),
    [filteredRecords]
  );
  const pipelineRecords = useMemo(
    () => filteredRecords.filter((record) => !record.isConvertedToTeam && record.stage >= 2),
    [filteredRecords]
  );
  const convertedTeams = useMemo(
    () => filteredRecords.filter((record) => record.isConvertedToTeam),
    [filteredRecords]
  );

  const stats = useMemo(() => {
    const total = records.length;
    const noContact = records.filter((record) => record.stage === 0).length;
    const contacted = records.filter((record) => record.stage === 1).length;
    const interested = records.filter((record) => record.stage === 2).length;
    const applied = records.filter((record) => record.stage === 3).length;

    return { total, noContact, contacted, interested, applied };
  }, [records]);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) || null,
    [records, selectedRecordId]
  );

  useEffect(() => {
    if (!selectedRecordId && records.length > 0) {
      setSelectedRecordId(records[0].id);
    }
  }, [records, selectedRecordId]);

  async function refreshCurrentYear() {
    const [nextRecords, nextFilters] = await Promise.all([
      listRecruitingCycleContacts(selectedYear),
      listRecruitingSavedFilters(selectedYear),
    ]);
    setRecords(nextRecords);
    setSavedFilters(nextFilters);
  }

  function applyFilter(config, filterId = "custom") {
    setFilterConfig({ ...DEFAULT_FILTER_CONFIG, ...config });
    setActiveFilterId(filterId);
  }

  async function handleSaveCurrentFilter() {
    const filterName = window.prompt("Filter name");
    if (!filterName) return;

    await saveRecruitingSavedFilter({
      recruitingYear: selectedYear,
      filterName,
      filterConfig,
    });
    await refreshCurrentYear();
  }

  async function handleDeleteFilter(filterId) {
    await deleteRecruitingSavedFilter(filterId);
    if (activeFilterId === filterId) {
      applyFilter(DEFAULT_FILTER_CONFIG, "all");
    }
    await refreshCurrentYear();
  }

  async function handleImportFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsedRows = await parseImportRows(file);
      setImportPreviewRows(parsedRows);
      setImportSummary("");
      setImportDuplicates([]);
      setImportModalOpen(true);
      setError("");
    } catch (parseError) {
      console.error("Unable to parse recruiting import file", parseError);
      setError(parseError.message || "Unable to parse import file.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleConfirmImport() {
    const result = await importRecruitingContacts({
      recruitingYear: selectedYear,
      rows: importPreviewRows,
      staffMember: session?.name || session?.email || "Staff",
    });

    setImportSummary(
      `Imported ${result.createdCount} contacts • Skipped ${result.duplicateCount} duplicates • Ignored ${result.ignoredCount} invalid rows`
    );
    setImportDuplicates(result.duplicates);
    setImportPreviewRows([]);
    setImportModalOpen(false);
    await refreshCurrentYear();
  }

  function handleDownloadTemplate() {
    const csv = "First Name,Last Name,Email\nJohn,Smith,john@email.com\nSarah,Lee,sarah@email.com\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "recruiting-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function toggleSelected(id) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function handleBulkActionSubmit() {
    await bulkUpdateRecruitingCycleContacts({
      recruitingCycleContactIds: selectedIds,
      actionType: bulkAction,
      actionDate: bulkDate ? new Date(bulkDate).toISOString() : new Date().toISOString(),
      staffMember: session?.name || session?.email || "Staff",
      summary: bulkSummary,
      stage: bulkStage === "" ? undefined : bulkStage,
      nextFollowUp: bulkNextFollowUp || undefined,
      assignedTo: bulkAssignedTo || undefined,
    });

    setBulkModalOpen(false);
    setSelectedIds([]);
    setBulkSummary("");
    setBulkStage("");
    setBulkNextFollowUp("");
    setBulkAssignedTo("");
    await refreshCurrentYear();
  }

  async function handleSaveSelectedRecordNotes() {
    if (!selectedRecord) return;

    try {
      setIsSavingNotes(true);
      await saveRecruitingCycleContact({
        id: selectedRecord.id,
        contactId: selectedRecord.contactId,
        recruitingYear: selectedRecord.recruitingYear,
        firstName: selectedRecord.contact?.firstName,
        lastName: selectedRecord.contact?.lastName,
        email: selectedRecord.contact?.email,
        gender: selectedRecord.contact?.gender,
        priority: selectedRecord.priority,
        alumniYearLabel: selectedRecord.alumniYearLabel,
        stage: selectedRecord.stage,
        interestedTrip: selectedRecord.interestedTrip,
        teamName: selectedRecord.teamName,
        teamMembers: selectedRecord.teamMembers,
        projectDates: selectedRecord.projectDates,
        site: selectedRecord.site,
        weeks: selectedRecord.weeks,
        departureDate: selectedRecord.departureDate,
        assignedTo: selectedRecord.assignedTo,
        lastContactedAt: selectedRecord.lastContactedAt,
        lastContactMethod: selectedRecord.lastContactMethod,
        nextFollowUp: selectedRecord.nextFollowUp,
        mackaylaNotes: selectedRecord.mackaylaNotes,
        lesleeNotes: selectedRecord.lesleeNotes,
        bulkLastContactedAt: selectedRecord.bulkLastContactedAt,
        bulkLastContactMethod: selectedRecord.bulkLastContactMethod,
        isConvertedToTeam: selectedRecord.isConvertedToTeam,
        convertedTeamId: selectedRecord.convertedTeamId,
      });
      await refreshCurrentYear();
    } finally {
      setIsSavingNotes(false);
    }
  }

  function updateSelectedRecord(field, value) {
    setRecords((current) =>
      current.map((record) =>
        record.id === selectedRecordId ? { ...record, [field]: value } : record
      )
    );
  }

  function renderTable(recordsToRender, showCheckboxes = false) {
    if (recordsToRender.length === 0) {
      return <div className="small">No contacts in this view.</div>;
    }

    return (
      <table className="table">
        <thead>
          <tr>
            {showCheckboxes ? <th /> : null}
            <th>Contact</th>
            <th>Stage</th>
            <th>Assigned</th>
            <th>Follow-Up</th>
            <th>Last Contact</th>
          </tr>
        </thead>
        <tbody>
          {recordsToRender.map((record) => (
            <tr
              key={record.id}
              onClick={() => setSelectedRecordId(record.id)}
              style={record.id === selectedRecordId ? { background: "rgba(47,73,147,.06)" } : undefined}
            >
              {showCheckboxes ? (
                <td onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(record.id)}
                    onChange={() => toggleSelected(record.id)}
                  />
                </td>
              ) : null}
              <td>
                <div style={{ fontWeight: 700 }}>{formatContactName(record)}</div>
                <div className="small">{record.contact?.email}</div>
              </td>
              <td>{record.stageLabel}</td>
              <td>{record.assignedTo || "-"}</td>
              <td>{record.nextFollowUp ? formatDate(record.nextFollowUp) : "-"}</td>
              <td>{record.lastContactedAt ? formatDateTime(record.lastContactedAt) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <Shell>
      <div className="row" style={{ marginBottom: 14 }}>
        <div>
          <h1 className="h1" style={{ marginBottom: 4 }}>Recruiting</h1>
          <div className="small">Yearly recruiting cycles, import, queue management, and contact history.</div>
        </div>
        <div className="spacer" />
        <select
          className="input"
          value={selectedYear}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
          style={{ minWidth: 120 }}
        >
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <button className="btn" type="button" onClick={handleDownloadTemplate}>
          Download Template
        </button>
        <label className="btn" style={{ cursor: "pointer" }}>
          Import Contacts
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={handleImportFileChange}
          />
        </label>
      </div>

      {error ? (
        <div className="card pad" style={{ marginBottom: 14, color: "var(--danger)" }}>
          {error}
        </div>
      ) : null}

      {importSummary ? (
        <div className="card pad" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 900 }}>{importSummary}</div>
          {importDuplicates.length > 0 ? (
            <div className="small" style={{ marginTop: 6 }}>
              Duplicates skipped: {importDuplicates.map((row) => row.email).join(", ")}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div className="card pad"><div className="small">Total</div><div style={{ fontSize: 28, fontWeight: 900 }}>{stats.total}</div></div>
        <div className="card pad"><div className="small">No Contact</div><div style={{ fontSize: 28, fontWeight: 900 }}>{stats.noContact}</div></div>
        <div className="card pad"><div className="small">Contacted</div><div style={{ fontSize: 28, fontWeight: 900 }}>{stats.contacted}</div></div>
        <div className="card pad"><div className="small">Very Interested</div><div style={{ fontSize: 28, fontWeight: 900 }}>{stats.interested}</div></div>
        <div className="card pad"><div className="small">Applied</div><div style={{ fontSize: 28, fontWeight: 900 }}>{stats.applied}</div></div>
      </div>

      <div className="card pad" style={{ marginBottom: 14 }}>
        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 900 }}>Filters</div>
          <div className="spacer" />
          <button className="btn" type="button" onClick={() => applyFilter(DEFAULT_FILTER_CONFIG, "all")}>
            Clear
          </button>
          <button className="btn" type="button" onClick={handleSaveCurrentFilter}>
            Save Filter
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <input
            className="input"
            value={filterConfig.searchQuery}
            onChange={(event) =>
              applyFilter({ ...filterConfig, searchQuery: event.target.value }, activeFilterId === "needs_attention" ? "custom" : activeFilterId)
            }
            placeholder="Search contacts"
          />
          <select
            className="input"
            value={filterConfig.stage}
            onChange={(event) => applyFilter({ ...filterConfig, stage: event.target.value }, "custom")}
          >
            <option value="">All stages</option>
            {RECRUITING_STAGES.map((stage) => (
              <option key={stage.value} value={stage.value}>{stage.label}</option>
            ))}
          </select>
          <input
            className="input"
            value={filterConfig.assignedTo}
            onChange={(event) => applyFilter({ ...filterConfig, assignedTo: event.target.value }, "custom")}
            placeholder="Assigned to"
          />
          <select
            className="input"
            value={filterConfig.activeView}
            onChange={(event) => applyFilter({ ...filterConfig, activeView: event.target.value }, "custom")}
          >
            <option value="all">All</option>
            <option value="outreach">Outreach Queue</option>
            <option value="pipeline">Pipeline</option>
            <option value="converted">Converted Teams</option>
          </select>
        </div>
        <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
          <button
            className={`btn ${activeFilterId === "needs_attention" ? "btnPrimary" : ""}`}
            type="button"
            onClick={() => {
              setActiveFilterId("needs_attention");
              setFilterConfig(DEFAULT_FILTER_CONFIG);
            }}
          >
            Needs Attention
          </button>
          {savedFilters.map((filter) => (
            <div key={filter.id} className="row" style={{ gap: 6 }}>
              <button className="btn" type="button" onClick={() => applyFilter(filter.filterConfig, filter.id)}>
                {filter.filterName}
              </button>
              <button className="btn" type="button" onClick={() => handleDeleteFilter(filter.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
          gap: 16,
        }}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card pad">
            <div className="row" style={{ marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 900 }}>Outreach Queue</div>
                <div className="small">{outreachQueue.length} contacts</div>
              </div>
              <div className="spacer" />
              <button
                className="btn"
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => setBulkModalOpen(true)}
              >
                Bulk Actions
              </button>
            </div>
            {renderTable(outreachQueue, true)}
          </div>

          <div className="card pad">
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Pipeline</div>
            {renderTable(pipelineRecords)}
          </div>

          <div className="card pad">
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Converted Teams</div>
            {renderTable(convertedTeams)}
          </div>
        </div>

        <div className="card pad">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Contact History</div>
          {selectedRecord ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800 }}>{formatContactName(selectedRecord)}</div>
                <div className="small">{selectedRecord.contact?.email}</div>
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Stage</div>
                <select
                  className="input"
                  value={selectedRecord.stage}
                  onChange={(event) => updateSelectedRecord("stage", Number(event.target.value))}
                >
                  {RECRUITING_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value}>{stage.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Assigned To</div>
                <input
                  className="input"
                  value={selectedRecord.assignedTo}
                  onChange={(event) => updateSelectedRecord("assignedTo", event.target.value)}
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Next Follow-Up</div>
                <input
                  className="input"
                  type="date"
                  value={selectedRecord.nextFollowUp || ""}
                  onChange={(event) => updateSelectedRecord("nextFollowUp", event.target.value)}
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Mackayla Notes</div>
                <textarea
                  className="input"
                  rows={4}
                  value={selectedRecord.mackaylaNotes}
                  onChange={(event) => updateSelectedRecord("mackaylaNotes", event.target.value)}
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Leslee Notes</div>
                <textarea
                  className="input"
                  rows={4}
                  value={selectedRecord.lesleeNotes}
                  onChange={(event) => updateSelectedRecord("lesleeNotes", event.target.value)}
                />
              </div>
              <button className="btn btnPrimary" type="button" onClick={handleSaveSelectedRecordNotes}>
                {isSavingNotes ? "Saving..." : "Save Record"}
              </button>

              <div style={{ fontWeight: 800, marginTop: 6 }}>Activity</div>
              {history.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      style={{ paddingBottom: 10, borderBottom: "1px solid var(--border)" }}
                    >
                      <div>{entry.summary || getRecruitingStageLabel(selectedRecord.stage)}</div>
                      <div className="small" style={{ marginTop: 4 }}>
                        {entry.staffMember ? `${entry.staffMember} • ` : ""}
                        {formatDateTime(entry.actionDate)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="small">No activity logged yet.</div>
              )}
            </div>
          ) : (
            <div className="small">Select a recruiting record to view this year’s history.</div>
          )}
        </div>
      </div>

      {importModalOpen ? (
        <div
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
          <div className="card pad" style={{ width: "min(900px, 100%)", maxHeight: "80vh", overflow: "auto" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>Import Preview</div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={() => setImportModalOpen(false)}>
                Close
              </button>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {importPreviewRows.map((row, index) => (
                  <tr key={`${row.email}-${index}`}>
                    <td>{row.firstName}</td>
                    <td>{row.lastName}</td>
                    <td>{row.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn btnPrimary" type="button" onClick={handleConfirmImport}>
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkModalOpen ? (
        <div
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
          <div className="card pad" style={{ width: "min(620px, 100%)" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>Bulk Action</div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={() => setBulkModalOpen(false)}>
                Close
              </button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <select className="input" value={bulkAction} onChange={(event) => setBulkAction(event.target.value)}>
                {BULK_ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input
                className="input"
                type="datetime-local"
                value={bulkDate}
                onChange={(event) => setBulkDate(event.target.value)}
              />
              <textarea
                className="input"
                rows={3}
                value={bulkSummary}
                onChange={(event) => setBulkSummary(event.target.value)}
                placeholder="Summary / note"
              />
              <select className="input" value={bulkStage} onChange={(event) => setBulkStage(event.target.value)}>
                <option value="">No stage change</option>
                {RECRUITING_STAGES.map((stage) => (
                  <option key={stage.value} value={stage.value}>{stage.label}</option>
                ))}
              </select>
              <input
                className="input"
                type="date"
                value={bulkNextFollowUp}
                onChange={(event) => setBulkNextFollowUp(event.target.value)}
              />
              <input
                className="input"
                value={bulkAssignedTo}
                onChange={(event) => setBulkAssignedTo(event.target.value)}
                placeholder="Assign to staff member"
              />
              <button className="btn btnPrimary" type="button" onClick={handleBulkActionSubmit}>
                Apply to {selectedIds.length} contacts
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
