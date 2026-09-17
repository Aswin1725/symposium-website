import { useEffect, useState } from "react";
import { Lock, Image as ImageIcon, Loader2 } from "lucide-react";
import { loginUser, validateSession, type Session } from "@/lib/auth";
import { getIdCardSignedUrl, getPaymentProofSignedUrl } from "@/lib/storage";

export function ViewId() {
  const params = new URLSearchParams(window.location.search);
  const path = params.get("p");

  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Attempt to restore session
  useEffect(() => {
    async function checkAuth() {
      try {
        const s = await validateSession();
        if (s) {
          setSession(s);
        }
      } catch {}
    }
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await loginUser(username, password);
      if (res.success && res.session) {
        setSession(res.session);
      } else {
        setError(res.error || "Invalid username or password");
      }
    } catch {
      setError("Login failed");
    }
  };

  const fetchImage = async () => {
    if (!session || !path) return;
    setLoading(true);
    setLoadError("");
    try {
      const url = path.includes("payment-proof")
        ? await getPaymentProofSignedUrl(path, session.token)
        : await getIdCardSignedUrl(path, session.token);
      if (!url) {
        throw new Error("Failed to generate secure URL. The file may not exist or access is restricted.");
      }
      setImgUrl(url);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load image");
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
          <p className="mt-2 text-sm text-slate-500">The link is missing the file path parameter.</p>
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
            Coordinator / Admin Login
          </h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
                User ID
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-electric)]/20 bg-[var(--color-paper)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-electric)]"
                placeholder="e.g. admin or paper"
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
              className="mt-2 w-full rounded-xl bg-[var(--color-electric)] px-4 py-3 font-display text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-[var(--color-electric-bright)]"
            >
              Verify & View File
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
          Document Verification
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
              alt="Document"
              className="max-h-[70vh] w-auto object-contain"
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewId;
