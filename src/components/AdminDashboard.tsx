import { useEffect, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  LogOut,
  FileSpreadsheet,
  ShieldCheck,
  Inbox,
  Search,
  X,
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Power,
  Layers,
  Key,
  Mail,
  User,
  Check,
  Award,
  RefreshCw,
} from "lucide-react";

import {
  fetchScopedRegistrations,
  fetchParticipationCertificateCandidates,
  adminManageCoordinators,
  isPaymentVerified,
  isPaymentRejected,
  type Registration,
  type CoordinatorRecord,
  type ParticipationCertificateCandidate,
} from "@/lib/registrations";

import { ALL_EVENTS, type Session } from "@/lib/auth";

import {
  RegistrationCard,
  SearchResultCard,
  StatTile,
} from "@/components/dashboard-ui";

const EVENT_NAMES = ALL_EVENTS;

/* =========================================================
   EXPORT REGISTRATIONS TO EXCEL
   ========================================================= */

export function exportEventToExcel(
  event: string,
  eventRegistrations: Registration[],
) {
  try {
    if (!eventRegistrations || eventRegistrations.length === 0) {
      alert(`No registrations found for ${event}.`);
      return;
    }

    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://symposium-website-steel.vercel.app";

    const rows = eventRegistrations.map((r) => {
      const rawMethod = (r as any).paymentMethod || "";
      const payMethod = rawMethod.includes("|")
        ? rawMethod.split("|")[0].trim()
        : (rawMethod && rawMethod !== "NOT COLLECTED" ? rawMethod : "UPI");

      const proofUrl = r.paymentProofPath
        ? `${baseUrl}/view-id?p=${encodeURIComponent(r.paymentProofPath)}`
        : (r.paymentProofUrl ? r.paymentProofUrl : "No Proof Uploaded");

      const isVerified = isPaymentVerified(r);
      const isRejected = isPaymentRejected(r);
      const payStatus = isVerified ? "VERIFIED" : isRejected ? "REJECTED" : "PENDING";
      const regStatus = r.status === "accepted" ? "ACCEPTED" : r.status === "rejected" ? "REJECTED" : "PENDING";

      const row: Record<string, string | number> = {
        "Registration Number": r.registration_number,
        "Event Name": r.event || event,
        "Team Name": r.teamName,
        "College Name": r.college,
        "Team Size": r.members.length,
        "Total Amount": r.amount,
        "Payment Status": payStatus,
        "Registration Status": regStatus,
        "Payment Method": payMethod,
        "Payment Proof": proofUrl,
        "Verified At": r.verifiedAt ? new Date(r.verifiedAt).toLocaleString("en-IN") : "",
        "Verified By": r.verifiedBy || "",
        "Transaction ID / UTR": (r.utr && r.utr !== "PAY_AT_EVENT") ? r.utr : "",
        "Registration Date/Time": new Date(r.createdAt).toLocaleString("en-IN"),
      };

      for (let i = 0; i < 4; i++) {
        const m = r.members[i];
        row[`Member ${i + 1} Name`] = m ? m.name : "";
        row[`Member ${i + 1} Phone`] = m ? m.phone : "";
        row[`Member ${i + 1} Email`] = m ? m.email : "";
        row[`Member ${i + 1} ID Card`] = m?.idCardPath
          ? `${baseUrl}/view-id?p=${encodeURIComponent(m.idCardPath)}`
          : (m?.idCardName || "ID Not Uploaded");
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: [
        "Registration Number",
        "Event Name",
        "Team Name",
        "College Name",
        "Team Size",
        "Total Amount",
        "Payment Status",
        "Registration Status",
        "Payment Method",
        "Payment Proof",
        "Verified At",
        "Verified By",
        "Transaction ID / UTR",
        "Member 1 Name", "Member 1 Phone", "Member 1 Email", "Member 1 ID Card",
        "Member 2 Name", "Member 2 Phone", "Member 2 Email", "Member 2 ID Card",
        "Member 3 Name", "Member 3 Phone", "Member 3 Email", "Member 3 ID Card",
        "Member 4 Name", "Member 4 Phone", "Member 4 Email", "Member 4 ID Card",
        "Registration Date/Time",
      ],
    });

    ws["!cols"] = [
      { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 10 },
      { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 45 }, { wch: 22 }, { wch: 20 }, { wch: 22 },
      { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 45 },
      { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 45 },
      { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 45 },
      { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 45 },
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

export function exportAllToExcel(allRegistrations: Registration[]) {
  try {
    if (!allRegistrations || allRegistrations.length === 0) {
      alert("No registrations available to export.");
      return;
    }

    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://symposium-website-steel.vercel.app";

    const rows = allRegistrations.map((r) => {
      const rawMethod = (r as any).paymentMethod || "";
      const payMethod = rawMethod.includes("|")
        ? rawMethod.split("|")[0].trim()
        : (rawMethod && rawMethod !== "NOT COLLECTED" ? rawMethod : "UPI");

      const proofUrl = r.paymentProofPath
        ? `${baseUrl}/view-id?p=${encodeURIComponent(r.paymentProofPath)}`
        : (r.paymentProofUrl ? r.paymentProofUrl : "No Proof Uploaded");

      const isVerified = isPaymentVerified(r);
      const isRejected = isPaymentRejected(r);
      const payStatus = isVerified ? "VERIFIED" : isRejected ? "REJECTED" : "PENDING";
      const regStatus = r.status === "accepted" ? "ACCEPTED" : r.status === "rejected" ? "REJECTED" : "PENDING";

      const row: Record<string, string | number> = {
        "Registration Number": r.registration_number,
        "Event Name": r.event || "",
        "Team Name": r.teamName,
        "College Name": r.college,
        "Team Size": r.members.length,
        "Total Amount": r.amount,
        "Payment Status": payStatus,
        "Registration Status": regStatus,
        "Payment Method": payMethod,
        "Payment Proof": proofUrl,
        "Verified At": r.verifiedAt ? new Date(r.verifiedAt).toLocaleString("en-IN") : "",
        "Verified By": r.verifiedBy || "",
        "Transaction ID / UTR": (r.utr && r.utr !== "PAY_AT_EVENT") ? r.utr : "",
        "Registration Date/Time": new Date(r.createdAt).toLocaleString("en-IN"),
      };

      for (let i = 0; i < 4; i++) {
        const m = r.members[i];
        row[`Member ${i + 1} Name`] = m ? m.name : "";
        row[`Member ${i + 1} Phone`] = m ? m.phone : "";
        row[`Member ${i + 1} Email`] = m ? m.email : "";
        row[`Member ${i + 1} ID Card`] = m?.idCardPath
          ? `${baseUrl}/view-id?p=${encodeURIComponent(m.idCardPath)}`
          : (m?.idCardName || "ID Not Uploaded");
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: [
        "Registration Number",
        "Event Name",
        "Team Name",
        "College Name",
        "Team Size",
        "Total Amount",
        "Payment Status",
        "Registration Status",
        "Payment Method",
        "Payment Proof",
        "Verified At",
        "Verified By",
        "Transaction ID / UTR",
        "Member 1 Name", "Member 1 Phone", "Member 1 Email", "Member 1 ID Card",
        "Member 2 Name", "Member 2 Phone", "Member 2 Email", "Member 2 ID Card",
        "Member 3 Name", "Member 3 Phone", "Member 3 Email", "Member 3 ID Card",
        "Member 4 Name", "Member 4 Phone", "Member 4 Email", "Member 4 ID Card",
        "Registration Date/Time",
      ],
    });

    ws["!cols"] = [
      { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 10 },
      { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 45 }, { wch: 22 }, { wch: 20 }, { wch: 22 },
      { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 45 },
      { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 45 },
      { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 45 },
      { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 45 },
      { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All Registrations");

    const fileName = `NEXTRON-2026 All Registrations.xlsx`;
    XLSX.writeFile(wb, fileName);
    alert("All Registrations Excel downloaded successfully.");
  } catch (error) {
    console.error("All Excel export failed:", error);
    alert(error instanceof Error ? error.message : "Failed to export Excel file.");
  }
}

/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

type AdminTab =
  | "registrations"
  | "certificates"
  | "coordinators";

export function AdminDashboard({
  session,
  token: fallbackToken,
  initialTab = "registrations",
  onLogout,
}: {
  session?: Session;
  token?: string;
  initialTab?: AdminTab;
  onLogout: () => void;
}) {
  const token = session?.token || fallbackToken || "";
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  // Registrations state
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(true);
  const [eventFilter, setEventFilter] = useState("all");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Registration | null | "notfound">(null);
  const [searching, setSearching] = useState(false);

  // Certificate candidate state
  const [certificateCandidates, setCertificateCandidates] =
    useState<ParticipationCertificateCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] =
    useState(false);
  const [candidateError, setCandidateError] =
    useState("");

  // Coordinators management state
  const [coordinators, setCoordinators] = useState<CoordinatorRecord[]>([]);
  const [loadingCoords, setLoadingCoords] = useState(false);

  // Coordinator Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCoordinator, setEditingCoordinator] = useState<CoordinatorRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  /* =======================================================
     FETCH REGISTRATIONS
     ======================================================= */

  const fetchAll = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingRegs(true);
      const data = await fetchScopedRegistrations(token, eventFilter === "all" ? undefined : eventFilter);
      setRegistrations(data);
      setSearchResult((prev) => {
        if (!prev || prev === "notfound") return prev;
        const updated = data.find((r) => r.id === prev.id);
        return updated ?? prev;
      });
    } catch (error) {
      console.error("Failed to load registrations:", error);
    } finally {
      setLoadingRegs(false);
    }
  }, [token, eventFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* =======================================================
     FETCH CERTIFICATE CANDIDATES
     ======================================================= */

  const fetchCertificateCandidates = useCallback(async () => {
    if (!token) return;

    try {
      setLoadingCandidates(true);
      setCandidateError("");

      const data =
        await fetchParticipationCertificateCandidates(token);

      setCertificateCandidates(data);
    } catch (err) {
      console.error(
        "Failed to load certificate candidates:",
        err,
      );

      setCandidateError(
        err instanceof Error
          ? err.message
          : "Failed to load certificate candidates.",
      );
    } finally {
      setLoadingCandidates(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "certificates") {
      fetchCertificateCandidates();
    }
  }, [activeTab, fetchCertificateCandidates]);


  /* =======================================================
     FETCH COORDINATORS
     ======================================================= */

  const fetchCoordinators = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingCoords(true);
      const res = await adminManageCoordinators(token, "list");
      if (res.success && res.coordinators) {
        setCoordinators(res.coordinators);
      }
    } catch (err) {
      console.error("Failed to load coordinators:", err);
    } finally {
      setLoadingCoords(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "coordinators") {
      fetchCoordinators();
    }
  }, [activeTab, fetchCoordinators]);

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
     COORDINATOR MODAL HELPERS
     ======================================================= */

  const openAddModal = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormEvents([]);
    setFormError("");
    setIsAddModalOpen(true);
  };

  const openEditModal = (coord: CoordinatorRecord) => {
    setEditingCoordinator(coord);
    setFormName(coord.name);
    setFormEmail(coord.email);
    setFormPassword("");
    setFormEvents(coord.assigned_events || []);
    setFormError("");
  };

  const toggleEventSelection = (eventName: string) => {
    setFormEvents((prev) =>
      prev.includes(eventName)
        ? prev.filter((e) => e !== eventName)
        : [...prev, eventName],
    );
  };

  const handleSelectAllEvents = () => {
    setFormEvents([...ALL_EVENTS]);
  };

  const handleClearAllEvents = () => {
    setFormEvents([]);
  };

  const handleSaveCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      setFormError("Name and User ID are required");
      return;
    }

    if (isAddModalOpen && !formPassword.trim()) {
      setFormError("Password is required for new coordinator");
      return;
    }

    setFormLoading(true);
    setFormError("");

    try {
      if (isAddModalOpen) {
        const res = await adminManageCoordinators(token, "add", {
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword,
          assigned_events: formEvents,
        });

        if (!res.success) {
          setFormError(res.error || "Failed to create coordinator");
          return;
        }

        setIsAddModalOpen(false);
        fetchCoordinators();
      } else if (editingCoordinator) {
        const payload: any = {
          id: editingCoordinator.id,
          name: formName.trim(),
          email: formEmail.trim(),
          assigned_events: formEvents,
        };
        if (formPassword.trim()) {
          payload.password = formPassword;
        }

        const res = await adminManageCoordinators(token, "edit", payload);
        if (!res.success) {
          setFormError(res.error || "Failed to update coordinator");
          return;
        }

        setEditingCoordinator(null);
        fetchCoordinators();
      }
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : "Error saving coordinator");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (coord: CoordinatorRecord) => {
    const newStatus = !coord.is_active;
    const confirmMsg = `Are you sure you want to ${newStatus ? "ENABLE" : "DISABLE"} coordinator ${coord.name}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await adminManageCoordinators(token, "toggle_status", {
        id: coord.id,
        is_active: newStatus,
      });
      if (res.success) {
        fetchCoordinators();
      } else {
        alert(res.error || "Failed to update status");
      }
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleDeleteCoordinator = async (coord: CoordinatorRecord) => {
    const confirmMsg = `Are you sure you want to PERMANENTLY DELETE coordinator ${coord.name} (${coord.email})? This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await adminManageCoordinators(token, "delete", { id: coord.id });
      if (res.success) {
        fetchCoordinators();
      } else {
        alert(res.error || "Failed to delete coordinator");
      }
    } catch (err) {
      alert("Failed to delete coordinator");
    }
  };

  /* =======================================================
     STATISTICS
     ======================================================= */

  const all = registrations;
  const counts = {
    total: all.length,
    members: all.reduce((sum, r) => sum + r.members.length, 0),
    payPending: all.filter((r) => !isPaymentVerified(r) && !isPaymentRejected(r)).length,
    payVerified: all.filter((r) => isPaymentVerified(r)).length,
    payRejected: all.filter((r) => isPaymentRejected(r)).length,
    expectedRevenue: all.reduce((sum, r) => sum + (r.amount || 0), 0),
    collectedRevenue: all
      .filter((r) => isPaymentVerified(r))
      .reduce((sum, r) => sum + (r.amount || 0), 0),
    pendingRevenue: all
      .filter((r) => !isPaymentVerified(r) && !isPaymentRejected(r))
      .reduce((sum, r) => sum + (r.amount || 0), 0),
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <section className="min-h-screen w-full bg-[var(--color-paper)] py-12">
      <div className="mx-auto w-full max-w-6xl px-6">

        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.4em] text-[var(--color-flame)]">
              <ShieldCheck className="size-4" />
              Administrative Portal
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-[var(--color-ink)] sm:text-4xl">
              Admin Dashboard
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-electric)]/25 bg-white px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)] transition-colors hover:border-[var(--color-flame)] hover:text-[var(--color-flame)]"
            >
              <LogOut className="size-4" />
              Logout
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="mt-8 flex border-b border-[var(--color-electric)]/20">
          <button
            type="button"
            onClick={() => setActiveTab("registrations")}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 font-display text-sm font-bold uppercase tracking-wider transition-all ${
              activeTab === "registrations"
                ? "border-[var(--color-electric)] text-[var(--color-electric)]"
                : "border-transparent text-slate-500 hover:text-[var(--color-ink)]"
            }`}
          >
            <Layers className="size-4" />
            Registrations & Verification
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("certificates")}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 font-display text-sm font-bold uppercase tracking-wider transition-all ${
              activeTab === "certificates"
                ? "border-[var(--color-electric)] text-[var(--color-electric)]"
                : "border-transparent text-slate-500 hover:text-[var(--color-ink)]"
            }`}
          >
            <Award className="size-4" />
            Certificates
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("coordinators")}
            className={`flex items-center gap-2 border-b-2 px-6 py-3 font-display text-sm font-bold uppercase tracking-wider transition-all ${
              activeTab === "coordinators"
                ? "border-[var(--color-electric)] text-[var(--color-electric)]"
                : "border-transparent text-slate-500 hover:text-[var(--color-ink)]"
            }`}
          >
            <Users className="size-4" />
            Coordinator Management
          </button>
        </div>

        {/* TAB 1: REGISTRATIONS & VERIFICATION */}
        {activeTab === "registrations" && (
          <div className="mt-8">
            {/* STATISTICS */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatTile label="Total Teams" value={counts.total} tone="blue" />
              <StatTile label="Total Members" value={counts.members} />
              <StatTile label="Payment Pending" value={counts.payPending} tone="amber" />
              <StatTile label="Accepted / Verified" value={counts.payVerified} tone="green" />
              <StatTile label="Rejected" value={counts.payRejected} tone="red" />
            </div>

            {/* Collection Summary Revenue */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Total Expected" value={`₹${counts.expectedRevenue}`} />
              <StatTile label="Verified Revenue" value={`₹${counts.collectedRevenue}`} tone="green" />
              <StatTile label="Pending Revenue" value={`₹${counts.pendingRevenue}`} tone="amber" />
            </div>

            {/* SEARCH */}
            <div className="mt-8 rounded-2xl border border-[var(--color-electric)]/15 bg-white p-5">
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
                  token={token}
                  onStatusUpdated={fetchAll}
                  collectorName="ADMIN"
                />
              )}
            </div>

            {/* EXPORT EXCEL */}
            <div className="mt-6 rounded-2xl border border-[var(--color-electric)]/15 bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="size-5 text-[var(--color-electric)]" />
                  <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)]">
                    Export Excel
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => exportAllToExcel(all)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-electric)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-electric-bright)]"
                >
                  <FileSpreadsheet className="size-4" />
                  Export All Registrations ({all.length})
                </button>
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
                All Registrations ({registrations.length})
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

            {/* REGISTRATIONS LIST */}
            <div className="mt-4 space-y-4">
              {loadingRegs ? (
                <div className="rounded-2xl border border-[var(--color-electric)]/15 bg-white py-16 text-center">
                  <p className="text-sm text-slate-400">Loading registrations…</p>
                </div>
              ) : registrations.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--color-electric)]/25 bg-white py-16 text-center">
                  <Inbox className="size-10 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">No registrations to show for this filter.</p>
                </div>
              ) : (
                registrations.map((r) => (
                  <div key={r.id}>
                    <RegistrationCard
                      reg={r}
                      token={token}
                      onStatusUpdated={fetchAll}
                      collectorName="ADMIN"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PARTICIPATION CERTIFICATES */}
        {activeTab === "certificates" && (
          <div className="mt-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="size-5 text-[var(--color-electric)]" />
                  <h3 className="font-display text-xl font-bold uppercase text-[var(--color-ink)]">
                    Participation Certificates
                  </h3>
                </div>

                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Eligible participants are PRESENT attendees who are not
                  marked as prize winners. Prize winners receive their
                  certificates offline.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchCertificateCandidates}
                disabled={loadingCandidates}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-electric)]/25 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-electric)] transition-colors hover:bg-[var(--color-electric)]/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`size-4 ${
                    loadingCandidates ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile
                label="Eligible Participants"
                value={certificateCandidates.length}
                tone="green"
              />

              <StatTile
                label="Certificate Type"
                value="Participation"
                tone="blue"
              />

              <StatTile
                label="Prize Winners"
                value="Excluded"
                tone="amber"
              />
            </div>

            {candidateError && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {candidateError}
              </div>
            )}

            <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-electric)]/15 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="font-display text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)]">
                  Eligible Participants ({certificateCandidates.length})
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Read-only verification stage. Certificate issuance is
                  intentionally disabled for now.
                </p>
              </div>

              {loadingCandidates ? (
                <div className="py-16 text-center">
                  <RefreshCw className="mx-auto size-6 animate-spin text-slate-300" />
                  <p className="mt-3 text-sm text-slate-400">
                    Loading eligible participants…
                  </p>
                </div>
              ) : certificateCandidates.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <Award className="size-10 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-500">
                    No participants are currently eligible.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Mark a participant PRESENT to test the candidate pipeline.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {certificateCandidates.map((candidate, index) => (
                    <div
                      key={candidate.member_id}
                      className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 font-mono text-xs font-bold text-emerald-700">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <p className="font-display text-sm font-bold text-[var(--color-ink)]">
                            {candidate.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {candidate.college}
                          </p>

                          <p className="mt-1 break-all text-xs text-slate-400">
                            {candidate.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                          PRESENT
                        </span>

                        <span className="rounded-full bg-[var(--color-electric)]/10 px-2.5 py-1 font-medium text-[var(--color-electric)]">
                          {candidate.event}
                        </span>

                        <span className="font-mono text-slate-400">
                          {candidate.registration_number}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: COORDINATOR MANAGEMENT */}
        {activeTab === "coordinators" && (
          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-xl font-bold uppercase text-[var(--color-ink)]">
                  Coordinators
                </h3>
                <p className="text-sm text-slate-500">
                  Manage event coordinator accounts and assign event permissions
                </p>
              </div>

              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-electric)] px-4 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-[var(--color-electric-bright)]"
              >
                <UserPlus className="size-4" /> Add Coordinator
              </button>
            </div>

            {/* COORDINATORS TABLE / CARDS */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-electric)]/15 bg-white shadow-sm">
              {loadingCoords ? (
                <div className="py-16 text-center text-sm text-slate-400">
                  Loading coordinators…
                </div>
              ) : coordinators.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-500">
                  No coordinators found.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {coordinators.map((coord) => {
                    const isAdmin = coord.role === "admin";
                    return (
                      <div
                        key={coord.id}
                        className={`flex flex-wrap items-center justify-between gap-4 p-5 transition-colors ${
                          !coord.is_active ? "bg-slate-50 opacity-70" : "hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="font-display text-base font-bold text-[var(--color-ink)]">
                              {coord.name}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                                isAdmin
                                  ? "bg-purple-100 text-purple-700"
                                  : coord.is_active
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {isAdmin ? "Admin" : coord.is_active ? "Active" : "Disabled"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{coord.email}</p>

                          {/* Assigned Events */}
                          {!isAdmin && (
                            <div className="mt-2 flex flex-wrap gap-1.5 pt-1">
                              {coord.assigned_events && coord.assigned_events.length > 0 ? (
                                coord.assigned_events.map((ev) => (
                                  <span
                                    key={ev}
                                    className="rounded-md border border-[var(--color-electric)]/20 bg-[var(--color-paper)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-electric)]"
                                  >
                                    {ev}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-amber-600">No events assigned</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action buttons (only for coordinators, not root admin) */}
                        {!isAdmin && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(coord)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              <Edit2 className="size-3.5" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(coord)}
                              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                coord.is_active
                                  ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              <Power className="size-3.5" />
                              {coord.is_active ? "Disable" : "Enable"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCoordinator(coord)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="size-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT COORDINATOR */}
        {(isAddModalOpen || editingCoordinator) && (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--color-ink)]/70 p-4 backdrop-blur-sm"
            onClick={() => !formLoading && (setIsAddModalOpen(false), setEditingCoordinator(null))}
          >
            <div
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-display text-lg font-bold uppercase tracking-wide text-[var(--color-ink)]">
                  {isAddModalOpen ? "Add New Coordinator" : `Edit ${editingCoordinator?.name}`}
                </h3>
                <button
                  type="button"
                  disabled={formLoading}
                  onClick={() => (setIsAddModalOpen(false), setEditingCoordinator(null))}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCoordinator} className="mt-4 space-y-4">
                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="mb-1 block font-display text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Coordinator Name
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Paper Presentation Coordinator"
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-electric)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-display text-xs font-semibold uppercase tracking-wider text-slate-500">
                    User ID / Username
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. paper"
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-electric)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-display text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {isAddModalOpen ? "Password" : "Change Password (leave empty to keep current)"}
                  </label>
                  <div className="relative">
                    <Key className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
                    <input
                      type="password"
                      required={isAddModalOpen}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={isAddModalOpen ? "Enter secure password" : "New password (optional)"}
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-electric)]"
                    />
                  </div>
                </div>

                {/* Assigned Events Checklist */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="font-display text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Assigned Events ({formEvents.length} selected)
                    </label>
                    <div className="space-x-2 text-xs">
                      <button
                        type="button"
                        onClick={handleSelectAllEvents}
                        className="text-[var(--color-electric)] hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearAllEvents}
                        className="text-slate-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                    {ALL_EVENTS.map((ev) => {
                      const isSelected = formEvents.includes(ev);
                      return (
                        <label
                          key={ev}
                          className={`flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-xs transition-colors ${
                            isSelected ? "bg-[var(--color-electric)]/10 font-semibold text-[var(--color-electric)]" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEventSelection(ev)}
                            className="rounded border-slate-300 text-[var(--color-electric)] focus:ring-[var(--color-electric)]"
                          />
                          <span className="truncate">{ev}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    disabled={formLoading}
                    onClick={() => (setIsAddModalOpen(false), setEditingCoordinator(null))}
                    className="rounded-lg border border-slate-200 px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-electric)] px-5 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-[var(--color-electric-bright)] disabled:opacity-50"
                  >
                    <Check className="size-4" />
                    {formLoading ? "Saving…" : isAddModalOpen ? "Create Coordinator" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}

export default AdminDashboard;