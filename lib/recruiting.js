import { getSession } from "@/lib/auth";
import { saveTripOverviewNote } from "@/lib/tripOverviewNotes";
import { logTripActivity } from "@/lib/tripActivity";
import { createTripForCurrentUser } from "@/lib/trips";
import { supabase } from "@/lib/supabase";

export const RECRUITING_UPDATED_EVENT = "lst:recruiting-updated";

export const RECRUITING_STAGES = [
  { value: 0, label: "No Contact" },
  { value: 1, label: "Contacted" },
  { value: 2, label: "Interested" },
  { value: 3, label: "Very Interested" },
  { value: 4, label: "Applied" },
];

const RECRUITING_STAGE_LABELS = Object.fromEntries(
  RECRUITING_STAGES.map((stage) => [stage.value, stage.label])
);

function emitRecruitingUpdated(detail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(RECRUITING_UPDATED_EVENT, { detail }));
  }
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeNullableText(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeNullableEmail(value) {
  const normalized = normalizeEmail(value);
  return normalized || null;
}

function normalizeInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeStageValue(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 4 ? parsed : 0;
}

function normalizeBoolean(value) {
  return value === true;
}

function formatContactName(contact) {
  const fullName = [contact?.firstName, contact?.lastName].filter(Boolean).join(" ").trim();
  return fullName || contact?.email || "Unnamed contact";
}

function normalizeRecruitingContact(row, linkedTripsById = new Map()) {
  const normalized = {
    id: row?.id || "",
    firstName: normalizeText(row?.first_name),
    lastName: normalizeText(row?.last_name),
    email: normalizeEmail(row?.email),
    gender: normalizeText(row?.gender),
    priority: normalizeText(row?.priority),
    alumni2026: !!row?.alumni_2026,
    stage: normalizeStageValue(row?.stage),
    stageLabel: RECRUITING_STAGE_LABELS[normalizeStageValue(row?.stage)] || "No Contact",
    interestedTrip: normalizeText(row?.interested_trip),
    teamName: normalizeText(row?.team_name),
    projectDates: normalizeText(row?.project_dates),
    site: normalizeText(row?.site),
    weeks: row?.weeks === null || row?.weeks === undefined ? null : Number(row.weeks),
    departureDate: row?.departure_date || "",
    assignedTo: normalizeText(row?.assigned_to),
    lastContactedAt: row?.last_contacted_at || "",
    lastContactMethod: normalizeText(row?.last_contact_method),
    nextFollowUp: row?.next_follow_up || "",
    mackaylaNotes: normalizeText(row?.mackayla_notes),
    lesleeNotes: normalizeText(row?.leslee_notes),
    isConvertedToTeam: !!row?.is_converted_to_team,
    convertedTeamId: row?.converted_team_id || "",
    createdAt: row?.created_at || "",
    updatedAt: row?.updated_at || "",
  };

  normalized.name = formatContactName(normalized);
  normalized.linkedTrip = normalized.convertedTeamId
    ? linkedTripsById.get(normalized.convertedTeamId) || null
    : null;

  return normalized;
}

function normalizeRecruitingActivity(row) {
  return {
    id: row?.id || "",
    contactId: row?.contact_id || "",
    actionType: normalizeText(row?.action_type),
    actionDate: row?.action_date || "",
    staffMember: normalizeText(row?.staff_member),
    summary: normalizeText(row?.summary),
    createdAt: row?.created_at || "",
  };
}

function normalizeLinkedTrip(row) {
  return {
    id: row?.id || "",
    name: normalizeText(row?.trip_name) || "Untitled trip",
    site: normalizeText(row?.location),
    departureDate: row?.start_date || "",
    status: normalizeText(row?.team_status),
    projectLengthSummary: normalizeText(row?.project_length_summary),
  };
}

function buildRecruitingContactPayload(values) {
  return {
    first_name: normalizeNullableText(values.firstName),
    last_name: normalizeNullableText(values.lastName),
    email: normalizeNullableEmail(values.email),
    gender: normalizeNullableText(values.gender),
    priority: normalizeNullableText(values.priority),
    alumni_2026: normalizeBoolean(values.alumni2026),
    stage: normalizeStageValue(values.stage),
    interested_trip: normalizeNullableText(values.interestedTrip),
    team_name: normalizeNullableText(values.teamName),
    project_dates: normalizeNullableText(values.projectDates),
    site: normalizeNullableText(values.site),
    weeks: normalizeInteger(values.weeks),
    departure_date: normalizeNullableText(values.departureDate),
    assigned_to: normalizeNullableText(values.assignedTo),
    last_contacted_at: values.lastContactedAt || null,
    last_contact_method: normalizeNullableText(values.lastContactMethod),
    next_follow_up: normalizeNullableText(values.nextFollowUp),
    mackayla_notes: normalizeNullableText(values.mackaylaNotes),
    leslee_notes: normalizeNullableText(values.lesleeNotes),
    is_converted_to_team: normalizeBoolean(values.isConvertedToTeam),
    converted_team_id: values.convertedTeamId || null,
    updated_at: new Date().toISOString(),
  };
}

function buildLinkedRecruitingNote(contact, formValues) {
  const segments = [
    `Converted from Recruiting: ${formatContactName(contact)}${contact.email ? ` (${contact.email})` : ""}.`,
  ];

  if (formValues?.projectDates) {
    segments.push(`Project Dates: ${normalizeText(formValues.projectDates)}`);
  }

  if (formValues?.weeks) {
    segments.push(`Weeks: ${normalizeText(formValues.weeks)}`);
  }

  if (formValues?.mackaylaNotes) {
    segments.push(`Mackayla Notes: ${normalizeText(formValues.mackaylaNotes)}`);
  }

  if (formValues?.lesleeNotes) {
    segments.push(`Leslee Notes: ${normalizeText(formValues.lesleeNotes)}`);
  }

  return segments.join("\n");
}

function parseDelimitedLines(value) {
  return String(value || "")
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseTeamMembers(teamMembersText, teamMemberEmailsText, fallbackContact) {
  const memberNames = parseDelimitedLines(teamMembersText);
  const memberEmails = parseDelimitedLines(teamMemberEmailsText);
  const maxLength = Math.max(memberNames.length, memberEmails.length);

  const rows = Array.from({ length: maxLength }, (_, index) => {
    const rawName = memberNames[index] || "";
    const email = memberEmails[index] || "";
    const nameParts = rawName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ");

    if (!rawName && !email) {
      return null;
    }

    return {
      firstName,
      lastName,
      email,
      startDate: "",
      endDate: "",
    };
  }).filter(Boolean);

  if (rows.length > 0) {
    return rows;
  }

  return [
    {
      firstName: fallbackContact?.firstName || "",
      lastName: fallbackContact?.lastName || "",
      email: fallbackContact?.email || "",
      startDate: "",
      endDate: "",
    },
  ];
}

function buildProjectLengthSummary(projectDates, weeks) {
  const normalizedProjectDates = normalizeText(projectDates);
  const normalizedWeeks = normalizeInteger(weeks);

  if (normalizedProjectDates && normalizedWeeks) {
    return `${normalizedWeeks} week${normalizedWeeks === 1 ? "" : "s"} • ${normalizedProjectDates}`;
  }

  if (normalizedWeeks) {
    return `${normalizedWeeks} week${normalizedWeeks === 1 ? "" : "s"}`;
  }

  return normalizedProjectDates;
}

export function getRecruitingStageLabel(stage) {
  return RECRUITING_STAGE_LABELS[normalizeStageValue(stage)] || "No Contact";
}

export function isQualifiedRecruitingStage(stage) {
  return normalizeStageValue(stage) >= 2;
}

export async function listRecruitingContacts() {
  const { data, error } = await supabase
    .from("recruiting_contacts")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading recruiting contacts", error);
    throw error;
  }

  const rows = data || [];
  const convertedTeamIds = [...new Set(rows.map((row) => row.converted_team_id).filter(Boolean))];
  let linkedTripsById = new Map();

  if (convertedTeamIds.length > 0) {
    const { data: trips, error: tripsError } = await supabase
      .from("trips")
      .select("id, trip_name, location, start_date, team_status, project_length_summary")
      .in("id", convertedTeamIds);

    if (tripsError) {
      console.error("Error loading linked trips for recruiting contacts", tripsError);
      throw tripsError;
    }

    linkedTripsById = new Map((trips || []).map((trip) => [trip.id, normalizeLinkedTrip(trip)]));
  }

  return rows.map((row) => normalizeRecruitingContact(row, linkedTripsById));
}

export async function getRecruitingContact(contactId) {
  const { data, error } = await supabase
    .from("recruiting_contacts")
    .select("*")
    .eq("id", contactId)
    .maybeSingle();

  if (error) {
    console.error("Error loading recruiting contact", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  let linkedTripsById = new Map();
  if (data.converted_team_id) {
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, trip_name, location, start_date, team_status, project_length_summary")
      .eq("id", data.converted_team_id)
      .maybeSingle();

    if (tripError) {
      console.error("Error loading linked trip for recruiting contact", tripError);
      throw tripError;
    }

    if (trip) {
      linkedTripsById.set(trip.id, normalizeLinkedTrip(trip));
    }
  }

  return normalizeRecruitingContact(data, linkedTripsById);
}

export async function saveRecruitingContact(values) {
  const payload = buildRecruitingContactPayload(values);
  const query = values?.id
    ? supabase.from("recruiting_contacts").update(payload).eq("id", values.id)
    : supabase.from("recruiting_contacts").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    console.error("Error saving recruiting contact", error);
    throw error;
  }

  emitRecruitingUpdated({ contactId: data.id, action: values?.id ? "updated" : "created" });

  return normalizeRecruitingContact(data);
}

export async function updateRecruitingContactStage(contactId, stage) {
  const { data, error } = await supabase
    .from("recruiting_contacts")
    .update({
      stage: normalizeStageValue(stage),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating recruiting stage", error);
    throw error;
  }

  emitRecruitingUpdated({ contactId, action: "stage_updated" });

  return normalizeRecruitingContact(data);
}

export async function listRecruitingActivityLogs(contactId) {
  const { data, error } = await supabase
    .from("recruiting_activity_logs")
    .select("id, contact_id, action_type, action_date, staff_member, summary, created_at")
    .eq("contact_id", contactId)
    .order("action_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading recruiting activity logs", error);
    throw error;
  }

  return (data || []).map(normalizeRecruitingActivity);
}

export async function logRecruitingActivity({
  contactId,
  actionType,
  actionDate,
  staffMember,
  summary,
  nextFollowUp,
}) {
  const normalizedActionType = normalizeText(actionType).toLowerCase();
  const normalizedActionDate = actionDate || new Date().toISOString();
  const normalizedStaffMember = normalizeNullableText(staffMember);
  const normalizedSummary = normalizeNullableText(summary);
  const normalizedNextFollowUp = normalizeNullableText(nextFollowUp);

  const { data: activity, error: activityError } = await supabase
    .from("recruiting_activity_logs")
    .insert({
      contact_id: contactId,
      action_type: normalizedActionType,
      action_date: normalizedActionDate,
      staff_member: normalizedStaffMember,
      summary: normalizedSummary,
    })
    .select("id, contact_id, action_type, action_date, staff_member, summary, created_at")
    .single();

  if (activityError) {
    console.error("Error logging recruiting activity", activityError);
    throw activityError;
  }

  const contactPatch = {
    updated_at: new Date().toISOString(),
  };

  if (normalizedNextFollowUp !== null) {
    contactPatch.next_follow_up = normalizedNextFollowUp;
  }

  if (["call", "email", "text"].includes(normalizedActionType)) {
    contactPatch.last_contacted_at = normalizedActionDate;
    contactPatch.last_contact_method = normalizedActionType;
  }

  const { data: updatedContact, error: contactError } = await supabase
    .from("recruiting_contacts")
    .update(contactPatch)
    .eq("id", contactId)
    .select("*")
    .single();

  if (contactError) {
    console.error("Error updating recruiting contact after activity log", contactError);
    throw contactError;
  }

  emitRecruitingUpdated({ contactId, action: "activity_logged" });

  return {
    activity: normalizeRecruitingActivity(activity),
    contact: normalizeRecruitingContact(updatedContact),
  };
}

export async function convertRecruitingContactToTrip({
  contactId,
  teamName,
  teamMembers,
  teamMemberEmails,
  projectDates,
  site,
  weeks,
  departureDate,
  mackaylaNotes,
  lesleeNotes,
}) {
  const [session, contact] = await Promise.all([
    getSession(),
    getRecruitingContact(contactId),
  ]);

  if (!contact) {
    throw new Error("Recruiting contact not found.");
  }

  if (contact.isConvertedToTeam && contact.convertedTeamId) {
    return {
      status: "already_converted",
      tripId: contact.convertedTeamId,
      contact,
    };
  }

  if (!isQualifiedRecruitingStage(contact.stage)) {
    throw new Error("Only interested, very interested, or applied contacts can be converted.");
  }

  const normalizedTeamName = normalizeText(teamName);
  const normalizedSite = normalizeText(site);

  if (!normalizedTeamName) {
    throw new Error("Team name is required.");
  }

  if (!normalizedSite) {
    throw new Error("Site is required.");
  }

  const trip = await createTripForCurrentUser({
    name: normalizedTeamName,
    location: normalizedSite,
    host: "",
    siteType: "",
    teamStatus: "Forming",
    trainingTimelineType: "standard",
    projectType: "",
    projectLengthSummary: buildProjectLengthSummary(projectDates, weeks),
    extraTravelStatus: "no",
    startDate: normalizeText(departureDate),
    endDate: "",
    fundraisingGoalAmount: "",
    tripFeeAmount: "600",
    materialsFeeAmount: "250",
    hasDeferredWorker: "no",
    hannoverHousingFeeAmount: "600",
    domesticProjectFeeAmount: "",
    domesticFeeAmount: "",
    domesticMaterialsFeeAmount: "",
    teamMembers: parseTeamMembers(teamMembers, teamMemberEmails, contact),
  });

  const summaryNote = buildLinkedRecruitingNote(contact, {
    projectDates,
    weeks,
    mackaylaNotes,
    lesleeNotes,
  });

  if (summaryNote) {
    await saveTripOverviewNote({
      tripId: trip.id,
      note: summaryNote,
      authorName: session?.name || "Staff",
      authorEmail: session?.email || "",
    });
  }

  await logTripActivity({
    tripId: trip.id,
    actorUserId: session?.profileId || session?.authUserId || null,
    actorName: session?.name || "Staff",
    actorEmail: session?.email || "",
    eventType: "recruiting_conversion",
    message: `Converted recruiting contact ${contact.name} into this team.`,
  });

  const convertedPayload = buildRecruitingContactPayload({
    ...contact,
    teamName: normalizedTeamName,
    projectDates,
    site: normalizedSite,
    weeks,
    departureDate,
    mackaylaNotes,
    lesleeNotes,
    isConvertedToTeam: true,
    convertedTeamId: trip.id,
  });

  const { data: updatedContact, error: contactError } = await supabase
    .from("recruiting_contacts")
    .update(convertedPayload)
    .eq("id", contact.id)
    .select("*")
    .single();

  if (contactError) {
    console.error("Error marking recruiting contact converted", contactError);
    throw contactError;
  }

  const { error: logError } = await supabase
    .from("recruiting_activity_logs")
    .insert({
      contact_id: contact.id,
      action_type: "conversion",
      action_date: new Date().toISOString(),
      staff_member: session?.name || "Staff",
      summary: `Converted to team ${normalizedTeamName}.`,
    });

  if (logError) {
    console.error("Error logging recruiting conversion", logError);
    throw logError;
  }

  emitRecruitingUpdated({ contactId: contact.id, action: "converted", tripId: trip.id });

  return {
    status: "converted",
    tripId: trip.id,
    trip,
    contact: normalizeRecruitingContact(updatedContact),
  };
}
