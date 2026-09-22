import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import Hero from "@/components/Hero";
import Patrons from "@/components/Patrons";
import Faculty from "@/components/Faculty";
import Events from "@/components/Events";
import RegistrationStatus from "@/components/RegistrationStatus";
import Login from "@/components/Login";
import AdminDashboard from "@/components/AdminDashboard";
import CoordinatorDashboard from "@/components/CoordinatorDashboard";
import { validateSession, logoutUser, type Session } from "@/lib/auth";
import { ViewId } from "@/components/ViewId";
import CertificatePreview from "@/components/CertificatePreview";

export type View = "home" | "events" | "status" | "login";

export default function App() {
  const [view, setView] = useState<View>("home");
  const [session, setSession] = useState<Session | null>(null);
  const [validatingSession, setValidatingSession] = useState(true);
  const [currentPath, setCurrentPath] = useState(
    typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "/",
  );

  // Restore session from token on mount
  useEffect(() => {
    async function initSession() {
      try {
        const validated = await validateSession();
        if (validated) {
          setSession(validated);
        }
      } catch (err) {
        console.warn("Session restore error:", err);
      } finally {
        setValidatingSession(false);
      }
    }
    initSession();

    const handlePopState = () => {
      setCurrentPath(window.location.pathname.toLowerCase());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Simple standalone routes
  if (currentPath === "/view-id") {
    return <ViewId />;
  }

  if (currentPath === "/certificate-preview") {
    return <CertificatePreview />;
  }

  const navigate = (v: View) => {
    setView(v);
    if (currentPath.startsWith("/admin") || currentPath.startsWith("/coordinator")) {
      window.history.pushState({}, "", "/");
      setCurrentPath("/");
    }
    window.scrollTo({ top: 0 });
  };

  const logout = async () => {
    await logoutUser(session?.token);
    setSession(null);
    window.history.pushState({}, "", "/");
    setCurrentPath("/");
    navigate("home");
  };

  const isAdminPath =
    currentPath === "/admin" ||
    currentPath === "/admin/dashboard" ||
    currentPath === "/admin/coordinators";

  const isCoordinatorPath =
    currentPath === "/coordinator" ||
    currentPath === "/coordinator/dashboard";

  if (validatingSession && (isAdminPath || isCoordinatorPath)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-paper)]">
        <div className="text-center font-display text-sm uppercase tracking-widest text-slate-500">
          Validating session…
        </div>
      </div>
    );
  }

  // Route protection for /admin*
  if (isAdminPath) {
    if (session && session.user.role === "admin") {
      return (
        <div className="min-h-full w-full bg-[var(--color-paper)]">
          <TopBar view="login" onNavigate={navigate} />
          <AdminDashboard
            session={session}
            initialTab={currentPath === "/admin/coordinators" ? "coordinators" : "registrations"}
            onLogout={logout}
          />
        </div>
      );
    }
    return (
      <div className="min-h-full w-full bg-[var(--color-paper)]">
        <TopBar view="login" onNavigate={navigate} />
        <Login
          initialMode="admin"
          onLogin={(s) => {
            setSession(s);
            window.scrollTo({ top: 0 });
          }}
          onBack={() => navigate("home")}
        />
      </div>
    );
  }

  // Route protection for /coordinator*
  if (isCoordinatorPath) {
    if (session && session.user.role === "coordinator") {
      return (
        <div className="min-h-full w-full bg-[var(--color-paper)]">
          <TopBar view="login" onNavigate={navigate} />
          <CoordinatorDashboard session={session} onLogout={logout} />
        </div>
      );
    }
    return (
      <div className="min-h-full w-full bg-[var(--color-paper)]">
        <TopBar view="login" onNavigate={navigate} />
        <Login
          initialMode="coordinator"
          onLogin={(s) => {
            setSession(s);
            window.scrollTo({ top: 0 });
          }}
          onBack={() => navigate("home")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-[var(--color-paper)]">
      <TopBar view={view} onNavigate={navigate} />

      {view === "home" && (
        <>
          <Hero onRegister={() => navigate("events")} />
          <Patrons />
          <Faculty />
        </>
      )}
      {view === "events" && <Events />}
      {view === "status" && <RegistrationStatus />}
      {view === "login" &&
        (session === null ? (
          <Login
            onLogin={(s) => {
              setSession(s);
              window.scrollTo({ top: 0 });
            }}
            onBack={() => navigate("home")}
          />
        ) : session.user.role === "admin" ? (
          <AdminDashboard session={session} onLogout={logout} />
        ) : (
          <CoordinatorDashboard session={session} onLogout={logout} />
        ))}
    </div>
  );
}
