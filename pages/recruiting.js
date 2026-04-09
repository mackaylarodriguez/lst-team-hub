import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import EmptyState from "@/components/EmptyState";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { requireSession } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";
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
  mergeRecruitingCycleContacts,
  saveRecruitingCycleContact,
} from "@/lib/recruitingCycles";
import { SITE_OPTIONS } from "@/lib/siteOptions";
import { listTripTeamMembersForDuplicateCheck } from "@/lib/tripTeamMembers";
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

function normalizeEmailValue(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStatusValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getWorkflowBoardLabel(record) {
  if (record?.isConvertedToTeam) return "Lock Teams";
  if (record?.isPotentialTeam) return "Potential Teams";
  return "Recruiting";
}

function joinLabels(labels) {
  if (labels.length <= 1) return labels[0] || "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
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

    const minorMatch = trimmedEntry.match(/^\[minor(?::\s*(\d+))?\]\s*/i);
    const isMinor = Boolean(minorMatch);
    const minorAge = minorMatch?.[1] ? String(minorMatch[1]).trim() : "";
    const withoutMinorLabel = trimmedEntry.replace(/^\[minor(?::\s*\d+)?\]\s*/i, "").trim();

    const angleMatch = withoutMinorLabel.match(/^(.*?)\s*<([^>]+)>$/);
    if (angleMatch) {
      return {
        raw: trimmedEntry,
        name: String(angleMatch[1] || "").trim(),
        email: normalizeEmailValue(angleMatch[2]),
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
        isMinor,
        minorAge,
      };
    }

    return {
      raw: trimmedEntry,
      name: withoutMinorLabel,
      email: "",
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
  if (name && email) return `${minorPrefix}${name} <${email}>`;
  return `${minorPrefix}${name || email || ""}`.trim();
}

function buildTeamMembersText(people) {
  return (people || [])
    .map((person) => formatTeamMemberEntry(person))
    .filter(Boolean)
    .join("\n");
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

function getSiteOptionsWithCurrent(currentValue) {
  const options = [...(SITE_OPTIONS || [])];
  const trimmedValue = String(currentValue || "").trim();
  if (trimmedValue && !options.includes(trimmedValue)) {
    options.push(trimmedValue);
  }
  return options;
}

function createEmptyTripTeamMember() {
  return {
    firstName: "",
    lastName: "",
    email: "",
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
    const key = email || `${firstName} ${lastName}`.trim().toLowerCase();
    if (!key || seen.has(key)) return;

    seen.add(key);
    nextMembers.push({
      firstName,
      lastName,
      email,
      startDate: "",
      endDate: "",
    });
  }

  pushMember(record?.contact || {});

  parseTeamMemberEntries(record?.teamMembers).forEach((person) => {
    const nameParts = splitPersonName(person.name || person.raw);
    pushMember({
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      email: person.email,
    });
  });

  return nextMembers.length > 0 ? nextMembers : [createEmptyTripTeamMember()];
}

function buildTeamFormDraft(record) {
  const weeksLabel = record?.weeks
    ? `${record.weeks} week${String(record.weeks) === "1" ? "" : "s"}`
    : "";
  const projectLengthSummary = [weeksLabel, record?.projectDates || ""]
    .filter(Boolean)
    .join(" - ");
  const recruitingDepartureDate = String(record?.departureDate || "").trim();

  return {
    name: record?.teamName || formatContactName(record),
    location: record?.site || "",
    host: "",
    siteType: "",
    trainingTimelineType: DEFAULT_TRAINING_TIMELINE_TYPE,
    projectType: "",
    projectLengthSummary,
    extraTravelStatus: "no",
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(recruitingDepartureDate) ? recruitingDepartureDate : "",
    endDate: "",
    fundraisingGoalAmount: "",
    tripFeeAmount: "600",
    materialsFeeAmount: "250",
    hasDeferredWorker: "no",
    hannoverHousingFeeAmount: "600",
    domesticProjectFeeAmount: "",
    domesticFeeAmount: "",
    domesticMaterialsFeeAmount: "",
    teamMembers: buildTeamMemberDrafts(record),
    recruitingProjectDates: record?.projectDates || "",
    recruitingWeeks: record?.weeks || "",
    recruitingDepartureDate,
    mackaylaNotes: record?.mackaylaNotes || "",
    lesleeNotes: record?.lesleeNotes || "",
  };
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

function formatMonthDay(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "numeric",
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

function formatLastContactSummary(record) {
  if (!record?.lastContactedAt) return "-";
  const dateLabel = formatMonthDay(record.lastContactedAt);
  const actionLabel = formatContactActionLabel(record.lastContactMethod);
  return actionLabel && dateLabel ? `${actionLabel} ${dateLabel}` : dateLabel || actionLabel || "-";
}

function isContactActionType(actionType) {
  return ["email", "call", "text", "bulk email", "bulk text"].includes(
    String(actionType || "").trim().toLowerCase()
  );
}

function formatContactHistorySummary(entry) {
  const actionLabel = formatContactActionLabel(entry?.actionType);
  const dateLabel = formatMonthDay(entry?.actionDate || entry?.createdAt);
  return [actionLabel, dateLabel].filter(Boolean).join(" ");
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

function shouldShowLastContactToggle(record, contactActivity) {
  if (contactActivity.length > 1) return true;
  if (contactActivity.length === 1) {
    const entry = contactActivity[0];
    const combinedText = [formatContactHistorySummary(entry), entry?.summary].filter(Boolean).join(" ");
    return combinedText.length > 90;
  }

  return formatLastContactSummary(record).length > 90;
}

function getRecruitingStageBadgeClass(record) {
  if (record?.stage === 3) return "badgeSuccess";
  if (record?.stage === 2) return "badgeWarn";
  if (record?.stage === 1) return "badgeInfo";
  return "badgeDanger";
}

function getRecruitingOwnerBadgeClass(owner) {
  const normalizedOwner = normalizeOwnerName(owner);
  if (normalizedOwner === normalizeOwnerName(PRIMARY_OWNER)) return "recruitingOwnerBadgePrimary";
  if (normalizedOwner === normalizeOwnerName(BOSS_OWNER)) return "recruitingOwnerBadgeBoss";
  return "badgeInfo";
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

function isStaleRecord(record) {
  const referenceDate = new Date(
    record?.lastContactedAt || record?.updatedAt || record?.createdAt || Date.now()
  );
  if (Number.isNaN(referenceDate.getTime())) return false;
  const ageInDays = (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);

  if (record?.isConvertedToTeam) return false;
  if (record?.isPotentialTeam) {
    return ageInDays >= 10;
  }
  if (Number(record?.stage || 0) === 0) {
    return ageInDays >= 3;
  }
  return ageInDays >= 7;
}

function getAttentionMeta(record) {
  if (isOverdueRecord(record)) {
    return { label: "Overdue", badgeClass: "badgeDanger", rowAccent: "rgba(239,68,68,.18)" };
  }
  if (isStaleRecord(record)) {
    return { label: "Stale", badgeClass: "badgeWarn", rowAccent: "rgba(249,157,42,.18)" };
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
      (typeof window !== "undefined" && window.innerWidth <= 720) ||
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
  const [tripTeamMembers, setTripTeamMembers] = useState([]);
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
  const [tableFontSize, setTableFontSize] = useState("medium");
  const [activeTab, setActiveTab] = useState("outreach");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedLastContactById, setExpandedLastContactById] = useState({});
  const [expandedContactHistoryById, setExpandedContactHistoryById] = useState({});
  const [addContactModalOpen, setAddContactModalOpen] = useState(false);
  const [newContactDraft, setNewContactDraft] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "",
    teamName: "",
    teamMembers: "",
    assignedTo: "",
  });
  const [newContactPersonDraft, setNewContactPersonDraft] = useState({ name: "", email: "", isMinor: false, minorAge: "" });
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
  const [deletingDuplicateRecordId, setDeletingDuplicateRecordId] = useState("");
  const [confirmingDeleteDuplicateRecordId, setConfirmingDeleteDuplicateRecordId] = useState("");
  const [confirmingDeleteRecordId, setConfirmingDeleteRecordId] = useState("");
  const [deletingRecordId, setDeletingRecordId] = useState("");
  const [mergingDuplicateRecordId, setMergingDuplicateRecordId] = useState("");
  const [contactActionModalOpen, setContactActionModalOpen] = useState(false);
  const [isSavingContactAction, setIsSavingContactAction] = useState(false);
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [recordDetailsModalOpen, setRecordDetailsModalOpen] = useState(false);
  const [recordDetailsMode, setRecordDetailsMode] = useState("details");
  const [promoteDraft, setPromoteDraft] = useState(() => buildPromoteDraft(null));
  const [recordPersonDraft, setRecordPersonDraft] = useState({ name: "", email: "", isMinor: false, minorAge: "" });
  const [promotePersonDraft, setPromotePersonDraft] = useState({ name: "", email: "", isMinor: false, minorAge: "" });
  const [formTeamModalOpen, setFormTeamModalOpen] = useState(false);
  const [teamFormDraft, setTeamFormDraft] = useState(() => buildTeamFormDraft(null));
  const [contactActionDraft, setContactActionDraft] = useState({
    recordId: "",
    actionType: "email",
    actionDate: new Date().toISOString().slice(0, 10),
    summary: "",
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
        const [nextRecords, nextTripTeamMembers] = await Promise.all([
          listRecruitingCycleContacts(selectedYear),
          listTripTeamMembersForDuplicateCheck(),
        ]);
        const [nextLatestActivity, nextContactActivity] = await Promise.all([
          listLatestRecruitingActivityByIds(nextRecords.map((record) => record.id)),
          listRecruitingContactActivityByIds(nextRecords.map((record) => record.id)),
        ]);
        setRecords(nextRecords);
        setTripTeamMembers(nextTripTeamMembers);
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
            normalizeStatusValue(member.tripStatus) === "active"
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

      if (filterConfig.workflowStatus === "stale" && !isStaleRecord(record)) {
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
    if (recordsForActiveTab.length === 0) {
      setSelectedRecordId("");
      return;
    }

    if (!recordsForActiveTab.some((record) => record.id === selectedRecordId)) {
      setSelectedRecordId(recordsForActiveTab[0].id);
    }
  }, [recordsForActiveTab, selectedRecordId]);

  useEffect(() => {
    if (!selectedRecordId || activeTab === "potential") return;
    void ensureRecordHistoryLoaded(selectedRecordId);
  }, [activeTab, selectedRecordId]);

  async function refreshCurrentYear() {
    const [nextRecords, nextTripTeamMembers] = await Promise.all([
      listRecruitingCycleContacts(selectedYear),
      listTripTeamMembersForDuplicateCheck(),
    ]);
    const [nextLatestActivity, nextContactActivity] = await Promise.all([
      listLatestRecruitingActivityByIds(nextRecords.map((record) => record.id)),
      listRecruitingContactActivityByIds(nextRecords.map((record) => record.id)),
    ]);
    setRecords(nextRecords);
    setTripTeamMembers(nextTripTeamMembers);
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
    const activeTeamMatches = options.includeActiveTeam === false
      ? []
      : duplicateSourceLookup.activeTeamEmails.get(normalizedEmail) || [];

    if (!sameBoardMatches.length && !activeTeamMatches.length) {
      return null;
    }

    const messages = [];

    if (sameBoardMatches.length > 0) {
      const boardLabels = [...new Set(sameBoardMatches.map((record) => getWorkflowBoardLabel(record)))];
      messages.push(`Already in ${joinLabels(boardLabels)}`);
    }

    if (activeTeamMatches.length > 0) {
      const tripNames = [...new Set(activeTeamMatches.map((member) => member.tripName).filter(Boolean))];
      const teamLabel = tripNames.length > 0
        ? `Already on active team${tripNames.length === 1 ? "" : "s"}: ${tripNames.slice(0, 2).join(", ")}${tripNames.length > 2 ? ` +${tripNames.length - 2} more` : ""}`
        : "Already on an active team";
      messages.push(teamLabel);
    }

    return {
      summary: messages.join(" | "),
      blockingMessage: `Duplicate email. ${messages.join(". ")}.`,
    };
  }

  const duplicateInfoByRecordId = useMemo(() => {
    return Object.fromEntries(
      records
        .map((record) => {
          const duplicateInfo = getDuplicateInfoForEmail(record.contact?.email, {
            excludeRecordId: record.id,
            includeActiveTeam: !record.isConvertedToTeam,
          });
          return duplicateInfo ? [record.id, duplicateInfo] : null;
        })
        .filter(Boolean)
    );
  }, [records, duplicateSourceLookup]);

  const duplicateReviewGroups = useMemo(() => {
    const groups = [];

    duplicateSourceLookup.recordEmails.forEach((matchingRecords, email) => {
      const activeTeamMatches = duplicateSourceLookup.activeTeamEmails.get(email) || [];
      if (matchingRecords.length <= 1 && activeTeamMatches.length === 0) {
        return;
      }

      groups.push({
        email,
        records: matchingRecords,
        activeTeams: activeTeamMatches,
      });
    });

    return groups.sort((left, right) => left.email.localeCompare(right.email));
  }, [duplicateSourceLookup]);

  const newContactDuplicateInfo = useMemo(
    () => getDuplicateInfoForEmail(newContactDraft.email),
    [newContactDraft.email, duplicateSourceLookup]
  );
  const newContactPeople = useMemo(
    () => parseTeamMemberEntries(newContactDraft.teamMembers),
    [newContactDraft.teamMembers]
  );
  const newContactPersonDuplicateInfo = useMemo(
    () => getDuplicateInfoForEmail(newContactPersonDraft.email),
    [newContactPersonDraft.email, duplicateSourceLookup]
  );
  const selectedRecordPeople = useMemo(
    () => parseTeamMemberEntries(selectedRecord?.teamMembers),
    [selectedRecord?.teamMembers]
  );
  const recordPersonDuplicateInfo = useMemo(
    () =>
      getDuplicateInfoForEmail(recordPersonDraft.email, {
        excludeRecordId: selectedRecord?.id,
      }),
    [recordPersonDraft.email, selectedRecord?.id, duplicateSourceLookup]
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
    if (!String(newContactDraft.firstName || "").trim() || !String(newContactDraft.lastName || "").trim()) {
      setError("First and last name are required.");
      return;
    }
    try {
      await saveRecruitingCycleContact({
        recruitingYear: selectedYear,
        firstName: newContactDraft.firstName,
        lastName: newContactDraft.lastName,
        email: newContactDraft.email,
        phone: newContactDraft.phone,
        gender: newContactDraft.gender,
        teamName: newContactDraft.teamName,
        teamMembers: newContactDraft.teamMembers,
        assignedTo: newContactDraft.assignedTo,
        stage: 0,
      });

      setNewContactDraft({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        gender: "",
        teamName: "",
        teamMembers: "",
        assignedTo: "",
      });
      setNewContactPersonDraft({ name: "", email: "", isMinor: false, minorAge: "" });
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
    setRecordPersonDraft({ name: "", email: "", isMinor: false, minorAge: "" });
    await ensureRecordHistoryLoaded(recordId);
  }

  async function openRecordFromDuplicateReview(record) {
    if (!record?.id) return;

    if (record.isPotentialTeam) {
      handleChangeTab("potential");
      await openRecordDetails(record.id, "details");
      return;
    }

    if (record.isConvertedToTeam) {
      handleChangeTab("converted");
    } else {
      handleChangeTab("outreach");
    }
    await openRecordDetails(record.id, "details");
  }

  async function handleDeleteDuplicateRecord(record) {
    if (!record?.id) return;

    try {
      setDeletingDuplicateRecordId(record.id);
      await deleteRecruitingCycleContact(record.id);
      if (selectedRecordId === record.id) {
        setSelectedRecordId("");
      }
      setError("");
      setConfirmingDeleteDuplicateRecordId("");
      await refreshCurrentYear();
    } catch (deleteError) {
      console.error("Unable to delete duplicate recruiting row", deleteError);
      setError(deleteError.message || "Unable to delete duplicate recruiting row.");
    } finally {
      setDeletingDuplicateRecordId("");
    }
  }

  async function handleDeleteRecord(recordId = selectedRecordId) {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;

    try {
      setDeletingRecordId(record.id);
      await deleteRecruitingCycleContact(record.id);
      if (selectedRecordId === record.id) {
        setSelectedRecordId("");
      }
      setRecordDetailsModalOpen(false);
      setError("");
      setConfirmingDeleteRecordId("");
      setPageStatus(`${record.teamName || formatContactName(record)} deleted.`);
      await refreshCurrentYear();
    } catch (deleteError) {
      console.error("Unable to delete recruiting row", deleteError);
      setError(deleteError.message || "Unable to delete recruiting row.");
    } finally {
      setDeletingRecordId("");
    }
  }

  async function handleMergeDuplicateGroup(group, keepRecord) {
    if (!group?.records?.length || !keepRecord?.id) return;

    const otherRecords = group.records.filter((record) => record.id !== keepRecord.id);
    if (otherRecords.length === 0) {
      setPageStatus("Nothing to merge for that email.");
      return;
    }

    const confirmed = window.confirm(
      `Keep ${keepRecord.teamName || formatContactName(keepRecord)} and merge ${otherRecords.length} duplicate row${otherRecords.length === 1 ? "" : "s"} into it?`
    );
    if (!confirmed) return;

    try {
      setMergingDuplicateRecordId(keepRecord.id);
      for (const duplicateRecord of otherRecords) {
        await mergeRecruitingCycleContacts({
          keepRecordId: keepRecord.id,
          removeRecordId: duplicateRecord.id,
          staffMember: session?.name || session?.email || "Staff",
        });
      }
      setSelectedRecordId(keepRecord.id);
      setError("");
      setPageStatus(
        `Merged ${otherRecords.length} duplicate row${otherRecords.length === 1 ? "" : "s"} into ${keepRecord.teamName || formatContactName(keepRecord)}.`
      );
      await refreshCurrentYear();
      await ensureRecordHistoryLoaded(keepRecord.id, { force: true });
    } catch (mergeError) {
      console.error("Unable to merge duplicate recruiting rows", mergeError);
      setError(mergeError.message || "Unable to merge duplicate rows.");
    } finally {
      setMergingDuplicateRecordId("");
    }
  }

  function openFormTeamModal(record) {
    setSelectedRecordId(record.id);
    setTeamFormDraft(buildTeamFormDraft(record));
    setFormTeamModalOpen(true);
    setPageStatus("");
    setError("");
  }

  async function handleFormTeam() {
    if (!selectedRecord) return;

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
      console.error("Unable to form team", error);
      setError(error.message || "Unable to form team.");
      setPageStatus("");
    } finally {
      setIsFormingTeam(false);
    }
  }

  function updateTeamFormDraft(field, value) {
    setTeamFormDraft((current) => ({ ...current, [field]: value }));
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
      setRecordDetailsModalOpen(false);
      setError("");
      setPageStatus("Saved.");
    } catch (saveError) {
      console.error("Unable to save recruiting record", saveError);
      setError(saveError.message || "Unable to save record.");
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
      setRecordDetailsModalOpen(false);
      setError("");
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
      current.map((record) =>
        record.id === recordId
          ? {
              ...record,
              [field]: value,
              ...(field === "stage" ? { stageLabel: getRecruitingStageLabel(value) } : {}),
            }
          : record
      )
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

  function handleAddPersonToSelectedRecord() {
    if (!selectedRecord) return;

    const nextEntry = {
      name: recordPersonDraft.name,
      email: recordPersonDraft.email,
      isMinor: recordPersonDraft.isMinor,
      minorAge: recordPersonDraft.isMinor ? recordPersonDraft.minorAge : "",
    };
    const formattedEntry = formatTeamMemberEntry(nextEntry);
    if (!formattedEntry) return;

    updateSelectedRecord(
      "teamMembers",
      buildTeamMembersText([...selectedRecordPeople, nextEntry])
    );
    setRecordPersonDraft({ name: "", email: "", isMinor: false, minorAge: "" });
  }

  function handleRemovePersonFromSelectedRecord(indexToRemove) {
    if (!selectedRecord) return;

    updateSelectedRecord(
      "teamMembers",
      buildTeamMembersText(
        selectedRecordPeople.filter((_, index) => index !== indexToRemove)
      )
    );
  }

  function handleAddPersonToNewContact() {
    const nextEntry = {
      name: newContactPersonDraft.name,
      email: newContactPersonDraft.email,
      isMinor: newContactPersonDraft.isMinor,
      minorAge: newContactPersonDraft.isMinor ? newContactPersonDraft.minorAge : "",
    };
    const formattedEntry = formatTeamMemberEntry(nextEntry);
    if (!formattedEntry) return;

    setNewContactDraft((current) => ({
      ...current,
      teamMembers: buildTeamMembersText([...parseTeamMemberEntries(current.teamMembers), nextEntry]),
    }));
    setNewContactPersonDraft({ name: "", email: "", isMinor: false, minorAge: "" });
  }

  function handleRemovePersonFromNewContact(indexToRemove) {
    setNewContactDraft((current) => ({
      ...current,
      teamMembers: buildTeamMembersText(
        parseTeamMemberEntries(current.teamMembers).filter((_, index) => index !== indexToRemove)
      ),
    }));
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
    setNewContactDraft({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: "",
      teamName: "",
      teamMembers: "",
      assignedTo: "",
    });
    setNewContactPersonDraft({ name: "", email: "", isMinor: false, minorAge: "" });
    setAddContactModalOpen(true);
  }

  function toggleLastContactExpanded(recordId) {
    setExpandedLastContactById((current) => ({
      ...current,
      [recordId]: !current[recordId],
    }));
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
      <DraggableTable>
        <table className={`table recruitingCompactTable recruitingFitTable recruitingFont-${tableFontSize}`}>
          <colgroup>
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Gender</th>
              <th>Trip Details</th>
              <th>Last Contacted</th>
              <th>Mackayla Notes</th>
              <th>Leslee Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordsToRender.map((record) => {
              const attention = getAttentionMeta(record);
              const duplicateInfo = duplicateInfoByRecordId[record.id] || null;
              const contactActivity = contactActivityByRecordId[record.id] || [];
              const isLastContactExpanded = Boolean(expandedLastContactById[record.id]);
              const showLastContactToggle = shouldShowLastContactToggle(record, contactActivity);

              return (
                <tr
                  key={record.id}
                  onClick={() => setSelectedRecordId(record.id)}
                  style={getRecordRowStyle(record, record.id === selectedRecordId)}
                >
                  <td>{record.contact?.firstName || "-"}</td>
                  <td>{record.contact?.lastName || "-"}</td>
                  <td className="recruitingFitEmailCell">
                    <div>{record.contact?.email || record.contact?.phone || "-"}</div>
                    {renderDuplicateNotice(duplicateInfo, { compact: true })}
                  </td>
                  <td>
                    <div>{record.contact?.gender || "-"}</div>
                  </td>
                  <td>
                    <div className="recruitingSnapshotText">
                      {[record.site, record.projectDates, record.departureDate ? `Departs ${formatFlexibleDepartureDate(record.departureDate)}` : ""]
                        .filter(Boolean)
                        .join(" | ") || "-"}
                    </div>
                    {attention ? (
                      <span className={`badge ${attention.badgeClass}`} style={{ marginTop: 4 }}>
                        {attention.label}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {contactActivity.length > 0 ? (
                      <div className="recruitingLastContactWrap">
                        <div
                          className={`recruitingContactHistoryList ${
                            isLastContactExpanded ? "isExpanded" : "isCollapsed"
                          }`}
                        >
                          {contactActivity.map((entry) => (
                            <div
                              key={entry.id}
                              className="recruitingContactHistoryItem"
                              title={entry.summary || formatDateTime(entry.actionDate)}
                            >
                              <div className="recruitingLastContactCell">
                                {formatContactHistorySummary(entry)}
                              </div>
                              {entry.summary ? (
                                <div className="small">{entry.summary}</div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        {showLastContactToggle ? (
                          <button
                            className="recruitingLastContactToggle"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleLastContactExpanded(record.id);
                            }}
                          >
                            {isLastContactExpanded ? "See less" : "See more"}
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="recruitingLastContactCell">{formatLastContactSummary(record)}</div>
                    )}
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <textarea
                      className="input recruitingInlineNoteInput"
                      rows={3}
                      value={stripHandoffSummary(record.mackaylaNotes)}
                      onChange={(event) => updateRecordMackaylaNotes(record.id, event.target.value)}
                      onBlur={() => void handleSaveRecord(record.id)}
                      placeholder="Add Mackayla notes"
                    />
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <textarea
                      className="input recruitingInlineNoteInput"
                      rows={3}
                      value={record.lesleeNotes || ""}
                      onChange={(event) => updateRecordLesleeNotes(record.id, event.target.value)}
                      onBlur={() => void handleSaveRecord(record.id)}
                      placeholder="Add Leslee notes"
                    />
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <div className="row recruitingActionRow recruitingFitActionRow">
                      <button className="btn" type="button" onClick={() => openContactActionModal(record, "email")}>Emailed</button>
                      <button className="btn" type="button" onClick={() => openContactActionModal(record, "call")}>Called</button>
                      <button className="btn" type="button" onClick={() => openContactActionModal(record, "text")}>Texted</button>
                      <button className="btn btnPrimary" type="button" onClick={() => void openRecordDetails(record.id, "details")}>Edit</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </DraggableTable>
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
          const contactActivity = contactActivityByRecordId[record.id] || [];
          const latestContact = contactActivity[0] || null;

          return (
            <div
              key={record.id}
              className="card pad recruitingMobileCard"
              onClick={() => setSelectedRecordId(record.id)}
              style={getRecordRowStyle(record, record.id === selectedRecordId)}
            >
              <div className="recruitingMobileCardHeader">
                <div>
                  <div className="recruitingMobileCardTitle">
                    {formatContactName(record)}
                  </div>
                  <div className="small recruitingMobileCardEmail">
                    {record.contact?.email || record.contact?.phone || "-"}
                  </div>
                </div>
                {attention ? (
                  <span className={`badge ${attention.badgeClass}`}>{attention.label}</span>
                ) : null}
              </div>
              {renderDuplicateNotice(duplicateInfo, { compact: true })}
              <div className="recruitingMobileMeta">
                <span>{record.contact?.gender || "Gender not set"}</span>
                <span>{record.site || "No site yet"}</span>
                <span>{record.projectDates || "Timing not set"}</span>
              </div>
              <div className="small">
                {latestContact ? formatContactHistorySummary(latestContact) : formatLastContactSummary(record)}
              </div>
              <div className="recruitingMobileNotes">
                <textarea
                  className="input recruitingInlineNoteInput"
                  rows={3}
                  value={stripHandoffSummary(record.mackaylaNotes)}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => updateRecordMackaylaNotes(record.id, event.target.value)}
                  onBlur={() => void handleSaveRecord(record.id)}
                  placeholder="Add Mackayla notes"
                />
                <textarea
                  className="input recruitingInlineNoteInput"
                  rows={3}
                  value={record.lesleeNotes || ""}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => updateRecordLesleeNotes(record.id, event.target.value)}
                  onBlur={() => void handleSaveRecord(record.id)}
                  placeholder="Add Leslee notes"
                />
              </div>
              <div className="recruitingMobileActions" onClick={(event) => event.stopPropagation()}>
                <button className="btn" type="button" onClick={() => openContactActionModal(record, "email")}>Emailed</button>
                <button className="btn" type="button" onClick={() => openContactActionModal(record, "call")}>Called</button>
                <button className="btn" type="button" onClick={() => openContactActionModal(record, "text")}>Texted</button>
                <button className="btn btnPrimary" type="button" onClick={() => void openRecordDetails(record.id, "details")}>Edit</button>
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
      <DraggableTable>
        <table className={`table recruitingCompactTable recruitingFitTable recruitingFont-${tableFontSize}`}>
          <colgroup>
            <col style={{ width: "20%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Team Name</th>
              <th>Email</th>
              <th>Owner</th>
              <th>Stage</th>
              <th>Site</th>
              <th>Timing</th>
              <th>Mackayla Notes</th>
              <th>Leslee Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordsToRender.map((record) => {
              const attention = getAttentionMeta(record);
              const duplicateInfo = duplicateInfoByRecordId[record.id] || null;
              const stageLabel = record.stageLabel;
              const primaryContact = formatContactName(record);
              const additionalPeople = getAdditionalRecordPeople(record);

              return (
                <tr
                  key={record.id}
                  onClick={() => setSelectedRecordId(record.id)}
                  style={getRecordRowStyle(record, record.id === selectedRecordId)}
                >
                    <td>
                      <div className="recruitingPotentialTeamName">{record.teamName || "-"}</div>
                      <div className="recruitingPotentialPrimaryContact">{primaryContact}</div>
                      {additionalPeople.length > 0 ? (
                        <div className="small recruitingPotentialSecondaryPeople">
                          {additionalPeople.join(", ")}
                        </div>
                      ) : null}
                    </td>
                    <td className="recruitingFitEmailCell">
                      <div className="recruitingPotentialEmail">{record.contact?.email || "-"}</div>
                      {record.contact?.phone ? (
                        <div className="small">{record.contact.phone}</div>
                      ) : null}
                      {renderDuplicateNotice(duplicateInfo, { compact: true })}
                    </td>
                    <td>
                      <span className={`badge recruitingOwnerBadge ${getRecruitingOwnerBadgeClass(record.assignedTo || PRIMARY_OWNER)}`}>
                        {record.assignedTo || PRIMARY_OWNER}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getRecruitingStageBadgeClass(record)} recruitingStageBadge`}>
                        {stageLabel}
                      </span>
                      {attention ? (
                        <span className={`badge ${attention.badgeClass}`} style={{ marginTop: 4 }}>
                          {attention.label}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <div>{record.site || "No site yet"}</div>
                      <div className="small" style={{ marginTop: 2 }}>
                        {record.site ? "Site selected" : "Site still needed"}
                      </div>
                    </td>
                    <td>
                      <div>{record.projectDates || "-"}</div>
                      <div className="small" style={{ marginTop: 2 }}>
                        {record.weeks ? `${record.weeks} week${String(record.weeks) === "1" ? "" : "s"}` : "Weeks not set"}
                      </div>
                      <div className="small" style={{ marginTop: 2 }}>
                        {record.departureDate ? `Departs ${formatFlexibleDepartureDate(record.departureDate)}` : "No departure yet"}
                      </div>
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <textarea
                        className="input recruitingInlineNoteInput"
                        rows={3}
                        value={stripHandoffSummary(record.mackaylaNotes)}
                        onChange={(event) => updateRecordMackaylaNotes(record.id, event.target.value)}
                        onBlur={() => void handleSaveRecord(record.id)}
                        placeholder="Add Mackayla notes"
                      />
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <textarea
                        className="input recruitingInlineNoteInput"
                        rows={3}
                        value={record.lesleeNotes || ""}
                        onChange={(event) => updateRecordLesleeNotes(record.id, event.target.value)}
                        onBlur={() => void handleSaveRecord(record.id)}
                        placeholder="Add Leslee notes"
                      />
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <div className="row recruitingActionRow recruitingFitActionRow">
                        <button className="btn" type="button" onClick={() => void openRecordDetails(record.id, "details")}>
                          Edit Details
                        </button>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => void handleMoveRecordToNextYear(record.id)}
                          disabled={isSavingNotes || record.recruitingYear === NEXT_RECRUITING_YEAR}
                        >
                          {record.recruitingYear === NEXT_RECRUITING_YEAR
                            ? `On ${NEXT_RECRUITING_YEAR}`
                            : `Move to ${NEXT_RECRUITING_YEAR}`}
                        </button>
                        <button className="btn btnPrimary" type="button" onClick={() => openFormTeamModal(record)}>Form Team</button>
                      </div>
                    </td>
                  </tr>
              );
            })}
          </tbody>
        </table>
      </DraggableTable>
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
          const stageLabel = record.stageLabel;

          return (
            <div
              key={record.id}
              className="card pad recruitingMobileCard"
              onClick={() => setSelectedRecordId(record.id)}
              style={getRecordRowStyle(record, record.id === selectedRecordId)}
            >
              <div className="recruitingMobileCardHeader">
                <div>
                  <div className="recruitingMobileCardTitle">{record.teamName || formatContactName(record)}</div>
                  <div className="small recruitingMobileCardEmail">{record.contact?.email || "-"}</div>
                </div>
                <span className={`badge ${getRecruitingStageBadgeClass(record)}`}>{stageLabel}</span>
              </div>
              {renderDuplicateNotice(duplicateInfo, { compact: true })}
              <div className="recruitingMobileMeta">
                <span>{record.assignedTo || PRIMARY_OWNER}</span>
                <span>{record.site || "No site yet"}</span>
                <span>{record.projectDates || "Timing not set"}</span>
              </div>
              {attention ? (
                <span className={`badge ${attention.badgeClass}`}>{attention.label}</span>
              ) : null}
              <div className="recruitingMobileNotes">
                <textarea
                  className="input recruitingInlineNoteInput"
                  rows={3}
                  value={stripHandoffSummary(record.mackaylaNotes)}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => updateRecordMackaylaNotes(record.id, event.target.value)}
                  onBlur={() => void handleSaveRecord(record.id)}
                  placeholder="Add Mackayla notes"
                />
                <textarea
                  className="input recruitingInlineNoteInput"
                  rows={3}
                  value={record.lesleeNotes || ""}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => updateRecordLesleeNotes(record.id, event.target.value)}
                  onBlur={() => void handleSaveRecord(record.id)}
                  placeholder="Add Leslee notes"
                />
              </div>
              <div className="recruitingMobileActions" onClick={(event) => event.stopPropagation()}>
                <button className="btn" type="button" onClick={() => void openRecordDetails(record.id, "details")}>
                  Edit Details
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => void handleMoveRecordToNextYear(record.id)}
                  disabled={isSavingNotes || record.recruitingYear === NEXT_RECRUITING_YEAR}
                >
                  {record.recruitingYear === NEXT_RECRUITING_YEAR
                    ? `On ${NEXT_RECRUITING_YEAR}`
                    : `Move to ${NEXT_RECRUITING_YEAR}`}
                </button>
                <button className="btn btnPrimary" type="button" onClick={() => openFormTeamModal(record)}>
                  Form Team
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
      <DraggableTable>
        <table className={`table recruitingCompactTable recruitingFont-${tableFontSize}`} style={{ minWidth: 760 }}>
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
                <td>
                  <div>{record.teamName || record.linkedTrip?.name || "-"}</div>
                  {formatRecruitingUpdateMeta(record, latestActivityByRecordId[record.id]) ? (
                    <div
                      className="small recruitingUpdatedMeta"
                      title={
                        latestActivityByRecordId[record.id]?.summary ||
                        formatRecruitingUpdateMeta(record, latestActivityByRecordId[record.id])
                      }
                    >
                      {formatRecruitingUpdateMeta(record, latestActivityByRecordId[record.id])}
                    </div>
                  ) : null}
                </td>
                <td>{formatContactName(record)}</td>
                <td>{record.linkedTrip?.site || record.site || "-"}</td>
                <td>{record.linkedTrip?.departureDate ? formatDate(record.linkedTrip.departureDate) : formatFlexibleDepartureDate(record.departureDate)}</td>
                <td>{record.linkedTrip?.status || "Locked"}</td>
                <td>
                  <div className="row recruitingActionRow" onClick={(event) => event.stopPropagation()}>
                    <button className="btn" type="button" onClick={() => void openRecordDetails(record.id, "history")}>
                      View History
                    </button>
                    {record.convertedTeamId ? (
                      <button className="btn btnPrimary" type="button" onClick={() => router.push(`/trips/${encodeURIComponent(record.convertedTeamId)}`)}>
                        Open Team
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DraggableTable>
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
        {recordsToRender.map((record) => (
          <div
            key={record.id}
            className="card pad recruitingMobileCard"
            onClick={() => setSelectedRecordId(record.id)}
          >
            <div className="recruitingMobileCardHeader">
              <div>
                <div className="recruitingMobileCardTitle">{record.teamName || record.linkedTrip?.name || "-"}</div>
                <div className="small">{formatContactName(record)}</div>
              </div>
              <span className="badge">{record.linkedTrip?.status || "Locked"}</span>
            </div>
            <div className="recruitingMobileMeta">
              <span>{record.linkedTrip?.site || record.site || "-"}</span>
              <span>{record.linkedTrip?.departureDate ? formatDate(record.linkedTrip.departureDate) : formatFlexibleDepartureDate(record.departureDate)}</span>
            </div>
            <div className="recruitingMobileActions" onClick={(event) => event.stopPropagation()}>
              <button className="btn" type="button" onClick={() => void openRecordDetails(record.id, "history")}>
                View History
              </button>
              {record.convertedTeamId ? (
                <button className="btn btnPrimary" type="button" onClick={() => router.push(`/trips/${encodeURIComponent(record.convertedTeamId)}`)}>
                  Open Team
                </button>
              ) : null}
            </div>
          </div>
        ))}
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

      {pageStatus ? (
        <div className="card pad" style={{ marginBottom: 14, color: "var(--primary)" }}>
          {pageStatus}
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

      {duplicateReviewGroups.length > 0 ? (
        <div className="card pad recruitingDuplicateReviewCard" style={{ marginBottom: 14 }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 900 }}>Duplicate Review</div>
              <div className="small">
                Review matching emails here, keep the best row, and clear the extras.
              </div>
            </div>
            <div className="spacer" />
            <span className="badge">{duplicateReviewGroups.length}</span>
          </div>
          <div className="recruitingDuplicateGroups" style={{ display: "grid", gap: 12 }}>
            {duplicateReviewGroups.map((group) => (
              <div
                key={group.email}
                className="recruitingDuplicateCard"
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(239,68,68,.18)",
                  background: "rgba(255,245,245,.9)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>{group.email}</div>
                  <span className="badge">Same email</span>
                  <span className="badge">{group.records.length} recruiting row{group.records.length === 1 ? "" : "s"}</span>
                  {group.activeTeams.length > 0 ? (
                    <span className="badge badgeWarn">
                      {group.activeTeams.length} active team match{group.activeTeams.length === 1 ? "" : "es"}
                    </span>
                  ) : null}
                </div>
                <div className="recruitingDuplicateRows" style={{ display: "grid", gap: 8 }}>
                  {group.records.map((record) => (
                    <div
                      key={record.id}
                      className="row recruitingDuplicateRow"
                      style={{
                        gap: 10,
                        alignItems: "flex-start",
                        paddingBottom: 8,
                        borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                      }}
                      >
                      <div className="recruitingDuplicateSummary" style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800 }}>{record.teamName || formatContactName(record)}</div>
                        <div className="small">
                          {getWorkflowBoardLabel(record)} | {record.assignedTo || "Unassigned"} | {record.stageLabel}
                        </div>
                        {(record.site || record.projectDates || record.teamMembers) ? (
                          <div className="small" style={{ marginTop: 4 }}>
                            {[
                              record.site ? `Site: ${record.site}` : "",
                              record.projectDates ? `Dates: ${record.projectDates}` : "",
                              record.teamMembers ? `People: ${getRecordPeopleSummary(record, 3)}` : "",
                            ]
                              .filter(Boolean)
                              .join(" | ")}
                          </div>
                        ) : null}
                      </div>
                      <div className="recruitingDuplicateActions">
                        <button
                          className="btn"
                          type="button"
                          onClick={() => void openRecordFromDuplicateReview(record)}
                        >
                          Open Row
                        </button>
                        {group.records.length > 1 ? (
                          <button
                          className="btn btnPrimary"
                          type="button"
                          onClick={() => void handleMergeDuplicateGroup(group, record)}
                          disabled={mergingDuplicateRecordId === record.id}
                        >
                          {mergingDuplicateRecordId === record.id ? "Merging..." : "Keep This Row"}
                        </button>
                        ) : null}
                        <button
                          className="btn"
                          type="button"
                          onClick={() => {
                            if (confirmingDeleteDuplicateRecordId === record.id) {
                              void handleDeleteDuplicateRecord(record);
                              return;
                            }
                            setConfirmingDeleteDuplicateRecordId(record.id);
                          }}
                          disabled={deletingDuplicateRecordId === record.id}
                        >
                          {deletingDuplicateRecordId === record.id
                            ? "Removing..."
                            : confirmingDeleteDuplicateRecordId === record.id
                            ? "Confirm Delete"
                            : "Remove Extra Row"}
                        </button>
                      </div>
                    </div>
                  ))}
                  {group.activeTeams.length > 0 ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      <div className="small" style={{ fontWeight: 900 }}>Already on Active Teams</div>
                      {group.activeTeams.map((member, index) => (
                        <div key={`${group.email}-${member.tripId || member.tripName || index}`} className="small">
                          {[member.name || member.email, member.tripName, member.tripStatus]
                            .filter(Boolean)
                            .join(" | ")}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
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

      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card pad">
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
              {selectedRecord && activeTab === "converted" ? (
                <button
                  className="btn"
                  type="button"
                  onClick={() => void openRecordDetails(selectedRecord?.id, "history")}
                >
                  Open Lock Team History
                </button>
              ) : null}
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
              <div style={{ fontWeight: 900 }}>
                {recordDetailsMode === "history"
                  ? activeTab === "outreach"
                    ? "Contact History"
                    : activeTab === "potential"
                    ? "Potential Team History"
                    : "Lock Team History"
                  : activeTab === "potential"
                  ? "Potential Team Details"
                  : "Edit Details"}
              </div>
              <div className="spacer" />
              {selectedRecord && recordDetailsMode !== "history" && !selectedRecord.isConvertedToTeam ? (
                <button
                  className="btn"
                  type="button"
                  onClick={() => void handleMoveRecordToNextYear(selectedRecord.id)}
                  disabled={isSavingNotes || selectedRecord.recruitingYear === NEXT_RECRUITING_YEAR}
                >
                  {selectedRecord.recruitingYear === NEXT_RECRUITING_YEAR
                    ? `Already on ${NEXT_RECRUITING_YEAR}`
                    : `Move to ${NEXT_RECRUITING_YEAR} Chart`}
                </button>
              ) : null}
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
              <button className="btn" type="button" onClick={() => setRecordDetailsModalOpen(false)}>
                Close
              </button>
            </div>
            {selectedRecord ? (
              <div style={{ display: "grid", gap: 12 }}>
                {recordDetailsMode !== "history" && (isSavingNotes || pageStatus) ? (
                  <div className="small" style={{ color: isSavingNotes ? "var(--primary)" : "var(--muted)" }}>
                    {isSavingNotes ? "Saving changes..." : pageStatus}
                  </div>
                ) : null}
                <div>
                  <div style={{ fontWeight: 800 }}>{formatContactName(selectedRecord)}</div>
                  <div className="small">{selectedRecord.contact?.email}</div>
                  {selectedRecord.contact?.phone ? (
                    <div className="small">{selectedRecord.contact.phone}</div>
                  ) : null}
                  {renderDuplicateNotice(
                    getDuplicateInfoForEmail(selectedRecord.contact?.email, {
                      excludeRecordId: selectedRecord.id,
                      includeActiveTeam: !selectedRecord.isConvertedToTeam,
                    })
                  )}
                </div>
                {recordDetailsMode !== "history" && !selectedRecord.isConvertedToTeam ? (
                  <>
                    <div className="small" style={{ fontWeight: 900, letterSpacing: ".04em", textTransform: "uppercase" }}>Contact Info</div>
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
                        value={selectedRecord.contact?.firstName || ""}
                        onChange={(event) => updateContactField(selectedRecord.id, "firstName", event.target.value)}
                      />
                    </div>
                    <div>
                      <div className="small" style={{ marginBottom: 6 }}>Last Name</div>
                      <input
                        className="input"
                        value={selectedRecord.contact?.lastName || ""}
                        onChange={(event) => updateContactField(selectedRecord.id, "lastName", event.target.value)}
                      />
                    </div>
                    <div>
                      <div className="small" style={{ marginBottom: 6 }}>Email</div>
                      <input
                        className="input"
                        value={selectedRecord.contact?.email || ""}
                        onChange={(event) => updateContactField(selectedRecord.id, "email", event.target.value)}
                      />
                    </div>
                    <div>
                      <div className="small" style={{ marginBottom: 6 }}>Phone</div>
                      <input
                        className="input"
                        value={selectedRecord.contact?.phone || ""}
                        onChange={(event) => updateContactField(selectedRecord.id, "phone", event.target.value)}
                        placeholder="Phone number"
                      />
                    </div>
                    <div>
                      <div className="small" style={{ marginBottom: 6 }}>Gender</div>
                      <select
                        className="input"
                        value={selectedRecord.contact?.gender || ""}
                        onChange={(event) => updateContactField(selectedRecord.id, "gender", event.target.value)}
                      >
                        <option value="">Not set</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    </div>
                  </>
                ) : null}
                {recordDetailsMode !== "history" ? (
                  <>
                    <div className="small" style={{ fontWeight: 900, letterSpacing: ".04em", textTransform: "uppercase" }}>Trip Details</div>
                    {!selectedRecord.isConvertedToTeam ? (
                      <div>
                        <div className="small" style={{ marginBottom: 6 }}>Team Name</div>
                        <input
                          className="input"
                          value={selectedRecord.teamName || ""}
                          onChange={(event) => updateSelectedRecord("teamName", event.target.value)}
                          placeholder="Team name"
                        />
                      </div>
                    ) : null}
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
                      <div className="small" style={{ marginBottom: 6 }}>Owner</div>
                      <select
                        className="input"
                        value={selectedRecord.assignedTo || PRIMARY_OWNER}
                        onChange={(event) => updateRecordOwner(selectedRecord.id, event.target.value)}
                      >
                        {OWNER_OPTIONS.map((owner) => (
                          <option key={owner} value={owner}>{owner}</option>
                        ))}
                      </select>
                    </div>
                    {!selectedRecord.isConvertedToTeam ? (
                      <div>
                        <div className="small" style={{ marginBottom: 6 }}>Project Dates</div>
                        <input
                          className="input"
                          value={selectedRecord.projectDates || ""}
                          onChange={(event) => updateSelectedRecord("projectDates", event.target.value)}
                          placeholder="Dates or season"
                        />
                      </div>
                    ) : null}
                    {!selectedRecord.isConvertedToTeam ? (
                      <div>
                        <div className="small" style={{ marginBottom: 6 }}>Site</div>
                        <select
                          className="input"
                          value={selectedRecord.site || ""}
                          onChange={(event) => updateSelectedRecord("site", event.target.value)}
                        >
                          <option value="">Select site</option>
                          {getSiteOptionsWithCurrent(selectedRecord.site).map((siteOption) => (
                            <option key={siteOption} value={siteOption}>{siteOption}</option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    {!selectedRecord.isConvertedToTeam ? (
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
                    ) : null}
                    {!selectedRecord.isConvertedToTeam ? (
                      <div>
                        <div className="small" style={{ marginBottom: 6 }}>Departure Date</div>
                        <input
                          className="input"
                          value={selectedRecord.departureDate || ""}
                          onChange={(event) => updateSelectedRecord("departureDate", event.target.value)}
                          placeholder="Month, season, or exact date"
                        />
                      </div>
                    ) : null}
                    {!selectedRecord.isConvertedToTeam ? (
                      <div className="recruitingInnerCard">
                        <div style={{ fontWeight: 900, marginBottom: 10 }}>Team Members</div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {selectedRecordPeople.length > 0 ? (
                            selectedRecordPeople.map((person, index) => {
                              const duplicateInfo = person.email
                                ? getDuplicateInfoForEmail(person.email, {
                                    excludeRecordId: selectedRecord.id,
                                  })
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
                                      onClick={() => handleRemovePersonFromSelectedRecord(index)}
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
                                value={recordPersonDraft.name}
                                onChange={(event) =>
                                  setRecordPersonDraft((current) => ({
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
                                value={recordPersonDraft.email}
                                onChange={(event) =>
                                  setRecordPersonDraft((current) => ({
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
                                checked={recordPersonDraft.isMinor}
                                onChange={(event) =>
                                  setRecordPersonDraft((current) => ({
                                    ...current,
                                    isMinor: event.target.checked,
                                    minorAge: event.target.checked ? current.minorAge : "",
                                  }))
                                }
                              />
                            </label>
                            {recordPersonDraft.isMinor ? (
                              <div>
                                <div className="small" style={{ marginBottom: 6 }}>Age</div>
                                <input
                                  className="input"
                                  type="number"
                                  min="0"
                                  value={recordPersonDraft.minorAge}
                                  onChange={(event) =>
                                    setRecordPersonDraft((current) => ({
                                      ...current,
                                      minorAge: event.target.value,
                                    }))
                                  }
                                  placeholder="14"
                                />
                              </div>
                            ) : null}
                            <button className="btn" type="button" onClick={handleAddPersonToSelectedRecord}>
                              Add Person
                            </button>
                          </div>
                          {renderDuplicateNotice(recordPersonDuplicateInfo)}
                        </div>
                      </div>
                    ) : null}
                    {!selectedRecord.isConvertedToTeam ? (
                      <>
                        <div className="small" style={{ fontWeight: 900, letterSpacing: ".04em", textTransform: "uppercase" }}>Contact History</div>
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
                                Add Contact
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div className="small">No contact history logged yet.</div>
                            <div>
                              <button
                                className="btn"
                                type="button"
                                onClick={() => openContactActionModal(selectedRecord, "email")}
                              >
                                Add Contact
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}
                    <div className="small" style={{ fontWeight: 900, letterSpacing: ".04em", textTransform: "uppercase" }}>Notes</div>
                    <div>
                      <div className="small" style={{ marginBottom: 6 }}>Mackayla Notes</div>
                      <textarea
                        className="input"
                        rows={4}
                        value={stripHandoffSummary(selectedRecord.mackaylaNotes)}
                        onChange={(event) => updateRecordMackaylaNotes(selectedRecord.id, event.target.value)}
                      />
                    </div>
                    <div>
                      <div className="small" style={{ marginBottom: 6 }}>Leslee Notes</div>
                      <textarea
                        className="input"
                        rows={4}
                        value={selectedRecord.lesleeNotes || ""}
                        onChange={(event) => updateSelectedRecord("lesleeNotes", event.target.value)}
                      />
                    </div>
                    <div className="small" style={{ fontWeight: 900, letterSpacing: ".04em", textTransform: "uppercase" }}>Actions</div>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <button className="btn btnPrimary" type="button" onClick={() => handleSaveRecord()}>
                        {isSavingNotes ? "Saving..." : "Save Record"}
                      </button>
                      {activeTab === "outreach" ? (
                        <button className="btn" type="button" onClick={() => handlePromote(selectedRecord)}>
                          Promote To Potential Teams
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
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
                  {getSiteOptionsWithCurrent(promoteDraft.site).map((siteOption) => (
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
          <div className="card pad appModalCard" style={{ width: "min(620px, 100%)" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>Add Contact Or Team</div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={() => setAddContactModalOpen(false)}>
                Close
              </button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <div className="small">
                Use one row for a single person, a couple, or a whole team. Keep the primary contact here and list the rest below.
              </div>
              <div className="small">
                Only first and last name are required. Email and phone are optional.
              </div>
              <input
                className="input"
                value={newContactDraft.firstName}
                onChange={(event) =>
                  setNewContactDraft((current) => ({ ...current, firstName: event.target.value }))
                }
                placeholder="Primary Contact First Name"
              />
              <input
                className="input"
                value={newContactDraft.lastName}
                onChange={(event) =>
                  setNewContactDraft((current) => ({ ...current, lastName: event.target.value }))
                }
                placeholder="Primary Contact Last Name"
              />
              <input
                className="input"
                value={newContactDraft.teamName}
                onChange={(event) =>
                  setNewContactDraft((current) => ({ ...current, teamName: event.target.value }))
                }
                placeholder="Team Name"
              />
              <input
                className="input"
                value={newContactDraft.email}
                onChange={(event) =>
                  setNewContactDraft((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="Primary Contact Email"
              />
              <input
                className="input"
                value={newContactDraft.phone}
                onChange={(event) =>
                  setNewContactDraft((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="Primary Contact Phone"
              />
              {renderDuplicateNotice(newContactDuplicateInfo)}
              <select
                className="input"
                value={newContactDraft.gender}
                onChange={(event) =>
                  setNewContactDraft((current) => ({ ...current, gender: event.target.value }))
                }
              >
                <option value="">Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <select
                className="input"
                value={newContactDraft.assignedTo}
                onChange={(event) =>
                  setNewContactDraft((current) => ({ ...current, assignedTo: event.target.value }))
                }
              >
                <option value="">Assign Staff</option>
                {OWNER_OPTIONS.map((owner) => (
                  <option key={owner} value={owner}>{owner}</option>
                ))}
              </select>
              <div style={{ display: "grid", gap: 8 }}>
                <div className="small">Team Members</div>
                {newContactPeople.length > 0 ? (
                  newContactPeople.map((person, index) => {
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
                            onClick={() => handleRemovePersonFromNewContact(index)}
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
                      value={newContactPersonDraft.name}
                      onChange={(event) =>
                        setNewContactPersonDraft((current) => ({
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
                      value={newContactPersonDraft.email}
                      onChange={(event) =>
                        setNewContactPersonDraft((current) => ({
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
                      checked={newContactPersonDraft.isMinor}
                      onChange={(event) =>
                        setNewContactPersonDraft((current) => ({
                          ...current,
                          isMinor: event.target.checked,
                          minorAge: event.target.checked ? current.minorAge : "",
                        }))
                      }
                    />
                  </label>
                  {newContactPersonDraft.isMinor ? (
                    <div>
                      <div className="small" style={{ marginBottom: 6 }}>Age</div>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={newContactPersonDraft.minorAge}
                        onChange={(event) =>
                          setNewContactPersonDraft((current) => ({
                            ...current,
                            minorAge: event.target.value,
                          }))
                        }
                        placeholder="14"
                      />
                    </div>
                  ) : null}
                  <button className="btn" type="button" onClick={handleAddPersonToNewContact}>
                    Add Person
                  </button>
                </div>
                {renderDuplicateNotice(newContactPersonDuplicateInfo)}
              </div>
              <button className="btn btnPrimary" type="button" onClick={handleCreateContact}>
                Save Recruiting Row
              </button>
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
              <div style={{ fontWeight: 900 }}>Form Team</div>
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
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Team Name</div>
                <input
                  className="input"
                  value={teamFormDraft.name}
                  onChange={(event) => updateTeamFormDraft("name", event.target.value)}
                  placeholder="2026 Brazil Team"
                />
              </div>
              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Team Members</div>
                <div className="small" style={{ marginBottom: 10 }}>
                  Add the roster here. Leave personal dates blank if they use the main trip dates.
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {teamFormDraft.teamMembers.map((member, index) => (
                    <div
                      key={`form-team-member-${index}`}
                      style={{
                        border: "1px solid rgba(18, 16, 12, 0.08)",
                        borderRadius: 14,
                        padding: 12,
                        background: "rgba(255,255,255,.72)",
                      }}
                    >
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                          <input
                            className="input"
                            value={member.firstName}
                            onChange={(event) => updateTeamFormMember(index, "firstName", event.target.value)}
                            placeholder="First name"
                          />
                          <input
                            className="input"
                            value={member.lastName}
                            onChange={(event) => updateTeamFormMember(index, "lastName", event.target.value)}
                            placeholder="Last name"
                          />
                          <input
                            className="input"
                            type="email"
                            value={member.email}
                            onChange={(event) => updateTeamFormMember(index, "email", event.target.value)}
                            placeholder="Email"
                          />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                          <div>
                            <div className="small" style={{ marginBottom: 6 }}>Leave Date</div>
                            <input
                              className="input"
                              type="date"
                              value={member.startDate}
                              onChange={(event) => updateTeamFormMember(index, "startDate", event.target.value)}
                            />
                          </div>
                          <div>
                            <div className="small" style={{ marginBottom: 6 }}>Return Date</div>
                            <input
                              className="input"
                              type="date"
                              value={member.endDate}
                              onChange={(event) => updateTeamFormMember(index, "endDate", event.target.value)}
                            />
                          </div>
                        </div>
                        <div className="row">
                          <div className="small" style={{ alignSelf: "center" }}>
                            Leave member dates blank to use the main project dates.
                          </div>
                          <div className="spacer" />
                          <button className="btn" type="button" onClick={() => removeTeamFormMemberRow(index)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn" type="button" onClick={addTeamFormMemberRow}>
                    Add Team Member
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Project Leave Date</div>
                  <input
                    className="input"
                    type="date"
                    value={teamFormDraft.startDate}
                    onChange={(event) => updateTeamFormDraft("startDate", event.target.value)}
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Project Return Date</div>
                  <input
                    className="input"
                    type="date"
                    value={teamFormDraft.endDate}
                    onChange={(event) => updateTeamFormDraft("endDate", event.target.value)}
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Site</div>
                  <select
                    className="input"
                    value={teamFormDraft.location}
                    onChange={(event) => updateTeamFormDraft("location", event.target.value)}
                  >
                    <option value="">Select site</option>
                    {getSiteOptionsWithCurrent(teamFormDraft.location).map((siteOption) => (
                      <option key={siteOption} value={siteOption}>{siteOption}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Host Name</div>
                  <input
                    className="input"
                    value={teamFormDraft.host}
                    onChange={(event) => updateTeamFormDraft("host", event.target.value)}
                    placeholder="Host name"
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Site Type</div>
                  <select
                    className="input"
                    value={teamFormDraft.siteType}
                    onChange={(event) => updateTeamFormDraft("siteType", event.target.value)}
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
                    value={teamFormDraft.trainingTimelineType}
                    onChange={(event) => updateTeamFormDraft("trainingTimelineType", event.target.value)}
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
                    value={teamFormDraft.projectLengthSummary}
                    onChange={(event) => updateTeamFormDraft("projectLengthSummary", event.target.value)}
                    placeholder="6 weeks, with a 3-week subgroup"
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Type of Project</div>
                  <select
                    className="input"
                    value={teamFormDraft.projectType}
                    onChange={(event) => updateTeamFormDraft("projectType", event.target.value)}
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
                    value={teamFormDraft.extraTravelStatus}
                    onChange={(event) => updateTeamFormDraft("extraTravelStatus", event.target.value)}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                    <option value="maybe">Maybe</option>
                  </select>
                </div>
              </div>
              <div style={{ fontWeight: 900, marginTop: 4 }}>Funding & Fees</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Fundraising Goal</div>
                  <input
                    className="input recruitingFundingInput"
                    type="number"
                    min="0"
                    step="1"
                    value={teamFormDraft.fundraisingGoalAmount}
                    onChange={(event) => updateTeamFormDraft("fundraisingGoalAmount", event.target.value)}
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
                    value={teamFormDraft.tripFeeAmount}
                    onChange={(event) => updateTeamFormDraft("tripFeeAmount", event.target.value)}
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
                    value={teamFormDraft.materialsFeeAmount}
                    onChange={(event) => updateTeamFormDraft("materialsFeeAmount", event.target.value)}
                    placeholder="250"
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Deferred Worker</div>
                  <select
                    className="input"
                    value={teamFormDraft.hasDeferredWorker}
                    onChange={(event) => updateTeamFormDraft("hasDeferredWorker", event.target.value)}
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
                    value={teamFormDraft.hannoverHousingFeeAmount}
                    onChange={(event) => updateTeamFormDraft("hannoverHousingFeeAmount", event.target.value)}
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
                    value={teamFormDraft.domesticProjectFeeAmount}
                    onChange={(event) => updateTeamFormDraft("domesticProjectFeeAmount", event.target.value)}
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
                    value={teamFormDraft.domesticFeeAmount}
                    onChange={(event) => updateTeamFormDraft("domesticFeeAmount", event.target.value)}
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
                    value={teamFormDraft.domesticMaterialsFeeAmount}
                    onChange={(event) => updateTeamFormDraft("domesticMaterialsFeeAmount", event.target.value)}
                    placeholder="225"
                  />
                </div>
              </div>
              <div style={{ fontWeight: 900, marginTop: 4 }}>Recruiting Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Project Dates</div>
                  <input
                    className="input"
                    value={teamFormDraft.recruitingProjectDates}
                    onChange={(event) => updateTeamFormDraft("recruitingProjectDates", event.target.value)}
                    placeholder="Dates or season"
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Weeks</div>
                  <input
                    className="input"
                    value={teamFormDraft.recruitingWeeks}
                    onChange={(event) => updateTeamFormDraft("recruitingWeeks", event.target.value)}
                    placeholder="Number of weeks"
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Departure Date</div>
                  <input
                    className="input"
                    value={teamFormDraft.recruitingDepartureDate}
                    onChange={(event) => updateTeamFormDraft("recruitingDepartureDate", event.target.value)}
                    placeholder="Month, season, or exact date"
                  />
                </div>
              </div>
              {!teamFormDraft.startDate && teamFormDraft.recruitingDepartureDate ? (
                <div className="small">
                  Recruiting departure note saved: {teamFormDraft.recruitingDepartureDate}
                </div>
              ) : null}
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Mackayla Notes</div>
                <textarea
                  className="input"
                  rows={3}
                  value={teamFormDraft.mackaylaNotes}
                  onChange={(event) => updateTeamFormDraft("mackaylaNotes", event.target.value)}
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Leslee Notes</div>
                <textarea
                  className="input"
                  rows={3}
                  value={teamFormDraft.lesleeNotes}
                  onChange={(event) => updateTeamFormDraft("lesleeNotes", event.target.value)}
                />
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button
                className="btn btnPrimary"
                type="button"
                onClick={handleFormTeam}
                disabled={isFormingTeam}
              >
                {isFormingTeam ? "Adding Trip..." : "Form Team"}
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
