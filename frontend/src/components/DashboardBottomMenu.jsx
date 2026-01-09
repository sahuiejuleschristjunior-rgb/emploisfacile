import { Link, useLocation } from "react-router-dom";
import "../styles/dashboardBottomMenu.css";

const candidateBottomItems = [
  { key: "home", label: "Accueil", path: "/fb", icon: "🏠" },
  { key: "dashboard", label: "Tableau", path: "/candidate/dashboard", icon: "📊" },
  { key: "candidatures", label: "Candidatures", path: "/candidate/candidatures", icon: "📄" },
  { key: "messages", label: "Messages", path: "/candidate/messages", icon: "💬" },
  { key: "profil", label: "Profil", path: "/candidate/profil", icon: "👤" },
];

const recruiterBottomItems = [
  { key: "home", label: "Accueil", path: "/fb", icon: "🏠" },
  { key: "dashboard", label: "Tableau", path: "/recruiter/dashboard", icon: "📊" },
  { key: "offers", label: "Offres", path: "/recruiter/offres", icon: "📣" },
  { key: "messages", label: "Messages", path: "/recruiter/messages", icon: "💬" },
  { key: "company", label: "Entreprise", path: "/profil", icon: "🏢" },
];

export default function DashboardBottomMenu({ role = "candidate" }) {
  const location = useLocation();
  const items = role === "recruiter" ? recruiterBottomItems : candidateBottomItems;

  return (
    <nav className="dashboard-bottom-menu" aria-label="Navigation principale">
      {items.map((item) => {
        const isActive = location.pathname.startsWith(item.path);

        return (
          <Link
            key={item.key}
            to={item.path}
            className={`dashboard-bottom-menu__item${isActive ? " active" : ""}`}
          >
            <span className="dashboard-bottom-menu__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
