import { useState, type FormEvent } from "react";
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Ticket,
  CalendarDays,
} from "lucide-react";
import { findRegistration, isPaymentVerified, isPaymentRejected, type Registration } from "@/lib/registrations";

const TECHNICAL_EVENTS = [
  "Paper Presentation",
  "Project Expo",
  "Code Debugging",
  "Tech Quiz",
  "Logo Design",
  "Ideathon",
  "Circuitrix",
  "Web Design",
  "Electro Charades",
];

function getEventDate(eventName: string): string {
  const isTech = TECHNICAL_EVENTS.some((t) => t.toLowerCase() === eventName.toLowerCase());
  return isTech ? "23rd September 2026 (Technical)" : "24th September 2026 (Non-Technical)";
}

type Result =
  | { kind: "idle" }
  | { kind: "notfound" }
  | { kind: "found"; reg: Registration };

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
            entry to check your registration and payment status.
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
            const isPaid = isPaymentVerified(result.reg);
            const isRejected = isPaymentRejected(result.reg);

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
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-widest text-emerald-600">
                      <CheckCircle2 className="size-4" />
                      Slot Booked
                    </span>
                  ) : isRejected ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-widest text-red-600">
                      <XCircle className="size-4" />
                      Rejected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-widest text-amber-600">
                      <Clock className="size-4" />
                      Pending Verification
                    </span>
                  )}
                </div>
                <dl className="grid gap-3 px-6 py-5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Event</dt>
                    <dd className="text-right font-medium text-[var(--color-ink)]">
                      {result.reg.event}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <dt className="text-slate-500">Event Date</dt>
                    <dd className="inline-flex items-center gap-1 font-semibold text-[var(--color-electric)]">
                      <CalendarDays className="size-3.5" />
                      {getEventDate(result.reg.event)}
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
                  <div className="flex justify-between items-center gap-4 border-t border-slate-100 pt-3">
                    <dt className="text-slate-500 font-medium">Total Amount</dt>
                    <dd className="text-right font-display text-base font-bold text-[var(--color-ink)]">
                      ₹{result.reg.amount}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <dt className="text-slate-500 font-medium">Payment Status</dt>
                    <dd className="text-right">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                          <CheckCircle2 className="size-4" />
                          Payment Verified
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                          <XCircle className="size-4" />
                          Payment Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                          <Clock className="size-4" />
                          Pending Verification
                        </span>
                      )}
                    </dd>
                  </div>

                </dl>
                <div
                  className={`border-t px-6 py-3.5 text-xs font-medium ${
                    isPaid
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                      : isRejected
                      ? "border-red-100 bg-red-50 text-red-700"
                      : "border-amber-100 bg-amber-50 text-amber-700"
                  }`}
                >
                  {isPaid ? (
                    <p>✓ Payment verified. Your slot is booked and confirmed! We look forward to seeing you at NEXTRON-2026.</p>
                  ) : isRejected ? (
                    <p>✕ Payment verification failed or registration was rejected. If you have questions, please reach out to the coordinator desk.</p>
                  ) : (
                    <p>🕒 Your payment proof and registration details have been submitted and are pending coordinator verification.</p>
                  )}
                </div>
              </div>
            );
          })()}
      </div>
    </section>
  );
}

export default RegistrationStatus;

