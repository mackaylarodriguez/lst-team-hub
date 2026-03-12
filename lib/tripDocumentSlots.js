export const DOCUMENT_CATEGORY_OPTIONS = [
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
    category: "Travel",
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
  },
  {
    key: "site-info-link",
    title: "Site Info Link",
    category: "Site",
    kind: "link",
    description: "Add the standard site information link for this trip.",
  },
];

export function getDocumentSlotByKey(key) {
  return REQUIRED_TRIP_DOCUMENT_SLOTS.find((slot) => slot.key === key) || null;
}
