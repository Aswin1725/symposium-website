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
  isPaymentRejected,
  verifyPaymentStatus,
  type Registration,
  type RegStatus,
} from "@/lib/registrations";
import { getPaymentProofSignedUrl } from "@/lib/storage";
import AttendanceActions from "@/components/AttendanceActions";

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
  token,
  onStatusUpdated,
  onPaymentCollected,
  collectorName,
}: {
  reg: Registration;
  token?: string;
  onStatusUpdated?: () => void;
  onPaymentCollected?: () => void;
  collectorName?: string;
}) {
  const [pendingAction, setPendingAction] = useState<"ACCEPT" | "REJECT" | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const isVerified = isPaymentVerified(reg);
  const isRejected = isPaymentRejected(reg);

  const handleConfirm = async () => {
    if (!pendingAction) return;
    if (!token) {
      setActionError("Session token missing. Please log in again.");
      return;
    }

    setLoading(true);
    setActionError("");
    try {
      const res = await verifyPaymentStatus(token, reg.id, pendingAction);
      if (!res.success) {
        setActionError(res.error || "Failed to update status.");
        return;
      }
      setPendingAction(null);
      if (onStatusUpdated) {
        onStatusUpdated();
      } else if (onPaymentCollected) {
        onPaymentCollected();
      }
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {isVerified ? (
          <>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>Accepted {reg.verifiedBy ? `by ${reg.verifiedBy}` : ""}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActionError("");
                setPendingAction("REJECT");
              }}
              title="Reject payment"
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 font-display text-xs font-semibold uppercase tracking-wider text-red-600 shadow-sm transition-all hover:bg-red-50 active:scale-95"
            >
              <XCircle className="size-3.5" /> Reject
            </button>
          </>
        ) : isRejected ? (
          <>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
              <XCircle className="size-4 text-red-600" />
              <span>Rejected {reg.verifiedBy ? `by ${reg.verifiedBy}` : ""}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActionError("");
                setPendingAction("ACCEPT");
              }}
              title="Accept payment"
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
            >
              <CheckCircle2 className="size-3.5" /> Accept
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setActionError("");
                setPendingAction("ACCEPT");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
            >
              <CheckCircle2 className="size-3.5" /> Accept
            </button>
            <button
              type="button"
              onClick={() => {
                setActionError("");
                setPendingAction("REJECT");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3.5 py-1.5 font-display text-xs font-semibold uppercase tracking-wider text-red-600 shadow-sm transition-all hover:bg-red-50 active:scale-95"
            >
              <XCircle className="size-3.5" /> Reject
            </button>
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      {pendingAction && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--color-ink)]/70 p-4 backdrop-blur-sm"
          onClick={() => !loading && setPendingAction(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-display text-lg font-bold uppercase tracking-wide text-[var(--color-ink)]">
                Confirm {pendingAction === "ACCEPT" ? "Acceptance" : "Rejection"}
              </h3>
              <button
                type="button"
                disabled={loading}
                onClick={() => setPendingAction(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="my-4 space-y-2.5 text-sm">
              <p className="text-slate-600">
                Please verify the registration details before proceeding:
              </p>
              <div className="rounded-xl border border-slate-100 bg-[var(--color-paper)] p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Registration Number:</span>
                  <span className="font-mono font-bold text-[var(--color-electric)]">{reg.registration_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Team / Event:</span>
                  <span className="font-medium text-[var(--color-ink)]">{reg.teamName} ({reg.event})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-bold text-[var(--color-ink)]">₹{reg.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">UTR / Transaction ID:</span>
                  <span className="font-mono font-medium text-[var(--color-ink)]">{reg.utr || "PAY_AT_EVENT"}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                  <span className="text-slate-500">Action:</span>
                  <span className={pendingAction === "ACCEPT" ? "text-emerald-600" : "text-red-600"}>
                    {pendingAction === "ACCEPT" ? "ACCEPT (VERIFY PAYMENT)" : "REJECT (FAIL PAYMENT)"}
                  </span>
                </div>
              </div>

              {actionError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
                  {actionError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                disabled={loading}
                onClick={() => setPendingAction(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirm}
                className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm disabled:opacity-50 ${
                  pendingAction === "ACCEPT"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {loading ? "Processing…" : `Confirm ${pendingAction}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function RegistrationCard({
  reg,
  token,
  onStatusUpdated,
  onPaymentCollected,
  collectorName,
}: {
  reg: Registration;
  token?: string;
  onStatusUpdated?: () => void;
  onPaymentCollected?: () => void;
  collectorName?: string;
}) {
  const [zoom, setZoom] = useState<{
    src: string;
    label: string;
  } | null>(null);

  const isPaid = isPaymentVerified(reg);
  const isRejected = isPaymentRejected(reg);
  const payMethod = reg.paymentMethod?.split("|")[0]?.trim() || "UPI";

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
              isPaid
                ? "text-emerald-600"
                : isRejected
                ? "text-red-600"
                : "text-amber-600"
            }`}
          >
            {isPaid
              ? "Payment Verified"
              : isRejected
              ? "Payment Rejected"
              : "Payment Pending"}
          </span>
        </div>
      </div>

      {/* Members */}
      <div className="mt-4 space-y-2">
        {reg.members.map((m, i) => (
          <div
            key={m.id ?? i}
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

            <AttendanceActions
              member={m}
              token={token}
              onStatusUpdated={onStatusUpdated}
            />
          </div>
        ))}
      </div>

      {/* Footer — amount + payment info + collection buttons */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-electric)]/10 pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-xs uppercase tracking-widest text-slate-400">
            {isPaid ? "Amount Paid" : isRejected ? "Payment Rejected" : "Amount to Verify"}
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
            {(reg.paymentProofUrl || reg.paymentProofPath) && (
              <button
                type="button"
                onClick={async () => {
                  let url = reg.paymentProofUrl;
                  if (!url && reg.paymentProofPath) {
                    url = await getPaymentProofSignedUrl(reg.paymentProofPath, token);
                  }
                  if (url) {
                    setZoom({
                      src: url,
                      label: `Payment Proof — ${reg.teamName} (${reg.registration_number})`,
                    });
                  } else {
                    alert("Unable to generate secure signed URL for payment proof.");
                  }
                }}
                className="mt-0.5 inline-flex items-center text-[11px] font-semibold text-[var(--color-electric)] hover:underline"
              >
                View Payment Proof ↗
              </button>
            )}
          </div>
          <PaymentActions
            reg={reg}
            token={token}
            onStatusUpdated={onStatusUpdated}
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
  token,
  onStatusUpdated,
  onPaymentCollected,
  collectorName,
}: {
  reg: Registration;
  token?: string;
  onStatusUpdated?: () => void;
  onPaymentCollected?: () => void;
  collectorName?: string;
}) {
  const [zoom, setZoom] = useState<{ src: string; label: string } | null>(null);
  const isPaid = isPaymentVerified(reg);
  const isRejected = isPaymentRejected(reg);
  const payMethod = reg.paymentMethod?.split("|")[0]?.trim() || "UPI";

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
            {isPaid ? "Amount Paid" : isRejected ? "Payment Rejected" : "Amount to Collect"}
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
          ["Payment Status", isPaid ? "VERIFIED" : isRejected ? "REJECTED" : "PENDING"],
          ["Registration Status", reg.status ? reg.status.toUpperCase() : "PENDING"],
          ["Payment Method", payMethod],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-slate-100 py-1.5">
            <dt className="text-slate-500">{label}</dt>
            <dd
              className={`text-right font-medium ${
                label === "Payment Status" && isRejected
                  ? "text-red-600"
                  : label === "Payment Status" && !isPaid
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
              key={m.id ?? i}
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

              <AttendanceActions
                member={m}
                token={token}
                onStatusUpdated={onStatusUpdated}
              />
            </div>
          ))}
        </div>

        {/* Payment notice & actions */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="text-sm">
            {isPaid ? (
              <p className="font-medium text-emerald-600">✓ Payment has been verified.</p>
            ) : isRejected ? (
              <p className="font-medium text-red-600">✕ Registration has been rejected.</p>
            ) : (
              <p className="font-medium text-amber-600">
                ⚠ Payment pending coordinator verification.
              </p>
            )}
          </div>
          <PaymentActions
            reg={reg}
            token={token}
            onStatusUpdated={onStatusUpdated}
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