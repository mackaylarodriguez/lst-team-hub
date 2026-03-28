import { supabase } from "@/lib/supabase";

function n(val) {
  return val === null || val === undefined ? "" : String(val).trim();
}

function isMissingTripTeamMemberIdColumnError(error) {
  const msg = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    msg.includes("trip_team_member_id") &&
    (msg.includes("does not exist") || msg.includes("schema cache") || error?.code === "42703")
  );
}

function workerNameTicketKey(name) {
  return n(name).toLowerCase().replace(/\s+/g, " ");
}

function normalize(row) {
  if (!row) return null;
  return {
    id: row.id,
    tripId: row.trip_id,
    tripTeamMemberId: n(row.trip_team_member_id),
    intlDom: n(row.intl_dom),
    workerName: n(row.worker_name),
    projectCountry: n(row.project_country),
    projectCity: n(row.project_city),
    departureDate: row.departure_date || "",
    ticketAgency: n(row.ticket_agency),
    totalTicketCost: n(row.total_ticket_cost),
    amountWorkerPaid: n(row.amount_worker_paid),
    totalLstCost: n(row.total_lst_cost),
    hpTotalCharge: n(row.hp_total_charge),
    dateApprovedToWithdraw: row.date_approved_to_withdraw || "",
  };
}

function normalizeWithTrip(row, tripName = "") {
  const base = normalize(row);
  return base ? { ...base, tripName } : null;
}

export async function listAllTripTickets() {
  const { data, error } = await supabase
    .from("trip_tickets")
    .select("*, trips(trip_name)")
    .order("departure_date", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading all trip tickets", error);
    throw error;
  }

  return (data || []).map((row) =>
    normalizeWithTrip(row, String(row.trips?.trip_name || "").trim())
  );
}

export async function listTripTickets(tripId) {
  const { data, error } = await supabase
    .from("trip_tickets")
    .select("*")
    .eq("trip_id", tripId)
    .order("departure_date", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading trip tickets", error);
    throw error;
  }

  return (data || []).map(normalize);
}

function omitTripTeamMemberId(payload) {
  const next = { ...payload };
  delete next.trip_team_member_id;
  return next;
}

export async function saveTripTicket(ticket) {
  let payload = {
    trip_id: ticket.tripId,
    trip_team_member_id: ticket.tripTeamMemberId || null,
    intl_dom: ticket.intlDom || null,
    worker_name: ticket.workerName || null,
    project_country: ticket.projectCountry || null,
    project_city: ticket.projectCity || null,
    departure_date: ticket.departureDate || null,
    ticket_agency: ticket.ticketAgency || null,
    total_ticket_cost: ticket.totalTicketCost || null,
    amount_worker_paid: ticket.amountWorkerPaid || null,
    total_lst_cost: ticket.totalLstCost || null,
    hp_total_charge: ticket.hpTotalCharge || null,
    date_approved_to_withdraw: ticket.dateApprovedToWithdraw || null,
    updated_at: new Date().toISOString(),
  };

  async function upsert(currentPayload) {
    if (ticket.id) {
      return supabase
        .from("trip_tickets")
        .update(currentPayload)
        .eq("id", ticket.id)
        .select("*")
        .single();
    }
    return supabase.from("trip_tickets").insert(currentPayload).select("*").single();
  }

  let { data, error } = await upsert(payload);
  if (error && isMissingTripTeamMemberIdColumnError(error)) {
    ({ data, error } = await upsert(omitTripTeamMemberId(payload)));
  }
  if (error) throw error;
  return normalize(data);
}

export async function syncTripTicketsFromTeamMembers(trips = []) {
  const { data: members, error: membersError } = await supabase
    .from("trip_team_members")
    .select("id, trip_id, first_name, last_name, email");

  if (membersError) {
    console.error("Error loading trip team members for ticket sync", membersError);
    throw membersError;
  }

  let useRosterMemberId = true;
  let existingRows = [];

  const rosterSelect = await supabase
    .from("trip_tickets")
    .select("id, trip_id, trip_team_member_id");

  if (rosterSelect.error && isMissingTripTeamMemberIdColumnError(rosterSelect.error)) {
    useRosterMemberId = false;
    const legacy = await supabase.from("trip_tickets").select("id, trip_id, worker_name");
    if (legacy.error) {
      console.error("Error loading existing tickets for ticket sync", legacy.error);
      throw legacy.error;
    }
    existingRows = legacy.data || [];
  } else if (rosterSelect.error) {
    console.error("Error loading existing tickets for ticket sync", rosterSelect.error);
    throw rosterSelect.error;
  } else {
    existingRows = rosterSelect.data || [];
  }

  const existingKeys = useRosterMemberId
    ? new Set(
        existingRows
          .filter((row) => row.trip_id && row.trip_team_member_id)
          .map((row) => `${row.trip_id}:${row.trip_team_member_id}`)
      )
    : new Set(
        existingRows
          .filter((row) => row.trip_id && n(row.worker_name))
          .map((row) => `${row.trip_id}:${workerNameTicketKey(row.worker_name)}`)
      );

  const tripMetaById = new Map(
    (trips || []).map((trip) => [trip.id, { startDate: trip.startDate || "", location: trip.location || "" }])
  );

  const inserts = (members || [])
    .filter((member) => member.id && member.trip_id)
    .filter((member) => {
      const workerName = [n(member.first_name), n(member.last_name)].filter(Boolean).join(" ");
      const label = workerName || n(member.email) || "Team member";
      if (useRosterMemberId) {
        return !existingKeys.has(`${member.trip_id}:${member.id}`);
      }
      return !existingKeys.has(`${member.trip_id}:${workerNameTicketKey(label)}`);
    })
    .map((member) => {
      const tripMeta = tripMetaById.get(member.trip_id) || { startDate: "", location: "" };
      const workerName = [n(member.first_name), n(member.last_name)].filter(Boolean).join(" ");
      const row = {
        trip_id: member.trip_id,
        worker_name: workerName || n(member.email) || "Team member",
        intl_dom: "Intl",
        project_country: n(tripMeta.location),
        departure_date: tripMeta.startDate || null,
      };
      if (useRosterMemberId) {
        row.trip_team_member_id = member.id;
      }
      return row;
    });

  if (inserts.length === 0) return 0;

  let { error: insertError } = await supabase.from("trip_tickets").insert(inserts);
  if (insertError && isMissingTripTeamMemberIdColumnError(insertError)) {
    const legacyInserts = inserts.map((row) => omitTripTeamMemberId(row));
    ({ error: insertError } = await supabase.from("trip_tickets").insert(legacyInserts));
  }
  if (insertError) {
    console.error("Error inserting auto-created roster tickets", insertError);
    throw insertError;
  }
  return inserts.length;
}

export async function deleteTripTicket(id) {
  const { error } = await supabase.from("trip_tickets").delete().eq("id", id);
  if (error) throw error;
}
