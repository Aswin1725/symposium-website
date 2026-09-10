import { useState } from "react";
import TopBar from "@/components/TopBar";
import Hero from "@/components/Hero";
import Patrons from "@/components/Patrons";
import Faculty from "@/components/Faculty";
import Events from "@/components/Events";
import RegistrationStatus from "@/components/RegistrationStatus";
import Login from "@/components/Login";
import AdminDashboard from "@/components/AdminDashboard";
import CoordinatorDashboard from "@/components/CoordinatorDashboard";
import type { Session } from "@/lib/auth";

import { ViewId } from "@/components/ViewId";

export type View = "home" | "events" | "status" | "login";

export default function App() {
  const [view, setView] = useState<View>("home");
  const [session, setSession] = useState<Session | null>(null);

  // Simple routing for /view-id
  if (window.location.pathname === "/view-id") {
    return <ViewId />;
  }

  const navigate = (v: View) => {
    setView(v);
    window.scrollTo({ top: 0 });
  };

  const logout = () => {
    setSession(null);
    navigate("home");
  };

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
          />
        ) : session.role === "admin" ? (
          <AdminDashboard onLogout={logout} />
        ) : (
          <CoordinatorDashboard
            event={session.event}
            name={session.name}
            onLogout={logout}
          />
        ))}
    </div>
  );
}
