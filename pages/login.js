import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getSession, signInWithPassword } from "@/lib/auth";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const session = await getSession();
      if (!cancelled && session) {
        router.replace("/trips");
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e){
    e.preventDefault();
    setErr("");
    setSubmitting(true);

    try {
      await signInWithPassword({ email, password });
      router.push("/trips");
    } catch (error) {
      setErr(error.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ display:"grid", placeItems:"center", minHeight:"100vh" }}>
      <div className="card pad" style={{ width:"min(520px, 100%)" }}>
        <div className="row" style={{ marginBottom: 14 }}>
          <div className="logo" aria-hidden="true" />
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing:"-.02em" }}>Mission Team Hub</div>
            <div className="small">Centralize trip info, tasks, and documents.</div>
          </div>
        </div>

        <div className="card pad" style={{ boxShadow:"none", borderStyle:"dashed", marginBottom: 14, background:"rgba(255,255,255,.75)" }}>
          <div className="small">
            Sign in with a real Supabase user account for this project.
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display:"grid", gap: 12 }}>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Email</div>
            <input className="input" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@org.org" />
          </div>
          <div>
            <div className="small" style={{ marginBottom: 6 }}>Password</div>
            <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {err && <div className="small" style={{ color:"var(--danger)" }}>{err}</div>}
          <button className="btn btnPrimary" type="submit" disabled={submitting}>
            {submitting ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
