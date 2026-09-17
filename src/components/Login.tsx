import { useState } from "react";
import { UserCog, Users, ArrowLeft, LogIn, AlertTriangle, Loader2 } from "lucide-react";
import { loginUser, type Session } from "@/lib/auth";

type Mode = "select" | "admin" | "coordinator";

const inputClass =
  "w-full rounded-lg border border-[var(--color-electric)]/20 bg-white px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-electric)] focus:ring-2 focus:ring-[var(--color-electric)]/20";
const labelClass =
  "mb-1 block font-display text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]";

export function Login({
  initialMode = "select",
  onLogin,
  onBack,
}: {
  initialMode?: Mode;
  onLogin: (s: Session) => void;
  onBack?: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setLoginInput("");
    setPassword("");
    setError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim() || !password) {
      setError("Please enter both username/email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await loginUser(loginInput, password);
      if (!res.success || !res.session) {
        setError(res.error || "Invalid username/email or password.");
        return;
      }

      // Check if logged in role matches the expected mode if explicitly selected
      if (mode === "admin" && res.session.user.role !== "admin") {
        setError("Access denied: You do not have Admin privileges.");
        return;
      }

      if (mode === "coordinator" && res.session.user.role !== "coordinator") {
        setError("Access denied: You do not have Coordinator privileges.");
        return;
      }

      onLogin(res.session);
    } catch (err) {
      console.error("Login failed:", err);
      setError("Failed to communicate with authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative flex min-h-screen w-full items-center justify-center bg-[var(--color-paper)] px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 80% 10%, rgba(47,155,255,0.12) 0%, rgba(245,248,255,0) 55%)",
        }}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--color-electric)]/15 bg-white p-8 shadow-xl">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.5em] text-[var(--color-flame)]">
            NEXTRON-2026
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-[var(--color-ink)]">
            {mode === "admin"
              ? "Admin Login"
              : mode === "coordinator"
              ? "Coordinator Login"
              : "Portal Login"}
          </h2>
          <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-[var(--color-electric)]" />
        </div>

        {mode === "select" && (
          <div className="mt-8 space-y-4">
            <button
              type="button"
              onClick={() => {
                setMode("admin");
                reset();
              }}
              className="group flex w-full items-center gap-4 rounded-xl border border-[var(--color-electric)]/20 bg-[var(--color-paper)] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--color-electric)] hover:shadow-lg"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-[var(--color-electric)] text-white">
                <UserCog className="size-6" />
              </span>
              <span>
                <span className="block font-display text-lg font-bold uppercase tracking-wide text-[var(--color-ink)]">
                  Admin
                </span>
                <span className="text-sm text-slate-500">
                  Manage all events &amp; coordinators
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("coordinator");
                reset();
              }}
              className="group flex w-full items-center gap-4 rounded-xl border border-[var(--color-electric)]/20 bg-[var(--color-paper)] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--color-flame)] hover:shadow-lg"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-[var(--color-flame)] text-white">
                <Users className="size-6" />
              </span>
              <span>
                <span className="block font-display text-lg font-bold uppercase tracking-wide text-[var(--color-ink)]">
                  Coordinator
                </span>
                <span className="text-sm text-slate-500">
                  Verify assigned event registrations
                </span>
              </span>
            </button>

            {onBack && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-[var(--color-electric)]"
                >
                  <ArrowLeft className="size-3.5" /> Back to Home
                </button>
              </div>
            )}
          </div>
        )}

        {mode !== "select" && (
          <form onSubmit={submit} className="mt-8 space-y-5">
            <button
              type="button"
              onClick={() => {
                setMode("select");
                reset();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-electric)] hover:underline"
            >
              <ArrowLeft className="size-3.5" /> Back to Role Selection
            </button>

            <div>
              <label className={labelClass} htmlFor="loginInput">
                Email or Username
              </label>
              <input
                id="loginInput"
                type="text"
                required
                autoComplete="username"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder={mode === "admin" ? "admin@nextron.com" : "coordinator email"}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--color-flame)]/30 bg-[var(--color-flame)]/10 px-3 py-2 text-sm font-medium text-[var(--color-flame)]">
                <AlertTriangle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-electric)] px-7 py-3 font-display text-sm font-semibold uppercase tracking-widest text-white transition-all hover:bg-[var(--color-electric-bright)] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Authenticating…
                </>
              ) : (
                <>
                  <LogIn className="size-4" /> Login
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

export default Login;
