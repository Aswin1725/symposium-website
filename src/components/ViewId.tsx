import { useEffect, useState } from "react";
import { Lock, Image as ImageIcon, Loader2 } from "lucide-react";
import { authenticateAdmin, authenticateCoordinator, Session } from "@/lib/auth";

export function ViewId() {
  const params = new URLSearchParams(window.location.search);
  const path = params.get("p");
  
  const [session, setSession] = useState<Session & { password?: string } | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Attempt to restore session from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem("view_id_auth");
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (authenticateAdmin(username, password)) {
      const s = { role: "admin" as const, password, username: "admin" };
      setSession(s);
      sessionStorage.setItem("view_id_auth", JSON.stringify(s));
    } else {
      const coord = authenticateCoordinator(username, password);
      if (coord) {
        const s = { ...coord, password, username: username.trim() };
        setSession(s);
        sessionStorage.setItem("view_id_auth", JSON.stringify(s));
      } else {
        setError("Invalid username or password");
      }
    }
  };

  const fetchImage = async () => {
    if (!session || !session.password || !path) return;
    setLoading(true);
    setLoadError("");
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const res = await fetch(`${supabaseUrl}/functions/v1/get-id-card-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          path,
          username: 'username' in session ? session.username : 'admin',
          password: session.password
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load ID card");
      }

      const data = await res.json();
      setImgUrl(data.url);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load ID card");
      // If unauthorized, clear session so they can re-login
      if (err instanceof Error && err.message.toLowerCase().includes("unauthorized")) {
        setSession(null);
        sessionStorage.removeItem("view_id_auth");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session && path && !imgUrl && !loading) {
      fetchImage();
    }
  }, [session, path]);

  if (!path) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-paper)] p-4 text-center">
        <div className="max-w-md rounded-2xl border border-[var(--color-electric)]/20 bg-white p-8">
          <ImageIcon className="mx-auto size-12 text-slate-300" />
          <h2 className="mt-4 font-display text-xl font-bold text-[var(--color-ink)]">No Path Provided</h2>
          <p className="mt-2 text-sm text-slate-500">The link is missing the ID card path parameter.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-paper)] p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl border border-[var(--color-electric)]/20 bg-white p-8"
        >
          <div className="mb-6 flex items-center justify-center">
            <div className="rounded-full bg-[var(--color-electric)]/10 p-3">
              <Lock className="size-6 text-[var(--color-electric)]" />
            </div>
          </div>
          
          <h2 className="mb-6 text-center font-display text-xl font-bold text-[var(--color-ink)]">
            Coordinator Login
          </h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-electric)]/20 bg-[var(--color-paper)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-electric)]"
                placeholder="e.g. project"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-electric)]/20 bg-[var(--color-paper)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-electric)]"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-[var(--color-electric)] px-4 py-3 font-display text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-[var(--color-electric)]/90"
            >
              Verify Identity
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-paper)] p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--color-electric)]/20 bg-white p-4 sm:p-8">
        <h2 className="mb-4 text-center font-display text-lg font-bold text-[var(--color-ink)]">
          ID Card Verification
        </h2>
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-[var(--color-electric)]" />
            <p className="mt-4 text-sm text-slate-500">Generating secure short-lived URL...</p>
          </div>
        )}

        {loadError && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-red-50 p-4">
              <Lock className="size-8 text-red-500" />
            </div>
            <p className="mt-4 font-semibold text-red-600">{loadError}</p>
            <button 
              onClick={fetchImage}
              className="mt-4 rounded-lg border border-[var(--color-electric)]/20 px-4 py-2 text-sm font-semibold text-[var(--color-electric)]"
            >
              Try Again
            </button>
          </div>
        )}

        {imgUrl && !loading && (
          <div className="flex flex-col items-center overflow-hidden rounded-xl bg-slate-100">
            <img 
              src={imgUrl} 
              alt="ID Card" 
              className="max-h-[70vh] w-auto object-contain"
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
