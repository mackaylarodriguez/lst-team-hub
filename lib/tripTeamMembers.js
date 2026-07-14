import { supabase } from "@/lib/supabase";
import { coerceSqlDateToYmd, toPgDateOrNull } from "@/lib/isoDateYmd";

function normalizeTripTeamMember(row) {
  const firstName = String(row?.first_name || "").trim();
  const lastName = String(row?.last_name || "").trim();
  const email = String(row?.email || "").trim().toLowerCase();
  const cellPhone = String(row?.cell_phone || "").trim();
  const fundraisingGoalAmount = row?.fundraising_goal_amount;
  return {
    id: row?.id || "",
    tripId: row?.trip_id || "",
    firstName,
    lastName,
    email,
    cellPhone,
    teamRole: String(row?.team_role || "").trim() || "Worker",
    startDate: coerceSqlDateToYmd(row?.start_date) || "",
    endDate: coerceSqlDateToYmd(row?.end_date) || "",
    fundraisingUrl: String(row?.fundraising_url || "").trim(),
    fundraisingGoalAmount:
      fundraisingGoalAmount !== null && fundraisingGoalAmount !== undefined && fundraisingGoalAmount !== ""
        ? Number(fundraisingGoalAmount)
        : null,
    travelsWithTeam: row?.travels_with_team !== false,
    tshirtSize: String(row?.tshirt_size || "").trim(),
    createdAt: row?.created_at || "",
    updatedAt: row?.updated_at || "",
    name: [firstName, lastName].filter(Boolean).join(" ").trim() || email || "Unnamed member",
  };
}

function isMissingTeamRoleColumnError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    message.includes("team_role") &&
    (message.includes("does not exist") || message.includes("schema cache") || error?.code === "42703")
  );
}

function isMissingTravelsWithTeamColumnError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    message.includes("travels_with_team") &&
    (message.includes("does not exist") || message.includes("schema cache") || error?.code === "42703")
  );
}

function isMissingTshirtSizeColumnError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    message.includes("tshirt_size") &&
    (message.includes("does not exist") || message.includes("schema cache") || error?.code === "42703")
  );
}

function isMissingCellPhoneColumnError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    message.includes("cell_phone") &&
    (message.includes("does not exist") || message.includes("schema cache") || error?.code === "42703")
  );
}

const TRIP_TEAM_MEMBER_SELECT_WITH_CELL_PHONE =
  "id, trip_id, first_name, last_name, email, cell_phone, team_role, travels_with_team, tshirt_size, start_date, end_date, fundraising_goal_amount, fundraising_url, created_at, updated_at";
const TRIP_TEAM_MEMBER_SELECT_FULL =
  "id, trip_id, first_name, last_name, email, team_role, travels_with_team, tshirt_size, start_date, end_date, fundraising_goal_amount, fundraising_url, created_at, updated_at";
const TRIP_TEAM_MEMBER_SELECT_NO_TSHIRT =
  "id, trip_id, first_name, last_name, email, team_role, travels_with_team, start_date, end_date, fundraising_goal_amount, fundraising_url, created_at, updated_at";
const TRIP_TEAM_MEMBER_SELECT_NO_TRAVEL =
  "id, trip_id, first_name, last_name, email, team_role, tshirt_size, start_date, end_date, fundraising_goal_amount, fundraising_url, created_at, updated_at";
const TRIP_TEAM_MEMBER_SELECT_NO_TRAVEL_NO_TSHIRT =
  "id, trip_id, first_name, last_name, email, team_role, start_date, end_date, fundraising_goal_amount, fundraising_url, created_at, updated_at";
const TRIP_TEAM_MEMBER_SELECT_NO_ROLE =
  "id, trip_id, first_name, last_name, email, start_date, end_date, fundraising_goal_amount, fundraising_url, created_at, updated_at";

export async function listTripTeamMembers(tripId) {
  let omitTshirt = false;
  let { data, error } = await supabase
    .from("trip_team_members")
    .select(TRIP_TEAM_MEMBER_SELECT_WITH_CELL_PHONE)
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });

  if (error && isMissingCellPhoneColumnError(error)) {
    ({ data, error } = await supabase
      .from("trip_team_members")
      .select(TRIP_TEAM_MEMBER_SELECT_FULL)
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true }));
  }

  if (error && isMissingTshirtSizeColumnError(error)) {
    omitTshirt = true;
    ({ data, error } = await supabase
      .from("trip_team_members")
      .select(TRIP_TEAM_MEMBER_SELECT_NO_TSHIRT)
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true }));
  }

  if (error && isMissingTravelsWithTeamColumnError(error)) {
    const travelSelect = omitTshirt
      ? TRIP_TEAM_MEMBER_SELECT_NO_TRAVEL_NO_TSHIRT
      : TRIP_TEAM_MEMBER_SELECT_NO_TRAVEL;
    ({ data, error } = await supabase
      .from("trip_team_members")
      .select(travelSelect)
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true }));
  }

  if (error && isMissingTeamRoleColumnError(error)) {
    ({ data, error } = await supabase
      .from("trip_team_members")
      .select(TRIP_TEAM_MEMBER_SELECT_NO_ROLE)
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true }));
  }

  if (error) {
    console.error("Error loading trip team members", error);
    throw error;
  }

  return (data || []).map(normalizeTripTeamMember);
}

async function fetchAllTripTeamMemberRows(selectColumns) {
  const pageSize = 1000;
  const all = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("trip_team_members")
      .select(selectColumns)
      .order("trip_id", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) return { data: null, error };
    const batch = data || [];
    all.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return { data: all, error: null };
}

/** All roster rows (e.g. Budget page accountant picker). Group by `tripId` on the client. */
export async function listAllTripTeamMembers() {
  let omitTshirt = false;
  let { data, error } = await fetchAllTripTeamMemberRows(TRIP_TEAM_MEMBER_SELECT_WITH_CELL_PHONE);

  if (error && isMissingCellPhoneColumnError(error)) {
    ({ data, error } = await fetchAllTripTeamMemberRows(TRIP_TEAM_MEMBER_SELECT_FULL));
  }

  if (error && isMissingTshirtSizeColumnError(error)) {
    omitTshirt = true;
    ({ data, error } = await fetchAllTripTeamMemberRows(TRIP_TEAM_MEMBER_SELECT_NO_TSHIRT));
  }

  if (error && isMissingTravelsWithTeamColumnError(error)) {
    const travelSelect = omitTshirt
      ? TRIP_TEAM_MEMBER_SELECT_NO_TRAVEL_NO_TSHIRT
      : TRIP_TEAM_MEMBER_SELECT_NO_TRAVEL;
    ({ data, error } = await fetchAllTripTeamMemberRows(travelSelect));
  }

  if (error && isMissingTeamRoleColumnError(error)) {
    ({ data, error } = await fetchAllTripTeamMemberRows(TRIP_TEAM_MEMBER_SELECT_NO_ROLE));
  }

  if (error) {
    console.error("Error loading all trip team members", error);
    throw error;
  }

  return (data || []).map(normalizeTripTeamMember);
}

/**
 * Same headcount rules as trip card Workers / Team Plan roster:
 * everyone on the roster except leaders marked not traveling with the team.
 */
export function countTravelingRosterMembers(members) {
  return (members || []).filter((member) => {
    const role = String(member?.teamRole || member?.team_role || "").trim().toLowerCase();
    const travels =
      member?.travelsWithTeam !== false && member?.travels_with_team !== false;
    if (role === "leader" && !travels) return false;
    return true;
  }).length;
}

export async function saveTripTeamMembers(tripId, members) {
  const normalizedMembers = (members || [])
    .map((member) => {
      const firstName = String(member?.firstName || "").trim();
      const lastName = String(member?.lastName || "").trim();
      const email = String(member?.email || "").trim().toLowerCase();
      const teamRole = String(member?.teamRole || member?.role || "").trim();
      const startDate = String(member?.startDate || "").trim();
      const endDate = String(member?.endDate || "").trim();

      if (!firstName && !lastName && !email && !startDate && !endDate) {
        return null;
      }

      const fundraisingGoalAmount = member?.fundraisingGoalAmount;
      const parsedFundraising =
        fundraisingGoalAmount !== undefined && fundraisingGoalAmount !== null && String(fundraisingGoalAmount).trim() !== ""
          ? parseFloat(String(fundraisingGoalAmount).replace(/[^0-9.-]/g, ""), 10)
          : null;
      const fundraisingUrl = String(member?.fundraisingUrl || "").trim() || null;
      const travelsWithTeam =
        member?.travelsWithTeam === false || String(member?.travelsWithTeam || "").toLowerCase() === "no"
          ? false
          : true;

      const payload = {
        trip_id: tripId,
        first_name: firstName || null,
        last_name: lastName || null,
        email: email || null,
        cell_phone: String(member?.cellPhone || "").trim() || null,
        team_role: teamRole || "Worker",
        travels_with_team: travelsWithTeam,
        tshirt_size: String(member?.tshirtSize || "").trim() || null,
        start_date: toPgDateOrNull(startDate),
        end_date: toPgDateOrNull(endDate),
        fundraising_goal_amount: Number.isFinite(parsedFundraising) ? parsedFundraising : null,
        fundraising_url: fundraisingUrl,
        updated_at: new Date().toISOString(),
      };

      if (member?.id) {
        payload.id = member.id;
      }

      return payload;
    })
    .filter(Boolean);

  const existingMembers = normalizedMembers.filter((member) => member.id);
  const newMembers = normalizedMembers.filter((member) => !member.id);

  const { data: existingRows, error: existingError } = await supabase
    .from("trip_team_members")
    .select("id")
    .eq("trip_id", tripId);

  if (existingError) {
    console.error("Error loading existing trip team members", existingError);
    throw existingError;
  }

  const existingIds = new Set((existingRows || []).map((row) => row.id));
  const keptIds = new Set(normalizedMembers.map((member) => member.id).filter(Boolean));
  const idsToDelete = Array.from(existingIds).filter((id) => !keptIds.has(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("trip_team_members")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.error("Error deleting trip team members", deleteError);
      throw deleteError;
    }
  }

  if (normalizedMembers.length === 0) {
    return [];
  }

  const savedRows = [];

  if (existingMembers.length > 0) {
    let attemptUpsert = existingMembers;
    let omitTshirtUpsert = false;
    let { data, error } = await supabase
      .from("trip_team_members")
      .upsert(attemptUpsert, { onConflict: "id" })
      .select(TRIP_TEAM_MEMBER_SELECT_WITH_CELL_PHONE);

    if (error && isMissingCellPhoneColumnError(error)) {
      attemptUpsert = attemptUpsert.map(({ cell_phone, ...member }) => member);
      ({ data, error } = await supabase
        .from("trip_team_members")
        .upsert(attemptUpsert, { onConflict: "id" })
        .select(TRIP_TEAM_MEMBER_SELECT_FULL));
    }

    if (error && isMissingTshirtSizeColumnError(error)) {
      omitTshirtUpsert = true;
      attemptUpsert = attemptUpsert.map(({ tshirt_size, ...member }) => member);
      ({ data, error } = await supabase
        .from("trip_team_members")
        .upsert(attemptUpsert, { onConflict: "id" })
        .select(TRIP_TEAM_MEMBER_SELECT_NO_TSHIRT));
    }

    if (error && isMissingTravelsWithTeamColumnError(error)) {
      attemptUpsert = attemptUpsert.map(({ travels_with_team, ...member }) => member);
      const travelSelect = omitTshirtUpsert
        ? TRIP_TEAM_MEMBER_SELECT_NO_TRAVEL_NO_TSHIRT
        : TRIP_TEAM_MEMBER_SELECT_NO_TRAVEL;
      ({ data, error } = await supabase
        .from("trip_team_members")
        .upsert(attemptUpsert, { onConflict: "id" })
        .select(travelSelect));
    }

    if (error && isMissingTeamRoleColumnError(error)) {
      const fallbackExistingMembers = attemptUpsert.map(({ team_role, ...member }) => member);
      ({ data, error } = await supabase
        .from("trip_team_members")
        .upsert(fallbackExistingMembers, { onConflict: "id" })
        .select(TRIP_TEAM_MEMBER_SELECT_NO_ROLE));
    }

    if (error) {
      console.error("Error updating trip team members", error);
      throw error;
    }

    savedRows.push(...(data || []));
  }

  if (newMembers.length > 0) {
    let rowsToInsert = newMembers.map(({ id, ...member }) => member);
    let omitTshirtInsert = false;
    let { data, error } = await supabase
      .from("trip_team_members")
      .insert(rowsToInsert)
      .select(TRIP_TEAM_MEMBER_SELECT_WITH_CELL_PHONE);

    if (error && isMissingCellPhoneColumnError(error)) {
      rowsToInsert = rowsToInsert.map(({ cell_phone, ...member }) => member);
      ({ data, error } = await supabase
        .from("trip_team_members")
        .insert(rowsToInsert)
        .select(TRIP_TEAM_MEMBER_SELECT_FULL));
    }

    if (error && isMissingTshirtSizeColumnError(error)) {
      omitTshirtInsert = true;
      rowsToInsert = rowsToInsert.map(({ tshirt_size, ...member }) => member);
      ({ data, error } = await supabase
        .from("trip_team_members")
        .insert(rowsToInsert)
        .select(TRIP_TEAM_MEMBER_SELECT_NO_TSHIRT));
    }

    if (error && isMissingTravelsWithTeamColumnError(error)) {
      rowsToInsert = rowsToInsert.map(({ travels_with_team, ...member }) => member);
      const travelSelect = omitTshirtInsert
        ? TRIP_TEAM_MEMBER_SELECT_NO_TRAVEL_NO_TSHIRT
        : TRIP_TEAM_MEMBER_SELECT_NO_TRAVEL;
      ({ data, error } = await supabase
        .from("trip_team_members")
        .insert(rowsToInsert)
        .select(travelSelect));
    }

    if (error && isMissingTeamRoleColumnError(error)) {
      rowsToInsert = rowsToInsert.map(({ team_role, ...member }) => member);
      ({ data, error } = await supabase
        .from("trip_team_members")
        .insert(rowsToInsert)
        .select(TRIP_TEAM_MEMBER_SELECT_NO_ROLE));
    }

    if (error) {
      console.error("Error inserting trip team members", error);
      throw error;
    }

    savedRows.push(...(data || []));
  }

  return savedRows
    .sort((left, right) => {
      const leftCreatedAt = String(left?.created_at || "");
      const rightCreatedAt = String(right?.created_at || "");
      return leftCreatedAt.localeCompare(rightCreatedAt);
    })
    .map(normalizeTripTeamMember);
}

export async function listTripTeamMembersForDuplicateCheck() {
  const { data, error } = await supabase
    .from("trip_team_members")
    .select(
      "id, trip_id, first_name, last_name, email, start_date, end_date, fundraising_goal_amount, fundraising_url, created_at, updated_at"
    );

  if (error) {
    console.error("Error loading trip team members for duplicate check", error);
    throw error;
  }

  const rows = data || [];
  const tripIds = [...new Set(rows.map((row) => row.trip_id).filter(Boolean))];
  let tripById = new Map();

  if (tripIds.length > 0) {
    const { data: trips, error: tripsError } = await supabase
      .from("trips")
      .select("id, trip_name, team_status, status")
      .in("id", tripIds);

    if (tripsError) {
      console.error("Error loading trips for trip-team duplicate check", tripsError);
      throw tripsError;
    }

    tripById = new Map(
      (trips || []).map((trip) => [
        trip.id,
        {
          id: trip.id || "",
          tripName: String(trip?.trip_name || "").trim(),
          teamStatus: String(trip?.team_status || "").trim(),
          status: String(trip?.status || "").trim().toLowerCase(),
        },
      ])
    );
  }

  return rows.map((row) => {
    const normalized = normalizeTripTeamMember(row);
    const linkedTrip = tripById.get(normalized.tripId) || {};

    return {
      ...normalized,
      tripName: linkedTrip.tripName || "",
      teamStatus: linkedTrip.teamStatus || "",
      tripStatus: linkedTrip.status || "",
    };
  });
}

/** Update Neon fundraising URL and/or individual goal for one roster row (no account required). */
export async function saveTripTeamMemberFundraisingUrl({
  tripId,
  memberId,
  fundraisingUrl,
  fundraisingGoalAmount,
}) {
  const payload = {
    updated_at: new Date().toISOString(),
  };
  if (fundraisingUrl !== undefined) {
    payload.fundraising_url = String(fundraisingUrl || "").trim() || null;
  }
  if (fundraisingGoalAmount !== undefined) {
    const raw = String(fundraisingGoalAmount ?? "").trim();
    if (raw === "") {
      payload.fundraising_goal_amount = null;
    } else {
      const parsed = parseFloat(raw.replace(/[^0-9.-]/g, ""), 10);
      payload.fundraising_goal_amount = Number.isFinite(parsed) ? parsed : null;
    }
  }

  const { data, error } = await supabase
    .from("trip_team_members")
    .update(payload)
    .eq("id", memberId)
    .eq("trip_id", tripId)
    .select(
      "id, trip_id, first_name, last_name, email, start_date, end_date, fundraising_goal_amount, fundraising_url, created_at, updated_at"
    )
    .maybeSingle();

  if (error) {
    console.error("Error saving roster fundraising URL", error);
    throw error;
  }

  if (!data) {
    throw new Error("Roster member not found for this trip.");
  }

  return normalizeTripTeamMember(data);
}

/** Update only `tshirt_size` for one roster row (inline picker without full roster save). */
export async function updateTripTeamMemberTshirtSize({ tripId, memberId, tshirtSize }) {
  if (!tripId || !memberId) {
    throw new Error("Trip and roster member are required.");
  }

  const payload = {
    tshirt_size: String(tshirtSize || "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await supabase
    .from("trip_team_members")
    .update(payload)
    .eq("id", memberId)
    .eq("trip_id", tripId)
    .select(TRIP_TEAM_MEMBER_SELECT_WITH_CELL_PHONE)
    .maybeSingle();

  if (error && isMissingCellPhoneColumnError(error)) {
    ({ data, error } = await supabase
      .from("trip_team_members")
      .update(payload)
      .eq("id", memberId)
      .eq("trip_id", tripId)
      .select(TRIP_TEAM_MEMBER_SELECT_FULL)
      .maybeSingle());
  }

  if (error && isMissingTshirtSizeColumnError(error)) {
    throw new Error(
      "T-shirt size needs the database column on trip_team_members. Run supabase/trip_team_members_tshirt_size.sql in Supabase."
    );
  }

  if (error) {
    console.error("Error updating roster T-shirt size", error);
    throw error;
  }

  if (!data) {
    throw new Error("Roster member not found for this trip.");
  }

  return normalizeTripTeamMember(data);
}
