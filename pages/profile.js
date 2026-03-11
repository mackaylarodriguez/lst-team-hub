import Shell from "@/components/Shell";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { requireSession } from "@/lib/auth";

export default function Profile() {
  const router = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const nextSession = await requireSession(router);
      if (!cancelled && nextSession) {
        setSession(nextSession);
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <Shell>
      <h1 className="h1">Profile</h1>
      <p className="p">Demo-only profile page.</p>

      <div style={{ height: 14 }} />
      <div className="card pad">
        <div className="small">Name</div>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{session?.name || "—"}</div>
        <div style={{ height: 10 }} />
        <div className="small">Email</div>
        <div style={{ fontWeight: 800 }}>{session?.email || "—"}</div>
        <div style={{ height: 10 }} />
        <div className="small">Role</div>
        <span className="badge">{session?.role || "—"}</span>
      </div>
    </Shell>
  );
}
