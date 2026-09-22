import { useState } from "react";
import {
  CheckCircle2,
  RotateCcw,
  XCircle,
} from "lucide-react";

import {
  setMemberAttendance,
  type AttendanceStatus,
  type Member,
} from "@/lib/registrations";

export function AttendanceActions({
  member,
  token,
  onStatusUpdated,
}: {
  member: Member;
  token?: string;
  onStatusUpdated?: () => void | Promise<void>;
}) {
  const [loadingAction, setLoadingAction] =
    useState<AttendanceStatus | "CLEAR" | null>(
      null,
    );

  const [error, setError] = useState("");

  const current =
    member.attendanceStatus ?? null;

  const updateAttendance = async (
    status: AttendanceStatus | "CLEAR",
  ) => {
    if (!member.id) {
      setError(
        "Member ID unavailable. Refresh registrations and try again.",
      );
      return;
    }

    if (!token) {
      setError(
        "Session token missing. Please log in again.",
      );
      return;
    }

    setLoadingAction(status);
    setError("");

    try {
      const result =
        await setMemberAttendance(
          token,
          member.id,
          status,
        );

      if (!result.success) {
        setError(
          result.error ||
            "Failed to update attendance.",
        );
        return;
      }

      await onStatusUpdated?.();
    } catch (err) {
      console.error(
        "Attendance update failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update attendance.",
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const disabled = loadingAction !== null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          disabled={disabled || !member.id}
          onClick={() =>
            updateAttendance("PRESENT")
          }
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            current === "PRESENT"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          <CheckCircle2 className="size-3.5" />
          {loadingAction === "PRESENT"
            ? "Saving…"
            : "Present"}
        </button>

        <button
          type="button"
          disabled={disabled || !member.id}
          onClick={() =>
            updateAttendance("ABSENT")
          }
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            current === "ABSENT"
              ? "border-red-600 bg-red-600 text-white"
              : "border-red-200 bg-white text-red-600 hover:bg-red-50"
          }`}
        >
          <XCircle className="size-3.5" />
          {loadingAction === "ABSENT"
            ? "Saving…"
            : "Absent"}
        </button>

        {current && (
          <button
            type="button"
            disabled={disabled || !member.id}
            onClick={() =>
              updateAttendance("CLEAR")
            }
            title="Clear attendance"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" />
            {loadingAction === "CLEAR"
              ? "Clearing…"
              : "Clear"}
          </button>
        )}
      </div>

      {current && (
        <span
          className={`text-[10px] font-medium ${
            current === "PRESENT"
              ? "text-emerald-600"
              : "text-red-600"
          }`}
        >
          {current}
          {member.attendanceMarkedBy
            ? ` · ${member.attendanceMarkedBy}`
            : ""}
        </span>
      )}

      {error && (
        <span className="max-w-xs text-right text-[10px] text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}

export default AttendanceActions;
