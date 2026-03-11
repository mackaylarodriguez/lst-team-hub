import { supabase } from "@/lib/supabase";

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
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
    moduleId: row.training_module_id,
    completed: !!row.completed,
    completedAt: row.completed_at || "",
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

  if ((data || []).length > 0) {
    return data.map(normalizeModule);
  }

  const { data: seeded, error: seedError } = await supabase
    .from("trip_training_modules")
    .insert(
      DEFAULT_MODULES.map((module) => ({
        trip_id: tripId,
        ...module,
      }))
    )
    .select("*");

  if (seedError) {
    console.error("Error seeding training modules", seedError);
    throw seedError;
  }

  return (seeded || []).map(normalizeModule).sort((a, b) => a.sortOrder - b.sortOrder);
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
