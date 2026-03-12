export const USER_DOCUMENT_TYPES = [
  {
    key: "passport",
    label: "Passport",
    description: "Passport scan or photo.",
  },
  {
    key: "visa",
    label: "Visa",
    description: "Visa, approval, or other entry document.",
  },
];

export function getUserDocumentTypeLabel(value) {
  const match = USER_DOCUMENT_TYPES.find((item) => item.key === value);
  return match?.label || "Document";
}
