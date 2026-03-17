import { supabase } from "@/lib/supabase";

const EMPTY_RECORD = {
  teamName: "",
  firstNamePassport: "",
  middleNamePassport: "",
  lastNamePassport: "",
  suffix: "",
  email: "",
  birthdateMonth: "",
  birthdateDay: "",
  birthdateYear: "",
  gender: "",
  citizenship: "",
  passportNumber: "",
  passportExpirationDate: "",
  passportIssuingCountry: "",
  specialTravelPreferences: "",
  frequentFlyerPrecheck: "",
  siteProject: "",
  gatewayCity: "",
  departureDate: "",
  returnDate: "",
  tshirtSize: "",
  emergencyContactName: "",
  emergencyContactEmail: "",
  emergencyContactPhone: "",
  isMinor: "",
  passportValidSixMonths: "",
  baseTicketAck: "",
  teamTravelAck: "",
  endMeetingAck: "",
  travelInsuranceAck: "",
};

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
    teamName: normalizeText(row.team_name),
    firstNamePassport: normalizeText(row.first_name_passport),
    middleNamePassport: normalizeText(row.middle_name_passport),
    lastNamePassport: normalizeText(row.last_name_passport),
    suffix: normalizeText(row.suffix),
    email: normalizeText(row.email),
    birthdateMonth: normalizeText(row.birthdate_month),
    birthdateDay: normalizeText(row.birthdate_day),
    birthdateYear: normalizeText(row.birthdate_year),
    gender: normalizeText(row.gender),
    citizenship: normalizeText(row.citizenship),
    passportNumber: normalizeText(row.passport_number),
    passportExpirationDate: normalizeText(row.passport_expiration_date),
    passportIssuingCountry: normalizeText(row.passport_issuing_country),
    specialTravelPreferences: normalizeText(row.special_travel_preferences),
    frequentFlyerPrecheck: normalizeText(row.frequent_flyer_precheck),
    siteProject: normalizeText(row.site_project),
    gatewayCity: normalizeText(row.gateway_city),
    departureDate: normalizeText(row.departure_date),
    returnDate: normalizeText(row.return_date),
    tshirtSize: normalizeText(row.tshirt_size),
    emergencyContactName: normalizeText(row.emergency_contact_name),
    emergencyContactEmail: normalizeText(row.emergency_contact_email),
    emergencyContactPhone: normalizeText(row.emergency_contact_phone),
    isMinor: normalizeText(row.is_minor),
    passportValidSixMonths: normalizeText(row.passport_valid_six_months),
    baseTicketAck: normalizeText(row.base_ticket_ack),
    teamTravelAck: normalizeText(row.team_travel_ack),
    endMeetingAck: normalizeText(row.end_meeting_ack),
    travelInsuranceAck: normalizeText(row.travel_insurance_ack),
    updatedAt: row.updated_at || "",
    createdAt: row.created_at || "",
  };
}

function buildPayload(values) {
  return {
    team_name: values.teamName || null,
    first_name_passport: values.firstNamePassport || null,
    middle_name_passport: values.middleNamePassport || null,
    last_name_passport: values.lastNamePassport || null,
    suffix: values.suffix || null,
    email: values.email || null,
    birthdate_month: values.birthdateMonth || null,
    birthdate_day: values.birthdateDay || null,
    birthdate_year: values.birthdateYear || null,
    gender: values.gender || null,
    citizenship: values.citizenship || null,
    passport_number: values.passportNumber || null,
    passport_expiration_date: values.passportExpirationDate || null,
    passport_issuing_country: values.passportIssuingCountry || null,
    special_travel_preferences: values.specialTravelPreferences || null,
    frequent_flyer_precheck: values.frequentFlyerPrecheck || null,
    site_project: values.siteProject || null,
    gateway_city: values.gatewayCity || null,
    departure_date: values.departureDate || null,
    return_date: values.returnDate || null,
    tshirt_size: values.tshirtSize || null,
    emergency_contact_name: values.emergencyContactName || null,
    emergency_contact_email: values.emergencyContactEmail || null,
    emergency_contact_phone: values.emergencyContactPhone || null,
    is_minor: values.isMinor || null,
    passport_valid_six_months: values.passportValidSixMonths || null,
    base_ticket_ack: values.baseTicketAck || null,
    team_travel_ack: values.teamTravelAck || null,
    end_meeting_ack: values.endMeetingAck || null,
    travel_insurance_ack: values.travelInsuranceAck || null,
    updated_at: new Date().toISOString(),
  };
}

export { EMPTY_RECORD };

export async function getTravelFormForUser(tripId, userId) {
  const { data, error } = await supabase
    .from("travel_form_responses")
    .select("*")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error loading travel form", error);
    throw error;
  }

  return data ? normalizeRow(data) : null;
}

export async function saveTravelFormForUser(tripId, userId, values) {
  const payload = {
    ...buildPayload(values),
    trip_id: tripId,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from("travel_form_responses")
    .upsert(payload, { onConflict: "trip_id,user_id" })
    .select("*")
    .single();

  if (error) {
    console.error("Error saving travel form", error);
    throw error;
  }

  return normalizeRow(data);
}

export async function listTravelFormResponsesForTrip(tripId) {
  const { data, error } = await supabase
    .from("travel_form_responses")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading travel form responses", error);
    throw error;
  }

  return (data || []).map(normalizeRow);
}
