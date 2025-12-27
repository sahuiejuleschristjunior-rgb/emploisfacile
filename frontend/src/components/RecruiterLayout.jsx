import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Dashboard.css";

export default function RecruiterLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  const navItems = [
    { to: "/recruiter", label: "📊 Tableau de bord" },
    { to: "/recruiter/jobs", label: "💼 Offres publiées" },
    { to: "/recruiter/post", label: "📝 Publier une offre" },
    { to: "/recruiter/candidatures", label: "📥 Candidatures" },
    { to: "/recruiter/messages", label: "💬 Messages" },
    { to: "/recruiter/entreprise", label: "🏢 Entreprise" },
    { to: "/recruiter/settings", label: "⚙️ Paramètres" },
  ];

  return (
    <div className="recruiter-dashboard">
      <header className="rd-header">
        <div className="rd-header-left">
          <button className="rd-burger" onClick={() => setSidebarOpen((p) => !p)}>
            ☰
          </button>

          <div className="rd-brand">
            <div className="rd-logo">EF</div>
            <div className="rd-brand-text">
              <div className="rd-brand-title">Espace recruteur</div>
              <div className="rd-brand-sub">
                {user?.companyName || user?.name || "Recruteur"}
              </div>
            </div>
          </div>
        </div>

        <div className="rd-header-right">
          <button className="rd-btn" onClick={() => navigate("/recruiter/post")}>
            Nouvelle offre
          </button>
        </div>
      </header>

      <div className="rd-shell">
        <aside className={`rd-sidebar ${sidebarOpen ? "rd-sidebar--open" : ""}`}>
          <div className="rd-sidebar-section">
            <div className="rd-sidebar-title">Navigation</div>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rd-menu-item ${isActive ? "rd-menu-item--active" : ""}`
                }
                onClick={closeSidebar}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="rd-sidebar-section rd-sidebar-section-bottom">
            <div className="rd-sidebar-title">Compte</div>
            <button className="rd-menu-item rd-menu-item--button" onClick={logout}>
              🔓 Se déconnecter
            </button>
          </div>
        </aside>

        <main className="rd-main">
          <div className="rd-page">
            <Outlet />
          </div>
        </main>
      </div>

      {sidebarOpen && <div className="rd-overlay" onClick={closeSidebar} />}
    </div>
  );
}
