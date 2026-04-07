import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import Spinner from "@/components/Spinner";
import ConfirmModal from "@/components/ConfirmModal";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Fragment,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { requireSession } from "@/lib/auth";
import {
  assignWorkerByEmailToTrip,
  deleteTrip,
  getTripForCurrentUser,
  listTripParticipants,
  removeTripAssignment,
  saveTripParticipantDocumentTypes,
  updateTripForCurrentUser,
} from "@/lib/trips";
import { isAdminRole, isLeaderRole, isManagerRole } from "@/lib/roles";
import {
  listTripTeamMembers,
  saveTripTeamMemberFundraisingUrl,
  saveTripTeamMembers,
  updateTripTeamMemberTshirtSize,
} from "@/lib/tripTeamMembers";
import { pruneTripTicketsForNonTravelingLeaders } from "@/lib/tripTickets";
import { SITE_OPTIONS } from "@/lib/siteOptions";
import {
  getTrainingModuleDeadline,
  listTrainingModules,
  listTrainingProgress,
  resolveProfileIdByEmailForTraining,
  saveTrainingProgress,
} from "@/lib/training";
import {
  getTrainingSessionOptionsForModuleTitle,
  hydrateTrainingSessionDateFromDb,
  resolveTrainingSessionSelectValue,
} from "@/lib/trainingSessionOptions";
import { saveFundraisingProfile } from "@/lib/fundraising";
import {
  addLinkResource,
  addPdfResource,
  deleteResource,
  insertResourceFromSnapshot,
  isMissingResourceTutorialColumnError,
  listResources,
  updateResource,
} from "@/lib/resources";
import {
  DOCUMENT_CATEGORY_OPTIONS,
  getDocumentSlotByKey,
  getSmartsheetBudgetTutorialCards,
  REQUIRED_TRIP_DOCUMENT_SLOTS,
} from "@/lib/tripDocumentSlots";
import { percentComplete } from "@/lib/tasks";
import {
  listStaffTasksForTrip,
  isTaskAssignedToUser,
  saveStaffTasks as persistStaffTasks,
  sortStaffTasksByTemplate,
  computeStaffTaskDueDate,
  getStaffTaskAreaSortRank,
  listStaffTaskTemplateWorkAreas,
  STAFF_TASKS_UPDATED_EVENT,
} from "@/lib/staffTasks";
import {
  createTripTask,
  listTripTasks,
  updateTripTask,
  listUserTaskProgress,
  loadProfileEmailsByUserIds,
  saveUserTaskProgress,
} from "@/lib/tripTasks";
import {
  listReferenceEmails,
  referenceRowToStateKey,
  saveReferenceEmail,
} from "@/lib/referenceEmails";
import {
  deleteTripOverviewNote,
  listTripOverviewNotes,
  saveTripOverviewNote,
} from "@/lib/tripOverviewNotes";
import {
  deleteTripAnnouncement,
  listTripAnnouncements,
  saveTripAnnouncement,
} from "@/lib/tripAnnouncements";
import { saveTripFundraisingSettings } from "@/lib/tripFundraising";
import { listTripActivity, logTripActivity } from "@/lib/tripActivity";
import {
  getTripUserDocumentTypes,
  getUserDocumentTypeLabel,
  normalizeCustomUserDocumentTypes,
} from "@/lib/userDocumentTypes";
import {
  deleteUserDocument,
  listTripUserDocuments,
  saveUserDocumentUpload,
} from "@/lib/userDocuments";
import {
  DEFAULT_TRAINING_TIMELINE_TYPE,
  TRAINING_TIMELINE_OPTIONS,
  findWorkerTaskTemplate,
} from "@/lib/workerTaskTemplate";
import { findStaffTaskTemplate } from "@/lib/staffTaskTemplate";
import {
  EMPTY_RECORD as TRAVEL_FORM_EMPTY,
  getTravelFormForRef,
  saveTravelFormForRef,
  listTravelFormResponsesForTrip,
  travelFormRowToRefKey,
} from "@/lib/travelForm";
import {
  fillTravelFormExportTemplate,
  TRAVEL_FORM_TEMPLATE_PATH,
} from "@/lib/travelFormExport";
import * as XLSX from "xlsx";
import { showToast } from "@/components/Toast";
import ExpandableCollapsibleSection from "@/components/CollapsibleSection";
import TripTravelSafetySection from "@/components/TripTravelSafetySection";
import RosterTshirtSizeSelect from "@/components/RosterTshirtSizeSelect";
import { deleteTripMeeting, listTripMeetings, saveTripMeeting } from "@/lib/tripMeetings";
import {
  getTripBudget,
  getTripHousingDocumentsForViewer,
  getTripSiteLogisticsUrlForViewer,
  listSiteBudgetNotes,
  saveTripBudget,
  uploadTripHousingPdf,
} from "@/lib/tripBudget";
import {
  findSiteBudgetNoteForOption,
  resolveCanonicalSiteLabelForTrip,
  resolveSiteBudgetNoteForTripLocation,
  resolveTripSiteLogisticsUrl,
} from "@/lib/siteMaterials";
import {
  parseAnyWorkbookInventoryString,
  summarizeWorkbookItemsForShipping,
} from "@/lib/workbookInventory";
import { resolveSiteLogisticsUrl } from "@/lib/siteInfoLinks";

function CollapsibleSection({
  title,
  subtitle,
  badge,
  rightSlot,
  children,
  className = "",
  style,
}) {
  return (
    <div
      className={className}
      style={{
        border: "none",
        borderRadius: 0,
        background: "transparent",
        overflow: "visible",
        width: "100%",
        minWidth: 0,
        ...style,
      }}
    >
      {(title || subtitle || badge || rightSlot) ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 0 10px 0",
            background: "transparent",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {title ? <div style={{ fontWeight: 800 }}>{title}</div> : null}
            {subtitle ? (
              <div className="small" style={{ marginTop: 2, opacity: 0.85 }}>
                {subtitle}
              </div>
            ) : null}
          </div>
          {badge ? <span style={{ flexShrink: 0 }}>{badge}</span> : null}
          {rightSlot ? <div style={{ flexShrink: 0 }}>{rightSlot}</div> : null}
        </div>
      ) : null}
      <div>{children}</div>
    </div>
  );
}

const APP_STATUS_TONES = {
  neutral: {
    color: "var(--muted)",
    background: "rgba(148, 163, 184, 0.10)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
  },
  info: {
    color: "var(--info)",
    background: "rgba(59, 130, 246, 0.10)",
    border: "1px solid rgba(59, 130, 246, 0.18)",
  },
  success: {
    color: "var(--success)",
    background: "rgba(34, 197, 94, 0.10)",
    border: "1px solid rgba(34, 197, 94, 0.18)",
  },
  warning: {
    color: "var(--warn)",
    background: "rgba(245, 158, 11, 0.10)",
    border: "1px solid rgba(245, 158, 11, 0.18)",
  },
  danger: {
    color: "var(--danger)",
    background: "rgba(239, 68, 68, 0.10)",
    border: "1px solid rgba(239, 68, 68, 0.18)",
  },
};

function AppStatusMessage({
  message,
  tone = "neutral",
  compact = false,
  actionLabel,
  onAction,
}) {
  if (!message) return null;
  const palette = APP_STATUS_TONES[tone] || APP_STATUS_TONES.neutral;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        padding: compact ? "4px 8px" : "8px 10px",
        borderRadius: 12,
        fontSize: compact ? 12 : 13,
        lineHeight: 1.45,
        ...palette,
      }}
    >
      <span>{message}</span>
      {actionLabel && onAction ? (
        <button type="button" className="btn btnPrimary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function AppEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 14,
        border: "1px dashed rgba(15, 23, 42, 0.16)",
        background: "rgba(248, 250, 252, 0.75)",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ fontWeight: 800, color: "var(--text)" }}>{title}</div>
      {description ? (
        <div className="small" style={{ color: "var(--muted)", lineHeight: 1.5 }}>
          {description}
        </div>
      ) : null}
      {actionLabel && onAction ? (
        <div style={{ marginTop: 4 }}>
          <button type="button" className="btn" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AppMetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}) {
  const palette = APP_STATUS_TONES[tone] || APP_STATUS_TONES.neutral;
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 16,
        minHeight: 112,
        background: "#fff",
        border: palette.border,
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
        display: "grid",
        gap: 8,
        alignContent: "start",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: palette.color,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 900, color: "var(--text)" }}>
        {value}
      </div>
      {detail ? (
        <div className="small" style={{ color: "var(--muted)", lineHeight: 1.5 }}>
          {detail}
        </div>
      ) : null}
    </div>
  );
}

function AppDetailAction({
  href,
  onClick,
  children = "View details",
  compact = false,
}) {
  const commonStyle = compact
    ? {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        marginTop: 4,
        padding: "4px 10px",
        fontSize: 12,
      }
    : undefined;
  if (onClick) {
    return (
      <button type="button" className="btn" style={commonStyle} onClick={onClick}>
        {children}
      </button>
    );
  }
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="btn"
      style={commonStyle}
    >
      {children}
    </a>
  );
}

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DUE_DATE_YEAR_OPTIONS = (() => {
  const end = new Date().getFullYear() + 6;
  const out = [];
  for (let y = end; y >= 2019; y--) out.push(String(y));
  return out;
})();

const DUE_DATE_MONTH_OPTIONS = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

function parseYmdParts(ymd) {
  const t = String(ymd || "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return { year: "", month: "", day: "" };
  return { year: m[1], month: String(Number(m[2])), day: String(Number(m[3])) };
}

function buildYmdFromParts(year, month, day) {
  const y = String(year);
  const mo = Number(month);
  const dd = Number(day);
  if (!y || !Number.isFinite(mo) || !Number.isFinite(dd)) return "";
  const dim = new Date(Number(y), mo, 0).getDate();
  const dClamped = Math.min(Math.max(1, dd), dim);
  return `${y}-${String(mo).padStart(2, "0")}-${String(dClamped).padStart(2, "0")}`;
}

function dayOptionsForYmd(year, month) {
  if (!year || !month) return [];
  const dim = new Date(Number(year), Number(month), 0).getDate();
  return Array.from({ length: dim }, (_, i) => String(i + 1));
}

/** No native calendar popup — avoids month arrows closing staff/worker task editors. */
const AppDueDateTripleSelect = forwardRef(function AppDueDateTripleSelect(
  { value, onChange, compact = false },
  ref
) {
  const [parts, setParts] = useState(() => parseYmdParts(value));
  const partsRef = useRef(parts);
  partsRef.current = parts;

  useEffect(() => {
    setParts(parseYmdParts(value));
  }, [value]);

  useImperativeHandle(ref, () => ({
    /** `YYYY-MM-DD` when complete, `""` when all cleared, `null` when partially selected. */
    getDueYmd() {
      const p = partsRef.current;
      if (!p.year && !p.month && !p.day) return "";
      if (p.year && p.month && p.day) return buildYmdFromParts(p.year, p.month, p.day);
      return null;
    },
  }));

  const emit = (next) => {
    partsRef.current = next;
    setParts(next);
    if (next.year && next.month && next.day) {
      onChange(buildYmdFromParts(next.year, next.month, next.day));
    } else if (!next.year && !next.month && !next.day) {
      onChange("");
    }
  };

  const { year, month, day } = parts;
  const days = dayOptionsForYmd(year, month);
  const inputStyle = compact
    ? { padding: "6px 8px", fontSize: 12, minWidth: 0 }
    : { padding: "7px 10px", fontSize: 13, minWidth: 0 };

  return (
    <div className="row" style={{ flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      <select
        className="input"
        aria-label="Due year"
        style={{ ...inputStyle, width: compact ? 76 : 90 }}
        value={year}
        onChange={(e) => {
          const y = e.target.value;
          if (!y) emit({ year: "", month: "", day: "" });
          else emit({ year: y, month: "", day: "" });
        }}
      >
        <option value="">Year</option>
        {DUE_DATE_YEAR_OPTIONS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select
        className="input"
        aria-label="Due month"
        disabled={!year}
        style={{ ...inputStyle, width: compact ? 72 : 80 }}
        value={month}
        onChange={(e) => {
          const mo = e.target.value;
          if (!mo) emit({ year, month: "", day: "" });
          else emit({ year, month: mo, day: "" });
        }}
      >
        <option value="">Month</option>
        {DUE_DATE_MONTH_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        className="input"
        aria-label="Due day"
        disabled={!year || !month}
        style={{ ...inputStyle, width: compact ? 54 : 62 }}
        value={day}
        onChange={(e) => {
          const d = e.target.value;
          if (!d) emit({ year, month, day: "" });
          else if (year && month) emit({ year, month, day: d });
        }}
      >
        <option value="">Day</option>
        {days.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
});
AppDueDateTripleSelect.displayName = "AppDueDateTripleSelect";

const STAFF_TASK_AREA_LABELS = {
  "Team/Project Formation": "Project Formation",
  "Support During Project": "During Project",
};

const CUSTOM_SITE_OPTION = "__custom__";
const TEAM_STATUS_OPTIONS = [
  "Forming",
  "Confirmed",
  "Support Raising",
  "Ready to Go",
  "On Field",
  "Complete",
  "On Hold",
];

const TEAM_MEMBER_ROLE_OPTIONS = ["Worker", "Staff", "Leader"];

/** Section values for custom worker trip tasks (matches checklist grouping). */
const WORKER_TRIP_TASK_SECTION_OPTIONS = [
  "General",
  "Fundraising",
  "Training",
  "Travel",
  "Uploads",
];

const BIRTHDATE_MONTH_OPTIONS = ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const BIRTHDATE_DAY_OPTIONS = ["", ...Array.from({ length: 31 }, (_, i) => String(i + 1))];
const BIRTHDATE_YEAR_OPTIONS = (() => {
  const end = new Date().getFullYear() + 2;
  const start = end - 100;
  return ["", ...Array.from({ length: end - start + 1 }, (_, i) => String(start + i))];
})();
const GENDER_OPTIONS = ["", "Male", "Female"];
const YES_NO_OPTIONS = ["", "Yes", "No"];

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeLegacyTeamRole(role) {
  const r = String(role || "").trim();
  if (!r) return "Worker";
  if (r.toLowerCase() === "trainer") return "Worker";
  return r;
}

/** Workers, staff, and leaders who travel; remote (non-traveling) leaders are excluded from worker counts and personal pipeline. */
function shouldIncludeInTripWorkerPipeline(trip, email) {
  const e = normalizeEmail(email);
  if (!e) return true;
  const tm = (trip?.teamMembers || []).find((m) => normalizeEmail(m.email) === e);
  if (!tm) return true;
  const role = String(tm.teamRole || "").trim().toLowerCase();
  if (role === "leader" && tm.travelsWithTeam === false) return false;
  return true;
}

/** Budget `num_workers` → controlled input value (number or empty). */
function numWorkersDraftFromBudgetValue(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

function getWorkerConnectionStatus(member) {
  if (member?.connected) {
    return {
      statusLabel: "Ready",
      statusBadgeClass: "badgeSuccess",
      accountLabel: "Joined",
      accountBadgeClass: "badgeSuccess",
      canInvite: false,
      inviteLabel: "Account Created",
      inviteTitle: "Account created",
    };
  }

  if (member?.email) {
    return {
      statusLabel: "Invitable",
      statusBadgeClass: "badgeWarn",
      accountLabel: "Waiting for account creation",
      accountBadgeClass: "badgeWarn",
      canInvite: true,
      inviteLabel: "Send Invite",
      inviteTitle: "Send a new invite email",
    };
  }

  return {
    statusLabel: "Missing Email",
    statusBadgeClass: "",
    accountLabel: "Cannot Invite",
    accountBadgeClass: "",
    canInvite: false,
    inviteLabel: "Send Invite",
    inviteTitle: "Add an email before sending an invite",
  };
}

function buildWorkerInvitePayload(email, trip) {
  const loginUrl = typeof window !== "undefined"
    ? `${window.location.origin}/login?next=${encodeURIComponent(`/trips/${trip?.id || ""}`)}`
    : "/login";
  const tripName = trip?.name || "your LST team";
  const site = trip?.location ? ` for ${trip.location}` : "";
  const subject = `Join ${tripName} on the LST app`;
  const body = [
    "Hi,",
    "",
    `You have been added to ${tripName}${site} in the LST app.`,
    "",
    "Create your account here:",
    loginUrl,
    "",
    "Use this same email address so your account links to the team automatically.",
    "",
    "Thanks!",
  ].join("\n");

  return { loginUrl, subject, body };
}

/** Prefer an explicit https link (e.g. SharePoint) over pdf when both exist. */
function preferredTripResourceOpenUrl(doc) {
  if (!doc) return "";
  const link = String(doc.link || "").trim();
  const pdf = String(doc.pdfUrl || "").trim();
  if (/^https?:\/\//i.test(link)) return link;
  if (/^https?:\/\//i.test(pdf)) return pdf;
  return link || pdf;
}

function formatDraftAmount(value) {
  return value === null || value === undefined || value === "" ? "" : String(value);
}

function buildDateOffsetFromToday(daysToAdd) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Number(daysToAdd || 0));
  return date.toISOString().slice(0, 10);
}

function buildTripSetupDraft(trip) {
  return {
    name: trip?.name || "",
    location: trip?.location || "",
    host: trip?.host || "",
    siteType: trip?.siteType || "",
    teamStatus: trip?.teamStatus || "",
    trainingTimelineType:
      trip?.trainingTimelineType || DEFAULT_TRAINING_TIMELINE_TYPE,
    projectType: trip?.projectType || "",
    projectLengthSummary: trip?.projectLengthSummary || "",
    extraTravelStatus: trip?.extraTravelStatus || "no",
    startDate: trip?.startDate || "",
    endDate: trip?.endDate || "",
    fundraisingGoalAmount: formatDraftAmount(trip?.fundraisingGoalAmount),
    tripFeeAmount: formatDraftAmount(trip?.tripFeeAmount),
    materialsFeeAmount: formatDraftAmount(trip?.materialsFeeAmount),
    hasDeferredWorker: trip?.hasDeferredWorker ? "yes" : "no",
    hannoverHousingFeeAmount: formatDraftAmount(trip?.hannoverHousingFeeAmount),
    domesticProjectFeeAmount: formatDraftAmount(trip?.domesticProjectFeeAmount),
    domesticFeeAmount: formatDraftAmount(trip?.domesticFeeAmount),
    domesticMaterialsFeeAmount: formatDraftAmount(trip?.domesticMaterialsFeeAmount),
  };
}

function createEmptyRosterMember() {
  return {
    id: "",
    assignmentId: "",
    profileId: "",
    connected: false,
    firstName: "",
    lastName: "",
    email: "",
    teamRole: "Worker",
    travelsWithTeam: true,
    tshirtSize: "",
    startDate: "",
    endDate: "",
  };
}

function createEmptyWorkerDraft() {
  return {
    firstName: "",
    lastName: "",
    email: "",
    teamRole: "Worker",
    travelsWithTeam: true,
    assignmentMode: "unassigned",
  };
}

function buildStaffTaskRowDomId(taskId) {
  return `staff-task-row-${String(taskId || "").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function buildWorkerTaskRowDomId(taskId) {
  return `worker-task-row-${String(taskId || "").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function buildTrainingModuleRowDomId(moduleId) {
  return `training-module-row-${String(moduleId || "").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

const TRAINING_MEETING_MODULE_TITLES = new Set(["Basic Training", "Gateway Training", "EndMeeting"]);

/** Supplemental sessions the worker chose (Basic / Gateway / End meeting) → overview Meetings list. */
function buildTrainingSessionMeetingsFromState(trainingState, allTrainingModules) {
  if (!trainingState || !allTrainingModules?.length) return [];
  const rows = [];
  for (const module of allTrainingModules) {
    if (!TRAINING_MEETING_MODULE_TITLES.has(module.title)) continue;
    const raw = String(trainingState[`${module.id}Date`] || "").trim();
    if (!raw) continue;
    let scheduledAt = raw;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      scheduledAt = `${raw}T12:00:00`;
    }
    const t = new Date(scheduledAt).getTime();
    if (Number.isNaN(t)) continue;
    const displayTitle = module.title === "EndMeeting" ? "End meeting" : module.title;
    rows.push({
      id: `training-session:${module.id}`,
      title: displayTitle,
      scheduledAt,
      notesAfter: "",
      isTrainingSession: true,
    });
  }
  return rows;
}

function getDocumentCategoryBadgeClass(category) {
  if (category === "Flights") return "badgeWarn";
  if (category === "Travel") return "badgeInfo";
  if (category === "Insurance") return "badgeWarn";
  if (category === "Budget") return "badgeSuccess";
  if (category === "Site") return "badgeInfo";
  return "";
}

const siteLinkActionButtonStyle = {
  minWidth: 168,
  justifyContent: "center",
};

function buildDocumentDraft(overrides = {}) {
  return {
    title: "",
    link: "",
    category: "Other",
    workerName: "",
    workArea: "",
    resourceKey: "",
    visibleToParticipants: true,
    tutorialTitle: "",
    tutorialUrl: "",
    tutorialDescription: "",
    ...overrides,
  };
}

function getEffectiveTutorialContent(slot, doc) {
  return {
    tutorialTitle: doc?.tutorialTitle || slot?.tutorialTitle || "",
    tutorialUrl: doc?.tutorialUrl || slot?.tutorialUrl || "",
    tutorialDescription: doc?.tutorialDescription || slot?.tutorialDescription || "",
  };
}

function listEffectiveTutorials(slot, doc) {
  const primary = getEffectiveTutorialContent(slot, doc);
  const out = [];
  if (String(primary.tutorialUrl || "").trim()) {
    out.push(primary);
  }
  if (slot?.key === "smartsheet-budget" && String(slot?.tutorial2Url || "").trim()) {
    out.push({
      tutorialTitle: slot.tutorial2Title || "",
      tutorialUrl: slot.tutorial2Url || "",
      tutorialDescription: slot.tutorial2Description || "",
    });
  }
  return out;
}

const tripDocDeleteButtonStyle = {
  background: "#fff",
  color: "#b91c1c",
  border: "2px solid #b91c1c",
};

function tripDocumentTileRootClassName(wide) {
  return ["card", "tripDocumentSquareTile", wide ? "tripDocumentSquareTileWide" : ""].filter(Boolean).join(" ");
}

const tripDocumentWideCardStyle = {
  boxShadow: "none",
  borderColor: "rgba(15, 23, 42, 0.08)",
  display: "flex",
  flexDirection: "column",
};

/** Optional / extra trip documents with category Flights — show directly under the Flights slot. */
function isTripDocumentFlightsCategory(doc) {
  const c = String(doc?.category ?? "").trim().toLowerCase();
  return c === "flights" || c === "flight";
}

function categoryForTripResourceDoc(doc) {
  const rk = String(doc?.resourceKey || "").trim();
  if (rk === "flights") return "Flights";
  if (rk === "trip-insurance") return "Insurance";
  const slot = getDocumentSlotByKey(rk);
  if (slot?.category) return slot.category;
  const c = String(doc?.category || "").trim();
  return DOCUMENT_CATEGORY_OPTIONS.includes(c) ? c : "Other";
}

function OptionalTripWideDocumentCard({
  d,
  editingDocId,
  docDraft,
  setDocDraft,
  canManageTripDocuments,
  handleEditDoc,
  requestDeleteTripDoc,
  handleSaveDoc,
  handleCancelEditDoc,
  handleReplaceDocumentFile,
  compactTile = false,
}) {
  const available = !!(d.pdfUrl || d.link);
  const isEditing = editingDocId === d.id;
  const isPdf = !!d.pdfUrl;
  const tileNarrow = compactTile && !isEditing;
  const workerLabel = getTripDocumentWorkerLabel(d);
  const workAreaMeta = parseTripDocumentWorkAreaMeta(d.workArea);

  if (tileNarrow) {
    return (
      <div className={tripDocumentTileRootClassName(false)}>
        <div className="tripDocumentSquareTileScroll">
          <div className="tripDocumentSquareTileTitle">{d.title || "Document"}</div>
          {workerLabel ? (
            <span className={"badge badgeInfo"}>{workerLabel}</span>
          ) : null}
          <div className="tripDocumentSquareTileMeta small">
            {isPdf ? "PDF" : "Link"}
            {d.category ? ` · ${d.category}` : ""}
          </div>
          {canManageTripDocuments ? (
            <div className="small tripDocumentSquareTileMeta">
              {d.visibleToParticipants === false ? "Hidden from participants" : "Visible to participants"}
            </div>
          ) : null}
        </div>
        <div className="tripDocumentSquareTileFoot">
          {available ? (
            <a className="btn btnPrimary" href={d.pdfUrl || d.link} target="_blank" rel="noreferrer">
              Open
            </a>
          ) : null}
          {canManageTripDocuments ? (
            <button className="btn" type="button" onClick={() => handleEditDoc(d)}>
              Edit
            </button>
          ) : null}
          {String(d.tutorialUrl || "").trim() ? (
            <a className="btn" href={d.tutorialUrl} target="_blank" rel="noreferrer">
              Watch
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={compactTile && isEditing ? tripDocumentTileRootClassName(true) : "card pad"}
      style={compactTile && isEditing ? tripDocumentWideCardStyle : tripDocumentWideCardStyle}
    >
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          {isEditing ? (
            <div style={{ display: "grid", gap: 8 }}>
              <input
                className="input"
                value={docDraft?.title || ""}
                onChange={(e) => setDocDraft((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Title"
              />
              <input
                className="input"
                value={docDraft?.link || ""}
                onChange={(e) => setDocDraft((prev) => ({ ...prev, link: e.target.value }))}
                placeholder="https://..."
                disabled={!!docDraft?.pdfUrl}
              />
              <select
                className="input"
                value={docDraft?.category || "Other"}
                onChange={(e) => setDocDraft((prev) => ({ ...prev, category: e.target.value }))}
              >
                {DOCUMENT_CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                className="input"
                value={docDraft?.workerName || ""}
                onChange={(e) => setDocDraft((prev) => ({ ...prev, workerName: e.target.value }))}
                placeholder="Worker label (optional)"
              />
              <input
                className="input"
                value={docDraft?.workArea || ""}
                onChange={(e) => setDocDraft((prev) => ({ ...prev, workArea: e.target.value }))}
                placeholder="Notes / context"
              />
              <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={docDraft?.visibleToParticipants !== false}
                  onChange={(e) =>
                    setDocDraft((prev) => ({
                      ...prev,
                      visibleToParticipants: e.target.checked,
                    }))
                  }
                />
                Visible to participants
              </label>
              {!!docDraft?.pdfUrl && <input type="file" onChange={handleReplaceDocumentFile} />}
              <div className="row">
                <button className="btn btnPrimary" type="button" onClick={handleSaveDoc}>
                  Save
                </button>
                <button className="btn" type="button" onClick={handleCancelEditDoc}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  style={tripDocDeleteButtonStyle}
                  onClick={() => void requestDeleteTripDoc(d)}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 900 }}>{d.title}</div>
              <div className="small" style={{ marginTop: 4 }}>
                {isPdf ? "PDF" : "Link"}
                {d.category ? ` • ${d.category}` : ""}
                {workAreaMeta.notes ? ` • ${workAreaMeta.notes}` : ""}
                {d.createdAt ? ` • ${new Date(d.createdAt).toLocaleDateString()}` : ""}
              </div>
              {canManageTripDocuments ? (
                <div className="small" style={{ marginTop: 4 }}>
                  {d.visibleToParticipants === false
                    ? "Hidden from participants"
                    : "Visible to participants"}
                </div>
              ) : null}
            </>
          )}
        </div>
        {workerLabel ? (
          <span className={"badge badgeInfo"}>{workerLabel}</span>
        ) : null}
      </div>
      {!isEditing ? (
        <div className="row" style={{ marginTop: 10, flexWrap: "wrap", gap: 8 }}>
          {available ? (
            <a className="btn btnPrimary" href={d.pdfUrl || d.link} target="_blank" rel="noreferrer">
              Open
            </a>
          ) : null}
          {canManageTripDocuments ? (
            <button className="btn" type="button" onClick={() => handleEditDoc(d)}>
              Edit
            </button>
          ) : null}
        </div>
      ) : null}
      {!isEditing && d.tutorialUrl ? (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid rgba(15, 23, 42, 0.08)",
            display: "grid",
            gap: 8,
          }}
        >
          <div className="small" style={{ fontWeight: 900 }}>
            Tutorial
          </div>
          <div className="small">
            {d.tutorialDescription || "Helpful walkthrough for this resource."}
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <a className="btn" href={d.tutorialUrl} target="_blank" rel="noreferrer">
              Watch
            </a>
            {canManageTripDocuments ? (
              <button className="btn" type="button" onClick={() => handleEditDoc(d)}>
                Edit Tutorial
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Invisible marker in work_area so we still recognize dismissed slots if visibility wasn’t stored (e.g. older inserts). */
const DISMISS_SLOT_WORKAREA_MARKER = "\u200b";
const TRIP_DOC_WORKER_PREFIX = "[worker]";

function parseTripDocumentWorkAreaMeta(rawValue) {
  const raw = String(rawValue || "");
  const lines = raw.split("\n");
  const first = String(lines[0] || "").trim();

  if (first.toLowerCase().startsWith(TRIP_DOC_WORKER_PREFIX)) {
    return {
      workerName: first.slice(TRIP_DOC_WORKER_PREFIX.length).trim(),
      notes: lines.slice(1).join("\n").trim(),
    };
  }

  return {
    workerName: "",
    notes: raw.trim(),
  };
}

function buildTripDocumentWorkAreaMeta({ workerName, notes }) {
  const cleanWorker = String(workerName || "").trim();
  const cleanNotes = String(notes || "").trim();
  return [cleanWorker ? `${TRIP_DOC_WORKER_PREFIX} ${cleanWorker}` : "", cleanNotes]
    .filter(Boolean)
    .join("\n");
}

function getTripDocumentWorkerLabel(doc) {
  return parseTripDocumentWorkAreaMeta(doc?.workArea).workerName;
}

function snapshotTripResourceForInsert(doc) {
  if (!doc || doc.isAutoGenerated) return null;
  return {
    title: doc.title,
    link: doc.link || "",
    pdfUrl: doc.pdfUrl || "",
    category: doc.category || "",
    resourceKey: doc.resourceKey || "",
    workArea: doc.workArea || "",
    tutorialTitle: doc.tutorialTitle || "",
    tutorialUrl: doc.tutorialUrl || "",
    tutorialDescription: doc.tutorialDescription || "",
    visibleToParticipants: doc.visibleToParticipants,
  };
}

/** Persisted row: hidden from participants with no link/PDF — default slot hidden until restored. */
function isPersistedTripResourceDismissedEmpty(doc) {
  if (!doc?.id || doc.isAutoGenerated) return false;
  const empty = !String(doc.link || "").trim() && !String(doc.pdfUrl || "").trim();
  if (!empty) return false;
  if (doc.visibleToParticipants === false) return true;
  return String(doc.workArea || "").includes(DISMISS_SLOT_WORKAREA_MARKER);
}

function findDismissedPersistedTripResource(docs, resourceKey) {
  return (docs || []).find(
    (d) =>
      String(d.resourceKey) === String(resourceKey) &&
      isPersistedTripResourceDismissedEmpty(d)
  );
}

const REQUIRED_DOC_KEYS = new Set(REQUIRED_TRIP_DOCUMENT_SLOTS.map((s) => String(s.key)));

function docHasAnyContent(doc) {
  return Boolean(String(doc?.link || "").trim() || String(doc?.pdfUrl || "").trim());
}

function docUpdatedMs(doc) {
  const t = Date.parse(doc?.updatedAt || doc?.createdAt || "");
  return Number.isFinite(t) ? t : 0;
}

function pickPreferredDocByRequiredKey(a, b) {
  // Prefer the row that would result in a visible/usable card.
  const autoScore = (d) => (d?.isAutoGenerated ? 0 : 1);
  const contentScore = (d) => (docHasAnyContent(d) ? 1 : 0);
  const visibilityScore = (d) => (d?.visibleToParticipants === false ? 0 : 1);
  const timeScore = (d) => docUpdatedMs(d);

  const keyOrder = [
    (d) => autoScore(d),
    (d) => contentScore(d),
    (d) => visibilityScore(d),
    (d) => timeScore(d),
  ];

  for (const scoreFn of keyOrder) {
    const sa = scoreFn(a);
    const sb = scoreFn(b);
    if (sa !== sb) return sb > sa ? b : a;
  }

  // Stable fallback: keep `a`.
  return a;
}

function dedupeRequiredSlotResources(docs) {
  const input = Array.isArray(docs) ? docs : [];

  // Compute best document per required resourceKey.
  const bestByKey = new Map();
  for (const d of input) {
    const k = String(d?.resourceKey || "").trim();
    if (!k || !REQUIRED_DOC_KEYS.has(k)) continue;
    if (!bestByKey.has(k)) {
      bestByKey.set(k, d);
      continue;
    }
    bestByKey.set(k, pickPreferredDocByRequiredKey(bestByKey.get(k), d));
  }

  // Preserve original ordering: keep docs that are the selected "best" per required key.
  return input.filter((d) => {
    const k = String(d?.resourceKey || "").trim();
    if (!k || !REQUIRED_DOC_KEYS.has(k)) return true;
    const best = bestByKey.get(k);
    if (!best) return true;
    return String(best?.id || "") === String(d?.id || "");
  });
}

/** Prefer trip_budgets primary row; if it has no URL/PDF, use first housing doc that does (extras). */
function pickMainHousingDocFromViewerList(docs) {
  const list = Array.isArray(docs) ? docs : [];
  if (!list.length) return null;
  const hasContent = (d) =>
    String(d?.link || "").trim().length > 0 || String(d?.pdfUrl || "").trim().length > 0;
  const primary = list.find((d) => String(d?.kind || "").toLowerCase() === "primary");
  if (primary && hasContent(primary)) return primary;
  const firstWithContent = list.find(hasContent);
  if (firstWithContent) return firstWithContent;
  return primary || list[0];
}

async function fetchTripHousingState(tripId) {
  if (!tripId) {
    return { tripHousingDocuments: [], tripHousingLinkUrl: "", tripHousingPdfUrl: "" };
  }
  try {
    const list = await getTripHousingDocumentsForViewer(tripId);
    const docs = Array.isArray(list) ? list : [];
    const main = pickMainHousingDocFromViewerList(docs);
    return {
      tripHousingDocuments: docs,
      tripHousingLinkUrl: main?.link || "",
      tripHousingPdfUrl: main?.pdfUrl || "",
    };
  } catch {
    return { tripHousingDocuments: [], tripHousingLinkUrl: "", tripHousingPdfUrl: "" };
  }
}

/** Staff preview of worker UI when roster members do not have Hub accounts yet */
const WORKER_PREVIEW_PARTICIPANT_ID = "__lst_worker_preview__";
/** Staff preview of trip-leader tabs (no Materials / Staff Tasks) */
const LEADER_PREVIEW_PARTICIPANT_ID = "__lst_leader_preview__";
const ROSTER_PREVIEW_PREFIX = "__lst_roster_preview__:";

export default function TripPage() {
  const router = useRouter();
  const { tripId } = router.query;

  const [tab, setTab] = useState("Overview");
  const [participantTaskStates, setParticipantTaskStates] = useState({});
  const [participantTrainingStates, setParticipantTrainingStates] = useState({});
  const [session, setSession] = useState(null);
  const [trainingModules, setTrainingModules] = useState([]);
  const [docs, setDocs] = useState([]);
  const [participantDocuments, setParticipantDocuments] = useState([]);
  const [participantDocumentsError, setParticipantDocumentsError] = useState("");
  const [participantDocumentStatus, setParticipantDocumentStatus] = useState({});
  const [confirmingParticipantDocumentDeleteId, setConfirmingParticipantDocumentDeleteId] = useState("");
  const [customParticipantDocumentLabel, setCustomParticipantDocumentLabel] = useState("");
  const [participantDocumentTypeStatus, setParticipantDocumentTypeStatus] = useState("");
  const participantDocumentInputRefs = useRef({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentActivityError, setRecentActivityError] = useState("");
  const [isAddingLink, setIsAddingLink] = useState(false);
  /** When set, the add/required link form is shown inside that default document card instead of at the top. */
  const [addingLinkForSlotKey, setAddingLinkForSlotKey] = useState(null);
  const [linkDraft, setLinkDraft] = useState(buildDocumentDraft());
  const [pendingPdfDraft, setPendingPdfDraft] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);
  const [docDraft, setDocDraft] = useState(null);
  const [referenceEmails, setReferenceEmails] = useState({});
  const [referenceSaveStatusByKey, setReferenceSaveStatusByKey] = useState({});
  const [docsError, setDocsError] = useState("");
  const [tripDocsUndoBanner, setTripDocsUndoBanner] = useState(null);
  const tripDocsUndoRunRef = useRef(null);
  const tripDocsUndoTimerRef = useRef(null);
  const [fundraisingDrafts, setFundraisingDrafts] = useState({});
  const [fundraisingStatus, setFundraisingStatus] = useState({});
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    dueDate: "",
    category: "General",
    description: "",
  });
  const taskDraftTripleRef = useRef(null);
  const [taskStatusMessage, setTaskStatusMessage] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingWorkerTaskDateId, setEditingWorkerTaskDateId] = useState("");
  /** Which participant column opened the due-date editor (team dashboard has one grid cell per person). */
  const [editingWorkerDueParticipantKey, setEditingWorkerDueParticipantKey] = useState("");
  /** Local value while editing worker task due date (commit on Save, not on every calendar change). */
  const [workerTaskDueDateDraft, setWorkerTaskDueDateDraft] = useState("");
  const workerDueTripleHandlesRef = useRef(new Map());

  useEffect(() => {
    if (!editingWorkerTaskDateId) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setEditingWorkerTaskDateId("");
        setEditingWorkerDueParticipantKey("");
        setWorkerTaskDueDateDraft("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingWorkerTaskDateId]);

  const [overviewNotes, setOverviewNotes] = useState([]);
  const [editingOverviewNoteId, setEditingOverviewNoteId] = useState("");
  const [overviewNoteDraft, setOverviewNoteDraft] = useState("");
  const [isEditingOverviewNote, setIsEditingOverviewNote] = useState(false);
  const [overviewNoteStatus, setOverviewNoteStatus] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoadError, setAnnouncementsLoadError] = useState("");
  const [editingAnnouncementId, setEditingAnnouncementId] = useState("");
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [announcementStatus, setAnnouncementStatus] = useState("");
  const [teamFundraisingDraft, setTeamFundraisingDraft] = useState({
    teamFundraisingUrl: "",
    fundraisingMode: "individual",
    fundraisingGoalAmount: "",
  });
  const [teamFundraisingStatus, setTeamFundraisingStatus] = useState("");
  const [isEditingTeamFundraising, setIsEditingTeamFundraising] = useState(false);
  const [editingParticipantFundraisingId, setEditingParticipantFundraisingId] = useState("");
  const [staffTaskStatus, setStaffTaskStatus] = useState("");
  const [previewParticipantId, setPreviewParticipantId] = useState("");
  const [isEditingTripSetup, setIsEditingTripSetup] = useState(false);
  const [tripSetupDraft, setTripSetupDraft] = useState(() => buildTripSetupDraft(null));
  const [tripSetupStatus, setTripSetupStatus] = useState("");
  const [isCustomSiteInput, setIsCustomSiteInput] = useState(false);
  const [isConfirmingTripDelete, setIsConfirmingTripDelete] = useState(false);
  const [isEditingRoster, setIsEditingRoster] = useState(false);
  const [rosterDraft, setRosterDraft] = useState([]);
  const [rosterStatus, setRosterStatus] = useState("");
  const [inlineTshirtSavingKey, setInlineTshirtSavingKey] = useState("");
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [newWorkerDraft, setNewWorkerDraft] = useState(() => createEmptyWorkerDraft());
  const [workerAddStatus, setWorkerAddStatus] = useState("");
  const [invitingWorkerEmail, setInvitingWorkerEmail] = useState("");

  const [trip, setTrip] = useState(null);
  const [tripLoadComplete, setTripLoadComplete] = useState(false);
  const [editableStaffTasks, setEditableStaffTasks] = useState([]);
  const [editingStaffTaskId, setEditingStaffTaskId] = useState(null);
  /** Keeps staff-task list refetch from stealing focus from the date picker while a row is open for edit. */
  const editingStaffTaskIdRef = useRef(null);
  const [staffTaskDueDateDraft, setStaffTaskDueDateDraft] = useState("");
  const staffDueTripleRef = useRef(null);
  const [staffTaskTitleDraft, setStaffTaskTitleDraft] = useState("");
  const [isAddingStaffTask, setIsAddingStaffTask] = useState(false);
  const [pendingStaffTaskJumpId, setPendingStaffTaskJumpId] = useState("");
  const [pendingWorkerTaskJumpId, setPendingWorkerTaskJumpId] = useState("");
  const [pendingTrainingModuleJumpId, setPendingTrainingModuleJumpId] = useState("");
  const [newStaffTaskDraft, setNewStaffTaskDraft] = useState({
    workArea: "Project Formation",
    taskName: "",
    assignedTo: "",
    dueDate: "",
    notes: "",
  });
  const newStaffTaskTripleRef = useRef(null);
  const [travelFormModalOpen, setTravelFormModalOpen] = useState(false);
  const [travelFormTargetRefKey, setTravelFormTargetRefKey] = useState("");
  const [travelFormDraft, setTravelFormDraft] = useState(() => ({ ...TRAVEL_FORM_EMPTY }));
  const [travelFormStatus, setTravelFormStatus] = useState("");
  const [travelFormResponses, setTravelFormResponses] = useState([]);
  const [tripMeetings, setTripMeetings] = useState([]);
  const [tripMeetingsLoadError, setTripMeetingsLoadError] = useState("");
  const [meetingDraft, setMeetingDraft] = useState({ title: "", scheduledAt: "", notesAfter: "" });
  const [editingMeetingId, setEditingMeetingId] = useState("");
  const [meetingStatus, setMeetingStatus] = useState("");
  /** Staff/leaders: scheduling form hidden until Add meeting (or when editing an existing row). */
  const [meetingAddFormOpen, setMeetingAddFormOpen] = useState(false);
  const [tripBudgetRow, setTripBudgetRow] = useState(null);
  const [tripHousingLinkUrl, setTripHousingLinkUrl] = useState("");
  const [tripHousingPdfUrl, setTripHousingPdfUrl] = useState("");
  const [tripHousingDocuments, setTripHousingDocuments] = useState([]);
  const [housingTripDocsDraft, setHousingTripDocsDraft] = useState(null);
  const [housingTripDocsSaveStatus, setHousingTripDocsSaveStatus] = useState("");
  const [tripSiteLogisticsRpcUrl, setTripSiteLogisticsRpcUrl] = useState("");
  const [tripBudgetLoadError, setTripBudgetLoadError] = useState("");
  const [materialsDraft, setMaterialsDraft] = useState(null);
  const [materialsSaveStatus, setMaterialsSaveStatus] = useState("");
  const [isEditingMaterialsGlance, setIsEditingMaterialsGlance] = useState(false);
  /** Bumps when materials save completes so stale in-flight getTripBudget loads cannot overwrite the draft. */
  const materialsBudgetLoadGenRef = useRef(0);
  const [siteBudgetNotesList, setSiteBudgetNotesList] = useState([]);
  const latestStaffTaskSaveRef = useRef(0);
  const editableStaffTasksRef = useRef([]);
  const [staffTaskRowStatus, setStaffTaskRowStatus] = useState({});
  const staffTaskRowTimeoutsRef = useRef({});
  const staffTaskNoteSaveTimeoutsRef = useRef({});
  const canManageTrips = isManagerRole(session?.permissionRole || session?.role);
  const isAdminUser = isAdminRole(session?.actualRole || session?.role);
  const isLeader = isLeaderRole(session?.permissionRole || session?.role);
  const isStaffPreviewingLeader =
    canManageTrips && String(previewParticipantId) === LEADER_PREVIEW_PARTICIPANT_ID;
  const isStaffPreviewingWorker =
    canManageTrips &&
    !!previewParticipantId &&
    String(previewParticipantId) !== LEADER_PREVIEW_PARTICIPANT_ID;
  const isPreviewingParticipant = isStaffPreviewingWorker;
  const staffViewAllParticipants = canManageTrips && !previewParticipantId;
  const effectiveIsLeader = isLeader || isStaffPreviewingLeader;
  const canViewTeamDashboard =
    staffViewAllParticipants || (effectiveIsLeader && !isPreviewingParticipant);
  /** Edit team fundraising setup and per-person links: staff only (trip leaders see read-only). */
  const canManageTripFundraising =
    staffViewAllParticipants || (canManageTrips && isStaffPreviewingLeader);

  const sessionTripRosterRow = useMemo(() => {
    if (!trip?.teamMembers?.length || !session?.email) return null;
    const e = normalizeEmail(session.email);
    return (trip.teamMembers || []).find((m) => normalizeEmail(m.email) === e) || null;
  }, [trip?.teamMembers, session?.email]);

  /** Profile is leader and roster marks them as not traveling — team management only (no personal worker pipeline). */
  const isLeaderOnTripNotTraveling = useMemo(() => {
    if (!isLeader || isStaffPreviewingLeader || !sessionTripRosterRow) return false;
    const role = String(sessionTripRosterRow.teamRole || "").trim().toLowerCase();
    if (role !== "leader") return false;
    return sessionTripRosterRow.travelsWithTeam === false;
  }, [isLeader, isStaffPreviewingLeader, sessionTripRosterRow]);

  const canManageTripDocuments =
    staffViewAllParticipants || (effectiveIsLeader && !isPreviewingParticipant);

  const canManageTripMeetings =
    staffViewAllParticipants || (effectiveIsLeader && !isPreviewingParticipant);

  const staffList = [
    "Mackayla",
    "Craig",
    "Leslee",
    "Donna",
    "Hannah",
  ];

  useEffect(() => {
    if (!router.isReady) return;

    const requestedTab = Array.isArray(router.query.tab) ? router.query.tab[0] : router.query.tab;
    const requestedStaffTaskId = Array.isArray(router.query.staffTaskId)
      ? router.query.staffTaskId[0]
      : router.query.staffTaskId;
    const requestedAddWorker = Array.isArray(router.query.addWorker)
      ? router.query.addWorker[0]
      : router.query.addWorker;
    const tabKey = String(requestedTab || "").toLowerCase();

    if (tabKey === "staff-tasks") {
      setTab("Staff Tasks");
    }
    if (tabKey === "team") {
      setTab("Team");
    }
    if (tabKey === "travel-safety") {
      setTab("Travel & Safety");
    }
    if (tabKey === "trip-documents" || tabKey === "trip-documents-link") {
      setTab("Trip Documents");
    }
    if (tabKey === "documents" || tabKey === "my-documents") {
      setTab(canViewTeamDashboard ? "Worker Docs" : "My Documents");
    }
    if (tabKey === "materials") {
      setTab("Materials");
    }

    if (requestedStaffTaskId) {
      setPendingStaffTaskJumpId(String(requestedStaffTaskId));
    }
    if (String(requestedAddWorker || "").toLowerCase() === "1") {
      setIsAddingWorker(true);
      setIsEditingRoster(false);
      setWorkerAddStatus("");
    }
  }, [canViewTeamDashboard, router.isReady, router.query.addWorker, router.query.staffTaskId, router.query.tab]);

  useEffect(() => {
    const requestedParticipantId = Array.isArray(router.query.participantId)
      ? router.query.participantId[0]
      : router.query.participantId;

    if (!requestedParticipantId || !canManageTrips || previewParticipantId) return;
    if (!trip || !(trip.participants || []).some((p) => String(p.id) === String(requestedParticipantId))) {
      return;
    }

    setPreviewParticipantId(String(requestedParticipantId));
  }, [canManageTrips, previewParticipantId, router.query.participantId, trip]);

  useEffect(() => {
    const requestedEdit = Array.isArray(router.query.edit) ? router.query.edit[0] : router.query.edit;
    if (String(requestedEdit || "").toLowerCase() !== "setup") return;
    if (!trip?.id || !staffViewAllParticipants || isEditingTripSetup) return;

    setTab("Overview");
    handleStartTripSetupEdit();

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const element = document.getElementById("trip-setup");
        element?.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("edit");
      window.history.replaceState({}, "", nextUrl.toString());
    }
  }, [router.query.edit, trip?.id, staffViewAllParticipants, isEditingTripSetup]);
  const trainingAccessUrl = "https://lst365.sharepoint.com/:b:/g/IQD0aBKBPtQsQ6oh55gqMG4IAe3aFtSVxmywEXEBasP_5jY?e=SZ9m0j";
  const basicTrainingUrl = "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=134&";
  const gatewayTrainingUrl = "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=136&";

  const trainingResources = [
    {
      id: "canvas",
      group: "required",
      title: "Canvas",
      description: "Instructions on accessing online LST team training.",
      url: trainingAccessUrl,
      icon: "CV",
      accent: "#2f4993",
    },
    {
      id: "basic",
      group: "required",
      title: "Basic Training",
      description: "Understanding the LST approach.",
      url: basicTrainingUrl,
      icon: "BT",
      accent: "#3caae1",
    },
    {
      id: "gateway",
      group: "required",
      title: "Gateway Training",
      description: "Pre-departure preparation.",
      url: gatewayTrainingUrl,
      icon: "GT",
      accent: "#f99d2a",
    },
    {
      id: "endmeetings",
      group: "required",
      title: "EndMeetings",
      description: "Post-project debriefing.",
      url: gatewayTrainingUrl,
      icon: "EM",
      accent: "#4c7c3d",
    },
    {
      id: "optional",
      group: "optional",
      title: "Advanced Training",
      description:
        "Optional workshops offered through the year, mainly for experienced Workers.",
      url: "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=135&",
      icon: "OT",
      accent: "#7a5af8",
    },
    {
      id: "lst-connect",
      group: "optional",
      title: "LST Connect",
      description:
        "Join LST Connect to practice with an online Reader before leaving. Register as a Worker.",
      url: "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=133&",
      icon: "LC",
      accent: "#0f766e",
    },
  ];
  const requiredTrainingResources = trainingResources.filter(
    (resource) => resource.group === "required"
  );
  const optionalTrainingResources = trainingResources.filter(
    (resource) => resource.group === "optional"
  );

  const canvasTrainingModules = useMemo(
    () =>
      trainingModules
        .filter((module) => module.category === "canvas")
        .map((module) => ({
          ...module,
          deadlineDate: getTrainingModuleDeadline(module.title, {
            startDate: trip?.startDate,
            endDate: trip?.endDate,
            trainingTimelineType: trip?.trainingTimelineType,
          }),
        })),
    [trainingModules, trip?.endDate, trip?.startDate, trip?.trainingTimelineType]
  );
  const supplementalTrainingModules = useMemo(
    () =>
      trainingModules
        .filter((module) => module.category !== "canvas")
        .map((module) => ({
          ...module,
          deadlineDate: getTrainingModuleDeadline(module.title, {
            startDate: trip?.startDate,
            endDate: trip?.endDate,
            trainingTimelineType: trip?.trainingTimelineType,
          }),
        })),
    [trainingModules, trip?.endDate, trip?.startDate, trip?.trainingTimelineType]
  );
  const datedTrainingModuleIds = useMemo(
    () =>
      trainingModules
        .filter((module) => module.requiresDate)
        .map((module) => module.id),
    [trainingModules]
  );
  const allTrainingModules = trainingModules;

  useEffect(() => {
    if (!router.isReady) return;

    let cancelled = false;

    async function loadSession() {
      const activeSession = await requireSession(router);
      if (!cancelled && activeSession) {
        setSession(activeSession);
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [router, router.isReady]);

  useEffect(() => {
    if (!travelFormModalOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") setTravelFormModalOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [travelFormModalOpen]);

  useEffect(() => {
    return () => {
      if (tripDocsUndoTimerRef.current) clearTimeout(tripDocsUndoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!tripId) return;

    let cancelled = false;

    async function loadTrip() {
      try {
        setTripLoadComplete(false);
        const assignedTrip = await getTripForCurrentUser(tripId);
        if (!cancelled) {
          setTrip(assignedTrip);
          setTripLoadComplete(true);
        }
      } catch (error) {
        console.error("Unable to load assigned trip", error);
        if (!cancelled) {
          setTrip(null);
          setTripLoadComplete(true);
        }
      }
    }

    loadTrip();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  useEffect(() => {
    if (!trip) return;

    const nextDrafts = {};
    (trip.participants || []).forEach((participant) => {
      nextDrafts[participant.id] = {
        fundraisingUrl: participant.fundraisingUrl || "",
        fundraisingGoalAmount:
          participant.fundraisingGoalAmount != null && participant.fundraisingGoalAmount !== ""
            ? String(participant.fundraisingGoalAmount)
            : "",
      };
    });
    const participantEmailsForFundraising = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );
    (trip.teamMembers || []).forEach((member) => {
      if (!member.id) return;
      const em = normalizeEmail(member.email);
      if (em && participantEmailsForFundraising.has(em)) return;
      nextDrafts[`roster-member-${member.id}`] = {
        fundraisingUrl: member.fundraisingUrl || "",
        fundraisingGoalAmount:
          member.fundraisingGoalAmount != null && member.fundraisingGoalAmount !== ""
            ? String(member.fundraisingGoalAmount)
            : "",
      };
    });
    setFundraisingDrafts(nextDrafts);
    setTeamFundraisingDraft({
      teamFundraisingUrl: trip.teamFundraisingUrl || "",
      fundraisingMode: trip.fundraisingMode === "team" ? "team" : "individual",
      fundraisingGoalAmount:
        trip.fundraisingGoalAmount != null && trip.fundraisingGoalAmount !== ""
          ? String(trip.fundraisingGoalAmount)
          : "",
    });
    setIsEditingTeamFundraising(false);
    setEditingParticipantFundraisingId("");
    setTripSetupDraft(buildTripSetupDraft(trip));
    setIsEditingTripSetup(false);
    setTripSetupStatus("");
    setIsCustomSiteInput(false);
    setRosterDraft(trip.teamMembers || []);
    setIsEditingRoster(false);
    setRosterStatus("");
    setIsAddingStaffTask(false);
    setNewStaffTaskDraft({
      workArea: "Project Formation",
      taskName: "",
      assignedTo: "",
      dueDate: "",
      notes: "",
    });
  }, [trip]);

  useEffect(() => {
    if (!trip?.id) return;
    setEditingWorkerTaskDateId("");
    setEditingWorkerDueParticipantKey("");
    setWorkerTaskDueDateDraft("");
    workerDueTripleHandlesRef.current.clear();
    editingStaffTaskIdRef.current = null;
    setEditingStaffTaskId(null);
    setStaffTaskTitleDraft("");
    setStaffTaskDueDateDraft("");
  }, [trip?.id]);

  useEffect(() => {
    if (!trip?.id) return;

    let cancelled = false;

    async function loadParticipantDocuments() {
      try {
        const rows = await listTripUserDocuments(trip.id);
        if (!cancelled) {
          setParticipantDocuments(rows);
          setParticipantDocumentsError("");
        }
      } catch (error) {
        console.error("Unable to load participant documents", error);
        if (!cancelled) {
          setParticipantDocuments([]);
          setParticipantDocumentsError(error.message || "Unable to load participant documents.");
        }
      }
    }

    void loadParticipantDocuments();

    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  useEffect(() => {
    if (!trip?.id) return;
    let cancelled = false;
    async function loadMeetings() {
      try {
        const rows = await listTripMeetings(trip.id);
        if (!cancelled) {
          setTripMeetings(rows);
          setTripMeetingsLoadError("");
        }
      } catch (e) {
        console.error("Unable to load meetings", e);
        if (!cancelled) {
          setTripMeetings([]);
          setTripMeetingsLoadError(e?.message || "Unable to load meetings.");
        }
      }
    }
    void loadMeetings();
    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  useEffect(() => {
    if (!trip?.id) return;
    let cancelled = false;

    async function loadHousingFromBudget() {
      const next = await fetchTripHousingState(trip.id);
      if (!cancelled) {
        setTripHousingDocuments(next.tripHousingDocuments);
        setTripHousingLinkUrl(next.tripHousingLinkUrl);
        setTripHousingPdfUrl(next.tripHousingPdfUrl);
      }
    }

    void loadHousingFromBudget();
    function onVisibilityChange() {
      if (document.visibilityState === "visible") void loadHousingFromBudget();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [trip?.id]);

  useEffect(() => {
    if (!trip?.id || tab !== "Trip Documents") return;
    let cancelled = false;
    (async () => {
      try {
        const next = await fetchTripHousingState(trip.id);
        if (!cancelled) {
          setTripHousingDocuments(next.tripHousingDocuments);
          setTripHousingLinkUrl(next.tripHousingLinkUrl);
          setTripHousingPdfUrl(next.tripHousingPdfUrl);
        }
      } catch (e) {
        console.warn("[trip] refetch housing for Trip Documents", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trip?.id, tab]);

  useEffect(() => {
    setHousingTripDocsDraft(null);
    setHousingTripDocsSaveStatus("");
  }, [trip?.id]);

  useEffect(() => {
    if (!trip?.id) return;
    let cancelled = false;

    async function loadSiteLogisticsUrl() {
      try {
        const url = await getTripSiteLogisticsUrlForViewer(trip.id);
        if (!cancelled) setTripSiteLogisticsRpcUrl(url);
      } catch {
        if (!cancelled) setTripSiteLogisticsRpcUrl("");
      }
    }

    void loadSiteLogisticsUrl();
    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  useEffect(() => {
    if (!trip?.id || !staffViewAllParticipants) return;
    let cancelled = false;

    async function loadTripBudgetRow() {
      const loadGenAtStart = materialsBudgetLoadGenRef.current;
      try {
        const row = await getTripBudget(trip.id);
        if (cancelled || loadGenAtStart !== materialsBudgetLoadGenRef.current) return;
        setTripBudgetRow(row);
        setTripBudgetLoadError("");
        setMaterialsDraft(
          row
            ? {
                numWorkers: numWorkersDraftFromBudgetValue(row.numWorkers),
                teamAccountant: row.teamAccountant || "",
                tshirts: row.tshirts ?? "",
                workbooks: row.workbooks ?? "",
                materialsShipAddress: row.materialsShipAddress ?? "",
                materialsTrackingNumber: row.materialsTrackingNumber ?? "",
                materialsNotes: row.materialsNotes ?? "",
              }
            : {
                numWorkers: "",
                teamAccountant: "",
                tshirts: "",
                workbooks: "",
                materialsShipAddress: "",
                materialsTrackingNumber: "",
                materialsNotes: "",
              }
        );
      } catch (e) {
        if (cancelled || loadGenAtStart !== materialsBudgetLoadGenRef.current) return;
        setTripBudgetLoadError(e.message || "Unable to load housing budget.");
      }
    }

    void loadTripBudgetRow();
    return () => {
      cancelled = true;
    };
  }, [trip?.id, staffViewAllParticipants]);

  useEffect(() => {
    if (!canManageTrips || !staffViewAllParticipants) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listSiteBudgetNotes();
        if (!cancelled) setSiteBudgetNotesList(rows || []);
      } catch (e) {
        console.error("Unable to load site workbook plans", e);
        if (!cancelled) setSiteBudgetNotesList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManageTrips, staffViewAllParticipants]);

  useEffect(() => {
    if (!trip?.id || !canViewTeamDashboard) return;

    let cancelled = false;

    async function loadRecentActivity() {
      try {
        const rows = await listTripActivity(trip.id, { limit: 8 });
        if (!cancelled) {
          setRecentActivity(rows);
          setRecentActivityError("");
        }
      } catch (error) {
        console.error("Unable to load trip activity", error);
        if (!cancelled) {
          setRecentActivity([]);
          setRecentActivityError(error.message || "Unable to load recent activity.");
        }
      }
    }

    void loadRecentActivity();

    return () => {
      cancelled = true;
    };
  }, [canViewTeamDashboard, trip?.id]);

  function pushRecentActivity(entry) {
    if (!entry) return;

    setRecentActivity((current) =>
      [entry, ...current]
        .sort((left, right) =>
          String(right.createdAt || "").localeCompare(String(left.createdAt || ""))
        )
        .slice(0, 8)
    );
  }

  useEffect(() => {
    if (!trip) return;

    let cancelled = false;

    async function loadTripData() {
      const [
        participantsResult,
        teamMembersResult,
        modulesResult,
        progressResult,
        tasksResult,
        taskProgressResult,
        travelFormResult,
      ] =
        await Promise.allSettled([
          listTripParticipants(trip.id),
          listTripTeamMembers(trip.id),
          listTrainingModules(trip.id),
          listTrainingProgress(trip.id),
          listTripTasks(trip.id),
          listUserTaskProgress(trip.id),
          listTravelFormResponsesForTrip(trip.id),
        ]);

      if (cancelled) return;

      const participants = getSettledValue(
        participantsResult,
        [],
        "trip participants"
      );
      const teamMembers = getSettledValue(
        teamMembersResult,
        [],
        "trip team members"
      );
      const modules = getSettledValue(modulesResult, [], "training modules");
      const progress = getSettledValue(progressResult, [], "training progress");
      const tasks = getSettledValue(tasksResult, [], "trip tasks");
      const taskProgress = getSettledValue(
        taskProgressResult,
        [],
        "task progress"
      );

      setTrip((current) => (current ? { ...current, participants, teamMembers, tasks } : current));
      setTrainingModules(modules);

      const participantsById = new Map();
      participants.forEach((participant) => {
        if (participant?.id == null || participant.id === "") return;
        participantsById.set(String(participant.id), participant);
      });
      const moduleTitleById = new Map(
        modules.map((m) => [String(m.id), String(m.title || "").trim()])
      );
      const nextTrainingStates = {};
      const nextTaskStates = {};

      const orphanProgressUserIds = [
        ...new Set(
          [...progress, ...taskProgress]
            .map((row) => row.userId)
            .filter((id) => id != null && id !== "" && !participantsById.has(String(id)))
        ),
      ];
      const profileEmailByUserId = await loadProfileEmailsByUserIds(orphanProgressUserIds);

      function resolveEmailForProgressUserId(userId) {
        if (userId == null || userId === "") return "";
        const key = String(userId);
        const participant = participantsById.get(key);
        if (participant?.email) return participant.email;
        return profileEmailByUserId.get(key) || "";
      }

      progress.forEach((row) => {
        const email = resolveEmailForProgressUserId(row.userId);
        if (!email) return;

        const trainingEmailKey = normalizeEmail(email);
        if (!trainingEmailKey) return;
        if (!nextTrainingStates[trainingEmailKey]) {
          nextTrainingStates[trainingEmailKey] = {};
        }

        const modId = String(row.moduleId);
        nextTrainingStates[trainingEmailKey][modId] = !!row.completed;
        if (row.completedAt) {
          const title = moduleTitleById.get(modId) || "";
          nextTrainingStates[trainingEmailKey][`${modId}Date`] = hydrateTrainingSessionDateFromDb(
            row.completedAt,
            title
          );
        }
      });

      taskProgress.forEach((row) => {
        const email = resolveEmailForProgressUserId(row.userId);
        if (!email) return;

        const taskEmailKey = normalizeEmail(email);
        if (!taskEmailKey) return;
        if (!nextTaskStates[taskEmailKey]) {
          nextTaskStates[taskEmailKey] = {};
        }

        nextTaskStates[taskEmailKey][row.taskName] = !!row.completed;
      });

      setParticipantTrainingStates(nextTrainingStates);
      setParticipantTaskStates(nextTaskStates);

      const travelForms = getSettledValue(travelFormResult, [], "travel form responses");
      setTravelFormResponses(travelForms);
    }

    loadTripData();

    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  useEffect(() => {
    editableStaffTasksRef.current = editableStaffTasks;
  }, [editableStaffTasks]);

  useEffect(() => {
    if (tab !== "Staff Tasks" || !pendingStaffTaskJumpId) return undefined;

    let retryTimeout = null;
    const scrollToTask = () => {
      const element = document.getElementById(
        buildStaffTaskRowDomId(pendingStaffTaskJumpId)
      );

      if (!element) return false;

      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingStaffTaskJumpId("");
      return true;
    };

    const initialTimeout = window.setTimeout(() => {
      if (!scrollToTask()) {
        retryTimeout = window.setTimeout(() => {
          scrollToTask();
        }, 250);
      }
    }, 60);

    return () => {
      window.clearTimeout(initialTimeout);
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
    };
  }, [pendingStaffTaskJumpId, tab]);

  useEffect(() => {
    if (tab !== "Tasks" || !pendingWorkerTaskJumpId) return undefined;

    let retryTimeout = null;
    const scrollToTask = () => {
      const element = document.getElementById(
        buildWorkerTaskRowDomId(pendingWorkerTaskJumpId)
      );

      if (!element) return false;

      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingWorkerTaskJumpId("");
      return true;
    };

    const initialTimeout = window.setTimeout(() => {
      if (!scrollToTask()) {
        retryTimeout = window.setTimeout(() => {
          scrollToTask();
        }, 250);
      }
    }, 60);

    return () => {
      window.clearTimeout(initialTimeout);
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
    };
  }, [pendingWorkerTaskJumpId, tab]);

  useEffect(() => {
    if (tab !== "Training" || !pendingTrainingModuleJumpId) return undefined;

    let retryTimeout = null;
    const scrollToModule = () => {
      const element = document.getElementById(
        buildTrainingModuleRowDomId(pendingTrainingModuleJumpId)
      );

      if (!element) return false;

      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingTrainingModuleJumpId("");
      return true;
    };

    const initialTimeout = window.setTimeout(() => {
      if (!scrollToModule()) {
        retryTimeout = window.setTimeout(() => {
          scrollToModule();
        }, 250);
      }
    }, 60);

    return () => {
      window.clearTimeout(initialTimeout);
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
    };
  }, [pendingTrainingModuleJumpId, tab]);

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

  useEffect(() => {
    if (!trip?.id) return;

    let cancelled = false;

    async function loadOverviewNote() {
      try {
        setOverviewNotes([]);
        setEditingOverviewNoteId("");
        setOverviewNoteDraft("");
        setIsEditingOverviewNote(false);
        setOverviewNoteStatus("");
        const rows = await listTripOverviewNotes(trip.id);
        if (!cancelled) {
          setOverviewNotes(rows);
          setOverviewNoteStatus("");
        }
      } catch (error) {
        console.error("Unable to load trip overview notes", error);
      }
    }

    void loadOverviewNote();

    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  useEffect(() => {
    if (!trip?.id) return;

    let cancelled = false;

    async function loadAnnouncements() {
      try {
        setAnnouncements([]);
        setAnnouncementsLoadError("");
        setEditingAnnouncementId("");
        setAnnouncementDraft("");
        setIsEditingAnnouncement(false);
        setAnnouncementStatus("");
        const rows = await listTripAnnouncements(trip.id);
        if (!cancelled) {
          setAnnouncements(rows);
          setAnnouncementsLoadError("");
          setAnnouncementStatus("");
        }
      } catch (error) {
        console.error("Unable to load trip announcements", error);
        if (!cancelled) {
          setAnnouncementsLoadError(error.message || "Unable to load announcements.");
        }
      }
    }

    void loadAnnouncements();

    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  useEffect(() => {
    if (!trip) return;

    let cancelled = false;

    async function loadDocs() {
      try {
        const savedDocs = await listResources(trip.id);
        if (!cancelled) {
          // Prevent duplicates per required document slot key (e.g. flights).
          // Those duplicates cause "Delete slot" to remove more than intended.
          setDocs(dedupeRequiredSlotResources(savedDocs));
          setDocsError("");
        }
      } catch (error) {
        console.error("Unable to load resources", error);
        if (!cancelled) {
          setDocs([]);
          setDocsError(error.message || "Unable to load resources.");
        }
      }
    }

    loadDocs();

    return () => {
      cancelled = true;
    };
  }, [trip?.id]);

  useEffect(() => {
    setIsAddingLink(false);
    setAddingLinkForSlotKey(null);
  }, [trip?.id]);

  useEffect(() => {
    if (!trip || !staffViewAllParticipants) return;

    let cancelled = false;

    async function syncStaffTasks() {
      try {
        const tasks = await listStaffTasksForTrip(trip.id);
        if (!cancelled) {
          setEditableStaffTasks(
            sortStaffTasksByTemplate(
              (tasks || []).map((task) => ({
                ...task,
                dueDate: task.dueDate || computeStaffTaskDueDate(task, trip),
              }))
            )
          );
        }
      } catch (error) {
        console.error("Unable to load staff tasks", error);
      }
    }

    void syncStaffTasks();

    function handleTaskUpdate(event) {
      if (!event.detail?.tripId || event.detail.tripId === trip.id) {
        if (editingStaffTaskIdRef.current) return;
        void syncStaffTasks();
      }
    }

    window.addEventListener(STAFF_TASKS_UPDATED_EVENT, handleTaskUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener(STAFF_TASKS_UPDATED_EVENT, handleTaskUpdate);
    };
  }, [trip?.id, staffViewAllParticipants]);

  function handlePrepareNewPdf() {
    setIsAddingLink(false);
    setAddingLinkForSlotKey(null);
    setPendingPdfDraft({
      file: null,
      title: "",
      category: "Other",
      workerName: "",
      workArea: "",
      resourceKey: "",
      visibleToParticipants: true,
    });
  }

  function handlePrepareRequiredPdf(slot) {
    setIsAddingLink(false);
    setAddingLinkForSlotKey(null);
    setPendingPdfDraft({
      file: null,
      title: slot.title,
      category: slot.category,
      workerName: "",
      workArea: "",
      resourceKey: slot.key,
      visibleToParticipants: true,
    });
  }

  function handlePrepareRequiredLink(slot) {
    setIsAddingLink(true);
    setAddingLinkForSlotKey(String(slot?.key || ""));
    setLinkDraft(buildDocumentDraft({
      title: slot.resource?.title || slot.title,
      link: slot.resource?.link || slot.resource?.pdfUrl || "",
      category: slot.category,
      workerName: getTripDocumentWorkerLabel(slot.resource),
      workArea: parseTripDocumentWorkAreaMeta(slot.resource?.workArea).notes,
      resourceKey: slot.key,
      visibleToParticipants: slot.resource?.visibleToParticipants !== false,
      ...getEffectiveTutorialContent(slot, slot.resource),
    }));
  }

  function handleCancelPendingPdf() {
    setPendingPdfDraft(null);
  }

  function prependDocWithoutDuplicates(current, created) {
    const next = [created, ...(current || [])];
    const seen = new Set();
    return next.filter((doc) => {
      const id = String(doc?.id || "").trim();
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  async function handleSavePendingPdf() {
    if (!pendingPdfDraft?.file) return;

    try {
      const created = await addPdfResource({
        title: pendingPdfDraft.title,
        file: pendingPdfDraft.file,
        category: pendingPdfDraft.category,
        workArea: buildTripDocumentWorkAreaMeta({
          workerName: pendingPdfDraft.workerName,
          notes: pendingPdfDraft.workArea,
        }),
        resourceKey: pendingPdfDraft.resourceKey,
        visibleToParticipants: pendingPdfDraft.visibleToParticipants,
        tripId: trip?.id,
      });
      setDocs((current) =>
        dedupeRequiredSlotResources(prependDocWithoutDuplicates(current, created))
      );
      setDocsError("");
      setPendingPdfDraft(null);
    } catch (error) {
      console.error("Unable to add PDF resource", error);
      setDocsError(error.message || "Unable to save resources.");
    }
  }

  function handleAddLink() {
    setIsAddingLink(true);
    setAddingLinkForSlotKey(null);
    setLinkDraft(
      buildDocumentDraft({
        workerName: "",
        workArea: "",
      })
    );
  }

  function handleCancelAddLink() {
    setIsAddingLink(false);
    setAddingLinkForSlotKey(null);
    setLinkDraft(
      buildDocumentDraft({
        workerName: "",
        workArea: "",
      })
    );
  }

  async function handleSaveLink() {
    if (!linkDraft.title.trim()) {
      setDocsError("Add a document title before saving.");
      return;
    }

    try {
      const key = String(linkDraft.resourceKey || "").trim();
      let existing = null;
      if (key === "smartsheet-budget") {
        existing =
          (docs || []).find((d) => d?.id && !d.isAutoGenerated && d.resourceKey === "smartsheet-budget") ||
          (docs || []).find((d) => d?.id && !d.isAutoGenerated && d.resourceKey === "project-record-journal");
      } else if (key) {
        existing = (docs || []).find(
          (d) => d?.id && !d.isAutoGenerated && String(d.resourceKey) === key
        );
      }

      const linkTrim = String(linkDraft.link || "").trim();
      // If we’re creating a brand-new link resource, we need a non-empty URL.
      // Otherwise the resource can be saved but won’t qualify as "ready",
      // which makes it look like it "disappeared" from the document slots.
      if (!existing && !linkTrim) {
        setDocsError("Add a link URL before saving.");
        return;
      }

      if (existing) {
        const isBudgetLinkForm = key === "smartsheet-budget";
        const linkDraftHasTutorial =
          String(linkDraft.tutorialTitle || "").trim() ||
          String(linkDraft.tutorialUrl || "").trim() ||
          String(linkDraft.tutorialDescription || "").trim();
        const updated = await updateResource({
          id: existing.id,
          title: linkDraft.title,
          link: linkDraft.link,
          pdfUrl: existing.pdfUrl || "",
          category: linkDraft.category,
          resourceKey: key === "smartsheet-budget" ? "smartsheet-budget" : key,
          workArea: buildTripDocumentWorkAreaMeta({
            workerName: linkDraft.workerName,
            notes: linkDraft.workArea,
          }),
          tutorialTitle: isBudgetLinkForm
            ? existing.tutorialTitle ?? ""
            : linkDraftHasTutorial
              ? linkDraft.tutorialTitle
              : existing.tutorialTitle ?? "",
          tutorialUrl: isBudgetLinkForm
            ? existing.tutorialUrl ?? ""
            : linkDraftHasTutorial
              ? linkDraft.tutorialUrl
              : existing.tutorialUrl ?? "",
          tutorialDescription: isBudgetLinkForm
            ? existing.tutorialDescription ?? ""
            : linkDraftHasTutorial
              ? linkDraft.tutorialDescription
              : existing.tutorialDescription ?? "",
          visibleToParticipants: linkDraft.visibleToParticipants,
        });
        setDocs((current) => {
          const replaced = (current || []).map((doc) =>
            doc.id === updated.id ? updated : doc
          );
          return dedupeRequiredSlotResources(replaced);
        });
        setDocsError("");
        handleCancelAddLink();
        return;
      }

      const created = await addLinkResource({
        ...linkDraft,
        workArea: buildTripDocumentWorkAreaMeta({
          workerName: linkDraft.workerName,
          notes: linkDraft.workArea,
        }),
        tripId: trip?.id,
        ...(key === "smartsheet-budget"
          ? { tutorialTitle: "", tutorialUrl: "", tutorialDescription: "" }
          : {}),
      });
      if (!created) return;
      setDocs((current) =>
        dedupeRequiredSlotResources(prependDocWithoutDuplicates(current, created))
      );
      setDocsError("");
      handleCancelAddLink();
    } catch (error) {
      if (isMissingResourceTutorialColumnError(error)) {
        setDocsError(
          "Tutorial link editing needs the Supabase migration `supabase/trip_resources_add_tutorial_fields.sql` run first."
        );
        return;
      }
      console.error("Unable to add link resource", error);
      setDocsError(error.message || "Unable to save resources.");
    }
  }

  function renderTripDocumentsLinkDraftForm({ embedded }) {
    const formBody = (
      <>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>
          {linkDraft.resourceKey ? "Required Link" : "New Link"}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            className="input"
            value={linkDraft.title}
            onChange={(e) =>
              setLinkDraft((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Document title"
          />
          <input
            className="input"
            value={linkDraft.link}
            onChange={(e) =>
              setLinkDraft((prev) => ({ ...prev, link: e.target.value }))
            }
            placeholder="https://..."
          />
          <select
            className="input"
            value={linkDraft.category}
            onChange={(e) =>
              setLinkDraft((prev) => ({ ...prev, category: e.target.value }))
            }
          >
            {DOCUMENT_CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={linkDraft.workerName || ""}
            onChange={(e) =>
              setLinkDraft((prev) => ({ ...prev, workerName: e.target.value }))
            }
          >
            <option value="">No worker label</option>
            {tripDocumentWorkerOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <input
            className="input"
            value={linkDraft.workArea}
            onChange={(e) =>
              setLinkDraft((prev) => ({ ...prev, workArea: e.target.value }))
            }
            placeholder="Notes / context"
          />
          <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={linkDraft.visibleToParticipants !== false}
              onChange={(e) =>
                setLinkDraft((prev) => ({
                  ...prev,
                  visibleToParticipants: e.target.checked,
                }))
              }
            />
            Visible to participants
          </label>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn btnPrimary" type="button" onClick={() => void handleSaveLink()}>
            Save Link
          </button>
          <button className="btn" type="button" onClick={handleCancelAddLink}>
            Cancel
          </button>
        </div>
      </>
    );

    if (embedded) {
      return (
        <div
          style={{
            marginTop: 4,
            marginBottom: 8,
            padding: 12,
            borderRadius: 12,
            background: "rgba(15, 23, 42, 0.05)",
            border: "1px solid rgba(15, 23, 42, 0.08)",
          }}
        >
          {formBody}
        </div>
      );
    }

    return (
      <div
        className="card pad"
        style={{ boxShadow: "none", marginBottom: 14, background: "rgba(255,255,255,.7)" }}
      >
        {formBody}
      </div>
    );
  }

  function handleEditDoc(doc) {
    const slot = getDocumentSlotByKey(doc?.resourceKey);
    const workAreaMeta = parseTripDocumentWorkAreaMeta(doc?.workArea);
    setIsAddingLink(false);
    setAddingLinkForSlotKey(null);
    setEditingDocId(doc.id);
    setDocDraft(
      buildDocumentDraft({
        ...doc,
        workerName: workAreaMeta.workerName,
        workArea: workAreaMeta.notes,
        visibleToParticipants: doc.visibleToParticipants !== false,
        ...getEffectiveTutorialContent(slot, doc),
      })
    );
  }

  function clearTripDocsUndoCompletely() {
    if (tripDocsUndoTimerRef.current) {
      clearTimeout(tripDocsUndoTimerRef.current);
      tripDocsUndoTimerRef.current = null;
    }
    tripDocsUndoRunRef.current = null;
    setTripDocsUndoBanner(null);
  }

  function scheduleTripDocsUndo(message, runUndo) {
    clearTripDocsUndoCompletely();
    tripDocsUndoRunRef.current = runUndo;
    setTripDocsUndoBanner({ message });
    tripDocsUndoTimerRef.current = setTimeout(() => {
      clearTripDocsUndoCompletely();
    }, 15000);
  }

  async function runTripDocsUndoAction() {
    const fn = tripDocsUndoRunRef.current;
    if (tripDocsUndoTimerRef.current) {
      clearTimeout(tripDocsUndoTimerRef.current);
      tripDocsUndoTimerRef.current = null;
    }
    tripDocsUndoRunRef.current = null;
    setTripDocsUndoBanner(null);
    if (typeof fn !== "function") return;
    try {
      await fn();
    } catch (error) {
      console.error("Trip docs undo failed", error);
      showToast(error.message || "Undo failed.", "error");
    }
  }

  async function undoDismissRequiredTripDocumentSlotClient(undo) {
    if (!trip?.id || !undo?.placeholderId) return;
    await deleteResource(undo.placeholderId);
    for (const snap of undo.removedSnapshots || []) {
      await insertResourceFromSnapshot({
        tripId: trip.id,
        ...snap,
      });
    }
    for (const rev of undo.demotedRevert || []) {
      await updateResource({
        id: rev.id,
        title: rev.title,
        link: rev.link,
        pdfUrl: rev.pdfUrl,
        category: rev.category,
        resourceKey: rev.resourceKey,
        workArea: rev.workArea,
        tutorialTitle: rev.tutorialTitle,
        tutorialUrl: rev.tutorialUrl,
        tutorialDescription: rev.tutorialDescription,
        visibleToParticipants: rev.visibleToParticipants,
      });
    }
    const fresh = await listResources(trip.id);
    setDocs(dedupeRequiredSlotResources(fresh));
    showToast("Required card restored.", "success");
  }

  async function handleRequestDeleteTripDocument(doc) {
    if (!canManageTripDocuments || !doc?.id) return;
    const title = String(doc.title || "this document").trim() || "this document";
    const bits = [];
    if (String(doc.pdfUrl || "").trim()) bits.push("PDF");
    if (String(doc.link || "").trim()) bits.push("link");
    const typeLine = bits.length ? bits.join(" + ") : "no file or link yet";
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Remove "${title}" from this trip?\n\nContent: ${typeLine}.\nThe document will be removed from this list. You can undo for 15 seconds after confirming.`
      )
    ) {
      return;
    }
    const snap = snapshotTripResourceForInsert(doc);
    if (!snap) return;
    try {
      await deleteResource(doc.id);
      setDocs((current) => current.filter((x) => x.id !== doc.id));
      setDocsError("");
      scheduleTripDocsUndo(`Removed "${title}".`, async () => {
        const restored = await insertResourceFromSnapshot({
          tripId: trip.id,
          ...snap,
        });
        setDocs((current) => dedupeRequiredSlotResources([restored, ...current]));
        showToast("Document restored.", "success");
      });
      showToast("Document removed.", "success");
    } catch (error) {
      console.error("Unable to delete resource", error);
      setDocsError(error.message || "Unable to save resources.");
      showToast(error.message || "Unable to remove document.", "error");
    }
  }

  /**
   * Remove a default required document slot for this trip: delete empty rows for that key,
   * demote non-empty rows to optional (clear resource_key, keep PDF/link), then insert a hidden
   * placeholder so the slot stays dismissed until restored. Budget/journal rows still delete in full.
   * @returns {Promise<{ placeholderId: string, removedSnapshots: object[], demotedRevert: object[] } | null>}
   */
  async function dismissRequiredTripDocumentSlot(slot) {
    if (!trip?.id || !slot?.key) return null;
    const key = slot.key;
    // Use full server list — client `docs` may omit duplicate resource_key rows due to dedupe history.
    const sourceDocs = await listResources(trip.id);
    const idsToDelete = [];
    const docsToDemote = [];
    for (const d of sourceDocs || []) {
      if (!d.id || d.isAutoGenerated) continue;
      if (key === "smartsheet-budget") {
        if (d.resourceKey === "smartsheet-budget" || d.resourceKey === "project-record-journal") {
          idsToDelete.push(d.id);
        }
      } else if (String(d.resourceKey || "").trim() === key) {
        // PDF required slots: never delete rows when dismissing — only clear resource_key so uploads stay
        // linked to the trip. Empty rows become optional cards; avoids losing Flights-category docs when
        // content fields are missing or not yet synced.
        if (key === "flights" || key === "trip-insurance") {
          docsToDemote.push(d);
        } else {
          const hasContent = !!(String(d.link || "").trim() || String(d.pdfUrl || "").trim());
          if (hasContent) {
            docsToDemote.push(d);
          } else {
            idsToDelete.push(d.id);
          }
        }
      }
    }
    const removedSnapshots = idsToDelete
      .map((id) => sourceDocs.find((e) => e.id === id))
      .map((d) => snapshotTripResourceForInsert(d))
      .filter(Boolean);
    const demotedRevert = docsToDemote.map((d) => ({
      id: d.id,
      resourceKey: key,
      title: d.title,
      link: d.link || "",
      pdfUrl: d.pdfUrl || "",
      category: d.category || slot.category,
      workArea: d.workArea || "",
      tutorialTitle: d.tutorialTitle,
      tutorialUrl: d.tutorialUrl,
      tutorialDescription: d.tutorialDescription,
      visibleToParticipants: d.visibleToParticipants,
    }));
    for (const id of idsToDelete) {
      await deleteResource(id);
    }
    for (const d of docsToDemote) {
      await updateResource({
        id: d.id,
        title: d.title,
        link: d.link || "",
        pdfUrl: d.pdfUrl || "",
        category: d.category || slot.category,
        resourceKey: "",
        workArea: d.workArea || "",
        tutorialTitle: d.tutorialTitle,
        tutorialUrl: d.tutorialUrl,
        tutorialDescription: d.tutorialDescription,
        visibleToParticipants: d.visibleToParticipants,
      });
    }
    const created = await addLinkResource({
      title: slot.title,
      link: "",
      category: slot.category,
      resourceKey: key,
      tripId: trip.id,
      workArea: [DISMISS_SLOT_WORKAREA_MARKER, trip?.name || ""].filter(Boolean).join("\n"),
      visibleToParticipants: false,
      // Omit column on DBs without trip_resources_add_visibility.sql; dismiss is still detected via workArea marker.
      allowVisibilityFallback: true,
    });
    const fresh = await listResources(trip.id);
    setDocs(dedupeRequiredSlotResources(fresh));
    setDocsError("");
    return {
      placeholderId: created.id,
      removedSnapshots,
      demotedRevert,
    };
  }

  async function handleDeleteRequiredSlotResource(slot) {
    if (!slot?.key || !trip?.id) return;
    const isBudget = slot.key === "smartsheet-budget";
    const msg1 = isBudget
      ? `FIRST CONFIRMATION — Remove "${slot.title}"?\n\nThis removes all saved Smartsheet budget / project journal links for this trip from the document list (not from Smartsheet itself).\n\nYou will have 15 seconds to undo.`
      : `FIRST CONFIRMATION — Remove "${slot.title}" as a required card?\n\nEmpty rows for this slot are deleted. Uploads with a file or link stay on the trip as extra documents (not removed from storage).\n\nYou will have 15 seconds to undo.`;
    if (typeof window !== "undefined" && !window.confirm(msg1)) return;
    const msg2 = `FINAL CONFIRMATION\n\nRemove "${slot.title}" now?`;
    if (typeof window !== "undefined" && !window.confirm(msg2)) return;
    try {
      const undo = await dismissRequiredTripDocumentSlot(slot);
      if (canManageTripDocuments && undo?.placeholderId) {
        scheduleTripDocsUndo(`Removed required "${slot.title}".`, async () => {
          await undoDismissRequiredTripDocumentSlotClient(undo);
        });
      }
      showToast("Required card removed.", "success");
    } catch (error) {
      console.error("Unable to remove required document slot", error);
      setDocsError(error.message || "Unable to remove document.");
      showToast(error.message || "Unable to remove document.", "error");
    }
  }

  async function restoreDismissedDefaultTripDocuments() {
    if (!trip?.id) return;
    const keys = new Set(REQUIRED_TRIP_DOCUMENT_SLOTS.map((s) => s.key));
    const toRemove = (docs || []).filter(
      (d) => keys.has(String(d.resourceKey || "")) && isPersistedTripResourceDismissedEmpty(d)
    );
    if (toRemove.length === 0) return;
    try {
      for (const d of toRemove) {
        if (d.id) await deleteResource(d.id);
      }
      setDocs((current) => (current || []).filter((e) => !toRemove.some((r) => r.id === e.id)));
      setDocsError("");
      showToast("Default document cards restored.");
    } catch (error) {
      console.error("Unable to restore default documents", error);
      showToast(error.message || "Unable to restore.", "error");
    }
  }

  async function handleSaveHousingTripDocs() {
    if (!trip?.id || !housingTripDocsDraft || !staffViewAllParticipants) return;
    setHousingTripDocsSaveStatus("Saving...");
    try {
      let housingPdfUrl = String(housingTripDocsDraft.pdfUrlKeep || "").trim();
      if (housingTripDocsDraft.clearPdf) housingPdfUrl = "";
      if (housingTripDocsDraft.file) {
        housingPdfUrl = await uploadTripHousingPdf(trip.id, housingTripDocsDraft.file);
      }
      await saveTripBudget(trip.id, {
        housingLink: String(housingTripDocsDraft.housingLink || "").trim() || null,
        housingPdfUrl: housingPdfUrl || null,
      });
      const next = await fetchTripHousingState(trip.id);
      setTripHousingDocuments(next.tripHousingDocuments);
      setTripHousingLinkUrl(next.tripHousingLinkUrl);
      setTripHousingPdfUrl(next.tripHousingPdfUrl);
      setHousingTripDocsDraft(null);
      setHousingTripDocsSaveStatus("");
      showToast("Team housing saved.", "success");
    } catch (e) {
      const msg = e.message || "Unable to save housing.";
      setHousingTripDocsSaveStatus(msg);
      showToast(msg, "error");
    }
  }

  function handleCancelEditDoc() {
    setEditingDocId(null);
    setDocDraft(null);
  }

  async function handleSaveDoc() {
    if (!docDraft) return;

    try {
        const updated = await updateResource({
          id: docDraft.id,
          title: docDraft.title,
          link: docDraft.link,
          pdfUrl: docDraft.pdfUrl,
          category: docDraft.category,
          resourceKey: docDraft.resourceKey,
          workArea: buildTripDocumentWorkAreaMeta({
            workerName: docDraft.workerName,
            notes: docDraft.workArea,
          }),
          tutorialTitle: docDraft.tutorialTitle,
          tutorialUrl: docDraft.tutorialUrl,
          tutorialDescription: docDraft.tutorialDescription,
        visibleToParticipants: docDraft.visibleToParticipants,
      });
      setDocs((current) =>
        current.map((doc) => (doc.id === updated.id ? updated : doc))
      );
      setDocsError("");
      handleCancelEditDoc();
    } catch (error) {
      if (isMissingResourceTutorialColumnError(error)) {
        setDocsError(
          "Tutorial link editing needs the Supabase migration `supabase/trip_resources_add_tutorial_fields.sql` run first."
        );
        return;
      }
      console.error("Unable to update resource", error);
      setDocsError(error.message || "Unable to save resources.");
    }
  }

  async function handleReplaceDocumentFile(event) {
    const file = event.target.files?.[0];
    if (!file || !docDraft) return;

    try {
      const created = await addPdfResource({
        title: docDraft.title || file.name,
        file,
        category: docDraft.category,
        workArea: docDraft.workArea,
        resourceKey: docDraft.resourceKey,
        tutorialTitle: docDraft.tutorialTitle,
        tutorialUrl: docDraft.tutorialUrl,
        tutorialDescription: docDraft.tutorialDescription,
        visibleToParticipants: docDraft.visibleToParticipants,
        tripId: trip?.id,
      });
      const updated = await updateResource({
        id: docDraft.id,
        title: created.title,
        link: null,
        pdfUrl: created.pdfUrl,
        category: created.category,
        resourceKey: created.resourceKey,
        workArea: created.workArea,
        tutorialTitle: docDraft.tutorialTitle,
        tutorialUrl: docDraft.tutorialUrl,
        tutorialDescription: docDraft.tutorialDescription,
        visibleToParticipants: docDraft.visibleToParticipants,
      });
      setDocs((current) =>
        current.map((doc) => (doc.id === updated.id ? updated : doc))
      );
      setDocsError("");
      handleCancelEditDoc();
    } catch (error) {
      if (isMissingResourceTutorialColumnError(error)) {
        setDocsError(
          "Tutorial link editing needs the Supabase migration `supabase/trip_resources_add_tutorial_fields.sql` run first."
        );
        return;
      }
      console.error("Unable to replace PDF resource", error);
      setDocsError(error.message || "Unable to save resources.");
    } finally {
      event.target.value = "";
    }
  }

  useEffect(() => {
    if (!trip?.id || isPreviewingParticipant) {
      if (isPreviewingParticipant || !trip?.id) setReferenceEmails({});
      return;
    }

    let cancelled = false;

    async function loadReferenceEmails() {
      try {
        const rows = await listReferenceEmails(trip.id);
        if (cancelled) return;

        const next = {};
        rows.forEach((row) => {
          const key = referenceRowToStateKey(row);
          if (!key) return;
          next[key] = {
            referenceName: row.referenceName,
            referenceEmail: row.referenceEmail,
            referencePhone: row.referencePhone,
            sent: row.sent,
            received: row.received,
            sentDate: row.sentDate,
          };
        });
        setReferenceEmails(next);
      } catch (error) {
        console.error("Unable to load reference emails", error);
        if (!cancelled) {
          setReferenceEmails({});
        }
      }
    }

    void loadReferenceEmails();

    return () => {
      cancelled = true;
    };
  }, [trip?.id, isPreviewingParticipant]);

  function updateFundraisingDraft(participantId, field, value) {
    setFundraisingDrafts((current) => {
      const prev = current[participantId] || {};
      return {
        ...current,
        [participantId]: {
          fundraisingUrl: prev.fundraisingUrl ?? "",
          fundraisingGoalAmount: prev.fundraisingGoalAmount ?? "",
          [field]: value,
        },
      };
    });
  }

  async function handleSaveFundraising(participant) {
    if (!trip || !participant?.id) return;

    const draft = fundraisingDrafts[participant.id] || {
      fundraisingUrl: "",
      fundraisingGoalAmount: "",
    };

    try {
      setFundraisingStatus((current) => ({
        ...current,
        [participant.id]: { type: "info", message: "Saving..." },
      }));

      if (participant.tripTeamMemberId) {
        const savedMember = await saveTripTeamMemberFundraisingUrl({
          tripId: trip.id,
          memberId: participant.tripTeamMemberId,
          fundraisingUrl: draft.fundraisingUrl,
          fundraisingGoalAmount: draft.fundraisingGoalAmount,
        });

        const nextGoal =
          savedMember.fundraisingGoalAmount != null && savedMember.fundraisingGoalAmount !== ""
            ? Number(savedMember.fundraisingGoalAmount)
            : undefined;

        setTrip((current) => {
          if (!current) return current;
          return {
            ...current,
            teamMembers: (current.teamMembers || []).map((m) =>
              m.id === participant.tripTeamMemberId
                ? {
                    ...m,
                    fundraisingUrl: savedMember.fundraisingUrl,
                    fundraisingGoalAmount: nextGoal,
                  }
                : m
            ),
            participants: (current.participants || []).map((item) =>
              item.id === participant.id
                ? {
                    ...item,
                    fundraisingUrl: savedMember.fundraisingUrl,
                    fundraisingGoalAmount: nextGoal,
                  }
                : item
            ),
          };
        });

        setFundraisingDrafts((current) => ({
          ...current,
          [participant.id]: {
            fundraisingUrl: savedMember.fundraisingUrl || "",
            fundraisingGoalAmount:
              savedMember.fundraisingGoalAmount != null && savedMember.fundraisingGoalAmount !== ""
                ? String(savedMember.fundraisingGoalAmount)
                : "",
          },
        }));
      } else {
        if (
          String(draft.fundraisingGoalAmount || "").trim() !== "" &&
          canViewTeamDashboard
        ) {
          throw new Error(
            "Individual goals are stored on the trip roster. Add this worker to the team roster (Team tab) or ensure their roster row exists, then try again."
          );
        }

        const savedProfile = await saveFundraisingProfile({
          tripId: trip.id,
          userId: participant.id,
          fundraisingUrl: draft.fundraisingUrl,
        });

        setTrip((current) => {
          if (!current) return current;

          return {
            ...current,
            participants: (current.participants || []).map((item) =>
              item.id === participant.id
                ? {
                    ...item,
                    fundraisingUrl: savedProfile.fundraisingUrl,
                  }
                : item
            ),
          };
        });

        setFundraisingDrafts((current) => ({
          ...current,
          [participant.id]: {
            fundraisingUrl: savedProfile.fundraisingUrl || "",
            fundraisingGoalAmount: "",
          },
        }));
      }

      setFundraisingStatus((current) => ({
        ...current,
        [participant.id]: { type: "success", message: "Saved." },
      }));
      setEditingParticipantFundraisingId("");
    } catch (error) {
      console.error("Unable to save fundraising profile", error);
      setFundraisingStatus((current) => ({
        ...current,
        [participant.id]: {
          type: "error",
          message: error.message || "Unable to save fundraising.",
        },
      }));
    }
  }

  async function handleSaveTeamFundraising() {
    if (!trip?.id) return;

    try {
      setTeamFundraisingStatus("Saving...");
      const savedTrip = await saveTripFundraisingSettings({
        tripId: trip.id,
        teamFundraisingUrl: teamFundraisingDraft.teamFundraisingUrl,
        fundraisingGoalAmount: (() => {
          const raw = teamFundraisingDraft.fundraisingGoalAmount;
          if (raw === "" || raw == null) return null;
          const n = Number.parseFloat(String(raw), 10);
          return Number.isFinite(n) ? n : null;
        })(),
        fundraisingMode: teamFundraisingDraft.fundraisingMode,
      });

      setTrip((current) =>
        current
          ? {
              ...current,
              teamFundraisingUrl: savedTrip.team_fundraising_url || "",
              fundraisingGoalAmount: Number(savedTrip.fundraising_goal_amount || 0),
              fundraisingMode:
                String(savedTrip.fundraising_mode || "").toLowerCase() === "team"
                  ? "team"
                  : "individual",
            }
          : current
      );
      setIsEditingTeamFundraising(false);
      setTeamFundraisingStatus("Saved.");
    } catch (error) {
      console.error("Unable to save team fundraising settings", error);
      setTeamFundraisingStatus(error.message || "Unable to save team fundraising.");
    }
  }

  function normalizeReferenceRefKey(refKey) {
    if (!refKey) return "";
    return refKey.startsWith("user:") || refKey.startsWith("roster:")
      ? refKey
      : `user:${refKey}`;
  }

  function normalizeTravelFormRefKey(refKey) {
    if (!refKey) return "";
    return refKey.startsWith("user:") || refKey.startsWith("roster:")
      ? refKey
      : `user:${refKey}`;
  }

  function getTravelFormByRefKey(refKey) {
    const key = normalizeTravelFormRefKey(refKey);
    return (
      travelFormResponses.find(
        (row) => normalizeTravelFormRefKey(travelFormRowToRefKey(row)) === key
      ) || null
    );
  }

  function getReferenceStatus(refKey) {
    const key = normalizeReferenceRefKey(refKey);
    return (
      referenceEmails[key] || {
        referenceName: "",
        referenceEmail: "",
        referencePhone: "",
        sent: false,
        received: false,
        sentDate: "",
      }
    );
  }

  async function saveReferenceStatus(refKey, nextStatus) {
    if (!trip || !refKey) return;
    const rawKey = normalizeReferenceRefKey(refKey);
    const userId = rawKey.startsWith("user:") ? rawKey.slice(5) : "";
    const tripTeamMemberId = rawKey.startsWith("roster:") ? rawKey.slice(7) : "";
    if (!userId && !tripTeamMemberId) return;

    try {
      setReferenceSaveStatusByKey((current) => ({
        ...current,
        [rawKey]: { type: "saving", message: "Saving..." },
      }));
      const saved = await saveReferenceEmail({
        tripId: trip.id,
        userId: userId || undefined,
        tripTeamMemberId: tripTeamMemberId || undefined,
        referenceName: nextStatus.referenceName,
        referenceEmail: nextStatus.referenceEmail,
        referencePhone: nextStatus.referencePhone,
        sent: nextStatus.sent,
        received: nextStatus.received,
        sentDate: nextStatus.sentDate,
      });

      const stateKey = referenceRowToStateKey(saved);
      if (!stateKey) return;

      setReferenceEmails((current) => ({
        ...current,
        [stateKey]: {
          referenceName: saved.referenceName,
          referenceEmail: saved.referenceEmail,
          referencePhone: saved.referencePhone,
          sent: saved.sent,
          received: saved.received,
          sentDate: saved.sentDate,
        },
      }));
      setReferenceSaveStatusByKey((current) => ({
        ...current,
        [stateKey]: { type: "success", message: "Saved." },
      }));
    } catch (error) {
      console.error("Unable to save reference email", error);
      setReferenceSaveStatusByKey((current) => ({
        ...current,
        [rawKey]: { type: "error", message: error.message || "Save failed." },
      }));
      showToast(error.message || "Unable to save reference email.", "error");
    }
  }

  function retryReferenceSave(refKey) {
    const current = getReferenceStatus(refKey);
    void saveReferenceStatus(refKey, current);
  }

  function toggleReferenceEmail(refKey, field) {
    const key = normalizeReferenceRefKey(refKey);
    const current = getReferenceStatus(refKey);
    const nextValue = !current[field];

    const nextStatus = {
      ...current,
      [field]: nextValue,
      sentDate:
        field === "sent" && !nextValue ? "" : current.sentDate || "",
    };

    setReferenceEmails((prev) => ({
      ...prev,
      [key]: nextStatus,
    }));
    void saveReferenceStatus(refKey, nextStatus);
  }

  function updateReferenceSentDate(refKey, value) {
    const key = normalizeReferenceRefKey(refKey);
    const current = getReferenceStatus(refKey);
    const nextStatus = {
      ...current,
      sent: value ? true : current.sent,
      sentDate: value,
    };

    setReferenceEmails((prev) => ({
      ...prev,
      [key]: nextStatus,
    }));
    void saveReferenceStatus(refKey, nextStatus);
  }

  function updateReferenceField(refKey, field, value) {
    const key = normalizeReferenceRefKey(refKey);
    const current = getReferenceStatus(refKey);
    const nextStatus = {
      ...current,
      [field]: value,
    };

    setReferenceEmails((prev) => ({
      ...prev,
      [key]: nextStatus,
    }));
    void saveReferenceStatus(refKey, nextStatus);
  }

  function toggleTask(taskId, ownerEmail = session?.email) {
    if (!trip || !ownerEmail) return;
    const emailKey = normalizeEmail(ownerEmail);
    if (!emailKey) return;

    void (async () => {
      const userId = await resolveTrainingSubjectUserId(ownerEmail);
      if (!userId) {
        showToast(
          "No profile found for this email. The worker needs an account (or matching roster email) before tasks can be saved.",
          "error"
        );
        return;
      }

      const currentState = participantTaskStates[emailKey] || {};
      const next = { ...currentState, [taskId]: !currentState[taskId] };

      setParticipantTaskStates((prev) => ({
        ...prev,
        [emailKey]: next,
      }));

      const task = (trip.tasks || []).find((item) => item.id === taskId);
      const subject = participantDisplayForTrainingEmail(ownerEmail);

      try {
        await saveUserTaskProgress({
          tripId: trip.id,
          userId,
          taskName: taskId,
          completed: next[taskId],
          dueDate: task?.due || null,
        });
        if (!next[taskId]) return;
        const activityEntry = await logTripActivity({
          tripId: trip.id,
          actorUserId: userId,
          actorName: subject.name || session?.name || subject.email || ownerEmail,
          actorEmail: subject.email || session?.email || "",
          eventType: "task_completed",
          message: `${subject.name || subject.email || "Someone"} marked task complete`,
        });
        pushRecentActivity(activityEntry);
      } catch (error) {
        console.error("Unable to save user task progress", error);
        showToast(error.message || "Unable to save task progress.", "error");
      }
    })();
  }

  function openTravelFormModal(target) {
    if (!target?.refKey || !trip?.id) return;
    const refKey = normalizeTravelFormRefKey(target.refKey);
    const userId = refKey.startsWith("user:") ? refKey.slice(5) : "";
    const tripTeamMemberId = refKey.startsWith("roster:") ? refKey.slice(7) : "";
    if (!userId && !tripTeamMemberId) return;

    setTravelFormTargetRefKey(refKey);
    setTravelFormStatus("");
    setTravelFormModalOpen(true);
    getTravelFormForRef(trip.id, {
      userId: userId || undefined,
      tripTeamMemberId: tripTeamMemberId || undefined,
    })
      .then((existing) => {
        if (existing) {
          setTravelFormDraft({
            teamName: existing.teamName,
            firstNamePassport: existing.firstNamePassport,
            middleNamePassport: existing.middleNamePassport,
            lastNamePassport: existing.lastNamePassport,
            suffix: existing.suffix,
            email: existing.email,
            birthdateMonth: existing.birthdateMonth,
            birthdateDay: existing.birthdateDay,
            birthdateYear: existing.birthdateYear,
            gender: existing.gender,
            citizenship: existing.citizenship,
            passportNumber: existing.passportNumber,
            passportExpirationDate: existing.passportExpirationDate,
            passportIssuingCountry: existing.passportIssuingCountry,
            specialTravelPreferences: existing.specialTravelPreferences,
            frequentFlyerPrecheck: existing.frequentFlyerPrecheck,
            siteProject: existing.siteProject,
            gatewayCity: existing.gatewayCity,
            departureDate: existing.departureDate,
            returnDate: existing.returnDate,
            isMinor: existing.isMinor,
            passportValidSixMonths: existing.passportValidSixMonths,
            baseTicketAck: existing.baseTicketAck,
            teamTravelAck: existing.teamTravelAck,
            endMeetingAck: existing.endMeetingAck,
            travelInsuranceAck: existing.travelInsuranceAck,
          });
        } else {
          setTravelFormDraft({
            ...TRAVEL_FORM_EMPTY,
            teamName: trip.name || "",
            email: target.email || "",
          });
        }
      })
      .catch((error) => {
        console.error("Unable to load travel form", error);
        showToast(error?.message || "Unable to load travel form.", "error");
        setTravelFormDraft({ ...TRAVEL_FORM_EMPTY, teamName: trip?.name || "", email: target?.email || "" });
      });
  }

  async function handleSaveTravelForm() {
    const refKey = normalizeTravelFormRefKey(travelFormTargetRefKey);
    const userId = refKey.startsWith("user:") ? refKey.slice(5) : "";
    const tripTeamMemberId = refKey.startsWith("roster:") ? refKey.slice(7) : "";
    const participant = userId
      ? (trip?.participants || []).find((p) => String(p.id) === String(userId))
      : null;
    if (!trip?.id || (!userId && !tripTeamMemberId)) return;
    try {
      setTravelFormStatus("Saving...");
      await saveTravelFormForRef(trip.id, {
        userId: userId || undefined,
        tripTeamMemberId: tripTeamMemberId || undefined,
      }, {
        ...travelFormDraft,
        teamName: travelFormDraft.teamName || trip.name,
      });
      const updated = await listTravelFormResponsesForTrip(trip.id);
      setTravelFormResponses(updated);
      setTravelFormStatus("Saved.");
      showToast("Travel form saved.");
      const travelFormTask = (trip.tasks || []).find((t) => t.title === "Fill out Travel Form");
      if (
        participant &&
        travelFormTask &&
        !(participantTaskStates[normalizeEmail(participant.email)] || {})[travelFormTask.id]
      ) {
        toggleTask(travelFormTask.id, participant.email);
      }
      setTravelFormModalOpen(false);
      setTravelFormTargetRefKey("");
      setTravelFormStatus("");
    } catch (error) {
      const errMsg = error.message || "Unable to save.";
      setTravelFormStatus(errMsg);
      showToast(errMsg, "error");
    }
  }

  async function handleCreateTask() {
    if (!trip || !taskDraft.title.trim() || !canManageTrips || !staffViewAllParticipants) return;

    const dueSnap = taskDraftTripleRef.current?.getDueYmd?.();
    if (dueSnap === null) {
      showToast(
        "Finish choosing the due date (year, month, and day), or clear all date fields to add without one.",
        "error"
      );
      return;
    }

    try {
      const createdTask = await createTripTask({
        tripId: trip.id,
        title: taskDraft.title,
        dueDate: dueSnap,
        category: taskDraft.category,
        description: taskDraft.description,
      });

      setTrip((current) =>
        current
          ? {
              ...current,
              tasks: [...(current.tasks || []), createdTask],
            }
          : current
      );
      setTaskDraft({ title: "", dueDate: "", category: "General", description: "" });
      setTaskStatusMessage("");
      setIsAddingTask(false);
    } catch (error) {
      console.error("Unable to create trip task", error);
      setTaskStatusMessage(error.message || "Unable to create task.");
    }
  }

  async function resolveTrainingSubjectUserId(ownerEmail) {
    const key = normalizeEmail(ownerEmail);
    if (!key || !trip) return null;
    const fromAssignment = (trip.participants || []).find(
      (entry) => normalizeEmail(entry.email) === key
    );
    if (fromAssignment?.id) return fromAssignment.id;
    return resolveProfileIdByEmailForTraining(ownerEmail);
  }

  function participantDisplayForTrainingEmail(ownerEmail) {
    const key = normalizeEmail(ownerEmail);
    const fromParticipants = (trip?.participants || []).find(
      (entry) => normalizeEmail(entry.email) === key
    );
    if (fromParticipants) return fromParticipants;
    const fromRoster = (trip?.teamMembers || []).find(
      (entry) => normalizeEmail(entry.email) === key
    );
    if (fromRoster) {
      return {
        id: fromRoster.id,
        name: fromRoster.name || fromRoster.email || ownerEmail,
        email: fromRoster.email || ownerEmail,
      };
    }
    return {
      id: null,
      name: ownerEmail,
      email: ownerEmail,
    };
  }

  function toggleTraining(id, ownerEmail = session?.email) {
    if (!trip || !ownerEmail) return;

    const emailKey = normalizeEmail(ownerEmail);
    if (!emailKey) return;

    void (async () => {
      const userId = await resolveTrainingSubjectUserId(ownerEmail);
      if (!userId) {
        showToast(
          "No profile found for this email. The worker needs an account (or matching roster email) before training can be saved.",
          "error"
        );
        return;
      }

      const currentState = participantTrainingStates[emailKey] || {};
      const next = { ...currentState, [id]: !currentState[id] };
      const nextValue = !currentState[id];

      if (datedTrainingModuleIds.includes(id) && !nextValue) {
        next[`${id}Date`] = "";
      }

      setParticipantTrainingStates((prev) => ({
        ...prev,
        [emailKey]: next,
      }));

      const participant = participantDisplayForTrainingEmail(ownerEmail);

      try {
        await saveTrainingProgress({
          tripId: trip.id,
          userId,
          moduleId: id,
          completed: nextValue,
          completedAt: next[`${id}Date`] || null,
        });
        if (!nextValue) return;
        const module = allTrainingModules.find((item) => item.id === id);
        const activityEntry = await logTripActivity({
          tripId: trip.id,
          actorUserId: userId,
          actorName: participant.name || session?.name || participant.email,
          actorEmail: participant.email || session?.email || "",
          eventType: "training_completed",
          message: `${participant.name || participant.email || "Someone"} completed ${module?.title || "training module"}`,
        });
        pushRecentActivity(activityEntry);
      } catch (error) {
        console.error("Unable to save training progress", error);
        showToast(error.message || "Unable to save training progress.", "error");
      }
    })();
  }

  function updateTrainingDate(id, value, ownerEmail = session?.email) {
    if (!trip || !ownerEmail) return;

    const emailKey = normalizeEmail(ownerEmail);
    if (!emailKey) return;

    void (async () => {
      const userId = await resolveTrainingSubjectUserId(ownerEmail);
      if (!userId) {
        showToast(
          "No profile found for this email. The worker needs an account before training dates can be saved.",
          "error"
        );
        return;
      }

      const currentState = participantTrainingStates[emailKey] || {};
      const next = {
        ...currentState,
        [`${id}Date`]: value,
        [id]: value ? true : currentState[id],
      };

      setParticipantTrainingStates((prev) => ({
        ...prev,
        [emailKey]: next,
      }));

      const participant = participantDisplayForTrainingEmail(ownerEmail);

      try {
        const saved = await saveTrainingProgress({
          tripId: trip.id,
          userId,
          moduleId: id,
          completed: !!next[id],
          completedAt: value || null,
        });
        const moduleMeta = allTrainingModules.find((item) => String(item.id) === String(id));
        const rawFromServer = String(saved.completedAt || "").trim() || String(value || "").trim();
        const dateForUi = rawFromServer
          ? moduleMeta
            ? hydrateTrainingSessionDateFromDb(rawFromServer, moduleMeta.title)
            : rawFromServer
          : "";
        setParticipantTrainingStates((prev) => ({
          ...prev,
          [emailKey]: {
            ...(prev[emailKey] || {}),
            [`${id}Date`]: dateForUi,
            [id]: !!saved.completed,
          },
        }));
        if (!value || currentState[id]) return;
        const module = moduleMeta;
        const activityEntry = await logTripActivity({
          tripId: trip.id,
          actorUserId: userId,
          actorName: participant.name || session?.name || participant.email,
          actorEmail: participant.email || session?.email || "",
          eventType: "training_completed",
          message: `${participant.name || participant.email || "Someone"} completed ${module?.title || "training module"}`,
        });
        pushRecentActivity(activityEntry);
      } catch (error) {
        console.error("Unable to save training date", error);
        showToast(error.message || "Unable to save training progress.", "error");
      }
    })();
  }

  function withComputedStaffDueDates(tasks) {
    return sortStaffTasksByTemplate(
      (tasks || []).map((task) => ({
        ...task,
        dueDate: task.dueDate || computeStaffTaskDueDate(task, trip),
      }))
    );
  }

  async function saveStaffTasks(nextTasks) {
    const orderedTasks = withComputedStaffDueDates(nextTasks);
    setEditableStaffTasks(orderedTasks);
    editableStaffTasksRef.current = orderedTasks;
    if (!trip) return;
    const requestId = latestStaffTaskSaveRef.current + 1;
    latestStaffTaskSaveRef.current = requestId;
    try {
      setStaffTaskStatus("Saving...");
      const tasksToPersist = orderedTasks.map((task) => ({
        ...task,
        updatedByName: session?.name || session?.email || "Staff",
        updatedByEmail: session?.email || "",
        updatedAt: new Date().toISOString(),
      }));
      const savedTasks = await persistStaffTasks(trip.id, tasksToPersist);
      if (latestStaffTaskSaveRef.current !== requestId) return;
      setEditableStaffTasks(savedTasks);
      editableStaffTasksRef.current = savedTasks;
      setStaffTaskStatus("Saved.");
      showToast("Staff tasks saved.");
      return savedTasks;
    } catch (error) {
      console.error("Unable to save staff tasks", error);
      if (latestStaffTaskSaveRef.current !== requestId) return;
      const errMsg = "Could not save task changes.";
      setStaffTaskStatus(errMsg);
      showToast(errMsg, "error");
      throw error;
    }
  }

  async function persistWorkerTaskDueDate(taskId, value) {
    if (!trip || !taskId) return;

    const existingTask = (trip.tasks || []).find((item) => item.id === taskId);
    if (!existingTask) return;

    const savedTask = await updateTripTask({
      id: taskId,
      title: existingTask.title,
      description: existingTask.description,
      category: existingTask.category,
      status: existingTask.status,
      assignedToUserId: existingTask.assignedToUserId,
      dueDate: value || null,
    });

    setTrip((current) =>
      current
        ? {
            ...current,
            tasks: (current.tasks || [])
              .map((task) => (task.id === taskId ? savedTask : task))
              .sort((left, right) => {
                const leftDue = String(left?.due || "").trim();
                const rightDue = String(right?.due || "").trim();

                if (!leftDue && !rightDue) {
                  return String(left?.title || "").localeCompare(String(right?.title || ""));
                }

                if (!leftDue) return 1;
                if (!rightDue) return -1;

                return (
                  leftDue.localeCompare(rightDue) ||
                  String(left?.title || "").localeCompare(String(right?.title || ""))
                );
              }),
          }
        : current
    );
  }

  async function handleApplyWorkerTaskDueDate() {
    const taskId = editingWorkerTaskDateId;
    if (!trip || !taskId) return;
    const handleKey = `${taskId}::${editingWorkerDueParticipantKey}`;
    const handle = workerDueTripleHandlesRef.current.get(handleKey);
    const fromRef = typeof handle?.getDueYmd === "function" ? handle.getDueYmd() : undefined;
    if (fromRef === null) {
      showToast("Choose year, month, and day for the due date, or use Clear due.", "error");
      return;
    }
    const draft = String(workerTaskDueDateDraft || "").trim();
    const draftYmd = /^\d{4}-\d{2}-\d{2}$/.test(draft);
    const snap = draftYmd ? draft : fromRef !== undefined ? fromRef : null;
    if (snap === null) {
      showToast("Choose year, month, and day for the due date, or use Clear due.", "error");
      return;
    }
    try {
      await persistWorkerTaskDueDate(taskId, snap);
      setEditingWorkerTaskDateId("");
      setEditingWorkerDueParticipantKey("");
      setWorkerTaskDueDateDraft("");
      workerDueTripleHandlesRef.current.delete(handleKey);
      setTaskStatusMessage("");
    } catch (error) {
      console.error("Unable to update worker task due date", error);
      setTaskStatusMessage(error.message || "Unable to update worker task due date.");
    }
  }

  async function handleClearWorkerTaskDueDate() {
    const taskId = editingWorkerTaskDateId;
    if (!trip || !taskId) return;
    const handleKey = `${taskId}::${editingWorkerDueParticipantKey}`;
    try {
      await persistWorkerTaskDueDate(taskId, "");
      setEditingWorkerTaskDateId("");
      setEditingWorkerDueParticipantKey("");
      setWorkerTaskDueDateDraft("");
      workerDueTripleHandlesRef.current.delete(handleKey);
      setTaskStatusMessage("");
    } catch (error) {
      console.error("Unable to clear worker task due date", error);
      setTaskStatusMessage(error.message || "Unable to update worker task due date.");
    }
  }

  async function handleUploadParticipantDocument(userId, documentType, file) {
    if (!trip?.id || !userId || !file) return;

    const statusKey = `${userId}:${documentType}`;

    try {
      setParticipantDocumentStatus((current) => ({
        ...current,
        [statusKey]: { type: "info", message: "Uploading..." },
      }));

      const saved = await saveUserDocumentUpload({
        userId,
        tripId: trip.id,
        documentType,
        title: `${getUserDocumentTypeLabel(documentType, trip?.participantDocumentTypes)} - ${trip.name}`,
        file,
        uploadedByUserId: session?.profileId || session?.id || userId,
      });

      setParticipantDocuments((current) => {
        const next = current.filter(
          (document) =>
            !(
              String(document.userId) === String(userId) &&
              String(document.tripId) === String(trip.id) &&
              String(document.documentType) === String(documentType)
            )
        );

        return [
          {
            ...saved,
            user:
              trip.participants.find((participant) => String(participant.id) === String(userId)) || null,
            trip: {
              id: trip.id,
              name: trip.name,
              location: trip.location,
            },
          },
          ...next,
        ];
      });

      setParticipantDocumentsError("");
      setParticipantDocumentStatus((current) => ({
        ...current,
        [statusKey]: { type: "success", message: "Uploaded." },
      }));
      const participantName =
        trip.participants.find((participant) => String(participant.id) === String(userId))?.name ||
        session?.name ||
        session?.email ||
        "Someone";
      const activityEntry = await logTripActivity({
        tripId: trip.id,
        actorUserId: session?.profileId || session?.id || userId,
        actorName: session?.name || participantName,
        actorEmail: session?.email || "",
        eventType: "participant_document_uploaded",
        message: `${participantName} uploaded ${getUserDocumentTypeLabel(
          documentType,
          trip?.participantDocumentTypes
        ).toLowerCase()}`,
      });
      pushRecentActivity(activityEntry);
    } catch (error) {
      console.error("Unable to upload participant document", error);
      setParticipantDocumentsError(error.message || "Unable to upload document.");
      setParticipantDocumentStatus((current) => ({
        ...current,
        [statusKey]: { type: "error", message: error.message || "Upload failed." },
      }));
    }
  }

  async function handleAddParticipantDocumentType() {
    if (!trip?.id) return;

    const nextTypes = normalizeCustomUserDocumentTypes([
      ...(trip.participantDocumentTypes || []),
      {
        label: customParticipantDocumentLabel,
      },
    ]);

    if ((trip.participantDocumentTypes || []).length === nextTypes.length) {
      setParticipantDocumentTypeStatus("Enter a new upload item name.");
      return;
    }

    try {
      setParticipantDocumentTypeStatus("Saving...");
      const updatedTrip = await saveTripParticipantDocumentTypes(trip.id, nextTypes);
      const addedType = nextTypes[nextTypes.length - 1] || null;
      let createdTask = null;

      if (addedType?.label) {
        createdTask = await createTripTask({
          tripId: trip.id,
          title: `Upload ${addedType.label}`,
          dueDate: buildDateOffsetFromToday(14),
          category: "Uploads",
          description: `Upload ${addedType.label} in My Documents.`,
        });
      }

      setTrip((current) =>
        current
          ? {
              ...current,
              participantDocumentTypes: updatedTrip.participantDocumentTypes || [],
              tasks: createdTask ? [...(current.tasks || []), createdTask] : current.tasks,
            }
          : current
      );
      setCustomParticipantDocumentLabel("");
      setParticipantDocumentTypeStatus(
        createdTask
          ? `Saved. Task created with due date ${formatShortDate(createdTask.due)}.`
          : "Saved."
      );
    } catch (error) {
      console.error("Unable to save participant document types", error);
      setParticipantDocumentTypeStatus(error.message || "Unable to save upload item.");
    }
  }

  async function handleDeleteParticipantDocument(document) {
    if (!document?.id) return;

    const statusKey = `${document.userId}:${document.documentType}`;

    try {
      setParticipantDocumentStatus((current) => ({
        ...current,
        [statusKey]: { type: "info", message: "Deleting..." },
      }));
      await deleteUserDocument(document.id);
      setParticipantDocuments((current) => current.filter((item) => item.id !== document.id));
      setParticipantDocumentStatus((current) => ({
        ...current,
        [statusKey]: { type: "success", message: "Deleted." },
      }));
      setConfirmingParticipantDocumentDeleteId("");
    } catch (error) {
      console.error("Unable to delete participant document", error);
      setParticipantDocumentStatus((current) => ({
        ...current,
        [statusKey]: { type: "error", message: error.message || "Delete failed." },
      }));
      setConfirmingParticipantDocumentDeleteId("");
    }
  }

  function handleJumpToOverviewItem(item) {
    if (!item?.destinationTab || !item?.destinationId) return;

    if (item.destinationTab === "Staff Tasks") {
      handleJumpToStaffTask(item.destinationId);
      return;
    }

    if (item.destinationTab === "Tasks") {
      setPendingWorkerTaskJumpId(item.destinationId);
      setTab("Tasks");
      return;
    }

    if (item.destinationTab === "Trip Documents") {
      setTab("Trip Documents");
      return;
    }

    if (item.destinationTab === "Training") {
      setPendingTrainingModuleJumpId(item.destinationId);
      setTab("Training");
    }
  }

  function setStaffTaskRowFeedback(taskId, type, message) {
    if (!taskId) return;

    const existingTimeout = staffTaskRowTimeoutsRef.current[taskId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete staffTaskRowTimeoutsRef.current[taskId];
    }

    setStaffTaskRowStatus((current) => ({
      ...current,
      [taskId]: { type, message },
    }));

    if (type === "success") {
      staffTaskRowTimeoutsRef.current[taskId] = setTimeout(() => {
        setStaffTaskRowStatus((current) => {
          const next = { ...current };
          delete next[taskId];
          return next;
        });
        delete staffTaskRowTimeoutsRef.current[taskId];
      }, 1800);
    }
  }

  function updateStaffTask(taskId, field, value) {
    const nextTasks = setLocalStaffTaskField(taskId, field, value);
    console.log("[tripPage] updateStaffTask", {
      tripId: trip?.id,
      taskId,
      field,
      value,
      matchedTask: nextTasks.find((task) => task.id === taskId) || null,
    });
    setStaffTaskRowFeedback(taskId, "info", "Saving...");
    void saveStaffTasks(nextTasks)
      .then(() => {
        setStaffTaskRowFeedback(taskId, "success", "Saved");
        setStaffTaskStatus("");
      })
      .catch((error) => {
        const errMsg = error.message || "Could not save task changes.";
        setStaffTaskRowFeedback(taskId, "error", "Could not save task changes.");
        setStaffTaskStatus(errMsg);
        showToast(errMsg, "error");
      });
  }

  function setLocalStaffTaskField(taskId, field, value) {
    const baseTasks = editableStaffTasksRef.current || [];
    const nextTasks = baseTasks.map((task) =>
      task.id === taskId ? { ...task, [field]: value } : task
    );

    setEditableStaffTasks(nextTasks);
    editableStaffTasksRef.current = nextTasks;
    return nextTasks;
  }

  function clearPendingStaffTaskNoteSave(taskId) {
    const existingTimeout = staffTaskNoteSaveTimeoutsRef.current[taskId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete staffTaskNoteSaveTimeoutsRef.current[taskId];
      return true;
    }

    return false;
  }

  function handleStaffTaskNotesChange(taskId, value) {
    setLocalStaffTaskField(taskId, "notes", value);
    setStaffTaskStatus("");
    clearPendingStaffTaskNoteSave(taskId);

    staffTaskNoteSaveTimeoutsRef.current[taskId] = setTimeout(() => {
      delete staffTaskNoteSaveTimeoutsRef.current[taskId];
      updateStaffTask(taskId, "notes", value);
    }, 700);
  }

  function flushStaffTaskNotesSave(taskId, value) {
    const hadPendingSave = clearPendingStaffTaskNoteSave(taskId);
    if (hadPendingSave) {
      updateStaffTask(taskId, "notes", value);
    }
  }

  function handleEditStaffTask(task) {
    editingStaffTaskIdRef.current = task.id;
    setEditingStaffTaskId(task.id);
    setStaffTaskTitleDraft(task.taskName || task.title || "");
    setStaffTaskDueDateDraft(
      task.dueDate || computeStaffTaskDueDate(task, trip) || ""
    );
  }

  function handleCancelStaffTaskEdit() {
    editingStaffTaskIdRef.current = null;
    setEditingStaffTaskId(null);
    setStaffTaskTitleDraft("");
    setStaffTaskDueDateDraft("");
  }

  async function handleAddStaffTask() {
    const trimmedTaskName = String(newStaffTaskDraft.taskName || "").trim();
    if (!trimmedTaskName) {
      setStaffTaskStatus("Task name is required.");
      return;
    }

    const dueSnap = newStaffTaskTripleRef.current?.getDueYmd?.();
    if (dueSnap === null) {
      const msg =
        "Finish choosing the due date (year, month, and day), or clear all date fields to add without one.";
      setStaffTaskStatus(msg);
      showToast(msg, "error");
      return;
    }

    const nextTask = {
      id: `${trip?.id || "trip"}-custom-${Date.now()}`,
      workArea: newStaffTaskDraft.workArea || "Project Formation",
      sequence:
        Math.max(
          0,
          ...(editableStaffTasksRef.current || [])
            .filter((task) => task.workArea === (newStaffTaskDraft.workArea || "Project Formation"))
            .map((task) => Number(task.sequence || 0))
        ) + 1,
      taskName: trimmedTaskName,
      assignedTo: newStaffTaskDraft.assignedTo || "",
      progress: "Not started",
      dueDate: dueSnap || "",
      notes: newStaffTaskDraft.notes || "",
    };

    try {
      setStaffTaskStatus("");
      await saveStaffTasks([...(editableStaffTasksRef.current || []), nextTask]);
      setIsAddingStaffTask(false);
      setNewStaffTaskDraft({
        workArea: newStaffTaskDraft.workArea || "Project Formation",
        taskName: "",
        assignedTo: "",
        dueDate: "",
        notes: "",
      });
      setStaffTaskStatus("Staff task added.");
    } catch (error) {
      console.error("Unable to add staff task", error);
      const errMsg = error.message || "Unable to add staff task.";
      setStaffTaskStatus(errMsg);
      showToast(errMsg, "error");
    }
  }

  function handleJumpToStaffTask(taskId) {
    if (!taskId) return;
    setPendingStaffTaskJumpId(taskId);
    setTab("Staff Tasks");
  }

  async function handleSaveStaffTaskRow(taskId) {
    const baseTasks = editableStaffTasksRef.current || [];
    const title = staffTaskTitleDraft.trim() || "Untitled task";
    const snap = staffDueTripleRef.current?.getDueYmd?.();
    if (snap === null) {
      showToast(
        "Finish choosing the due date (year, month, and day), or clear all date fields to remove it.",
        "error"
      );
      return;
    }
    const due = snap;
    const nextTasks = baseTasks.map((task) =>
      task.id === taskId ? { ...task, taskName: title, dueDate: due } : task
    );
    try {
      await saveStaffTasks(nextTasks);
      handleCancelStaffTaskEdit();
    } catch {
      /* saveStaffTasks already surfaced error; keep edit mode */
    }
  }

  function getStaffTaskAreaLabel(area) {
    return STAFF_TASK_AREA_LABELS[area] || area || "Other";
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
        return "badgeDanger";
    }
  }

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

  function getFundraisingProgressMeta(participant) {
    const hasUrl = !!participant?.fundraisingUrl;
    const personalGoalRaw = participant?.fundraisingGoalAmount;
    const personalGoal =
      personalGoalRaw != null &&
      personalGoalRaw !== "" &&
      Number.isFinite(Number(personalGoalRaw)) &&
      Number(personalGoalRaw) > 0
        ? Number(personalGoalRaw)
        : null;
    const tripDefaultRaw = trip?.fundraisingGoalAmount;
    const tripDefault =
      tripDefaultRaw != null &&
      tripDefaultRaw !== "" &&
      Number.isFinite(Number(tripDefaultRaw)) &&
      Number(tripDefaultRaw) > 0
        ? Number(tripDefaultRaw)
        : null;

    const goalLine =
      personalGoal != null
        ? `Individual goal: ${formatMoney(personalGoal)}`
        : tripDefault != null
          ? `No per-person override — trip default ${formatMoney(tripDefault)}`
          : "No individual or trip goal amount on file";

    if (hasUrl) {
      return {
        label: "Worker Progress: Ready",
        badgeClass: "badgeSuccess",
        helperText: "Personal Neon fundraising page saved.",
        goalLine,
      };
    }

    return {
      label: "Worker Progress: Missing",
      badgeClass: "badgeWarn",
      helperText: "No personal Neon link added yet.",
      goalLine,
    };
  }

function parseDateSafe(dateStr) {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  function toDateInputValue(dateStr) {
    if (!dateStr) return "";
    const s = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const date = parseDateSafe(s);
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatShortDate(dateStr) {
    const date = parseDateSafe(dateStr);
    if (!date) return "-";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  }

  function groupTasksByWorkArea(tasks) {
    const groups = {};

    (tasks || []).forEach((task) => {
      const area = getStaffTaskAreaLabel(task.workArea);

      if (!groups[area]) {
        groups[area] = [];
      }

      groups[area].push(task);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const ra = getStaffTaskAreaSortRank(groups[a][0]?.workArea);
      const rb = getStaffTaskAreaSortRank(groups[b][0]?.workArea);
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b);
    });

    const ordered = {};
    sortedKeys.forEach((k) => {
      ordered[k] = sortStaffTasksByTemplate(groups[k]);
    });
    return ordered;
  }

  function getWorkerTaskSection(task) {
    const category = String(task?.category || "").trim();
    if (category && category !== "worker_default") {
      return category;
    }

    const title = String(task?.title || "").toLowerCase();

    if (
      title.includes("$2,000 raised") ||
      title.includes("all raised") ||
      title.includes("fundraising goal") ||
      title.includes("fundraising funds") ||
      title.includes("donor")
    ) {
      return "Fundraising";
    }
    if (
      title.includes("passport") ||
      title.includes("visa") ||
      title.includes("ticket") ||
      title.includes("step") ||
      title.includes("travel form") ||
      title.includes("waiver")
    ) {
      return "Travel";
    }
    if (title.includes("training")) return "Training";

    return "General";
  }

  function groupWorkerTasks(tasks) {
    const groups = new Map();

    (tasks || []).forEach((task) => {
      const section = getWorkerTaskSection(task);
      const existing = groups.get(section) || [];
      existing.push(task);
      groups.set(section, existing);
    });

    const sectionOrder = ["General", "Fundraising", "Training", "Travel", "Uploads"];

    return Array.from(groups.entries()).sort((left, right) => {
      const leftIndex = sectionOrder.indexOf(left[0]);
      const rightIndex = sectionOrder.indexOf(right[0]);

      return (
        (leftIndex === -1 ? sectionOrder.length : leftIndex) -
        (rightIndex === -1 ? sectionOrder.length : rightIndex)
      );
    });
  }

  function getSettledValue(result, fallback, label) {
    if (result.status === "fulfilled") {
      return result.value;
    }

    console.error(`Unable to load ${label}`, result.reason);
    return fallback;
  }

  function formatNoteTimestamp(value) {
    if (!value) return "";

    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatRecentActivityTimestamp(value) {
    if (!value) return "";

    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatMeetingDateTime(value) {
    if (!value) return "Date and time unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date and time unavailable";
    return date.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }

  function formatSingleDate(value) {
    if (!value) return "Not set";

    return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTripDateRange(startDate, endDate) {
    if (!startDate && !endDate) return "Dates to be confirmed";

    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T00:00:00`);
      const sameMonth =
        start.toLocaleString("en-US", { month: "long" }) ===
          end.toLocaleString("en-US", { month: "long" }) &&
        start.getFullYear() === end.getFullYear();

      if (sameMonth) {
        return `${start.toLocaleString("en-US", { month: "long" })} ${start.getDate()}-${end.getDate()}, ${end.getFullYear()}`;
      }

      return `${start.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })} - ${end.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`;
    }

    return formatSingleDate(startDate || endDate);
  }

  function getCountdownSummary(startDate) {
    if (!startDate) {
      return {
        label: "Dates to be confirmed",
        detail: "Trip start date has not been set yet.",
      };
    }

    const tripStart = new Date(`${startDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      return {
        label: `${diffDays} days until takeoff`,
        detail: `Trip starts ${formatSingleDate(startDate)}.`,
      };
    }

    if (diffDays === 1) {
      return {
        label: "1 day until takeoff",
        detail: `Trip starts ${formatSingleDate(startDate)}.`,
      };
    }

    if (diffDays === 0) {
      return {
        label: "Trip starts today",
        detail: `Today is ${formatSingleDate(startDate)}.`,
      };
    }

    return {
      label: "Trip is underway or complete",
      detail: `Trip started ${formatSingleDate(startDate)}.`,
    };
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  function formatOptionalMoney(value) {
    return value === null || value === undefined || value === "" ? "Not set" : formatMoney(value);
  }

  function subtractDays(dateValue, days) {
    if (!dateValue) return null;
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    date.setDate(date.getDate() - days);
    return date;
  }

  function formatDeadlineDate(date) {
    if (!date) return "Date unavailable";
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getWeeksInCountry(startDate, endDate) {
    if (!startDate || !endDate) return "";

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

    const days = Math.max(
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      1
    );
    const weeks = days / 7;

    if (weeks >= 1) {
      const roundedWeeks = Math.round(weeks);
      return `${roundedWeeks} week${roundedWeeks === 1 ? "" : "s"}`;
    }

    return `${days} day${days === 1 ? "" : "s"}`;
  }

  function formatTaskUpdatedAt(value) {
    if (!value) return "";

    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  async function handleSaveOverviewNote() {
    if (!trip?.id) return;
    const trimmedNote = String(overviewNoteDraft || "").trim();

    if (!trimmedNote) {
      setOverviewNoteStatus("Note cannot be empty.");
      return;
    }

    try {
      setOverviewNoteStatus("Saving...");
      const saved = await saveTripOverviewNote({
        id: editingOverviewNoteId || null,
        tripId: trip.id,
        note: trimmedNote,
        authorName:
          session?.name ||
          String(session?.email || "")
            .split("@")[0]
            .trim() ||
          "Unknown user",
        authorEmail: session?.email || "",
      });
      setOverviewNotes((current) => {
        const existingIndex = current.findIndex((note) => note.id === saved.id);
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = saved;
          return next.sort((left, right) =>
            String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""))
          );
        }

        return [saved, ...current].sort((left, right) =>
          String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""))
        );
      });
      setOverviewNoteDraft(saved.note || "");
      setEditingOverviewNoteId("");
      setIsEditingOverviewNote(false);
      setOverviewNoteStatus("Saved.");
    } catch (error) {
      console.error("Unable to save trip overview note", error);
      setOverviewNoteStatus(error.message || "Unable to save note.");
    }
  }

  async function handleDeleteOverviewNote() {
    if (!editingOverviewNoteId) return;

    const existingNote = overviewNotes.find((note) => note.id === editingOverviewNoteId);
    const notePreview = String(existingNote?.note || "")
      .trim()
      .slice(0, 120);
    const confirmMessage = notePreview
      ? `Delete this note?\n\n"${notePreview}${notePreview.length >= 120 ? "..." : ""}"`
      : "Delete this note?";

    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) {
      return;
    }

    try {
      setOverviewNoteStatus("Deleting...");
      await deleteTripOverviewNote(editingOverviewNoteId);
      setOverviewNotes((current) => current.filter((note) => note.id !== editingOverviewNoteId));
      setEditingOverviewNoteId("");
      setOverviewNoteDraft("");
      setIsEditingOverviewNote(false);
      setOverviewNoteStatus("Deleted.");
    } catch (error) {
      console.error("Unable to delete trip overview note", error);
      setOverviewNoteStatus(error.message || "Unable to delete note.");
    }
  }

  function handleStartOverviewNote(note = null) {
    setEditingOverviewNoteId(note?.id || "");
    setOverviewNoteDraft(note?.note || "");
    setIsEditingOverviewNote(true);
    setOverviewNoteStatus("");
  }

  function handleCancelOverviewNoteEdit() {
    setEditingOverviewNoteId("");
    setOverviewNoteDraft("");
    setIsEditingOverviewNote(false);
    setOverviewNoteStatus("");
  }

  async function handleSaveTripMeeting() {
    if (!trip?.id || !meetingDraft.scheduledAt) {
      setMeetingStatus("Pick a date and time for the meeting.");
      return;
    }
    try {
      setMeetingStatus("Saving...");
      const saved = await saveTripMeeting({
        id: editingMeetingId || undefined,
        tripId: trip.id,
        title: meetingDraft.title,
        scheduledAt: new Date(meetingDraft.scheduledAt).toISOString(),
        notesAfter: meetingDraft.notesAfter,
      });
      setTripMeetings((prev) => {
        const without = prev.filter((m) => m.id !== saved.id);
        return [...without, saved].sort(
          (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        );
      });
      setMeetingDraft({ title: "", scheduledAt: "", notesAfter: "" });
      setEditingMeetingId("");
      setMeetingAddFormOpen(false);
      setMeetingStatus("Saved.");
    } catch (error) {
      console.error("Unable to save meeting", error);
      setMeetingStatus(error.message || "Unable to save meeting.");
    }
  }

  async function handleSaveAnnouncement() {
    if (!trip?.id) return;

    const trimmedMessage = String(announcementDraft || "").trim();
    if (!trimmedMessage) {
      setAnnouncementStatus("Announcement cannot be empty.");
      return;
    }

    try {
      setAnnouncementStatus("Saving...");
      const saved = await saveTripAnnouncement({
        id: editingAnnouncementId || null,
        tripId: trip.id,
        message: trimmedMessage,
        authorName: session?.name || session?.email || "Staff",
        authorEmail: session?.email || "",
      });

      setAnnouncements((current) => {
        const existingIndex = current.findIndex((item) => item.id === saved.id);
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = saved;
          return next.sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")));
        }

        return [saved, ...current].sort((left, right) =>
          String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""))
        );
      });
      setAnnouncementDraft(saved.message || "");
      setEditingAnnouncementId("");
      setIsEditingAnnouncement(false);
      setAnnouncementStatus("Saved.");
      const activityEntry = await logTripActivity({
        tripId: trip.id,
        actorUserId: session?.profileId || session?.id || "",
        actorName: session?.name || session?.email || "Staff",
        actorEmail: session?.email || "",
        eventType: editingAnnouncementId ? "announcement_updated" : "announcement_created",
        message: editingAnnouncementId
          ? "Staff updated announcement"
          : "Staff posted new announcement",
      });
      pushRecentActivity(activityEntry);
    } catch (error) {
      console.error("Unable to save trip announcement", error);
      setAnnouncementStatus(error.message || "Unable to save announcement.");
    }
  }

  async function handleDeleteAnnouncement() {
    if (!editingAnnouncementId) return;

    if (typeof window !== "undefined" && !window.confirm("Delete this announcement?")) {
      return;
    }

    try {
      setAnnouncementStatus("Deleting...");
      await deleteTripAnnouncement(editingAnnouncementId);
      setAnnouncements((current) => current.filter((item) => item.id !== editingAnnouncementId));
      setEditingAnnouncementId("");
      setAnnouncementDraft("");
      setIsEditingAnnouncement(false);
      setAnnouncementStatus("Deleted.");
    } catch (error) {
      console.error("Unable to delete trip announcement", error);
      setAnnouncementStatus(error.message || "Unable to delete announcement.");
    }
  }

  function handleStartAnnouncement(announcement = null) {
    setEditingAnnouncementId(announcement?.id || "");
    setAnnouncementDraft(announcement?.message || "");
    setIsEditingAnnouncement(true);
    setAnnouncementStatus("");
  }

  function handleCancelAnnouncementEdit() {
    setEditingAnnouncementId("");
    setAnnouncementDraft("");
    setIsEditingAnnouncement(false);
    setAnnouncementStatus("");
  }

  function updateTripSetupDraft(field, value) {
    setTripSetupDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleStartTripSetupEdit() {
    let draft = buildTripSetupDraft(trip);
    const loc = String(draft.location || "").trim();
    if (loc) {
      const canon = resolveCanonicalSiteLabelForTrip(loc, siteBudgetNotesList);
      if (canon && SITE_OPTIONS.includes(canon) && canon !== loc) {
        draft = { ...draft, location: canon };
      }
    }
    setTripSetupDraft(draft);
    setIsCustomSiteInput(false);
    setIsConfirmingTripDelete(false);
    setTripSetupStatus("");
    setIsEditingTripSetup(true);
  }

  function handleCancelTripSetupEdit() {
    setTripSetupDraft(buildTripSetupDraft(trip));
    setIsCustomSiteInput(false);
    setIsConfirmingTripDelete(false);
    setTripSetupStatus("");
    setIsEditingTripSetup(false);
  }

  async function handleSaveTripSetup() {
    if (!trip?.id) return;

    if (!String(tripSetupDraft.name || "").trim()) {
      setTripSetupStatus("Team name is required.");
      return;
    }

    if (!String(tripSetupDraft.location || "").trim()) {
      setTripSetupStatus("Site is required.");
      return;
    }

    try {
      setTripSetupStatus("Saving...");
      const savedTrip = await updateTripForCurrentUser({
        tripId: trip.id,
        ...tripSetupDraft,
      });

      setTrip((current) =>
        current
          ? {
              ...current,
              ...savedTrip,
              participants: current.participants || [],
              teamMembers: current.teamMembers || [],
              tasks: savedTrip.tasks || current.tasks || [],
              quickLinks: current.quickLinks || [],
              docs: current.docs || [],
              staffTasks: current.staffTasks || [],
            }
          : current
      );
      setTripSetupDraft(buildTripSetupDraft(savedTrip));
      setIsEditingTripSetup(false);
      setIsCustomSiteInput(false);
      setIsConfirmingTripDelete(false);
      setTripSetupStatus("Saved.");
    } catch (error) {
      console.error("Unable to save trip details", error);
      const errMsg = error.message || "Unable to save trip details.";
      setTripSetupStatus(errMsg);
      showToast(errMsg, "error");
    }
  }

  function openDeleteTripConfirm() {
    if (!trip?.id || !canManageTrips) return;
    setIsConfirmingTripDelete(true);
  }

  async function handleConfirmDeleteTrip() {
    if (!trip?.id || !canManageTrips) return;
    try {
      setTripSetupStatus("Deleting trip...");
      await deleteTrip(trip.id);
      setIsConfirmingTripDelete(false);
      setTripSetupStatus("");
      await router.push("/trips");
    } catch (error) {
      console.error("Unable to delete trip", error);
      const msg = error.message || "Unable to delete trip.";
      setTripSetupStatus(msg);
      showToast(msg, "error");
    }
  }

  function updateRosterDraftMember(index, field, value) {
    setRosterDraft((current) =>
      current.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member
      )
    );
  }

  function handleStartRosterEdit() {
    setRosterDraft(
      teamTabMembers.length > 0
        ? teamTabMembers.map((member) => ({
            id: member.id || "",
            assignmentId: member.assignmentId || "",
            profileId: member.profileId || "",
            connected: !!member.connected,
            firstName: member.firstName || "",
            lastName: member.lastName || "",
            email: member.email || "",
            teamRole: normalizeLegacyTeamRole(member.teamRole || member.role || "Worker"),
            travelsWithTeam: member.travelsWithTeam !== false,
            tshirtSize: member.tshirtSize || "",
            startDate: member.startDate || "",
            endDate: member.endDate || "",
          }))
        : [createEmptyRosterMember()]
    );
    setRosterStatus("");
    setWorkerAddStatus("");
    setIsAddingWorker(false);
    setIsEditingRoster(true);
  }

  function handleCancelRosterEdit() {
    setRosterDraft(trip?.teamMembers || []);
    setRosterStatus("");
    setIsEditingRoster(false);
  }

  function handleStartAddWorker() {
    setIsEditingRoster(false);
    setRosterStatus("");
    setNewWorkerDraft(createEmptyWorkerDraft());
    setWorkerAddStatus("");
    setIsAddingWorker(true);
  }

  function handleCancelAddWorker() {
    setNewWorkerDraft(createEmptyWorkerDraft());
    setWorkerAddStatus("");
    setIsAddingWorker(false);
  }

  function updateNewWorkerDraft(field, value) {
    setNewWorkerDraft((current) => ({ ...current, [field]: value }));
  }

  async function sendWorkerInvite(email) {
    const normalizedWorkerEmail = normalizeEmail(email);
    if (!normalizedWorkerEmail) {
      setWorkerAddStatus("Add an email before sending an invite.");
      return false;
    }

    try {
      setInvitingWorkerEmail(normalizedWorkerEmail);
      const response = await fetch("/api/trip-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientEmail: normalizedWorkerEmail,
          recipientName: trip?.teamMembers?.find(
            (member) => normalizeEmail(member.email) === normalizedWorkerEmail
          )?.name || "",
          senderEmail: session?.email || "",
          senderName: session?.name || session?.email || "LST staff",
          tripId: trip?.id || "",
          tripName: trip?.name || "",
          tripLocation: trip?.location || "",
          tripDates: trip?.dates || "",
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const { subject, body } = buildWorkerInvitePayload(normalizedWorkerEmail, trip);

        if (typeof window !== "undefined") {
          const mailtoUrl = `mailto:${encodeURIComponent(normalizedWorkerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          window.location.href = mailtoUrl;
        }

        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(`${subject}\n\n${body}`);
        }

        setWorkerAddStatus(
          result?.error
            ? `${result.error} Opened a draft invite instead.`
            : "Trip invite email is not configured yet. Opened a draft invite instead."
        );
        return true;
      }

      return true;
    } catch (error) {
      console.error("Unable to prepare worker invite", error);
      setWorkerAddStatus("Invite could not be sent.");
      return false;
    } finally {
      setInvitingWorkerEmail("");
    }
  }

  function resolveRosterMemberIdForTshirt(member) {
    if (!member) return "";
    if (member.id) return String(member.id);
    const rowEmail = normalizeEmail(member.email);
    if (!rowEmail) return "";
    const rosterRow = (trip?.teamMembers || []).find(
      (m) => m?.id && normalizeEmail(m.email) === rowEmail
    );
    return rosterRow?.id ? String(rosterRow.id) : "";
  }

  function canEditRosterTshirtInline(member) {
    if (staffViewAllParticipants) return true;
    if (canViewTeamDashboard && effectiveIsLeader) return true;
    const rowEmail = normalizeEmail(member.email);
    const sessionEmail = normalizeEmail(session?.email || "");
    if (!rowEmail || !sessionEmail || rowEmail !== sessionEmail) return false;
    return Boolean(resolveRosterMemberIdForTshirt(member));
  }

  async function handleInlineRosterTshirtChange(member, nextSize) {
    const memberId = resolveRosterMemberIdForTshirt(member);
    if (!trip?.id || !memberId || !canEditRosterTshirtInline(member)) return;

    setInlineTshirtSavingKey(member.key);
    setRosterStatus("");
    try {
      const updated = await updateTripTeamMemberTshirtSize({
        tripId: trip.id,
        memberId,
        tshirtSize: nextSize,
      });
      setTrip((current) => {
        if (!current) return current;
        const nextTeam = (current.teamMembers || []).map((m) =>
          String(m.id) === String(memberId) ? { ...m, tshirtSize: updated.tshirtSize } : m
        );
        return { ...current, teamMembers: nextTeam };
      });
      if (isEditingRoster) {
        setRosterDraft((draft) =>
          draft.map((row) =>
            String(row.id) === String(memberId) ? { ...row, tshirtSize: updated.tshirtSize } : row
          )
        );
      }
      showToast("T-shirt size saved.");
    } catch (error) {
      console.error("Unable to save T-shirt size", error);
      const msg = error?.message || "Could not save T-shirt size.";
      setRosterStatus(msg);
      showToast(msg, "error");
    } finally {
      setInlineTshirtSavingKey("");
    }
  }

  function handleAddRosterMember() {
    setRosterDraft((current) => [...current, createEmptyRosterMember()]);
  }

  function handleRemoveRosterMember(index) {
    setRosterDraft((current) => current.filter((_, memberIndex) => memberIndex !== index));
  }

  async function handleSaveRoster() {
    if (!trip?.id) return;

    try {
      setRosterStatus("Saving...");
      const removedAssignmentIds = teamTabMembers
        .filter(
          (member) =>
            member.assignmentId &&
            !rosterDraft.some(
              (draftMember) =>
                String(draftMember.assignmentId || "") === String(member.assignmentId || "")
            )
        )
        .map((member) => member.assignmentId);
      const normalizedDraft = rosterDraft.map((m) => ({
        ...m,
        teamRole: normalizeLegacyTeamRole(m.teamRole),
      }));
      const savedMembers = await saveTripTeamMembers(trip.id, normalizedDraft);

      try {
        await pruneTripTicketsForNonTravelingLeaders();
      } catch (pruneErr) {
        console.warn("pruneTripTicketsForNonTravelingLeaders", pruneErr);
      }

      if (removedAssignmentIds.length > 0) {
        await Promise.all(removedAssignmentIds.map((assignmentId) => removeTripAssignment(assignmentId)));
      }

      setTrip((current) =>
        current
          ? {
              ...current,
              teamMembers: savedMembers,
              participants: (current.participants || []).filter(
                (participant) => !removedAssignmentIds.includes(participant.assignmentId)
              ),
            }
          : current
      );
      setRosterDraft(savedMembers);
      setIsEditingRoster(false);
      setRosterStatus("Saved.");
    } catch (error) {
      console.error("Unable to save team roster", error);
      setRosterStatus(error.message || "Unable to save team roster.");
    }
  }

  async function handleAddWorkerToTrip() {
    if (!trip?.id) return;

    const firstName = String(newWorkerDraft.firstName || "").trim();
    const lastName = String(newWorkerDraft.lastName || "").trim();
    const email = normalizeEmail(newWorkerDraft.email);

    if (!firstName || !lastName || !email) {
      setWorkerAddStatus("Enter first name, last name, and email.");
      return;
    }

    const existingRosterMember = (trip.teamMembers || []).find(
      (member) => normalizeEmail(member.email) === email
    );
    const existingAssignedWorker = (trip.participants || []).find(
      (participant) => normalizeEmail(participant.email) === email
    );

    if (existingRosterMember || existingAssignedWorker) {
      setWorkerAddStatus("That worker is already on this trip.");
      return;
    }

    try {
      setWorkerAddStatus("Adding...");
      const role = normalizeLegacyTeamRole(newWorkerDraft.teamRole || "Worker");
      const travelsWithTeam =
        String(role).trim().toLowerCase() === "leader"
          ? newWorkerDraft.travelsWithTeam !== false
          : true;
      const nextRosterMembers = await saveTripTeamMembers(trip.id, [
        ...(trip.teamMembers || []),
        {
          firstName,
          lastName,
          email,
          teamRole: role,
          travelsWithTeam,
          tshirtSize: "",
          startDate: "",
          endDate: "",
        },
      ]);

      let nextParticipants = trip.participants || [];
      let statusMessage = "Worker added as unassigned.";

      if (newWorkerDraft.assignmentMode === "assigned") {
        const result = await assignWorkerByEmailToTrip({
          workerEmail: email,
          tripId: trip.id,
        });

        if (result.status === "assigned" || result.status === "duplicate") {
          nextParticipants = await listTripParticipants(trip.id);
          statusMessage = "Worker added and assigned to this trip.";
        } else {
          statusMessage = result.message || "Worker saved as unassigned.";
        }
      }

      setTrip((current) => (current
        ? {
            ...current,
            teamMembers: nextRosterMembers,
            participants: nextParticipants,
          }
        : current));
      setWorkerAddStatus(statusMessage);
      setNewWorkerDraft(createEmptyWorkerDraft());
      setIsAddingWorker(false);
    } catch (error) {
      console.error("Unable to add worker to trip", error);
      setWorkerAddStatus(error.message || "Unable to add worker.");
    }
  }

  async function handleInviteWorker(member) {
    const email = normalizeEmail(member?.email);
    const inviteWasSent = await sendWorkerInvite(email);
    if (inviteWasSent) {
      setWorkerAddStatus(`Invite sent for ${email}.`);
    }
  }

  function renderTripSetupCard() {
    return (
      <div
        id="trip-setup"
        className="card pad"
        style={{ gridColumn: "1 / -1", paddingTop: 14 }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            columnGap: 16,
            rowGap: 8,
            marginBottom: 10,
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 200px" }}>
            <div className="cardSectionPill" style={{ marginBottom: 4 }}>Trip setup</div>
            <div className="small" style={{ opacity: 0.88, lineHeight: 1.35 }}>
              Site, dates, and configuration.
            </div>
          </div>
          <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", flexShrink: 0, marginTop: 2 }}>
            {tripSetupStatus ? (
              <div className="row" style={{ alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span
                  className="small"
                  style={
                    tripSetupStatus !== "Saving..." &&
                    tripSetupStatus !== "Saved." &&
                    tripSetupStatus !== "Deleting trip..."
                      ? { color: "var(--danger)" }
                      : {}
                  }
                >
                  {tripSetupStatus}
                </span>
                {tripSetupStatus !== "Saving..." &&
                tripSetupStatus !== "Saved." &&
                tripSetupStatus !== "Deleting trip..." &&
                isEditingTripSetup ? (
                  <button type="button" className="btn btnPrimary" onClick={() => handleSaveTripSetup()}>
                    Try again
                  </button>
                ) : null}
              </div>
            ) : null}
            {staffViewAllParticipants && !isEditingTripSetup ? (
              <button className="btn" type="button" onClick={handleStartTripSetupEdit}>
                Edit Details
              </button>
            ) : null}
          </div>
        </div>
        <div
          className={`tripSetupColumns${staffViewAllParticipants ? "" : " tripSetupColumnsSingle"}`}
        >
          <div className="tripSetupSection tripSetupSectionTrip">
            <div className="tripSetupSectionHeader">Trip Details</div>
            {isEditingTripSetup ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Team Name</div>
                  <input
                    className="input"
                    value={tripSetupDraft.name}
                    onChange={(event) => updateTripSetupDraft("name", event.target.value)}
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Site</div>
                  <select
                    className="input"
                    value={selectedSiteValue}
                    onChange={(event) => {
                      if (event.target.value === CUSTOM_SITE_OPTION) {
                        setIsCustomSiteInput(true);
                        updateTripSetupDraft(
                          "location",
                          siteOptions.includes(tripSetupDraft.location) ? "" : tripSetupDraft.location
                        );
                        return;
                      }

                      setIsCustomSiteInput(false);
                      updateTripSetupDraft("location", event.target.value);
                    }}
                  >
                    <option value="">Select site</option>
                    {siteOptions.map((site) => {
                      const row = findSiteBudgetNoteForOption(site, siteBudgetNotesList);
                      const mark =
                        canManageTrips && staffViewAllParticipants && row?.notes?.trim()
                          ? " !"
                          : "";
                      return (
                        <option key={site} value={site}>
                          {site}
                          {mark}
                        </option>
                      );
                    })}
                    <option value={CUSTOM_SITE_OPTION}>Other site</option>
                  </select>
                  {selectedSiteValue === CUSTOM_SITE_OPTION ? (
                    <input
                      className="input"
                      style={{ marginTop: 10 }}
                      value={tripSetupDraft.location}
                      onChange={(event) => updateTripSetupDraft("location", event.target.value)}
                      placeholder="Enter site"
                    />
                  ) : null}
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Project Leave Date</div>
                  <input
                    className="input"
                    type="date"
                    value={tripSetupDraft.startDate}
                    onChange={(event) => updateTripSetupDraft("startDate", event.target.value)}
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Project Return Date</div>
                  <input
                    className="input"
                    type="date"
                    value={tripSetupDraft.endDate}
                    onChange={(event) => updateTripSetupDraft("endDate", event.target.value)}
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Length of Projects</div>
                  <input
                    className="input"
                    value={tripSetupDraft.projectLengthSummary}
                    onChange={(event) => updateTripSetupDraft("projectLengthSummary", event.target.value)}
                    placeholder="6 weeks, with a 3-week subgroup"
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Team Status</div>
                  <select
                    className="input"
                    value={tripSetupDraft.teamStatus}
                    onChange={(event) => updateTripSetupDraft("teamStatus", event.target.value)}
                  >
                    <option value="">Select team status</option>
                    {TEAM_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Training Timeline</div>
                  <select
                    className="input"
                    value={tripSetupDraft.trainingTimelineType}
                    onChange={(event) =>
                      updateTripSetupDraft("trainingTimelineType", event.target.value)
                    }
                  >
                    {TRAINING_TIMELINE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : staffViewAllParticipants ? (
              <>
                <div className="small">Team Name</div>
                <div style={{ fontWeight: 800 }}>{trip.name}</div>
                <div style={{ height: 12 }} />
                <div className="small">Site</div>
                <div
                  className="row"
                  style={{ fontWeight: 800, alignItems: "center", gap: 6, flexWrap: "wrap" }}
                >
                  <span>{tripSiteCanonicalLabel || "Not set"}</span>
                </div>
                <div style={{ height: 12 }} />
                <div className="small">Project Leave Date</div>
                <div style={{ fontWeight: 800 }}>{formatSingleDate(trip.startDate)}</div>
                <div style={{ height: 12 }} />
                <div className="small">Project Return Date</div>
                <div style={{ fontWeight: 800 }}>{formatSingleDate(trip.endDate)}</div>
                <div style={{ height: 12 }} />
                <div className="small">Length of Projects</div>
                <div style={{ fontWeight: 800 }}>
                  {trip.projectLengthSummary ||
                    getWeeksInCountry(trip.startDate, trip.endDate) ||
                    "Dates to be confirmed"}
                </div>
                <div style={{ height: 12 }} />
                <div className="small">Team Status</div>
                <div style={{ fontWeight: 800 }}>{trip.teamStatus || "Not set"}</div>
                <div style={{ height: 12 }} />
                <div className="small">Training Timeline</div>
                <div style={{ fontWeight: 800 }}>
                  {trip.trainingTimelineType === "college"
                    ? "College Team (6+ months)"
                    : "Standard (3 months)"}
                </div>
              </>
            ) : (
              <div className="tripSetupInfoGrid">
                <div className="tripSetupInfoItem">
                  <div className="small">Site</div>
                  <div
                    className="row"
                    style={{ fontWeight: 800, alignItems: "center", gap: 6, flexWrap: "wrap" }}
                  >
                    <span>{tripSiteCanonicalLabel || "Not set"}</span>
                  </div>
                </div>
                <div className="tripSetupInfoItem">
                  <div className="small">Project Leave Date</div>
                  <div style={{ fontWeight: 800 }}>{formatSingleDate(trip.startDate)}</div>
                </div>
                <div className="tripSetupInfoItem">
                  <div className="small">Project Return Date</div>
                  <div style={{ fontWeight: 800 }}>{formatSingleDate(trip.endDate)}</div>
                </div>
                <div className="tripSetupInfoItem">
                  <div className="small">Length of Projects</div>
                  <div style={{ fontWeight: 800 }}>
                    {trip.projectLengthSummary ||
                      getWeeksInCountry(trip.startDate, trip.endDate) ||
                      "Dates to be confirmed"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {staffViewAllParticipants ? (
            <div className="tripSetupSection tripSetupSectionSite">
              <div className="tripSetupSectionHeader">Site Setup</div>
              {isEditingTripSetup ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Host Name</div>
                    <input
                      className="input"
                      value={tripSetupDraft.host}
                      onChange={(event) => updateTripSetupDraft("host", event.target.value)}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Site Type</div>
                    <select
                      className="input"
                      value={tripSetupDraft.siteType}
                      onChange={(event) => updateTripSetupDraft("siteType", event.target.value)}
                    >
                      <option value="">Select site type</option>
                      <option value="partner">Partner</option>
                      <option value="managed">Managed</option>
                      <option value="seasonal">Seasonal</option>
                    </select>
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Type of Project</div>
                    <select
                      className="input"
                      value={tripSetupDraft.projectType}
                      onChange={(event) => updateTripSetupDraft("projectType", event.target.value)}
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
                      value={tripSetupDraft.extraTravelStatus}
                      onChange={(event) => updateTripSetupDraft("extraTravelStatus", event.target.value)}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                      <option value="maybe">Maybe</option>
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="small">Host Name</div>
                  <div style={{ fontWeight: 800 }}>{trip.host || "Not set"}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Site Type</div>
                  <div style={{ fontWeight: 800 }}>
                    {trip.siteType
                      ? trip.siteType.charAt(0).toUpperCase() + trip.siteType.slice(1)
                      : "Not set"}
                  </div>
                  <div style={{ height: 12 }} />
                  <div className="small">Type of Project</div>
                  <div style={{ fontWeight: 800 }}>{trip.projectType || "Not set"}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Extra Travel</div>
                  <div style={{ fontWeight: 800 }}>
                    {trip.extraTravelStatus
                      ? trip.extraTravelStatus.charAt(0).toUpperCase() + trip.extraTravelStatus.slice(1)
                      : "No"}
                  </div>
                </>
              )}
            </div>
          ) : null}

          {staffViewAllParticipants ? (
            <div className="tripSetupSection tripSetupSectionFees">
              <div className="tripSetupSectionHeader">Fees</div>
              {isEditingTripSetup ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Fundraising Goal</div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.fundraisingGoalAmount}
                      onChange={(event) => updateTripSetupDraft("fundraisingGoalAmount", event.target.value)}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Fee</div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.tripFeeAmount}
                      onChange={(event) => updateTripSetupDraft("tripFeeAmount", event.target.value)}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Materials Fee</div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.materialsFeeAmount}
                      onChange={(event) => updateTripSetupDraft("materialsFeeAmount", event.target.value)}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Deferred Worker</div>
                    <select
                      className="input"
                      value={tripSetupDraft.hasDeferredWorker}
                      onChange={(event) => updateTripSetupDraft("hasDeferredWorker", event.target.value)}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Hannover Housing Fee</div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.hannoverHousingFeeAmount}
                      onChange={(event) => updateTripSetupDraft("hannoverHousingFeeAmount", event.target.value)}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Domestic Project</div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.domesticProjectFeeAmount}
                      onChange={(event) => updateTripSetupDraft("domesticProjectFeeAmount", event.target.value)}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Domestic Fee</div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.domesticFeeAmount}
                      onChange={(event) => updateTripSetupDraft("domesticFeeAmount", event.target.value)}
                    />
                  </div>
                  <div>
                    <div className="small" style={{ marginBottom: 6 }}>Domestic Materials Fee</div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={tripSetupDraft.domesticMaterialsFeeAmount}
                      onChange={(event) => updateTripSetupDraft("domesticMaterialsFeeAmount", event.target.value)}
                    />
                  </div>
                  <div className="row" style={{ marginTop: 4 }}>
                    <button className="btn btnPrimary" type="button" onClick={handleSaveTripSetup}>
                      Save Details
                    </button>
                    <button className="btn" type="button" onClick={handleCancelTripSetupEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="small">Fundraising Goal</div>
                  <div style={{ fontWeight: 800 }}>{formatOptionalMoney(trip.fundraisingGoalAmount)}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Fee</div>
                  <div style={{ fontWeight: 800 }}>{formatOptionalMoney(trip.tripFeeAmount)}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Materials Fee</div>
                  <div style={{ fontWeight: 800 }}>{formatOptionalMoney(trip.materialsFeeAmount)}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Deferred Worker</div>
                  <div style={{ fontWeight: 800 }}>{trip.hasDeferredWorker ? "Yes" : "No"}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Hannover Housing Fee</div>
                  <div style={{ fontWeight: 800 }}>{formatOptionalMoney(trip.hannoverHousingFeeAmount)}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Domestic Project</div>
                  <div style={{ fontWeight: 800 }}>{formatOptionalMoney(trip.domesticProjectFeeAmount)}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Domestic Fee</div>
                  <div style={{ fontWeight: 800 }}>{formatOptionalMoney(trip.domesticFeeAmount)}</div>
                  <div style={{ height: 12 }} />
                  <div className="small">Domestic Materials Fee</div>
                  <div style={{ fontWeight: 800 }}>{formatOptionalMoney(trip.domesticMaterialsFeeAmount)}</div>
                </>
              )}
            </div>
          ) : null}
        </div>
        {isEditingTripSetup && canManageTrips ? (
          <div
            style={{
              marginTop: 18,
              paddingTop: 18,
              borderTop: "1px solid rgba(239,68,68,.18)",
              display: "grid",
              gap: 10,
            }}
          >
            <div className="small" style={{ color: "var(--danger)" }}>
              Delete this trip if it should be removed entirely from the dashboard.
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btnDanger"
                type="button"
                onClick={openDeleteTripConfirm}
              >
                Delete Trip
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const groupedViewTasks = groupTasksByWorkArea(editableStaffTasks || []);
  const staffTaskWorkAreas = useMemo(() => {
    const templateOrder = listStaffTaskTemplateWorkAreas();
    const seen = new Set(templateOrder.map((a) => String(a).toLowerCase()));
    const extras = [
      ...new Set((editableStaffTasks || []).map((task) => task.workArea).filter(Boolean)),
    ].filter((a) => !seen.has(String(a).toLowerCase()));
    extras.sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: "base" }));
    return [...templateOrder, ...extras];
  }, [editableStaffTasks]);

  const workerTripTaskCategoryOptions = useMemo(() => {
    const canon = [...WORKER_TRIP_TASK_SECTION_OPTIONS];
    const seen = new Set(canon.map((c) => c.toLowerCase()));
    const extras = [];
    for (const task of trip?.tasks || []) {
      const cat = String(task?.category || "").trim();
      if (!cat || cat.toLowerCase() === "worker_default") continue;
      const k = cat.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        extras.push(cat);
      }
    }
    extras.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return [...canon, ...extras];
  }, [trip?.tasks]);

  const completedCount = (editableStaffTasks || []).filter(
    (t) => t.progress === "Complete"
  ).length;
  const totalCount = (editableStaffTasks || []).length;
  const completionPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const siteOptions = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const o of SITE_OPTIONS || []) {
      const s = String(o || "").trim();
      if (!s) continue;
      const k = s.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
    }
    const loc = String(trip?.location || "").trim();
    if (loc) {
      const canon = resolveCanonicalSiteLabelForTrip(loc, siteBudgetNotesList);
      const add = canon || loc;
      const k = add.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(add);
      }
    }
    return out;
  }, [trip?.location, siteBudgetNotesList]);

  const tripSiteCanonicalLabel = useMemo(
    () => resolveCanonicalSiteLabelForTrip(trip?.location || "", siteBudgetNotesList),
    [trip?.location, siteBudgetNotesList]
  );

  const tripSiteHasStaffHousingNote = useMemo(() => {
    if (!canManageTrips || !staffViewAllParticipants) return false;
    const note = resolveSiteBudgetNoteForTripLocation(trip?.location || "", siteBudgetNotesList);
    return Boolean(note?.notes?.trim());
  }, [trip?.location, siteBudgetNotesList, canManageTrips, staffViewAllParticipants]);
  const selectedSiteValue = isCustomSiteInput ? CUSTOM_SITE_OPTION : tripSetupDraft.location || "";
  const visibleDocs = useMemo(
    () =>
      canManageTripDocuments
        ? docs
        : (docs || []).filter((doc) => doc.visibleToParticipants !== false),
    [canManageTripDocuments, docs]
  );
  const requiredDocumentSlots = useMemo(() => {
    const budgetDoc = visibleDocs.find((d) => d.resourceKey === "smartsheet-budget");
    const journalDoc = visibleDocs.find((d) => d.resourceKey === "project-record-journal");
    const mergedBudgetResource =
      budgetDoc || journalDoc
        ? (() => {
            const base = budgetDoc || journalDoc;
            const linkPick = String(budgetDoc?.link || journalDoc?.link || "").trim();
            const pdfPick = String(budgetDoc?.pdfUrl || journalDoc?.pdfUrl || "").trim();
            const vis =
              budgetDoc && journalDoc
                ? budgetDoc.visibleToParticipants !== false &&
                  journalDoc.visibleToParticipants !== false
                : base.visibleToParticipants !== false;
            return {
              ...base,
              link: linkPick || base.link || "",
              pdfUrl: pdfPick || base.pdfUrl || "",
              visibleToParticipants: vis,
            };
          })()
        : null;

    return REQUIRED_TRIP_DOCUMENT_SLOTS.map((slot) => {
      if (slot.key === "smartsheet-budget") {
        return { ...slot, resource: mergedBudgetResource };
      }
      return {
        ...slot,
        resource: visibleDocs.find((doc) => doc.resourceKey === slot.key) || null,
      };
    });
  }, [visibleDocs]);

  const optionalTripWideCardProps = {
    editingDocId,
    docDraft,
    setDocDraft,
    canManageTripDocuments,
    handleEditDoc,
    requestDeleteTripDoc: handleRequestDeleteTripDocument,
    handleSaveDoc,
    handleCancelEditDoc,
    handleReplaceDocumentFile,
    compactTile: true,
  };

  const workerPreviewOptions = useMemo(() => {
    if (!trip) return [];
    const participantEmails = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );
    const options = (trip.participants || []).map((participant) => ({
      id: String(participant.id || ""),
      label: participant.name || participant.email || "Worker",
    }));
    for (const member of trip.teamMembers || []) {
      if (!member?.id) continue;
      const email = normalizeEmail(member.email);
      if (email && participantEmails.has(email)) continue;
      options.push({
        id: `${ROSTER_PREVIEW_PREFIX}${member.id}`,
        label: member.name || member.email || "Roster member",
      });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [trip]);

  const currentParticipant = useMemo(() => {
    if (!trip) return null;

    if (isPreviewingParticipant) {
      if (String(previewParticipantId).startsWith(ROSTER_PREVIEW_PREFIX)) {
        const rosterId = String(previewParticipantId).slice(ROSTER_PREVIEW_PREFIX.length);
        const rosterMember = (trip.teamMembers || []).find((m) => String(m.id) === String(rosterId));
        if (rosterMember) {
          return {
            id: `${ROSTER_PREVIEW_PREFIX}${rosterMember.id}`,
            tripTeamMemberId: rosterMember.id,
            name: rosterMember.name || rosterMember.email || "Roster member",
            email: rosterMember.email || "",
            firstName: rosterMember.firstName || "",
            lastName: rosterMember.lastName || "",
            rosterOnly: true,
            assignmentId: "",
          };
        }
      }
      if (String(previewParticipantId) === WORKER_PREVIEW_PARTICIPANT_ID) {
        return {
          id: WORKER_PREVIEW_PARTICIPANT_ID,
          name: "Worker preview",
          email: "",
          firstName: "",
          rosterOnly: false,
          assignmentId: "",
        };
      }
      return (
        trip.participants.find(
          (participant) => String(participant.id) === String(previewParticipantId)
        ) || null
      );
    }

    if (!session) return null;
    if (staffViewAllParticipants) return null;

    const sessionUserId = String(session.profileId || session.id || session.authUserId || "").trim();
    const sessionEmail = normalizeEmail(session.email);

    return (
      trip.participants.find((participant) => {
        if (sessionUserId && String(participant.id) === sessionUserId) return true;
        const pe = normalizeEmail(participant.email);
        return Boolean(pe && sessionEmail && pe === sessionEmail);
      }) || null
    );
  }, [trip, session, staffViewAllParticipants, isPreviewingParticipant, previewParticipantId]);

  const activeParticipantEmail =
    normalizeEmail(currentParticipant?.email) || normalizeEmail(session?.email) || "";
  const canUploadOwnParticipantDocuments =
    !staffViewAllParticipants &&
    !!currentParticipant &&
    !isPreviewingParticipant &&
    !isLeaderOnTripNotTraveling;
  const canEditTripReferenceEmails = staffViewAllParticipants;
  const canViewTripReferenceSection =
    !isPreviewingParticipant && (staffViewAllParticipants || effectiveIsLeader);
  const participantDocumentsByUserId = useMemo(() => {
    const grouped = new Map();

    (participantDocuments || []).forEach((document) => {
      const key = String(document.userId || "");
      if (!key) return;

      const existing = grouped.get(key) || {};
      existing[document.documentType] = document;
      grouped.set(key, existing);
    });

    return grouped;
  }, [participantDocuments]);
  const tripUserDocumentTypes = useMemo(
    () => getTripUserDocumentTypes(trip?.participantDocumentTypes || []),
    [trip?.participantDocumentTypes]
  );
  const tripTasks = useMemo(() => (Array.isArray(trip?.tasks) ? trip.tasks : []), [trip?.tasks]);

  const participantTaskProgress = useMemo(() => {
    if (!trip) return [];

    const base = (trip.participants || []).map((participant) => {
      const taskState = participantTaskStates[normalizeEmail(participant.email)] || {};
      const completed = tripTasks.filter((task) => !!taskState[task.id]).length;

      return {
        ...participant,
        taskState,
        completed,
        total: tripTasks.length,
        percent: percentComplete(tripTasks, taskState),
      };
    });

    if (!canViewTeamDashboard) {
      return base;
    }

    const participantEmails = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );
    const extras = (trip.teamMembers || [])
      .filter((m) => {
        const e = normalizeEmail(m.email);
        return e && !participantEmails.has(e);
      })
      .map((member) => {
        const taskState = participantTaskStates[normalizeEmail(member.email)] || {};
        const completed = tripTasks.filter((task) => !!taskState[task.id]).length;
        return {
          id: member.id ? `roster-member-${member.id}` : `roster-${normalizeEmail(member.email)}`,
          assignmentId: "",
          name: member.name || member.email || "Roster member",
          email: member.email || "",
          firstName: member.firstName || "",
          lastName: member.lastName || "",
          role: "",
          gender: "",
          fundraisingUrl: "",
          taskState,
          completed,
          total: tripTasks.length,
          percent: percentComplete(tripTasks, taskState),
          rosterOnly: true,
        };
      });

    const merged = [...base, ...extras];
    return merged.filter((p) => shouldIncludeInTripWorkerPipeline(trip, p.email));
  }, [trip, tripTasks, participantTaskStates, canViewTeamDashboard]);

  const currentParticipantProgress = useMemo(() => {
    if (!activeParticipantEmail) return null;

    return (
      participantTaskProgress.find(
        (participant) => normalizeEmail(participant.email) === activeParticipantEmail
      ) || null
    );
  }, [participantTaskProgress, activeParticipantEmail]);

  const teamTabMembers = useMemo(() => {
    if (!trip) return [];

    const membersByKey = new Map();

    (trip.teamMembers || []).forEach((member, index) => {
      const email = member.email || "";
      const key = normalizeEmail(email) || `roster-${member.id || member.name || index}`;

      membersByKey.set(key, {
        key,
        id: member.id || "",
        name: member.name || "Unnamed member",
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        role: member.teamRole || member.role || "",
        teamRole: member.teamRole || member.role || "Worker",
        travelsWithTeam: member.travelsWithTeam !== false,
        tshirtSize: String(member.tshirtSize || "").trim(),
        email,
        fundraisingUrl: "",
        startDate: member.startDate || trip.startDate || "",
        endDate: member.endDate || trip.endDate || "",
        connected: false,
      });
    });

    (trip.participants || []).forEach((participant, index) => {
      const email = participant.email || "";
      const key = normalizeEmail(email) || `participant-${participant.id || participant.name || index}`;
      const existing = membersByKey.get(key);
      const rosterMatch = (trip.teamMembers || []).find(
        (m) => normalizeEmail(m.email) === key
      );

      membersByKey.set(key, {
        key,
        id: rosterMatch?.id || existing?.id || "",
        name: participant.name || existing?.name || "Unnamed member",
        firstName: participant.firstName || existing?.firstName || "",
        lastName: participant.lastName || existing?.lastName || "",
        role: rosterMatch?.teamRole || existing?.role || participant.role || "",
        teamRole: rosterMatch?.teamRole || existing?.teamRole || participant.role || "Worker",
        travelsWithTeam: rosterMatch
          ? rosterMatch.travelsWithTeam !== false
          : existing
            ? existing.travelsWithTeam !== false
            : true,
        tshirtSize: String(rosterMatch?.tshirtSize || existing?.tshirtSize || "").trim(),
        email: participant.email || existing?.email || "",
        fundraisingUrl: participant.fundraisingUrl || existing?.fundraisingUrl || "",
        startDate: existing?.startDate || trip.startDate || "",
        endDate: existing?.endDate || trip.endDate || "",
        connected: true,
        assignmentId: participant.assignmentId || existing?.assignmentId || "",
        profileId: participant.id || existing?.profileId || "",
      });
    });

    return Array.from(membersByKey.values()).sort((left, right) => {
      if (left.connected !== right.connected) {
        return left.connected ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });
  }, [trip]);

  /** Materials tab: one line per roster row — first name and saved T-shirt size. */
  const materialsRosterTshirtLines = useMemo(() => {
    return teamTabMembers
      .filter((m) => shouldIncludeInTripWorkerPipeline(trip, m.email))
      .map((m) => {
      const firstRaw = String(m.firstName || "").trim();
      const first =
        firstRaw ||
        (String(m.name || "")
          .trim()
          .split(/\s+/)
          .filter(Boolean)[0] ||
          "Member");
      const sz = String(m.tshirtSize || "").trim();
      return `${first} - ${sz || "—"}`;
    });
  }, [teamTabMembers, trip]);

  const referenceTableRows = useMemo(() => {
    if (!trip) return [];
    const participantEmails = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );
    const rows = (trip.participants || []).map((p) => ({
      refKey: `user:${p.id}`,
      displayName: p.name || p.email || "Member",
      email: p.email || "",
    }));
    for (const m of trip.teamMembers || []) {
      const e = normalizeEmail(m.email);
      if (e && participantEmails.has(e)) continue;
      if (!m.id) continue;
      rows.push({
        refKey: `roster:${m.id}`,
        displayName: m.name || e || "Roster member",
        email: m.email || "",
      });
    }
    return rows
      .filter((row) => shouldIncludeInTripWorkerPipeline(trip, row.email))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [trip]);

  const travelFormTableRows = useMemo(() => {
    if (!trip) return [];
    const participantEmails = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );

    const rows = (trip.participants || []).map((p) => ({
      refKey: `user:${p.id}`,
      id: p.id,
      name: p.name || p.email || "Member",
      email: p.email || "",
      rosterOnly: false,
    }));

    for (const member of trip.teamMembers || []) {
      if (!member?.id) continue;
      const email = normalizeEmail(member.email);
      if (email && participantEmails.has(email)) continue;
      rows.push({
        refKey: `roster:${member.id}`,
        id: member.id,
        name: member.name || member.email || "Roster member",
        email: member.email || "",
        rosterOnly: true,
      });
    }

    return rows
      .filter((row) => shouldIncludeInTripWorkerPipeline(trip, row.email))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [trip]);

  const participantDocumentsSummary = useMemo(() => {
    if (!trip) {
      return {
        totalParticipants: 0,
        totalDocTypes: tripUserDocumentTypes.length,
        totalExpected: 0,
        uploadedCount: 0,
        missingCount: 0,
        participantsMissingAny: 0,
      };
    }
    const summaryParticipants = !canViewTeamDashboard
      ? currentParticipant
        ? [currentParticipant]
        : []
      : (() => {
          const participantEmails = new Set(
            (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
          );
          const rosterOnly = (trip.teamMembers || [])
            .filter((member) => {
              const email = normalizeEmail(member.email);
              return email && !participantEmails.has(email);
            })
            .map((member) => ({
              id: member.id ? `roster-member-${member.id}` : `roster-${normalizeEmail(member.email)}`,
              email: member.email || "",
            }));
          const merged = [...(trip.participants || []), ...rosterOnly];
          return merged.filter((p) => shouldIncludeInTripWorkerPipeline(trip, p.email));
        })();
    const totalParticipants = summaryParticipants.length;
    const totalDocTypes = tripUserDocumentTypes.length;
    let uploadedCount = 0;
    let missingCount = 0;
    let participantsMissingAny = 0;

    for (const participant of summaryParticipants) {
      const slots = participantDocumentsByUserId.get(String(participant.id)) || {};
      let participantMissing = false;
      for (const docType of tripUserDocumentTypes) {
        if (slots[docType.key]) {
          uploadedCount += 1;
        } else {
          missingCount += 1;
          participantMissing = true;
        }
      }
      if (participantMissing) participantsMissingAny += 1;
    }

    return {
      totalParticipants,
      totalDocTypes,
      totalExpected: totalParticipants * totalDocTypes,
      uploadedCount,
      missingCount,
      participantsMissingAny,
    };
  }, [trip, canViewTeamDashboard, currentParticipant, participantDocumentsByUserId, tripUserDocumentTypes]);

  const travelFormsSummary = useMemo(() => {
    const totalParticipants = travelFormTableRows.length;
    let completedCount = 0;
    let missingCount = 0;
    let passportGaps = 0;

    for (const row of travelFormTableRows) {
      const form =
        travelFormResponses.find(
          (entry) => String(travelFormRowToRefKey(entry) || "") === String(row.refKey || "")
        ) || null;
      const hasSubmission = !!(
        form &&
        [
          form.firstNamePassport,
          form.lastNamePassport,
          form.passportNumber,
          form.email,
          form.departureDate,
          form.returnDate,
        ].some((value) => String(value || "").trim())
      );
      if (hasSubmission) {
        completedCount += 1;
      } else {
        missingCount += 1;
      }
      if (
        hasSubmission &&
        (!String(form?.passportNumber || "").trim() ||
          !String(form?.passportExpirationDate || "").trim())
      ) {
        passportGaps += 1;
      }
    }

    return {
      totalParticipants,
      completedCount,
      missingCount,
      passportGaps,
    };
  }, [travelFormResponses, travelFormTableRows]);

  const visibleTravelFormParticipants = useMemo(() => {
    if (canViewTeamDashboard) return travelFormTableRows;
    if (!currentParticipant) return [];
    return [{ ...currentParticipant, refKey: `user:${currentParticipant.id}` }];
  }, [canViewTeamDashboard, currentParticipant, travelFormTableRows]);

  const participantTaskPct = useMemo(() => {
    const totalPossible = participantTaskProgress.reduce(
      (sum, participant) => sum + participant.total,
      0
    );
    const completed = participantTaskProgress.reduce(
      (sum, participant) => sum + participant.completed,
      0
    );

    return totalPossible ? Math.round((completed / totalPossible) * 100) : 0;
  }, [participantTaskProgress]);

  const trainingProgress = useMemo(() => {
    if (!trip) return [];

    const base = (trip.participants || []).map((participant) => {
      const trainingState =
        participantTrainingStates[normalizeEmail(participant.email)] || {};
      const completed = allTrainingModules.filter(
        (module) => !!trainingState[module.id]
      ).length;
      const total = allTrainingModules.length;

      return {
        ...participant,
        trainingState,
        completed,
        total,
        percent: total ? Math.round((completed / total) * 100) : 0,
      };
    });

    if (!canViewTeamDashboard) {
      return base;
    }

    const participantEmails = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );
    const extras = (trip.teamMembers || [])
      .filter((m) => {
        const e = normalizeEmail(m.email);
        return e && !participantEmails.has(e);
      })
      .map((member) => {
        const trainingState =
          participantTrainingStates[normalizeEmail(member.email)] || {};
        const completed = allTrainingModules.filter(
          (module) => !!trainingState[module.id]
        ).length;
        const total = allTrainingModules.length;
        return {
          id: member.id ? `roster-member-${member.id}` : `roster-${normalizeEmail(member.email)}`,
          assignmentId: "",
          name: member.name || member.email || "Roster member",
          email: member.email || "",
          firstName: member.firstName || "",
          lastName: member.lastName || "",
          role: "",
          gender: "",
          fundraisingUrl: "",
          trainingState,
          completed,
          total,
          percent: total ? Math.round((completed / total) * 100) : 0,
          rosterOnly: true,
        };
      });

    const merged = [...base, ...extras];
    return merged.filter((p) => shouldIncludeInTripWorkerPipeline(trip, p.email));
  }, [trip, participantTrainingStates, allTrainingModules, canViewTeamDashboard]);

  const currentTrainingProgress = useMemo(() => {
    if (!activeParticipantEmail) return null;

    return (
      trainingProgress.find(
        (participant) =>
normalizeEmail(participant.email) === activeParticipantEmail
      ) || null
    );
  }, [trainingProgress, activeParticipantEmail]);

  const trainingPct = useMemo(() => {
    const totalPossible = trainingProgress.reduce(
      (sum, participant) => sum + participant.total,
      0
    );
    const completed = trainingProgress.reduce(
      (sum, participant) => sum + participant.completed,
      0
    );

    return totalPossible ? Math.round((completed / totalPossible) * 100) : 0;
  }, [trainingProgress]);

  const visibleFundraisingParticipants = useMemo(() => {
    if (!trip) return [];

    if (canViewTeamDashboard) {
      const participantEmails = new Set(
        (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
      );
      const rosterByEmail = new Map(
        (trip.teamMembers || []).filter((m) => m?.email).map((m) => [normalizeEmail(m.email), m])
      );
      const mergedParticipants = (trip.participants || []).map((p) => {
        const m = rosterByEmail.get(normalizeEmail(p.email));
        const goalFromRoster =
          m?.fundraisingGoalAmount != null && m.fundraisingGoalAmount !== ""
            ? Number(m.fundraisingGoalAmount)
            : undefined;
        return {
          ...p,
          tripTeamMemberId: p.tripTeamMemberId || m?.id || "",
          fundraisingGoalAmount:
            p.fundraisingGoalAmount != null &&
            p.fundraisingGoalAmount !== "" &&
            Number.isFinite(Number(p.fundraisingGoalAmount))
              ? Number(p.fundraisingGoalAmount)
              : goalFromRoster,
        };
      });
      const rosterOnly = (trip.teamMembers || [])
        .filter((member) => {
          const email = normalizeEmail(member.email);
          return email && !participantEmails.has(email);
        })
        .map((member) => ({
          id: member.id ? `roster-member-${member.id}` : `roster-${normalizeEmail(member.email)}`,
          tripTeamMemberId: member.id || "",
          name: member.name || member.email || "Roster member",
          email: member.email || "",
          fundraisingUrl: member.fundraisingUrl || "",
          fundraisingGoalAmount:
            member.fundraisingGoalAmount != null ? Number(member.fundraisingGoalAmount) : undefined,
          rosterOnly: true,
        }));
      const merged = [...mergedParticipants, ...rosterOnly];
      /** No fundraising tile for roster rows marked Leader + not traveling with team. */
      return merged.filter((p) => shouldIncludeInTripWorkerPipeline(trip, p.email));
    }

    if (!currentParticipant) {
      return [];
    }

    return (trip.participants || [])
      .filter((participant) => String(participant.id) === String(currentParticipant?.id || ""))
      .filter((p) => shouldIncludeInTripWorkerPipeline(trip, p.email));
  }, [trip, canViewTeamDashboard, currentParticipant]);

  const workerDocumentParticipants = useMemo(() => {
    if (!trip) return [];
    if (!canViewTeamDashboard) {
      return currentParticipant ? [currentParticipant] : [];
    }
    const participantEmails = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );
    const rosterOnly = (trip.teamMembers || [])
      .filter((member) => {
        const email = normalizeEmail(member.email);
        return email && !participantEmails.has(email);
      })
      .map((member) => ({
        id: member.id ? `roster-member-${member.id}` : `roster-${normalizeEmail(member.email)}`,
        profileId: "",
        name: member.name || member.email || "Roster member",
        email: member.email || "",
        rosterOnly: true,
      }));
    const merged = [...(trip.participants || []), ...rosterOnly];
    return merged.filter((p) => shouldIncludeInTripWorkerPipeline(trip, p.email));
  }, [trip, canViewTeamDashboard, currentParticipant]);

  const tripDocumentWorkerOptions = useMemo(
    () =>
      workerDocumentParticipants
        .map((participant) => String(participant?.name || participant?.email || "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    [workerDocumentParticipants]
  );

  const referenceReceivedProgress = useMemo(() => {
    if (!trip) {
      return {
        label: "References Received",
        percent: 0,
        completed: 0,
        total: 0,
        showOnOverview: false,
      };
    }

    const total = referenceTableRows.length;
    const completed = referenceTableRows.filter(
      (row) => !!getReferenceStatus(row.refKey).received
    ).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    if (canViewTeamDashboard) {
      return {
        label: "References Received",
        percent,
        completed,
        total,
        showOnOverview: true,
      };
    }

    const refKeyForCurrent = (() => {
      if (!currentParticipant?.id) return "";
      const id = String(currentParticipant.id);
      if (id.startsWith("roster-member-")) return `roster:${id.slice("roster-member-".length)}`;
      return `user:${id}`;
    })();

    const mineReceived =
      refKeyForCurrent && !!getReferenceStatus(refKeyForCurrent).received;

    return {
      label: "My reference",
      percent: mineReceived ? 100 : 0,
      completed: mineReceived ? 1 : 0,
      total: 1,
      showOnOverview: mineReceived,
    };
  }, [trip, canViewTeamDashboard, currentParticipant, referenceEmails, referenceTableRows]);

  const overviewTaskLabel = canViewTeamDashboard ? "Worker Tasks" : "My Tasks";
  const overviewTaskPct = canViewTeamDashboard
    ? participantTaskPct
    : currentParticipantProgress?.percent || 0;
  const overviewTrainingLabel = canViewTeamDashboard ? "Training" : "My Training";
  const overviewTrainingPct = canViewTeamDashboard
    ? trainingPct
    : currentTrainingProgress?.percent || 0;
  const currentParticipantFundraisingGoalAmount =
    currentParticipant?.fundraisingGoalAmount != null &&
    Number.isFinite(Number(currentParticipant.fundraisingGoalAmount))
      ? Number(currentParticipant.fundraisingGoalAmount)
      : 0;
  const isTeamFundraisingMode = trip?.fundraisingMode === "team";
  const tripFundraisingGoal = Number(trip?.fundraisingGoalAmount || 0);
  const fundraisingGoalAmount =
    !canViewTeamDashboard && isTeamFundraisingMode
      ? tripFundraisingGoal
      : !canViewTeamDashboard &&
        currentParticipantFundraisingGoalAmount > 0
        ? currentParticipantFundraisingGoalAmount
        : tripFundraisingGoal;
  const fundraisingWorkerCount = useMemo(() => {
    if (!trip) return 1;
    const roster = trip.teamMembers || [];
    const byEmail = new Map(roster.map((m) => [normalizeEmail(m.email), m]));
    const seen = new Set();
    let count = 0;
    for (const p of trip.participants || []) {
      const e = normalizeEmail(p.email);
      if (!e || seen.has(e)) continue;
      seen.add(e);
      const tm = byEmail.get(e);
      if (
        tm &&
        String(tm.teamRole || "").trim().toLowerCase() === "leader" &&
        tm.travelsWithTeam === false
      ) {
        continue;
      }
      count += 1;
    }
    for (const m of roster) {
      const e = normalizeEmail(m.email);
      if (!e || seen.has(e)) continue;
      seen.add(e);
      if (
        String(m.teamRole || "").trim().toLowerCase() === "leader" &&
        m.travelsWithTeam === false
      ) {
        continue;
      }
      count += 1;
    }
    return Math.max(count, 1);
  }, [trip]);
  const useIndividualGoal =
    !canViewTeamDashboard &&
    !isTeamFundraisingMode &&
    currentParticipantFundraisingGoalAmount > 0;
  const countForDeadlines =
    useIndividualGoal || isTeamFundraisingMode ? 1 : fundraisingWorkerCount;
  const fundraisingFirstDeadlineAmount = Math.min(
    2000 * countForDeadlines,
    fundraisingGoalAmount || 2000 * countForDeadlines
  );
  const fundraisingSecondDeadlineTotalAmount = Math.max(
    (fundraisingGoalAmount || 0) - fundraisingFirstDeadlineAmount,
    0
  );
  const fundraisingSecondDeadlineAmount = fundraisingSecondDeadlineTotalAmount;
  const fundraisingFirstDeadlineDate = subtractDays(trip?.startDate, 90);
  const fundraisingSecondDeadlineDate = subtractDays(trip?.startDate, 30);
  const savedFundraisingLinksCount = useMemo(() => {
    if (!trip) return 0;
    const participantEmails = new Set(
      (trip.participants || []).map((p) => normalizeEmail(p.email)).filter(Boolean)
    );
    const participantWithUrl = (trip.participants || []).filter((p) => !!p.fundraisingUrl).length;
    const rosterWithUrl = (trip.teamMembers || []).filter((m) => {
      const e = normalizeEmail(m.email);
      return e && !participantEmails.has(e) && String(m.fundraisingUrl || "").trim();
    }).length;
    return participantWithUrl + rosterWithUrl;
  }, [trip]);
  const nextFundraisingDeadline = fundraisingFirstDeadlineDate
    ? {
        amount: fundraisingFirstDeadlineAmount,
        date: fundraisingFirstDeadlineDate,
        label: "90-day deadline",
      }
    : fundraisingSecondDeadlineDate
      ? {
          amount: fundraisingSecondDeadlineAmount,
          date: fundraisingSecondDeadlineDate,
          label: "30-day deadline",
        }
      : null;
  const overviewFundraisingLabel =
    isTeamFundraisingMode || trip?.teamFundraisingUrl
      ? "Team Fundraising"
      : canViewTeamDashboard
        ? "Fundraising Links"
        : "My Fundraising";
  const overviewFundraisingValue = fundraisingGoalAmount
    ? formatMoney(fundraisingGoalAmount)
    : isTeamFundraisingMode || trip?.teamFundraisingUrl
      ? "Page Ready"
      : canViewTeamDashboard
        ? `${savedFundraisingLinksCount} Links`
        : currentParticipant?.fundraisingUrl
          ? "Page Ready"
          : "No Link";
  const overviewFundraisingDetail = fundraisingGoalAmount && nextFundraisingDeadline
    ? `${nextFundraisingDeadline.label}: ${formatMoney(
        nextFundraisingDeadline.amount
      )} by ${formatDeadlineDate(nextFundraisingDeadline.date)}.`
    : isTeamFundraisingMode || trip?.teamFundraisingUrl
      ? trip?.teamFundraisingUrl
        ? "Shared Neon page is ready for the full team."
        : "Team mode — add the shared Neon link on the Fundraising tab."
      : canViewTeamDashboard
        ? `${savedFundraisingLinksCount} worker links saved.`
        : currentParticipant?.fundraisingUrl
        ? "Your personal Neon page is available."
        : "No personal Neon page added yet.";
  const workerOverviewFundraisingUrl = !canViewTeamDashboard
    ? String(
        (isTeamFundraisingMode || trip?.teamFundraisingUrl
          ? trip?.teamFundraisingUrl
          : currentParticipant?.fundraisingUrl) || ""
      ).trim()
    : "";
  const smartsheetBudgetOpenUrl = useMemo(() => {
    const b = visibleDocs.find((d) => d.resourceKey === "smartsheet-budget");
    const j = visibleDocs.find((d) => d.resourceKey === "project-record-journal");
    const link = String(b?.link || j?.link || "").trim();
    const pdf = String(b?.pdfUrl || j?.pdfUrl || "").trim();
    return link || pdf || "";
  }, [visibleDocs]);
  const flightsOpenUrl = useMemo(() => {
    for (const d of visibleDocs || []) {
      if (String(d.resourceKey || "") === "flights" && docHasAnyContent(d)) {
        const u = preferredTripResourceOpenUrl(d);
        if (u) return u;
      }
    }
    const opt = (visibleDocs || []).find(
      (d) =>
        !String(d.resourceKey || "").trim() &&
        isTripDocumentFlightsCategory(d) &&
        docHasAnyContent(d)
    );
    return opt ? preferredTripResourceOpenUrl(opt) : "";
  }, [visibleDocs]);
  const siteInfoDoc = docs.find((doc) => doc.resourceKey === "site-info-link");
  const visibleSiteInfoDoc = visibleDocs.find((doc) => doc.resourceKey === "site-info-link");
  const autoSiteInfoLink = useMemo(() => {
    if (!trip?.location?.trim()) return "";
    let primary = "";
    if (canManageTrips && staffViewAllParticipants) {
      primary = resolveTripSiteLogisticsUrl(trip.location, siteBudgetNotesList) || "";
    } else {
      primary =
        resolveSiteLogisticsUrl(resolveCanonicalSiteLabelForTrip(trip.location, [])) || "";
    }
    if (primary) return primary;
    return String(tripSiteLogisticsRpcUrl || "").trim() || "";
  }, [
    trip?.location,
    siteBudgetNotesList,
    canManageTrips,
    staffViewAllParticipants,
    tripSiteLogisticsRpcUrl,
  ]);
  const effectiveSiteInfoDoc = useMemo(() => {
    const rawSaved = (docs || []).find((d) => String(d.resourceKey) === "site-info-link");
    if (rawSaved && !rawSaved.isAutoGenerated && isPersistedTripResourceDismissedEmpty(rawSaved)) {
      return null;
    }
    const saved = visibleSiteInfoDoc;
    const savedHasUrl = !!(
      saved &&
      (String(saved.link || "").trim() || String(saved.pdfUrl || "").trim())
    );
    if (savedHasUrl) return saved;
    if (autoSiteInfoLink) {
      return {
        id: "auto-site-info-link",
        title: "Site Logistics",
        link: autoSiteInfoLink,
        pdfUrl: "",
        createdAt: "",
        updatedAt: "",
        isAutoGenerated: true,
        visibleToParticipants: true,
      };
    }
    return saved || null;
  }, [docs, visibleSiteInfoDoc, autoSiteInfoLink]);
  const effectiveHousingLinkDoc = useMemo(() => {
    const saved = (docs || []).find((d) => d.resourceKey === "housing-accommodation-link");
    const budgetRowLink = String(tripBudgetRow?.housingLink || "").trim();
    const budgetRowPdf = String(tripBudgetRow?.housingPdfUrl || "").trim();
    const rawLink = String(tripHousingLinkUrl || "").trim() || budgetRowLink;
    const rawPdf = String(tripHousingPdfUrl || "").trim() || budgetRowPdf;

    // If housing was previously dismissed as an empty default card, we only want to hide it
    // when the budget has no housing link/PDF. When a user saves housing from Trip Documents,
    // we write into trip_budgets; we must not let a stale trip_resources dismissal keep the card hidden.
    const isSavedDismissedEmpty =
      saved && !saved.isAutoGenerated && isPersistedTripResourceDismissedEmpty(saved);
    if (isSavedDismissedEmpty && !rawLink && !rawPdf) return null;

    const budgetLink = rawLink
      ? /^https?:\/\//i.test(rawLink)
        ? rawLink
        : `https://${rawLink}`
      : "";
    const budgetPdf = rawPdf;

    const savedLinkRaw = saved ? String(saved.link || "").trim() : "";
    const savedPdfRaw = saved ? String(saved.pdfUrl || "").trim() : "";
    const savedLinkNorm = savedLinkRaw
      ? /^https?:\/\//i.test(savedLinkRaw)
        ? savedLinkRaw
        : `https://${savedLinkRaw}`
      : "";

    // Trip Documents housing "Edit" writes trip_budgets; a legacy trip_resources row must not
    // hide those URLs. Prefer RPC (viewer) then direct budget row, then saved trip_resources.
    const link = rawLink ? budgetLink : savedLinkNorm;
    const pdfUrl = rawPdf ? budgetPdf : savedPdfRaw;

    if (!link && !pdfUrl) return null;

    if (saved && !saved.isAutoGenerated) {
      return {
        ...saved,
        link,
        pdfUrl,
      };
    }

    return {
      id: "auto-housing-accommodation-link",
      title: "Team housing",
      link,
      pdfUrl,
      createdAt: "",
      updatedAt: "",
      isAutoGenerated: true,
      visibleToParticipants: true,
    };
  }, [docs, tripHousingLinkUrl, tripHousingPdfUrl, tripBudgetRow?.housingLink, tripBudgetRow?.housingPdfUrl]);
  const tripDocumentCategorySections = useMemo(() => {
    const buckets = Object.fromEntries(DOCUMENT_CATEGORY_OPTIONS.map((c) => [c, []]));

    const pushEntry = (category, entry) => {
      const key = DOCUMENT_CATEGORY_OPTIONS.includes(category) ? category : "Other";
      buckets[key].push(entry);
    };

    const byTimeDesc = (a, b) => {
      const ta = Date.parse(a.doc?.updatedAt || a.doc?.createdAt || 0) || 0;
      const tb = Date.parse(b.doc?.updatedAt || b.doc?.createdAt || 0) || 0;
      return tb - ta;
    };
    const compareTripResourceDocs = (left, right) => {
      const leftWorker = getTripDocumentWorkerLabel(left.doc);
      const rightWorker = getTripDocumentWorkerLabel(right.doc);
      const leftHasWorker = !!leftWorker;
      const rightHasWorker = !!rightWorker;

      if (leftHasWorker !== rightHasWorker) return leftHasWorker ? -1 : 1;

      if (leftHasWorker && rightHasWorker) {
        const byWorker = leftWorker.localeCompare(rightWorker, undefined, { sensitivity: "base" });
        if (byWorker !== 0) return byWorker;
      }

      const byTitle = String(left.doc?.title || "").localeCompare(String(right.doc?.title || ""), undefined, {
        sensitivity: "base",
      });
      if (byTitle !== 0) return byTitle;

      return byTimeDesc(left, right);
    };

    const budgetSlot = requiredDocumentSlots.find((s) => s.key === "smartsheet-budget");
    const budgetDoc = budgetSlot?.resource;
    if (budgetSlot && budgetDoc && docHasAnyContent(budgetDoc)) {
      pushEntry("Budget", { kind: "slot", slot: budgetSlot, doc: budgetDoc });
    }

    if (
      effectiveSiteInfoDoc &&
      (String(effectiveSiteInfoDoc.link || "").trim() ||
        String(effectiveSiteInfoDoc.pdfUrl || "").trim())
    ) {
      pushEntry("Site", { kind: "site", doc: effectiveSiteInfoDoc });
    }

    const housingSlotDef = requiredDocumentSlots.find((s) => s.key === "housing-accommodation-link");
    if (
      housingSlotDef &&
      effectiveHousingLinkDoc &&
      docHasAnyContent(effectiveHousingLinkDoc)
    ) {
      pushEntry("Team", {
        kind: "slot",
        slot: { ...housingSlotDef, resource: effectiveHousingLinkDoc },
        doc: effectiveHousingLinkDoc,
      });
    }

    for (const d of visibleDocs) {
      const rk = String(d.resourceKey || "").trim();
      if (!docHasAnyContent(d)) continue;
      if (rk === "project-record-journal") continue;
      if (rk === "smartsheet-budget") continue;
      if (rk === "site-info-link") continue;
      if (rk === "housing-accommodation-link") continue;
      pushEntry(categoryForTripResourceDoc(d), { kind: "doc", doc: d });
    }

    for (const c of DOCUMENT_CATEGORY_OPTIONS) {
      buckets[c].sort((a, b) => {
        const pa = a.kind === "doc" ? 1 : 0;
        const pb = b.kind === "doc" ? 1 : 0;
        if (pa !== pb) return pa - pb;
        if (a.kind === "doc" && b.kind === "doc") return compareTripResourceDocs(a, b);
        return 0;
      });
    }

    return DOCUMENT_CATEGORY_OPTIONS.map((category) => ({
      category,
      entries: buckets[category],
    })).filter((section) => section.entries.length > 0);
  }, [requiredDocumentSlots, effectiveSiteInfoDoc, effectiveHousingLinkDoc, visibleDocs]);

  const hasDismissedDefaultTripDocumentSlots = useMemo(() => {
    const keys = new Set(REQUIRED_TRIP_DOCUMENT_SLOTS.map((s) => s.key));
    return (docs || []).some(
      (d) => keys.has(String(d.resourceKey || "")) && isPersistedTripResourceDismissedEmpty(d)
    );
  }, [docs]);
  const quickLinks = useMemo(() => {
    const links = [
      {
        label: "Canvas",
        url: trainingAccessUrl,
        ready: true,
      },
    ];

    if (trip?.teamFundraisingUrl) {
      links.push({
        label: "Team Fundraising",
        url: trip.teamFundraisingUrl,
        ready: true,
      });
    }

    links.push({
      label: "Budget",
      url: smartsheetBudgetOpenUrl,
      ready: !!smartsheetBudgetOpenUrl,
    });

    links.push({
      label: "Flights",
      url: flightsOpenUrl,
      ready: !!flightsOpenUrl,
    });

    links.push({
      label: "Site Logistics",
      url: preferredTripResourceOpenUrl(effectiveSiteInfoDoc),
      ready: !!preferredTripResourceOpenUrl(effectiveSiteInfoDoc),
    });

    links.push({
      label: "Team housing",
      url: preferredTripResourceOpenUrl(effectiveHousingLinkDoc),
      ready: !!preferredTripResourceOpenUrl(effectiveHousingLinkDoc),
    });

    return links;
  }, [
    currentParticipant?.fundraisingUrl,
    effectiveHousingLinkDoc?.link,
    effectiveHousingLinkDoc?.pdfUrl,
    effectiveSiteInfoDoc?.link,
    effectiveSiteInfoDoc?.pdfUrl,
    flightsOpenUrl,
    smartsheetBudgetOpenUrl,
    trainingAccessUrl,
    trip?.fundraisingMode,
    trip?.teamFundraisingUrl,
  ]);
  const visibleTaskParticipants = canViewTeamDashboard
    ? participantTaskProgress
    : currentParticipantProgress
      ? [currentParticipantProgress]
      : [];
  const groupedWorkerTasks = useMemo(
    () => groupWorkerTasks(tripTasks),
    [tripTasks]
  );
  const visibleTrainingParticipants = canViewTeamDashboard
    ? trainingProgress
    : currentTrainingProgress
      ? [currentTrainingProgress]
      : [];
  const overviewUpcomingTasks = useMemo(() => {
    if (!trip) return [];

    if (staffViewAllParticipants) {
      const effectiveStaffDue = (task) => task.dueDate || computeStaffTaskDueDate(task, trip);
      return (editableStaffTasks || [])
        .filter(
          (task) =>
            task.progress !== "Complete" &&
            isTaskAssignedToUser(task.assignedTo, session?.name || session?.email || "")
        )
        .sort((left, right) => {
          const leftDate =
            parseDateSafe(effectiveStaffDue(left))?.getTime() || Number.MAX_SAFE_INTEGER;
          const rightDate =
            parseDateSafe(effectiveStaffDue(right))?.getTime() || Number.MAX_SAFE_INTEGER;
          return leftDate - rightDate;
        })
        .slice(0, 5)
        .map((task) => {
          const st = findStaffTaskTemplate(task);
          return {
            id: task.id,
            title: task.taskName,
            dueDate: effectiveStaffDue(task) || "",
            detail: task.workArea,
            destinationTab: "Staff Tasks",
            destinationId: task.id,
            link: st?.link || null,
            details: task.notes || st?.details || null,
          };
        });
    }

    const taskState = currentParticipantProgress?.taskState || {};
    const hideSectionLabelTitles = [
      "Proofread my tickets",
    ];
    const upcomingTasks = tripTasks
      .filter((task) => !taskState[task.id])
      .map((task) => {
        const wt = findWorkerTaskTemplate(task);
        const section = getWorkerTaskSection(task);
        const isChecklistTask = task.id === "worker-task-checklist" || task.title === "Received and has reviewed Project Management Checklist";
        const isTicketsTask = task.id === "worker-task-tickets" || task.title === "Proofread my tickets";
        const isDocumentsTask = task.id === "worker-task-upload-passport" || task.id === "worker-task-upload-visa" || task.title === "Upload passport" || task.title === "Upload visa";
        const documentsTabUrl = trip?.id
          ? `/trips/${encodeURIComponent(trip.id)}?tab=documents`
          : null;
        const openTripDocumentsTab = isTicketsTask;
        const link = isChecklistTask
          ? (preferredTripResourceOpenUrl(effectiveSiteInfoDoc) || wt?.link)
          : isTicketsTask
            ? null
            : isDocumentsTask
              ? documentsTabUrl
              : (wt?.link || null);
        return {
          id: task.id,
          title: task.title,
          dueDate: task.due,
          detail: hideSectionLabelTitles.includes(task.title) ? "" : section,
          destinationTab: openTripDocumentsTab ? "Trip Documents" : "Tasks",
          destinationId: task.id,
          link: link || null,
          openTripDocumentsTab,
          /** Same trip My Documents / Worker Docs tab — open in-app instead of new window */
          openDocumentsTab: !!(isDocumentsTask && link && documentsTabUrl && link === documentsTabUrl),
          details: task.description || wt?.details || null,
        };
      });
    const currentTrainingState = currentTrainingProgress?.trainingState || {};
    const upcomingTraining = allTrainingModules
      .filter((module) => !currentTrainingState[module.id])
      .map((module) => ({
        id: `training-${module.id}`,
        title: module.title,
        dueDate: getTrainingModuleDeadline(module.title, {
          startDate: trip?.startDate,
          endDate: trip?.endDate,
          trainingTimelineType: trip?.trainingTimelineType,
        }),
        detail: "Training",
        destinationTab: "Training",
        destinationId: module.id,
      }));

    return [...upcomingTasks, ...upcomingTraining]
      .sort((left, right) => {
        const leftDate = parseDateSafe(left.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
        const rightDate = parseDateSafe(right.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
        return leftDate - rightDate;
      })
      .slice(0, 5);
  }, [
    allTrainingModules,
    staffViewAllParticipants,
    currentParticipantProgress?.taskState,
    currentTrainingProgress?.trainingState,
    editableStaffTasks,
    effectiveSiteInfoDoc,
    flightsOpenUrl,
    session?.email,
    session?.name,
    trip,
    tripTasks,
  ]);

  const { upcomingMeetings, pastMeetings } = useMemo(() => {
    const now = Date.now();
    const upcoming = [];
    const past = [];
    const trainingMeetings = buildTrainingSessionMeetingsFromState(
      currentTrainingProgress?.trainingState,
      allTrainingModules
    );
    const combined = [...tripMeetings, ...trainingMeetings];
    for (const m of combined) {
      const t = new Date(m.scheduledAt).getTime();
      if (Number.isNaN(t)) continue;
      if (t >= now) upcoming.push(m);
      else past.push(m);
    }
    upcoming.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    past.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    return { upcomingMeetings: upcoming, pastMeetings: past };
  }, [tripMeetings, currentTrainingProgress?.trainingState, allTrainingModules]);

  const participantDocumentsTabLabel = canViewTeamDashboard ? "Worker Docs" : "My Documents";
  const tripDocumentsTabLabel = "Trip Documents";
  const tripTabTravelSafety = "Travel & Safety";

  const workerTabList = [
    "Overview",
    "Team",
    tripTabTravelSafety,
    "Fundraising",
    "Training",
    "Tasks",
    "Travel Form",
    tripDocumentsTabLabel,
    participantDocumentsTabLabel,
  ];
  const managerExpandedTabs = [
    "Overview",
    "Team",
    tripTabTravelSafety,
    "Fundraising",
    "Training",
    "Tasks",
    "Materials",
    tripDocumentsTabLabel,
    participantDocumentsTabLabel,
    "Travel Form",
    "Staff Tasks",
  ];
  const leaderExpandedTabs = useMemo(
    () => [
      "Overview",
      "Team",
      tripTabTravelSafety,
      "Fundraising",
      "Training",
      "Tasks",
      tripDocumentsTabLabel,
      participantDocumentsTabLabel,
      "Travel Form",
    ],
    [tripTabTravelSafety, tripDocumentsTabLabel, participantDocumentsTabLabel]
  );
  const tabs = (() => {
    if (isPreviewingParticipant) return workerTabList;
    if (canManageTrips && !isStaffPreviewingLeader) return managerExpandedTabs;
    if (effectiveIsLeader) return leaderExpandedTabs;
    return workerTabList;
  })();

  /** Participants plus roster-only team members (same headcount as worker docs / fundraising list). */
  const materialsRosterHeadcount = workerDocumentParticipants.length;

  /** Parsed integer from materials draft, or null if not set (empty / invalid). */
  const materialsBudgetWorkerCount = useMemo(() => {
    if (!materialsDraft) return null;
    const nw = materialsDraft.numWorkers;
    if (nw === "" || nw === null || nw === undefined) return null;
    const num = typeof nw === "number" ? nw : Number.parseInt(String(nw), 10);
    return Number.isFinite(num) ? num : null;
  }, [materialsDraft]);

  /** Show merged roster when budget row has no # of workers saved yet. */
  const materialsWorkersDisplayCount =
    materialsBudgetWorkerCount !== null ? materialsBudgetWorkerCount : materialsRosterHeadcount;

  const materialsWorkerCountDelta =
    materialsBudgetWorkerCount !== null ? materialsBudgetWorkerCount - materialsRosterHeadcount : null;

  const materialsGlanceRow = {
    display: "grid",
    gridTemplateColumns: "minmax(124px, 140px) 1fr",
    gap: "6px 16px",
    alignItems: "start",
    padding: "10px 0",
    borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
  };
  const materialsGlanceLabel = {
    fontWeight: 600,
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: "0.045em",
    fontSize: 11,
    lineHeight: 1.35,
  };
  const materialsGlanceValue = {
    fontSize: 13,
    lineHeight: 1.55,
    color: "var(--text)",
    fontWeight: 500,
  };
  const materialsGlanceMuted = {
    fontSize: 12,
    lineHeight: 1.5,
    color: "var(--muted)",
    fontWeight: 400,
  };
  const materialsGlanceRowSending = {
    ...materialsGlanceRow,
    display: "grid",
    gridTemplateColumns: "minmax(124px, 140px) 1fr",
    gap: "6px 16px",
    alignItems: "start",
    padding: "16px 14px 14px",
    marginTop: 6,
    marginLeft: -2,
    marginRight: -2,
    borderRadius: 12,
    borderTop: "none",
    borderBottom: "none",
    background:
      "linear-gradient(135deg, rgba(124, 58, 237, 0.06), rgba(37, 99, 235, 0.04), rgba(248, 250, 252, 0.9))",
    border: "1px solid rgba(124, 58, 237, 0.14)",
    boxShadow: "0 1px 0 rgba(255, 255, 255, 0.85) inset",
  };
  const materialsMetricCard = {
    minHeight: 104,
    borderRadius: 14,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    background: "rgba(255, 255, 255, 0.8)",
    padding: "14px 16px",
    boxShadow: "0 8px 26px rgba(15, 23, 42, 0.05)",
    display: "grid",
    alignContent: "start",
    gap: 8,
  };
  const materialsMetricLabel = {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--muted)",
  };
  const materialsMetricValue = {
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 900,
    color: "var(--text)",
  };
  const materialsPanelBase = {
    borderRadius: 14,
    padding: "4px 14px 2px",
    boxShadow: "0 1px 0 rgba(255, 255, 255, 0.75) inset",
    minWidth: 0,
    height: "100%",
  };

  const staffSiteWorkbookPlan = useMemo(() => {
    if (!trip?.location?.trim()) {
      return { noLocation: true };
    }
    const note = resolveSiteBudgetNoteForTripLocation(trip.location, siteBudgetNotesList);
    const hasHousingNote = Boolean(note?.notes?.trim());
    if (!note?.workbookNotes?.trim()) {
      return { noLocation: false, empty: true, note, hasHousingNote };
    }
    const items = parseAnyWorkbookInventoryString(note.workbookNotes);
    const summary = summarizeWorkbookItemsForShipping(items);
    return { noLocation: false, empty: false, note, hasHousingNote, ...summary };
  }, [trip?.location, siteBudgetNotesList]);

  const materialsTeamWorkbookGlance = useMemo(() => {
    if (!materialsDraft) return null;
    const raw = String(materialsDraft.workbooks || "").trim();
    if (!raw) {
      return { kind: "empty" };
    }
    const items = parseAnyWorkbookInventoryString(raw);
    const summary = summarizeWorkbookItemsForShipping(items);
    if (summary.positiveLines.length > 0) {
      return { kind: "parsed", raw, ...summary };
    }
    return { kind: "raw", raw };
  }, [materialsDraft]);

  const materialsWorkbookTargetCopies = staffSiteWorkbookPlan?.empty || staffSiteWorkbookPlan?.noLocation
    ? 0
    : staffSiteWorkbookPlan?.totalCopies || 0;

  const materialsWorkbookSentCopies =
    materialsTeamWorkbookGlance?.kind === "parsed" ? materialsTeamWorkbookGlance.totalCopies || 0 : null;

  const materialsWorkbookRemainingCopies =
    materialsWorkbookSentCopies !== null
      ? Math.max(materialsWorkbookTargetCopies - materialsWorkbookSentCopies, 0)
      : null;

  const materialsShippingState = (() => {
    const hasAddress = !!String(materialsDraft?.materialsShipAddress || "").trim();
    const hasTracking = !!String(materialsDraft?.materialsTrackingNumber || "").trim();
    if (hasTracking) return "Shipped";
    if (hasAddress) return "Address ready";
    return "Needs setup";
  })();

  async function handleSaveMaterialsTab() {
    if (!trip?.id || !materialsDraft) return false;
    try {
      setMaterialsSaveStatus("Saving...");
      const nw = materialsDraft.numWorkers;
      const numWorkersParsed =
        nw === "" || nw === null || nw === undefined
          ? null
          : Number.parseInt(String(nw), 10);
      await saveTripBudget(trip.id, {
        numWorkers: Number.isFinite(numWorkersParsed) ? numWorkersParsed : null,
        teamAccountant: materialsDraft.teamAccountant ?? "",
        tshirts: materialsDraft.tshirts ?? "",
        workbooks: materialsDraft.workbooks ?? "",
        materialsShipAddress: materialsDraft.materialsShipAddress ?? "",
        materialsTrackingNumber: materialsDraft.materialsTrackingNumber ?? "",
        materialsNotes: materialsDraft.materialsNotes ?? "",
      });
      materialsBudgetLoadGenRef.current += 1;
      const next = await getTripBudget(trip.id);
      setTripBudgetRow(next);
      if (next) {
        setMaterialsDraft({
          numWorkers: numWorkersDraftFromBudgetValue(next.numWorkers),
          teamAccountant: next.teamAccountant || "",
          tshirts: next.tshirts ?? "",
          workbooks: next.workbooks ?? "",
          materialsShipAddress: next.materialsShipAddress ?? "",
          materialsTrackingNumber: next.materialsTrackingNumber ?? "",
          materialsNotes: next.materialsNotes ?? "",
        });
      }
      setMaterialsSaveStatus("Saved.");
      showToast("Materials saved.", "success");
      return true;
    } catch (e) {
      const msg = e.message || "Error saving.";
      setMaterialsSaveStatus(msg);
      showToast(msg, "error");
      return false;
    }
  }

  function revertMaterialsDraftFromBudgetRow() {
    const row = tripBudgetRow;
    setMaterialsDraft(
      row
        ? {
            numWorkers: numWorkersDraftFromBudgetValue(row.numWorkers),
            teamAccountant: row.teamAccountant || "",
            tshirts: row.tshirts ?? "",
            workbooks: row.workbooks ?? "",
            materialsShipAddress: row.materialsShipAddress ?? "",
            materialsTrackingNumber: row.materialsTrackingNumber ?? "",
            materialsNotes: row.materialsNotes ?? "",
          }
        : {
            numWorkers: "",
            teamAccountant: "",
            tshirts: "",
            workbooks: "",
            materialsShipAddress: "",
            materialsTrackingNumber: "",
            materialsNotes: "",
          }
    );
    setIsEditingMaterialsGlance(false);
    setMaterialsSaveStatus("");
  }

  async function handleMaterialsGlanceSave() {
    const ok = await handleSaveMaterialsTab();
    if (ok) setIsEditingMaterialsGlance(false);
  }

  function handleExportMaterialsExcel() {
    if (!trip?.id || !materialsDraft) return;
    try {
      const headers = [
        "Trip name",
        "# of workers",
        "Current roster count",
        "Team accountant",
        "T-shirt sizes (housing budget)",
        "Ship-to address",
        "Tracking number",
        "Workbooks sending notes",
      ];
      const row = [
        trip.name || "",
        materialsWorkersDisplayCount,
        materialsRosterHeadcount,
        materialsDraft.teamAccountant || "",
        materialsDraft.tshirts || "",
        materialsDraft.materialsShipAddress || "",
        materialsDraft.materialsTrackingNumber || "",
        materialsDraft.materialsNotes || "",
      ];
      const ws = XLSX.utils.aoa_to_sheet([headers, row]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Materials");
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeTripName = String(trip.name || "trip")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `${safeTripName || "trip"}-materials-${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Exported ${link.download}`, "success");
    } catch (e) {
      const msg = e?.message || "Export failed.";
      showToast(msg, "error");
    }
  }

  useEffect(() => {
    if (tabs.includes(tab)) return;
    if (tab === "My Documents" && tabs.includes("Worker Docs")) {
      setTab("Worker Docs");
      return;
    }
    setTab("Overview");
  }, [tab, tabs]);

  if (!router.isReady || !tripId) {
    return (
      <Shell>
        <div className="card pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Spinner size={40} />
          <div style={{ fontWeight: 900 }}>Loading...</div>
        </div>
      </Shell>
    );
  }

  if (!trip) {
    return (
      <Shell>
        <div className="card pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          {!tripLoadComplete && <Spinner size={40} />}
          <div style={{ fontWeight: 900 }}>
            {tripLoadComplete ? "Trip not found" : "Loading trip..."}
          </div>
          <div className="small">
            {tripLoadComplete
              ? "This trip could not be loaded for your current account."
              : "Fetching trip details."}
          </div>
        </div>
      </Shell>
    );
  }

  const pct = canViewTeamDashboard
    ? participantTaskPct
    : currentParticipantProgress?.percent || 0;
  const countdownSummary = getCountdownSummary(trip?.startDate);

  return (
    <Shell>
      <ConfirmModal
        open={isConfirmingTripDelete}
        title="Delete trip?"
        message={trip?.name ? `"${trip.name}" will be permanently removed. This cannot be undone.` : "This trip will be permanently removed. This cannot be undone."}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => handleConfirmDeleteTrip()}
        onCancel={() => {
          setIsConfirmingTripDelete(false);
          setTripSetupStatus("");
        }}
      />
      <div className="tripDetailPage">
        <nav className="breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: 12 }}>
          <Link href="/trips">Trips</Link>
          <span className="small" style={{ color: "var(--muted)", margin: "0 6px" }}>/</span>
          <span className="small" style={{ color: "var(--text)" }}>{trip.name}</span>
        </nav>
        <div className="tripDetailHero card pad">
          <div className="row tripPageHeader tripDetailHeroTop">
            <div className="tripPageHeaderTitle">
              <div className="appSectionBadge" style={{ marginBottom: 8 }}>Trip Detail</div>
              <h1 className="h1" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
                <AppIcon name="spark" className="pageEyebrowIcon" />
                <span>{trip.name}</span>
              </h1>
              <div className="small">{trip.location} • {trip.dates}</div>
            </div>
            <div className="spacer" />
            {canManageTrips && (
              <div className="row tripPageHeaderActions" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {canManageTrips ? (
                  <button
                    className="btn btnDanger"
                    type="button"
                    onClick={openDeleteTripConfirm}
                  >
                    Delete Trip
                  </button>
                ) : null}
                <select
                  className="input tripPagePreviewSelect"
                  value={previewParticipantId}
                  onChange={(event) => setPreviewParticipantId(event.target.value)}
                  style={{ minWidth: 260 }}
                >
                  <option value="">Staff view (full)</option>
                  <option value={LEADER_PREVIEW_PARTICIPANT_ID}>Leader view (preview)</option>
                  {workerPreviewOptions.length > 0 ? (
                    <optgroup label="Worker view — choose roster member">
                      {workerPreviewOptions.map((participant) => (
                        <option key={participant.id} value={participant.id}>
                          {participant.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
                {isStaffPreviewingLeader ? (
                  <span className="badge">Previewing leader view</span>
                ) : null}
                {isPreviewingParticipant ? (
                  <span className="badge">Previewing worker view</span>
                ) : null}
              </div>
            )}
          </div>

          <div className="tripDetailProgressRow">
            <div className="tripDetailProgressBlock">
              <div className="small tripDetailProgressLabel">Trip completion</div>
              <div className="progress"><div style={{ width: `${pct}%` }} /></div>
              <div className="small tripDetailProgressNote">{pct}% complete</div>
            </div>
            <div className="tripDetailMiniCard">
              <div className="small tripDetailMiniLabel">Next countdown</div>
              <div className="tripDetailMiniValue">{countdownSummary.label}</div>
              <div className="small">{countdownSummary.detail}</div>
            </div>
          </div>
        </div>

        <div className="tripOverviewHighlights" style={{ marginBottom: 14 }}>
        <div
          className="card pad"
          style={{
            background: "linear-gradient(180deg, rgba(234,242,255,.95), #ffffff 42%)",
            borderColor: "rgba(47,73,147,.22)",
            position: "relative",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "0 auto 0 0",
              width: 6,
              background: "linear-gradient(180deg, var(--primary), var(--primary2))",
            }}
          />
          <div className="row" style={{ marginBottom: 10, paddingLeft: 6 }}>
            <div>
              <div style={{ fontWeight: 900 }}>Announcements</div>
              <div className="small">Staff updates for this trip.</div>
            </div>
            <div className="spacer" />
            {canViewTeamDashboard && !isEditingAnnouncement ? (
              <button className="btn" type="button" onClick={handleStartAnnouncement}>
                Add Announcement
              </button>
            ) : null}
          </div>
          {isEditingAnnouncement ? (
            <div style={{ paddingLeft: 6 }}>
              <textarea
                className="input"
                rows={3}
                value={announcementDraft}
                onChange={(event) => setAnnouncementDraft(event.target.value)}
                placeholder="Share an update the team should see."
              />
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn btnPrimary" type="button" onClick={handleSaveAnnouncement}>
                  Save Announcement
                </button>
                <button className="btn" type="button" onClick={handleCancelAnnouncementEdit}>
                  Cancel
                </button>
                {editingAnnouncementId ? (
                  <button className="btn" type="button" onClick={handleDeleteAnnouncement}>
                    Delete
                  </button>
                ) : null}
                <AppStatusMessage
                  message={announcementStatus}
                  tone={
                    announcementStatus === "Saved."
                      ? "success"
                      : announcementStatus === "Saving..."
                        ? "info"
                        : "danger"
                  }
                  compact
                />
              </div>
            </div>
          ) : announcements.length > 0 ? (
            <div style={{ display: "grid", gap: 12, paddingLeft: 6 }}>
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "#ffffff",
                    border: "1px solid rgba(47,73,147,.12)",
                    boxShadow: "0 10px 20px rgba(47,73,147,.06)",
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{announcement.message}</div>
                  <div className="small" style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>
                      <strong>By:</strong> {announcement.authorName || announcement.authorEmail || "Unknown user"}
                    </span>
                    {announcement.updatedAt ? (
                      <span>
                        <strong>Updated:</strong> {formatNoteTimestamp(announcement.updatedAt)}
                      </span>
                    ) : null}
                  </div>
                  {canViewTeamDashboard ? (
                    <div className="row" style={{ marginTop: 10 }}>
                      <button className="btn" type="button" onClick={() => handleStartAnnouncement(announcement)}>
                        Edit
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="small" style={{ paddingLeft: 6 }}>
              {announcementsLoadError
                ? `Unable to load announcements: ${announcementsLoadError}`
                : "Updates from staff about this trip will appear here."}
            </div>
          )}
        </div>

      </div>

      <div className="tabs tripPageTabs appPolishToolbar" style={{ marginBottom: 14 }}>
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
          <div style={{ display: "grid", gap: 16 }}>
          <CollapsibleSection defaultOpen>
          <div className="cardSectionPill" style={{ marginBottom: 8 }}>
            Progress at a glance
          </div>
          <div className="small" style={{ marginBottom: 14, opacity: 0.88 }}>
            {staffViewAllParticipants
              ? "Task, training, fundraising, and reference completion."
              : canViewTeamDashboard
                ? "Task, training, and fundraising completion."
                : "Task, training, and fundraising. A note appears here after LST receives your reference."}
          </div>
          <div
            className="tripOverviewStatsGrid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <AppMetricCard
              label={overviewTaskLabel}
              value={`${overviewTaskPct}%`}
              detail={
                canViewTeamDashboard
                  ? "Combined completion across all participant task lists."
                  : "Your task completion progress for this trip."
              }
              tone={overviewTaskPct >= 80 ? "success" : overviewTaskPct >= 50 ? "info" : "warning"}
            />

            {staffViewAllParticipants && (
              <AppMetricCard
                label="Staff Tasks"
                value={`${completionPct}%`}
                detail={`${completedCount} of ${totalCount} staff tasks marked complete.`}
                tone={completionPct >= 80 ? "success" : completionPct >= 50 ? "info" : "warning"}
              />
            )}

            <AppMetricCard
              label={overviewTrainingLabel}
              value={`${overviewTrainingPct}%`}
              detail={
                canViewTeamDashboard
                  ? "Combined completion across all participant training checklists."
                  : "Your training completion progress for this trip."
              }
              tone={overviewTrainingPct >= 80 ? "success" : overviewTrainingPct >= 50 ? "info" : "warning"}
            />

            {!canViewTeamDashboard ? (
              <div className="card pad" style={{ borderRadius: 16 }}>
                <div className="small" style={{ marginBottom: 14 }}>{overviewFundraisingLabel}</div>
                {fundraisingGoalAmount ? (
                  <div style={{ fontSize: 28, fontWeight: 900 }}>{formatMoney(fundraisingGoalAmount)}</div>
                ) : (
                  <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>No Link</div>
                )}
                {workerOverviewFundraisingUrl ? (
                  <div style={{ marginTop: fundraisingGoalAmount ? 18 : 16 }}>
                    <a
                      className="btn btnPrimary"
                      href={workerOverviewFundraisingUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ padding: "10px 16px", fontSize: 14, alignSelf: "flex-start" }}
                    >
                      {isTeamFundraisingMode || trip?.teamFundraisingUrl
                        ? "Open shared Neon page"
                        : "Open Neon Page"}
                    </a>
                  </div>
                ) : null}
                <div className="small" style={{ marginTop: 12 }}>{overviewFundraisingDetail}</div>
              </div>
            ) : (
              <AppMetricCard
                label={overviewFundraisingLabel}
                value={overviewFundraisingValue}
                detail={overviewFundraisingDetail}
                tone={savedFundraisingLinksCount > 0 || trip?.teamFundraisingUrl ? "success" : "warning"}
              />
            )}

            {(staffViewAllParticipants || !canViewTeamDashboard) &&
            referenceReceivedProgress.showOnOverview ? (
              <AppMetricCard
                label={referenceReceivedProgress.label}
                value={`${referenceReceivedProgress.percent}%`}
                detail={
                  canViewTeamDashboard
                    ? `${referenceReceivedProgress.completed} of ${referenceReceivedProgress.total} received.`
                    : "Your LST reference has been received."
                }
                tone={referenceReceivedProgress.percent === 100 ? "success" : "info"}
              />
            ) : null}
          </div>
          </CollapsibleSection>

          <div
            className="tripOverviewMeetingsNotesTasksRow"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >
          <CollapsibleSection defaultOpen style={{ minWidth: 0 }}>
            <div
              className="card pad"
              style={{ border: "1px solid rgba(47,73,147,.12)", minWidth: 0 }}
            >
              <div className="cardSectionPill" style={{ marginBottom: 8 }}>Meetings</div>
              <div className="small" style={{ marginBottom: 12, color: "var(--muted)" }}>
                {canManageTripMeetings
                  ? "Upcoming and past meetings. Use Add meeting to schedule. After-meeting notes are only visible to staff and trip leaders."
                  : "Upcoming and past meetings for your team (date and time only)."}
              </div>
              {tripMeetingsLoadError ? (
                <div className="small" style={{ marginBottom: 12, color: "var(--danger)" }}>
                  {tripMeetingsLoadError} If this persists, contact your trip coordinator.
                </div>
              ) : null}
              {canManageTripMeetings && !meetingAddFormOpen && !editingMeetingId ? (
                <div style={{ marginBottom: 14 }}>
                  <button
                    type="button"
                    className="btn btnPrimary"
                    onClick={() => {
                      setMeetingAddFormOpen(true);
                      setEditingMeetingId("");
                      setMeetingDraft({ title: "", scheduledAt: "", notesAfter: "" });
                      setMeetingStatus("");
                    }}
                  >
                    Add meeting
                  </button>
                </div>
              ) : null}
              {canManageTripMeetings && (meetingAddFormOpen || editingMeetingId) ? (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    marginBottom: 16,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "#fafafa",
                  }}
                >
                  <input
                    className="input"
                    placeholder="Title (optional)"
                    value={meetingDraft.title}
                    onChange={(e) => setMeetingDraft((d) => ({ ...d, title: e.target.value }))}
                  />
                  <input
                    className="input"
                    type="datetime-local"
                    value={meetingDraft.scheduledAt}
                    onChange={(e) => setMeetingDraft((d) => ({ ...d, scheduledAt: e.target.value }))}
                  />
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Notes after the meeting"
                    value={meetingDraft.notesAfter}
                    onChange={(e) => setMeetingDraft((d) => ({ ...d, notesAfter: e.target.value }))}
                  />
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="btn btnPrimary" onClick={() => void handleSaveTripMeeting()}>
                      {editingMeetingId ? "Update meeting" : "Save meeting"}
                    </button>
                    {editingMeetingId ? (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setEditingMeetingId("");
                          setMeetingAddFormOpen(false);
                          setMeetingDraft({ title: "", scheduledAt: "", notesAfter: "" });
                          setMeetingStatus("");
                        }}
                      >
                        Cancel edit
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setMeetingAddFormOpen(false);
                          setMeetingDraft({ title: "", scheduledAt: "", notesAfter: "" });
                          setMeetingStatus("");
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <AppStatusMessage
                    message={meetingStatus}
                    tone={
                      meetingStatus === "Saved."
                        ? "success"
                        : meetingStatus === "Saving..."
                          ? "info"
                          : "danger"
                    }
                    compact
                  />
                </div>
              ) : null}
              <div style={{ marginBottom: 12 }}>
                <div
                  className="small"
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    lineHeight: 1.45,
                    marginBottom: 6,
                    color: "var(--foreground)",
                  }}
                >
                  Upcoming
                </div>
                {upcomingMeetings.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {upcomingMeetings.map((m) => (
                      <li key={m.id} style={{ marginBottom: 10 }}>
                        <div
                          className="small"
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            lineHeight: 1.45,
                            color: "var(--foreground)",
                          }}
                        >
                          {m.title || "Meeting"}
                        </div>
                        <div className="small" style={{ fontSize: 13, lineHeight: 1.45 }}>
                          {formatMeetingDateTime(m.scheduledAt)}
                        </div>
                        {m.isTrainingSession ? (
                          <div className="small" style={{ marginTop: 4, color: "var(--muted)", fontSize: 12, lineHeight: 1.45 }}>
                            Training session (date is set on the Training tab).
                          </div>
                        ) : null}
                        {canManageTripMeetings && !m.isTrainingSession ? (
                          <div className="row" style={{ gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => {
                                setMeetingAddFormOpen(true);
                                setEditingMeetingId(m.id);
                                setMeetingDraft({
                                  title: m.title,
                                  scheduledAt: toDatetimeLocalValue(m.scheduledAt),
                                  notesAfter: m.notesAfter || "",
                                });
                                setMeetingStatus("");
                              }}
                            >
                              Edit
                            </button>
                            {staffViewAllParticipants ? (
                              <button
                                type="button"
                                className="btn"
                                onClick={() => {
                                  if (typeof window !== "undefined" && !window.confirm("Remove this meeting?")) return;
                                  void deleteTripMeeting(m.id).then(() =>
                                    setTripMeetings((prev) => prev.filter((x) => x.id !== m.id))
                                  );
                                }}
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <AppEmptyState
                    title="No upcoming meetings"
                    description="Add the next team meeting so workers can see when the team meets next."
                  />
                )}
              </div>
              <div>
                <div
                  className="small"
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    lineHeight: 1.45,
                    marginBottom: 6,
                    color: "var(--foreground)",
                  }}
                >
                  Past
                </div>
                {pastMeetings.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {pastMeetings.map((m) => (
                      <li key={m.id} style={{ marginBottom: 10 }}>
                        <div
                          className="small"
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            lineHeight: 1.45,
                            color: "var(--foreground)",
                          }}
                        >
                          {m.title || "Meeting"}
                        </div>
                        <div className="small" style={{ fontSize: 13, lineHeight: 1.45 }}>
                          {formatMeetingDateTime(m.scheduledAt)}
                        </div>
                        {m.isTrainingSession ? (
                          <div className="small" style={{ marginTop: 4, color: "var(--muted)", fontSize: 12, lineHeight: 1.45 }}>
                            Training session (date is set on the Training tab).
                          </div>
                        ) : null}
                        {canManageTripMeetings && !m.isTrainingSession ? (
                          m.notesAfter ? (
                            <div
                              className="small"
                              style={{ marginTop: 4, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.45 }}
                            >
                              {m.notesAfter}
                            </div>
                          ) : (
                            <div
                              className="small"
                              style={{ marginTop: 4, color: "var(--muted)", fontSize: 13, lineHeight: 1.45 }}
                            >
                              No notes yet.
                            </div>
                          )
                        ) : null}
                        {canManageTripMeetings && !m.isTrainingSession ? (
                          <div className="row" style={{ gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => {
                                setMeetingAddFormOpen(true);
                                setEditingMeetingId(m.id);
                                setMeetingDraft({
                                  title: m.title,
                                  scheduledAt: toDatetimeLocalValue(m.scheduledAt),
                                  notesAfter: m.notesAfter || "",
                                });
                                setMeetingStatus("");
                              }}
                            >
                              Edit
                            </button>
                            {staffViewAllParticipants ? (
                              <button
                                type="button"
                                className="btn"
                                onClick={() => {
                                  if (typeof window !== "undefined" && !window.confirm("Remove this meeting?")) return;
                                  void deleteTripMeeting(m.id).then(() =>
                                    setTripMeetings((prev) => prev.filter((x) => x.id !== m.id))
                                  );
                                }}
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <AppEmptyState
                    title="No past meetings"
                    description="Past meetings and after-meeting notes will collect here once a meeting date has passed."
                  />
                )}
              </div>
            </div>
          </CollapsibleSection>

            {staffViewAllParticipants ? (
              <CollapsibleSection defaultOpen style={{ minWidth: 0 }}>
              <div className="card pad" style={{ minWidth: 0 }}>
                <div className="cardSectionPill" style={{ marginBottom: 8 }}>Trip notes</div>
                <div className="small" style={{ marginBottom: 6, opacity: 0.88 }}>
                  Internal context for staff and leaders.
                </div>
                <div className="small" style={{ marginBottom: 10 }}>
                  Put obvious context here, like why the trip was archived or major team changes.
                </div>
                {!isEditingOverviewNote ? (
                  <button className="btn" type="button" onClick={handleStartOverviewNote}>
                    Add Note
                  </button>
                ) : null}
                {isEditingOverviewNote ? (
                  <>
                    <textarea
                      className="input"
                      rows={4}
                      value={overviewNoteDraft}
                      onChange={(event) => setOverviewNoteDraft(event.target.value)}
                      placeholder="Example: Archived because multiple workers dropped from the team."
                    />
                    <div className="row" style={{ marginTop: 10 }}>
                      <button
                        className="btn btnPrimary"
                        type="button"
                        onClick={handleSaveOverviewNote}
                      >
                        Save Note
                      </button>
                      <button className="btn" type="button" onClick={handleCancelOverviewNoteEdit}>
                        Cancel
                      </button>
                      {editingOverviewNoteId ? (
                        <button className="btn" type="button" onClick={handleDeleteOverviewNote}>
                          Delete
                        </button>
                      ) : null}
                      <AppStatusMessage
                        message={overviewNoteStatus}
                        tone={
                          overviewNoteStatus === "Saved." || overviewNoteStatus === "Deleted."
                            ? "success"
                            : overviewNoteStatus === "Saving..." || overviewNoteStatus === "Deleting..."
                              ? "info"
                              : "danger"
                        }
                        compact
                      />
                    </div>
                  </>
                ) : null}
                <div style={{ display: "grid", gap: 12, marginTop: isEditingOverviewNote ? 14 : 12 }}>
                  {overviewNotes.map((note) => (
                    <div
                      key={note.id}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: "#f5f1ea",
                        border: "1px solid rgba(18, 16, 12, 0.08)",
                      }}
                    >
                      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{note.note}</div>
                      <div
                        className="small"
                        style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}
                      >
                        <span>
                          <strong>By:</strong>{" "}
                          {note.authorName || note.authorEmail || "Unknown user"}
                        </span>
                        {note.updatedAt ? (
                          <span>
                            <strong>Updated:</strong> {formatNoteTimestamp(note.updatedAt)}
                          </span>
                        ) : null}
                      </div>
                      <div className="row" style={{ marginTop: 10 }}>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => handleStartOverviewNote(note)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                  {!overviewNotes.length && !isEditingOverviewNote ? (
                    <AppEmptyState
                      title="No notes yet"
                      description="Use trip notes for context that leaders and staff should see later."
                    />
                  ) : null}
                </div>
              </div>
            </CollapsibleSection>
            ) : null}

          <CollapsibleSection defaultOpen style={{ minWidth: 0 }}>
            <div className="card pad" style={{ minWidth: 0 }}>
              <div className="cardSectionPill">
                {staffViewAllParticipants ? "My upcoming staff tasks" : "My upcoming tasks"}
              </div>
              <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
                Shortcuts to the next due items.
              </div>
              {overviewUpcomingTasks.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {overviewUpcomingTasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        paddingBottom: 10,
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {canViewTeamDashboard ? (
                        <button
                          type="button"
                          onClick={() => handleJumpToStaffTask(task.id)}
                          className="overviewTaskJumpButton"
                        >
                          {task.title}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleJumpToOverviewItem(task)}
                          className="overviewTaskJumpButton"
                        >
                          {task.title}
                        </button>
                      )}
                      <div className="small">
                        {task.dueDate
                          ? `Due ${formatSingleDate(task.dueDate)}`
                          : "Due when ready"}
                      </div>
                      {task.link || task.openTripDocumentsTab ? (
                        <AppDetailAction
                          href={task.openTripDocumentsTab || task.openDocumentsTab ? undefined : task.link}
                          onClick={
                            task.openTripDocumentsTab
                              ? () => setTab(tripDocumentsTabLabel)
                              : task.openDocumentsTab
                                ? () => setTab(participantDocumentsTabLabel)
                                : undefined
                          }
                          compact
                        >
                          View details
                        </AppDetailAction>
                      ) : null}
                      {task.details && !task.link ? (
                        <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>{task.details}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <AppEmptyState
                  title="Nothing urgent right now"
                  description={
                    canViewTeamDashboard
                      ? "No upcoming staff tasks are assigned to you right now."
                      : "No upcoming worker tasks are assigned to you right now."
                  }
                />
              )}
            </div>
            </CollapsibleSection>

          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {staffViewAllParticipants ? (
              <CollapsibleSection defaultOpen style={{ gridColumn: "1 / -1" }}>
                {renderTripSetupCard()}
              </CollapsibleSection>
            ) : null}

            {canViewTeamDashboard ? (
              <CollapsibleSection defaultOpen style={{ gridColumn: "1 / -1" }}>
              <div className="card pad">
                <div className="cardSectionPill">Recent activity</div>
                <div className="small" style={{ marginBottom: 10, opacity: 0.88 }}>
                  Latest updates on this trip.
                </div>
                <div className="row" style={{ marginBottom: 10 }}>
                  <div className="spacer" />
                  <Link href={`/trips/${encodeURIComponent(trip.id)}/activity`} className="small">
                    See more
                  </Link>
                </div>
                {recentActivityError ? (
                  <div className="small" style={{ color: "var(--danger)" }}>
                    {recentActivityError}
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {recentActivity.map((entry) => (
                      <div
                        key={entry.id}
                        style={{ paddingBottom: 10, borderBottom: "1px solid var(--border)" }}
                      >
                        <div style={{ lineHeight: 1.4 }}>{entry.message}</div>
                        <div className="small" style={{ marginTop: 4 }}>
                          {formatRecentActivityTimestamp(entry.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <AppEmptyState
                    title="No recent activity yet"
                    description="Trip updates, edits, and workflow activity will start showing here once the team is active."
                  />
                )}
              </div>
              </CollapsibleSection>
            ) : null}
          </div>
          </div>
        )}

      {tab === "Team" && (
        <div style={{ display: "grid", gap: 16 }}>
          <CollapsibleSection defaultOpen>
          <div className="card pad">
            <div className="row" style={{ marginBottom: 8, alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div className="cardSectionPill" style={{ marginBottom: 0, flexShrink: 0 }}>Roster</div>
              <div className="spacer" />
              {workerAddStatus ? (
                <div className="small" style={{ alignSelf: "center", marginRight: 8 }}>
                  {workerAddStatus}
                </div>
              ) : null}
              {rosterStatus ? (
                <div className="small" style={{ alignSelf: "center", marginRight: 8 }}>
                  {rosterStatus}
                </div>
              ) : null}
              {staffViewAllParticipants && !isEditingRoster && !isAddingWorker ? (
                <>
                  <button className="btn" type="button" onClick={handleStartAddWorker}>
                    Add Worker
                  </button>
                  <button className="btn" type="button" onClick={handleStartRosterEdit}>
                    Edit Roster
                  </button>
                </>
              ) : null}
            </div>
            <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
              {staffViewAllParticipants
                ? "Members, account status, invites, and T-shirt sizes (per person on the roster)."
                : "Everyone on the team can see this roster, including names and emails. Use the T-shirt column to set your own size. Contact your leader or staff for other roster changes."}
            </div>

            {staffViewAllParticipants && isAddingWorker ? (
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  padding: 12,
                  marginBottom: 12,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "#fff",
                }}
              >
                <div className="small">
                  Add a worker to this team with name and email. You can leave them unassigned or assign them to this trip now.
                </div>
                <div
                  className="tripMobileFormGrid"
                  style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}
                >
                  <input
                    className="input"
                    value={newWorkerDraft.firstName}
                    onChange={(event) => updateNewWorkerDraft("firstName", event.target.value)}
                    placeholder="First name"
                  />
                  <input
                    className="input"
                    value={newWorkerDraft.lastName}
                    onChange={(event) => updateNewWorkerDraft("lastName", event.target.value)}
                    placeholder="Last name"
                  />
                  <input
                    className="input"
                    type="email"
                    value={newWorkerDraft.email}
                    onChange={(event) => updateNewWorkerDraft("email", event.target.value)}
                    placeholder="worker@email.com"
                  />
                  <select
                    className="input"
                    value={newWorkerDraft.teamRole}
                    onChange={(event) => {
                      const v = event.target.value;
                      setNewWorkerDraft((current) => ({
                        ...current,
                        teamRole: v,
                        travelsWithTeam:
                          String(v).trim().toLowerCase() === "leader"
                            ? current.travelsWithTeam !== false
                            : true,
                      }));
                    }}
                  >
                    {TEAM_MEMBER_ROLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {String(newWorkerDraft.teamRole || "").trim().toLowerCase() === "leader" ? (
                    <label className="row" style={{ gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={newWorkerDraft.travelsWithTeam !== false}
                        onChange={(event) => updateNewWorkerDraft("travelsWithTeam", event.target.checked)}
                      />
                      <span className="small">Traveling with team</span>
                    </label>
                  ) : null}
                  <select
                    className="input"
                    value={newWorkerDraft.assignmentMode}
                    onChange={(event) => updateNewWorkerDraft("assignmentMode", event.target.value)}
                  >
                    <option value="unassigned">Leave Unassigned</option>
                    <option value="assigned">Assign To This Trip</option>
                  </select>
                </div>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btnPrimary" type="button" onClick={handleAddWorkerToTrip}>
                    Save Worker
                  </button>
                  <button className="btn" type="button" onClick={handleCancelAddWorker}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {staffViewAllParticipants && isEditingRoster ? (
              <div style={{ display: "grid", gap: 12 }}>
                {rosterDraft.map((member, index) => (
                  <div
                    key={member.id || `draft-${index}`}
                    className="tripMobileFormGrid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: 10,
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                      background: "#fff",
                    }}
                  >
                    <input
                      className="input"
                      value={member.firstName || ""}
                      placeholder="First name"
                      onChange={(event) => updateRosterDraftMember(index, "firstName", event.target.value)}
                    />
                    <input
                      className="input"
                      value={member.lastName || ""}
                      placeholder="Last name"
                      onChange={(event) => updateRosterDraftMember(index, "lastName", event.target.value)}
                    />
                    <input
                      className="input"
                      type="email"
                      value={member.email || ""}
                      placeholder="Email"
                      onChange={(event) => updateRosterDraftMember(index, "email", event.target.value)}
                    />
                    <select
                      className="input"
                      value={normalizeLegacyTeamRole(member.teamRole || "Worker")}
                      onChange={(event) => {
                        const v = event.target.value;
                        setRosterDraft((current) =>
                          current.map((row, memberIndex) =>
                            memberIndex === index
                              ? {
                                  ...row,
                                  teamRole: v,
                                  travelsWithTeam:
                                    String(v).trim().toLowerCase() === "leader"
                                      ? row.travelsWithTeam !== false
                                      : true,
                                }
                              : row
                          )
                        );
                      }}
                    >
                      {TEAM_MEMBER_ROLE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    {String(normalizeLegacyTeamRole(member.teamRole || "")).trim().toLowerCase() ===
                    "leader" ? (
                      <label className="row" style={{ gap: 8, alignItems: "center", gridColumn: "1 / -1" }}>
                        <input
                          type="checkbox"
                          checked={member.travelsWithTeam !== false}
                          onChange={(event) =>
                            updateRosterDraftMember(index, "travelsWithTeam", event.target.checked)
                          }
                        />
                        <span className="small">Traveling with team</span>
                      </label>
                    ) : null}
                    <RosterTshirtSizeSelect
                      value={member.tshirtSize || ""}
                      onChange={(event) =>
                        updateRosterDraftMember(index, "tshirtSize", event.target.value)
                      }
                    />
                    <input
                      className="input"
                      type="date"
                      value={member.startDate || ""}
                      onChange={(event) => updateRosterDraftMember(index, "startDate", event.target.value)}
                    />
                    <input
                      className="input"
                      type="date"
                      value={member.endDate || ""}
                      onChange={(event) => updateRosterDraftMember(index, "endDate", event.target.value)}
                    />
                    <button className="btn" type="button" onClick={() => handleRemoveRosterMember(index)}>
                      Remove
                    </button>
                  </div>
                ))}

                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <button className="btn" type="button" onClick={handleAddRosterMember}>
                    Add Worker
                  </button>
                  <button className="btn btnPrimary" type="button" onClick={handleSaveRoster}>
                    Save Roster
                  </button>
                  <button className="btn" type="button" onClick={handleCancelRosterEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <table className="table dataTableStriped">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Traveling</th>
                    <th>T-shirt</th>
                    <th>Account</th>
                    <th>Email</th>
                    <th>Project Dates</th>
                    {staffViewAllParticipants ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {teamTabMembers.length > 0 ? (
                    teamTabMembers.map((member) => {
                      const connectionStatus = getWorkerConnectionStatus(member);

                      return (
                      <tr key={member.key}>
                        <td style={{ fontWeight: 800 }}>
                          {canViewTeamDashboard && member.profileId ? (
                            <Link href={`/profile?participantId=${encodeURIComponent(member.profileId)}`}>
                              {member.name}
                            </Link>
                          ) : (
                            member.name
                          )}
                        </td>
                        <td>{normalizeLegacyTeamRole(member.teamRole || member.role || "Worker")}</td>
                        <td className="small">
                          {String(member.teamRole || member.role || "").trim().toLowerCase() === "leader"
                            ? member.travelsWithTeam === false
                              ? "No"
                              : "Yes"
                            : "—"}
                        </td>
                        <td style={{ minWidth: 108, maxWidth: 140, verticalAlign: "middle" }}>
                          {canEditRosterTshirtInline(member) ? (
                            <RosterTshirtSizeSelect
                              aria-label={`T-shirt size for ${member.name || member.email || "member"}`}
                              className="input"
                              disabled={inlineTshirtSavingKey === member.key}
                              value={member.tshirtSize || ""}
                              onChange={(event) =>
                                void handleInlineRosterTshirtChange(member, event.target.value)
                              }
                              style={{
                                minHeight: 38,
                                padding: "6px 8px",
                                fontSize: 13,
                                borderRadius: 10,
                              }}
                            />
                          ) : (
                            <span className="small">{member.tshirtSize?.trim() || "—"}</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${connectionStatus.accountBadgeClass}`.trim()}>
                            {connectionStatus.accountLabel}
                          </span>
                        </td>
                        <td>
                          {String(member.email || "").trim() ? (
                            <a href={`mailto:${String(member.email).trim()}`}>{member.email}</a>
                          ) : (
                            "Not set"
                          )}
                        </td>
                        <td>{formatTripDateRange(member.startDate, member.endDate)}</td>
                        {staffViewAllParticipants ? (
                          <td>
                            <button
                              className="btn"
                              type="button"
                              onClick={() => void handleInviteWorker(member)}
                              disabled={!connectionStatus.canInvite || invitingWorkerEmail === normalizeEmail(member.email)}
                              title={connectionStatus.inviteTitle}
                              style={!connectionStatus.canInvite ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
                            >
                              {invitingWorkerEmail === normalizeEmail(member.email)
                                ? "Sending..."
                                : connectionStatus.inviteLabel}
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    )})
                  ) : (
                    <tr>
                      <td colSpan={staffViewAllParticipants ? 8 : 7} className="small">
                        No workers added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          </CollapsibleSection>

          {canViewTripReferenceSection && (
            <CollapsibleSection defaultOpen>
            <div className="card pad tripSectionCard">
              <div className="cardSectionPill" style={{ marginBottom: 10 }}>Reference emails</div>
              <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
                {canEditTripReferenceEmails
                  ? "Track reference contacts and sent/received status."
                  : "Team reference tracking (read-only). Ask staff to update rows."}
              </div>
              <table className="table dataTableStriped">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Reference Contact</th>
                    <th>Reference Email Sent</th>
                    <th>Date Sent</th>
                    <th>Reference Email Received</th>
                  </tr>
                </thead>
                <tbody>
                  {referenceTableRows.map((refRow) => {
                    const referenceStatus = getReferenceStatus(refRow.refKey);
                    const referenceSaveStatus = referenceSaveStatusByKey[refRow.refKey];

                    return (
                      <tr key={refRow.refKey}>
                        <td style={{ fontWeight: 800 }}>
                          <div>{refRow.displayName}</div>
                          {canEditTripReferenceEmails && referenceSaveStatus ? (
                            <div className="small" style={{ marginTop: 4 }}>
                              {referenceSaveStatus.type === "error" ? (
                                <span style={{ color: "var(--danger)" }}>
                                  {referenceSaveStatus.message}
                                </span>
                              ) : (
                                <span style={{ color: "var(--muted)" }}>
                                  {referenceSaveStatus.message}
                                </span>
                              )}
                              {referenceSaveStatus.type === "error" ? (
                                <button
                                  className="btn"
                                  type="button"
                                  style={{ marginLeft: 8, padding: "2px 8px", fontSize: 12 }}
                                  onClick={() => retryReferenceSave(refRow.refKey)}
                                >
                                  Retry
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                        <td style={{ minWidth: 260 }}>
                          {canEditTripReferenceEmails ? (
                            <div style={{ display: "grid", gap: 8 }}>
                              <input
                                className="input"
                                value={referenceStatus.referenceName || ""}
                                placeholder="Reference name"
                                onChange={(e) =>
                                  updateReferenceField(
                                    refRow.refKey,
                                    "referenceName",
                                    e.target.value
                                  )
                                }
                              />
                              <input
                                className="input"
                                type="email"
                                value={referenceStatus.referenceEmail || ""}
                                placeholder="Reference email"
                                onChange={(e) =>
                                  updateReferenceField(
                                    refRow.refKey,
                                    "referenceEmail",
                                    e.target.value
                                  )
                                }
                              />
                              <input
                                className="input"
                                type="tel"
                                value={referenceStatus.referencePhone || ""}
                                placeholder="Reference phone"
                                onChange={(e) =>
                                  updateReferenceField(
                                    refRow.refKey,
                                    "referencePhone",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          ) : (
                            <div className="small" style={{ display: "grid", gap: 6 }}>
                              <div>
                                <span style={{ color: "var(--muted)" }}>Reference name:</span>{" "}
                                {String(referenceStatus.referenceName || "").trim() || "—"}
                              </div>
                              <div>
                                <span style={{ color: "var(--muted)" }}>Email:</span>{" "}
                                {String(referenceStatus.referenceEmail || "").trim() ? (
                                  <a
                                    href={`mailto:${String(referenceStatus.referenceEmail || "").trim()}`}
                                  >
                                    {String(referenceStatus.referenceEmail || "").trim()}
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </div>
                              <div>
                                <span style={{ color: "var(--muted)" }}>Phone:</span>{" "}
                                {String(referenceStatus.referencePhone || "").trim() || "—"}
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          {canEditTripReferenceEmails ? (
                            <label
                              className="row"
                              style={{ gap: 8, alignItems: "center", cursor: "pointer" }}
                            >
                              <input
                                type="checkbox"
                                checked={!!referenceStatus.sent}
                                onChange={() => toggleReferenceEmail(refRow.refKey, "sent")}
                              />
                              <span className={"badge " + (referenceStatus.sent ? "badgeSuccess" : "")}>
                                {referenceStatus.sent ? "Sent" : "Not sent"}
                              </span>
                            </label>
                          ) : (
                            <span className={"badge " + (referenceStatus.sent ? "badgeSuccess" : "")}>
                              {referenceStatus.sent ? "Sent" : "Not sent"}
                            </span>
                          )}
                        </td>
                        <td>
                          {canEditTripReferenceEmails ? (
                            <input
                              className="input"
                              type="date"
                              value={referenceStatus.sentDate || ""}
                              onChange={(e) =>
                                updateReferenceSentDate(refRow.refKey, e.target.value)
                              }
                            />
                          ) : (
                            <span className="small">{referenceStatus.sentDate?.trim() || "—"}</span>
                          )}
                        </td>
                        <td>
                          {canEditTripReferenceEmails ? (
                            <label
                              className="row"
                              style={{ gap: 8, alignItems: "center", cursor: "pointer" }}
                            >
                              <input
                                type="checkbox"
                                checked={!!referenceStatus.received}
                                onChange={() =>
                                  toggleReferenceEmail(refRow.refKey, "received")
                                }
                              />
                              <span
                                className={
                                  "badge " + (referenceStatus.received ? "badgeSuccess" : "")
                                }
                              >
                                {referenceStatus.received ? "Received" : "Not received"}
                              </span>
                            </label>
                          ) : (
                            <span
                              className={
                                "badge " + (referenceStatus.received ? "badgeSuccess" : "")
                              }
                            >
                              {referenceStatus.received ? "Received" : "Not received"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </CollapsibleSection>
          )}
        </div>
      )}

      {tab === tripTabTravelSafety && (
        <div style={{ display: "grid", gap: 16 }}>
          {trip?.id ? (
            <TripTravelSafetySection
              tripId={trip.id}
              session={session}
              participants={trip.participants || []}
              teamMembers={trip.teamMembers || []}
              canEdit={staffViewAllParticipants && !isPreviewingParticipant}
              isPreviewingParticipant={isPreviewingParticipant}
            />
          ) : null}
        </div>
      )}

      {tab === "Fundraising" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            <div
              className="card pad"
              style={{
                boxShadow: "none",
                background: "linear-gradient(180deg, rgba(250,245,220,.78), #fff 55%)",
                borderColor: "rgba(180,140,40,.22)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                minHeight: 176,
              }}
            >
              <div className="cardSectionPill" style={{ marginBottom: 2 }}>
                90 days before departure
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" }}>
                {formatMoney(fundraisingFirstDeadlineAmount)}
              </div>
              <div className="small" style={{ opacity: 0.9 }}>
                Target raised by{" "}
                <strong>{formatDeadlineDate(fundraisingFirstDeadlineDate)}</strong>
                {!trip?.startDate ? (
                  <span style={{ color: "var(--muted)" }}>
                    {" "}
                    — add a trip start date on the trip to calculate this deadline.
                  </span>
                ) : null}
              </div>
              <div className="small" style={{ opacity: 0.78, marginTop: "auto", lineHeight: 1.45 }}>
                {canViewTeamDashboard
                  ? `First milestone for the team (${countForDeadlines} worker${
                      countForDeadlines === 1 ? "" : "s"
                    }): typically $2,000 per person toward the trip goal, not more than the total goal.`
                  : "First slice of your trip goal is usually due by this date (often $2,000 toward your full amount)."}
              </div>
            </div>
            <div
              className="card pad"
              style={{
                boxShadow: "none",
                background: "linear-gradient(180deg, rgba(232,245,232,.78), #fff 55%)",
                borderColor: "rgba(50,120,70,.18)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                minHeight: 176,
              }}
            >
              <div className="cardSectionPill" style={{ marginBottom: 2 }}>
                30 days before departure
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" }}>
                {formatMoney(fundraisingSecondDeadlineAmount)}
              </div>
              <div className="small" style={{ opacity: 0.9 }}>
                Remaining goal due by{" "}
                <strong>{formatDeadlineDate(fundraisingSecondDeadlineDate)}</strong>
                {!trip?.startDate ? (
                  <span style={{ color: "var(--muted)" }}>
                    {" "}
                    — add a trip start date on the trip to calculate this deadline.
                  </span>
                ) : null}
              </div>
              <div className="small" style={{ opacity: 0.78, marginTop: "auto", lineHeight: 1.45 }}>
                {fundraisingSecondDeadlineAmount > 0
                  ? "The rest of the fundraising goal should be covered before this date."
                  : "If your total goal matches the first milestone, there is no separate 30-day balance."}
              </div>
            </div>
            <div
              className="card pad"
              style={{
                boxShadow: "none",
                background: "linear-gradient(180deg, rgba(234,242,255,.88), #fff 55%)",
                borderColor: "rgba(47,73,147,.2)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                justifyContent: "space-between",
                minHeight: 176,
              }}
            >
              <div>
                <div className="cardSectionPill" style={{ marginBottom: 6 }}>Resources</div>
                <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 6 }}>
                  Fundraising guides and tools
                </div>
                <div className="small" style={{ opacity: 0.88, lineHeight: 1.45 }}>
                  LST handouts, Neon tips, and training references for workers and leaders.
                </div>
              </div>
              <a
                className="btn btnPrimary"
                href="https://lst.org/projects/general-financial-information/"
                target="_blank"
                rel="noreferrer noopener"
                style={{ alignSelf: "flex-start" }}
              >
                General financial information
              </a>
            </div>
          </div>

          <CollapsibleSection defaultOpen>
          <div className="card pad">
            <div className="cardSectionPill" style={{ marginBottom: 8 }}>
              {canViewTeamDashboard ? "Fundraising pages" : "My fundraising"}
            </div>
            <div className="small" style={{ marginBottom: 14, opacity: 0.88 }}>
              {canViewTeamDashboard
                ? canManageTripFundraising
                  ? "Choose individual Neon pages or one team/family campaign, then manage links."
                  : "View everyone's Neon pages and progress. Staff configure trip fundraising setup and edit links."
                : isTeamFundraisingMode
                  ? "Shared fundraising for your family or team."
                  : "Your Neon fundraising page and team updates."}
            </div>

            {!canViewTeamDashboard && (isTeamFundraisingMode || trip?.teamFundraisingUrl) ? (
              <div
                className="card pad"
                style={{
                  boxShadow: "none",
                  marginBottom: 14,
                  background: "linear-gradient(180deg, rgba(234,242,255,.85), rgba(255,255,255,1) 65%)",
                  borderColor: "rgba(47,73,147,.22)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div className="cardSectionPill" style={{ marginBottom: 4 }}>
                  {isTeamFundraisingMode ? "Family / team fundraising" : "Team Page"}
                </div>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>
                  {isTeamFundraisingMode
                    ? "Shared fundraising page for your family or team"
                    : "Shared Team Fundraising Page"}
                </div>
                {trip.teamFundraisingUrl ? (
                  <a
                    className="btn btnPrimary"
                    href={trip.teamFundraisingUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: "10px 16px", fontSize: 14, alignSelf: "flex-start" }}
                  >
                    Open shared Neon page
                  </a>
                ) : (
                  <div className="small" style={{ color: "var(--muted)" }}>
                    Your leader hasn&apos;t added the shared Neon link yet. Check back soon or ask your team
                    contact.
                  </div>
                )}
              </div>
            ) : null}

            {canManageTripFundraising && (
              <div
                className="card pad"
                style={{
                  boxShadow: "none",
                  marginBottom: 14,
                  background: "linear-gradient(180deg, rgba(234,242,255,.85), rgba(255,255,255,1) 65%)",
                  borderColor: "rgba(47,73,147,.22)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div className="cardSectionPill" style={{ marginBottom: 4 }}>Fundraising setup</div>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>
                  Individual vs family / team fundraising
                </div>
                <div className="small" style={{ opacity: 0.9, lineHeight: 1.45 }}>
                  Most teams use individual Neon pages. Choose team/family when everyone shares one campaign and one
                  trip goal.
                </div>
                {!isEditingTeamFundraising ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div className="small">
                      <strong>Current:</strong>{" "}
                      {trip.fundraisingMode === "team"
                        ? "Team / family — one shared Neon link and trip fundraising goal."
                        : "Individual — each worker has their own Neon page (default)."}
                    </div>
                    <div className="small">
                      <strong>Trip goal:</strong> {formatMoney(Number(trip.fundraisingGoalAmount || 0))}
                    </div>
                    {trip.teamFundraisingUrl ? (
                      <a className="btn" href={trip.teamFundraisingUrl} target="_blank" rel="noreferrer">
                        Open shared Neon page
                      </a>
                    ) : trip.fundraisingMode === "team" ? (
                      <div className="small" style={{ color: "var(--danger)" }}>
                        Team mode is on — add a shared Neon link in Edit setup.
                      </div>
                    ) : null}
                    <div className="row">
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setIsEditingTeamFundraising(true);
                          setTeamFundraisingStatus("");
                          setTeamFundraisingDraft({
                            teamFundraisingUrl: trip.teamFundraisingUrl || "",
                            fundraisingMode: trip.fundraisingMode === "team" ? "team" : "individual",
                            fundraisingGoalAmount:
                              trip.fundraisingGoalAmount != null && trip.fundraisingGoalAmount !== ""
                                ? String(trip.fundraisingGoalAmount)
                                : "",
                          });
                        }}
                      >
                        Edit setup
                      </button>
                      {teamFundraisingStatus ? (
                        <div className="small" style={{ alignSelf: "center" }}>
                          {teamFundraisingStatus}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <div className="small" style={{ marginBottom: 8, fontWeight: 700 }}>
                        How is this trip fundraising?
                      </div>
                      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <input
                          type="radio"
                          name="fundraisingMode"
                          checked={teamFundraisingDraft.fundraisingMode !== "team"}
                          onChange={() =>
                            setTeamFundraisingDraft((c) => ({ ...c, fundraisingMode: "individual" }))
                          }
                        />
                        <span className="small">
                          Individual — each worker has their own Neon link (most common)
                        </span>
                      </label>
                      <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <input
                          type="radio"
                          name="fundraisingMode"
                          checked={teamFundraisingDraft.fundraisingMode === "team"}
                          onChange={() =>
                            setTeamFundraisingDraft((c) => ({ ...c, fundraisingMode: "team" }))
                          }
                        />
                        <span className="small">
                          Team / family — one shared Neon link and one trip goal for everyone (e.g. one family
                          campaign)
                        </span>
                      </label>
                    </div>
                    <div>
                      <div className="small" style={{ marginBottom: 6 }}>
                        {teamFundraisingDraft.fundraisingMode === "team"
                          ? "Shared Neon link (required for team mode)"
                          : "Optional shared Neon link"}
                      </div>
                      <input
                        className="input"
                        value={teamFundraisingDraft.teamFundraisingUrl}
                        onChange={(event) =>
                          setTeamFundraisingDraft((current) => ({
                            ...current,
                            teamFundraisingUrl: event.target.value,
                          }))
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <div className="small" style={{ marginBottom: 6 }}>Trip fundraising goal (dollars)</div>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="1"
                        value={teamFundraisingDraft.fundraisingGoalAmount}
                        onChange={(event) =>
                          setTeamFundraisingDraft((current) => ({
                            ...current,
                            fundraisingGoalAmount: event.target.value,
                          }))
                        }
                        placeholder="e.g. 5000"
                      />
                    </div>
                    <div className="row">
                      <button className="btn btnPrimary" type="button" onClick={handleSaveTeamFundraising}>
                        Save setup
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setIsEditingTeamFundraising(false);
                          setTeamFundraisingStatus("");
                          setTeamFundraisingDraft({
                            teamFundraisingUrl: trip.teamFundraisingUrl || "",
                            fundraisingMode: trip.fundraisingMode === "team" ? "team" : "individual",
                            fundraisingGoalAmount:
                              trip.fundraisingGoalAmount != null && trip.fundraisingGoalAmount !== ""
                                ? String(trip.fundraisingGoalAmount)
                                : "",
                          });
                        }}
                      >
                        Cancel
                      </button>
                      {teamFundraisingStatus ? (
                        <div className="small" style={{ alignSelf: "center" }}>
                          {teamFundraisingStatus}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}

            {canViewTeamDashboard && isTeamFundraisingMode ? (
              <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
                Team/family mode: workers only see the shared Neon link above. Per-person links below are optional
                (e.g. exceptions).
              </div>
            ) : null}
            {!canViewTeamDashboard && isTeamFundraisingMode ? (
              <div className="small" style={{ marginTop: 4 }}>
                This trip uses one shared fundraising page for the whole family or team — personal Neon tiles are
                hidden. Use the shared link above.
              </div>
            ) : visibleFundraisingParticipants.length === 0 ? (
              <div className="small">
                {canViewTeamDashboard
                  ? "No per-person fundraising tiles to show yet. Leaders not traveling with the team are omitted."
                  : "No fundraising record found for this login."}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: canViewTeamDashboard
                    ? "repeat(auto-fit, minmax(220px, 1fr))"
                    : "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: canViewTeamDashboard ? 16 : 12,
                }}
              >
                {visibleFundraisingParticipants.map((participant) => {
                  const isEditingParticipantLink =
                    editingParticipantFundraisingId === participant.id;
                  const fundraisingProgressMeta = getFundraisingProgressMeta(participant);
                  const canEditParticipantFundraising =
                    canManageTripFundraising &&
                    canViewTeamDashboard &&
                    (!participant.rosterOnly || !!participant.tripTeamMemberId);
                  return (
                    <div
                      key={participant.id || participant.email}
                      className="card pad"
                      style={{
                        boxShadow: "none",
                        minHeight: canViewTeamDashboard ? 220 : 136,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        background: "linear-gradient(180deg, rgba(234,242,255,.65), #ffffff 40%)",
                        borderColor: "rgba(47,73,147,.14)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: "0 auto auto 0",
                          width: "100%",
                          height: 5,
                          background: "linear-gradient(90deg, var(--primary), var(--primary2))",
                        }}
                      />
                      <div>
                        <div className="row" style={{ alignItems: "flex-start", marginBottom: 10 }}>
                          <div
                            style={{
                              fontWeight: 900,
                              fontSize: canViewTeamDashboard ? 18 : 15,
                              lineHeight: 1.2,
                            }}
                          >
                            {participant.name}
                          </div>
                          <div className="spacer" />
                          <span className={"badge " + fundraisingProgressMeta.badgeClass}>
                            {fundraisingProgressMeta.label}
                          </span>
                        </div>
                        <div className="small" style={{ marginBottom: 8 }}>
                          {fundraisingProgressMeta.helperText}
                        </div>
                        <div className="small" style={{ marginBottom: 12, color: "var(--muted)" }}>
                          {fundraisingProgressMeta.goalLine}
                        </div>
                      </div>
                      <div>
                        {participant.fundraisingUrl ? (
                          <a className="btn btnPrimary" href={participant.fundraisingUrl} target="_blank" rel="noreferrer">
                            Open Neon Page
                          </a>
                        ) : null}
                      </div>
                      {canEditParticipantFundraising && (
                        <>
                          <div style={{ height: 12 }} />
                          {!isEditingParticipantLink ? (
                            <div className="row">
                              <button
                                className="btn"
                                type="button"
                                onClick={() => {
                                  setEditingParticipantFundraisingId(participant.id);
                                  setFundraisingStatus((current) => ({
                                    ...current,
                                    [participant.id]: undefined,
                                  }));
                                  setFundraisingDrafts((current) => ({
                                    ...current,
                                    [participant.id]: {
                                      fundraisingUrl: participant.fundraisingUrl || "",
                                      fundraisingGoalAmount:
                                        participant.fundraisingGoalAmount != null &&
                                        participant.fundraisingGoalAmount !== ""
                                          ? String(participant.fundraisingGoalAmount)
                                          : "",
                                    },
                                  }));
                                }}
                              >
                                {participant.fundraisingUrl ? "Edit link & goal" : "Add link & goal"}
                              </button>
                              {fundraisingStatus[participant.id]?.message ? (
                                <div
                                  className="small"
                                  style={{
                                    alignSelf: "center",
                                    color:
                                      fundraisingStatus[participant.id].type === "error"
                                        ? "var(--danger)"
                                        : "var(--muted)",
                                  }}
                                >
                                  {fundraisingStatus[participant.id].message}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div style={{ display: "grid", gap: 10 }}>
                              <div>
                                <div className="small" style={{ marginBottom: 6 }}>Neon Fundraising Link</div>
                                <input
                                  className="input"
                                  value={fundraisingDrafts[participant.id]?.fundraisingUrl || ""}
                                  onChange={(event) =>
                                    updateFundraisingDraft(participant.id, "fundraisingUrl", event.target.value)
                                  }
                                  placeholder="https://"
                                />
                              </div>
                              <div>
                                <div className="small" style={{ marginBottom: 6 }}>
                                  Individual goal (USD, optional)
                                </div>
                                <input
                                  className="input"
                                  type="text"
                                  inputMode="decimal"
                                  disabled={!participant.tripTeamMemberId}
                                  title={
                                    !participant.tripTeamMemberId
                                      ? "Add this worker to the trip roster (Team tab) to store a per-person goal."
                                      : undefined
                                  }
                                  value={fundraisingDrafts[participant.id]?.fundraisingGoalAmount || ""}
                                  onChange={(event) =>
                                    updateFundraisingDraft(
                                      participant.id,
                                      "fundraisingGoalAmount",
                                      event.target.value
                                    )
                                  }
                                  placeholder={
                                    trip?.fundraisingGoalAmount != null &&
                                    trip.fundraisingGoalAmount !== "" &&
                                    Number(trip.fundraisingGoalAmount) > 0
                                      ? `Trip default: ${trip.fundraisingGoalAmount}`
                                      : "e.g. 2000"
                                  }
                                />
                                {!participant.tripTeamMemberId ? (
                                  <div className="small" style={{ marginTop: 6, color: "var(--muted)" }}>
                                    Per-person goals are saved on the roster. Add them on the Team tab first.
                                  </div>
                                ) : null}
                              </div>
                              {fundraisingStatus[participant.id]?.message && (
                                <div
                                  className="small"
                                  style={{
                                    color:
                                      fundraisingStatus[participant.id].type === "error"
                                        ? "var(--danger)"
                                        : "var(--muted)",
                                  }}
                                >
                                  {fundraisingStatus[participant.id].message}
                                </div>
                              )}
                              <div className="row">
                                <button
                                  className="btn"
                                  type="button"
                                  onClick={() => handleSaveFundraising(participant)}
                                >
                                  {participant.tripTeamMemberId ? "Save link & goal" : "Save Neon link"}
                                </button>
                                <button
                                  className="btn"
                                  type="button"
                                  onClick={() => {
                                    setEditingParticipantFundraisingId("");
                                    setFundraisingStatus((current) => ({
                                      ...current,
                                      [participant.id]: undefined,
                                    }));
                                    setFundraisingDrafts((current) => ({
                                      ...current,
                                      [participant.id]: {
                                        fundraisingUrl: participant.fundraisingUrl || "",
                                        fundraisingGoalAmount:
                                          participant.fundraisingGoalAmount != null &&
                                          participant.fundraisingGoalAmount !== ""
                                            ? String(participant.fundraisingGoalAmount)
                                            : "",
                                      },
                                    }));
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {canViewTeamDashboard && participant.rosterOnly && participant.tripTeamMemberId ? (
                        <div className="small" style={{ marginTop: 12, color: "var(--muted)" }}>
                          No login yet — link is stored on the roster. When they join with this email, it
                          shows on their profile unless you save a different link under their account.
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </CollapsibleSection>

        </div>
      )}

      {tab === "Training" && (
        <div style={{ display: "grid", gap: 16 }}>
          {canManageTrips && (
            <CollapsibleSection defaultOpen>
            <div className="card pad">
              <div className="cardSectionPill" style={{ marginBottom: 8 }}>Team training progress</div>
              <div className="row" style={{ marginBottom: 10 }}>
                <div className="spacer" />
                <span className="badge">{trainingPct}% complete</span>
              </div>
              <div className="progress">
                <div style={{ width: `${trainingPct}%` }} />
              </div>
              <div className="small" style={{ marginTop: 8 }}>
                Overall completion across all participant training checklists.
              </div>
            </div>
            </CollapsibleSection>
          )}

          <CollapsibleSection defaultOpen>
          <div className="card pad">
            <div className="cardSectionPill" style={{ marginBottom: 8 }}>Training resources</div>
            <div className="small" style={{ marginBottom: 10, opacity: 0.88 }}>
              Required and optional links for this trip.
            </div>
            <p className="small">
              Central place for training links and module tracking.
            </p>

            <div style={{ height: 14 }} />

            <div
              className="tripTrainingResourceGrid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              {requiredTrainingResources.map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="card pad"
                  style={{
                    display: "block",
                    color: "inherit",
                    boxShadow: "none",
                    textDecoration: "none",
                    borderColor: "rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <div className="row" style={{ alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: resource.accent,
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 900,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {resource.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, marginBottom: 4 }}>{resource.title}</div>
                      <div className="small">{resource.description}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div style={{ height: 18 }} />

            <div className="small" style={{ fontWeight: 900, marginBottom: 8 }}>
              Advanced Training
            </div>

            <div
              className="tripTrainingOptionalGrid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {optionalTrainingResources.map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="card pad"
                  style={{
                    display: "block",
                    color: "inherit",
                    boxShadow: "none",
                    textDecoration: "none",
                    borderColor: "rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <div className="row" style={{ alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: resource.accent,
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 900,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {resource.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, marginBottom: 4 }}>{resource.title}</div>
                      <div className="small">{resource.description}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
          </CollapsibleSection>

          <CollapsibleSection defaultOpen>
          <div className="cardSectionPill" style={{ marginBottom: 8 }}>Module completion</div>
          <div className="small" style={{ marginBottom: 14, opacity: 0.88 }}>
            Canvas and supplemental modules per participant.
          </div>
          <div
            className="tripTrainingParticipantGrid"
            style={{
              display: "grid",
              gridTemplateColumns: canViewTeamDashboard
                ? "repeat(auto-fit, minmax(min(100%, 340px), 1fr))"
                : "1fr",
              gap: 16,
            }}
          >
            {visibleTrainingParticipants.map((participant) => {
              const trainingState = participant.trainingState || {};

              return (
                <div key={participant.email} className="card pad">
                  <div className="row" style={{ marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>
                        {canViewTeamDashboard ? participant.name : "My Training"}
                      </div>
                    </div>
                    <div className="spacer" />
                    <span className="badge">{participant.percent}% complete</span>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div className="small" style={{ fontWeight: 900, fontSize: 13, marginBottom: 8 }}>
                      Canvas Modules
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        background: "rgba(255,255,255,.78)",
                      }}
                    >
                      {canvasTrainingModules.map((module) => (
                        <div
                          key={`${participant.email}-${module.id}`}
                          id={
                            !canViewTeamDashboard &&
                            String(participant.id || "") === String(currentParticipant?.id || "")
                              ? buildTrainingModuleRowDomId(module.id)
                              : undefined
                          }
                          style={{
                            display: "grid",
                            gridTemplateColumns: "18px minmax(0, 1fr)",
                            gap: 10,
                            alignItems: "start",
                            paddingBottom: 8,
                            borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!trainingState[module.id]}
                            onChange={() => toggleTraining(module.id, participant.email)}
                            style={{ marginTop: 2 }}
                          />
                          <div>
                            <div
                              className="row"
                              style={{ alignItems: "center", justifyContent: "space-between", gap: 8 }}
                            >
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  lineHeight: 1.35,
                                }}
                              >
                                {module.title}
                              </div>
                              <span
                                className={
                                  "badge " +
                                  (!!trainingState[module.id] ? "badgeSuccess" : "badgeDanger")
                                }
                              >
                                {!!trainingState[module.id] ? "Completed" : "Not started"}
                              </span>
                            </div>
                            {module.deadlineDate ? (
                              <div className="small" style={{ marginTop: 4 }}>
                                {`Due: ${formatShortDate(module.deadlineDate)}`}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div className="small" style={{ fontWeight: 900, fontSize: 13, marginBottom: 8 }}>
                      Basic / Gateway / EndMeeting
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        background: "rgba(255,255,255,.78)",
                      }}
                    >
                      {supplementalTrainingModules.map((module) => {
                        const modKey = String(module.id);
                        const sessionOptions = getTrainingSessionOptionsForModuleTitle(module.title);
                        const dateKey = `${modKey}Date`;
                        const rawStored = trainingState[dateKey] || "";
                        const selectValue = sessionOptions
                          ? resolveTrainingSessionSelectValue(rawStored, sessionOptions)
                          : rawStored;
                        const selectedSessionLabel =
                          sessionOptions && selectValue
                            ? sessionOptions.find((o) => o.value === selectValue)?.label || ""
                            : "";
                        return (
                        <div
                          key={`${participant.email}-${modKey}`}
                          id={
                            !canViewTeamDashboard &&
                            String(participant.id || "") === String(currentParticipant?.id || "")
                              ? buildTrainingModuleRowDomId(modKey)
                              : undefined
                          }
                          style={{
                            display: "grid",
                            gridTemplateColumns: "18px minmax(0, 1fr)",
                            gap: 10,
                            alignItems: "start",
                            paddingBottom: 8,
                            borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!trainingState[modKey]}
                            onChange={() => toggleTraining(modKey, participant.email)}
                            style={{ marginTop: 2 }}
                          />
                          <div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                lineHeight: 1.35,
                                marginBottom: 6,
                              }}
                            >
                              {module.title}
                            </div>
                            {module.deadlineDate ? (
                              <div className="small" style={{ marginBottom: 6 }}>
                                {`Due: ${formatShortDate(module.deadlineDate)}`}
                              </div>
                            ) : null}
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                                alignItems: "stretch",
                                width: "100%",
                                minWidth: 0,
                              }}
                            >
                              {sessionOptions ? (
                                <>
                                  <select
                                    className="input"
                                    value={selectValue}
                                    title={
                                      selectedSessionLabel || "Choose a scheduled session date and time"
                                    }
                                    onChange={(e) =>
                                      updateTrainingDate(modKey, e.target.value, participant.email)
                                    }
                                    style={{
                                      padding: "8px 10px",
                                      fontSize: 13,
                                      width: "100%",
                                      maxWidth: "100%",
                                      boxSizing: "border-box",
                                    }}
                                  >
                                    <option value="">Select session…</option>
                                    {sessionOptions.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                  {selectedSessionLabel ? (
                                    <div
                                      className="small"
                                      style={{
                                        lineHeight: 1.45,
                                        wordBreak: "break-word",
                                        padding: "6px 10px",
                                        borderRadius: 10,
                                        border: "1px solid rgba(15, 23, 42, 0.08)",
                                        background: "rgba(248, 250, 252, 0.9)",
                                      }}
                                    >
                                      <span style={{ fontWeight: 700, color: "var(--muted)" }}>
                                        Session:
                                      </span>{" "}
                                      {selectedSessionLabel}
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                <input
                                  className="input"
                                  type="date"
                                  value={trainingState[dateKey] || ""}
                                  onChange={(e) =>
                                    updateTrainingDate(modKey, e.target.value, participant.email)
                                  }
                                  style={{
                                    padding: "8px 10px",
                                    fontSize: 13,
                                    width: "100%",
                                    maxWidth: "100%",
                                    boxSizing: "border-box",
                                  }}
                                />
                              )}
                              <div className="row" style={{ justifyContent: "flex-end" }}>
                                <span
                                  className={
                                    "badge " +
                                    (!!trainingState[modKey] ? "badgeSuccess" : "badgeDanger")
                                  }
                                >
                                  {!!trainingState[modKey] ? "Completed" : "Not started"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          </CollapsibleSection>
        </div>
      )}

      {tab === "Tasks" && (
        <div style={{ display: "grid", gap: 16 }}>
            <CollapsibleSection defaultOpen>
            <div className="card pad tripSectionCard">
            <div className="cardSectionPill" style={{ marginBottom: 8 }}>Task progress</div>
            <div className="small" style={{ marginBottom: 10, opacity: 0.88 }}>
              {canViewTeamDashboard
                ? "Completion summary by participant."
                : "Your current task completion for this trip."}
            </div>
            <div className="row" style={{ marginBottom: 10 }}>
              <div className="spacer" />
              <span className="badge">{overviewTaskPct}% complete</span>
            </div>

            <div className="progress">
              <div style={{ width: `${overviewTaskPct}%` }} />
            </div>

            <div className="small" style={{ marginTop: 8 }}>
              {canViewTeamDashboard
                ? "Overall completion across all participant task lists."
                : `${currentParticipantProgress?.completed || 0} of ${currentParticipantProgress?.total || 0} tasks complete.`}
            </div>

            {canViewTeamDashboard ? (
              <div
                className="tripTaskSummaryGrid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                  marginTop: 14,
                }}
              >
                {visibleTaskParticipants.map((participant) => (
                  <div
                    key={`${participant.email}-summary`}
                    className="card pad"
                    style={{ boxShadow: "none", borderColor: "rgba(15, 23, 42, 0.08)" }}
                  >
                    <div className="row" style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 900 }}>{participant.name}</div>
                      <div className="spacer" />
                      <span className="badge badgeSuccess">{participant.percent}%</span>
                    </div>
                    <div className="progress">
                      <div style={{ width: `${participant.percent}%` }} />
                    </div>
                    <div className="small" style={{ marginTop: 8 }}>
                      {participant.completed} of {participant.total} tasks complete.
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          </CollapsibleSection>

          <CollapsibleSection defaultOpen>
          <div
            className="row"
            style={{
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0, flex: "1 1 220px" }}>
              <div className="cardSectionPill" style={{ marginBottom: 8 }}>Checklists</div>
              <div className="small" style={{ marginBottom: 14, opacity: 0.88 }}>
                Worker tasks by section.
              </div>
            </div>
            {canManageTrips && staffViewAllParticipants ? (
              <button
                type="button"
                className="btn btnPrimary"
                style={{ flexShrink: 0, alignSelf: "flex-start" }}
                onClick={() => {
                  setIsAddingTask((current) => {
                    if (current) setTaskStatusMessage("");
                    return !current;
                  });
                }}
              >
                {isAddingTask ? "Cancel" : "Add task"}
              </button>
            ) : null}
          </div>

          {isAddingTask && canManageTrips && staffViewAllParticipants ? (
            <div
              style={{
                display: "grid",
                gap: 10,
                marginBottom: 16,
                marginTop: -4,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,.92)",
              }}
            >
              <input
                className="input"
                value={taskDraft.title}
                onChange={(event) =>
                  setTaskDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Task title"
              />
              <div>
                <div className="small" style={{ marginBottom: 6 }}>
                  Due date
                </div>
                <AppDueDateTripleSelect
                  ref={taskDraftTripleRef}
                  value={taskDraft.dueDate}
                  onChange={(ymd) =>
                    setTaskDraft((current) => ({ ...current, dueDate: ymd }))
                  }
                />
              </div>
              <select
                className="input"
                value={
                  workerTripTaskCategoryOptions.includes(taskDraft.category)
                    ? taskDraft.category
                    : "General"
                }
                onChange={(event) =>
                  setTaskDraft((current) => ({ ...current, category: event.target.value }))
                }
              >
                {workerTripTaskCategoryOptions.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
              <textarea
                className="input"
                value={taskDraft.description}
                onChange={(event) =>
                  setTaskDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Description"
                rows={3}
              />
              <AppStatusMessage message={taskStatusMessage} tone="danger" />
              <div className="row">
                <button className="btn btnPrimary" type="button" onClick={handleCreateTask}>
                  Save task
                </button>
              </div>
            </div>
          ) : null}

          <div
            className="tripTaskParticipantGrid"
            style={{
              display: "grid",
              gridTemplateColumns: canViewTeamDashboard
                ? "repeat(auto-fit, minmax(260px, 1fr))"
                : "1fr",
              gap: 16,
            }}
          >
            {visibleTaskParticipants.map((participant) => {
              const taskState = participantTaskStates[normalizeEmail(participant.email)] || {};
              const workerDueParticipantKey =
                normalizeEmail(participant.email || "") || String(participant.id || "");

              return (
                <div key={participant.email} className="card pad">
                  <div className="row" style={{ marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>
                        {canViewTeamDashboard ? participant.name : "My Tasks"}
                      </div>
                    </div>
                    <div className="spacer" />
                    <span className="badge">{participant.percent}% complete</span>
                  </div>

                  {tripTasks.length > 0 ? (
                    <div style={{ display: "grid", gap: 14 }}>
                      {groupedWorkerTasks.map(([section, sectionTasks]) => (
                        <div key={`${participant.email}-${section}`}>
                          <div className="small" style={{ fontWeight: 900, marginBottom: 8 }}>
                            {section}
                          </div>
                          <div style={{ display: "grid", gap: 0 }}>
                            {sectionTasks.map((task) => {
                              const done = !!taskState[task.id];
                              const isTravelFormTask = task.title === "Fill out Travel Form";
                              const canFillTravelForm = isTravelFormTask && String(participant.id) === String(currentParticipant?.id);
                              const workerTaskTemplate = findWorkerTaskTemplate(task);
                              const isChecklistTask = task.id === "worker-task-checklist" || task.title === "Received and has reviewed Project Management Checklist";
                              const isTicketsTask = task.id === "worker-task-tickets" || task.title === "Proofread my tickets";
                              const isDocumentsTask = task.id === "worker-task-upload-passport" || task.id === "worker-task-upload-visa" || task.title === "Upload passport" || task.title === "Upload visa";
                              const documentsTabUrl = trip?.id
          ? `/trips/${encodeURIComponent(trip.id)}?tab=documents`
          : null;
                              const participantRefKey = participant.rosterOnly
                                ? (String(participant.id || "").startsWith("roster-member-")
                                    ? `roster:${String(participant.id).slice("roster-member-".length)}`
                                    : "")
                                : `user:${participant.id}`;
                              const taskLink = isChecklistTask
                                ? (preferredTripResourceOpenUrl(effectiveSiteInfoDoc) || workerTaskTemplate?.link)
                                : isTicketsTask
                                  ? null
                                  : isDocumentsTask
                                    ? documentsTabUrl
                                    : workerTaskTemplate?.link;
                              const taskDetails = task.description || workerTaskTemplate?.details;

                              return (
                                <div
                                  key={`${participant.email}-${task.id}`}
                                  id={
                                    !canViewTeamDashboard &&
                                    String(participant.id || "") === String(currentParticipant?.id || "")
                                      ? buildWorkerTaskRowDomId(task.id)
                                      : undefined
                                  }
                                  className="row"
                                  style={{
                                    padding: "8px 0",
                                    borderBottom: "1px solid var(--border)",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={done}
                                    onChange={() => toggleTask(task.id, participant.email)}
                                    style={{ marginTop: 2 }}
                                  />
                                  <div style={{ flex: 1 }}>
                                  <div
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 400,
                                        lineHeight: 1.35,
                                        marginBottom: 4,
                                      }}
                                    >
                                      {task.title}
                                      {taskLink || isTicketsTask ? (
                                        <span style={{ marginLeft: 8 }}>
                                          <AppDetailAction
                                            href={isTicketsTask || isDocumentsTask ? undefined : taskLink}
                                            onClick={
                                              isTicketsTask
                                                ? () => setTab(tripDocumentsTabLabel)
                                                : isDocumentsTask
                                                  ? () => setTab(participantDocumentsTabLabel)
                                                  : undefined
                                            }
                                            compact
                                          >
                                            View details
                                          </AppDetailAction>
                                        </span>
                                      ) : null}
                                      {canFillTravelForm ? (
                                        <button
                                          type="button"
                                          className="btn"
                                          style={{ marginLeft: 10, padding: "4px 10px", fontSize: 12 }}
                                          onClick={() => openTravelFormModal({ refKey: `user:${participant.id}`, email: participant.email || "" })}
                                        >
                                          Fill out
                                        </button>
                                      ) : isTravelFormTask && canViewTeamDashboard && participantRefKey ? (
                                        <button
                                          type="button"
                                          className="btn"
                                          style={{ marginLeft: 10, padding: "4px 10px", fontSize: 12 }}
                                          onClick={() => openTravelFormModal({ refKey: participantRefKey, email: participant.email || "" })}
                                        >
                                          View / Edit
                                        </button>
                                      ) : null}
                                    </div>
                                    {canViewTeamDashboard ? (
                                      editingWorkerTaskDateId === task.id &&
                                      workerDueParticipantKey === editingWorkerDueParticipantKey ? (
                                        <div
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 8,
                                            alignItems: "flex-start",
                                          }}
                                        >
                                          <AppDueDateTripleSelect
                                            ref={(imp) => {
                                              const key = `${task.id}::${workerDueParticipantKey}`;
                                              if (imp == null) {
                                                workerDueTripleHandlesRef.current.delete(key);
                                              } else {
                                                workerDueTripleHandlesRef.current.set(key, imp);
                                              }
                                            }}
                                            value={workerTaskDueDateDraft}
                                            onChange={setWorkerTaskDueDateDraft}
                                          />
                                          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                                            <button
                                              type="button"
                                              className="btn btnPrimary"
                                              style={{ padding: "4px 10px", fontSize: 12 }}
                                              onClick={() => void handleApplyWorkerTaskDueDate()}
                                            >
                                              Save
                                            </button>
                                            <button
                                              type="button"
                                              className="btn"
                                              style={{ padding: "4px 10px", fontSize: 12 }}
                                              onClick={() => {
                                                workerDueTripleHandlesRef.current.delete(
                                                  `${task.id}::${workerDueParticipantKey}`
                                                );
                                                setEditingWorkerTaskDateId("");
                                                setEditingWorkerDueParticipantKey("");
                                                setWorkerTaskDueDateDraft("");
                                              }}
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              type="button"
                                              className="btn"
                                              style={{ padding: "4px 10px", fontSize: 12 }}
                                              onClick={() => void handleClearWorkerTaskDueDate()}
                                            >
                                              Clear due
                                            </button>
                                          </div>
                                        </div>
                                      ) : editingWorkerTaskDateId === task.id ? (
                                        <div className="small" style={{ color: "var(--muted)", lineHeight: 1.4 }}>
                                          {task.due ? `Due: ${formatShortDate(task.due)}` : "Due: Not set"}
                                          <div style={{ marginTop: 4 }}>
                                            Editing due date in{" "}
                                            <strong>
                                              {visibleTaskParticipants.find(
                                                (p) =>
                                                  (normalizeEmail(p.email || "") ||
                                                    String(p.id || "")) === editingWorkerDueParticipantKey
                                              )?.name || "another participant"}
                                            </strong>
                                            &rsquo;s column.
                                          </div>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          className="staffTaskDateButton"
                                          onClick={() => {
                                            setEditingWorkerTaskDateId(task.id);
                                            setEditingWorkerDueParticipantKey(workerDueParticipantKey);
                                            setWorkerTaskDueDateDraft(toDateInputValue(task.due));
                                          }}
                                        >
                                          {task.due ? `Due: ${formatShortDate(task.due)}` : "Add due date"}
                                        </button>
                                      )
                                    ) : (
                                      <div className="small">
                                        {task.due ? `Due: ${formatShortDate(task.due)}` : "Due: Not set"}
                                      </div>
                                    )}
                                    {taskDetails ? (
                                      <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>
                                        {taskDetails}
                                      </div>
                                    ) : null}
                                  </div>
                                  <span className={"badge " + (done ? "badgeSuccess" : "badgeDanger")}>
                                    {done ? "Complete" : "Not started"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="small">No tasks for this trip yet.</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="small" style={{ marginTop: 12 }}>
            Task progress is loaded from Supabase for each assigned user.
          </div>
          </CollapsibleSection>
        </div>
      )}

      {tab === "Materials" && staffViewAllParticipants && (
        <div style={{ display: "grid", gap: 16 }}>
          {tripBudgetLoadError ? (
            <div className="card pad small" style={{ color: "var(--danger)" }}>
              {tripBudgetLoadError}
            </div>
          ) : null}
          {!materialsDraft ? (
            <div className="card pad" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Spinner size={32} />
              <span className="small">Loading housing budget…</span>
            </div>
          ) : (
            <>
              <CollapsibleSection defaultOpen>
                <div
                  className="card pad"
                  style={{
                    display: "grid",
                    gap: 0,
                    borderRadius: 14,
                    border: "1px solid rgba(15, 23, 42, 0.1)",
                    background:
                      "linear-gradient(165deg, rgba(248, 250, 252, 0.96) 0%, #ffffff 44%, rgba(241, 245, 249, 0.5) 100%)",
                    boxShadow:
                      "0 12px 40px rgba(15, 23, 42, 0.08), 0 2px 12px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <div className="cardSectionPill" style={{ marginBottom: 8 }}>
                    Materials at a glance
                  </div>
                  <div className="small" style={{ marginBottom: 14, opacity: 0.88 }}>
                    Team name and site workbook plan are read-only. Edit shipping, sizes, and sending notes.
                  </div>
                  <div
                    className="row"
                    style={{
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                      marginBottom: 14,
                      padding: "12px 14px",
                      marginLeft: -4,
                      marginRight: -4,
                      marginTop: -4,
                      borderRadius: 12,
                      background: "rgba(255, 255, 255, 0.65)",
                      border: "1px solid rgba(15, 23, 42, 0.06)",
                      boxShadow: "0 1px 0 rgba(255, 255, 255, 0.9) inset",
                    }}
                  >
                    {!isEditingMaterialsGlance ? (
                      <>
                        <button
                          type="button"
                          className="btn btnPrimary"
                          onClick={() => setIsEditingMaterialsGlance(true)}
                        >
                          Edit
                        </button>
                        <button type="button" className="btn" onClick={() => handleExportMaterialsExcel()}>
                          Export Excel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btnPrimary"
                          onClick={() => void handleMaterialsGlanceSave()}
                        >
                          Save
                        </button>
                        <button type="button" className="btn" onClick={() => revertMaterialsDraftFromBudgetRow()}>
                          Cancel
                        </button>
                        <button type="button" className="btn" onClick={() => handleExportMaterialsExcel()}>
                          Export Excel
                        </button>
                      </>
                    )}
                    <AppStatusMessage
                      message={materialsSaveStatus}
                      tone={
                        materialsSaveStatus === "Saved."
                          ? "success"
                          : materialsSaveStatus === "Saving..."
                            ? "info"
                            : "danger"
                      }
                      compact
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                      margin: "0 0 18px",
                    }}
                  >
                    <div
                      style={{
                        ...materialsMetricCard,
                        background:
                          "linear-gradient(180deg, rgba(219, 234, 254, 0.9), rgba(255, 255, 255, 0.88))",
                      }}
                    >
                      <div style={materialsMetricLabel}>Team Plan</div>
                      <div style={materialsMetricValue}>{materialsWorkersDisplayCount}</div>
                      <div style={materialsGlanceMuted}>
                        {materialsBudgetWorkerCount !== null
                          ? `Budget count saved · roster has ${materialsRosterHeadcount}`
                          : `Using roster headcount · ${materialsRosterHeadcount} on file`}
                      </div>
                      <div className="small" style={{ color: "var(--muted)" }}>
                        {materialsWorkerCountDelta === null
                          ? "No manual worker count entered yet."
                          : materialsWorkerCountDelta === 0
                            ? "Budget and roster headcount match."
                            : materialsWorkerCountDelta > 0
                              ? `${materialsWorkerCountDelta} more on budget than roster.`
                              : `${Math.abs(materialsWorkerCountDelta)} more on roster than budget.`}
                      </div>
                    </div>
                    <div
                      style={{
                        ...materialsMetricCard,
                        background:
                          "linear-gradient(180deg, rgba(220, 252, 231, 0.9), rgba(255, 255, 255, 0.88))",
                      }}
                    >
                      <div style={materialsMetricLabel}>Workbook Totals</div>
                      <div style={materialsMetricValue}>
                        {materialsWorkbookSentCopies !== null
                          ? `${materialsWorkbookSentCopies}/${materialsWorkbookTargetCopies}`
                          : materialsWorkbookTargetCopies}
                      </div>
                      <div style={materialsGlanceMuted}>
                        {staffSiteWorkbookPlan?.noLocation
                          ? "Set a trip location to load site workbook guidance"
                          : staffSiteWorkbookPlan?.empty
                            ? "No workbook quantities found on the matched site"
                            : `${staffSiteWorkbookPlan?.distinctTitles || 0} titles planned from Sites`}
                      </div>
                      <div className="small" style={{ color: "var(--muted)" }}>
                        {materialsWorkbookSentCopies !== null
                          ? `${materialsWorkbookRemainingCopies || 0} copies still unaccounted for.`
                          : "Add workbook sending notes to compare planned vs sent."}
                      </div>
                    </div>
                    <div
                      style={{
                        ...materialsMetricCard,
                        background:
                          "linear-gradient(180deg, rgba(254, 249, 195, 0.9), rgba(255, 255, 255, 0.88))",
                      }}
                    >
                      <div style={materialsMetricLabel}>Shipping</div>
                      <div style={{ ...materialsMetricValue, fontSize: 18, lineHeight: 1.15 }}>
                        {materialsShippingState}
                      </div>
                      <div style={materialsGlanceMuted}>
                        {String(materialsDraft.materialsTrackingNumber || "").trim()
                          ? String(materialsDraft.materialsTrackingNumber || "").trim()
                          : String(materialsDraft.materialsShipAddress || "").trim()
                            ? "Address saved and ready for shipment."
                            : "Add ship-to address and tracking when books go out."}
                      </div>
                      <div className="small" style={{ color: "var(--muted)" }}>
                        {materialsRosterTshirtLines.length
                          ? `${materialsRosterTshirtLines.length} roster entries include shirt sizes.`
                          : "No roster shirt sizes saved yet."}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                      gap: 14,
                      alignItems: "start",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        ...materialsPanelBase,
                        background:
                          "linear-gradient(180deg, rgba(37, 99, 235, 0.08), rgba(248, 250, 252, 0.4))",
                        border: "1px solid rgba(37, 99, 235, 0.14)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "rgba(30, 64, 175, 0.9)",
                          padding: "8px 0 10px",
                          borderBottom: "1px solid rgba(37, 99, 235, 0.15)",
                          marginBottom: 2,
                        }}
                      >
                        Team plan
                      </div>

                      <div style={materialsGlanceRow}>
                        <div style={materialsGlanceLabel}>Team name</div>
                        <div style={materialsGlanceValue}>{trip.name || "—"}</div>
                      </div>

                      <div style={materialsGlanceRow}>
                        <div style={materialsGlanceLabel}># of workers</div>
                        <div>
                          <span
                            style={{
                              ...materialsGlanceValue,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {materialsWorkersDisplayCount}
                          </span>
                          {materialsBudgetWorkerCount !== null ? (
                            <div style={{ ...materialsGlanceMuted, marginTop: 4 }}>
                              {`Saved on budget row · Roster on file: ${materialsRosterHeadcount}`}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div style={materialsGlanceRow}>
                        <div style={materialsGlanceLabel}>Workbook target</div>
                        <div>
                          <div style={{ ...materialsGlanceMuted, marginBottom: 6 }}>
                            Site:{" "}
                            <span style={{ color: "var(--text)", fontWeight: 500 }}>
                              {tripSiteCanonicalLabel || trip.location || "—"}
                            </span>
                          </div>
                          {staffSiteWorkbookPlan?.noLocation ? (
                            <div style={materialsGlanceMuted}>
                              Set the trip location in setup to match a site on{" "}
                              <Link href="/sites">Sites</Link>.
                            </div>
                          ) : staffSiteWorkbookPlan?.empty ? (
                            <div style={materialsGlanceMuted}>No workbooks found.</div>
                          ) : (
                            <>
                              <div style={{ ...materialsGlanceMuted, marginBottom: 6 }}>
                                {staffSiteWorkbookPlan.distinctTitles} titles ·{" "}
                                {staffSiteWorkbookPlan.totalCopies} copies
                              </div>
                              <ul
                                style={{
                                  margin: 0,
                                  paddingLeft: 18,
                                  ...materialsGlanceValue,
                                  lineHeight: 1.55,
                                  color: "var(--muted)",
                                }}
                              >
                                {staffSiteWorkbookPlan.positiveLines.map((line, idx) => (
                                  <li key={`site-${line.name}-${idx}`}>
                                    <span style={{ color: "var(--text)", fontWeight: 500 }}>{line.qty}</span>
                                    {" · "}
                                    {line.name}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        ...materialsPanelBase,
                        background:
                          "linear-gradient(180deg, rgba(22, 163, 74, 0.09), rgba(240, 253, 244, 0.45))",
                        border: "1px solid rgba(22, 163, 74, 0.18)",
                        boxShadow:
                          "0 1px 0 rgba(255, 255, 255, 0.85) inset, 0 6px 20px rgba(22, 101, 52, 0.06)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "rgba(21, 128, 61, 0.92)",
                          padding: "8px 0 10px",
                          borderBottom: "1px solid rgba(22, 163, 74, 0.2)",
                          marginBottom: 2,
                        }}
                      >
                        Shipping & accounting
                      </div>

                      <div style={materialsGlanceRow}>
                        <div style={materialsGlanceLabel}>Team accountant</div>
                        {isEditingMaterialsGlance ? (
                          <input
                            className="input"
                            value={materialsDraft.teamAccountant}
                            onChange={(e) =>
                              setMaterialsDraft((d) => ({ ...d, teamAccountant: e.target.value }))
                            }
                            placeholder="Name"
                            style={{ maxWidth: 400 }}
                          />
                        ) : (
                          <div style={materialsGlanceValue}>
                            {String(materialsDraft.teamAccountant || "").trim() || (
                              <span style={materialsGlanceMuted}>—</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={materialsGlanceRow}>
                        <div style={materialsGlanceLabel}>T-shirt sizes</div>
                        <div>
                          {materialsRosterTshirtLines.length > 0 ? (
                            <div style={{ display: "grid", gap: 4 }}>
                              {materialsRosterTshirtLines.map((line, idx) => (
                                <div key={`${line}-${idx}`} style={materialsGlanceValue}>
                                  {line}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={materialsGlanceMuted}>No roster members yet.</span>
                          )}
                          {isEditingMaterialsGlance ? (
                            <>
                              <div className="small" style={{ marginTop: 10, color: "var(--muted)" }}>
                                Optional notes (same field as Budget → Housing)
                              </div>
                              <textarea
                                className="input"
                                rows={2}
                                value={materialsDraft.tshirts}
                                onChange={(e) =>
                                  setMaterialsDraft((d) => ({ ...d, tshirts: e.target.value }))
                                }
                                placeholder="Extra sizing or shipping notes…"
                              />
                            </>
                          ) : String(materialsDraft.tshirts || "").trim() ? (
                            <div style={{ marginTop: 8 }}>
                              <div style={materialsGlanceMuted}>Notes</div>
                              <div style={{ ...materialsGlanceValue, whiteSpace: "pre-wrap" }}>
                                {materialsDraft.tshirts}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div style={materialsGlanceRow}>
                        <div style={materialsGlanceLabel}>Ship-to address</div>
                        {isEditingMaterialsGlance ? (
                          <textarea
                            className="input"
                            rows={3}
                            value={materialsDraft.materialsShipAddress}
                            onChange={(e) =>
                              setMaterialsDraft((d) => ({
                                ...d,
                                materialsShipAddress: e.target.value,
                              }))
                            }
                            placeholder="If different from workers’ home addresses"
                          />
                        ) : (
                          <div style={{ ...materialsGlanceValue, whiteSpace: "pre-wrap" }}>
                            {String(materialsDraft.materialsShipAddress || "").trim() || (
                              <span style={materialsGlanceMuted}>—</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={materialsGlanceRow}>
                        <div style={materialsGlanceLabel}>Tracking #</div>
                        {isEditingMaterialsGlance ? (
                          <input
                            className="input"
                            value={materialsDraft.materialsTrackingNumber}
                            onChange={(e) =>
                              setMaterialsDraft((d) => ({
                                ...d,
                                materialsTrackingNumber: e.target.value,
                              }))
                            }
                            placeholder="Carrier tracking #"
                            style={{ maxWidth: 420 }}
                          />
                        ) : (
                          <div
                            style={{
                              ...materialsGlanceValue,
                              fontFamily: "ui-monospace, monospace",
                              wordBreak: "break-all",
                            }}
                          >
                            {String(materialsDraft.materialsTrackingNumber || "").trim() || (
                              <span style={{ ...materialsGlanceMuted, fontFamily: "inherit" }}>—</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={materialsGlanceRow}>
                        <div style={materialsGlanceLabel}>Shipping status</div>
                        <div>
                          <div style={materialsGlanceValue}>{materialsShippingState}</div>
                          <div style={{ ...materialsGlanceMuted, marginTop: 4 }}>
                            {String(materialsDraft.materialsTrackingNumber || "").trim()
                              ? "Tracking is saved for this shipment."
                              : String(materialsDraft.materialsShipAddress || "").trim()
                                ? "Address is in place. Add tracking after shipment."
                                : "Shipping details have not been set yet."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={materialsGlanceRowSending}>
                    <div style={materialsGlanceLabel}>Workbook sending</div>
                    <div>
                      <div style={{ ...materialsGlanceMuted, marginBottom: 8 }}>
                        Notes about what workbooks were sent for this team.
                      </div>
                      {materialsTeamWorkbookGlance?.kind === "parsed" &&
                      materialsTeamWorkbookGlance.positiveLines?.length > 0 ? (
                        <>
                          <div style={{ ...materialsGlanceMuted, marginBottom: 6 }}>
                            Sent list: {materialsTeamWorkbookGlance.distinctTitles} titles ·{" "}
                            {materialsTeamWorkbookGlance.totalCopies} copies
                          </div>
                          {materialsWorkbookTargetCopies > 0 ? (
                            <div style={{ ...materialsGlanceMuted, marginBottom: 8 }}>
                              Planned from site: {materialsWorkbookTargetCopies} copies · Remaining:{" "}
                              {materialsWorkbookRemainingCopies || 0}
                            </div>
                          ) : null}
                        </>
                      ) : null}
                      {isEditingMaterialsGlance ? (
                        <textarea
                          className="input"
                          rows={4}
                          value={materialsDraft.materialsNotes}
                          onChange={(e) =>
                            setMaterialsDraft((d) => ({ ...d, materialsNotes: e.target.value }))
                          }
                          placeholder="e.g. Shipped LUKE 1 & ACTS 1 on 3/15; tracking in row above."
                        />
                      ) : (
                        <div style={{ ...materialsGlanceValue, whiteSpace: "pre-wrap" }}>
                          {String(materialsDraft.materialsNotes || "").trim() || (
                            <span style={materialsGlanceMuted}>—</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </CollapsibleSection>
              {(effectiveSiteInfoDoc?.link || effectiveSiteInfoDoc?.pdfUrl) && (
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <a
                    className="btn btnPrimary"
                    href={preferredTripResourceOpenUrl(effectiveSiteInfoDoc)}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Open site logistics
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === tripDocumentsTabLabel && (
        <div style={{ display: "grid", gap: 16 }}>
          {tripDocsUndoBanner ? (
            <div className="tripDocumentsUndoBanner">
              <span>{tripDocsUndoBanner.message}</span>
              <button type="button" className="btn btnPrimary" onClick={() => void runTripDocsUndoAction()}>
                Undo
              </button>
            </div>
          ) : null}
          {(() => {
            const smartsheetTutorialCards = getSmartsheetBudgetTutorialCards();
            if (!smartsheetTutorialCards.length) return null;
            return (
              <ExpandableCollapsibleSection
                title="Smartsheet tutorials"
                subtitle="Budget tracking and project record journal — from your trip setup."
                defaultOpen
                persistOpenKey="lst-hub-trip-docs-smartsheet-tutorials"
              >
                <div className="tripDocumentsTileGrid">
                  {smartsheetTutorialCards.map((t) => (
                    <div
                      key={t.key}
                      className="card tripDocumentSquareTile tripDocumentTutorialTile"
                    >
                      <div className="tripDocumentSquareTileScroll">
                        <div className="tripDocumentSquareTileTitle">{t.title}</div>
                        {t.description ? (
                          <div className="tripDocumentSquareTileMeta">{t.description}</div>
                        ) : null}
                      </div>
                        <div className="tripDocumentSquareTileFoot">
                          <a className="btn btnPrimary" href={t.url} target="_blank" rel="noreferrer">
                            Watch
                          </a>
                        </div>
                    </div>
                  ))}
                </div>
              </ExpandableCollapsibleSection>
            );
          })()}
          <div style={{ display: "grid", gap: 10 }}>
            <div
              className="row mobileSectionHeader"
              style={{
                gap: 12,
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              <div className="tripDocumentsPageSectionPill" style={{ marginBottom: 0 }}>
                Documents & links
              </div>
              {canManageTripDocuments ? (
                <div
                  className="row mobileSectionHeaderActions"
                  style={{
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  <button className="btn" type="button" onClick={handleAddLink}>
                    Add Link
                  </button>
                  <button className="btn" type="button" onClick={handlePrepareNewPdf}>
                    Upload File
                  </button>
                  {(() => {
                    const hasSite =
                      effectiveSiteInfoDoc &&
                      (String(effectiveSiteInfoDoc.link || "").trim() ||
                        String(effectiveSiteInfoDoc.pdfUrl || "").trim());
                    return !hasSite ? (
                      <button
                        type="button"
                        className="btn"
                        onClick={() =>
                          handlePrepareRequiredLink({
                            key: "site-info-link",
                            title: "Site Logistics",
                            category: "Site",
                            kind: "link",
                            description: "Standard site logistics link for this trip.",
                            resource: effectiveSiteInfoDoc,
                          })
                        }
                      >
                        Add site logistics
                      </button>
                    ) : null;
                  })()}
                </div>
              ) : null}
            </div>
            {!canManageTripDocuments ? (
              <div className="small" style={{ marginBottom: 0, opacity: 0.88 }}>
                Documents your leader or staff share appear here.
              </div>
            ) : null}

            {docsError && (
              <div className="small" style={{ color: "var(--danger)", marginBottom: 0 }}>
                {docsError}
              </div>
            )}

            {canManageTripDocuments && isAddingLink
              ? renderTripDocumentsLinkDraftForm({ embedded: false })
              : null}

            {canManageTripDocuments && pendingPdfDraft && (
              <div
                className="card pad"
                style={{
                  boxShadow: "none",
                  marginBottom: 0,
                  background: "rgba(255,255,255,.78)",
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 10 }}>
                  {pendingPdfDraft.resourceKey ? "Required PDF" : "New PDF"}
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  <input
                    className="input"
                    value={pendingPdfDraft.title}
                    onChange={(e) =>
                      setPendingPdfDraft((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Document title"
                  />
                  <select
                    className="input"
                    value={pendingPdfDraft.category}
                    onChange={(e) =>
                      setPendingPdfDraft((prev) => ({ ...prev, category: e.target.value }))
                    }
                  >
                    {DOCUMENT_CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                      ))}
                    </select>
                  <select
                    className="input"
                    value={pendingPdfDraft.workerName || ""}
                    onChange={(e) =>
                      setPendingPdfDraft((prev) => ({ ...prev, workerName: e.target.value }))
                    }
                  >
                    <option value="">No worker label</option>
                    {tripDocumentWorkerOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    value={pendingPdfDraft.workArea}
                    onChange={(e) =>
                      setPendingPdfDraft((prev) => ({ ...prev, workArea: e.target.value }))
                    }
                    placeholder="Notes / context"
                  />
                  <input
                    type="file"
                    onChange={(e) =>
                      setPendingPdfDraft((prev) => ({ ...prev, file: e.target.files?.[0] || null }))
                    }
                  />
                  <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={pendingPdfDraft.visibleToParticipants !== false}
                      onChange={(e) =>
                        setPendingPdfDraft((prev) => ({
                          ...prev,
                          visibleToParticipants: e.target.checked,
                        }))
                      }
                    />
                    Visible to participants
                  </label>
                  <div className="small">
                    File: {pendingPdfDraft.file?.name || "Choose a file to upload"}
                  </div>
                  <div className="row">
                    <button
                      className="btn btnPrimary"
                      type="button"
                      onClick={handleSavePendingPdf}
                      disabled={!pendingPdfDraft.file}
                    >
                      Upload PDF
                    </button>
                    <button className="btn" type="button" onClick={handleCancelPendingPdf}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="card pad">
            {tripDocumentCategorySections.length === 0 ? (
              <div className="small tripDocumentsTileGridFullRow" style={{ marginBottom: 8 }}>
                {canManageTripDocuments
                  ? "No documents yet. Use Add Link, Upload File, or Add site logistics above."
                  : "No documents yet."}
              </div>
            ) : null}

            {tripDocumentCategorySections.map((section) => (
              <Fragment key={`trip-doc-cat-${section.category}`}>
                <div className="tripDocumentsCategoryPill">{section.category}</div>
                <div className="tripDocumentsTileGrid" style={{ marginBottom: 22 }}>
                  {section.entries.map((entry) => {
                    if (entry.kind === "doc") {
                      return (
                        <OptionalTripWideDocumentCard
                          key={entry.doc.id}
                          d={entry.doc}
                          {...optionalTripWideCardProps}
                        />
                      );
                    }

                    if (entry.kind === "site") {
                      const siteDoc = entry.doc;
                      const siteSlotStub = {
                        key: "site-info-link",
                        title: "Site Logistics",
                        category: "Site",
                        kind: "link",
                        description: "Standard site logistics link for this trip.",
                        resource: siteDoc,
                      };
                      const siteEditing = siteInfoDoc && editingDocId === siteInfoDoc.id;
                      const siteTileWide = Boolean(
                        siteEditing ||
                          (canManageTripDocuments &&
                            isAddingLink &&
                            addingLinkForSlotKey === "site-info-link")
                      );
                      const siteHasOpen = !!(siteDoc?.link || siteDoc?.pdfUrl);
                      const siteCardMain = (
                        <>
                          <div className="row" style={{ alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                              <div
                                className={siteTileWide ? undefined : "tripDocumentSquareTileTitle"}
                                style={siteTileWide ? { fontWeight: 900 } : undefined}
                              >
                                Site Logistics
                              </div>
                              <div
                                className={siteTileWide ? "small" : "small tripDocumentSquareTileMeta"}
                                style={siteTileWide ? { marginTop: 4 } : { marginTop: 2 }}
                              >
                                Assigned site: {trip?.location || "No site selected yet"}
                              </div>
                            </div>
                            {siteHasOpen ? (
                              <span className="badge badgeSuccess">
                                {siteDoc?.isAutoGenerated ? "Auto" : "OK"}
                              </span>
                            ) : null}
                          </div>
                          {siteHasOpen ? (
                            <div
                              className="row"
                              style={{ marginTop: siteTileWide ? 10 : 6, flexWrap: "wrap", gap: 8 }}
                            >
                              <a
                                className="btn btnPrimary"
                                href={preferredTripResourceOpenUrl(siteDoc)}
                                target="_blank"
                                rel="noreferrer"
                                style={siteTileWide ? siteLinkActionButtonStyle : undefined}
                              >
                                Open
                              </a>
                              {canManageTripDocuments && siteInfoDoc ? (
                                <button
                                  className="btn"
                                  type="button"
                                  style={siteTileWide ? siteLinkActionButtonStyle : undefined}
                                  onClick={() => handleEditDoc(siteInfoDoc)}
                                >
                                  Edit
                                </button>
                              ) : canManageTripDocuments ? (
                                <button
                                  className="btn"
                                  type="button"
                                  style={siteTileWide ? siteLinkActionButtonStyle : undefined}
                                  onClick={() =>
                                    handlePrepareRequiredLink({
                                      key: "site-info-link",
                                      title: "Site Logistics",
                                      category: "Site",
                                      resource: siteDoc,
                                    })
                                  }
                                >
                                  Edit
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </>
                      );
                      return (
                        <div
                          key="trip-site-logistics"
                          className={tripDocumentTileRootClassName(siteTileWide)}
                          style={siteTileWide ? tripDocumentWideCardStyle : undefined}
                        >
                          {siteTileWide ? (
                            siteCardMain
                          ) : (
                            <div className="tripDocumentSquareTileScroll">{siteCardMain}</div>
                          )}
                          {canManageTripDocuments && siteInfoDoc && siteEditing ? (
                            <div
                              className={siteTileWide ? undefined : "tripDocumentSquareTileFoot"}
                              style={
                                siteTileWide
                                  ? {
                                      marginTop: "auto",
                                      paddingTop: 12,
                                      display: "flex",
                                      justifyContent: "flex-end",
                                    }
                                  : undefined
                              }
                            >
                              <button
                                type="button"
                                className="btn"
                                style={tripDocDeleteButtonStyle}
                                onClick={() => void handleDeleteRequiredSlotResource(siteSlotStub)}
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    }

                    const slot = entry.slot;
                    const doc = entry.doc;
                    const available = !!(doc?.pdfUrl || doc?.link);
                    const isEditing = doc?.id && editingDocId === doc.id;
                    const isPdf = !!doc?.pdfUrl || slot.kind === "pdf";
                    const isAutoGenerated = !!doc?.isAutoGenerated;
                    const isHousingSlot = slot.key === "housing-accommodation-link";
                    const showHousingInlineForm =
                      isHousingSlot && staffViewAllParticipants && housingTripDocsDraft;

                    const slotTileWide =
                      isEditing ||
                      showHousingInlineForm ||
                      (isHousingSlot && tripHousingDocuments.length > 1);

                    const slotCardInner = (
                      <>
                        <div className="row" style={{ alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            {showHousingInlineForm ? (
                              <div style={{ display: "grid", gap: 8 }}>
                                <div style={{ fontWeight: 900 }}>Edit team housing</div>
                                <div className="small">
                                  Saves to the same trip budget row as Budget → Housing; this page refreshes when you open Trip Documents or return to the tab.
                                </div>
                                <input
                                  className="input"
                                  value={housingTripDocsDraft.housingLink}
                                  onChange={(e) =>
                                    setHousingTripDocsDraft((prev) =>
                                      prev ? { ...prev, housingLink: e.target.value } : prev
                                    )
                                  }
                                  placeholder="https://..."
                                />
                                <input
                                  type="file"
                                  accept="application/pdf,.pdf"
                                  onChange={(e) =>
                                    setHousingTripDocsDraft((prev) =>
                                      prev
                                        ? { ...prev, file: e.target.files?.[0] || null }
                                        : prev
                                    )
                                  }
                                />
                                {housingTripDocsDraft.pdfUrlKeep ? (
                                  <label
                                    className="small"
                                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={housingTripDocsDraft.clearPdf}
                                      onChange={(e) =>
                                        setHousingTripDocsDraft((prev) =>
                                          prev ? { ...prev, clearPdf: e.target.checked } : prev
                                        )
                                      }
                                    />
                                    Remove current PDF
                                  </label>
                                ) : null}
                                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                                  <button
                                    className="btn btnPrimary"
                                    type="button"
                                    onClick={() => void handleSaveHousingTripDocs()}
                                  >
                                    Save
                                  </button>
                                  <button
                                    className="btn"
                                    type="button"
                                    onClick={() => {
                                      setHousingTripDocsDraft(null);
                                      setHousingTripDocsSaveStatus("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                                {housingTripDocsSaveStatus ? (
                                  <div className="small">{housingTripDocsSaveStatus}</div>
                                ) : null}
                              </div>
                            ) : canManageTripDocuments && doc && isEditing ? (
                              <div style={{ display: "grid", gap: 8 }}>
                                <input
                                  className="input"
                                  value={docDraft?.title || ""}
                                  onChange={(e) =>
                                    setDocDraft((prev) => ({ ...prev, title: e.target.value }))
                                  }
                                  placeholder="Title"
                                />
                                <input
                                  className="input"
                                  value={docDraft?.link || ""}
                                  onChange={(e) =>
                                    setDocDraft((prev) => ({ ...prev, link: e.target.value }))
                                  }
                                  placeholder="https://..."
                                  disabled={!!docDraft?.pdfUrl}
                                />
                                <select
                                  className="input"
                                  value={docDraft?.category || "Other"}
                                  onChange={(e) =>
                                    setDocDraft((prev) => ({ ...prev, category: e.target.value }))
                                  }
                                >
                                  {DOCUMENT_CATEGORY_OPTIONS.map((category) => (
                                    <option key={category} value={category}>
                                      {category}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  className="input"
                                  value={docDraft?.workArea || ""}
                                  onChange={(e) =>
                                    setDocDraft((prev) => ({ ...prev, workArea: e.target.value }))
                                  }
                                  placeholder="Notes / work area"
                                />
                                <label
                                  className="small"
                                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={docDraft?.visibleToParticipants !== false}
                                    onChange={(e) =>
                                      setDocDraft((prev) => ({
                                        ...prev,
                                        visibleToParticipants: e.target.checked,
                                      }))
                                    }
                                  />
                                  Visible to participants
                                </label>
                                {!!docDraft?.pdfUrl && (
                                  <input type="file" onChange={handleReplaceDocumentFile} />
                                )}
                                <div className="row">
                                  <button className="btn btnPrimary" type="button" onClick={handleSaveDoc}>
                                    Save
                                  </button>
                                  <button className="btn" type="button" onClick={handleCancelEditDoc}>
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="btn"
                                    style={tripDocDeleteButtonStyle}
                                    onClick={() => void handleDeleteRequiredSlotResource(slot)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div
                                  className={slotTileWide ? undefined : "tripDocumentSquareTileTitle"}
                                  style={{ fontWeight: 900 }}
                                >
                                  {slot.key === "smartsheet-budget"
                                    ? slot.title
                                    : doc?.title || slot.title}
                                </div>
                                <div
                                  className={slotTileWide ? "small" : "small tripDocumentSquareTileMeta"}
                                  style={{ marginTop: 4 }}
                                >
                                  {slot.category} • {slot.description}
                                </div>
                                {isAutoGenerated ? (
                                  slot.key === "housing-accommodation-link" &&
                                  tripHousingDocuments.length <= 1 ? null : (
                                    <div className="small" style={{ marginTop: 4 }}>
                                      {slot.key === "housing-accommodation-link"
                                        ? "Main housing row plus additional slots from Budget. Staff can edit link/PDF here or on the Budget page."
                                        : `Auto-added from assigned site: ${trip?.location || "Site"}`}
                                    </div>
                                  )
                                ) : doc?.createdAt ? (
                                  <div className="small" style={{ marginTop: 4 }}>
                                    Updated {new Date(doc.createdAt).toLocaleDateString()}
                                  </div>
                                ) : null}
                                {canManageTripDocuments && available ? (
                                  <div className="small" style={{ marginTop: 4 }}>
                                    {doc?.visibleToParticipants === false
                                      ? "Hidden from participants"
                                      : "Visible to participants"}
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>
                          {available ? (
                            <span className="badge badgeSuccess">
                              {isAutoGenerated
                                ? slotTileWide
                                  ? "Auto Link"
                                  : "Auto"
                                : isPdf
                                  ? slotTileWide
                                    ? "PDF Ready"
                                    : "PDF"
                                  : slotTileWide
                                    ? "Link Ready"
                                    : "Link"}
                            </span>
                          ) : null}
                        </div>
                        {showHousingInlineForm ? null : (
                          <div className="row" style={{ marginTop: 10, flexWrap: "wrap", gap: 8 }}>
                            {available ? (
                              slot.key === "housing-accommodation-link" &&
                              isAutoGenerated &&
                              tripHousingDocuments.length > 0 ? (
                                <>
                                  {tripHousingDocuments.map((h, i) => {
                                    const pdf = String(h.pdfUrl || "").trim();
                                    const rawLink = String(h.link || "").trim();
                                    const linkHref = rawLink
                                      ? /^https?:\/\//i.test(rawLink)
                                        ? rawLink
                                        : `https://${rawLink}`
                                      : "";
                                    const href = pdf || linkHref;
                                    if (!href) return null;
                                    const labelPart =
                                      tripHousingDocuments.length > 1
                                        ? h.label || (i === 0 ? "" : `Extra ${i}`)
                                        : "";
                                    return (
                                      <a
                                        key={`housing-doc-open-${i}-${href}`}
                                        className={i === 0 ? "btn btnPrimary" : "btn"}
                                        href={href}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Open{labelPart ? ` (${labelPart})` : ""}
                                      </a>
                                    );
                                  })}
                                </>
                              ) : (
                                <a
                                  className="btn btnPrimary"
                                  href={doc.pdfUrl || doc.link}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open
                                </a>
                              )
                            ) : null}
                            {canManageTripDocuments && !isEditing && doc && !isAutoGenerated ? (
                              <button className="btn" type="button" onClick={() => handleEditDoc(doc)}>
                                Edit
                              </button>
                            ) : null}
                            {canManageTripDocuments &&
                            !isEditing &&
                            doc &&
                            !isAutoGenerated &&
                            isHousingSlot &&
                            staffViewAllParticipants &&
                            !showHousingInlineForm ? (
                              <button
                                type="button"
                                className="btn"
                                onClick={() =>
                                  setHousingTripDocsDraft({
                                    housingLink: tripHousingLinkUrl || "",
                                    pdfUrlKeep: tripHousingPdfUrl || "",
                                    clearPdf: false,
                                    file: null,
                                  })
                                }
                              >
                                Edit
                              </button>
                            ) : null}
                            {canManageTripDocuments && (!doc || isAutoGenerated) ? (
                              slot.key === "housing-accommodation-link" ? (
                                staffViewAllParticipants ? (
                                  <button
                                    type="button"
                                    className="btn"
                                    onClick={() =>
                                      setHousingTripDocsDraft({
                                        housingLink: tripHousingLinkUrl || "",
                                        pdfUrlKeep: tripHousingPdfUrl || "",
                                        clearPdf: false,
                                        file: null,
                                      })
                                    }
                                  >
                                    Edit
                                  </button>
                                ) : (
                                  <Link href="/budget" className="btn">
                                    Edit in Budget
                                  </Link>
                                )
                              ) : (
                                <button
                                  className="btn"
                                  type="button"
                                  onClick={() => handlePrepareRequiredLink(slot)}
                                >
                                  {isAutoGenerated ? "Edit" : "Add Link"}
                                </button>
                              )
                            ) : null}
                          </div>
                        )}
                        {showHousingInlineForm
                          ? null
                          : (() => {
                              if (slot.key === "smartsheet-budget") return null;
                              const tutorials = listEffectiveTutorials(slot, doc);
                              if (!tutorials.length) return null;

                              return (
                                <div
                                  style={{
                                    marginTop: 12,
                                    paddingTop: 12,
                                    borderTop: "1px solid rgba(15, 23, 42, 0.08)",
                                    display: "grid",
                                    gap: 12,
                                  }}
                                >
                                  {tutorials.map((tutorial, ti) => (
                                    <div
                                      key={`${slot.key}-tutorial-${ti}`}
                                      style={{ display: "grid", gap: 8 }}
                                    >
                                      <div className="small" style={{ fontWeight: 900 }}>
                                        Tutorial{ti > 0 ? ` ${ti + 1}` : ""}
                                      </div>
                                      <div className="small">
                                        {tutorial.tutorialDescription ||
                                          "Helpful walkthrough for this resource."}
                                      </div>
                                      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                                        <a
                                          className="btn"
                                          href={tutorial.tutorialUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          Watch
                                        </a>
                                        {canManageTripDocuments && slot.kind === "link" && ti === 0 ? (
                                          <button
                                            className="btn"
                                            type="button"
                                            onClick={() =>
                                              doc && !isAutoGenerated
                                                ? handleEditDoc(doc)
                                                : handlePrepareRequiredLink(slot)
                                            }
                                          >
                                            Edit Tutorial
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                      </>
                    );

                    return (
                      <div
                        key={slot.key}
                        className={tripDocumentTileRootClassName(slotTileWide)}
                        style={slotTileWide ? tripDocumentWideCardStyle : undefined}
                      >
                        {slotTileWide ? (
                          slotCardInner
                        ) : (
                          <div className="tripDocumentSquareTileScroll">{slotCardInner}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Fragment>
            ))}

            {canManageTripDocuments && hasDismissedDefaultTripDocumentSlots ? (
              <div className="small tripDocumentsTileGridFullRow" style={{ marginTop: 12, color: "var(--muted)" }}>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: "6px 14px", fontSize: 12 }}
                  onClick={() => void restoreDismissedDefaultTripDocuments()}
                >
                  Restore dismissed document slots (budget, site, housing)
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {tab === participantDocumentsTabLabel && (
        <div style={{ display: "grid", gap: 16 }}>
          <CollapsibleSection defaultOpen>
          <div className="card pad">
            <div
              className="row mobileSectionHeader"
              style={{
                marginBottom: 8,
                gap: 12,
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              <div className="cardSectionPill" style={{ marginBottom: 0 }}>
                {canViewTeamDashboard ? "Worker uploads" : "My documents"}
              </div>
              {canViewTeamDashboard ? (
                <div className="row mobileSectionHeaderActions" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <input
                    className="input mobileHeaderInput"
                    value={customParticipantDocumentLabel}
                    onChange={(event) => setCustomParticipantDocumentLabel(event.target.value)}
                    placeholder="Add upload item"
                    style={{ minWidth: 220 }}
                  />
                  <button className="btn" type="button" onClick={handleAddParticipantDocumentType}>
                    Add Upload
                  </button>
                </div>
              ) : null}
            </div>
            <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
              {canViewTeamDashboard
                ? "Per-participant uploads and review."
                : "Your uploads for this trip."}
            </div>
            {canViewTeamDashboard ? (
              <AppStatusMessage
                message={participantDocumentTypeStatus}
                tone={
                  participantDocumentTypeStatus === "Saved."
                    ? "success"
                    : participantDocumentTypeStatus === "Saving..."
                      ? "info"
                      : "danger"
                }
                compact
              />
            ) : (
              <div className="small" style={{ marginBottom: 10 }}>
                Upload your documents here. Staff can review them from your profile later too.
              </div>
            )}

            <AppStatusMessage message={participantDocumentsError} tone="danger" />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: canViewTeamDashboard
                  ? "repeat(auto-fit, minmax(280px, 1fr))"
                  : "1fr",
                gap: 16,
              }}
            >
              {workerDocumentParticipants.map((participant) => {
                const documentSlots = participantDocumentsByUserId.get(String(participant.id)) || {};
                const participantUploadedCount = tripUserDocumentTypes.filter(
                  (documentType) => !!documentSlots[documentType.key]
                ).length;
                const participantMissingCount = Math.max(
                  tripUserDocumentTypes.length - participantUploadedCount,
                  0
                );

                return (
                  <div
                    key={participant.id}
                    className="card pad"
                    style={{
                      boxShadow: "none",
                      borderRadius: 18,
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.92))",
                    }}
                  >
                    <div className="row" style={{ marginBottom: 14, alignItems: "flex-start", gap: 12 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 900 }}>
                          {canViewTeamDashboard && !participant.rosterOnly ? (
                            <Link href={`/profile?participantId=${encodeURIComponent(participant.id)}`}>
                              {participant.name}
                            </Link>
                          ) : (
                            canViewTeamDashboard ? participant.name : "My Uploads"
                          )}
                        </div>
                        <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>
                          {participantUploadedCount} uploaded · {participantMissingCount} missing
                        </div>
                      </div>
                      <span className={`badge ${participantMissingCount > 0 ? "badgeWarn" : "badgeSuccess"}`}>
                        {participantMissingCount > 0 ? "Needs review" : "Complete"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                      {tripUserDocumentTypes.map((documentType) => {
                        const document = documentSlots[documentType.key] || null;
                        const statusKey = `${participant.id}:${documentType.key}`;
                        const slotStatus = participantDocumentStatus[statusKey];

                        return (
                          <div
                            key={`${participant.id}-${documentType.key}`}
                            style={{
                              padding: 14,
                              borderRadius: 14,
                              border: "1px solid rgba(15, 23, 42, 0.08)",
                              background: "rgba(255,255,255,.78)",
                            }}
                          >
                            <div className="row" style={{ alignItems: "flex-start" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 900 }}>{documentType.label}</div>
                                <div className="small" style={{ marginTop: 4 }}>
                                  {document
                                    ? `Uploaded ${formatNoteTimestamp(document.updatedAt || document.createdAt)}`
                                    : documentType.description}
                                </div>
                              </div>
                              <span className={"badge " + (document ? "badgeSuccess" : "badgeWarn")}>
                                {document ? "Uploaded" : "Missing"}
                              </span>
                            </div>

                            <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
                              {document ? (
                                <a className="btn btnPrimary" href={document.fileUrl} target="_blank" rel="noreferrer">
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

                              {canUploadOwnParticipantDocuments && String(participant.id) === String(currentParticipant?.id) ? (
                                <>
                                  <button
                                    className="btn"
                                    type="button"
                                    onClick={() => participantDocumentInputRefs.current[statusKey]?.click()}
                                  >
                                    {document ? "Replace" : "Upload"}
                                  </button>
                                  <input
                                    ref={(element) => {
                                      participantDocumentInputRefs.current[statusKey] = element;
                                    }}
                                    type="file"
                                    hidden
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];
                                      const uploadUserId =
                                        session?.profileId || session?.id || participant.id;
                                      void handleUploadParticipantDocument(
                                        uploadUserId,
                                        documentType.key,
                                        file
                                      );
                                      event.target.value = "";
                                    }}
                                  />
                                </>
                              ) : null}

                              {(document && (
                                (canViewTeamDashboard) ||
                                (canUploadOwnParticipantDocuments && String(participant.id) === String(currentParticipant?.id))
                              )) ? (
                                <button
                                  className="btn"
                                  type="button"
                                  onClick={() => {
                                    if (confirmingParticipantDocumentDeleteId === document.id) {
                                      void handleDeleteParticipantDocument(document);
                                      return;
                                    }

                                    setConfirmingParticipantDocumentDeleteId(document.id);
                                  }}
                                >
                                  {confirmingParticipantDocumentDeleteId === document.id
                                    ? "Confirm Delete"
                                    : "Delete"}
                                </button>
                              ) : null}

                              {slotStatus?.message ? (
                                <AppStatusMessage
                                  message={slotStatus.message}
                                  tone={slotStatus.type === "error" ? "danger" : slotStatus.type === "success" ? "success" : "info"}
                                  compact
                                />
                              ) : null}
                              {canViewTeamDashboard && participant.rosterOnly ? (
                                <AppStatusMessage
                                  message="Waiting for worker account before upload."
                                  tone="warning"
                                  compact
                                />
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </CollapsibleSection>
        </div>
      )}

      {tab === "Travel Form" && (
        <div style={{ display: "grid", gap: 16 }}>
          <CollapsibleSection defaultOpen>
          <div className="card pad">
            <div className="cardSectionPill" style={{ marginBottom: 8 }}>Travel form responses</div>
            <div className="small" style={{ marginBottom: 12, opacity: 0.88 }}>
              Passport, emergency contacts, and travel preferences.
            </div>
            <div
              className="row mobileSectionHeader"
              style={{
                marginBottom: 12,
                alignItems: "flex-start",
                gap: 12,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <div className="small" style={{ flex: "1 1 280px", minWidth: 0, marginRight: "auto" }}>
                {canViewTeamDashboard
                  ? "Team travel form responses. Rows auto-generate as workers fill out the form from the Tasks tab."
                  : "Your travel form response. Fill out or update from the Tasks tab (Fill out Travel Form) or edit below."}
              </div>
              <div className="row mobileSectionHeaderActions" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {!staffViewAllParticipants && currentParticipant ? (
                  <button
                    type="button"
                    className="btn btnPrimary"
                    onClick={() =>
                      openTravelFormModal({
                        refKey: `user:${currentParticipant.id}`,
                        email: currentParticipant.email || "",
                      })
                    }
                  >
                    Edit my response
                  </button>
                ) : null}
                {canViewTeamDashboard ? (
                  <>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                  if (!trip) return;
                  const header = [
                    "Team Name",
                    "First Name (as it appears on your passport)",
                    "Middle Name (as it appears on your passport)",
                    "Last Name (as it appears on your passport)",
                    "Suffix",
                    "Your Email Address",
                    "Birthdate-Month",
                    "Birthdate-Day",
                    "Birthdate-Year",
                    "Gender",
                    "Citizenship",
                    "Passport Number",
                    "Passport Expiration Date (month/day/year)",
                    "Issuing Country",
                    "Special travel preferences\nPreferences may include leaving for your project early to do personal travel, staying after your project to do personal travel, flying a specific airline, needing extra time during layovers, using miles to purchase a ticket, asking LST to purchase tickets which you will then upgrade, flying home to a different city than you left from, etc..  If your preference increases the cost of the Base Ticket LST will ask you to pay the difference at the time of ticketing.\n\nRESPOND with details or \"\"NONE\"\"",
                    "Frequent Flyer numbers or Known Pre-check number",
                    "Site of LST Project (city AND country)",
                    "GATEWAY CITY-Subject to LST approval, I want to leave from the following Gateway City as our project departure point (typically this is the city nearest to you with an international airport):",
                    "Official Project Dates: DEPARTURE DATE-Please enter the date your team will depart for your project (as approved by LST).  If you plan on traveling to your site early, you may indicate that in the \"Special Travel Preferences\" field. The date you enter here, however, should be the official departure date for the project were you not doing any extra travel.",
                    "Official Project Dates: RETURN DATE-Please enter the date you must arrive back home (as approved by LST).  If you plan on doing personal travel after your project, you may indicate that in the \"Special Travel Preferences\" field.  The date you enter here, however, should be the official return date for the project were you not doing any extra travel.",
                    "Are you a minor (under 18 yrs old)?\n\nRESPOND \"\"YES\"\" or \"\"NO\"\"",
                    "Passport good for at least six months AFTER your LST trip ends?\n\nRESPOND \"\"YES\"\" or \"\"NO\"\"",
                    "Base Ticket -I understand that LST will book my travel from a Gateway City to my site, and back to that same Gateway City.  I understand I will need to get to the Gateway City at my own expense.\n\n(RESPOND \"\"YES\"\")",
                    "Team Travel-I understand that my entire team must arrive at our site on the same day, at the same airport, and at approximately the same time.\n\n(RESPOND \"\"YES\"\")",
                    "EndMeeting-I understand that all LST teams participate in a period of debriefing as their project ends and that this EndMeeting for church teams normally takes place within a week of my arrival back home.\n\n(RESPOND \"\"YES\"\")",
                    "Travel Insurance-I understand LST will purchase a basic international travel insurance plan and that you can upgrade by calling the company directly after receiving your card from LST. (www.faithventures.com/compare-plans)\n\n(RESPOND \"\"YES\"\")",
                  ];

                  const exportRows = visibleTravelFormParticipants;

                  const rows = exportRows.map((p) => {
                    const form = getTravelFormByRefKey(p.refKey) || null;

                    return [
                      form?.teamName || trip?.name || "",
                      form?.firstNamePassport || "",
                      form?.middleNamePassport || "",
                      form?.lastNamePassport || "",
                      form?.suffix || "",
                      form?.email || p?.email || "",
                      form?.birthdateMonth || "",
                      form?.birthdateDay || "",
                      form?.birthdateYear || "",
                      form?.gender || "",
                      form?.citizenship || "",
                      form?.passportNumber || "",
                      form?.passportExpirationDate || "",
                      form?.passportIssuingCountry || "",
                      form?.specialTravelPreferences || "",
                      form?.frequentFlyerPrecheck || "",
                      form?.siteProject || "",
                      form?.gatewayCity || "",
                      form?.departureDate || "",
                      form?.returnDate || "",
                      form?.isMinor || "",
                      form?.passportValidSixMonths || "",
                      form?.baseTicketAck || "",
                      form?.teamTravelAck || "",
                      form?.endMeetingAck || "",
                      form?.travelInsuranceAck || "",
                    ];
                  });

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

                  const blob = new Blob([csvContent], {
                    type: "text/csv;charset=utf-8;",
                  });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  const safeTripName = String(trip.name || "trip")
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "");
                  link.download = `${safeTripName || "trip"}-travel-form-responses.csv`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  showToast(`Exported ${safeTripName || "trip"}-travel-form-responses.csv`);
                }}
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                  if (!trip) return;
                  try {
                    const res = await fetch(TRAVEL_FORM_TEMPLATE_PATH);
                    if (!res.ok) {
                      const msg = "Travel agency template not found. Add travel-form-export.xlsx to public/templates/.";
                      setSubmitError(msg);
                      showToast(msg, "error");
                      return;
                    }
                    const ab = await res.arrayBuffer();
                    const exportParticipants = visibleTravelFormParticipants;
                    const { blob, error } = fillTravelFormExportTemplate(ab, {
                      participants: exportParticipants,
                      travelFormResponses,
                      trip,
                    });
                    if (error) {
                      const msg = String(error);
                      setSubmitError(msg);
                      showToast(msg, "error");
                      return;
                    }
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    const safeTripName = String(trip.name || "trip")
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, "");
                    const dateStr = new Date().toISOString().slice(0, 10);
                    link.download = `${safeTripName}-travel-agency-${dateStr}.xlsx`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    showToast(`Exported ${safeTripName}-travel-agency-${dateStr}.xlsx`);
                  } catch (e) {
                    const msg = e?.message || "Export failed.";
                    setSubmitError(msg);
                    showToast(msg, "error");
                  }
                }}
                >
                  Export for travel agency (Excel)
                </button>
                  </>
                ) : null}
              </div>
            </div>
            {canViewTeamDashboard ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <AppMetricCard
                  label="Expected Responses"
                  value={travelFormsSummary.totalParticipants}
                  detail="Team members represented in travel form review."
                  tone="info"
                />
                <AppMetricCard
                  label="Submitted"
                  value={travelFormsSummary.completedCount}
                  detail="Responses with at least core travel fields filled in."
                  tone={travelFormsSummary.completedCount > 0 ? "success" : "neutral"}
                />
                <AppMetricCard
                  label="Still Missing"
                  value={travelFormsSummary.missingCount}
                  detail="Participants who still need to submit their travel details."
                  tone={travelFormsSummary.missingCount > 0 ? "warning" : "success"}
                />
                <AppMetricCard
                  label="Passport Gaps"
                  value={travelFormsSummary.passportGaps}
                  detail="Submitted responses still missing passport number or expiration date."
                  tone={travelFormsSummary.passportGaps > 0 ? "warning" : "success"}
                />
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: canViewTeamDashboard
                  ? "repeat(auto-fit, minmax(320px, 1fr))"
                  : "1fr",
                gap: 16,
              }}
            >
              {visibleTravelFormParticipants.map((p) => {
                const form = getTravelFormByRefKey(p.refKey) || null;
                const hasSubmission = !!(
                  form &&
                  [
                    form.firstNamePassport,
                    form.lastNamePassport,
                    form.passportNumber,
                    form.email,
                    form.departureDate,
                    form.returnDate,
                  ].some((value) => String(value || "").trim())
                );
                const hasPassportGap =
                  hasSubmission &&
                  (!String(form?.passportNumber || "").trim() ||
                    !String(form?.passportExpirationDate || "").trim());
                const infoSections = [
                  {
                    title: "Identity",
                    fields: [
                      ["Team", form?.teamName || trip?.name || "—"],
                      ["Email", form?.email || p?.email || "—"],
                      ["Passport name", [form?.firstNamePassport, form?.middleNamePassport, form?.lastNamePassport].filter(Boolean).join(" ") || "—"],
                      ["Birthdate", [form?.birthdateMonth, form?.birthdateDay, form?.birthdateYear].filter(Boolean).join("/") || "—"],
                      ["Gender", form?.gender || "—"],
                      ["Citizenship", form?.citizenship || "—"],
                    ],
                  },
                  {
                    title: "Passport & travel",
                    fields: [
                      ["Passport #", form?.passportNumber || "—"],
                      ["Expiration", form?.passportExpirationDate || "—"],
                      ["Issuing country", form?.passportIssuingCountry || "—"],
                      ["Gateway city", form?.gatewayCity || "—"],
                      ["Departure", form?.departureDate ? formatSingleDate(form.departureDate) : "—"],
                      ["Return", form?.returnDate ? formatSingleDate(form.returnDate) : "—"],
                    ],
                  },
                  {
                    title: "Project & preferences",
                    fields: [
                      ["Project site", form?.siteProject || "—"],
                      ["Frequent flyer / Pre-check", form?.frequentFlyerPrecheck || "—"],
                      ["Minor", form?.isMinor || "—"],
                      ["Passport valid 6+ months", form?.passportValidSixMonths || "—"],
                    ],
                    wideValue: form?.specialTravelPreferences || "—",
                    wideLabel: "Special travel preferences",
                  },
                  {
                    title: "Acknowledgments",
                    fields: [
                      ["Base ticket", form?.baseTicketAck || "—"],
                      ["Team travel", form?.teamTravelAck || "—"],
                      ["EndMeeting", form?.endMeetingAck || "—"],
                      ["Insurance", form?.travelInsuranceAck || "—"],
                    ],
                  },
                ];

                return (
                  <div
                    key={p.refKey || p.id}
                    className="card pad"
                    style={{
                      borderRadius: 18,
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      background: "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(248,250,252,0.92))",
                    }}
                  >
                    <div className="row mobileCardTopRow" style={{ alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 900, color: "var(--text)" }}>
                          {canViewTeamDashboard ? p.name || p.email || "Participant" : "My response"}
                        </div>
                        <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>
                          {hasSubmission
                            ? hasPassportGap
                              ? "Response submitted, but passport details are incomplete."
                              : "Response submitted and ready for review."
                            : "No travel form response submitted yet."}
                        </div>
                      </div>
                      <span className={`badge ${hasSubmission ? (hasPassportGap ? "badgeWarn" : "badgeSuccess") : "badgeWarn"}`}>
                        {hasSubmission ? (hasPassportGap ? "Needs passport info" : "Submitted") : "Missing"}
                      </span>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => openTravelFormModal({ refKey: p.refKey, email: p.email || "" })}
                      >
                        {canViewTeamDashboard ? "View / Edit" : "Edit"}
                      </button>
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                      {infoSections.map((section) => (
                        <div
                          key={`${p.refKey}-${section.title}`}
                          style={{
                            borderRadius: 14,
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            background: "rgba(255,255,255,0.78)",
                            padding: "12px 14px",
                            display: "grid",
                            gap: 10,
                          }}
                        >
                          <div className="small" style={{ fontWeight: 900, color: "var(--foreground)" }}>
                            {section.title}
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                              gap: 10,
                            }}
                          >
                            {section.fields.map(([label, value]) => (
                              <div key={`${p.refKey}-${section.title}-${label}`} style={{ minWidth: 0 }}>
                                <div className="small" style={{ color: "var(--muted)", marginBottom: 2 }}>
                                  {label}
                                </div>
                                <div style={{ fontSize: 13, lineHeight: 1.5, wordBreak: "break-word" }}>
                                  {value || "—"}
                                </div>
                              </div>
                            ))}
                          </div>
                          {section.wideLabel ? (
                            <div>
                              <div className="small" style={{ color: "var(--muted)", marginBottom: 2 }}>
                                {section.wideLabel}
                              </div>
                              <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                                {section.wideValue}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {canViewTeamDashboard && visibleTravelFormParticipants.length === 0 && (
              <AppEmptyState
                title="No participants yet"
                description="Add team members in the Team tab roster to see and export their travel form responses here."
              />
            )}
            {!canViewTeamDashboard && !currentParticipant && (
              <AppEmptyState
                title="You are not assigned to this trip"
                description="Once you are assigned, your travel form response will appear here."
              />
            )}
          </div>
          </CollapsibleSection>
        </div>
      )}

            {tab === "Staff Tasks" && canManageTrips && !isLeader && (
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

                <table className="table dataTableStriped">
                  <thead>
                    <tr>
                      <th style={{ width: "39%" }}>Task</th>
                      <th style={{ width: "7%", textAlign: "center" }}>Assigned</th>
                      <th style={{ width: "14%", textAlign: "center" }}>Progress</th>
                      <th style={{ width: "10%" }}>Due Date</th>
                      <th style={{ width: "22%" }}>Notes</th>
                      <th style={{ width: "8%" }} />
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

                              <td>
                                {isEditingTitle ? (
                                  <AppDueDateTripleSelect
                                    ref={staffDueTripleRef}
                                    compact
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

                              <td>
                                <div className="staffTaskNotesCell">
                                  <textarea
                                    className="input staffTaskNotesInput"
                                    rows={2}
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

                              <td>
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

                <div className="small" style={{ marginTop: 12 }}>
                  Staff-only checklist for trip management tasks.
                </div>
              </div>
            </CollapsibleSection>
          </div>
      )}

      {travelFormModalOpen && (
        <div
          className="appModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Travel form"
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
          <div className="card pad appModalCard" style={{ width: "min(900px, 100%)", maxHeight: "90vh", overflow: "auto" }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>Travel Form</div>
              <div className="spacer" />
              <button className="btn" type="button" onClick={() => setTravelFormModalOpen(false)}>Close</button>
            </div>
            <div className="small" style={{ marginBottom: 14 }}>
              Complete all fields. LST uses this for ticketing and travel logistics.
            </div>
            {travelFormStatus ? (
              <div className="row" style={{ marginBottom: 10, alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <AppStatusMessage
                  message={travelFormStatus}
                  tone={travelFormStatus === "Saved." ? "success" : travelFormStatus === "Saving..." ? "info" : "danger"}
                />
                {travelFormStatus !== "Saving..." && travelFormStatus !== "Saved." ? (
                  <button type="button" className="btn btnPrimary" onClick={() => handleSaveTravelForm()}>
                    Try again
                  </button>
                ) : null}
              </div>
            ) : null}
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <div><div className="small" style={{ marginBottom: 4 }}>Team Name</div>{canViewTeamDashboard ? <input className="input" value={travelFormDraft.teamName} onChange={(e) => setTravelFormDraft((d) => ({ ...d, teamName: e.target.value }))} placeholder="2026 Brazil Team" /> : <input className="input" readOnly disabled value={travelFormDraft.teamName} style={{ opacity: 0.9, cursor: "not-allowed" }} />}</div>
                <div><div className="small" style={{ marginBottom: 4 }}>First Name (passport)</div><input className="input" value={travelFormDraft.firstNamePassport} onChange={(e) => setTravelFormDraft((d) => ({ ...d, firstNamePassport: e.target.value }))} /></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Middle Name (passport)</div><input className="input" value={travelFormDraft.middleNamePassport} onChange={(e) => setTravelFormDraft((d) => ({ ...d, middleNamePassport: e.target.value }))} /></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Last Name (passport)</div><input className="input" value={travelFormDraft.lastNamePassport} onChange={(e) => setTravelFormDraft((d) => ({ ...d, lastNamePassport: e.target.value }))} /></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Suffix</div><input className="input" value={travelFormDraft.suffix} onChange={(e) => setTravelFormDraft((d) => ({ ...d, suffix: e.target.value }))} placeholder="Jr., Sr." /></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Email</div><input className="input" type="email" value={travelFormDraft.email} onChange={(e) => setTravelFormDraft((d) => ({ ...d, email: e.target.value }))} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                <div><div className="small" style={{ marginBottom: 4 }}>Birthdate Month</div><select className="input" value={travelFormDraft.birthdateMonth} onChange={(e) => setTravelFormDraft((d) => ({ ...d, birthdateMonth: e.target.value }))}><option value="">—</option>{BIRTHDATE_MONTH_OPTIONS.filter(Boolean).map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Birthdate Day</div><select className="input" value={travelFormDraft.birthdateDay} onChange={(e) => setTravelFormDraft((d) => ({ ...d, birthdateDay: e.target.value }))}><option value="">—</option>{BIRTHDATE_DAY_OPTIONS.filter(Boolean).map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Birthdate Year</div><select className="input" value={travelFormDraft.birthdateYear} onChange={(e) => setTravelFormDraft((d) => ({ ...d, birthdateYear: e.target.value }))}><option value="">—</option>{BIRTHDATE_YEAR_OPTIONS.filter(Boolean).map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Gender</div><select className="input" value={travelFormDraft.gender} onChange={(e) => setTravelFormDraft((d) => ({ ...d, gender: e.target.value }))}>{GENDER_OPTIONS.map((g) => <option key={g || "__blank__"} value={g}>{g || "—"}</option>)}</select></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Citizenship</div><input className="input" value={travelFormDraft.citizenship} onChange={(e) => setTravelFormDraft((d) => ({ ...d, citizenship: e.target.value }))} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <div><div className="small" style={{ marginBottom: 4 }}>Passport Number</div><input className="input" value={travelFormDraft.passportNumber} onChange={(e) => setTravelFormDraft((d) => ({ ...d, passportNumber: e.target.value }))} /></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Passport Expiration (M/D/Y)</div><input className="input" value={travelFormDraft.passportExpirationDate} onChange={(e) => setTravelFormDraft((d) => ({ ...d, passportExpirationDate: e.target.value }))} placeholder="MM/DD/YYYY" /></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Issuing Country</div><input className="input" value={travelFormDraft.passportIssuingCountry} onChange={(e) => setTravelFormDraft((d) => ({ ...d, passportIssuingCountry: e.target.value }))} /></div>
              </div>
              <div><div className="small" style={{ marginBottom: 4 }}>Special travel preferences (extra travel, airline, layovers, miles, upgrades, etc. or NONE)</div><textarea className="input" rows={3} value={travelFormDraft.specialTravelPreferences} onChange={(e) => setTravelFormDraft((d) => ({ ...d, specialTravelPreferences: e.target.value }))} /></div>
              <div><div className="small" style={{ marginBottom: 4 }}>Frequent Flyer / Known Traveler (Pre-check) number</div><input className="input" value={travelFormDraft.frequentFlyerPrecheck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, frequentFlyerPrecheck: e.target.value }))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                <div><div className="small" style={{ marginBottom: 4 }}>Site of LST Project (city AND country)</div><input className="input" value={travelFormDraft.siteProject} onChange={(e) => setTravelFormDraft((d) => ({ ...d, siteProject: e.target.value }))} /></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Gateway City (departure point)</div><input className="input" value={travelFormDraft.gatewayCity} onChange={(e) => setTravelFormDraft((d) => ({ ...d, gatewayCity: e.target.value }))} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                <div><div className="small" style={{ marginBottom: 4 }}>Official Departure Date</div><input className="input" type="date" value={travelFormDraft.departureDate} onChange={(e) => setTravelFormDraft((d) => ({ ...d, departureDate: e.target.value }))} /></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Official Return Date</div><input className="input" type="date" value={travelFormDraft.returnDate} onChange={(e) => setTravelFormDraft((d) => ({ ...d, returnDate: e.target.value }))} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                <div><div className="small" style={{ marginBottom: 4 }}>Minor (under 18)</div><select className="input" value={travelFormDraft.isMinor} onChange={(e) => setTravelFormDraft((d) => ({ ...d, isMinor: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Passport valid 6+ months after trip</div><select className="input" value={travelFormDraft.passportValidSixMonths} onChange={(e) => setTravelFormDraft((d) => ({ ...d, passportValidSixMonths: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <div><div className="small" style={{ marginBottom: 4 }}>Base Ticket: I understand LST will book my travel from Gateway City to site and back.</div><select className="input" value={travelFormDraft.baseTicketAck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, baseTicketAck: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Team Travel: I understand my team must arrive same day, same airport, same time.</div><select className="input" value={travelFormDraft.teamTravelAck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, teamTravelAck: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                <div><div className="small" style={{ marginBottom: 4 }}>End Meeting: I understand debriefing takes place within a week of return.</div><select className="input" value={travelFormDraft.endMeetingAck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, endMeetingAck: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
                <div><div className="small" style={{ marginBottom: 4 }}>Travel Insurance: I understand LST purchases basic plan; I can upgrade.</div><select className="input" value={travelFormDraft.travelInsuranceAck} onChange={(e) => setTravelFormDraft((d) => ({ ...d, travelInsuranceAck: e.target.value }))}>{YES_NO_OPTIONS.map((o) => <option key={o || "__blank__"} value={o}>{o || "—"}</option>)}</select></div>
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn btnPrimary" type="button" onClick={() => void handleSaveTravelForm()}>Save Travel Form</button>
            </div>
          </div>
        </div>
      )}

      </div>
    </Shell>
  );
}
