/** Staff who get the Monday "your tasks this week" email. */
export const WEEKLY_TASK_DIGEST_STAFF = [
  { key: "craig", firstName: "Craig", name: "Craig Altrock", email: "craig.altrock@lst.org" },
  { key: "leslee", firstName: "Leslee", name: "Leslee Altrock", email: "leslee.altrock@lst.org" },
  {
    key: "mackayla",
    firstName: "Mackayla",
    name: "Mackayla Rodriguez",
    email: "mackayla.rodriguez@lst.org",
  },
  { key: "donna", firstName: "Donna", name: "Donna Tucker", email: "donna.tucker@lst.org" },
];

export function findWeeklyTaskDigestStaff(key) {
  const normalized = String(key || "").trim().toLowerCase();
  return WEEKLY_TASK_DIGEST_STAFF.find((staff) => staff.key === normalized) || null;
}
