import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import EmptyState from "@/components/EmptyState";
import { showToast } from "@/components/Toast";
import { hideBusy, isBusyActive, showBusyDone } from "@/components/BusyOverlay";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { requireSession } from "@/lib/auth";
import { isManagerRole } from "@/lib/roles";
import {
  RECRUITING_STAGES,
  RECRUITING_UPDATED_EVENT,
  convertRecruitingCycleRecordToTrip,
  deleteRecruitingCycleContactForBoard,
  getRecruitingStageLabel,
  importRecruitingContacts,
  listRecruitingCycleContacts,
  listRecruitingContactActivityByIds,
  listRecruitingYears,
  logRecruitingCycleContactAction,
  updateRecruitingContactActivityLog,
  revertRecruitingLockedTeam,
  demoteRecruitingRecordToOutreach,
  moveRecruitingRecordToYear,
  promoteRecruitingRecordToPotentialTeam,
  saveRecruitingCycleContact,
} from "@/lib/recruitingCycles";
import { buildSiteLabelsOrdered, resolveEffectiveSiteHostName } from "@/lib/siteMaterials";
import { sendTeamLockStaffNotify, buildTeamLockNotifyPayload } from "@/lib/teamLockNotify";
import {
  computeWeeksBetweenDepartAndEnd,
  resolveProjectLengthForLock,
} from "@/lib/teamLockProjectLength";
import { listSiteBudgetNotes } from "@/lib/tripBudget";
import { listTripTeamMembersForDuplicateCheck } from "@/lib/tripTeamMembers";
import { saveStaffMiscTask } from "@/lib/staffTasks";
import {
  listRegisteredWorkersForPicker,
  resolveRegisteredWorker,
  searchRegisteredWorkers,
} from "@/lib/workerLookup";
import {
  DEFAULT_TRAINING_TIMELINE_TYPE,
  TRAINING_TIMELINE_OPTIONS,
} from "@/lib/workerTaskTemplate";

function formatContactName(record) {
  const fullName = [record?.contact?.firstName, record?.contact?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || record?.contact?.email || "Unnamed contact";
}

function formatRecruitingTaskTargetName(record) {
  return (
    String(record?.teamName || record?.linkedTrip?.name || formatContactName(record) || "")
      .trim() || "recruiting contact"
  );
}

function buildRecruitingStaffTaskDraft(record) {
  const targetName = formatRecruitingTaskTargetName(record);
  const details = [
    record?.contact?.email ? `Email: ${record.contact.email}` : "",
    record?.contact?.phone ? `Phone: ${record.contact.phone}` : "",
    record?.site ? `Site: ${record.site}` : "",
    record?.projectDates ? `Project dates: ${record.projectDates}` : "",
  ].filter(Boolean);

  return {
    recordId: record?.id || "",
    taskName: `Contact ${targetName}`,
    dueDate: String(record?.nextFollowUp || "").slice(0, 10),
    notes: details.join("\n"),
  };
}

function normalizeEmailValue(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStatusValue(value) {
  return String(value || "").trim().toLowerCase();
}

/** Roster on the trip this row was converted to is expected, not a cross-board duplicate. */
function isTripTeamMemberOnOwnConvertedTrip(member, recruitingRecord) {
  if (!recruitingRecord?.isConvertedToTeam || !recruitingRecord?.convertedTeamId || !member?.tripId) {
    return false;
  }
  return String(member.tripId) === String(recruitingRecord.convertedTeamId);
}

function ignoreTripIdsForConvertedRecruitingRecord(record) {
  if (!record?.isConvertedToTeam || !record?.convertedTeamId) return [];
  return [record.convertedTeamId];
}

function getWorkflowBoardLabel(record) {
  if (record?.isConvertedToTeam) return "Locked Teams";
  return "Potential Teams";
}

/** Tab id for `activeTab` — aligned with pipelineRecords / convertedTeams splits. */
function recruitingBoardTabForRecord(record, currentTab = "") {
  if (record?.isConvertedToTeam) return "converted";
  if (currentTab === "outreach") return "outreach";
  return "potential";
}

function joinLabels(labels) {
  if (labels.length <= 1) return labels[0] || "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

const RECRUITING_BOARD_SORT = ["Potential Teams", "Locked Teams"];

const CURRENT_RECRUITING_YEAR = new Date().getFullYear();
/** Season staff plan against by default (Sites availability is also 2027). */
const DEFAULT_RECRUITING_YEAR = 2027;
/** Always offer these year boards even before contacts exist for them. */
const ENSURED_RECRUITING_YEARS = [2027, 2028];

const RECRUITING_POTENTIAL_COL = {
  select: 44,
  stage: 64,
  team: 168,
  roster: 210,
  projectDates: 150,
  site: 280,
  weeks: 88,
  fundraising: 130,
  mackayla: 230,
  leslee: 230,
  actions: 190,
};
const RECRUITING_CONVERTED_COL_PCT = {
  team: "8%",
  roster: "12%",
  projectDates: "7%",
  site: "7%",
  weeks: "5%",
  mackayla: "22%",
  leslee: "22%",
  actions: "17%",
};

/** Recruiting list: one row per person. */
const RECRUITING_OUTREACH_LIST_COL_PCT = {
  select: "3%",
  contact: "15%",
  project: "12%",
  mackayla: "22%",
  leslee: "22%",
  lastContact: "16%",
  actions: "10%",
};

function formatOutreachContactMethod(method) {
  const normalized = String(method || "").trim().toLowerCase();
  if (normalized === "email" || normalized === "bulk email") return "Emailed";
  if (normalized === "call") return "Called";
  if (normalized === "text" || normalized === "bulk text") return "Texted";
  return String(method || "").trim();
}

function formatOutreachPersonName(person) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim() || "Unnamed";
}

function outreachLastContactTimestamp(record) {
  const value = record?.lastContactedAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function lastContactDateInputValue(record) {
  if (!record?.lastContactedAt) return "";
  const raw = String(record.lastContactedAt).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizeLastContactMethodValue(method) {
  const normalized = String(method || "").trim().toLowerCase();
  if (normalized === "bulk email") return "email";
  if (normalized === "bulk text") return "text";
  if (["email", "call", "text"].includes(normalized)) return normalized;
  return "";
}

function parseLastContactActionDate(dateInput) {
  const trimmed = String(dateInput || "").trim();
  const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? trimmed
    : new Date().toISOString().slice(0, 10);
  return new Date(`${dateStr}T12:00:00`).toISOString();
}

function getRecentContactActivities(recordId, activityByRecordId, limit = 3) {
  const entries = activityByRecordId?.[recordId] || [];
  return entries.slice(0, limit);
}

function potentialFundraisingSortValue(record) {
  const raw =
    record?.pendingLockTeamSetup?.fundraisingGoalAmount ??
    record?.fundraisingGoalAmount ??
    "";
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function potentialWeeksSortValue(record) {
  const n = Number(record?.weeks);
  return Number.isFinite(n) ? n : null;
}

function potentialTextSortValue(record, key) {
  if (key === "team") return String(record?.teamName || formatContactName(record) || "").toLowerCase();
  if (key === "roster") {
    return getRecordPeopleList(record).join(", ").toLowerCase();
  }
  if (key === "projectDates") return String(record?.projectDates || "").toLowerCase();
  if (key === "site") return String(record?.site || "").toLowerCase();
  if (key === "mackayla") return String(stripHandoffSummary(record?.mackaylaNotes) || "").toLowerCase();
  if (key === "leslee") return String(record?.lesleeNotes || "").toLowerCase();
  return "";
}

function compareNullableNumber(a, b, dir) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return dir === "desc" ? b - a : a - b;
}

function sortPotentialTeamRecords(records, sortKey, sortDir) {
  if (!sortKey) return records;
  const dir = sortDir === "desc" ? "desc" : "asc";
  const sorted = [...records];
  sorted.sort((a, b) => {
    if (sortKey === "stage") {
      return compareNullableNumber(Number(a.stage) || 0, Number(b.stage) || 0, dir);
    }
    if (sortKey === "weeks") {
      return compareNullableNumber(potentialWeeksSortValue(a), potentialWeeksSortValue(b), dir);
    }
    if (sortKey === "fundraising") {
      return compareNullableNumber(
        potentialFundraisingSortValue(a),
        potentialFundraisingSortValue(b),
        dir
      );
    }
    const ta = potentialTextSortValue(a, sortKey);
    const tb = potentialTextSortValue(b, sortKey);
    const cmp = ta.localeCompare(tb, undefined, { numeric: true, sensitivity: "base" });
    return dir === "desc" ? -cmp : cmp;
  });
  return sorted;
}

function outreachColumnSortValue(row, key) {
  const record = row?.record;
  const person = row?.person;
  if (key === "contact") {
    const people = row?.people?.length
      ? row.people
      : record
        ? recruitingRosterRowsFromRecord(record)
        : [];
    const names = people
      .map((entry) => formatOutreachPersonName(entry))
      .filter((name) => name && name !== "Unnamed")
      .join(" ");
    return String(names || formatOutreachPersonName(person) || "").toLowerCase();
  }
  if (key === "project") {
    const site = String(record?.site || "").toLowerCase();
    const dates = String(record?.projectDates || "").toLowerCase();
    return `${site} ${dates}`.trim();
  }
  if (key === "mackayla") return String(stripHandoffSummary(record?.mackaylaNotes) || "").toLowerCase();
  if (key === "leslee") return String(record?.lesleeNotes || "").toLowerCase();
  if (key === "lastContact") return outreachLastContactTimestamp(record);
  return "";
}

function sortOutreachRowsByColumn(rows, sortKey, sortDir) {
  if (!sortKey) return rows;
  const dir = sortDir === "desc" ? "desc" : "asc";
  const sorted = [...rows];
  sorted.sort((a, b) => {
    if (sortKey === "lastContact") {
      return compareNullableNumber(
        outreachColumnSortValue(a, "lastContact"),
        outreachColumnSortValue(b, "lastContact"),
        dir
      );
    }
    const ta = String(outreachColumnSortValue(a, sortKey) || "");
    const tb = String(outreachColumnSortValue(b, sortKey) || "");
    const cmp = ta.localeCompare(tb, undefined, { numeric: true, sensitivity: "base" });
    return dir === "desc" ? -cmp : cmp;
  });
  return sorted;
}

function buildOutreachPersonRows(records) {
  return (records || []).map((record) => {
    const people = recruitingRosterRowsFromRecord(record);
    const person = people[0] || {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: "",
    };
    return {
      id: record.id,
      recordId: record.id,
      personIndex: 0,
      person,
      people,
      record,
    };
  });
}

function normalizeImportHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function parseRecruitingImportRows(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!grid.length) return [];

  const headerRow = (grid[0] || []).map(normalizeImportHeader);
  const indexFor = (...labels) =>
    headerRow.findIndex((cell) => labels.some((label) => cell.includes(label)));

  const firstNameIndex = indexFor("firstname", "first");
  const lastNameIndex = indexFor("lastname", "last");
  const emailIndex = indexFor("email");
  const genderIndex = indexFor("gender", "sex");
  const yearIndex = indexFor("year", "recruitingyear");
  const mackaylaIndex = indexFor("mackayla");
  const lesleeIndex = indexFor("leslee");

  return grid.slice(1).map((row) => ({
    firstName: firstNameIndex >= 0 ? String(row[firstNameIndex] || "").trim() : "",
    lastName: lastNameIndex >= 0 ? String(row[lastNameIndex] || "").trim() : "",
    email: emailIndex >= 0 ? String(row[emailIndex] || "").trim() : "",
    gender: genderIndex >= 0 ? String(row[genderIndex] || "").trim() : "",
    recruitingYear: yearIndex >= 0 ? String(row[yearIndex] || "").trim() : "",
    mackaylaNotes: mackaylaIndex >= 0 ? String(row[mackaylaIndex] || "").trim() : "",
    lesleeNotes: lesleeIndex >= 0 ? String(row[lesleeIndex] || "").trim() : "",
  }));
}

function sortRecruitingBoardLabels(labels) {
  return [...labels].sort(
    (a, b) => RECRUITING_BOARD_SORT.indexOf(a) - RECRUITING_BOARD_SORT.indexOf(b)
  );
}

function renderDuplicateNotice(duplicateInfo, options = {}) {
  if (!duplicateInfo) return null;

  return (
    <div className="recruitingDuplicateNotice">
      <span className="badge">Same email elsewhere</span>
      {!options.compact ? (
        <div className="small recruitingDuplicateText">{duplicateInfo.summary}</div>
      ) : null}
    </div>
  );
}

function RecruitingFormCard({ title, subtitle, children, tone = "team" }) {
  const toneClass =
    tone === "site"
      ? "recruitingFormCardToneSite"
      : tone === "funding"
        ? "recruitingFormCardToneFunding"
        : tone === "past"
          ? "recruitingFormCardTonePast"
          : "recruitingFormCardToneTeam";

  return (
    <section className={`recruitingFormCard ${toneClass}`}>
      <header className="recruitingFormCardHeader">
        <div className="recruitingFormCardTitle">{title}</div>
        {subtitle ? <div className="recruitingFormCardSubtitle small">{subtitle}</div> : null}
      </header>
      <div className="recruitingFormCardBody">{children}</div>
    </section>
  );
}

function RecruitingWorkerLookupSearch({ person, workers, workersLoadError, onLink }) {
  const [searchQuery, setSearchQuery] = useState("");

  const suggestions = useMemo(
    () => searchRegisteredWorkers(workers, searchQuery),
    [workers, searchQuery]
  );

  const linkedWorker = useMemo(
    () => resolveRegisteredWorker(workers, person),
    [workers, person]
  );

  const trimmedQuery = searchQuery.trim();

  return (
    <>
      <div className="recruitingWorkerMemberSearch">
        <div className="small" style={{ marginBottom: 4, color: "var(--muted)" }}>
          Find registered worker
          {workers.length > 0 ? ` (${workers.length} in directory)` : ""}
        </div>
        <input
          className="input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name or email"
        />
        {workersLoadError ? (
          <div className="small" style={{ marginTop: 6, color: "var(--danger)" }}>
            {workersLoadError}
          </div>
        ) : null}
        {trimmedQuery ? (
          suggestions.length > 0 ? (
            <div className="recruitingWorkerSuggestListInline" role="listbox">
              {suggestions.map((worker) => (
                <button
                  key={worker.id || worker.email || worker.name}
                  type="button"
                  className="recruitingWorkerSuggestItem"
                  onClick={() => {
                    onLink(worker);
                    setSearchQuery("");
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{worker.name}</div>
                  {worker.email ? <div className="small">{worker.email}</div> : null}
                  {!worker.hasAccount && worker.email ? (
                    <div className="small" style={{ color: "var(--muted)" }}>
                      On a trip roster (no account yet)
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="small" style={{ marginTop: 6, color: "var(--muted)" }}>
              {workers.length === 0
                ? "No workers loaded yet. Refresh the page and try again."
                : `No matches for "${trimmedQuery}".`}
            </div>
          )
        ) : null}
      </div>
      {linkedWorker ? (
        <div className="recruitingWorkerLinkedBadge small">
          Linked to registered worker: {linkedWorker.name}
          {linkedWorker.email ? ` (${linkedWorker.email})` : ""}
        </div>
      ) : null}
    </>
  );
}

function RecruitingTeamMemberFields({
  member,
  index,
  workers,
  workersLoadError,
  showMemberTripDates,
  onMemberChange,
  onMemberLink,
  onMemberTryLink,
  onRemoveMember,
}) {
  function handleMemberFieldChange(field, value) {
    onMemberChange(index, field, value);
    if (field !== "profileId" && member?.profileId) {
      onMemberChange(index, "profileId", "");
    }
  }

  return (
    <>
      <RecruitingWorkerLookupSearch
        person={member}
        workers={workers}
        workersLoadError={workersLoadError}
        onLink={(worker) => onMemberLink(index, worker)}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
        }}
      >
        <input
          className="input"
          value={member.firstName}
          onChange={(event) => handleMemberFieldChange("firstName", event.target.value)}
          onBlur={() => onMemberTryLink(index)}
          placeholder="First name"
          autoComplete="given-name"
        />
        <input
          className="input"
          value={member.lastName}
          onChange={(event) => handleMemberFieldChange("lastName", event.target.value)}
          onBlur={() => onMemberTryLink(index)}
          placeholder="Last name"
          autoComplete="family-name"
        />
        <input
          className="input"
          type="email"
          value={member.email}
          onChange={(event) => handleMemberFieldChange("email", event.target.value)}
          onBlur={() => onMemberTryLink(index)}
          placeholder="Email (optional)"
          autoComplete="email"
        />
        <input
          className="input"
          type="tel"
          value={member.phone ?? ""}
          onChange={(event) => handleMemberFieldChange("phone", event.target.value)}
          placeholder="Phone (optional)"
          autoComplete="tel"
        />
      </div>
      {showMemberTripDates ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Leave Date</div>
            <input
              className="input"
              type="date"
              value={member.startDate}
              onChange={(event) => onMemberChange(index, "startDate", event.target.value)}
            />
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Return Date</div>
            <input
              className="input"
              type="date"
              value={member.endDate}
              onChange={(event) => onMemberChange(index, "endDate", event.target.value)}
            />
          </div>
        </div>
      ) : null}
      <div className="row">
        <div className="spacer" />
        <button className="btn" type="button" onClick={() => onRemoveMember(index)}>
          Remove
        </button>
      </div>
    </>
  );
}

/** Same cards / labels as the Lock Team modal — used by Lock Team and Potential Teams edit. */
function LockTeamFormCards({
  draft,
  onFieldChange,
  onMemberChange,
  onMemberLink,
  onMemberTryLink,
  registeredWorkers,
  workersLoadError,
  onAddMember,
  onRemoveMember,
  showMemberTripDates,
  onToggleMemberTripDates,
  memberKeyPrefix,
  sitePickerLabels,
  mergeSiteOptionListWithCurrent,
}) {
  return (
    <div className="recruitingFormStack">
      <RecruitingFormCard
        tone="site"
        title="Site & logistics"
        subtitle="Project dates, location, and trip logistics."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Project Leave Date</div>
            <input
              className="input"
              type="date"
              value={draft.startDate}
              onChange={(event) => onFieldChange("startDate", event.target.value)}
            />
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Project Return Date</div>
            <input
              className="input"
              type="date"
              value={draft.endDate}
              onChange={(event) => onFieldChange("endDate", event.target.value)}
            />
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Site</div>
            <select
              className="input"
              value={draft.location}
              onChange={(event) => onFieldChange("location", event.target.value)}
            >
              <option value="">Select site</option>
              {mergeSiteOptionListWithCurrent(sitePickerLabels, draft.location).map((siteOption) => (
                <option key={siteOption} value={siteOption}>{siteOption}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Host Name</div>
            <input
              className="input"
              value={draft.host}
              onChange={(event) => onFieldChange("host", event.target.value)}
              placeholder="Host name"
            />
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Site Type</div>
            <select
              className="input"
              value={draft.siteType}
              onChange={(event) => onFieldChange("siteType", event.target.value)}
            >
              <option value="">Select site type</option>
              <option value="partner">Partner</option>
              <option value="managed">Managed</option>
              <option value="seasonal">Seasonal</option>
            </select>
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Training Timeline</div>
            <select
              className="input"
              value={draft.trainingTimelineType}
              onChange={(event) => onFieldChange("trainingTimelineType", event.target.value)}
            >
              {TRAINING_TIMELINE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Length of Projects</div>
            <input
              className="input"
              value={draft.projectLengthSummary}
              onChange={(event) => onFieldChange("projectLengthSummary", event.target.value)}
              placeholder="6 weeks, with a 3-week subgroup"
            />
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Type of Project</div>
            <select
              className="input"
              value={draft.projectType}
              onChange={(event) => onFieldChange("projectType", event.target.value)}
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
              value={draft.extraTravelStatus}
              onChange={(event) => onFieldChange("extraTravelStatus", event.target.value)}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
              <option value="maybe">Maybe</option>
            </select>
          </div>
        </div>
      </RecruitingFormCard>

      <RecruitingFormCard
        tone="team"
        title="Team name & members"
        subtitle="Search for registered workers by name or email to link them instead of creating a duplicate profile. Email and phone are optional. Use Different Trip Dates when someone’s leave/return differs from the project."
      >
        <div>
          <div className="small" style={{ marginBottom: 6 }}>Team Name</div>
          <input
            className="input"
            value={draft.name}
            onChange={(event) => onFieldChange("name", event.target.value)}
            placeholder="2026 Brazil Team"
          />
        </div>
        <div className="row recruitingFormMembersToolbar" style={{ flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <div className="recruitingFormMembersHeading">Team Members</div>
          <div className="spacer" />
          <button className="btn" type="button" onClick={onToggleMemberTripDates}>
            {showMemberTripDates ? "Hide different trip dates" : "Different Trip Dates?"}
          </button>
        </div>
        {showMemberTripDates ? (
          <div className="small" style={{ color: "var(--muted)", lineHeight: 1.45 }}>
            Leave member dates blank to use the main project dates.
          </div>
        ) : null}
        <div className="recruitingFormMemberList">
          {draft.teamMembers.map((member, index) => (
            <div key={`${memberKeyPrefix}-${index}`} className="recruitingFormMemberCard">
              <div style={{ display: "grid", gap: 10 }}>
                <RecruitingTeamMemberFields
                  member={member}
                  index={index}
                  workers={registeredWorkers}
                  workersLoadError={workersLoadError}
                  showMemberTripDates={showMemberTripDates}
                  onMemberChange={onMemberChange}
                  onMemberLink={onMemberLink}
                  onMemberTryLink={onMemberTryLink}
                  onRemoveMember={onRemoveMember}
                />
              </div>
            </div>
          ))}
        </div>
        <button className="btn" type="button" onClick={onAddMember}>
          Add Team Member
        </button>
      </RecruitingFormCard>

      <RecruitingFormCard
        tone="funding"
        title="Funding & Fees"
        subtitle="Defaults match typical trip fee settings; adjust as needed."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Fundraising Goal</div>
            <input
              className="input recruitingFundingInput"
              type="number"
              min="0"
              step="1"
              value={draft.fundraisingGoalAmount}
              onChange={(event) => onFieldChange("fundraisingGoalAmount", event.target.value)}
              placeholder="Leave blank if not needed"
            />
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Fee</div>
            <input
              className="input recruitingFundingInput"
              type="number"
              min="0"
              step="1"
              value={draft.tripFeeAmount}
              onChange={(event) => onFieldChange("tripFeeAmount", event.target.value)}
              placeholder="600"
            />
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Materials Fee</div>
            <input
              className="input recruitingFundingInput"
              type="number"
              min="0"
              step="1"
              value={draft.materialsFeeAmount}
              onChange={(event) => onFieldChange("materialsFeeAmount", event.target.value)}
              placeholder="250"
            />
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Deferred Worker</div>
            <select
              className="input"
              value={draft.hasDeferredWorker}
              onChange={(event) => onFieldChange("hasDeferredWorker", event.target.value)}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Hannover Housing Fee</div>
            <input
              className="input recruitingFundingInput"
              type="number"
              min="0"
              step="1"
              value={draft.hannoverHousingFeeAmount}
              onChange={(event) => onFieldChange("hannoverHousingFeeAmount", event.target.value)}
              placeholder="600"
            />
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Domestic Project</div>
            <input
              className="input recruitingFundingInput"
              type="number"
              min="0"
              step="1"
              value={draft.domesticProjectFeeAmount}
              onChange={(event) => onFieldChange("domesticProjectFeeAmount", event.target.value)}
              placeholder="575"
            />
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Domestic Fee</div>
            <input
              className="input recruitingFundingInput"
              type="number"
              min="0"
              step="1"
              value={draft.domesticFeeAmount}
              onChange={(event) => onFieldChange("domesticFeeAmount", event.target.value)}
              placeholder="300"
            />
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Domestic Materials Fee</div>
            <input
              className="input recruitingFundingInput"
              type="number"
              min="0"
              step="1"
              value={draft.domesticMaterialsFeeAmount}
              onChange={(event) => onFieldChange("domesticMaterialsFeeAmount", event.target.value)}
              placeholder="225"
            />
          </div>
        </div>
      </RecruitingFormCard>

      <RecruitingFormCard
        tone="past"
        title="Past recruiting details"
        subtitle="Loose dates and notes from the recruiting row; edit here if something should carry into the trip record."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Project Dates</div>
            <input
              className="input"
              value={draft.recruitingProjectDates}
              onChange={(event) => onFieldChange("recruitingProjectDates", event.target.value)}
              placeholder="Dates or season"
            />
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Weeks</div>
            <input
              className="input"
              value={draft.recruitingWeeks}
              onChange={(event) => onFieldChange("recruitingWeeks", event.target.value)}
              placeholder="Number of weeks"
            />
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Departure Date</div>
            <input
              className="input"
              value={draft.recruitingDepartureDate}
              onChange={(event) => onFieldChange("recruitingDepartureDate", event.target.value)}
              placeholder="Month, season, or exact date"
            />
          </div>
        </div>
        {!draft.startDate && draft.recruitingDepartureDate ? (
          <div className="small">
            Recruiting departure note saved: {draft.recruitingDepartureDate}
          </div>
        ) : null}
        <div>
          <div className="small" style={{ marginBottom: 6 }}>Mackayla Notes</div>
          <textarea
            className="input"
            rows={3}
            value={draft.mackaylaNotes}
            onChange={(event) => onFieldChange("mackaylaNotes", event.target.value)}
          />
        </div>
        <div>
          <div className="small" style={{ marginBottom: 6 }}>Leslee Notes</div>
          <textarea
            className="input"
            rows={3}
            value={draft.lesleeNotes}
            onChange={(event) => onFieldChange("lesleeNotes", event.target.value)}
          />
        </div>
      </RecruitingFormCard>
    </div>
  );
}

function parseDelimitedLines(value) {
  return String(value || "")
    .split(/\r?\n|,|;/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseTeamMemberEntries(value) {
  return parseDelimitedLines(value).map((entry) => {
    const trimmedEntry = String(entry || "").trim();
    if (!trimmedEntry) return null;

    const pipeParts = trimmedEntry.split(/\s+\|\s+/);
    const phoneExtra = pipeParts.length > 1 ? String(pipeParts[1] ?? "").trim() : "";
    const genderExtra = pipeParts.length > 2 ? String(pipeParts[2] ?? "").trim() : "";
    const core = pipeParts[0] || trimmedEntry;

    const minorMatch = core.match(/^\[minor(?::\s*(\d+))?\]\s*/i);
    const isMinor = Boolean(minorMatch);
    const minorAge = minorMatch?.[1] ? String(minorMatch[1]).trim() : "";
    const withoutMinorLabel = core.replace(/^\[minor(?::\s*\d+)?\]\s*/i, "").trim();

    const angleMatch = withoutMinorLabel.match(/^(.*?)\s*<([^>]+)>$/);
    if (angleMatch) {
      return {
        raw: trimmedEntry,
        name: String(angleMatch[1] || "").trim(),
        email: normalizeEmailValue(angleMatch[2]),
        phone: phoneExtra,
        gender: genderExtra,
        isMinor,
        minorAge,
      };
    }

    const emailMatch = withoutMinorLabel.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (emailMatch) {
      const email = normalizeEmailValue(emailMatch[0]);
      const name = withoutMinorLabel.replace(emailMatch[0], "").replace(/[<>()-]/g, " ").trim();
      return {
        raw: trimmedEntry,
        name,
        email,
        phone: phoneExtra,
        gender: genderExtra,
        isMinor,
        minorAge,
      };
    }

    return {
      raw: trimmedEntry,
      name: withoutMinorLabel,
      email: "",
      phone: phoneExtra,
      gender: genderExtra,
      isMinor,
      minorAge,
    };
  }).filter(Boolean);
}

function formatPersonDisplayName(person) {
  const name = String(person?.name || "").trim();
  const age = String(person?.minorAge || "").trim();
  if (person?.isMinor && name && age) return `${name} (${age})`;
  return name;
}

function formatTeamMemberEntry(person) {
  const name = formatPersonDisplayName(person);
  const email = normalizeEmailValue(person?.email);
  const minorPrefix = person?.isMinor
    ? `[Minor${person?.minorAge ? `:${String(person.minorAge).trim()}` : ""}] `
    : "";
  let base;
  if (name && email) base = `${minorPrefix}${name} <${email}>`;
  else base = `${minorPrefix}${name || email || ""}`.trim();
  const phone = String(person?.phone || "").trim();
  const gender = String(person?.gender || "").trim();
  if (!phone && !gender) return base;
  return `${base} | ${phone} | ${gender}`;
}

function buildTeamMembersText(people) {
  return (people || [])
    .map((person) => formatTeamMemberEntry(person))
    .filter(Boolean)
    .join("\n");
}

function emptyRosterPerson() {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    profileId: "",
    gender: "",
    isMinor: false,
    minorAge: "",
  };
}

function rosterPersonFromParsedEntry(p) {
  const sp = splitPersonName(p?.name || "");
  return {
    firstName: sp.firstName,
    lastName: sp.lastName,
    email: p?.email || "",
    phone: p?.phone || "",
    gender: p?.gender || "",
    isMinor: !!p?.isMinor,
    minorAge: p?.minorAge || "",
  };
}

function recruitingRosterRowsFromRecord(record) {
  if (!record) return [emptyRosterPerson()];
  const c = record.contact || {};
  const primary = {
    firstName: c.firstName || "",
    lastName: c.lastName || "",
    email: c.email || "",
    phone: c.phone || "",
    gender: c.gender || "",
    isMinor: false,
    minorAge: "",
  };
  const rest = parseTeamMemberEntries(record.teamMembers || "").map(rosterPersonFromParsedEntry);
  return [primary, ...rest];
}

function rosterPersonToMemberPayload(person) {
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return {
    name: name || person.email || "",
    email: person.email,
    phone: person.phone,
    gender: person.gender,
    isMinor: person.isMinor,
    minorAge: person.minorAge,
  };
}

function buildTeamMembersFromRosterRows(rows, primaryIndex) {
  const others = rows.filter((_, i) => i !== primaryIndex);
  return buildTeamMembersText(others.map(rosterPersonToMemberPayload));
}

function syncRosterIntoRecord(record, rows, primaryIndex) {
  const safeRows = rows.length ? rows : [emptyRosterPerson()];
  const pi = Math.min(Math.max(0, primaryIndex), safeRows.length - 1);
  const primary = safeRows[pi] || emptyRosterPerson();
  const teamMembers = buildTeamMembersFromRosterRows(safeRows, pi);
  return {
    ...record,
    contact: {
      ...(record.contact || {}),
      firstName: primary.firstName,
      lastName: primary.lastName,
      email: primary.email,
      phone: primary.phone,
      gender: primary.gender,
    },
    teamMembers,
  };
}

/** Move row at primaryIndex to front so they become the recruiting contact (primary). */
function makePrimaryRosterRow(rows, primaryIndex) {
  if (!rows.length) return [emptyRosterPerson()];
  const pi = Math.min(Math.max(0, primaryIndex), rows.length - 1);
  if (pi === 0) return rows;
  const chosen = rows[pi];
  const others = [...rows.slice(0, pi), ...rows.slice(pi + 1)];
  return [chosen, ...others];
}

function getRecordPeopleList(record) {
  const teamMembers = parseTeamMemberEntries(record?.teamMembers)
    .map((person) => formatPersonDisplayName(person) || person.email || person.raw)
    .filter(Boolean);
  if (teamMembers.length > 0) return teamMembers;
  const primaryContact = formatContactName(record);
  return primaryContact && primaryContact !== "Unnamed contact" ? [primaryContact] : [];
}

function getRecordPeopleCount(record) {
  return Math.max(getRecordPeopleList(record).length, 1);
}

function getRecordPeopleSummary(record, maxItems = 2) {
  const people = getRecordPeopleList(record);
  if (people.length <= maxItems) {
    return people.join(", ") || "Primary contact only";
  }
  return `${people.slice(0, maxItems).join(", ")} +${people.length - maxItems} more`;
}

function getAdditionalRecordPeople(record) {
  const primaryContact = formatContactName(record);
  return getRecordPeopleList(record).filter((person) => person && person !== primaryContact);
}

function chartDashText(value) {
  const s = String(value ?? "").trim();
  return s || "—";
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFlexibleDepartureDate(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return formatDate(rawValue);
  }
  return rawValue;
}

/** Site dropdown: canonical + housing-added sites, plus current value if not already listed — sorted A–Z. */
function mergeSiteOptionListWithCurrent(orderedLabels, currentValue) {
  const options = [...(orderedLabels || [])];
  const trimmedValue = String(currentValue || "").trim();
  if (trimmedValue && !options.some((o) => String(o).toLowerCase() === trimmedValue.toLowerCase())) {
    options.push(trimmedValue);
  }
  options.sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: "base" }));
  return options;
}

/** Lock Teams → revert: danger-styled control (module scope so row render helpers can use it). */
const RECRUITING_UNLOCK_TEAM_BUTTON_STYLE = {
  borderColor: "rgba(239,68,68,.4)",
  color: "var(--danger)",
  background: "rgba(239,68,68,.1)",
};

function createEmptyTripTeamMember() {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    profileId: "",
    gender: "",
    isMinor: false,
    minorAge: "",
    startDate: "",
    endDate: "",
  };
}

function linkTeamMemberToWorker(member, worker) {
  if (!worker) return member;
  return {
    ...member,
    profileId: worker.id || "",
    firstName: String(member.firstName || "").trim() || worker.firstName || "",
    lastName: String(member.lastName || "").trim() || worker.lastName || "",
    email: normalizeEmailValue(member.email) || worker.email || "",
    phone: String(member.phone || "").trim() || worker.phone || "",
  };
}

function tryLinkTeamMemberRow(member, workers) {
  const match = resolveRegisteredWorker(workers, member);
  if (!match) return member;
  return linkTeamMemberToWorker(member, match);
}

function splitPersonName(value) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function buildTeamMemberDrafts(record) {
  const nextMembers = [];
  const seen = new Set();

  function pushMember(person) {
    const firstName = String(person?.firstName || "").trim();
    const lastName = String(person?.lastName || "").trim();
    const email = normalizeEmailValue(person?.email);
    const phone = String(person?.phone || "").trim();
    const key = email || `${firstName} ${lastName}`.trim().toLowerCase();
    if (!key || seen.has(key)) return;

    seen.add(key);
    nextMembers.push({
      firstName,
      lastName,
      email,
      phone,
      gender: String(person?.gender || "").trim(),
      isMinor: !!person?.isMinor,
      minorAge: String(person?.minorAge || "").trim(),
      startDate: "",
      endDate: "",
    });
  }

  pushMember({
    ...record?.contact,
    phone: record?.contact?.phone || "",
  });

  parseTeamMemberEntries(record?.teamMembers).forEach((person) => {
    const nameParts = splitPersonName(person.name || person.raw);
    pushMember({
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      email: person.email,
      phone: person.phone || "",
      gender: person.gender || "",
      isMinor: person.isMinor,
      minorAge: person.minorAge,
    });
  });

  return nextMembers.length > 0 ? nextMembers : [createEmptyTripTeamMember()];
}

function buildPendingLockTeamSetupFromDraft(draft, showMemberTripDates) {
  return {
    host: draft.host,
    siteType: draft.siteType,
    trainingTimelineType: draft.trainingTimelineType,
    projectType: draft.projectType,
    projectLengthSummary: draft.projectLengthSummary,
    extraTravelStatus: draft.extraTravelStatus,
    startDate: draft.startDate,
    endDate: draft.endDate,
    fundraisingGoalAmount: draft.fundraisingGoalAmount,
    tripFeeAmount: draft.tripFeeAmount,
    materialsFeeAmount: draft.materialsFeeAmount,
    hasDeferredWorker: draft.hasDeferredWorker,
    hannoverHousingFeeAmount: draft.hannoverHousingFeeAmount,
    domesticProjectFeeAmount: draft.domesticProjectFeeAmount,
    domesticFeeAmount: draft.domesticFeeAmount,
    domesticMaterialsFeeAmount: draft.domesticMaterialsFeeAmount,
    teamMembers: draft.teamMembers,
    showMemberTripDates,
  };
}

function buildTeamFormDraft(record) {
  const pending = record?.pendingLockTeamSetup && typeof record.pendingLockTeamSetup === "object"
    ? record.pendingLockTeamSetup
    : {};
  const weeksLabel = record?.weeks
    ? `${record.weeks} week${String(record.weeks) === "1" ? "" : "s"}`
    : "";
  const projectLengthFromRecord = [weeksLabel, record?.projectDates || ""]
    .filter(Boolean)
    .join(" - ");
  const recruitingDepartureDate = String(record?.departureDate || "").trim();
  const savedProjectLength = String(pending.projectLengthSummary ?? "").trim();
  const recruitingWeeks =
    record?.weeks === null || record?.weeks === undefined || record?.weeks === ""
      ? ""
      : String(record.weeks);
  const recruitingProjectDates = record?.projectDates || "";
  const startDate =
    pending.startDate !== undefined && pending.startDate !== ""
      ? pending.startDate
      : /^\d{4}-\d{2}-\d{2}$/.test(recruitingDepartureDate)
        ? recruitingDepartureDate
        : "";
  const endDate = pending.endDate ?? "";

  const builtMembers = buildTeamMemberDrafts(record);
  const teamMembers =
    Array.isArray(pending.teamMembers) && pending.teamMembers.length > 0
      ? pending.teamMembers.map((member) => ({ ...createEmptyTripTeamMember(), ...member }))
      : builtMembers;

  return {
    name: record?.teamName || formatContactName(record),
    location: record?.site || pending.location || "",
    host: pending.host ?? "",
    siteType: pending.siteType ?? "",
    trainingTimelineType: pending.trainingTimelineType || DEFAULT_TRAINING_TIMELINE_TYPE,
    projectType: pending.projectType ?? "",
    projectLengthSummary: resolveProjectLengthForLock({
      projectLengthSummary: savedProjectLength || projectLengthFromRecord,
      weeks: recruitingWeeks,
      projectDates: recruitingProjectDates,
      startDate,
      endDate,
    }),
    extraTravelStatus: pending.extraTravelStatus || "no",
    startDate,
    endDate,
    fundraisingGoalAmount: pending.fundraisingGoalAmount ?? "",
    tripFeeAmount: pending.tripFeeAmount ?? "",
    materialsFeeAmount: pending.materialsFeeAmount ?? "",
    hasDeferredWorker: pending.hasDeferredWorker || "no",
    hannoverHousingFeeAmount: pending.hannoverHousingFeeAmount ?? "",
    domesticProjectFeeAmount: pending.domesticProjectFeeAmount ?? "",
    domesticFeeAmount: pending.domesticFeeAmount ?? "",
    domesticMaterialsFeeAmount: pending.domesticMaterialsFeeAmount ?? "",
    teamMembers,
    recruitingProjectDates,
    recruitingWeeks,
    recruitingDepartureDate,
    mackaylaNotes: record?.mackaylaNotes || "",
    lesleeNotes: record?.lesleeNotes || "",
  };
}

function getPendingLockSetupRecord(record) {
  const p = record?.pendingLockTeamSetup && typeof record.pendingLockTeamSetup === "object"
    ? record.pendingLockTeamSetup
    : {};
  return p;
}

/** Slim board "Project dates" column: row `project_dates`, else Site & logistics leave/return. */
function recruitingBoardProjectDatesLabel(record) {
  const pd = String(record?.projectDates || "").trim();
  if (pd) return pd;
  const pending = getPendingLockSetupRecord(record);
  const a = String(pending.startDate || "").trim();
  const b = String(pending.endDate || "").trim();
  if (a && b) {
    return `${formatDate(a)} → ${formatDate(b)}`;
  }
  if (a) return formatDate(a);
  if (b) return formatDate(b);
  return "";
}

/** Slim board "Weeks" column: numeric `weeks`, else length-of-projects from lock setup draft. */
function recruitingBoardWeeksLabel(record) {
  if (record?.weeks !== null && record?.weeks !== undefined && String(record.weeks).trim() !== "") {
    return String(record.weeks);
  }
  const pending = getPendingLockSetupRecord(record);
  const computedWeeks = computeWeeksBetweenDepartAndEnd(pending.startDate, pending.endDate);
  if (computedWeeks != null) return String(computedWeeks);
  const summary = String(pending.projectLengthSummary || "").trim();
  if (summary) return summary;
  return "";
}

/** Potential Teams board: fundraising goal from lock-team draft (`pendingLockTeamSetup`). */
function recruitingBoardFundraisingGoalLabel(record) {
  const raw = String(buildTeamFormDraft(record).fundraisingGoalAmount || "").trim();
  if (!raw) return "";
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  if (Number.isFinite(n) && cleaned !== "") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  }
  return raw;
}

function sanitizeExcelClipboardField(value) {
  return String(value ?? "")
    .replace(/\t/g, "    ")
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, " ")
    .trim();
}

function recruitingBoardClipboardTeamName(record) {
  if (record?.isConvertedToTeam) {
    return String(record.teamName || record?.linkedTrip?.name || formatContactName(record) || "").trim();
  }
  return String(record?.teamName || formatContactName(record) || "").trim();
}

function formatRecruitingRosterForExcelClipboard(record) {
  const members = buildTeamFormDraft(record).teamMembers || [];
  const parts = [];
  for (const member of members) {
    const name = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
    const email = String(member.email || "").trim();
    const phone = String(member.phone || "").trim();
    if (!name && !email && !phone) continue;
    let part = "";
    if (name && email) part = `${name} <${email}>`;
    else if (name) part = name;
    else if (email) part = email;
    else part = phone;
    if (phone && part !== phone && !part.includes(phone)) {
      part = `${part} (${phone})`;
    }
    parts.push(part.replace(/\t/g, " ").replace(/\r?\n/g, " "));
  }
  return parts.join("; ");
}

function buildRecruitingBoardExcelClipboardText(record) {
  const teamName = sanitizeExcelClipboardField(recruitingBoardClipboardTeamName(record));
  const roster = sanitizeExcelClipboardField(formatRecruitingRosterForExcelClipboard(record));
  const d = buildTeamFormDraft(record);
  const site = sanitizeExcelClipboardField(d.location || record?.site || "");
  const projectDates = sanitizeExcelClipboardField(recruitingBoardProjectDatesLabel(record));
  const header = "Team Name\tRoster\tSite\tProject dates";
  const row = [teamName, roster, site, projectDates].join("\t");
  return `${header}\n${row}`;
}

function copyRecruitingBoardRowToClipboard(record) {
  const text = buildRecruitingBoardExcelClipboardText(record);
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      resolve(undefined);
    } catch (err) {
      reject(err);
    }
  });
}

function RecruitingBoardCopyRowButton({ record }) {
  const [feedback, setFeedback] = useState("");
  const handleClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    void copyRecruitingBoardRowToClipboard(record)
      .then(() => {
        setFeedback("Copied");
        window.setTimeout(() => setFeedback(""), 1800);
      })
      .catch(() => {
        setFeedback("Failed");
        window.setTimeout(() => setFeedback(""), 2200);
      });
  };
  return (
    <button
      type="button"
      className="recruitingCopyRowBtn"
      aria-label="Copy tab-separated row for Excel: team name, roster, site, project dates"
      title="Copy for Excel: team name, roster (names and emails), site, project dates"
      onClick={handleClick}
    >
      <AppIcon name="copy" className="recruitingCopyRowBtnIcon" />
      {feedback ? <span className="recruitingCopyRowBtnFeedback">{feedback}</span> : null}
    </button>
  );
}

const ROSTER_BOARD_PREVIEW_COUNT = 4;

/** Roster column for board tables: name + email + phone under email when present; “See more” when more than four people. */
function RecruitingRosterBoardColumn({ record, showGender = true }) {
  const [expanded, setExpanded] = useState(false);
  const draft = buildTeamFormDraft(record);
  const members = draft.teamMembers?.length ? draft.teamMembers : [];
  const needsToggle = members.length > ROSTER_BOARD_PREVIEW_COUNT;
  const visibleMembers =
    needsToggle && !expanded ? members.slice(0, ROSTER_BOARD_PREVIEW_COUNT) : members;
  const hiddenCount = members.length - ROSTER_BOARD_PREVIEW_COUNT;

  return (
    <div className="recruitingRosterChartStack">
      {visibleMembers.map((member, index) => {
        const name = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
        const phone = String(member.phone || "").trim();
        const gender = String(member.gender || "").trim();
        const key = `${record.id}-board-roster-${index}-${member.email || phone || "nocontact"}`;
        return (
          <div key={key} className="recruitingRosterChartBlock">
            <div className="recruitingRosterChartName">
              {index === 0 ? (
                <span className="recruitingRosterPrimaryMark" title="Primary recruiting contact">
                  ★{" "}
                </span>
              ) : null}
              {name || chartDashText(member.email)}
            </div>
            {member.email ? <div className="recruitingRosterChartEmail">{member.email}</div> : null}
            {phone ? (
              <div className={`recruitingRosterChartPhone${member.email ? "" : " isRosterPhoneOnly"}`}>{phone}</div>
            ) : null}
            {showGender && gender ? <div className="recruitingRosterChartGender">{gender}</div> : null}
          </div>
        );
      })}
      {needsToggle ? (
        <div className="recruitingRosterSeeMoreWrap">
          <button
            type="button"
            className="recruitingRosterSeeMoreBtn"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "See less" : `See more (${hiddenCount} more)`}
          </button>
        </div>
      ) : null}
    </div>
  );
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

function formatCompactDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
  });
}

function formatOutreachStaffLabel(staffMember) {
  const raw = String(staffMember || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.includes("mackayla")) return "Mackayla";
  if (lower.includes("leslee")) return "Leslee";
  // Prefer first name / local-part when a full name or email was stored.
  if (raw.includes("@")) {
    const local = raw.split("@")[0] || "";
    const token = local.split(/[._-]/)[0] || local;
    if (!token) return raw;
    return token.charAt(0).toUpperCase() + token.slice(1);
  }
  const first = raw.split(/\s+/)[0];
  return first || raw;
}

function formatOutreachActivityLine(entry) {
  const method = formatOutreachContactMethod(entry?.actionType);
  const who = formatOutreachStaffLabel(entry?.staffMember);
  const dateLabel = entry?.actionDate ? formatCompactDateTime(entry.actionDate) : "";
  const notes = String(entry?.summary || "").trim();
  return [method, who, dateLabel, notes].filter(Boolean).join(" · ");
}

function formatRecruitingUpdateMeta(record) {
  if (record?.updatedAt) {
    const dateLabel = formatCompactDateTime(record.updatedAt);
    return dateLabel ? `Updated ${dateLabel}` : "Updated recently";
  }

  return "";
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

const DEFAULT_FILTER_CONFIG = {
  searchQuery: "",
  stage: "",
  assignedTo: "",
  activeView: "all",
  workflowStatus: "all",
};

const TABLE_FONT_SIZES = ["small", "medium", "large"];

const RECRUITING_TABS = [
  { id: "outreach", label: "Recruiting list" },
  { id: "potential", label: "Potential Teams" },
  { id: "converted", label: "Locked Teams" },
];

const RECRUITING_TAB_META = {
  outreach: {
    description: "One row per person — who to reach out to next.",
    toneClass: "recruitingBoardTab recruitingBoardTabOutreach",
  },
  potential: {
    description: "Qualified teams moving toward formation.",
    toneClass: "recruitingBoardTab recruitingBoardTabPotential",
  },
  converted: {
    description: "Teams already formed and linked to trips.",
    toneClass: "recruitingBoardTab recruitingBoardTabConverted",
  },
};

const PRIMARY_OWNER = "Mackayla";
const BOSS_OWNER = "Leslee";
const OWNER_OPTIONS = [PRIMARY_OWNER, BOSS_OWNER];
const HANDOFF_SUMMARY_START = "[HANDOFF SUMMARY]";
const HANDOFF_SUMMARY_END = "[/HANDOFF SUMMARY]";

function normalizeOwnerName(value) {
  return String(value || "").trim().toLowerCase();
}

function extractHandoffSummary(notes) {
  const match = String(notes || "").match(
    /\[HANDOFF SUMMARY\]\s*([\s\S]*?)\s*\[\/HANDOFF SUMMARY\]/i
  );
  return match ? match[1].trim() : "";
}

function stripHandoffSummary(notes) {
  return String(notes || "")
    .replace(/\[HANDOFF SUMMARY\]\s*[\s\S]*?\s*\[\/HANDOFF SUMMARY\]/i, "")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
}

function buildMackaylaNotes(baseNotes, handoffSummary) {
  const cleanNotes = String(baseNotes || "");
  const cleanSummary = String(handoffSummary || "").trim();
  return [cleanSummary ? `${HANDOFF_SUMMARY_START}\n${cleanSummary}\n${HANDOFF_SUMMARY_END}` : "", cleanNotes.trim() ? cleanNotes : ""]
    .filter(Boolean)
    .join("\n\n");
}

function createEmptyNewContactDraft() {
  return {
    teamName: "",
    rosterRows: [emptyRosterPerson()],
    assignedTo: PRIMARY_OWNER,
    stage: 0,
    site: "",
    projectDates: "",
    weeks: "",
    departureDate: "",
    mackaylaNotesBody: "",
    lesleeNotes: "",
  };
}

function isAssignedTo(record, owner) {
  return normalizeOwnerName(record?.assignedTo) === normalizeOwnerName(owner);
}

function isReadyForBoss(record) {
  return Boolean(
    record?.isPotentialTeam &&
    isAssignedTo(record, BOSS_OWNER) &&
    extractHandoffSummary(record?.mackaylaNotes) &&
    !String(record?.lesleeNotes || "").trim()
  );
}

function isOverdueRecord(record) {
  if (!record?.nextFollowUp) return false;
  const nextFollowUp = new Date(`${record.nextFollowUp}T00:00:00`);
  if (Number.isNaN(nextFollowUp.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return nextFollowUp < today;
}

function getAttentionMeta(record) {
  if (isOverdueRecord(record)) {
    return { label: "Overdue", badgeClass: "badgeDanger", rowAccent: "rgba(239,68,68,.18)" };
  }
  return null;
}

function getRecordRowStyle(record, isActive = false) {
  const attention = getAttentionMeta(record);
  return {
    background: isActive ? "rgba(47,73,147,.06)" : undefined,
    boxShadow: attention ? `inset 4px 0 0 ${attention.rowAccent}` : undefined,
  };
}

function buildRecruitingRecordPayload(record, overrides = {}) {
  return {
    id: record.id,
    contactId: record.contactId,
    recruitingYear: record.recruitingYear,
    firstName: record.contact?.firstName,
    lastName: record.contact?.lastName,
    email: record.contact?.email,
    phone: record.contact?.phone,
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
    pendingLockTeamSetup: record.pendingLockTeamSetup ?? {},
    ...overrides,
  };
}

const RECRUITING_TABLE_DRAG_THRESHOLD_PX = 10;

function DraggableTable({ children }) {
  const containerRef = useRef(null);
  /** `idle` — no drag; `pending` — mousedown, waiting for horizontal move; `dragging` — scroll pan */
  const dragStateRef = useRef({
    mode: "idle",
    pointerId: null,
    startClientX: 0,
    scrollAtStart: 0,
  });
  const windowPointerEndCleanupRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  function clearWindowPointerEndListeners() {
    if (windowPointerEndCleanupRef.current) {
      windowPointerEndCleanupRef.current();
      windowPointerEndCleanupRef.current = null;
    }
  }

  function endDrag() {
    clearWindowPointerEndListeners();
    const pid = dragStateRef.current.pointerId;
    const el = containerRef.current;
    if (el && pid !== null && el.hasPointerCapture?.(pid)) {
      try {
        el.releasePointerCapture(pid);
      } catch {
        /* ignore */
      }
    }

    dragStateRef.current = {
      mode: "idle",
      pointerId: null,
      startClientX: 0,
      scrollAtStart: el?.scrollLeft || 0,
    };
    setIsDragging(false);
  }

  function attachWindowPointerEndWhilePending(pointerId) {
    clearWindowPointerEndListeners();
    const onEnd = (e) => {
      if (e.pointerId !== pointerId) return;
      endDrag();
    };
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    windowPointerEndCleanupRef.current = () => {
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
  }

  function handlePointerDown(event) {
    if (
      !containerRef.current ||
      event.button !== 0 ||
      (typeof window !== "undefined" && window.innerWidth <= 720) ||
      event.target.closest("button, a, input, textarea, select, label")
    ) {
      return;
    }

    dragStateRef.current = {
      mode: "pending",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      scrollAtStart: containerRef.current.scrollLeft,
    };
    attachWindowPointerEndWhilePending(event.pointerId);
  }

  function handlePointerMove(event) {
    const st = dragStateRef.current;
    const el = containerRef.current;
    if (!el || st.pointerId !== event.pointerId || st.mode === "idle") return;

    if (st.mode === "pending") {
      if (Math.abs(event.clientX - st.startClientX) < RECRUITING_TABLE_DRAG_THRESHOLD_PX) return;
      st.mode = "dragging";
      st.scrollAtStart = el.scrollLeft;
      st.startClientX = event.clientX;
      el.setPointerCapture?.(event.pointerId);
      setIsDragging(true);
      clearWindowPointerEndListeners();
    }

    if (st.mode === "dragging") {
      const deltaX = event.clientX - st.startClientX;
      el.scrollLeft = st.scrollAtStart - deltaX;
    }
  }

  return (
    <div
      ref={containerRef}
      className={`recruitingTableScroller ${isDragging ? "isDragging" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => {
        if (dragStateRef.current.mode !== "dragging") endDrag();
      }}
    >
      {children}
    </div>
  );
}

export default function RecruitingPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [registeredWorkers, setRegisteredWorkers] = useState([]);
  const [workersLoadError, setWorkersLoadError] = useState("");
  const [records, setRecords] = useState([]);
  const [tripTeamMembers, setTripTeamMembers] = useState([]);
  const [siteBudgetNotes, setSiteBudgetNotes] = useState([]);
  const [error, setError] = useState("");
  const [pageStatus, setPageStatus] = useState("");
  const [isFormingTeam, setIsFormingTeam] = useState(false);
  const [filterConfig, setFilterConfig] = useState(DEFAULT_FILTER_CONFIG);
  const [activeFilterId, setActiveFilterId] = useState("all");
  const [years, setYears] = useState(() => [...ENSURED_RECRUITING_YEARS]);
  const [selectedYear, setSelectedYear] = useState(DEFAULT_RECRUITING_YEAR);
  const [contactActivityByRecordId, setContactActivityByRecordId] = useState({});
  /** Default matches trip Staff Tasks body (13px); use floating +/- for medium/large. */
  const [tableFontSize, setTableFontSize] = useState("small");
  const [activeTab, setActiveTab] = useState("outreach");
  const [outreachBoardSort, setOutreachBoardSort] = useState({ key: null, dir: "asc" });
  const [potentialBoardSort, setPotentialBoardSort] = useState({ key: "team", dir: "asc" });
  const [convertedBoardSort, setConvertedBoardSort] = useState({ key: "team", dir: "asc" });
  const [loggingOutreachRecordId, setLoggingOutreachRecordId] = useState("");
  const [outreachContactModalOpen, setOutreachContactModalOpen] = useState(false);
  const [outreachContactDraft, setOutreachContactDraft] = useState({
    recordId: "",
    activityId: "",
    personLabel: "",
    method: "email",
    date: "",
    notes: "",
  });
  const [selectedBulkRecordIds, setSelectedBulkRecordIds] = useState([]);
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const bulkSelectAllRef = useRef(null);
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [addContactModalOpen, setAddContactModalOpen] = useState(false);
  const [newContactDraft, setNewContactDraft] = useState(() => createEmptyNewContactDraft());
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [confirmingDeleteRecordId, setConfirmingDeleteRecordId] = useState("");
  const [deletingRecordId, setDeletingRecordId] = useState("");
  const [unlockingLockedTeamRecordId, setUnlockingLockedTeamRecordId] = useState("");
  const [staffTaskModalOpen, setStaffTaskModalOpen] = useState(false);
  const [isSavingStaffTask, setIsSavingStaffTask] = useState(false);
  const [recordDetailsModalOpen, setRecordDetailsModalOpen] = useState(false);
  const [moveTargetYear, setMoveTargetYear] = useState(2028);
  const [formTeamModalOpen, setFormTeamModalOpen] = useState(false);
  const [teamFormDraft, setTeamFormDraft] = useState(() => buildTeamFormDraft(null));
  const [teamFormShowMemberTripDates, setTeamFormShowMemberTripDates] = useState(false);
  const [potentialTeamEditDraft, setPotentialTeamEditDraft] = useState(() => buildTeamFormDraft(null));
  const [potentialEditShowMemberTripDates, setPotentialEditShowMemberTripDates] = useState(false);
  const potentialEditSnapshotKey = useRef("");
  const importInputRef = useRef(null);
  const [staffTaskDraft, setStaffTaskDraft] = useState({
    recordId: "",
    taskName: "",
    dueDate: "",
    notes: "",
  });

  function normalizeTeamNameKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function findTeamNameConflict(teamName, { excludeRecordId = "" } = {}) {
    const key = normalizeTeamNameKey(teamName);
    if (!key) return null;
    return (
      records.find((record) => {
        if (excludeRecordId && String(record.id || "") === String(excludeRecordId || "")) {
          return false;
        }
        const candidates = [record.teamName, record.linkedTrip?.name];
        return candidates.some((candidate) => normalizeTeamNameKey(candidate) === key);
      }) || null
    );
  }

  function notifyDuplicateTeamName(teamName, options = {}) {
    const trimmedName = String(teamName || "").trim();
    if (!trimmedName) return false;
    const conflict = findTeamNameConflict(trimmedName, options);
    if (!conflict) return false;
    const conflictName =
      String(conflict.teamName || conflict.linkedTrip?.name || formatContactName(conflict) || "another team")
        .trim() || "another team";
    const message = `Team name "${trimmedName}" is already used by "${conflictName}". Please choose a unique team name.`;
    setError(message);
    setPageStatus("");
    showToast(message, "error");
    return true;
  }

  useEffect(() => {
    const useLockStyleEdit = activeTab === "potential" || activeTab === "outreach";
    if (!recordDetailsModalOpen || !useLockStyleEdit) {
      potentialEditSnapshotKey.current = "";
      return;
    }
    const rec = records.find((row) => row.id === selectedRecordId);
    if (!rec || rec.isConvertedToTeam) return;
    const snap = `${rec.id}:${rec.updatedAt || ""}`;
    if (potentialEditSnapshotKey.current === snap) return;
    potentialEditSnapshotKey.current = snap;
    setPotentialTeamEditDraft(buildTeamFormDraft(rec));
    setPotentialEditShowMemberTripDates(Boolean(rec.pendingLockTeamSetup?.showMemberTripDates));
  }, [recordDetailsModalOpen, activeTab, selectedRecordId, records]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const nextSession = await requireSession(router);
      if (cancelled || !nextSession) return;

      if (!isManagerRole(nextSession.permissionRole || nextSession.role)) {
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
    let cancelled = false;

    async function loadRegisteredWorkers() {
      try {
        const workers = await listRegisteredWorkersForPicker();
        if (cancelled) return;
        setRegisteredWorkers(workers);
        setWorkersLoadError("");
      } catch (workerLoadError) {
        console.error("Unable to load registered workers for recruiting", workerLoadError);
        if (cancelled) return;
        setRegisteredWorkers([]);
        setWorkersLoadError(workerLoadError.message || "Unable to load workers.");
      }
    }

    void loadRegisteredWorkers();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;

    async function loadYears() {
      try {
        const nextYears = await listRecruitingYears();
        setYears(nextYears);
        setSelectedYear((current) => {
          if (nextYears.includes(current)) return current;
          if (nextYears.includes(DEFAULT_RECRUITING_YEAR)) return DEFAULT_RECRUITING_YEAR;
          return nextYears[0] || DEFAULT_RECRUITING_YEAR;
        });
      } catch (yearsError) {
        console.error("Unable to load recruiting years", yearsError);
      }
    }

    void loadYears();
  }, [session]);

  useEffect(() => {
    if (!session) return;

    async function loadRecruitingData() {
      try {
        const [nextRecords, nextTripTeamMembers, nextSiteNotes] = await Promise.all([
          listRecruitingCycleContacts(selectedYear),
          listTripTeamMembersForDuplicateCheck(),
          listSiteBudgetNotes(),
        ]);
        setRecords(nextRecords);
        setTripTeamMembers(nextTripTeamMembers);
        setSiteBudgetNotes(nextSiteNotes);
        await loadContactActivityForRecords(nextRecords);
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
  }, [session, selectedYear]);

  useEffect(() => {
    setSelectedBulkRecordIds([]);
    setConfirmingBulkDelete(false);
  }, [activeTab, selectedYear]);

  useEffect(() => {
    setSelectedBulkRecordIds((current) =>
      current.filter((id) => records.some((record) => record.id === id))
    );
  }, [records]);

  useEffect(() => {
    if (!router.isReady) return;
    const querySearch = Array.isArray(router.query.search)
      ? router.query.search[0]
      : router.query.search;
    const search = String(querySearch || "").trim();
    if (!search) return;

    setFilterConfig((current) => ({
      ...current,
      searchQuery: search,
    }));
    setActiveFilterId("custom");
  }, [router.isReady, router.query.search]);

  /** Filters (search, stage, saved filters, etc.) but not the active tab column — so tab badges stay accurate. */
  const baseFilteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (activeFilterId === "never_contacted" && record.lastContactedAt) {
        return false;
      }

      if (activeFilterId === "needs_attention" && !recordNeedsAttention(record)) {
        return false;
      }

      if (activeFilterId === "duplicates") {
        const normalizedEmail = normalizeEmailValue(record.contact?.email);
        if (!normalizedEmail) {
          return false;
        }

        const sameBoardMatches = records.filter(
          (otherRecord) =>
            otherRecord.id !== record.id &&
            normalizeEmailValue(otherRecord.contact?.email) === normalizedEmail
        );
        const activeTeamMatches = tripTeamMembers.filter(
          (member) =>
            normalizeEmailValue(member.email) === normalizedEmail &&
            normalizeStatusValue(member.tripStatus) === "active" &&
            !isTripTeamMemberOnOwnConvertedTrip(member, record)
        );

        if (!sameBoardMatches.length && !activeTeamMatches.length) {
          return false;
        }
      }

      if (filterConfig.workflowStatus === "ready_for_boss" && !isReadyForBoss(record)) {
        return false;
      }

      if (filterConfig.workflowStatus === "overdue" && !isOverdueRecord(record)) {
        return false;
      }

      if (filterConfig.stage !== "" && Number(filterConfig.stage) !== record.stage) {
        return false;
      }

      if (
        filterConfig.assignedTo &&
        !String(record.assignedTo || "").toLowerCase().includes(filterConfig.assignedTo.toLowerCase())
      ) {
        return false;
      }

      if (filterConfig.searchQuery) {
        const haystack = [
          record.contact?.firstName,
          record.contact?.lastName,
          record.contact?.email,
          record.contact?.phone,
          record.assignedTo,
          record.teamName,
          record.site,
          record.mackaylaNotes,
          record.lesleeNotes,
          record.interestedTrip,
          record.teamMembers,
          record.projectDates,
          record.priority,
          record.alumniYearLabel,
          record.stageLabel,
          record.linkedTrip?.name,
          record.linkedTrip?.site,
          record.linkedTrip?.status,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(filterConfig.searchQuery.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [activeFilterId, filterConfig, records, tripTeamMembers]);

  const pipelineRecords = useMemo(
    () => baseFilteredRecords.filter((record) => !record.isConvertedToTeam),
    [baseFilteredRecords]
  );
  const outreachRecords = useMemo(
    () => pipelineRecords.filter((record) => !record.isPotentialTeam),
    [pipelineRecords]
  );
  const potentialTeamRecords = useMemo(
    () => pipelineRecords.filter((record) => record.isPotentialTeam),
    [pipelineRecords]
  );
  const sortedPotentialTeamRecords = useMemo(
    () =>
      sortPotentialTeamRecords(
        potentialTeamRecords,
        potentialBoardSort.key,
        potentialBoardSort.dir
      ),
    [potentialTeamRecords, potentialBoardSort.dir, potentialBoardSort.key]
  );
  const convertedTeams = useMemo(
    () => baseFilteredRecords.filter((record) => record.isConvertedToTeam),
    [baseFilteredRecords]
  );
  const canUnlockLockedTeams = useMemo(
    () => isManagerRole(session?.permissionRole || session?.role),
    [session?.permissionRole, session?.role]
  );
  const recordsForActiveTab = useMemo(() => {
    if (activeTab === "converted") return convertedTeams;
    if (activeTab === "outreach") return outreachRecords;
    if (activeTab === "potential") return potentialTeamRecords;
    return pipelineRecords;
  }, [activeTab, convertedTeams, outreachRecords, potentialTeamRecords, pipelineRecords]);

  const outreachPersonRows = useMemo(
    () => buildOutreachPersonRows(outreachRecords),
    [outreachRecords]
  );

  const sortedOutreachPersonRows = useMemo(() => {
    if (outreachBoardSort.key) {
      return sortOutreachRowsByColumn(
        outreachPersonRows,
        outreachBoardSort.key,
        outreachBoardSort.dir
      );
    }
    return outreachPersonRows;
  }, [outreachBoardSort.dir, outreachBoardSort.key, outreachPersonRows]);

  const sortedConvertedTeams = useMemo(
    () =>
      sortPotentialTeamRecords(convertedTeams, convertedBoardSort.key, convertedBoardSort.dir),
    [convertedBoardSort.dir, convertedBoardSort.key, convertedTeams]
  );

  const visibleOutreachRecordIds = useMemo(() => {
    const ids = [];
    const seen = new Set();
    sortedOutreachPersonRows.forEach((row) => {
      const recordId = row.record?.id;
      if (!recordId || seen.has(recordId)) return;
      seen.add(recordId);
      ids.push(recordId);
    });
    return ids;
  }, [sortedOutreachPersonRows]);

  const visiblePotentialRecordIds = useMemo(
    () => sortedPotentialTeamRecords.map((record) => record.id).filter(Boolean),
    [sortedPotentialTeamRecords]
  );

  const visibleBulkRecordIds = useMemo(() => {
    if (activeTab === "outreach") return visibleOutreachRecordIds;
    if (activeTab === "potential") return visiblePotentialRecordIds;
    return [];
  }, [activeTab, visibleOutreachRecordIds, visiblePotentialRecordIds]);

  const allVisibleBulkSelected =
    visibleBulkRecordIds.length > 0 &&
    visibleBulkRecordIds.every((id) => selectedBulkRecordIds.includes(id));
  const someVisibleBulkSelected = visibleBulkRecordIds.some((id) =>
    selectedBulkRecordIds.includes(id)
  );

  useEffect(() => {
    const input = bulkSelectAllRef.current;
    if (!input) return;
    input.indeterminate = someVisibleBulkSelected && !allVisibleBulkSelected;
  }, [someVisibleBulkSelected, allVisibleBulkSelected]);

  const stats = useMemo(() => {
    const total = records.length;
    const noContact = records.filter((record) => record.stage === 0).length;
    const contacted = records.filter((record) => record.stage === 1).length;
    const interested = records.filter((record) => record.stage === 2).length;
    const applied = records.filter((record) => record.stage === 3).length;

    return { total, noContact, contacted, interested, applied };
  }, [records]);
  const boardCounts = useMemo(
    () => ({
      outreach: outreachPersonRows.length,
      potential: potentialTeamRecords.length,
      converted: convertedTeams.length,
    }),
    [convertedTeams, outreachPersonRows, potentialTeamRecords]
  );

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) || null,
    [records, selectedRecordId]
  );

  useEffect(() => {
    const searchTrim = String(filterConfig.searchQuery || "").trim();

    if (searchTrim && baseFilteredRecords.length > 0) {
      if (recordsForActiveTab.length === 0) {
        const next = baseFilteredRecords[0];
        setActiveTab(recruitingBoardTabForRecord(next, activeTab));
        setSelectedRecordId(next.id);
        return;
      }

      if (!baseFilteredRecords.some((record) => record.id === selectedRecordId)) {
        const next = baseFilteredRecords[0];
        setActiveTab(recruitingBoardTabForRecord(next, activeTab));
        setSelectedRecordId(next.id);
        return;
      }

      if (!recordsForActiveTab.some((record) => record.id === selectedRecordId)) {
        const next =
          baseFilteredRecords.find((record) => record.id === selectedRecordId) || baseFilteredRecords[0];
        setActiveTab(recruitingBoardTabForRecord(next, activeTab));
        setSelectedRecordId(next.id);
        return;
      }

      return;
    }

    if (recordsForActiveTab.length === 0) {
      setSelectedRecordId("");
      return;
    }

    if (!recordsForActiveTab.some((record) => record.id === selectedRecordId)) {
      // Only snap to a row when the current selection is stale (non-empty id missing from this tab).
      // Leave empty selection alone so closing the edit modal does not re-highlight a row.
      if (selectedRecordId) {
        setSelectedRecordId(recordsForActiveTab[0].id);
      }
    }
  }, [activeTab, baseFilteredRecords, filterConfig.searchQuery, recordsForActiveTab, selectedRecordId]);

  const sitePickerLabels = useMemo(() => buildSiteLabelsOrdered(siteBudgetNotes), [siteBudgetNotes]);

  async function loadContactActivityForRecords(nextRecords) {
    const recordIds = (nextRecords || []).map((record) => record.id).filter(Boolean);
    if (!recordIds.length) {
      setContactActivityByRecordId({});
      return;
    }
    try {
      const nextActivity = await listRecruitingContactActivityByIds(recordIds);
      setContactActivityByRecordId(nextActivity);
    } catch (activityError) {
      console.error("Unable to load recruiting contact activity", activityError);
    }
  }

  async function refreshCurrentYear() {
    const [nextRecords, nextTripTeamMembers, nextSiteNotes] = await Promise.all([
      listRecruitingCycleContacts(selectedYear),
      listTripTeamMembersForDuplicateCheck(),
      listSiteBudgetNotes(),
    ]);
    setRecords(nextRecords);
    setTripTeamMembers(nextTripTeamMembers);
    setSiteBudgetNotes(nextSiteNotes);
    await loadContactActivityForRecords(nextRecords);
  }

  const duplicateSourceLookup = useMemo(() => {
    const recordEmails = new Map();
    const activeTeamEmails = new Map();

    records.forEach((record) => {
      const email = normalizeEmailValue(record.contact?.email);
      if (!email) return;
      const current = recordEmails.get(email) || [];
      current.push(record);
      recordEmails.set(email, current);
    });

    tripTeamMembers.forEach((member) => {
      const email = normalizeEmailValue(member.email);
      if (!email || normalizeStatusValue(member.tripStatus) !== "active") return;
      const current = activeTeamEmails.get(email) || [];
      current.push(member);
      activeTeamEmails.set(email, current);
    });

    return { recordEmails, activeTeamEmails };
  }, [records, tripTeamMembers]);

  function getDuplicateInfoForEmail(email, options = {}) {
    const normalizedEmail = normalizeEmailValue(email);
    if (!normalizedEmail) return null;

    const sameBoardMatches = (duplicateSourceLookup.recordEmails.get(normalizedEmail) || []).filter(
      (record) => record.id !== options.excludeRecordId
    );
    const ignoreTripIdSet = new Set(
      (options.ignoreTripIds || []).map((id) => String(id)).filter(Boolean)
    );
    const rawActive = duplicateSourceLookup.activeTeamEmails.get(normalizedEmail) || [];
    const activeTeamMatches = rawActive.filter((m) => !ignoreTripIdSet.has(String(m.tripId)));

    if (!sameBoardMatches.length && !activeTeamMatches.length) {
      return null;
    }

    const messages = [];

    if (sameBoardMatches.length > 0) {
      const boardLabels = sortRecruitingBoardLabels([
        ...new Set(sameBoardMatches.map((record) => getWorkflowBoardLabel(record))),
      ]);
      messages.push(`Already on recruiting chart: ${joinLabels(boardLabels)}`);
    }

    if (activeTeamMatches.length > 0) {
      const tripNames = [...new Set(activeTeamMatches.map((member) => member.tripName).filter(Boolean))];
      messages.push(
        tripNames.length > 0
          ? `Already on active teams: ${tripNames.join(", ")}`
          : "Already on active teams"
      );
    }

    return {
      summary: messages.join(" "),
    };
  }

  const duplicateInfoByRecordId = useMemo(() => {
    return Object.fromEntries(
      records
        .map((record) => {
          const duplicateInfo = getDuplicateInfoForEmail(record.contact?.email, {
            excludeRecordId: record.id,
            ignoreTripIds: ignoreTripIdsForConvertedRecruitingRecord(record),
          });
          return duplicateInfo ? [record.id, duplicateInfo] : null;
        })
        .filter(Boolean)
    );
  }, [records, duplicateSourceLookup]);

  const selectedRosterRows = useMemo(
    () => (selectedRecord ? recruitingRosterRowsFromRecord(selectedRecord) : []),
    [selectedRecord]
  );
  function applyFilter(config, filterId = "custom") {
    setFilterConfig({ ...DEFAULT_FILTER_CONFIG, ...config });
    setActiveFilterId(filterId);
  }

  function adjustTableFont(direction) {
    const currentIndex = TABLE_FONT_SIZES.indexOf(tableFontSize);
    if (currentIndex === -1) {
      setTableFontSize("medium");
      return;
    }
    const nextIndex = direction === "down"
      ? Math.max(0, currentIndex - 1)
      : Math.min(TABLE_FONT_SIZES.length - 1, currentIndex + 1);
    setTableFontSize(TABLE_FONT_SIZES[nextIndex]);
  }

  function handleChangeTab(tabId) {
    setActiveTab(tabId);
    setFilterConfig((current) => ({ ...current, activeView: tabId }));
    if (activeFilterId !== "all") {
      setActiveFilterId("custom");
    }
  }

  function toggleBulkRecordSelected(recordId) {
    if (!recordId) return;
    setSelectedBulkRecordIds((current) =>
      current.includes(recordId)
        ? current.filter((id) => id !== recordId)
        : [...current, recordId]
    );
    setConfirmingBulkDelete(false);
  }

  function toggleSelectAllVisibleBulk() {
    if (allVisibleBulkSelected) {
      setSelectedBulkRecordIds((current) =>
        current.filter((id) => !visibleBulkRecordIds.includes(id))
      );
    } else {
      setSelectedBulkRecordIds((current) => [
        ...new Set([...current, ...visibleBulkRecordIds]),
      ]);
    }
    setConfirmingBulkDelete(false);
  }

  function clearBulkSelection() {
    setSelectedBulkRecordIds([]);
    setConfirmingBulkDelete(false);
  }

  function renderBulkDeleteToolbar(summaryText, extraActions = null) {
    const summary = String(summaryText || "").trim();
    const hasSelection = selectedBulkRecordIds.length > 0;
    if (!summary && !hasSelection) {
      return null;
    }

    const bulkYearOptions = [...new Set([...years, selectedYear + 1, CURRENT_RECRUITING_YEAR + 1])]
      .filter((year) => Number(year) !== Number(selectedYear))
      .sort((a, b) => a - b);

    return (
      <div className="recruitingBulkToolbar row" style={{ marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
        {summary || hasSelection ? (
          <div className="small" style={{ color: "var(--muted)", alignSelf: "center" }}>
            {summary}
            {hasSelection ? `${summary ? " · " : ""}${selectedBulkRecordIds.length} selected` : ""}
          </div>
        ) : null}
        <div className="spacer" />
        {hasSelection ? (
          <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {extraActions}
            {bulkYearOptions.length ? (
              <>
                <select
                  className="input"
                  style={{ width: "auto", minWidth: 110 }}
                  value={
                    bulkYearOptions.includes(Number(moveTargetYear))
                      ? Number(moveTargetYear)
                      : bulkYearOptions[0]
                  }
                  onChange={(event) => setMoveTargetYear(Number(event.target.value))}
                  aria-label="Bulk move to recruiting year"
                  disabled={isBulkDeleting}
                >
                  {bulkYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <button
                  className="btn"
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={() =>
                    void handleBulkMoveToYear(
                      bulkYearOptions.includes(Number(moveTargetYear))
                        ? Number(moveTargetYear)
                        : bulkYearOptions[0]
                    )
                  }
                >
                  Move to{" "}
                  {bulkYearOptions.includes(Number(moveTargetYear))
                    ? Number(moveTargetYear)
                    : bulkYearOptions[0]}
                </button>
              </>
            ) : null}
            <button
              className="btn"
              type="button"
              disabled={isBulkDeleting}
              onClick={clearBulkSelection}
            >
              Clear selection
            </button>
            <button
              className="btn"
              type="button"
              disabled={isBulkDeleting}
              onClick={() => {
                if (confirmingBulkDelete) {
                  void handleBulkDeleteSelected();
                  return;
                }
                setConfirmingBulkDelete(true);
              }}
              style={{
                borderColor: "rgba(239,68,68,.28)",
                color: "var(--danger)",
                background: confirmingBulkDelete ? "rgba(239,68,68,.08)" : "transparent",
              }}
            >
              {isBulkDeleting
                ? "Deleting..."
                : confirmingBulkDelete
                  ? `Confirm delete ${selectedBulkRecordIds.length}`
                  : `Delete selected (${selectedBulkRecordIds.length})`}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  async function handleBulkDeleteSelected() {
    const ids = [...selectedBulkRecordIds];
    if (!ids.length) return;

    try {
      setIsBulkDeleting(true);
      let deletedCount = 0;
      let demotedCount = 0;
      for (const id of ids) {
        const result = await deleteRecruitingCycleContactForBoard(id, activeTab, {
          staffMember: session?.name || session?.email || "Staff",
        });
        if (result.action === "demoted") demotedCount += 1;
        else if (result.action === "deleted") deletedCount += 1;
      }
      if (ids.includes(selectedRecordId)) {
        closeRecordDetailsModal();
      }
      clearBulkSelection();
      setError("");
      const parts = [];
      if (deletedCount) parts.push(`Deleted ${deletedCount}`);
      if (demotedCount) parts.push(`Moved ${demotedCount} to Recruiting list`);
      const summary = parts.join(" · ") || "No changes made.";
      setPageStatus(`${summary}.`);
      showToast(`${summary}.`, "success");
      await refreshCurrentYear();
    } catch (deleteError) {
      console.error("Unable to delete selected recruiting rows", deleteError);
      setError(deleteError.message || "Unable to delete selected contacts.");
      showToast(deleteError.message || "Unable to delete selected contacts.", "error");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  async function handleBulkMoveToRecruitingList() {
    const ids = [...selectedBulkRecordIds];
    if (!ids.length) return;

    try {
      setIsBulkDeleting(true);
      let movedCount = 0;
      for (const id of ids) {
        const record = records.find((item) => item.id === id);
        if (!record?.isPotentialTeam || record.isConvertedToTeam) continue;
        await demoteRecruitingRecordToOutreach(record, {
          staffMember: session?.name || session?.email || "Staff",
        });
        movedCount += 1;
      }
      if (ids.includes(selectedRecordId)) {
        closeRecordDetailsModal();
      }
      clearBulkSelection();
      setError("");
      setPageStatus(`Moved ${movedCount} to Recruiting list.`);
      showToast(`Moved ${movedCount} to Recruiting list.`, "success");
      await refreshCurrentYear();
    } catch (moveError) {
      console.error("Unable to move selected recruiting rows", moveError);
      setError(moveError.message || "Unable to move selected contacts.");
      showToast(moveError.message || "Unable to move selected contacts.", "error");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  async function handleBulkMoveToYear(targetYear = moveTargetYear) {
    const ids = [...selectedBulkRecordIds];
    const year = Number(targetYear);
    if (!ids.length || !Number.isFinite(year) || year === Number(selectedYear)) return;

    try {
      setIsBulkDeleting(true);
      let movedCount = 0;
      let skippedCount = 0;
      for (const id of ids) {
        const record = records.find((item) => item.id === id);
        if (!record || record.isConvertedToTeam) {
          skippedCount += 1;
          continue;
        }
        if (Number(record.recruitingYear) === year) {
          skippedCount += 1;
          continue;
        }
        try {
          await moveRecruitingRecordToYear(record, year, {
            staffMember: session?.name || session?.email || "Staff",
          });
          movedCount += 1;
        } catch (perRecordError) {
          console.error("Unable to move recruiting record to year", perRecordError);
          skippedCount += 1;
        }
      }
      if (ids.includes(selectedRecordId)) {
        closeRecordDetailsModal();
      }
      clearBulkSelection();
      setError("");
      const parts = [`Moved ${movedCount} to ${year}`];
      if (skippedCount) parts.push(`${skippedCount} skipped`);
      const summary = parts.join(" · ");
      setPageStatus(`${summary}.`);
      showToast(`${summary}.`, movedCount ? "success" : "error");
      setYears((current) =>
        current.includes(year) ? current : [...current, year].sort((a, b) => b - a)
      );
      if (movedCount > 0) {
        setSelectedYear(year);
      } else {
        await refreshCurrentYear();
      }
    } catch (moveError) {
      console.error("Unable to bulk move recruiting rows to year", moveError);
      setError(moveError.message || "Unable to move selected contacts.");
      showToast(moveError.message || "Unable to move selected contacts.", "error");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  async function handlePromoteToPotentialTeam(record = selectedRecord) {
    if (!record?.id || record.isConvertedToTeam || record.isPotentialTeam) return;

    try {
      setIsSavingNotes(true);
      await promoteRecruitingRecordToPotentialTeam(record, {
        staffMember: session?.name || session?.email || "Staff",
      });
      closeRecordDetailsModal();
      setError("");
      setPageStatus(`${record.teamName || formatContactName(record)} moved to Potential Teams.`);
      showToast("Moved to Potential Teams.", "success");
      handleChangeTab("potential");
      await refreshCurrentYear();
    } catch (promoteError) {
      console.error("Unable to promote recruiting record", promoteError);
      setError(promoteError.message || "Unable to move to Potential Teams.");
      showToast(promoteError.message || "Unable to move to Potential Teams.", "error");
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleMoveToRecruitingList(record = selectedRecord) {
    if (!record?.id || record.isConvertedToTeam || !record.isPotentialTeam) return;

    try {
      setIsSavingNotes(true);
      await demoteRecruitingRecordToOutreach(record, {
        staffMember: session?.name || session?.email || "Staff",
      });
      closeRecordDetailsModal();
      setError("");
      setPageStatus(`${record.teamName || formatContactName(record)} moved to Recruiting list.`);
      showToast("Moved to Recruiting list.", "success");
      handleChangeTab("outreach");
      await refreshCurrentYear();
    } catch (demoteError) {
      console.error("Unable to move recruiting record to outreach", demoteError);
      setError(demoteError.message || "Unable to move to Recruiting list.");
      showToast(demoteError.message || "Unable to move to Recruiting list.", "error");
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleMoveRecordToYear(record = selectedRecord, year = moveTargetYear) {
    if (!record?.id || record.isConvertedToTeam) return;
    const targetYear = Number(year);
    if (!Number.isFinite(targetYear) || targetYear === Number(record.recruitingYear)) return;

    try {
      setIsSavingNotes(true);
      await moveRecruitingRecordToYear(record, targetYear, {
        staffMember: session?.name || session?.email || "Staff",
      });
      closeRecordDetailsModal();
      setError("");
      setPageStatus(
        `${record.teamName || formatContactName(record)} moved to ${targetYear}.`
      );
      showToast(`Moved to ${targetYear}.`, "success");
      setYears((current) =>
        current.includes(targetYear) ? current : [...current, targetYear].sort((a, b) => b - a)
      );
      setSelectedYear(targetYear);
    } catch (yearMoveError) {
      console.error("Unable to move recruiting record to year", yearMoveError);
      setError(yearMoveError.message || "Unable to move to that year.");
      showToast(yearMoveError.message || "Unable to move to that year.", "error");
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleCreateContact() {
    const rows =
      newContactDraft.rosterRows?.length > 0 ? newContactDraft.rosterRows : [emptyRosterPerson()];
    const enrichedRows = rows.map((row) => tryLinkTeamMemberRow(row, registeredWorkers));
    const primary = enrichedRows[0];
    if (!String(primary.firstName || "").trim() || !String(primary.lastName || "").trim()) {
      setError("First and last name are required for the starred primary contact.");
      return;
    }
    const teamMembers = buildTeamMembersFromRosterRows(enrichedRows, 0);
    if (notifyDuplicateTeamName(newContactDraft.teamName)) {
      return;
    }
    const sendToPotential = activeTab === "potential";
    const stage = sendToPotential ? Math.max(Number(newContactDraft.stage) || 0, 2) : 0;
    try {
      await saveRecruitingCycleContact(
        {
          recruitingYear: selectedYear,
          firstName: primary.firstName,
          lastName: primary.lastName,
          email: primary.email,
          phone: primary.phone,
          gender: primary.gender,
          teamName: newContactDraft.teamName,
          teamMembers,
          assignedTo: newContactDraft.assignedTo || PRIMARY_OWNER,
          stage,
          site: newContactDraft.site,
          projectDates: newContactDraft.projectDates,
          weeks: newContactDraft.weeks,
          departureDate: newContactDraft.departureDate,
          interestedTrip: "",
          alumniYearLabel: "",
          priority: "",
          nextFollowUp: "",
          mackaylaNotes: buildMackaylaNotes(newContactDraft.mackaylaNotesBody, ""),
          lesleeNotes: newContactDraft.lesleeNotes,
          isPotentialTeam: sendToPotential,
        },
        { requireContactNames: true }
      );

      setNewContactDraft(createEmptyNewContactDraft());
      setAddContactModalOpen(false);
      setError("");
      handleChangeTab(sendToPotential ? "potential" : "outreach");
      await refreshCurrentYear();
    } catch (saveError) {
      console.error("Unable to create recruiting contact", saveError);
      setError(saveError.message || "Unable to create contact.");
    }
  }

  async function openRecordDetails(recordId) {
    if (!recordId) return;
    const record = records.find((item) => item.id === recordId);
    const currentYear = Number(record?.recruitingYear || selectedYear || CURRENT_RECRUITING_YEAR);
    const yearOptions = [...new Set([...years, currentYear + 1, CURRENT_RECRUITING_YEAR + 1])]
      .filter((year) => Number(year) !== currentYear)
      .sort((a, b) => a - b);
    setMoveTargetYear(yearOptions[0] || currentYear + 1);
    setSelectedRecordId(recordId);
    setConfirmingDeleteRecordId("");
    setRecordDetailsModalOpen(true);
    setPageStatus("");
    setError("");
  }

  function closeRecordDetailsModal() {
    setRecordDetailsModalOpen(false);
    setSelectedRecordId("");
    setConfirmingDeleteRecordId("");
    setError("");
  }

  /** Ignore double-clicks on row controls when opening the edit modal. */
  function handleRecruitingTableRowDoubleClick(event, recordId) {
    if (event.target.closest("button, a, input, textarea, select, label")) return;
    void openRecordDetails(recordId);
  }

  async function handleDeleteRecord(recordId = selectedRecordId) {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;

    try {
      setDeletingRecordId(record.id);
      const result = await deleteRecruitingCycleContactForBoard(record.id, activeTab, {
        staffMember: session?.name || session?.email || "Staff",
      });
      setSelectedBulkRecordIds((current) => current.filter((id) => id !== record.id));
      closeRecordDetailsModal();
      const label = record.teamName || formatContactName(record);
      if (result.action === "demoted") {
        setPageStatus(`${label} moved to Recruiting list.`);
        showToast("Moved to Recruiting list.", "success");
      } else {
        setPageStatus(`${label} deleted.`);
      }
      await refreshCurrentYear();
    } catch (deleteError) {
      console.error("Unable to delete recruiting row", deleteError);
      setError(deleteError.message || "Unable to delete recruiting row.");
    } finally {
      setDeletingRecordId("");
    }
  }

  function openFormTeamModal(record) {
    setSelectedRecordId(record.id);
    setTeamFormDraft(buildTeamFormDraft(record));
    setTeamFormShowMemberTripDates(false);
    setFormTeamModalOpen(true);
    setPageStatus("");
    setError("");
  }

  async function handleFormTeam() {
    if (!selectedRecord) return;
    if (notifyDuplicateTeamName(teamFormDraft.name, { excludeRecordId: selectedRecord.id })) {
      return;
    }

    try {
      setIsFormingTeam(true);
      setError("");
      setPageStatus("Adding trip...");

      const result = await convertRecruitingCycleRecordToTrip({
        record: selectedRecord,
        name: teamFormDraft.name,
        location: teamFormDraft.location,
        host: teamFormDraft.host,
        siteType: teamFormDraft.siteType,
        trainingTimelineType: teamFormDraft.trainingTimelineType,
        projectType: teamFormDraft.projectType,
        projectLengthSummary: teamFormDraft.projectLengthSummary,
        extraTravelStatus: teamFormDraft.extraTravelStatus,
        startDate: teamFormDraft.startDate,
        endDate: teamFormDraft.endDate,
        fundraisingGoalAmount: teamFormDraft.fundraisingGoalAmount,
        tripFeeAmount: teamFormDraft.tripFeeAmount,
        materialsFeeAmount: teamFormDraft.materialsFeeAmount,
        hasDeferredWorker: teamFormDraft.hasDeferredWorker,
        hannoverHousingFeeAmount: teamFormDraft.hannoverHousingFeeAmount,
        domesticProjectFeeAmount: teamFormDraft.domesticProjectFeeAmount,
        domesticFeeAmount: teamFormDraft.domesticFeeAmount,
        domesticMaterialsFeeAmount: teamFormDraft.domesticMaterialsFeeAmount,
        weeks: teamFormDraft.recruitingWeeks,
        projectDates: teamFormDraft.recruitingProjectDates,
        departureDate: teamFormDraft.recruitingDepartureDate,
        ...teamFormDraft,
      });

      await refreshCurrentYear();
      setFormTeamModalOpen(false);
      handleChangeTab("converted");
      setSelectedRecordId(result?.record?.id || selectedRecord.id);

      let statusMessage =
        result?.status === "already_converted"
          ? "Trip already added. Moved to Locked Teams."
          : "Trip added. Moved to Locked Teams.";

      if (result?.status === "converted" && result?.trip?.id) {
        try {
          const notifyResult = await sendTeamLockStaffNotify(
            buildTeamLockNotifyPayload({
              tripId: result.trip.id,
              teamName: teamFormDraft.name,
              site: teamFormDraft.location,
              host: teamFormDraft.host,
              teamDeveloper: selectedRecord.assignedTo || "",
              projectLengthSummary:
                result.trip?.projectLengthSummary || teamFormDraft.projectLengthSummary,
              weeks: teamFormDraft.recruitingWeeks || selectedRecord?.weeks,
              recruitingWeeks: teamFormDraft.recruitingWeeks || selectedRecord?.weeks,
              projectDates:
                teamFormDraft.recruitingProjectDates || selectedRecord?.projectDates,
              recruitingProjectDates:
                teamFormDraft.recruitingProjectDates || selectedRecord?.projectDates,
              startDate: teamFormDraft.startDate,
              endDate: teamFormDraft.endDate,
              teamMembers: teamFormDraft.teamMembers,
              extraTravelStatus: teamFormDraft.extraTravelStatus,
              fundraisingGoalAmount: teamFormDraft.fundraisingGoalAmount,
              tripFeeAmount: teamFormDraft.tripFeeAmount,
              materialsFeeAmount: teamFormDraft.materialsFeeAmount,
              hannoverHousingFeeAmount: teamFormDraft.hannoverHousingFeeAmount,
              mackaylaNotes: teamFormDraft.mackaylaNotes,
              lesleeNotes: teamFormDraft.lesleeNotes,
            })
          );
          if (notifyResult?.email?.sent) {
            statusMessage += " Staff lock email sent.";
          } else if (notifyResult?.email?.reason === "missing_team_lock_notify_email") {
            statusMessage += " (Set TEAM_LOCK_NOTIFY_EMAIL to send staff lock email.)";
          }
          const invites = notifyResult?.workerInvites;
          if (invites?.sent > 0) {
            const parts = [];
            if (invites.invited > 0) parts.push(`${invites.invited} invite(s)`);
            if (invites.notified > 0) parts.push(`${invites.notified} notification(s)`);
            statusMessage += ` Worker emails sent (${parts.join(", ") || invites.sent}).`;
          }
          if (invites?.skipped > 0) {
            statusMessage += ` ${invites.skipped} worker(s) skipped (no email on roster).`;
          }
          if (invites?.failed > 0) {
            statusMessage += ` ${invites.failed} worker invite(s) failed.`;
          }
          if (invites?.error) {
            statusMessage += " Worker invites could not send.";
          }
        } catch (notifyError) {
          console.warn("Team locked but staff notification email failed", notifyError);
          statusMessage += " Trip saved; staff lock email did not send.";
        }
      }

      setPageStatus(statusMessage);
    } catch (error) {
      console.error("Unable to lock team", error);
      setError(error.message || "Unable to lock team.");
      setPageStatus("");
    } finally {
      setIsFormingTeam(false);
    }
  }

  async function handleUnlockLockedTeam(record) {
    if (!record?.id || !record.convertedTeamId) return;
    const tripLabel = record.linkedTrip?.name || record.teamName || "this team";
    if (
      !window.confirm(
        `Unlock "${tripLabel}"?\n\nThis deletes the trip from the Trips dashboard and moves this recruiting row back to Potential Teams. This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      setUnlockingLockedTeamRecordId(record.id);
      setError("");
      await revertRecruitingLockedTeam(record);
      if (selectedRecordId === record.id) {
        closeRecordDetailsModal();
      }
      await refreshCurrentYear();
      handleChangeTab("potential");
      setPageStatus(`${tripLabel} unlocked — row is back on Potential Teams.`);
    } catch (unlockError) {
      console.error("Unable to unlock team", unlockError);
      setError(unlockError.message || "Unable to unlock team.");
    } finally {
      setUnlockingLockedTeamRecordId("");
    }
  }

  function updateTeamFormDraft(field, value) {
    setTeamFormDraft((current) => {
      const next = { ...current, [field]: value };
      if (field === "location") {
        next.host = resolveEffectiveSiteHostName(value, siteBudgetNotes);
      }
      return next;
    });
  }

  function updateTeamFormMember(index, field, value) {
    setTeamFormDraft((current) => ({
      ...current,
      teamMembers: current.teamMembers.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member
      ),
    }));
  }

  function linkTeamFormMember(index, worker) {
    setTeamFormDraft((current) => ({
      ...current,
      teamMembers: current.teamMembers.map((member, memberIndex) =>
        memberIndex === index ? linkTeamMemberToWorker(member, worker) : member
      ),
    }));
  }

  function tryLinkTeamFormMember(index) {
    setTeamFormDraft((current) => ({
      ...current,
      teamMembers: current.teamMembers.map((member, memberIndex) =>
        memberIndex === index ? tryLinkTeamMemberRow(member, registeredWorkers) : member
      ),
    }));
  }

  function linkPotentialTeamMember(index, worker) {
    setPotentialTeamEditDraft((current) => ({
      ...current,
      teamMembers: current.teamMembers.map((member, memberIndex) =>
        memberIndex === index ? linkTeamMemberToWorker(member, worker) : member
      ),
    }));
  }

  function tryLinkPotentialTeamMember(index) {
    setPotentialTeamEditDraft((current) => ({
      ...current,
      teamMembers: current.teamMembers.map((member, memberIndex) =>
        memberIndex === index ? tryLinkTeamMemberRow(member, registeredWorkers) : member
      ),
    }));
  }

  function addTeamFormMemberRow() {
    setTeamFormDraft((current) => ({
      ...current,
      teamMembers: [...current.teamMembers, createEmptyTripTeamMember()],
    }));
  }

  function removeTeamFormMemberRow(index) {
    setTeamFormDraft((current) => ({
      ...current,
      teamMembers:
        current.teamMembers.length === 1
          ? [createEmptyTripTeamMember()]
          : current.teamMembers.filter((_, memberIndex) => memberIndex !== index),
    }));
  }

  async function handleSaveRecord(recordId = selectedRecordId) {
    const recordToSave = records.find((record) => record.id === recordId);
    if (!recordToSave) return;
    if (notifyDuplicateTeamName(recordToSave.teamName, { excludeRecordId: recordToSave.id })) {
      hideBusy();
      return;
    }

    try {
      setIsSavingNotes(true);
      await saveRecruitingCycleContact(buildRecruitingRecordPayload(recordToSave));
      await refreshCurrentYear();
      closeRecordDetailsModal();
      setPageStatus("Saved.");
      if (isBusyActive()) showBusyDone("Saved");
    } catch (saveError) {
      console.error("Unable to save recruiting record", saveError);
      setError(saveError.message || "Unable to save record.");
      hideBusy();
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleSavePotentialTeamDetails() {
    const record = records.find((item) => item.id === selectedRecordId);
    if (!record) {
      hideBusy();
      return;
    }
    const d = potentialTeamEditDraft;
    if (notifyDuplicateTeamName(d.name, { excludeRecordId: record.id })) {
      hideBusy();
      return;
    }
    const primary = d.teamMembers[0] || createEmptyTripTeamMember();
    if (!String(primary.firstName || "").trim() || !String(primary.lastName || "").trim()) {
      setError("First and last name are required for the first team member.");
      hideBusy();
      return;
    }
    const rosterRows = d.teamMembers.map((m) => ({
      firstName: m.firstName || "",
      lastName: m.lastName || "",
      email: m.email || "",
      phone: m.phone ?? "",
      gender: String(m.gender || "").trim(),
      isMinor: !!m.isMinor,
      minorAge: String(m.minorAge || "").trim(),
    }));
    const synced = syncRosterIntoRecord(record, rosterRows, 0);
    const weeksValue = d.recruitingWeeks;
    const weeksParsed =
      weeksValue === "" || weeksValue === null || weeksValue === undefined
        ? null
        : Number(weeksValue);
    try {
      setIsSavingNotes(true);
      setError("");
      await saveRecruitingCycleContact(
        buildRecruitingRecordPayload({
          ...record,
          ...synced,
          teamName: d.name,
          site: d.location,
          projectDates: d.recruitingProjectDates,
          weeks: Number.isFinite(weeksParsed) ? weeksParsed : null,
          departureDate: d.recruitingDepartureDate,
          mackaylaNotes: d.mackaylaNotes,
          lesleeNotes: d.lesleeNotes,
          pendingLockTeamSetup: buildPendingLockTeamSetupFromDraft(d, potentialEditShowMemberTripDates),
        })
      );
      await refreshCurrentYear();
      closeRecordDetailsModal();
      setPageStatus("Saved.");
      if (isBusyActive()) showBusyDone("Saved");
      potentialEditSnapshotKey.current = "";
    } catch (saveError) {
      console.error("Unable to save recruiting record", saveError);
      setError(saveError.message || "Unable to save record.");
      setPageStatus("");
      hideBusy();
    } finally {
      setIsSavingNotes(false);
    }
  }

  function updateRecordField(recordId, field, value) {
    setRecords((current) =>
      current.map((record) => {
        if (record.id !== recordId) return record;
        const next = {
          ...record,
          [field]: value,
          ...(field === "stage" ? { stageLabel: getRecruitingStageLabel(value) } : {}),
        };
        if (field === "site") {
          const host = resolveEffectiveSiteHostName(value, siteBudgetNotes);
          const prior =
            record.pendingLockTeamSetup && typeof record.pendingLockTeamSetup === "object"
              ? record.pendingLockTeamSetup
              : {};
          next.pendingLockTeamSetup = { ...prior, host };
        }
        return next;
      })
    );
  }

  function updatePendingLockField(recordId, field, value) {
    setRecords((current) =>
      current.map((record) => {
        if (record.id !== recordId) return record;
        const prior =
          record.pendingLockTeamSetup && typeof record.pendingLockTeamSetup === "object"
            ? record.pendingLockTeamSetup
            : {};
        return {
          ...record,
          pendingLockTeamSetup: { ...prior, [field]: value },
        };
      })
    );
  }

  function updateRecordOwner(recordId, owner) {
    updateRecordField(recordId, "assignedTo", owner);
  }

  function updateRecordMackaylaNotes(recordId, value) {
    setRecords((current) =>
      current.map((record) =>
        record.id === recordId
          ? {
              ...record,
              mackaylaNotes: buildMackaylaNotes(value, extractHandoffSummary(record.mackaylaNotes)),
            }
          : record
      )
    );
  }

  function updateRecordLesleeNotes(recordId, value) {
    updateRecordField(recordId, "lesleeNotes", value);
  }

  function updateRecordHandoffSummary(recordId, value) {
    setRecords((current) =>
      current.map((record) =>
        record.id === recordId
          ? {
              ...record,
              mackaylaNotes: buildMackaylaNotes(stripHandoffSummary(record.mackaylaNotes), value),
            }
          : record
      )
    );
  }

  function updateContactField(recordId, field, value) {
    setRecords((current) =>
      current.map((record) =>
        record.id === recordId
          ? {
              ...record,
              contact: {
                ...(record.contact || {}),
                [field]: value,
              },
            }
          : record
      )
    );
  }

  function updateSelectedRecord(field, value) {
    if (!selectedRecordId) return;
    updateRecordField(selectedRecordId, field, value);
  }

  function updateRosterRowForSelectedRecord(rowIndex, patch) {
    if (!selectedRecordId) return;
    setRecords((current) =>
      current.map((record) => {
        if (record.id !== selectedRecordId) return record;
        const rows = recruitingRosterRowsFromRecord(record);
        rows[rowIndex] = { ...rows[rowIndex], ...patch };
        return syncRosterIntoRecord(record, rows, 0);
      })
    );
  }

  function setRosterPrimaryForSelectedRecord(rowIndex) {
    if (!selectedRecordId || rowIndex === 0) return;
    setRecords((current) =>
      current.map((record) => {
        if (record.id !== selectedRecordId) return record;
        const rows = makePrimaryRosterRow(recruitingRosterRowsFromRecord(record), rowIndex);
        return syncRosterIntoRecord(record, rows, 0);
      })
    );
  }

  function addRosterRowForSelectedRecord() {
    if (!selectedRecordId) return;
    setRecords((current) =>
      current.map((record) => {
        if (record.id !== selectedRecordId) return record;
        const rows = [...recruitingRosterRowsFromRecord(record), emptyRosterPerson()];
        return syncRosterIntoRecord(record, rows, 0);
      })
    );
  }

  function removeRosterRowForSelectedRecord(rowIndex) {
    if (!selectedRecordId) return;
    setRecords((current) =>
      current.map((record) => {
        if (record.id !== selectedRecordId) return record;
        const rows = recruitingRosterRowsFromRecord(record);
        if (rows.length <= 1) return record;
        rows.splice(rowIndex, 1);
        return syncRosterIntoRecord(record, rows, 0);
      })
    );
  }

  function updateNewContactRosterRow(rowIndex, patch) {
    setNewContactDraft((current) => ({
      ...current,
      rosterRows: current.rosterRows.map((row, i) => (i === rowIndex ? { ...row, ...patch } : row)),
    }));
  }

  function linkNewContactRosterRow(rowIndex, worker) {
    setNewContactDraft((current) => ({
      ...current,
      rosterRows: current.rosterRows.map((row, i) =>
        i === rowIndex ? linkTeamMemberToWorker(row, worker) : row
      ),
    }));
  }

  function tryLinkNewContactRosterRow(rowIndex) {
    setNewContactDraft((current) => ({
      ...current,
      rosterRows: current.rosterRows.map((row, i) =>
        i === rowIndex ? tryLinkTeamMemberRow(row, registeredWorkers) : row
      ),
    }));
  }

  function setNewContactPrimaryRow(rowIndex) {
    setNewContactDraft((current) => ({
      ...current,
      rosterRows: makePrimaryRosterRow(current.rosterRows?.length ? current.rosterRows : [emptyRosterPerson()], rowIndex),
    }));
  }

  function addNewContactRosterRow() {
    setNewContactDraft((current) => ({
      ...current,
      rosterRows: [...(current.rosterRows?.length ? current.rosterRows : [emptyRosterPerson()]), emptyRosterPerson()],
    }));
  }

  function removeNewContactRosterRow(rowIndex) {
    setNewContactDraft((current) => {
      const rows = current.rosterRows?.length ? current.rosterRows : [emptyRosterPerson()];
      if (rows.length <= 1) return current;
      return {
        ...current,
        rosterRows: rows.filter((_, i) => i !== rowIndex),
      };
    });
  }

  function openStaffTaskModal(record) {
    if (!record?.id) return;
    setStaffTaskDraft(buildRecruitingStaffTaskDraft(record));
    setError("");
    setStaffTaskModalOpen(true);
  }

  async function handleSaveRecruitingStaffTask() {
    const record = records.find((entry) => entry.id === staffTaskDraft.recordId);
    if (!record) return;
    const taskName = String(staffTaskDraft.taskName || "").trim();
    if (!taskName) {
      setError("Enter a task name.");
      return;
    }
    if (!session?.email) {
      setError("Sign in before creating a staff task.");
      return;
    }

    try {
      setIsSavingStaffTask(true);
      await saveStaffMiscTask({
        staffEmail: session.email,
        staffName: session.name || session.email || "Staff",
        workArea: "Recruiting",
        taskName,
        dueDate: String(staffTaskDraft.dueDate || "").trim(),
        progress: "Not started",
        notes: String(staffTaskDraft.notes || "").trim(),
      });
      setStaffTaskModalOpen(false);
      setStaffTaskDraft({
        recordId: "",
        taskName: "",
        dueDate: "",
        notes: "",
      });
      setError("");
      setPageStatus("Staff task added.");
      showToast(`Added task for ${formatRecruitingTaskTargetName(record)}.`, "success");
    } catch (saveError) {
      console.error("Unable to create recruiting staff task", saveError);
      setError(saveError.message || "Unable to create staff task.");
      showToast(saveError.message || "Unable to create staff task.", "error");
    } finally {
      setIsSavingStaffTask(false);
    }
  }

  async function handleSaveLastContact(record, method, dateInput, summary = "") {
    if (!record?.id || !session) return false;
    const normalizedMethod = normalizeLastContactMethodValue(method);

    if (!normalizedMethod) {
      if (!record.lastContactedAt && !record.lastContactMethod) return false;
      try {
        setLoggingOutreachRecordId(record.id);
        await saveRecruitingCycleContact(
          buildRecruitingRecordPayload(record, {
            lastContactedAt: "",
            lastContactMethod: "",
          })
        );
        await refreshCurrentYear();
        return true;
      } catch (saveError) {
        console.error("Unable to clear last contact", saveError);
        setError(saveError.message || "Unable to clear last contact.");
        return false;
      } finally {
        setLoggingOutreachRecordId("");
      }
    }

    const trimmedDate = String(dateInput || "").trim();
    if (!trimmedDate) return false;

    try {
      setLoggingOutreachRecordId(record.id);
      await logRecruitingCycleContactAction({
        record,
        actionType: normalizedMethod,
        actionDate: parseLastContactActionDate(trimmedDate),
        staffMember: session?.name || session?.email || "Staff",
        summary: String(summary || "").trim(),
        stage: Math.max(record.stage, 1),
      });
      setError("");
      setPageStatus("Contact saved.");
      showToast(`${formatOutreachContactMethod(normalizedMethod)} saved.`, "success");
      await refreshCurrentYear();
      return true;
    } catch (logError) {
      console.error("Unable to save last contact", logError);
      setError(logError.message || "Unable to save last contact.");
      showToast(logError.message || "Unable to save last contact.", "error");
      return false;
    } finally {
      setLoggingOutreachRecordId("");
    }
  }

  function openOutreachContactModal(record, person, activity = null) {
    if (!record?.id) return;
    const activityId = String(activity?.id || "").trim();
    const activityDate = activity?.actionDate
      ? String(activity.actionDate).slice(0, 10)
      : "";
    setOutreachContactDraft({
      recordId: record.id,
      activityId,
      personLabel: formatOutreachPersonName(person),
      method:
        normalizeLastContactMethodValue(activity?.actionType) ||
        normalizeLastContactMethodValue(record.lastContactMethod) ||
        "email",
      date:
        activityDate ||
        lastContactDateInputValue(record) ||
        new Date().toISOString().slice(0, 10),
      notes: activityId ? String(activity?.summary || "").trim() : "",
    });
    setOutreachContactModalOpen(true);
  }

  function closeOutreachContactModal() {
    setOutreachContactModalOpen(false);
    setOutreachContactDraft({
      recordId: "",
      activityId: "",
      personLabel: "",
      method: "email",
      date: "",
      notes: "",
    });
  }

  async function handleSaveOutreachContactModal() {
    const record = records.find((item) => item.id === outreachContactDraft.recordId);
    if (!record) return;
    const normalizedMethod = normalizeLastContactMethodValue(outreachContactDraft.method);
    if (!normalizedMethod) {
      setError("Choose how you contacted them.");
      return;
    }
    if (!String(outreachContactDraft.date || "").trim()) {
      setError("Contact date is required.");
      return;
    }

    const activityId = String(outreachContactDraft.activityId || "").trim();
    if (activityId) {
      try {
        setLoggingOutreachRecordId(record.id);
        await updateRecruitingContactActivityLog({
          activityId,
          actionType: normalizedMethod,
          actionDate: parseLastContactActionDate(outreachContactDraft.date),
          summary: String(outreachContactDraft.notes || "").trim(),
          staffMember: session?.name || session?.email || "Staff",
        });
        // Keep the cycle row's "last contact" in sync when editing the newest activity.
        const recent = getRecentContactActivities(record.id, contactActivityByRecordId, 1)[0];
        if (!recent || recent.id === activityId) {
          await saveRecruitingCycleContact(
            buildRecruitingRecordPayload(record, {
              lastContactedAt: parseLastContactActionDate(outreachContactDraft.date),
              lastContactMethod: normalizedMethod,
            })
          );
        }
        setError("");
        setPageStatus("Contact updated.");
        showToast("Contact notes updated.", "success");
        await refreshCurrentYear();
        closeOutreachContactModal();
      } catch (updateError) {
        console.error("Unable to update contact activity", updateError);
        setError(updateError.message || "Unable to update contact.");
        showToast(updateError.message || "Unable to update contact.", "error");
      } finally {
        setLoggingOutreachRecordId("");
      }
      return;
    }

    const saved = await handleSaveLastContact(
      record,
      outreachContactDraft.method,
      outreachContactDraft.date,
      outreachContactDraft.notes
    );
    if (saved) {
      closeOutreachContactModal();
    }
  }

  async function handleImportFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseRecruitingImportRows(file);
      const result = await importRecruitingContacts({
        recruitingYear: selectedYear,
        rows,
        destination: activeTab === "potential" ? "potential" : "outreach",
        staffMember: session?.name || session?.email || "Staff",
      });
      setError("");
      setPageStatus(
        `Imported ${result.createdCount} contacts · Skipped ${result.duplicateCount} duplicates · Ignored ${result.ignoredCount} invalid rows`
      );
      showToast(`Imported ${result.createdCount} contacts.`, "success");
      await refreshCurrentYear();
    } catch (importError) {
      console.error("Unable to import recruiting contacts", importError);
      setError(importError.message || "Unable to import contacts.");
      showToast(importError.message || "Unable to import contacts.", "error");
    } finally {
      event.target.value = "";
    }
  }

  function openAddContactModal() {
    setNewContactDraft(createEmptyNewContactDraft());
    setError("");
    setAddContactModalOpen(true);
  }

  function renderOutreachRecentContacts(recordId, record, person) {
    const recentContacts = getRecentContactActivities(recordId, contactActivityByRecordId, 3);
    if (!recentContacts.length) return null;

    return (
      <ul className="recruitingOutreachRecentList" aria-label="Recent contacts">
        {recentContacts.map((entry) => (
          <li key={entry.id} className="recruitingOutreachRecentItem">
            <button
              type="button"
              className="recruitingOutreachRecentEditBtn"
              title="Click to edit this contact note"
              onClick={() => openOutreachContactModal(record, person, entry)}
            >
              {formatOutreachActivityLine(entry)}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  function renderOutreachActionButtons(record, person, isLogging) {
    return (
      <>
        <button
          className="btn recruitingOutreachContactBtn"
          type="button"
          disabled={isLogging}
          onClick={() => openOutreachContactModal(record, person)}
        >
          Contact
        </button>
        <button className="btn" type="button" onClick={() => openStaffTaskModal(record)}>
          Task
        </button>
        <button
          className="btn btnPrimary recruitingOutreachEditBtn"
          type="button"
          onClick={() => void openRecordDetails(record.id)}
        >
          Edit
        </button>
      </>
    );
  }

  function renderOutreachTable(rowsToRender) {
    if (rowsToRender.length === 0) {
      return (
        <EmptyState
          icon="recruiting"
          title="No contacts in this view"
          description="Add contacts or clear filters to see who to reach out to next."
        />
      );
    }

    return (
      <div className="recruitingBoardTableHost">
        <DraggableTable>
          <table
            className={`table recruitingCompactTable recruitingBoardSlimTable recruitingBoardTable recruitingOutreachListTable recruitingFont-${tableFontSize}`}
          >
            <thead>
              <tr>
                <th style={{ width: RECRUITING_OUTREACH_LIST_COL_PCT.select }}>
                  <input
                    ref={bulkSelectAllRef}
                    className="recruitingOutreachSelectInput"
                    type="checkbox"
                    aria-label="Select all visible contacts"
                    checked={allVisibleBulkSelected}
                    onChange={toggleSelectAllVisibleBulk}
                  />
                </th>
                {renderOutreachSortableHeader("Contact", "contact", {
                  width: RECRUITING_OUTREACH_LIST_COL_PCT.contact,
                })}
                {renderOutreachSortableHeader("Trip details", "project", {
                  width: RECRUITING_OUTREACH_LIST_COL_PCT.project,
                })}
                {renderOutreachSortableHeader("Mackayla notes", "mackayla", {
                  width: RECRUITING_OUTREACH_LIST_COL_PCT.mackayla,
                })}
                {renderOutreachSortableHeader("Leslee notes", "leslee", {
                  width: RECRUITING_OUTREACH_LIST_COL_PCT.leslee,
                })}
                {renderOutreachSortableHeader("Last contact", "lastContact", {
                  width: RECRUITING_OUTREACH_LIST_COL_PCT.lastContact,
                })}
                <th style={{ width: RECRUITING_OUTREACH_LIST_COL_PCT.actions }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rowsToRender.map((row, rowIndex) => {
                const { person, record } = row;
                const draft = buildTeamFormDraft(record);
                const siteLabel = chartDashText(record.site || draft.location);
                const datesLabel = chartDashText(recruitingBoardProjectDatesLabel(record));
                const rowClass = rowIndex % 2 === 1 ? "recruitingRowAlt" : "";
                const isLogging = loggingOutreachRecordId === record.id;
                const duplicateInfo = person.email
                  ? getDuplicateInfoForEmail(person.email, { excludeRecordId: record.id })
                  : null;

                const isSelected = selectedBulkRecordIds.includes(record.id);

                return (
                  <tr
                    key={row.id}
                    className={`${rowClass}${isSelected ? " recruitingOutreachRowSelected" : ""}`}
                    onDoubleClick={(event) => handleRecruitingTableRowDoubleClick(event, record.id)}
                  >
                    <td
                      style={{ width: RECRUITING_OUTREACH_LIST_COL_PCT.select, verticalAlign: "top" }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        className="recruitingOutreachSelectInput"
                        type="checkbox"
                        aria-label={`Select ${formatOutreachPersonName(person)}`}
                        checked={isSelected}
                        onChange={() => toggleBulkRecordSelected(record.id)}
                      />
                    </td>
                    <td style={{ width: RECRUITING_OUTREACH_LIST_COL_PCT.contact, verticalAlign: "top" }}>
                      <div className="recruitingOutreachContactCell">
                        <RecruitingRosterBoardColumn record={record} showGender />
                        {renderDuplicateNotice(duplicateInfo, { compact: true })}
                      </div>
                    </td>
                    <td style={{ width: RECRUITING_OUTREACH_LIST_COL_PCT.project, verticalAlign: "top" }}>
                      <div className="recruitingOutreachProjectCell">
                        <div className="recruitingOutreachProjectSite">{siteLabel}</div>
                        <div className="recruitingOutreachProjectDates">{datesLabel}</div>
                      </div>
                    </td>
                    <td
                      style={{ width: RECRUITING_OUTREACH_LIST_COL_PCT.mackayla, verticalAlign: "top" }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <textarea
                        className="input recruitingInlineNoteInput"
                        rows={4}
                        value={stripHandoffSummary(record.mackaylaNotes)}
                        onChange={(event) => updateRecordMackaylaNotes(record.id, event.target.value)}
                        onBlur={() => void handleSaveRecord(record.id)}
                        placeholder="Add Mackayla notes"
                      />
                    </td>
                    <td
                      style={{ width: RECRUITING_OUTREACH_LIST_COL_PCT.leslee, verticalAlign: "top" }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <textarea
                        className="input recruitingInlineNoteInput"
                        rows={4}
                        value={record.lesleeNotes || ""}
                        onChange={(event) => updateRecordLesleeNotes(record.id, event.target.value)}
                        onBlur={() => void handleSaveRecord(record.id)}
                        placeholder="Add Leslee notes"
                      />
                    </td>
                    <td
                      style={{ width: RECRUITING_OUTREACH_LIST_COL_PCT.lastContact, verticalAlign: "top" }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {renderOutreachRecentContacts(record.id, record, person)}
                    </td>
                    <td
                      style={{ width: RECRUITING_OUTREACH_LIST_COL_PCT.actions, verticalAlign: "top" }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="recruitingOutreachActionsCell">
                        {renderOutreachActionButtons(record, person, isLogging)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DraggableTable>
      </div>
    );
  }

  function renderOutreachCards(rowsToRender) {
    if (rowsToRender.length === 0) {
      return (
        <EmptyState
          icon="recruiting"
          title="No contacts in this view"
          description="Add contacts or clear filters to see who to reach out to next."
        />
      );
    }

    return (
      <div className="recruitingMobileCards">
        {rowsToRender.map((row) => {
          const { person, record } = row;
          const draft = buildTeamFormDraft(record);
          const siteLabel = chartDashText(record.site || draft.location);
          const datesLabel = chartDashText(recruitingBoardProjectDatesLabel(record));
          const isLogging = loggingOutreachRecordId === record.id;
          const duplicateInfo = person.email
            ? getDuplicateInfoForEmail(person.email, { excludeRecordId: record.id })
            : null;

          const isSelected = selectedBulkRecordIds.includes(record.id);

          return (
            <div
              key={row.id}
              className={`card pad recruitingMobileCard recruitingOutreachMobileCard${isSelected ? " recruitingOutreachRowSelected" : ""}`}
              onDoubleClick={(event) => handleRecruitingTableRowDoubleClick(event, record.id)}
            >
              <div className="row recruitingOutreachMobileSelectRow">
                <input
                  className="recruitingOutreachSelectInput"
                  type="checkbox"
                  aria-label={`Select ${formatOutreachPersonName(person)}`}
                  checked={isSelected}
                  onChange={() => toggleBulkRecordSelected(record.id)}
                  onClick={(event) => event.stopPropagation()}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <RecruitingRosterBoardColumn record={record} showGender />
                </div>
              </div>
              {renderDuplicateNotice(duplicateInfo, { compact: true })}
              <div className="recruitingOutreachProjectCell" style={{ marginTop: 10 }}>
                <div className="recruitingOutreachProjectSite">{siteLabel}</div>
                <div className="recruitingOutreachProjectDates">{datesLabel}</div>
              </div>
              <div className="recruitingMobileNotes" style={{ marginTop: 10 }} onClick={(event) => event.stopPropagation()}>
                <textarea
                  className="input recruitingInlineNoteInput"
                  rows={3}
                  value={stripHandoffSummary(record.mackaylaNotes)}
                  onChange={(event) => updateRecordMackaylaNotes(record.id, event.target.value)}
                  onBlur={() => void handleSaveRecord(record.id)}
                  placeholder="Mackayla notes"
                />
                <textarea
                  className="input recruitingInlineNoteInput"
                  rows={3}
                  value={record.lesleeNotes || ""}
                  onChange={(event) => updateRecordLesleeNotes(record.id, event.target.value)}
                  onBlur={() => void handleSaveRecord(record.id)}
                  placeholder="Leslee notes"
                />
              </div>
              <div className="small" style={{ marginTop: 10, fontWeight: 700 }}>Last contact</div>
              <div style={{ marginTop: 4 }} onClick={(event) => event.stopPropagation()}>
                {renderOutreachRecentContacts(record.id, record, person)}
              </div>
              <div className="recruitingMobileActions recruitingOutreachActionsCell" onClick={(event) => event.stopPropagation()}>
                {renderOutreachActionButtons(record, person, isLogging)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function toggleBoardSort(setter) {
    return (key) => {
      setter((current) => {
        if (current.key === key) {
          return { key, dir: current.dir === "asc" ? "desc" : "asc" };
        }
        return { key, dir: "asc" };
      });
    };
  }

  const togglePotentialBoardSort = toggleBoardSort(setPotentialBoardSort);
  const toggleOutreachBoardSort = toggleBoardSort(setOutreachBoardSort);
  const toggleConvertedBoardSort = toggleBoardSort(setConvertedBoardSort);

  function renderBoardSortableHeader(label, key, sortState, onToggle, style = {}, className = "") {
    const isActive = sortState.key === key;
    const indicator = isActive ? (sortState.dir === "asc" ? " ↑" : " ↓") : "";
    return (
      <th
        className={`recruitingPotentialSortableTh${className ? ` ${className}` : ""}`}
        style={{ ...style, cursor: "pointer", userSelect: "none" }}
        onClick={() => onToggle(key)}
        title={`Sort by ${label}`}
        aria-sort={isActive ? (sortState.dir === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        {indicator}
      </th>
    );
  }

  function renderPotentialSortableHeader(label, key, style = {}, className = "") {
    return renderBoardSortableHeader(
      label,
      key,
      potentialBoardSort,
      togglePotentialBoardSort,
      style,
      className
    );
  }

  function renderOutreachSortableHeader(label, key, style = {}) {
    return renderBoardSortableHeader(label, key, outreachBoardSort, toggleOutreachBoardSort, style);
  }

  function renderConvertedSortableHeader(label, key, style = {}) {
    return renderBoardSortableHeader(label, key, convertedBoardSort, toggleConvertedBoardSort, style);
  }

  function renderPotentialTable(recordsToRender) {
    if (recordsToRender.length === 0) {
      return (
        <EmptyState
          icon="spark"
          title="No potential teams yet"
          description="Qualified teams will appear here as you add and develop recruiting leads."
        />
      );
    }

    return (
      <div className="recruitingBoardTableHost recruitingPotentialSheetHost">
        <DraggableTable>
        <table
          className={`table recruitingCompactTable recruitingBoardWideTable recruitingBoardTable recruitingPotentialBoardTable recruitingFont-${tableFontSize}`}
        >
          <colgroup>
            <col style={{ width: RECRUITING_POTENTIAL_COL.select }} />
            <col style={{ width: RECRUITING_POTENTIAL_COL.stage }} />
            <col style={{ width: RECRUITING_POTENTIAL_COL.team }} />
            <col style={{ width: RECRUITING_POTENTIAL_COL.roster }} />
            <col style={{ width: RECRUITING_POTENTIAL_COL.projectDates }} />
            <col style={{ width: RECRUITING_POTENTIAL_COL.site }} />
            <col style={{ width: RECRUITING_POTENTIAL_COL.weeks }} />
            <col style={{ width: RECRUITING_POTENTIAL_COL.fundraising }} />
            <col style={{ width: RECRUITING_POTENTIAL_COL.mackayla }} />
            <col style={{ width: RECRUITING_POTENTIAL_COL.leslee }} />
            <col style={{ width: RECRUITING_POTENTIAL_COL.actions }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ minWidth: RECRUITING_POTENTIAL_COL.select }}>
                <input
                  ref={bulkSelectAllRef}
                  className="recruitingOutreachSelectInput"
                  type="checkbox"
                  aria-label="Select all visible teams"
                  checked={allVisibleBulkSelected}
                  onChange={toggleSelectAllVisibleBulk}
                />
              </th>
              {renderPotentialSortableHeader("#", "stage", {
                minWidth: RECRUITING_POTENTIAL_COL.stage,
                textAlign: "center",
              })}
              {renderPotentialSortableHeader("Team", "team", { minWidth: RECRUITING_POTENTIAL_COL.team })}
              {renderPotentialSortableHeader("Team roster", "roster", { minWidth: RECRUITING_POTENTIAL_COL.roster })}
              {renderPotentialSortableHeader("Project dates", "projectDates", {
                minWidth: RECRUITING_POTENTIAL_COL.projectDates,
              })}
              {renderPotentialSortableHeader("Site", "site", { minWidth: RECRUITING_POTENTIAL_COL.site })}
              {renderPotentialSortableHeader("Weeks", "weeks", { minWidth: RECRUITING_POTENTIAL_COL.weeks }, "recruitingPotentialWeeksTh")}
              {renderPotentialSortableHeader(
                "Fundraising",
                "fundraising",
                { minWidth: RECRUITING_POTENTIAL_COL.fundraising },
                "recruitingPotentialFundraisingTh"
              )}
              {renderPotentialSortableHeader("Mackayla notes", "mackayla", {
                minWidth: RECRUITING_POTENTIAL_COL.mackayla,
              })}
              {renderPotentialSortableHeader("Leslee notes", "leslee", {
                minWidth: RECRUITING_POTENTIAL_COL.leslee,
              })}
              <th style={{ minWidth: RECRUITING_POTENTIAL_COL.actions }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordsToRender.map((record, rowIndex) => {
              const attention = getAttentionMeta(record);
              const duplicateInfo = duplicateInfoByRecordId[record.id] || null;
              const rowClass = rowIndex % 2 === 1 ? "recruitingRowAlt" : "";
              const d = buildTeamFormDraft(record);
              const isSelected = selectedBulkRecordIds.includes(record.id);
              const fundraisingValue =
                record?.pendingLockTeamSetup?.fundraisingGoalAmount ??
                d.fundraisingGoalAmount ??
                "";

              return (
                <tr
                  key={record.id}
                  className={`${rowClass}${isSelected ? " recruitingOutreachRowSelected" : ""}`}
                  onDoubleClick={(event) => handleRecruitingTableRowDoubleClick(event, record.id)}
                  style={attention ? { boxShadow: `inset 4px 0 0 ${attention.rowAccent}` } : undefined}
                >
                  <td style={{ minWidth: RECRUITING_POTENTIAL_COL.select, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <div className="recruitingSelectCopyStack">
                      <input
                        className="recruitingOutreachSelectInput"
                        type="checkbox"
                        aria-label={`Select ${record.teamName || formatContactName(record)}`}
                        checked={isSelected}
                        onChange={() => toggleBulkRecordSelected(record.id)}
                      />
                      <RecruitingBoardCopyRowButton record={record} />
                    </div>
                  </td>
                  <td
                    className="recruitingPotentialStageCell"
                    style={{ minWidth: RECRUITING_POTENTIAL_COL.stage, verticalAlign: "middle", textAlign: "center" }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <select
                      className="input recruitingPotentialSheetInput recruitingPotentialStageSelect"
                      value={Number(record.stage) || 0}
                      onChange={(event) =>
                        updateRecordField(record.id, "stage", Number(event.target.value))
                      }
                      onBlur={() => void handleSaveRecord(record.id)}
                      aria-label={`Status for ${record.teamName || formatContactName(record)}`}
                      title={getRecruitingStageLabel(record.stage)}
                    >
                      {RECRUITING_STAGES.map((stage) => (
                        <option key={stage.value} value={stage.value} title={stage.label}>
                          {stage.value}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ minWidth: RECRUITING_POTENTIAL_COL.team, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <div className="recruitingTeamCellMain">
                      <input
                        className="input recruitingPotentialSheetInput"
                        value={record.teamName || ""}
                        onChange={(event) => updateRecordField(record.id, "teamName", event.target.value)}
                        onBlur={() => void handleSaveRecord(record.id)}
                        placeholder="Team name"
                      />
                      {attention ? (
                        <div style={{ marginTop: 6 }}>
                          <span className={`badge ${attention.badgeClass}`}>{attention.label}</span>
                        </div>
                      ) : null}
                      {renderDuplicateNotice(duplicateInfo, { compact: true })}
                    </div>
                  </td>
                  <td style={{ minWidth: RECRUITING_POTENTIAL_COL.roster, verticalAlign: "top" }}>
                    <RecruitingRosterBoardColumn record={record} showGender={false} />
                  </td>
                  <td style={{ minWidth: RECRUITING_POTENTIAL_COL.projectDates, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <input
                      className="input recruitingPotentialSheetInput"
                      value={record.projectDates || ""}
                      onChange={(event) => updateRecordField(record.id, "projectDates", event.target.value)}
                      onBlur={() => void handleSaveRecord(record.id)}
                      placeholder="Dates or season"
                    />
                  </td>
                  <td style={{ minWidth: RECRUITING_POTENTIAL_COL.site, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <select
                      className="input recruitingPotentialSheetInput"
                      value={record.site || d.location || ""}
                      onChange={(event) => updateRecordField(record.id, "site", event.target.value)}
                      onBlur={() => void handleSaveRecord(record.id)}
                    >
                      <option value="">Select site</option>
                      {mergeSiteOptionListWithCurrent(sitePickerLabels, record.site || d.location).map((siteOption) => (
                        <option key={siteOption} value={siteOption}>
                          {siteOption}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ minWidth: RECRUITING_POTENTIAL_COL.weeks, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <input
                      className="input recruitingPotentialSheetInput"
                      type="number"
                      min="0"
                      value={record.weeks ?? ""}
                      onChange={(event) => updateRecordField(record.id, "weeks", event.target.value)}
                      onBlur={() => void handleSaveRecord(record.id)}
                      placeholder="Weeks"
                    />
                  </td>
                  <td style={{ minWidth: RECRUITING_POTENTIAL_COL.fundraising, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <input
                      className="input recruitingPotentialSheetInput recruitingFundingInput"
                      type="number"
                      min="0"
                      step="1"
                      value={fundraisingValue}
                      onChange={(event) =>
                        updatePendingLockField(record.id, "fundraisingGoalAmount", event.target.value)
                      }
                      onBlur={() => void handleSaveRecord(record.id)}
                      placeholder="Goal $"
                    />
                  </td>
                  <td style={{ minWidth: RECRUITING_POTENTIAL_COL.mackayla, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <textarea
                      className="input recruitingInlineNoteInput"
                      rows={3}
                      value={stripHandoffSummary(record.mackaylaNotes)}
                      onChange={(event) => updateRecordMackaylaNotes(record.id, event.target.value)}
                      onBlur={() => void handleSaveRecord(record.id)}
                      placeholder="Add Mackayla notes"
                    />
                  </td>
                  <td style={{ minWidth: RECRUITING_POTENTIAL_COL.leslee, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <textarea
                      className="input recruitingInlineNoteInput"
                      rows={3}
                      value={record.lesleeNotes || ""}
                      onChange={(event) => updateRecordLesleeNotes(record.id, event.target.value)}
                      onBlur={() => void handleSaveRecord(record.id)}
                      placeholder="Add Leslee notes"
                    />
                  </td>
                  <td style={{ minWidth: RECRUITING_POTENTIAL_COL.actions, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <div className="row recruitingActionRow recruitingFitActionRow">
                      <button className="btn" type="button" onClick={() => void openRecordDetails(record.id)}>
                        Edit
                      </button>
                      <button className="btn" type="button" onClick={() => openStaffTaskModal(record)}>
                        Task
                      </button>
                      <button className="btn btnPrimary" type="button" onClick={() => openFormTeamModal(record)}>
                        Lock
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </DraggableTable>
      </div>
    );
  }

  function renderPotentialCards(recordsToRender) {
    if (recordsToRender.length === 0) {
      return (
        <EmptyState
          icon="spark"
          title="No potential teams yet"
          description="Qualified teams will appear here as you add and develop recruiting leads."
        />
      );
    }

    return (
      <div className="recruitingMobileCards">
        {recordsToRender.map((record) => {
          const attention = getAttentionMeta(record);
          const duplicateInfo = duplicateInfoByRecordId[record.id] || null;
          const d = buildTeamFormDraft(record);
          const isSelected = selectedBulkRecordIds.includes(record.id);

          return (
            <div
              key={record.id}
              className={`card pad recruitingMobileCard${isSelected ? " recruitingOutreachRowSelected" : ""}`}
              onDoubleClick={(event) => handleRecruitingTableRowDoubleClick(event, record.id)}
              style={getRecordRowStyle(record, false)}
            >
              <div className="row recruitingOutreachMobileSelectRow">
                <div className="recruitingSelectCopyStack" onClick={(event) => event.stopPropagation()}>
                  <input
                    className="recruitingOutreachSelectInput"
                    type="checkbox"
                    aria-label={`Select ${record.teamName || formatContactName(record)}`}
                    checked={isSelected}
                    onChange={() => toggleBulkRecordSelected(record.id)}
                  />
                  <RecruitingBoardCopyRowButton record={record} />
                </div>
                <div className="recruitingMobileCardHeader" style={{ flex: 1, minWidth: 0 }}>
                <div>
                  <div className="recruitingMobileCardTitle">{record.teamName || formatContactName(record)}</div>
                  <div className="small recruitingMobileCardEmail">
                    {record.contact?.email ? <div>{record.contact.email}</div> : null}
                    {String(record.contact?.phone || "").trim() ? (
                      <div style={{ marginTop: record.contact?.email ? 3 : 0 }}>
                        {String(record.contact.phone).trim()}
                      </div>
                    ) : null}
                    {!record.contact?.email && !String(record.contact?.phone || "").trim() ? "—" : null}
                  </div>
                </div>
                {attention ? (
                  <span className={`badge ${attention.badgeClass}`}>{attention.label}</span>
                ) : null}
              </div>
              </div>
              {renderDuplicateNotice(duplicateInfo, { compact: true })}
              <div className="small" style={{ marginTop: 8 }}>
                <strong>Team roster</strong>
              </div>
              <div style={{ marginTop: 4 }}><RecruitingRosterBoardColumn record={record} showGender={false} /></div>
              <div className="recruitingMobileMeta" onClick={(event) => event.stopPropagation()} style={{ display: "grid", gap: 8 }}>
                <select
                  className="input recruitingPotentialSheetInput recruitingPotentialStageSelect"
                  value={Number(record.stage) || 0}
                  onChange={(event) =>
                    updateRecordField(record.id, "stage", Number(event.target.value))
                  }
                  onBlur={() => void handleSaveRecord(record.id)}
                  aria-label={`Status for ${record.teamName || formatContactName(record)}`}
                  title={getRecruitingStageLabel(record.stage)}
                  style={{ maxWidth: 72, textAlign: "center", justifySelf: "start" }}
                >
                  {RECRUITING_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value} title={stage.label}>
                      {stage.value}
                    </option>
                  ))}
                </select>
                <input
                  className="input recruitingPotentialSheetInput"
                  value={record.teamName || ""}
                  onChange={(event) => updateRecordField(record.id, "teamName", event.target.value)}
                  onBlur={() => void handleSaveRecord(record.id)}
                  placeholder="Team name"
                />
                <input
                  className="input recruitingPotentialSheetInput"
                  value={record.projectDates || ""}
                  onChange={(event) => updateRecordField(record.id, "projectDates", event.target.value)}
                  onBlur={() => void handleSaveRecord(record.id)}
                  placeholder="Project dates"
                />
                <select
                  className="input recruitingPotentialSheetInput"
                  value={record.site || d.location || ""}
                  onChange={(event) => updateRecordField(record.id, "site", event.target.value)}
                  onBlur={() => void handleSaveRecord(record.id)}
                >
                  <option value="">Select site</option>
                  {mergeSiteOptionListWithCurrent(sitePickerLabels, record.site || d.location).map((siteOption) => (
                    <option key={siteOption} value={siteOption}>
                      {siteOption}
                    </option>
                  ))}
                </select>
                <input
                  className="input recruitingPotentialSheetInput"
                  type="number"
                  min="0"
                  value={record.weeks ?? ""}
                  onChange={(event) => updateRecordField(record.id, "weeks", event.target.value)}
                  onBlur={() => void handleSaveRecord(record.id)}
                  placeholder="Weeks"
                />
                <input
                  className="input recruitingPotentialSheetInput recruitingFundingInput"
                  type="number"
                  min="0"
                  step="1"
                  value={
                    record?.pendingLockTeamSetup?.fundraisingGoalAmount ?? d.fundraisingGoalAmount ?? ""
                  }
                  onChange={(event) =>
                    updatePendingLockField(record.id, "fundraisingGoalAmount", event.target.value)
                  }
                  onBlur={() => void handleSaveRecord(record.id)}
                  placeholder="Fundraising goal $"
                />
              </div>
              <div className="recruitingMobileNotes">
                <textarea
                  className="input recruitingInlineNoteInput"
                  rows={4}
                  value={stripHandoffSummary(record.mackaylaNotes)}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => updateRecordMackaylaNotes(record.id, event.target.value)}
                  onBlur={() => void handleSaveRecord(record.id)}
                  placeholder="Add Mackayla notes"
                />
                <textarea
                  className="input recruitingInlineNoteInput"
                  rows={4}
                  value={record.lesleeNotes || ""}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => updateRecordLesleeNotes(record.id, event.target.value)}
                  onBlur={() => void handleSaveRecord(record.id)}
                  placeholder="Add Leslee notes"
                />
              </div>
              <div className="recruitingMobileActions" onClick={(event) => event.stopPropagation()}>
                <button className="btn" type="button" onClick={() => void openRecordDetails(record.id)}>
                  Edit
                </button>
                <button className="btn" type="button" onClick={() => openStaffTaskModal(record)}>
                  Add Task
                </button>
                <button className="btn btnPrimary" type="button" onClick={() => openFormTeamModal(record)}>
                  Lock
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderConvertedTable(recordsToRender) {
    if (recordsToRender.length === 0) {
      return (
        <EmptyState
          icon="archived"
          title="No locked teams yet"
          description="Locked teams will show up here once they’ve been formed into real trips."
        />
      );
    }

    return (
      <div className="recruitingBoardTableHost">
        <DraggableTable>
        <table
          className={`table recruitingCompactTable recruitingBoardSlimTable recruitingBoardTable recruitingFont-${tableFontSize}`}
        >
          <thead>
            <tr>
              {renderConvertedSortableHeader("Team", "team", { width: RECRUITING_CONVERTED_COL_PCT.team })}
              {renderConvertedSortableHeader("Team roster", "roster", {
                width: RECRUITING_CONVERTED_COL_PCT.roster,
              })}
              {renderConvertedSortableHeader("Project dates", "projectDates", {
                width: RECRUITING_CONVERTED_COL_PCT.projectDates,
              })}
              {renderConvertedSortableHeader("Site", "site", { width: RECRUITING_CONVERTED_COL_PCT.site })}
              {renderConvertedSortableHeader("Weeks", "weeks", { width: RECRUITING_CONVERTED_COL_PCT.weeks })}
              {renderConvertedSortableHeader("Mackayla notes", "mackayla", {
                width: RECRUITING_CONVERTED_COL_PCT.mackayla,
              })}
              {renderConvertedSortableHeader("Leslee notes", "leslee", {
                width: RECRUITING_CONVERTED_COL_PCT.leslee,
              })}
              <th style={{ width: RECRUITING_CONVERTED_COL_PCT.actions }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordsToRender.map((record, rowIndex) => {
              const rowClass = rowIndex % 2 === 1 ? "recruitingRowAlt" : "";
              const d = buildTeamFormDraft(record);
              return (
                <tr
                  key={record.id}
                  className={rowClass}
                  onDoubleClick={(event) => handleRecruitingTableRowDoubleClick(event, record.id)}
                >
                  <td style={{ width: RECRUITING_CONVERTED_COL_PCT.team, verticalAlign: "middle" }}>
                    <div className="recruitingTeamCellRow">
                      <div className="recruitingTeamCellMain">
                        <span className="recruitingTeamNamePill" title={record.teamName || record.linkedTrip?.name || ""}>
                          {record.teamName || record.linkedTrip?.name || "—"}
                        </span>
                        {formatRecruitingUpdateMeta(record) ? (
                          <div
                            className="small recruitingUpdatedMeta"
                            style={{ marginTop: 6 }}
                            title={formatRecruitingUpdateMeta(record)}
                          >
                            {formatRecruitingUpdateMeta(record)}
                          </div>
                        ) : null}
                      </div>
                      <RecruitingBoardCopyRowButton record={record} />
                    </div>
                  </td>
                  <td style={{ width: RECRUITING_CONVERTED_COL_PCT.roster, verticalAlign: "top" }}><RecruitingRosterBoardColumn record={record} /></td>
                  <td style={{ width: RECRUITING_CONVERTED_COL_PCT.projectDates, verticalAlign: "top" }}>
                    <div className="recruitingChartCell">{chartDashText(recruitingBoardProjectDatesLabel(record))}</div>
                  </td>
                  <td style={{ width: RECRUITING_CONVERTED_COL_PCT.site, verticalAlign: "top" }}>
                    <div className="recruitingChartCell">{chartDashText(d.location)}</div>
                  </td>
                  <td style={{ width: RECRUITING_CONVERTED_COL_PCT.weeks, verticalAlign: "top" }}>
                    <div className="recruitingChartCell">{chartDashText(recruitingBoardWeeksLabel(record))}</div>
                  </td>
                  <td style={{ width: RECRUITING_CONVERTED_COL_PCT.mackayla, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <textarea
                      className="input recruitingInlineNoteInput"
                      rows={4}
                      value={stripHandoffSummary(record.mackaylaNotes)}
                      onChange={(event) => updateRecordMackaylaNotes(record.id, event.target.value)}
                      onBlur={() => void handleSaveRecord(record.id)}
                      placeholder="Add Mackayla notes"
                    />
                  </td>
                  <td style={{ width: RECRUITING_CONVERTED_COL_PCT.leslee, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <textarea
                      className="input recruitingInlineNoteInput"
                      rows={4}
                      value={record.lesleeNotes || ""}
                      onChange={(event) => updateRecordLesleeNotes(record.id, event.target.value)}
                      onBlur={() => void handleSaveRecord(record.id)}
                      placeholder="Add Leslee notes"
                    />
                  </td>
                  <td
                    className="recruitingConvertedActionsCell"
                    style={{ width: RECRUITING_CONVERTED_COL_PCT.actions, verticalAlign: "top" }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="row recruitingActionRow recruitingFitActionRow recruitingConvertedActionRow">
                      <button
                        className="btn btnPrimary"
                        type="button"
                        onClick={() => void openRecordDetails(record.id)}
                      >
                        Edit
                      </button>
                      <button className="btn" type="button" onClick={() => openStaffTaskModal(record)}>
                        Task
                      </button>
                      {record.convertedTeamId ? (
                        <button className="btn" type="button" onClick={() => router.push(`/trips/${encodeURIComponent(record.convertedTeamId)}`)}>
                          Open Team
                        </button>
                      ) : null}
                      {canUnlockLockedTeams && record.convertedTeamId ? (
                        <button
                          className="btn"
                          type="button"
                          style={RECRUITING_UNLOCK_TEAM_BUTTON_STYLE}
                          disabled={unlockingLockedTeamRecordId === record.id}
                          onClick={() => void handleUnlockLockedTeam(record)}
                        >
                          {unlockingLockedTeamRecordId === record.id ? "Unlocking…" : "Unlock team"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </DraggableTable>
      </div>
    );
  }

  function renderConvertedCards(recordsToRender) {
    if (recordsToRender.length === 0) {
      return (
        <EmptyState
          icon="archived"
          title="No locked teams yet"
          description="Locked teams will show up here once they’ve been formed into real trips."
        />
      );
    }

    return (
      <div className="recruitingMobileCards">
        {recordsToRender.map((record) => {
          const d = buildTeamFormDraft(record);
          return (
          <div
            key={record.id}
            className="card pad recruitingMobileCard"
            onDoubleClick={(event) => handleRecruitingTableRowDoubleClick(event, record.id)}
          >
            <div className="recruitingMobileCardHeader">
              <div>
                <div className="recruitingMobileCardTitle">{record.teamName || record.linkedTrip?.name || "-"}</div>
                <div className="small">{formatContactName(record)}</div>
              </div>
              <span className="badge">{record.linkedTrip?.status || "Locked"}</span>
            </div>
            <div className="small" style={{ marginTop: 8 }}>
              <strong>Team roster</strong>
            </div>
            <div style={{ marginTop: 4 }}><RecruitingRosterBoardColumn record={record} /></div>
            <div className="recruitingMobileMeta">
              <span title="Project dates">{chartDashText(recruitingBoardProjectDatesLabel(record))}</span>
              <span title="Site">{chartDashText(d.location)}</span>
              <span title="Weeks">{chartDashText(recruitingBoardWeeksLabel(record))}</span>
            </div>
            <div className="recruitingMobileNotes">
              <textarea
                className="input recruitingInlineNoteInput"
                rows={4}
                value={stripHandoffSummary(record.mackaylaNotes)}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => updateRecordMackaylaNotes(record.id, event.target.value)}
                onBlur={() => void handleSaveRecord(record.id)}
                placeholder="Add Mackayla notes"
              />
              <textarea
                className="input recruitingInlineNoteInput"
                rows={4}
                value={record.lesleeNotes || ""}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => updateRecordLesleeNotes(record.id, event.target.value)}
                onBlur={() => void handleSaveRecord(record.id)}
                placeholder="Add Leslee notes"
              />
            </div>
            <div className="recruitingMobileActions" onClick={(event) => event.stopPropagation()}>
              <button className="btn btnPrimary" type="button" onClick={() => void openRecordDetails(record.id)}>
                Edit
              </button>
              <button className="btn" type="button" onClick={() => openStaffTaskModal(record)}>
                Add Task
              </button>
              {record.convertedTeamId ? (
                <button className="btn" type="button" onClick={() => router.push(`/trips/${encodeURIComponent(record.convertedTeamId)}`)}>
                  Open Team
                </button>
              ) : null}
              {canUnlockLockedTeams && record.convertedTeamId ? (
                <button
                  className="btn"
                  type="button"
                  style={RECRUITING_UNLOCK_TEAM_BUTTON_STYLE}
                  disabled={unlockingLockedTeamRecordId === record.id}
                  onClick={() => void handleUnlockLockedTeam(record)}
                >
                  {unlockingLockedTeamRecordId === record.id ? "Unlocking…" : "Unlock team"}
                </button>
              ) : null}
            </div>
          </div>
          );
        })}
      </div>
    );
  }

  return (
    <Shell>
      <div className="recruitingTopRow" style={{ marginBottom: 14 }}>
        <div className="recruitingTitleSearchCluster">
          <h1 className="h1" style={{ marginBottom: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <AppIcon name="recruiting" className="pageEyebrowIcon" />
            <span>Recruiting</span>
          </h1>
          <input
            className="input recruitingToolbarSearch recruitingToolbarSearchCompact"
            value={filterConfig.searchQuery}
            onChange={(event) =>
              applyFilter({ ...filterConfig, searchQuery: event.target.value }, "custom")
            }
            placeholder="Search contacts"
            aria-label="Search recruiting contacts"
          />
        </div>
        <div className="recruitingTopRowActions row">
          <select
            className="input recruitingYearSelect"
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            aria-label="Recruiting year"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button className="btn btnPrimary" type="button" onClick={openAddContactModal}>
            Add Contact
          </button>
          <button className="btn" type="button" onClick={() => importInputRef.current?.click()}>
            Add Bulk Contacts
          </button>
        </div>
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

      <div className="recruitingPageStack" style={{ display: "grid", gap: 16 }}>
        <div className="recruitingPageStack" style={{ display: "grid", gap: 16 }}>
          <div className="card pad recruitingBoardCard">
            <div className="recruitingBoardTabs" style={{ marginBottom: 10 }}>
              {RECRUITING_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`${RECRUITING_TAB_META[tab.id]?.toneClass || "recruitingBoardTab"} ${activeTab === tab.id ? "isActive" : ""}`}
                  type="button"
                  onClick={() => handleChangeTab(tab.id)}
                >
                  <span className="recruitingBoardTabLabelRow">
                    <span>{tab.label}</span>
                    <span className="badge">{boardCounts[tab.id] || 0}</span>
                  </span>
                  <span className="recruitingBoardTabDescription">
                    {RECRUITING_TAB_META[tab.id]?.description}
                  </span>
                </button>
              ))}
            </div>

            {activeTab === "outreach" ? (
              <>
                {renderBulkDeleteToolbar("")}
                <div className="recruitingDesktopOnly">{renderOutreachTable(sortedOutreachPersonRows)}</div>
                <div className="recruitingMobileOnly">{renderOutreachCards(sortedOutreachPersonRows)}</div>
              </>
            ) : null}

            {activeTab === "potential" ? (
              <>
                {renderBulkDeleteToolbar(
                  `${potentialTeamRecords.length} teams shown`,
                  <button
                    className="btn"
                    type="button"
                    disabled={isBulkDeleting}
                    onClick={() => void handleBulkMoveToRecruitingList()}
                  >
                    Move to Recruiting list
                  </button>
                )}
                <div className="recruitingDesktopOnly">{renderPotentialTable(sortedPotentialTeamRecords)}</div>
                <div className="recruitingMobileOnly">{renderPotentialCards(sortedPotentialTeamRecords)}</div>
              </>
            ) : null}

            {activeTab === "converted" ? (
              <>
                <div className="recruitingDesktopOnly">{renderConvertedTable(sortedConvertedTeams)}</div>
                <div className="recruitingMobileOnly">{renderConvertedCards(sortedConvertedTeams)}</div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {recordDetailsModalOpen ? (
        <div
          className="appModalOverlay"
          role="presentation"
          onClick={closeRecordDetailsModal}
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
          <div
            className="card pad appModalCard recruitingFormModal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(920px, 100%)", maxHeight: "85vh", overflow: "auto" }}
          >
            <div className="row recruitingFormModalHeader" style={{ marginBottom: 10 }}>
              <div className="recruitingFormModalTitle">Edit team & recruiting</div>
              <div className="spacer" />
              {selectedRecord ? (
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    if (confirmingDeleteRecordId === selectedRecord.id) {
                      void handleDeleteRecord(selectedRecord.id);
                      return;
                    }
                    setConfirmingDeleteRecordId(selectedRecord.id);
                  }}
                  disabled={deletingRecordId === selectedRecord.id}
                  style={{
                    borderColor: "rgba(239,68,68,.28)",
                    color: "var(--danger)",
                    background: "rgba(239,68,68,.08)",
                  }}
                >
                  {deletingRecordId === selectedRecord.id
                    ? "Deleting..."
                    : confirmingDeleteRecordId === selectedRecord.id
                      ? "Confirm Delete"
                      : "Delete"}
                </button>
              ) : null}
              <button className="btn" type="button" onClick={closeRecordDetailsModal}>
                Close
              </button>
            </div>
            {selectedRecord ? (
              <div style={{ display: "grid", gap: 16 }}>
                {(isSavingNotes || pageStatus) ? (
                  <div className="small" style={{ color: isSavingNotes ? "var(--primary)" : "var(--muted)" }}>
                    {isSavingNotes ? "Saving changes..." : pageStatus}
                  </div>
                ) : null}
                {(activeTab === "potential" || activeTab === "outreach") && !selectedRecord.isConvertedToTeam ? (
                      <>
                        <div className="small recruitingFormModalLead">
                          Same fields as <strong>Lock Team</strong>. Saving updates this recruiting row only (does not
                          create a trip).
                        </div>
                        {error ? (
                          <div className="card pad" style={{ color: "var(--danger)" }}>{error}</div>
                        ) : null}
                        <LockTeamFormCards
                          draft={potentialTeamEditDraft}
                          registeredWorkers={registeredWorkers}
                          workersLoadError={workersLoadError}
                          onFieldChange={(field, value) =>
                            setPotentialTeamEditDraft((current) => {
                              const next = { ...current, [field]: value };
                              if (field === "location") {
                                next.host = resolveEffectiveSiteHostName(value, siteBudgetNotes);
                              }
                              return next;
                            })
                          }
                          onMemberChange={(index, field, value) =>
                            setPotentialTeamEditDraft((current) => ({
                              ...current,
                              teamMembers: current.teamMembers.map((member, memberIndex) =>
                                memberIndex === index ? { ...member, [field]: value } : member
                              ),
                            }))
                          }
                          onMemberLink={linkPotentialTeamMember}
                          onMemberTryLink={tryLinkPotentialTeamMember}
                          onAddMember={() =>
                            setPotentialTeamEditDraft((current) => ({
                              ...current,
                              teamMembers: [...current.teamMembers, createEmptyTripTeamMember()],
                            }))
                          }
                          onRemoveMember={(index) =>
                            setPotentialTeamEditDraft((current) => ({
                              ...current,
                              teamMembers:
                                current.teamMembers.length === 1
                                  ? [createEmptyTripTeamMember()]
                                  : current.teamMembers.filter((_, memberIndex) => memberIndex !== index),
                            }))
                          }
                          showMemberTripDates={potentialEditShowMemberTripDates}
                          onToggleMemberTripDates={() =>
                            setPotentialEditShowMemberTripDates((toggle) => !toggle)
                          }
                          memberKeyPrefix={`${selectedRecord.id}-${activeTab}-lock-edit`}
                          sitePickerLabels={sitePickerLabels}
                          mergeSiteOptionListWithCurrent={mergeSiteOptionListWithCurrent}
                        />
                        <div
                          className="row"
                          style={{
                            gap: 8,
                            flexWrap: "wrap",
                            paddingTop: 4,
                            borderTop: "1px solid rgba(15, 23, 42, 0.06)",
                          }}
                        >
                          <button
                            className="btn btnPrimary"
                            type="button"
                            onClick={() => void handleSavePotentialTeamDetails()}
                          >
                            {isSavingNotes ? "Saving..." : "Save record"}
                          </button>
                          {activeTab === "outreach" && !selectedRecord.isPotentialTeam ? (
                            <button
                              className="btn"
                              type="button"
                              disabled={isSavingNotes}
                              onClick={() => void handlePromoteToPotentialTeam(selectedRecord)}
                            >
                              Move to Potential Teams
                            </button>
                          ) : null}
                          {activeTab === "potential" && selectedRecord.isPotentialTeam ? (
                            <button
                              className="btn"
                              type="button"
                              disabled={isSavingNotes}
                              onClick={() => void handleMoveToRecruitingList(selectedRecord)}
                            >
                              Move to Recruiting list
                            </button>
                          ) : null}
                          {!selectedRecord.isConvertedToTeam ? (
                            <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              <select
                                className="input"
                                style={{ width: "auto", minWidth: 110 }}
                                value={moveTargetYear}
                                onChange={(event) => setMoveTargetYear(Number(event.target.value))}
                                aria-label="Move to recruiting year"
                              >
                                {[...new Set([...years, Number(selectedRecord.recruitingYear) + 1, CURRENT_RECRUITING_YEAR + 1])]
                                  .filter((year) => Number(year) !== Number(selectedRecord.recruitingYear))
                                  .sort((a, b) => a - b)
                                  .map((year) => (
                                    <option key={year} value={year}>
                                      {year}
                                    </option>
                                  ))}
                              </select>
                              <button
                                className="btn"
                                type="button"
                                disabled={isSavingNotes || !moveTargetYear}
                                onClick={() => void handleMoveRecordToYear(selectedRecord, moveTargetYear)}
                              >
                                Move to {moveTargetYear}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <>
                    <div className="recruitingFormStack">
                      <div className="small recruitingFormModalLead">
                        Same order as <strong>Lock team</strong> (site & logistics first, then team name & members, then
                        fees and past recruiting details) so values carry over cleanly.
                      </div>
                      {selectedRecord.convertedTeamId ? (
                        <div className="recruitingFormLinkedTrip">
                          <button
                            className="btn btnPrimary"
                            type="button"
                            onClick={() =>
                              router.push(`/trips/${encodeURIComponent(selectedRecord.convertedTeamId)}`)
                            }
                          >
                            Open team trip
                          </button>
                          <div className="small" style={{ marginTop: 8, color: "var(--muted)" }}>
                            Linked to a live trip; recruiting fields stay editable for your chart.
                          </div>
                        </div>
                      ) : null}
                      <RecruitingFormCard
                        tone="team"
                        title="Team name & members"
                        subtitle="★ is the primary recruiting contact (first member when you lock). Phone and gender stay on this roster until the trip exists."
                      >
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Team Name</div>
                          <input
                            className="input"
                            value={selectedRecord.teamName || ""}
                            onChange={(event) => updateSelectedRecord("teamName", event.target.value)}
                            placeholder="2026 Brazil Team"
                          />
                        </div>
                        <div className="recruitingFormMembersHeading">Team Members</div>
                        <div className="recruitingFormMemberList">
                          {selectedRosterRows.map((person, index) => {
                            const isPrimary = index === 0;
                            const duplicateInfo = person.email
                              ? getDuplicateInfoForEmail(person.email, {
                                  excludeRecordId: selectedRecord.id,
                                  ignoreTripIds: ignoreTripIdsForConvertedRecruitingRecord(selectedRecord),
                                })
                              : null;
                            return (
                              <div
                                key={`${selectedRecord.id}-roster-${index}`}
                                className="recruitingFormMemberCard"
                              >
                                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      gap: 6,
                                      flex: "0 0 auto",
                                      paddingTop: 2,
                                    }}
                                  >
                                    <button
                                      type="button"
                                      title={isPrimary ? "Primary contact" : "Set as primary contact"}
                                      aria-label={isPrimary ? "Primary contact" : "Set as primary contact"}
                                      disabled={isPrimary}
                                      onClick={() => setRosterPrimaryForSelectedRecord(index)}
                                      style={{
                                        border: "none",
                                        background: "transparent",
                                        fontSize: "1.2rem",
                                        lineHeight: 1,
                                        padding: "2px 4px",
                                        cursor: isPrimary ? "default" : "pointer",
                                        color: "var(--primary)",
                                      }}
                                    >
                                      {isPrimary ? "★" : "☆"}
                                    </button>
                                    {person.isMinor ? (
                                      <span className="badge" style={{ fontSize: 11, textAlign: "center" }}>
                                        Minor{person.minorAge ? ` ${person.minorAge}` : ""}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 10 }}>
                                    <div
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                        gap: 10,
                                      }}
                                    >
                                      <input
                                        className="input"
                                        value={person.firstName}
                                        onChange={(event) =>
                                          updateRosterRowForSelectedRecord(index, { firstName: event.target.value })
                                        }
                                        placeholder="First name"
                                        autoComplete="given-name"
                                      />
                                      <input
                                        className="input"
                                        value={person.lastName}
                                        onChange={(event) =>
                                          updateRosterRowForSelectedRecord(index, { lastName: event.target.value })
                                        }
                                        placeholder="Last name"
                                        autoComplete="family-name"
                                      />
                                      <input
                                        className="input"
                                        type="email"
                                        value={person.email}
                                        onChange={(event) =>
                                          updateRosterRowForSelectedRecord(index, { email: event.target.value })
                                        }
                                        placeholder="Email"
                                        autoComplete="email"
                                      />
                                    </div>
                                    <div
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                        gap: 10,
                                      }}
                                    >
                                      <div>
                                        <div className="small" style={{ marginBottom: 6 }}>Phone</div>
                                        <input
                                          className="input"
                                          type="tel"
                                          value={person.phone ?? ""}
                                          onChange={(event) =>
                                            updateRosterRowForSelectedRecord(index, { phone: event.target.value })
                                          }
                                          placeholder="Phone"
                                          autoComplete="tel"
                                        />
                                      </div>
                                      <div>
                                        <div className="small" style={{ marginBottom: 6 }}>Gender</div>
                                        <select
                                          className="input"
                                          value={person.gender || ""}
                                          onChange={(event) =>
                                            updateRosterRowForSelectedRecord(index, { gender: event.target.value })
                                          }
                                        >
                                          <option value="">Select</option>
                                          <option value="Male">Male</option>
                                          <option value="Female">Female</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div className="row">
                                      <div className="small" style={{ alignSelf: "center" }}>
                                        Click ☆ to set primary. Lock team uses the same first / last / email / phone layout
                                        for each member.
                                      </div>
                                      <div className="spacer" />
                                      <button
                                        className="btn"
                                        type="button"
                                        disabled={selectedRosterRows.length <= 1}
                                        onClick={() => removeRosterRowForSelectedRecord(index)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                {duplicateInfo ? (
                                  <div style={{ marginTop: 8 }}>
                                    {renderDuplicateNotice(duplicateInfo, { compact: true })}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                        <button className="btn" type="button" onClick={addRosterRowForSelectedRecord}>
                          Add Team Member
                        </button>
                      </RecruitingFormCard>

                      <RecruitingFormCard
                        tone="site"
                        title="Site, stage & timing"
                        subtitle="Site and timing for the recruiting chart. Full trip logistics live in Lock Team."
                      >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: 10,
                        }}
                      >
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Site</div>
                          <select
                            className="input"
                            value={selectedRecord.site || ""}
                            onChange={(event) => updateSelectedRecord("site", event.target.value)}
                          >
                            <option value="">Select site</option>
                            {mergeSiteOptionListWithCurrent(sitePickerLabels, selectedRecord.site).map((siteOption) => (
                              <option key={siteOption} value={siteOption}>
                                {siteOption}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Project Dates</div>
                          <input
                            className="input"
                            value={selectedRecord.projectDates || ""}
                            onChange={(event) => updateSelectedRecord("projectDates", event.target.value)}
                            placeholder="Dates or season"
                          />
                        </div>
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Weeks</div>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            value={selectedRecord.weeks || ""}
                            onChange={(event) => updateSelectedRecord("weeks", event.target.value)}
                            placeholder="Number of weeks"
                          />
                        </div>
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Departure Date</div>
                          <input
                            className="input"
                            value={selectedRecord.departureDate || ""}
                            onChange={(event) => updateSelectedRecord("departureDate", event.target.value)}
                            placeholder="Month, season, or exact date"
                          />
                        </div>
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Stage</div>
                          <select
                            className="input"
                            value={selectedRecord.stage}
                            onChange={(event) => updateSelectedRecord("stage", Number(event.target.value))}
                          >
                            {RECRUITING_STAGES.map((stage) => (
                              <option key={stage.value} value={stage.value}>
                                {stage.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Owner</div>
                          <select
                            className="input"
                            value={selectedRecord.assignedTo || PRIMARY_OWNER}
                            onChange={(event) => updateRecordOwner(selectedRecord.id, event.target.value)}
                          >
                            {OWNER_OPTIONS.map((owner) => (
                              <option key={owner} value={owner}>
                                {owner}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="small" style={{ color: "var(--muted)" }}>
                        Project leave and return, host, site type, training, fees, and extra travel are set in the Lock
                        team dialog.
                      </div>
                      </RecruitingFormCard>

                    <RecruitingFormCard
                      tone="funding"
                      title="Fundraising & pipeline"
                      subtitle="Interest, follow-up, and handoff for Leslee."
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: 10,
                        }}
                      >
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div className="small" style={{ marginBottom: 6 }}>Interested trip / notes</div>
                          <input
                            className="input"
                            value={selectedRecord.interestedTrip || ""}
                            onChange={(event) => updateSelectedRecord("interestedTrip", event.target.value)}
                            placeholder="Trip or program they’re considering"
                          />
                        </div>
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Alumni year</div>
                          <input
                            className="input"
                            value={selectedRecord.alumniYearLabel || ""}
                            onChange={(event) => updateSelectedRecord("alumniYearLabel", event.target.value)}
                            placeholder="e.g. 2024"
                          />
                        </div>
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Priority</div>
                          <input
                            className="input"
                            value={selectedRecord.priority || ""}
                            onChange={(event) => updateSelectedRecord("priority", event.target.value)}
                            placeholder="Optional priority label"
                          />
                        </div>
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Next follow-up</div>
                          <input
                            className="input"
                            type="date"
                            value={
                              selectedRecord.nextFollowUp
                                ? String(selectedRecord.nextFollowUp).slice(0, 10)
                                : ""
                            }
                            onChange={(event) =>
                              updateSelectedRecord("nextFollowUp", event.target.value || "")
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <div className="small" style={{ marginBottom: 6 }}>Boss handoff summary</div>
                        <textarea
                          className="input"
                          rows={3}
                          value={extractHandoffSummary(selectedRecord.mackaylaNotes)}
                          onChange={(event) =>
                            updateRecordHandoffSummary(selectedRecord.id, event.target.value)
                          }
                          placeholder="Short summary for Leslee (stored with Mackayla notes)"
                        />
                      </div>
                    </RecruitingFormCard>

                    <RecruitingFormCard
                      tone="past"
                      title="Recruiting notes"
                      subtitle="Staff notes for Mackayla and Leslee."
                    >
                      <div style={{ display: "grid", gap: 12 }}>
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Mackayla notes</div>
                          <textarea
                            className="input"
                            rows={4}
                            value={stripHandoffSummary(selectedRecord.mackaylaNotes)}
                            onChange={(event) => updateRecordMackaylaNotes(selectedRecord.id, event.target.value)}
                            placeholder="Internal recruiting notes (handoff lives above)"
                          />
                        </div>
                        <div>
                          <div className="small" style={{ marginBottom: 6 }}>Leslee notes</div>
                          <textarea
                            className="input"
                            rows={4}
                            value={selectedRecord.lesleeNotes || ""}
                            onChange={(event) => updateSelectedRecord("lesleeNotes", event.target.value)}
                            placeholder="Leslee follow-up notes"
                          />
                        </div>
                      </div>
                    </RecruitingFormCard>

                    <div
                      className="row"
                      style={{
                        gap: 8,
                        flexWrap: "wrap",
                        paddingTop: 4,
                        borderTop: "1px solid rgba(15, 23, 42, 0.06)",
                      }}
                    >
                      <button className="btn btnPrimary" type="button" onClick={() => handleSaveRecord()}>
                        {isSavingNotes ? "Saving..." : "Save record"}
                      </button>
                      {!selectedRecord.isConvertedToTeam && !selectedRecord.isPotentialTeam ? (
                        <button
                          className="btn"
                          type="button"
                          disabled={isSavingNotes}
                          onClick={() => void handlePromoteToPotentialTeam(selectedRecord)}
                        >
                          Move to Potential Teams
                        </button>
                      ) : null}
                      {!selectedRecord.isConvertedToTeam && selectedRecord.isPotentialTeam ? (
                        <button
                          className="btn"
                          type="button"
                          disabled={isSavingNotes}
                          onClick={() => void handleMoveToRecruitingList(selectedRecord)}
                        >
                          Move to Recruiting list
                        </button>
                      ) : null}
                      {!selectedRecord.isConvertedToTeam ? (
                        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <select
                            className="input"
                            style={{ width: "auto", minWidth: 110 }}
                            value={moveTargetYear}
                            onChange={(event) => setMoveTargetYear(Number(event.target.value))}
                            aria-label="Move to recruiting year"
                          >
                            {[...new Set([...years, Number(selectedRecord.recruitingYear) + 1, CURRENT_RECRUITING_YEAR + 1])]
                              .filter((year) => Number(year) !== Number(selectedRecord.recruitingYear))
                              .sort((a, b) => a - b)
                              .map((year) => (
                                <option key={year} value={year}>
                                  {year}
                                </option>
                              ))}
                          </select>
                          <button
                            className="btn"
                            type="button"
                            disabled={isSavingNotes || !moveTargetYear}
                            onClick={() => void handleMoveRecordToYear(selectedRecord, moveTargetYear)}
                          >
                            Move to {moveTargetYear}
                          </button>
                        </div>
                      ) : null}
                      {canUnlockLockedTeams && selectedRecord.isConvertedToTeam && selectedRecord.convertedTeamId ? (
                        <button
                          className="btn"
                          type="button"
                          style={RECRUITING_UNLOCK_TEAM_BUTTON_STYLE}
                          disabled={unlockingLockedTeamRecordId === selectedRecord.id}
                          onClick={() => void handleUnlockLockedTeam(selectedRecord)}
                        >
                          {unlockingLockedTeamRecordId === selectedRecord.id ? "Unlocking…" : "Unlock team"}
                        </button>
                      ) : null}
                    </div>
                    </div>
                    </>
                    )}
              </div>
            ) : (
              <div className="small">Select a recruiting record to edit.</div>
            )}
          </div>
        </div>
      ) : null}

      <div className="recruitingFontDock" aria-label="Table font size">
        <button
          className="recruitingFontButton"
          type="button"
          onClick={() => adjustTableFont("down")}
          disabled={tableFontSize === "small"}
          aria-label="Smaller recruiting text"
          title="Smaller text"
        >
          a
        </button>
        <button
          className="recruitingFontButton recruitingFontButtonLarge"
          type="button"
          onClick={() => adjustTableFont("up")}
          disabled={tableFontSize === "large"}
          aria-label="Larger recruiting text"
          title="Larger text"
        >
          A
        </button>
      </div>

      {staffTaskModalOpen ? (
        <div
          className="appModalOverlay"
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
          <div className="card pad appModalCard" style={{ width: "min(560px, 100%)" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 900 }}>Add staff task</div>
                <div className="small" style={{ marginTop: 2, color: "var(--muted)" }}>
                  This will show in your My Tasks page.
                </div>
              </div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={() => setStaffTaskModalOpen(false)}>
                Close
              </button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Task</div>
                <input
                  className="input"
                  value={staffTaskDraft.taskName}
                  onChange={(event) =>
                    setStaffTaskDraft((current) => ({
                      ...current,
                      taskName: event.target.value,
                    }))
                  }
                  placeholder="Contact person or team"
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Due date</div>
                <input
                  className="input"
                  type="date"
                  value={staffTaskDraft.dueDate}
                  onChange={(event) =>
                    setStaffTaskDraft((current) => ({
                      ...current,
                      dueDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Notes</div>
                <textarea
                  className="input"
                  rows={4}
                  value={staffTaskDraft.notes}
                  onChange={(event) =>
                    setStaffTaskDraft((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Details to remember"
                />
              </div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button
                className="btn btnPrimary"
                type="button"
                onClick={() => void handleSaveRecruitingStaffTask()}
                disabled={isSavingStaffTask}
              >
                {isSavingStaffTask ? "Saving..." : "Save Staff Task"}
              </button>
              <button className="btn" type="button" onClick={() => setStaffTaskModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {outreachContactModalOpen ? (
        <div
          className="appModalOverlay"
          role="presentation"
          onClick={closeOutreachContactModal}
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
          <div
            className="card pad appModalCard recruitingOutreachContactModal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(420px, 100%)" }}
          >
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>
                {outreachContactDraft.activityId ? "Edit contact notes" : "Log contact"}
              </div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={closeOutreachContactModal}>
                Close
              </button>
            </div>
            {outreachContactDraft.personLabel ? (
              <div className="small" style={{ marginBottom: 12, color: "var(--muted)" }}>
                {outreachContactDraft.personLabel}
              </div>
            ) : null}
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Method</div>
                <select
                  className="input"
                  value={outreachContactDraft.method}
                  disabled={loggingOutreachRecordId === outreachContactDraft.recordId}
                  onChange={(event) =>
                    setOutreachContactDraft((current) => ({
                      ...current,
                      method: event.target.value,
                    }))
                  }
                >
                  <option value="email">Emailed</option>
                  <option value="call">Called</option>
                  <option value="text">Texted</option>
                </select>
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Date</div>
                <input
                  className="input"
                  type="date"
                  value={outreachContactDraft.date}
                  disabled={loggingOutreachRecordId === outreachContactDraft.recordId}
                  onChange={(event) =>
                    setOutreachContactDraft((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Notes</div>
                <textarea
                  className="input"
                  rows={4}
                  value={outreachContactDraft.notes}
                  disabled={loggingOutreachRecordId === outreachContactDraft.recordId}
                  onChange={(event) =>
                    setOutreachContactDraft((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Optional notes about this contact"
                />
              </div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              <button
                className="btn btnPrimary"
                type="button"
                disabled={loggingOutreachRecordId === outreachContactDraft.recordId}
                onClick={() => void handleSaveOutreachContactModal()}
              >
                {loggingOutreachRecordId === outreachContactDraft.recordId
                  ? "Saving..."
                  : outreachContactDraft.activityId
                    ? "Save changes"
                    : "Save contact"}
              </button>
              <button className="btn" type="button" onClick={closeOutreachContactModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addContactModalOpen ? (
        <div
          className="appModalOverlay"
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
          <div className="card pad appModalCard recruitingFormModal" style={{ width: "min(920px, 100%)", maxHeight: "85vh", overflow: "auto" }}>
            <div className="row recruitingFormModalHeader" style={{ marginBottom: 10 }}>
              <div className="recruitingFormModalTitle">Add team & recruiting</div>
              <div className="spacer" />
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setAddContactModalOpen(false);
                  setError("");
                }}
              >
                Close
              </button>
            </div>
            <div className="small recruitingFormModalLead" style={{ marginBottom: 14 }}>
              Same layout as Edit. First and last name are required on the starred primary row; everything else is optional.
              Search for registered workers on each roster row to link an existing profile.
            </div>
            {error ? (
              <div className="card pad" style={{ marginBottom: 14, color: "var(--danger)" }}>
                {error}
              </div>
            ) : null}
            <div className="recruitingFormStack">
              <RecruitingFormCard
                tone="site"
                title="Site, stage & timing"
                subtitle="Fill site, stage, owner, and timing."
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 10,
                  }}
                >
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Stage</div>
                    <select
                      className="input"
                      value={newContactDraft.stage}
                      onChange={(event) =>
                        setNewContactDraft((current) => ({ ...current, stage: Number(event.target.value) }))
                      }
                    >
                      {RECRUITING_STAGES.map((stage) => (
                        <option key={stage.value} value={stage.value}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Owner</div>
                    <select
                      className="input"
                      value={newContactDraft.assignedTo || PRIMARY_OWNER}
                      onChange={(event) =>
                        setNewContactDraft((current) => ({ ...current, assignedTo: event.target.value }))
                      }
                    >
                      {OWNER_OPTIONS.map((owner) => (
                        <option key={owner} value={owner}>
                          {owner}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Site</div>
                    <select
                      className="input"
                      value={newContactDraft.site}
                      onChange={(event) =>
                        setNewContactDraft((current) => ({ ...current, site: event.target.value }))
                      }
                    >
                      <option value="">Select site</option>
                      {mergeSiteOptionListWithCurrent(sitePickerLabels, newContactDraft.site).map((siteOption) => (
                        <option key={siteOption} value={siteOption}>
                          {siteOption}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Project dates</div>
                    <input
                      className="input"
                      value={newContactDraft.projectDates}
                      onChange={(event) =>
                        setNewContactDraft((current) => ({ ...current, projectDates: event.target.value }))
                      }
                      placeholder="Dates or season"
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Weeks</div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={newContactDraft.weeks}
                      onChange={(event) =>
                        setNewContactDraft((current) => ({ ...current, weeks: event.target.value }))
                      }
                      placeholder="Number of weeks"
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Departure date</div>
                    <input
                      className="input"
                      value={newContactDraft.departureDate}
                      onChange={(event) =>
                        setNewContactDraft((current) => ({ ...current, departureDate: event.target.value }))
                      }
                      placeholder="Month, season, or exact date"
                    />
                  </div>
                </div>
              </RecruitingFormCard>

              <RecruitingFormCard
                tone="team"
                title="Team name & roster"
                subtitle="Star (★) is the primary contact. Search for registered workers to link existing profiles. Everyone is on one roster row with first, last, email, phone, gender."
              >
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Team name</div>
                  <input
                    className="input"
                    value={newContactDraft.teamName}
                    onChange={(event) =>
                      setNewContactDraft((current) => ({ ...current, teamName: event.target.value }))
                    }
                    placeholder="Team name"
                  />
                </div>
                <div className="recruitingFormMembersHeading">
                  Roster — click ☆ to choose the primary contact
                </div>
                <div className="recruitingFormMemberList">
                  {(newContactDraft.rosterRows?.length ? newContactDraft.rosterRows : [emptyRosterPerson()]).map(
                    (person, index) => {
                      const isPrimary = index === 0;
                      const duplicateInfo = person.email ? getDuplicateInfoForEmail(person.email) : null;
                      const rowCount = newContactDraft.rosterRows?.length || 1;
                      return (
                        <div
                          key={`new-roster-${index}`}
                          className="recruitingFormMemberCard"
                          style={{ display: "grid", gap: 10 }}
                        >
                          <RecruitingWorkerLookupSearch
                            person={person}
                            workers={registeredWorkers}
                            workersLoadError={workersLoadError}
                            onLink={(worker) => linkNewContactRosterRow(index, worker)}
                          />
                          <div
                            className="row"
                            style={{
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              title={isPrimary ? "Primary contact" : "Set as primary contact"}
                              aria-label={isPrimary ? "Primary contact" : "Set as primary contact"}
                              disabled={isPrimary}
                              onClick={() => setNewContactPrimaryRow(index)}
                              style={{
                                border: "none",
                                background: "transparent",
                                fontSize: "1.2rem",
                                lineHeight: 1,
                                padding: "2px 4px",
                                cursor: isPrimary ? "default" : "pointer",
                                color: "var(--primary)",
                                flex: "0 0 auto",
                              }}
                            >
                              {isPrimary ? "★" : "☆"}
                            </button>
                            {person.isMinor ? (
                              <span className="badge" style={{ flex: "0 0 auto" }}>
                                Minor{person.minorAge ? ` ${person.minorAge}` : ""}
                              </span>
                            ) : null}
                            <input
                              className="input"
                              style={{ minWidth: 90, flex: "1 1 100px" }}
                              value={person.firstName}
                              onChange={(event) =>
                                updateNewContactRosterRow(index, {
                                  firstName: event.target.value,
                                  profileId: "",
                                })
                              }
                              onBlur={() => tryLinkNewContactRosterRow(index)}
                              placeholder="First"
                              autoComplete="given-name"
                            />
                            <input
                              className="input"
                              style={{ minWidth: 90, flex: "1 1 100px" }}
                              value={person.lastName}
                              onChange={(event) =>
                                updateNewContactRosterRow(index, {
                                  lastName: event.target.value,
                                  profileId: "",
                                })
                              }
                              onBlur={() => tryLinkNewContactRosterRow(index)}
                              placeholder="Last"
                              autoComplete="family-name"
                            />
                            <input
                              className="input"
                              type="email"
                              style={{ minWidth: 160, flex: "2 1 180px" }}
                              value={person.email}
                              onChange={(event) =>
                                updateNewContactRosterRow(index, {
                                  email: event.target.value,
                                  profileId: "",
                                })
                              }
                              onBlur={() => tryLinkNewContactRosterRow(index)}
                              placeholder="Email"
                              autoComplete="email"
                            />
                            <input
                              className="input"
                              type="tel"
                              style={{ minWidth: 120, flex: "1 1 120px" }}
                              value={person.phone ?? ""}
                              onChange={(event) =>
                                updateNewContactRosterRow(index, { phone: event.target.value })
                              }
                              placeholder="Phone"
                              autoComplete="tel"
                            />
                            <select
                              className="input"
                              style={{ minWidth: 100, flex: "0 1 110px" }}
                              value={person.gender || ""}
                              onChange={(event) =>
                                updateNewContactRosterRow(index, { gender: event.target.value })
                              }
                            >
                              <option value="">Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                            <button
                              className="btn"
                              type="button"
                              disabled={rowCount <= 1}
                              onClick={() => removeNewContactRosterRow(index)}
                              style={{ flex: "0 0 auto" }}
                            >
                              Remove
                            </button>
                          </div>
                          {duplicateInfo ? (
                            <div style={{ marginTop: 8 }}>{renderDuplicateNotice(duplicateInfo, { compact: true })}</div>
                          ) : null}
                        </div>
                      );
                    }
                  )}
                </div>
                <button className="btn" type="button" onClick={addNewContactRosterRow} style={{ marginTop: 6 }}>
                  Add roster member
                </button>
              </RecruitingFormCard>

              <RecruitingFormCard
                tone="past"
                title="Recruiting notes"
                subtitle="Internal notes for Mackayla and Leslee."
              >
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Mackayla notes</div>
                  <textarea
                    className="input"
                    rows={4}
                    value={newContactDraft.mackaylaNotesBody}
                    onChange={(event) =>
                      setNewContactDraft((current) => ({ ...current, mackaylaNotesBody: event.target.value }))
                    }
                    placeholder="Internal recruiting notes"
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Leslee notes</div>
                  <textarea
                    className="input"
                    rows={4}
                    value={newContactDraft.lesleeNotes}
                    onChange={(event) =>
                      setNewContactDraft((current) => ({ ...current, lesleeNotes: event.target.value }))
                    }
                    placeholder="Leslee follow-up notes"
                  />
                </div>
              </RecruitingFormCard>

              <div className="row" style={{ gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                <button className="btn btnPrimary" type="button" onClick={handleCreateContact}>
                  Save recruiting row
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {formTeamModalOpen ? (
        <div
          className="appModalOverlay"
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
          <div className="card pad appModalCard recruitingFormModal" style={{ width: "min(980px, 100%)", maxHeight: "85vh", overflow: "auto" }}>
            <div className="row recruitingFormModalHeader" style={{ marginBottom: 10 }}>
              <div className="recruitingFormModalTitle">Lock Team</div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={() => setFormTeamModalOpen(false)}>
                Close
              </button>
            </div>
            <div className="small recruitingFormModalLead" style={{ marginBottom: 14 }}>
              This uses the full trip-creation setup and prefills anything we already know from recruiting.
            </div>
            {error ? (
              <div className="card pad" style={{ marginBottom: 14, color: "var(--danger)" }}>
                {error}
              </div>
            ) : null}
            {pageStatus ? (
              <div className="card pad" style={{ marginBottom: 14, color: "var(--primary)" }}>
                {pageStatus}
              </div>
            ) : null}
            <LockTeamFormCards
              draft={teamFormDraft}
              registeredWorkers={registeredWorkers}
              workersLoadError={workersLoadError}
              onFieldChange={updateTeamFormDraft}
              onMemberChange={updateTeamFormMember}
              onMemberLink={linkTeamFormMember}
              onMemberTryLink={tryLinkTeamFormMember}
              onAddMember={addTeamFormMemberRow}
              onRemoveMember={removeTeamFormMemberRow}
              showMemberTripDates={teamFormShowMemberTripDates}
              onToggleMemberTripDates={() => setTeamFormShowMemberTripDates((c) => !c)}
              memberKeyPrefix="form-team-member"
              sitePickerLabels={sitePickerLabels}
              mergeSiteOptionListWithCurrent={mergeSiteOptionListWithCurrent}
            />
            <div className="row" style={{ marginTop: 12 }}>
              <button
                className="btn btnPrimary"
                type="button"
                onClick={handleFormTeam}
                disabled={isFormingTeam}
              >
                {isFormingTeam ? "Locking team..." : "Lock Team"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
