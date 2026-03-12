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

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo" aria-hidden="true" />
          <div>
            <div style={{ fontWeight: 900, letterSpacing: "-.02em" }}>LST International Projects Hub</div>
            <div className="small">LST • sample prototype</div>
          </div>
        </div>

        <div className="card pad" style={{ boxShadow: "none", borderStyle: "dashed", background: "rgba(255,255,255,.75)" }}>
          <div className="small">
            This is a <b>demo</b> with mock data. Use it to pitch the idea and validate workflows.
          </div>
        </div>

        <div style={{ height: 14 }} />
        <nav className="nav">
          <Link className={path.startsWith("/trips") ? "active" : ""} href="/trips">My Trips</Link>
          {canManageTrips && <Link className={path === "/admin" ? "active" : ""} href="/admin">My Tasks</Link>}
          {isStaffUser && <Link className={path === "/staff" ? "active" : ""} href="/staff">Participants</Link>}
          <Link className={path === "/profile" ? "active" : ""} href="/profile">Profile</Link>
          <a
            href="#"
            onClick={async (e) => {
              e.preventDefault();
              await clearSession();
              router.push("/login");
            }}
          >
            Logout
          </a>
        </nav>

        <div style={{ height: 14 }} />
        <div className="small">
          Signed in as <b>{session?.name || "—"}</b><br/>
          <span className="badge" style={{ marginTop: 8 }}>
            {session?.role || "unknown"}
          </span>
          {session?.isImpersonating && (
            <div style={{ marginTop: 8 }}>
              Viewing as <b>{session.email}</b>
            </div>
          )}
        </div>

        {isAdminUser && (
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
