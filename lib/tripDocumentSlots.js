export const DOCUMENT_CATEGORY_OPTIONS = [
  "Flights",
  "Travel",
  "Budget",
  "Insurance",
  "Site",
  "Team",
  "Other",
];

/** Display order for legacy slot ordering (budget → site → housing). */
export const TRIP_DOCUMENT_SLOT_ORDER = [
  "smartsheet-budget",
  "site-info-link",
  "housing-accommodation-link",
];

export const REQUIRED_TRIP_DOCUMENT_SLOTS = [
  {
    key: "smartsheet-budget",
    title: "Smartsheet budget & project record journal",
    category: "Budget",
    kind: "link",
    description:
      "One link for the trip Smartsheet budget and the project record journal (same sheet or hub).",
    tutorialTitle: "Budget Tutorial",
    tutorialUrl: "https://youtu.be/q6WPuXb0EZE?si=IZiZ-l6Hm2VMwmoY",
    tutorialDescription: "Tutorial on how to track funds.",
    tutorial2Title: "Project Record Journal Tutorial",
    tutorial2Url: "https://youtu.be/85kCAYYG9co?si=kt3oKA_RHua8Wq7e",
    tutorial2Description: "Tutorial on how to track the project record journal.",
  },
  {
    key: "site-info-link",
    title: "Site Logistics",
    category: "Site",
    kind: "link",
    description: "Add the standard site logistics link for this trip.",
  },
  {
    key: "housing-accommodation-link",
    title: "Team housing",
    category: "Team",
    kind: "link",
    description: "Booking link and/or housing PDF for this team (Airbnb, hotel, etc.).",
  },
];

export function getDocumentSlotByKey(key) {
  if (key === "project-record-journal") {
    return REQUIRED_TRIP_DOCUMENT_SLOTS.find((s) => s.key === "smartsheet-budget") || null;
  }
  if (key === "flights") {
    return {
      key: "flights",
      title: "Flights",
      category: "Flights",
      kind: "pdf",
      description: "Flight itinerary or related PDFs.",
    };
  }
  if (key === "trip-insurance") {
    return {
      key: "trip-insurance",
      title: "Trip Insurance",
      category: "Insurance",
      kind: "pdf",
      description: "Travel insurance document.",
    };
  }
  return REQUIRED_TRIP_DOCUMENT_SLOTS.find((slot) => slot.key === key) || null;
}

/** Static YouTube (or other) tutorials for the Smartsheet budget slot — shown as separate cards in Trip Documents. */
export function getSmartsheetBudgetTutorialCards() {
  const slot = REQUIRED_TRIP_DOCUMENT_SLOTS.find((s) => s.key === "smartsheet-budget");
  if (!slot) return [];
  const out = [];
  if (String(slot.tutorialUrl || "").trim()) {
    out.push({
      key: "smartsheet-budget-tutorial-1",
      title: String(slot.tutorialTitle || "").trim() || "Budget tutorial",
      url: String(slot.tutorialUrl).trim(),
      description: String(slot.tutorialDescription || "").trim(),
    });
  }
  if (String(slot.tutorial2Url || "").trim()) {
    out.push({
      key: "smartsheet-budget-tutorial-2",
      title: String(slot.tutorial2Title || "").trim() || "Project record journal tutorial",
      url: String(slot.tutorial2Url).trim(),
      description: String(slot.tutorial2Description || "").trim(),
    });
  }
  return out;
}
