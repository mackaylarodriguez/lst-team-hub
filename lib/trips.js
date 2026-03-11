import { supabase } from "@/lib/supabase";
import { STAFF_TASK_TEMPLATE } from "./staffTaskTemplate";

export const TRIPS_UPDATED_EVENT = "lst:trips-updated";

export async function getCurrentUserProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Error loading authenticated user", userError);
    throw userError;
  }

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("Error loading current profile", profileError);
    throw profileError;
  }

  return { user, profile: profile || null };
}

export async function listAssignedTrips() {
  const { user } = await getCurrentUserProfile();
  if (!user) return [];

  const { data, error } = await supabase
    .from("trip_assignments")
    .select("trip_id, trips(*)")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error loading assigned trips", error);
    throw error;
  }

  return (data || [])
    .map((row) => normalizeTrip(row.trips))
    .filter(Boolean);
}

export async function getAssignedTrip(tripId) {
  const { user } = await getCurrentUserProfile();
  if (!user) return null;

  const { data, error } = await supabase
    .from("trip_assignments")
    .select("trip_id, trips(*)")
    .eq("user_id", user.id)
    .eq("trip_id", tripId)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error loading assigned trip", error);
    }
    return null;
  }

  return normalizeTrip(data?.trips || null);
}

export async function createTripForCurrentUser({ name, location, startDate, endDate }) {
  const { user } = await getCurrentUserProfile();
  if (!user) {
    throw new Error("No authenticated user found.");
  }

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({
      name: String(name || "").trim(),
      location: String(location || "").trim(),
      start_date: startDate,
      end_date: endDate,
    })
    .select("*")
    .single();

  if (tripError) {
    console.error("Error creating trip", tripError);
    throw tripError;
  }

  const { error: assignmentError } = await supabase
    .from("trip_assignments")
    .insert({
      user_id: user.id,
      trip_id: trip.id,
    });

  if (assignmentError) {
    console.error("Error assigning trip to current user", assignmentError);
    throw assignmentError;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRIPS_UPDATED_EVENT, { detail: { trip } }));
  }

  return normalizeTrip(trip);
}

function normalizeTrip(trip) {
  if (!trip) return null;

  const startDate = trip.start_date || null;
  const endDate = trip.end_date || null;

  return applyStaffTemplateIfMissing({
    id: trip.id,
    name: trip.name || "Untitled trip",
    location: trip.location || "",
    startDate,
    endDate,
    dates: formatDateRange(startDate, endDate),
    createdAt: trip.created_at || "",
    participants: [],
    quickLinks: [],
    tasks: [],
    docs: [],
  });
}

function applyStaffTemplateIfMissing(trip) {
  if (Array.isArray(trip.staffTasks) && trip.staffTasks.length > 0) return trip;

  return {
    ...trip,
    staffTasks: STAFF_TASK_TEMPLATE.map((task) => ({
      id: `${trip.id}-${task.id}`,
      workArea: task.workArea,
      sequence: task.sequence,
      taskName: task.taskName,
      assignedTo: task.assignedTo,
      progress: task.progress || "Not started",
      dueDate: task.dueDate || "",
      notes: task.notes || "",
    })),
  };
}

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return "Dates to be confirmed";
  if (startDate && endDate) {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const sameMonth = start.toLocaleString("en-US", { month: "long" }) === end.toLocaleString("en-US", { month: "long" })
      && start.getFullYear() === end.getFullYear();

    if (sameMonth) {
      return `${start.toLocaleString("en-US", { month: "long" })} ${start.getDate()}-${end.getDate()}, ${end.getFullYear()}`;
    }

    return `${start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  }

  const single = new Date(`${(startDate || endDate)}T00:00:00`);
  return single.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
