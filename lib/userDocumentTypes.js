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

function slugifyDocumentTypeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeCustomUserDocumentTypes(values) {
  const seen = new Set(USER_DOCUMENT_TYPES.map((item) => item.key));

  return (values || [])
    .map((item) => {
      if (typeof item === "string") {
        const label = item.trim();
        const key = slugifyDocumentTypeKey(label);
        if (!label || !key) return null;
        return { key, label, description: `${label} upload.` };
      }

      const label = String(item?.label || "").trim();
      const key = slugifyDocumentTypeKey(item?.key || label);
      const description = String(item?.description || `${label} upload.`).trim();
      if (!label || !key) return null;
      return { key, label, description };
    })
    .filter((item) => {
      if (!item) return false;
      if (seen.has(item.key)) return false;
      seen.add(item.key);
      return true;
    });
}

export function getTripUserDocumentTypes(customTypes = [], options = {}) {
  const { domesticMassachusetts = false } = options || {};
  const base = USER_DOCUMENT_TYPES.map((item) => {
    if (domesticMassachusetts && item.key === "passport") {
      return {
        ...item,
        label: "Government ID",
        description: "Government-issued photo ID (driver license, state ID, passport, etc.).",
      };
    }
    return item;
  });
  return [...base, ...normalizeCustomUserDocumentTypes(customTypes)];
}

export function getUserDocumentTypeLabel(value, customTypes = [], options = {}) {
  const match = getTripUserDocumentTypes(customTypes, options).find((item) => item.key === value);
  return match?.label || "Document";
}
