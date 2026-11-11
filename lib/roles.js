export const ROLE_ADMIN = "admin";
export const ROLE_STAFF = "staff";
export const ROLE_WORKER = "worker";
export const ROLE_LEADER = "leader";

export function isAdminRole(role) {
  return role === ROLE_ADMIN;
}

export function isStaffRole(role) {
  return role === ROLE_STAFF;
}

export function isLeaderRole(role) {
  return role === ROLE_LEADER;
}

export function isManagerRole(role) {
  return role === ROLE_ADMIN || role === ROLE_STAFF;
}

export function isWorkerRole(role) {
  return role === ROLE_WORKER;
}

/** Team leaders and trainers can open Training. Editing stays with staff and admins. */
export function isTrainerOrLeaderRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === ROLE_LEADER || normalized === "trainer";
}

export function canViewTrainingCenter(role) {
  return isManagerRole(role) || isTrainerOrLeaderRole(role);
}
