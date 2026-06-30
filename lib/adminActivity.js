import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { ROLE_ADMIN } from "@/lib/roles";

export const ADMIN_ACTIVITY_DAYS_OPTIONS = [3, 5, 7, 14];

function sinceIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - Number(days || 5));
  return d.toISOString();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function buildActor(name, email) {
  const actorName = String(name || "").trim();
  const actorEmail = normalizeEmail(email);
  return {
    name: actorName || actorEmail || "Unknown",
    email: actorEmail,
    key: actorEmail || actorName.toLowerCase() || "unknown",
  };
}

function makeEvent({
  id,
  category,
  timestamp,
  actorName,
  actorEmail,
  title,
  detail,
  tripId,
  tripName,
  meta,
}) {
  const actor = buildActor(actorName, actorEmail);
  return {
    id,
    category,
    timestamp: timestamp || "",
    actorName: actor.name,
    actorEmail: actor.email,
    actorKey: actor.key,
    title: String(title || "").trim() || "Activity",
    detail: String(detail || "").trim(),
    tripId: tripId || "",
    tripName: tripName || "",
    meta: meta || null,
  };
}

async function assertAdminSession() {
  const session = await getSession();
  if (!session || session.actualRole !== ROLE_ADMIN) {
    throw new Error("Admin only");
  }
  return session;
}

async function loadTripNameMap(tripIds) {
  const unique = [...new Set((tripIds || []).filter(Boolean))];
  if (!unique.length) return new Map();

  const { data, error } = await supabase
    .from("trips")
    .select("id, trip_name, location, created_at")
    .in("id", unique);

  if (error) {
    console.error("Error loading trips for admin activity", error);
    throw error;
  }

  const map = new Map();
  for (const row of data || []) {
    map.set(row.id, {
      name: String(row.trip_name || "Untitled trip").trim(),
      location: row.location || "",
      createdAt: row.created_at || "",
    });
  }
  return map;
}

async function loadRecruitingCycleContactMap(cycleContactIds) {
  const unique = [...new Set((cycleContactIds || []).filter(Boolean))];
  if (!unique.length) return new Map();

  const { data, error } = await supabase
    .from("recruiting_cycle_contacts")
    .select("id, team_name, assigned_to, converted_team_id, recruiting_year, contact_id")
    .in("id", unique);

  if (error) {
    console.error("Error loading recruiting cycle contacts for admin activity", error);
    throw error;
  }

  const contactIds = [...new Set((data || []).map((row) => row.contact_id).filter(Boolean))];
  let contactById = new Map();

  if (contactIds.length) {
    const { data: contacts, error: contactsError } = await supabase
      .from("recruiting_contacts")
      .select("id, first_name, last_name, email")
      .in("id", contactIds);

    if (contactsError) {
      console.error("Error loading recruiting contacts for admin activity", contactsError);
      throw contactsError;
    }

    contactById = new Map(
      (contacts || []).map((contact) => [
        contact.id,
        {
          name: [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim(),
          email: contact.email || "",
        },
      ])
    );
  }

  const map = new Map();
  for (const row of data || []) {
    const contact = contactById.get(row.contact_id) || {};
    const teamLabel =
      String(row.team_name || "").trim() ||
      contact.name ||
      contact.email ||
      "Recruiting contact";

    map.set(row.id, {
      teamName: teamLabel,
      assignedTo: row.assigned_to || "",
      convertedTeamId: row.converted_team_id || "",
      recruitingYear: row.recruiting_year || "",
      contactName: contact.name || "",
      contactEmail: contact.email || "",
    });
  }

  return map;
}

function formatRecruitingActionTitle(actionType) {
  const normalized = String(actionType || "").trim().toLowerCase();
  if (!normalized) return "Recruiting activity";
  return `Recruiting: ${normalized}`;
}

function buildStaffBreakdown(events) {
  const byActor = new Map();

  for (const event of events || []) {
    const key = event.actorKey || "unknown";
    const existing = byActor.get(key) || {
      name: event.actorName || "Unknown",
      email: event.actorEmail || "",
      total: 0,
      recruiting: 0,
      staffTasks: 0,
      miscTasks: 0,
      tripEvents: 0,
      teamsLocked: 0,
      teamsCreated: 0,
      taskCompletions: 0,
    };

    existing.total += 1;

    if (event.category === "recruiting") existing.recruiting += 1;
    if (event.category === "staff_task") {
      existing.staffTasks += 1;
      if (event.meta?.progress === "Complete") existing.taskCompletions += 1;
    }
    if (event.category === "misc_task") {
      existing.miscTasks += 1;
      if (event.meta?.progress === "Complete") existing.taskCompletions += 1;
    }
    if (event.category === "trip_event") existing.tripEvents += 1;
    if (event.category === "team_locked") existing.teamsLocked += 1;
    if (event.category === "team_created") existing.teamsCreated += 1;

    byActor.set(key, existing);
  }

  return [...byActor.values()].sort((left, right) => {
    if (right.total !== left.total) return right.total - left.total;
    return left.name.localeCompare(right.name);
  });
}

function buildSummary(events) {
  const staffTaskCompletions = events.filter(
    (event) =>
      (event.category === "staff_task" || event.category === "misc_task") &&
      event.meta?.progress === "Complete"
  ).length;

  return {
    totalEvents: events.length,
    recruitingActions: events.filter((event) => event.category === "recruiting").length,
    staffTaskCompletions,
    staffTaskUpdates: events.filter((event) => event.category === "staff_task").length,
    miscTaskUpdates: events.filter((event) => event.category === "misc_task").length,
    tripEvents: events.filter((event) => event.category === "trip_event").length,
    teamsCreated: events.filter((event) => event.category === "team_created").length,
    teamsLocked: events.filter((event) => event.category === "team_locked").length,
  };
}

export async function listAdminActivityDashboard({ days = 5 } = {}) {
  await assertAdminSession();

  const windowDays = ADMIN_ACTIVITY_DAYS_OPTIONS.includes(Number(days)) ? Number(days) : 5;
  const since = sinceIso(windowDays);

  const [
    tripActivityResult,
    recruitingLogsResult,
    newTripsResult,
    lockedTeamsResult,
    staffTripTasksResult,
    staffMiscTasksResult,
  ] = await Promise.all([
    supabase
      .from("trip_activity")
      .select("id, trip_id, actor_name, actor_email, event_type, message, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("recruiting_cycle_activity_logs")
      .select("id, recruiting_cycle_contact_id, action_type, action_date, staff_member, summary, created_at")
      .gte("action_date", since)
      .order("action_date", { ascending: false })
      .limit(1000),
    supabase
      .from("trips")
      .select("id, trip_name, location, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("recruiting_cycle_contacts")
      .select("id, team_name, assigned_to, converted_team_id, updated_at, contact_id")
      .eq("is_converted_to_team", true)
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("trip_staff_tasks")
      .select(
        "id, trip_id, work_area, task_name, assigned_to, progress, notes, updated_by_name, updated_by_email, updated_at, created_at"
      )
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(1000),
    supabase
      .from("staff_misc_tasks")
      .select("id, staff_email, staff_name, work_area, task_name, progress, notes, updated_at, created_at")
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(1000),
  ]);

  const errors = [
    tripActivityResult.error,
    recruitingLogsResult.error,
    newTripsResult.error,
    lockedTeamsResult.error,
    staffTripTasksResult.error,
    staffMiscTasksResult.error,
  ].filter(Boolean);

  if (errors.length) {
    console.error("Error loading admin activity dashboard", errors);
    throw errors[0];
  }

  const tripActivityRows = tripActivityResult.data || [];
  const recruitingLogRows = recruitingLogsResult.data || [];
  const newTripRows = newTripsResult.data || [];
  const lockedTeamRows = lockedTeamsResult.data || [];
  const staffTripTaskRows = staffTripTasksResult.data || [];
  const staffMiscTaskRows = staffMiscTasksResult.data || [];

  const recruitingCycleIds = [
    ...recruitingLogRows.map((row) => row.recruiting_cycle_contact_id),
    ...lockedTeamRows.map((row) => row.id),
  ];

  const tripIds = [
    ...tripActivityRows.map((row) => row.trip_id),
    ...newTripRows.map((row) => row.id),
    ...staffTripTaskRows.map((row) => row.trip_id),
    ...lockedTeamRows.map((row) => row.converted_team_id),
  ];

  const [tripNameMap, recruitingContactMap] = await Promise.all([
    loadTripNameMap(tripIds),
    loadRecruitingCycleContactMap(recruitingCycleIds),
  ]);

  const events = [];

  for (const row of tripActivityRows) {
    const tripMeta = tripNameMap.get(row.trip_id) || {};
    events.push(
      makeEvent({
        id: `trip-activity:${row.id}`,
        category: "trip_event",
        timestamp: row.created_at,
        actorName: row.actor_name,
        actorEmail: row.actor_email,
        title: `${row.event_type || "trip_event"}`,
        detail: row.message || "",
        tripId: row.trip_id,
        tripName: tripMeta.name || "",
        meta: { eventType: row.event_type || "" },
      })
    );
  }

  for (const row of recruitingLogRows) {
    const cycle = recruitingContactMap.get(row.recruiting_cycle_contact_id) || {};
    const tripMeta = cycle.convertedTeamId ? tripNameMap.get(cycle.convertedTeamId) || {} : {};
    events.push(
      makeEvent({
        id: `recruiting-log:${row.id}`,
        category: "recruiting",
        timestamp: row.action_date || row.created_at,
        actorName: row.staff_member,
        actorEmail: "",
        title: formatRecruitingActionTitle(row.action_type),
        detail: [row.summary || "", cycle.teamName ? `Team/contact: ${cycle.teamName}` : ""]
          .filter(Boolean)
          .join(" · "),
        tripId: cycle.convertedTeamId || "",
        tripName: tripMeta.name || "",
        meta: {
          actionType: row.action_type || "",
          recruitingCycleContactId: row.recruiting_cycle_contact_id || "",
          teamName: cycle.teamName || "",
        },
      })
    );
  }

  for (const row of newTripRows) {
    events.push(
      makeEvent({
        id: `team-created:${row.id}`,
        category: "team_created",
        timestamp: row.created_at,
        actorName: "",
        actorEmail: "",
        title: "Team created",
        detail: [
          String(row.trip_name || "Untitled trip").trim(),
          row.location ? `Site: ${row.location}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        tripId: row.id,
        tripName: String(row.trip_name || "Untitled trip").trim(),
        meta: { location: row.location || "" },
      })
    );
  }

  for (const row of lockedTeamRows) {
    const cycle = recruitingContactMap.get(row.id) || {};
    const tripMeta = row.converted_team_id ? tripNameMap.get(row.converted_team_id) || {} : {};
    const teamLabel = String(row.team_name || cycle.teamName || "Recruiting team").trim();

    events.push(
      makeEvent({
        id: `team-locked:${row.id}:${row.updated_at}`,
        category: "team_locked",
        timestamp: row.updated_at,
        actorName: row.assigned_to || cycle.assignedTo,
        actorEmail: "",
        title: "Team locked",
        detail: [
          teamLabel,
          tripMeta.name ? `Trip: ${tripMeta.name}` : "",
          cycle.contactEmail ? `Contact: ${cycle.contactEmail}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        tripId: row.converted_team_id || "",
        tripName: tripMeta.name || teamLabel,
        meta: {
          recruitingCycleContactId: row.id,
          teamName: teamLabel,
        },
      })
    );
  }

  for (const row of staffTripTaskRows) {
    const tripMeta = tripNameMap.get(row.trip_id) || {};
    const progress = row.progress || "Not started";
    const isComplete = progress === "Complete";

    events.push(
      makeEvent({
        id: `staff-task:${row.id}:${row.updated_at}`,
        category: "staff_task",
        timestamp: row.updated_at || row.created_at,
        actorName: row.updated_by_name || row.assigned_to,
        actorEmail: row.updated_by_email,
        title: isComplete ? "Staff task completed" : "Staff task updated",
        detail: [
          row.task_name || "Untitled task",
          row.work_area ? `Area: ${row.work_area}` : "",
          `Progress: ${progress}`,
          row.assigned_to ? `Assigned: ${row.assigned_to}` : "",
          row.notes ? `Notes: ${row.notes}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        tripId: row.trip_id,
        tripName: tripMeta.name || "",
        meta: {
          progress,
          taskId: row.id,
          workArea: row.work_area || "",
        },
      })
    );
  }

  for (const row of staffMiscTaskRows) {
    const progress = row.progress || "Not started";
    const isComplete = progress === "Complete";

    events.push(
      makeEvent({
        id: `misc-task:${row.id}:${row.updated_at}`,
        category: "misc_task",
        timestamp: row.updated_at || row.created_at,
        actorName: row.staff_name,
        actorEmail: row.staff_email,
        title: isComplete ? "Misc task completed" : "Misc task updated",
        detail: [
          row.task_name || "Untitled task",
          row.work_area ? `Area: ${row.work_area}` : "",
          `Progress: ${progress}`,
          row.notes ? `Notes: ${row.notes}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        meta: {
          progress,
          taskId: row.id,
          workArea: row.work_area || "",
        },
      })
    );
  }

  events.sort((left, right) => {
    const leftTime = Date.parse(left.timestamp || "");
    const rightTime = Date.parse(right.timestamp || "");
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });

  return {
    days: windowDays,
    since,
    summary: buildSummary(events),
    staffBreakdown: buildStaffBreakdown(events),
    events,
  };
}
