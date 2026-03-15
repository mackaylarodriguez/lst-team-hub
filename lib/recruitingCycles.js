import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { saveTripOverviewNote } from "@/lib/tripOverviewNotes";
import { logTripActivity } from "@/lib/tripActivity";
import { createTripForCurrentUser } from "@/lib/trips";

export const RECRUITING_UPDATED_EVENT = "lst:recruiting-updated";

export const RECRUITING_STAGES = [
  { value: 0, label: "No Contact" },
  { value: 1, label: "Contacted" },
  { value: 2, label: "Very Interested" },
  { value: 3, label: "Applied" },
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

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeNullableText(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeNullableEmail(value) {
  const normalized = normalizeEmail(value);
  return normalized || null;
}

function normalizeInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeStageValue(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 3 ? parsed : 0;
}

function normalizeRecruitingPerson(row) {
  return {
    id: row?.id || "",
    firstName: normalizeText(row?.first_name),
    lastName: normalizeText(row?.last_name),
    email: normalizeEmail(row?.email),
    phone: normalizeText(row?.phone),
    gender: normalizeText(row?.gender),
    createdAt: row?.created_at || "",
    updatedAt: row?.updated_at || "",
  };
}

function normalizeLinkedTrip(row) {
  return {
    id: row?.id || "",
    name: normalizeText(row?.trip_name) || "Untitled trip",
    site: normalizeText(row?.location),
    departureDate: row?.start_date || "",
    status: normalizeText(row?.team_status),
  };
}

function normalizeCycleRecord(row, contactById = new Map(), linkedTripsById = new Map()) {
  const contact = contactById.get(row?.contact_id) || null;
  const stage = normalizeStageValue(row?.stage);

  return {
    id: row?.id || "",
    contactId: row?.contact_id || "",
    recruitingYear: Number(row?.recruiting_year || 0),
    priority: normalizeText(row?.priority),
    alumniYearLabel: normalizeText(row?.alumni_year_label),
    stage,
    stageLabel: RECRUITING_STAGE_LABELS[stage] || "No Contact",
    isPotentialTeam: !!row?.is_potential_team,
    interestedTrip: normalizeText(row?.interested_trip),
    teamName: normalizeText(row?.team_name),
    teamMembers: normalizeText(row?.team_members),
    projectDates: normalizeText(row?.project_dates),
    site: normalizeText(row?.site),
    weeks: row?.weeks === null || row?.weeks === undefined ? null : Number(row?.weeks),
    departureDate: row?.departure_date || "",
    assignedTo: normalizeText(row?.assigned_to),
    lastContactedAt: row?.last_contacted_at || "",
    lastContactMethod: normalizeText(row?.last_contact_method),
    nextFollowUp: row?.next_follow_up || "",
    mackaylaNotes: normalizeText(row?.mackayla_notes),
    lesleeNotes: normalizeText(row?.leslee_notes),
    bulkLastContactedAt: row?.bulk_last_contacted_at || "",
    bulkLastContactMethod: normalizeText(row?.bulk_last_contact_method),
    isConvertedToTeam: !!row?.is_converted_to_team,
    convertedTeamId: row?.converted_team_id || "",
    createdAt: row?.created_at || "",
    updatedAt: row?.updated_at || "",
    contact,
    linkedTrip: row?.converted_team_id
      ? linkedTripsById.get(row.converted_team_id) || null
      : null,
  };
}

function normalizeActivityLog(row) {
  return {
    id: row?.id || "",
    recruitingCycleContactId: row?.recruiting_cycle_contact_id || "",
    actionType: normalizeText(row?.action_type),
    actionDate: row?.action_date || "",
    staffMember: normalizeText(row?.staff_member),
    summary: normalizeText(row?.summary),
    createdAt: row?.created_at || "",
  };
}

function normalizeSavedFilter(row) {
  return {
    id: row?.id || "",
    recruitingYear: Number(row?.recruiting_year || 0),
    filterName: normalizeText(row?.filter_name),
    filterConfig: row?.filter_config || {},
    createdAt: row?.created_at || "",
    updatedAt: row?.updated_at || "",
  };
}

function isMissingRecruitingPhoneColumnError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    (error?.code === "42703" && message.includes("recruiting_contacts.phone")) ||
    message.includes("could not find the 'phone' column of 'recruiting_contacts'") ||
    message.includes("recruiting_contacts.phone")
  );
}

function omitPhoneField(payload) {
  const { phone, ...rest } = payload || {};
  return rest;
}

function buildCyclePayload(values) {
  return {
    contact_id: values.contactId,
    recruiting_year: Number(values.recruitingYear),
    priority: normalizeNullableText(values.priority),
    alumni_year_label: normalizeNullableText(values.alumniYearLabel),
    stage: normalizeStageValue(values.stage),
    is_potential_team: values.isPotentialTeam === true,
    interested_trip: normalizeNullableText(values.interestedTrip),
    team_name: normalizeNullableText(values.teamName),
    team_members: normalizeNullableText(values.teamMembers),
    project_dates: normalizeNullableText(values.projectDates),
    site: normalizeNullableText(values.site),
    weeks: normalizeInteger(values.weeks),
    departure_date: values.departureDate || null,
    assigned_to: normalizeNullableText(values.assignedTo),
    last_contacted_at: values.lastContactedAt || null,
    last_contact_method: normalizeNullableText(values.lastContactMethod),
    next_follow_up: values.nextFollowUp || null,
    mackayla_notes: normalizeNullableText(values.mackaylaNotes),
    leslee_notes: normalizeNullableText(values.lesleeNotes),
    bulk_last_contacted_at: values.bulkLastContactedAt || null,
    bulk_last_contact_method: normalizeNullableText(values.bulkLastContactMethod),
    is_converted_to_team: values.isConvertedToTeam === true,
    converted_team_id: values.convertedTeamId || null,
    updated_at: new Date().toISOString(),
  };
}

async function listRecruitingPeopleByIds(ids) {
  if (!ids.length) return new Map();

  let { data, error } = await supabase
    .from("recruiting_contacts")
    .select("id, first_name, last_name, email, phone, gender, created_at, updated_at")
    .in("id", ids);

  if (isMissingRecruitingPhoneColumnError(error)) {
    ({ data, error } = await supabase
      .from("recruiting_contacts")
      .select("id, first_name, last_name, email, gender, created_at, updated_at")
      .in("id", ids));
  }

  if (error) {
    console.error("Error loading recruiting contacts", error);
    throw error;
  }

  return new Map((data || []).map((row) => [row.id, normalizeRecruitingPerson(row)]));
}

async function listLinkedTripsByIds(ids) {
  if (!ids.length) return new Map();

  const { data, error } = await supabase
    .from("trips")
    .select("id, trip_name, location, start_date, team_status")
    .in("id", ids);

  if (error) {
    console.error("Error loading linked recruiting trips", error);
    throw error;
  }

  return new Map((data || []).map((row) => [row.id, normalizeLinkedTrip(row)]));
}

export function getRecruitingStageLabel(stage) {
  return RECRUITING_STAGE_LABELS[normalizeStageValue(stage)] || "No Contact";
}

export async function listRecruitingYears() {
  const { data, error } = await supabase
    .from("recruiting_cycle_contacts")
    .select("recruiting_year")
    .order("recruiting_year", { ascending: false });

  if (error) {
    console.error("Error loading recruiting years", error);
    throw error;
  }

  const currentYear = new Date().getFullYear();
  const years = new Set([currentYear, currentYear + 1]);
  (data || []).forEach((row) => {
    const year = Number(row?.recruiting_year || 0);
    if (year) years.add(year);
  });

  return [...years].sort((left, right) => right - left);
}

export async function listRecruitingCycleContacts(recruitingYear) {
  const { data, error } = await supabase
    .from("recruiting_cycle_contacts")
    .select("*")
    .eq("recruiting_year", recruitingYear)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading recruiting cycle contacts", error);
    throw error;
  }

  const rows = data || [];
  const contactById = await listRecruitingPeopleByIds(
    [...new Set(rows.map((row) => row.contact_id).filter(Boolean))]
  );
  const linkedTripsById = await listLinkedTripsByIds(
    [...new Set(rows.map((row) => row.converted_team_id).filter(Boolean))]
  );

  return rows.map((row) => normalizeCycleRecord(row, contactById, linkedTripsById));
}

export async function listRecruitingCycleContactsByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return [];

  const { data: contacts, error: contactsError } = await supabase
    .from("recruiting_contacts")
    .select("id")
    .eq("email", normalizedEmail);

  if (contactsError) {
    console.error("Error loading recruiting contacts by email", contactsError);
    throw contactsError;
  }

  const contactIds = [...new Set((contacts || []).map((row) => row.id).filter(Boolean))];
  if (!contactIds.length) return [];

  const { data, error } = await supabase
    .from("recruiting_cycle_contacts")
    .select("*")
    .in("contact_id", contactIds)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading recruiting cycle contacts by email", error);
    throw error;
  }

  const rows = data || [];
  const contactById = await listRecruitingPeopleByIds(
    [...new Set(rows.map((row) => row.contact_id).filter(Boolean))]
  );
  const linkedTripsById = await listLinkedTripsByIds(
    [...new Set(rows.map((row) => row.converted_team_id).filter(Boolean))]
  );

  return rows.map((row) => normalizeCycleRecord(row, contactById, linkedTripsById));
}

export async function listRecruitingActivityLogs(recruitingCycleContactId) {
  const { data, error } = await supabase
    .from("recruiting_cycle_activity_logs")
    .select("id, recruiting_cycle_contact_id, action_type, action_date, staff_member, summary, created_at")
    .eq("recruiting_cycle_contact_id", recruitingCycleContactId)
    .order("action_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading recruiting activity logs", error);
    throw error;
  }

  return (data || []).map(normalizeActivityLog);
}

export async function logRecruitingActivity({
  recruitingCycleContactId,
  actionType,
  actionDate,
  staffMember,
  summary,
}) {
  const { data, error } = await supabase
    .from("recruiting_cycle_activity_logs")
    .insert({
      recruiting_cycle_contact_id: recruitingCycleContactId,
      action_type: normalizeText(actionType).toLowerCase(),
      action_date: actionDate || new Date().toISOString(),
      staff_member: normalizeNullableText(staffMember),
      summary: normalizeNullableText(summary),
    })
    .select("id, recruiting_cycle_contact_id, action_type, action_date, staff_member, summary, created_at")
    .single();

  if (error) {
    console.error("Error logging recruiting activity", error);
    throw error;
  }

  emitRecruitingUpdated({ recruitingCycleContactId, action: "activity_logged" });
  return normalizeActivityLog(data);
}

export async function saveRecruitingCycleContact(values) {
  const normalizedEmail = normalizeNullableEmail(values.email);
  const normalizedPhone = normalizeNullableText(values.phone);
  const normalizedFirstName = normalizeNullableText(values.firstName);
  const normalizedLastName = normalizeNullableText(values.lastName);
  if (!normalizedFirstName || !normalizedLastName) {
    throw new Error("First and last name are required.");
  }

  const contactPayload = {
    first_name: normalizedFirstName,
    last_name: normalizedLastName,
    email: normalizedEmail,
    phone: normalizedPhone,
    gender: normalizeNullableText(values.gender),
    updated_at: new Date().toISOString(),
  };
  let contactId = values.contactId || "";

  if (contactId) {
    let { error: contactError } = await supabase
      .from("recruiting_contacts")
      .update(contactPayload)
      .eq("id", contactId);

    if (isMissingRecruitingPhoneColumnError(contactError)) {
      ({ error: contactError } = await supabase
        .from("recruiting_contacts")
        .update(omitPhoneField(contactPayload))
        .eq("id", contactId));
    }

    if (contactError) {
      console.error("Error updating recruiting contact", contactError);
      throw contactError;
    }
  } else {
    let existingContact = null;
    if (normalizedEmail) {
      const { data, error: existingError } = await supabase
        .from("recruiting_contacts")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingError) {
        console.error("Error checking recruiting contact by email", existingError);
        throw existingError;
      }

      existingContact = data || null;
    }

    if (existingContact?.id) {
      contactId = existingContact.id;
      let { error: updateExistingContactError } = await supabase
        .from("recruiting_contacts")
        .update(contactPayload)
        .eq("id", contactId);

      if (isMissingRecruitingPhoneColumnError(updateExistingContactError)) {
        ({ error: updateExistingContactError } = await supabase
          .from("recruiting_contacts")
          .update(omitPhoneField(contactPayload))
          .eq("id", contactId));
      }

      if (updateExistingContactError) {
        console.error("Error syncing recruiting contact by email", updateExistingContactError);
        throw updateExistingContactError;
      }
    } else {
      let { data: insertedContact, error: insertError } = await supabase
        .from("recruiting_contacts")
        .insert(contactPayload)
        .select("id")
        .single();

      if (isMissingRecruitingPhoneColumnError(insertError)) {
        ({ data: insertedContact, error: insertError } = await supabase
          .from("recruiting_contacts")
          .insert(omitPhoneField(contactPayload))
          .select("id")
          .single());
      }

      if (insertError) {
        console.error("Error creating recruiting contact", insertError);
        throw insertError;
      }

      contactId = insertedContact.id;
    }
  }

  if (!values?.id) {
    const { data: existingCycle, error: existingCycleError } = await supabase
      .from("recruiting_cycle_contacts")
      .select("id")
      .eq("contact_id", contactId)
      .eq("recruiting_year", Number(values.recruitingYear))
      .maybeSingle();

    if (existingCycleError) {
      console.error("Error checking for duplicate recruiting cycle contact", existingCycleError);
      throw existingCycleError;
    }

    if (existingCycle?.id) {
      throw new Error("Duplicate email: this person is already on the recruiting board for this year.");
    }
  }

  const payload = buildCyclePayload({ ...values, contactId });
  const query = values?.id
    ? supabase.from("recruiting_cycle_contacts").update(payload).eq("id", values.id)
    : supabase.from("recruiting_cycle_contacts").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    console.error("Error saving recruiting cycle contact", error);
    throw error;
  }

  emitRecruitingUpdated({ recruitingCycleContactId: data.id, action: values?.id ? "updated" : "created" });

  const [contactById, linkedTripsById] = await Promise.all([
    listRecruitingPeopleByIds([data.contact_id]),
    listLinkedTripsByIds([data.converted_team_id].filter(Boolean)),
  ]);

  return normalizeCycleRecord(data, contactById, linkedTripsById);
}

export async function logRecruitingCycleContactAction({
  record,
  actionType,
  actionDate,
  staffMember,
  summary,
  nextFollowUp,
  stage,
}) {
  const normalizedActionType = normalizeText(actionType).toLowerCase();
  const normalizedActionDate = actionDate || new Date().toISOString();
  const patch = {
    updated_at: new Date().toISOString(),
  };

  if (["email", "call", "text", "info meeting", "bulk email", "bulk text"].includes(normalizedActionType)) {
    patch.last_contacted_at = normalizedActionDate;
    patch.last_contact_method = normalizedActionType;
  }

  if (nextFollowUp !== undefined) {
    patch.next_follow_up = nextFollowUp || null;
  }

  if (stage !== undefined && stage !== null && stage !== "") {
    patch.stage = normalizeStageValue(stage);
  }

  const { error: updateError } = await supabase
    .from("recruiting_cycle_contacts")
    .update(patch)
    .eq("id", record.id);

  if (updateError) {
    console.error("Error updating recruiting cycle contact action state", updateError);
    throw updateError;
  }

  await logRecruitingActivity({
    recruitingCycleContactId: record.id,
    actionType: normalizedActionType,
    actionDate: normalizedActionDate,
    staffMember,
    summary,
  });
}

export async function promoteRecruitingRecordToPotentialTeam(record, { staffMember } = {}) {
  const nextStage = Math.max(Number(record?.stage || 0), 2);
  const { data, error } = await supabase
    .from("recruiting_cycle_contacts")
    .update({
      is_potential_team: true,
      stage: nextStage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", record.id)
    .select("*")
    .single();

  if (error) {
    console.error("Error promoting recruiting record to potential team", error);
    throw error;
  }

  await logRecruitingActivity({
    recruitingCycleContactId: record.id,
    actionType: "promote",
    actionDate: new Date().toISOString(),
    staffMember,
    summary: "Promoted to Potential Team",
  });

  emitRecruitingUpdated({ recruitingCycleContactId: record.id, action: "promoted" });

  const [contactById, linkedTripsById] = await Promise.all([
    listRecruitingPeopleByIds([data.contact_id]),
    listLinkedTripsByIds([data.converted_team_id].filter(Boolean)),
  ]);

  return normalizeCycleRecord(data, contactById, linkedTripsById);
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

function normalizeTripTeamMembers(teamMembers, fallbackContact) {
  if (Array.isArray(teamMembers)) {
    const rows = teamMembers
      .map((member) => ({
        firstName: normalizeText(member?.firstName),
        lastName: normalizeText(member?.lastName),
        email: normalizeEmail(member?.email),
        startDate: member?.startDate || "",
        endDate: member?.endDate || "",
      }))
      .filter((member) => member.firstName || member.lastName || member.email);

    if (rows.length > 0) {
      return rows;
    }
  }

  return parseTeamMembers(teamMembers, "", fallbackContact);
}

function buildTeamMembersSummary(teamMembers, fallbackContact) {
  const rows = normalizeTripTeamMembers(teamMembers, fallbackContact);
  return rows
    .map((member) => [member.firstName, member.lastName].filter(Boolean).join(" ").trim() || member.email)
    .filter(Boolean)
    .join(", ");
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

export async function convertRecruitingCycleRecordToTrip({
  record,
  name,
  location,
  host,
  siteType,
  trainingTimelineType,
  projectType,
  projectLengthSummary,
  extraTravelStatus,
  startDate,
  endDate,
  fundraisingGoalAmount,
  tripFeeAmount,
  materialsFeeAmount,
  hasDeferredWorker,
  hannoverHousingFeeAmount,
  domesticProjectFeeAmount,
  domesticFeeAmount,
  domesticMaterialsFeeAmount,
  teamName,
  teamMembers,
  projectDates,
  site,
  weeks,
  departureDate,
  mackaylaNotes,
  lesleeNotes,
}) {
  const session = await getSession();
  if (!record) {
    throw new Error("Recruiting record not found.");
  }

  if (record.isConvertedToTeam && record.convertedTeamId) {
    return {
      status: "already_converted",
      tripId: record.convertedTeamId,
    };
  }

  const normalizedTeamName = normalizeText(name || teamName);
  const normalizedSite = normalizeText(location || site);
  const normalizedTeamMembers = normalizeTripTeamMembers(teamMembers, record.contact);
  const normalizedProjectLengthSummary =
    normalizeText(projectLengthSummary) || buildProjectLengthSummary(projectDates, weeks);

  if (!normalizedTeamName) {
    throw new Error("Team name is required.");
  }

  if (!normalizedSite) {
    throw new Error("Site is required.");
  }

  const trip = await createTripForCurrentUser({
    name: normalizedTeamName,
    location: normalizedSite,
    host: normalizeText(host),
    siteType: normalizeText(siteType),
    teamStatus: "Forming",
    trainingTimelineType: normalizeText(trainingTimelineType) || "standard",
    projectType: normalizeText(projectType),
    projectLengthSummary: normalizedProjectLengthSummary,
    extraTravelStatus: normalizeText(extraTravelStatus) || "no",
    startDate: startDate || normalizeText(departureDate),
    endDate: endDate || "",
    fundraisingGoalAmount: fundraisingGoalAmount || "",
    tripFeeAmount: tripFeeAmount || "600",
    materialsFeeAmount: materialsFeeAmount || "250",
    hasDeferredWorker: hasDeferredWorker || "no",
    hannoverHousingFeeAmount: hannoverHousingFeeAmount || "600",
    domesticProjectFeeAmount: domesticProjectFeeAmount || "",
    domesticFeeAmount: domesticFeeAmount || "",
    domesticMaterialsFeeAmount: domesticMaterialsFeeAmount || "",
    teamMembers: normalizedTeamMembers,
  });

  const summaryNote = [
    `Converted from Recruiting: ${record.contact?.firstName || ""} ${record.contact?.lastName || ""}`.trim(),
    projectDates ? `Project Dates: ${normalizeText(projectDates)}` : "",
    weeks ? `Weeks: ${normalizeText(weeks)}` : "",
    mackaylaNotes ? `Mackayla Notes: ${normalizeText(mackaylaNotes)}` : "",
    lesleeNotes ? `Leslee Notes: ${normalizeText(lesleeNotes)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

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
    message: `Converted recruiting contact ${record.contact?.firstName || record.contact?.email || "contact"} into this team.`,
  });

  const payload = buildCyclePayload({
    ...record,
    teamName: normalizedTeamName,
    teamMembers: buildTeamMembersSummary(normalizedTeamMembers, record.contact),
    projectDates,
    site: normalizedSite,
    weeks,
    departureDate,
    mackaylaNotes,
    lesleeNotes,
    isPotentialTeam: true,
    isConvertedToTeam: true,
    convertedTeamId: trip.id,
  });

  const { data, error } = await supabase
    .from("recruiting_cycle_contacts")
    .update(payload)
    .eq("id", record.id)
    .select("*")
    .single();

  if (error) {
    console.error("Error converting recruiting cycle record", error);
    throw error;
  }

  await logRecruitingActivity({
    recruitingCycleContactId: record.id,
    actionType: "conversion",
    actionDate: new Date().toISOString(),
    staffMember: session?.name || "Staff",
    summary: `Converted to team ${normalizedTeamName}.`,
  });

  emitRecruitingUpdated({ recruitingCycleContactId: record.id, action: "converted", tripId: trip.id });

  const [contactById, linkedTripsById] = await Promise.all([
    listRecruitingPeopleByIds([data.contact_id]),
    listLinkedTripsByIds([trip.id]),
  ]);

  return {
    status: "converted",
    trip,
    record: normalizeCycleRecord(data, contactById, linkedTripsById),
  };
}

export async function listRecruitingSavedFilters(recruitingYear) {
  const { data, error } = await supabase
    .from("recruiting_saved_filters")
    .select("id, recruiting_year, filter_name, filter_config, created_at, updated_at")
    .eq("recruiting_year", recruitingYear)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading recruiting saved filters", error);
    throw error;
  }

  return (data || []).map(normalizeSavedFilter);
}

export async function saveRecruitingSavedFilter({ id, recruitingYear, filterName, filterConfig }) {
  const payload = {
    recruiting_year: Number(recruitingYear),
    filter_name: normalizeText(filterName),
    filter_config: filterConfig || {},
    updated_at: new Date().toISOString(),
  };

  const query = id
    ? supabase.from("recruiting_saved_filters").update(payload).eq("id", id)
    : supabase.from("recruiting_saved_filters").insert(payload);

  const { data, error } = await query
    .select("id, recruiting_year, filter_name, filter_config, created_at, updated_at")
    .single();

  if (error) {
    console.error("Error saving recruiting saved filter", error);
    throw error;
  }

  emitRecruitingUpdated({ savedFilterId: data.id, action: id ? "filter_updated" : "filter_created" });
  return normalizeSavedFilter(data);
}

export async function deleteRecruitingSavedFilter(id) {
  const { error } = await supabase.from("recruiting_saved_filters").delete().eq("id", id);
  if (error) {
    console.error("Error deleting recruiting saved filter", error);
    throw error;
  }

  emitRecruitingUpdated({ savedFilterId: id, action: "filter_deleted" });
}

export async function deleteRecruitingCycleContact(id) {
  const { data: existingRecord, error: loadError } = await supabase
    .from("recruiting_cycle_contacts")
    .select("id, contact_id")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("Error loading recruiting cycle contact before delete", loadError);
    throw loadError;
  }

  if (!existingRecord?.id) {
    return;
  }

  const { error } = await supabase.from("recruiting_cycle_contacts").delete().eq("id", id);
  if (error) {
    console.error("Error deleting recruiting cycle contact", error);
    throw error;
  }

  emitRecruitingUpdated({ recruitingCycleContactId: id, action: "deleted" });
}

export async function importRecruitingContacts({ recruitingYear, rows, staffMember }) {
  const cleanedRows = (rows || []).map((row) => ({
    firstName: normalizeText(row.firstName),
    lastName: normalizeText(row.lastName),
    email: normalizeEmail(row.email),
  }));

  const candidates = cleanedRows.filter(
    (row) => row.firstName || row.lastName || row.email
  );
  const ignored = candidates.filter((row) => !row.email);
  const validRows = candidates.filter((row) => row.email);
  const emails = [...new Set(validRows.map((row) => row.email))];

  const { data: existingContacts, error: contactsError } = await supabase
    .from("recruiting_contacts")
    .select("id, first_name, last_name, email")
    .in("email", emails);

  if (contactsError) {
    console.error("Error checking existing recruiting contacts", contactsError);
    throw contactsError;
  }

  const contactByEmail = new Map(
    (existingContacts || []).map((row) => [normalizeEmail(row.email), row])
  );

  const missingContacts = validRows.filter((row) => !contactByEmail.has(row.email));

  if (missingContacts.length > 0) {
    const { data: insertedContacts, error: insertContactsError } = await supabase
      .from("recruiting_contacts")
      .insert(
        missingContacts.map((row) => ({
          first_name: row.firstName || null,
          last_name: row.lastName || null,
          email: row.email,
        }))
      )
      .select("id, first_name, last_name, email");

    if (insertContactsError) {
      console.error("Error inserting recruiting contacts during import", insertContactsError);
      throw insertContactsError;
    }

    (insertedContacts || []).forEach((row) => {
      contactByEmail.set(normalizeEmail(row.email), row);
    });
  }

  const contactIds = [...new Set(validRows.map((row) => contactByEmail.get(row.email)?.id).filter(Boolean))];
  const { data: existingCycles, error: cyclesError } = await supabase
    .from("recruiting_cycle_contacts")
    .select("id, contact_id")
    .eq("recruiting_year", recruitingYear)
    .in("contact_id", contactIds);

  if (cyclesError) {
    console.error("Error checking existing recruiting cycle contacts", cyclesError);
    throw cyclesError;
  }

  const existingCycleContactIds = new Set((existingCycles || []).map((row) => row.contact_id));
  const duplicates = [];
  const recordsToCreate = [];

  validRows.forEach((row) => {
    const contact = contactByEmail.get(row.email);
    if (!contact?.id) return;

    if (existingCycleContactIds.has(contact.id)) {
      duplicates.push(row);
      return;
    }

    existingCycleContactIds.add(contact.id);
    recordsToCreate.push({
      contact_id: contact.id,
      recruiting_year: Number(recruitingYear),
      stage: 0,
      priority: null,
      alumni_year_label: null,
      mackayla_notes: null,
      leslee_notes: null,
      last_contacted_at: null,
      next_follow_up: null,
      updated_at: new Date().toISOString(),
    });
  });

  let createdRecords = [];
  if (recordsToCreate.length > 0) {
    const { data: insertedCycles, error: insertCyclesError } = await supabase
      .from("recruiting_cycle_contacts")
      .insert(recordsToCreate)
      .select("*");

    if (insertCyclesError) {
      console.error("Error inserting recruiting cycle contacts during import", insertCyclesError);
      throw insertCyclesError;
    }

    createdRecords = insertedCycles || [];

    if (createdRecords.length > 0) {
      const { error: activityError } = await supabase
        .from("recruiting_cycle_activity_logs")
        .insert(
          createdRecords.map((row) => ({
            recruiting_cycle_contact_id: row.id,
            action_type: "import",
            action_date: new Date().toISOString(),
            staff_member: normalizeNullableText(staffMember),
            summary: "Contact imported from spreadsheet",
          }))
        );

      if (activityError) {
        console.error("Error inserting recruiting import activity logs", activityError);
        throw activityError;
      }
    }
  }

  emitRecruitingUpdated({ action: "imported", recruitingYear });

  return {
    createdCount: createdRecords.length,
    duplicateCount: duplicates.length,
    ignoredCount: ignored.length,
    duplicates,
    ignored,
  };
}

export async function bulkUpdateRecruitingCycleContacts({
  recruitingCycleContactIds,
  actionType,
  actionDate,
  staffMember,
  summary,
  stage,
  nextFollowUp,
  assignedTo,
}) {
  if (!recruitingCycleContactIds?.length) {
    return { updatedCount: 0 };
  }

  const patch = {
    updated_at: new Date().toISOString(),
  };

  const normalizedActionType = normalizeText(actionType).toLowerCase();
  const normalizedActionDate = actionDate || new Date().toISOString();

  if (["bulk email", "bulk text"].includes(normalizedActionType)) {
    patch.last_contacted_at = normalizedActionDate;
    patch.last_contact_method = normalizedActionType;
    patch.bulk_last_contacted_at = normalizedActionDate;
    patch.bulk_last_contact_method = normalizedActionType;
  }

  if (stage !== undefined && stage !== null && stage !== "") {
    patch.stage = normalizeStageValue(stage);
  }

  if (nextFollowUp !== undefined) {
    patch.next_follow_up = nextFollowUp || null;
  }

  if (assignedTo !== undefined) {
    patch.assigned_to = normalizeNullableText(assignedTo);
  }

  const { data, error } = await supabase
    .from("recruiting_cycle_contacts")
    .update(patch)
    .in("id", recruitingCycleContactIds)
    .select("id");

  if (error) {
    console.error("Error bulk updating recruiting cycle contacts", error);
    throw error;
  }

  const { error: activityError } = await supabase
    .from("recruiting_cycle_activity_logs")
    .insert(
      recruitingCycleContactIds.map((id) => ({
        recruiting_cycle_contact_id: id,
        action_type: normalizedActionType,
        action_date: normalizedActionDate,
        staff_member: normalizeNullableText(staffMember),
        summary: normalizeNullableText(summary),
      }))
    );

  if (activityError) {
    console.error("Error logging bulk recruiting activity", activityError);
    throw activityError;
  }

  emitRecruitingUpdated({ action: "bulk_updated", count: data?.length || recruitingCycleContactIds.length });
  return { updatedCount: data?.length || recruitingCycleContactIds.length };
}
