import { useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  IdCard,
  X,
} from "lucide-react";
import {
  isPaymentVerified,
  collectPayment,
  type Registration,
  type RegStatus,
} from "@/lib/registrations";

const statusMeta: Record<
  RegStatus,
  {
    label: string;
    icon: typeof Clock;
    className: string;
  }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-50 text-amber-600 border-amber-200",
  },
  accepted: {
    label: "Slot Booked",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-50 text-[var(--color-flame)] border-red-200",
  },
};

export function StatusBadge({
  status,
}: {
  status: RegStatus | string;
}) {
  const normalizedStatus = String(status).toLowerCase() as RegStatus;
  const meta = statusMeta[normalizedStatus] ?? statusMeta.pending;
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-xs font-semibold uppercase tracking-widest ${meta.className}`}
    >
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  );
}

export function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "green" | "amber" | "red" | "blue";
}) {
  const tones: Record<string, string> = {
    default: "border-[var(--color-electric)]/15 text-[var(--color-ink)]",
    green: "border-emerald-200 text-emerald-600 bg-emerald-50/50",
    amber: "border-amber-200 text-amber-600 bg-amber-50/50",
    red: "border-red-200 text-[var(--color-flame)] bg-red-50/50",
    blue: "border-[var(--color-electric)]/30 text-[var(--color-electric)] bg-[var(--color-electric)]/5",
  };

  return (
    <div className={`rounded-xl border bg-white p-4 ${tones[tone]}`}>
      <p className="font-display text-3xl font-bold tabular-nums">
        {value}
      </p>
      <p className="mt-1 font-display text-[11px] font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
        {label}
      </p>
    </div>
  );
}

export function PaymentActions({
  reg,
  onPaymentCollected,
  collectorName,
}: {
  reg: Registration;
  onPaymentCollected?: () => void;
  collectorName?: string;
}) {
  const [loading, setLoading] = useState<"CASH" | "ONLINE" | null>(null);
  const isPaid = isPaymentVerified(reg);

  const handleCollect = async (method: "CASH" | "ONLINE") => {
    const confirmMsg = `Confirm payment of ₹${reg.amount} received via ${method === "CASH" ? "Cash" : "Online"} for ${reg.teamName} (${reg.registration_number})?`;
    if (!window.confirm(confirmMsg)) return;

    setLoading(method);
    try {
      await collectPayment(reg.id, method, collectorName, reg.amount);
      alert(`Payment of ₹${reg.amount} recorded as ${method} for ${reg.registration_number}`);
      if (onPaymentCollected) {
        onPaymentCollected();
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setLoading(null);
    }
  };

  if (isPaid) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="size-4 text-emerald-600" />
        <span>Paid via {reg.paymentMethod || "PAID"}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => handleCollect("CASH")}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span>💵</span> {loading === "CASH" ? "Recording…" : "Cash"}
      </button>
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => handleCollect("ONLINE")}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-electric)] px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[var(--color-electric-bright)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span>📱</span> {loading === "ONLINE" ? "Recording…" : "Online"}
      </button>
    </div>
  );
}

export function RegistrationCard({
  reg,
  onPaymentCollected,
  collectorName,
}: {
  reg: Registration;
  onPaymentCollected?: () => void;
  collectorName?: string;
}) {
  const [zoom, setZoom] = useState<{
    src: string;
    label: string;
  } | null>(null);

  const isPaid = isPaymentVerified(reg);
  const payMethod = reg.paymentMethod || (isPaid ? "ONLINE" : "NOT COLLECTED");

  return (
    <div className="rounded-2xl border border-[var(--color-electric)]/15 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-electric)]/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-display text-lg font-bold text-[var(--color-ink)]">
              {reg.teamName}
            </h4>
            <span className="font-mono text-xs text-[var(--color-electric)]">
              {reg.registration_number}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {reg.event} · {reg.college}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={reg.status} />
          <span
            className={`text-xs font-medium ${
              isPaid ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            Payment {isPaid ? "Received" : "Pending"}
          </span>
        </div>
      </div>

      {/* Members */}
      <div className="mt-4 space-y-2">
        {reg.members.map((m, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-[var(--color-paper)] px-3 py-2 text-sm"
          >
            <span className="font-medium text-[var(--color-ink)]">
              {i + 1}. {m.name}
            </span>
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Phone className="size-3.5" />
              {m.phone}
            </span>
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Mail className="size-3.5" />
              {m.email}
            </span>
            {m.idCard ? (
              <button
                type="button"
                onClick={() =>
                  setZoom({
                    src: m.idCard,
                    label: `${m.name} — ID Card`,
                  })
                }
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--color-electric)]/25 px-2.5 py-1 text-xs font-semibold text-[var(--color-electric)] transition-colors hover:bg-[var(--color-electric)]/10"
              >
                <IdCard className="size-3.5" />
                View ID
              </button>
            ) : (
              <span className="ml-auto text-xs text-slate-400">
                No ID
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Footer — amount + payment info + collection buttons */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-electric)]/10 pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-xs uppercase tracking-widest text-slate-400">
            {isPaid ? "Amount Paid" : "Amount to Collect"}
          </span>
          <span className="font-display text-lg font-bold text-[var(--color-ink)]">
            ₹{reg.amount}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col items-end gap-0.5 text-xs text-slate-500">
            <span>
              Method: <span className="font-medium text-[var(--color-ink)]">{payMethod}</span>
            </span>
            {reg.utr && reg.utr !== "PAY_AT_EVENT" && (
              <span>
                UTR: <span className="font-mono font-medium text-[var(--color-ink)]">{reg.utr}</span>
              </span>
            )}
          </div>
          <PaymentActions
            reg={reg}
            onPaymentCollected={onPaymentCollected}
            collectorName={collectorName}
          />
        </div>
      </div>

      {/* ID card lightbox */}
      {zoom && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--color-ink)]/80 p-6 backdrop-blur-sm"
          onClick={() => setZoom(null)}
        >
          <div
            className="relative max-h-[85vh] max-w-lg overflow-hidden rounded-xl bg-white p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-[var(--color-ink)]">
                {zoom.label}
              </span>
              <button
                type="button"
                onClick={() => setZoom(null)}
                aria-label="Close"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-[var(--color-ink)]"
              >
                <X className="size-5" />
              </button>
            </div>
            <img
              src={zoom.src}
              alt={zoom.label}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function SearchResultCard({
  reg,
  onPaymentCollected,
  collectorName,
}: {
  reg: Registration;
  onPaymentCollected?: () => void;
  collectorName?: string;
}) {
  const [zoom, setZoom] = useState<{ src: string; label: string } | null>(null);
  const isPaid = isPaymentVerified(reg);
  const payMethod = reg.paymentMethod || (isPaid ? "ONLINE" : "NOT COLLECTED");

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-electric)]/15 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-electric)]/10 bg-[var(--color-paper)] px-5 py-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-slate-400">Registration Number</p>
          <p className="mt-0.5 font-mono text-xl font-bold tracking-wider text-[var(--color-electric)]">
            {reg.registration_number}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-xs uppercase tracking-widest text-slate-400">
            {isPaid ? "Amount Paid" : "Amount to Collect"}
          </p>
          <p className="mt-0.5 font-display text-2xl font-bold text-[var(--color-ink)]">₹{reg.amount}</p>
        </div>
      </div>

      {/* Details grid */}
      <dl className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-2">
        {[
          ["Event", reg.event],
          ["Team Name", reg.teamName],
          ["College", reg.college],
          ["Team Size", `${reg.members.length} member${reg.members.length !== 1 ? "s" : ""}`],
          ["Total Amount", `₹${reg.amount}`],
          ["Payment Status", isPaid ? "VERIFIED" : "PENDING"],
          ["Payment Method", payMethod],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-slate-100 py-1.5">
            <dt className="text-slate-500">{label}</dt>
            <dd
              className={`text-right font-medium ${
                label === "Payment Status" && !isPaid
                  ? "text-amber-600"
                  : label === "Payment Status" && isPaid
                  ? "text-emerald-600"
                  : "text-[var(--color-ink)]"
              }`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Members */}
      <div className="px-5 pb-4">
        <p className="mb-2 font-display text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
          Members
        </p>
        <div className="space-y-2">
          {reg.members.map((m, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-[var(--color-paper)] px-3 py-2 text-sm"
            >
              <span className="font-medium text-[var(--color-ink)]">
                {i + 1}. {m.name}
              </span>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Phone className="size-3.5" />
                {m.phone}
              </span>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Mail className="size-3.5" />
                {m.email}
              </span>
              {m.idCard ? (
                <button
                  type="button"
                  onClick={() => setZoom({ src: m.idCard, label: `${m.name} — ID Card` })}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--color-electric)]/25 px-2.5 py-1 text-xs font-semibold text-[var(--color-electric)] transition-colors hover:bg-[var(--color-electric)]/10"
                >
                  <IdCard className="size-3.5" />
                  View ID
                </button>
              ) : (
                <span className="ml-auto text-xs text-slate-400">No ID</span>
              )}
            </div>
          ))}
        </div>

        {/* Payment notice & actions */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="text-sm">
            {isPaid ? (
              <p className="font-medium text-emerald-600">✓ Payment has been collected and verified.</p>
            ) : (
              <p className="font-medium text-amber-600">
                ⚠ Payment not collected yet. Please collect ₹{reg.amount} at the desk.
              </p>
            )}
          </div>
          <PaymentActions
            reg={reg}
            onPaymentCollected={onPaymentCollected}
            collectorName={collectorName}
          />
        </div>
      </div>

      {/* ID Card Lightbox */}
      {zoom && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--color-ink)]/80 p-6 backdrop-blur-sm"
          onClick={() => setZoom(null)}
        >
          <div
            className="relative max-h-[85vh] max-w-lg overflow-hidden rounded-xl bg-white p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-[var(--color-ink)]">{zoom.label}</span>
              <button
                type="button"
                onClick={() => setZoom(null)}
                aria-label="Close"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-[var(--color-ink)]"
              >
                <X className="size-5" />
              </button>
            </div>
            <img src={zoom.src} alt={zoom.label} className="max-h-[70vh] w-full rounded-lg object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}