import { supabase } from "@/lib/supabase";
import {
  TRAINING_TIMELINE_COLLEGE,
  normalizeTrainingTimelineType,
} from "@/lib/workerTaskTemplate";

export const CLASSROOM_MODULES = [
  { title: "Module 1 - Welcome to LST Training", category: "classroom", requires_date: false, sort_order: 1 },
  { title: "Module 2 - Fundraising", category: "classroom", requires_date: false, sort_order: 2 },
  { title: "Module 3 - Team Dynamics", category: "classroom", requires_date: false, sort_order: 3 },
  { title: "Module 4 - Culture", category: "classroom", requires_date: false, sort_order: 4 },
  { title: "Module 5 - Making LST Work Onsite", category: "classroom", requires_date: false, sort_order: 5 },
  { title: "Module 6 - Onsite Tools", category: "classroom", requires_date: false, sort_order: 6 },
  { title: "Module 7 - Debriefing and Reentry", category: "classroom", requires_date: false, sort_order: 7 },
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
  "canvas mod 4 (team dynamics)": { title: "Module 3 - Team Dynamics", sort_order: 3 },
  "canvas mod 5 (culture)": { title: "Module 4 - Culture", sort_order: 4 },
  "canvas mod 6 (lst onsite)": { title: "Module 5 - Making LST Work Onsite", sort_order: 5 },
  "canvas mod 7 (lst onsite tools)": { title: "Module 6 - Onsite Tools", sort_order: 6 },
  "canvas mod 9 (debriefing)": { title: "Module 7 - Debriefing and Reentry", sort_order: 7 },
};

/** Retired from online modules; completion copies to supplemental live-session rows. */
export const CANVAS_RETIRE_COPY_TO_SUPPLEMENTAL = {
  "canvas mod 3 (basic training)": "Basic Training",
  "canvas mod 8 (gateway training)": "Gateway Training",
};

const STANDARD_TRAINING_DEADLINE_RULES_BY_TITLE = {
  "Module 1 - Welcome to LST Training": { type: "days_before_start", days: 90 },
  "Module 2 - Fundraising": { type: "days_before_start", days: 90 },
  "Module 3 - Team Dynamics": { type: "days_before_start", days: 60 },
  Culture: { type: "days_before_start", days: 60 },
  "Module 5 - Making LST Work Onsite": { type: "days_before_start", days: 60 },
  "Module 6 - Onsite Tools": { type: "days_before_start", days: 30 },
  "Module 7 - Debriefing and Reentry": { type: "days_before_start", days: 30 },
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

/** Intermediate renames / college labels → classroom slot (1–7). */
const LEGACY_CLASSROOM_SHORT_TITLE_SLOTS = {
  "team dynamics": "3",
  culture: "4",
  "making lst work onsite": "5",
  "onsite tools": "6",
  "debriefing and reentry": "7",
  "welcome to lst training": "1",
  fundraising: "2",
};

function getCanonicalClassroomModuleForSlot(slot) {
  return CLASSROOM_MODULES.find((mod) => String(mod.sort_order) === String(slot)) || null;
}

export function getCanonicalClassroomModuleForRow(row) {
  const slot = resolveClassroomModuleSlotKey(row);
  if (!slot) return null;
  return getCanonicalClassroomModuleForSlot(slot);
}

function rowHasCanonicalClassroomTitle(row) {
  const canonical = getCanonicalClassroomModuleForRow(row);
  if (!canonical) return true;
  return (
    normalizeTrainingModuleTitleKey(row?.title) ===
    normalizeTrainingModuleTitleKey(canonical.title)
  );
}

function applyCanonicalClassroomModuleTitles(modules = []) {
  return (modules || []).map((row) => {
    const canonical = getCanonicalClassroomModuleForRow(row);
    if (!canonical || !isActiveTrainingModule(row)) return row;
    return {
      ...row,
      title: canonical.title,
      category: "classroom",
      sort_order: canonical.sort_order,
    };
  });
}

async function normalizeCanonicalClassroomModuleTitles(tripId, modules) {
  let changed = false;

  for (const row of modules || []) {
    if (!isActiveTrainingModule(row)) continue;
    if (!isOnlineTrainingModuleCategory(row.category)) continue;

    const canonical = getCanonicalClassroomModuleForRow(row);
    if (!canonical) continue;

    const needsUpdate =
      normalizeTrainingModuleTitleKey(row.title) !==
        normalizeTrainingModuleTitleKey(canonical.title) ||
      row.category !== "classroom" ||
      Number(row.sort_order ?? 0) !== Number(canonical.sort_order);

    if (!needsUpdate) continue;

    const { error } = await supabase
      .from("trip_training_modules")
      .update({
        title: canonical.title,
        category: "classroom",
        sort_order: canonical.sort_order,
      })
      .eq("id", row.id);

    if (error) {
      console.error("Error normalizing classroom module title", error);
      throw error;
    }

    changed = true;
  }

  if (changed) {
    return fetchTripTrainingModuleRows(tripId);
  }

  return modules;
}

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

function compareTrainingModuleKeepPriority(a, b) {
  const categoryRank = { classroom: 0, canvas: 1, supplemental: 2 };
  const ra = categoryRank[a.category] ?? 9;
  const rb = categoryRank[b.category] ?? 9;
  if (ra !== rb) return ra - rb;

  const canonicalA = rowHasCanonicalClassroomTitle(a) ? 1 : 0;
  const canonicalB = rowHasCanonicalClassroomTitle(b) ? 1 : 0;
  if (canonicalA !== canonicalB) return canonicalB - canonicalA;

  const sortDelta = Number(a.sort_order || 0) - Number(b.sort_order || 0);
  if (sortDelta !== 0) return sortDelta;
  return String(a.id).localeCompare(String(b.id));
}

function defaultModuleBlockedByPendingCanvasMigration(module, existingTitles) {
  const targetKey = normalizeTrainingModuleTitleKey(module.title);
  for (const [oldKey, next] of Object.entries(CANVAS_TO_CLASSROOM_MIGRATION)) {
    if (normalizeTrainingModuleTitleKey(next.title) !== targetKey) continue;
    if (existingTitles.has(oldKey)) return true;
  }
  return false;
}

export function resolveClassroomModuleSlotKey(row) {
  const titleKey = normalizeTrainingModuleTitleKey(row?.title);
  if (!titleKey) return null;

  if (titleKey in CANVAS_RETIRE_COPY_TO_SUPPLEMENTAL) return null;

  if (titleKey in CANVAS_TO_CLASSROOM_MIGRATION) {
    return String(CANVAS_TO_CLASSROOM_MIGRATION[titleKey].sort_order);
  }

  if (titleKey in LEGACY_CLASSROOM_SHORT_TITLE_SLOTS) {
    return LEGACY_CLASSROOM_SHORT_TITLE_SLOTS[titleKey];
  }

  for (const mod of CLASSROOM_MODULES) {
    if (normalizeTrainingModuleTitleKey(mod.title) === titleKey) {
      return String(mod.sort_order);
    }
  }

  for (const next of Object.values(CANVAS_TO_CLASSROOM_MIGRATION)) {
    if (normalizeTrainingModuleTitleKey(next.title) === titleKey) {
      return String(next.sort_order);
    }
  }

  const sortOrder = Number(row?.sort_order ?? row?.sortOrder ?? 0);
  if (sortOrder >= 1 && sortOrder <= 7 && isOnlineTrainingModuleCategory(row?.category)) {
    return String(sortOrder);
  }

  return null;
}

export function tripHasDuplicateClassroomSlots(modules = []) {
  const slotCounts = new Map();

  for (const row of modules || []) {
    if (!isActiveTrainingModule(row)) continue;
    const slot = resolveClassroomModuleSlotKey(row);
    if (!slot) continue;
    slotCounts.set(slot, (slotCounts.get(slot) || 0) + 1);
  }

  return [...slotCounts.values()].some((count) => count > 1);
}

export function filterActiveUniqueTrainingModules(modules = []) {
  const active = (modules || []).filter(isActiveTrainingModule);
  const slotKeep = new Map();
  const titleKeep = new Map();

  for (const row of [...active].sort(compareTrainingModuleKeepPriority)) {
    const slot = resolveClassroomModuleSlotKey(row);
    if (slot) {
      if (slotKeep.has(slot)) continue;
      slotKeep.set(slot, row);
      continue;
    }

    const titleKey = normalizeTrainingModuleTitleKey(row.title);
    if (titleKeep.has(titleKey)) continue;
    titleKeep.set(titleKey, row);
  }

  return [...slotKeep.values(), ...titleKeep.values()]
    .sort(
      (a, b) =>
        Number(a.sort_order ?? a.sortOrder ?? 0) - Number(b.sort_order ?? b.sortOrder ?? 0)
    );
}

export function presentTrainingModules(modules = []) {
  return applyCanonicalClassroomModuleTitles(filterActiveUniqueTrainingModules(modules));
}

function listOccupiedClassroomSlots(existingModules) {
  const slots = new Set();

  for (const row of existingModules || []) {
    if (!isActiveTrainingModule(row)) continue;
    const slot = resolveClassroomModuleSlotKey(row);
    if (slot) slots.add(slot);
  }

  return slots;
}

async function retireDuplicateTrainingModuleRows(tripId, rows, progressRows) {
  if (rows.length <= 1) return false;

  const sorted = [...rows].sort(compareTrainingModuleKeepPriority);
  const keep = sorted[0];
  let changed = false;

  for (const dupe of sorted.slice(1)) {
    await copyTrainingProgressBetweenModules(tripId, dupe.id, keep.id, progressRows || []);
    const { error } = await supabase
      .from("trip_training_modules")
      .update({
        category: "retired",
        sort_order: 999,
      })
      .eq("id", dupe.id);

    if (error) {
      console.error("Error retiring duplicate training module", error);
      throw error;
    }

    changed = true;
  }

  return changed;
}

async function dedupeDuplicateTrainingModules(tripId, modules, progressRows) {
  const active = (modules || []).filter(isActiveTrainingModule);
  const slotGroups = new Map();
  const titleGroups = new Map();
  let changed = false;

  for (const row of active) {
    const slot = resolveClassroomModuleSlotKey(row);
    if (slot) {
      if (!slotGroups.has(slot)) slotGroups.set(slot, []);
      slotGroups.get(slot).push(row);
      continue;
    }

    const titleKey = normalizeTrainingModuleTitleKey(row.title);
    if (!titleGroups.has(titleKey)) titleGroups.set(titleKey, []);
    titleGroups.get(titleKey).push(row);
  }

  for (const rows of slotGroups.values()) {
    if (await retireDuplicateTrainingModuleRows(tripId, rows, progressRows)) {
      changed = true;
    }
  }

  for (const rows of titleGroups.values()) {
    if (await retireDuplicateTrainingModuleRows(tripId, rows, progressRows)) {
      changed = true;
    }
  }

  if (changed) {
    return fetchTripTrainingModuleRows(tripId);
  }

  return modules;
}

async function fetchTripTrainingProgressRows(tripId) {
  const { data, error } = await supabase
    .from("user_training_progress")
    .select("*")
    .eq("trip_id", tripId);

  if (error) {
    console.error("Error loading training progress", error);
    throw error;
  }

  return data || [];
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

    const targetKey = normalizeTrainingModuleTitleKey(next.title);
    const existingTarget = byTitle.get(targetKey);

    if (existingTarget && String(existingTarget.id) !== String(row.id)) {
      await copyTrainingProgressBetweenModules(tripId, row.id, existingTarget.id, progressRows || []);

      const { error } = await supabase
        .from("trip_training_modules")
        .update({
          category: "retired",
          sort_order: 999,
        })
        .eq("id", row.id);

      if (error) {
        console.error("Error retiring duplicate canvas module during classroom migration", error);
        throw error;
      }

      byTitle.delete(oldKey);
      continue;
    }

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

    byTitle.delete(oldKey);
    byTitle.set(targetKey, {
      ...row,
      title: next.title,
      category: "classroom",
      sort_order: next.sort_order,
    });
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
  const occupiedSlots = listOccupiedClassroomSlots(existingModules);
  const missingModules = DEFAULT_MODULES.filter((module) => {
    const key = normalizeTrainingModuleTitleKey(module.title);
    if (existingTitles.has(key)) return false;
    if (defaultModuleBlockedByPendingCanvasMigration(module, existingTitles)) return false;
    if (module.category === "classroom" && occupiedSlots.has(String(module.sort_order))) {
      return false;
    }
    return true;
  });

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

  let withSeeded = await seedMissingTrainingModules(tripId, existingModules);
  const progressRows = await fetchTripTrainingProgressRows(tripId);

  try {
    withSeeded = await dedupeDuplicateTrainingModules(tripId, withSeeded, progressRows);
  } catch (error) {
    console.error("Training module dedupe persistence failed", error);
  }

  try {
    withSeeded = await normalizeCanonicalClassroomModuleTitles(tripId, withSeeded);
  } catch (error) {
    console.error("Training module title normalization failed", error);
  }

  return presentTrainingModules(withSeeded)
    .map(normalizeModule)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listTrainingProgress(tripId) {
  const data = await fetchTripTrainingProgressRows(tripId);
  return data.map(normalizeProgress);
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
