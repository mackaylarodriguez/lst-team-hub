import Link from "next/link";
import { useRouter } from "next/router";
import { clearSession, getSession } from "@/lib/auth";
import { useEffect, useMemo } from "react";

export default function Shell({ children }) {
  const router = useRouter();
  const session = useMemo(() => getSession(), []);
  const path = router.pathname;

  useEffect(() => {
    // client-only; just ensures session exists when using Shell
  }, []);

  const isAdmin = session?.role === "staff";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo" aria-hidden="true" />
          <div>
            <div style={{ fontWeight: 900, letterSpacing: "-.02em" }}>Mission Team Hub</div>
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
          {isAdmin && <Link className={path === "/admin" ? "active" : ""} href="/admin">Admin</Link>}
          <Link className={path === "/profile" ? "active" : ""} href="/profile">Profile</Link>
          <a href="#" onClick={(e)=>{e.preventDefault(); clearSession(); router.push("/login");}}>Logout</a>
        </nav>

        <div style={{ height: 14 }} />
        <div className="small">
          Signed in as <b>{session?.name || "—"}</b><br/>
          <span className="badge" style={{ marginTop: 8 }}>
            {session?.role || "unknown"}
          </span>
        </div>
      </aside>

      <main className="main">
        {children}
      </main>
    </div>
  );
}
