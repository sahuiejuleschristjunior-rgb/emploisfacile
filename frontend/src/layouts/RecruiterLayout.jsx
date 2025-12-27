import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import RecruiterSidebar from "../components/recruiter/RecruiterSidebar";
import RecruiterHeader from "../components/recruiter/RecruiterHeader";
import "../styles/Dashboard.css";

const pageTitles = [
  { path: "/recruteur/dashboard", title: "Tableau de bord" },
  { path: "/recruteur/offres", title: "Offres publiées" },
  { path: "/recruteur/candidatures", title: "Candidatures" },
  { path: "/recruteur/messages", title: "Messages" },
  { path: "/recruteur/entreprise", title: "Mon entreprise" },
  { path: "/recruteur/parametres", title: "Paramètres" },
  { path: "/recruteur/job", title: "Candidatures" },
];

export default function RecruiterLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const title = useMemo(() => {
    const match = pageTitles.find((p) => location.pathname.startsWith(p.path));
    return match?.title || "Recruteur";
  }, [location.pathname]);

  return (
    <div className="recruiter-layout">
      <div className={`recruiter-overlay ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />
      <RecruiterSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="recruiter-main">
        <RecruiterHeader
          title={title}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          user={user}
        />
        <div className="recruiter-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
