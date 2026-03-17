import { supabase } from "@/lib/supabase";

function n(val) {
  return val === null || val === undefined ? "" : String(val).trim();
}

function normalize(row) {
  if (!row) return null;
  return {
    id: row.id,
    tripId: row.trip_id,
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

export async function saveTripTicket(ticket) {
  const payload = {
    trip_id: ticket.tripId,
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

  if (ticket.id) {
    const { data, error } = await supabase
      .from("trip_tickets")
      .update(payload)
      .eq("id", ticket.id)
      .select("*")
      .single();

    if (error) throw error;
    return normalize(data);
  }

  const { data, error } = await supabase
    .from("trip_tickets")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return normalize(data);
}

export async function deleteTripTicket(id) {
  const { error } = await supabase.from("trip_tickets").delete().eq("id", id);
  if (error) throw error;
}
