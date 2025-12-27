import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function JobConnectLayout({ user, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const nav = useNavigate();

  const menuItems = [
    { key: "dashboard", label: "Dashboard", path: "/jobconnect/dashboard" },
    { key: "candidatures", label: "Mes candidatures", path: "/jobconnect/candidatures" },
    { key: "entretiens", label: "Entretiens", path: "/jobconnect/entretiens" },
    { key: "messages", label: "Messages", path: "/jobconnect/messages" },
    { key: "favoris", label: "Favoris", path: "/jobconnect/favoris" },
    { key: "agenda", label: "Agenda", path: "/jobconnect/agenda" },
    { key: "profil", label: "Profil", path: "/jobconnect/profil" },
  ];

  return (
    <div className="candidate-dashboard">
      <aside className={`cd-side ${sidebarOpen ? "cd-side-open" : ""}`}>
        <div className="side-brand">JobConnect</div>
        <nav className="side-nav">
          {menuItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`side-link ${active ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="side-footer">© 2025 JobConnect Inc.</div>
      </aside>

      <main className="cd-main">
        <header className="cd-topbar">
          <div>
            <p className="eyebrow">Espace candidat</p>
            <h2>Bonjour {user?.name || "!"}</h2>
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
            <div className="avatar">{user?.name?.charAt(0)?.toUpperCase() || "C"}</div>
            <button className="ghost-link" onClick={onLogout}>
              Se déconnecter
            </button>
          </div>
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}
