import { supabase } from "@/lib/supabase";
import { listTripsForCurrentUser } from "@/lib/trips";
import { isTaskAssignedToUser } from "@/lib/staffTasks";

export const HUB_NOTIFICATIONS_UPDATED_EVENT = "lst:hub-notifications-updated";

const LOOKBACK_DAYS = 21;
const TRIP_ID_CHUNK = 80;

function sinceIso() {
  const date = new Date();
  date.setDate(date.getDate() - LOOKBACK_DAYS);
  return date.toISOString();
}

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

async function selectForTrips(tripIds, run) {
  const rows = [];
  for (const chunk of chunkIds(tripIds)) {
    try {
      const part = await run(chunk);
      rows.push(...(part || []));
    } catch (error) {
      console.error("Unable to load notification chunk", error);
    }
  }
  return rows;
}

function flightHasContent(row) {
  return Boolean(String(row?.link || "").trim() || String(row?.pdf_url || "").trim());
}

function isFlightRow(row) {
  const key = String(row?.resource_key || "").trim().toLowerCase();
  const category = String(row?.category || "").trim().toLowerCase();
  return key === "flights" || category === "flights" || category === "flight";
}

function parseAssignmentMessage(message) {
  const match = String(message || "").match(/^Assigned to (.+?): ([\s\S]+)$/);
  if (!match) return null;
  return {
    assignee: String(match[1] || "").trim(),
    taskName: String(match[2] || "").trim(),
  };
}

/**
 * In-app notices for the signed-in person: announcements, flights added, and tasks
 * assigned to them. This is separate from the scheduled task emails.
 */
export async function listHubNotifications(session) {
  if (!session?.email && !session?.name) return [];

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

  const since = sinceIso();
  const [announcements, activity, flightDocs] = await Promise.all([
    selectForTrips(tripIds, async (ids) => {
      const { data, error } = await supabase
        .from("trip_announcements")
        .select("id, trip_id, message, author_name, author_email, updated_at")
        .in("trip_id", ids)
        .gte("updated_at", since)
        .order("updated_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data || [];
    }),
    selectForTrips(tripIds, async (ids) => {
      const { data, error } = await supabase
        .from("trip_activity")
        .select("id, trip_id, actor_name, actor_email, event_type, message, created_at")
        .in("trip_id", ids)
        .in("event_type", ["flights_added", "staff_task_assigned"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data || [];
    }),
    selectForTrips(tripIds, async (ids) => {
      const { data, error } = await supabase
        .from("trip_resources")
        .select("id, trip_id, title, resource_key, category, link, pdf_url, created_at")
        .in("trip_id", ids)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data || [];
    }),
  ]);

  const items = [];
  const flightKeys = new Set();

  for (const row of announcements) {
    if (samePerson(row.author_email, session.email)) continue;
    const tripName = tripNameById.get(row.trip_id) || "Trip";
    items.push({
      id: `announcement:${row.id}:${row.updated_at || ""}`,
      kind: "announcement",
      title: `Announcement on ${tripName}`,
      detail: snippet(row.message),
      actorName: row.author_name || row.author_email || "Staff",
      createdAt: row.updated_at || "",
      href: `/trips/${row.trip_id}?tab=overview`,
    });
  }

  for (const row of activity) {
    if (samePerson(row.actor_email, session.email)) continue;
    const tripName = tripNameById.get(row.trip_id) || "Trip";
    if (row.event_type === "flights_added") {
      const key = `${row.trip_id}:${String(row.created_at || "").slice(0, 10)}`;
      flightKeys.add(key);
      items.push({
        id: `activity:${row.id}`,
        kind: "flights",
        title: `Flights added for ${tripName}`,
        detail: snippet(row.message) || "Flight details were just added.",
        actorName: row.actor_name || row.actor_email || "Staff",
        createdAt: row.created_at || "",
        href: `/trips/${row.trip_id}?tab=trip-documents`,
      });
      continue;
    }

    if (row.event_type === "staff_task_assigned") {
      const parsed = parseAssignmentMessage(row.message);
      if (!parsed || !assignedToSession(parsed.assignee, session)) continue;
      items.push({
        id: `activity:${row.id}`,
        kind: "task",
        title: `${row.actor_name || "Someone"} assigned you a task`,
        detail: parsed.taskName ? `${parsed.taskName} · ${tripName}` : tripName,
        actorName: row.actor_name || row.actor_email || "Staff",
        createdAt: row.created_at || "",
        href: `/trips/${row.trip_id}?tab=staff-tasks`,
      });
    }
  }

  for (const row of flightDocs) {
    if (!isFlightRow(row) || !flightHasContent(row)) continue;
    const key = `${row.trip_id}:${String(row.created_at || "").slice(0, 10)}`;
    if (flightKeys.has(key)) continue;
    flightKeys.add(key);
    const tripName = tripNameById.get(row.trip_id) || "Trip";
    items.push({
      id: `flight-doc:${row.id}`,
      kind: "flights",
      title: `Flights added for ${tripName}`,
      detail: snippet(row.title) || "Flight details are on the trip.",
      actorName: "",
      createdAt: row.created_at || "",
      href: `/trips/${row.trip_id}?tab=trip-documents`,
    });
  }

  return items
    .filter((item) => item.createdAt)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .slice(0, 30);
}
