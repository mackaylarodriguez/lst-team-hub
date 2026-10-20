import { supabase } from "@/lib/supabase";
import { listTripsForCurrentUser } from "@/lib/trips";
import { isTaskAssignedToUser } from "@/lib/staffTasks";
import { logTripActivity } from "@/lib/tripActivity";

export const HUB_NOTIFICATIONS_UPDATED_EVENT = "lst:hub-notifications-updated";

const IMPORTANT_EVENTS = ["announcement_created", "flights_added", "staff_task_assigned"];
const TRIP_ID_CHUNK = 80;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function snippet(value, max = 140) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function samePerson(actorEmail, sessionEmail) {
  const actor = normalizeEmail(actorEmail);
  const session = normalizeEmail(sessionEmail);
  return Boolean(actor && session && actor === session);
}

function assignedToSession(assignedTo, session) {
  const raw = String(assignedTo || "").trim();
  if (!raw || !session) return false;
  if (normalizeEmail(raw) && normalizeEmail(raw) === normalizeEmail(session.email)) return true;
  return (
    isTaskAssignedToUser(raw, session.name) ||
    isTaskAssignedToUser(raw, session.email)
  );
}

function chunkIds(ids) {
  const chunks = [];
  for (let index = 0; index < ids.length; index += TRIP_ID_CHUNK) {
    chunks.push(ids.slice(index, index + TRIP_ID_CHUNK));
  }
  return chunks;
}

function parseAssignmentMessage(message) {
  const match = String(message || "").match(/^Assigned to (.+?): ([\s\S]+)$/);
  if (!match) return null;
  return {
    assignee: String(match[1] || "").trim(),
    taskName: String(match[2] || "").trim(),
  };
}

export function notifyHubUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(HUB_NOTIFICATIONS_UPDATED_EVENT));
}

/** Leslee (or anyone) assigns a task to someone else. */
export async function notifyStaffTaskAssigned({ tripId, session, assignee, taskName }) {
  const next = String(assignee || "").trim();
  if (!tripId || !next) return;
  try {
    await logTripActivity({
      tripId,
      actorUserId: session?.profileId || session?.id || "",
      actorName: session?.name || session?.email || "Staff",
      actorEmail: session?.email || "",
      eventType: "staff_task_assigned",
      message: `Assigned to ${next}: ${String(taskName || "Task").trim() || "Task"}`,
    });
  } catch (error) {
    console.error("Unable to record task assignment notification", error);
  }
  notifyHubUpdated();
}

/**
 * Important new items only, and only after this person's account existed.
 * `since` is the later of account creation and the first time notifications started for them,
 * so older announcements and flights do not fill the bell.
 */
export async function listHubNotifications(session, { since } = {}) {
  if (!session?.email && !session?.name) return [];
  const cutoff = String(since || session?.accountCreatedAt || "").trim();
  if (!cutoff) return [];

  let trips = [];
  try {
    trips = await listTripsForCurrentUser();
  } catch (error) {
    console.error("Unable to load trips for notifications", error);
    return [];
  }

  const tripNameById = new Map(
    (trips || []).map((trip) => [trip.id, trip.name || trip.location || "Trip"])
  );
  const tripIds = [...tripNameById.keys()].filter(Boolean);
  if (!tripIds.length) return [];

  const activity = [];
  for (const ids of chunkIds(tripIds)) {
    try {
      const { data, error } = await supabase
        .from("trip_activity")
        .select("id, trip_id, actor_name, actor_email, event_type, message, created_at")
        .in("trip_id", ids)
        .in("event_type", IMPORTANT_EVENTS)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      activity.push(...(data || []));
    } catch (error) {
      console.error("Unable to load notifications", error);
    }
  }

  const items = [];
  for (const row of activity) {
    if (samePerson(row.actor_email, session.email)) continue;
    const tripName = tripNameById.get(row.trip_id) || "Trip";

    if (row.event_type === "staff_task_assigned") {
      const parsed = parseAssignmentMessage(row.message);
      if (!parsed || !assignedToSession(parsed.assignee, session)) continue;
      items.push({
        id: `activity:${row.id}`,
        kind: "task",
        title: `${row.actor_name || "Someone"} assigned you a task`,
        detail: parsed.taskName ? `${parsed.taskName} · ${tripName}` : tripName,
        actorName: row.actor_name || "",
        createdAt: row.created_at || "",
        href: `/trips/${row.trip_id}?tab=staff-tasks`,
      });
      continue;
    }

    if (row.event_type === "announcement_created") {
      items.push({
        id: `activity:${row.id}`,
        kind: "announcement",
        title: `New announcement on ${tripName}`,
        detail: snippet(row.message),
        actorName: row.actor_name || "",
        createdAt: row.created_at || "",
        href: `/trips/${row.trip_id}?tab=overview`,
      });
      continue;
    }

    if (row.event_type === "flights_added") {
      items.push({
        id: `activity:${row.id}`,
        kind: "flights",
        title: `Flights added for ${tripName}`,
        detail: "Flight details were just added.",
        actorName: row.actor_name || "",
        createdAt: row.created_at || "",
        href: `/trips/${row.trip_id}?tab=trip-documents`,
      });
    }
  }

  return items
    .filter((item) => item.createdAt)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .slice(0, 20);
}
