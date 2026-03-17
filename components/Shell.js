import Link from "next/link";
import { useRouter } from "next/router";
import Toast from "@/components/Toast";
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

function SidebarIcon({ name }) {
  if (name === "trips") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
        <path d="M8 3.5v3" />
        <path d="M16 3.5v3" />
        <path d="M3.5 9.5h17" />
      </svg>
    );
  }

  if (name === "tasks") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 6.5h10" />
        <path d="M9 12h10" />
        <path d="M9 17.5h10" />
        <path d="M5 6.5h.01" />
        <path d="M5 12h.01" />
        <path d="M5 17.5h.01" />
      </svg>
    );
  }

  if (name === "workers") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M16.5 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        <path d="M3.5 18.5c.7-2.7 2.8-4 5-4s4.3 1.3 5 4" />
        <path d="M13.5 18.5c.5-1.9 2-2.9 3.6-2.9 1.4 0 2.6.7 3.4 2.1" />
      </svg>
    );
  }

  if (name === "recruiting") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="10" cy="10" r="5.5" />
        <path d="m14 14 6 6" />
      </svg>
    );
  }

  if (name === "profile") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 19c1.2-3.3 4.1-5 7-5s5.8 1.7 7 5" />
      </svg>
    );
  }

  if (name === "money") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2v20" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export default function Shell({ children }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [installHintText, setInstallHintText] = useState("");
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
    setIsMobileNavOpen(false);
  }, [path]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissed = window.localStorage.getItem("lst-install-hint-dismissed") === "true";
    const isStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
    const isAndroid = /android/i.test(window.navigator.userAgent || "");

    if (dismissed || isStandalone) return;

    if (isIos) {
      setInstallHintText("Add this app to your home screen from Safari: Share -> Add to Home Screen.");
      setShowInstallHint(true);
      return;
    }

    if (isAndroid) {
      setInstallHintText("Install this app from your browser menu to open it like a native app.");
      setShowInstallHint(true);
    }
  }, []);

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
    { href: "/trips", label: "My Trips", active: path.startsWith("/trips"), icon: "trips" },
    canManageTrips
      ? { href: "/admin", label: "My Tasks", active: path === "/admin", icon: "tasks" }
      : null,
    isStaffUser
      ? { href: "/staff", label: "Workers", active: path === "/staff", icon: "workers" }
      : null,
    isStaffUser
      ? { href: "/recruiting", label: "Recruiting", active: path === "/recruiting", icon: "recruiting" }
      : null,
    canManageTrips
      ? { href: "/budget", label: "Budget", active: path === "/budget", icon: "money" }
      : null,
    { href: "/profile", label: "Profile", active: path === "/profile", icon: "profile" },
  ].filter(Boolean);

  return (
    <div className={`shell ${isSidebarCollapsed ? "shellCollapsed" : ""}`}>
      <aside
        className={`sidebar ${isSidebarCollapsed ? "sidebarCollapsed" : ""} ${isMobileNavOpen ? "sidebarMobileOpen" : ""}`}
      >
        <div className="sidebarToggleRow">
          <button
            className="sidebarToggleButton"
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth <= 980) {
                setIsMobileNavOpen((current) => !current);
                return;
              }

              setIsSidebarCollapsed((current) => !current);
            }}
            aria-label={isMobileNavOpen ? "Close navigation" : isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isMobileNavOpen ? "Close navigation" : isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="sidebarToggleIcon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
        <div className="brand">
          <img
            className="logoImage"
            src="/logos/Lets-Start-Talking-LOGO-CMYK.png"
            alt="LST logo"
          />
          {!isSidebarCollapsed ? (
            <div>
              <div style={{ fontWeight: 900, letterSpacing: "-.02em" }}>LST International Projects Hub</div>
            </div>
          ) : null}
        </div>
        <div style={{ height: 14 }} />
        <nav className="nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className={`sidebarNavLink ${item.active ? "active" : ""}`}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              onClick={() => setIsMobileNavOpen(false)}
            >
              <span className="sidebarNavIcon">
                <SidebarIcon name={item.icon} />
              </span>
              {!isSidebarCollapsed ? <span>{item.label}</span> : null}
            </Link>
          ))}
          <a
            href="#"
            className="sidebarNavLink"
            aria-label="Logout"
            title="Logout"
            onClick={async (e) => {
              e.preventDefault();
              setIsMobileNavOpen(false);
              await clearSession();
              router.push("/login");
            }}
          >
            <span className="sidebarNavIcon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 4.5H6.5A2.5 2.5 0 0 0 4 7v10a2.5 2.5 0 0 0 2.5 2.5H9" />
                <path d="M14 16.5 19 12l-5-4.5" />
                <path d="M10 12h9" />
              </svg>
            </span>
            {!isSidebarCollapsed ? <span>Logout</span> : null}
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
        {showInstallHint ? (
          <div className="installHintBanner">
            <div>
              <div className="installHintTitle">Install LST Team Hub</div>
              <div className="small">{installHintText}</div>
            </div>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setShowInstallHint(false);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("lst-install-hint-dismissed", "true");
                }
              }}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {children}
      </main>
      <Toast />
    </div>
  );
}
