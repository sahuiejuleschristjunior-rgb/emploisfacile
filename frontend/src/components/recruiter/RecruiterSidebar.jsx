import React from "react";
import { NavLink } from "react-router-dom";
import "../../styles/Dashboard.css";

const links = [
  { to: "/recruteur/dashboard", label: "Tableau de bord", icon: "📊" },
  { to: "/recruteur/offres", label: "Offres publiées", icon: "💼" },
  { to: "/recruteur/candidatures", label: "Candidatures", icon: "📥" },
  { to: "/recruteur/messages", label: "Messages", icon: "💬" },
  { to: "/recruteur/entreprise", label: "Entreprise", icon: "👥" },
  { to: "/recruteur/parametres", label: "Paramètres", icon: "⚙️" },
];

export default function RecruiterSidebar({ isOpen, onClose }) {
  return (
    <aside className={`rd-sidebar ${isOpen ? "rd-sidebar--open" : ""}`}>
      <div className="rd-sidebar-section">
        <div className="rd-sidebar-title">Navigation</div>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `rd-menu-item ${isActive ? "rd-menu-item--active" : ""}`
            }
            onClick={onClose}
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
