import Link from "next/link";
import AppIcon from "@/components/AppIcon";
import AppDueDateTripleSelect from "@/components/AppDueDateTripleSelect";
import { Fragment } from "react";
import {
  DOCUMENT_CATEGORY_OPTIONS,
  getDocumentSlotByKey,
  REQUIRED_TRIP_DOCUMENT_SLOTS,
} from "@/lib/tripDocumentSlots";
import { DEFAULT_TRAINING_TIMELINE_TYPE } from "@/lib/workerTaskTemplate";

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
  compact = false,
}) {
  return (
    <div
      style={{
        padding: compact ? "12px 14px" : "16px 18px",
        borderRadius: 14,
        border: "1px dashed rgba(15, 23, 42, 0.16)",
        background: "rgba(248, 250, 252, 0.75)",
        display: "grid",
        gap: compact ? 4 : 6,
      }}
    >
      <div
        className={compact ? "small" : undefined}
        style={
          compact
            ? {
                fontWeight: 600,
                fontSize: 13,
                lineHeight: 1.45,
                color: "var(--muted)",
              }
            : { fontWeight: 800, color: "var(--text)" }
        }
      >
        {title}
      </div>
      {description ? (
        <div
          className="small"
          style={{
            color: "var(--muted)",
            lineHeight: 1.45,
            fontSize: compact ? 13 : undefined,
          }}
        >
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
  compact = false,
}) {
  const palette = APP_STATUS_TONES[tone] || APP_STATUS_TONES.neutral;
  return (
    <div
      style={{
        padding: compact ? "8px 12px" : "14px 16px",
        borderRadius: compact ? 12 : 16,
        minHeight: compact ? undefined : 112,
        width: compact ? "fit-content" : undefined,
        minWidth: compact ? 112 : undefined,
        background: "#fff",
        border: palette.border,
        boxShadow: compact ? "0 6px 16px rgba(15, 23, 42, 0.05)" : "0 12px 28px rgba(15, 23, 42, 0.06)",
        display: "grid",
        gap: compact ? 4 : 8,
        alignContent: "start",
        justifyItems: compact ? "center" : undefined,
      }}
    >
      <div
        style={{
          fontSize: compact ? 9 : 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: palette.color,
          lineHeight: 1.3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: compact ? 22 : 28,
          lineHeight: 1,
          fontWeight: 900,
          color: "var(--text)",
        }}
      >
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

const TRAVEL_FORM_MODAL_SECTION_STYLE = {
  borderRadius: 14,
  border: "1px solid rgba(15, 23, 42, 0.08)",
  background: "rgba(255, 255, 255, 0.94)",
  padding: "14px 16px",
  display: "grid",
  gap: 12,
};

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
      inviteTitle: "Send the one-time Hub invite email",
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

/** Standard defaults — show empty field + grey placeholder like domestic fees, not prefilled values. */
const DEFAULT_TRIP_FEE_AMOUNT = 600;
const DEFAULT_MATERIALS_FEE_AMOUNT = 250;
const DEFAULT_HANNOVER_HOUSING_FEE_AMOUNT = 600;

function draftFeeAmountUnlessDefault(storedValue, defaultAmount) {
  if (storedValue === null || storedValue === undefined || storedValue === "") return "";
  const n = Number(storedValue);
  if (!Number.isFinite(n)) return formatDraftAmount(storedValue);
  if (n === defaultAmount) return "";
  return String(n);
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
    tripFeeAmount: draftFeeAmountUnlessDefault(trip?.tripFeeAmount, DEFAULT_TRIP_FEE_AMOUNT),
    materialsFeeAmount: draftFeeAmountUnlessDefault(trip?.materialsFeeAmount, DEFAULT_MATERIALS_FEE_AMOUNT),
    hasDeferredWorker: trip?.hasDeferredWorker ? "yes" : "no",
    hannoverHousingFeeAmount: draftFeeAmountUnlessDefault(
      trip?.hannoverHousingFeeAmount,
      DEFAULT_HANNOVER_HOUSING_FEE_AMOUNT
    ),
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
    cellPhone: "",
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
    cellPhone: "",
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
function buildTrainingSessionMeetingsFromState(
  trainingState,
  allTrainingModules,
  { personName = "", personEmail = "" } = {}
) {
  if (!trainingState || !allTrainingModules?.length) return [];
  const rows = [];
  const emailKey = String(personEmail || "")
    .trim()
    .toLowerCase();
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
    const name = String(personName || "").trim();
    rows.push({
      id: `training-session:${module.id}:${emailKey || "self"}`,
      title: name ? `${displayTitle} · ${name}` : displayTitle,
      scheduledAt,
      notesAfter: "",
      isTrainingSession: true,
      trainingModuleTitle: module.title,
      participantName: name,
      participantEmail: emailKey,
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

function TrainingResourceLink({ resource }) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      className="tripTrainingResourceBtn"
      style={{ "--training-accent": resource.accent }}
    >
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="tripTrainingResourceBtnIcon">{resource.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tripTrainingResourceBtnTitle">{resource.title}</div>
          {Array.isArray(resource.descriptionBullets) ? (
            <ul className="small tripTrainingResourceBtnCopy">
              {resource.descriptionBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <div className="small tripTrainingResourceBtnCopy">{resource.description}</div>
          )}
          <span className="tripTrainingResourceBtnCta">
            Open training
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </a>
  );
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

/** Standard items staff checks while packing the team materials box (Materials tab, staff only). */
const MATERIALS_PACKING_CHECKLIST_ITEMS = [
  { key: "readerInfoSheets", label: "Reader info sheets" },
  { key: "lstPens", label: "LST pens" },
  { key: "seedThoughts", label: "Seed Thoughts" },
  { key: "dailyPlanners", label: "Daily Planners" },
  { key: "workbooks", label: "Workbooks" },
  { key: "tShirts", label: "T-shirts" },
  {
    key: "donnaCheck",
    label: "Check",
    title: "Budget check from Donna — mail out with the shipping box",
  },
];

function defaultMaterialsPackingChecklist() {
  return Object.fromEntries(MATERIALS_PACKING_CHECKLIST_ITEMS.map(({ key }) => [key, false]));
}

function parseMaterialsPackingChecklist(raw) {
  const base = defaultMaterialsPackingChecklist();
  if (raw == null) return base;
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return base;
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return base;
  for (const { key } of MATERIALS_PACKING_CHECKLIST_ITEMS) {
    if (typeof obj[key] === "boolean") base[key] = obj[key];
  }
  return base;
}

export {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
  AppDetailAction,
  TrainingResourceLink,
  OptionalTripWideDocumentCard,
  toDatetimeLocalValue,
  normalizeEmail,
  normalizeLegacyTeamRole,
  shouldIncludeInTripWorkerPipeline,
  numWorkersDraftFromBudgetValue,
  getWorkerConnectionStatus,
  preferredTripResourceOpenUrl,
  formatDraftAmount,
  draftFeeAmountUnlessDefault,
  buildDateOffsetFromToday,
  buildTripSetupDraft,
  createEmptyRosterMember,
  createEmptyWorkerDraft,
  buildStaffTaskRowDomId,
  buildWorkerTaskRowDomId,
  buildTrainingModuleRowDomId,
  buildTrainingSessionMeetingsFromState,
  getDocumentCategoryBadgeClass,
  buildDocumentDraft,
  getEffectiveTutorialContent,
  listEffectiveTutorials,
  tripDocumentTileRootClassName,
  siteLinkActionButtonStyle,
  tripDocDeleteButtonStyle,
  tripDocumentWideCardStyle,
  isTripDocumentFlightsCategory,
  categoryForTripResourceDoc,
  parseTripDocumentWorkAreaMeta,
  buildTripDocumentWorkAreaMeta,
  getTripDocumentWorkerLabel,
  snapshotTripResourceForInsert,
  isPersistedTripResourceDismissedEmpty,
  findDismissedPersistedTripResource,
  docHasAnyContent,
  docUpdatedMs,
  pickPreferredDocByRequiredKey,
  dedupeRequiredSlotResources,
  pickMainHousingDocFromViewerList,
  fetchTripHousingState,
  defaultMaterialsPackingChecklist,
  parseMaterialsPackingChecklist,
  WORKER_PREVIEW_PARTICIPANT_ID,
  LEADER_PREVIEW_PARTICIPANT_ID,
  ROSTER_PREVIEW_PREFIX,
  MATERIALS_PACKING_CHECKLIST_ITEMS,
  TRAVEL_FORM_MODAL_SECTION_STYLE,
  BIRTHDATE_MONTH_OPTIONS,
  BIRTHDATE_DAY_OPTIONS,
  BIRTHDATE_YEAR_OPTIONS,
  GENDER_OPTIONS,
  YES_NO_OPTIONS,
  TEAM_STATUS_OPTIONS,
  TEAM_MEMBER_ROLE_OPTIONS,
  WORKER_TRIP_TASK_SECTION_OPTIONS,
  STAFF_TASK_AREA_LABELS,
  CUSTOM_SITE_OPTION,
  DEFAULT_TRIP_FEE_AMOUNT,
  DEFAULT_MATERIALS_FEE_AMOUNT,
  DEFAULT_HANNOVER_HOUSING_FEE_AMOUNT,
  TRAINING_MEETING_MODULE_TITLES,
};
