import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import EmptyState from "@/components/EmptyState";
import { showToast } from "@/components/Toast";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { requireSession } from "@/lib/auth";
import { isManagerRole, isStaffRole } from "@/lib/roles";
import {
  RECRUITING_STAGES,
  RECRUITING_UPDATED_EVENT,
  bulkUpdateRecruitingCycleContacts,
  convertRecruitingCycleRecordToTrip,
  deleteRecruitingCycleContact,
  getRecruitingStageLabel,
  importRecruitingContacts,
  listRecruitingActivityLogs,
  listRecruitingContactActivityByIds,
  listLatestRecruitingActivityByIds,
  listRecruitingCycleContacts,
  listRecruitingYears,
  logRecruitingActivity,
  logRecruitingCycleContactAction,
  revertRecruitingLockedTeam,
  saveRecruitingCycleContact,
} from "@/lib/recruitingCycles";
import { buildSiteLabelsOrdered, resolveEffectiveSiteHostName } from "@/lib/siteMaterials";
import { listSiteBudgetNotes } from "@/lib/tripBudget";
import { listTripTeamMembersForDuplicateCheck } from "@/lib/tripTeamMembers";
import { saveStaffMiscTask } from "@/lib/staffTasks";
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
  if (record?.isConvertedToTeam) return "Lock Teams";
  if (record?.isPotentialTeam) return "Potential Teams";
  return "Recruiting";
}

/** Tab id for `activeTab` — must stay aligned with outreachQueue / pipelineRecords / convertedTeams splits. */
function recruitingBoardTabForRecord(record) {
  if (record?.isConvertedToTeam) return "converted";
  if (!record?.isPotentialTeam && Number(record?.stage) <= 1) return "outreach";
  return "potential";
}

function joinLabels(labels) {
  if (labels.length <= 1) return labels[0] || "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

const RECRUITING_BOARD_SORT = ["Recruiting", "Potential Teams", "Lock Teams"];

/** Desktop board tables: percent widths (sum 100%). Team is 8% on every tab; notes columns are largest. */
const RECRUITING_OUTREACH_COL_PCT = {
  team: "8%",
  roster: "13%",
  projectDates: "7%",
  site: "8%",
  weeks: "4%",
  mackayla: "26%",
  leslee: "26%",
  actions: "8%",
};
const RECRUITING_POTENTIAL_COL_PCT = {
  team: "8%",
  roster: "12%",
  projectDates: "7%",
  site: "6%",
  weeks: "6%",
  fundraising: "9%",
  mackayla: "23%",
  leslee: "23%",
  actions: "6%",
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

function RecruitingFormCard({ title, subtitle, children }) {
  return (
    <section
      className="recruitingFormCard"
      style={{
        border: "1px solid rgba(15, 23, 42, 0.1)",
        borderRadius: 14,
        padding: "16px 18px",
        background: "rgba(255, 255, 255, 0.96)",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
        display: "grid",
        gap: 14,
      }}
    >
      <header>
        <div style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>{title}</div>
        {subtitle ? (
          <div className="small" style={{ marginTop: 4, color: "var(--muted)", lineHeight: 1.45 }}>
            {subtitle}
          </div>
        ) : null}
      </header>
      <div style={{ display: "grid", gap: 12 }}>{children}</div>
    </section>
  );
}

/** Same cards / labels as the Lock Team modal — used by Lock Team and Potential Teams edit. */
function LockTeamFormCards({
  draft,
  onFieldChange,
  onMemberChange,
  onAddMember,
  onRemoveMember,
  showMemberTripDates,
  onToggleMemberTripDates,
  memberKeyPrefix,
  sitePickerLabels,
  mergeSiteOptionListWithCurrent,
}) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <RecruitingFormCard title="Site & logistics" subtitle="Project dates, location, and trip logistics.">
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
        title="Team name & members"
        subtitle="Email and phone are optional. Use Different Trip Dates when someone’s leave/return differs from the project."
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
        <div className="row" style={{ flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 800 }}>Team Members</div>
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
        <div style={{ display: "grid", gap: 10 }}>
          {draft.teamMembers.map((member, index) => (
            <div
              key={`${memberKeyPrefix}-${index}`}
              style={{
                border: "1px solid rgba(18, 16, 12, 0.08)",
                borderRadius: 14,
                padding: 12,
                background: "rgba(255,255,255,.72)",
              }}
            >
              <div style={{ display: "grid", gap: 10 }}>
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
                    onChange={(event) => onMemberChange(index, "firstName", event.target.value)}
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                  <input
                    className="input"
                    value={member.lastName}
                    onChange={(event) => onMemberChange(index, "lastName", event.target.value)}
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                  <input
                    className="input"
                    type="email"
                    value={member.email}
                    onChange={(event) => onMemberChange(index, "email", event.target.value)}
                    placeholder="Email (optional)"
                    autoComplete="email"
                  />
                  <input
                    className="input"
                    type="tel"
                    value={member.phone ?? ""}
                    onChange={(event) => onMemberChange(index, "phone", event.target.value)}
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
              </div>
            </div>
          ))}
        </div>
        <button className="btn" type="button" onClick={onAddMember}>
          Add Team Member
        </button>
      </RecruitingFormCard>

      <RecruitingFormCard title="Funding & Fees" subtitle="Defaults match typical trip fee settings; adjust as needed.">
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

function buildPromoteDraft(record) {
  return {
    firstName: record?.contact?.firstName || "",
    lastName: record?.contact?.lastName || "",
    email: record?.contact?.email || "",
    phone: record?.contact?.phone || "",
    gender: record?.contact?.gender || "",
    teamName: record?.teamName || "",
    teamMembers: record?.teamMembers || "",
    stage: Math.max(Number(record?.stage || 0), 2),
    projectDates: record?.projectDates || "",
    site: record?.site || "",
    weeks: record?.weeks || "",
    departureDate: record?.departureDate || "",
    handoffSummary: extractHandoffSummary(record?.mackaylaNotes),
  };
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
  return { firstName: "", lastName: "", email: "", phone: "", gender: "", isMinor: false, minorAge: "" };
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
    gender: "",
    isMinor: false,
    minorAge: "",
    startDate: "",
    endDate: "",
  };
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
  const projectLengthSummary = [weeksLabel, record?.projectDates || ""]
    .filter(Boolean)
    .join(" - ");
  const recruitingDepartureDate = String(record?.departureDate || "").trim();

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
    projectLengthSummary: pending.projectLengthSummary || projectLengthSummary,
    extraTravelStatus: pending.extraTravelStatus || "no",
    startDate:
      pending.startDate !== undefined && pending.startDate !== ""
        ? pending.startDate
        : /^\d{4}-\d{2}-\d{2}$/.test(recruitingDepartureDate)
          ? recruitingDepartureDate
          : "",
    endDate: pending.endDate ?? "",
    fundraisingGoalAmount: pending.fundraisingGoalAmount ?? "",
    tripFeeAmount: pending.tripFeeAmount ?? "",
    materialsFeeAmount: pending.materialsFeeAmount ?? "",
    hasDeferredWorker: pending.hasDeferredWorker || "no",
    hannoverHousingFeeAmount: pending.hannoverHousingFeeAmount ?? "",
    domesticProjectFeeAmount: pending.domesticProjectFeeAmount ?? "",
    domesticFeeAmount: pending.domesticFeeAmount ?? "",
    domesticMaterialsFeeAmount: pending.domesticMaterialsFeeAmount ?? "",
    teamMembers,
    recruitingProjectDates: record?.projectDates || "",
    recruitingWeeks:
      record?.weeks === null || record?.weeks === undefined || record?.weeks === ""
        ? ""
        : String(record.weeks),
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
  const summary = String(getPendingLockSetupRecord(record).projectLengthSummary || "").trim();
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
function RecruitingRosterBoardColumn({ record }) {
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
            {gender ? <div className="recruitingRosterChartGender">{gender}</div> : null}
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

function formatContactActionLabel(actionType) {
  const normalizedAction = String(actionType || "").trim().toLowerCase();
  if (normalizedAction === "email") return "Emailed";
  if (normalizedAction === "call") return "Called";
  if (normalizedAction === "text") return "Texted";
  if (normalizedAction === "bulk email") return "Bulk Emailed";
  if (normalizedAction === "bulk text") return "Bulk Texted";
  return String(actionType || "").trim();
}

function isContactActionType(actionType) {
  return ["email", "call", "text", "bulk email", "bulk text"].includes(
    String(actionType || "").trim().toLowerCase()
  );
}

function formatPreviousContactLabel(entry) {
  const normalizedAction = String(entry?.actionType || "").trim().toLowerCase();
  if (normalizedAction === "email") return "Emailed previously";
  if (normalizedAction === "call") return "Called previously";
  if (normalizedAction === "text") return "Texted previously";
  if (normalizedAction === "bulk email") return "Bulk emailed previously";
  if (normalizedAction === "bulk text") return "Bulk texted previously";
  return `${formatContactActionLabel(entry?.actionType) || "Contacted"} previously`;
}

function formatRecruitingUpdateMeta(record, latestActivity) {
  if (latestActivity?.staffMember || latestActivity?.actionDate) {
    const dateLabel = formatCompactDateTime(latestActivity.actionDate || latestActivity.createdAt);
    const staffLabel = latestActivity.staffMember || "Staff";
    return dateLabel ? `Updated by ${staffLabel} • ${dateLabel}` : `Updated by ${staffLabel}`;
  }

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

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeImportedGender(value) {
  const normalized = String(value || "").trim();
  const compact = normalized.toLowerCase();
  if (!compact) return "";
  if (compact === "f" || compact === "female") return "Female";
  if (compact === "m" || compact === "male") return "Male";
  if (compact === "woman" || compact === "girl") return "Female";
  if (compact === "man" || compact === "boy") return "Male";
  return normalized;
}

function findImportedColumnValue(values, config) {
  const entries = Object.entries(values || {});

  for (const key of config.exactKeys || []) {
    const match = entries.find(([entryKey, entryValue]) => entryKey === key && String(entryValue || "").trim());
    if (match) return match[1];
  }

  for (const includesKey of config.includesKeys || []) {
    const match = entries.find(([entryKey, entryValue]) =>
      entryKey.includes(includesKey) && String(entryValue || "").trim()
    );
    if (match) return match[1];
  }

  return "";
}

function normalizeImportedEmail(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  const emailMatch = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return normalizeEmailValue(emailMatch ? emailMatch[0] : normalized);
}

function normalizeImportedRecruitingYear(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return 2026;
  const yearMatch = normalized.match(/(?:20)?(26|27)/);
  const parsed = Number(yearMatch ? yearMatch[1] : normalized);
  if (parsed === 27) return 2027;
  if (parsed === 26) return 2026;
  return parsed === 2027 ? 2027 : 2026;
}

function parseImportRows(file) {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (!rows.length) return [];

    const headerRow = rows[0].map((value) => normalizeHeader(value));
    const dataRows = rows.slice(1);

    return dataRows.map((row) => {
      const values = Object.fromEntries(
        headerRow.map((header, index) => [header, row[index]])
      );
      const recruitingYear = normalizeImportedRecruitingYear(
        findImportedColumnValue(values, {
          exactKeys: ["year", "years", "yr", "recruitingyear", "recruitingcycleyear", "chartyear", "boardyear"],
          includesKeys: ["year", "chart", "board"],
        })
      );
      const importedEmail = normalizeImportedEmail(
        findImportedColumnValue(values, {
          exactKeys: [
            "email",
            "emails",
            "emailaddress",
            "emailaddresses",
            "primaryemail",
            "emailid",
          ],
          includesKeys: ["email", "mail"],
        })
      );
      const importedGender = normalizeImportedGender(
        values.gender ||
        findImportedColumnValue(values, {
          exactKeys: ["gender", "genders", "g", "sex", "mf", "morf", "genderidentity"],
          includesKeys: ["gender", "sex", "mf", "malefemale"],
        })
      );

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
        email: importedEmail,
        gender: importedGender,
        recruitingYear,
        mackaylaNotes: String(
          values.mackaylanotes ||
          values.mackaylanote ||
          ""
        ).trim(),
        lesleeNotes: String(
          values.lesleenotes ||
          values.lesleenote ||
          ""
        ).trim(),
      };
    });
  });
}

const DEFAULT_FILTER_CONFIG = {
  searchQuery: "",
  stage: "",
  assignedTo: "",
  activeView: "all",
  workflowStatus: "all",
};

const TABLE_FONT_SIZES = ["small", "medium", "large"];

const BULK_ACTION_OPTIONS = [
  { value: "bulk email", label: "Mark Bulk Email Sent" },
  { value: "bulk text", label: "Mark Bulk Text Sent" },
  { value: "bulk note", label: "Add Bulk Note" },
  { value: "follow up", label: "Set Next Follow-Up Date" },
  { value: "assign", label: "Assign To Staff Member" },
  { value: "stage", label: "Change Stage" },
  { value: "move_2027", label: "Move To 2027" },
  { value: "delete", label: "Delete Selected" },
];

const RECRUITING_TABS = [
  { id: "outreach", label: "Recruiting" },
  { id: "potential", label: "Potential Teams" },
  { id: "converted", label: "Lock Teams" },
];

const RECRUITING_TAB_META = {
  outreach: {
    description: "First touches, follow-up, and early interest.",
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

const NEXT_RECRUITING_YEAR = 2027;

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

function getBulkActionDescription(action) {
  if (action === "move_2027") return "Move the selected rows to the 2027 chart.";
  if (action === "delete") return "Permanently remove the selected recruiting rows.";
  if (action === "assign") return "Reassign the selected rows to a staff owner.";
  if (action === "stage") return "Update the stage for all selected rows.";
  if (action === "follow up") return "Set the same next follow-up date for all selected rows.";
  if (action === "bulk email" || action === "bulk text") return "Log one shared outreach touch for everyone selected.";
  return "Add one shared note or update across the selected rows.";
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
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [records, setRecords] = useState([]);
  const [tripTeamMembers, setTripTeamMembers] = useState([]);
  const [siteBudgetNotes, setSiteBudgetNotes] = useState([]);
  const [historyByRecordId, setHistoryByRecordId] = useState({});
  const [historyLoadingByRecordId, setHistoryLoadingByRecordId] = useState({});
  const [latestActivityByRecordId, setLatestActivityByRecordId] = useState({});
  const [contactActivityByRecordId, setContactActivityByRecordId] = useState({});
  const [error, setError] = useState("");
  const [pageStatus, setPageStatus] = useState("");
  const [isFormingTeam, setIsFormingTeam] = useState(false);
  const [filterConfig, setFilterConfig] = useState(DEFAULT_FILTER_CONFIG);
  const [activeFilterId, setActiveFilterId] = useState("all");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  /** Default matches trip Staff Tasks body (13px); use floating +/- for medium/large. */
  const [tableFontSize, setTableFontSize] = useState("small");
  const [activeTab, setActiveTab] = useState("outreach");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedContactHistoryById, setExpandedContactHistoryById] = useState({});
  const [addContactModalOpen, setAddContactModalOpen] = useState(false);
  const [newContactDraft, setNewContactDraft] = useState(() => createEmptyNewContactDraft());
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState([]);
  const [importDestination, setImportDestination] = useState("outreach");
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
  const [confirmingDeleteRecordId, setConfirmingDeleteRecordId] = useState("");
  const [deletingRecordId, setDeletingRecordId] = useState("");
  const [unlockingLockedTeamRecordId, setUnlockingLockedTeamRecordId] = useState("");
  const [contactActionModalOpen, setContactActionModalOpen] = useState(false);
  const [isSavingContactAction, setIsSavingContactAction] = useState(false);
  const [staffTaskModalOpen, setStaffTaskModalOpen] = useState(false);
  const [isSavingStaffTask, setIsSavingStaffTask] = useState(false);
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [recordDetailsModalOpen, setRecordDetailsModalOpen] = useState(false);
  const [recordDetailsMode, setRecordDetailsMode] = useState("details");
  const [promoteDraft, setPromoteDraft] = useState(() => buildPromoteDraft(null));
  const [promotePersonDraft, setPromotePersonDraft] = useState({ name: "", email: "", isMinor: false, minorAge: "" });
  const [formTeamModalOpen, setFormTeamModalOpen] = useState(false);
  const [teamFormDraft, setTeamFormDraft] = useState(() => buildTeamFormDraft(null));
  const [teamFormShowMemberTripDates, setTeamFormShowMemberTripDates] = useState(false);
  const [potentialTeamEditDraft, setPotentialTeamEditDraft] = useState(() => buildTeamFormDraft(null));
  const [potentialEditShowMemberTripDates, setPotentialEditShowMemberTripDates] = useState(false);
  const potentialEditSnapshotKey = useRef("");
  const [contactActionDraft, setContactActionDraft] = useState({
    recordId: "",
    actionType: "email",
    actionDate: new Date().toISOString().slice(0, 10),
    summary: "",
  });
  const [staffTaskDraft, setStaffTaskDraft] = useState({
    recordId: "",
    taskName: "",
    dueDate: "",
    notes: "",
  });
  const importInputRef = useRef(null);
  const historyCacheRef = useRef({});
  const loadingHistoryRef = useRef({});

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
    const useLockStyleEdit =
      activeTab === "potential" || activeTab === "outreach";
    if (!recordDetailsModalOpen || recordDetailsMode !== "details" || !useLockStyleEdit) {
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
  }, [recordDetailsModalOpen, recordDetailsMode, activeTab, selectedRecordId, records]);

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
        const [nextRecords, nextTripTeamMembers, nextSiteNotes] = await Promise.all([
          listRecruitingCycleContacts(selectedYear),
          listTripTeamMembersForDuplicateCheck(),
          listSiteBudgetNotes(),
        ]);
        const [nextLatestActivity, nextContactActivity] = await Promise.all([
          listLatestRecruitingActivityByIds(nextRecords.map((record) => record.id)),
          listRecruitingContactActivityByIds(nextRecords.map((record) => record.id)),
        ]);
        setRecords(nextRecords);
        setTripTeamMembers(nextTripTeamMembers);
        setSiteBudgetNotes(nextSiteNotes);
        setLatestActivityByRecordId(nextLatestActivity);
        setContactActivityByRecordId(nextContactActivity);
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
    setLatestActivityByRecordId({});
    setContactActivityByRecordId({});
  }, [selectedYear]);

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

  const outreachQueue = useMemo(
    () =>
      baseFilteredRecords.filter(
        (record) => !record.isConvertedToTeam && !record.isPotentialTeam && record.stage <= 1
      ),
    [baseFilteredRecords]
  );
  const pipelineRecords = useMemo(
    () =>
      baseFilteredRecords.filter(
        (record) => !record.isConvertedToTeam && (record.isPotentialTeam || record.stage >= 2)
      ),
    [baseFilteredRecords]
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
    if (activeTab === "potential") return pipelineRecords;
    if (activeTab === "converted") return convertedTeams;
    return outreachQueue;
  }, [activeTab, convertedTeams, outreachQueue, pipelineRecords]);

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
      outreach: outreachQueue.length,
      potential: pipelineRecords.length,
      converted: convertedTeams.length,
    }),
    [convertedTeams, outreachQueue, pipelineRecords]
  );
  const bulkActionDescription = getBulkActionDescription(bulkAction);
  const showBulkDateField = bulkAction === "bulk email" || bulkAction === "bulk text";
  const showBulkSummaryField = ["bulk note", "bulk email", "bulk text", "delete"].includes(bulkAction);
  const showBulkStageField = bulkAction === "stage";
  const showBulkFollowUpField = bulkAction === "follow up";
  const showBulkAssignedToField = bulkAction === "assign";

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) || null,
    [records, selectedRecordId]
  );
  const currentHistory = useMemo(
    () => (selectedRecordId ? historyByRecordId[selectedRecordId] || [] : []),
    [historyByRecordId, selectedRecordId]
  );
  const currentContactHistory = useMemo(
    () => currentHistory.filter((entry) => isContactActionType(entry.actionType)),
    [currentHistory]
  );
  const isCurrentHistoryLoading = selectedRecordId
    ? Boolean(historyLoadingByRecordId[selectedRecordId])
    : false;
  const isCurrentContactHistoryExpanded = selectedRecordId
    ? Boolean(expandedContactHistoryById[selectedRecordId])
    : false;
  const visibleCurrentContactHistory = isCurrentContactHistoryExpanded
    ? currentContactHistory
    : currentContactHistory.slice(0, 3);
  const showCurrentContactHistoryToggle = currentContactHistory.length > 3;

  useEffect(() => {
    const searchTrim = String(filterConfig.searchQuery || "").trim();

    if (searchTrim && baseFilteredRecords.length > 0) {
      if (recordsForActiveTab.length === 0) {
        const next = baseFilteredRecords[0];
        setActiveTab(recruitingBoardTabForRecord(next));
        setSelectedRecordId(next.id);
        return;
      }

      if (!baseFilteredRecords.some((record) => record.id === selectedRecordId)) {
        const next = baseFilteredRecords[0];
        setActiveTab(recruitingBoardTabForRecord(next));
        setSelectedRecordId(next.id);
        return;
      }

      if (!recordsForActiveTab.some((record) => record.id === selectedRecordId)) {
        const next =
          baseFilteredRecords.find((record) => record.id === selectedRecordId) || baseFilteredRecords[0];
        setActiveTab(recruitingBoardTabForRecord(next));
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
  }, [baseFilteredRecords, filterConfig.searchQuery, recordsForActiveTab, selectedRecordId]);

  useEffect(() => {
    if (!selectedRecordId || activeTab === "potential") return;
    void ensureRecordHistoryLoaded(selectedRecordId);
  }, [activeTab, selectedRecordId]);

  const sitePickerLabels = useMemo(() => buildSiteLabelsOrdered(siteBudgetNotes), [siteBudgetNotes]);

  async function refreshCurrentYear() {
    const [nextRecords, nextTripTeamMembers, nextSiteNotes] = await Promise.all([
      listRecruitingCycleContacts(selectedYear),
      listTripTeamMembersForDuplicateCheck(),
      listSiteBudgetNotes(),
    ]);
    const [nextLatestActivity, nextContactActivity] = await Promise.all([
      listLatestRecruitingActivityByIds(nextRecords.map((record) => record.id)),
      listRecruitingContactActivityByIds(nextRecords.map((record) => record.id)),
    ]);
    setRecords(nextRecords);
    setTripTeamMembers(nextTripTeamMembers);
    setSiteBudgetNotes(nextSiteNotes);
    setLatestActivityByRecordId(nextLatestActivity);
    setContactActivityByRecordId(nextContactActivity);
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
  const promotePeople = useMemo(
    () => parseTeamMemberEntries(promoteDraft.teamMembers),
    [promoteDraft.teamMembers]
  );
  const promotePersonDuplicateInfo = useMemo(
    () => getDuplicateInfoForEmail(promotePersonDraft.email),
    [promotePersonDraft.email, duplicateSourceLookup]
  );
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterConfig.searchQuery) count += 1;
    if (filterConfig.stage !== "") count += 1;
    if (filterConfig.assignedTo) count += 1;
    if (activeFilterId && !["all", "custom"].includes(activeFilterId)) count += 1;
    return count;
  }, [activeFilterId, filterConfig]);

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
      setLatestActivityByRecordId((current) => ({
        ...current,
        [recordId]: rows[0] || current[recordId] || null,
      }));
      setContactActivityByRecordId((current) => ({
        ...current,
        [recordId]: rows.filter((entry) => isContactActionType(entry.actionType)),
      }));
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

  async function handleImportFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsedRows = await parseImportRows(file);
      setImportPreviewRows(parsedRows);
      setImportDestination("outreach");
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
      destination: importDestination,
      staffMember: session?.name || session?.email || "Staff",
    });

    setImportSummary(
      `Imported ${result.createdCount} contacts • Skipped ${result.duplicateCount} duplicates • Ignored ${result.ignoredCount} invalid rows`
    );
    setImportSummary([
      `Saved ${result.createdCount} imported contacts to the recruiting database`,
      `Skipped ${result.duplicateCount} duplicates`,
      `Ignored ${result.ignoredCount} invalid rows`,
    ].join(" | "));
    setImportDuplicates(result.duplicates);
    setImportPreviewRows([]);
    setImportDestination("outreach");
    setImportModalOpen(false);
    await refreshCurrentYear();
  }

  async function handleCreateContact() {
    const rows =
      newContactDraft.rosterRows?.length > 0 ? newContactDraft.rosterRows : [emptyRosterPerson()];
    const primary = rows[0];
    if (!String(primary.firstName || "").trim() || !String(primary.lastName || "").trim()) {
      setError("First and last name are required for the starred primary contact.");
      return;
    }
    const teamMembers = buildTeamMembersFromRosterRows(rows, 0);
    if (notifyDuplicateTeamName(newContactDraft.teamName)) {
      return;
    }
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
          stage: Number(newContactDraft.stage),
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
          isPotentialTeam: false,
        },
        { requireContactNames: true }
      );

      setNewContactDraft(createEmptyNewContactDraft());
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

  function handlePromote(record) {
    setSelectedRecordId(record.id);
    setPromoteDraft(buildPromoteDraft(record));
    setPromotePersonDraft({ name: "", email: "", isMinor: false, minorAge: "" });
    setPromoteModalOpen(true);
    setError("");
  }

  async function handleConfirmPromote() {
    const record = records.find((item) => item.id === selectedRecordId);
    if (!record) return;
    if (notifyDuplicateTeamName(promoteDraft.teamName, { excludeRecordId: record.id })) {
      return;
    }

    await saveRecruitingCycleContact(
      buildRecruitingRecordPayload(record, {
        firstName: promoteDraft.firstName,
        lastName: promoteDraft.lastName,
        email: promoteDraft.email,
        phone: promoteDraft.phone,
        gender: promoteDraft.gender,
        isPotentialTeam: true,
        stage: Math.max(Number(promoteDraft.stage || 0), 2),
        assignedTo: BOSS_OWNER,
        teamName: promoteDraft.teamName,
        teamMembers: promoteDraft.teamMembers,
        projectDates: promoteDraft.projectDates,
        site: promoteDraft.site,
        weeks: promoteDraft.weeks,
        departureDate: promoteDraft.departureDate,
        mackaylaNotes: buildMackaylaNotes(
          stripHandoffSummary(record.mackaylaNotes),
          promoteDraft.handoffSummary
        ),
      })
    );

    await logRecruitingCycleContactAction({
      record,
      actionType: "handoff",
      actionDate: new Date().toISOString(),
      staffMember: session?.name || session?.email || "Staff",
      summary: String(promoteDraft.handoffSummary || "").trim()
        ? `Ready for boss handoff: ${String(promoteDraft.handoffSummary).trim()}`
        : "Moved to Potential Teams.",
      stage: Math.max(Number(promoteDraft.stage || 0), 2),
    });

    setError("");
    setPromoteModalOpen(false);
    handleChangeTab("potential");
    setSelectedRecordId(record.id);
    setRecordDetailsMode("details");
    setRecordDetailsModalOpen(true);
    await refreshCurrentYear();
    await ensureRecordHistoryLoaded(record.id, { force: true });
  }

  async function handleAdvanceStage(record) {
    await saveRecruitingCycleContact(
      buildRecruitingRecordPayload(record, {
        stage: Math.min(record.stage + 1, 3),
      })
    );
    await refreshCurrentYear();
  }

  async function openRecordDetails(recordId, mode = "details") {
    if (!recordId) return;
    setSelectedRecordId(recordId);
    setConfirmingDeleteRecordId("");
    setRecordDetailsMode(mode);
    setRecordDetailsModalOpen(true);
    setPageStatus("");
    setError("");
    await ensureRecordHistoryLoaded(recordId);
  }

  function closeRecordDetailsModal() {
    setRecordDetailsModalOpen(false);
    setSelectedRecordId("");
    setConfirmingDeleteRecordId("");
    setRecordDetailsMode("details");
    setError("");
  }

  /** Desktop table: double-click row to open edit; ignore when interacting with controls. */
  function handleRecruitingTableRowDoubleClick(event, recordId) {
    if (event.target.closest("button, a, input, textarea, select, label")) return;
    void openRecordDetails(recordId, "details");
  }

  async function handleDeleteRecord(recordId = selectedRecordId) {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;

    try {
      setDeletingRecordId(record.id);
      await deleteRecruitingCycleContact(record.id);
      closeRecordDetailsModal();
      setPageStatus(`${record.teamName || formatContactName(record)} deleted.`);
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
        ...teamFormDraft,
      });

      await refreshCurrentYear();
      setFormTeamModalOpen(false);
      handleChangeTab("converted");
      setSelectedRecordId(result?.record?.id || selectedRecord.id);
      setPageStatus(
        result?.status === "already_converted"
          ? "Trip already added. Moved to Lock Teams."
          : "Trip added. Moved to Lock Teams."
      );
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

  function handleDownloadTemplate() {
    const csv = [
      "First Name,Last Name,Email,Gender,Year,Mackayla Notes,Leslee Notes",
      'John,Smith,john@email.com,M,2027,"Interested in summer project","Follow up after spring break"',
      'Sarah,Lee,sarah@email.com,F,,"Alumni referral","Prefers email contact"',
    ].join("\n");
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
    if (bulkAction === "move_2027") {
      try {
        setIsSavingNotes(true);
        const selectedRecords = records.filter((record) => selectedIds.includes(record.id));

        await Promise.all(
          selectedRecords.map(async (record) => {
            await saveRecruitingCycleContact(
              buildRecruitingRecordPayload(record, {
                recruitingYear: NEXT_RECRUITING_YEAR,
              })
            );
            await logRecruitingActivity({
              recruitingCycleContactId: record.id,
              actionType: "update",
              actionDate: new Date().toISOString(),
              staffMember: session?.name || session?.email || "Staff",
              summary: `Moved recruiting record to ${NEXT_RECRUITING_YEAR}.`,
            });
          })
        );

        setPageStatus(`Moved ${selectedRecords.length} contact${selectedRecords.length === 1 ? "" : "s"} to ${NEXT_RECRUITING_YEAR}.`);
        setError("");
      } catch (bulkError) {
        console.error(`Unable to move recruiting records to ${NEXT_RECRUITING_YEAR}`, bulkError);
        setError(bulkError.message || `Unable to move selected contacts to ${NEXT_RECRUITING_YEAR}.`);
      } finally {
        setIsSavingNotes(false);
      }

      setBulkModalOpen(false);
      setSelectedIds([]);
      setBulkSummary("");
      setBulkStage("");
      setBulkNextFollowUp("");
      setBulkAssignedTo("");
      await refreshCurrentYear();
      return;
    }

    if (bulkAction === "delete") {
      const confirmed = window.confirm(`Delete ${selectedIds.length} selected contact${selectedIds.length === 1 ? "" : "s"}?`);
      if (!confirmed) return;

      try {
        setIsSavingNotes(true);
        await Promise.all(selectedIds.map((id) => deleteRecruitingCycleContact(id)));
        setPageStatus(`Deleted ${selectedIds.length} contact${selectedIds.length === 1 ? "" : "s"}.`);
        setError("");
      } catch (bulkError) {
        console.error("Unable to delete selected recruiting contacts", bulkError);
        setError(bulkError.message || "Unable to delete selected contacts.");
      } finally {
        setIsSavingNotes(false);
      }

      setBulkModalOpen(false);
      setSelectedIds([]);
      setBulkSummary("");
      setBulkStage("");
      setBulkNextFollowUp("");
      setBulkAssignedTo("");
      await refreshCurrentYear();
      return;
    }

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
    if (notifyDuplicateTeamName(recordToSave.teamName, { excludeRecordId: recordToSave.id })) {
      return;
    }

    try {
      setIsSavingNotes(true);
      await saveRecruitingCycleContact(buildRecruitingRecordPayload(recordToSave));
      await logRecruitingActivity({
        recruitingCycleContactId: recordId,
        actionType: "update",
        actionDate: new Date().toISOString(),
        staffMember: session?.name || session?.email || "Staff",
        summary: "Updated recruiting details.",
      });
      await refreshCurrentYear();
      await ensureRecordHistoryLoaded(recordId, { force: true });
      closeRecordDetailsModal();
      setPageStatus("Saved.");
    } catch (saveError) {
      console.error("Unable to save recruiting record", saveError);
      setError(saveError.message || "Unable to save record.");
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleSavePotentialTeamDetails() {
    const record = records.find((item) => item.id === selectedRecordId);
    if (!record) return;
    const d = potentialTeamEditDraft;
    if (notifyDuplicateTeamName(d.name, { excludeRecordId: record.id })) {
      return;
    }
    const primary = d.teamMembers[0] || createEmptyTripTeamMember();
    if (!String(primary.firstName || "").trim() || !String(primary.lastName || "").trim()) {
      setError("First and last name are required for the first team member.");
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
      await logRecruitingActivity({
        recruitingCycleContactId: record.id,
        actionType: "update",
        actionDate: new Date().toISOString(),
        staffMember: session?.name || session?.email || "Staff",
        summary: "Updated recruiting details (lock-form fields).",
      });
      await refreshCurrentYear();
      await ensureRecordHistoryLoaded(record.id, { force: true });
      closeRecordDetailsModal();
      setPageStatus("Saved.");
      potentialEditSnapshotKey.current = "";
    } catch (saveError) {
      console.error("Unable to save recruiting record", saveError);
      setError(saveError.message || "Unable to save record.");
      setPageStatus("");
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleMoveRecordToNextYear(recordId = selectedRecordId) {
    const recordToMove = records.find((record) => record.id === recordId);
    if (!recordToMove) return;

    try {
      setIsSavingNotes(true);
      await saveRecruitingCycleContact(
        buildRecruitingRecordPayload(recordToMove, {
          recruitingYear: NEXT_RECRUITING_YEAR,
        })
      );
      await logRecruitingActivity({
        recruitingCycleContactId: recordId,
        actionType: "update",
        actionDate: new Date().toISOString(),
        staffMember: session?.name || session?.email || "Staff",
        summary: `Moved recruiting record to ${NEXT_RECRUITING_YEAR}.`,
      });
      await refreshCurrentYear();
      closeRecordDetailsModal();
      setPageStatus(`Moved to ${NEXT_RECRUITING_YEAR}.`);
    } catch (moveError) {
      console.error(`Unable to move recruiting record to ${NEXT_RECRUITING_YEAR}`, moveError);
      setError(moveError.message || `Unable to move record to ${NEXT_RECRUITING_YEAR}.`);
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

  function handleAddPersonToPromoteDraft() {
    const nextEntry = {
      name: promotePersonDraft.name,
      email: promotePersonDraft.email,
      isMinor: promotePersonDraft.isMinor,
      minorAge: promotePersonDraft.isMinor ? promotePersonDraft.minorAge : "",
    };
    const formattedEntry = formatTeamMemberEntry(nextEntry);
    if (!formattedEntry) return;

    setPromoteDraft((current) => ({
      ...current,
      teamMembers: buildTeamMembersText([...promotePeople, nextEntry]),
    }));
    setPromotePersonDraft({ name: "", email: "", isMinor: false, minorAge: "" });
  }

  function handleRemovePersonFromPromoteDraft(indexToRemove) {
    setPromoteDraft((current) => ({
      ...current,
      teamMembers: buildTeamMembersText(
        parseTeamMemberEntries(current.teamMembers).filter((_, index) => index !== indexToRemove)
      ),
    }));
  }

  function openContactActionModal(record, actionType) {
    if (!record?.id) return;
    setContactActionDraft({
      recordId: record.id,
      actionType,
      actionDate: new Date().toISOString().slice(0, 10),
      summary: "",
    });
    setContactActionModalOpen(true);
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

  async function handleSaveContactAction() {
    const record = records.find((entry) => entry.id === contactActionDraft.recordId);
    if (!record) return;

    const trimmedDateInput = String(contactActionDraft.actionDate || "").trim();
    const parsedActionDate = /^\d{4}-\d{2}-\d{2}$/.test(trimmedDateInput)
      ? new Date(`${trimmedDateInput}T12:00:00`)
      : new Date(trimmedDateInput);

    if (Number.isNaN(parsedActionDate.getTime())) {
      setError("Enter a valid action date.");
      return;
    }

    try {
      setIsSavingContactAction(true);
      await logRecruitingCycleContactAction({
        record,
        actionType: contactActionDraft.actionType,
        actionDate: parsedActionDate.toISOString(),
        staffMember: session?.name || session?.email || "Staff",
        summary: contactActionDraft.summary,
        stage: ["email", "call", "text"].includes(contactActionDraft.actionType)
          ? Math.max(record.stage, 1)
          : undefined,
      });
      setContactActionModalOpen(false);
      setContactActionDraft({
        recordId: "",
        actionType: "email",
        actionDate: new Date().toISOString().slice(0, 10),
        summary: "",
      });
      setError("");
      setPageStatus("Contact saved.");
      await refreshCurrentYear();
      await ensureRecordHistoryLoaded(record.id, { force: true });
    } catch (saveError) {
      console.error("Unable to save recruiting contact action", saveError);
      setError(saveError.message || "Unable to save contact action.");
    } finally {
      setIsSavingContactAction(false);
    }
  }

  function openAddContactModal() {
    setNewContactDraft(createEmptyNewContactDraft());
    setError("");
    setAddContactModalOpen(true);
  }

  function toggleContactHistoryExpanded(recordId) {
    setExpandedContactHistoryById((current) => ({
      ...current,
      [recordId]: !current[recordId],
    }));
  }

  function renderOutreachTable(recordsToRender) {
    if (recordsToRender.length === 0) {
      return (
        <EmptyState
          icon="recruiting"
          title="No contacts in this view"
          description="Once recruiting rows match this view, they’ll show up here with notes, outreach, and follow-up details."
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
              <th style={{ width: RECRUITING_OUTREACH_COL_PCT.team }}>Team</th>
              <th style={{ width: RECRUITING_OUTREACH_COL_PCT.roster }}>Team roster</th>
              <th style={{ width: RECRUITING_OUTREACH_COL_PCT.projectDates }}>Project dates</th>
              <th style={{ width: RECRUITING_OUTREACH_COL_PCT.site }}>Site</th>
              <th style={{ width: RECRUITING_OUTREACH_COL_PCT.weeks }}>Weeks</th>
              <th style={{ width: RECRUITING_OUTREACH_COL_PCT.mackayla }}>Mackayla notes</th>
              <th style={{ width: RECRUITING_OUTREACH_COL_PCT.leslee }}>Leslee notes</th>
              <th style={{ width: RECRUITING_OUTREACH_COL_PCT.actions }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordsToRender.map((record, rowIndex) => {
              const attention = getAttentionMeta(record);
              const duplicateInfo = duplicateInfoByRecordId[record.id] || null;
              const rowClass = rowIndex % 2 === 1 ? "recruitingRowAlt" : "";
              const d = buildTeamFormDraft(record);

              return (
                <tr
                  key={record.id}
                  className={rowClass}
                  onDoubleClick={(event) => handleRecruitingTableRowDoubleClick(event, record.id)}
                  style={attention ? { boxShadow: `inset 4px 0 0 ${attention.rowAccent}` } : undefined}
                >
                  <td style={{ width: RECRUITING_OUTREACH_COL_PCT.team, verticalAlign: "middle" }}>
                    <div className="recruitingTeamCellRow">
                      <div className="recruitingTeamCellMain">
                        <span className="recruitingTeamNamePill" title={record.teamName || formatContactName(record)}>
                          {record.teamName || formatContactName(record) || "—"}
                        </span>
                        {attention ? (
                          <div style={{ marginTop: 6 }}>
                            <span className={`badge ${attention.badgeClass}`}>{attention.label}</span>
                          </div>
                        ) : null}
                        {renderDuplicateNotice(duplicateInfo, { compact: true })}
                      </div>
                      <RecruitingBoardCopyRowButton record={record} />
                    </div>
                  </td>
                  <td style={{ width: RECRUITING_OUTREACH_COL_PCT.roster, verticalAlign: "top" }}><RecruitingRosterBoardColumn record={record} /></td>
                  <td style={{ width: RECRUITING_OUTREACH_COL_PCT.projectDates, verticalAlign: "top" }}>
                    <div className="recruitingChartCell">{chartDashText(recruitingBoardProjectDatesLabel(record))}</div>
                  </td>
                  <td style={{ width: RECRUITING_OUTREACH_COL_PCT.site, verticalAlign: "top" }}>
                    <div className="recruitingChartCell">{chartDashText(d.location)}</div>
                  </td>
                  <td style={{ width: RECRUITING_OUTREACH_COL_PCT.weeks, verticalAlign: "top" }}>
                    <div className="recruitingChartCell">{chartDashText(recruitingBoardWeeksLabel(record))}</div>
                  </td>
                  <td style={{ width: RECRUITING_OUTREACH_COL_PCT.mackayla, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <textarea
                      className="input recruitingInlineNoteInput"
                      rows={4}
                      value={stripHandoffSummary(record.mackaylaNotes)}
                      onChange={(event) => updateRecordMackaylaNotes(record.id, event.target.value)}
                      onBlur={() => void handleSaveRecord(record.id)}
                      placeholder="Add Mackayla notes"
                    />
                  </td>
                  <td style={{ width: RECRUITING_OUTREACH_COL_PCT.leslee, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <textarea
                      className="input recruitingInlineNoteInput"
                      rows={4}
                      value={record.lesleeNotes || ""}
                      onChange={(event) => updateRecordLesleeNotes(record.id, event.target.value)}
                      onBlur={() => void handleSaveRecord(record.id)}
                      placeholder="Add Leslee notes"
                    />
                  </td>
                  <td style={{ width: RECRUITING_OUTREACH_COL_PCT.actions, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <div className="row recruitingActionRow recruitingFitActionRow">
                      <button className="btn btnPrimary" type="button" onClick={() => void openRecordDetails(record.id, "details")}>Edit</button>
                      <button className="btn" type="button" onClick={() => openStaffTaskModal(record)}>Task</button>
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

  function renderOutreachCards(recordsToRender) {
    if (recordsToRender.length === 0) {
      return (
        <EmptyState
          icon="recruiting"
          title="No contacts in this view"
          description="Once recruiting rows match this view, they’ll show up here with notes, outreach, and follow-up details."
        />
      );
    }

    return (
      <div className="recruitingMobileCards">
        {recordsToRender.map((record) => {
          const attention = getAttentionMeta(record);
          const duplicateInfo = duplicateInfoByRecordId[record.id] || null;
          const d = buildTeamFormDraft(record);

          return (
            <div
              key={record.id}
              className="card pad recruitingMobileCard"
              onDoubleClick={(event) => handleRecruitingTableRowDoubleClick(event, record.id)}
              style={getRecordRowStyle(record, false)}
            >
              <div className="recruitingMobileCardHeader">
                <div>
                  <div className="recruitingMobileCardTitle">
                    {record.teamName || formatContactName(record) || "—"}
                  </div>
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
              {renderDuplicateNotice(duplicateInfo, { compact: true })}
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
                <button className="btn btnPrimary" type="button" onClick={() => void openRecordDetails(record.id, "details")}>Edit</button>
                <button className="btn" type="button" onClick={() => openStaffTaskModal(record)}>Add Task</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderPotentialTable(recordsToRender) {
    if (recordsToRender.length === 0) {
      return (
        <EmptyState
          icon="spark"
          title="No potential teams yet"
          description="Qualified contacts and teams will appear here once they move beyond early outreach."
        />
      );
    }

    return (
      <div className="recruitingBoardTableHost">
        <DraggableTable>
        <table
          className={`table recruitingCompactTable recruitingBoardSlimTable recruitingBoardTable recruitingPotentialBoardTable recruitingFont-${tableFontSize}`}
        >
          <thead>
            <tr>
              <th style={{ width: RECRUITING_POTENTIAL_COL_PCT.team }}>Team</th>
              <th style={{ width: RECRUITING_POTENTIAL_COL_PCT.roster }}>Team roster</th>
              <th style={{ width: RECRUITING_POTENTIAL_COL_PCT.projectDates }}>Project dates</th>
              <th style={{ width: RECRUITING_POTENTIAL_COL_PCT.site }}>Site</th>
              <th className="recruitingPotentialWeeksTh" style={{ width: RECRUITING_POTENTIAL_COL_PCT.weeks }}>
                Weeks
              </th>
              <th className="recruitingPotentialFundraisingTh" style={{ width: RECRUITING_POTENTIAL_COL_PCT.fundraising }}>
                Fundraising
              </th>
              <th style={{ width: RECRUITING_POTENTIAL_COL_PCT.mackayla }}>Mackayla notes</th>
              <th style={{ width: RECRUITING_POTENTIAL_COL_PCT.leslee }}>Leslee notes</th>
              <th style={{ width: RECRUITING_POTENTIAL_COL_PCT.actions }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordsToRender.map((record, rowIndex) => {
              const attention = getAttentionMeta(record);
              const duplicateInfo = duplicateInfoByRecordId[record.id] || null;
              const rowClass = rowIndex % 2 === 1 ? "recruitingRowAlt" : "";
              const d = buildTeamFormDraft(record);

              return (
                <tr
                  key={record.id}
                  className={rowClass}
                  onDoubleClick={(event) => handleRecruitingTableRowDoubleClick(event, record.id)}
                  style={attention ? { boxShadow: `inset 4px 0 0 ${attention.rowAccent}` } : undefined}
                >
                  <td style={{ width: RECRUITING_POTENTIAL_COL_PCT.team, verticalAlign: "middle" }}>
                    <div className="recruitingTeamCellRow">
                      <div className="recruitingTeamCellMain">
                        <span className="recruitingTeamNamePill" title={record.teamName || formatContactName(record)}>
                          {record.teamName || formatContactName(record) || "—"}
                        </span>
                        {attention ? (
                          <div style={{ marginTop: 6 }}>
                            <span className={`badge ${attention.badgeClass}`}>{attention.label}</span>
                          </div>
                        ) : null}
                        {renderDuplicateNotice(duplicateInfo, { compact: true })}
                      </div>
                      <RecruitingBoardCopyRowButton record={record} />
                    </div>
                  </td>
                  <td style={{ width: RECRUITING_POTENTIAL_COL_PCT.roster, verticalAlign: "top" }}><RecruitingRosterBoardColumn record={record} /></td>
                  <td style={{ width: RECRUITING_POTENTIAL_COL_PCT.projectDates, verticalAlign: "top" }}>
                    <div className="recruitingChartCell">{chartDashText(recruitingBoardProjectDatesLabel(record))}</div>
                  </td>
                  <td style={{ width: RECRUITING_POTENTIAL_COL_PCT.site, verticalAlign: "top" }}>
                    <div className="recruitingChartCell">{chartDashText(d.location)}</div>
                  </td>
                  <td style={{ width: RECRUITING_POTENTIAL_COL_PCT.weeks, verticalAlign: "top" }}>
                    <div className="recruitingChartCell">{chartDashText(recruitingBoardWeeksLabel(record))}</div>
                  </td>
                  <td style={{ width: RECRUITING_POTENTIAL_COL_PCT.fundraising, verticalAlign: "top" }}>
                    <div className="recruitingChartCell recruitingPotentialFundraisingCell">
                      {chartDashText(recruitingBoardFundraisingGoalLabel(record))}
                    </div>
                  </td>
                  <td style={{ width: RECRUITING_POTENTIAL_COL_PCT.mackayla, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <textarea
                      className="input recruitingInlineNoteInput"
                      rows={4}
                      value={stripHandoffSummary(record.mackaylaNotes)}
                      onChange={(event) => updateRecordMackaylaNotes(record.id, event.target.value)}
                      onBlur={() => void handleSaveRecord(record.id)}
                      placeholder="Add Mackayla notes"
                    />
                  </td>
                  <td style={{ width: RECRUITING_POTENTIAL_COL_PCT.leslee, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <textarea
                      className="input recruitingInlineNoteInput"
                      rows={4}
                      value={record.lesleeNotes || ""}
                      onChange={(event) => updateRecordLesleeNotes(record.id, event.target.value)}
                      onBlur={() => void handleSaveRecord(record.id)}
                      placeholder="Add Leslee notes"
                    />
                  </td>
                  <td style={{ width: RECRUITING_POTENTIAL_COL_PCT.actions, verticalAlign: "top" }} onClick={(event) => event.stopPropagation()}>
                    <div className="row recruitingActionRow recruitingFitActionRow">
                      <button className="btn" type="button" onClick={() => void openRecordDetails(record.id, "details")}>
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
          description="Qualified contacts and teams will appear here once they move beyond early outreach."
        />
      );
    }

    return (
      <div className="recruitingMobileCards">
        {recordsToRender.map((record) => {
          const attention = getAttentionMeta(record);
          const duplicateInfo = duplicateInfoByRecordId[record.id] || null;
          const d = buildTeamFormDraft(record);

          return (
            <div
              key={record.id}
              className="card pad recruitingMobileCard"
              onDoubleClick={(event) => handleRecruitingTableRowDoubleClick(event, record.id)}
              style={getRecordRowStyle(record, false)}
            >
              <div className="recruitingMobileCardHeader">
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
              {renderDuplicateNotice(duplicateInfo, { compact: true })}
              <div className="small" style={{ marginTop: 8 }}>
                <strong>Team roster</strong>
              </div>
              <div style={{ marginTop: 4 }}><RecruitingRosterBoardColumn record={record} /></div>
              <div className="recruitingMobileMeta">
                <span title="Project dates">{chartDashText(recruitingBoardProjectDatesLabel(record))}</span>
                <span title="Site">{chartDashText(d.location)}</span>
                <span title="Weeks">{chartDashText(recruitingBoardWeeksLabel(record))}</span>
                <span title="Fundraising goal">{chartDashText(recruitingBoardFundraisingGoalLabel(record))}</span>
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
                <button className="btn" type="button" onClick={() => void openRecordDetails(record.id, "details")}>
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
          title="No lock teams yet"
          description="Lock teams will show up here once they’ve been formed into real trips."
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
              <th style={{ width: RECRUITING_CONVERTED_COL_PCT.team }}>Team</th>
              <th style={{ width: RECRUITING_CONVERTED_COL_PCT.roster }}>Team roster</th>
              <th style={{ width: RECRUITING_CONVERTED_COL_PCT.projectDates }}>Project dates</th>
              <th style={{ width: RECRUITING_CONVERTED_COL_PCT.site }}>Site</th>
              <th style={{ width: RECRUITING_CONVERTED_COL_PCT.weeks }}>Weeks</th>
              <th style={{ width: RECRUITING_CONVERTED_COL_PCT.mackayla }}>Mackayla notes</th>
              <th style={{ width: RECRUITING_CONVERTED_COL_PCT.leslee }}>Leslee notes</th>
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
                        {formatRecruitingUpdateMeta(record, latestActivityByRecordId[record.id]) ? (
                          <div
                            className="small recruitingUpdatedMeta"
                            style={{ marginTop: 6 }}
                            title={
                              latestActivityByRecordId[record.id]?.summary ||
                              formatRecruitingUpdateMeta(record, latestActivityByRecordId[record.id])
                            }
                          >
                            {formatRecruitingUpdateMeta(record, latestActivityByRecordId[record.id])}
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
                        onClick={() => void openRecordDetails(record.id, "details")}
                      >
                        Edit
                      </button>
                      <button className="btn" type="button" onClick={() => void openRecordDetails(record.id, "history")}>
                        View History
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
          title="No lock teams yet"
          description="Lock teams will show up here once they’ve been formed into real trips."
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
              <button className="btn btnPrimary" type="button" onClick={() => void openRecordDetails(record.id, "details")}>
                Edit
              </button>
              <button className="btn" type="button" onClick={() => void openRecordDetails(record.id, "history")}>
                View History
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
      <div className="recruitingHeaderStack" style={{ display: "grid", gap: 12, marginBottom: 14 }}>
        <div>
          <h1 className="h1" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <AppIcon name="recruiting" className="pageEyebrowIcon" />
            <span>Recruiting</span>
          </h1>
          <div className="small">Yearly recruiting cycles, import, queue management, and contact history.</div>
        </div>
        <div className="recruitingToolbar appPolishToolbar">
          <select
            className="input recruitingYearSelect"
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            aria-label="Recruiting year"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <div className="recruitingSearchCluster">
            <input
              className="input recruitingToolbarSearch"
              value={filterConfig.searchQuery}
              onChange={(event) =>
                applyFilter({ ...filterConfig, searchQuery: event.target.value }, "custom")
              }
              placeholder={`Search ${selectedYear} contacts`}
              aria-label="Search recruiting contacts"
            />
            <button className={`btn ${filterPanelOpen ? "btnPrimary" : ""}`} type="button" onClick={() => setFilterPanelOpen((current) => !current)}>
              {filterPanelOpen ? "Hide Filters" : "Filters"}
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          </div>
          <button className="btn recruitingTemplateButton" type="button" onClick={handleDownloadTemplate}>
            Download Template
          </button>
          <div className="card recruitingActionCard">
            <button className="btn btnPrimary" type="button" onClick={openAddContactModal}>
              Add Contact
            </button>
            <button className="btn" type="button" onClick={() => importInputRef.current?.click()}>
              Add Bulk Contacts
            </button>
          </div>
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

      {filterPanelOpen ? (
        <div className="card pad" style={{ marginBottom: 14 }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 900 }}>Filters</div>
              <div className="small">Use owner, stage, or a couple quick views when you want to narrow the list.</div>
            </div>
            <div className="spacer" />
            <button className="btn" type="button" onClick={() => applyFilter(DEFAULT_FILTER_CONFIG, "all")}>
              Clear
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
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
            <select
              className="input"
              value={filterConfig.assignedTo}
              onChange={(event) => applyFilter({ ...filterConfig, assignedTo: event.target.value }, "custom")}
            >
              <option value="">All owners</option>
              {OWNER_OPTIONS.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
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
              className={`btn ${activeFilterId === "duplicates" ? "btnPrimary" : ""}`}
              type="button"
              onClick={() => {
                setActiveFilterId("duplicates");
                setFilterConfig(DEFAULT_FILTER_CONFIG);
              }}
            >
              Duplicates
            </button>
          </div>
        </div>
      ) : activeFilterCount > 0 ? (
        <div className="card pad" style={{ marginBottom: 14 }}>
          <div className="small">
            Filters are active. Use the search bar or open `Filters` to adjust or clear them.
          </div>
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
            <div className="small recruitingDesktopOnly" style={{ marginBottom: 10, color: "var(--muted)", lineHeight: 1.45 }}>
              Double-click a row to open the edit form. Click the dimmed area outside the form to close it (or use Close).
            </div>

            {activeTab === "outreach" ? (
              <>
                <div className="row" style={{ marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>Recruiting</div>
                    <div className="small">Initial recruiting and follow-up before handoff to potential teams.</div>
                  </div>
                </div>
                <div className="recruitingDesktopOnly">{renderOutreachTable(outreachQueue)}</div>
                <div className="recruitingMobileOnly">{renderOutreachCards(outreachQueue)}</div>
              </>
            ) : null}

            {activeTab === "potential" ? (
              <>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Potential Teams</div>
                <div className="small" style={{ marginBottom: 10 }}>
                  Curated serious leads for team formation and Leslee follow-up.
                </div>
                <div className="recruitingDesktopOnly">{renderPotentialTable(pipelineRecords)}</div>
                <div className="recruitingMobileOnly">{renderPotentialCards(pipelineRecords)}</div>
              </>
            ) : null}

            {activeTab === "converted" ? (
              <>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Lock Teams</div>
                <div className="small" style={{ marginBottom: 10 }}>
                  Recruiting records already turned into real teams.
                </div>
                <div className="recruitingDesktopOnly">{renderConvertedTable(convertedTeams)}</div>
                <div className="recruitingMobileOnly">{renderConvertedCards(convertedTeams)}</div>
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
            className="card pad appModalCard"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(920px, 100%)", maxHeight: "85vh", overflow: "auto" }}
          >
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>
                {recordDetailsMode === "history"
                  ? activeTab === "outreach"
                    ? "Contact History"
                    : activeTab === "potential"
                    ? "Potential Team History"
                    : "Lock Team History"
                  : "Edit team & recruiting"}
              </div>
              <div className="spacer" />
              {selectedRecord && recordDetailsMode !== "history" ? (
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
              {selectedRecord && recordDetailsMode === "details" ? (
                <button className="btn" type="button" onClick={() => setRecordDetailsMode("history")}>
                  Contact history
                </button>
              ) : null}
              <button className="btn" type="button" onClick={closeRecordDetailsModal}>
                Close
              </button>
            </div>
            {selectedRecord ? (
              <div style={{ display: "grid", gap: 16 }}>
                {recordDetailsMode !== "history" && (isSavingNotes || pageStatus) ? (
                  <div className="small" style={{ color: isSavingNotes ? "var(--primary)" : "var(--muted)" }}>
                    {isSavingNotes ? "Saving changes..." : pageStatus}
                  </div>
                ) : null}
                {recordDetailsMode === "history" ? (
                  <div>
                    <div style={{ fontWeight: 800 }}>{formatContactName(selectedRecord)}</div>
                    <div className="small">{selectedRecord.contact?.email}</div>
                    {selectedRecord.contact?.phone ? (
                      <div className="small">{selectedRecord.contact.phone}</div>
                    ) : null}
                  </div>
                ) : null}
                {recordDetailsMode !== "history" ? (
                  <>
                    {(activeTab === "potential" || activeTab === "outreach") &&
                    !selectedRecord.isConvertedToTeam ? (
                      <>
                        <div className="small" style={{ color: "var(--muted)", lineHeight: 1.45 }}>
                          Same fields as <strong>Lock Team</strong>. Saving updates this recruiting row only (does not
                          create a trip). Use <strong>Contact history</strong> in the header to log calls and emails.
                          {activeTab === "outreach" ? (
                            <>
                              {" "}
                              When ready, use <strong>Promote to Potential Teams</strong> below.
                            </>
                          ) : null}
                        </div>
                        {error ? (
                          <div className="card pad" style={{ color: "var(--danger)" }}>{error}</div>
                        ) : null}
                        <LockTeamFormCards
                          draft={potentialTeamEditDraft}
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
                          {activeTab === "outreach" ? (
                            <button className="btn" type="button" onClick={() => handlePromote(selectedRecord)}>
                              Promote to Potential Teams
                            </button>
                          ) : null}
                        </div>
                        <div
                          style={{
                            paddingTop: 12,
                            marginTop: 8,
                            borderTop: "1px solid rgba(15, 23, 42, 0.06)",
                          }}
                        >
                          <div className="small" style={{ marginBottom: 8, color: "var(--muted)", lineHeight: 1.45 }}>
                            Move this row to the <strong>{NEXT_RECRUITING_YEAR}</strong> recruiting board when you are
                            planning for that year (does not change trip data).
                          </div>
                          <button
                            className="btn"
                            type="button"
                            onClick={() => void handleMoveRecordToNextYear(selectedRecord.id)}
                            disabled={isSavingNotes || selectedRecord.recruitingYear === NEXT_RECRUITING_YEAR}
                          >
                            {selectedRecord.recruitingYear === NEXT_RECRUITING_YEAR
                              ? `Already on ${NEXT_RECRUITING_YEAR}`
                              : `Move to ${NEXT_RECRUITING_YEAR} chart`}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                    <div style={{ display: "grid", gap: 12 }}>
                      <div className="small" style={{ color: "var(--muted)" }}>
                        Same order as <strong>Lock team</strong> (site & logistics first, then team name & members, then
                        fees and past recruiting details) so values carry over cleanly.
                      </div>
                      {selectedRecord.convertedTeamId ? (
                        <div>
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
                      <div>
                        <div className="small" style={{ marginBottom: 6 }}>Team Name</div>
                        <input
                          className="input"
                          value={selectedRecord.teamName || ""}
                          onChange={(event) => updateSelectedRecord("teamName", event.target.value)}
                          placeholder="2026 Brazil Team"
                        />
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>Team Members</div>
                        <div className="small" style={{ marginBottom: 10 }}>
                          Add the roster here. ★ is the primary recruiting contact (first member when you lock). Phone
                          and gender stay on this roster until the trip exists.
                        </div>
                        <div style={{ display: "grid", gap: 10 }}>
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
                                style={{
                                  border: "1px solid rgba(18, 16, 12, 0.08)",
                                  borderRadius: 14,
                                  padding: 12,
                                  background: "rgba(255,255,255,.72)",
                                }}
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
                        <div className="row" style={{ marginTop: 10 }}>
                          <button className="btn" type="button" onClick={addRosterRowForSelectedRecord}>
                            Add Team Member
                          </button>
                        </div>
                      </div>
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
                    </div>

                    <RecruitingFormCard
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
                      title="Recruiting notes & activity"
                      subtitle="Contact log, then staff notes."
                    >
                      <div>
                        <div className="small" style={{ fontWeight: 700, marginBottom: 8 }}>Contact history</div>
                        {isCurrentHistoryLoading ? (
                          <div className="small">Loading history...</div>
                        ) : currentContactHistory.length > 0 ? (
                          <div style={{ display: "grid", gap: 10 }}>
                            {visibleCurrentContactHistory.map((entry) => (
                              <div
                                key={entry.id}
                                style={{ paddingBottom: 10, borderBottom: "1px solid var(--border)" }}
                              >
                                <div style={{ fontWeight: 700 }}>{formatPreviousContactLabel(entry)}</div>
                                {entry.summary ? (
                                  <div style={{ marginTop: 4 }}>{entry.summary}</div>
                                ) : null}
                                <div className="small" style={{ marginTop: 4 }}>
                                  {entry.staffMember ? `${entry.staffMember} | ` : ""}
                                  {formatDateTime(entry.actionDate)}
                                </div>
                              </div>
                            ))}
                            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                              {showCurrentContactHistoryToggle ? (
                                <button
                                  className="recruitingLastContactToggle"
                                  type="button"
                                  onClick={() => toggleContactHistoryExpanded(selectedRecord.id)}
                                >
                                  {isCurrentContactHistoryExpanded ? "See less" : "See more"}
                                </button>
                              ) : null}
                              <button
                                className="btn"
                                type="button"
                                onClick={() => openContactActionModal(selectedRecord, "email")}
                              >
                                Log contact
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div className="small" style={{ color: "var(--muted)" }}>
                              No contact history yet.
                            </div>
                            <div>
                              <button
                                className="btn"
                                type="button"
                                onClick={() => openContactActionModal(selectedRecord, "email")}
                              >
                                Log contact
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          paddingTop: 12,
                          borderTop: "1px solid rgba(15, 23, 42, 0.08)",
                          display: "grid",
                          gap: 12,
                        }}
                      >
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
                      {activeTab === "outreach" ? (
                        <button className="btn" type="button" onClick={() => handlePromote(selectedRecord)}>
                          Promote to Potential Teams
                        </button>
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
                    </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <button
                        className="btn btnPrimary"
                        type="button"
                        onClick={() => setRecordDetailsMode("details")}
                      >
                        Edit details
                      </button>
                    </div>
                    <div className="small">
                      {selectedRecord.teamName || formatContactName(selectedRecord)} | {selectedRecord.assignedTo || PRIMARY_OWNER} | {selectedRecord.stageLabel}
                    </div>
                    {!selectedRecord.isConvertedToTeam ? (
                      <div className="small">
                        {[selectedRecord.site, selectedRecord.projectDates]
                          .filter(Boolean)
                          .join(" | ") || "No project details yet."}
                      </div>
                    ) : null}
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
                              {entry.staffMember ? `${entry.staffMember} | ` : ""}
                              {formatDateTime(entry.actionDate)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="small">No activity logged yet.</div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="small">Select a recruiting record to view this year's history.</div>
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

      {importModalOpen ? (
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
          <div className="card pad appModalCard" style={{ width: "min(900px, 100%)", maxHeight: "80vh", overflow: "auto" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>Import Preview</div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={() => setImportModalOpen(false)}>
                Close
              </button>
            </div>
            <table className="table dataTableStriped">
              <thead>
                <tr>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                  <th>Gender</th>
                  <th>Year</th>
                  <th>Mackayla Notes</th>
                  <th>Leslee Notes</th>
                </tr>
              </thead>
              <tbody>
                {importPreviewRows.map((row, index) => (
                  <tr key={`${row.email}-${index}`}>
                    <td>{row.firstName}</td>
                    <td>{row.lastName}</td>
                    <td>{row.email}</td>
                    <td>{row.gender}</td>
                    <td>{row.recruitingYear}</td>
                    <td>{row.mackaylaNotes}</td>
                    <td>{row.lesleeNotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, maxWidth: 320 }}>
              <div className="small" style={{ marginBottom: 6 }}>Send imported contacts to</div>
              <select
                className="input"
                value={importDestination}
                onChange={(event) => setImportDestination(event.target.value)}
              >
                <option value="outreach">Recruiting</option>
                <option value="potential">Potential Teams</option>
              </select>
            </div>
            <div className="small" style={{ marginTop: 10 }}>
              Clicking `Save Imported Contacts` saves each row into {importDestination === "potential" ? "Potential Teams" : "Recruiting"} for its import year. Blank year values default to 2026.
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn btnPrimary" type="button" onClick={handleConfirmImport}>
                Save Imported Contacts
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {promoteModalOpen ? (
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
          <div className="card pad appModalCard" style={{ width: "min(860px, 100%)", maxHeight: "85vh", overflow: "auto" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>Promote To Potential Teams</div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={() => setPromoteModalOpen(false)}>
                Close
              </button>
            </div>
            <div className="small" style={{ marginBottom: 12 }}>
              Fill in the team and project details first. Lead contact info stays lower down just for reference.
            </div>
            <div className="small" style={{ fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
              Team Details
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Team Name</div>
                <input
                  className="input"
                  value={promoteDraft.teamName}
                  onChange={(event) => setPromoteDraft((current) => ({ ...current, teamName: event.target.value }))}
                  placeholder="Team name"
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Stage</div>
                <select
                  className="input"
                  value={promoteDraft.stage}
                  onChange={(event) => setPromoteDraft((current) => ({ ...current, stage: Number(event.target.value) }))}
                >
                  {RECRUITING_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value}>{stage.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Project Dates</div>
                <input
                  className="input"
                  value={promoteDraft.projectDates}
                  onChange={(event) => setPromoteDraft((current) => ({ ...current, projectDates: event.target.value }))}
                  placeholder="Dates or season"
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Site</div>
                <select
                  className="input"
                  value={promoteDraft.site}
                  onChange={(event) => setPromoteDraft((current) => ({ ...current, site: event.target.value }))}
                >
                  <option value="">Select site</option>
                  {mergeSiteOptionListWithCurrent(sitePickerLabels, promoteDraft.site).map((siteOption) => (
                    <option key={siteOption} value={siteOption}>{siteOption}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Weeks</div>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={promoteDraft.weeks}
                  onChange={(event) => setPromoteDraft((current) => ({ ...current, weeks: event.target.value }))}
                  placeholder="Number of weeks"
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Departure Date</div>
                <input
                  className="input"
                  value={promoteDraft.departureDate}
                  onChange={(event) => setPromoteDraft((current) => ({ ...current, departureDate: event.target.value }))}
                  placeholder="Month, season, or exact date"
                />
              </div>
            </div>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Team Members</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {promotePeople.length > 0 ? (
                    promotePeople.map((person, index) => {
                      const duplicateInfo = person.email
                        ? getDuplicateInfoForEmail(person.email)
                        : null;

                      return (
                        <div
                          key={`${person.email || person.name || "person"}-${index}`}
                          style={{
                            display: "grid",
                            gap: 6,
                            padding: 10,
                            borderRadius: 12,
                            border: "1px solid var(--border)",
                            background: "#fff",
                          }}
                        >
                          <div className="row" style={{ alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                              <div className={person.isMinor ? "recruitingMinorName" : ""} style={{ fontWeight: 700 }}>
                                {formatPersonDisplayName(person) || "Unnamed person"}
                              </div>
                              <div className="small">{person.email || "No email added"}</div>
                              {renderDuplicateNotice(duplicateInfo)}
                            </div>
                            <button
                              className="btn"
                              type="button"
                              onClick={() => handleRemovePersonFromPromoteDraft(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="small">Add additional team members here.</div>
                  )}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: 8,
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <div className="small" style={{ marginBottom: 6 }}>Name</div>
                      <input
                        className="input"
                        value={promotePersonDraft.name}
                        onChange={(event) =>
                          setPromotePersonDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Person name"
                      />
                    </div>
                    <div>
                      <div className="small" style={{ marginBottom: 6 }}>Email</div>
                      <input
                        className="input"
                        value={promotePersonDraft.email}
                        onChange={(event) =>
                          setPromotePersonDraft((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        placeholder="person@email.com"
                      />
                    </div>
                    <label className="small" style={{ display: "grid", gap: 6 }}>
                      <span>Minor</span>
                      <input
                        type="checkbox"
                        checked={promotePersonDraft.isMinor}
                        onChange={(event) =>
                          setPromotePersonDraft((current) => ({
                            ...current,
                            isMinor: event.target.checked,
                            minorAge: event.target.checked ? current.minorAge : "",
                          }))
                        }
                      />
                    </label>
                    {promotePersonDraft.isMinor ? (
                      <div>
                        <div className="small" style={{ marginBottom: 6 }}>Age</div>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={promotePersonDraft.minorAge}
                          onChange={(event) =>
                            setPromotePersonDraft((current) => ({
                              ...current,
                              minorAge: event.target.value,
                            }))
                          }
                          placeholder="14"
                        />
                      </div>
                    ) : null}
                    <button className="btn" type="button" onClick={handleAddPersonToPromoteDraft}>
                      Add Person
                    </button>
                  </div>
                  {renderDuplicateNotice(promotePersonDuplicateInfo)}
                </div>
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Required Handoff Summary</div>
                <textarea
                  className="input"
                  rows={4}
                  value={promoteDraft.handoffSummary}
                  onChange={(event) => setPromoteDraft((current) => ({ ...current, handoffSummary: event.target.value }))}
                  placeholder="What does Leslee need to know right away?"
                />
              </div>
              <div>
                <div className="small" style={{ fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
                  Lead Contact
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
                  <div className="small" style={{ marginBottom: 6 }}>First Name</div>
                  <input
                    className="input"
                    value={promoteDraft.firstName}
                    onChange={(event) => setPromoteDraft((current) => ({ ...current, firstName: event.target.value }))}
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Last Name</div>
                  <input
                    className="input"
                    value={promoteDraft.lastName}
                    onChange={(event) => setPromoteDraft((current) => ({ ...current, lastName: event.target.value }))}
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Email</div>
                  <input
                    className="input"
                    value={promoteDraft.email}
                    onChange={(event) => setPromoteDraft((current) => ({ ...current, email: event.target.value }))}
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Phone</div>
                  <input
                    className="input"
                    value={promoteDraft.phone}
                    onChange={(event) => setPromoteDraft((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Gender</div>
                  <select
                    className="input"
                    value={promoteDraft.gender}
                    onChange={(event) => setPromoteDraft((current) => ({ ...current, gender: event.target.value }))}
                  >
                    <option value="">Not set</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button className="btn btnPrimary" type="button" onClick={() => void handleConfirmPromote()}>
                Save And Move To Potential Teams
              </button>
              <button className="btn" type="button" onClick={() => setPromoteModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {contactActionModalOpen ? (
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
          <div className="card pad appModalCard" style={{ width: "min(520px, 100%)" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>
                {formatContactActionLabel(contactActionDraft.actionType)}
              </div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={() => setContactActionModalOpen(false)}>
                Close
              </button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Type</div>
                <select
                  className="input"
                  value={contactActionDraft.actionType}
                  onChange={(event) =>
                    setContactActionDraft((current) => ({
                      ...current,
                      actionType: event.target.value,
                    }))
                  }
                >
                  <option value="email">Email</option>
                  <option value="call">Call</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Date</div>
                <input
                  className="input"
                  type="date"
                  value={contactActionDraft.actionDate}
                  onChange={(event) =>
                    setContactActionDraft((current) => ({
                      ...current,
                      actionDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Notes</div>
                <textarea
                  className="input"
                  rows={4}
                  value={contactActionDraft.summary}
                  onChange={(event) =>
                    setContactActionDraft((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                  placeholder="Add anything you want to remember"
                />
              </div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button className="btn btnPrimary" type="button" onClick={() => void handleSaveContactAction()}>
                {isSavingContactAction ? "Saving..." : "Save Contact"}
              </button>
              <button className="btn" type="button" onClick={() => setContactActionModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
          <div className="card pad appModalCard" style={{ width: "min(920px, 100%)", maxHeight: "85vh", overflow: "auto" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>Add team & recruiting</div>
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
            <div className="small" style={{ marginBottom: 14, color: "var(--muted)" }}>
              Same layout as Edit. First and last name are required on the starred primary row; everything else is optional. Log
              contact history after you save.
            </div>
            {error ? (
              <div className="card pad" style={{ marginBottom: 14, color: "var(--danger)" }}>
                {error}
              </div>
            ) : null}
            <div style={{ display: "grid", gap: 16 }}>
              <RecruitingFormCard
                title="Site, stage & timing"
                subtitle="Site, pipeline stage, owner, and timing — same fields as Edit."
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
                title="Team name & roster"
                subtitle="Star (★) is the primary contact. Everyone is on one roster row with first, last, email, phone, gender."
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
                <div className="small" style={{ fontWeight: 700, marginBottom: 8 }}>
                  Roster — click ☆ to choose the primary contact
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {(newContactDraft.rosterRows?.length ? newContactDraft.rosterRows : [emptyRosterPerson()]).map(
                    (person, index) => {
                      const isPrimary = index === 0;
                      const duplicateInfo = person.email ? getDuplicateInfoForEmail(person.email) : null;
                      const rowCount = newContactDraft.rosterRows?.length || 1;
                      return (
                        <div
                          key={`new-roster-${index}`}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(15, 23, 42, 0.1)",
                            background: "rgba(248, 250, 252, 0.85)",
                          }}
                        >
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
                                updateNewContactRosterRow(index, { firstName: event.target.value })
                              }
                              placeholder="First"
                              autoComplete="given-name"
                            />
                            <input
                              className="input"
                              style={{ minWidth: 90, flex: "1 1 100px" }}
                              value={person.lastName}
                              onChange={(event) =>
                                updateNewContactRosterRow(index, { lastName: event.target.value })
                              }
                              placeholder="Last"
                              autoComplete="family-name"
                            />
                            <input
                              className="input"
                              type="email"
                              style={{ minWidth: 160, flex: "2 1 180px" }}
                              value={person.email}
                              onChange={(event) =>
                                updateNewContactRosterRow(index, { email: event.target.value })
                              }
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
                title="Recruiting notes"
                subtitle="Internal notes. After saving, open the row to log contact history."
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
          <div className="card pad appModalCard" style={{ width: "min(980px, 100%)", maxHeight: "85vh", overflow: "auto" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>Lock Team</div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={() => setFormTeamModalOpen(false)}>
                Close
              </button>
            </div>
            <div className="small" style={{ marginBottom: 14 }}>
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
              onFieldChange={updateTeamFormDraft}
              onMemberChange={updateTeamFormMember}
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

      {bulkModalOpen ? (
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
          <div className="card pad appModalCard" style={{ width: "min(620px, 100%)" }}>
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
              <div className="small">{bulkActionDescription}</div>
              {showBulkDateField ? (
                <input
                  className="input"
                  type="datetime-local"
                  value={bulkDate}
                  onChange={(event) => setBulkDate(event.target.value)}
                />
              ) : null}
              {showBulkSummaryField ? (
                <textarea
                  className="input"
                  rows={3}
                  value={bulkSummary}
                  onChange={(event) => setBulkSummary(event.target.value)}
                  placeholder={bulkAction === "delete" ? "Optional note for this delete" : "Summary / note"}
                />
              ) : null}
              {showBulkStageField ? (
                <select className="input" value={bulkStage} onChange={(event) => setBulkStage(event.target.value)}>
                  <option value="">Choose stage</option>
                  {RECRUITING_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value}>{stage.label}</option>
                  ))}
                </select>
              ) : null}
              {showBulkFollowUpField ? (
                <input
                  className="input"
                  type="date"
                  value={bulkNextFollowUp}
                  onChange={(event) => setBulkNextFollowUp(event.target.value)}
                />
              ) : null}
              {showBulkAssignedToField ? (
                <select className="input" value={bulkAssignedTo} onChange={(event) => setBulkAssignedTo(event.target.value)}>
                  <option value="">Choose owner</option>
                  {OWNER_OPTIONS.map((owner) => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              ) : null}
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
