import React from "react";
import { Link, useLocation } from "react-router-dom";

export const candidateMenuItems = [
  { key: "home", label: "🏠 Accueil", path: "/fb" },
  { key: "jobs", label: "💼 Emplois", path: "/emplois" },
  { key: "dashboard", label: "Tableau de bord", path: "/candidate/dashboard" },
  { key: "candidatures", label: "Mes candidatures", path: "/candidate/candidatures" },
  { key: "entretiens", label: "Entretiens", path: "/candidate/entretiens" },
  { key: "messages", label: "Messages", path: "/candidate/messages" },
  { key: "favoris", label: "Favoris", path: "/candidate/favoris" },
  { key: "agenda", label: "Ordre du jour", path: "/candidate/agenda" },
  { key: "profil", label: "Profil", path: "/candidate/profil" },
];

export const recruiterMenuItems = [
  { key: "home", label: "Accueil", path: "/fb" },
  { key: "dashboard", label: "Tableau de bord", path: "/recruiter/dashboard" },
  { key: "create", label: "Publier une offre", path: "/recruiter/create-job" },
  { key: "offers", label: "Mes offres", path: "/recruiter/offres" },
  { key: "applications", label: "Candidatures", path: "/recruiter/candidatures" },
  { key: "profiles", label: "Profils candidats", path: "/recruiter/profils-candidats" },
  { key: "cv-theque", label: "CV thèque", path: "/recruiter/cv-theque" },
  { key: "messages", label: "Messages", path: "/recruiter/messages" },
  { key: "company", label: "Entreprise", path: "/profil" },
  { key: "settings", label: "Paramètres", path: "/settings" },
];

const getMenuItemsForRole = (role) => {
  if (role === "recruiter") return recruiterMenuItems;
  return candidateMenuItems;
};

export default function DashboardMenu({
  as: Component = "aside",
  role = "candidate",
  menuItems,
  onLogout,
  onClose,
  onNavigate,
  className = "",
  useLinks = true,
  ...rest
}) {
  const location = useLocation();
  const items = menuItems ?? getMenuItemsForRole(role);

  const handleItemClick = (path) => {
    if (onNavigate) {
      onNavigate(path);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <Component className={`cd-side ${className}`.trim()} {...rest}>
      <div className="side-header">
        <div className="side-brand">EmploisFacile</div>
        {onClose && (
          <button
            className="side-close mobile-only"
            aria-label="Fermer le menu"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        )}
      </div>
      <nav className="side-nav">
        {items.map((item) => {
          const active = location.pathname.startsWith(item.path);
          if (useLinks) {
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`side-link ${active ? "active" : ""}`}
                onClick={() => handleItemClick(item.path)}
              >
                {item.label}
              </Link>
            );
          }

          return (
            <button
              key={item.key}
              type="button"
              className={`side-link ${active ? "active" : ""}`}
              onClick={() => handleItemClick(item.path)}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="side-bottom">
        <button className="side-logout" onClick={onLogout} type="button">
          ⏻ Se déconnecter
        </button>
        <div className="side-footer">© 2025 EmploisFacile</div>
      </div>
    </Component>
  );
}
