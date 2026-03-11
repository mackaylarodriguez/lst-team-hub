export const ROLE_ADMIN = "admin";
export const ROLE_STAFF = "staff";
export const ROLE_WORKER = "worker";

export function isManagerRole(role) {
  return role === ROLE_ADMIN || role === ROLE_STAFF;
}

export function isWorkerRole(role) {
  return role === ROLE_WORKER;
}
