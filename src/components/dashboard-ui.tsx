import { useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  IdCard,
  X,
  Check,
  Ban,
} from "lucide-react";
import {
  isPaymentVerified,
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
    label: "Accepted",
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
  /*
   * Supabase may return:
   *
   * PENDING
   * ACCEPTED
   * REJECTED
   *
   * while the frontend statusMeta uses:
   *
   * pending
   * accepted
   * rejected
   *
   * Normalize the value before accessing statusMeta.
   */
  const normalizedStatus = String(status).toLowerCase() as RegStatus;

  /*
   * Safety fallback.
   * If the database ever contains an unexpected status,
   * the whole React application will not crash.
   */
  const meta =
    statusMeta[normalizedStatus] ??
    statusMeta.pending;

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
    default:
      "border-[var(--color-electric)]/15 text-[var(--color-ink)]",

    green:
      "border-emerald-200 text-emerald-600 bg-emerald-50/50",

    amber:
      "border-amber-200 text-amber-600 bg-amber-50/50",

    red:
      "border-red-200 text-[var(--color-flame)] bg-red-50/50",

    blue:
      "border-[var(--color-electric)]/30 text-[var(--color-electric)] bg-[var(--color-electric)]/5",
  };

  return (
    <div
      className={`rounded-xl border bg-white p-4 ${tones[tone]}`}
    >
      <p className="font-display text-3xl font-bold tabular-nums">
        {value}
      </p>

      <p className="mt-1 font-display text-[11px] font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
        {label}
      </p>
    </div>
  );
}

export function RegistrationCard({
  reg,
  onAccept,
  onReject,
}: {
  reg: Registration;
  onAccept?: () => void;
  onReject?: () => void;
}) {
  const [zoom, setZoom] = useState<{
    src: string;
    label: string;
  } | null>(null);

  const canAct = Boolean(onAccept || onReject);

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
            className={`text-xs font-medium ${isPaymentVerified(reg)
                ? "text-emerald-600"
                : "text-amber-600"
              }`}
          >
            Payment{" "}
            {isPaymentVerified(reg)
              ? "Verified"
              : "Pending"}
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

      {/* Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-electric)]/10 pt-4">
        <span className="text-sm text-slate-500">
          UTR:{" "}
          <span className="font-mono font-medium text-[var(--color-ink)]">
            {reg.utr || "—"}
          </span>
        </span>

        {canAct && (
          <div className="flex gap-2">
            {/* Accept */}
            <button
              type="button"
              onClick={onAccept}
              disabled={reg.status === "accepted"}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 font-display text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="size-3.5" />
              Accept
            </button>

            {/* Reject */}
            <button
              type="button"
              onClick={onReject}
              disabled={reg.status === "rejected"}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-flame)] px-4 py-2 font-display text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Ban className="size-3.5" />
              Reject
            </button>
          </div>
        )}
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
            {/* Lightbox header */}
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

            {/* ID card image */}
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