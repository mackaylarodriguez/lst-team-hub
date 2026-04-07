import { supabase } from "@/lib/supabase";
import {
  TRAINING_TIMELINE_COLLEGE,
  normalizeTrainingTimelineType,
} from "@/lib/workerTaskTemplate";

const DEFAULT_MODULES = [
  { title: "Canvas Mod 1 (Welcome)", category: "canvas", requires_date: false, sort_order: 1 },
  { title: "Canvas Mod 2 (Fundraising)", category: "canvas", requires_date: false, sort_order: 2 },
  { title: "Canvas Mod 3 (Basic Training)", category: "canvas", requires_date: false, sort_order: 3 },
  { title: "Canvas Mod 4 (Team Dynamics)", category: "canvas", requires_date: false, sort_order: 4 },
  { title: "Canvas Mod 5 (Culture)", category: "canvas", requires_date: false, sort_order: 5 },
  { title: "Canvas Mod 6 (LST Onsite)", category: "canvas", requires_date: false, sort_order: 6 },
  { title: "Canvas Mod 7 (LST Onsite Tools)", category: "canvas", requires_date: false, sort_order: 7 },
  { title: "Canvas Mod 8 (Gateway Training)", category: "canvas", requires_date: false, sort_order: 8 },
  { title: "Canvas Mod 9 (Debriefing)", category: "canvas", requires_date: false, sort_order: 9 },
  { title: "Basic Training", category: "supplemental", requires_date: true, sort_order: 10 },
  { title: "Gateway Training", category: "supplemental", requires_date: true, sort_order: 11 },
  { title: "EndMeeting", category: "supplemental", requires_date: true, sort_order: 12 },
];

const STANDARD_TRAINING_DEADLINE_RULES_BY_TITLE = {
  "Canvas Mod 1 (Welcome)": { type: "days_before_start", days: 90 },
  "Canvas Mod 2 (Fundraising)": { type: "days_before_start", days: 90 },
  "Canvas Mod 3 (Basic Training)": { type: "months_before_start", months: 3 },
  "Canvas Mod 4 (Team Dynamics)": { type: "days_before_start", days: 60 },
  "Canvas Mod 5 (Culture)": { type: "days_before_start", days: 60 },
  "Canvas Mod 6 (LST Onsite)": { type: "days_before_start", days: 60 },
  "Canvas Mod 7 (LST Onsite Tools)": { type: "days_before_start", days: 30 },
  "Canvas Mod 8 (Gateway Training)": { type: "months_before_start", months: 1 },
  "Canvas Mod 9 (Debriefing)": { type: "days_before_start", days: 30 },
  "Basic Training": { type: "months_before_start", months: 3 },
  "Gateway Training": { type: "months_before_start", months: 1 },
  EndMeeting: { type: "trip_end" },
};

const COLLEGE_TRAINING_DEADLINE_RULES_BY_TITLE = {
  "Canvas Mod 1 (Welcome)": { type: "month_anchor", month: 10, day: 15, yearOffset: -1 },
  "Canvas Mod 2 (Fundraising)": { type: "month_anchor", month: 10, day: 15, yearOffset: -1 },
  "Canvas Mod 3 (Basic Training)": { type: "months_before_start", months: 3 },
  "Canvas Mod 4 (Team Dynamics)": { type: "month_anchor", month: 2, day: 15, yearOffset: 0 },
  "Canvas Mod 5 (Culture)": { type: "month_anchor", month: 2, day: 15, yearOffset: 0 },
  "Canvas Mod 6 (LST Onsite)": { type: "month_anchor", month: 3, day: 15, yearOffset: 0 },
  "Canvas Mod 7 (LST Onsite Tools)": { type: "month_anchor", month: 3, day: 15, yearOffset: 0 },
  "Canvas Mod 8 (Gateway Training)": { type: "months_before_start", months: 1 },
  "Canvas Mod 9 (Debriefing)": { type: "month_anchor", month: 4, day: 15, yearOffset: 0 },
  "Basic Training": { type: "months_before_start", months: 3 },
  "Gateway Training": { type: "months_before_start", months: 1 },
  EndMeeting: { type: "month_anchor", month: 5, day: 15, yearOffset: 0 },
};

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
  const at = row.completed_at;
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
    moduleId: row.training_module_id,
    completed: !!row.completed,
    completedAt: at != null && at !== "" ? String(at) : "",
    notes: row.notes || "",
  };
}

export async function listTrainingModules(tripId) {
  const { data, error } = await supabase
    .from("trip_training_modules")
    .select("*")
    .eq("trip_id", tripId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error loading training modules", error);
    throw error;
  }

  const existingModules = data || [];
  const existingTitles = new Set(
    existingModules.map((module) => String(module.title || "").trim().toLowerCase())
  );
  const missingModules = DEFAULT_MODULES.filter(
    (module) => !existingTitles.has(String(module.title || "").trim().toLowerCase())
  );

  if (missingModules.length === 0) {
    return existingModules.map(normalizeModule);
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

  return [...existingModules, ...(seeded || [])]
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
  const { data: existing, error: existingError } = await supabase
    .from("user_training_progress")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .eq("training_module_id", moduleId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking training progress", existingError);
    throw existingError;
  }

  const payload = {
    trip_id: tripId,
    user_id: userId,
    training_module_id: moduleId,
    completed: !!completed,
    completed_at: completedAt || null,
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
