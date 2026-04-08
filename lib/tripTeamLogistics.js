import { supabase } from "@/lib/supabase";

const EMPTY = {
  teamAccountant: "",
  teamRecorder: "",
  materialsShipAddress: "",
  materialsShipAddressNote: "",
  materialsTrackingNumber: "",
  materialsNotesForTeam: "",
};

function normalizePayload(raw) {
  if (!raw || typeof raw !== "object") return { ...EMPTY };
  return {
    teamAccountant: String(raw.teamAccountant ?? "").trim(),
    teamRecorder: String(raw.teamRecorder ?? "").trim(),
    materialsShipAddress: String(raw.materialsShipAddress ?? "").trim(),
    materialsShipAddressNote: String(raw.materialsShipAddressNote ?? "").trim(),
    materialsTrackingNumber: String(raw.materialsTrackingNumber ?? "").trim(),
    materialsNotesForTeam: String(raw.materialsNotesForTeam ?? "").trim(),
  };
}

/** Trip participants / leaders read team-visible materials fields (RPC; bypasses trip_budgets RLS). */
export async function getTripTeamLogisticsForViewer(tripId) {
  if (!tripId) return { ...EMPTY };
  const { data, error } = await supabase.rpc("get_trip_team_logistics_for_viewer", {
    p_trip_id: tripId,
  });
  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("function") && msg.includes("does not exist")) {
      return { ...EMPTY };
    }
    console.error("get_trip_team_logistics_for_viewer", error);
    throw error;
  }
  const parsed = normalizePayload(data);
  if (data && typeof data === "object" && Object.keys(data).length === 0) {
    return { ...EMPTY };
  }
  return parsed;
}

/** Workers and leaders update accountant, recorder, ship address, and application-address note. */
export async function saveTripTeamLogisticsByTeam(tripId, values) {
  if (!tripId) throw new Error("Trip required");
  const { error } = await supabase.rpc("save_trip_team_logistics_by_team", {
    p_trip_id: tripId,
    p_team_accountant: String(values?.teamAccountant ?? ""),
    p_team_recorder: String(values?.teamRecorder ?? ""),
    p_materials_ship_address: String(values?.materialsShipAddress ?? ""),
    p_materials_ship_address_note: String(values?.materialsShipAddressNote ?? ""),
  });
  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("function") && msg.includes("does not exist")) {
      throw new Error("Team logistics save is not available yet. Ask staff to run the latest database migration.");
    }
    console.error("save_trip_team_logistics_by_team", error);
    throw error;
  }
}
