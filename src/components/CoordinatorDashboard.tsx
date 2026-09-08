import { useEffect, useState } from "react";
import { LogOut, Users, Inbox } from "lucide-react";
import {
  getRegistrationsByEvent,
  isPaymentVerified,
} from "@/lib/registrations";
import { RegistrationCard, StatTile } from "@/components/dashboard-ui";

export function CoordinatorDashboard({
  event,
  name,
  onLogout,
}: {
  event: string;
  name: string;
  onLogout: () => void;
}) {
  const [regs, setRegs] = useState<Awaited<ReturnType<typeof getRegistrationsByEvent>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRegistrationsByEvent(event)
      .then((data) => setRegs(data))
      .finally(() => setLoading(false));
  }, [event]);

  const counts = {
    total: regs.length,
    members: regs.reduce((s, r) => s + r.members.length, 0),
    accepted: regs.filter((r) => r.status === "accepted").length,
    pending: regs.filter((r) => r.status === "pending").length,
    rejected: regs.filter((r) => r.status === "rejected").length,
    payVerified: regs.filter((r) => isPaymentVerified(r)).length,
    payPending: regs.filter((r) => !isPaymentVerified(r)).length,
  };

  return (
    <section className="min-h-screen w-full bg-[var(--color-paper)] py-12">
      <div className="mx-auto w-full max-w-6xl px-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.4em] text-[var(--color-flame)]">
              <Users className="size-4" /> Coordinator · View Only
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-[var(--color-ink)] sm:text-4xl">
              {event}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{name}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-electric)]/25 bg-white px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)] transition-colors hover:border-[var(--color-flame)] hover:text-[var(--color-flame)]"
          >
            <LogOut className="size-4" /> Logout
          </button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile label="Registered Teams" value={counts.total} tone="blue" />
          <StatTile label="Total Members" value={counts.members} />
          <StatTile label="Accepted" value={counts.accepted} tone="green" />
          <StatTile label="Pending" value={counts.pending} tone="amber" />
          <StatTile label="Rejected" value={counts.rejected} tone="red" />
          <StatTile
            label="Payment Verified"
            value={counts.payVerified}
            tone="green"
          />
          <StatTile
            label="Payment Pending"
            value={counts.payPending}
            tone="amber"
          />
        </div>

        {/* View-only note */}
        <p className="mt-8 rounded-lg border border-[var(--color-electric)]/15 bg-white px-4 py-3 text-xs text-slate-500">
          You have view-only access. Only the Admin can accept or reject
          registrations.
        </p>

        {/* Registrations (no actions) */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading registrations…</p>
          ) : regs.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--color-electric)]/25 bg-white py-16 text-center">
              <Inbox className="size-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                No registrations for {event} yet.
              </p>
            </div>
          ) : (
            regs.map((r) => <RegistrationCard key={r.id} reg={r} />)
          )}
        </div>
      </div>
    </section>
  );
}

export default CoordinatorDashboard;
