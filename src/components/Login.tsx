import { useState } from "react";
import { UserCog, Users, ArrowLeft, LogIn, AlertTriangle } from "lucide-react";
import {
  authenticateAdmin,
  authenticateCoordinator,
  type Session,
} from "@/lib/auth";

type Mode = "select" | "admin" | "coordinator";

const inputClass =
  "w-full rounded-lg border border-[var(--color-electric)]/20 bg-white px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-electric)] focus:ring-2 focus:ring-[var(--color-electric)]/20";
const labelClass =
  "mb-1 block font-display text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]";

export function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const [mode, setMode] = useState<Mode>("select");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setUsername("");
    setPassword("");
    setError("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "admin") {
      if (authenticateAdmin(username, password)) {
        onLogin({ role: "admin" });
      } else {
        setError("Invalid admin username or password.");
      }
    } else if (mode === "coordinator") {
      const session = authenticateCoordinator(username, password);
      if (session) {
        onLogin(session);
      } else {
        setError("Invalid coordinator username or password.");
      }
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
            Login
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
                  Manage all events &amp; registrations
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
                  View your event registrations
                </span>
              </span>
            </button>
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
              <ArrowLeft className="size-3.5" /> Back
            </button>

            <h3 className="font-display text-xl font-bold text-[var(--color-ink)]">
              {mode === "admin" ? "Admin Login" : "Coordinator Login"}
            </h3>

            <div>
              <label className={labelClass} htmlFor="username">
                Username
              </label>
              <input
                id="username"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-electric)] px-7 py-3 font-display text-sm font-semibold uppercase tracking-widest text-white transition-all hover:bg-[var(--color-electric-bright)]"
            >
              <LogIn className="size-4" /> Login
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

export default Login;
