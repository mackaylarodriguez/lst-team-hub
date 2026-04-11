import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { saveTripOverviewNote } from "@/lib/tripOverviewNotes";
import { logTripActivity } from "@/lib/tripActivity";
import { createTripForCurrentUser, deleteTrip, ensureWorkerProfilesForTripRoster } from "@/lib/trips";

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

function normalizeGenderValue(value) {
  const normalized = normalizeText(value);
  const compact = normalized.toLowerCase();
  if (!compact) return "";
  if (compact === "f" || compact === "female") return "Female";
  if (compact === "m" || compact === "male") return "Male";
  return normalized;
}

function normalizeNullableEmail(value) {
  const normalized = normalizeEmail(value);
  return normalized || null;
}

function normalizeFlexibleDepartureDate(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

  const monthYearMatch = normalized.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const parsed = new Date(`${monthYearMatch[1]} 1, ${monthYearMatch[2]}`);
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      return `${year}-${month}-01`;
    }
  }

  return normalized;
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

function normalizeImportRecruitingYear(value, fallbackYear = 2026) {
  const normalized = String(value || "").trim();
  const yearMatch = normalized.match(/(?:20)?(26|27)/);
  const parsed = Number(yearMatch ? yearMatch[1] : normalized);
  if (parsed === 27 || parsed === 2027) return 2027;
  if (parsed === 26 || parsed === 2026) return 2026;
  return fallbackYear;
}

function normalizeRecruitingPerson(row) {
  return {
    id: row?.id || "",
    firstName: normalizeText(row?.first_name),
    lastName: normalizeText(row?.last_name),
    email: normalizeEmail(row?.email),
    phone: normalizeText(row?.phone),
    gender: normalizeGenderValue(row?.gender),
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
    pendingLockTeamSetup:
      row?.pending_lock_team_setup && typeof row.pending_lock_team_setup === "object"
        ? row.pending_lock_team_setup
        : {},
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
    departure_date: normalizeFlexibleDepartureDate(values.departureDate),
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
    pending_lock_team_setup:
      values.pendingLockTeamSetup !== undefined && values.pendingLockTeamSetup !== null
        ? values.pendingLockTeamSetup
        : {},
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

export async function listLatestRecruitingActivityByIds(recordIds) {
  const ids = [...new Set((recordIds || []).filter(Boolean))];
  if (!ids.length) return {};

  const { data, error } = await supabase
    .from("recruiting_cycle_activity_logs")
    .select("id, recruiting_cycle_contact_id, action_type, action_date, staff_member, summary, created_at")
    .in("recruiting_cycle_contact_id", ids)
    .order("action_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading latest recruiting activity logs", error);
    throw error;
  }

  const latestByRecordId = {};
  (data || []).forEach((row) => {
    const recordId = row?.recruiting_cycle_contact_id || "";
    if (!recordId || latestByRecordId[recordId]) return;
    latestByRecordId[recordId] = normalizeActivityLog(row);
  });

  return latestByRecordId;
}

export async function listRecruitingContactActivityByIds(recordIds) {
  const ids = [...new Set((recordIds || []).filter(Boolean))];
  if (!ids.length) return {};

  const { data, error } = await supabase
    .from("recruiting_cycle_activity_logs")
    .select("id, recruiting_cycle_contact_id, action_type, action_date, staff_member, summary, created_at")
    .in("recruiting_cycle_contact_id", ids)
    .in("action_type", ["email", "call", "text", "bulk email", "bulk text"])
    .order("action_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading recruiting contact activity logs", error);
    throw error;
  }

  const activityByRecordId = {};
  (data || []).forEach((row) => {
    const recordId = row?.recruiting_cycle_contact_id || "";
    if (!recordId) return;
    if (!activityByRecordId[recordId]) {
      activityByRecordId[recordId] = [];
    }
    activityByRecordId[recordId].push(normalizeActivityLog(row));
  });

  return activityByRecordId;
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

function mergePlainText(primary, secondary) {
  const values = [normalizeText(primary), normalizeText(secondary)].filter(Boolean);
  return [...new Set(values)].join("\n\n");
}

function mergeDelimitedText(primary, secondary) {
  const values = [...parseDelimitedLines(primary), ...parseDelimitedLines(secondary)];
  return [...new Set(values)].join(", ");
}

function pickNewestDate(primary, secondary) {
  const primaryValue = primary ? new Date(primary).getTime() : 0;
  const secondaryValue = secondary ? new Date(secondary).getTime() : 0;
  if (secondaryValue > primaryValue) return secondary;
  return primary || secondary || null;
}

function pickEarliestFutureDate(primary, secondary) {
  const candidates = [primary, secondary].filter(Boolean).sort();
  return candidates[0] || null;
}

export async function mergeRecruitingCycleContacts({ keepRecordId, removeRecordId, staffMember }) {
  if (!keepRecordId || !removeRecordId || keepRecordId === removeRecordId) {
    throw new Error("Select two different recruiting rows to merge.");
  }

  const { data: rows, error: rowsError } = await supabase
    .from("recruiting_cycle_contacts")
    .select("*")
    .in("id", [keepRecordId, removeRecordId]);

  if (rowsError) {
    console.error("Error loading recruiting rows for merge", rowsError);
    throw rowsError;
  }

  const keepRecord = (rows || []).find((row) => row.id === keepRecordId);
  const removeRecord = (rows || []).find((row) => row.id === removeRecordId);

  if (!keepRecord || !removeRecord) {
    throw new Error("One of the recruiting rows could not be found.");
  }

  const [contactById, latestActivities] = await Promise.all([
    listRecruitingPeopleByIds([keepRecord.contact_id, removeRecord.contact_id].filter(Boolean)),
    listLatestRecruitingActivityByIds([keepRecordId, removeRecordId]),
  ]);

  const keepContact = contactById.get(keepRecord.contact_id) || null;
  const removeContact = contactById.get(removeRecord.contact_id) || null;

  if (
    normalizeEmail(keepContact?.email) &&
    normalizeEmail(removeContact?.email) &&
    normalizeEmail(keepContact?.email) !== normalizeEmail(removeContact?.email)
  ) {
    throw new Error("These rows do not share the same email, so they cannot be merged automatically.");
  }

  const mergedContactPayload = {
    first_name: normalizeNullableText(keepContact?.firstName || removeContact?.firstName),
    last_name: normalizeNullableText(keepContact?.lastName || removeContact?.lastName),
    email: normalizeNullableEmail(keepContact?.email || removeContact?.email),
    phone: normalizeNullableText(keepContact?.phone || removeContact?.phone),
    gender: normalizeNullableText(keepContact?.gender || removeContact?.gender),
    updated_at: new Date().toISOString(),
  };

  let { error: contactUpdateError } = await supabase
    .from("recruiting_contacts")
    .update(mergedContactPayload)
    .eq("id", keepRecord.contact_id);

  if (isMissingRecruitingPhoneColumnError(contactUpdateError)) {
    ({ error: contactUpdateError } = await supabase
      .from("recruiting_contacts")
      .update(omitPhoneField(mergedContactPayload))
      .eq("id", keepRecord.contact_id));
  }

  if (contactUpdateError) {
    console.error("Error merging recruiting contacts", contactUpdateError);
    throw contactUpdateError;
  }

  const mergedCyclePayload = {
    priority: normalizeNullableText(keepRecord.priority || removeRecord.priority),
    alumni_year_label: normalizeNullableText(keepRecord.alumni_year_label || removeRecord.alumni_year_label),
    stage: Math.max(normalizeStageValue(keepRecord.stage), normalizeStageValue(removeRecord.stage)),
    is_potential_team: keepRecord.is_potential_team || removeRecord.is_potential_team,
    interested_trip: normalizeNullableText(keepRecord.interested_trip || removeRecord.interested_trip),
    team_name: normalizeNullableText(keepRecord.team_name || removeRecord.team_name),
    team_members: normalizeNullableText(mergeDelimitedText(keepRecord.team_members, removeRecord.team_members)),
    project_dates: normalizeNullableText(keepRecord.project_dates || removeRecord.project_dates),
    site: normalizeNullableText(keepRecord.site || removeRecord.site),
    weeks: keepRecord.weeks ?? removeRecord.weeks ?? null,
    departure_date: keepRecord.departure_date || removeRecord.departure_date || null,
    assigned_to: normalizeNullableText(keepRecord.assigned_to || removeRecord.assigned_to),
    last_contacted_at: pickNewestDate(keepRecord.last_contacted_at, removeRecord.last_contacted_at),
    last_contact_method: normalizeNullableText(
      pickNewestDate(keepRecord.last_contacted_at, removeRecord.last_contacted_at) === removeRecord.last_contacted_at
        ? removeRecord.last_contact_method
        : keepRecord.last_contact_method || removeRecord.last_contact_method
    ),
    next_follow_up: pickEarliestFutureDate(keepRecord.next_follow_up, removeRecord.next_follow_up),
    mackayla_notes: normalizeNullableText(mergePlainText(keepRecord.mackayla_notes, removeRecord.mackayla_notes)),
    leslee_notes: normalizeNullableText(mergePlainText(keepRecord.leslee_notes, removeRecord.leslee_notes)),
    bulk_last_contacted_at: pickNewestDate(keepRecord.bulk_last_contacted_at, removeRecord.bulk_last_contacted_at),
    bulk_last_contact_method: normalizeNullableText(
      pickNewestDate(keepRecord.bulk_last_contacted_at, removeRecord.bulk_last_contacted_at) === removeRecord.bulk_last_contacted_at
        ? removeRecord.bulk_last_contact_method
        : keepRecord.bulk_last_contact_method || removeRecord.bulk_last_contact_method
    ),
    is_converted_to_team: keepRecord.is_converted_to_team || removeRecord.is_converted_to_team,
    converted_team_id: keepRecord.converted_team_id || removeRecord.converted_team_id || null,
    updated_at: new Date().toISOString(),
  };

  const { error: updateCycleError } = await supabase
    .from("recruiting_cycle_contacts")
    .update(mergedCyclePayload)
    .eq("id", keepRecordId);

  if (updateCycleError) {
    console.error("Error updating merged recruiting row", updateCycleError);
    throw updateCycleError;
  }

  const { error: moveHistoryError } = await supabase
    .from("recruiting_cycle_activity_logs")
    .update({ recruiting_cycle_contact_id: keepRecordId })
    .eq("recruiting_cycle_contact_id", removeRecordId);

  if (moveHistoryError) {
    console.error("Error moving recruiting history during merge", moveHistoryError);
    throw moveHistoryError;
  }

  const latestKeepActivity = latestActivities[keepRecordId];
  const latestRemoveActivity = latestActivities[removeRecordId];
  const mergeSummaryParts = [
    `Merged duplicate row into ${normalizeText(keepContact?.firstName || removeContact?.firstName)} ${normalizeText(keepContact?.lastName || removeContact?.lastName)}`.trim(),
    latestRemoveActivity?.staffMember ? `Last duplicate touch: ${latestRemoveActivity.staffMember}` : "",
    latestKeepActivity?.staffMember ? `Kept row last touched by: ${latestKeepActivity.staffMember}` : "",
  ].filter(Boolean);

  await logRecruitingActivity({
    recruitingCycleContactId: keepRecordId,
    actionType: "merge",
    actionDate: new Date().toISOString(),
    staffMember,
    summary: mergeSummaryParts.join(" | "),
  });

  const { error: deleteCycleError } = await supabase
    .from("recruiting_cycle_contacts")
    .delete()
    .eq("id", removeRecordId);

  if (deleteCycleError) {
    console.error("Error deleting merged recruiting row", deleteCycleError);
    throw deleteCycleError;
  }

  if (removeRecord.contact_id && removeRecord.contact_id !== keepRecord.contact_id) {
    const { count, error: countError } = await supabase
      .from("recruiting_cycle_contacts")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", removeRecord.contact_id);

    if (countError) {
      console.error("Error checking orphaned recruiting contact", countError);
      throw countError;
    }

    if (!count) {
      const { error: deleteContactError } = await supabase
        .from("recruiting_contacts")
        .delete()
        .eq("id", removeRecord.contact_id);

      if (deleteContactError) {
        console.error("Error deleting orphaned recruiting contact", deleteContactError);
      }
    }
  }

  emitRecruitingUpdated({ recruitingCycleContactId: keepRecordId, action: "merged" });
}

/**
 * @param {object} [options]
 * @param {boolean} [options.requireContactNames] — If true, first and last name are required. If omitted, names are only required when creating a new recruiting contact (no `contactId` yet).
 */
export async function saveRecruitingCycleContact(values, options = {}) {
  const requireContactNames =
    options.requireContactNames !== undefined ? options.requireContactNames : !values.contactId;

  const normalizedEmail = normalizeNullableEmail(values.email);
  const normalizedPhone = normalizeNullableText(values.phone);
  const normalizedFirstName = normalizeNullableText(values.firstName);
  const normalizedLastName = normalizeNullableText(values.lastName);
  if (requireContactNames && (!normalizedFirstName || !normalizedLastName)) {
    throw new Error("First and last name are required.");
  }

  const contactPayload = {
    first_name: normalizedFirstName,
    last_name: normalizedLastName,
    email: normalizedEmail,
    phone: normalizedPhone,
    gender: normalizeGenderValue(values.gender) || null,
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

  if (["email", "call", "text", "bulk email", "bulk text"].includes(normalizedActionType)) {
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
      phone: "",
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
      phone: normalizeText(fallbackContact?.phone),
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
        phone: normalizeText(member?.phone),
        startDate: member?.startDate || "",
        endDate: member?.endDate || "",
      }))
      .filter((member) => member.firstName || member.lastName || member.email || member.phone);

    if (rows.length > 0) {
      return rows;
    }
  }

  return parseTeamMembers(teamMembers, "", fallbackContact);
}

function formatTeamMemberLineForRecruitingStorage(member) {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  const email = normalizeEmail(member.email);
  const phone = normalizeText(member.phone);
  let line = "";
  if (name && email) line = `${name} <${email}>`;
  else line = (name || email || "").trim();
  if (phone) {
    line = line ? `${line} | ${phone}` : phone;
  }
  return line;
}

function buildTeamMembersSummary(teamMembers, fallbackContact) {
  const rows = normalizeTripTeamMembers(teamMembers, fallbackContact);
  return rows
    .map((member) => formatTeamMemberLineForRecruitingStorage(member))
    .filter(Boolean)
    .join("\n");
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
    try {
      await ensureWorkerProfilesForTripRoster(record.convertedTeamId);
    } catch (profileSeedError) {
      console.error("Unable to auto-create worker profiles for existing converted trip", profileSeedError);
    }
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

  try {
    await ensureWorkerProfilesForTripRoster(trip.id);
  } catch (profileSeedError) {
    console.error("Unable to auto-create worker profiles from recruiting roster", profileSeedError);
  }

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

/**
 * Deletes the linked trip (removes it from Trips) and moves the recruiting row back to Potential Teams.
 * Requires the same manager permissions as `deleteTrip`.
 */
export async function revertRecruitingLockedTeam(record) {
  if (!record?.id) {
    throw new Error("Recruiting record not found.");
  }
  if (!record.isConvertedToTeam || !record.convertedTeamId) {
    throw new Error("This row is not linked to a locked team trip.");
  }

  const tripId = record.convertedTeamId;
  const session = await getSession();

  await deleteTrip(tripId);

  const { error } = await supabase
    .from("recruiting_cycle_contacts")
    .update({
      is_converted_to_team: false,
      converted_team_id: null,
      is_potential_team: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  if (error) {
    console.error("Error unlocking recruiting row after trip delete", error);
    throw error;
  }

  await logRecruitingActivity({
    recruitingCycleContactId: record.id,
    actionType: "update",
    actionDate: new Date().toISOString(),
    staffMember: session?.name || session?.email || "Staff",
    summary: "Unlocked team: deleted trip and returned row to Potential Teams.",
  });

  emitRecruitingUpdated({ recruitingCycleContactId: record.id, action: "unlocked", tripId });
  return { ok: true };
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

  if (existingRecord.contact_id) {
    const { data: remainingRecords, error: remainingError } = await supabase
      .from("recruiting_cycle_contacts")
      .select("id")
      .eq("contact_id", existingRecord.contact_id)
      .limit(1);

    if (remainingError) {
      console.error("Error checking remaining recruiting cycle contacts", remainingError);
      throw remainingError;
    }

    if (!remainingRecords || remainingRecords.length === 0) {
      const { error: deleteContactError } = await supabase
        .from("recruiting_contacts")
        .delete()
        .eq("id", existingRecord.contact_id);

      if (deleteContactError) {
        console.error("Error deleting orphan recruiting contact", deleteContactError);
        throw deleteContactError;
      }
    }
  }

  emitRecruitingUpdated({ recruitingCycleContactId: id, action: "deleted" });
}

export async function importRecruitingContacts({ recruitingYear, rows, destination, staffMember }) {
  const normalizedDestination = String(destination || "outreach").trim().toLowerCase();
  const sendToPotential = normalizedDestination === "potential";
  const cleanedRows = (rows || []).map((row) => ({
    firstName: normalizeText(row.firstName),
    lastName: normalizeText(row.lastName),
    email: normalizeEmail(row.email),
    gender: normalizeGenderValue(row.gender),
    recruitingYear: normalizeImportRecruitingYear(row.recruitingYear, normalizeImportRecruitingYear(recruitingYear)),
    mackaylaNotes: normalizeText(row.mackaylaNotes),
    lesleeNotes: normalizeText(row.lesleeNotes),
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
          gender: normalizeNullableText(row.gender),
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
  const recruitingYears = [...new Set(validRows.map((row) => row.recruitingYear).filter(Boolean))];
  const { data: existingCycles, error: cyclesError } = await supabase
    .from("recruiting_cycle_contacts")
    .select("id, contact_id, recruiting_year")
    .in("recruiting_year", recruitingYears)
    .in("contact_id", contactIds);

  if (cyclesError) {
    console.error("Error checking existing recruiting cycle contacts", cyclesError);
    throw cyclesError;
  }

  const existingCycleContactIds = new Set(
    (existingCycles || []).map((row) => `${row.contact_id}:${Number(row.recruiting_year)}`)
  );
  const duplicates = [];
  const recordsToCreate = [];

  validRows.forEach((row) => {
    const contact = contactByEmail.get(row.email);
    if (!contact?.id) return;
    const cycleKey = `${contact.id}:${row.recruitingYear}`;

    if (existingCycleContactIds.has(cycleKey)) {
      duplicates.push(row);
      return;
    }

    existingCycleContactIds.add(cycleKey);
    recordsToCreate.push({
      contact_id: contact.id,
      recruiting_year: row.recruitingYear,
      stage: sendToPotential ? 2 : 0,
      is_potential_team: sendToPotential,
      priority: null,
      alumni_year_label: null,
      mackayla_notes: normalizeNullableText(row.mackaylaNotes),
      leslee_notes: normalizeNullableText(row.lesleeNotes),
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
