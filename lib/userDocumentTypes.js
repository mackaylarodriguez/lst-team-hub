export const USER_DOCUMENT_TYPES = [
  {
    key: "passport",
    label: "Passport",
    description: "Passport scan or photo.",
  },
  {
    key: "visa",
    label: "Travel Visa",
    description: "Travel visa, entry approval, or other country entry document.",
  },
];

function slugifyDocumentTypeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isParticipantDocumentTypeExclusion(item) {
  return !!(item && typeof item === "object" && item.exclude === true && item.key);
}

export function parseTripParticipantDocumentConfig(raw = []) {
  const excludedKeys = new Set();
  const customRaw = [];

  for (const item of raw || []) {
    if (isParticipantDocumentTypeExclusion(item)) {
      excludedKeys.add(String(item.key || "").trim().toLowerCase());
      continue;
    }
    customRaw.push(item);
  }

  return {
    excludedKeys,
    customTypes: normalizeCustomUserDocumentTypes(customRaw),
  };
}

export function buildParticipantDocumentTypesPayload(customTypes, excludedKeys) {
  const exclusions = USER_DOCUMENT_TYPES.filter((item) => excludedKeys.has(item.key)).map((item) => ({
    exclude: true,
    key: item.key,
  }));
  return [...exclusions, ...(customTypes || [])];
}

export function isBuiltInUserDocumentTypeKey(key) {
  return USER_DOCUMENT_TYPES.some((item) => item.key === String(key || "").trim().toLowerCase());
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

export function getTripUserDocumentTypes(participantDocumentTypesRaw = [], options = {}) {
  const { domesticMassachusetts = false } = options || {};
  const { excludedKeys, customTypes } = parseTripParticipantDocumentConfig(participantDocumentTypesRaw);
  const base = USER_DOCUMENT_TYPES.filter((item) => !excludedKeys.has(item.key)).map((item) => {
    if (domesticMassachusetts && item.key === "passport") {
      return {
        ...item,
        label: "Government ID",
        description: "Government-issued photo ID (driver license, state ID, passport, etc.).",
      };
    }
    return item;
  });
  return [...base, ...customTypes];
}

export function getUserDocumentTypeLabel(value, participantDocumentTypesRaw = [], options = {}) {
  const match = getTripUserDocumentTypes(participantDocumentTypesRaw, options).find(
    (item) => item.key === value
  );
  return match?.label || "Document";
}
