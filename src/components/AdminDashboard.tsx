import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  LogOut,
  FileSpreadsheet,
  ShieldCheck,
  Inbox,
  Search,
  X,
} from "lucide-react";

import {
  getAllRegistrations,
  isPaymentVerified,
  type Registration,
} from "@/lib/registrations";

import { COORDINATOR_ACCOUNTS } from "@/lib/auth";

import {
  RegistrationCard,
  SearchResultCard,
  StatTile,
} from "@/components/dashboard-ui";

const EVENT_NAMES = COORDINATOR_ACCOUNTS.map(
  (account) => account.event,
);

/* =========================================================
   EXPORT REGISTRATIONS TO EXCEL
   One row per registration (not per member).
   ========================================================= */

function exportEventToExcel(
  event: string,
  eventRegistrations: Registration[],
) {
  try {
    if (!eventRegistrations || eventRegistrations.length === 0) {
      alert(`No registrations found for ${event}.`);
      return;
    }

    const rows = eventRegistrations.map((r) => {
      const payMethod =
        (r as any).paymentMethod || (r.utr && r.utr !== "PAY_AT_EVENT" ? "ONLINE" : "NOT COLLECTED");

      const row: Record<string, string | number> = {
        "Registration Number": r.registration_number,
        "Team Name": r.teamName,
        "College Name": r.college,
        "Team Size": r.members.length,
        "Total Amount": r.amount,
        "Payment Status": isPaymentVerified(r) ? "VERIFIED" : "PENDING",
        "Payment Method": payMethod,
        "Payment Collected Date/Time": (r as any).paymentCollectedAt || "",
        "Transaction ID / UTR": (r.utr && r.utr !== "PAY_AT_EVENT") ? r.utr : "",
        "Registration Date/Time": new Date(r.createdAt).toLocaleString("en-IN"),
      };

      // Add members
      for (let i = 0; i < 4; i++) {
        const m = r.members[i];
        row[`Member ${i + 1} Name`] = m ? m.name : "";
        row[`Member ${i + 1} Phone`] = m ? m.phone : "";
        row[`Member ${i + 1} Email`] = m ? m.email : "";
        row[`Member ${i + 1} ID Card`] = m ? (m.idCardName || "ID Not Uploaded") : "";
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: [
        "Registration Number",
        "Team Name",
        "College Name",
        "Team Size",
        "Total Amount",
        "Payment Status",
        "Payment Method",
        "Payment Collected Date/Time",
        "Transaction ID / UTR",
        "Member 1 Name", "Member 1 Phone", "Member 1 Email", "Member 1 ID Card",
        "Member 2 Name", "Member 2 Phone", "Member 2 Email", "Member 2 ID Card",
        "Member 3 Name", "Member 3 Phone", "Member 3 Email", "Member 3 ID Card",
        "Member 4 Name", "Member 4 Phone", "Member 4 Email", "Member 4 ID Card",
        "Registration Date/Time",
      ],
    });

    ws["!cols"] = [
      { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 10 },
      { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 25 }, { wch: 22 }, { wch: 25 },
      { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 30 },
      { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 30 },
      { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 30 },
      { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 30 },
      { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      event.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Registrations",
    );

    const fileName = `NEXTRON-2026 ${event}.xlsx`;
    XLSX.writeFile(wb, fileName);
    alert(`${event} Excel downloaded successfully.`);
  } catch (error) {
    console.error("Excel export failed:", error);
    alert(error instanceof Error ? error.message : "Failed to export Excel file.");
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
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState("all");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Registration | null | "notfound">(null);
  const [searching, setSearching] = useState(false);

  /* =======================================================
     FETCH REGISTRATIONS
     ======================================================= */

  const fetchAll = async () => {
    try {
      setLoading(true);
      const data = await getAllRegistrations();
      setRegistrations(data);
      setSearchResult((prev) => {
        if (!prev || prev === "notfound") return prev;
        const updated = data.find((r) => r.id === prev.id);
        return updated ?? prev;
      });
    } catch (error) {
      console.error("Failed to load registrations:", error);
      alert(error instanceof Error ? error.message : "Failed to load registrations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  /* =======================================================
     SEARCH
     ======================================================= */

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toUpperCase();
    if (!q) return;
    setSearching(true);
    const found = registrations.find(
      (r) => r.registration_number.toUpperCase() === q,
    );
    setSearchResult(found ?? "notfound");
    setSearching(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResult(null);
  };

  /* =======================================================
     FILTER
     ======================================================= */

  const visible = registrations.filter((r) => {
    return eventFilter === "all" || r.event === eventFilter;
  });

  /* =======================================================
     STATISTICS
     ======================================================= */

  const all = registrations;
  const counts = {
    total: all.length,
    members: all.reduce((sum, r) => sum + r.members.length, 0),
    payPending: all.filter((r) => !isPaymentVerified(r)).length,
    payVerified: all.filter((r) => isPaymentVerified(r)).length,
    expectedRevenue: all.reduce((sum, r) => sum + (r.amount || 0), 0),
    collectedRevenue: all
      .filter((r) => isPaymentVerified(r))
      .reduce((sum, r) => sum + (r.amount || 0), 0),
    pendingRevenue: all
      .filter((r) => !isPaymentVerified(r))
      .reduce((sum, r) => sum + (r.amount || 0), 0),
    cashRevenue: all
      .filter((r) => isPaymentVerified(r) && r.paymentMethod?.toUpperCase() === "CASH")
      .reduce((sum, r) => sum + (r.amount || 0), 0),
    onlineRevenue: all
      .filter((r) => isPaymentVerified(r) && r.paymentMethod?.toUpperCase() !== "CASH")
      .reduce((sum, r) => sum + (r.amount || 0), 0),
  };

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
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-electric)]/25 bg-white px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)] transition-colors hover:border-[var(--color-flame)] hover:text-[var(--color-flame)]"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>

        {/* STATISTICS */}

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total Teams" value={counts.total} tone="blue" />
          <StatTile label="Total Members" value={counts.members} />
          <StatTile label="Payment Pending" value={counts.payPending} tone="amber" />
          <StatTile label="Payment Collected" value={counts.payVerified} tone="green" />
        </div>

        {/* Collection Summary Revenue */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile label="Total Expected" value={`₹${counts.expectedRevenue}`} />
          <StatTile label="Total Collected" value={`₹${counts.collectedRevenue}`} tone="green" />
          <StatTile label="Pending Revenue" value={`₹${counts.pendingRevenue}`} tone="amber" />
          <StatTile label="Cash Collected" value={`₹${counts.cashRevenue}`} tone="green" />
          <StatTile label="Online Collected" value={`₹${counts.onlineRevenue}`} tone="blue" />
        </div>

        {/* =================================================
            SEARCH BY REGISTRATION NUMBER
        ================================================= */}

        <div className="mt-10 rounded-2xl border border-[var(--color-electric)]/15 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Search className="size-5 text-[var(--color-electric)]" />
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)]">
              Search by Registration Number
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
              disabled={searching || !searchQuery.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-electric)] px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-[var(--color-electric-bright)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search className="size-4" />
              Search
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
              No registration found for "{searchQuery.trim().toUpperCase()}". Please check and try again.
            </p>
          )}

          {searchResult && searchResult !== "notfound" && (
            <SearchResultCard
              reg={searchResult}
              onPaymentCollected={fetchAll}
              collectorName="ADMIN"
            />
          )}
        </div>

        {/* =================================================
            EXPORT EXCEL
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-[var(--color-electric)]/15 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-[var(--color-electric)]" />
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)]">
              Export Excel (per event)
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {EVENT_NAMES.map((ev) => {
              const eventRegistrations = all.filter(
                (r) => String(r.event).trim().toLowerCase() === String(ev).trim().toLowerCase(),
              );
              const n = eventRegistrations.length;

              return (
                <button
                  key={ev}
                  type="button"
                  onClick={() => exportEventToExcel(ev, eventRegistrations)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-electric)]/20 bg-[var(--color-paper)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-electric)] hover:text-[var(--color-electric)]"
                >
                  <FileSpreadsheet className="size-3.5" />
                  {ev}
                  <span className="rounded-full bg-[var(--color-electric)]/10 px-1.5 text-[10px] text-[var(--color-electric)]">
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FILTERS */}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="font-display text-sm font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
            All Registrations
          </p>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-electric)]/25 bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-electric)]"
          >
            <option value="all">All Events</option>
            {EVENT_NAMES.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
        </div>

        {/* REGISTRATIONS */}

        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-[var(--color-electric)]/15 bg-white py-16 text-center">
              <p className="text-sm text-slate-400">Loading registrations…</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--color-electric)]/25 bg-white py-16 text-center">
              <Inbox className="size-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">No registrations to show for this filter.</p>
            </div>
          ) : (
            visible.map((r) => (
              <div key={r.id}>
                <RegistrationCard
                  reg={r}
                  onPaymentCollected={fetchAll}
                  collectorName="ADMIN"
                />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default AdminDashboard;