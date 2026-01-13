import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PullToRefresh from "react-simple-pull-to-refresh";
import DashboardMenu, { candidateMenuItems } from "../components/DashboardMenu";
import FacebookBottomNav from "../components/FacebookBottomNav";
import "../styles/CandidateDashboard.css";

export default function CandidateLayout({
  user,
  onLogout,
  children,
  menuItems = candidateMenuItems,
  eyebrow = "Espace candidat",
  titlePrefix = "Bonjour",
  avatarFallback = "C",
  shellClassName = "",
  showBottomMenu = true,
  onRefresh,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const contentClassName = useMemo(
    () => `content${showBottomMenu ? " content--with-bottom-menu" : ""}`,
    [showBottomMenu],
  );
  const contentProps = onRefresh
    ? {
        onRefresh,
        pullingContent: <div className="pull-to-refresh-label">Tirer pour actualiser</div>,
        refreshingContent: <div className="pull-to-refresh-label">Actualisation…</div>,
        className: contentClassName,
      }
    : { className: contentClassName };
  const ContentWrapper = onRefresh ? PullToRefresh : "div";

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

        <ContentWrapper {...contentProps}>{children}</ContentWrapper>
      </main>
      {showBottomMenu && (
        <FacebookBottomNav
          onNavigate={nav}
          onSearch={() => nav("/fb")}
          onMenu={() => setSidebarOpen((prev) => !prev)}
        />
      )}
    </div>
  );
}
