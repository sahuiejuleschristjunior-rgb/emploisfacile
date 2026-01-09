import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardMenu, { candidateMenuItems } from "../components/DashboardMenu";
import FacebookBottomNav from "../components/FacebookBottomNav";
import FacebookLayout from "../pages/FacebookLayout";

export default function CandidateLayout({
  onLogout,
  children,
  menuItems = candidateMenuItems,
  shellClassName = "",
  showBottomMenu = true,
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
    <FacebookLayout headerOnly fullWidth>
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
          <div className={`content${showBottomMenu ? " content--with-bottom-menu" : ""}`}>
            {children}
          </div>
        </main>
        {showBottomMenu && (
          <FacebookBottomNav
            onNavigate={nav}
            onSearch={() => nav("/fb")}
            onMenu={() => setSidebarOpen((prev) => !prev)}
          />
        )}
      </div>
    </FacebookLayout>
  );
}
