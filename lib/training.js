import { supabase } from "@/lib/supabase";
import {
  TRAINING_TIMELINE_COLLEGE,
  normalizeTrainingTimelineType,
} from "@/lib/workerTaskTemplate";

export const CLASSROOM_MODULES = [
  { title: "Module 1 - Welcome to LST Training", category: "classroom", requires_date: false, sort_order: 1 },
  { title: "Module 2 - Fundraising", category: "classroom", requires_date: false, sort_order: 2 },
  { title: "Team Dynamics", category: "classroom", requires_date: false, sort_order: 3 },
  { title: "Culture", category: "classroom", requires_date: false, sort_order: 4 },
  { title: "Making LST Work Onsite", category: "classroom", requires_date: false, sort_order: 5 },
  { title: "Onsite Tools", category: "classroom", requires_date: false, sort_order: 6 },
  { title: "Debriefing and Reentry", category: "classroom", requires_date: false, sort_order: 7 },
];

const SUPPLEMENTAL_MODULES = [
  { title: "Basic Training", category: "supplemental", requires_date: true, sort_order: 10 },
  { title: "Gateway Training", category: "supplemental", requires_date: true, sort_order: 11 },
  { title: "EndMeeting", category: "supplemental", requires_date: true, sort_order: 12 },
];

const DEFAULT_MODULES = [...CLASSROOM_MODULES, ...SUPPLEMENTAL_MODULES];

/** Legacy Canvas titles → new Google Classroom row (same DB id, progress preserved). */
export const CANVAS_TO_CLASSROOM_MIGRATION = {
  "canvas mod 1 (welcome)": { title: "Module 1 - Welcome to LST Training", sort_order: 1 },
  "canvas mod 2 (fundraising)": { title: "Module 2 - Fundraising", sort_order: 2 },
  "canvas mod 4 (team dynamics)": { title: "Team Dynamics", sort_order: 3 },
  "canvas mod 5 (culture)": { title: "Culture", sort_order: 4 },
  "canvas mod 6 (lst onsite)": { title: "Making LST Work Onsite", sort_order: 5 },
  "canvas mod 7 (lst onsite tools)": { title: "Onsite Tools", sort_order: 6 },
  "canvas mod 9 (debriefing)": { title: "Debriefing and Reentry", sort_order: 7 },
};

/** Retired from online modules; completion copies to supplemental live-session rows. */
export const CANVAS_RETIRE_COPY_TO_SUPPLEMENTAL = {
  "canvas mod 3 (basic training)": "Basic Training",
  "canvas mod 8 (gateway training)": "Gateway Training",
};

const STANDARD_TRAINING_DEADLINE_RULES_BY_TITLE = {
  "Module 1 - Welcome to LST Training": { type: "days_before_start", days: 90 },
  "Module 2 - Fundraising": { type: "days_before_start", days: 90 },
  "Team Dynamics": { type: "days_before_start", days: 60 },
  Culture: { type: "days_before_start", days: 60 },
  "Making LST Work Onsite": { type: "days_before_start", days: 60 },
  "Onsite Tools": { type: "days_before_start", days: 30 },
  "Debriefing and Reentry": { type: "days_before_start", days: 30 },
  "Basic Training": { type: "months_before_start", months: 3 },
  "Gateway Training": { type: "months_before_start", months: 1 },
  EndMeeting: { type: "trip_end" },
  // Legacy Canvas titles (unmigrated rows)
  "Canvas Mod 1 (Welcome)": { type: "days_before_start", days: 90 },
  "Canvas Mod 2 (Fundraising)": { type: "days_before_start", days: 90 },
  "Canvas Mod 3 (Basic Training)": { type: "months_before_start", months: 3 },
  "Canvas Mod 4 (Team Dynamics)": { type: "days_before_start", days: 60 },
  "Canvas Mod 5 (Culture)": { type: "days_before_start", days: 60 },
  "Canvas Mod 6 (LST Onsite)": { type: "days_before_start", days: 60 },
  "Canvas Mod 7 (LST Onsite Tools)": { type: "days_before_start", days: 30 },
  "Canvas Mod 8 (Gateway Training)": { type: "months_before_start", months: 1 },
  "Canvas Mod 9 (Debriefing)": { type: "days_before_start", days: 30 },
};

const COLLEGE_TRAINING_DEADLINE_RULES_BY_TITLE = {
  "Module 1 - Welcome to LST Training": { type: "month_anchor", month: 10, day: 15, yearOffset: -1 },
  "Module 2 - Fundraising": { type: "month_anchor", month: 10, day: 15, yearOffset: -1 },
  "Team Dynamics": { type: "month_anchor", month: 2, day: 15, yearOffset: 0 },
  Culture: { type: "month_anchor", month: 2, day: 15, yearOffset: 0 },
  "Making LST Work Onsite": { type: "month_anchor", month: 3, day: 15, yearOffset: 0 },
  "Onsite Tools": { type: "month_anchor", month: 3, day: 15, yearOffset: 0 },
  "Debriefing and Reentry": { type: "month_anchor", month: 4, day: 15, yearOffset: 0 },
  "Basic Training": { type: "months_before_start", months: 3 },
  "Gateway Training": { type: "months_before_start", months: 1 },
  EndMeeting: { type: "month_anchor", month: 5, day: 15, yearOffset: 0 },
  "Canvas Mod 1 (Welcome)": { type: "month_anchor", month: 10, day: 15, yearOffset: -1 },
  "Canvas Mod 2 (Fundraising)": { type: "month_anchor", month: 10, day: 15, yearOffset: -1 },
  "Canvas Mod 3 (Basic Training)": { type: "months_before_start", months: 3 },
  "Canvas Mod 4 (Team Dynamics)": { type: "month_anchor", month: 2, day: 15, yearOffset: 0 },
  "Canvas Mod 5 (Culture)": { type: "month_anchor", month: 2, day: 15, yearOffset: 0 },
  "Canvas Mod 6 (LST Onsite)": { type: "month_anchor", month: 3, day: 15, yearOffset: 0 },
  "Canvas Mod 7 (LST Onsite Tools)": { type: "month_anchor", month: 3, day: 15, yearOffset: 0 },
  "Canvas Mod 8 (Gateway Training)": { type: "months_before_start", months: 1 },
  "Canvas Mod 9 (Debriefing)": { type: "month_anchor", month: 4, day: 15, yearOffset: 0 },
};

export function normalizeTrainingModuleTitleKey(title) {
  return String(title || "").trim().toLowerCase();
}

export function isOnlineTrainingModuleCategory(category) {
  return category === "classroom" || category === "canvas";
}

export function isActiveTrainingModule(row) {
  return String(row?.category || "") !== "retired";
}

export function tripNeedsClassroomTrainingMigration(modules = []) {
  return (modules || []).some((row) => {
    const key = normalizeTrainingModuleTitleKey(row.title);
    return (
      row.category === "canvas" ||
      key in CANVAS_TO_CLASSROOM_MIGRATION ||
      key in CANVAS_RETIRE_COPY_TO_SUPPLEMENTAL
    );
  });
}

function normalizeModule(row) {
  return {
    id: row.id,
    title: row.title || "Untitled module",
    category: row.category || "supplemental",
    requiresDate: !!row.requires_date,
    sortOrder: Number(row.sort_order || 0),
  };
}

function normalizeProgress(row) {
  if (!row || typeof row !== "object") {
    return {
      id: "",
      tripId: "",
      userId: "",
      moduleId: "",
      completed: false,
      completedAt: "",
      notes: "",
    };
  }
  const at = row.completed_at ?? row.completedAt;
  return {
    id: row.id,
    tripId: row.trip_id ?? row.tripId,
    userId: row.user_id ?? row.userId,
    moduleId: row.training_module_id ?? row.moduleId,
    completed: !!row.completed,
    completedAt: at != null && at !== "" ? String(at) : "",
    notes: row.notes || "",
  };
}

/** Timestamptz-friendly value; avoids driver/DB quirks with offset strings on some setups. */
function normalizeCompletedAtForDb(completedAt) {
  if (completedAt == null || completedAt === "") return null;
  const s = String(completedAt).trim();
  if (!s) return null;
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return s;
  return new Date(ms).toISOString();
}

async function fetchTripTrainingModuleRows(tripId) {
  const { data, error } = await supabase
    .from("trip_training_modules")
    .select("*")
    .eq("trip_id", tripId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error loading training modules", error);
    throw error;
  }

  return data || [];
}

async function copyTrainingProgressBetweenModules(tripId, fromModuleId, toModuleId, progressRows) {
  const fromId = String(fromModuleId);
  const toId = String(toModuleId);
  if (!fromId || !toId || fromId === toId) return;

  for (const row of progressRows || []) {
    if (String(row.training_module_id) !== fromId) continue;
    if (!row.completed && !row.completed_at) continue;

    await saveTrainingProgress({
      tripId,
      userId: row.user_id,
      moduleId: toId,
      completed: !!row.completed,
      completedAt: row.completed_at,
      notes: row.notes,
    });
  }
}

export async function migrateTripTrainingModulesToClassroom(tripId, existingRows) {
  const modules = [...(existingRows || [])];
  const byTitle = new Map(modules.map((row) => [normalizeTrainingModuleTitleKey(row.title), row]));

  const { data: progressRows, error: progressError } = await supabase
    .from("user_training_progress")
    .select("*")
    .eq("trip_id", tripId);

  if (progressError) {
    console.error("Error loading training progress for classroom migration", progressError);
    throw progressError;
  }

  for (const [oldKey, next] of Object.entries(CANVAS_TO_CLASSROOM_MIGRATION)) {
    const row = byTitle.get(oldKey);
    if (!row) continue;

    const { error } = await supabase
      .from("trip_training_modules")
      .update({
        title: next.title,
        category: "classroom",
        sort_order: next.sort_order,
      })
      .eq("id", row.id);

    if (error) {
      console.error("Error renaming training module for classroom migration", error);
      throw error;
    }
  }

  for (const [oldKey, supplementalTitle] of Object.entries(CANVAS_RETIRE_COPY_TO_SUPPLEMENTAL)) {
    const fromRow = byTitle.get(oldKey);
    if (!fromRow) continue;

    const toRow = byTitle.get(normalizeTrainingModuleTitleKey(supplementalTitle));
    if (toRow) {
      await copyTrainingProgressBetweenModules(tripId, fromRow.id, toRow.id, progressRows || []);
    }

    const { error } = await supabase
      .from("trip_training_modules")
      .update({
        category: "retired",
        sort_order: 999,
      })
      .eq("id", fromRow.id);

    if (error) {
      console.error("Error retiring training module for classroom migration", error);
      throw error;
    }
  }

  return fetchTripTrainingModuleRows(tripId);
}

async function seedMissingTrainingModules(tripId, existingModules) {
  const existingTitles = new Set(
    existingModules.map((module) => normalizeTrainingModuleTitleKey(module.title))
  );
  const missingModules = DEFAULT_MODULES.filter(
    (module) => !existingTitles.has(normalizeTrainingModuleTitleKey(module.title))
  );

  if (missingModules.length === 0) {
    return existingModules;
  }

  const { data: seeded, error: seedError } = await supabase
    .from("trip_training_modules")
    .insert(
      missingModules.map((module) => ({
        trip_id: tripId,
        ...module,
      }))
    )
    .select("*");

  if (seedError) {
    console.error("Error seeding training modules", seedError);
    throw seedError;
  }

  return [...existingModules, ...(seeded || [])];
}

export async function listTrainingModules(tripId) {
  let existingModules = await fetchTripTrainingModuleRows(tripId);

  if (tripNeedsClassroomTrainingMigration(existingModules)) {
    existingModules = await migrateTripTrainingModulesToClassroom(tripId, existingModules);
  }

  const withSeeded = await seedMissingTrainingModules(tripId, existingModules);

  return withSeeded
    .filter(isActiveTrainingModule)
    .map(normalizeModule)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listTrainingProgress(tripId) {
  const { data, error } = await supabase
    .from("user_training_progress")
    .select("*")
    .eq("trip_id", tripId);

  if (error) {
    console.error("Error loading training progress", error);
    throw error;
  }

  return (data || []).map(normalizeProgress);
}

/**
 * Resolve profiles.id when saving training for someone on the trip roster who is not in
 * trip_assignments (so they do not appear in trip.participants). Staff can read any profile;
 * workers only resolve their own row via RLS.
 */
export async function resolveProfileIdByEmailForTraining(email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", key)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("resolveProfileIdByEmailForTraining", error);
    return null;
  }

  return data?.id || null;
}

export async function saveTrainingProgress({
  tripId,
  userId,
  moduleId,
  completed,
  completedAt,
  notes,
}) {
  const mid = String(moduleId ?? "").trim();
  const uid = String(userId ?? "").trim();
  const tid = String(tripId ?? "").trim();

  const { data: existing, error: existingError } = await supabase
    .from("user_training_progress")
    .select("id")
    .eq("trip_id", tid)
    .eq("user_id", uid)
    .eq("training_module_id", mid)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking training progress", existingError);
    throw existingError;
  }

  const payload = {
    trip_id: tid,
    user_id: uid,
    training_module_id: mid,
    completed: !!completed,
    completed_at: normalizeCompletedAtForDb(completedAt),
    notes: notes || null,
  };

  const query = existing
    ? supabase.from("user_training_progress").update(payload).eq("id", existing.id)
    : supabase.from("user_training_progress").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    console.error("Error saving training progress", error);
    throw error;
  }

  return normalizeProgress(data);
}

export function getTrainingModuleDeadline(
  moduleTitle,
  { startDate, endDate, trainingTimelineType } = {}
) {
  const normalizedTimeline = normalizeTrainingTimelineType(trainingTimelineType);
  const deadlineRulesByTitle =
    normalizedTimeline === TRAINING_TIMELINE_COLLEGE
      ? COLLEGE_TRAINING_DEADLINE_RULES_BY_TITLE
      : STANDARD_TRAINING_DEADLINE_RULES_BY_TITLE;
  const rule = deadlineRulesByTitle[String(moduleTitle || "").trim()];

  if (!rule) return null;

  if (rule.type === "trip_end") {
    return endDate || startDate || null;
  }

  if (rule.type === "days_before_start") {
    return subtractDays(startDate, rule.days);
  }

  if (rule.type === "months_before_start") {
    return subtractMonths(startDate, rule.months);
  }

  if (rule.type === "month_anchor") {
    return buildAnchoredDate(startDate, rule);
  }

  return null;
}

function subtractDays(startDate, daysBeforeStart) {
  if (!startDate || typeof daysBeforeStart !== "number") {
    return null;
  }

  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setDate(date.getDate() - daysBeforeStart);
  return date.toISOString().slice(0, 10);
}

function subtractMonths(startDate, monthsBeforeStart) {
  if (!startDate || typeof monthsBeforeStart !== "number") {
    return null;
  }

  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const originalDay = date.getDate();
  date.setMonth(date.getMonth() - monthsBeforeStart);

  if (date.getDate() !== originalDay) {
    date.setDate(0);
  }

  return date.toISOString().slice(0, 10);
}

function buildAnchoredDate(startDate, rule) {
  if (!startDate || !rule?.month || !rule?.day) {
    return null;
  }

  const parsedStartDate = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(parsedStartDate.getTime())) {
    return null;
  }

  const year = parsedStartDate.getUTCFullYear() + Number(rule.yearOffset || 0);
  const month = String(rule.month).padStart(2, "0");
  const day = String(rule.day).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
