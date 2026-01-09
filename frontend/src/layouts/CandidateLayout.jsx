import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardMenu, { candidateMenuItems } from "../components/DashboardMenu";

export default function CandidateLayout({
  user,
  onLogout,
  children,
  menuItems = candidateMenuItems,
  eyebrow = "Espace candidat",
  titlePrefix = "Bonjour",
  avatarFallback = "C",
  shellClassName = "",
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className={`candidate-dashboard ${shellClassName}`.trim()}>
      <DashboardMenu
        role="candidate"
        menuItems={menuItems}
        onLogout={onLogout}
        onClose={() => setSidebarOpen(false)}
        className={sidebarOpen ? "cd-side-open" : ""}
      />

      {sidebarOpen && <div className="cd-overlay" onClick={() => setSidebarOpen(false)}></div>}

      <main className="cd-main">
        <header className="cd-topbar">
          <div className="topbar-left">
            <p className="eyebrow">{eyebrow}</p>
            <h2>
              {titlePrefix} {user?.name || user?.companyName || "!"}
            </h2>
          </div>
          <div className="topbar-actions">
            <button
              className="notif-btn mobile-only"
              aria-label="Ouvrir le menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <button className="notif-btn" onClick={() => nav("/notifications")} aria-label="Notifications">
              🔔
            </button>
            <div className="avatar">
              {user?.name?.charAt(0)?.toUpperCase() ||
                user?.companyName?.charAt(0)?.toUpperCase() ||
                avatarFallback}
            </div>
          </div>
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}
