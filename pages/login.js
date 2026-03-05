import { useRouter } from "next/router";
import { useState } from "react";
import { getUser } from "@/lib/sampleData";
import { setSession } from "@/lib/auth";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("mack@lst.org");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  function onSubmit(e){
    e.preventDefault();
    setErr("");
    const user = getUser(email);
    if(!user){
      setErr("Unknown email for this demo. Try mack@lst.org, leader@utaustin.edu, or participant@utaustin.edu");
      return;
    }
    setSession({ email: user.email, name: user.name, role: user.role });
    router.push("/trips");
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
            Demo logins: <br/>
            <span style={{ fontFamily:"ui-monospace", fontSize: 12 }}>mack@lst.org</span> •{" "}
            <span style={{ fontFamily:"ui-monospace", fontSize: 12 }}>leader@utaustin.edu</span> •{" "}
            <span style={{ fontFamily:"ui-monospace", fontSize: 12 }}>participant@utaustin.edu</span><br/>
            Password can be anything.
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
          <button className="btn btnPrimary" type="submit">Sign In</button>
        </form>
      </div>
    </div>
  );
}
