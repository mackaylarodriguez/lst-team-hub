/** True when trip `location` is the USA Massachusetts mission site (domestic). */
export function isUsMassachusettsMissionSite(location) {
  return String(location || "").toLowerCase().includes("massachusetts");
}
