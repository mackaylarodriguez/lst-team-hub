import Shell from "@/components/Shell";
import { useRouter } from "next/router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { requireSession } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";
import {
  RECRUITING_STAGES,
  RECRUITING_UPDATED_EVENT,
  bulkUpdateRecruitingCycleContacts,
  convertRecruitingCycleRecordToTrip,
  deleteRecruitingSavedFilter,
  getRecruitingStageLabel,
  importRecruitingContacts,
  listRecruitingActivityLogs,
  listRecruitingCycleContacts,
  listRecruitingSavedFilters,
  listRecruitingYears,
  logRecruitingCycleContactAction,
  promoteRecruitingRecordToPotentialTeam,
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

const RECRUITING_TABS = [
  { id: "outreach", label: "Outreach Queue" },
  { id: "potential", label: "Potential Teams" },
  { id: "converted", label: "Converted Teams" },
];

function buildRecruitingRecordPayload(record, overrides = {}) {
  return {
    id: record.id,
    contactId: record.contactId,
    recruitingYear: record.recruitingYear,
    firstName: record.contact?.firstName,
    lastName: record.contact?.lastName,
    email: record.contact?.email,
    gender: record.contact?.gender,
    priority: record.priority,
    alumniYearLabel: record.alumniYearLabel,
    stage: record.stage,
    isPotentialTeam: record.isPotentialTeam,
    interestedTrip: record.interestedTrip,
    teamName: record.teamName,
    teamMembers: record.teamMembers,
    projectDates: record.projectDates,
    site: record.site,
    weeks: record.weeks,
    departureDate: record.departureDate,
    assignedTo: record.assignedTo,
    lastContactedAt: record.lastContactedAt,
    lastContactMethod: record.lastContactMethod,
    nextFollowUp: record.nextFollowUp,
    mackaylaNotes: record.mackaylaNotes,
    lesleeNotes: record.lesleeNotes,
    bulkLastContactedAt: record.bulkLastContactedAt,
    bulkLastContactMethod: record.bulkLastContactMethod,
    isConvertedToTeam: record.isConvertedToTeam,
    convertedTeamId: record.convertedTeamId,
    ...overrides,
  };
}

function DraggableTable({ children }) {
  const containerRef = useRef(null);
  const dragStateRef = useRef({
    isDragging: false,
    pointerId: null,
    startX: 0,
    scrollLeft: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  function endDrag() {
    if (
      containerRef.current &&
      dragStateRef.current.pointerId !== null &&
      containerRef.current.hasPointerCapture?.(dragStateRef.current.pointerId)
    ) {
      containerRef.current.releasePointerCapture(dragStateRef.current.pointerId);
    }

    dragStateRef.current = {
      isDragging: false,
      pointerId: null,
      startX: 0,
      scrollLeft: containerRef.current?.scrollLeft || 0,
    };
    setIsDragging(false);
  }

  function handlePointerDown(event) {
    if (
      !containerRef.current ||
      event.button !== 0 ||
      event.target.closest("button, a, input, textarea, select, label")
    ) {
      return;
    }

    dragStateRef.current = {
      isDragging: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: containerRef.current.scrollLeft,
    };
    containerRef.current.setPointerCapture?.(event.pointerId);
    setIsDragging(true);
  }

  function handlePointerMove(event) {
    if (!dragStateRef.current.isDragging || !containerRef.current) return;
    const deltaX = event.clientX - dragStateRef.current.startX;
    containerRef.current.scrollLeft = dragStateRef.current.scrollLeft - deltaX;
  }

  return (
    <div
      ref={containerRef}
      className={`recruitingTableScroller ${isDragging ? "isDragging" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      {children}
    </div>
  );
}

export default function RecruitingPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [records, setRecords] = useState([]);
  const [savedFilters, setSavedFilters] = useState([]);
  const [historyByRecordId, setHistoryByRecordId] = useState({});
  const [historyLoadingByRecordId, setHistoryLoadingByRecordId] = useState({});
  const [error, setError] = useState("");
  const [filterConfig, setFilterConfig] = useState(DEFAULT_FILTER_CONFIG);
  const [activeFilterId, setActiveFilterId] = useState("all");
  const [activeTab, setActiveTab] = useState("outreach");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [expandedPotentialRecordId, setExpandedPotentialRecordId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [addContactModalOpen, setAddContactModalOpen] = useState(false);
  const [newContactDraft, setNewContactDraft] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
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
  const [formTeamModalOpen, setFormTeamModalOpen] = useState(false);
  const [teamFormDraft, setTeamFormDraft] = useState({
    teamName: "",
    teamMembers: "",
    teamMemberEmails: "",
    projectDates: "",
    site: "",
    weeks: "",
    departureDate: "",
    mackaylaNotes: "",
    lesleeNotes: "",
  });
  const importInputRef = useRef(null);
  const historyCacheRef = useRef({});
  const loadingHistoryRef = useRef({});

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
    historyCacheRef.current = historyByRecordId;
  }, [historyByRecordId]);

  useEffect(() => {
    historyCacheRef.current = {};
    loadingHistoryRef.current = {};
    setHistoryByRecordId({});
    setHistoryLoadingByRecordId({});
    setExpandedPotentialRecordId("");
  }, [selectedYear]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (activeFilterId === "needs_attention" && !recordNeedsAttention(record)) {
        return false;
      }

      if (activeFilterId === "no_contact" && record.stage !== 0) {
        return false;
      }

      if (activeFilterId === "follow_up_due" && !isDueTodayOrOverdue(record.nextFollowUp)) {
        return false;
      }

      if (filterConfig.activeView === "outreach" && (record.isConvertedToTeam || record.isPotentialTeam || record.stage > 1)) {
        return false;
      }

      if (filterConfig.activeView === "potential" && (record.isConvertedToTeam || (!record.isPotentialTeam && record.stage < 2))) {
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
    () => filteredRecords.filter((record) => !record.isConvertedToTeam && !record.isPotentialTeam && record.stage <= 1),
    [filteredRecords]
  );
  const pipelineRecords = useMemo(
    () => filteredRecords.filter((record) => !record.isConvertedToTeam && (record.isPotentialTeam || record.stage >= 2)),
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
  const currentHistory = useMemo(
    () => (selectedRecordId ? historyByRecordId[selectedRecordId] || [] : []),
    [historyByRecordId, selectedRecordId]
  );
  const isCurrentHistoryLoading = selectedRecordId
    ? Boolean(historyLoadingByRecordId[selectedRecordId])
    : false;

  useEffect(() => {
    if (!selectedRecordId && records.length > 0) {
      setSelectedRecordId(records[0].id);
    }
  }, [records, selectedRecordId]);

  useEffect(() => {
    if (activeTab !== "potential") {
      setExpandedPotentialRecordId("");
    }
  }, [activeTab]);

  useEffect(() => {
    if (!selectedRecordId || activeTab === "potential") return;
    void ensureRecordHistoryLoaded(selectedRecordId);
  }, [activeTab, selectedRecordId]);

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

  async function ensureRecordHistoryLoaded(recordId, options = {}) {
    const force = options.force === true;
    if (!recordId) return [];
    if (!force && historyCacheRef.current[recordId]) {
      return historyCacheRef.current[recordId];
    }
    if (!force && loadingHistoryRef.current[recordId]) {
      return [];
    }

    loadingHistoryRef.current[recordId] = true;
    setHistoryLoadingByRecordId((current) => ({ ...current, [recordId]: true }));

    try {
      const rows = await listRecruitingActivityLogs(recordId);
      historyCacheRef.current = { ...historyCacheRef.current, [recordId]: rows };
      setHistoryByRecordId((current) => ({ ...current, [recordId]: rows }));
      return rows;
    } catch (loadError) {
      console.error("Unable to load recruiting history", loadError);
      return [];
    } finally {
      delete loadingHistoryRef.current[recordId];
      setHistoryLoadingByRecordId((current) => {
        const next = { ...current };
        delete next[recordId];
        return next;
      });
    }
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

  async function handleCreateContact() {
    if (!newContactDraft.email.trim()) {
      setError("Email is required.");
      return;
    }

    try {
      await saveRecruitingCycleContact({
        recruitingYear: selectedYear,
        firstName: newContactDraft.firstName,
        lastName: newContactDraft.lastName,
        email: newContactDraft.email,
        stage: 0,
      });

      setNewContactDraft({
        firstName: "",
        lastName: "",
        email: "",
      });
      setAddContactModalOpen(false);
      setError("");
      await refreshCurrentYear();
    } catch (saveError) {
      console.error("Unable to create recruiting contact", saveError);
      setError(saveError.message || "Unable to create contact.");
    }
  }

  async function handleLogRecordAction(record, actionType) {
    const summary = window.prompt(`Summary for ${actionType}`);
    if (summary === null) return;

    const nextFollowUp =
      actionType === "note"
        ? undefined
        : window.prompt("Next follow-up date (YYYY-MM-DD). Leave blank to skip.") || undefined;

    await logRecruitingCycleContactAction({
      record,
      actionType,
      actionDate: new Date().toISOString(),
      staffMember: session?.name || session?.email || "Staff",
      summary,
      nextFollowUp,
      stage: actionType === "email" || actionType === "call" || actionType === "text"
        ? Math.max(record.stage, 1)
        : undefined,
    });

    await refreshCurrentYear();
    await ensureRecordHistoryLoaded(record.id, { force: true });
  }

  async function handlePromote(record) {
    await promoteRecruitingRecordToPotentialTeam(record, {
      staffMember: session?.name || session?.email || "Staff",
    });
    setActiveTab("potential");
    await refreshCurrentYear();
  }

  async function handleAdvanceStage(record) {
    await saveRecruitingCycleContact(
      buildRecruitingRecordPayload(record, {
        stage: Math.min(record.stage + 1, 3),
      })
    );
    await refreshCurrentYear();
  }

  function openFormTeamModal(record) {
    setSelectedRecordId(record.id);
    setTeamFormDraft({
      teamName: record.teamName || formatContactName(record),
      teamMembers: record.teamMembers || formatContactName(record),
      teamMemberEmails: record.contact?.email || "",
      projectDates: record.projectDates || "",
      site: record.site || "",
      weeks: record.weeks || "",
      departureDate: record.departureDate || "",
      mackaylaNotes: record.mackaylaNotes || "",
      lesleeNotes: record.lesleeNotes || "",
    });
    setFormTeamModalOpen(true);
  }

  async function handleFormTeam() {
    if (!selectedRecord) return;

    await convertRecruitingCycleRecordToTrip({
      record: selectedRecord,
      ...teamFormDraft,
    });

    setFormTeamModalOpen(false);
    setActiveTab("converted");
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

  async function handleSaveRecord(recordId = selectedRecordId) {
    const recordToSave = records.find((record) => record.id === recordId);
    if (!recordToSave) return;

    try {
      setIsSavingNotes(true);
      await saveRecruitingCycleContact(buildRecruitingRecordPayload(recordToSave));
      await refreshCurrentYear();
      await ensureRecordHistoryLoaded(recordId, { force: true });
    } finally {
      setIsSavingNotes(false);
    }
  }

  function updateRecordField(recordId, field, value) {
    setRecords((current) =>
      current.map((record) =>
        record.id === recordId ? { ...record, [field]: value } : record
      )
    );
  }

  function updateSelectedRecord(field, value) {
    if (!selectedRecordId) return;
    updateRecordField(selectedRecordId, field, value);
  }

  function togglePotentialRecord(recordId) {
    setSelectedRecordId(recordId);
    if (expandedPotentialRecordId === recordId) {
      setExpandedPotentialRecordId("");
      return;
    }
    setExpandedPotentialRecordId(recordId);
    void ensureRecordHistoryLoaded(recordId);
  }

  function renderOutreachTable(recordsToRender) {
    if (recordsToRender.length === 0) {
      return <div className="small">No contacts in this view.</div>;
    }

    return (
      <DraggableTable>
        <table className="table recruitingCompactTable" style={{ minWidth: 1320 }}>
          <thead>
            <tr>
              <th />
              <th>Priority</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Stage</th>
              <th>Last Contacted</th>
              <th>Method</th>
              <th>Assigned</th>
              <th>Follow-Up</th>
              <th>Mackayla Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordsToRender.map((record) => (
              <tr
                key={record.id}
                onClick={() => setSelectedRecordId(record.id)}
                style={record.id === selectedRecordId ? { background: "rgba(47,73,147,.06)" } : undefined}
              >
                <td onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(record.id)}
                    onChange={() => toggleSelected(record.id)}
                  />
                </td>
                <td>{record.priority || "-"}</td>
                <td>{record.contact?.firstName || "-"}</td>
                <td>{record.contact?.lastName || "-"}</td>
                <td>{record.contact?.email || "-"}</td>
                <td>{record.stageLabel}</td>
                <td>{record.lastContactedAt ? formatDateTime(record.lastContactedAt) : "-"}</td>
                <td>{record.lastContactMethod || "-"}</td>
                <td>{record.assignedTo || "-"}</td>
                <td>{record.nextFollowUp ? formatDate(record.nextFollowUp) : "-"}</td>
                <td>{record.mackaylaNotes || "-"}</td>
                <td onClick={(event) => event.stopPropagation()}>
                  <div className="row recruitingActionRow">
                    <button className="btn" type="button" onClick={() => handleLogRecordAction(record, "email")}>Log Email</button>
                    <button className="btn" type="button" onClick={() => handleLogRecordAction(record, "call")}>Log Call</button>
                    <button className="btn" type="button" onClick={() => handleLogRecordAction(record, "text")}>Log Text</button>
                    <button className="btn" type="button" onClick={() => handleLogRecordAction(record, "note")}>Add Note</button>
                    <button className="btn" type="button" onClick={() => handleAdvanceStage(record)}>Change Stage</button>
                    <button className="btn" type="button" onClick={() => handlePromote(record)}>Promote</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DraggableTable>
    );
  }

  function renderPotentialTable(recordsToRender) {
    if (recordsToRender.length === 0) return <div className="small">No potential teams yet.</div>;

    return (
      <DraggableTable>
        <table className="table recruitingCompactTable" style={{ minWidth: 1560 }}>
          <thead>
            <tr>
              <th>Team Name</th>
              <th>Primary Contact</th>
              <th>Email</th>
              <th>Stage</th>
              <th>Interested Trip</th>
              <th>Project Dates</th>
              <th>Site</th>
              <th>Weeks</th>
              <th>Departure</th>
              <th>Mackayla Notes</th>
              <th>Leslee Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordsToRender.map((record) => {
              const isExpanded = record.id === expandedPotentialRecordId;
              const recordHistory = historyByRecordId[record.id] || [];
              const isHistoryLoading = Boolean(historyLoadingByRecordId[record.id]);

              return (
                <Fragment key={record.id}>
                  <tr
                    onClick={() => togglePotentialRecord(record.id)}
                    style={isExpanded ? { background: "rgba(47,73,147,.06)" } : undefined}
                  >
                    <td>{record.teamName || "-"}</td>
                    <td>{formatContactName(record)}</td>
                    <td>{record.contact?.email || "-"}</td>
                    <td>{record.stageLabel}</td>
                    <td>{record.interestedTrip || "-"}</td>
                    <td>{record.projectDates || "-"}</td>
                    <td>{record.site || "-"}</td>
                    <td>{record.weeks || "-"}</td>
                    <td>{record.departureDate ? formatDate(record.departureDate) : "-"}</td>
                    <td>{record.mackaylaNotes || "-"}</td>
                    <td>{record.lesleeNotes || "-"}</td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <div className="row recruitingActionRow">
                        <button className="btn" type="button" onClick={() => togglePotentialRecord(record.id)}>
                          {isExpanded ? "Hide Details" : "Edit Team Details"}
                        </button>
                        <button className="btn" type="button" onClick={() => handleLogRecordAction(record, "note")}>Add Notes</button>
                        <button className="btn" type="button" onClick={() => togglePotentialRecord(record.id)}>
                          {isExpanded ? "Hide History" : "View History"}
                        </button>
                        <button className="btn btnPrimary" type="button" onClick={() => openFormTeamModal(record)}>Form Team</button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className="recruitingExpandedRow">
                      <td colSpan={12}>
                        <div className="recruitingExpandedCard">
                          <div className="recruitingExpandedGrid">
                            <div style={{ display: "grid", gap: 12 }}>
                              <div>
                                <div style={{ fontWeight: 900 }}>{record.teamName || formatContactName(record)}</div>
                                <div className="small">
                                  Click another row to switch teams. Drag sideways if you need more columns.
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                  gap: 10,
                                }}
                              >
                                <div>
                                  <div className="small" style={{ marginBottom: 6 }}>Stage</div>
                                  <select
                                    className="input"
                                    value={record.stage}
                                    onChange={(event) => {
                                      setSelectedRecordId(record.id);
                                      updateRecordField(record.id, "stage", Number(event.target.value));
                                    }}
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
                                    value={record.assignedTo || ""}
                                    onChange={(event) => {
                                      setSelectedRecordId(record.id);
                                      updateRecordField(record.id, "assignedTo", event.target.value);
                                    }}
                                  />
                                </div>
                                <div>
                                  <div className="small" style={{ marginBottom: 6 }}>Next Follow-Up</div>
                                  <input
                                    className="input"
                                    type="date"
                                    value={record.nextFollowUp || ""}
                                    onChange={(event) => {
                                      setSelectedRecordId(record.id);
                                      updateRecordField(record.id, "nextFollowUp", event.target.value);
                                    }}
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="small" style={{ marginBottom: 6 }}>Mackayla Notes</div>
                                <textarea
                                  className="input"
                                  rows={3}
                                  value={record.mackaylaNotes || ""}
                                  onChange={(event) => {
                                    setSelectedRecordId(record.id);
                                    updateRecordField(record.id, "mackaylaNotes", event.target.value);
                                  }}
                                />
                              </div>
                              <div>
                                <div className="small" style={{ marginBottom: 6 }}>Leslee Notes</div>
                                <textarea
                                  className="input"
                                  rows={3}
                                  value={record.lesleeNotes || ""}
                                  onChange={(event) => {
                                    setSelectedRecordId(record.id);
                                    updateRecordField(record.id, "lesleeNotes", event.target.value);
                                  }}
                                />
                              </div>
                              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                                <button
                                  className="btn btnPrimary"
                                  type="button"
                                  onClick={() => {
                                    setSelectedRecordId(record.id);
                                    void handleSaveRecord(record.id);
                                  }}
                                >
                                  {isSavingNotes && selectedRecordId === record.id ? "Saving..." : "Save Record"}
                                </button>
                                <button className="btn" type="button" onClick={() => handleLogRecordAction(record, "note")}>
                                  Add Activity Note
                                </button>
                              </div>
                            </div>
                            <div style={{ display: "grid", gap: 10 }}>
                              <div style={{ fontWeight: 800 }}>Activity</div>
                              {isHistoryLoading ? (
                                <div className="small">Loading history...</div>
                              ) : recordHistory.length > 0 ? (
                                <div className="recruitingHistoryList">
                                  {recordHistory.map((entry) => (
                                    <div key={entry.id} className="recruitingHistoryEntry">
                                      <div>{entry.summary || getRecruitingStageLabel(record.stage)}</div>
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
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </DraggableTable>
    );
  }

  function renderConvertedTable(recordsToRender) {
    if (recordsToRender.length === 0) return <div className="small">No converted teams yet.</div>;

    return (
      <DraggableTable>
        <table className="table recruitingCompactTable" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th>Team Name</th>
              <th>Primary Contact</th>
              <th>Trip / Site</th>
              <th>Departure Date</th>
              <th>Status</th>
              <th>Open Team</th>
            </tr>
          </thead>
          <tbody>
            {recordsToRender.map((record) => (
              <tr key={record.id} onClick={() => setSelectedRecordId(record.id)}>
                <td>{record.teamName || record.linkedTrip?.name || "-"}</td>
                <td>{formatContactName(record)}</td>
                <td>{record.linkedTrip?.site || record.site || "-"}</td>
                <td>{record.linkedTrip?.departureDate ? formatDate(record.linkedTrip.departureDate) : (record.departureDate ? formatDate(record.departureDate) : "-")}</td>
                <td>{record.linkedTrip?.status || "Converted"}</td>
                <td>
                  {record.convertedTeamId ? (
                    <button className="btn btnPrimary" type="button" onClick={() => router.push(`/trips/${encodeURIComponent(record.convertedTeamId)}`)}>
                      Open Team
                    </button>
                  ) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DraggableTable>
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
        <button className="btn" type="button" onClick={() => setAddContactModalOpen(true)}>
          Add Contact
        </button>
        <button className="btn" type="button" onClick={() => importInputRef.current?.click()}>
          Import Contacts
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={handleImportFileChange}
        />
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
            <option value="potential">Potential Teams</option>
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
          <button
            className={`btn ${activeFilterId === "no_contact" ? "btnPrimary" : ""}`}
            type="button"
            onClick={() => {
              setActiveFilterId("no_contact");
              setFilterConfig(DEFAULT_FILTER_CONFIG);
            }}
          >
            No Contact Yet
          </button>
          <button
            className={`btn ${activeFilterId === "follow_up_due" ? "btnPrimary" : ""}`}
            type="button"
            onClick={() => {
              setActiveFilterId("follow_up_due");
              setFilterConfig(DEFAULT_FILTER_CONFIG);
            }}
          >
            Follow-Up Due
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
          gridTemplateColumns: activeTab === "potential" ? "minmax(0, 1fr)" : "minmax(0, 2fr) minmax(320px, 1fr)",
          gap: 16,
        }}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card pad">
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {RECRUITING_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`btn ${activeTab === tab.id ? "btnPrimary" : ""}`}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "outreach" ? (
              <>
                <div className="row" style={{ marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>Outreach Queue</div>
                    <div className="small">High-volume lead management for first-touch outreach.</div>
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
                {renderOutreachTable(outreachQueue)}
              </>
            ) : null}

            {activeTab === "potential" ? (
              <>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Potential Teams</div>
                <div className="small" style={{ marginBottom: 10 }}>
                  Curated serious leads for team formation and Leslee follow-up. Click a row to open notes and history.
                </div>
                {renderPotentialTable(pipelineRecords)}
              </>
            ) : null}

            {activeTab === "converted" ? (
              <>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Converted Teams</div>
                <div className="small" style={{ marginBottom: 10 }}>
                  Recruiting records already turned into real teams.
                </div>
                {renderConvertedTable(convertedTeams)}
              </>
            ) : null}
          </div>
        </div>

        <div className="card pad" style={activeTab === "potential" ? { display: "none" } : undefined}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>
            {activeTab === "outreach" ? "Contact History" : "Converted Team History"}
          </div>
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
              <button className="btn btnPrimary" type="button" onClick={() => handleSaveRecord()}>
                {isSavingNotes ? "Saving..." : "Save Record"}
              </button>

              <div style={{ fontWeight: 800, marginTop: 6 }}>Activity</div>
              {isCurrentHistoryLoading ? (
                <div className="small">Loading history...</div>
              ) : currentHistory.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {currentHistory.map((entry) => (
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

      {addContactModalOpen ? (
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
          <div className="card pad" style={{ width: "min(520px, 100%)" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>Add Contact</div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={() => setAddContactModalOpen(false)}>
                Close
              </button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                className="input"
                value={newContactDraft.firstName}
                onChange={(event) =>
                  setNewContactDraft((current) => ({ ...current, firstName: event.target.value }))
                }
                placeholder="First Name"
              />
              <input
                className="input"
                value={newContactDraft.lastName}
                onChange={(event) =>
                  setNewContactDraft((current) => ({ ...current, lastName: event.target.value }))
                }
                placeholder="Last Name"
              />
              <input
                className="input"
                value={newContactDraft.email}
                onChange={(event) =>
                  setNewContactDraft((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="Email"
              />
              <button className="btn btnPrimary" type="button" onClick={handleCreateContact}>
                Save Contact
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {formTeamModalOpen ? (
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
          <div className="card pad" style={{ width: "min(760px, 100%)", maxHeight: "80vh", overflow: "auto" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>Form Team</div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={() => setFormTeamModalOpen(false)}>
                Close
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              <input className="input" value={teamFormDraft.teamName} onChange={(e) => setTeamFormDraft((c) => ({ ...c, teamName: e.target.value }))} placeholder="Team Name" />
              <input className="input" value={teamFormDraft.site} onChange={(e) => setTeamFormDraft((c) => ({ ...c, site: e.target.value }))} placeholder="Site" />
              <input className="input" value={teamFormDraft.projectDates} onChange={(e) => setTeamFormDraft((c) => ({ ...c, projectDates: e.target.value }))} placeholder="Project Dates" />
              <input className="input" value={teamFormDraft.weeks} onChange={(e) => setTeamFormDraft((c) => ({ ...c, weeks: e.target.value }))} placeholder="Number of Weeks" />
              <input className="input" type="date" value={teamFormDraft.departureDate} onChange={(e) => setTeamFormDraft((c) => ({ ...c, departureDate: e.target.value }))} />
            </div>
            <textarea className="input" rows={3} style={{ marginTop: 10 }} value={teamFormDraft.teamMembers} onChange={(e) => setTeamFormDraft((c) => ({ ...c, teamMembers: e.target.value }))} placeholder="Team Members" />
            <textarea className="input" rows={3} style={{ marginTop: 10 }} value={teamFormDraft.teamMemberEmails} onChange={(e) => setTeamFormDraft((c) => ({ ...c, teamMemberEmails: e.target.value }))} placeholder="Team Member Emails" />
            <textarea className="input" rows={3} style={{ marginTop: 10 }} value={teamFormDraft.mackaylaNotes} onChange={(e) => setTeamFormDraft((c) => ({ ...c, mackaylaNotes: e.target.value }))} placeholder="Mackayla Notes" />
            <textarea className="input" rows={3} style={{ marginTop: 10 }} value={teamFormDraft.lesleeNotes} onChange={(e) => setTeamFormDraft((c) => ({ ...c, lesleeNotes: e.target.value }))} placeholder="Leslee Notes" />
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn btnPrimary" type="button" onClick={handleFormTeam}>
                Form Team
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
