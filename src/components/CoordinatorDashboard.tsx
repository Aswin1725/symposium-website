import { useEffect, useState, useCallback } from "react";
import { LogOut, Users, Inbox, Search, X, FileSpreadsheet, Layers } from "lucide-react";
import {
  fetchScopedRegistrations,
  isPaymentVerified,
  type Registration,
} from "@/lib/registrations";
import { RegistrationCard, SearchResultCard, StatTile } from "@/components/dashboard-ui";
import { exportEventToExcel } from "@/components/AdminDashboard";
import type { Session } from "@/lib/auth";

/* =========================================================
   COORDINATOR DASHBOARD
   ========================================================= */

export function CoordinatorDashboard({
  session,
  event: fallbackEvent,
  name: fallbackName,
  token: fallbackToken,
  onLogout,
}: {
  session?: Session;
  event?: string;
  name?: string;
  token?: string;
  onLogout: () => void;
}) {
  const token = session?.token || fallbackToken || "";
  const name = session?.user?.name || fallbackName || "Coordinator";
  const assignedEvents = session?.user?.assigned_events && session.user.assigned_events.length > 0
    ? session.user.assigned_events
    : (fallbackEvent ? [fallbackEvent] : []);

  const [selectedEvent, setSelectedEvent] = useState<string>(assignedEvents[0] || "");
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Registration | null | "notfound">(null);

  const fetchRegistrations = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchScopedRegistrations(token, selectedEvent || undefined);
      setRegs(data);
      // Update active search result if open
      setSearchResult((prev) => {
        if (!prev || prev === "notfound") return prev;
        const updated = data.find((r) => r.id === prev.id);
        return updated ?? prev;
      });
    } catch (err) {
      console.error("Failed to load registrations:", err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedEvent]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const stats = {
    total: regs.length,
    members: regs.reduce((s, r) => s + r.members.length, 0),
    payVerified: regs.filter((r) => isPaymentVerified(r)).length,
    payPending: regs.filter((r) => !isPaymentVerified(r)).length,
    expectedRevenue: regs.reduce((s, r) => s + (r.amount || 0), 0),
    collectedRevenue: regs
      .filter((r) => isPaymentVerified(r))
      .reduce((s, r) => s + (r.amount || 0), 0),
    pendingRevenue: regs
      .filter((r) => !isPaymentVerified(r))
      .reduce((s, r) => s + (r.amount || 0), 0),
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toUpperCase();
    if (!q) return;
    const found = regs.find((r) => r.registration_number.toUpperCase() === q);
    setSearchResult(found ?? "notfound");
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResult(null);
  };

  return (
    <section className="min-h-screen w-full bg-[var(--color-paper)] py-12">
      <div className="mx-auto w-full max-w-6xl px-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.4em] text-[var(--color-flame)]">
              <Users className="size-4" /> Coordinator Portal
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-[var(--color-ink)] sm:text-4xl">
              {selectedEvent || "Assigned Events"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{name} ({session?.user?.email})</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => exportEventToExcel(selectedEvent || "Assigned Events", regs)}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-electric)] px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-widest text-white shadow-sm transition-all hover:bg-[var(--color-electric-bright)]"
            >
              <FileSpreadsheet className="size-4" /> Export Excel
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-electric)]/25 bg-white px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)] transition-colors hover:border-[var(--color-flame)] hover:text-[var(--color-flame)]"
            >
              <LogOut className="size-4" /> Logout
            </button>
          </div>
        </div>

        {/* Assigned Events Switcher if more than one */}
        {assignedEvents.length > 1 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">
              <Layers className="size-3.5" /> Events:
            </span>
            {assignedEvents.map((ev) => (
              <button
                key={ev}
                type="button"
                onClick={() => setSelectedEvent(ev)}
                className={`rounded-lg px-3.5 py-1.5 font-display text-xs font-semibold uppercase tracking-wider transition-all ${
                  selectedEvent === ev
                    ? "bg-[var(--color-electric)] text-white shadow-sm"
                    : "border border-[var(--color-electric)]/20 bg-white text-[var(--color-ink)] hover:border-[var(--color-electric)]"
                }`}
              >
                {ev}
              </button>
            ))}
          </div>
        )}

        {/* Team & Member Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Registered Teams" value={stats.total} tone="blue" />
          <StatTile label="Total Members" value={stats.members} />
          <StatTile label="Payment Pending" value={stats.payPending} tone="amber" />
          <StatTile label="Accepted / Verified" value={stats.payVerified} tone="green" />
        </div>

        {/* Collection Summary Revenue */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Total Expected" value={`₹${stats.expectedRevenue}`} />
          <StatTile label="Verified Revenue" value={`₹${stats.collectedRevenue}`} tone="green" />
          <StatTile label="Pending Revenue" value={`₹${stats.pendingRevenue}`} tone="amber" />
        </div>

        {/* Search */}
        <div className="mt-8 rounded-2xl border border-[var(--color-electric)]/15 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Search className="size-5 text-[var(--color-electric)]" />
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)]">
              Search Registration
            </h3>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. NEX-571642"
                className="w-full rounded-lg border border-[var(--color-electric)]/25 bg-[var(--color-paper)] px-4 py-2.5 font-mono text-sm uppercase tracking-wider text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-electric)] focus:ring-2 focus:ring-[var(--color-electric)]/20"
              />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-electric)] px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-[var(--color-electric-bright)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search className="size-4" />
              Find
            </button>
            {searchResult !== null && (
              <button
                type="button"
                onClick={clearSearch}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-electric)]/25 bg-white px-3 py-2.5 text-sm text-slate-500 transition-colors hover:text-[var(--color-flame)]"
              >
                <X className="size-4" />
                Clear
              </button>
            )}
          </form>

          {searchResult === "notfound" && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              No registration found for "{searchQuery.trim().toUpperCase()}" in your assigned events.
            </p>
          )}

          {searchResult && searchResult !== "notfound" && (
            <SearchResultCard
              reg={searchResult}
              token={token}
              onStatusUpdated={fetchRegistrations}
              collectorName={name}
            />
          )}
        </div>

        {/* Registrations list */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-[var(--color-electric)]/15 bg-white py-16 text-center">
              <p className="text-sm text-slate-400">Loading registrations…</p>
            </div>
          ) : regs.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--color-electric)]/25 bg-white py-16 text-center">
              <Inbox className="size-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                No registrations for {selectedEvent || "assigned events"} yet.
              </p>
            </div>
          ) : (
            regs.map((r) => (
              <RegistrationCard
                key={r.id}
                reg={r}
                token={token}
                onStatusUpdated={fetchRegistrations}
                collectorName={name}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default CoordinatorDashboard;
