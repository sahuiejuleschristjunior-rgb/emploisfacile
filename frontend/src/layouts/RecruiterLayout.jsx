import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PullToRefresh from "react-simple-pull-to-refresh";
import DashboardMenu, { recruiterMenuItems } from "../components/DashboardMenu";
import FacebookBottomNav from "../components/FacebookBottomNav";
import RecruiterDashboardHeader from "../components/recruiter/RecruiterDashboardHeader";

export default function RecruiterLayout({
  user,
  onLogout,
  children,
  menuItems = recruiterMenuItems,
  eyebrow = "Espace recruteur",
  titlePrefix = "Bonjour",
  avatarFallback = "R",
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

  const rootClassName = ["candidate-dashboard", "recruiter-dashboard-shell", shellClassName]
    .filter(Boolean)
    .join(" ");

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
    <div className={rootClassName}>
      <DashboardMenu
        role="recruiter"
        menuItems={menuItems}
        onLogout={onLogout}
        onClose={() => setSidebarOpen(false)}
        className={sidebarOpen ? "cd-side-open" : ""}
      />

      {sidebarOpen && <div className="cd-overlay" onClick={() => setSidebarOpen(false)}></div>}

      <main className="cd-main">
        <RecruiterDashboardHeader
          eyebrow={eyebrow}
          titlePrefix={titlePrefix}
          user={user}
          avatarFallback={avatarFallback}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onNotifications={() => nav("/notifications")}
        />

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
