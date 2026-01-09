import React from "react";

export default function RecruiterDashboardHeader({
  eyebrow,
  titlePrefix,
  user,
  avatarFallback,
  onMenuToggle,
  onNotifications,
}) {
  return (
    <header className="cd-topbar recruiter-dashboard-header">
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
          onClick={onMenuToggle}
        >
          ☰
        </button>
        <button className="notif-btn" onClick={onNotifications} aria-label="Notifications">
          🔔
        </button>
        <div className="avatar">
          {user?.name?.charAt(0)?.toUpperCase() ||
            user?.companyName?.charAt(0)?.toUpperCase() ||
            avatarFallback}
        </div>
      </div>
    </header>
  );
}
