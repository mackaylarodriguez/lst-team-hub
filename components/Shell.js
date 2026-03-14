import Link from "next/link";
import { useRouter } from "next/router";
import {
  clearImpersonatedProfile,
  clearSession,
  getSession,
  listProfilesForAdmin,
  SESSION_UPDATED_EVENT,
  setImpersonatedProfile,
} from "@/lib/auth";
import { useEffect, useState } from "react";
import { isManagerRole, isStaffRole, ROLE_ADMIN } from "@/lib/roles";

export default function Shell({ children }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const path = router.pathname;

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const nextSession = await getSession();
      if (!cancelled) {
        setSession(nextSession);
      }
    }

    loadSession();

    function handleSessionUpdate() {
      loadSession();
    }

    window.addEventListener(SESSION_UPDATED_EVENT, handleSessionUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener(SESSION_UPDATED_EVENT, handleSessionUpdate);
    };
  }, []);

  const canManageTrips = isManagerRole(session?.permissionRole || session?.role);
  const isAdminUser = session?.actualRole === ROLE_ADMIN;
  const isStaffUser = isStaffRole(session?.role);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedValue = window.localStorage.getItem("lst-sidebar-collapsed");
    if (storedValue === "true") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("lst-sidebar-collapsed", isSidebarCollapsed ? "true" : "false");
  }, [isSidebarCollapsed]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      if (!isAdminUser) {
        setProfiles([]);
        return;
      }

      try {
        const nextProfiles = await listProfilesForAdmin();
        if (!cancelled) {
          setProfiles(nextProfiles);
        }
      } catch (error) {
        console.error("Unable to load profiles for switching", error);
      }
    }

    loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [isAdminUser]);

  async function handleProfileSwitch(event) {
    const email = event.target.value;

    if (!email) {
      clearImpersonatedProfile();
      return;
    }

    const profile = profiles.find((item) => item.email === email);
    if (!profile) return;
    setImpersonatedProfile(profile);
  }

  const navItems = [
    { href: "/trips", label: "My Trips", shortLabel: "Trips", active: path.startsWith("/trips") },
    canManageTrips
      ? { href: "/admin", label: "My Tasks", shortLabel: "Tasks", active: path === "/admin" }
      : null,
    isStaffUser
      ? { href: "/staff", label: "Participants", shortLabel: "People", active: path === "/staff" }
      : null,
    isStaffUser
      ? { href: "/recruiting", label: "Recruiting", shortLabel: "Recruit", active: path === "/recruiting" }
      : null,
    { href: "/profile", label: "Profile", shortLabel: "Profile", active: path === "/profile" },
  ].filter(Boolean);

  return (
    <div className={`shell ${isSidebarCollapsed ? "shellCollapsed" : ""}`}>
      <aside className={`sidebar ${isSidebarCollapsed ? "sidebarCollapsed" : ""}`}>
        <div className="sidebarToggleRow">
          <button
            className="btn sidebarToggleButton"
            type="button"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
          >
            {isSidebarCollapsed ? "Expand" : "Collapse"}
          </button>
        </div>
        <div className="brand">
          <div className="logo" aria-hidden="true" />
          {!isSidebarCollapsed ? (
            <div>
              <div style={{ fontWeight: 900, letterSpacing: "-.02em" }}>LST International Projects Hub</div>
            </div>
          ) : null}
        </div>
        <div style={{ height: 14 }} />
        <nav className="nav">
          {navItems.map((item) => (
            <Link key={item.href} className={item.active ? "active" : ""} href={item.href}>
              {isSidebarCollapsed ? item.shortLabel : item.label}
            </Link>
          ))}
          <a
            href="#"
            onClick={async (e) => {
              e.preventDefault();
              await clearSession();
              router.push("/login");
            }}
          >
            {isSidebarCollapsed ? "Out" : "Logout"}
          </a>
        </nav>

        <div style={{ height: 14 }} />
        {!isSidebarCollapsed ? (
          <div className="small">
            Signed in as <b>{session?.name || "-"}</b><br />
            <span className="badge" style={{ marginTop: 8 }}>
              {session?.role || "unknown"}
            </span>
            {session?.isImpersonating && (
              <div style={{ marginTop: 8 }}>
                Viewing as <b>{session.email}</b>
              </div>
            )}
          </div>
        ) : (
          <div className="sidebarCollapsedMeta">
            <span className="badge">{session?.role || "unknown"}</span>
          </div>
        )}

        {isAdminUser && !isSidebarCollapsed && (
          <>
            <div style={{ height: 14 }} />
            <div className="card pad" style={{ boxShadow: "none", background: "rgba(255,255,255,.75)" }}>
              <div className="small" style={{ marginBottom: 8 }}>Switch Profile</div>
              <select
                className="input"
                value={session?.isImpersonating ? session.email : ""}
                onChange={handleProfileSwitch}
              >
                <option value="">Admin view</option>
                {profiles.map((profile) => (
                  <option key={profile.id || profile.email} value={profile.email}>
                    {profile.email} ({profile.role})
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </aside>

      <main className="main">
        {children}
      </main>
    </div>
  );
}
