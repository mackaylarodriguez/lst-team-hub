const KEY = "lstHubSession";

export function getSession() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
  catch { return null; }
}

export function setSession(session) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function requireSession(router) {
  const s = getSession();
  if (!s) {
    router.replace("/login");
    return null;
  }
  return s;
}
