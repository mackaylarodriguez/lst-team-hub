import { supabase } from "@/lib/supabase";

function normalizeTripTeamMember(row) {
  const firstName = String(row?.first_name || "").trim();
  const lastName = String(row?.last_name || "").trim();
  const email = String(row?.email || "").trim().toLowerCase();
  const fundraisingGoalAmount = row?.fundraising_goal_amount;
  return {
    id: row?.id || "",
    tripId: row?.trip_id || "",
    firstName,
    lastName,
    email,
    teamRole: String(row?.team_role || "").trim() || "Worker",
    startDate: row?.start_date || "",
    endDate: row?.end_date || "",
    fundraisingUrl: String(row?.fundraising_url || "").trim(),
    fundraisingGoalAmount:
      fundraisingGoalAmount !== null && fundraisingGoalAmount !== undefined && fundraisingGoalAmount !== ""
        ? Number(fundraisingGoalAmount)
        : null,
    travelsWithTeam: row?.travels_with_team !== false,
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

const TRIP_TEAM_MEMBER_SELECT_FULL =
  "id, trip_id, first_name, last_name, email, team_role, travels_with_team, start_date, end_date, fundraising_goal_amount, fundraising_url, created_at, updated_at";
const TRIP_TEAM_MEMBER_SELECT_NO_TRAVEL =
  "id, trip_id, first_name, last_name, email, team_role, start_date, end_date, fundraising_goal_amount, fundraising_url, created_at, updated_at";
const TRIP_TEAM_MEMBER_SELECT_NO_ROLE =
  "id, trip_id, first_name, last_name, email, start_date, end_date, fundraising_goal_amount, fundraising_url, created_at, updated_at";

export async function listTripTeamMembers(tripId) {
  let { data, error } = await supabase
    .from("trip_team_members")
    .select(TRIP_TEAM_MEMBER_SELECT_FULL)
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });

  if (error && isMissingTravelsWithTeamColumnError(error)) {
    ({ data, error } = await supabase
      .from("trip_team_members")
      .select(TRIP_TEAM_MEMBER_SELECT_NO_TRAVEL)
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

/** All roster rows (e.g. Budget page accountant picker). Group by `tripId` on the client. */
export async function listAllTripTeamMembers() {
  let { data, error } = await supabase
    .from("trip_team_members")
    .select(TRIP_TEAM_MEMBER_SELECT_FULL)
    .order("trip_id", { ascending: true })
    .order("created_at", { ascending: true });

  if (error && isMissingTravelsWithTeamColumnError(error)) {
    ({ data, error } = await supabase
      .from("trip_team_members")
      .select(TRIP_TEAM_MEMBER_SELECT_NO_TRAVEL)
      .order("trip_id", { ascending: true })
      .order("created_at", { ascending: true }));
  }

  if (error && isMissingTeamRoleColumnError(error)) {
    ({ data, error } = await supabase
      .from("trip_team_members")
      .select(TRIP_TEAM_MEMBER_SELECT_NO_ROLE)
      .order("trip_id", { ascending: true })
      .order("created_at", { ascending: true }));
  }

  if (error) {
    console.error("Error loading all trip team members", error);
    throw error;
  }

  return (data || []).map(normalizeTripTeamMember);
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
        team_role: teamRole || "Worker",
        travels_with_team: travelsWithTeam,
        start_date: startDate || null,
        end_date: endDate || null,
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
    let { data, error } = await supabase
      .from("trip_team_members")
      .upsert(attemptUpsert, { onConflict: "id" })
      .select(TRIP_TEAM_MEMBER_SELECT_FULL);

    if (error && isMissingTravelsWithTeamColumnError(error)) {
      attemptUpsert = existingMembers.map(({ travels_with_team, ...member }) => member);
      ({ data, error } = await supabase
        .from("trip_team_members")
        .upsert(attemptUpsert, { onConflict: "id" })
        .select(TRIP_TEAM_MEMBER_SELECT_NO_TRAVEL));
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
    let { data, error } = await supabase
      .from("trip_team_members")
      .insert(rowsToInsert)
      .select(TRIP_TEAM_MEMBER_SELECT_FULL);

    if (error && isMissingTravelsWithTeamColumnError(error)) {
      rowsToInsert = rowsToInsert.map(({ travels_with_team, ...member }) => member);
      ({ data, error } = await supabase
        .from("trip_team_members")
        .insert(rowsToInsert)
        .select(TRIP_TEAM_MEMBER_SELECT_NO_TRAVEL));
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

/** Update only the Neon fundraising URL for one roster row (no account required). */
export async function saveTripTeamMemberFundraisingUrl({ tripId, memberId, fundraisingUrl }) {
  const url = String(fundraisingUrl || "").trim() || null;
  const { data, error } = await supabase
    .from("trip_team_members")
    .update({
      fundraising_url: url,
      updated_at: new Date().toISOString(),
    })
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
