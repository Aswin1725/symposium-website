import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  LogOut,
  FileSpreadsheet,
  ShieldCheck,
  Inbox,
} from "lucide-react";

import {
  getAllRegistrations,
  setRegistrationStatus,
  isPaymentVerified,
  type RegStatus,
} from "@/lib/registrations";

import { COORDINATOR_ACCOUNTS } from "@/lib/auth";

import {
  RegistrationCard,
  StatTile,
} from "@/components/dashboard-ui";

const EVENT_NAMES = COORDINATOR_ACCOUNTS.map(
  (account) => account.event,
);

type StatusFilter = "all" | RegStatus;

/* =========================================================
   EXPORT REGISTRATIONS TO EXCEL
   ========================================================= */

function exportEventToExcel(
  event: string,
  eventRegistrations: Awaited<
    ReturnType<typeof getAllRegistrations>
  >,
) {
  try {
    console.log(
      "========================================",
    );

    console.log(
      "EXCEL EXPORT",
    );

    console.log(
      "Event:",
      event,
    );

    console.log(
      "Registrations received:",
      eventRegistrations.length,
    );

    console.log(
      "Registration data:",
      eventRegistrations,
    );

    console.log(
      "========================================",
    );

    /* -------------------------------------------------------
       CHECK DATA
    ------------------------------------------------------- */

    if (
      !eventRegistrations ||
      eventRegistrations.length === 0
    ) {
      alert(
        `No registrations found for ${event}.`,
      );

      return;
    }

    /* -------------------------------------------------------
       CREATE EXCEL ROWS
    ------------------------------------------------------- */

    const rows =
      eventRegistrations.flatMap(
        (r) => {
          /*
           * If a registration has members,
           * create one Excel row for every member.
           */

          if (
            r.members &&
            r.members.length > 0
          ) {
            const feePerHead =
              Math.round(r.amount / r.members.length);

            return r.members.map(
              (m, idx) => ({
                "Reg No":
                  r.registration_number,

                Event:
                  r.event,

                Team:
                  r.teamName,

                College:
                  r.college,

                "Member #":
                  idx + 1,

                "Member Name":
                  m.name,

                Contact:
                  m.phone,

                Email:
                  m.email,

                "ID Card File":
                  m.idCardName,

                UTR:
                  r.utr,

                "Fee (Per Head)":
                  feePerHead,

                "Total Amount":
                  r.amount,

                Payment:
                  isPaymentVerified(
                    r,
                  )
                    ? "Verified"
                    : "Pending",

                Status:
                  r.status,

                "Registered On":
                  new Date(
                    r.createdAt,
                  ).toLocaleString(),
              }),
            );
          }

          /*
           * If there are no member rows,
           * still create one registration row.
           */

          return [
            {
              "Reg No":
                r.registration_number,

              Event:
                r.event,

              Team:
                r.teamName,

              College:
                r.college,

              "Member #":
                0,

              "Member Name":
                "",

              Contact:
                "",

              Email:
                "",

              "ID Card File":
                "",

              UTR:
                r.utr,

              "Fee (Per Head)":
                r.amount,

              "Total Amount":
                r.amount,

              Payment:
                isPaymentVerified(
                  r,
                )
                  ? "Verified"
                  : "Pending",

              Status:
                r.status,

              "Registered On":
                new Date(
                  r.createdAt,
                ).toLocaleString(),
            },
          ];
        },
      );

    /* -------------------------------------------------------
       CHECK EXCEL ROWS
    ------------------------------------------------------- */

    if (rows.length === 0) {
      alert(
        `No data available for ${event}.`,
      );

      return;
    }

    console.log(
      "Excel rows:",
      rows,
    );

    /* -------------------------------------------------------
       CREATE WORKSHEET
    ------------------------------------------------------- */

    const ws =
      XLSX.utils.json_to_sheet(
        rows,
      );

    /* -------------------------------------------------------
       COLUMN WIDTHS
    ------------------------------------------------------- */

    ws["!cols"] = [
      { wch: 18 },
      { wch: 30 },
      { wch: 25 },
      { wch: 30 },
      { wch: 10 },
      { wch: 25 },
      { wch: 18 },
      { wch: 32 },
      { wch: 40 },
      { wch: 22 },
      { wch: 16 },
      { wch: 14 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
    ];

    /* -------------------------------------------------------
       CREATE WORKBOOK
    ------------------------------------------------------- */

    const wb =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      event
        .replace(
          /[\\/?*[\]:]/g,
          "",
        )
        .slice(0, 31) ||
      "Registrations",
    );

    /* -------------------------------------------------------
       DOWNLOAD
    ------------------------------------------------------- */

    const fileName =
      `NEXTRON-2026 ${event}.xlsx`;

    XLSX.writeFile(
      wb,
      fileName,
    );

    console.log(
      "Excel downloaded:",
      fileName,
    );

    alert(
      `${event} Excel downloaded successfully.`,
    );
  } catch (error) {
    console.error(
      "Excel export failed:",
      error,
    );

    alert(
      error instanceof Error
        ? error.message
        : "Failed to export Excel file.",
    );
  }
}

/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

export function AdminDashboard({
  onLogout,
}: {
  onLogout: () => void;
}) {
  const [
    registrations,
    setRegistrations,
  ] = useState<
    Awaited<
      ReturnType<typeof getAllRegistrations>
    >
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [eventFilter, setEventFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  /* =======================================================
     FETCH REGISTRATIONS
     ======================================================= */

  const fetchAll = async () => {
    try {
      setLoading(true);

      const data =
        await getAllRegistrations();

      console.log(
        "Dashboard registrations:",
        data,
      );

      setRegistrations(data);
    } catch (error) {
      console.error(
        "Failed to load registrations:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load registrations.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {
    fetchAll();
  }, []);

  /* =======================================================
     ACCEPT / REJECT
     ======================================================= */

  const act = async (
    id: string,
    status: RegStatus,
  ) => {
    if (updatingId !== null) {
      return;
    }

    try {
      setUpdatingId(id);

      console.log(
        "Updating registration:",
        id,
        "to:",
        status,
      );

      await setRegistrationStatus(
        id,
        status,
      );

      console.log(
        "Registration status updated successfully.",
      );

      const updated =
        await getAllRegistrations();

      setRegistrations(
        updated,
      );

      alert(
        status === "accepted"
          ? "Registration accepted successfully."
          : "Registration rejected successfully.",
      );
    } catch (error) {
      console.error(
        "Registration status update error:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update registration status.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* =======================================================
     FILTER
     ======================================================= */

  const visible =
    registrations.filter(
      (r) => {
        const eventMatches =
          eventFilter ===
          "all" ||
          r.event ===
          eventFilter;

        const statusMatches =
          statusFilter ===
          "all" ||
          r.status ===
          statusFilter;

        return (
          eventMatches &&
          statusMatches
        );
      },
    );

  /* =======================================================
     STATISTICS
     ======================================================= */

  const all =
    registrations;

  const counts = {
    total:
      all.length,

    pending:
      all.filter(
        (r) =>
          r.status ===
          "pending",
      ).length,

    accepted:
      all.filter(
        (r) =>
          r.status ===
          "accepted",
      ).length,

    rejected:
      all.filter(
        (r) =>
          r.status ===
          "rejected",
      ).length,

    members:
      all.reduce(
        (sum, r) =>
          sum +
          r.members.length,
        0,
      ),
  };

  /* =======================================================
     STATUS TABS
     ======================================================= */

  const statusTabs: {
    key: StatusFilter;
    label: string;
  }[] = [
      {
        key: "all",
        label: "All",
      },
      {
        key: "pending",
        label: "Pending",
      },
      {
        key: "accepted",
        label: "Accepted",
      },
      {
        key: "rejected",
        label: "Rejected",
      },
    ];

  /* =======================================================
     UI
     ======================================================= */

  return (
    <section className="min-h-screen w-full bg-[var(--color-paper)] py-12">
      <div className="mx-auto w-full max-w-6xl px-6">

        {/* HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.4em] text-[var(--color-flame)]">
              <ShieldCheck className="size-4" />

              Admin
            </p>

            <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-[var(--color-ink)] sm:text-4xl">
              Admin Dashboard
            </h2>
          </div>

          <button
            type="button"
            onClick={
              onLogout
            }
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-electric)]/25 bg-white px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)] transition-colors hover:border-[var(--color-flame)] hover:text-[var(--color-flame)]"
          >
            <LogOut className="size-4" />

            Logout
          </button>
        </div>

        {/* STATISTICS */}

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile
            label="Total Teams"
            value={
              counts.total
            }
            tone="blue"
          />

          <StatTile
            label="Total Members"
            value={
              counts.members
            }
          />

          <StatTile
            label="Pending"
            value={
              counts.pending
            }
            tone="amber"
          />

          <StatTile
            label="Accepted"
            value={
              counts.accepted
            }
            tone="green"
          />

          <StatTile
            label="Rejected"
            value={
              counts.rejected
            }
            tone="red"
          />
        </div>

        {/* =================================================
            EXPORT EXCEL
        ================================================= */}

        <div className="mt-10 rounded-2xl border border-[var(--color-electric)]/15 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-[var(--color-electric)]" />

            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)]">
              Export Excel (per event)
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {EVENT_NAMES.map(
              (ev) => {
                /*
                 * IMPORTANT:
                 *
                 * Filter HERE.
                 *
                 * The exact array used to calculate
                 * the number shown on the button is
                 * passed directly to the Excel function.
                 */

                const eventRegistrations =
                  all.filter(
                    (r) =>
                      String(
                        r.event,
                      )
                        .trim()
                        .toLowerCase() ===
                      String(
                        ev,
                      )
                        .trim()
                        .toLowerCase(),
                  );

                const n =
                  eventRegistrations.length;

                return (
                  <button
                    key={ev}
                    type="button"
                    onClick={() =>
                      exportEventToExcel(
                        ev,
                        eventRegistrations,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-electric)]/20 bg-[var(--color-paper)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-electric)] hover:text-[var(--color-electric)]"
                  >
                    <FileSpreadsheet className="size-3.5" />

                    {ev}

                    <span className="rounded-full bg-[var(--color-electric)]/10 px-1.5 text-[10px] text-[var(--color-electric)]">
                      {n}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        </div>

        {/* FILTERS */}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">

          <div className="flex flex-wrap gap-2">
            {statusTabs.map(
              (t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      t.key,
                    )
                  }
                  className={`rounded-full px-4 py-2 font-display text-xs font-semibold uppercase tracking-widest transition-colors ${statusFilter ===
                    t.key
                    ? "bg-[var(--color-electric)] text-white"
                    : "border border-[var(--color-electric)]/25 bg-white text-[var(--color-ink-soft)] hover:border-[var(--color-electric)]"
                    }`}
                >
                  {
                    t.label
                  }
                </button>
              ),
            )}
          </div>

          <select
            value={
              eventFilter
            }
            onChange={(e) =>
              setEventFilter(
                e.target.value,
              )
            }
            className="rounded-lg border border-[var(--color-electric)]/25 bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-electric)]"
          >
            <option value="all">
              All Events
            </option>

            {EVENT_NAMES.map(
              (ev) => (
                <option
                  key={ev}
                  value={ev}
                >
                  {ev}
                </option>
              ),
            )}
          </select>
        </div>

        {/* REGISTRATIONS */}

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-[var(--color-electric)]/15 bg-white py-16 text-center">
              <p className="text-sm text-slate-400">
                Loading registrations…
              </p>
            </div>
          ) : visible.length ===
            0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--color-electric)]/25 bg-white py-16 text-center">
              <Inbox className="size-10 text-slate-300" />

              <p className="mt-3 text-sm text-slate-500">
                No registrations
                to show for
                this filter.
              </p>
            </div>
          ) : (
            visible.map(
              (r) => (
                <div
                  key={
                    r.id
                  }
                  className={
                    updatingId ===
                      r.id
                      ? "pointer-events-none opacity-60 transition-opacity"
                      : ""
                  }
                >
                  <RegistrationCard
                    reg={r}
                    onAccept={() =>
                      act(
                        r.id,
                        "accepted",
                      )
                    }
                    onReject={() =>
                      act(
                        r.id,
                        "rejected",
                      )
                    }
                  />
                </div>
              ),
            )
          )}
        </div>
      </div>
    </section>
  );
}

export default AdminDashboard;