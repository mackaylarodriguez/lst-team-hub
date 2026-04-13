import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  getSession,
  signInWithPassword,
  signUpWithPassword,
  updatePassword,
} from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { TSHIRT_SIZE_OPTIONS } from "@/lib/tshirtSizes";

export default function Login() {
  const router = useRouter();
  const nextPath = typeof router.query.next === "string" && router.query.next.startsWith("/")
    ? router.query.next
    : "/trips";
  const isResetMode = router.query.mode === "reset";
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [tshirtSize, setTshirtSize] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");
  const [err, setErr] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const session = await getSession();
      if (!cancelled && session) {
        router.replace(nextPath);
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [nextPath, router]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setMessage("Enter a new password for this account.");
        setErr("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isResetMode) {
      setMode("forgot");
      setErr("");
      setMessage("Check your email for the reset link, or enter your email below to send another one.");
    }
  }, [isResetMode]);

  async function onSubmit(e){
    e.preventDefault();
    setErr("");
    setMessage("");
    setSubmitting(true);

    try {
      if (mode === "forgot") {
        const response = await fetch("/api/password-reset", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error || "Unable to send password reset email.");
        }

        setMessage("Password reset email sent.");
        return;
      }

      if (mode === "reset") {
        if (!resetPassword) {
          setErr("Enter a new password.");
          return;
        }

        if (resetPassword !== confirmResetPassword) {
          setErr("Passwords do not match.");
          return;
        }

        await updatePassword({ password: resetPassword });
        setMessage("Password updated. You can sign in now.");
        setMode("signin");
        setPassword("");
        setResetPassword("");
        setConfirmResetPassword("");
        return;
      }

      if (mode === "signup") {
        if (!String(firstName || "").trim() || !String(lastName || "").trim()) {
          setErr("Enter your first and last name.");
          return;
        }

        if (!String(tshirtSize || "").trim()) {
          setErr("Select a T-shirt size.");
          return;
        }

        if (!password) {
          setErr("Create a password to continue.");
          return;
        }

        if (password !== confirmPassword) {
          setErr("Passwords do not match.");
          return;
        }

        const session = await signUpWithPassword({
          email,
          password,
          firstName,
          lastName,
          tshirtSize,
        });
        if (session) {
          router.push(nextPath);
          return;
        }

        setMessage("Account created. Check your email if confirmation is required, then sign in.");
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      await signInWithPassword({ email, password });
      router.push(nextPath);
    } catch (error) {
      setErr(
        error.message || (mode === "signup" ? "Unable to create account." : "Unable to sign in.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ display:"grid", placeItems:"center", minHeight:"100vh" }}>
      <div className="card pad" style={{ width:"min(520px, 100%)" }}>
        <div className="row appPolishToolbar" style={{ marginBottom: 14 }}>
          <img
            className="logoImage"
            src="/logos/Lets-Start-Talking-LOGO-CMYK.png"
            alt="LST logo"
          />
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing:"-.02em" }}>LST International Projects Hub</div>
          </div>
        </div>

        <div className="card pad" style={{ boxShadow:"none", borderStyle:"dashed", marginBottom: 14, background:"rgba(255,255,255,.75)" }}>
          <div className="small">
            {mode === "signin"
              ? "Sign in with your LST app account."
              : mode === "forgot"
                ? "Enter your email and we'll send a password reset link from your custom email setup."
                : mode === "reset"
                  ? "Set a new password for your LST app account."
                  : "Create your LST app account here. If your email already matches a worker on a trip, we will link it automatically."}
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display:"grid", gap: 12 }}>
          {mode === "signup" ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>First Name</div>
                  <input
                    className="input"
                    value={firstName}
                    onChange={(e)=>setFirstName(e.target.value)}
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Last Name</div>
                  <input
                    className="input"
                    value={lastName}
                    onChange={(e)=>setLastName(e.target.value)}
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>T-shirt Size</div>
                <select
                  className="input"
                  value={tshirtSize}
                  onChange={(e)=>setTshirtSize(e.target.value)}
                >
                  <option value="">Select size</option>
                  {TSHIRT_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Email</div>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e)=>setEmail(e.target.value)}
                  placeholder="you@org.org"
                  autoComplete="email"
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Create Password</div>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Confirm Password</div>
                <input
                  className="input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e)=>setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Email</div>
                <input
                  className="input"
                  value={email}
                  onChange={(e)=>setEmail(e.target.value)}
                  placeholder="you@org.org"
                  disabled={mode === "reset"}
                />
              </div>
              {mode === "signin" ? (
                <div>
                  <div className="small" style={{ marginBottom: 6 }}>Password</div>
                  <input
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              ) : null}
            </>
          )}
          {mode === "reset" ? (
            <>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>New Password</div>
                <input className="input" type="password" value={resetPassword} onChange={(e)=>setResetPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <div className="small" style={{ marginBottom: 6 }}>Confirm Password</div>
                <input className="input" type="password" value={confirmResetPassword} onChange={(e)=>setConfirmResetPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </>
          ) : null}
          {message && <div className="small" style={{ color:"var(--success)" }}>{message}</div>}
          {err && <div className="small" style={{ color:"var(--danger)" }}>{err}</div>}
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button
              className={mode === "signin" ? "btn btnPrimary" : "btn"}
              type="submit"
              disabled={submitting}
              onClick={() => {
                setMode("signin");
                setErr("");
                setMessage("");
              }}
            >
              {submitting && mode === "signin" ? "Signing In..." : "Sign In"}
            </button>
            <button
              className={mode === "signup" ? "btn btnPrimary" : "btn"}
              type="submit"
              disabled={submitting}
              onClick={() => {
                setMode("signup");
                setErr("");
                setMessage("");
              }}
            >
              {submitting && mode === "signup" ? "Creating Account..." : "Create Account"}
            </button>
            <button
              className={mode === "forgot" ? "btn btnPrimary" : "btn"}
              type="submit"
              disabled={submitting}
              onClick={() => {
                setMode("forgot");
                setErr("");
                setMessage("");
              }}
            >
              {submitting && mode === "forgot" ? "Sending..." : "Forgot Password"}
            </button>
            {mode === "reset" ? (
              <button
                className="btn btnPrimary"
                type="submit"
                disabled={submitting}
                onClick={() => {
                  setMode("reset");
                  setErr("");
                  setMessage("");
                }}
              >
                {submitting ? "Updating Password..." : "Save New Password"}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
