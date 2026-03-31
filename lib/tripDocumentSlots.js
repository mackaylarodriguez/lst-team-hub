export const DOCUMENT_CATEGORY_OPTIONS = [
  "Flights",
  "Travel",
  "Budget",
  "Insurance",
  "Site",
  "Team",
  "Other",
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
    title: "Smartsheet Budget",
    category: "Budget",
    kind: "link",
    description: "Add the trip-specific Smartsheet budget link.",
    tutorialTitle: "Budget Tutorial",
    tutorialUrl: "https://youtu.be/q6WPuXb0EZE?si=IZiZ-l6Hm2VMwmoY",
    tutorialDescription: "Tutorial on how to track funds.",
  },
  {
    key: "project-record-journal",
    title: "Project Record Journal",
    category: "Budget",
    kind: "link",
    description: "Add the trip-specific project record journal link.",
    tutorialTitle: "Project Record Journal Tutorial",
    tutorialUrl: "https://youtu.be/85kCAYYG9co?si=kt3oKA_RHua8Wq7e",
    tutorialDescription: "Tutorial on how to track the project record journal.",
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
    description: "Booking link from Budget → Housing (Airbnb, hotel, etc.).",
  },
];

export function getDocumentSlotByKey(key) {
  return REQUIRED_TRIP_DOCUMENT_SLOTS.find((slot) => slot.key === key) || null;
}
