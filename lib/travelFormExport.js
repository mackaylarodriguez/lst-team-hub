/**
 * Fill the travel form Excel template with trip participants and their form responses.
 * Supports the HIGH POINT "Passenger Name List" template: headers (e.g. FIRST NAME, LAST NAME)
 * can be on any row; we detect the header row and fill passenger data below it.
 */

import * as XLSX from "xlsx";

// Order matters: more specific patterns first (e.g. "expiration date" before "date")
const TRAVEL_FORM_HEADER_MAP = [
  { key: "teamName", patterns: ["team name", "team"] },
  { key: "firstNamePassport", patterns: ["first name", "first nam"] },
  { key: "middleNamePassport", patterns: ["middle name", "middle na"] },
  { key: "lastNamePassport", patterns: ["last name", "last nam"] },
  { key: "suffix", patterns: ["suffix"] },
  { key: "email", patterns: ["your email address", "email address", "email"] },
  { key: "birthdateMonth", patterns: ["birthdate-month", "birthdate month", "month"] },
  { key: "birthdateDay", patterns: ["birthdate-day", "birthdate day", "date"] },
  { key: "birthdateYear", patterns: ["birthdate-year", "birthdate year", "year"] },
  { key: "gender", patterns: ["gender"] },
  { key: "citizenship", patterns: ["citizenship", "citizensh"] },
  { key: "passportNumber", patterns: ["passport number", "passport #", "passport"] },
  { key: "passportExpirationDate", patterns: ["expiration date", "passport expiration", "expiratio", "expiration"] },
  { key: "passportIssuingCountry", patterns: ["issuing country", "passport issuing", "issuing co", "issuing"] },
  { key: "specialTravelPreferences", patterns: ["special travel preferences", "special travel", "travel preferences"] },
  { key: "frequentFlyerPrecheck", patterns: ["known traveler number", "frequent flyer #", "frequent flyer", "pre-check", "precheck", "known traveler"] },
  { key: "notes", patterns: ["notes"] },
  { key: "siteProject", patterns: ["site of lst project", "site (city", "site"] },
  { key: "gatewayCity", patterns: ["gateway city", "gateway"] },
  { key: "departureDate", patterns: ["departure date", "departure"] },
  { key: "returnDate", patterns: ["return date", "return"] },
  { key: "isMinor", patterns: ["minor", "under 18"] },
  { key: "passportValidSixMonths", patterns: ["passport good for at least six", "passport 6mo", "passport valid"] },
  { key: "baseTicketAck", patterns: ["base ticket"] },
  { key: "teamTravelAck", patterns: ["team travel"] },
  { key: "endMeetingAck", patterns: ["end meeting", "endmeeting"] },
  { key: "travelInsuranceAck", patterns: ["travel insurance"] },
];

function normalizeHeader(str) {
  if (str == null) return "";
  return String(str).trim().toLowerCase().replace(/\s+/g, " ");
}

function headerToFieldKey(normalizedHeader, rawHeader = "") {
  if (!normalizedHeader) return null;
  const raw = normalizeHeader(rawHeader);
  if ((raw.includes("first nam") || raw.includes("first name")) && (raw.includes("last nam") || raw.includes("last name"))) {
    return "fullName";
  }
  for (const { key, patterns } of TRAVEL_FORM_HEADER_MAP) {
    for (const p of patterns) {
      if (normalizedHeader.includes(p) || p.includes(normalizedHeader)) return key;
    }
  }
  return null;
}

function getFormValue(form, trip, participant, key) {
  if (!form && key === "teamName") return trip?.name || "";
  if (key === "email") return (form?.email || participant?.email || "").trim();
  if (key === "notes") return (form?.specialTravelPreferences ?? "").trim();
  if (key === "fullName") {
    const first = (form?.firstNamePassport ?? "").trim();
    const middle = (form?.middleNamePassport ?? "").trim();
    const last = (form?.lastNamePassport ?? "").trim();
    const suffix = (form?.suffix ?? "").trim();
    return [first, middle, last, suffix].filter(Boolean).join(" ");
  }
  const v = form?.[key];
  if (v == null) return "";
  return String(v).trim();
}

/**
 * Fill the first sheet of the template with travel form data.
 * @param {ArrayBuffer} arrayBuffer - Template .xlsx file bytes
 * @param {{ participants: Array<{ id: string, email?: string }>, travelFormResponses: Array<object>, trip: { name?: string } }} options
 * @returns {{ blob: Blob | null, error: string | null }}
 */
/** Find the row index that contains passenger table headers (e.g. FIRST NAME, LAST NAME). */
function findPassengerHeaderRow(sheet, range, lastCol) {
  const maxScan = Math.min(range.e.r, 25);
  for (let r = range.s.r; r <= maxScan; r++) {
    let hasFirst = false;
    let hasLast = false;
    for (let c = 0; c <= lastCol; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[ref];
      const raw = cell && (cell.v != null) ? String(cell.v) : "";
      const n = normalizeHeader(raw);
      if (n.includes("first name") || n.includes("first nam")) hasFirst = true;
      if (n.includes("last name") || n.includes("last nam")) hasLast = true;
    }
    if (hasFirst && hasLast) return r;
  }
  return range.s.r;
}

export function fillTravelFormExportTemplate(arrayBuffer, { participants = [], travelFormResponses = [], trip = {} }) {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { blob: null, error: "Template has no sheets." };
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
    const lastCol = range.e.c;

    const headerRowIndex = findPassengerHeaderRow(sheet, range, lastCol);
    const headerRow = [];
    for (let c = 0; c <= lastCol; c++) {
      const ref = XLSX.utils.encode_cell({ r: headerRowIndex, c });
      const cell = sheet[ref];
      const raw = cell && (cell.v != null) ? String(cell.v) : "";
      headerRow.push(raw);
    }

    const columnKeys = headerRow.map((h) => headerToFieldKey(normalizeHeader(h)));

    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const participantRefKey = p.refKey
        || (p.id ? `user:${p.id}` : "");
      const form = travelFormResponses.find((f) => {
        const rowRefKey = f.userId
          ? `user:${f.userId}`
          : f.tripTeamMemberId
            ? `roster:${f.tripTeamMemberId}`
            : "";
        return participantRefKey && rowRefKey === participantRefKey;
      }) || null;
      const rowIndex = headerRowIndex + 2 + i;
      for (let c = 0; c < columnKeys.length; c++) {
        const key = columnKeys[c];
        let value = "";
        if (key) value = getFormValue(form, trip, p, key);
        const ref = XLSX.utils.encode_cell({ r: rowIndex, c });
        const existing = sheet[ref];
        if (existing && existing.t != null) {
          existing.v = value;
        } else {
          sheet[ref] = { t: "s", v: value };
        }
      }
    }

    const lastDataRow = headerRowIndex + 1 + participants.length;
    if (lastDataRow > range.e.r) {
      sheet["!ref"] = XLSX.utils.encode_range({
        s: { r: range.s.r, c: range.s.c },
        e: { r: lastDataRow, c: lastCol },
      });
    }

    const out = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    return { blob, error: null };
  } catch (e) {
    return { blob: null, error: e?.message || "Failed to fill template." };
  }
}

export const TRAVEL_FORM_TEMPLATE_PATH = "/templates/travel-form-export.xlsx";
