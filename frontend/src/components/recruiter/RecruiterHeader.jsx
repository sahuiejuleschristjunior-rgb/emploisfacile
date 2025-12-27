import React from "react";
import "../../styles/Dashboard.css";

export default function RecruiterHeader({ title, onToggleSidebar, user }) {
  const initials = (user?.companyName || user?.name || "EF")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="rd-header">
      <div className="rd-header-left">
        <button className="rd-burger" onClick={onToggleSidebar}>
          ☰
        </button>
        <div className="rd-brand">
          <div className="rd-logo">EF</div>
          <div className="rd-brand-text">
            <div className="rd-brand-title">Recruteur</div>
            <div className="rd-brand-sub">{title}</div>
          </div>
        </div>
      </div>

      <div className="rd-header-right">
        <button className="rd-icon-btn" aria-label="Notifications">
          🔔
        </button>
        <div className="rd-avatar" title={user?.companyName || user?.name}>
          {user?.avatar ? <img src={user.avatar} alt="avatar" /> : initials}
        </div>
      </div>
    </header>
  );
}
