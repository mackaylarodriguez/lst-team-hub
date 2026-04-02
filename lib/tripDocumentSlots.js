export const DOCUMENT_CATEGORY_OPTIONS = [
  "Flights",
  "Travel",
  "Budget",
  "Insurance",
  "Site",
  "Team",
  "Other",
];

/** Display order on Trip Documents: flights → insurance → budget → site → housing (site card is rendered between budget and housing in the page). */
export const TRIP_DOCUMENT_SLOT_ORDER = [
  "flights",
  "trip-insurance",
  "smartsheet-budget",
  "site-info-link",
  "housing-accommodation-link",
];

export const REQUIRED_TRIP_DOCUMENT_SLOTS = [
  {
    key: "flights",
    title: "Flights",
    category: "Flights",
    kind: "pdf",
    description: "Upload the team's flight itinerary.",
  },
  {
    key: "trip-insurance",
    title: "Trip Insurance",
    category: "Insurance",
    kind: "pdf",
    description: "Upload the trip insurance document.",
  },
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
  return REQUIRED_TRIP_DOCUMENT_SLOTS.find((slot) => slot.key === key) || null;
}
