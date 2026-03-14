import { supabase } from "@/lib/supabase";

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

function buildCyclePayload(values) {
  return {
    contact_id: values.contactId,
    recruiting_year: Number(values.recruitingYear),
    priority: normalizeNullableText(values.priority),
    alumni_year_label: normalizeNullableText(values.alumniYearLabel),
    stage: normalizeStageValue(values.stage),
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

  const { data, error } = await supabase
    .from("recruiting_contacts")
    .select("id, first_name, last_name, email, gender, created_at, updated_at")
    .in("id", ids);

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
  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  let contactId = values.contactId || "";

  if (contactId) {
    const { error: contactError } = await supabase
      .from("recruiting_contacts")
      .update({
        first_name: normalizeNullableText(values.firstName),
        last_name: normalizeNullableText(values.lastName),
        email: normalizedEmail,
        gender: normalizeNullableText(values.gender),
        updated_at: new Date().toISOString(),
      })
      .eq("id", contactId);

    if (contactError) {
      console.error("Error updating recruiting contact", contactError);
      throw contactError;
    }
  } else {
    const { data: existingContact, error: existingError } = await supabase
      .from("recruiting_contacts")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking recruiting contact by email", existingError);
      throw existingError;
    }

    if (existingContact?.id) {
      contactId = existingContact.id;
    } else {
      const { data: insertedContact, error: insertError } = await supabase
        .from("recruiting_contacts")
        .insert({
          first_name: normalizeNullableText(values.firstName),
          last_name: normalizeNullableText(values.lastName),
          email: normalizedEmail,
          gender: normalizeNullableText(values.gender),
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error creating recruiting contact", insertError);
        throw insertError;
      }

      contactId = insertedContact.id;
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
