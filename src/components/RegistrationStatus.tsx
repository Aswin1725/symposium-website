import { useState, type FormEvent } from "react";
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Ticket,
} from "lucide-react";
import { findRegistration, type Registration } from "@/lib/registrations";

type Result =
  | { kind: "idle" }
  | { kind: "notfound" }
  | { kind: "found"; reg: Registration };

const statusMeta = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-50 text-amber-600 border-amber-200",
    note: "Your payment is being verified by the admin. Please check back later.",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-600 border-emerald-200",
    note: "Your registration is confirmed. See you at NEXTRON-2026!",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-50 text-[var(--color-flame)] border-red-200",
    note: "Payment could not be verified. Please contact the coordinators.",
  },
} as const;

export function RegistrationStatus() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const [checking, setChecking] = useState(false);

  const check = async (e: FormEvent) => {
    e.preventDefault();
    setChecking(true);
    try {
      const reg = await findRegistration(query);
      setResult(reg ? { kind: "found", reg } : { kind: "notfound" });
    } catch {
      setResult({ kind: "notfound" });
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="relative min-h-screen w-full bg-white py-20">
      <div className="mx-auto w-full max-w-xl px-6">
        <div className="flex flex-col items-center text-center">
          <p className="font-mono text-xs uppercase tracking-[0.5em] text-[var(--color-flame)]">
            Track Your Entry
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold uppercase tracking-tight text-[var(--color-ink)] sm:text-5xl">
            Registration Status
          </h2>
          <div className="mt-4 h-1 w-16 rounded-full bg-[var(--color-electric)]" />
          <p className="mt-4 max-w-md text-sm text-slate-500">
            Enter the registration number you received after submitting your
            entry to check its current status.
          </p>
        </div>

        <form onSubmit={check} className="mt-10 flex gap-2">
          <div className="relative flex-1">
            <Ticket className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. NEX-482913"
              className="w-full rounded-full border border-[var(--color-electric)]/25 bg-white py-3 pl-9 pr-4 text-sm font-mono uppercase tracking-wider text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-electric)] focus:ring-2 focus:ring-[var(--color-electric)]/20"
            />
          </div>
          <button
            type="submit"
            disabled={checking}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-electric)] px-6 py-3 font-display text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-[var(--color-electric-bright)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search className="size-4" />
            {checking ? "Checking…" : "Check"}
          </button>
        </form>

        {result.kind === "notfound" && (
          <div className="mt-8 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-[var(--color-flame)]">
            <XCircle className="size-5 shrink-0" />
            No registration found for that number. Please check and try again.
          </div>
        )}

        {result.kind === "found" &&
          (() => {
            const meta = statusMeta[result.reg.status];
            const Icon = meta.icon;
            return (
              <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--color-electric)]/15 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--color-electric)]/10 bg-[var(--color-paper)] px-6 py-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-slate-400">
                      Registration No.
                    </p>
                    <p className="font-mono text-lg font-bold tracking-wider text-[var(--color-electric)]">
                      {result.reg.registration_number}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-widest ${meta.className}`}
                  >
                    <Icon className="size-4" />
                    {meta.label}
                  </span>
                </div>
                <dl className="grid gap-3 px-6 py-5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Event</dt>
                    <dd className="text-right font-medium text-[var(--color-ink)]">
                      {result.reg.event}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Team</dt>
                    <dd className="text-right font-medium text-[var(--color-ink)]">
                      {result.reg.teamName}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">College</dt>
                    <dd className="text-right font-medium text-[var(--color-ink)]">
                      {result.reg.college}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Members</dt>
                    <dd className="text-right font-medium text-[var(--color-ink)]">
                      {result.reg.members.length}
                    </dd>
                  </div>
                </dl>
                <p className="border-t border-[var(--color-electric)]/10 bg-[var(--color-paper)] px-6 py-3 text-xs text-slate-500">
                  {meta.note}
                </p>
              </div>
            );
          })()}
      </div>
    </section>
  );
}

export default RegistrationStatus;
